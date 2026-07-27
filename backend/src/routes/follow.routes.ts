/**
 * 用户关注功能路由模块
 *
 * 本模块负责处理用户之间的关注关系相关的所有 HTTP 路由，包括：
 * - 关注/取消关注用户
 * - 获取关注者列表（粉丝）
 * - 获取正在关注列表（关注的人）
 * - 检查关注状态
 * - 获取关注统计信息
 * - 获取共同关注
 *
 * 关注操作需要用户登录（authenticate），
 * 列表查询可选择是否传入用户身份（optionalAuthenticate），
 * 部分列表接口使用 paginationSchema 进行分页参数验证。
 */

import { Router, Request, Response } from 'express';
import { authenticate, optionalAuthenticate, validateRequest } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import { paginationSchema } from '../validators';
import followService from '../services/follow.service';

const router = Router();

/**
 * @route POST /api/v1/follow/:userId
 * @desc 关注用户 - 当前用户关注指定用户
 * @access Private（需要登录认证）
 *
 * @param {string} req.params.userId - 要关注的用户ID
 *
 * @returns {201} { success: true, data: follow, message: '关注成功' }
 * @returns {401} { success: false, error: '用户未认证' } - 未提供用户认证信息
 */
router.post(
  '/:userId',
  authenticate,              // 身份验证中间件：确保用户已登录
  asyncHandler(async (req: Request, res: Response) => {
    const { userId: followingId } = req.params;
    const followerId = req.user?.id;

    if (!followerId) {
      return res.status(401).json({
        success: false,
        error: '用户未认证',
      });
    }

    const follow = await followService.followUser(followerId, followingId);

    res.status(201).json({
      success: true,
      data: follow,
      message: '关注成功',
    });
  })
);

/**
 * @route DELETE /api/v1/follow/:userId
 * @desc 取消关注用户 - 当前用户取消对指定用户的关注
 * @access Private（需要登录认证）
 *
 * @param {string} req.params.userId - 要取消关注的用户ID
 *
 * @returns {200} { success: true, data: { unfollowed: boolean }, message: '取消关注成功' }
 * @returns {401} { success: false, error: '用户未认证' } - 未提供用户认证信息
 */
router.delete(
  '/:userId',
  authenticate,              // 身份验证中间件：确保用户已登录
  asyncHandler(async (req: Request, res: Response) => {
    const { userId: followingId } = req.params;
    const followerId = req.user?.id;

    if (!followerId) {
      return res.status(401).json({
        success: false,
        error: '用户未认证',
      });
    }

    const success = await followService.unfollowUser(followerId, followingId);

    res.json({
      success: true,
      data: { unfollowed: success },
      message: '取消关注成功',
    });
  })
);

/**
 * @route GET /api/v1/follow/followers
 * @desc 获取用户的关注者列表（粉丝）- 支持分页查询
 * @access Public（公开接口，可选择是否传入用户身份以获取交互状态）
 *
 * @query {string} [userId]   - 目标用户ID，不传则使用当前登录用户ID
 * @query {number} [page=1]   - 页码，默认第1页
 * @query {number} [limit=20] - 每页数量，默认20
 *
 * @returns {200} { success: true, data: { userId, followers, pagination }, message: '关注者列表获取成功' }
 * @returns {400} { success: false, error: 'userId参数未提供且用户未登录' }
 */
router.get(
  '/followers',
  optionalAuthenticate,      // 可选身份验证：如果提供了token则解析用户身份，否则为null
  validateRequest(paginationSchema),  // 分页参数验证中间件：校验 page 和 limit 格式
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, page = 1, limit = 20 } = req.query;
    const currentUserId = req.user?.id;

    // 如果未提供userId，使用当前登录用户的ID
    const targetUserId = (userId as string) || currentUserId;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: 'userId参数未提供且用户未登录',
      });
    }

    const { followers, total, page: currentPage, limit: currentLimit } = await followService.getFollowers(targetUserId, {
      page: Number(page),
      limit: Number(limit),
    });

    const totalPages = Math.ceil(total / currentLimit);

    res.json({
      success: true,
      data: {
        userId: targetUserId,
        followers,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          total,
          totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
        },
      },
      message: '关注者列表获取成功',
    });
  })
);

/**
 * @route GET /api/v1/follow/following
 * @desc 获取用户正在关注的列表 - 支持分页查询
 * @access Public（公开接口，可选择是否传入用户身份以获取交互状态）
 *
 * @query {string} [userId]   - 目标用户ID，不传则使用当前登录用户ID
 * @query {number} [page=1]   - 页码，默认第1页
 * @query {number} [limit=20] - 每页数量，默认20
 *
 * @returns {200} { success: true, data: { userId, following, pagination }, message: '正在关注列表获取成功' }
 * @returns {400} { success: false, error: 'userId参数未提供且用户未登录' }
 */
router.get(
  '/following',
  optionalAuthenticate,      // 可选身份验证：如果提供了token则解析用户身份，否则为null
  validateRequest(paginationSchema),  // 分页参数验证中间件：校验 page 和 limit 格式
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, page = 1, limit = 20 } = req.query;
    const currentUserId = req.user?.id;

    // 如果未提供userId，使用当前登录用户的ID
    const targetUserId = (userId as string) || currentUserId;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: 'userId参数未提供且用户未登录',
      });
    }

    const { following, total, page: currentPage, limit: currentLimit } = await followService.getFollowing(targetUserId, {
      page: Number(page),
      limit: Number(limit),
    });

    const totalPages = Math.ceil(total / currentLimit);

    res.json({
      success: true,
      data: {
        userId: targetUserId,
        following,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          total,
          totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
        },
      },
      message: '正在关注列表获取成功',
    });
  })
);

