/**
 * Redis 缓存服务
 *
 * 提供基于 Redis 的完整缓存解决方案，支持多种数据结构：
 * - 简单键值缓存（带 TTL 自动过期）
 * - 哈希缓存（适合结构化数据，如用户会话）
 * - 列表缓存（适合队列和时间线）
 * - 计数器（如浏览量、点赞数）
 * - 分布式锁（基于 SET NX 和 Lua 脚本确保原子性）
 * - 带元数据的缓存（支持 ISR 增量静态再生模式）
 * - 基于标签的缓存失效机制（便于批量清除相关缓存）
 *
 * 所有缓存操作均包含完善的错误处理和日志记录，缓存失败不影响主流程。
 */
import { createClient, RedisClientType } from 'redis';
import config from '../config';
import logger from '../utils/logger';

/** Redis 客户端实例（全局单例） */
let redisClient: RedisClientType;

/**
 * 缓存元数据接口
 *
 * 用于带元数据的缓存模式，支持 ISR（Incremental Static Regeneration）策略。
 */
export interface CacheMetadata {
  /** 缓存生成时间戳 */
  timestamp: number;
  /** 生存时间（秒） */
  ttl: number;
  /** 缓存标签列表 */
  tags?: string[];
  /** 陈旧阈值时间戳，在此时间之前可返回过期缓存（用于 ISR） */
  staleUntil?: number;
  /** 缓存版本标识 */
  version?: string;
}

/**
 * 连接 Redis 服务器
 *
 * 创建 Redis 客户端并建立连接。配置了重连策略（最大 10 次重试，
 * 指数递增延迟），并注册连接状态事件监听器。
 * 使用配置中的 URL、主机、端口和密码参数进行连接。
 *
 * @throws 当连接失败时抛出原始错误
 */
export const connectRedis = async (): Promise<void> => {
  try {
    redisClient = createClient({
      url: config.redis.url,
      socket: {
        host: config.redis.host,
        port: config.redis.port,
        // 重连策略：指数递增，最大 3 秒间隔，超过 10 次后放弃
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis重连次数超过限制');
            return new Error('Redis连接失败');
          }
          return Math.min(retries * 100, 3000);
        },
      },
      password: config.redis.password || undefined,
    });

    // 注册事件监听器
    redisClient.on('error', (error) => {
      logger.error('Redis客户端错误:', error);
    });

    redisClient.on('connect', () => {
      logger.info('Redis连接成功');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis重新连接中...');
    });

    await redisClient.connect();
  } catch (error) {
    logger.error('Redis连接失败:', error);
    throw error;
  }
};

/**
 * 获取 Redis 客户端实例
 *
 * @returns Redis 客户端对象
 * @throws 当客户端未初始化时抛出错误
 */
export const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    throw new Error('Redis客户端未初始化');
  }
  return redisClient;
};

/**
 * 设置缓存
 *
 * 存储键值对到 Redis，自动设置过期时间。
 * 非字符串值自动序列化为 JSON。
 *
 * @param key - 缓存键
 * @param value - 缓存值（对象自动 JSON 序列化）
 * @param ttl - 过期时间（秒），默认使用全局配置
 */
export const setCache = async (
  key: string,
  value: any,
  ttl: number = config.redis.ttl
): Promise<void> => {
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    await redisClient.set(key, stringValue, { EX: ttl });

    logger.debug('缓存设置成功', { key, ttl });
  } catch (error) {
    logger.error('设置缓存失败:', { key, error });
    // 缓存失败不应影响主流程
  }
};

/**
 * 获取缓存
 *
 * 从 Redis 获取指定键的值，支持自动 JSON 反序列化。
 *
 * @param key - 缓存键
 * @returns 缓存值（如果不存在则返回 null）
 */
export const getCache = async <T = any>(key: string): Promise<T | null> => {
  try {
    const value = await redisClient.get(key);

    if (value === null) {
      return null;
    }

    // 尝试 JSON 解析，失败则返回原始字符串
    try {
      return JSON.parse(value as string) as T;
    } catch {
      return value as T;
    }
  } catch (error) {
    logger.error('获取缓存失败:', { key, error });
    return null;
  }
};

/**
 * 删除缓存
 *
 * @param key - 要删除的缓存键
 */
export const deleteCache = async (key: string): Promise<void> => {
  try {
    await redisClient.del(key);
    logger.debug('缓存删除成功', { key });
  } catch (error) {
    logger.error('删除缓存失败:', { key, error });
  }
};

