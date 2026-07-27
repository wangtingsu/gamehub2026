/**
 * GameHub 后端性能 / 压力测试脚本（基于 k6）
 *
 * 测试范围：
 * - 公共 API 端点（游戏列表 / 游戏详情 / 新闻列表 / 搜索）
 * - 认证 API 端点（登录 / 获取用户信息）
 * - 限流机制测试
 *
 * 运行方式：
 *   k6 run load.test.js                                       # 默认运行默认导出函数
 *   BASE_URL=http://staging-api.com k6 run load.test.js       # 指定目标地址
 *
 * 安装 k6：https://k6.io/docs/getting-started/installation/
 *
 * 注意：本文件由 k6 执行，不是 Jest 测试文件。
 * 变量 __ENV 由 k6 运行时注入，不支持 import 外部模块。
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ================================================================
// 自定义指标
// ================================================================

/** 错误率指标，记录请求失败的比例 */
export const errorRate = new Rate('errors');

/** 请求耗时趋势指标，记录每次请求的响应时间分布 */
export const requestDuration = new Trend('request_duration');

// ================================================================
// 测试配置
// ================================================================
export const options = {
  stages: [
    // 阶段 1：预热 — 逐步增加到 50 并发
    { duration: '30s', target: 50 },
    // 阶段 2：正常负载 — 持续在 100 并发
    { duration: '1m', target: 100 },
    // 阶段 3：压力测试 — 升至 150 并发
    { duration: '30s', target: 150 },
    // 阶段 4-6：冷却 — 逐步降至 0 并发
    { duration: '30s', target: 100 },
    { duration: '30s', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    // 95% 的请求响应时间应小于 500ms
    http_req_duration: ['p(95)<500'],
    // 自定义错误率应小于 1%
    errors: ['rate<0.01'],
    // HTTP 请求失败率应小于 1%
    http_req_failed: ['rate<0.01'],
  },
};

/** 测试使用的占位数据 */
const testData = {
  games: [
    { id: 1, title: '测试游戏1' },
    { id: 2, title: '测试游戏2' },
    { id: 3, title: '测试游戏3' },
  ],
  users: [
    { email: 'test1@example.com', password: 'password123' },
    { email: 'test2@example.com', password: 'password123' },
    { email: 'test3@example.com', password: 'password123' },
  ],
};

/** 目标 API 基础地址，可通过环境变量覆盖 */
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// ================================================================
// 测试场景 1：公共 API 端点（默认场景）
// ================================================================
export default function () {
  /* ---- 场景 1.1：获取游戏列表 ---- */
  const gamesResponse = http.get(`${BASE_URL}/api/v1/games`);

  const gamesCheck = check(gamesResponse, {
    '获取游戏列表状态码为200': (r) => r.status === 200,
    '获取游戏列表响应时间小于500ms': (r) => r.timings.duration < 500,
    '获取游戏列表有数据': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.success === true && Array.isArray(data.data);
      } catch {
        return false;
      }
    },
  });

  if (!gamesCheck) {
    errorRate.add(1);
  }

  requestDuration.add(gamesResponse.timings.duration);

  /* ---- 场景 1.2：随机查看游戏详情 ---- */
  if (gamesCheck && gamesResponse.status === 200) {
    try {
      const data = JSON.parse(gamesResponse.body);
      if (data.data && data.data.length > 0) {
        const randomGame = data.data[Math.floor(Math.random() * data.data.length)];
        const gameDetailResponse = http.get(`${BASE_URL}/api/v1/games/${randomGame.id}`);

        check(gameDetailResponse, {
          '获取游戏详情状态码为200': (r) => r.status === 200,
          '获取游戏详情响应时间小于300ms': (r) => r.timings.duration < 300,
        }) || errorRate.add(1);

        requestDuration.add(gameDetailResponse.timings.duration);
      }
    } catch (error) {
      // JSON 解析失败时静默跳过
    }
  }

  /* ---- 场景 1.3：获取新闻列表 ---- */
  const newsResponse = http.get(`${BASE_URL}/api/v1/news`);

  check(newsResponse, {
    '获取新闻列表状态码为200': (r) => r.status === 200,
    '获取新闻列表响应时间小于400ms': (r) => r.timings.duration < 400,
  }) || errorRate.add(1);

  requestDuration.add(newsResponse.timings.duration);

  /* ---- 场景 1.4：搜索游戏 ---- */
  const searchResponse = http.get(`${BASE_URL}/api/v1/games?search=test`);

  check(searchResponse, {
    '搜索游戏状态码为200': (r) => r.status === 200,
    '搜索游戏响应时间小于600ms': (r) => r.timings.duration < 600,
  }) || errorRate.add(1);

  requestDuration.add(searchResponse.timings.duration);

  // 每次迭代间隔 1 秒
  sleep(1);
}

// ================================================================
// 测试场景 2：认证 API 端点（需要 JWT 令牌）
// ================================================================
export function authScenario() {
  /* ---- 步骤 1：登录获取令牌 ---- */
  const loginPayload = JSON.stringify({
    email: 'test@example.com',
    password: 'password123',
  });

  const loginResponse = http.post(`${BASE_URL}/api/v1/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  const loginCheck = check(loginResponse, {
    '登录状态码为200': (r) => r.status === 200,
    '登录响应时间小于800ms': (r) => r.timings.duration < 800,
    '登录返回token': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.success === true && data.data && data.data.tokens;
      } catch {
        return false;
      }
    },
  });

  if (!loginCheck) {
    errorRate.add(1);
    return;
  }

  /* ---- 步骤 2：解析令牌 ---- */
  let token = '';
  try {
    const data = JSON.parse(loginResponse.body);
    token = data.data.tokens.accessToken;
  } catch {
    errorRate.add(1);
    return;
  }

  /* ---- 步骤 3：使用令牌获取用户信息 ---- */
  const userResponse = http.get(`${BASE_URL}/api/v1/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  check(userResponse, {
    '获取用户信息状态码为200': (r) => r.status === 200,
    '获取用户信息响应时间小于400ms': (r) => r.timings.duration < 400,
  }) || errorRate.add(1);

  requestDuration.add(userResponse.timings.duration);

  sleep(2);
}

// ================================================================
// 测试场景 3：限流测试
// ================================================================
export function rateLimitScenario() {
  // 快速连续发送 10 个请求，观察是否触发限流（429 Too Many Requests）
  for (let i = 0; i < 10; i++) {
    const response = http.get(`${BASE_URL}/api/v1/games`);

    check(response, {
      '限流测试状态码': (r) => r.status === 200 || r.status === 429,
    });

    requestDuration.add(response.timings.duration);

    // 短暂间隔（100ms）
    sleep(0.1);
  }
}