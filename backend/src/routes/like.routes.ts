/**
 * 点赞路由模块
 *
 * 本模块提供与点赞功能相关的所有 REST API 路由，包括：
 * - 点赞操作（创建点赞）
 * - 取消点赞（删除点赞）
 * - 查询点赞状态（检查用户是否已点赞）
 * - 获取目标对象的点赞列表（分页）
 * - 获取用户的点赞历史（分页）
 * - 获取点赞统计信息（点赞数、评论数等）
 *
 * 路由前缀: /api/v1/like
 * 认证策略: 部分路由需要登录（authenticate），部分支持可选登录（optionalAuthenticate）
 */

import { Router, Request, Response } from 'express';
import { authenticate, optionalAuthenticate, validateRequest } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import { paginationSchema } from '../validators';
import likeService from '../services/like.service';

const router = Router();

/**
 * @route POST /api/v1/like
 * @desc 对指定目标（评论、新闻、社区帖子、游戏等）进行点赞操作
 * @access Private — 需要用户登录认证
 *
 * @middleware authenticate - 验证用户 JWT Token，确保请求来自已登录用户
 *
 * @param {string} req.body.targetType - 点赞目标类型，可选值: 'review' | 'news' | 'community_post' | 'comment' | 'game'
 * @param {string} req.body.targetId - 点赞目标对象的唯一标识符（UUID 或数字 ID）
 *
 * @returns {201} { success: true, data: likeObject, message: '点赞成功' }
 * @returns {400} { success: false, error: '...' } — 参数缺失或 targetType 无效时返回
 * @returns {401} { success: false, error: '用户未认证' } — 未提供有效 Token 时返回
 * @returns {409} { success: false, error: '...' } — 重复点赞时由 likeService 返回冲突错误
 *
 * @example
 *   POST /api/v1/like
 *   Body: { "targetType": "review", "targetId": "123" }
 *   Response: { "success": true, "data": { "id": 1, "userId": "u1", "targetType": "review", "targetId": "123" }, "message": "点赞成功" }
 */
router.post(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { targetType, targetId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '用户未认证',
      });
    }

    if (!targetType || !targetId) {
      return res.status(400).json({
        success: false,
        error: 'targetType和targetId是必填字段',
      });
    }

    // 验证 targetType 是否在允许的范围内
    const validTargetTypes = ['review', 'news', 'community_post', 'comment', 'game'];
    if (!validTargetTypes.includes(targetType)) {
      return res.status(400).json({
        success: false,
        error: `无效的targetType，必须是: ${validTargetTypes.join(', ')}`,
      });
    }

    const like = await likeService.like(userId, targetType, targetId);

    res.status(201).json({
      success: true,
      data: like,
      message: '点赞成功',
    });
  })
);

/**
 * @route DELETE /api/v1/like
 * @desc 取消对指定目标的点赞
 * @access Private — 需要用户登录认证
 *
 * @middleware authenticate - 验证用户 JWT Token
 *
 * @param {string} req.body.targetType - 点赞目标类型，同 POST 路由
 * @param {string} req.body.targetId - 点赞目标对象 ID
 *
 * @returns {200} { success: true, data: { unliked: boolean }, message: '取消点赞成功' }
 * @returns {400} { success: false, error: '...' } — 参数缺失时返回
 * @returns {401} { success: false, error: '用户未认证' } — 未登录时返回
 *
 * @example
 *   DELETE /api/v1/like
 *   Body: { "targetType": "news", "targetId": "456" }
 */
router.delete(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { targetType, targetId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '用户未认证',
      });
    }

    if (!targetType || !targetId) {
      return res.status(400).json({
        success: false,
        error: 'targetType和targetId是必填字段',
      });
    }

    const success = await likeService.unlike(userId, targetType, targetId);

    res.json({
      success: true,
      data: { unliked: success },
      message: '取消点赞成功',
    });
  })
);

/**
 * @route GET /api/v1/like/status
 * @desc 查询当前登录用户是否已点赞指定目标对象
 * @access Private — 需要用户登录认证
 *
 * @middleware authenticate - 验证用户 JWT Token
 *
 * @param {string} req.query.targetType - 点赞目标类型
 * @param {string} req.query.targetId - 点赞目标对象 ID
 *
 * @returns {200} { success: true, data: { hasLiked: boolean }, message: '点赞状态获取成功' }
 * @returns {400} { success: false, error: '...' } — 查询参数缺失时返回
 * @returns {401} { success: false, error: '用户未认证' } — 未登录时返回
 *
 * @example
 *   GET /api/v1/like/status?targetType=review&targetId=123
 *   Response: { "success": true, "data": { "hasLiked": true } }
 */
