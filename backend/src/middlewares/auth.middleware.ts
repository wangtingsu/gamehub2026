/**
 * 用户认证与授权中间件模块
 *
 * 提供完整的用户认证流程，包括：
 * - JWT 令牌验证（同时支持用户令牌和管理员令牌）
 * - 基于角色的层级权限检查
 * - 可选认证（未登录用户继续处理）
 * - 刷新令牌验证
 * - 滑动窗口速率限制
 * - 请求体 Schema 验证
 *
 * @module middlewares/auth.middleware
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import logger from '../utils/logger';
import { query } from '../db';
import { RoleHierarchy, UserRole } from '../types';

/**
 * 用户 JWT 认证中间件
 *
 * 从 Authorization 请求头中提取 Bearer token，依次使用用户 JWT 密钥
 * 和管理员 JWT 密钥尝试验证。验证通过后查询数据库确认用户存在且活跃，
 * 并检查令牌版本号（用于令牌撤销）。将用户信息附加到 req.user 对象。
 *
 * @param req  - Express 请求对象
 * @param res  - Express 响应对象
 * @param next - Express 下一个中间件函数
 * @returns 认证成功调用 next()，失败返回 401/500 JSON 响应
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: '未提供认证令牌',
      });
    }

    const token = authHeader.split(' ')[1];

    let decoded: any;
    let isAdminToken = false;

    // 先尝试用用户 JWT 密钥验证
    try {
      decoded = jwt.verify(token, config.jwt.secret) as any;
    } catch (userJwtError) {
      // 如果用户 JWT 验证失败，尝试管理员 JWT 密钥
      try {
        decoded = jwt.verify(token, config.admin.jwtSecret) as any;
        isAdminToken = true;
      } catch (adminJwtError) {
        // TokenExpiredError 继承自 JsonWebTokenError，必须先判断"过期"，
        // 否则会被下面的 JsonWebTokenError 判断误报为"无效的认证令牌"。
        // 管理员 token 已过期：抛给外层 catch 统一返回"认证令牌已过期"
        if (adminJwtError instanceof jwt.TokenExpiredError) {
          throw adminJwtError;
        }
        // 用户 token 已过期：同样按过期处理
        if (userJwtError instanceof jwt.TokenExpiredError) {
          throw userJwtError;
        }
        // 两种密钥都验证失败且非过期 → 无效令牌
        if (userJwtError instanceof jwt.JsonWebTokenError) {
          return res.status(401).json({
            success: false,
            error: '无效的认证令牌',
          });
        }
        // 其他错误继续抛出
        throw userJwtError;
      }
    }

    if (isAdminToken) {
      // 管理员 token：从JWT payload直接获取用户信息，无需DB查询
      req.user = {
        id: decoded.id || 'admin',
        username: decoded.username || 'admin',
        email: decoded.email || 'admin@gamehub.local',
        displayName: decoded.username || '管理员',
        avatarUrl: decoded.avatarUrl || '',
        role: decoded.role || 'admin',
      };
      req.token = token;
      logger.debug('管理员认证成功', { userId: req.user.id, role: req.user.role });
      return next();
    } else {
      // 用户 token：从数据库查询用户完整信息
      var result = await query(
        'SELECT id, username, email, display_name, avatar_url, role, is_active, token_version FROM users WHERE id = ?',
        [decoded.userId]
      );
    }

    if (result.length === 0) {
      return res.status(401).json({
        success: false,
        error: '用户不存在',
      });
    }

    const user = result[0];

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        error: '用户账户已被禁用',
      });
    }

    // 验证令牌版本（检查令牌是否已被撤销）
    const tokenVersion = decoded.tokenVersion ?? 0;
    const userTokenVersion = user.token_version ?? 0;
    if (tokenVersion < userTokenVersion) {
      return res.status(401).json({
        success: false,
        error: '认证令牌已失效，请重新登录',
      });
    }

    // 将用户信息附加到请求对象
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      role: user.role,
    };

    req.token = token;

    logger.debug('用户认证成功', { userId: user.id, role: user.role });
    return next();
  } catch (error) {
    // TokenExpiredError 继承自 JsonWebTokenError，必须先判断"过期"，
    // 否则会被 JsonWebTokenError 分支误报为"无效的认证令牌"。
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: '认证令牌已过期',
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: '无效的认证令牌',
      });
    }

    logger.error('认证中间件错误:', error);
    return res.status(500).json({
      success: false,
      error: '服务器内部错误',
    });
  }
};

/**
 * 基于角色的权限检查中间件（支持层级）
 *
 * 根据 RoleHierarchy 层级表判断当前用户的角色是否满足要求的任意一个角色。
 * 角色层级数值越大，权限越高（user: 0, admin: 1, super_admin: 2）。
 * 未知角色名会被拒绝访问以防止安全漏洞。
 *
 * @param roles - 允许通过的一个或多个角色名
 * @returns Express 中间件函数，满足权限时调用 next()，不满足时返回 403
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '需要认证',
      });
    }

    const userRole = req.user.role as UserRole;
    const userLevel = RoleHierarchy[userRole] ?? -1;

    // 检查是否满足任一要求的角色
    const hasPermission = roles.some(role => {
      // 未知角色名拒绝所有访问（防止安全漏洞）
      if (!(role in RoleHierarchy)) return false;
      const requiredLevel = RoleHierarchy[role as UserRole];
      return userLevel >= requiredLevel;
    });

    if (!hasPermission) {
      logger.warn('权限拒绝', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        userLevel,
      });

      return res.status(403).json({
        success: false,
        error: '权限不足',
      });
    }

    return next();
  };
};

/**
 * 可选认证中间件
 *
 * 与 authenticate 不同，当令牌无效或用户不存在时，不会返回错误，
 * 而是继续处理请求（req.user 保持 undefined）。
 * 适用于"已登录用户有额外功能，未登录用户也能正常浏览"的场景。
 *
 * @param req  - Express 请求对象
 * @param _res - Express 响应对象（未使用）
 * @param next - Express 下一个中间件函数
 * @returns 始终调用 next()，不会因认证失败而中断请求
 */