/**
 * 批量删除缓存（模式匹配）
 *
 * 使用 KEYS 命令查找匹配模式的键，然后批量删除。
 * 注意：在生产环境中大量键时 KEYS 命令可能影响性能，建议使用 SCAN。
 *
 * @param pattern - 匹配模式（如 "user:*"）
 */
export const deleteCachePattern = async (pattern: string): Promise<void> => {
  try {
    const keys = await redisClient.keys(pattern);

    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.debug('批量缓存删除成功', { pattern, count: keys.length });
    }
  } catch (error) {
    logger.error('批量删除缓存失败:', { pattern, error });
  }
};

/**
 * 设置哈希缓存
 *
 * 将值存入 Redis 哈希的指定字段中，同时设置整个哈希的过期时间。
 *
 * @param key - 哈希键
 * @param field - 字段名
 * @param value - 字段值（对象自动 JSON 序列化）
 */
export const setHashCache = async (
  key: string,
  field: string,
  value: any
): Promise<void> => {
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    await redisClient.hSet(key, field, stringValue);

    // 设置整个哈希的过期时间
    await redisClient.expire(key, config.redis.ttl);
  } catch (error) {
    logger.error('设置哈希缓存失败:', { key, field, error });
  }
};

/**
 * 获取哈希缓存
 *
 * 从 Redis 哈希的指定字段中读取值，支持自动 JSON 反序列化。
 *
 * @param key - 哈希键
 * @param field - 字段名
 * @returns 字段值（如果不存在则返回 null）
 */
export const getHashCache = async <T = any>(
  key: string,
  field: string
): Promise<T | null> => {
  try {
    const value = await redisClient.hGet(key, field);

    if (value === null) {
      return null;
    }

    try {
      return JSON.parse(value as string) as T;
    } catch {
      return value as T;
    }
  } catch (error) {
    logger.error('获取哈希缓存失败:', { key, field, error });
    return null;
  }
};

/**
 * 获取哈希的所有字段
 *
 * 读取 Redis 哈希中所有字段的值，自动 JSON 反序列化每个字段。
 *
 * @param key - 哈希键
 * @returns 包含所有字段的字典对象（如果哈希不存在则返回 null）
 */
export const getAllHashCache = async <T = any>(key: string): Promise<Record<string, T> | null> => {
  try {
    const hash = await redisClient.hGetAll(key);

    if (Object.keys(hash).length === 0) {
      return null;
    }

    const result: Record<string, T> = {};

    for (const [field, value] of Object.entries(hash)) {
      try {
        result[field] = JSON.parse(value) as T;
      } catch {
        result[field] = value as T;
      }
    }

    return result;
  } catch (error) {
    logger.error('获取所有哈希缓存失败:', { key, error });
    return null;
  }
};

/**
 * 设置列表缓存
 *
 * 替换指定键的整个列表内容。先删除旧列表，再使用 RPUSH 添加新元素。
 *
 * @param key - 列表键
 * @param values - 列表元素数组
 * @param ttl - 过期时间（秒），默认使用全局配置
 */
export const setListCache = async (
  key: string,
  values: any[],
  ttl: number = config.redis.ttl
): Promise<void> => {
  try {
    // 删除旧列表
    await redisClient.del(key);

    // 添加新值（自动序列化为字符串）
    const stringValues = values.map(value =>
      typeof value === 'string' ? value : JSON.stringify(value)
    );

    if (stringValues.length > 0) {
      await redisClient.rPush(key, stringValues);
      await redisClient.expire(key, ttl);
    }
  } catch (error) {
    logger.error('设置列表缓存失败:', { key, error });
  }
};

/**
 * 获取列表缓存
 *
 * 从 Redis 列表中读取指定范围的元素，支持自动 JSON 反序列化。
 *
 * @param key - 列表键
 * @param start - 起始索引（默认 0）
 * @param end - 结束索引（默认 -1，即全部）
 * @returns 列表元素数组
 */
export const getListCache = async <T = any>(
  key: string,
  start: number = 0,
  end: number = -1
): Promise<T[]> => {
  try {
    const values = await redisClient.lRange(key, start, end);

    return values.map(value => {
      try {
        return JSON.parse(value as string) as T;
      } catch {
        return value as T;
      }
    });
  } catch (error) {
    logger.error('获取列表缓存失败:', { key, error });
    return [];
  }
};

/**
 * 增加计数器的值
 *
 * 对指定键执行原子递增操作。如果是新创建的计数器，会自动设置过期时间。
 *
 * @param key - 计数器键
 * @param increment - 增量值（默认 1）
 * @param ttl - 新计数器的过期时间（秒），默认使用全局配置
 * @returns 递增后的计数值
 */
