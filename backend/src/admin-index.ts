/**
 * GameHub 管理后台服务器入口
 *
 * 独立的 Express 应用实例，用于运行 GameHub 管理后台（Admin Panel）。
 * 与主 API 服务器（src/index.ts）分离部署，具有独立的端口和路由。
 *
 * 特性：
 * - 独立端口运行，与 API 服务器隔离
 * - 全局管理员认证中间件保护所有管理路由
 * - 包含管理 CRUD、数据分析、用户画像、部署管理、备份管理等模块
 * - 提供健康检查和基础信息端点
 *
 * @module src/admin-index
 * @see {@link ./index.ts} 主 API 服务器入口
 */

import 'dotenv/config';
import express, { Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import config from './config';
import logger from './utils/logger';

/** 数据库连接与迁移 */
import { connectDatabase, closeDatabase, runMigrations } from './db';

// 中间件
import { errorHandler, notFoundHandler, handleUnhandledRejection, handleUncaughtException } from './middlewares/error.middleware';
import { requestLogger } from './middlewares/logger.middleware';
import { languageMiddleware } from './middlewares/language.middleware';
import { adminAuthenticate } from './middlewares/admin-auth.middleware';

// 管理端路由
import adminRoutes from './routes/admin.routes';
import adminAnalyticsRoutes from './routes/admin-analytics.routes';
import adminProfilingRoutes from './routes/admin-profiling.routes';
import adminDeploymentRoutes from './routes/admin-deployment.routes';
import adminBackupRoutes from './routes/admin-backup.routes';
import adminCategoryRoutes from './routes/admin-category.routes';
import adminTemplateRoutes from './routes/admin-template.routes';
import adminGuideRoutes from './routes/admin-guide.routes';
import adminReviewRoutes from './routes/admin-review.routes';
import adminRecommendRoutes from './routes/admin-recommend.routes';

// 公共数据路由（在管理服务器上受全局 admin 认证保护）
import gameRoutes from './routes/game.routes';
import newsRoutes from './routes/news.routes';
import communityRoutes from './routes/community.routes';
import guideRoutes from './routes/guide.routes';
import uploadRoutes from './routes/upload.routes';
import aboutRoutes from './routes/about.routes';
import llmsRoutes from './routes/llms.routes';

const app = express();

// ========== 基础中间件 ==========
app.use(helmet());
app.use(compression());
app.use(cors({ ...config.cors, methods: [...config.cors.methods], allowedHeaders: [...config.cors.allowedHeaders] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件（上传目录）
app.use('/uploads', express.static(config.upload.path));

// 日志和语言中间件
app.use(requestLogger);
app.use(languageMiddleware);

/**
 * 健康检查端点
 *
 * 返回管理服务器的运行状态，用于监控系统健康检测。
 *
 * @route GET /health
 * @returns {Object} 健康状态（status, service, timestamp）
 */
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'admin', timestamp: new Date().toISOString() });
});

/**
 * 根路由
 *
 * 返回管理 API 服务的基本信息。
 *
 * @route GET /
 * @returns {Object} 服务信息（service, version, environment）
 */
app.get('/', (_req, res) => {
  res.json({
    service: 'GameHub Admin API',
    version: '1.0.0',
    environment: config.nodeEnv,
  });
});

// llms.txt 路由（根级别，符合 llmstxt.org 规范）
app.use(llmsRoutes);

// ========== 管理路由（内部自带认证，login 公开，其余需 adminAuthenticate）==========
app.use(`${config.apiPrefix}/admin`, adminRoutes);
app.use(`${config.apiPrefix}/admin`, adminAnalyticsRoutes);
app.use(`${config.apiPrefix}/admin`, adminProfilingRoutes);
app.use(`${config.apiPrefix}/admin`, adminDeploymentRoutes);
app.use(`${config.apiPrefix}/admin`, adminBackupRoutes);
app.use(`${config.apiPrefix}/admin`, adminCategoryRoutes);
app.use(`${config.apiPrefix}/admin`, adminTemplateRoutes);
app.use(`${config.apiPrefix}/admin`, adminGuideRoutes);
app.use(`${config.apiPrefix}/admin`, adminReviewRoutes);
app.use(`${config.apiPrefix}/admin`, adminRecommendRoutes);

