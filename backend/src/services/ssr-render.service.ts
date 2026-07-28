/**
 * SSR 服务端渲染服务
 *
 * 为应用提供服务端渲染（SSR）能力。开发环境使用 Vite 开发服务器动态渲染，
 * 生产环境使用预构建的 SSR 捆绑包。支持 hydration 资源注入、SSR 降级到
 * 客户端渲染（CSR）等多种策略，确保在各种部署场景下页面都能正常显示。
 *
 * @module ssr-render.service
 */

import { Request, Response } from 'express'
import path from 'path'
import fs from 'fs'
import logger from '../utils/logger'

/**
 * 开发和生产环境使用不同的渲染方式
 * 生产环境使用预构建 SSR 捆绑包，开发环境使用 Vite 中间件
 */
const isProduction = process.env.NODE_ENV === 'production'

/**
 * SSR 渲染器函数引用，由 initSSRRenderer 动态加载
 */
let renderPage: any

/**
 * Vite 开发服务器实例（仅开发环境使用）
 */
let vite: any

/**
 * SSR 初始化是否已尝试过并失败
 * 避免每次请求都重复尝试初始化
 */
let ssrInitAttempted = false

/**
 * 生产环境下缓存的 assets.json 内容
 * 包含客户端入口 JS/CSS 资源映射
 */
let cachedManifest: any = null

/**
 * hydration 构建清单
 * 独立构建的客户端 hydration 资源（不含 vite-plugin-ssr）
 * 用于避免客户端路由运行时冲突
 */
let cachedHydrateManifest: any = null

/**
 * 从 Vite 8 / Rolldown 的 assets.json 中读取 client 端入口资源
 * 用于 SSR 降级模板或 hydration 资源缺失时的 fallback
 */
function getClientEntryAssets(): { headTags: string; bodyScripts: string } {
  try {
    const possiblePaths = [
      '/app/frontend-dist/assets.json',
      path.join(__dirname, '../../../frontend/dist/assets.json'),
      path.join(__dirname, '../../../frontend/dist/client/assets.json'),
      path.join(__dirname, '../../frontend/dist/assets.json'),
      path.join(__dirname, '../../frontend/dist/client/assets.json'),
    ]

    let manifest: any = null
    let manifestPath = ''
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        manifest = JSON.parse(fs.readFileSync(p, 'utf-8'))
        manifestPath = p
        break
      }
    }

    if (!manifest) {
      logger.warn('getClientEntryAssets: 未找到 assets.json')
      return { headTags: '', bodyScripts: '' }
    }

    // 在 assets.json 中查找客户端入口（vite-plugin-ssr 的 _default.page.client）
    let entryFile = ''
    const entryCss: string[] = []
    for (const [key, value] of Object.entries(manifest)) {
      const entry = value as any
      if (entry.isEntry && key.includes('_default.page.client')) {
        entryFile = entry.file
        if (Array.isArray(entry.css)) {
          entryCss.push(...entry.css)
        }
        break
      }
    }

    if (!entryFile) {
      logger.warn('getClientEntryAssets: 未找到 client 入口', { manifestPath })
      return { headTags: '', bodyScripts: '' }
    }

    const headTags = entryCss.map((css: string) => `<link rel="stylesheet" href="/${css}">`).join('\n    ')
    const bodyScripts = `<script type="module" src="/${entryFile}"></script>`

    logger.info(`getClientEntryAssets: 注入入口 ${entryFile}`, { css: entryCss })
    return { headTags, bodyScripts }
  } catch (error) {
    logger.error('getClientEntryAssets 失败:', error)
    return { headTags: '', bodyScripts: '' }
  }
}

/**
 * 读取 hydration 构建清单（独立 Vite 构建，不含 vite-plugin-ssr）
 * 每次从磁盘读取，避免缓存过期问题
 * 降级到 assets.json 作为 fallback
 */
