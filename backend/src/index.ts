/**
 * GameHub API 服务器主入口
 *
 * 这是 GameHub 后端的 Express 应用主入口文件。
 * 负责初始化 HTTP 服务器、Socket.IO、数据库连接、Redis 缓存、
 * SSG/SSR 渲染引擎和各种业务路由。
 *
 * 功能特性：
 * - Express + HTTP 服务器
 * - Socket.IO 实时通信
 * - Sentry 错误监控
 * - Prometheus 性能指标
 * - 数据库自动迁移
 * - Redis 缓存（可选）
 * - SSR 服务端渲染（可选，失败自动降级为 SPA）
 * - 全局限流保护
 * - 优雅关闭
 *
 * @module src/index
 * @see {@link ./admin-index.ts} 管理后台服务器入口
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { setSocketIO } from './services/socket.service';
import { createServer } from 'http';
import { Server } from 'socket.io';
import * as Sentry from '@sentry/node';

/** 加载 .env 环境变量文件 */
dotenv.config();

// 导入配置
import config from './config';
import logger from './utils/logger';
import { connectDatabase, runMigrations } from './db';
import { connectRedis } from './services/redis.service';
import { initSentry } from './monitoring/sentry';

// 导入路由
import session from 'express-session';
import passport from 'passport';
import authRoutes from './routes/auth.routes';
// import smsRoutes from './routes/sms.routes'; // 手机短信功能已禁用
import oauthRoutes from './routes/oauth.routes';
import userRoutes from './routes/user.routes';
import gameRoutes from './routes/game.routes';
import newsRoutes from './routes/news.routes';
import communityRoutes from './routes/community.routes';
import uploadRoutes from './routes/upload.routes';
import emailRoutes from './routes/email.routes';
import favoriteRoutes from './routes/favorite.routes';
// import testRoutes from './routes/test.routes';
import commentRoutes from './routes/comment.routes';
import notificationRoutes from './routes/notification.routes';
import followRoutes from './routes/follow.routes';
import likeRoutes from './routes/like.routes';
import searchRoutes from './routes/search.routes';
import discoveryRoutes from './routes/discovery.routes';
import sitemapRoutes from './routes/sitemap.routes';
import apiSitemapRoutes from './routes/api-sitemap.routes';
import gameLibraryRoutes from './routes/game-library.routes';
import aboutRoutes from './routes/about.routes';
import aiRoutes from './routes/ai.routes';
import gamificationRoutes from './routes/gamification.routes';
import achievementRoutes from './routes/achievement.routes';
import messageRoutes from './routes/message.routes';
import guideRoutes from './routes/guide.routes';
import blogRoutes from './routes/blog.routes';
import blogSpacesRoutes from './routes/blog-spaces.routes';
import printRoutes from './routes/print.routes';
import newsletterRoutes from './routes/newsletter.routes';
import recommendRoutes from './routes/recommend.routes';
import adminRoutes from './routes/admin.routes';
import adminReviewRoutes from './routes/admin-review.routes';
import adminRecommendRoutes from './routes/admin-recommend.routes';
import { newsletterScheduler } from './services/newsletter-scheduler.service';
import llmsRoutes from './routes/llms.routes';

// 导入中间件
import { errorHandler, notFoundHandler, handleUnhandledRejection, handleUncaughtException } from './middlewares/error.middleware';
import { requestLogger } from './middlewares/logger.middleware';
import { staticCacheMiddleware, conditionalCacheMiddleware } from './middlewares/cache.middleware';
import { createRateLimiter } from './middlewares/rateLimit.middleware';
import { metricsMiddleware, getMetrics, register } from './monitoring/prometheus.metrics';
import { languageMiddleware } from './middlewares/language.middleware';
import { ssrMiddleware } from './middlewares/ssr.middleware';
import { initSSRRenderer } from './services/ssr-render.service';

const app = express();
app.set('trust proxy', true);

// 初始化Sentry监控
const isSentryEnabled = initSentry();

// 添加Sentry请求处理中间件（必须在其他中间件之前）
if (isSentryEnabled) {
  // @ts-ignore
  app.use((Sentry as any).Handlers.requestHandler());
  // @ts-ignore
  app.use((Sentry as any).Handlers.tracingHandler());
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: config.cors.origin,
    credentials: true
  }
});

// 初始化 Socket.IO 服务模块
setSocketIO(io);

/**
 * 扩展 Express Request 接口
 *
 * 在 Express 的 Request 对象上注入 Socket.IO 服务器实例，
 * 使路由处理函数可以直接通过 req.io 向客户端发送实时消息。
 */
