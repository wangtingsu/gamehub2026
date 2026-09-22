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
import faqContent from '../data/faq/content.json'

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
  guides?: Guide[]
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

/** 列表区块的本地化 h2 标题（P1-2：首页 h2≥3、4 个列表页各 h2≥1 的语义层级验收） */
const SECTION_HEADINGS: Record<string, Record<string, string>> = {
  en: { featured: 'Featured Games', news: 'Latest News', reviews: 'Game Reviews', posts: 'Community Posts', games: 'All Games', guides: 'Game Guides', blog: 'Blog Articles' },
  cn: { featured: '精选游戏', news: '最新资讯', reviews: '游戏评测', posts: '社区帖子', games: '全部游戏', guides: '游戏攻略', blog: '博客文章' },
  ja: { featured: '注目ゲーム', news: '最新ニュース', reviews: 'ゲームレビュー', posts: 'コミュニティ投稿', games: 'すべてのゲーム', guides: 'ゲームガイド', blog: 'ブログ記事' },
  ko: { featured: '추천 게임', news: '최신 뉴스', reviews: '게임 리뷰', posts: '커뮤니티 글', games: '모든 게임', guides: '가이드', blog: '블로그 글' },
  es: { featured: 'Juegos destacados', news: 'Últimas noticias', reviews: 'Reseñas de juegos', posts: 'Publicaciones', games: 'Todos los juegos', guides: 'Guías', blog: 'Artículos' },
  fr: { featured: 'Jeux en vedette', news: 'Dernières actualités', reviews: 'Critiques de jeux', posts: 'Publications', games: 'Tous les jeux', guides: 'Guides', blog: 'Articles' },
}

/** 取某语言的区块标题（缺省回退英文） */
function sectionHeading(lang: string, key: string): string {
  const table = SECTION_HEADINGS[lang] || SECTION_HEADINGS.en
  return table[key] || SECTION_HEADINGS.en[key] || ''
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
  guides,
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
  const guideList = Array.isArray(guides) ? guides : []
  const reviewList = Array.isArray(reviews) ? reviews : []

  // 二游 FAQ 落地页：正文直接输出部署包的 HTML 片段（含 h1/h2/h3 锚点 + 目录 nav）
  const isFaq = /\/faq\/anime-gacha-games\/?$/.test(urlPathname)
  const faqHtml = isFaq ? (lang === 'cn' ? faqContent.zh : faqContent.en).html : ''

  return (
    <div hidden>
      {isFaq ? (
        <div dangerouslySetInnerHTML={{ __html: faqHtml }} />
      ) : (
        <>
          <h1>{pageMeta.title}</h1>
          <p>{pageMeta.description}</p>
        </>
      )}

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
            <section>
              <h2>{sectionHeading(lang, 'featured')}</h2>
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
            </section>
          )}
          {newsList.length > 0 && (
            <section>
              <h2>{sectionHeading(lang, 'news')}</h2>
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
            </section>
          )}
          {guideList.length > 0 && (
            <section>
              <h2>{sectionHeading(lang, 'guides')}</h2>
              <ul>
                {guideList.map((g) => (
                  <li key={g.id}>
                    <a href={`/${lang}/guides/${g.id}`}>
                      {g.coverImageUrl ? <img src={absUrl(g.coverImageUrl)} alt={g.title} loading="lazy" decoding="async" /> : null}
                      <span>{g.title}</span>
                    </a>
                    {g.summary ? <p>{g.summary}</p> : null}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {reviewList.length > 0 && (
            <section>
              <h2>{sectionHeading(lang, 'reviews')}</h2>
              <ul>
                {reviewList.map((r) => (
                  <li key={r.id}>
                    <a href={`/${lang}/community/reviews/${r.id}`}>{r.title}</a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {listPage && listPage.items.length > 0 && (
        <section>
          <h2>{sectionHeading(lang, listPage.kind)}</h2>
          <ul>
            {listPage.items.map((it) => renderItem(it))}
          </ul>
        </section>
      )}

      {communityPage && (communityPage.posts.length > 0 || communityPage.reviews.length > 0) && (
        <>
          {communityPage.posts.length > 0 && (
            <section>
              <h2>{sectionHeading(lang, 'posts')}</h2>
              <ul>
                {communityPage.posts.map((it) => renderItem(it))}
              </ul>
            </section>
          )}
          {communityPage.reviews.length > 0 && (
            <section>
              <h2>{sectionHeading(lang, 'reviews')}</h2>
              <ul>
                {communityPage.reviews.map((it) => renderItem(it))}
              </ul>
            </section>
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
