/**
 * 评测路由模块
 *
 * @deprecated 评测功能已合并到 community.routes.ts
 * 所有 /api/v1/reviews 路径已重定向到 /api/v1/community/reviews
 * 此文件保留仅作参考，当前未被 index.ts 挂载使用
 *
 * 本模块提供游戏评测相关的 REST API，包括：
 * - 获取评测列表（支持分页、按游戏筛选、精选筛选）
 * - 搜索评测（支持关键词和游戏筛选）
 * - 获取评测模板列表
 * - 获取/创建/更新/删除评测
 * - 点赞/取消点赞评测
 * - 标记/取消标记精选评测（管理员）
 * - 获取评测评论列表
 *
 * @module routes/review
 */

import { Router, Request, Response } from 'express';
import { authenticate, optionalAuthenticate, validateRequest, authorize } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import { paginationSchema, searchSchema } from '../validators';
import reviewService from '../services/review.service';
import { reviewTemplateModel } from '../models/ReviewTemplate';
import { ReviewCreateInput, ReviewUpdateInput } from '../types';

const router = Router();

/**
 * @route GET /api/v1/reviews
 * @desc 获取评测列表
 * @access Public
 *
 * @middleware optionalAuthenticate - 可选认证，已登录用户可查看更多信息
 * @middleware validateRequest(paginationSchema) - 验证分页参数
 *
 * @param req.query.page - 页码，默认 1
 * @param req.query.limit - 每页数量，默认 20
 * @param req.query.gameId - 按游戏 ID 筛选（可选）
 * @param req.query.featured - 是否只显示精选评测，'true' 表示只显示精选（可选）
 *
 * @returns 包含评测列表和分页信息的响应
 *   - reviews: 评测数组
 *   - pagination: 分页信息（page, limit, total, totalPages, hasNext, hasPrev）
 */
router.get(
  '/',
  optionalAuthenticate,
  validateRequest(paginationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, gameId, featured } = req.query;

    const { reviews, total, page: currentPage, limit: currentLimit } = await reviewService.getReviews(
      {
        page: Number(page),
        limit: Number(limit),
        sortBy: 'publishedAt',
        sortOrder: 'desc',
      },
      {
        gameId: gameId as string,
        featuredOnly: featured === 'true',
      }
    );

    const totalPages = Math.ceil(total / currentLimit);

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          total,
          totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
        },
      },
      message: '评测列表获取成功',
    });
  })
);

/**
 * @route GET /api/v1/reviews/search
 * @desc 搜索评测
 * @access Public
 *
 * @middleware optionalAuthenticate - 可选认证
 * @middleware validateRequest(searchSchema) - 验证搜索参数（query、分页等）
 *
 * @param req.query.query - 搜索关键词
 * @param req.query.gameId - 按游戏 ID 筛选（可选）
 * @param req.query.page - 页码，默认 1
 * @param req.query.limit - 每页数量，默认 20
 *
 * @returns 包含搜索结果和分页信息的响应
 */
router.get(
  '/search',
  optionalAuthenticate,
  validateRequest(searchSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { query, gameId, page = 1, limit = 20 } = req.query;

    const { reviews, total, page: currentPage, limit: currentLimit, query: searchQuery } = await reviewService.searchReviews({
      query: query as string,
      page: Number(page),
      limit: Number(limit),
      filters: {
        gameId: gameId as string,
      },
    });

    const totalPages = Math.ceil(total / currentLimit);

    res.json({
      success: true,
      data: {
        reviews,
        query: searchQuery,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          total,
          totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
        },
      },
      message: '评测搜索成功',
    });
  })
);

/**
 * @route GET /api/v1/reviews/templates/list
 * @desc 获取活跃的评测模板列表
 * @access Public
 *
 * 从数据库中获取所有状态为活跃（active）的评测模板，
 * 模板定义了评测的结构（如评分项、评价维度等）
 */
router.get(
  '/templates/list',
  asyncHandler(async (_req: Request, res: Response) => {
    const templates = await reviewTemplateModel.findActive();
    res.json({
      success: true,
      data: templates,
      message: '评测模板列表获取成功',
    });
  })
);

/**
 * @route GET /api/v1/reviews/:id
 * @desc 获取评测详情
 * @access Public
 *
 * @middleware optionalAuthenticate - 可选认证
 *
 * @param req.params.id - 评测唯一标识
 *
 * @returns 200 - 评测详情
 * @returns 404 - 评测不存在
 */
router.get(
  '/:id',
  optionalAuthenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const review = await reviewService.getReviewById(id);

    res.json({
      success: true,
      data: review,
      message: '评测详情获取成功',
    });
  })
);

/**
 * @route POST /api/v1/reviews
 * @desc 创建评测
 * @access Private（仅管理员可创建评测）
 *
 * @middleware authenticate - 必须登录认证
 * @middleware authorize('admin') - 需要管理员角色
 *
 * @param req.body.title - 评测标题，必填
 * @param req.body.content - 评测内容，必填
 * @param req.body.rating - 评分（0-5），必填
 * @param req.body.gameId - 关联游戏 ID，必填
 *
 * @returns 201 - 评测创建成功
 * @returns 400 - 参数验证失败（缺少必填字段或评分超出范围）
 * @returns 401 - 用户未认证
 *
 * 验证规则：
 * - title、content、rating、gameId 均为必填
 * - rating 必须在 0 到 5 之间
 */
