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
import { getPageWithISR, getPageType, getTTLForPageType } from '../services/isr.service'

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

  try {
    // 使用ISR服务获取页面（复用 isr.service.ts 中的缓存逻辑，消除重复）
    const { html, fromCache, revalidated } = await getPageWithISR(req)

    // 检测语言
    const langMatch = req.path.match(/^\/([a-z]{2}(-[A-Z]{2})?)/)
    const lang = langMatch ? langMatch[1] : 'zh-CN'

    const headers: Record<string, string> = {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Language': lang,
      'X-Robots-Tag': 'index, follow',
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
    if (process.env.NODE_ENV === 'production') {
      const pageType = getPageType(req.path)
      const ttlConfig = getTTLForPageType(pageType)
      headers['Cache-Control'] = `public, max-age=${ttlConfig.fresh}, stale-while-revalidate=${ttlConfig.stale - ttlConfig.fresh}`
    }

    res.status(200).set(headers).end(html)
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
