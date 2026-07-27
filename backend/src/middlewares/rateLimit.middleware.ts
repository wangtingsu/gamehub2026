/**
 * Redis 限流中间件模块
 *
 * 基于 Redis Sorted Set 实现高效滑动窗口速率限制。
 * 提供不同粒度的限流策略（公共 API、认证 API、敏感操作、管理 API），
 * 支持自定义键生成、跳过条件和限流触发回调。
 *
 * Redis 连接失败时自动降级为允许请求通过，避免因限流组件故障影响正常服务。
 * CA 证书审核 IP 白名单不受限流限制。
 *
 * @module middlewares/rateLimit.middleware
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import config from '../config';
import logger from '../utils/logger';

/**
 * CA 证书审核 IP 白名单
 * 这些 IP 发起的请求不应用限流策略，用于 Let's Encrypt 等 CA 的证书验证。
 */
const CA_AUDIT_IPS = [
  '64.78.193.238',
  '216.168.247.9',
  '216.168.249.9',
  '54.189.196.217',
];

/**
 * 判断请求 IP 是否在 CA 审核白名单中
 *
 * 同时检查 X-Forwarded-For 头中的原始 IP 和直连 IP，
 * 以兼容经过反向代理的请求。
 *
 * @param req - Express 请求对象
 * @returns 是否在白名单中（true=跳过限流）
 */
const isCaAuditIp = (req: Request): boolean => {
  const ip = req.ip || req.socket.remoteAddress || '';
  // 检查 X-Forwarded-For 中的原始 IP
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : ip;
  return CA_AUDIT_IPS.includes(realIp) || CA_AUDIT_IPS.includes(ip);
};

/**
 * Redis 限流器类
 *
 * 使用 Redis Sorted Set 实现滑动窗口算法：
 * - 每个请求的时间戳作为一个 member 存储在 sorted set 中
 * - 通过移除窗口外旧记录并统计当前记录数来判断是否超限
 * - 设置过期时间以自动清理不再活跃的限流键
 */
export class RateLimiter {
  /** Redis 客户端实例 */
  private redis: Redis;
  /** 默认时间窗口（秒） */
  private readonly defaultWindow: number = 60;
  /** 默认限制次数 */
  private readonly defaultLimit: number = 100;

  /**
   * @param redisClient - 可选的 Redis 客户端实例，不传则自动创建
   */
  constructor(redisClient?: Redis) {
    this.redis = redisClient || new Redis(config.redis.url, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });
    if (!redisClient) {
      this.redis.on('error', (err) => {
        logger.error('Redis限流器客户端错误:', err);
      });
    }
  }

  /**
   * 检查是否允许请求通过
   *
   * 使用 Redis ZREMRANGEBYSCORE 移除过期时间戳，
   * ZCARD 统计当前窗口内请求数，ZADD 添加新请求。
   * 操作时间复杂度：O(log N) 对于窗口内的每个请求。
   *
   * @param key    - 限流键（如 "IP:路径" 或 "用户ID:操作"）
   * @param window - 时间窗口（秒），默认 60
   * @param limit  - 窗口内最大请求次数，默认 100
   * @returns 限流检查结果：
   *          - allowed: 是否允许通过
   *          - remaining: 剩余可用次数
   *          - reset: 窗口重置时间戳（毫秒）
   *          - retryAfter: 建议重试等待秒数（仅限流时存在）
   */
  async checkLimit(
    key: string,
    window: number = this.defaultWindow,
    limit: number = this.defaultLimit
  ): Promise<{
    allowed: boolean;
    remaining: number;
    reset: number;
    retryAfter?: number;
  }> {
    const now = Date.now();
    const windowStart = now - window * 1000;

    try {
      // 使用Redis sorted set存储请求时间戳
      const redisKey = `rate_limit:${key}`;

      // 移除窗口外的旧记录
      await this.redis.zremrangebyscore(redisKey, 0, windowStart);

      // 获取当前窗口内的请求数量
      const count = await this.redis.zcard(redisKey);

      // 检查是否超过限制
      if (count >= limit) {
        // 获取最早请求的时间
        const oldest = await this.redis.zrange(redisKey, 0, 0, 'WITHSCORES');
        const oldestTime = oldest[1] ? parseInt(oldest[1]) : now;
        const retryAfter = Math.ceil((oldestTime + window * 1000 - now) / 1000);

        return {
          allowed: false,
          remaining: 0,
          reset: oldestTime + window * 1000,
          retryAfter: Math.max(1, retryAfter),
        };
      }

      // 添加当前请求
      await this.redis.zadd(redisKey, now, `${now}-${Math.random()}`);
      await this.redis.expire(redisKey, window);

      return {
        allowed: true,
        remaining: limit - count - 1,
        reset: now + window * 1000,
      };
    } catch (error) {
      // Redis错误时降级为允许请求
      logger.error('Redis限流检查失败，降级为允许请求:', error);
      return {
        allowed: true,
        remaining: limit,
        reset: now + window * 1000,
      };
    }
  }

  /**
   * 清理过期限流数据
   *
   * 查找所有 rate_limit:* 前缀的键，统一刷新其过期时间，
   * 确保 Redis 自动淘汰不再活跃的限流记录。
   */
  async cleanup(): Promise<void> {
    try {
      // 查找所有限流键
      const keys = await this.redis.keys('rate_limit:*');

      if (keys.length > 0) {
        // 批量删除过期键
        const pipeline = this.redis.pipeline();
        keys.forEach(key => pipeline.expire(key, this.defaultWindow));
        await pipeline.exec();
      }
    } catch (error) {
      logger.error('清理限流数据失败:', error);
    }
  }

  /**
   * 获取限流统计信息
   *
   * 遍历所有限流键，返回每个键当前请求数和剩余生存时间。
   * 用于监控和管理限流状态。
   *
   * @returns 限流统计字典，键为限流键名，值为 { count, ttl }
   */
  async getStats(): Promise<Record<string, any>> {
    try {
      const keys = await this.redis.keys('rate_limit:*');
      const stats: Record<string, any> = {};

      for (const key of keys) {
        const count = await this.redis.zcard(key);
        const ttl = await this.redis.ttl(key);
        stats[key] = { count, ttl };
      }

      return stats;
    } catch (error) {
      logger.error('获取限流统计信息失败:', error);
      return {};
    }
  }

  /**
   * 关闭 Redis 连接
   *
   * 在应用关闭时调用，优雅释放 Redis 连接资源。
   */
  close(): void {
    if (this.redis && this.redis.status !== 'end') {
      this.redis.disconnect();
    }
  }
}

