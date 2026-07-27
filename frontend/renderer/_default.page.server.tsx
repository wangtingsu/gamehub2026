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
 * Open Graph 标题和描述。支持中英文双语返回。
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
 * @param isEn - 是否为英文语言
 * @returns SEO 元数据对象，包含 title、description、ogTitle、ogDescription
 */
function getPageMeta(urlPathname: string, isEn: boolean) {
  const path = urlPathname.replace(/^\/(en|cn|ja|ko|es|fr)\/?/i, '/')

  if (path === '/' || path === '') {
    return {
      title: isEn ? 'GameHub - Game Reviews & Recommendations' : 'GameHub - 专业游戏推荐与评测平台 | 发现你的下一款最爱游戏',
      description: isEn ? 'GameHub gaming community platform - Game reviews, recommendations, guides and discussion. Discover your next favorite game.' : 'GameHub（好游聚）是专业的游戏推荐与评测社区平台，提供最新游戏评测、热门游戏推荐、深度游戏攻略和玩家社区讨论。',
      ogTitle: isEn ? 'GameHub - Game Reviews & Recommendations' : 'GameHub - 专业游戏推荐与评测平台',
      ogDescription: isEn ? 'GameHub gaming community platform - Game reviews, recommendations, guides and discussion.' : 'GameHub（好游聚）是专业的游戏推荐与评测社区平台，提供最新游戏评测、热门游戏推荐、深度游戏攻略。',
    }
  }
  if (path.startsWith('games')) {
    const gameSlug = path.replace('games/', '').replace('/category/', '')
    if (gameSlug && !gameSlug.includes('category')) {
      return {
        title: isEn ? `${decodeURIComponent(gameSlug)} - Game Details | GameHub` : `${decodeURIComponent(gameSlug)} - 游戏详情 | GameHub`,
        description: isEn ? `View detailed information about ${decodeURIComponent(gameSlug)} on GameHub` : `查看${decodeURIComponent(gameSlug)}的详细信息、评分、评测和攻略 | GameHub`,
        ogTitle: isEn ? `${decodeURIComponent(gameSlug)} | GameHub` : `${decodeURIComponent(gameSlug)} | GameHub`,
        ogDescription: isEn ? `Game details for ${decodeURIComponent(gameSlug)}` : `${decodeURIComponent(gameSlug)} 游戏详情`,
      }
    }
    return {
      title: isEn ? 'Game Library | GameHub' : '游戏库 | GameHub',
      description: isEn ? 'Browse our complete game library on GameHub' : '浏览 GameHub 的完整游戏库',
      ogTitle: isEn ? 'Game Library | GameHub' : '游戏库 | GameHub',
      ogDescription: isEn ? 'Browse games on GameHub' : '浏览 GameHub 游戏库',
    }
  }
  if (path.startsWith('news')) {
    if (path.includes('/category/') || path === 'news') {
      return {
        title: isEn ? 'Game News | GameHub' : '游戏新闻 | GameHub',
        description: isEn ? 'Latest gaming news, updates, and announcements' : '最新游戏新闻、资讯和公告',
        ogTitle: isEn ? 'Game News | GameHub' : '游戏新闻 | GameHub',
        ogDescription: isEn ? 'Latest gaming news on GameHub' : 'GameHub 最新游戏新闻',
      }
    }
  }
  if (path.startsWith('community')) {
    return {
      title: isEn ? 'Community | GameHub' : '社区 | GameHub',
      description: isEn ? 'Join the GameHub community - discuss games, share experiences' : '加入 GameHub 社区，讨论游戏、分享经验',
      ogTitle: isEn ? 'Community | GameHub' : '社区 | GameHub',
      ogDescription: isEn ? 'GameHub community discussions' : 'GameHub 社区讨论',
    }
  }
  if (path.startsWith('about')) {
    return {
      title: isEn ? 'About GameHub' : '关于 GameHub',
      description: isEn ? 'Learn more about GameHub, our mission and team' : '了解更多关于 GameHub 的信息',
      ogTitle: isEn ? 'About GameHub' : '关于 GameHub',
      ogDescription: isEn ? 'About GameHub gaming platform' : '关于 GameHub 游戏平台',
    }
  }
  if (path.startsWith('legal') || path.startsWith('privacy') || path.startsWith('terms')) {
    return {
      title: isEn ? 'Legal | GameHub' : '法律条款 | GameHub',
      description: isEn ? 'GameHub legal information, privacy policy and terms of service' : 'GameHub 法律信息、隐私政策和服务条款',
      ogTitle: isEn ? 'Legal | GameHub' : '法律条款 | GameHub',
      ogDescription: isEn ? 'GameHub legal information' : 'GameHub 法律信息',
    }
  }
  if (path.startsWith('cozy-games') || path.startsWith('cozy')) {
    return {
      title: isEn ? 'Cozy Games 2026 - Relaxing & Casual Games | GameHub' : '2026年最佳治愈游戏推荐 - 放松解压游戏 | GameHub',
      description: isEn ? 'Discover the best cozy and relaxing games for 2026' : '发现最受欢迎的治愈系放松游戏',
      ogTitle: isEn ? 'Cozy Games | GameHub' : '治愈游戏 | GameHub',
      ogDescription: isEn ? 'Best cozy games collection' : '最佳治愈游戏合集',
    }
  }
  if (path.startsWith('free-games') || path.startsWith('free')) {
    return {
      title: isEn ? 'Free Online Games 2026 - Play Free | GameHub' : '免费在线游戏 2026 - 无需下载免费玩 | GameHub',
      description: isEn ? 'Play the best free online games on GameHub' : '在 GameHub 畅玩最佳免费在线游戏',
      ogTitle: isEn ? 'Free Games | GameHub' : '免费游戏 | GameHub',
      ogDescription: isEn ? 'Free online games collection' : '免费在线游戏合集',
    }
  }
  if (path.startsWith('ai-gaming') || path.startsWith('ai')) {
    return {
      title: isEn ? 'AI Gaming 2026 - AI-Powered Games & Smart NPCs | GameHub' : '2026年AI游戏 - AI驱动游戏与智能NPC | GameHub',
      description: isEn ? 'Explore how AI is transforming gaming' : '探索人工智能如何改变游戏世界',
      ogTitle: isEn ? 'AI Gaming | GameHub' : 'AI 游戏 | GameHub',
      ogDescription: isEn ? 'AI-powered games and tools' : 'AI 驱动游戏和工具',
    }
  }
  // 默认首页 SEO
  return {
    title: isEn ? 'GameHub - Game Reviews & Recommendations' : 'GameHub - 专业游戏推荐与评测平台 | 发现你的下一款最爱游戏',
    description: isEn ? 'GameHub gaming community platform' : 'GameHub（好游聚）是专业的游戏推荐与评测社区平台',
    ogTitle: isEn ? 'GameHub - Game Reviews & Recommendations' : 'GameHub - 专业游戏推荐与评测平台',
    ogDescription: isEn ? 'GameHub gaming community platform' : 'GameHub 游戏社区平台',
  }
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
  if (urlPathname === '/' || urlPathname.startsWith('/cn') || urlPathname.startsWith('/en')) {
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
  const { urlPathname } = pageContext

  // 仅匹配已知语言代码（避免 /oauth、/admin 等路径被误识别为语言）
  const knownLangs = ['cn', 'en', 'ja', 'ko', 'es', 'fr']
  const langMatch = urlPathname.match(/^\/([a-z]{2}(-[A-Z]{2})?)\//)
  const detectedLang = langMatch?.[1]
  const validLang = detectedLang && knownLangs.includes(detectedLang) ? detectedLang : null
  if (validLang) {
    i18n.changeLanguage(validLang)
  }
  const isEn = validLang === 'en'

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
  const pageMeta = getPageMeta(urlPathname, isEn)

  const clientScript = isProduction
    ? '<!-- SSR_CLIENT_SCRIPTS_PLACEHOLDER -->'
    : '<script type="module" src="/@vite/client"><\/script>'

  return {
    documentHtml: `<!DOCTYPE html>
<html lang="${langMatch?.[1] === 'en' ? 'en' : langMatch?.[1] === 'cn' ? 'zh-CN' : langMatch?.[1] || 'zh-CN'}">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="google-site-verification" content="VpzrtWz7zu_7rhXSfkHQY7SiM-tCQmYwcqh4hz7m-aU" />
    <title>${pageMeta.title}</title>
    <meta name="title" content="${pageMeta.title}" />
    <meta name="description" content="${pageMeta.description}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="https://www.gghubs.com/" />
    <link rel="alternate" hreflang="zh-CN" href="https://www.gghubs.com/cn" />
    <link rel="alternate" hreflang="en" href="https://www.gghubs.com/en" />
    <link rel="alternate" hreflang="ja" href="https://www.gghubs.com/ja" />
    <link rel="alternate" hreflang="ko" href="https://www.gghubs.com/ko" />
    <link rel="alternate" hreflang="es" href="https://www.gghubs.com/es" />
    <link rel="alternate" hreflang="fr" href="https://www.gghubs.com/fr" />
    <link rel="alternate" hreflang="x-default" href="https://www.gghubs.com/" />
    <meta property="og:title" content="${pageMeta.ogTitle}" />
    <meta property="og:description" content="${pageMeta.ogDescription}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://www.gghubs.com/" />
    <meta property="og:image" content="https://www.gghubs.com/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "GameHub",
      "url": "https://www.gghubs.com",
      "description": "${isEn ? 'GameHub gaming community platform - Discover, review, and share games' : 'GameHub 游戏社区平台 - 发现、评测、分享游戏'}",
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://www.gghubs.com/search?q={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      }
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
}
