/**
 * ============================================================
 * 评论系统路由模块
 * ============================================================
 *
 * 本模块提供评论系统的全部 API 接口，涵盖以下功能：
 *   - 获取评论列表（按父级对象分页查询）
 *   - 搜索评论（支持关键字搜索和多种筛选条件）
 *   - 获取评论详情
 *   - 获取评论的回复列表
 *   - 创建评论
 *   - 更新评论（作者或管理员）
 *   - 删除评论（作者或管理员）
 *   - 点赞评论
 *   - 获取评论统计信息
 *
 * 评论是系统的核心交互功能，支持对游戏、新闻、评测等不同父级
 * 类型的评论嵌套。认证中间件使用 optionalAuthenticate（可选认证），
 * 未登录用户可查看评论，但创建/更新/删除操作需要登录。
 *
 * 路由前缀: /api/v1/comments
 *
 * @module commentRoutes
 */

import { Router, Request, Response } from 'express';
import { authenticate, optionalAuthenticate, validateRequest } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import { paginationSchema, searchSchema } from '../validators';
import commentService from '../services/comment.service';
import { CommentCreateInput } from '../types';

const router = Router();

/**
 * @route GET /api/v1/comments
 * @desc 获取评论列表（按父级对象分页查询）
 * @access Public - 可选认证，登录后可获得额外的个性化数据
 *
 * 使用 optionalAuthenticate 中间件——未登录用户也可正常访问。
 * 使用 validateRequest(paginationSchema) 验证分页参数。
 *
 * @query {string} parentType - 父级类型（必填，如 game / news / review）
 * @query {string} parentId - 父级对象 ID（必填）
 * @query {number} [page=1] - 页码
 * @query {number} [limit=20] - 每页条数
 *
 * @response 200 - 成功返回评论列表和分页信息
 *   @body {Array} data.comments - 评论列表
 *   @body {object} data.pagination - 分页信息（page, limit, total, totalPages, hasNext, hasPrev）
 * @response 400 - 缺少 parentType 或 parentId 参数
 */
router.get(
  '/',
  optionalAuthenticate,
  validateRequest(paginationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { parentType, parentId, page = 1, limit = 20 } = req.query;

    if (!parentType || !parentId) {
      return res.status(400).json({
        success: false,
        error: 'parentType和parentId是必填参数',
      });
    }

    const { comments, total, page: currentPage, limit: currentLimit } = await commentService.getCommentsByParent(
      parentType as string,
      parentId as string,
      {
        page: Number(page),
        limit: Number(limit),
      }
    );

    const totalPages = Math.ceil(total / currentLimit);

    res.json({
      success: true,
      data: {
        parentType,
        parentId,
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
      message: '评论列表获取成功',
    });
  })
);

/**
 * @route GET /api/v1/comments/search
 * @desc 搜索评论
 * @access Public - 可选认证
 *
 * 支持按关键字搜索评论内容，并可附加筛选条件（父级类型、父级 ID、作者 ID）。
 * 使用 validateRequest(searchSchema) 验证搜索参数。
 *
 * @query {string} query - 搜索关键字
 * @query {string} [parentType] - 按父级类型筛选
 * @query {string} [parentId] - 按父级 ID 筛选
 * @query {string} [authorId] - 按作者 ID 筛选
 * @query {number} [page=1] - 页码
 * @query {number} [limit=20] - 每页条数
 *
 * @response 200 - 成功返回搜索结果和分页信息
 *   @body {Array} data.comments - 匹配的评论列表
 *   @body {string} data.query - 搜索关键字
 *   @body {object} data.pagination - 分页信息
 */
router.get(
  '/search',
  optionalAuthenticate,
  validateRequest(searchSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { query, parentType, parentId, authorId, page = 1, limit = 20 } = req.query;

    const { comments, total, page: currentPage, limit: currentLimit, query: searchQuery } = await commentService.searchComments({
      query: query as string,
      page: Number(page),
      limit: Number(limit),
      filters: {
        parentType: parentType as string,
        parentId: parentId as string,
        authorId: authorId as string,
      },
    });

    const totalPages = Math.ceil(total / currentLimit);

    res.json({
      success: true,
      data: {
        comments,
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
      message: '评论搜索成功',
    });
  })
);

/**
 * @route GET /api/v1/comments/:id
 * @desc 获取评论详情
 * @access Public - 可选认证
 *
 * @param {string} id - 路径参数，评论 ID
 *
 * @response 200 - 成功返回评论详情数据
 * @response 404 - 评论不存在
 */
router.get(
  '/:id',
  optionalAuthenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const comment = await commentService.getCommentById(id);

    res.json({
      success: true,
      data: comment,
      message: '评论详情获取成功',
    });
  })
);

/**
 * @route GET /api/v1/comments/:id/replies
 * @desc 获取评论的回复列表
 * @access Public - 可选认证
 *
 * 获取指定评论下的所有回复（二级评论），支持分页。
 *
 * @param {string} id - 路径参数，父评论 ID
 * @query {number} [page=1] - 页码
 * @query {number} [limit=20] - 每页条数
 *
 * @response 200 - 成功返回回复列表和分页信息
 *   @body {string} data.commentId - 父评论 ID
 *   @body {Array} data.replies - 回复列表
 *   @body {object} data.pagination - 分页信息
 */
