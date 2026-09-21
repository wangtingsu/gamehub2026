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
import { renderToString } from 'react-dom/server'
import type { Game, NewsArticle, Guide, BlogArticle, Review, CommunityPost } from '../src/api/types'
import ServerContent from '../src/components/ServerContent'

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
/** 方形 ≥512px 站点 Logo（Organization.logo 要求方形，og-image 是 343×361 非方形不可用） */
const LOGO_IMAGE = `${SITE_URL}/pwa-512.png`
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
  if (path.startsWith('guides')) {
    return build(t('seo.guidesTitle'), t('seo.guidesDescription'))
  }
  if (path.startsWith('blog')) {
    return build(t('seo.blogTitle'), t('seo.blogDescription'))
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

/** 将相对 URL 归一为绝对 URL（图片等字段可能返回相对路径） */
function absUrl(url: string): string {
  if (!url) return ''
  if (/^https?:\/\//.test(url)) return url
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

/**
 * 根据 FAQ 数组生成 FAQPage 结构化数据节点（Schema.org）
 *
 * 与客户端 SEO.tsx 对齐：过滤掉缺 question/answer 的无效项，全部有效才返回节点，
 * 避免空 FAQ 被序列化成一个空 @graph 条目。FAQs 是「问题+答案」的可复用结构，
 * 四个内容类型（新闻/博客/评测/攻略）共用此逻辑。
 */
function buildFaqNode(faq: Array<{ question: string; answer: string }> | undefined): Record<string, unknown> | null {
  const items = Array.isArray(faq) ? faq.filter((f) => f && f.question && f.answer) : []
  if (items.length === 0) return null
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      // 清理正文 markdown 标题标记（如 "### 问题" → "问题"），避免泄漏进结构化数据
      name: f.question.replace(/^\s*#{1,6}\s*/, '').trim(),
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }
}

/**
 * 生成 JSON-LD author 节点
 *
 * 占位/技术用户名（admin 等）并非真实作者实体，回退为组织名，
 * 避免把 "admin" 之类污染 author 字段（Google 要求 author 为真实 Person/Organization）。
 */
function buildAuthorNode(name: string | undefined): Record<string, unknown> {
  const a = (name || '').trim()
  if (!a || /^(admin|administrator|gamehub team|gghubs team)$/i.test(a)) {
    return { '@type': 'Organization', name: SITE_NAME }
  }
  return { '@type': 'Person', name: a }
}

/**
 * 判断「去掉语言前缀后的路径」是否为已知路由（与 App.tsx 路由表对齐）。
 *
 * 用于软 404 检测：未匹配任何路由的路径（如 /en/nonexistent-page）当前会返回 200 +
 * index,follow 的空壳页，导致搜索引擎大量收录垃圾页。此函数让 render() 能识别
 * 这些路径并返回真 404 + noindex。
 *
 * @param path - 去掉语言前缀后的路径（含前导斜杠，如 /games/elden-ring、/about）
 */
function isKnownRoute(path: string): boolean {
  const p = path.replace(/^\/+|\/+$/g, '')
  if (p === '') return true // 首页

  const staticRoutes = new Set([
    'games', 'news', 'guides', 'blog', 'community', 'community-forum',
    'search', 'discovery', 'trending', 'cozy-games', 'free-games', 'ai-gaming',
    'leaderboard', 'ai', 'ai/soul', 'ai/npc', 'ai/companion',
    'about', 'about/careers', 'about/press', 'about/contact',
    'print', 'my', 'login', 'register', 'profile',
    'forgot-password', 'reset-password', 'verify-email',
    'notifications', 'messages', 'achievements',
    'library', 'library/online', 'library/mine',
    'legal/privacy', 'legal/terms', 'legal/cookies', 'legal/conduct',
    'privacy', 'terms', 'cookies', 'conduct', 'reviews',
  ])
  if (staticRoutes.has(p)) return true

  const dynamicPatterns = [
    /^games\/category\/[^/]+$/,
    /^games\/[^/]+$/,
    /^games\/[^/]+\/forum$/,
    /^game\/[^/]+$/,
    /^news\/category\/[^/]+$/,
    /^news\/[^/]+$/,
    /^guides\/[^/]+$/,
    /^blog\/[^/]+$/,
    /^blog\/space\/[^/]+$/,
    /^blog\/space\/[^/]+\/category\/[^/]+$/,
    /^blog\/new$/,
    /^blog\/edit\/[^/]+$/,
    /^blog\/my$/,
    /^community\/posts\/[^/]+$/,
    /^community\/posts\/new$/,
    /^community\/reviews\/new$/,
    /^community\/reviews\/[^/]+$/,
    /^reviews\/[^/]+$/,
    /^library\/play\/[^/]+$/,
    /^messages\/[^/]+$/,
    /^achievements\/[^/]+$/,
  ]
  return dynamicPatterns.some((re) => re.test(p))
}

/**
 * 根据页面类型生成 JSON-LD 结构化数据（Schema.org @graph）
 *
 * 覆盖六类富结果资格（与客户端 SEO.tsx / SEOBreadcrumb.tsx 对齐）：
 * 1. WebSite —— 站点 + 站内搜索（全站）
 * 2. Organization —— 组织信息（全站）
 * 3. ItemList —— 游戏列表（首页/游戏库，强化内链与收录）
 * 4. VideoGame —— 游戏详情（富结果：评分、平台、发行商）
 * 5. NewsArticle —— 新闻/资讯详情（富结果：作者、发布时间）
 * 6. BreadcrumbList —— 面包屑导航（详情页）
 *
 * 由 render() 在服务端直接注入 HTML，确保爬虫无需执行 JS 即可读到结构化数据。
 */
function buildJsonLdGraph(opts: {
  pageMeta: { title: string; description: string }
  urlPathname: string
  canonicalUrl: string
  games: Game[] | undefined
  news: NewsArticle[] | undefined
  gameDetail: Game | null
  newsDetail: NewsArticle | null
  blogDetail: BlogArticle | null
  reviewDetail: Review | null
  guideDetail: Guide | null
}): Array<Record<string, unknown>> {
  const { pageMeta, urlPathname, canonicalUrl, games, news, gameDetail, newsDetail, blogDetail, reviewDetail, guideDetail } = opts
  const graph: Array<Record<string, unknown>> = []

  const langPrefix = urlPathname.match(/^\/(en|cn|ja|ko|es|fr)(?=\/|$)/)?.[1] || 'en'

  // WebSite 结构化数据应使用站点级描述，而非页面级描述。
  // 此前 pageMeta.description 会在游戏/新闻详情页被改写，导致站点描述被污染（P0 #2 修复）。
  const langCode = LANG_CODE_TO_I18N[langPrefix] || 'en'
  const siteDescription = i18n.getFixedT(langCode)('seo.defaultDescription')

  // 1. WebSite
  graph.push({
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: siteDescription,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  })

  // 2. Organization
  graph.push({
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: LOGO_IMAGE,
    sameAs: [
      'https://x.com/gghubsgame',
    ],
  })

  // 3. ItemList —— 首页/游戏库列出可抓取的游戏条目
  const gameList = Array.isArray(games) ? games : []
  if (gameList.length > 0) {
    graph.push({
      '@type': 'ItemList',
      name: 'GameHub Games',
      numberOfItems: gameList.length,
      itemListElement: gameList.map((g, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: g.title,
        url: `${SITE_URL}/${langPrefix}/games/${g.slug || g.id}`,
      })),
    })
  }

  // 4. VideoGame —— 游戏详情富结果
  if (gameDetail) {
    const node: Record<string, unknown> = {
      '@type': 'VideoGame',
      name: gameDetail.title,
      description: gameDetail.description,
      url: canonicalUrl,
      applicationCategory: 'Game',
    }
    if (gameDetail.imageUrl) node.image = absUrl(gameDetail.imageUrl)
    if (Array.isArray(gameDetail.genres) && gameDetail.genres.length) node.genre = gameDetail.genres
    if (Array.isArray(gameDetail.platforms) && gameDetail.platforms.length) {
      node.gamePlatform = gameDetail.platforms
      node.operatingSystem = gameDetail.platforms
    }
    if (gameDetail.developer) node.author = { '@type': 'Organization', name: gameDetail.developer }
    if (gameDetail.publisher) node.publisher = { '@type': 'Organization', name: gameDetail.publisher }
    if (gameDetail.releaseDate) node.datePublished = gameDetail.releaseDate
    if (typeof gameDetail.rating === 'number') {
      node.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: gameDetail.rating,
        ratingCount: (gameDetail as any).reviewCount || 0,
        bestRating: 5,
        worstRating: 1,
      }
    }
    graph.push(node)
  }

  // 5. NewsArticle —— 新闻/资讯详情富结果
  if (newsDetail) {
    const node: Record<string, unknown> = {
      '@type': 'NewsArticle',
      headline: newsDetail.title,
      description: newsDetail.summary || newsDetail.content || '',
      url: canonicalUrl,
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
      datePublished: newsDetail.publishDate,
      dateModified: newsDetail.updatedAt || newsDetail.publishDate,
      wordCount: (newsDetail.content || '').split(/\s+/).filter(Boolean).length,
      author: buildAuthorNode(newsDetail.author),
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        logo: { '@type': 'ImageObject', url: LOGO_IMAGE },
      },
    }
    if (newsDetail.imageUrl) node.image = absUrl(newsDetail.imageUrl)
    graph.push(node)
    // 新闻 FAQPage（用户手填的常见问题，爬虫直接索引）
    const faqNode = buildFaqNode(newsDetail.faq)
    if (faqNode) graph.push(faqNode)
  }

  // 5b. Article —— 博客详情富结果（博客内容类型：blog/review/guide 中 postType=blog）
  if (blogDetail) {
    const node: Record<string, unknown> = {
      '@type': 'Article',
      headline: blogDetail.title,
      description: blogDetail.excerpt || blogDetail.content || '',
      url: canonicalUrl,
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
      datePublished: blogDetail.publishDate,
      wordCount: (blogDetail.content || '').split(/\s+/).filter(Boolean).length,
      author: buildAuthorNode(blogDetail.author),
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        logo: { '@type': 'ImageObject', url: LOGO_IMAGE },
      },
    }
    if (blogDetail.coverImage) node.image = absUrl(blogDetail.coverImage)
    graph.push(node)
    const faqNode = buildFaqNode(blogDetail.faq)
    if (faqNode) graph.push(faqNode)
  }

  // 5c. Review —— 评测详情富结果
  if (reviewDetail) {
    const node: Record<string, unknown> = {
      '@type': 'Review',
      name: reviewDetail.title,
      reviewBody: reviewDetail.content || '',
      url: canonicalUrl,
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
      datePublished: reviewDetail.publishDate,
      author: buildAuthorNode(reviewDetail.author),
      itemReviewed: { '@type': 'VideoGame', name: reviewDetail.gameTitle || '' },
    }
    if (typeof reviewDetail.rating === 'number') {
      node.reviewRating = { '@type': 'Rating', ratingValue: reviewDetail.rating, bestRating: 5, worstRating: 1 }
    }
    graph.push(node)
    const faqNode = buildFaqNode(reviewDetail.faq)
    if (faqNode) graph.push(faqNode)
  }

  // 5d. HowTo —— 攻略详情富结果
  if (guideDetail) {
    graph.push({
      '@type': 'HowTo',
      name: guideDetail.title,
      description: guideDetail.summary || guideDetail.content || '',
      url: canonicalUrl,
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
    })
    const faqNode = buildFaqNode(guideDetail.faq)
    if (faqNode) graph.push(faqNode)
  }

  // 6. BreadcrumbList —— 详情页面包屑
  if (gameDetail || newsDetail || blogDetail || reviewDetail || guideDetail) {
    const items: Array<{ name: string; url: string }> = [{ name: 'Home', url: `${SITE_URL}/${langPrefix}` }]
    if (gameDetail) {
      items.push({ name: 'Games', url: `${SITE_URL}/${langPrefix}/games` })
      items.push({ name: gameDetail.title, url: canonicalUrl })
    } else if (newsDetail) {
      items.push({ name: 'News', url: `${SITE_URL}/${langPrefix}/news` })
      items.push({ name: newsDetail.title, url: canonicalUrl })
    } else if (blogDetail) {
      items.push({ name: 'Blog', url: `${SITE_URL}/${langPrefix}/blog` })
      items.push({ name: blogDetail.title, url: canonicalUrl })
    } else if (reviewDetail) {
      items.push({ name: 'Reviews', url: `${SITE_URL}/${langPrefix}/community/reviews` })
      items.push({ name: reviewDetail.title, url: canonicalUrl })
    } else if (guideDetail) {
      items.push({ name: 'Guides', url: `${SITE_URL}/${langPrefix}/guides` })
      items.push({ name: guideDetail.title, url: canonicalUrl })
    }
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: items.map((it, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: it.name,
        item: it.url,
      })),
    })
  }

  return graph
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
async function prefetchData(queryClient: QueryClient, urlPathname: string, lang: string) {
  // 去除语言前缀后的裸路径（用于区分栏目/列表页与详情页）
  const barePath = urlPathname.replace(/^\/(en|cn|ja|ko|es|fr)(?=\/|$)/, '').replace(/^\/+|\/+$/g, '')
  const listLimit = 24
  // 仅首页（/、/en、/en/、/cn、/cn/ 等）触发首页预取；避免 /en/blog/89 等子路径误命中
  if (urlPathname === '/' || /^\/(en|cn|ja|ko|es|fr)\/?$/.test(urlPathname)) {
    console.log('预取首页数据:', urlPathname)
    // 首页实际渲染的板块数据，queryKey 必须与客户端 hook 严格一致，
    // 这样 SSR 脱水的缓存才能在 hydration 时命中，客户端 0 次冗余请求。
    // 并行预取，避免串行 await 拖慢首屏 TTFB。
    const homePrefetches = [
      { queryKey: queryKeys.games.list({ page: 1, limit: 8 }), queryFn: () => apiService.getGames({ page: 1, limit: 8 }) },
      { queryKey: queryKeys.news.list({ page: 1, limit: 4, lang }), queryFn: () => apiService.getNews({ page: 1, limit: 4, lang }) },
      { queryKey: queryKeys.blog.list({ page: 1, limit: 4, lang }), queryFn: () => apiService.getBlogPosts({ page: 1, limit: 4, lang }) },
      { queryKey: queryKeys.guides.list({ page: 1, limit: 4, lang }), queryFn: () => apiService.getGuides({ page: 1, limit: 4, lang }) },
      { queryKey: queryKeys.community.list({ page: 1, limit: 6 }), queryFn: () => apiService.getCommunityPosts({ page: 1, limit: 6 }) },
      { queryKey: ['banners', 'home'], queryFn: () => apiService.getBanners('home') },
      { queryKey: ['discovery', 'trending', 10], queryFn: () => apiService.getTrendingContent(10) },
      { queryKey: ['redeem', 'codes'], queryFn: () => apiService.getRedeemCodes() },
    ]
    const results = await Promise.allSettled(
      homePrefetches.map((p) => queryClient.prefetchQuery({ queryKey: p.queryKey, queryFn: p.queryFn }))
    )
    const failed = results.filter((r) => r.status === 'rejected').length
    if (failed > 0) {
      console.warn('首页数据预取部分失败:', failed, '个')
    } else {
      console.log('首页数据预取完成')
    }
  } else if (barePath === 'games' || barePath === 'news' || barePath === 'guides' || barePath === 'blog') {
    // 栏目/列表页预取（P0 #3：让 /games、/news、/guides、/blog 列表页 SSR 渲染内容，而非空壳）
    console.log('预取栏目页数据:', barePath)
    try {
      if (barePath === 'games') {
        await queryClient.prefetchQuery({
          queryKey: queryKeys.games.list({ page: 1, limit: listLimit }),
          queryFn: () => apiService.getGames({ page: 1, limit: listLimit }),
        })
      } else if (barePath === 'news') {
        await queryClient.prefetchQuery({
          queryKey: queryKeys.news.listAll(lang),
          queryFn: () => apiService.getAllNews({ lang }),
        })
      } else if (barePath === 'guides') {
        await queryClient.prefetchQuery({
          queryKey: queryKeys.guides.list({ page: 1, limit: listLimit, lang }),
          queryFn: () => apiService.getGuides({ page: 1, limit: listLimit, lang }),
        })
      } else if (barePath === 'blog') {
        await queryClient.prefetchQuery({
          queryKey: queryKeys.blog.list({ page: 1, limit: listLimit, lang }),
          queryFn: () => apiService.getBlogPosts({ page: 1, limit: listLimit, lang }),
        })
      }
      console.log('栏目页数据预取完成:', barePath)
    } catch (apiError) {
      console.warn('栏目页API预取失败:', apiError)
    }
  } else if (barePath === 'community') {
    // 社区页预取（P1-3：/reviews 已 301 到 /community，评测列表+帖子列表都在此页渲染，
    // 需预取帖子/评测/热门游戏三项，queryKey 与客户端 hook 严格一致才能 hydration 命中）
    console.log('预取社区页数据:', barePath)
    try {
      await Promise.allSettled([
        queryClient.prefetchQuery({
          queryKey: queryKeys.community.list(undefined),
          queryFn: () => apiService.getCommunityPosts(undefined),
        }),
        queryClient.prefetchQuery({
          queryKey: queryKeys.reviews.list({ lang }),
          queryFn: () => apiService.getReviews({ lang }),
        }),
        queryClient.prefetchQuery({
          queryKey: queryKeys.games.list({ limit: 50 }),
          queryFn: () => apiService.getGames({ limit: 50 }),
        }),
      ])
      console.log('社区页数据预取完成')
    } catch (apiError) {
      console.warn('社区页API预取失败:', apiError)
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
          queryKey: [...queryKeys.news.details(), match[1], lang],
          queryFn: () => apiService.getNewsArticle(match[1], lang)
        })
      } catch (apiError) {
        console.warn('新闻详情API预取失败:', apiError)
      }
    }
  } else if (urlPathname.includes('/blog/')) {
    // 博客详情：排除 space/new/edit/my 等子路由，避免误命中
    const match = urlPathname.match(/\/blog\/([^\/]+)/)
    if (match && !['space', 'new', 'edit', 'my'].includes(match[1])) {
      try {
        await queryClient.prefetchQuery({
          queryKey: [...queryKeys.blog.details(), match[1], lang],
          queryFn: () => apiService.getBlogPost(match[1], lang)
        })
      } catch (apiError) {
        console.warn('博客详情API预取失败:', apiError)
      }
    }
  } else if (urlPathname.includes('/community/reviews/')) {
    // 评测详情：排除 /community/reviews/new 子路由
    const match = urlPathname.match(/\/community\/reviews\/([^\/]+)/)
    if (match && match[1] !== 'new') {
      try {
        await queryClient.prefetchQuery({
          queryKey: [...queryKeys.reviews.detail(match[1]), lang],
          queryFn: () => apiService.getReview(match[1], lang)
        })
      } catch (apiError) {
        console.warn('评测详情API预取失败:', apiError)
      }
    }
  } else if (urlPathname.includes('/guides/')) {
    // 攻略详情
    const match = urlPathname.match(/\/guides\/([^\/]+)/)
    if (match) {
      try {
        await queryClient.prefetchQuery({
          queryKey: [...queryKeys.guides.detail(match[1]), lang],
          queryFn: () => apiService.getGuide(match[1], lang)
        })
      } catch (apiError) {
        console.warn('攻略详情API预取失败:', apiError)
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

  await prefetchData(serverQueryClient, urlPathname, i18nLang)
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
  let canonicalUrl = pathWithoutLang === '/'
    ? `${SITE_URL}/${langPrefix}`
    : `${SITE_URL}/${langPrefix}${pathWithoutLang}`
  let alternateLinks = HREFLANG_LANGS.map(
    (l) => `<link rel="alternate" hreflang="${l.code}" href="${SITE_URL}/${l.prefix}${pathWithoutLang === '/' ? '' : pathWithoutLang}" />`
  ).join('\n    ')
  // og:locale（与 SEO.tsx 的 LOCALE_MAP 保持一致）
  const ogLocale = LOCALE_MAP[i18nLang] || 'en_US'
  // 多语言门禁：当页面正文实为中文回退（未翻译）时置 true，渲染 noindex
  let shouldNoindex = false

  const clientScript = isProduction
    ? '<!-- SSR_CLIENT_SCRIPTS_PLACEHOLDER -->'
    : '<script type="module" src="/@vite/client"><\/script>'

  // 渲染正文：读取预取数据，renderToString 成静态 HTML 注入 #root（SEO，让爬虫看到真实内容）
  const games = serverQueryClient.getQueryData<Game[]>(
    queryKeys.games.list({ page: 1, limit: 8 }),
  )
  const news = serverQueryClient.getQueryData<NewsArticle[]>(
    queryKeys.news.list({ page: 1, limit: 4, lang: i18nLang }),
  )
  // 首页轮播 banner（P1-4：让 SSR HTML 输出 hero 大图，而非 0 图片）
  const banners = serverQueryClient.getQueryData<any[]>(['banners', 'home'])

  let gameDetail: Game | null = null
  const gameIdMatch = urlPathname.match(/\/games\/([^/]+)/)
  if (gameIdMatch) {
    gameDetail = serverQueryClient.getQueryData<Game>(queryKeys.games.detail(gameIdMatch[1])) ?? null
  }

  // 游戏详情页 canonical/hreflang 归一为 slug（旧 /games/<id> 链接也指向 /games/<slug>，避免重复收录）
  if (gameDetail?.slug) {
    const gamePath = `/games/${gameDetail.slug}`
    canonicalUrl = `${SITE_URL}/${langPrefix}${gamePath}`
    alternateLinks = HREFLANG_LANGS.map(
      (l) => `<link rel="alternate" hreflang="${l.code}" href="${SITE_URL}/${l.prefix}${gamePath}" />`
    ).join('\n    ')
  }

  let newsDetail: NewsArticle | null = null
  const newsIdMatch = urlPathname.match(/\/news\/([^/]+)/)
  if (newsIdMatch) {
    newsDetail = serverQueryClient.getQueryData<NewsArticle>([...queryKeys.news.details(), newsIdMatch[1], i18nLang]) ?? null
  }

  // 新闻详情页 canonical/hreflang 归一为 slug（旧 /news/<id> 链接也指向 /news/<slug>，避免重复收录）
  // 多语言门禁：base 列恒为中文，翻译列缺失的语言实为中文回退，声明伪 lang 会违反 hreflang。
  // 未翻译语言 noindex，且 hreflang 只保留正文真实翻译过的语言。
  if (newsDetail) {
    const newsPath = `/news/${newsDetail.slug || newsDetail.id}`
    if (newsDetail.slug) {
      canonicalUrl = `${SITE_URL}/${langPrefix}${newsPath}`
    }
    const availableNewsLangs = new Set<string>(['cn'])
    for (const l of ['en', 'ja', 'ko', 'es', 'fr'] as const) {
      const tr = newsDetail.translations?.[l]
      if (tr && (tr.content || tr.contentHtml)) availableNewsLangs.add(l)
    }
    if (!availableNewsLangs.has(langPrefix)) shouldNoindex = true
    alternateLinks = HREFLANG_LANGS
      .filter((l) => availableNewsLangs.has(l.prefix))
      .map((l) => `<link rel="alternate" hreflang="${l.code}" href="${SITE_URL}/${l.prefix}${newsPath}" />`)
      .join('\n    ')
  }

  let blogDetail: BlogArticle | null = null
  const blogIdMatch = urlPathname.match(/\/blog\/([^/]+)/)
  if (blogIdMatch && !['space', 'new', 'edit', 'my'].includes(blogIdMatch[1])) {
    blogDetail = serverQueryClient.getQueryData<BlogArticle>([...queryKeys.blog.details(), blogIdMatch[1], i18nLang]) ?? null
  }

  let reviewDetail: Review | null = null
  const reviewIdMatch = urlPathname.match(/\/community\/reviews\/([^/]+)/)
  if (reviewIdMatch && reviewIdMatch[1] !== 'new') {
    reviewDetail = serverQueryClient.getQueryData<Review>([...queryKeys.reviews.detail(reviewIdMatch[1]), i18nLang]) ?? null
  }

  let guideDetail: Guide | null = null
  const guideIdMatch = urlPathname.match(/\/guides\/([^/]+)/)
  if (guideIdMatch) {
    guideDetail = serverQueryClient.getQueryData<Guide>([...queryKeys.guides.detail(guideIdMatch[1]), i18nLang]) ?? null
  }

  // 栏目/列表页数据（P0 #3）：读取预取数据，构造统一列表项传给 ServerContent 渲染
  const listBarePath = urlPathname.replace(/^\/(en|cn|ja|ko|es|fr)(?=\/|$)/, '').replace(/^\/+|\/+$/g, '')
  const LIST_LIMIT = 24
  // P1-4：列表项携带 image/description，让 SSR HTML 输出真实 <img> 与摘要（修复「列表页/首页 0 图片」）
  let listPage: { kind: string; items: Array<{ id: string | number; title: string; url: string; image?: string; description?: string }> } | null = null
  if (listBarePath === 'games') {
    const list = serverQueryClient.getQueryData<Game[]>(queryKeys.games.list({ page: 1, limit: LIST_LIMIT }))
    if (list) listPage = { kind: 'games', items: list.map((g) => ({ id: g.id, title: g.title, url: `/${langPrefix}/games/${g.slug || g.id}`, image: g.imageUrl ? absUrl(g.imageUrl) : '', description: g.description })) }
  } else if (listBarePath === 'news') {
    const list = serverQueryClient.getQueryData<NewsArticle[]>(queryKeys.news.listAll(i18nLang))
    if (list) listPage = { kind: 'news', items: list.map((n) => ({ id: n.id, title: n.title, url: `/${langPrefix}/news/${n.slug || n.id}`, image: n.imageUrl ? absUrl(n.imageUrl) : '', description: n.summary })) }
  } else if (listBarePath === 'guides') {
    const list = serverQueryClient.getQueryData<Guide[]>(queryKeys.guides.list({ page: 1, limit: LIST_LIMIT, lang: i18nLang }))
    if (list) listPage = { kind: 'guides', items: list.map((g) => ({ id: g.id, title: g.title, url: `/${langPrefix}/guides/${g.id}`, image: g.coverImageUrl ? absUrl(g.coverImageUrl) : '', description: g.summary })) }
  } else if (listBarePath === 'blog') {
    const list = serverQueryClient.getQueryData<BlogArticle[]>(queryKeys.blog.list({ page: 1, limit: LIST_LIMIT, lang: i18nLang }))
    if (list) listPage = { kind: 'blog', items: list.map((b) => ({ id: b.id, title: b.title, url: `/${langPrefix}/blog/${b.slug}`, image: b.coverImage ? absUrl(b.coverImage) : '', description: b.excerpt })) }
  }

  // 社区页（P1-3：/reviews 已 301 到 /community，评测+帖子列表都在此页渲染，需 SSR 输出真实内容）
  type ListItem = { id: string | number; title: string; url: string; image?: string; description?: string }
  let communityPage: { posts: ListItem[]; reviews: ListItem[] } | null = null
  if (listBarePath === 'community') {
    const cposts = serverQueryClient.getQueryData<CommunityPost[]>(queryKeys.community.list(undefined))
    const creviews = serverQueryClient.getQueryData<Review[]>(queryKeys.reviews.list({ lang: i18nLang }))
    if (cposts || creviews) {
      communityPage = {
        posts: (cposts || []).map((p) => ({ id: p.id, title: p.title, url: `/${langPrefix}/community/posts/${p.id}`, description: p.content?.slice(0, 200) })),
        reviews: (creviews || []).map((r) => ({ id: r.id, title: r.title, url: `/${langPrefix}/community/reviews/${r.id}`, description: r.content?.slice(0, 200) })),
      }
    }
  }

  // 文章页 og:image/twitter:image 用文章自有配图（缺省回退站点通用图）
  let pageImage = OG_IMAGE
  if (gameDetail?.imageUrl) pageImage = absUrl(gameDetail.imageUrl)
  else if (newsDetail?.imageUrl) pageImage = absUrl(newsDetail.imageUrl)
  else if (blogDetail?.coverImage) pageImage = absUrl(blogDetail.coverImage)
  else if (guideDetail?.coverImageUrl) pageImage = absUrl(guideDetail.coverImageUrl)

  // 软 404 检测：详情路由但内容不存在（API 404 → 详情为 null），或路径不是已知路由，
  // 都返回真 404 + noindex，避免空壳/垃圾页被搜索引擎收录（P1-1）。
  const detailKind = (() => {
    const p = pathWithoutLang.replace(/^\/+|\/+$/g, '')
    if (/^games\/[^/]+$/.test(p) && !/^games\/category\//.test(p)) return 'game'
    if (/^news\/[^/]+$/.test(p) && !/^news\/category\//.test(p)) return 'news'
    if (/^guides\/[^/]+$/.test(p)) return 'guide'
    if (/^blog\/[^/]+$/.test(p) && !/^blog\/(space|new|edit|my)\b/.test(p)) return 'blog'
    if (/^community\/reviews\/[^/]+$/.test(p) && !/^community\/reviews\/new$/.test(p)) return 'review'
    return null
  })()
  let notFound = false
  if (detailKind === 'game') notFound = !gameDetail
  else if (detailKind === 'news') notFound = !newsDetail
  else if (detailKind === 'guide') notFound = !guideDetail
  else if (detailKind === 'blog') notFound = !blogDetail
  else if (detailKind === 'review') notFound = !reviewDetail
  else if (!isKnownRoute(pathWithoutLang)) notFound = true
  if (notFound) shouldNoindex = true

  // 每页独立 title/description：详情页用真实内容标题，而非 slug 占位（SEO 收录基建）
  const truncate = (s: string, max = 160) => (s.length > max ? `${s.slice(0, max - 3)}...` : s)
  if (gameDetail?.title) {
    // title 追加品牌后缀（修复「title 无关键词扩展」），并让 H1 与 H2（游戏名）不再完全相同
    pageMeta.title = `${gameDetail.title} | ${SITE_NAME}`
    pageMeta.ogTitle = pageMeta.title
    if (gameDetail.description?.trim()) {
      let desc = gameDetail.description.trim()
      // P1：详情页 desc 过短（实测仅 28 字，应 120-160），追加类型/平台/厂商等关键词扩展
      if (desc.length < 120) {
        const extras: string[] = []
        if (Array.isArray(gameDetail.genres) && gameDetail.genres.length) extras.push(gameDetail.genres.join(', '))
        if (Array.isArray(gameDetail.platforms) && gameDetail.platforms.length) extras.push(gameDetail.platforms.join(', '))
        if (gameDetail.developer) extras.push(gameDetail.developer)
        if (extras.length) desc = `${desc} — ${extras.join(' · ')}`
        desc = `${desc}. Read reviews and ratings for ${gameDetail.title} on GameHub.`
      }
      pageMeta.description = truncate(desc)
      pageMeta.ogDescription = pageMeta.description
    }
  } else if (newsDetail?.title) {
    pageMeta.title = newsDetail.title
    pageMeta.ogTitle = newsDetail.title
    const desc = (newsDetail.summary || newsDetail.content)?.trim()
    if (desc) {
      pageMeta.description = truncate(desc)
      pageMeta.ogDescription = pageMeta.description
    }
  } else if (blogDetail?.title) {
    pageMeta.title = `${blogDetail.title} | ${SITE_NAME}`
    pageMeta.ogTitle = pageMeta.title
    const desc = (blogDetail.excerpt || blogDetail.content)?.trim()
    if (desc) {
      pageMeta.description = truncate(desc)
      pageMeta.ogDescription = pageMeta.description
    }
  } else if (reviewDetail?.title) {
    pageMeta.title = `${reviewDetail.title} | ${SITE_NAME}`
    pageMeta.ogTitle = pageMeta.title
    const desc = reviewDetail.content?.trim()
    if (desc) {
      pageMeta.description = truncate(desc)
      pageMeta.ogDescription = pageMeta.description
    }
  } else if (guideDetail?.title) {
    pageMeta.title = `${guideDetail.title} | ${SITE_NAME}`
    pageMeta.ogTitle = pageMeta.title
    const desc = (guideDetail.summary || guideDetail.content)?.trim()
    if (desc) {
      pageMeta.description = truncate(desc)
      pageMeta.ogDescription = pageMeta.description
    }
  }

  // 生成六类 JSON-LD 结构化数据（服务端直接注入，爬虫无需执行 JS）
  const jsonLdScript = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': buildJsonLdGraph({
      pageMeta,
      urlPathname,
      canonicalUrl,
      games,
      news,
      gameDetail,
      newsDetail,
      blogDetail,
      reviewDetail,
      guideDetail,
    }),
  }).replace(/</g, '\\u003c')

  const bodyHtml = renderToString(
    <ServerContent
      urlPathname={urlPathname}
      pageMeta={pageMeta}
      games={games}
      news={news}
      banners={banners}
      gameDetail={gameDetail}
      newsDetail={newsDetail}
      blogDetail={blogDetail}
      reviewDetail={reviewDetail}
      guideDetail={guideDetail}
      listPage={listPage}
      communityPage={communityPage}
    />,
  )

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
    <meta name="robots" content="${shouldNoindex ? 'noindex, nofollow' : 'index, follow'}" />
    <meta name="googlebot" content="${shouldNoindex ? 'noindex, nofollow' : 'index, follow'}" />
    <link rel="canonical" href="${canonicalUrl}" />
    ${alternateLinks}
    <link rel="alternate" hreflang="x-default" href="${canonicalUrl}" />
    <meta property="og:title" content="${pageMeta.ogTitle}" />
    <meta property="og:description" content="${pageMeta.ogDescription}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="${pageImage}" />
    <meta property="og:image:alt" content="${pageMeta.title}" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:locale" content="${ogLocale}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${canonicalUrl}" />
    <meta name="twitter:title" content="${pageMeta.title}" />
    <meta name="twitter:description" content="${pageMeta.description}" />
    <meta name="twitter:image" content="${pageImage}" />
    <meta name="twitter:site" content="${TWITTER_HANDLE}" />
    <meta name="twitter:creator" content="${TWITTER_HANDLE}" />
    <script type="application/ld+json">${jsonLdScript}</script>
    <script>try{var t=localStorage.getItem('app-theme');document.documentElement.setAttribute('data-theme',t==='dark'||t==='light'?t:'light')}catch(e){}</script>
  </head>
  <body>
    <div id="root">${bodyHtml}</div>
    <script id="vike_pageContext" type="application/json">${pageContextSerialized}<\/script>
    <script>try{localStorage.setItem('i18nextLng', ${JSON.stringify(i18nLang)});}catch(e){}</script>
    ${clientScript}
    <script>
      window.__DEHYDRATED_STATE__ = ${JSON.stringify(dehydratedState).replace(/</g, "\\u003c")}
    <\/script>
    <noscript>
      <div style="padding:24px;font-family:system-ui,-apple-system,sans-serif;text-align:center;color:#333">
        <h1>${pageMeta.title}</h1>
        <p>${pageMeta.description}</p>
        <p>GameHub requires JavaScript to display interactive content. Please enable JavaScript in your browser.</p>
      </div>
    </noscript>
  </body>
</html>`,
    statusCode: notFound ? 404 : 200,
    }
  } catch (err) {
    console.error('[SSR-RENDER] render() failed:', err instanceof Error ? err.message : err)
    throw err
  }
}
