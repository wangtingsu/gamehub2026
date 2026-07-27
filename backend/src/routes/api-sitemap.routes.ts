/**
 * ============================================================
 * API Sitemap 路由模块
 * ============================================================
 *
 * 本模块提供站点地图（Sitemap）的 JSON 格式数据接口，用于搜索引擎爬虫
 * 和前端 SEO 优化。返回的数据包含站内所有可索引的页面 URL 列表，
 * 涵盖以下页面类型：
 *   - 静态页面（首页、游戏列表、新闻、评测、关于等）
 *   - 游戏详情页
 *   - 新闻详情页
 *   - 评测详情页
 *
 * 每个 URL 均附带有 lastmod（最后修改日期）、changefreq（更新频率）、
 * priority（优先级）等 SEO 元数据，供搜索引擎优化使用。
 *
 * 路由前缀: /api/v1/sitemap
 *
 * @module apiSitemapRoutes
 */

import { Router, Request, Response } from 'express';
import config from '../config';
import {
  getAllGamesForSitemap,
  getAllPublishedNewsForSitemap,
  getAllReviewsForSitemap,
} from '../services/sitemap.service';

const router = Router();

/**
 * 站点支持的语言前缀列表。
 * 每个前缀对应一个多语言版本的站点路径（如 /en、/cn 等）。
 */
const URL_PREFIXES = ['en', 'cn', 'ja', 'ko', 'es', 'fr'];

/**
 * URL 前缀到标准 hreflang 语言代码的映射表。
 * 用作语言元数据标记，帮助搜索引擎理解多语言页面关系。
 */
const PREFIX_TO_LANG: Record<string, string> = {
  en: 'en', cn: 'zh-CN', ja: 'ja', ko: 'ko', es: 'es', fr: 'fr',
};

/**
 * 静态页面路由配置列表。
 * 每个条目定义了一个静态页面的路径、建议的更新频率和优先级权重。
 * 这些页面不依赖数据库中的动态内容。
 */
const staticPages = [
  { path: '', changefreq: 'daily', priority: '1.0' },
  { path: '/games', changefreq: 'daily', priority: '0.9' },
  { path: '/news', changefreq: 'daily', priority: '0.8' },
  { path: '/reviews', changefreq: 'daily', priority: '0.8' },
  { path: '/community', changefreq: 'daily', priority: '0.7' },
  { path: '/about', changefreq: 'monthly', priority: '0.5' },
  { path: '/login', changefreq: 'monthly', priority: '0.3' },
  { path: '/register', changefreq: 'monthly', priority: '0.3' },
];

/**
 * 将日期或日期字符串格式化为 YYYY-MM-DD 格式的日期字符串。
 *
 * @param date - Date 对象或 ISO 日期字符串
 * @returns 格式化的日期字符串（如 "2026-06-20"）
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * GET /api/v1/sitemap
 *
 * 生成并返回完整的站点地图 JSON 数据。并发查询数据库获取所有游戏、
 * 新闻和评测的动态 URL，然后与静态页面 URL 合并后返回。
 *
 * @route GET /
 * @access Public - 无需认证，搜索引擎和前端均可直接访问
 *
 * @query 无查询参数
 *
 * @response 200 - 成功返回 Sitemap 数据
 *   @body {object} data
 *     @property {string} siteUrl - 站点基础 URL
 *     @property {string} generatedAt - 数据生成时间（ISO 格式）
 *     @property {number} totalUrls - 所有 URL 的总数
 *     @property {object} byType - 按类型分类的 URL 数量统计
 *     @property {Array} urls - 完整的 URL 条目列表
 *       @property {string} url.loc - 页面完整 URL
 *       @property {string} url.lastmod - 最后修改日期
 *       @property {string} url.changefreq - 更新频率建议
 *       @property {string} url.priority - 优先级权重
 *       @property {string} url.type - 页面类型（static/game/news/review）
 *       @property {string} [url.id] - 动态内容的 ID（仅 game/news/review 类型）
 *       @property {string} [url.language] - 语言代码（仅 static 类型）
 *
 * @response 500 - 服务器内部错误，数据库查询或数据处理失败
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const siteUrl = config.siteUrl;

    // 并发获取游戏、新闻、评测的动态数据
    const [games, news, reviews] = await Promise.all([
      getAllGamesForSitemap(),
      getAllPublishedNewsForSitemap(),
      getAllReviewsForSitemap(),
    ]);

    // 构建静态页面 URLs —— 每个页面为所有支持的语言生成一条 URL
    const staticUrls: any[] = [];
    for (const page of staticPages) {
      for (const prefix of URL_PREFIXES) {
        staticUrls.push({
          loc: `${siteUrl}/${prefix}${page.path}`,
          changefreq: page.changefreq,
          priority: page.priority,
          lastmod: formatDate(new Date()), // 静态页面使用当前日期
          type: 'static',
          language: PREFIX_TO_LANG[prefix],
        });
      }
    }

    // 游戏详情页 URLs
    const gameUrls = games.map(game => ({
      loc: `${siteUrl}/en/games/${game.id}`, // 默认使用英语语言前缀
      lastmod: formatDate(game.updatedAt),
      changefreq: 'daily',
      priority: '0.8',
      type: 'game',
      id: game.id,
    }));

    // 新闻详情页 URLs
    const newsUrls = news.map(item => ({
      loc: `${siteUrl}/en/news/${item.id}`,
      lastmod: formatDate(item.publishedAt),
      changefreq: 'daily',
      priority: '0.6',
      type: 'news',
      id: item.id,
    }));

    // 评测详情页 URLs
    const reviewUrls = reviews.map(item => ({
      loc: `${siteUrl}/en/reviews/${item.id}`,
      lastmod: formatDate(item.publishedAt),
      changefreq: 'daily',
      priority: '0.6',
      type: 'review',
      id: item.id,
    }));

    // 合并所有类型的 URLs
    const urls = [...staticUrls, ...gameUrls, ...newsUrls, ...reviewUrls];

    res.json({
      success: true,
      data: {
        siteUrl,
        generatedAt: new Date().toISOString(),
        totalUrls: urls.length,
        byType: {
          static: staticUrls.length,
          game: gameUrls.length,
          news: newsUrls.length,
          review: reviewUrls.length,
        },
        urls,
      },
      message: 'Sitemap数据获取成功',
    });
  } catch (error) {
    console.error('生成Sitemap JSON失败:', error);
    res.status(500).json({
      success: false,
      error: '生成Sitemap数据失败',
    });
  }
});

export default router;