export const incrementCounter = async (
  key: string,
  increment: number = 1,
  ttl: number = config.redis.ttl
): Promise<number> => {
  try {
    const result = await redisClient.incrBy(key, increment);

    // 如果是新键（返回的值等于增量），设置过期时间
    if (result === increment) {
      await redisClient.expire(key, ttl);
    }

    return result;
  } catch (error) {
    logger.error('增加计数器失败:', { key, error });
    return 0;
  }
};

/**
 * 获取计数器的值
 *
 * @param key - 计数器键
 * @returns 当前计数值（如果不存在则返回 0）
 */
export const getCounter = async (key: string): Promise<number> => {
  try {
    const value = await redisClient.get(key);
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    logger.error('获取计数器失败:', { key, error });
    return 0;
  }
};

/**
 * 获取分布式锁
 *
 * 使用 Redis SET NX 命令实现非阻塞分布式锁。
 * 通过原子操作确保同一时间只有一个进程能获取到锁。
 *
 * @param key - 锁键名
 * @param value - 锁标识值（用于释放时的身份验证，默认 'locked'）
 * @param ttl - 锁自动过期时间（秒，默认 10 秒）
 * @returns 是否成功获取锁
 */
export const acquireLock = async (
  key: string,
  value: string = 'locked',
  ttl: number = 10
): Promise<boolean> => {
  try {
    const result = await redisClient.set(key, value, {
      NX: true, // 仅当键不存在时设置
      EX: ttl,  // 过期时间（自动释放防止死锁）
    });

    return result === 'OK';
  } catch (error) {
    logger.error('获取锁失败:', { key, error });
    return false;
  }
};

/**
 * 释放分布式锁
 *
 * 使用 Lua 脚本确保释放锁的原子性：仅当当前持有者匹配时才删除。
 * 防止误释放其他进程持有的锁。
 *
 * @param key - 锁键名
 * @param value - 锁标识值（必须与获取时设置的值一致）
 */
export const releaseLock = async (key: string, value: string = 'locked'): Promise<void> => {
  try {
    // Lua 脚本：原子性地检查并删除锁
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    await redisClient.eval(luaScript, {
      keys: [key],
      arguments: [value],
    });
  } catch (error) {
    logger.error('释放锁失败:', { key, error });
  }
};

/**
 * 检查 Redis 连接健康状态
 *
 * 通过发送 PING 命令检测 Redis 服务是否正常响应。
 *
 * @returns 健康状态（true 表示连接正常）
 */
export const checkHealth = async (): Promise<boolean> => {
  try {
    await redisClient.ping();
    return true;
  } catch (error) {
    logger.error('Redis健康检查失败:', error);
    return false;
  }
};

/**
 * 关闭 Redis 连接
 *
 * 优雅关闭 Redis 客户端连接，释放资源。
 */
export const closeConnection = async (): Promise<void> => {
  try {
    await redisClient.quit();
    logger.info('Redis连接已关闭');
  } catch (error) {
    logger.error('关闭Redis连接失败:', error);
  }
};

/**
 * 设置带元数据的缓存
 *
 * 将值与元数据一起封装存储，支持 ISR 模式。
 * 元数据包含生成时间戳、TTL、标签等信息，
 * 可用于判断缓存是否陈旧以及执行标签式失效。
 *
 * @param key - 缓存键
 * @param value - 缓存值
 * @param metadata - 缓存元数据（时间戳、TTL、标签等）
 */
export const setCacheWithMetadata = async (
  key: string,
  value: any,
  metadata: CacheMetadata
): Promise<void> => {
  try {
    const cacheEntry = {
      value: typeof value === 'string' ? value : JSON.stringify(value),
      metadata: {
        ...metadata,
        timestamp: metadata.timestamp || Date.now(),
      }
    };

    await redisClient.set(key, JSON.stringify(cacheEntry), { EX: metadata.ttl });

    logger.debug('带元数据的缓存设置成功', { key, ttl: metadata.ttl });
  } catch (error) {
    logger.error('设置带元数据的缓存失败:', { key, error });
  }
};

/**
 * 获取带元数据的缓存
 *
 * 读取之前通过 setCacheWithMetadata 存储的缓存条目，
 * 返回解析后的值和元数据对象。
 * 如果不是带元数据的格式，则回退返回原始值。
 *
 * @param key - 缓存键
 * @returns 包含值和元数据的对象，缓存不存在时值/元数据均为 null
 */
