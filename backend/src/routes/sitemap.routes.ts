/**
 * 站点地图（Sitemap）路由模块
 *
 * 本模块提供网站 Sitemap XML 的生成和访问服务，支持：
 * - 多语言 URL 前缀（en, cn, ja, ko, es, fr）
 * - hreflang 替代链接（Alternate Links），符合多语言 SEO 标准
 * - 静态页面、游戏详情、新闻、评测、攻略等动态页面的 URL 收录
 *
 * 生成的 Sitemap 遵循 sitemaps.org 协议，并包含 xhtml:link 扩展用于多语言支持
 *
 * @module routes/sitemap
 */

import { Router, Request, Response } from 'express';
import config from '../config';
import {
  getAllGamesForSitemap,
  getAllPublishedNewsForSitemap,
  getAllReviewsForSitemap,
  getAllPublishedGuidesForSitemap,
} from '../services/sitemap.service';

const router = Router();

/**
 * 支持的语言前缀列表
 * 用于生成多语言 URL 和 hreflang 替代链接
 */
const URL_PREFIXES = ['en', 'cn', 'ja', 'ko', 'es', 'fr'];

/**
 * URL 前缀到标准 hreflang 代码的映射表
 * cn 对应 zh-CN（中文简体），其他语言直接对应
 */
const PREFIX_TO_HREFLANG: Record<string, string> = {
  en: 'en', cn: 'zh-CN', ja: 'ja', ko: 'ko', es: 'es', fr: 'fr',
};

/**
 * 静态页面配置列表
 * 定义需要收录在站点地图中的静态页面路径、更新频率和优先级
 *
 * @property path - 页面路径（相对于语言前缀）
 * @property changefreq - 建议的更新频率（daily/weekly/monthly）
 * @property priority - 页面优先级（0.0-1.0），越高越重要
 *
 * 优先级说明：
 * - 1.0：首页
 * - 0.9：核心页面（游戏列表等）
 * - 0.8：重要内容页面（在线游戏库、新闻、评测、攻略）
 * - 0.7：社区、发现、趋势、排行榜等
 * - 0.6：二级内容页面
 * - 0.5：常规页面
 * - 0.4-0.3：辅助页面（关于、法律条款、登录注册等）
 */
const staticPages = [
  { path: '', changefreq: 'daily', priority: '1.0' },
  { path: '/games', changefreq: 'daily', priority: '0.9' },
  { path: '/library/online', changefreq: 'daily', priority: '0.8' },
  { path: '/news', changefreq: 'daily', priority: '0.8' },
  { path: '/reviews', changefreq: 'daily', priority: '0.8' },
  { path: '/guides', changefreq: 'daily', priority: '0.8' },
  { path: '/community', changefreq: 'daily', priority: '0.7' },
  { path: '/discovery', changefreq: 'daily', priority: '0.7' },
  { path: '/trending', changefreq: 'daily', priority: '0.7' },
  { path: '/leaderboard', changefreq: 'daily', priority: '0.7' },
  { path: '/cozy-games', changefreq: 'weekly', priority: '0.7' },
  { path: '/free-games', changefreq: 'weekly', priority: '0.7' },
  { path: '/ai-gaming', changefreq: 'weekly', priority: '0.6' },
  { path: '/ai', changefreq: 'weekly', priority: '0.5' },
  { path: '/blog', changefreq: 'weekly', priority: '0.6' },
  { path: '/about', changefreq: 'monthly', priority: '0.5' },
  { path: '/about/careers', changefreq: 'monthly', priority: '0.4' },
  { path: '/about/press', changefreq: 'monthly', priority: '0.4' },
  { path: '/about/contact', changefreq: 'monthly', priority: '0.4' },
  { path: '/legal/privacy', changefreq: 'monthly', priority: '0.3' },
  { path: '/legal/terms', changefreq: 'monthly', priority: '0.3' },
  { path: '/legal/cookies', changefreq: 'monthly', priority: '0.3' },
  { path: '/login', changefreq: 'monthly', priority: '0.3' },
  { path: '/register', changefreq: 'monthly', priority: '0.3' },
];

/**
 * XML 转义函数
 * 将特殊字符转换为 XML 实体，防止 XML 格式错误
 *
 * @param str - 需要转义的原始字符串
 * @returns 转义后的安全 XML 字符串
 * @see https://www.w3.org/TR/xml/#sec-entity-reference
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 格式化日期为 YYYY-MM-DD 格式
 * 用于 Sitemap 的 <lastmod> 标签
 *
 * @param date - Date 对象或 ISO 日期字符串
 * @returns 格式化的日期字符串（如 2026-06-20）
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * 生成 hreflang 替代链接（Alternate Links）
 * 为指定路径生成所有支持语言的 <xhtml:link> 标签
 *
 * 示例输出：
 *   <xhtml:link rel="alternate" hreflang="en" href="https://xxx.com/en/games" />
 *   <xhtml:link rel="alternate" hreflang="zh-CN" href="https://xxx.com/cn/games" />
 *
 * @param siteUrl - 站点基础 URL
 * @param path - 页面路径（不含语言前缀）
 * @returns 所有语言替代链接的 XML 字符串，每行一个 <xhtml:link>
 */
