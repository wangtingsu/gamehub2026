/**
 * 全局 Config Mock — 替换 src/config 模块供测试使用
 *
 * 此文件位于 __mocks__/src/config.js，Jest 会在测试中自动使用它
 * 来替换实际的 src/config 模块（遵循 __mocks__ 的目录结构映射规则）。
 *
 * 提供与真实配置结构一致的测试配置：
 * - 数据库指向 SQLite 测试路径，避免污染开发/生产数据库
 * - JWT 密钥使用测试专用密钥
 * - 各类功能开关设置为适合测试环境的值
 * - Sentry 监控在生产环境关闭
 */
const config = {
  // —— 服务器配置 ——
  nodeEnv: 'test',
  port: 3000,
  host: 'localhost',
  apiPrefix: '/api/v1',

  // —— 数据库配置（SQLite 测试模式） ——
  database: {
    type: 'sqlite',
    url: 'sqlite://./data/test.db',
    path: './data/test.db',
    host: 'localhost',
    port: 5432,
    name: 'gamehub',
    user: 'postgres',
    password: 'password',
    maxConnections: 20,
    idleTimeout: 30000,
    connectionTimeout: 2000,
  },

  // —— Redis 配置 ——
  redis: {
    url: 'redis://localhost:6379',
    host: 'localhost',
    port: 6379,
    password: undefined,
    ttl: 3600,
  },

  // —— JWT 配置（测试专用密钥） ——
  jwt: {
    secret: 'test-secret',
    expiresIn: '3600',
    refreshSecret: 'test-refresh-secret',
    refreshExpiresIn: '604800',
  },

  // —— CORS 配置 ——
  cors: {
    origin: ['http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  },

  // —— 安全配置 ——
  security: {
    rateLimit: {
      windowMs: 900000,
      max: 100,
    },
    bcryptRounds: 10,
  },

  // —— 邮件配置 ——
  email: {
    host: 'smtp.gmail.com',
    port: 587,
    user: '',
    password: '',
    from: 'noreply@gamehub.com',
  },

  // —— 文件上传配置 ——
  upload: {
    maxSize: 10485760,
    path: './uploads',
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  },

  // —— 日志配置 ——
  log: {
    level: 'info',
    file: './logs/app.log',
  },

  // —— 外部 API 密钥 ——
  apiKeys: {
    steam: '',
    rawg: '',
  },

  // —— 功能开关 ——
  features: {
    enableEmailVerification: false,
    enableSocialLogin: false,
    enableTwoFactorAuth: false,
    enableRateLimiting: true,
    enableCaching: false,
  },

  // —— Sentry 监控配置 ——
  sentry: {
    dsn: '',
    environment: 'test',
    enabled: false,
    tracesSampleRate: 1.0,
    debug: false,
    release: '1.0.0',
    enablePerformanceMonitoring: false,
    ignoreErrors: ['ValidationError', 'UnauthorizedError', 'ForbiddenError', 'NotFoundError'],
    ignoreTransactions: ['/health', '/metrics', '/favicon.ico'],
  },
};

module.exports = config;