declare global {
  namespace Express {
    interface Request {
      /** Socket.IO 服务器实例 */
      io?: Server;
    }
  }
}

// 基础中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // SSR 需要 unsafe-inline 以执行内联 hydration 脚本（__DEHYDRATED_STATE__）
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "ws:", "wss:", "blob:"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
    },
  },
}));
app.use(compression());
app.use(cors({ ...config.cors, methods: [...config.cors.methods], allowedHeaders: [...config.cors.allowedHeaders] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务 - 提供上传文件的访问
app.use('/uploads', express.static(path.resolve(config.upload.path)));

// 提供前端客户端静态资源（SSR 页面引用的 /assets/... 等）
// 注意：需要同时挂载多个目录：
//   - dist/client/ — 主构建输出（assets/entries/renderer_default.page.client.*.js）
//   - dist/hydrate/ — 独立 hydration 构建输出（assets/hydrate.*.js）
// 不使用 break，以便所有存在的目录都被挂载
const frontendDistPaths = [
  '/app/frontend-dist',
  path.join(__dirname, '../../frontend-dist'),
  path.join(__dirname, '../../../frontend/dist/client'),
  path.join(__dirname, '../../../frontend/dist/hydrate'),
  path.join(__dirname, '../../frontend/dist/client'),
  path.join(__dirname, '../../frontend/dist/hydrate'),
];
for (const p of frontendDistPaths) {
  if (fs.existsSync(p)) {
    app.use(express.static(p));
  }
}

// 缓存中间件
// 为静态资源设置长缓存（24小时）
app.use(staticCacheMiddleware(86400));

// 为API GET请求设置短缓存（5分钟）
app.use(conditionalCacheMiddleware({
  include: [/^\/api\/v1\/(games|news|reviews|guides)(\/[^\/]+)?$/],
  exclude: [/^\/api\/v1\/(auth|users)/, /\/admin\//],
  duration: 300 // 5分钟
}));

// 请求日志中间件
app.use(requestLogger)

// 语言中间件
app.use(languageMiddleware)

// Session 中间件（用于 Passport OAuth）
app.use(session({
  secret: process.env.SESSION_SECRET || 'gamehub-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.nodeEnv === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24小时
  },
}));

// Passport 初始化
app.use(passport.initialize());
app.use(passport.session());

// 性能指标中间件
app.use(metricsMiddleware);

// Socket.IO 中间件
app.use((req, _, next) => {
  req.io = io;
  next();
});

// Sitemap路由（根级别，不在API前缀下）
app.use(sitemapRoutes);

// llms.txt 路由（根级别，符合 llmstxt.org 规范）
app.use(llmsRoutes);

/**
 * 根路由处理
 *
 * - 浏览器请求（Accept: text/html）：交由 SSR 中间件处理，返回服务器端渲染的 HTML 页面
 * - API 请求（Accept: application/json）：返回 API 服务基本信息 JSON
 *
 * @route GET /
 * @returns {Object} API 服务信息（name, version, docs, health）
 */
app.get('/', (req, res, next) => {
  /** 浏览器请求交由 SSR 中间件处理 */
  if (req.accepts('html')) {
    return next()
  }
  res.status(200).json({
    success: true,
    data: {
      name: 'GameHub API',
      version: '1.0.0',
      docs: '/api-docs',
      health: '/health',
    },
    message: 'GameHub API 服务运行中',
  });
});

/**
 * 健康检查端点
 *
 * 返回服务器运行状态，用于负载均衡器和监控系统的健康检测。
 * 无认证要求，始终返回 200。
 *
 * @route GET /health
 * @returns {Object} 健康状态（status, timestamp, uptime, environment）
 */
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv
  });
});

// 根路径端点 - 由 SSR 中间件处理 HTML 渲染
// API 信息可通过 /api/v1/info 或 /health 获取

/**
 * Prometheus 性能指标端点
 *
 * 返回 Prometheus 格式的应用性能指标数据，供监控系统采集。
 * 指标包括 HTTP 请求数、请求延迟、内存使用等。
 *
 * @route GET /metrics
 * @returns {string} Prometheus 格式的指标文本
 */
app.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await getMetrics();
    res.send(metrics);
  } catch (error) {
    logger.error('获取指标失败:', error);
    res.status(500).send('获取指标失败');
  }
});

// 动态Sitemap — 由 sitemap.routes.ts 处理