function buildAlternateLinks(siteUrl: string, path: string): string {
  return URL_PREFIXES
    .map(prefix => `    <xhtml:link rel="alternate" hreflang="${PREFIX_TO_HREFLANG[prefix]}" href="${escapeXml(`${siteUrl}/${prefix}${path}`)}" />`)
    .join('\n');
}

/**
 * 构建完整的 Sitemap XML 内容
 *
 * 包含以下类型的 URL：
 * 1. 静态页面 - 每种语言生成独立 URL，含 hreflang 替代链接
 * 2. 游戏详情页 - 动态生成，含 lastmod
 * 3. 新闻详情页 - 动态生成，含 lastmod
 * 4. 评测详情页 - 动态生成，含 lastmod
 * 5. 攻略详情页 - 动态生成，含 lastmod
 *
 * @param siteUrl - 站点基础 URL
 * @param games - 游戏列表（含 id 和 updatedAt）
 * @param news - 新闻列表（含 id 和 publishedAt）
 * @param reviews - 评测列表（含 id 和 publishedAt）
 * @param guides - 攻略列表（含 id 和 publishedAt）
 * @returns 完整的 Sitemap XML 字符串
 */
function buildSitemapXml(
  siteUrl: string,
  games: { id: number; slug?: string; updatedAt: string }[],
  news: { id: number; publishedAt: string }[],
  reviews: { id: number; publishedAt: string }[],
  guides: { id: number; publishedAt: string }[]
): string {
  const urls: string[] = [];

  // 静态页面 — 每种语言为独立 URL，带 hreflang
  for (const page of staticPages) {
    const canonicalLang = URL_PREFIXES[0];
    const canonicalLoc = `${siteUrl}/${canonicalLang}${page.path}`;
    const alternates = buildAlternateLinks(siteUrl, page.path);
    urls.push(`  <url>
    <loc>${escapeXml(canonicalLoc)}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
${alternates}
  </url>`);
  }

  // 游戏详情页
  for (const game of games) {
    const path = `/games/${game.slug || game.id}`;
    const canonicalLoc = `${siteUrl}/${URL_PREFIXES[0]}${path}`;
    const alternates = buildAlternateLinks(siteUrl, path);
    urls.push(`  <url>
    <loc>${escapeXml(canonicalLoc)}</loc>
    <lastmod>${formatDate(game.updatedAt)}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
${alternates}
  </url>`);
  }

  // 新闻详情页
  for (const item of news) {
    const path = `/news/${item.id}`;
    const canonicalLoc = `${siteUrl}/${URL_PREFIXES[0]}${path}`;
    const alternates = buildAlternateLinks(siteUrl, path);
    urls.push(`  <url>
    <loc>${escapeXml(canonicalLoc)}</loc>
    <lastmod>${formatDate(item.publishedAt)}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
${alternates}
  </url>`);
  }

  // 评测详情页
  for (const item of reviews) {
    const path = `/reviews/${item.id}`;
    const canonicalLoc = `${siteUrl}/${URL_PREFIXES[0]}${path}`;
    const alternates = buildAlternateLinks(siteUrl, path);
    urls.push(`  <url>
    <loc>${escapeXml(canonicalLoc)}</loc>
    <lastmod>${formatDate(item.publishedAt)}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
${alternates}
  </url>`);
  }

  // 攻略详情页
  for (const item of guides) {
    const path = `/guides/${item.id}`;
    const canonicalLoc = `${siteUrl}/${URL_PREFIXES[0]}${path}`;
    const alternates = buildAlternateLinks(siteUrl, path);
    urls.push(`  <url>
    <loc>${escapeXml(canonicalLoc)}</loc>
    <lastmod>${formatDate(item.publishedAt)}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
${alternates}
  </url>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`;
}

/**
 * @route GET /sitemap.xml
 * @desc 生成并返回站点地图 XML
 * @access Public
 *
 * 从数据库中并行获取所有游戏、新闻、评测和攻略数据，
 * 结合静态页面配置，生成包含多语言 hreflang 替代链接的 Sitemap XML，
 * 并设置 1 小时缓存控制头
 *
 * @returns 200 - 成功返回 Sitemap XML（Content-Type: application/xml）
 * @returns 500 - 生成失败，返回空 Sitemap（避免搜索引擎报错）
 *
 * 响应头：
 * - Content-Type: application/xml
 * - Cache-Control: public, max-age=3600
 */
router.get('/sitemap.xml', async (req: Request, res: Response) => {
  try {
    const siteUrl = config.siteUrl;

    // 并行获取所有动态内容数据
    const [games, news, reviews, guides] = await Promise.all([
      getAllGamesForSitemap(),
      getAllPublishedNewsForSitemap(),
      getAllReviewsForSitemap(),
      getAllPublishedGuidesForSitemap(),
    ]);

    const xml = buildSitemapXml(siteUrl, games, news, reviews, guides);

    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (error) {
    console.error('生成Sitemap失败:', error);
    // 生成失败时返回空的 Sitemap，避免搜索引擎爬虫报错
    res.status(500).header('Content-Type', 'application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`);
  }
});

export default router;
