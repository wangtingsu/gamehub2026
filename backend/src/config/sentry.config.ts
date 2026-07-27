/**
 * ============================================================
 * Sentry 应用监控配置
 * ============================================================
 *
 * 本文件定义了 Sentry（错误追踪和性能监控平台）的配置项。
 * Sentry 用于实时监控生产环境中的错误和性能问题，帮助开发团队
 * 快速定位和修复异常。
 *
 * 配置项全部通过环境变量驱动，包括 DSN、环境标识、采样率、
 * 性能监控开关以及错误/事务过滤规则。
 *
 * 参考文档：https://docs.sentry.io/platforms/node/
 *
 * @module config/sentry
 */

import dotenv from 'dotenv';

// 加载 .env 文件中的环境变量
dotenv.config();

/**
 * Sentry 监控配置对象
 *
 * 集中管理 Sentry SDK 初始化所需的所有配置，包括：
 * - DSN 连接信息
 * - 环境与发布版本标识
 * - 性能追踪（Tracing）配置
 * - 会话回放（Session Replay，仅前端）配置
 * - 错误和事务过滤规则
 */
const sentryConfig = {
  /**
   * Sentry DSN (Data Source Name)
   *
   * Sentry 项目的唯一标识，SDK 通过此地址上报事件。
   * 格式示例：https://<key>@o<org>.ingest.sentry.io/<project>
   * 可在 Sentry 项目设置中获取。
   */
  dsn: process.env.SENTRY_DSN || '',

  /**
   * Sentry 上报环境标识
   *
   * 用于区分不同运行环境的上报数据，方便在 Sentry 控制台
   * 中按环境过滤和筛选事件。
   *
   * 优先级：SENTRY_ENVIRONMENT > NODE_ENV > 'development'
   * 建议值：development / staging / production
   */
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',

  /**
   * 是否启用 Sentry 监控
   *
   * 自动根据 DSN 是否存在且不为占位值判断。
   * 当 DSN 未配置或仍为默认占位值时，视为禁用。
   */
  enabled: !!process.env.SENTRY_DSN && process.env.SENTRY_DSN !== 'your_sentry_dsn_here',

  /**
   * 性能追踪采样率
   *
   * 取值范围：0.0（不采样）~ 1.0（全部采样）
   * - 生产环境建议设为 0.1 ~ 0.3，平衡数据精度与性能开销
   * - 开发/测试环境可设为 1.0 以获取完整追踪数据
   *
   * 采样率影响：影响 Transaction 和 Span 的上报数量，
   * 与错误上报无关（错误始终 100% 上报）。
   */
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '1.0'),

  /**
   * Sentry SDK 调试模式
   *
   * 开启后 SDK 会向控制台输出详细的调试日志，
   * 用于排查 SDK 初始化或事件上报中的问题。
   * 建议仅在开发和排查问题时开启。
   */
  debug: process.env.SENTRY_DEBUG === 'true',

  /**
   * 发布版本标识
   *
   * 用于关联 Sentry 事件与特定的代码版本，
   * 便于在 Sentry 控制台中查看某次发布引入的问题。
   *
   * 优先级：SENTRY_RELEASE > npm_package_version > '1.0.0'
   * 建议与 CI/CD 中的 Git commit SHA 或版本号保持一致。
   */
  release: process.env.SENTRY_RELEASE || process.env.npm_package_version || '1.0.0',

  /**
   * 是否启用性能监控
   *
   * 开启后 Sentry 会自动追踪 HTTP 请求、数据库查询等操作的
   * 性能数据，并通过 tracesSampleRate 控制采样率。
   * 默认启用（除非显式设置为 false）。
   */
  enablePerformanceMonitoring: process.env.SENTRY_ENABLE_PERFORMANCE_MONITORING !== 'false',

  /**
   * 是否启用会话回放（仅前端相关）
   *
   * 会话回放可以记录用户在浏览器中的操作过程（点击、滚动、输入等），
   * 帮助重现导致错误的用户操作路径。
   * 注意：此配置当前仅用于前端项目，后端 Node.js 环境不适用。
   */
  enableSessionReplay: process.env.SENTRY_ENABLE_SESSION_REPLAY === 'true',

  /**
   * 忽略的错误类型列表
   *
   * 列表中指定的错误类型不会上报到 Sentry。
   * 适用于已知的业务逻辑错误，避免污染错误监控数据。
   *
   * 当前忽略的类型：
   * - ValidationError: 请求参数验证失败
   * - UnauthorizedError: 未认证访问
   * - ForbiddenError: 无权限访问
   * - NotFoundError: 资源不存在
   */
  ignoreErrors: [
    'ValidationError',
    'UnauthorizedError',
    'ForbiddenError',
    'NotFoundError',
  ],

  /**
   * 忽略的事务名称列表
   *
   * 列表中指定的 URL 路径不会进行性能追踪。
   * 适用于健康检查、监控探针等不需要追踪的请求。
   *
   * 当前忽略的路径：
   * - /health: 健康检查端点
   * - /metrics: 监控指标端点
   * - /favicon.ico: 浏览器自动请求的图标
   */
  ignoreTransactions: ['/health', '/metrics', '/favicon.ico'],
};

// ======================================================================
// 配置验证
// ======================================================================

/**
 * 验证 Sentry 配置完整性
 *
 * 当启用了 Sentry 但 DSN 未设置时，输出警告信息。
 * 此时 Sentry SDK 虽然初始化但不会发送任何数据。
 */
if (sentryConfig.enabled && !sentryConfig.dsn) {
  console.warn('⚠️  Sentry DSN未设置，Sentry监控已禁用');
}

export default sentryConfig;
