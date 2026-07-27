/**
 * HTTP 缓存中间件模块
 *
 * 提供多种缓存策略的 Express 中间件：
 * - 通用缓存：为 GET 请求添加 Cache-Control 和 ETag 支持
 * - 静态资源缓存：为图片、CSS、JS 等静态文件设置长缓存时间
 * - 无缓存：为需要实时数据的请求禁用所有缓存
 * - 条件缓存：根据路径正则匹配有选择性地应用缓存
 *
 * @module middlewares/cache.middleware
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * 通用 HTTP 缓存中间件
 *
 * 仅对 GET 请求生效，设置 Cache-Control 头部，并通过重写 res.send 方法
 * 自动计算响应内容的 MD5 哈希作为 ETag。客户端携带 If-None-Match 头部时，
 * 若内容未变更则返回 304 Not Modified，减少带宽消耗。
 *
 * @param duration - 缓存有效期（秒），默认 3600 秒（1 小时）
 * @returns Express 中间件函数
 */
export const cacheMiddleware = (duration: number = 3600) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // 只对GET请求应用缓存
    if (req.method !== 'GET') {
      return next();
    }

    // 设置Cache-Control头部
    res.set('Cache-Control', `public, max-age=${duration}`);

    // 保存原始的send方法
    const originalSend = res.send;

    // 重写send方法以添加ETag
    res.send = function(body: any) {
      // 生成ETag（基于响应内容）
      let etag: string;

      if (typeof body === 'string') {
        etag = crypto.createHash('md5').update(body).digest('hex');
      } else if (Buffer.isBuffer(body)) {
        etag = crypto.createHash('md5').update(body).digest('hex');
      } else {
        // 对于JSON响应，将对象转换为字符串
        const bodyString = JSON.stringify(body);
        etag = crypto.createHash('md5').update(bodyString).digest('hex');
      }

      // 添加ETag头部
      res.set('ETag', `"${etag}"`);

      // 检查客户端的If-None-Match头部
      const clientETag = req.headers['if-none-match'];
      if (clientETag === `"${etag}"` || clientETag === etag) {
        // 内容未改变，返回304 Not Modified
        res.status(304).end();
        return res;
      }

      // 调用原始的send方法
      return originalSend.call(this, body);
    };

    next();
  };
};

/**
 * 静态资源缓存中间件
 *
 * 识别常见的静态文件扩展名（js, css, png, jpg, jpeg, gif, ico, svg, woff 等），
 * 设置较长的 Cache-Control 有效期并标记为 immutable，指示浏览器
 * 在有效期内无需向服务器验证资源是否更新。
 *
 * @param duration - 缓存有效期（秒），默认 86400 秒（24 小时）
 * @returns Express 中间件函数
 */
export const staticCacheMiddleware = (duration: number = 86400) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // 检查是否是静态资源文件
    const isStaticFile = /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/i.test(req.path);

    if (isStaticFile) {
      res.set('Cache-Control', `public, max-age=${duration}, immutable`);
    }

    next();
  };
};

/**
 * 无缓存中间件
 *
 * 对于需要实时数据的请求（如 API、动态页面），通过设置多个响应头
 * 全面禁用浏览器和代理服务器的缓存行为。
 *
 * @returns Express 中间件函数
 */
export const noCacheMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    next();
  };
};

/**
 * 条件缓存中间件工厂函数
 *
 * 根据请求路径的正则匹配规则，有选择性地应用缓存。
 * 支持包含列表（include）和排除列表（exclude），
 * 仅当路径匹配包含规则且不匹配排除规则时才启用缓存。
 *
 * @param options.include - 需要缓存的正则路径列表（为空则缓存所有路径）
 * @param options.exclude - 排除缓存的正则路径列表
 * @param options.duration - 缓存有效期（秒），默认 3600 秒
 * @returns Express 中间件函数
 */
export const conditionalCacheMiddleware = (options: {
  include?: RegExp[];
  exclude?: RegExp[];
  duration?: number;
} = {}) => {
  const { include = [], exclude = [], duration = 3600 } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const path = req.path;

    // 检查是否在排除列表中
    const isExcluded = exclude.some(pattern => pattern.test(path));
    if (isExcluded) {
      return next();
    }

    // 检查是否在包含列表中（如果指定了包含列表）
    const isIncluded = include.length === 0 || include.some(pattern => pattern.test(path));
    if (!isIncluded) {
      return next();
    }

    // 应用缓存
    return cacheMiddleware(duration)(req, res, next);
  };
};
