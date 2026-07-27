import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';

// 自定义指标
const requestCount = new Counter('http_reqs_total');
const requestDuration = new Trend('http_req_duration');
const errorRate = new Rate('http_error_rate');

// 测试配置
export const options = {
  stages: [
    { duration: '30s', target: 50 }, // 30秒内逐步增加到50个虚拟用户
    { duration: '1m', target: 50 },  // 保持50个用户1分钟
    { duration: '30s', target: 100 }, // 增加到100个用户
    { duration: '1m', target: 100 }, // 保持100个用户1分钟
    { duration: '30s', target: 0 },   // 逐步减少到0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95%的请求延迟应小于500ms
    http_error_rate: ['rate<0.01'],   // 错误率应低于1%
  },
  ext: {
    loadimpact: {
      projectID: 12345,
      name: 'GameHub API负载测试'
    }
  }
};

// 初始化函数：设置测试数据
export function setup() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  const testUser = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'TestPassword123!',
    displayName: `Test User ${Date.now()}`
  };

  return { baseUrl, testUser };
}

// 主测试函数
export default function(data) {
  const { baseUrl, testUser } = data;

  // 测试1: 健康检查端点
  const healthCheckRes = http.get(`${baseUrl}/health`);
  check(healthCheckRes, {
    '健康检查状态为200': (r) => r.status === 200,
  });

  // 记录指标
  requestCount.add(1);
  requestDuration.add(healthCheckRes.timings.duration);
  errorRate.add(healthCheckRes.status !== 200);

  // 测试2: 用户注册
  const registerPayload = JSON.stringify({
    username: `user_${__VU}_${__ITER}_${Date.now()}`,
    email: `user_${__VU}_${__ITER}_${Date.now()}@test.com`,
    password: 'TestPassword123!',
    displayName: `Test User ${__VU}_${__ITER}`
  });

  const registerHeaders = {
    'Content-Type': 'application/json',
  };

  const registerRes = http.post(`${baseUrl}/api/v1/auth/register`, registerPayload, { headers: registerHeaders });

  check(registerRes, {
    '注册请求状态为201': (r) => r.status === 201,
    '注册响应包含用户数据': (r) => r.json('success') === true,
  });

  requestCount.add(1);
  requestDuration.add(registerRes.timings.duration);
  errorRate.add(registerRes.status !== 201);

  // 如果注册成功，提取token用于后续请求
  let authToken = null;
  if (registerRes.status === 201) {
    const responseBody = registerRes.json();
    authToken = responseBody.data?.tokens?.accessToken;
  }

  // 测试3: 用户登录（使用新注册的用户）
  const loginPayload = JSON.stringify({
    email: `user_${__VU}_${__ITER}_${Date.now()}@test.com`,
    password: 'TestPassword123!'
  });

  const loginRes = http.post(`${baseUrl}/api/v1/auth/login`, loginPayload, { headers: registerHeaders });

  check(loginRes, {
    '登录请求状态为200': (r) => r.status === 200,
    '登录响应包含token': (r) => r.json('success') === true && r.json('data.tokens.accessToken') !== undefined,
  });

  requestCount.add(1);
  requestDuration.add(loginRes.timings.duration);
  errorRate.add(loginRes.status !== 200);

  // 如果有认证token，测试受保护的端点
  if (authToken) {
    const protectedHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    };

    // 测试4: 获取用户信息
    const profileRes = http.get(`${baseUrl}/api/v1/users/me`, { headers: protectedHeaders });

    check(profileRes, {
      '获取用户信息状态为200': (r) => r.status === 200,
    });

    requestCount.add(1);
    requestDuration.add(profileRes.timings.duration);
    errorRate.add(profileRes.status !== 200);
  }

  // 测试5: 获取游戏列表（公开端点）
  const gamesRes = http.get(`${baseUrl}/api/v1/games`);

  check(gamesRes, {
    '获取游戏列表状态为200': (r) => r.status === 200,
  });

  requestCount.add(1);
  requestDuration.add(gamesRes.timings.duration);
  errorRate.add(gamesRes.status !== 200);

  // 在请求之间添加短暂的等待时间，模拟真实用户行为
  sleep(Math.random() * 2 + 0.5); // 0.5-2.5秒的随机等待
}

// 清理函数（可选）
export function teardown(data) {
  console.log('负载测试完成');
}