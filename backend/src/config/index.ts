/**
 * ============================================================
 * 统一应用配置模块
 * ============================================================
 *
 * 本文件是 GameHub 后端的核心配置文件，从环境变量中读取所有运行时配置，
 * 提供结构化的配置对象供全局使用。
 *
 * 配置涵盖以下领域：
 * - 服务器基础配置（端口、主机、API 前缀等）
 * - 数据存储（数据库、Redis）
 * - ISR（增量静态再生）缓存策略
 * - 认证与安全（JWT、CORS、频率限制）
 * - 第三方服务集成（邮件、短信、云存储、AI 等）
 * - 社交登录 OAuth（Google、GitHub、QQ、微信等）
 * - 功能开关与管理员认证
 * - 应用监控（Sentry）
 *
 * 所有配置项均提供合理的默认值，确保在开发环境中开箱即用。
 * 生产环境部署时应通过 .env 文件或环境变量覆盖默认值。
 *
 * @module config/index
 */

import dotenv from 'dotenv';

// 加载 .env 文件中的环境变量到 process.env
dotenv.config();

/**
 * 应用全局配置对象
 *
 * 所有配置项均由环境变量驱动，环境变量不存在时回退到合理的默认值。
 * 建议在项目根目录创建 .env 文件以覆盖配置。
 */
