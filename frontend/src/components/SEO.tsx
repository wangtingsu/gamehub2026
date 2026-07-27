import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

/**
 * i18n 语言代码到 Open Graph locale 的映射表
 *
 * 用于生成 og:locale 元数据标签，告诉搜索引擎页面内容使用的语言和地区。
 */
const LOCALE_MAP: Record<string, string> = {
  en: 'en_US',
  'zh-CN': 'zh_CN',
  ja: 'ja_JP',
  ko: 'ko_KR',
  es: 'es_ES',
  fr: 'fr_FR',
};

// URL 路径前缀列表（用于生成带语言前缀的 alternate 链接）
const URL_LANGUAGES = ['en', 'cn', 'ja', 'ko', 'es', 'fr'];
// URL 前缀 → hreflang 标准代码映射
const URL_TO_HREFLANG: Record<string, string> = {
  en: 'en',
  cn: 'zh-CN',
  ja: 'ja',
  ko: 'ko',
  es: 'es',
  fr: 'fr',
};

/**
 * SEO 组件的属性接口
 *
 * @property title - 页面标题，会自动追加 " | GameHub" 后缀
 * @property description - 页面描述，用于 SEO 和社交分享卡片
 * @property keywords - SEO 关键词（逗号分隔）
 * @property image - 社交分享图片 URL（默认 /og-image.png）
 * @property url - 页面完整 URL（默认使用当前页面 URL）
 * @property type - Open Graph 类型，如 'website'（默认）或 'article'
 * @property publishedTime - 文章发布时间（ISO 格式），仅 type=article 时有效
 * @property modifiedTime - 文章修改时间（ISO 格式），仅 type=article 时有效
 * @property author - 文章作者名
 * @property section - 文章所属版块，仅 type=article 时有效
 * @property tags - 文章标签列表，仅 type=article 时有效
 * @property canonical - 自定义规范 URL，用于避免重复内容
 * @property noindex - 是否禁止搜索引擎索引该页面
 * @property nofollow - 是否禁止搜索引擎跟踪页面链接
 * @property structuredData - 自定义 JSON-LD 结构化数据，可以是单个对象或对象数组
 */
interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
  canonical?: string;
  noindex?: boolean;
  nofollow?: boolean;
  structuredData?: Record<string, any> | Record<string, any>[];
}

/**
 * SEO — 搜索引擎优化及社交分享元数据管理组件
 *
 * 该组件基于 react-helmet-async 在 HTML <head> 中注入各类 SEO 和社交分享标签，
 * 同时支持服务器端渲染（SSR），确保搜索引擎爬虫和社交平台抓取工具能正确读取页面元数据。
 *
 * 核心功能：
 * 1. 基础 SEO：title、description、keywords、author、robots 元标签
 * 2. Open Graph 协议：og:type、og:title、og:description、og:image、og:locale 等
 * 3. Twitter Cards：大型图片摘要卡（summary_large_image）
 * 4. 规范 URL（canonical）：防止重复内容对 SEO 的影响
 * 5. 多语言支持（hreflang）：为 6 种支持的语言生成 alternate 链接及 x-default
 * 6. JSON-LD 结构化数据：
 *    - 自动生成 WebSite（含搜索动作 SearchAction）
 *    - 自动生成 Organization（含 Logo 和社交链接）
 *    - type=article 时自动生成 Article 结构化数据
 *    - 支持通过 structuredData prop 传入自定义数据
 * 7. 文章扩展标签：published_time、modified_time、author、section、tags
 *
 * 使用方式：
 * ```tsx
 * <SEO
 *   title="游戏名称"
 *   description="游戏详细描述"
 *   image="/games/xxx.jpg"
 *   type="article"
 *   publishedTime="2024-01-01T00:00:00Z"
 *   tags={["动作", "冒险"]}
 * />
 * ```
 *
 * @param props - 组件属性，详见 SEOProps 接口
 * @returns 通过 react-helmet-async 注入 <head> 的元数据标签集合
 */
