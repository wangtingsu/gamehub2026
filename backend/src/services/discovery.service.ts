/**
 * 游戏发现与社区数据服务
 *
 * 提供游戏发现功能相关的数据分析接口，包括：
 * - 多维度排行榜（评分最高、评测最多、收藏最多、讨论最多）
 * - 游戏热度趋势追踪
 * - 搜索趋势分析
 * - 平台和类型分布统计
 * - 社区统计摘要
 */

import logger from '../utils/logger';
import { query } from '../db';
import { getWeightedRatingSubquery } from './level.service';
import type {
  LeaderboardEntry,
  TrendPoint,
  DistributionItem,
  CommunitySummary,
} from '../types/discovery-types';

/**
 * 获取排行榜
 *
 * 支持四种排行榜类型：
 * - top_rated：评分最高的游戏（需至少有一条评测）
 * - most_reviewed：评测数最多的游戏
 * - most_favorited：收藏数最多的游戏
 * - most_discussed：讨论热度最高的游戏（评测数 + 评论数）
 *
 * @param type 排行榜类型
 * @param limit 返回条目数限制，默认为 20
 * @returns 排行榜条目数组，包含排名、评分、评测数等信息
 */
export const getLeaderboard = async (
  type: 'top_rated' | 'most_reviewed' | 'most_favorited' | 'most_discussed',
  limit: number = 20
): Promise<LeaderboardEntry[]> => {
  try {
    let sql = '';
    const params: any[] = [limit];

    switch (type) {
      case 'top_rated':
        // 评分排行：需至少有一条评测（HAVING COUNT > 0）
        sql = `
          SELECT g.id, g.title, g.cover_image_url,
                 COALESCE(AVG(r.rating), 0) as score,
                 COUNT(r.id) as review_count,
                 g.views
          FROM games g
          LEFT JOIN reviews r ON g.game_id = r.game_id
          GROUP BY g.id
          HAVING COUNT(r.id) > 0
          ORDER BY score DESC, review_count DESC
          LIMIT ?
        `;
        break;

      case 'most_reviewed':
        // 评测数排行
        sql = `
          SELECT g.id, g.title, g.cover_image_url,
                 COUNT(r.id) as score,
                 COALESCE(AVG(r.rating), 0) as rating
          FROM games g
          LEFT JOIN reviews r ON g.game_id = r.game_id
          GROUP BY g.id
          ORDER BY score DESC, rating DESC
          LIMIT ?
        `;
        break;

      case 'most_favorited':
        // 收藏数排行，使用加权评分子查询计算评分
        sql = `
          SELECT g.id, g.title, g.cover_image_url,
                 COUNT(f.id) as score,
                 COALESCE(${getWeightedRatingSubquery()}, 0) as rating
          FROM games g
          LEFT JOIN favorites f ON f.game_id = g.id
          GROUP BY g.id
          ORDER BY score DESC
          LIMIT ?
        `;
        break;

      case 'most_discussed':
        // 讨论热度排行：评测数 + 评论数作为热度分值
        sql = `
          SELECT g.id, g.title, g.cover_image_url,
                 (COUNT(DISTINCT r.id) + COUNT(DISTINCT c.id)) as score,
                 COALESCE(AVG(r.rating), 0) as rating
          FROM games g
          LEFT JOIN reviews r ON r.game_id = g.id
          LEFT JOIN comments c ON c.parent_type = 'review' AND c.parent_id = r.id
          GROUP BY g.id
          ORDER BY score DESC
          LIMIT ?
        `;
        break;

      default:
        return [];
    }

    const results = await query(sql, params);

    return results.map((row: any, index: number) => ({
      rank: index + 1,
      id: row.id,
      title: row.title,
      coverImageUrl: row.cover_image_url,
      score: Number(row.score) || 0,
      reviewCount: Number(row.review_count) || 0,
      rating: row.rating ? parseFloat(row.rating).toFixed(1) : null,
      views: Number(row.views) || 0,
      // 当前未实现趋势计算，统一标记为 stable
      trend: 'stable' as const,
    }));
  } catch (error) {
    logger.error(`获取排行榜失败: ${error}`);
    return [];
  }
};

