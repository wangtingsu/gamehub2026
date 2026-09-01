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
 */
import type { Game, NewsArticle, Review } from '../api/types'

interface PageMeta {
  title: string
  description: string
}

interface ServerContentProps {
  urlPathname: string
  pageMeta: PageMeta
  games?: Game[]
  news?: NewsArticle[]
  reviews?: Review[]
  gameDetail?: Game | null
  newsDetail?: NewsArticle | null
}

/** 从 URL 提取语言前缀，用于生成内部链接（无前缀默认 en） */
function getLangPrefix(urlPathname: string): string {
  const m = urlPathname.match(/^\/(en|cn|ja|ko|es|fr)(?=\/|$)/)
  return m ? m[1] : 'en'
}

export default function ServerContent({
  urlPathname,
  pageMeta,
  games,
  news,
  reviews,
  gameDetail,
  newsDetail,
}: ServerContentProps) {
  const lang = getLangPrefix(urlPathname)
  const isHome = urlPathname === '/' || /^\/(en|cn|ja|ko|es|fr)\/?$/.test(urlPathname)
  const gameMatch = urlPathname.match(/\/games\/([^/]+)/)
  const newsMatch = urlPathname.match(/\/news\/([^/]+)/)

  const gameList = Array.isArray(games) ? games : []
  const newsList = Array.isArray(news) ? news : []
  const reviewList = Array.isArray(reviews) ? reviews : []

  return (
    <div>
      <h1>{pageMeta.title}</h1>
      <p>{pageMeta.description}</p>

      {isHome && (
        <>
          {gameList.length > 0 && (
            <ul>
              {gameList.map((g) => (
                <li key={g.id}>
                  <a href={`/${lang}/games/${g.id}`}>{g.title}</a>
                </li>
              ))}
            </ul>
          )}
          {newsList.length > 0 && (
            <ul>
              {newsList.map((n) => (
                <li key={n.id}>
                  <a href={`/${lang}/news/${n.id}`}>{n.title}</a>
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

      {gameMatch && gameDetail && (
        <article>
          <h2>{gameDetail.title}</h2>
          {gameDetail.description && <p>{gameDetail.description}</p>}
          {Array.isArray(gameDetail.genres) && gameDetail.genres.length > 0 && (
            <p>{gameDetail.genres.join(' / ')}</p>
          )}
        </article>
      )}

      {newsMatch && newsDetail && (
        <article>
          <h2>{newsDetail.title}</h2>
          {newsDetail.summary && <p>{newsDetail.summary}</p>}
          {newsDetail.content && <p>{newsDetail.content}</p>}
        </article>
      )}
    </div>
  )
}