router.get(
  '/:id/replies',
  optionalAuthenticate,
  validateRequest(paginationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const { replies, total, page: currentPage, limit: currentLimit } = await commentService.getCommentReplies(id, {
      page: Number(page),
      limit: Number(limit),
    });

    const totalPages = Math.ceil(total / currentLimit);

    res.json({
      success: true,
      data: {
        commentId: id,
        replies,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          total,
          totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
        },
      },
      message: '评论回复列表获取成功',
    });
  })
);

/**
 * @route POST /api/v1/comments
 * @desc 创建评论
 * @access Private - 需要有效访问令牌
 *
 * 使用 authenticate 中间件验证用户身份。
 * 创建评论时需提供内容、父级类型和父级 ID 等必要信息。
 *
 * @headers Authorization: Bearer <access_token>
 * @body {object} 符合 CommentCreateInput 类型的数据
 *   @property {string} content - 评论内容
 *   @property {string} parentType - 父级类型（game / news / review 等）
 *   @property {string} parentId - 父级对象 ID
 *   @property {string} [parentCommentId] - 回复的目标评论 ID（可选，用于回复场景）
 *
 * @response 201 - 评论创建成功
 * @response 400 - 必填字段缺失
 * @response 401 - 未认证
 */
router.post(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const commentData: CommentCreateInput = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '用户未认证',
      });
    }

    // 验证必需字段
    if (!commentData.content || !commentData.parentType || !commentData.parentId) {
      return res.status(400).json({
        success: false,
        error: '内容、父级类型和父级ID是必填字段',
      });
    }

    const comment = await commentService.createComment(userId, commentData);

    res.status(201).json({
      success: true,
      data: comment,
      message: '评论创建成功',
    });
  })
);

/**
 * @route PUT /api/v1/comments/:id
 * @desc 更新评论内容
 * @access Private - 需要有效访问令牌
 *
 * 更新评论的权限策略：
 *   - 评论的作者可以更新自己的评论
 *   - 管理员（admin / super_admin）可以更新任何评论
 *   - 其他用户无权限
 *
 * @headers Authorization: Bearer <access_token>
 * @param {string} id - 路径参数，评论 ID
 * @body {object}
 *   @property {string} content - 更新后的评论内容
 *
 * @response 200 - 评论更新成功
 * @response 400 - 评论内容为空
 * @response 401 - 未认证
 * @response 403 - 没有更新权限
 * @response 404 - 评论不存在
 */
router.put(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: '评论内容不能为空',
      });
    }

    // 获取当前评论
    const currentComment = await commentService.getCommentById(id);

    // 检查权限：作者可以更新自己的评论，管理员可以更新任何评论
    if (currentComment.authorId !== userId && userRole !== 'admin' && userRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: '您没有权限更新此评论',
      });
    }

    const comment = await commentService.updateComment(id, content);

    res.json({
      success: true,
      data: comment,
      message: '评论更新成功',
    });
  })
);

/**
 * @route DELETE /api/v1/comments/:id
 * @desc 删除评论
 * @access Private - 需要有效访问令牌
 *
 * 删除评论的权限策略：
 *   - 评论的作者可以删除自己的评论
 *   - 管理员（admin / super_admin）可以删除任何评论
 *   - 其他用户无权限
 *
 * @headers Authorization: Bearer <access_token>
 * @param {string} id - 路径参数，评论 ID
 *
 * @response 200 - 评论删除成功
 * @response 401 - 未认证
 * @response 403 - 没有删除权限
 * @response 404 - 评论不存在
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // 获取当前评论
    const currentComment = await commentService.getCommentById(id);

    // 检查权限：作者可以删除自己的评论，管理员可以删除任何评论
    if (currentComment.authorId !== userId && userRole !== 'admin' && userRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: '您没有权限删除此评论',
      });
    }

    await commentService.deleteComment(id);

    res.json({
      success: true,
      message: '评论删除成功',
    });
  })
);

/**
 * @route POST /api/v1/comments/:id/like
 * @desc 点赞评论
 * @access Private - 需要有效访问令牌
 *
 * 对指定评论进行点赞操作。接口切换点赞状态（toggle），
 * 如果已点赞则取消点赞，未点赞则增加点赞数。
 *
 * @headers Authorization: Bearer <access_token>
 * @param {string} id - 路径参数，评论 ID
 *
 * @response 200 - 点赞成功
 *   @body {string} data.commentId - 评论 ID
 *   @body {number} data.likes - 当前点赞数
 *   @body {boolean} data.liked - 当前用户是否已点赞
 * @response 401 - 未认证
 * @response 404 - 评论不存在
 */
router.post(
  '/:id/like',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { likes, liked } = await commentService.likeComment(id, req.user!.id);

    res.json({
      success: true,
      data: { commentId: id, likes, liked },
      message: liked ? '点赞成功' : '已取消点赞',
    });
  })
);

/**
 * @route GET /api/v1/comments/stats
 * @desc 获取评论统计信息
 * @access Public - 可选认证
 *
 * 根据父级类型和父级 ID 获取评论的统计汇总信息，
 * 如评论总数、最新评论等。
 *
 * @query {string} parentType - 父级类型
 * @query {string} parentId - 父级对象 ID
 *
 * @response 200 - 成功返回评论统计信息
 */
router.get(
  '/stats',
  optionalAuthenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { parentType, parentId } = req.query;

    const stats = await commentService.getCommentStats(
      parentType as string,
      parentId as string
    );

    res.json({
      success: true,
      data: stats,
      message: '评论统计信息获取成功',
    });
  })
);

export default router;