// 创建并应用全局限流器（仅在启用时创建，避免 Redis 未连接时不断重试）
let rateLimiters: any = { public: (_req: any, _res: any, next: any) => next() };
if (config.features.enableRateLimiting) {
  rateLimiters = createRateLimiter();
}
app.use(rateLimiters.public);

// API路由
app.use(`${config.apiPrefix}/auth`, authRoutes);
// app.use(`${config.apiPrefix}/auth`, smsRoutes); // 手机短信功能已禁用
app.use(`${config.apiPrefix}/auth`, oauthRoutes);
app.use(`${config.apiPrefix}/users`, userRoutes);
app.use(`${config.apiPrefix}/games`, gameRoutes);
app.use(`${config.apiPrefix}/news`, newsRoutes);
app.use(`${config.apiPrefix}/community`, communityRoutes);
// 旧 reviews 路径兼容重定向（评测已合并到 /community/reviews）
app.use(`${config.apiPrefix}/reviews`, (req, res) => {
  const newPath = req.originalUrl.replace(config.apiPrefix + '/reviews', config.apiPrefix + '/community/reviews');
  res.redirect(301, newPath);
});
app.use(`${config.apiPrefix}/upload`, uploadRoutes);
app.use(`${config.apiPrefix}/email`, emailRoutes);
app.use(`${config.apiPrefix}/favorites`, favoriteRoutes);
app.use(`${config.apiPrefix}/library`, gameLibraryRoutes);
app.use(`${config.apiPrefix}/about`, aboutRoutes);
// app.use(`${config.apiPrefix}/test`, testRoutes);
app.use(`${config.apiPrefix}/comments`, commentRoutes);
app.use(`${config.apiPrefix}/notifications`, notificationRoutes);
app.use(`${config.apiPrefix}/follow`, followRoutes);
app.use(`${config.apiPrefix}/like`, likeRoutes);
app.use(`${config.apiPrefix}/search`, searchRoutes);
app.use(`${config.apiPrefix}/discovery`, discoveryRoutes);
app.use(`${config.apiPrefix}/sitemap`, apiSitemapRoutes);
app.use(`${config.apiPrefix}/gamification`, gamificationRoutes);
app.use(`${config.apiPrefix}/achievements`, achievementRoutes);
app.use(`${config.apiPrefix}/messages`, messageRoutes);
app.use(`${config.apiPrefix}/guides`, guideRoutes);
app.use(`${config.apiPrefix}/ai`, aiRoutes);
app.use(`${config.apiPrefix}/blogs`, blogRoutes);
app.use(`${config.apiPrefix}/blog-spaces`, blogSpacesRoutes);
app.use(`${config.apiPrefix}/print`, printRoutes);
app.use(`${config.apiPrefix}/admin`, adminRoutes);
app.use(`${config.apiPrefix}/admin`, adminReviewRoutes);
app.use(`${config.apiPrefix}/admin`, adminRecommendRoutes);
app.use(`${config.apiPrefix}/recommend`, recommendRoutes);
app.use(`${config.apiPrefix}/newsletter`, newsletterRoutes);

// 文档路由（开发环境）
if (config.nodeEnv === 'development') {
  // 动态加载Swagger文档（可选依赖）
  const setupSwagger = async () => {
    try {
      const swaggerUI = await import('swagger-ui-express');
      const yaml = await import('yaml');
      const fs = await import('fs');

      // 检查Swagger文档文件是否存在
      const swaggerPath = '../docs/swagger.yaml';
      if (!fs.existsSync(swaggerPath)) {
        logger.warn(`Swagger文档文件不存在: ${swaggerPath}`);
        return;
      }

      const swaggerDocument = yaml.parse(fs.readFileSync(swaggerPath, 'utf8'));
      app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocument));
      logger.info('Swagger文档已启用: /api-docs');
    } catch (error) {
      logger.warn('Swagger文档加载失败，跳过文档生成:', error instanceof Error ? error.message : String(error));
    }
  };

  setupSwagger().catch((error) => {
    logger.error('Swagger初始化失败:', error);
  });
}

// SSR中间件 - 处理所有非API请求的服务器端渲染
app.use(ssrMiddleware);

// 错误处理中间件
// 添加Sentry错误处理中间件（必须在自定义错误处理中间件之前）
if (isSentryEnabled) {
  // @ts-ignore
  app.use((Sentry as any).Handlers.errorHandler());
}
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * Socket.IO 连接事件处理
 *
 * 处理 WebSocket 客户端的连接和房间管理事件。
 * 使用房间（Room）机制实现消息的定向推送：
 * - 每个用户有自己的通知房间（notifications:{userId}）
 * - 支持通用房间的加入和离开
 */