function getHydrateAssets(): { headTags: string; bodyScripts: string } {
  try {
    const possiblePaths = [
      '/app/frontend-dist/hydrate/.vite/manifest.json',
      '/app/frontend-dist/.vite/manifest.json',
      path.join(__dirname, '../../../frontend/dist/hydrate/.vite/manifest.json'),
      path.join(__dirname, '../../frontend/dist/hydrate/.vite/manifest.json'),
    ]

    let manifest: any = null
    let manifestPath = ''
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        manifest = JSON.parse(fs.readFileSync(p, 'utf-8'))
        manifestPath = p
        logger.info(`读取 hydration manifest: ${p}`)
        break
      }
    }

    if (manifest) {
      // 查找 main.tsx 入口（hydration 自执行脚本，不含 vite-plugin-ssr）
      let entryFile = ''
      const entryCss: string[] = []
      for (const [key, value] of Object.entries(manifest)) {
        const entry = value as any
        if (key === 'main.tsx' && entry.isEntry) {
          entryFile = entry.file
          if (Array.isArray(entry.css)) {
            entryCss.push(...entry.css)
          }
          break
        }
      }

      if (entryFile) {
        const headTags = entryCss.map((css: string) => `<link rel="stylesheet" href="/${css}">`).join('\n    ')
        const bodyScripts = `<script type="module" src="/${entryFile}"></script>`
        logger.info(`getHydrateAssets: 注入入口 ${entryFile}`, { css: entryCss })
        return { headTags, bodyScripts }
      }
    }

    // Hydration manifest 不存在或格式不匹配，使用主构建的 assets.json
    logger.info('hydration manifest 未找到，使用主构建 assets.json 中的 client entry')
    return getClientEntryAssets()
  } catch (error) {
    logger.error('读取 hydration 资源失败:', error)
    return { headTags: '', bodyScripts: '' }
  }
}

/**
 * 读取生产环境的 assets.json（Vite 构建清单），生成 client 资源引用
 */
function getClientAssets(): { headTags: string; bodyScripts: string } {
  try {
    /* 每次从磁盘读取，避免缓存过期问题 */
    const possiblePaths = [
      '/app/frontend-dist/assets.json',
      path.join(__dirname, '../../../frontend/dist/assets.json'),
      path.join(__dirname, '../../../frontend/dist/client/assets.json'),
      path.join(__dirname, '../../frontend/dist/assets.json'),
      path.join(__dirname, '../../frontend/dist/client/assets.json'),
    ]

    let manifest: any = null
    let manifestPath = ''
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        manifest = JSON.parse(fs.readFileSync(p, 'utf-8'))
        manifestPath = p
        break
      }
    }

    if (!manifest) {
      logger.warn('未找到 assets.json，SSR 将使用默认模板')
      return { headTags: '', bodyScripts: '' }
    }

    // 查找 client 入口（server-routing，不导出客户端路由钩子时）
    let entryFile = ''
    const entryCss: string[] = []
    for (const [key, value] of Object.entries(manifest)) {
      const entry = value as any
      if (entry.isEntry && key.includes('renderer/_default.page.client')) {
        entryFile = entry.file
        logger.info(`getClientAssets: 找到入口 ${entryFile} (来源: ${manifestPath})`)
        if (Array.isArray(entry.css)) {
          entryCss.push(...entry.css)
        }
        break
      }
    }

    if (!entryFile) {
      logger.warn('未找到 client 入口，SSR 将使用默认模板')
      return { headTags: '', bodyScripts: '' }
    }

    // 生成 CSS link 标签
    const headTags = entryCss.map((css: string) => `<link rel="stylesheet" href="/${css}">`).join('\n    ')
    // 生成 JS module 标签
    const bodyScripts = `<script type="module" src="/${entryFile}"></script>`

    logger.info(`getClientAssets: 注入入口 ${entryFile}`)
    return { headTags, bodyScripts }
  } catch (error) {
    logger.error('读取 client 资源失败:', error)
    return { headTags: '', bodyScripts: '' }
  }
}

/**
 * 初始化SSR渲染器
 */