/**
 * @route GET /api/v1/follow/status/:userId
 * @desc 检查关注状态 - 查询当前用户是否关注了指定用户
 * @access Private（需要登录认证）
 *
 * @param {string} req.params.userId - 要检查的目标用户ID
 *
 * @returns {200} { success: true, data: { isFollowing: boolean }, message: '关注状态获取成功' }
 * @returns {401} { success: false, error: '用户未认证' }
 */
router.get(
  '/status/:userId',
  authenticate,              // 身份验证中间件：确保用户已登录
  asyncHandler(async (req: Request, res: Response) => {
    const { userId: followingId } = req.params;
    const followerId = req.user?.id;

    if (!followerId) {
      return res.status(401).json({
        success: false,
        error: '用户未认证',
      });
    }

    const isFollowing = await followService.checkFollowStatus(followerId, followingId);

    res.json({
      success: true,
      data: { isFollowing },
      message: '关注状态获取成功',
    });
  })
);

/**
 * @route GET /api/v1/follow/stats
 * @desc 获取关注统计信息 - 查询指定用户的关注数和粉丝数
 * @access Public（公开接口，可选择是否传入用户身份）
 *
 * @query {string} [userId] - 目标用户ID，不传则使用当前登录用户ID
 *
 * @returns {200} { success: true, data: stats, message: '关注统计信息获取成功' }
 * @returns {400} { success: false, error: 'userId参数未提供且用户未登录' }
 */
router.get(
  '/stats',
  optionalAuthenticate,      // 可选身份验证：如果提供了token则解析用户身份，否则为null
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.query;
    const currentUserId = req.user?.id;

    // 如果未提供userId，使用当前登录用户的ID
    const targetUserId = (userId as string) || currentUserId;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: 'userId参数未提供且用户未登录',
      });
    }

    const stats = await followService.getFollowStats(targetUserId);

    res.json({
      success: true,
      data: stats,
      message: '关注统计信息获取成功',
    });
  })
);

/**
 * @route GET /api/v1/follow/mutual/:userId
 * @desc 获取共同关注 - 查询当前用户和指定用户之间共同关注的人
 * @access Private（需要登录认证）
 *
 * @param {string} req.params.userId - 另一个用户的ID
 *
 * @returns {200} { success: true, data: { userId1, userId2, mutualFollows, count }, message: '共同关注获取成功' }
 * @returns {401} { success: false, error: '用户未认证' }
 */
router.get(
  '/mutual/:userId',
  authenticate,              // 身份验证中间件：确保用户已登录
  asyncHandler(async (req: Request, res: Response) => {
    const { userId: otherUserId } = req.params;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        error: '用户未认证',
      });
    }

    const mutualFollows = await followService.getMutualFollows(currentUserId, otherUserId);

    res.json({
      success: true,
      data: {
        userId1: currentUserId,
        userId2: otherUserId,
        mutualFollows,
        count: mutualFollows.length,
      },
      message: '共同关注获取成功',
    });
  })
);

/**
 * @route GET /api/v1/follow/:userId/followers
 * @desc 获取指定用户的关注者列表（路径参数别名）- 通过路径参数指定用户，支持分页
 * @access Public（公开接口，可选择是否传入用户身份）
 *
 * @param {string} req.params.userId - 目标用户ID（路径参数）
 * @query {number} [page=1]   - 页码，默认第1页
 * @query {number} [limit=20] - 每页数量，默认20
 *
 * @returns {200} { success: true, data: { followers, pagination } }
 */
router.get(
  '/:userId/followers',
  optionalAuthenticate,      // 可选身份验证：如果提供了token则解析用户身份，否则为null
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const currentUserId = req.user?.id;

    const { followers, total, page: currentPage, limit: currentLimit } = await followService.getFollowers(userId, {
      page: Number(page),
      limit: Number(limit),
    });

    return res.json({
      success: true,
      data: { followers, pagination: { total, page: currentPage, limit: currentLimit } },
    });
  })
);

/**
 * @route GET /api/v1/follow/:userId/following
 * @desc 获取指定用户的关注列表（路径参数别名）- 通过路径参数指定用户，支持分页
 * @access Public（公开接口，可选择是否传入用户身份）
 *
 * @param {string} req.params.userId - 目标用户ID（路径参数）
 * @query {number} [page=1]   - 页码，默认第1页
 * @query {number} [limit=20] - 每页数量，默认20
 *
 * @returns {200} { success: true, data: { following, pagination } }
 */
router.get(
  '/:userId/following',
  optionalAuthenticate,      // 可选身份验证：如果提供了token则解析用户身份，否则为null
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const currentUserId = req.user?.id;

    const { following, total, page: currentPage, limit: currentLimit } = await followService.getFollowing(userId, {
      page: Number(page),
      limit: Number(limit),
    });

    return res.json({
      success: true,
      data: { following, pagination: { total, page: currentPage, limit: currentLimit } },
    });
  })
);

export default router;
