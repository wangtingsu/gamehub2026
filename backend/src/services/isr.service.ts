/**
 * ISR（增量静态再生成）服务
 * 实现基于 Redis 的 SSR 页面缓存策略，支持新鲜缓存、陈旧即用（Stale-While-Revalidate）
 * 和后台重新验证。通过分布式锁防止缓存击穿，通过标签系统支持批量失效。
 */

import { Request } from 'express'
import { getRedisClient, setCacheWithMetadata, getCacheWithMetadata, getStaleCache, tagCache, acquireLock, releaseLock } from './redis.service'
import { renderPageToHtml } from './ssr-render.service'
import config from '../config'
import logger from '../utils/logger'

/**
 * ISR 配置接口
 * 定义每类页面的新鲜TTL、陈旧TTL乘数、是否启用陈旧即用和后台验证等参数。
 */
export interface ISRConfig {
  freshTTL: number // 新鲜缓存时间（秒）
  staleMultiplier: number // 陈旧时间乘数（陈旧时间 = 新鲜时间 * 乘数）
  enableStaleWhileRevalidate: boolean // 是否启用陈旧即用
  backgroundRevalidation: boolean // 是否后台重新验证
  maxConcurrentRevalidations: number // 最大并发重新验证数
}

/** 默认 ISR 配置，通过环境变量覆盖 */
const defaultISRConfig: ISRConfig = {
  freshTTL: parseInt(process.env.ISR_FRESH_TTL || '300', 10), // 5分钟
  staleMultiplier: parseInt(process.env.ISR_STALE_MULTIPLIER || '2', 10), // 2倍
  enableStaleWhileRevalidate: process.env.ISR_ENABLE_STALE_WHILE_REVALIDATE !== 'false',
  backgroundRevalidation: process.env.ISR_BACKGROUND_REVALIDATION !== 'false',
  maxConcurrentRevalidations: parseInt(process.env.ISR_MAX_CONCURRENT_REVALIDATIONS || '5', 10),
}

/**
 * 页面类型枚举
 * 用于区分不同类型的页面，以应用不同的缓存TTL策略。
 * - STATIC: 静态页面（关于、帮助等），缓存时间最长
 * - DYNAMIC: 动态列表页面（游戏列表、新闻列表），缓存中等
 * - DETAIL: 详情页面（游戏详情、新闻详情），缓存较短
 * - USER: 用户相关页面，缓存最短
 */
export enum PageType {
  STATIC = 'static',
  DYNAMIC = 'dynamic',
  DETAIL = 'detail',
  USER = 'user',
}

/**
 * 根据请求路径判断页面类型
 * @param path - 请求路径
 * @returns 对应的页面类型枚举值
 */
export function getPageType(path: string): PageType {
  if (path === '/' || path.startsWith('/about') || path.startsWith('/help') || path.startsWith('/contact')) {
    return PageType.STATIC
  }

  if ((path.startsWith('/games') && !path.includes('/games/')) ||
      (path.startsWith('/news') && !path.includes('/news/')) ||
      (path.startsWith('/reviews') && !path.includes('/reviews/'))) {
    return PageType.DYNAMIC
  }

  if (path.includes('/games/') || path.includes('/news/') || path.includes('/reviews/')) {
    return PageType.DETAIL
  }

  if (path.includes('/user/') || path.includes('/profile') || path.includes('/dashboard')) {
    return PageType.USER
  }

  return PageType.DYNAMIC // 默认
}

/**
 * 根据页面类型获取缓存 TTL 配置
 * 各类页面有不同的新鲜时间和陈旧时间，通过环境变量可覆盖默认值。
 * @param pageType - 页面类型
 * @returns 新鲜时间（秒）和陈旧时间（秒）
 */