export async function initSSRRenderer(): Promise<void> {
  ssrInitAttempted = true
  try {
    if (!isProduction) {
      // 开发环境：使用Vite开发服务器
      const { createServer } = await import('vite')
      vite = await createServer({
        root: path.join(__dirname, '../../../frontend'),
        server: { middlewareMode: true },
        appType: 'custom'
      })

      // 动态导入vite-plugin-ssr的渲染函数
      const ssrModule = await vite.ssrLoadModule('/renderer/_default.page.server.tsx')
      renderPage = ssrModule.render

      logger.info('开发环境SSR渲染器初始化成功')
    } else {
      // 生产环境：使用构建好的SSR捆绑包
      const possiblePaths = [
        // Docker 容器路径
        '/app/frontend-dist/server/entries/renderer_default-page-server.mjs',
        '/app/frontend-dist/server/entries/renderer_default-page-server.js',
        '/app/frontend-dist/entries/renderer_default-page-server.mjs',
        '/app/frontend-dist/entries/renderer_default-page-server.js',
        // vite-plugin-ssr 构建输出（dist/server/entries/）
        path.join(__dirname, '../../../frontend/dist/server/entries/renderer_default-page-server.mjs'),
        path.join(__dirname, '../../../frontend/dist/server/entries/renderer_default-page-server.js'),
        path.join(__dirname, '../../frontend/dist/server/entries/renderer_default-page-server.mjs'),
        path.join(__dirname, '../../frontend/dist/server/entries/renderer_default-page-server.js'),
        // 旧版 ssr 路径（向后兼容）
        path.join(__dirname, '../../../frontend/dist/ssr/renderer/_default.page.server.mjs'),
        path.join(__dirname, '../../../frontend/dist/ssr/renderer/_default.page.server.js'),
        path.join(__dirname, '../../../frontend/dist/ssr/entry-server.js'),
        path.join(__dirname, '../../frontend/dist/ssr/renderer/_default.page.server.mjs'),
        path.join(__dirname, '../../frontend/dist/ssr/renderer/_default.page.server.js'),
        path.join(__dirname, '../../frontend/dist/ssr/entry-server.js'),
      ]

      let ssrEntryPath: string | null = null
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          ssrEntryPath = p
          break
        }
      }

      if (!ssrEntryPath) {
        throw new Error(`SSR捆绑包未找到，请先运行 npm run build:ssr。查找路径: ${possiblePaths.join(', ')}`)
      }

      const ssrModule = await import(ssrEntryPath)
      renderPage = ssrModule.render

      // 预热缓存 client 资源
      getClientAssets()

      logger.info(`生产环境SSR渲染器初始化成功，入口: ${ssrEntryPath}`)
    }
  } catch (error) {
    logger.error('SSR渲染器初始化失败:', error)
    ssrInitAttempted = true
    throw error
  }
}

/**
 * 渲染页面
 */
export async function renderPageToHtml(url: string, req?: Request): Promise<string> {
  try {
    if (!renderPage && !ssrInitAttempted) {
      await initSSRRenderer()
    }

    if (!renderPage) {
      return getFallbackHtml(url)
    }

    // 构建页面上下文
    const pageContext: any = {
      urlOriginal: url,
      urlPathname: url,
      ...(req && {
        cookies: req.cookies,
        headers: req.headers,
        user: (req as any).user
      })
    }

    // 调用渲染函数
    const renderResult = await renderPage(pageContext)

    let html: string
    if (renderResult?.documentHtml) {
      html = renderResult.documentHtml
    } else if (typeof renderResult === 'string') {
      html = renderResult
    } else {
      logger.error('渲染结果格式不正确:', renderResult)
      throw new Error('渲染结果格式不正确')
    }

    // 生产环境下替换占位符为真实的 client 资源引用
    // 优先使用 hydrate 构建（独立 vite.hydrate.config.ts 构建，不含 vite-plugin-ssr）
    // 避免 vite-plugin-ssr 客户端路由运行时冲突和 #vite-plugin-ssr_pageContext 缺失错误
    // 降级到 vite-plugin-ssr 的 client 入口（assets.json 中的 _default.page.client）
    if (isProduction) {
      const { headTags, bodyScripts } = getHydrateAssets()
      if (bodyScripts) {
        html = html.replace('<!-- SSR_CLIENT_SCRIPTS_PLACEHOLDER -->', bodyScripts)
      } else {
        // 降级：使用 vite-plugin-ssr client 入口
        const fallback = getClientAssets()
        if (fallback.bodyScripts) {
          html = html.replace('<!-- SSR_CLIENT_SCRIPTS_PLACEHOLDER -->', fallback.bodyScripts)
        }
        if (fallback.headTags) {
          html = html.replace('</head>', `    ${fallback.headTags}\n  </head>`)
        }
      }
      if (headTags) {
        html = html.replace('</head>', `    ${headTags}\n  </head>`)
      }
    }

    return html
  } catch (error) {
    logger.error('页面渲染失败:', { url, error })

    // 渲染失败时记录详细错误并返回降级HTML
    if (error instanceof Error) {
      logger.error('页面渲染失败详情:', { url, message: error.message, stack: error.stack?.substring(0, 500) })
    }
    return getFallbackHtml(url)
  }
}

/**
 * 获取降级HTML（客户端渲染）
 */
/** 从URL路径提取语言 */
function detectLang(url: string): 'en' | 'zh' {
  const match = url.match(/^\/(en|zh-cn|cn)\b/i)
  return match?.[1]?.startsWith('en') ? 'en' : 'zh'
}