export const optionalAuthenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // 继续处理，用户未认证
    }

    const token = authHeader.split(' ')[1];

    let decoded: any;
    let isAdminToken = false;

    try {
      decoded = jwt.verify(token, config.jwt.secret) as any;
    } catch {
      try {
        decoded = jwt.verify(token, config.admin.jwtSecret) as any;
        isAdminToken = true;
      } catch {
        return next(); // 两种密钥都无效，继续处理（用户未认证）
      }
    }

    if (isAdminToken) {
      // 管理员 token：从JWT payload直接获取用户信息
      req.user = {
        id: decoded.id || 'admin',
        username: decoded.username || 'admin',
        email: decoded.email || 'admin@gamehub.local',
        displayName: decoded.username || '管理员',
        avatarUrl: decoded.avatarUrl || '',
        role: decoded.role || 'admin',
      };
      req.token = token;
      return next();
    } else {
      // 用户 token：从数据库查询用户完整信息
      var result = await query(
        'SELECT id, username, email, display_name, avatar_url, role, is_active FROM users WHERE id = ?',
        [decoded.userId]
      );
    }

    if (result.length > 0 && result[0].is_active) {
      const user = result[0];
      req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        role: user.role,
      };
      req.token = token;
    }

    return next();
  } catch (error) {
    // 令牌无效，继续处理（用户未认证）
      return next();
  }
};

/**
 * 刷新令牌验证中间件
 *
 * 从请求体中提取 refreshToken，使用刷新令牌专用的 JWT 密钥验证其有效性。
 * 同时检查数据库中用户是否仍活跃以及令牌版本是否匹配（用于令牌撤销）。
 *
 * @param req  - Express 请求对象，需包含 refreshToken 字段
 * @param res  - Express 响应对象
 * @param next - Express 下一个中间件函数
 * @returns 验证通过调用 next()，失败返回 400/401/500
 */
export const validateRefreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: '刷新令牌不能为空',
      });
    }

    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as any;

    // 检查刷新令牌是否有效
    const result = await query(
      'SELECT id, is_active, token_version FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (result.length === 0 || !result[0].is_active) {
      return res.status(401).json({
        success: false,
        error: '无效的刷新令牌',
      });
    }

    // 验证令牌版本
    const currentVersion = result[0].token_version ?? 0;
    const tokenVersion = decoded.tokenVersion ?? 0;
    if (tokenVersion < currentVersion) {
      return res.status(401).json({
        success: false,
        error: '刷新令牌已失效，请重新登录',
      });
    }

    req.user = { id: decoded.userId } as any;
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: '无效的刷新令牌',
      });
    }

    logger.error('刷新令牌验证错误:', error);
    return res.status(500).json({
      success: false,
      error: '服务器内部错误',
    });
  }
};