export function getTTLForPageType(pageType: PageType): { fresh: number; stale: number } {
  const configMap = {
    [PageType.STATIC]: {
      fresh: parseInt(process.env.ISR_FRESH_TTL_STATIC || '3600', 10), // 1小时
      stale: parseInt(process.env.ISR_STALE_TTL_STATIC || '7200', 10), // 2小时
    },
    [PageType.DYNAMIC]: {
      fresh: parseInt(process.env.ISR_FRESH_TTL_DYNAMIC || '300', 10), // 5分钟
      stale: parseInt(process.env.ISR_STALE_TTL_DYNAMIC || '600', 10), // 10分钟
    },
    [PageType.DETAIL]: {
      fresh: parseInt(process.env.ISR_FRESH_TTL_DETAIL || '60', 10), // 1分钟
      stale: parseInt(process.env.ISR_STALE_TTL_DETAIL || '300', 10), // 5分钟
    },
    [PageType.USER]: {
      fresh: parseInt(process.env.ISR_FRESH_TTL_USER || '30', 10), // 30秒
      stale: parseInt(process.env.ISR_STALE_TTL_USER || '60', 10), // 1分钟
    },
  }

  return configMap[pageType] || configMap[PageType.DYNAMIC]
}

/**
 * 根据请求生成 Redis 缓存键
 * 缓存键由路径和语言组成（例如 ssr:/games/zh-CN），支持多语言缓存。
 * @param req - Express 请求对象
 * @returns 缓存键字符串
 */
export function generateCacheKey(req: Request): string {
  const lang = req.headers['accept-language'] || 'zh-CN'
  const simplifiedLang = lang.includes('zh') ? 'zh-CN' : 'en'
  return `ssr:${req.path}:${simplifiedLang}`
}

/**
 * 根据请求路径生成页面标签
 * 标签用于缓存分组和批量失效（例如按 section:games 标签可同时失效所有游戏页面）。
 * @param path - 请求路径
 * @returns 标签数组，如 ['page:home', 'section:games', 'game:slug']
 */
export function generatePageTags(path: string): string[] {
  const tags: string[] = []

  // 根据路径添加标签
  if (path === '/') {
    tags.push('page:home')
  }

  if (path.startsWith('/games')) {
    tags.push('section:games')
    const match = path.match(/\/games\/([^\/]+)/)
    if (match) {
      tags.push(`game:${match[1]}`)
    } else {
      tags.push('games:list')
    }
  }

  if (path.startsWith('/news')) {
    tags.push('section:news')
    const match = path.match(/\/news\/([^\/]+)/)
    if (match) {
      tags.push(`news:${match[1]}`)
    } else {
      tags.push('news:list')
    }
  }

  if (path.startsWith('/reviews')) {
    tags.push('section:reviews')
  }

  return tags
}

/**
 * 核心 ISR 逻辑：获取页面（支持陈旧即用）
 * 缓存策略优先级：
 * 1. 新鲜缓存命中 - 直接返回
 * 2. 陈旧缓存命中且启用陈旧即用 - 触发后台重新验证后返回陈旧缓存
 * 3. 无缓存 - 使用分布式锁防止缓存击穿，渲染并缓存后返回
 * 若渲染失败且存在陈旧缓存，则降级返回陈旧缓存；最后尝试无缓存渲染。
 * @param req - Express 请求对象
 * @param renderFn - 页面渲染函数，默认为 renderPageToHtml
 * @returns 包含 HTML 内容、缓存来源和是否重新验证的信息
 */