router.get(
  '/status',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { targetType, targetId } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '用户未认证',
      });
    }

    if (!targetType || !targetId) {
      return res.status(400).json({
        success: false,
        error: 'targetType和targetId是必填参数',
      });
    }

    const hasLiked = await likeService.checkLikeStatus(userId, targetType as string, targetId as string);

    res.json({
      success: true,
      data: { hasLiked },
      message: '点赞状态获取成功',
    });
  })
);

/**
 * @route GET /api/v1/like/target
 * @desc 获取指定目标对象的点赞用户列表（支持分页）
 * @access Public — 可选登录，未登录用户也可查看，但结果中不包含当前用户的点赞状态
 *
 * @middleware optionalAuthenticate - 可选身份认证，如果提供了 Token 则解析用户信息
 * @middleware validateRequest(paginationSchema) - 验证分页参数 page 和 limit 的格式
 *
 * @param {string} req.query.targetType - 目标类型（必填）
 * @param {string} req.query.targetId - 目标 ID（必填）
 * @param {number} [req.query.page=1] - 页码，从 1 开始
 * @param {number} [req.query.limit=20] - 每页条数
 *
 * @returns {200} {
 *   success: true,
 *   data: {
 *     targetType, targetId,
 *     likes: Like[],
 *     pagination: { page, limit, total, totalPages, hasNext, hasPrev }
 *   },
 *   message: '点赞列表获取成功'
 * }
 *
 * @example
 *   GET /api/v1/like/target?targetType=game&targetId=789&page=1&limit=10
 */
router.get(
  '/target',
  optionalAuthenticate,
  validateRequest(paginationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { targetType, targetId, page = 1, limit = 20 } = req.query;

    if (!targetType || !targetId) {
      return res.status(400).json({
        success: false,
        error: 'targetType和targetId是必填参数',
      });
    }

    const { likes, total, page: currentPage, limit: currentLimit } = await likeService.getLikesForTarget(
      targetType as string,
      targetId as string,
      {
        page: Number(page),
        limit: Number(limit),
      }
    );

    const totalPages = Math.ceil(total / currentLimit);

    res.json({
      success: true,
      data: {
        targetType,
        targetId,
        likes,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          total,
          totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
        },
      },
      message: '点赞列表获取成功',
    });
  })
);

/**
 * @route GET /api/v1/like/user
 * @desc 获取当前登录用户的点赞历史记录（支持按目标类型筛选和分页）
 * @access Private — 需要用户登录认证
 *
 * @middleware authenticate - 验证用户 JWT Token
 * @middleware validateRequest(paginationSchema) - 验证分页参数 page 和 limit 的格式
 *
 * @param {number} [req.query.page=1] - 页码
 * @param {number} [req.query.limit=20] - 每页条数
 * @param {string} [req.query.targetType] - 可选筛选条件，只返回指定类型的点赞记录
 *
 * @returns {200} {
 *   success: true,
 *   data: {
 *     userId,
 *     likes: Like[],
 *     pagination: { page, limit, total, totalPages, hasNext, hasPrev }
 *   },
 *   message: '用户点赞历史获取成功'
 * }
 *
 * @example
 *   GET /api/v1/like/user?page=1&limit=20&targetType=review
 */
router.get(
  '/user',
  authenticate,
  validateRequest(paginationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, targetType } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '用户未认证',
      });
    }

    const filters: any = {};
    if (targetType) filters.targetType = targetType as string;

    const { likes, total, page: currentPage, limit: currentLimit } = await likeService.getUserLikes(
      userId,
      {
        page: Number(page),
        limit: Number(limit),
      },
      filters
    );

    const totalPages = Math.ceil(total / currentLimit);

    res.json({
      success: true,
      data: {
        userId,
        likes,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          total,
          totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
        },
      },
      message: '用户点赞历史获取成功',
    });
  })
);

/**
 * @route GET /api/v1/like/stats
 * @desc 获取指定目标对象的点赞统计信息（总点赞数等）
 * @access Public — 可选登录
 *
 * @middleware optionalAuthenticate - 可选身份认证
 *
 * @param {string} req.query.targetType - 目标类型（必填）
 * @param {string} req.query.targetId - 目标 ID（必填）
 *
 * @returns {200} { success: true, data: LikeStats, message: '点赞统计信息获取成功' }
 *
 * @example
 *   GET /api/v1/like/stats?targetType=news&targetId=456
 *   Response: { "success": true, "data": { "totalLikes": 42 }, "message": "点赞统计信息获取成功" }
 */
router.get(
  '/stats',
  optionalAuthenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { targetType, targetId } = req.query;

    const stats = await likeService.getLikeStats(
      targetType as string,
      targetId as string
    );

    res.json({
      success: true,
      data: stats,
      message: '点赞统计信息获取成功',
    });
  })
);

export default router;
