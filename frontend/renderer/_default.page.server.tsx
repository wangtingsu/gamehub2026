/**
 * 服务端渲染（SSR）入口文件
 *
 * 该文件是 GameHub 在服务器端渲染的核心入口点。
 * 当用户请求页面时，服务器会调用此文件中的 render 函数，
 * 生成完整的 HTML 字符串返回给浏览器，从而实现：
 * - 首屏内容的快速呈现（减少白屏时间）
 * - 服务端数据预取（SEO 友好，爬虫可直接索引内容）
 * - 动态 SEO 元数据注入（标题、描述、Open Graph 等）
 * - 多语言支持（根据 URL 路径检测语言）
 * - 结构化数据的注入（JSON-LD Schema.org）
 *
 * 使用的框架：vite-plugin-ssr
 */

import React from 'react'
import { QueryClient, dehydrate } from '@tanstack/react-query'
import { queryKeys } from '../src/api/hooks'
import apiService from '../src/api/index'
import i18n from '../src/i18n.server'
import type { PageContextServer } from 'vike/types'

/**
 * 服务端渲染环境配置
 *
 * 在服务器端渲染期间，强制使用真实 API（而非 Mock 数据），
 * 确保搜索引擎和用户首次访问时获取到真实内容。
 * API 基础地址默认使用本地 3000 端口，可通过环境变量覆盖。
 */
if (typeof process !== 'undefined') {
  process.env.VITE_USE_MOCK = 'false'
  process.env.VITE_API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
}

export { render }

/**
 * 根据 URL 路径返回页面特定的 SEO 元数据
 *
 * 根据当前请求的 URL 路径，返回对应的页面标题（title）、描述（description）、
 * Open Graph 标题和描述。支持全部六种语言（en/zh-CN/ja/ko/es/fr）。
 *
 * 页面路由匹配规则：
 * - /（首页）→ 首页 SEO
 * - /games/* → 游戏库/游戏详情
 * - /news/* → 新闻页面
 * - /community/* → 社区页面
 * - /about/* → 关于页面
 * - /legal|privacy|terms/* → 法律条款
 * - /cozy-games|cozy/* → 治愈游戏专题
 * - /free-games|free/* → 免费游戏专题
 * - /ai-gaming|ai/* → AI 游戏专题
 *
 * @param urlPathname - 当前请求的 URL 路径（例如 "/cn/games/elden-ring"）
 * @param lang - i18n 语言代码（如 "en"、"zh-CN"、"ja"、"ko"、"es"、"fr"）
 * @returns SEO 元数据对象，包含 title、description、ogTitle、ogDescription
 */

/** URL 短语言代码 → i18n 语言代码映射 */
const LANG_CODE_TO_I18N: Record<string, string> = {
  en: 'en',
  cn: 'zh-CN',
  ja: 'ja',
  ko: 'ko',
  es: 'es',
  fr: 'fr',
}

/** i18n 语言代码 → Open Graph locale 映射（与 SEO.tsx 保持一致） */
const LOCALE_MAP: Record<string, string> = {
  en: 'en_US',
  'zh-CN': 'zh_CN',
  ja: 'ja_JP',
  ko: 'ko_KR',
  es: 'es_ES',
  fr: 'fr_FR',
}

/** 站点级常量（与 SEO.tsx 保持一致，保证 SSR 与客户端输出一致） */
const SITE_NAME = 'GameHub'
const SITE_URL = 'https://www.gghubs.com'
const OG_IMAGE = `${SITE_URL}/og-image.png`
const TWITTER_HANDLE = '@gghubsgame'
const DEFAULT_AUTHOR = 'GameHub Team'
const DEFAULT_KEYWORDS =
  'game library, game management, gaming platform, video games, game collection, game hub, gaming community'

