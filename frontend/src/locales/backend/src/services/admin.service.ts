import { query } from '../db';
import logger from '../utils/logger';

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  totalGames: number;
  totalReviews: number;
  totalNews: number;
  totalComments: number;
  totalFavorites: number;
  revenue: number;
  growthRate: number;
}

// 获取管理统计信息
export const getAdminStats = async (): Promise<AdminStats> => {
  try {
    // 并行执行所有统计查询
    const [
      totalUsersResult,
      activeUsersResult,
      newUsersTodayResult,
      totalGamesResult,
      totalReviewsResult,
      totalNewsResult,
      totalCommentsResult,
      totalFavoritesResult,
    ] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users'),
      query('SELECT COUNT(*) as count FROM users WHERE status = ?', ['active']),
      query('SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = DATE(CURRENT_TIMESTAMP)'),
      query('SELECT COUNT(*) as count FROM games'),
      query('SELECT COUNT(*) as count FROM reviews'),
      query('SELECT COUNT(*) as count FROM news'),
      query('SELECT COUNT(*) as count FROM comments'),
      query('SELECT COUNT(*) as count FROM favorites'),
    ]);

    // 提取计数
    const totalUsers = parseInt(totalUsersResult[0]?.count || 0);
    const activeUsers = parseInt(activeUsersResult[0]?.count || 0);
    const newUsersToday = parseInt(newUsersTodayResult[0]?.count || 0);
    const totalGames = parseInt(totalGamesResult[0]?.count || 0);
    const totalReviews = parseInt(totalReviewsResult[0]?.count || 0);
    const totalNews = parseInt(totalNewsResult[0]?.count || 0);
    const totalComments = parseInt(totalCommentsResult[0]?.count || 0);
    const totalFavorites = parseInt(totalFavoritesResult[0]?.count || 0);

    // 计算收入（模拟数据，实际应从订单表获取）
    const revenueResult = await query('SELECT SUM(price) as revenue FROM games');
    const revenue = parseFloat(revenueResult[0]?.revenue || 0) * 0.3; // 假设30%分成

    // 计算增长率（模拟数据，实际应基于历史数据计算）
    const growthRate = 15.3; // 模拟增长率

    const stats: AdminStats = {
      totalUsers,
      activeUsers,
      newUsersToday,
      totalGames,
      totalReviews,
      totalNews,
      totalComments,
      totalFavorites,
      revenue,
      growthRate,
    };

    logger.debug('管理统计信息获取成功');
    return stats;
  } catch (error) {
    logger.error('获取管理统计信息失败:', error);
    throw error;
  }
};

export default {
  getAdminStats,
};