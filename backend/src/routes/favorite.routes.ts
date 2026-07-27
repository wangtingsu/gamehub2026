/**
 * 收藏功能路由模块
 *
 * 本模块负责处理用户收藏游戏相关的所有 HTTP 路由，包括：
 * - 添加/取消收藏游戏
 * - 获取用户的收藏列表
 * - 检查收藏状态（单个/批量）
 * - 获取收藏统计信息（管理员）
 * - 获取游戏的收藏数
 * - 收藏服务健康检查
 *
 * 所有需要登录的路由均通过 authenticate 中间件进行身份验证，
 * 管理员接口通过 authorize('admin') 进行权限控制。
 */

import { Router, Request, Response } from 'express';
import { authenticate, authorize, validateRequest } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import favoriteService from '../services/favorite.service';
import { favoriteModel } from '../models/Favorite';

const router = Router();

/**
 * @route POST /api/v1/favorites
 * @desc 添加收藏 - 将指定游戏添加到当前用户的收藏列表
 * @access Private（需要登录认证）
 *
 * @param {Object} req.body - 请求体
 * @param {string} req.body.gameId - 要收藏的游戏ID（必填）
 *
 * @returns {201} { success: true, data: { favorite }, message: '收藏成功' }
 * @returns {400} { success: false, error: '游戏ID不能为空' } - 未提供游戏ID
 */
router.post(
  '/',
  authenticate,              // 身份验证中间件：确保用户已登录
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { gameId } = req.body;

    if (!gameId) {
      return res.status(400).json({
        success: false,
        error: '游戏ID不能为空',
      });
    }

    const favorite = await favoriteService.addFavorite(userId, gameId);

    return res.status(201).json({
      success: true,
      data: {
        favorite,
      },
      message: '收藏成功',
    });
  })
);

/**
 * @route DELETE /api/v1/favorites/:gameId
 * @desc 取消收藏 - 从当前用户的收藏列表中移除指定游戏
 * @access Private（需要登录认证）
 *
 * @param {string} req.params.gameId - 要取消收藏的游戏ID（路径参数）
 *
 * @returns {200} { success: true, message: '取消收藏成功' }
 * @returns {404} { success: false, error: '收藏记录不存在' } - 未找到对应收藏记录
 */
router.delete(
  '/:gameId',
  authenticate,              // 身份验证中间件：确保用户已登录
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { gameId } = req.params;

    const result = await favoriteService.removeFavorite(userId, gameId);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: '收藏记录不存在',
      });
    }

    return res.json({
      success: true,
      message: '取消收藏成功',
    });
  })
);

/**
 * @route GET /api/v1/favorites
 * @desc 获取用户的收藏列表 - 分页查询当前用户收藏的所有游戏
 * @access Private（需要登录认证）
 *
 * @query {number} [limit=20]  - 每页数量，默认20
 * @query {number} [offset=0]  - 偏移量，用于分页
 * @query {string} [orderBy='created_at'] - 排序字段，可选 'created_at' | 'game_id'
 * @query {string} [orderDirection='DESC'] - 排序方向，可选 'ASC' | 'DESC'
 *
 * @returns {200} { success: true, data: { favorites, pagination }, message: '获取收藏列表成功' }
 */
router.get(
  '/',
  authenticate,              // 身份验证中间件：确保用户已登录
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { limit = 20, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = req.query;

    // 查询收藏列表（含分页和排序参数）
    const favorites = await favoriteService.getUserFavorites(userId, {
      limit: Number(limit),
      offset: Number(offset),
      orderBy: orderBy as 'created_at' | 'game_id',
      orderDirection: orderDirection as 'ASC' | 'DESC',
    });

    // 获取收藏总数
    const total = await favoriteService.getUserFavoriteCount(userId);

    return res.json({
      success: true,
      data: {
        favorites,
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
          total,
          hasMore: Number(offset) + Number(limit) < total,
        },
      },
      message: '获取收藏列表成功',
    });
  })
);

/**
 * @route GET /api/v1/favorites/check/:gameId
 * @desc 检查是否已收藏 - 查询当前用户是否收藏了指定游戏
 * @access Private（需要登录认证）
 *
 * @param {string} req.params.gameId - 要检查的游戏ID
 *
 * @returns {200} { success: true, data: { gameId, isFavorited }, message: '已收藏' | '未收藏' }
 */
