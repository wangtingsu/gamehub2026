/**
 * 管理端数据统计分析路由模块
 *
 * 本模块提供管理后台所需的所有数据分析和统计接口，包括：
 * - 用户增长趋势分析（日/周/月）
 * - 游戏热度排行榜
 * - 内容参与度分析
 * - 平台和类型分布统计
 * - 活跃用户分析
 * - Dashboard 综合统计
 * - 审计日志统计
 *
 * 所有接口均需管理员身份验证（adminAuthenticate 中间件全局应用）
 *
 * @module routes/admin-analytics
 */

import { Router, Request, Response } from 'express';
import { adminAuthenticate } from '../middlewares/admin-auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import {
  getUserGrowthTrend,
  getGamePopularity,
  getContentEngagement,
  getPlatformDistribution,
  getGenreDistribution,
  getActiveUsers,
  getDashboardStats,
  getAuditLogStats,
} from '../services/analytics.service';

const router = Router();

// 全局应用管理员身份验证中间件，以下所有路由均需管理员权限
router.use(adminAuthenticate);

/**
 * 获取用户增长趋势数据
 *
 * @route GET /api/v1/admin/analytics/user-growth
 * @access Private/Admin — 通过 router.use(adminAuthenticate) 全局保护
 * @query {string} [period=daily] - 统计周期，可选值: 'daily' | 'weekly' | 'monthly'
 * @query {number} [days=30] - 统计天数范围，最大 365 天
 * @returns {Object} 包含每日/每周/每月新增用户数据的 JSON 响应
 */
router.get('/analytics/user-growth', asyncHandler(async (req: Request, res: Response) => {
  const period = (req.query.period as 'daily' | 'weekly' | 'monthly') || 'daily';
  const days = Math.min(parseInt(req.query.days as string) || 30, 365);

  const data = await getUserGrowthTrend(period, days);
  res.json({ success: true, data });
}));

/**
 * 获取游戏热度排行榜
 *
 * @route GET /api/v1/admin/analytics/game-popularity
 * @access Private/Admin
 * @query {string} [sortBy=rating] - 排序依据，可选值: 'rating' | 'reviews' | 'engagement'
 * @query {number} [limit=10] - 返回数量上限，最大 100
 * @returns {Object} 包含按热度排序的游戏列表的 JSON 响应
 */
router.get('/analytics/game-popularity', asyncHandler(async (req: Request, res: Response) => {
  const sortBy = (req.query.sortBy as 'rating' | 'reviews' | 'engagement') || 'rating';
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);

  const data = await getGamePopularity(sortBy, limit);
  res.json({ success: true, data });
}));

/**
 * 获取内容参与度分析数据
 *
 * @route GET /api/v1/admin/analytics/content-engagement
 * @access Private/Admin
 * @query {number} [days=30] - 统计天数范围，最大 365 天
 * @returns {Object} 包含内容参与度指标的 JSON 响应
 */
router.get('/analytics/content-engagement', asyncHandler(async (req: Request, res: Response) => {
  const days = Math.min(parseInt(req.query.days as string) || 30, 365);

  const data = await getContentEngagement(days);
  res.json({ success: true, data });
}));

/**
 * 获取平台分布和游戏类型分布的统计
 *
 * @route GET /api/v1/admin/analytics/distributions
 * @access Private/Admin
 * @returns {Object} 同时包含 platform 和 genre 分布数据的 JSON 响应
 */
router.get('/analytics/distributions', asyncHandler(async (req: Request, res: Response) => {
  const [platforms, genres] = await Promise.all([
    getPlatformDistribution(),
    getGenreDistribution(),
  ]);

  res.json({ success: true, data: { platforms, genres } });
}));

/**
 * 获取活跃用户分析数据
 *
 * @route GET /api/v1/admin/analytics/active-users
 * @access Private/Admin
 * @query {number} [days=30] - 统计天数范围，最大 365 天
 * @returns {Object} 包含活跃用户分析数据的 JSON 响应
 */
router.get('/analytics/active-users', asyncHandler(async (req: Request, res: Response) => {
  const days = Math.min(parseInt(req.query.days as string) || 30, 365);

  const data = await getActiveUsers(days);
  res.json({ success: true, data });
}));

/**
 * 获取 Dashboard 综合统计数据
 * 返回管理后台首页展示所需的各项关键指标数据
 *
 * @route GET /api/v1/admin/analytics/dashboard
 * @access Private/Admin
 * @returns {Object} 包含多种统计数据（用户数、游戏数、访问量等）的 JSON 响应
 */
router.get('/analytics/dashboard', asyncHandler(async (req: Request, res: Response) => {
  const data = await getDashboardStats();
  res.json({ success: true, data });
}));

/**
 * 获取审计日志统计数据
 *
 * @route GET /api/v1/admin/analytics/audit-log-stats
 * @access Private/Admin
 * @query {number} [days=30] - 统计天数范围，最大 365 天
 * @returns {Object} 包含审计日志统计数据的 JSON 响应
 */
router.get('/analytics/audit-log-stats', asyncHandler(async (req: Request, res: Response) => {
  const days = Math.min(parseInt(req.query.days as string) || 30, 365);

  const data = await getAuditLogStats(days);
  res.json({ success: true, data });
}));

export default router;