export async function getPageWithISR(
  req: Request,
  renderFn: (url: string, req?: Request) => Promise<string> = renderPageToHtml
): Promise<{ html: string; fromCache: 'fresh' | 'stale' | 'none'; revalidated: boolean }> {
  const cacheKey = generateCacheKey(req)
  const pageType = getPageType(req.path)
  const ttlConfig = getTTLForPageType(pageType)
  const enableISR = process.env.ENABLE_ISR !== 'false'

  // 如果不启用ISR，直接渲染
  if (!enableISR) {
    logger.debug('ISR未启用，直接渲染', { path: req.path })
    const html = await renderFn(req.url, req)
    return { html, fromCache: 'none', revalidated: false }
  }

  try {
    // 1. 检查新鲜缓存
    const freshCache = await getCacheWithMetadata<string>(cacheKey)
    if (freshCache.value && freshCache.metadata) {
      const age = Date.now() - freshCache.metadata.timestamp
      const freshAge = ttlConfig.fresh * 1000

      if (age <= freshAge) {
        logger.debug('新鲜缓存命中', { path: req.path, age: Math.round(age / 1000) })
        return { html: freshCache.value, fromCache: 'fresh', revalidated: false }
      }

      // 2. 检查是否启用陈旧即用
      if (defaultISRConfig.enableStaleWhileRevalidate && age <= ttlConfig.stale * 1000) {
        logger.debug('陈旧缓存命中，触发后台重新验证', { path: req.path, age: Math.round(age / 1000) })

        // 触发后台重新验证（非阻塞）
        if (defaultISRConfig.backgroundRevalidation) {
          revalidateInBackground(req, renderFn).catch(error => {
            logger.error('后台重新验证失败:', { path: req.path, error })
          })
        }

        return { html: freshCache.value, fromCache: 'stale', revalidated: true }
      }
    }

    // 3. 无有效缓存，需要渲染
    logger.debug('无有效缓存，开始渲染', { path: req.path })

    // 使用分布式锁防止缓存击穿
    const lockKey = `lock:${cacheKey}`
    const hasLock = await acquireLock(lockKey, req.path, 30) // 30秒锁

    if (!hasLock) {
      // 如果获取锁失败，说明其他请求正在渲染，返回陈旧缓存或等待
      const staleHtml = await getStaleCache<string>(cacheKey, ttlConfig.stale)
      if (staleHtml) {
        logger.debug('其他请求正在渲染，返回陈旧缓存', { path: req.path })
        return { html: staleHtml, fromCache: 'stale', revalidated: false }
      }

      // 没有陈旧缓存，等待一小段时间后重试（简单实现）
      await new Promise(resolve => setTimeout(resolve, 100))
      return getPageWithISR(req, renderFn) // 递归重试（注意深度限制）
    }

    try {
      // 渲染页面
      const html = await renderFn(req.url, req)

      // 缓存结果
      const metadata = {
        timestamp: Date.now(),
        ttl: ttlConfig.fresh,
        tags: generatePageTags(req.path),
        staleUntil: Date.now() + (ttlConfig.stale * 1000),
      }

      await setCacheWithMetadata(cacheKey, html, metadata)

      // 添加标签
      if (metadata.tags && metadata.tags.length > 0) {
        await tagCache(cacheKey, metadata.tags)
      }

      // 释放锁
      await releaseLock(lockKey, req.path)

      logger.debug('页面渲染并缓存完成', { path: req.path, ttl: ttlConfig.fresh })
      return { html, fromCache: 'none', revalidated: false }
    } catch (renderError) {
      // 渲染失败，释放锁
      await releaseLock(lockKey, req.path)
      throw renderError
    }
  } catch (error) {
    logger.error('ISR处理失败:', { path: req.path, error })

    // 尝试返回陈旧缓存作为降级
    const staleHtml = await getStaleCache<string>(cacheKey, ttlConfig.stale)
    if (staleHtml) {
      logger.debug('渲染失败，返回陈旧缓存降级', { path: req.path })
      return { html: staleHtml, fromCache: 'stale', revalidated: false }
    }

    // 没有陈旧缓存，尝试直接渲染（不使用缓存）
    try {
      const html = await renderFn(req.url, req)
      return { html, fromCache: 'none', revalidated: false }
    } catch (fallbackError) {
      logger.error('降级渲染也失败:', { path: req.path, error: fallbackError })
      throw error // 抛出原始错误
    }
  }
}

/**
 * 后台重新验证
 * 在后台重新渲染页面并更新缓存，不阻塞当前请求响应。
 * 使用分布式锁防止同一页面的并发重新验证。
 * @param req - Express 请求对象
 * @param renderFn - 页面渲染函数，默认为 renderPageToHtml
 */