/**
 * 获取指定数量热门游戏的每日热度趋势
 *
 * 取浏览量最高的 N 款游戏，统计其每日评测数作为热度指标。
 * 对无数据的日期用 0 填充以保证数据连续性。
 *
 * @param days 趋势天数范围，默认为 30 天
 * @param limit 返回游戏数量，默认为 10
 * @returns 各游戏每日趋势数据数组
 */
export const getGameTrends = async (
  days: number = 30,
  limit: number = 10
): Promise<Array<{
  gameId: string;
  title: string;
  coverImageUrl?: string;
  data: TrendPoint[];
}>> => {
  try {
    // 按浏览量降序获取热门游戏列表
    const topGames = await query(
      `SELECT id, title, cover_image_url
       FROM games
       ORDER BY views DESC
       LIMIT ?`,
      [limit]
    );

    const result: Array<{
      gameId: string;
      title: string;
      coverImageUrl?: string;
      data: TrendPoint[];
    }> = [];

    for (const game of topGames) {
      // 查询该游戏每日评测数
      const trendData = await query(
        `SELECT date(published_at) as date, COUNT(*) as value
         FROM reviews
         WHERE game_id = ? AND published_at >= datetime('now', ?)
         GROUP BY date(published_at)
         ORDER BY date ASC`,
        [game.id, `-${days} days`]
      );

      // 构建日期到数据的映射，便于填充缺漏日期
      const filledData: TrendPoint[] = [];
      const dataMap = new Map<string, number>();
      for (const d of trendData) {
        dataMap.set(d.date, d.value);
      }

      // 从 days 天前到今天，逐日填充数据
      const now = new Date();
      for (let i = days; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        filledData.push({
          date: dateStr,
          value: dataMap.get(dateStr) || 0,
        });
      }

      result.push({
        gameId: game.id,
        title: game.title,
        coverImageUrl: game.cover_image_url,
        data: filledData,
      });
    }

    return result;
  } catch (error) {
    logger.error(`获取游戏趋势失败: ${error}`);
    return [];
  }
};

/**
 * 获取搜索趋势数据
 *
 * 基于 search_logs 表统计每日搜索总量和独立搜索词数量。
 * 对无数据的日期用 0 填充以保证数据连续性。
 *
 * @param days 趋势天数范围，默认为 30 天
 * @returns 每日搜索趋势数组，包含总搜索量和独立查询数
 */
export const getSearchTrends = async (
  days: number = 30
): Promise<Array<{ date: string; totalSearches: number; uniqueQueries: number }>> => {
  try {
    const results = await query(
      `SELECT date(created_at) as date,
              COUNT(*) as total_searches,
              COUNT(DISTINCT query) as unique_queries
       FROM search_logs
       WHERE created_at >= datetime('now', ?)
       GROUP BY date(created_at)
       ORDER BY date ASC`,
      [`-${days} days`]
    );

    // 构建日期到数据的映射
    const dataMap = new Map<string, { total: number; unique: number }>();
    for (const r of results) {
      dataMap.set(r.date, { total: r.total_searches, unique: r.unique_queries });
    }

    // 逐日填充数据（含无数据的日期）
    const filledData: Array<{ date: string; totalSearches: number; uniqueQueries: number }> = [];
    const now = new Date();

    for (let i = days; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const existing = dataMap.get(dateStr);
      filledData.push({
        date: dateStr,
        totalSearches: existing?.total || 0,
        uniqueQueries: existing?.unique || 0,
      });
    }

    return filledData;
  } catch (error) {
    logger.warn(`获取搜索趋势失败: ${error}`);
    return [];
  }
};

/**
 * 获取游戏平台分布统计
 *
 * 解析所有游戏的 platforms 字段，统计各平台的游戏数量及占比。
 *
 * @returns 平台分布列表，按游戏数量降序排列
 */
export const getPlatformDistribution = async (): Promise<DistributionItem[]> => {
  try {
    const games = await query(`SELECT platforms FROM games`, []);

    const platformCount = new Map<string, number>();
    let total = 0;

    // 遍历游戏，解析 platforms 并计数
    for (const game of games) {
      let platforms: string[] = [];
      try {
        platforms = typeof game.platforms === 'string'
          ? JSON.parse(game.platforms)
          : (game.platforms || []);
      } catch { /* 忽略解析失败的行 */ }

      for (const p of platforms) {
        platformCount.set(p, (platformCount.get(p) || 0) + 1);
      }
      total++;
    }

    // 转换为数组格式，计算百分比（保留一位小数）
    const result: DistributionItem[] = [];
    for (const [name, count] of platformCount) {
      result.push({
        name,
        count,
        percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      });
    }

    return result.sort((a, b) => b.count - a.count);
  } catch (error) {
    logger.error(`获取平台分布失败: ${error}`);
    return [];
  }
};

