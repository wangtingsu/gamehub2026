/**
 * 服务端渲染中间件模块
 *
 * 为 SPA 应用提供服务端渲染（SSR）支持，集成增量静态再生（ISR）缓存机制：
 * - 跳过 API 请求和静态文件请求，交由后续中间件处理
 * - 使用 ISR 服务获取渲染后的 HTML 页面（复用缓存或触发重新渲染）
 * - 生成 ETag 并支持 If-None-Match 条件请求（304 Not Modified）
 * - 添加合适的缓存控制头部（fresh/stale-while-revalidate）
 * - 设置内容语言和 SEO 相关头部
 *
 * @module middlewares/ssr.middleware
 */

import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import logger from '../utils/logger'
import { getPageWithISR } from '../services/isr.service'

/**
 * 页面 URL 归一化：返回规范形态（若无需归一化则返回 null）。
 *
 * 处理两类重复收录问题：
 * 1. 语言前缀大小写（/EN/…、/ZH-cn/… → /en/…、/zh-cn/…）
 * 2. 尾斜杠（/en/ → /en、/en/games/ → /en/games）
 *
 * @param path - 解码后的请求路径（req.path）
 * @returns 归一化后的路径；无变化时返回 null
 */
function normalizePageUrl(path: string): string | null {
  if (!path || path === '/') return null

  let normalized = path

  // 语言前缀大小写归一
  const langMatch = normalized.match(/^(\/[a-z]{2}(-[a-zA-Z]{2})?)(?=\/|$)/)
  if (langMatch) {
    const lower = langMatch[1].toLowerCase()
    normalized = lower + normalized.slice(langMatch[1].length)
  }

  // 尾斜杠归一（保留根路径 /）
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.replace(/\/+$/, '')
  }

  return normalized === path ? null : normalized
}

/**
 * SSR 中间件处理函数
 *
 * 根据请求路径判断是否需要 SSR 渲染（跳过 /api/、/uploads/ 等前缀和静态文件），
 * 通过 ISR 服务获取页面 HTML，设置缓存状态头部和 ETag，
 * 支持条件请求返回 304 Not Modified。
 *
 * 缓存头部策略：
 * - 生产环境：Cache-Control 使用 public + max-age + stale-while-revalidate
 * - 缓存状态通过 X-Cache 头部传递给客户端（HIT/MISS）
 *
 * @param req  - Express 请求对象
 * @param res  - Express 响应对象
 * @param next - Express 下一个中间件函数
 */
export async function ssrMiddleware(req: Request, res: Response, next: NextFunction) {
  // 跳过API请求和静态文件请求
  if (req.path.startsWith('/api/') ||
      req.path.startsWith('/uploads/') ||
      req.path.startsWith('/health') ||
      req.path.startsWith('/metrics') ||
      /\.(js|css|png|jpg|jpeg|gif|svg|ico|json|txt)$/.test(req.path)) {
    return next()
  }

  // URL 归一化：语言前缀大小写 + 尾斜杠 → 301 到规范形态（避免重复收录）
  const normalizedPath = normalizePageUrl(req.path)
  if (normalizedPath) {
    const query = (req.originalUrl || '').split('?')[1]
    return res.redirect(301, normalizedPath + (query ? `?${query}` : ''))
  }

  try {
    // 使用ISR服务获取页面（复用 isr.service.ts 中的缓存逻辑，消除重复）
    const { html, statusCode, fromCache, revalidated } = await getPageWithISR(req)

    // 检测语言
    const langMatch = req.path.match(/^\/([a-z]{2}(-[A-Z]{2})?)/)
    const lang = langMatch ? langMatch[1] : 'zh-CN'

    // 软 404（不存在的内容页）返回 404 并告知搜索引擎不收录
    const isNotFound = statusCode === 404
    const headers: Record<string, string> = {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Language': lang,
      'X-Robots-Tag': isNotFound ? 'noindex, nofollow' : 'index, follow',
    }

    // 设置缓存状态头部
    if (fromCache === 'fresh') {
      headers['X-Cache'] = 'HIT'
      headers['X-Cache-Status'] = 'fresh'
    } else if (fromCache === 'stale') {
      headers['X-Cache'] = 'HIT'
      headers['X-Cache-Status'] = 'stale'
      if (revalidated) {
        headers['X-Cache-Revalidated'] = 'true'
      }
    } else {
      headers['X-Cache'] = 'MISS'
    }

    // 生成 ETag 并检查 If-None-Match（304 Not Modified）
    const etag = crypto.createHash('md5').update(html).digest('hex')
    const quotedEtag = `"${etag}"`
    headers['ETag'] = quotedEtag

    const clientETag = req.headers['if-none-match']
    if (clientETag === quotedEtag || clientETag === etag) {
      res.status(304).set(headers).end()
      return
    }

    // 添加缓存控制头
    // 注意：SSR HTML 内联引用了带内容哈希的 JS/CSS bundle，每次前端重新构建哈希都会变化。
    // 若允许浏览器/CDN 直接复用旧 HTML，会引用已被删除的 bundle 导致白屏。
    // 因此这里使用 no-cache + must-revalidate 强制每次校验（配合 ETag 返回 304，开销极小）。
    if (process.env.NODE_ENV === 'production') {
      headers['Cache-Control'] = 'public, no-cache, must-revalidate'
    }

    res.status(statusCode).set(headers).end(html)
  } catch (error) {
    logger.error('SSR middleware error:', error)
    next()
  }
}

/**
 * SSR 中间件工厂函数
 *
 * 提供创建 SSR 中间件的工厂方法，便于在应用启动时初始化。
 *
 * @returns SSR 中间件处理函数
 */
export function createSSRMiddleware() {
  return ssrMiddleware
}