const config = {
  // ======================================================================
  // 服务器基础配置
  // ======================================================================

  /** 运行环境：development / production / staging / test */
  nodeEnv: process.env.NODE_ENV || 'development',

  /** 服务器监听端口号 */
  port: parseInt(process.env.PORT || '3000', 10),

  /** 服务器绑定的主机地址 */
  host: process.env.HOST || 'localhost',

  /** API 路由前缀，如 /api/v1 */
  apiPrefix: process.env.API_PREFIX || '/api/v1',

  /** 站点完整 URL，用于生成绝对链接（如 OAuth 回调、邮件链接） */
  siteUrl: process.env.SITE_URL || `http://localhost:${parseInt(process.env.PORT || '3000', 10)}`,

  // ======================================================================
  // 数据库配置
  // ======================================================================

  database: {
    /** 数据库类型：sqlite（默认，本地与生产统一）/ postgres（可选，未维护） */
    type: process.env.DB_TYPE || 'sqlite',

    /** 数据库连接 URL（优先使用，支持 SQLite 和 PostgreSQL） */
    url: process.env.DATABASE_URL || 'sqlite://./data/gamehub.db',

    /** SQLite 数据库文件路径（仅 SQLite 适用） */
    path: process.env.DB_PATH || './data/gamehub.db',

    /** 数据库主机地址 */
    host: process.env.DB_HOST || 'localhost',

    /** 数据库端口号 */
    port: parseInt(process.env.DB_PORT || '5432', 10),

    /** 数据库名称 */
    name: process.env.DB_NAME || 'gamehub',

    /** 数据库用户名 */
    user: process.env.DB_USER || 'postgres',

    /** 数据库密码 */
    password: process.env.DB_PASSWORD || 'password',

    /** 数据库连接池最大连接数 */
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),

    /** 连接空闲超时时间（毫秒） */
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),

    /** 连接超时时间（毫秒） */
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000', 10),
  },

  // ======================================================================
  // Redis 缓存配置
  // ======================================================================

  redis: {
    /** Redis 完整连接 URL（优先使用） */
    url: process.env.REDIS_URL || 'redis://localhost:6379',

    /** Redis 主机地址 */
    host: process.env.REDIS_HOST || 'localhost',

    /** Redis 端口号 */
    port: parseInt(process.env.REDIS_PORT || '6379', 10),

    /** Redis 认证密码（可选） */
    password: process.env.REDIS_PASSWORD || undefined,

    /** 缓存默认 TTL（秒），默认 1 小时 */
    ttl: parseInt(process.env.REDIS_TTL || '3600', 10),
  },

  // ======================================================================
  // ISR（增量静态再生）缓存策略配置
  // ======================================================================
  //
  // ISR 是 Next.js 风格的增量静态再生机制，使后端能在缓存过期后
  // 异步重新生成页面内容，而不阻塞用户请求。
  // - freshTTL: 缓存新鲜期，期间直接返回缓存
  // - staleTTL: 缓存过后期，期间返回过期缓存 + 后台触发重新生成
  // - detail: 详情页配置（TTL 较短）
  // - user: 用户相关页面配置（TTL 最短）
  // - static: 静态页面配置（TTL 最长）
  // - dynamic: 动态列表页配置（TTL 居中）

  isr: {
    /** 是否启用 ISR 缓存机制，默认为 true */
    enabled: process.env.ENABLE_ISR !== 'false',

    /** 全局默认新鲜期（秒），默认 5 分钟 */
    freshTTL: parseInt(process.env.ISR_FRESH_TTL || '300', 10),

    /** 陈旧期倍数（相对新鲜期），默认 2 倍 */
    staleMultiplier: parseInt(process.env.ISR_STALE_MULTIPLIER || '2', 10),

    /** 是否启用 Stale-While-Revalidate 模式，默认为 true */
    enableStaleWhileRevalidate: process.env.ISR_ENABLE_STALE_WHILE_REVALIDATE !== 'false',

    /** 是否启用后台重新验证，默认为 true */
    backgroundRevalidation: process.env.ISR_BACKGROUND_REVALIDATION !== 'false',

    /** 最大并发重新验证数，防止资源耗尽 */
    maxConcurrentRevalidations: parseInt(process.env.ISR_MAX_CONCURRENT_REVALIDATIONS || '5', 10),

    /** 静态页面新鲜期（秒），默认 1 小时 */
    freshTTLStatic: parseInt(process.env.ISR_FRESH_TTL_STATIC || '3600', 10),

    /** 动态列表页新鲜期（秒），默认 5 分钟 */
    freshTTLDynamic: parseInt(process.env.ISR_FRESH_TTL_DYNAMIC || '300', 10),

    /** 详情页新鲜期（秒），默认 1 分钟 */
    freshTTLDetail: parseInt(process.env.ISR_FRESH_TTL_DETAIL || '60', 10),

    /** 用户相关页面新鲜期（秒），默认 30 秒 */
    freshTTLUser: parseInt(process.env.ISR_FRESH_TTL_USER || '30', 10),

    /** 静态页面陈旧期（秒），默认 2 小时 */
    staleTTLStatic: parseInt(process.env.ISR_STALE_TTL_STATIC || '7200', 10),

    /** 动态列表页陈旧期（秒），默认 10 分钟 */
    staleTTLDynamic: parseInt(process.env.ISR_STALE_TTL_DYNAMIC || '600', 10),

    /** 详情页陈旧期（秒），默认 5 分钟 */
    staleTTLDetail: parseInt(process.env.ISR_STALE_TTL_DETAIL || '300', 10),

    /** 用户页面陈旧期（秒），默认 1 分钟 */
    staleTTLUser: parseInt(process.env.ISR_STALE_TTL_USER || '60', 10),
  },

  // ======================================================================
  // JWT（JSON Web Token）认证配置
  // ======================================================================

  jwt: {
    /** 访问令牌签名密钥（生产环境必须修改！） */
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',

    /** 访问令牌有效期，默认 7 天 */
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',

    /** 刷新令牌签名密钥（生产环境必须修改！） */
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-token-secret',

    /** 刷新令牌有效期，默认 30 天 */
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // ======================================================================
  // CORS（跨域资源共享）配置
  // ======================================================================

  cors: {
    /** 允许的跨域来源列表，多个来源以逗号分隔 */
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:5173',
      'http://localhost:5174',
    ],

    /** 是否允许携带凭据（Cookies、HTTP 认证） */
    credentials: true,

    /** 允许的 HTTP 方法 */
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

    /** 允许的自定义请求头 */
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  },

  // ======================================================================
  // 安全配置
  // ======================================================================

  security: {
    /** API 频率限制配置 */
    rateLimit: {
      /** 时间窗口大小（毫秒），默认 15 分钟 */
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),

      /** 时间窗口内最大请求次数，默认 100 次 */
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },

    /** bcrypt 密码哈希轮数，越高越安全但越慢，默认 12 */
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  },

  // ======================================================================
  // 邮件服务配置（SMTP）
  // ======================================================================

  email: {
    /** SMTP 服务器地址 */
    host: process.env.SMTP_HOST || 'smtp.gmail.com',

    /** SMTP 端口号 */
    port: parseInt(process.env.SMTP_PORT || '587', 10),

    /** 是否使用 SSL/TLS 安全连接 */
    secure: process.env.SMTP_SECURE === 'true',

    /** SMTP 登录用户名 */
    user: process.env.SMTP_USER || '',

    /** SMTP 登录密码 */
    password: process.env.SMTP_PASSWORD || '',

    /** 发件人邮箱地址 */
    from: process.env.EMAIL_FROM || 'noreply@gamehub.com',

    /** 发件人显示名称 */
    fromName: process.env.EMAIL_FROM_NAME || 'GameHub',

    /** 回复邮箱地址（可选，默认为发件人地址） */
    replyTo: process.env.EMAIL_REPLY_TO || '',

    /** 邮件模板配置 */
    templates: {
      /** 邮件模板文件目录路径 */
      path: process.env.EMAIL_TEMPLATES_PATH || './templates/email',

      /** 模板引擎类型，默认 handlebars */
      engine: process.env.EMAIL_TEMPLATE_ENGINE || 'handlebars',
    },

    /** 邮件发送重试策略 */
    retry: {
      /** 最大重试次数 */
      maxAttempts: parseInt(process.env.EMAIL_RETRY_MAX_ATTEMPTS || '3', 10),

      /** 重试间隔（毫秒） */
      delay: parseInt(process.env.EMAIL_RETRY_DELAY || '5000', 10),
    },

    /** 邮件测试模式配置 */
    test: {
      /** 是否启用测试模式（不实际发送邮件） */
      enabled: process.env.EMAIL_TEST_MODE === 'true',

      /** 是否将邮件内容捕获到文件 */
      captureToFile: process.env.EMAIL_CAPTURE_TO_FILE === 'true',

      /** 邮件捕获输出文件路径 */
      filePath: process.env.EMAIL_CAPTURE_FILE_PATH || './logs/emails.log',
    },

    /** 邮件队列配置 */
    queue: {
      /** 是否启用邮件发送队列 */
      enabled: process.env.EMAIL_QUEUE_ENABLED === 'true',

      /** 队列并发处理数 */
      concurrency: parseInt(process.env.EMAIL_QUEUE_CONCURRENCY || '5', 10),
    },
  },

  // ======================================================================
  // 文件上传配置
  // ======================================================================

  upload: {
    /** 上传文件最大字节数，默认 20MB */
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE || '52428800', 10),

    /** 上传文件存储目录 */
    path: process.env.UPLOAD_PATH || './uploads',

    /** 上传临时文件目录 */
    tempPath: process.env.UPLOAD_TEMP_PATH || './uploads/temp',

    /** 允许上传的 MIME 类型列表 */
    allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/bmp',
      'image/tiff',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
    ],

    /** 图片处理配置 */
    image: {
      /** 图片最大宽度（像素） */
      maxWidth: parseInt(process.env.IMAGE_MAX_WIDTH || '1920', 10),

      /** 图片最大高度（像素） */
      maxHeight: parseInt(process.env.IMAGE_MAX_HEIGHT || '1080', 10),

      /** 图片压缩质量（1-100） */
      quality: parseInt(process.env.IMAGE_QUALITY || '85', 10),
    },

    /** CDN 加速配置 */
    cdn: {
      /** 是否启用 CDN */
      enabled: process.env.CDN_ENABLED === 'true',

      /** CDN 基础 URL */
      baseUrl: process.env.CDN_BASE_URL || '',

      /** CDN 服务提供商，默认 local（本地存储） */
      provider: process.env.CDN_PROVIDER || 'local',
    },

    /** 上传验证配置 */
    validation: {
      /** 是否检查 MIME 类型 */
      checkMimeType: process.env.UPLOAD_CHECK_MIME !== 'false',

      /** 是否检查文件大小 */
      checkFileSize: process.env.UPLOAD_CHECK_SIZE !== 'false',

      /** 是否启用病毒扫描 */
      virusScan: process.env.UPLOAD_VIRUS_SCAN === 'true',
    },
  },

  // ======================================================================
  // 日志配置
  // ======================================================================

  log: {
    /** 日志级别：error / warn / info / debug */
    level: process.env.LOG_LEVEL || 'info',

    /** 日志文件输出路径 */
    file: process.env.LOG_FILE || './logs/app.log',
  },

  // ======================================================================
  // 第三方 API 密钥配置
  // ======================================================================

  apiKeys: {
    /** Steam 平台 API 密钥 */
    steam: process.env.STEAM_API_KEY || '',

    /** RAWG 游戏数据库 API 密钥 */
    rawg: process.env.RAWG_API_KEY || '',
  },

  // ======================================================================
  // DeepSeek AI 配置（用于智能推荐、内容生成等功能）
  // ======================================================================

  deepseek: {
    /** DeepSeek API 密钥 */
    apiKey: process.env.DEEPSEEK_API_KEY || '',

    /** DeepSeek API 基础 URL */
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',

    /** 使用的模型名称 */
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',

    /** 每次请求的最大生成 token 数 */
    maxTokens: parseInt(process.env.DEEPSEEK_MAX_TOKENS || '2048', 10),

    /** API 请求超时时间（毫秒） */
    timeout: parseInt(process.env.DEEPSEEK_TIMEOUT || '30000', 10),

    /** 是否启用 DeepSeek 功能（自动根据 API Key 是否存在判断） */
    enabled: !!process.env.DEEPSEEK_API_KEY,
  },

  // ======================================================================
  // Meshy 3D 模型生成配置
  // ======================================================================

  meshy: {
    /** Meshy API 密钥 */
    apiKey: process.env.MESHY_API_KEY || '',

    /** Meshy API 基础 URL */
    baseUrl: process.env.MESHY_BASE_URL || 'https://api.meshy.ai/v1',

    /** API 请求超时时间（毫秒），3D 生成耗时较长 */
    timeout: parseInt(process.env.MESHY_TIMEOUT || '60000', 10),

    /** 是否启用 Meshy 功能 */
    enabled: !!process.env.MESHY_API_KEY && process.env.MESHY_API_KEY !== 'your_meshy_api_key_here',
  },

  // ======================================================================
  // 功能开关配置
  // ======================================================================

  features: {
    /** 是否启用邮箱验证功能 */
    enableEmailVerification: process.env.ENABLE_EMAIL_VERIFICATION === 'true',

    /** 是否启用社交账号登录 */
    enableSocialLogin: process.env.ENABLE_SOCIAL_LOGIN === 'true',

    /** 是否启用双因素认证 */
    enableTwoFactorAuth: process.env.ENABLE_TWO_FACTOR_AUTH === 'true',

    /** 是否启用 API 频率限制（默认启用） */
    enableRateLimiting: process.env.ENABLE_RATE_LIMITING !== 'false',

    /** 是否启用缓存（默认启用） */
    enableCaching: process.env.ENABLE_CACHING !== 'false',

    /** 是否启用手机号登录（默认启用） */
    enablePhoneLogin: process.env.ENABLE_PHONE_LOGIN !== 'false',
  },

  // ======================================================================
  // 短信服务配置
  // ======================================================================

  sms: {
    /** 短信服务提供商：mock / aliyun / tencent 等 */
    provider: process.env.SMS_PROVIDER || 'mock',

    /** 短信 API 访问密钥 ID */
    accessKeyId: process.env.SMS_ACCESS_KEY_ID || '',

    /** 短信 API 访问密钥 Secret */
    accessKeySecret: process.env.SMS_ACCESS_KEY_SECRET || '',

    /** 短信签名 */
    signName: process.env.SMS_SIGN_NAME || 'GameHub',

    /** 短信模板 Code */
    templateCode: process.env.SMS_TEMPLATE_CODE || '',

    /** 短信服务区域 */
    region: process.env.SMS_REGION || 'cn-hangzhou',

    /** 是否启用测试模式（默认开启，不实际发送短信） */
    testMode: process.env.SMS_TEST_MODE !== 'false',

    /** 验证码位数 */
    codeLength: parseInt(process.env.SMS_CODE_LENGTH || '6', 10),

    /** 验证码过期时间（秒），默认 5 分钟 */
    codeExpiresIn: parseInt(process.env.SMS_CODE_EXPIRES_IN || '300', 10),

    /** 验证码重发间隔（秒），默认 60 秒 */
    resendInterval: parseInt(process.env.SMS_RESEND_INTERVAL || '60', 10),

    /** 腾讯云短信专用配置 */
    tencent: {
      /** 腾讯云 SecretId */
      secretId: process.env.TENCENT_SECRET_ID || process.env.TENCENTCLOUD_SECRET_ID || '',

      /** 腾讯云 SecretKey */
      secretKey: process.env.TENCENT_SECRET_KEY || process.env.TENCENTCLOUD_SECRET_KEY || '',

      /** 短信应用 SDK AppID */
      smsSdkAppId: process.env.SMS_SDK_APP_ID || '',

      /** 短信模板 ID */
      templateId: process.env.SMS_TEMPLATE_ID || process.env.SMS_TEMPLATE_CODE || '',

      /** 腾讯云短信区域 */
      region: process.env.TENCENT_SMS_REGION || process.env.SMS_REGION || 'ap-guangzhou',

      /** 腾讯云短信签名 */
      signName: process.env.TENCENT_SMS_SIGN_NAME || process.env.SMS_SIGN_NAME || 'GameHub',
    },
  },

  // ======================================================================
  // OAuth 社交登录配置
  // ======================================================================

  oauth: {
    /** OAuth 登录成功后重定向的前端地址 */
    frontendUrl: process.env.OAUTH_FRONTEND_URL || process.env.SITE_URL || 'http://localhost:5176',

    /** Google OAuth 配置 */
    google: {
      /** Google OAuth 客户端 ID */
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      /** Google OAuth 客户端密钥 */
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      /** Google OAuth 回调 URL */
      callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/v1/auth/oauth/google/callback',
      /** 是否启用 Google 登录 */
      enabled: !!process.env.GOOGLE_CLIENT_ID,
    },

    /** GitHub OAuth 配置 */
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      callbackUrl: process.env.GITHUB_CALLBACK_URL || `http://localhost:${parseInt(process.env.PORT || '3000', 10)}/api/v1/auth/oauth/github/callback`,
      enabled: !!process.env.GITHUB_CLIENT_ID,
    },

    /** Facebook OAuth 配置 */
    facebook: {
      clientId: process.env.FACEBOOK_APP_ID || '',
      clientSecret: process.env.FACEBOOK_APP_SECRET || '',
      callbackUrl: process.env.FACEBOOK_CALLBACK_URL || `http://localhost:${parseInt(process.env.PORT || '3000', 10)}/api/v1/auth/oauth/facebook/callback`,
      enabled: !!process.env.FACEBOOK_APP_ID,
    },

    /** Twitter OAuth 配置 */
    twitter: {
      clientId: process.env.TWITTER_CLIENT_ID || '',
      clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
      callbackUrl: process.env.TWITTER_CALLBACK_URL || `http://localhost:${parseInt(process.env.PORT || '3000', 10)}/api/v1/auth/oauth/twitter/callback`,
      enabled: !!process.env.TWITTER_CLIENT_ID,
    },

    /** QQ OAuth 配置 */
    qq: {
      /** QQ 互联 APP ID */
      appId: process.env.QQ_APP_ID || '',
      /** QQ 互联 APP Key */
      appKey: process.env.QQ_APP_KEY || '',
      /** QQ 登录回调 URL */
      callbackUrl: process.env.QQ_CALLBACK_URL || `http://localhost:${parseInt(process.env.PORT || '3000', 10)}/api/v1/auth/oauth/qq/callback`,
      enabled: !!process.env.QQ_APP_ID,
    },

    /** 微信 OAuth 配置 */
    wechat: {
      /** 微信开放平台 APP ID */
      appId: process.env.WECHAT_APP_ID || '',
      /** 微信开放平台 APP Secret */
      appSecret: process.env.WECHAT_APP_SECRET || '',
      /** 微信登录回调 URL */
      callbackUrl: process.env.WECHAT_CALLBACK_URL || `http://localhost:${parseInt(process.env.PORT || '3000', 10)}/api/v1/auth/oauth/wechat/callback`,
      enabled: !!process.env.WECHAT_APP_ID,
    },

    /** Apple OAuth 配置 */
    apple: {
      /** Apple 服务 ID（Client ID） */
      clientId: process.env.APPLE_CLIENT_ID || '',
      /** Apple 开发者团队 ID */
      teamId: process.env.APPLE_TEAM_ID || '',
      /** Apple 私钥 Key ID */
      keyId: process.env.APPLE_KEY_ID || '',
      /** Apple 私钥文件路径 */
      privateKeyPath: process.env.APPLE_PRIVATE_KEY_PATH || '',
      /** Apple 登录回调 URL */
      callbackUrl: process.env.APPLE_CALLBACK_URL || `http://localhost:${parseInt(process.env.PORT || '3000', 10)}/api/v1/auth/oauth/apple/callback`,
      enabled: !!process.env.APPLE_CLIENT_ID,
    },
  },

  // ======================================================================
  // 管理员独立认证配置
  // ======================================================================

  admin: {
    /** 管理员登录用户名 */
    username: process.env.ADMIN_USERNAME || 'admin',
    /** 管理员登录密码 */
    password: process.env.ADMIN_PASSWORD || 'admin123',
    /** 管理员 JWT 签名密钥 */
    jwtSecret: process.env.ADMIN_JWT_SECRET || 'gamehub-admin-jwt-secret-default',
    /** 管理员 JWT 有效期 */
    jwtExpiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '8h',
    /** 管理后台服务端口 */
    port: parseInt(process.env.ADMIN_PORT || '3002', 10),
    /** 管理后台服务主机 */
    host: process.env.ADMIN_HOST || process.env.HOST || 'localhost',
  },

  // ======================================================================
  // Sentry 应用监控配置
  // ======================================================================

  sentry: {
    /** Sentry DSN（Data Source Name） */
    dsn: process.env.SENTRY_DSN || '',
    /** Sentry 上报环境标识 */
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    /** 是否启用 Sentry 监控 */
    enabled: !!process.env.SENTRY_DSN && process.env.SENTRY_DSN !== 'your_sentry_dsn_here',
    /** 性能追踪采样率（0.0 ~ 1.0） */
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '1.0'),
    /** Sentry 调试模式 */
    debug: process.env.SENTRY_DEBUG === 'true',
    /** 发布版本标识 */
    release: process.env.SENTRY_RELEASE || process.env.npm_package_version || '1.0.0',
    /** 是否启用性能监控（默认启用） */
    enablePerformanceMonitoring: process.env.SENTRY_ENABLE_PERFORMANCE_MONITORING !== 'false',
    /** 忽略的错误类型列表（这些错误不上报 Sentry） */
    ignoreErrors: [
      'ValidationError',
      'UnauthorizedError',
      'ForbiddenError',
      'NotFoundError',
    ],
    /** 忽略的事务名称列表（这些 URL 路径不进行性能追踪） */
    ignoreTransactions: ['/health', '/metrics', '/favicon.ico'],
  },
} as const;

// ======================================================================
// 环境变量验证
// ======================================================================

/**
 * 生产环境必需的配置项列表
 * 在启动时检查这些环境变量是否已设置，未设置时打印警告。
 */
const requiredEnvVars = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

// 生产环境下额外要求数据库和缓存配置
if (config.nodeEnv === 'production') {
  requiredEnvVars.push('DATABASE_URL', 'REDIS_URL');
}

// 检查必需的环境变量并输出警告
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`⚠️  警告: 环境变量 ${envVar} 未设置`);
  }
}

export default config;
