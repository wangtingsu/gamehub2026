/**
 * Prometheus 监控指标模块
 *
 * 使用 prom-client 库收集和暴露应用运行时的各项指标，包括：
 * - HTTP 请求指标：请求数、请求耗时、错误率
 * - 数据库指标：查询耗时、查询总数、连接池状态
 * - Redis 指标：操作耗时、操作总数、内存使用
 * - 业务指标：用户注册数、游戏浏览量、API 调用分布
 * - 系统指标：内存使用、CPU 使用、活跃连接数
 *
 * 通过 metricsMiddleware 自动收集 HTTP 层面的指标，
 * 通过 monitorDatabaseQuery / monitorRedisOperation 装饰器手动收集数据库和 Redis 指标。
 * 通过 /metrics 端点暴露给 Prometheus 抓取。
 *
 * @module monitoring/prometheus.metrics
 */

import client from 'prom-client';
import { Request, Response, NextFunction } from 'express';
import config from '../config';

// 创建默认指标收集器（Node.js 运行时指标：CPU、内存、事件循环等）
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

// ========== HTTP 请求指标 ==========

/**
 * HTTP 请求耗时直方图
 * 标签：method, route, status_code, environment
 * 桶：0.1s, 0.5s, 1s, 2s, 5s, 10s
 */
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'environment'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

/**
 * HTTP 请求总数计数器
 * 标签：method, route, status_code, environment
 */
export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'environment']
});

/**
 * HTTP 请求错误计数器（4xx 和 5xx 状态码）
 * 标签：method, route, status_code, environment
 */
export const httpRequestErrors = new client.Counter({
  name: 'http_request_errors_total',
  help: 'Total number of HTTP request errors',
  labelNames: ['method', 'route', 'status_code', 'environment']
});

// ========== 数据库指标 ==========

/**
 * 数据库查询耗时直方图
 * 标签：operation, table, success, environment
 * 桶：10ms, 50ms, 100ms, 500ms, 1s, 2s
 */
export const databaseQueryDuration = new client.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table', 'success', 'environment'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2]
});

/**
 * 数据库查询总数计数器
 * 标签：operation, table, success, environment
 */
export const databaseQueriesTotal = new client.Counter({
  name: 'database_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table', 'success', 'environment']
});

/**
 * 数据库连接池状态仪表盘
 * 标签：state（total/idle/waiting）, environment
 */
export const databaseConnectionPool = new client.Gauge({
  name: 'database_connection_pool',
  help: 'Database connection pool statistics',
  labelNames: ['state', 'environment']
});

// ========== Redis 指标 ==========

/**
 * Redis 操作耗时直方图
 * 标签：operation, success, environment
 * 桶：1ms, 5ms, 10ms, 50ms, 100ms
 */
export const redisOperationsDuration = new client.Histogram({
  name: 'redis_operations_duration_seconds',
  help: 'Duration of Redis operations in seconds',
  labelNames: ['operation', 'success', 'environment'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1]
});

/**
 * Redis 操作总数计数器
 * 标签：operation, success, environment
 */
export const redisOperationsTotal = new client.Counter({
  name: 'redis_operations_total',
  help: 'Total number of Redis operations',
  labelNames: ['operation', 'success', 'environment']
});

/**
 * Redis 内存使用量仪表盘（字节）
 * 标签：environment
 */
export const redisMemoryUsage = new client.Gauge({
  name: 'redis_memory_usage_bytes',
  help: 'Redis memory usage in bytes',
  labelNames: ['environment']
});

// ========== 业务指标 ==========

/**
 * 用户注册总数计数器
 * 标签：environment
 */
export const userRegistrations = new client.Counter({
  name: 'user_registrations_total',
  help: 'Total number of user registrations',
  labelNames: ['environment']
});

/**
 * 游戏浏览量计数器
 * 标签：game_id, environment
 */
export const gameViews = new client.Counter({
  name: 'game_views_total',
  help: 'Total number of game views',
  labelNames: ['game_id', 'environment']
});

/**
 * API 调用分布计数器（按端点和方法统计）
 * 标签：endpoint, method, environment
 */
export const apiCallsByEndpoint = new client.Counter({
  name: 'api_calls_by_endpoint_total',
  help: 'Total number of API calls by endpoint',
  labelNames: ['endpoint', 'method', 'environment']
});

// ========== 系统指标 ==========

/**
 * 系统内存使用量仪表盘（字节）
 * 标签：type（如 heapUsed, heapTotal, external）, environment
 */
export const systemMemoryUsage = new client.Gauge({
  name: 'system_memory_usage_bytes',
  help: 'System memory usage in bytes',
  labelNames: ['type', 'environment']
});

/**
 * 系统 CPU 使用率仪表盘（百分比）
 * 标签：environment
 */
export const systemCpuUsage = new client.Gauge({
  name: 'system_cpu_usage_percent',
  help: 'System CPU usage percentage',
  labelNames: ['environment']
});

/**
 * 活跃连接数仪表盘
 * 标签：type（如 http, websocket）, environment
 */
export const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  labelNames: ['type', 'environment']
});