export default function SEO({
  title,
  description,
  keywords,
  image = '/og-image.png',
  url = (typeof window !== 'undefined' ? window.location.href : ''),
  type = 'website',
  publishedTime,
  modifiedTime,
  author = 'GameHub Team',
  section,
  tags,
  canonical,
  noindex = false,
  nofollow = false,
  structuredData,
}: SEOProps) {
  const { t, i18n } = useTranslation();
  const siteName = 'GameHub';
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://www.gghubs.com';
  const twitterHandle = import.meta.env.VITE_TWITTER_HANDLE || '@goodgamehubs';

  // Use defaults if not provided
  const pageTitle = title ? `${title} | ${siteName}` : siteName;
  const pageDescription = description || t('seo.defaultDescription', 'GameHub is a unified game library management platform supporting multi-platform game integration and management.');
  const pageKeywords = keywords || t('seo.defaultKeywords', 'game library, game management, gaming platform, video games, game collection, game hub, gaming community');
  const pageImage = image.startsWith('http') ? image : `${siteUrl}${image}`;
  const pageUrl = url.startsWith('http') ? url : `${siteUrl}${url}`;
  const pageCanonical = canonical ? (canonical.startsWith('http') ? canonical : `${siteUrl}${canonical}`) : pageUrl;

  // Robots meta
  const robotsContent = [];
  if (noindex) robotsContent.push('noindex');
  if (nofollow) robotsContent.push('nofollow');
  if (robotsContent.length === 0) robotsContent.push('index', 'follow');
  const robotsMeta = robotsContent.join(', ');

  /**
   * 生成 JSON-LD 结构化数据数组
   *
   * 自动生成以下结构化数据：
   * 1. WebSite：包含网站名称、URL 和搜索动作（SearchAction），使搜索引擎
   *    了解网站搜索功能
   * 2. Organization：包含组织名称、URL、Logo 和社交账号（sameAs）
   * 3. 页面特定数据：通过 structuredData prop 传入的自定义数据
   * 4. Article：当 type=article 且提供了 publishedTime 时，自动生成包含
   *    标题、描述、图片、发布时间、作者、发布者等完整信息的文章结构化数据
   *
   * 所有数据最终会被合并为单个 JSON-LD @graph 数组注入到页面中。
   *
   * @returns 结构化数据对象数组，每个对象包含 @context、@type 等 Schema.org 属性
   */
  const generateStructuredData = () => {
    const data = [];

    // 默认网站结构化数据
    const websiteStructuredData = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'name': siteName,
      'url': siteUrl,
      'potentialAction': {
        '@type': 'SearchAction',
        'target': `${siteUrl}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    };
    data.push(websiteStructuredData);

    // 组织信息
    const organizationStructuredData = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      'name': siteName,
      'url': siteUrl,
      'logo': `${siteUrl}/og-image.png`,
      'sameAs': [
        'https://twitter.com/gamehub',
        'https://facebook.com/gamehub',
        'https://instagram.com/gamehub'
      ]
    };
    data.push(organizationStructuredData);

    // 页面特定结构化数据
    if (structuredData) {
      if (Array.isArray(structuredData)) {
        data.push(...structuredData);
      } else {
        data.push(structuredData);
      }
    }

    // 根据页面类型添加特定数据
    if (type === 'article' && publishedTime) {
      const articleStructuredData = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        'headline': pageTitle,
        'description': pageDescription,
        'image': pageImage,
        'datePublished': publishedTime,
        'dateModified': modifiedTime || publishedTime,
        'author': {
          '@type': 'Person',
          'name': author
        },
        'publisher': {
          '@type': 'Organization',
          'name': siteName,
          'logo': {
            '@type': 'ImageObject',
            'url': `${siteUrl}/og-image.png`
          }
        }
      };
      data.push(articleStructuredData);
    }

    return data;
  };

  const structuredDataArray = generateStructuredData();
  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="title" content={pageTitle} />
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content={pageKeywords} />
      <meta name="author" content={author} />
      <meta name="robots" content={robotsMeta} />
      <meta name="googlebot" content={robotsMeta} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:image" content={pageImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={pageTitle} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={LOCALE_MAP[i18n.language] || 'en_US'} />

      {/* Additional Open Graph tags for articles */}
      {type === 'article' && (
        <>
          {publishedTime && <meta property="article:published_time" content={publishedTime} />}
          {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
          {author && <meta property="article:author" content={author} />}
          {section && <meta property="article:section" content={section} />}
          {tags?.map((tag) => (
            <meta key={tag} property="article:tag" content={tag} />
          ))}
        </>
      )}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={pageUrl} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={pageImage} />
      <meta name="twitter:site" content={twitterHandle} />
      <meta name="twitter:creator" content={twitterHandle} />

      {/* Canonical URL */}
      <link rel="canonical" href={pageCanonical} />

      {/* Alternate languages */}
      {/* 为所有支持的语言生成alternate链接 — URL前缀与hreflang代码独立 */}
      {(() => {
        const pathname = typeof window !== 'undefined' ? window.location.pathname : url.replace(/^https?:\/\/[^\/]+/, '');
        const pathWithoutLang = pathname.replace(/^\/[^\/]+/, '').replace(/\/+$/, '') || '';
        return (
          <>
            {URL_LANGUAGES.map((urlLang) => (
              <link key={urlLang} rel="alternate" hrefLang={URL_TO_HREFLANG[urlLang]} href={`${siteUrl}/${urlLang}${pathWithoutLang}`} />
            ))}
            <link rel="alternate" hrefLang="x-default" href={pageCanonical} />
          </>
        );
      })()}

      {/* Structured Data (JSON-LD) — 合并为单个 @graph */}
      {structuredDataArray.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': structuredDataArray.map(item => {
                const { '@context': _ctx, ...rest } = item;
                return rest;
              }),
            }),
          }}
        />
      )}
    </Helmet>
  );
}