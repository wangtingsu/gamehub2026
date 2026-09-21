/**
 * 服务端渲染（SSR）专用正文内容组件
 *
 * 在 _default.page.server.tsx 的 render() 中被 renderToString 渲染成静态 HTML，
 * 注入到 <div id="root">，使搜索引擎爬虫在原始 HTML 中直接看到正文
 * （页面标题、描述、游戏/资讯/评测列表，以及详情页正文）。
 *
 * 刻意保持 SSR 安全：
 * - 纯函数组件，只消费 props：不依赖路由上下文（useParams/Link）、
 *   不依赖 React Query（useQuery）、不依赖浏览器 API（window/localStorage）。
 * - 内部链接使用原生 <a href>，便于爬虫抓取，也避免引入 StaticRouter。
 * - 客户端 hydration 阶段由 createRoot 全量接管替换，此处仅服务爬虫。
 * - 根节点带 hidden 属性：对真实用户视觉隐藏（避免无样式正文在 JS 加载前闪屏，
 *   表现为「先显示一段新闻稿」），但文本仍在 HTML 源码中，爬虫照常读取。
 */
import type { Game, NewsArticle, Review, Guide, BlogArticle } from '../api/types'
import ReactMarkdown from 'react-markdown'

const SITE_URL = 'https://www.gghubs.com'

