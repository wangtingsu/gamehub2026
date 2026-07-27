/**
 * 日志工具模块
 *
 * 基于 winston 日志库的日志系统，提供标准化的日志记录功能。
 * 支持多传输目标（控制台、文件）、多日志级别、结构化日志和异常处理。
 *
 * 日志文件按大小轮转（最大 10MB，保留 5 个历史文件），
 * 错误日志和异常日志分别记录到独立的文件。
 *
 * 环境差异：
 * - 开发环境：控制台输出带颜色和调试级别的详细日志
 * - 生产环境：仅文件输出，不包含控制台日志
 *
 * @module utils/logger
 */

import winston from 'winston';
import path from 'path';
import config from '../config';

const { combine, timestamp, printf, colorize, errors } = winston.format;

/**
 * 自定义日志格式
 *
 * 格式：`时间戳 [级别]: 消息`
 * 如果包含堆栈跟踪则附加在消息后，其他元数据以 JSON 格式附加在末尾。
 */
const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const ts = timestamp as string;
  let log = `${ts} [${level}]: ${message}`;

  if (stack) {
    log += `\n${stack}`;
  }

  if (Object.keys(meta).length > 0) {
    log += `\n${JSON.stringify(meta, null, 2)}`;
  }

  return log;
});

// 创建日志目录
const logDir = path.dirname(config.log.file);
import fs from 'fs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/**
 * winston 日志记录器实例
 *
 * 配置了三个传输目标：
 * 1. Console - 控制台输出（开发环境，带颜色）
 * 2. File - 主日志文件（所有级别）
 * 3. File (error) - 错误日志文件（仅 error 级别）
 *
 * 同时配置了异常处理器和拒绝处理器，确保未捕获的错误也能被记录。
 */
const logger = winston.createLogger({
  level: config.log.level,
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    // 控制台输出（开发环境）
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        printf(({ level, message, timestamp }) => {
          return `${timestamp} [${level}]: ${message}`;
        })
      ),
    }),
    // 文件输出（所有环境）
    new winston.transports.File({
      filename: config.log.file,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    // 错误日志单独文件
    new winston.transports.File({
      filename: config.log.file.replace('.log', '.error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: config.log.file.replace('.log', '.exceptions.log'),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: config.log.file.replace('.log', '.rejections.log'),
    }),
  ],
});

// 开发环境添加详细日志
if (config.nodeEnv === 'development') {
  logger.add(
    new winston.transports.Console({
      level: 'debug',
      format: combine(
        colorize(),
        timestamp({ format: 'HH:mm:ss' }),
        printf(({ level, message, timestamp, ...meta }) => {
          let log = `${timestamp} [${level}]: ${message}`;
          if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta)}`;
          }
          return log;
        })
      ),
    })
  );
}

// 生产环境移除控制台输出
if (config.nodeEnv === 'production') {
  logger.remove(winston.transports.Console);
}

/**
 * Morgan 日志流适配器
 *
 * 用于将 Morgan HTTP 请求日志集成到 winston 日志系统。
 * Morgan 调用 stream.write 输出日志，此处重定向到 winston 的 info 级别。
 */
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

/**
 * 请求日志中间件（Express）
 *
 * 为每个 HTTP 请求记录方法、URL、状态码、耗时、IP 和用户代理。
 * 响应完成时自动触发日志记录。
 *
 * @param req - Express 请求对象
 * @param res - Express 响应对象
 * @param next - Express 下一个中间件函数
 *
 * @deprecated 推荐使用 middlewares/logger.middleware.ts 中的 requestLogger
 */
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    logger.log(logLevel, `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id || 'anonymous',
    });
  });

  next();
};

export default logger;