router.post(
  '/',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const reviewData: ReviewCreateInput = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '用户未认证',
      });
    }

    // 验证必需字段
    if (!reviewData.title || !reviewData.content || !reviewData.rating || !reviewData.gameId) {
      return res.status(400).json({
        success: false,
        error: '标题、内容、评分和游戏ID是必填字段',
      });
    }

    // 验证评分范围
    if (reviewData.rating < 0 || reviewData.rating > 5) {
      return res.status(400).json({
        success: false,
        error: '评分必须在0到5之间',
      });
    }

    const review = await reviewService.createReview(userId, reviewData);

    res.status(201).json({
      success: true,
      data: review,
      message: '评测创建成功',
    });
  })
);

/**
 * @route PUT /api/v1/reviews/:id
 * @desc 更新评测（作者或管理员）
 * @access Private
 *
 * @middleware authenticate - 必须登录认证
 *
 * @param req.params.id - 评测唯一标识
 * @param req.body - 需要更新的评测字段
 *
 * @returns 200 - 评测更新成功
 * @returns 403 - 无权限更新（非作者且非管理员）
 *
 * 权限控制：
 * - 评测作者可以更新自己的评测
 * - 管理员（admin/super_admin）可以更新任何评测
 * - 其他用户无权限
 */
router.put(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData: ReviewUpdateInput = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // 获取当前评测
    const currentReview = await reviewService.getReviewById(id);

    // 检查权限：作者可以更新自己的评测，管理员可以更新任何评测
    if (currentReview.authorId !== userId && userRole !== 'admin' && userRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: '您没有权限更新此评测',
      });
    }

    const review = await reviewService.updateReview(id, updateData);

    res.json({
      success: true,
      data: review,
      message: '评测更新成功',
    });
  })
);

/**
 * @route DELETE /api/v1/reviews/:id
 * @desc 删除评测（作者或管理员）
 * @access Private
 *
 * @middleware authenticate - 必须登录认证
 *
 * @param req.params.id - 评测唯一标识
 *
 * @returns 200 - 评测删除成功
 * @returns 403 - 无权限删除（非作者且非管理员）
 *
 * 权限控制：
 * - 评测作者可以删除自己的评测
 * - 管理员（admin/super_admin）可以删除任何评测
 * - 其他用户无权限
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // 获取当前评测
    const currentReview = await reviewService.getReviewById(id);

    // 检查权限：作者可以删除自己的评测，管理员可以删除任何评测
    if (currentReview.authorId !== userId && userRole !== 'admin' && userRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: '您没有权限删除此评测',
      });
    }

    await reviewService.deleteReview(id);

    res.json({
      success: true,
      message: '评测删除成功',
    });
  })
);

/**
 * @route POST /api/v1/reviews/:id/like
 * @desc 点赞评测
 * @access Private
 *
 * @middleware authenticate - 必须登录认证
 *
 * @param req.params.id - 评测唯一标识
 *
 * @returns 200 - 点赞成功，返回当前点赞数
 */
router.post(
  '/:id/like',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { likes } = await reviewService.likeReview(id);

    res.json({
      success: true,
      data: { reviewId: id, likes, liked: true },
      message: '点赞成功',
    });
  })
);

/**
 * @route POST /api/v1/reviews/:id/feature
 * @desc 标记为精选评测（管理员）
 * @access Private/Admin
 *
 * @middleware authenticate - 必须登录认证
 * @middleware authorize('admin') - 需要管理员角色
 *
 * @param req.params.id - 评测唯一标识
 * @param req.body.isFeatured - 是否标记为精选，默认 true
 *
 * @returns 200 - 操作成功，返回更新后的评测信息
 */
router.post(
  '/:id/feature',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isFeatured = true } = req.body;

    const review = await reviewService.featureReview(id, isFeatured);

    res.json({
      success: true,
      data: review,
      message: isFeatured ? '评测已标记为精选' : '评测已取消精选',
    });
  })
);

/**
 * @route GET /api/v1/reviews/:id/comments
 * @desc 获取评测评论列表
 * @access Public
 *
 * @middleware optionalAuthenticate - 可选认证
 * @middleware validateRequest(paginationSchema) - 验证分页参数
 *
 * @param req.params.id - 评测唯一标识
 * @param req.query.page - 页码，默认 1
 * @param req.query.limit - 每页数量，默认 20
 *
 * @returns 包含评论列表和分页信息的响应
 */
router.get(
  '/:id/comments',
  optionalAuthenticate,
  validateRequest(paginationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const { comments, total, page: currentPage, limit: currentLimit } = await reviewService.getReviewComments(id, {
      page: Number(page),
      limit: Number(limit),
    });

    const totalPages = Math.ceil(total / currentLimit);

    res.json({
      success: true,
      data: {
        reviewId: id,
        comments,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          total,
          totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
        },
      },
      message: '评测评论获取成功',
    });
  })
);

export default router;