router.get(
  '/check/:gameId',
  authenticate,              // 身份验证中间件：确保用户已登录
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { gameId } = req.params;

    const isFavorited = await favoriteService.checkFavoriteStatus(userId, gameId);

    return res.json({
      success: true,
      data: {
        gameId,
        isFavorited,
      },
      message: isFavorited ? '已收藏' : '未收藏',
    });
  })
);

/**
 * @route POST /api/v1/favorites/batch-check
 * @desc 批量检查收藏状态 - 同时查询多个游戏的收藏状态
 * @access Private（需要登录认证）
 *
 * @param {Object} req.body - 请求体
 * @param {string[]} req.body.gameIds - 要检查的游戏ID数组（必填）
 *
 * @returns {200} { success: true, data: { statusMap }, message: '批量检查完成' }
 * @returns {400} { success: false, error: '游戏ID列表不能为空' } - gameIds无效
 */
router.post(
  '/batch-check',
  authenticate,              // 身份验证中间件：确保用户已登录
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { gameIds } = req.body;

    // 验证 gameIds 参数必须是数组且不为空
    if (!gameIds || !Array.isArray(gameIds)) {
      return res.status(400).json({
        success: false,
        error: '游戏ID列表不能为空',
      });
    }

    const statusMap = await favoriteService.batchCheckFavoriteStatus(userId, gameIds);

    return res.json({
      success: true,
      data: {
        statusMap,
      },
      message: '批量检查完成',
    });
  })
);

/**
 * @route GET /api/v1/favorites/stats
 * @desc 获取收藏统计信息 - 全站收藏数据的统计概览（仅管理员可用）
 * @access Private/Admin（需要登录认证且为管理员角色）
 *
 * @returns {200} { success: true, data: { stats }, message: '获取收藏统计信息成功' }
 */
router.get(
  '/stats',
  authenticate,              // 身份验证中间件：确保用户已登录
  authorize('admin'),        // 权限控制中间件：仅管理员可访问
  asyncHandler(async (req: Request, res: Response) => {
    const stats = await favoriteService.getFavoriteStats();

    return res.json({
      success: true,
      data: {
        stats,
      },
      message: '获取收藏统计信息成功',
    });
  })
);

/**
 * @route GET /api/v1/favorites/count/:gameId
 * @desc 获取游戏的收藏数 - 不需要登录即可查询
 * @access Public（公开接口，无需认证）
 *
 * @param {string} req.params.gameId - 目标游戏ID
 *
 * @returns {200} { success: true, data: { gameId, count }, message: '获取收藏数成功' }
 */
router.get(
  '/count/:gameId',
  asyncHandler(async (req: Request, res: Response) => {
    const { gameId } = req.params;

    const count = await favoriteService.getGameFavoriteCount(gameId);

    return res.json({
      success: true,
      data: {
        gameId,
        count,
      },
      message: '获取收藏数成功',
    });
  })
);

/**
 * @route GET /api/v1/favorites/ids
 * @desc 获取用户收藏的游戏ID列表 - 返回当前用户所有收藏游戏的ID数组
 * @access Private（需要登录认证）
 *
 * @returns {200} { success: true, data: { gameIds }, message: '获取收藏游戏ID列表成功' }
 */
router.get(
  '/ids',
  authenticate,              // 身份验证中间件：确保用户已登录
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;

    const gameIds = await favoriteService.getUserFavoriteGameIds(userId);

    return res.json({
      success: true,
      data: {
        gameIds,
      },
      message: '获取收藏游戏ID列表成功',
    });
  })
);

/**
 * @route GET /api/v1/favorites/health
 * @desc 收藏服务健康检查 - 通过查询数据库验证服务是否正常运行
 * @access Public（公开接口，无需认证）
 *
 * @returns {200} { success: true, data: { service: 'favorites', status: 'healthy' }, message: '收藏服务运行正常' }
 * @returns {503} { success: false, error: '收藏服务异常', data: { status: 'unhealthy' } } - 数据库查询失败
 */
router.get(
  '/health',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      // 简单的健康检查：尝试查询数据库
      await favoriteModel.getFavoriteStats();

      return res.json({
        success: true,
        data: {
          service: 'favorites',
          status: 'healthy',
          timestamp: new Date().toISOString(),
        },
        message: '收藏服务运行正常',
      });
    } catch (error) {
      return res.status(503).json({
        success: false,
        error: '收藏服务异常',
        data: {
          service: 'favorites',
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
        },
      });
    }
  })
);

export default router;