function getFallbackHtml(url: string): string {
  const possiblePaths = isProduction
    ? [
        '/app/frontend-dist/client/index.html',
        path.join(__dirname, '../../../frontend/dist/client/index.html'),
        path.join(__dirname, '../../../frontend/dist/index.html'),
        path.join(__dirname, '../../frontend/dist/client/index.html'),
        path.join(__dirname, '../../frontend/dist/index.html'),
      ]
    : [path.join(__dirname, '../../../frontend/index.html')]

  const fbLang = detectLang(url)
  const fbIsEn = fbLang === 'en'
  const fbPrerendered = fbIsEn
    ? 'GameHub is a comprehensive gaming community platform — discover game reviews, recommendations, guides, and connect with millions of gamers worldwide.'
    : 'GameHub（好游聚）是一个综合性游戏社区平台 — 在这里发现游戏评测、推荐、攻略，并与全球数百万玩家交流互动。'

  for (const templatePath of possiblePaths) {
    try {
      if (fs.existsSync(templatePath)) {
        let template = fs.readFileSync(templatePath, 'utf-8')
        return template.replace(
          '<div id="root"></div>',
          `<div id="root"><!-- SSR fallback: client-side rendering --><h1 style="display:none">${fbPrerendered}</h1></div>`
        )
      }
    } catch (error) {
      logger.error('读取降级模板失败:', error)
    }
  }

  // 降级：从 assets.json 注入客户端入口 JS/CSS 确保页面可加载
  const { headTags, bodyScripts } = getClientEntryAssets()

  const prerenderedContent = fbIsEn
    ? 'GameHub is a comprehensive gaming community platform — discover game reviews, recommendations, guides, and connect with millions of gamers worldwide. Browse thousands of games across PC, PlayStation, Xbox, Nintendo Switch, and mobile platforms.'
    : 'GameHub（好游聚）是一个综合性游戏社区平台 — 在这里发现游戏评测、推荐、攻略，并与全球数百万玩家交流互动。浏览涵盖 PC、PlayStation、Xbox、Nintendo Switch 和手机平台的海量游戏库。'
  return `<!DOCTYPE html>
	<html lang="${fbIsEn ? 'en' : 'zh-CN'}">
	<head>
	  <meta charset="UTF-8">
	  <meta name="viewport" content="width=device-width, initial-scale=1.0">
	  <meta name="google-site-verification" content="VpzrtWz7zu_7rhXSfkHQY7SiM-tCQmYwcqh4hz7m-aU" />
	  <title>${fbIsEn ? 'GameHub - Game Reviews & Recommendations | Find Your Next Favorite Game' : 'GameHub - 专业游戏推荐与评测平台 | 发现你的下一款最爱游戏'}</title>
	  <meta name="description" content="${fbIsEn ? 'GameHub is a professional game recommendation and review community platform. Discover game reviews, trending recommendations, in-depth guides, and join gaming discussions.' : 'GameHub（好游聚）是专业的游戏推荐与评测社区平台，提供最新游戏评测、热门游戏推荐、深度游戏攻略和玩家社区讨论。'}" />
	  <meta name="robots" content="index, follow" />
	  <link rel="canonical" href="https://www.gghubs.com/" />
	  <meta property="og:title" content="${fbIsEn ? 'GameHub - Game Reviews & Recommendations' : 'GameHub - 专业游戏推荐与评测平台'}" />
	  <meta property="og:description" content="${fbIsEn ? 'GameHub gaming community platform - Game reviews, recommendations, guides and discussion.' : 'GameHub（好游聚）是专业的游戏推荐与评测社区平台，提供最新游戏评测、热门游戏推荐、深度游戏攻略。'}" />
	  <meta property="og:type" content="website" />
	  <meta property="og:url" content="https://www.gghubs.com/" />
	  <meta name="twitter:card" content="summary_large_image" />
	  ${headTags}
	</head>
	<body>
	  <div id="root"><!-- SSR fallback: client-side rendering --><h1 style="display:none"></h1></div>
	  ${bodyScripts}
	</body>
	</html>`
}

/**
 * 处理SSR请求
 */
export async function handleSSRRequest(req: Request, res: Response): Promise<void> {
  try {
    const html = await renderPageToHtml(req.url, req)
    res.status(200).set({ 'Content-Type': 'text/html' }).send(html)
  } catch (error) {
    logger.error('SSR请求处理失败:', error)
    const fallbackHtml = getFallbackHtml(req.url)
    res.status(200).set({ 'Content-Type': 'text/html' }).send(fallbackHtml)
  }
}

/**
 * 检查渲染器是否已初始化
 */
export function isRendererInitialized(): boolean {
  return !!renderPage
}

/**
 * 获取Vite实例（仅开发环境）
 */
export function getViteInstance(): any {
  return vite
}

export default {
  initSSRRenderer,
  renderPageToHtml,
  handleSSRRequest,
  isRendererInitialized,
  getViteInstance
}