/**
 * Express 中间件：自动收集 HTTP 请求指标
 *
 * 在响应完成时记录：
 * - 请求耗时（httpRequestDuration 直方图）
 * - 请求总数（httpRequestsTotal 计数器）
 * - 错误请求数（httpRequestErrors 计数器，仅 4xx/5xx）
 * - API 端点调用分布（apiCallsByEndpoint 计数器，仅 /api/ 路径）
 *
 * @param req  - Express 请求对象
 * @param res  - Express 响应对象
 * @param next - Express 下一个中间件函数
 */
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const route = req.route?.path || req.path;

  // 响应完成时收集指标
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // 转换为秒
    const statusCode = res.statusCode;
    const method = req.method;

    // 记录请求持续时间
    httpRequestDuration
      .labels(method, route, statusCode.toString(), config.nodeEnv)
      .observe(duration);

    // 记录请求总数
    httpRequestsTotal
      .labels(method, route, statusCode.toString(), config.nodeEnv)
      .inc();

    // 记录错误请求（4xx和5xx状态码）
    if (statusCode >= 400) {
      httpRequestErrors
        .labels(method, route, statusCode.toString(), config.nodeEnv)
        .inc();
    }

    // 记录API调用
    if (route.startsWith('/api/')) {
      apiCallsByEndpoint
        .labels(route, method, config.nodeEnv)
        .inc();
    }
  });

  next();
};

/**
 * 数据库查询监控装饰器
 *
 * 包裹数据库查询函数，自动记录查询耗时和成功/失败状态到 Prometheus 指标。
 *
 * @param operation - 操作类型（如 SELECT, INSERT, UPDATE, DELETE）
 * @param table     - 操作的表名
 * @param queryFn   - 实际执行查询的异步函数
 * @returns 查询结果
 *
 * @example
 * ```typescript
 * const users = await monitorDatabaseQuery('SELECT', 'users', () =>
 *   db.query('SELECT * FROM users WHERE id = ?', [id])
 * );
 * ```
 */
export const monitorDatabaseQuery = async <T>(
  operation: string,
  table: string,
  queryFn: () => Promise<T>
): Promise<T> => {
  const start = Date.now();

  try {
    const result = await queryFn();
    const duration = (Date.now() - start) / 1000;

    // 记录成功的查询
    databaseQueryDuration
      .labels(operation, table, 'true', config.nodeEnv)
      .observe(duration);

    databaseQueriesTotal
      .labels(operation, table, 'true', config.nodeEnv)
      .inc();

    return result;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;

    // 记录失败的查询
    databaseQueryDuration
      .labels(operation, table, 'false', config.nodeEnv)
      .observe(duration);

    databaseQueriesTotal
      .labels(operation, table, 'false', config.nodeEnv)
      .inc();

    throw error;
  }
};

/**
 * Redis 操作监控装饰器
 *
 * 包裹 Redis 操作函数，自动记录操作耗时和成功/失败状态到 Prometheus 指标。
 *
 * @param operation    - 操作名称（如 GET, SET, DEL, ZADD）
 * @param operationFn  - 实际执行操作的异步函数
 * @returns 操作结果
 *
 * @example
 * ```typescript
 * const data = await monitorRedisOperation('GET', () =>
 *   redis.get('cache:key')
 * );
 * ```
 */
export const monitorRedisOperation = async <T>(
  operation: string,
  operationFn: () => Promise<T>
): Promise<T> => {
  const start = Date.now();

  try {
    const result = await operationFn();
    const duration = (Date.now() - start) / 1000;

    // 记录成功的操作
    redisOperationsDuration
      .labels(operation, 'true', config.nodeEnv)
      .observe(duration);

    redisOperationsTotal
      .labels(operation, 'true', config.nodeEnv)
      .inc();

    return result;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;

    // 记录失败的操作
    redisOperationsDuration
      .labels(operation, 'false', config.nodeEnv)
      .observe(duration);

    redisOperationsTotal
      .labels(operation, 'false', config.nodeEnv)
      .inc();

    throw error;
  }
};

/**
 * 更新数据库连接池指标
 *
 * 定期调用此函数将连接池统计信息同步到 Prometheus Gauge 指标。
 *
 * @param stats.total   - 连接池总连接数
 * @param stats.idle    - 连接池空闲连接数
 * @param stats.waiting - 连接池等待连接数
 */
export const updateDatabasePoolMetrics = (stats: {
  total: number;
  idle: number;
  waiting: number;
}) => {
  databaseConnectionPool
    .labels('total', config.nodeEnv)
    .set(stats.total);

  databaseConnectionPool
    .labels('idle', config.nodeEnv)
    .set(stats.idle);

  databaseConnectionPool
    .labels('waiting', config.nodeEnv)
    .set(stats.waiting);
};

/**
 * 获取所有 Prometheus 指标
 *
 * 在 /metrics 端点中调用此函数，返回 Prometheus 可抓取的纯文本格式指标。
 *
 * @returns Prometheus 格式的指标字符串
 */
export const getMetrics = async (): Promise<string> => {
  return await client.register.metrics();
};

/**
 * 重置所有指标
 *
 * 主要用于测试场景，在每个测试用例之间重置指标计数器，
 * 避免测试间的指标数据污染。
 */
export const resetMetrics = (): void => {
  client.register.resetMetrics();
};

/** Prometheus 注册表实例 */
export const register = client.register;