function getPageMeta(urlPathname: string, lang: string) {
  const t = i18n.getFixedT(lang)
  const path = urlPathname.replace(/^\/(en|cn|ja|ko|es|fr)\/?/i, '/').replace(/^\/+/, '')

  // 组装 SEO 元数据（ogTitle/ogDescription 复用 title/description）
  const build = (title: string, description: string) => ({
    title,
    description,
    ogTitle: title,
    ogDescription: description,
  })

  if (path === '/' || path === '') {
    return build(t('seo.defaultTitle'), t('seo.defaultDescription'))
  }
  if (path.startsWith('games')) {
    const rest = path.slice('games'.length).replace(/^\//, '')
    if (rest && !rest.startsWith('category')) {
      const slug = decodeURIComponent(rest)
      return build(
        t('seo.gameDetails.title', { slug }),
        t('seo.gameDetails.description', { slug }),
      )
    }
    return build(t('seo.gamesTitle'), t('seo.gamesDescription'))
  }
  if (path.startsWith('news')) {
    return build(t('seo.newsTitle'), t('seo.newsDescription'))
  }
  if (path.startsWith('reviews')) {
    return build(t('seo.reviewsTitle'), t('seo.reviewsDescription'))
  }
  if (path.startsWith('community')) {
    return build(t('seo.communityTitle'), t('seo.communityDescription'))
  }
  if (path.startsWith('about')) {
    return build(t('seo.aboutTitle'), t('seo.aboutDescription'))
  }
  if (path.startsWith('legal') || path.startsWith('privacy') || path.startsWith('terms')) {
    return build(t('seo.legal.title'), t('seo.legal.description'))
  }
  if (path.startsWith('cozy-games') || path.startsWith('cozy')) {
    return build(t('seo.cozyGames.title'), t('seo.cozyGames.description'))
  }
  if (path.startsWith('free-games') || path.startsWith('free')) {
    return build(t('seo.freeGames.title'), t('seo.freeGames.description'))
  }
  if (path.startsWith('ai-gaming') || path.startsWith('ai')) {
    return build(t('seo.aiGaming.title'), t('seo.aiGaming.description'))
  }
  // 默认首页 SEO
  return build(t('seo.defaultTitle'), t('seo.defaultDescription'))
}

/**
 * 服务器端数据预取函数
 *
 * 根据当前请求的 URL 路径，在服务端提前获取对应页面所需的数据，
 * 并将数据注入到 React Query 的缓存中。这些缓存数据随后会被
 * 序列化为脱水（dehydrated）状态，嵌入到 HTML 中返回给浏览器，
 * 使客户端可以直接使用这些数据，无需再次发起网络请求。
 *
 * 预取策略：
 * - 首页（/ /cn /en）：预取游戏列表（8条）、新闻列表（6条）、评测列表（4条）
 * - 游戏详情页（/games/*）：预取游戏详情和相关评测
 * - 新闻详情页（/news/*）：预取新闻文章内容
 *
 * @param queryClient - React Query 的 QueryClient 实例，用于执行预取操作
 * @param urlPathname - 当前请求的 URL 路径，用于判断需要预取哪些数据
 */
async function prefetchData(queryClient: QueryClient, urlPathname: string) {
  // 仅首页（/、/en、/en/、/cn、/cn/ 等）触发首页预取；避免 /en/blog/89 等子路径误命中
  if (urlPathname === '/' || /^\/(en|cn|ja|ko|es|fr)\/?$/.test(urlPathname)) {
    console.log('预取首页数据:', urlPathname)
    try {
      await queryClient.prefetchQuery({
        queryKey: queryKeys.games.list({ page: 1, limit: 8 }),
        queryFn: () => apiService.getGames({ page: 1, limit: 8 })
      })
      await queryClient.prefetchQuery({
        queryKey: queryKeys.news.list({ page: 1, limit: 6 }),
        queryFn: () => apiService.getNews({ page: 1, limit: 6 })
      })
      await queryClient.prefetchQuery({
        queryKey: queryKeys.reviews.list({ page: 1, limit: 4, sort: 'popular' }),
        queryFn: () => apiService.getReviews({ page: 1, limit: 4, sort: 'popular' })
      })
      console.log('首页数据预取完成')
    } catch (apiError) {
      console.warn('首页API预取失败:', apiError)
    }
  } else if (urlPathname.includes('/games/')) {
    const match = urlPathname.match(/\/games\/([^\/]+)/)
    if (match) {
      const gameId = match[1]
      try {
        await queryClient.prefetchQuery({
          queryKey: queryKeys.games.detail(gameId),
          queryFn: () => apiService.getGame(gameId)
        })
        await queryClient.prefetchQuery({
          queryKey: [...queryKeys.reviews.lists(), { gameId, page: 1, limit: 10 }],
          queryFn: () => apiService.getGameReviews(gameId, { page: 1, limit: 10 })
        })
      } catch (apiError) {
        console.warn('游戏详情API预取失败:', apiError)
      }
    }
  } else if (urlPathname.includes('/news/')) {
    const match = urlPathname.match(/\/news\/([^\/]+)/)
    if (match) {
      try {
        await queryClient.prefetchQuery({
          queryKey: queryKeys.news.detail(match[1]),
          queryFn: () => apiService.getNewsArticle(match[1])
        })
      } catch (apiError) {
        console.warn('新闻详情API预取失败:', apiError)
      }
    }
  }
}

/**
 * 服务端页面渲染函数（vite-plugin-ssr 核心钩子）
 *
 * 这是 vite-plugin-ssr 框架在服务端渲染时调用的核心函数。
 * 它为每个请求生成完整的 HTML 文档字符串，包括：
 *
 * 工作流程：
 * 1. 解析 URL 路径，检测用户语言偏好
 * 2. 创建服务端专用的 QueryClient 实例
 * 3. 根据路由预取数据（游戏列表、详情、新闻等）
 * 4. 将预取数据脱水（dehydrate）为可序列化的状态
 * 5. 根据 URL 获取页面特定的 SEO 元数据
 * 6. 组装完整的 HTML 文档，包括：
 *    - 多语言 <html> 标签
 *    - 完整的 <head> 部分（meta、OG、Twitter Card、JSON-LD 结构化数据）
 *    - 页面挂载点 <div id="root">（等待客户端 hydration）
 *    - 生产/开发环境不同的客户端脚本引用
 *    - 内联的脱水状态数据（window.__DEHYDRATED_STATE__）
 *
 * @param pageContext - vite-plugin-ssr 的服务器端页面上下文，包含 URL 路径、请求参数等信息
 * @returns 包含完整 HTML 文档字符串的对象，供框架返回给客户端
 */
async function render(pageContext: PageContextServer) {
  try {
  console.log('[SSR-RENDER] render() called, url:', pageContext.urlPathname)
  const { urlPathname } = pageContext

  // 仅匹配已知语言代码（避免 /oauth、/admin 等路径被误识别为语言）
  const knownLangs = ['cn', 'en', 'ja', 'ko', 'es', 'fr']
  const langMatch = urlPathname.match(/^\/(en|cn|ja|ko|es|fr)(?=\/|$)/)
  const detectedLang = langMatch?.[1]
  const validLang = detectedLang && knownLangs.includes(detectedLang) ? detectedLang : null
  const i18nLang = validLang ? (LANG_CODE_TO_I18N[validLang] || 'en') : 'en'
  if (validLang) {
    i18n.changeLanguage(i18nLang)
  }

  const serverQueryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 1000 * 60 * 5, gcTime: 1000 * 60 * 10 },
    },
  })

  await prefetchData(serverQueryClient, urlPathname)
  const dehydratedState = dehydrate(serverQueryClient)
  const isProduction = typeof process !== "undefined" && process.env.NODE_ENV === "production"

  // 序列化 Vike 页面上下文（客户端 hydration 需要）
  const pageContextSerialized = JSON.stringify({
    _pageId: (pageContext as any)._pageId,
    urlPathname: pageContext.urlPathname,
    routeParams: (pageContext as any).routeParams,
    Page: undefined, // 不可序列化，由客户端动态加载
  }).replace(/</g, "\\u003c")

  // 根据 URL 获取页面特定的 SEO 元数据
  const pageMeta = getPageMeta(urlPathname, i18nLang)

  // 生成动态 canonical / hreflang / og:url（修复：此前所有页面都硬编码指向首页）
  const HREFLANG_LANGS = [
    { prefix: 'en', code: 'en' },
    { prefix: 'cn', code: 'zh-CN' },
    { prefix: 'ja', code: 'ja' },
    { prefix: 'ko', code: 'ko' },
    { prefix: 'es', code: 'es' },
    { prefix: 'fr', code: 'fr' },
  ]
  // 去除语言前缀后的路径（首页为 '/'）
  const pathWithoutLang = urlPathname.replace(/^\/(en|cn|ja|ko|es|fr)(?=\/|$)/i, '') || '/'
  // 语言前缀：无前缀时默认 en（把 /games/12 归一到 /en/games/12）
  const langPrefix = validLang || 'en'
  // canonical：语言根页（/、/en、/cn…）统一指向带语言前缀的 /en（而非会 301 跳转的无前缀根 /）
  const canonicalUrl = pathWithoutLang === '/'
    ? `${SITE_URL}/${langPrefix}`
    : `${SITE_URL}/${langPrefix}${pathWithoutLang}`
  const alternateLinks = HREFLANG_LANGS.map(
    (l) => `<link rel="alternate" hreflang="${l.code}" href="${SITE_URL}/${l.prefix}${pathWithoutLang === '/' ? '' : pathWithoutLang}" />`
  ).join('\n    ')
  // og:locale（与 SEO.tsx 的 LOCALE_MAP 保持一致）
  const ogLocale = LOCALE_MAP[i18nLang] || 'en_US'

  const clientScript = isProduction
    ? '<!-- SSR_CLIENT_SCRIPTS_PLACEHOLDER -->'
    : '<script type="module" src="/@vite/client"><\/script>'

  return {
    documentHtml: `<!DOCTYPE html>
<html lang="${i18nLang}">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="google-site-verification" content="VpzrtWz7zu_7rhXSfkHQY7SiM-tCQmYwcqh4hz7m-aU" />
    <title>${pageMeta.title}</title>
    <meta name="title" content="${pageMeta.title}" />
    <meta name="description" content="${pageMeta.description}" />
    <meta name="keywords" content="${DEFAULT_KEYWORDS}" />
    <meta name="author" content="${DEFAULT_AUTHOR}" />
    <meta name="robots" content="index, follow" />
    <meta name="googlebot" content="index, follow" />
    <link rel="canonical" href="${canonicalUrl}" />
    ${alternateLinks}
    <link rel="alternate" hreflang="x-default" href="${canonicalUrl}" />
    <meta property="og:title" content="${pageMeta.ogTitle}" />
    <meta property="og:description" content="${pageMeta.ogDescription}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="${OG_IMAGE}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${pageMeta.title}" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:locale" content="${ogLocale}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${canonicalUrl}" />
    <meta name="twitter:title" content="${pageMeta.title}" />
    <meta name="twitter:description" content="${pageMeta.description}" />
    <meta name="twitter:image" content="${OG_IMAGE}" />
    <meta name="twitter:site" content="${TWITTER_HANDLE}" />
    <meta name="twitter:creator" content="${TWITTER_HANDLE}" />
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "name": "${SITE_NAME}",
          "url": "${SITE_URL}",
          "description": ${JSON.stringify(pageMeta.description)},
          "potentialAction": {
            "@type": "SearchAction",
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": "${SITE_URL}/search?q={search_term_string}"
            },
            "query-input": "required name=search_term_string"
          }
        },
        {
          "@type": "Organization",
          "name": "${SITE_NAME}",
          "url": "${SITE_URL}",
          "logo": "${OG_IMAGE}",
          "sameAs": [
            "https://twitter.com/gamehub",
            "https://facebook.com/gamehub",
            "https://instagram.com/gamehub"
          ]
        }
      ]
    }
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script id="vike_pageContext" type="application/json">${pageContextSerialized}<\/script>
    ${clientScript}
    <script>
      window.__DEHYDRATED_STATE__ = ${JSON.stringify(dehydratedState).replace(/</g, "\\u003c")}
    <\/script>
  </body>
</html>`
    }
  } catch (err) {
    console.error('[SSR-RENDER] render() failed:', err instanceof Error ? err.message : err)
    throw err
  }
}
