/**
 * 游戏化功能路由模块
 *
 * 本模块负责处理用户游戏化系统相关的所有 HTTP 路由，包括：
 * - 获取当前用户 XP/积分/等级统计
 * - 获取 XP 历史记录
 * - 获取积分历史记录
 * - 获取排行榜数据（按 XP、等级、积分、成就等维度）
 *
 * 统计和历史接口均需要用户登录（authenticate），
 * 排行榜接口可选择是否传入用户身份（optionalAuthenticate），
 * 分页接口使用 paginationSchema 进行参数验证。
 */

import { Router, Request, Response } from 'express';
import { authenticate, optionalAuthenticate, validateRequest } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import { paginationSchema } from '../validators';
import xpService from '../services/xp.service';
import levelService from '../services/level.service';
import leaderboardService from '../services/leaderboard.service';

const router = Router();

/**
 * @route GET /api/v1/gamification/stats
 * @desc 获取当前用户游戏化统计数据 - 包含 XP、等级、积分等综合信息
 * @access Private（需要登录认证）
 *
 * @returns {200} { success: true, data: { xpStats, levelProgress, ... }, message: '获取成功' }
 *
 * @description
 * 返回的数据合并了 XP 统计（总经验值、当前经验值等）和等级进度（当前等级、
 * 下一级所需经验、进度百分比等）信息。
 */
router.get(
  '/stats',
  authenticate,              // 身份验证中间件：确保用户已登录
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const xpStats = await xpService.getXpStats(userId);
    const levelProgress = await levelService.getLevelProgress(userId);

    res.json({
      success: true,
      data: {
        ...xpStats,
        ...levelProgress,
      },
      message: '获取成功',
    });
  }),
);

/**
 * @route GET /api/v1/gamification/xp/history
 * @desc 获取当前用户的 XP 历史记录 - 分页查询经验值获取/消耗记录
 * @access Private（需要登录认证）
 *
 * @query {number} [page=1]   - 页码，默认第1页
 * @query {number} [limit=20] - 每页数量，默认20
 *
 * @returns {200} { success: true, data: { items, pagination }, message: '获取成功' }
 */
router.get(
  '/xp/history',
  authenticate,              // 身份验证中间件：确保用户已登录
  validateRequest(paginationSchema),  // 分页参数验证中间件：校验 page 和 limit 格式
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { page = 1, limit = 20 } = req.query;
    const result = await xpService.getXpHistory(userId, {
      page: Number(page),
      limit: Number(limit),
    });

    const totalPages = Math.ceil(result.total / result.limit);

    res.json({
      success: true,
      data: {
        items: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages,
          hasNext: result.page < totalPages,
          hasPrev: result.page > 1,
        },
      },
      message: '获取成功',
    });
  }),
);

/**
 * @route GET /api/v1/gamification/points/history
 * @desc 获取当前用户的积分历史记录 - 分页查询积分获取/消费记录
 * @access Private（需要登录认证）
 *
 * @query {number} [page=1]   - 页码，默认第1页
 * @query {number} [limit=20] - 每页数量，默认20
 *
 * @returns {200} { success: true, data: { items, pagination }, message: '获取成功' }
 */
router.get(
  '/points/history',
  authenticate,              // 身份验证中间件：确保用户已登录
  validateRequest(paginationSchema),  // 分页参数验证中间件：校验 page 和 limit 格式
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { page = 1, limit = 20 } = req.query;
    const result = await xpService.getPointHistory(userId, {
      page: Number(page),
      limit: Number(limit),
    });

    const totalPages = Math.ceil(result.total / result.limit);

    res.json({
      success: true,
      data: {
        items: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages,
          hasNext: result.page < totalPages,
          hasPrev: result.page > 1,
        },
      },
      message: '获取成功',
    });
  }),
);

/**
 * @route GET /api/v1/gamification/leaderboard/:type
 * @desc 获取用户排行榜 - 按指定维度查询全站用户排名
 * @access Public（公开接口，可选择是否传入用户身份）
 *
 * @param {string} req.params.type - 排行榜类型，可选值: xp | level | points | achievements
 * @query {number} [limit=20] - 每页数量，默认20
 * @query {number} [page=1]   - 页码，默认第1页
 *
 * @returns {200} { success: true, data: { items, pagination }, message: '获取成功' }
 * @returns {400} { success: false, error: '无效的排行榜类型: ...' } - 不支持的排行榜类型
 */
router.get(
  '/leaderboard/:type',
  optionalAuthenticate,      // 可选身份验证：如果提供了token则解析用户身份，否则为null
  asyncHandler(async (req: Request, res: Response) => {
    const { type } = req.params;
    const limit = Number(req.query.limit) || 20;
    const page = Number(req.query.page) || 1;

    // 验证排行榜类型参数是否在允许范围内
    const validTypes = ['xp', 'level', 'points', 'achievements'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `无效的排行榜类型: ${type}，有效类型: ${validTypes.join(', ')}`,
      });
    }

    const result = await leaderboardService.getUserLeaderboard(
      type as 'xp' | 'level' | 'points' | 'achievements',
      limit,
      page,
    );

    const totalPages = Math.ceil(result.total / result.limit);

    res.json({
      success: true,
      data: {
        items: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages,
          hasNext: result.page < totalPages,
          hasPrev: result.page > 1,
        },
      },
      message: '获取成功',
    });
  }),
);

export default router;