// ========== 管理员图片上传（仅需 admin 认证，不走普通用户 auth）==========
import multer from 'multer';
const adminUpload = multer({ dest: config.upload.path + '/temp/' });
app.post(`${config.apiPrefix}/upload/image`, adminAuthenticate, adminUpload.single('file'), async (req: any, res: Response) => {
  try {
    if (!req.file?.mimetype.startsWith('image/')) {
      return res.status(400).json({ success: false, error: '请上传图片文件' });
    }
    const { handleUpload } = require('./services/upload.service');
    const uploaded = await handleUpload(req);
    res.status(201).json({ success: true, data: { file: uploaded }, message: '图片上传成功' });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ========== 全局管理员认证（后续所有路由均需管理员权限）==========
app.use(adminAuthenticate);

// ========== 公共数据路由（在全局认证之后，仅管理员可访问）==========
app.use(`${config.apiPrefix}/games`, gameRoutes);
app.use(`${config.apiPrefix}/news`, newsRoutes);
app.use(`${config.apiPrefix}/community`, communityRoutes);
app.use(`${config.apiPrefix}/guides`, guideRoutes);
app.use(`${config.apiPrefix}/upload`, uploadRoutes);
app.use(`${config.apiPrefix}/about`, aboutRoutes);

// ========== 错误处理 ==========
app.use(notFoundHandler);
app.use(errorHandler);

/** 管理服务器端口 */
const adminPort = config.admin.port;
/** 管理服务器主机地址 */
const adminHost = config.admin.host;

/**
 * 启动管理后台服务器
 *
 * 初始化流程：
 * 1. 连接数据库
 * 2. 自动运行数据库迁移确保表结构存在
 * 3. 启动 HTTP 服务器监听管理端口
 *
 * @returns {Promise<void>} 启动完成后 resolve
 * @throws 数据库连接失败时终止进程
 */
const startAdminServer = async () => {
  try {
    await connectDatabase();
    logger.info('管理服务器数据库连接成功');

    /** 自动运行数据库迁移（创建表结构） */
    await runMigrations();
    logger.info('管理服务器数据库迁移完成');

    app.listen(adminPort, () => {
      logger.info(`
🚀 GameHub 管理后台服务器已启动!
📡 环境: ${config.nodeEnv}
🌐 地址: http://${adminHost}:${adminPort}
🕒 启动时间: ${new Date().toLocaleString()}
      `);

      // 启动自动备份调度器（默认每天凌晨 2 点）
      try {
        const { backupScheduler } = require('./services/backup-scheduler.service');
        backupScheduler.start();
      } catch (e: any) {
        logger.warn('自动备份调度器启动失败:', e.message);
      }
    });
  } catch (error) {
    logger.error('管理服务器启动失败:', error);
    process.exit(1);
  }
};

/** 注册全局未捕获的 Promise 拒绝处理 */
process.on('unhandledRejection', handleUnhandledRejection);
/** 注册全局未捕获异常处理 */
process.on('uncaughtException', handleUncaughtException);

/** 处理 SIGTERM 信号，优雅关闭数据库连接后退出 */
process.on('SIGTERM', async () => {
  logger.info('管理服务器收到 SIGTERM，正在关闭...');
  await closeDatabase();
  process.exit(0);
});

/** 处理 SIGINT 信号（Ctrl+C），优雅关闭数据库连接后退出 */
process.on('SIGINT', async () => {
  logger.info('管理服务器收到 SIGINT，正在关闭...');
  await closeDatabase();
  process.exit(0);
});

startAdminServer();

/** 导出 Express 应用实例供测试或其他模块引用 */
export default app;