/**
 * 获取游戏类型分布统计
 *
 * 解析所有游戏的 genres 字段，统计各类型的游戏数量及占比。
 *
 * @returns 类型分布列表，按游戏数量降序排列
 */
export const getGenreDistribution = async (): Promise<DistributionItem[]> => {
  try {
    const games = await query(`SELECT genres FROM games`, []);

    const genreCount = new Map<string, number>();
    let total = 0;

    // 遍历游戏，解析 genres 并计数
    for (const game of games) {
      let genres: string[] = [];
      try {
        genres = typeof game.genres === 'string'
          ? JSON.parse(game.genres)
          : (game.genres || []);
      } catch { /* 忽略解析失败的行 */ }

      for (const g of genres) {
        genreCount.set(g, (genreCount.get(g) || 0) + 1);
      }
      total++;
    }

    // 转换为数组格式，计算百分比（保留一位小数）
    const result: DistributionItem[] = [];
    for (const [name, count] of genreCount) {
      result.push({
        name,
        count,
        percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      });
    }

    return result.sort((a, b) => b.count - a.count);
  } catch (error) {
    logger.error(`获取类型分布失败: ${error}`);
    return [];
  }
};

/**
 * 获取社区统计摘要
 *
 * 返回平台整体的核心统计数据，包括：
 * - 用户、游戏、评测、帖子、评论的总数
 * - 今日新增用户、评测和帖子数
 * - 近 7 天活跃用户数
 *
 * @returns 社区统计数据摘要对象
 */
export const getCommunitySummary = async (): Promise<CommunitySummary> => {
  try {
    // 各实体总数查询
    const [userCount] = await query(`SELECT COUNT(*) as total FROM users`, []);
    const [gameCount] = await query(`SELECT COUNT(*) as total FROM games`, []);
    const [reviewCount] = await query(`SELECT COUNT(*) as total FROM reviews`, []);
    const [postCount] = await query(`SELECT COUNT(*) as total FROM community_posts`, []);
    const [commentCount] = await query(`SELECT COUNT(*) as total FROM comments`, []);

    // 今日新增数据
    const [newUsers] = await query(
      `SELECT COUNT(*) as total FROM users WHERE created_at >= datetime('now', '-1 day')`, []
    );
    const [newReviews] = await query(
      `SELECT COUNT(*) as total FROM reviews WHERE published_at >= datetime('now', '-1 day')`, []
    );
    const [newPosts] = await query(
      `SELECT COUNT(*) as total FROM community_posts WHERE published_at >= datetime('now', '-1 day')`, []
    );

    // 近 7 天活跃用户数（去重登录用户）
    const [activeUsers] = await query(
      `SELECT COUNT(DISTINCT user_id) as total FROM login_logs WHERE login_time >= datetime('now', '-7 days')`, []
    );

    return {
      totalUsers: Number(userCount?.total || 0),
      totalGames: Number(gameCount?.total || 0),
      totalReviews: Number(reviewCount?.total || 0),
      totalPosts: Number(postCount?.total || 0),
      totalComments: Number(commentCount?.total || 0),
      newUsersToday: Number(newUsers?.total || 0),
      newReviewsToday: Number(newReviews?.total || 0),
      newPostsToday: Number(newPosts?.total || 0),
      activeUsers: Number(activeUsers?.total || 0),
    };
  } catch (error) {
    logger.error(`获取社区统计失败: ${error}`);
    return {
      totalUsers: 0, totalGames: 0, totalReviews: 0,
      totalPosts: 0, totalComments: 0,
      newUsersToday: 0, newReviewsToday: 0, newPostsToday: 0,
      activeUsers: 0,
    };
  }
};

export default {
  getLeaderboard,
  getGameTrends,
  getSearchTrends,
  getPlatformDistribution,
  getGenreDistribution,
  getCommunitySummary,
};