io.on('connection', (socket) => {
  logger.info(`Socket连接建立: ${socket.id}`);

  /** 用户加入自己的通知房间，用于接收实时通知推送 */
  socket.on('join:notifications', (userId: string) => {
    const roomName = `notifications:${userId}`;
    socket.join(roomName);
    logger.info(`Socket ${socket.id} 加入通知房间: ${roomName}`);
  });

  /** 用户加入指定房间（通用房间机制） */
  socket.on('join:room', (roomId: string) => {
    socket.join(roomId);
    logger.info(`Socket ${socket.id} 加入房间: ${roomId}`);
  });

  /** 用户离开指定房间 */
  socket.on('leave:room', (roomId: string) => {
    socket.leave(roomId);
    logger.info(`Socket ${socket.id} 离开房间: ${roomId}`);
  });

  /** 用户离开通知房间 */
  socket.on('leave:notifications', (userId: string) => {
    const roomName = `notifications:${userId}`;
    socket.leave(roomName);
    logger.info(`Socket ${socket.id} 离开通知房间: ${roomName}`);
  });

  /** 连接断开事件 */
  socket.on('disconnect', () => {
    logger.info(`Socket连接断开: ${socket.id}`);
  });
});

/**
 * 启动服务器
 *
 * 执行完整的服务器初始化流程：
 * 1. 连接数据库并运行迁移
 * 2. 可选连接 Redis 缓存
 * 3. 启动新闻通讯调度器
 * 4. 初始化 SSR 渲染器（非阻塞，失败降级为 SPA）
 * 5. 启动 HTTP 服务器监听
 *
 * @returns {Promise<void>} 启动完成后 resolve
 * @throws 数据库连接失败等致命错误时终止进程
 */
const startServer = async () => { 
  try {
    // 连接数据库
    await connectDatabase();
    logger.info('数据库连接成功');

    // 自动运行数据库迁移（创建表结构）
    await runMigrations();
    logger.info('数据库迁移完成');

    // 连接Redis（可选）
    if (config.features.enableCaching) {
      try {
        await connectRedis();
        logger.info('Redis连接成功');
      } catch (error) {
        logger.warn('Redis连接失败，跳过缓存功能:', error instanceof Error ? error.message : String(error));
      }
    } else {
      logger.info('缓存功能已禁用，跳过Redis连接');
    }

    // 启动新闻通讯调度器
    newsletterScheduler.start();

    // 初始化SSR渲染器（非阻塞，失败时自动降级为SPA模式）
    initSSRRenderer().catch((err) => {
      logger.warn('SSR渲染器初始化失败，将使用SPA降级模式:', err.message);
    });

    // 启动HTTP服务器
    httpServer.listen(config.port, () => {
      logger.info(`
🚀 GameHub后端服务器已启动!
📡 环境: ${config.nodeEnv}
🌐 地址: http://${config.host}:${config.port}
📚 API文档: http://${config.host}:${config.port}/api-docs
🔌 Socket.IO: ws://${config.host}:${config.port}
🕒 启动时间: ${new Date().toLocaleString()}
      `);
    });
  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
};

/**
 * 优雅关闭服务器
 *
 * 处理进程终止信号（SIGTERM / SIGINT），
 * 先关闭 HTTP 服务器停止接受新连接，
 * 设置 10 秒超时强制退出以防止进程挂起。
 *
 * @returns {Promise<void>}
 */
const shutdown = async () => {
  logger.info('正在关闭服务器...');

  try {
    httpServer.close(() => {
      logger.info('HTTP服务器已关闭');
      process.exit(0);
    });

    /** 强制关闭超时（10秒后强制退出） */
    setTimeout(() => {
      logger.error('强制关闭服务器');
      process.exit(1);
    }, 10000);
  } catch (error) {
    logger.error('关闭服务器时出错:', error);
    process.exit(1);
  }
};

/** 注册进程终止信号处理，实现优雅关闭 */
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

/** 注册全局未捕获异常和未处理 Promise 拒绝处理程序 */
handleUncaughtException();
handleUnhandledRejection();

/**
 * 启动服务器入口
 *
 * 在非测试环境下自动调用 startServer() 启动应用。
 * Jest 测试环境通过 JEST_WORKER_ID 环境变量识别，跳过自动启动。
 */
if (process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
  startServer();
}

/** 导出 Express 应用实例和 Socket.IO 服务器实例供测试或其他模块引用 */
export { app, io };