export const getCacheWithMetadata = async <T = any>(key: string): Promise<{ value: T | null; metadata: CacheMetadata | null }> => {
  try {
    const cached = await redisClient.get(key);

    if (cached === null) {
      return { value: null, metadata: null };
    }

    try {
      const parsed = JSON.parse(cached) as { value: string; metadata: CacheMetadata };

      // 解析内部的值（可能是 JSON 字符串或普通字符串）
      let value: T;
      try {
        value = JSON.parse(parsed.value) as T;
      } catch {
        value = parsed.value as T;
      }

      return { value, metadata: parsed.metadata };
    } catch (parseError) {
      // 如果不是带元数据的格式，返回原始值
      logger.debug('缓存不是带元数据格式，返回原始值', { key });
      return { value: cached as T, metadata: null };
    }
  } catch (error) {
    logger.error('获取带元数据的缓存失败:', { key, error });
    return { value: null, metadata: null };
  }
};

/**
 * 获取陈旧缓存（即使过期也返回）
 *
 * 用于 ISR 模式：即使缓存已过期，只要在陈旧阈值内仍可返回。
 * 默认阈值 24 小时，适用于可以容忍短时间陈旧数据的场景
 * （如首页排行榜、热门推荐等）。
 *
 * @param key - 缓存键
 * @param staleThreshold - 陈旧阈值（秒，默认 86400 = 24 小时）
 * @returns 陈旧缓存值（如果不在陈旧阈值内则返回 null）
 */
export const getStaleCache = async <T = any>(key: string, staleThreshold: number = 86400): Promise<T | null> => {
  try {
    const result = await getCacheWithMetadata<T>(key);

    if (result.value === null || result.metadata === null) {
      return null;
    }

    // 检查是否在陈旧阈值内（默认 24 小时）
    const age = Date.now() - result.metadata.timestamp;
    const maxStaleAge = staleThreshold * 1000; // 转换为毫秒

    if (age <= maxStaleAge) {
      logger.debug('返回陈旧缓存', { key, age: Math.round(age / 1000) });
      return result.value;
    }

    return null;
  } catch (error) {
    logger.error('获取陈旧缓存失败:', { key, error });
    return null;
  }
};

/**
 * 为缓存添加标签
 *
 * 将缓存键关联到指定标签集合中，便于后续按标签批量失效。
 * 标签集合的过期时间比缓存本身长 1 小时，确保标签能覆盖缓存生命周期。
 *
 * @param key - 缓存键
 * @param tags - 标签名称数组
 */
export const tagCache = async (key: string, tags: string[]): Promise<void> => {
  try {
    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      await redisClient.sAdd(tagKey, key);
      // 为标签集合设置过期时间（比缓存稍长）
      await redisClient.expire(tagKey, config.redis.ttl + 3600);
    }
    logger.debug('缓存标签添加成功', { key, tags });
  } catch (error) {
    logger.error('添加缓存标签失败:', { key, tags, error });
  }
};

/**
 * 根据标签使缓存失效
 *
 * 删除所有关联到指定标签的缓存键，同时清除标签集合本身。
 * 用于批量更新后清除相关缓存（如文章更新后清除所有 "news" 标签的缓存）。
 *
 * @param tag - 标签名称
 */
export const invalidateByTag = async (tag: string): Promise<void> => {
  try {
    const tagKey = `tag:${tag}`;
    const keys = await redisClient.sMembers(tagKey);

    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.debug('标签缓存失效成功', { tag, count: keys.length });
    }

    // 删除标签集合
    await redisClient.del(tagKey);
  } catch (error) {
    logger.error('标签缓存失效失败:', { tag, error });
  }
};

/**
 * 获取标签关联的所有缓存键
 *
 * @param tag - 标签名称
 * @returns 关联的缓存键数组
 */
export const getKeysByTag = async (tag: string): Promise<string[]> => {
  try {
    const tagKey = `tag:${tag}`;
    return await redisClient.sMembers(tagKey);
  } catch (error) {
    logger.error('获取标签关联键失败:', { tag, error });
    return [];
  }
};

export default {
  connectRedis,
  getRedisClient,
  setCache,
  getCache,
  deleteCache,
  deleteCachePattern,
  setHashCache,
  getHashCache,
  getAllHashCache,
  setListCache,
  getListCache,
  incrementCounter,
  getCounter,
  acquireLock,
  releaseLock,
  checkHealth,
  closeConnection,
  setCacheWithMetadata,
  getCacheWithMetadata,
  getStaleCache,
  tagCache,
  invalidateByTag,
  getKeysByTag,
};