/** 相对 URL → 绝对 URL（供 <img src> 与爬虫友好，缺省/非法返回空串） */
function absUrl(url?: string): string {
  if (!url) return ''
  if (/^https?:\/\//.test(url)) return url
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

interface PageMeta {
  title: string
  description: string
}

interface ListItem {
  id: string | number
  title: string
  url: string
  image?: string
  description?: string
}

interface ServerContentProps {
  urlPathname: string
  pageMeta: PageMeta
  games?: Game[]
  news?: NewsArticle[]
  banners?: Array<{ id?: number | string; title?: string; image_url?: string }>
  reviews?: Review[]
  gameDetail?: Game | null
  newsDetail?: NewsArticle | null
  blogDetail?: BlogArticle | null
  reviewDetail?: Review | null
  guideDetail?: Guide | null
  /** 栏目/列表页预取数据（P0 #3：让列表页 SSR 渲染内容而非空壳；P1-4：含 image/description） */
  listPage?: { kind: string; items: ListItem[] } | null
  /** 社区页预取数据（P1-3：/reviews 301 到 /community，帖子+评测列表 SSR 渲染） */
  communityPage?: { posts: ListItem[]; reviews: ListItem[] } | null
}

/** 从 URL 提取语言前缀，用于生成内部链接（无前缀默认 en） */
function getLangPrefix(urlPathname: string): string {
  const m = urlPathname.match(/^\/(en|cn|ja|ko|es|fr)(?=\/|$)/)
  return m ? m[1] : 'en'
}

/** 带封面图的列表项渲染（P1-4：让 SSR HTML 输出真实 <img>，修复「列表页/首页 0 图片」） */
function renderItem(it: ListItem) {
  return (
    <li key={it.id}>
      <a href={it.url}>
        {it.image ? <img src={it.image} alt={it.title} loading="lazy" decoding="async" /> : null}
        <span>{it.title}</span>
      </a>
      {it.description ? <p>{it.description}</p> : null}
    </li>
  )
}

export default function ServerContent({
  urlPathname,
  pageMeta,
  games,
  news,
  banners,
  reviews,
  gameDetail,
  newsDetail,
  blogDetail,
  reviewDetail,
  guideDetail,
  listPage,
  communityPage,
}: ServerContentProps) {
  const lang = getLangPrefix(urlPathname)
  const isHome = urlPathname === '/' || /^\/(en|cn|ja|ko|es|fr)\/?$/.test(urlPathname)
  const gameMatch = urlPathname.match(/\/games\/([^/]+)/)
  const newsMatch = urlPathname.match(/\/news\/([^/]+)/)
  const blogMatch = urlPathname.match(/\/blog\/([^/]+)/)
  const reviewMatch = urlPathname.match(/\/community\/reviews\/([^/]+)/)
  const guideMatch = urlPathname.match(/\/guides\/([^/]+)/)

  const gameList = Array.isArray(games) ? games : []
  const newsList = Array.isArray(news) ? news : []
  const reviewList = Array.isArray(reviews) ? reviews : []

  return (
    <div hidden>
      <h1>{pageMeta.title}</h1>
      <p>{pageMeta.description}</p>

      {isHome && (
        <>
          {Array.isArray(banners) && banners.length > 0 && (
            <div>
              {banners.filter((b) => b?.image_url).map((b, i) => (
                <img key={b.id ?? i} src={absUrl(b.image_url)} alt={b.title || pageMeta.title} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" />
              ))}
            </div>
          )}
          {gameList.length > 0 && (
            <ul>
              {gameList.map((g) => (
                <li key={g.id}>
                  <a href={`/${lang}/games/${g.slug || g.id}`}>
                    {g.imageUrl ? <img src={absUrl(g.imageUrl)} alt={g.title} loading="lazy" decoding="async" /> : null}
                    <span>{g.title}</span>
                  </a>
                  {g.description ? <p>{g.description}</p> : null}
                </li>
              ))}
            </ul>
          )}
          {newsList.length > 0 && (
            <ul>
              {newsList.map((n) => (
                <li key={n.id}>
                  <a href={`/${lang}/news/${n.slug || n.id}`}>
                    {n.imageUrl ? <img src={absUrl(n.imageUrl)} alt={n.title} loading="lazy" decoding="async" /> : null}
                    <span>{n.title}</span>
                  </a>
                  {n.summary ? <p>{n.summary}</p> : null}
                </li>
              ))}
            </ul>
          )}
          {reviewList.length > 0 && (
            <ul>
              {reviewList.map((r) => (
                <li key={r.id}>
                  <a href={`/${lang}/community/reviews/${r.id}`}>{r.title}</a>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {listPage && listPage.items.length > 0 && (
        <ul>
          {listPage.items.map((it) => renderItem(it))}
        </ul>
      )}

      {communityPage && (communityPage.posts.length > 0 || communityPage.reviews.length > 0) && (
        <>
          {communityPage.posts.length > 0 && (
            <ul>
              {communityPage.posts.map((it) => renderItem(it))}
            </ul>
          )}
          {communityPage.reviews.length > 0 && (
            <ul>
              {communityPage.reviews.map((it) => renderItem(it))}
            </ul>
          )}
        </>
      )}

      {gameMatch && gameDetail && (
        <article>
          <h2>{gameDetail.title}</h2>
          {gameDetail.imageUrl && <img src={absUrl(gameDetail.imageUrl)} alt={gameDetail.title} loading="lazy" decoding="async" />}
          {gameDetail.description && <p>{gameDetail.description}</p>}
          {Array.isArray(gameDetail.genres) && gameDetail.genres.length > 0 && (
            <p>{gameDetail.genres.join(' / ')}</p>
          )}
        </article>
      )}

      {newsMatch && newsDetail && (
        <article>
          <h2>{newsDetail.title}</h2>
          {newsDetail.imageUrl && <img src={absUrl(newsDetail.imageUrl)} alt={newsDetail.title} loading="lazy" decoding="async" />}
          {newsDetail.summary && <p>{newsDetail.summary}</p>}
          {newsDetail.contentHtml
            ? <div dangerouslySetInnerHTML={{ __html: newsDetail.contentHtml }} />
            : newsDetail.content && <p>{newsDetail.content}</p>}
        </article>
      )}

      {blogMatch && blogDetail && (
        <article>
          <h2>{blogDetail.title}</h2>
          {blogDetail.coverImage && <img src={absUrl(blogDetail.coverImage)} alt={blogDetail.title} loading="lazy" decoding="async" />}
          {blogDetail.contentHtml
            ? <div dangerouslySetInnerHTML={{ __html: blogDetail.contentHtml }} />
            : blogDetail.content && <ReactMarkdown>{blogDetail.content}</ReactMarkdown>}
        </article>
      )}

      {reviewMatch && reviewDetail && (
        <article>
          <h2>{reviewDetail.title}</h2>
          {reviewDetail.contentHtml
            ? <div dangerouslySetInnerHTML={{ __html: reviewDetail.contentHtml }} />
            : reviewDetail.content && <ReactMarkdown>{reviewDetail.content}</ReactMarkdown>}
        </article>
      )}

      {guideMatch && guideDetail && (
        <article>
          <h2>{guideDetail.title}</h2>
          {guideDetail.coverImageUrl && <img src={absUrl(guideDetail.coverImageUrl)} alt={guideDetail.title} loading="lazy" decoding="async" />}
          {guideDetail.contentHtml
            ? <div dangerouslySetInnerHTML={{ __html: guideDetail.contentHtml }} />
            : guideDetail.content && <ReactMarkdown>{guideDetail.content}</ReactMarkdown>}
        </article>
      )}
    </div>
  )
}
