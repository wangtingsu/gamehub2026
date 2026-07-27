/**
 * 站点地图服务
 *
 * 为 SEO 提供站点地图生成所需的数据，从数据库中提取游戏、新闻、
 * 攻略和评测等内容的 ID 与更新时间，供站点地图生成器使用。
 *
 * @module sitemap.service
 */

import { query } from '../db';

/**
 * 站点地图中的游戏条目
 *
 * @property id - 游戏 ID
 * @property updatedAt - 最后更新时间（ISO 格式）
 */
export interface SitemapGameItem {
  id: number;
  updatedAt: string;
}

/**
 * 站点地图中的新闻/攻略条目
 *
 * @property id - 新闻/攻略 ID
 * @property publishedAt - 发布时间（ISO 格式）
 */
export interface SitemapNewsItem {
  id: number;
  publishedAt: string;
}

/**
 * 站点地图中的评测条目
 *
 * @property id - 评测 ID
 * @property publishedAt - 发布时间（ISO 格式）
 */
export interface SitemapReviewItem {
  id: number;
  publishedAt: string;
}

/**
 * 获取所有游戏列表（用于站点地图）
 *
 * 从 games 表中查询所有游戏的 ID 和更新时间，按更新时间降序排列。
 *
 * @returns 包含 id 和 updatedAt 的游戏条目数组
 */
export const getAllGamesForSitemap = async (): Promise<SitemapGameItem[]> => {
  const result = await query(
    'SELECT id, updated_at FROM games ORDER BY updated_at DESC',
    []
  );
  return (result.rows || result).map((row: any) => ({
    id: row.id,
    updatedAt: row.updated_at,
  }));
};

/**
 * 获取所有已发布新闻列表（用于站点地图）
 *
 * 从 news 表中查询所有已发布新闻的 ID 和发布时间，按发布时间降序排列。
 *
 * @returns 包含 id 和 publishedAt 的新闻条目数组
 */
export const getAllPublishedNewsForSitemap = async (): Promise<SitemapNewsItem[]> => {
  const result = await query(
    'SELECT id, published_at FROM news WHERE is_published = true ORDER BY published_at DESC',
    []
  );
  return (result.rows || result).map((row: any) => ({
    id: row.id,
    publishedAt: row.published_at,
  }));
};

/**
 * 获取所有已发布且审核通过的攻略列表（用于站点地图）
 *
 * 从 guides 表中查询已发布且审核状态为 approved 的攻略，
 * 以创建时间作为发布时间返回。
 *
 * @returns 包含 id 和 publishedAt 的攻略条目数组
 */
export const getAllPublishedGuidesForSitemap = async (): Promise<SitemapNewsItem[]> => {
  const result = await query(
    `SELECT id, created_at as published_at FROM guides WHERE is_published = 1 AND review_status = 'approved' ORDER BY created_at DESC`,
    []
  );
  return (result.rows || result).map((row: any) => ({
    id: row.id,
    publishedAt: row.published_at,
  }));
};

/**
 * 获取所有评测列表（用于站点地图）
 *
 * 从 reviews 表中查询所有评测的 ID 和发布时间，按发布时间降序排列。
 *
 * @returns 包含 id 和 publishedAt 的评测条目数组
 */
export const getAllReviewsForSitemap = async (): Promise<SitemapReviewItem[]> => {
  const result = await query(
    'SELECT id, published_at FROM reviews ORDER BY published_at DESC',
    []
  );
  return (result.rows || result).map((row: any) => ({
    id: row.id,
    publishedAt: row.published_at,
  }));
};