/**
 * 限流中间件工厂函数
 *
 * 创建可配置的 Express 限流中间件，支持自定义：
 * - 时间窗口和限制次数
 * - 限流键生成策略
 * - 跳过条件（如白名单）
 * - 限流触发时的回调函数
 *
 * @param options.window         - 时间窗口（秒），默认 60
 * @param options.limit          - 限制次数，默认 100
 * @param options.keyGenerator   - 限流键生成函数，默认使用客户端 IP
 * @param options.skip           - 跳过限流条件函数
 * @param options.onLimitReached - 限流触发时的回调函数
 * @returns Express 中间件函数
 */
export const rateLimitMiddleware = (
  options: {
    window?: number;
    limit?: number;
    keyGenerator?: (req: Request) => string;
    skip?: (req: Request) => boolean;
    onLimitReached?: (req: Request, res: Response) => void;
  } = {}
) => {
  const {
    window = 60, // 默认60秒
    limit = 100, // 默认100次
    keyGenerator = (req) => req.ip || 'unknown',
    skip = (req) => false,
    onLimitReached,
  } = options;

  // 延迟创建限流器实例，避免模块加载时连接Redis
  let _rateLimiterInstance: RateLimiter | null = null;
  const getRateLimiter = (): RateLimiter => {
    if (!_rateLimiterInstance) {
      _rateLimiterInstance = new RateLimiter();
    }
    return _rateLimiterInstance;
  };

  return async (req: Request, res: Response, next: NextFunction) => {
    // 检查是否跳过限流
    if (skip(req)) {
      return next();
    }

    // 生成限流键
    const key = keyGenerator(req);

    // 检查限流
    const result = await getRateLimiter().checkLimit(key, window, limit);

    // 设置限流头部信息
    res.set('X-RateLimit-Limit', limit.toString());
    res.set('X-RateLimit-Remaining', result.remaining.toString());
    res.set('X-RateLimit-Reset', Math.ceil(result.reset / 1000).toString());

    if (!result.allowed) {
      // 触发限流回调
      if (onLimitReached) {
        onLimitReached(req, res);
      }

      // 设置Retry-After头部
      if (result.retryAfter) {
        res.set('Retry-After', result.retryAfter.toString());
      }

      // 返回429 Too Many Requests
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        message: `请求过于频繁，请 ${result.retryAfter} 秒后重试`,
        retryAfter: result.retryAfter,
      });
    }

    next();
  };
};

/**
 * 创建差异化限流器集合
 *
 * 根据不同端点类型返回预设的限流策略：
 * - public:      公共 API，每分钟 300 次
 * - auth:        认证 API，每分钟 60 次
 * - sensitive:   敏感操作（如修改密码），每 5 分钟 10 次
 * - admin:       管理 API，每分钟 30 次
 *
 * @returns 包含四种限流中间件的对象
 */
export const createRateLimiter = () => {
  // 公共API限流（宽松）
  const publicRateLimit = rateLimitMiddleware({
    window: 60,
    limit: 300, // 每分钟300次
    skip: isCaAuditIp,
    keyGenerator: (req) => `public:${req.ip || 'unknown'}`,
  });

  // 认证API限流（中等）
  const authRateLimit = rateLimitMiddleware({
    window: 60,
    limit: 60, // 每分钟60次
    skip: isCaAuditIp,
    keyGenerator: (req) => {
      const userId = req.user?.id || 'anonymous';
      return `auth:${userId}:${req.ip || 'unknown'}`;
    },
  });

  // 敏感操作限流（严格）
  const sensitiveRateLimit = rateLimitMiddleware({
    window: 300, // 5分钟
    limit: 10, // 每5分钟10次
    skip: isCaAuditIp,
    keyGenerator: (req) => {
      const userId = req.user?.id || 'anonymous';
      return `sensitive:${userId}:${req.path}`;
    },
  });

  // 管理API限流（非常严格）
  const adminRateLimit = rateLimitMiddleware({
    window: 60,
    limit: 30, // 每分钟30次
    skip: isCaAuditIp,
    keyGenerator: (req) => {
      const userId = req.user?.id || 'anonymous';
      return `admin:${userId}:${req.path}`;
    },
  });

  return {
    public: publicRateLimit,
    auth: authRateLimit,
    sensitive: sensitiveRateLimit,
    admin: adminRateLimit,
  };
};

/**
 * 惰性创建限流器实例
 *
 * 与直接 new RateLimiter() 不同，此函数仅返回创建函数，
 * 由调用方决定何时初始化，适用于需要延迟连接 Redis 的场景。
 *
 * @returns 新的 RateLimiter 实例
 */
export const getRateLimiter = (): RateLimiter => {
  return new RateLimiter();
};

export default rateLimitMiddleware;