export async function revalidateInBackground(
  req: Request,
  renderFn: (url: string, req?: Request) => Promise<string> = renderPageToHtml
): Promise<void> {
  const cacheKey = generateCacheKey(req)
  const pageType = getPageType(req.path)
  const ttlConfig = getTTLForPageType(pageType)

  // 使用锁防止并发重新验证
  const lockKey = `revalidate:${cacheKey}`
  const hasLock = await acquireLock(lockKey, `revalidate:${req.path}`, 60) // 60秒锁

  if (!hasLock) {
    logger.debug('已有重新验证在进行中，跳过', { path: req.path })
    return
  }

  try {
    logger.debug('开始后台重新验证', { path: req.path })

    // 重新渲染页面
    const html = await renderFn(req.url, req)

    // 更新缓存
    const metadata = {
      timestamp: Date.now(),
      ttl: ttlConfig.fresh,
      tags: generatePageTags(req.path),
      staleUntil: Date.now() + (ttlConfig.stale * 1000),
    }

    await setCacheWithMetadata(cacheKey, html, metadata)

    // 添加标签
    if (metadata.tags && metadata.tags.length > 0) {
      await tagCache(cacheKey, metadata.tags)
    }

    logger.debug('后台重新验证完成', { path: req.path })
  } catch (error) {
    logger.error('后台重新验证失败:', { path: req.path, error })
  } finally {
    // 释放锁
    await releaseLock(lockKey, `revalidate:${req.path}`)
  }
}

/**
 * 手动触发指定路径页面的重新验证
 * 用于管理员手动刷新缓存（如内容更新后）。
 * @param path - 需要重新验证的页面路径
 * @returns 重新验证是否成功
 */
export async function revalidatePage(path: string): Promise<boolean> {
  try {
    const mockReq = {
      path,
      url: path,
      headers: {},
    } as Request

    await revalidateInBackground(mockReq)
    return true
  } catch (error) {
    logger.error('手动重新验证失败:', { path, error })
    return false
  }
}

/**
 * 按标签批量重新验证页面
 * 从 Redis 中获取所有关联该标签的缓存键，逐一触发重新验证。
 * 适用于内容更新后需要刷新某类所有页面的场景。
 * @param tag - 缓存标签，如 'section:games'
 * @returns 成功重新验证的页面数量
 */
export async function revalidateByTag(tag: string): Promise<number> {
  try {
    const redisClient = getRedisClient()
    const tagKey = `tag:${tag}`
    const keys = await redisClient.sMembers(tagKey)

    let successCount = 0
    for (const key of keys) {
      // 从缓存键提取路径（格式：ssr:${path}:${lang}）
      const match = key.match(/^ssr:([^:]+):/)
      if (match) {
        const path = match[1]
        if (await revalidatePage(path)) {
          successCount++
        }
      }
    }

    logger.debug('标签重新验证完成', { tag, total: keys.length, success: successCount })
    return successCount
  } catch (error) {
    logger.error('标签重新验证失败:', { tag, error })
    return 0
  }
}

/**
 * 获取指定路径的缓存状态
 * 查询缓存是否存在、是否新鲜/陈旧及缓存年龄等信息。
 * @param path - 请求路径
 * @returns 缓存状态信息（新鲜、陈旧、年龄、TTL等）
 */
export async function getCacheStatus(path: string): Promise<{
  hasFresh: boolean
  hasStale: boolean
  age: number | null
  ttl: number | null
}> {
  const mockReq = {
    path,
    url: path,
    headers: { 'accept-language': 'zh-CN' },
  } as Request

  const cacheKey = generateCacheKey(mockReq)
  const result = await getCacheWithMetadata<string>(cacheKey)

  if (!result.value || !result.metadata) {
    return { hasFresh: false, hasStale: false, age: null, ttl: null }
  }

  const age = Date.now() - result.metadata.timestamp
  const pageType = getPageType(path)
  const ttlConfig = getTTLForPageType(pageType)

  const hasFresh = age <= ttlConfig.fresh * 1000
  const hasStale = age <= ttlConfig.stale * 1000

  return {
    hasFresh,
    hasStale,
    age: Math.round(age / 1000),
    ttl: result.metadata.ttl,
  }
}

export default {
  getPageWithISR,
  revalidateInBackground,
  revalidatePage,
  revalidateByTag,
  getCacheStatus,
  getPageType,
  getTTLForPageType,
  generateCacheKey,
  generatePageTags,
}