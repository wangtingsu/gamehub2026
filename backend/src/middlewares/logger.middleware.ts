/**
 * 请求日志记录中间件模块
 *
 * 提供 HTTP 请求的日志记录功能，包括：
 * - 请求日志：在请求开始时记录方法、URL、IP 等信息
 * - 响应日志：在响应完成时记录状态码、耗时等信息
 * - 响应时间头部：为每个响应添加 X-Response-Time 头部
 *
 * @module middlewares/logger.middleware
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * 请求日志记录中间件
 *
 * 在请求开始时记录 debug 日志（方法、URL、IP、User-Agent），
 * 在响应完成时自动记录 info/warn 级别的日志（包含耗时和状态码）。
 * 状态码 >= 400 时使用 warn 级别，其余使用 info 级别。
 *
 * @param req  - Express 请求对象
 * @param res  - Express 响应对象
 * @param next - Express 下一个中间件函数
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // 记录请求开始
  logger.debug('请求开始', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // 响应完成时记录
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    logger.log(logLevel, '请求完成', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: (req as any).user?.id || 'anonymous',
    });
  });

  next();
};

/**
 * 响应时间头部中间件
 *
 * 为每个 HTTP 响应自动添加 X-Response-Time 头部，
 * 记录服务器处理请求的总耗时（毫秒），便于前端分析和监控。
 *
 * @param req  - Express 请求对象
 * @param res  - Express 响应对象
 * @param next - Express 下一个中间件函数
 */
export const responseTimeHeader = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    res.setHeader('X-Response-Time', `${duration}ms`);
  });

  next();
};

export default {
  requestLogger,
  responseTimeHeader,
};