/**
 * 滑动窗口速率限制器类
 *
 * 基于内存的滑动窗口算法实现，使用 Map 存储每个键（如 IP+路径）的请求时间戳数组。
 * 定期清理过期记录以防止内存泄漏（每 60 秒清理一次）。
 * 适用于中小规模部署或作为 Redis 限流降级方案。
 *
 * @internal 该类是 auth.middleware 的内部实现，外部不应直接使用
 */
class SlidingWindowRateLimiter {
  /** 存储每个限流键的请求时间戳列表 */
  private windows: Map<string, number[]> = new Map();
  /** 定期清理定时器 */
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    // 每分钟清理过期记录，防止内存泄漏
    this.cleanupTimer = setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * 检查是否允许请求通过
   *
   * @param key       - 限流唯一标识（如 "IP:路径"）
   * @param windowMs  - 时间窗口大小（毫秒）
   * @param max       - 窗口内允许的最大请求数
   * @returns 限流检查结果，包含是否允许、剩余次数和重置时间
   */
  check(key: string, windowMs: number, max: number): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const windowStart = now - windowMs;

    // 获取或初始化该 key 的请求时间戳数组
    let timestamps = this.windows.get(key);
    if (!timestamps) {
      timestamps = [];
      this.windows.set(key, timestamps);
    }

    // 移除窗口外的旧时间戳
    const validTimestamps = timestamps.filter(t => t > windowStart);
    this.windows.set(key, validTimestamps);

    const currentCount = validTimestamps.length;
    const allowed = currentCount < max;

    if (allowed) {
      validTimestamps.push(now);
    }

    return {
      allowed,
      remaining: Math.max(0, max - currentCount - 1),
      resetTime: windowStart + windowMs,
    };
  }

  /**
   * 定期清理过期 key，释放内存
   * 删除所有没有活动记录的键
   */
  private cleanup() {
    const now = Date.now();
    for (const [key, timestamps] of this.windows.entries()) {
      // 如果2个窗口周期内没有活动，清除该 key
      if (timestamps.length === 0) {
        this.windows.delete(key);
      }
    }
  }

  /**
   * 销毁限流器，清理定时器和所有数据
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.windows.clear();
  }
}

const slidingWindowLimiter = new SlidingWindowRateLimiter();

/**
 * 速率限制中间件（增强版：滑动窗口 + 定期清理）
 *
 * 基于 IP 和请求路径生成限流键，通过滑动窗口算法限制单位时间内的请求次数。
 * 可通过 config.features.enableRateLimiting 全局开关控制。
 * 在响应头中返回 X-RateLimit-Limit、X-RateLimit-Remaining、X-RateLimit-Reset。
 *
 * @param options.windowMs - 时间窗口大小（毫秒）
 * @param options.max      - 窗口内允许的最大请求次数
 * @returns Express 中间件函数
 */
export const rateLimit = (options: { windowMs: number; max: number }) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!config.features.enableRateLimiting) {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${ip}:${req.path}`;

    const result = slidingWindowLimiter.check(key, options.windowMs, options.max);

    // 设置响应头
    res.setHeader('X-RateLimit-Limit', options.max);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

    if (!result.allowed) {
      logger.warn('速率限制触发', { ip, path: req.path, method: req.method });
      return res.status(429).json({
        success: false,
        error: '请求过于频繁，请稍后再试',
        retryAfter: Math.ceil(options.windowMs / 1000),
      });
    }

    return next();
  };
};

/**
 * 请求体 Schema 验证中间件工厂函数
 *
 * 使用 Joi Schema 对请求体进行验证，验证失败时返回详细的字段错误信息。
 * 验证通过后，使用 Joi 处理过的值替换原始 req.body（自动去除未知字段）。
 *
 * @param schema - Joi 验证 Schema 对象
 * @returns Express 中间件函数
 */
export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const errors = error.details.map((detail: any) => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));

        return res.status(400).json({
          success: false,
          error: '请求数据验证失败',
          details: errors,
        });
      }

      // 用验证后的数据替换原始数据
      req.body = value;
      return next();
    } catch (error) {
      logger.error('请求验证错误:', error);
      return res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    }
  };
};

export default {
  authenticate,
  authorize,
  optionalAuthenticate,
  validateRefreshToken,
  rateLimit,
  validateRequest,
};
