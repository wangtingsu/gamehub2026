/**
 * ============================================================
 * 社区功能路由模块
 * ============================================================
 *
 * 本模块提供社区相关的全部 API 接口，涵盖三大功能域：
 *
 * 一、社区帖子（/posts）
 *   - 获取帖子列表（支持分类筛选、置顶筛选、关联游戏筛选）
 *   - 搜索帖子（支持关键字和分类筛选）
 *   - 帖子 CRUD（创建、读取、更新、删除）
 *   - 点赞帖子、置顶帖子、锁定帖子
 *   - 获取帖子的评论列表
 *
 * 二、社区评论（/comments）
 *   - 获取评论详情（支持不同类型父级的中文类型名映射）
 *   - 更新评论、删除评论（作者或管理员）
 *
 * 三、游戏评测（/reviews）
 *   - 获取评测列表（支持游戏筛选和精选筛选）
 *   - 搜索评测
 *   - 获取评测模板列表
 *   - 评测 CRUD
 *   - 点赞评测、标记为精选
 *   - 获取评测的评论列表
 *
 * 四、社区统计（/stats）
 *   - 获取社区综合统计数据（帖子数、评测数、评论数、用户数）
 *
 * 路由前缀: /api/v1/community
 *
 * @module communityRoutes
 */

import { Router, Request, Response } from 'express';
import { authenticate, optionalAuthenticate, validateRequest, authorize } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import { paginationSchema, searchSchema } from '../validators';
import communityService from '../services/community.service';
import reviewService from '../services/review.service';
import { reviewTemplateModel } from '../models/ReviewTemplate';
import { CommunityPostCreateInput, CommunityPostUpdateInput, ReviewCreateInput, ReviewUpdateInput } from '../types';
import { query, execute } from '../db';

const router = Router();

/**
 * @route GET /api/v1/community/posts
 * @desc 获取社区帖子列表
 * @access Public - 可选认证
 *
 * 支持按分类、置顶状态和关联游戏进行筛选，按发布时间降序排列。
 * 使用 optionalAuthenticate 中间件——未登录用户也可正常访问。
 * 使用 validateRequest(paginationSchema) 验证分页参数。
 *
 * @query {number} [page=1] - 页码
 * @query {number} [limit=20] - 每页条数
 * @query {string} [category] - 帖子分类筛选
 * @query {boolean} [pinned] - 是否只显示置顶帖（传 "true" 启用）
 * @query {string} [gameId] - 关联游戏 ID 筛选
 *
 * @response 200 - 成功返回帖子列表和分页信息
 *   @body {Array} data.posts - 帖子列表
 *   @body {object} data.pagination - 分页信息（page, limit, total, totalPages, hasNext, hasPrev）
 */
router.get(
  '/posts',
  optionalAuthenticate,
  validateRequest(paginationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, category, pinned, gameId } = req.query;

    const { posts, total, page: currentPage, limit: currentLimit } = await communityService.getCommunityPosts(
      {
        page: Number(page),
        limit: Number(limit),
        sortBy: 'publishedAt',
        sortOrder: 'desc',
      },
      {
        category: category as string,
        pinnedOnly: pinned === 'true',
        gameId: gameId as string,
      }
    );

    const totalPages = Math.ceil(total / currentLimit);

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          total,
          totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
        },
      },
      message: '社区帖子列表获取成功',
    });
  })
);

/**
 * @route GET /api/v1/community/posts/search
 * @desc 搜索社区帖子
 * @access Public - 可选认证
 *
 * 支持按关键字搜索帖子标题/内容，并可附加分类筛选。
 * 使用 validateRequest(searchSchema) 验证搜索参数。
 *
 * @query {string} query - 搜索关键字
 * @query {string} [category] - 按分类筛选
 * @query {number} [page=1] - 页码
 * @query {number} [limit=20] - 每页条数
 *
 * @response 200 - 成功返回搜索结果和分页信息
 *   @body {Array} data.posts - 匹配的帖子列表
 *   @body {string} data.query - 搜索关键字
 *   @body {string} data.category - 分类筛选条件
 *   @body {object} data.pagination - 分页信息
 */
router.get(
  '/posts/search',
  optionalAuthenticate,
  validateRequest(searchSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { query, category, page = 1, limit = 20 } = req.query;

    const { posts, total, page: currentPage, limit: currentLimit, query: searchQuery } = await communityService.searchCommunityPosts({
      query: query as string,
      page: Number(page),
      limit: Number(limit),
      filters: {
        category: category as string,
      },
    });

    const totalPages = Math.ceil(total / currentLimit);

    res.json({
      success: true,
      data: {
        posts,
        query: searchQuery,
        category,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          total,
          totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
        },
      },
      message: '社区帖子搜索成功',
    });
  })
);

/**
 * @route GET /api/v1/community/posts/:id
 * @desc 获取社区帖子详情
 * @access Public - 可选认证
 *
 * 根据帖子 ID 获取完整的帖子内容及相关元数据。
 *
 * @param {string} id - 路径参数，帖子 ID
 *
 * @response 200 - 成功返回帖子详情
 * @response 404 - 帖子不存在
 */
router.get(
  '/posts/:id',
  optionalAuthenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const post = await communityService.getCommunityPostById(id);

    res.json({
      success: true,
      data: post,
      message: '社区帖子详情获取成功',
    });
  })
);

/**
 * @route POST /api/v1/community/posts
 * @desc 创建社区帖子
 * @access Private - 需要有效访问令牌，且角色为 admin
 *
 * 使用 authenticate 中间件验证用户身份。
 * 使用 authorize('admin') 中间件限制仅管理员可创建帖子。
 * 创建时需提供标题、内容和分类等必填字段。
 *
 * @headers Authorization: Bearer <access_token>
 * @body {object}
 *   @property {string} title - 帖子标题（必填）
 *   @property {string} content - 帖子内容（必填）
 *   @property {string} category - 帖子分类（必填）
 *   @property {string} [gameId] - 关联游戏 ID（可选）
 *   @property {string[]} [tags] - 标签列表（可选）
 *
 * @response 201 - 帖子创建成功
 * @response 400 - 必填字段缺失
 * @response 401 - 未认证
 * @response 403 - 无管理员权限
 */
router.post(
  '/posts',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const postData: CommunityPostCreateInput = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '用户未认证',
      });
    }

    // 验证必需字段
    if (!postData.title || !postData.content || !postData.category) {
      return res.status(400).json({
        success: false,
        error: '标题、内容和分类是必填字段',
      });
    }

    const post = await communityService.createCommunityPost(userId, postData);

    res.status(201).json({
      success: true,
      data: post,
      message: '社区帖子创建成功',
    });
  })
);

/**
 * @route PUT /api/v1/community/posts/:id
 * @desc 更新社区帖子
 * @access Private - 需要有效访问令牌
 *
 * 更新帖子的权限策略：
 *   - 作者可以更新自己的帖子
 *   - 管理员（admin / super_admin）可以更新任何帖子
 *   - 被锁定的帖子仅管理员可编辑
 *
 * @headers Authorization: Bearer <access_token>
 * @param {string} id - 路径参数，帖子 ID
 * @body {object} 需要更新的字段
 *   @property {string} [title] - 帖子标题（可选）
 *   @property {string} [content] - 帖子内容（可选）
 *   @property {string} [category] - 帖子分类（可选）
 *
 * @response 200 - 帖子更新成功
 * @response 401 - 未认证
 * @response 403 - 没有更新权限或帖子已被锁定
 * @response 404 - 帖子不存在
 */
router.put(
  '/posts/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData: CommunityPostUpdateInput = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // 获取当前帖子
    const currentPost = await communityService.getCommunityPostById(id);

    // 检查权限：作者可以更新自己的帖子，管理员可以更新任何帖子
    if (currentPost.authorId !== userId && userRole !== 'admin' && userRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: '您没有权限更新此帖子',
      });
    }

    // 检查帖子是否被锁定
    if (currentPost.isLocked && userRole !== 'admin' && userRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: '此帖子已被锁定，无法编辑',
      });
    }

    const post = await communityService.updateCommunityPost(id, updateData);

    res.json({
      success: true,
      data: post,
      message: '社区帖子更新成功',
    });
  })
);

/**
 * @route DELETE /api/v1/community/posts/:id
 * @desc 删除社区帖子
 * @access Private - 需要有效访问令牌
 *
 * 删除帖子的权限策略：
 *   - 作者可以删除自己的帖子
 *   - 管理员（admin / super_admin）可以删除任何帖子
 *
 * @headers Authorization: Bearer <access_token>
 * @param {string} id - 路径参数，帖子 ID
 *
 * @response 200 - 帖子删除成功
 * @response 401 - 未认证
 * @response 403 - 没有删除权限
 * @response 404 - 帖子不存在
 */
router.delete(
  '/posts/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // 获取当前帖子
    const currentPost = await communityService.getCommunityPostById(id);

    // 检查权限：作者可以删除自己的帖子，管理员可以删除任何帖子
    if (currentPost.authorId !== userId && userRole !== 'admin' && userRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: '您没有权限删除此帖子',
      });
    }

    await communityService.deleteCommunityPost(id);

    res.json({
      success: true,
      message: '社区帖子删除成功',
    });
  })
);

/**
 * @route POST /api/v1/community/posts/:id/like
 * @desc 点赞/取消点赞社区帖子
 * @access Private - 需要有效访问令牌
 *
 * 对指定帖子进行点赞操作（toggle 行为）。
 *
 * @headers Authorization: Bearer <access_token>
 * @param {string} id - 路径参数，帖子 ID
 *
 * @response 200 - 操作成功
 *   @body {string} data.postId - 帖子 ID
 *   @body {number} data.likes - 当前点赞数
 *   @body {boolean} data.liked - 是否已点赞
 * @response 401 - 未认证
 * @response 404 - 帖子不存在
 */
router.post(
  '/posts/:id/like',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { likes } = await communityService.likeCommunityPost(id);

    res.json({
      success: true,
      data: { postId: id, likes, liked: true },
      message: '点赞成功',
    });
  })
);

/**
 * @route POST /api/v1/community/posts/:id/pin
 * @desc 置顶/取消置顶社区帖子（管理员操作）
 * @access Private - 需要有效访问令牌，且角色为 admin
 *
 * 使用 authorize('admin') 中间件限制仅管理员可操作。
 *
 * @headers Authorization: Bearer <access_token>
 * @param {string} id - 路径参数，帖子 ID
 * @body {object}
 *   @property {boolean} [isPinned=true] - true 置顶 / false 取消置顶
 *
 * @response 200 - 操作成功
 * @response 401 - 未认证
 * @response 403 - 无管理员权限
 * @response 404 - 帖子不存在
 */
router.post(
  '/posts/:id/pin',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isPinned = true } = req.body;

    const post = await communityService.pinCommunityPost(id, isPinned);

    res.json({
      success: true,
      data: post,
      message: isPinned ? '帖子已置顶' : '帖子已取消置顶',
    });
  })
);

/**
 * @route POST /api/v1/community/posts/:id/lock
 * @desc 锁定/解锁社区帖子（管理员操作）
 * @access Private - 需要有效访问令牌，且角色为 admin
 *
 * 锁定后的帖子普通用户无法编辑，仅管理员可修改。
 * 使用 authorize('admin') 中间件限制仅管理员可操作。
 *
 * @headers Authorization: Bearer <access_token>
 * @param {string} id - 路径参数，帖子 ID
 * @body {object}
 *   @property {boolean} [isLocked=true] - true 锁定 / false 解锁
 *
 * @response 200 - 操作成功
 * @response 401 - 未认证
 * @response 403 - 无管理员权限
 * @response 404 - 帖子不存在
 */
router.post(
  '/posts/:id/lock',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isLocked = true } = req.body;

    const post = await communityService.lockCommunityPost(id, isLocked);

    res.json({
      success: true,
      data: post,
      message: isLocked ? '帖子已锁定' : '帖子已解锁',
    });
  })
);

/**
 * @route GET /api/v1/community/posts/:id/comments
 * @desc 获取社区帖子的评论列表
 * @access Public - 可选认证
 *
 * 分页获取指定帖子下的所有评论。
 *
 * @param {string} id - 路径参数，帖子 ID
 * @query {number} [page=1] - 页码
 * @query {number} [limit=20] - 每页条数
 *
 * @response 200 - 成功返回评论列表和分页信息
 *   @body {string} data.postId - 帖子 ID
 *   @body {Array} data.comments - 评论列表
 *   @body {object} data.pagination - 分页信息
 */
router.get(
  '/posts/:id/comments',
  optionalAuthenticate,
  validateRequest(paginationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const { comments, total, page: currentPage, limit: currentLimit } = await communityService.getCommunityPostComments(id, {
      page: Number(page),
      limit: Number(limit),
    });

    const totalPages = Math.ceil(total / currentLimit);

    res.json({
      success: true,
      data: {
        postId: id,
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
      message: '社区帖子评论获取成功',
    });
  })
);

/**
 * @route GET /api/v1/community/comments/:id
 * @desc 获取评论详情（跨父级类型的评论详情）
 * @access Public - 可选认证
 *
 * 通过 JOIN 查询获取评论及作者信息，并将 parent_type 映射为中文描述。
 * 支持三种父级类型：review（评测）、news（新闻）、community_post（社区帖子）。
 *
 * @param {string} id - 路径参数，评论 ID
 *
 * @response 200 - 成功返回评论详情
 *   @body {string} data.id - 评论 ID
 *   @body {string} data.content - 评论内容
 *   @body {object} data.author - 作者信息（id, username, displayName, avatarUrl）
 *   @body {string} data.parentType - 父级类型
 *   @body {string} data.parentTypeName - 父级类型中文名
 *   @body {string} data.parentId - 父级对象 ID
 *   @body {number} data.likes - 点赞数
 *   @body {boolean} data.isEdited - 是否已编辑
 * @response 404 - 评论不存在
 */
router.get(
  '/comments/:id',
  optionalAuthenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // 获取评论详情，同时查询作者信息和父级类型中文名
    const result = await query(
      `SELECT c.*, u.username, u.display_name, u.avatar_url,
              CASE c.parent_type
                WHEN 'review' THEN '评测'
                WHEN 'news' THEN '新闻'
                WHEN 'community_post' THEN '社区帖子'
              END as parent_type_name
       FROM comments c
       JOIN users u ON c.author_id = u.id
       WHERE c.id = ?`,
      [id]
    );

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: '评论不存在',
      });
    }

    const comment = result[0];

    res.json({
      success: true,
      data: {
        id: comment.id,
        content: comment.content,
        author: {
          id: comment.author_id,
          username: comment.username,
          displayName: comment.display_name,
          avatarUrl: comment.avatar_url,
        },
        parentType: comment.parent_type,
        parentTypeName: comment.parent_type_name,
        parentId: comment.parent_id,
        likes: comment.likes,
        isEdited: Boolean(comment.is_edited),
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
      },
      message: '评论详情获取成功',
    });
  })
);

/**
 * @route PUT /api/v1/community/comments/:id
 * @desc 更新社区评论内容
 * @access Private - 需要有效访问令牌
 *
 * 更新评论的权限策略：
 *   - 作者可以更新自己的评论
 *   - 管理员（admin / super_admin）可以更新任何评论
 * 更新时会将 is_edited 标记设为 true。
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
  '/comments/:id',
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
    const result = await query(
      'SELECT * FROM comments WHERE id = ?',
      [id]
    );

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: '评论不存在',
      });
    }

    const comment = result[0];

    // 检查权限：作者可以更新自己的评论，管理员可以更新任何评论
    if (comment.author_id !== userId && userRole !== 'admin' && userRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: '您没有权限更新此评论',
      });
    }

    const now = new Date().toISOString();
    await execute(
      'UPDATE comments SET content = ?, is_edited = 1, updated_at = ? WHERE id = ?',
      [content, now, id]
    );

    // 获取更新后的评论
    const updated = await query(
      'SELECT * FROM comments WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      data: updated[0],
      message: '评论更新成功',
    });
  })
);

/**
 * @route DELETE /api/v1/community/comments/:id
 * @desc 删除社区评论
 * @access Private - 需要有效访问令牌
 *
 * 删除评论的权限策略：
 *   - 作者可以删除自己的评论
 *   - 管理员（admin / super_admin）可以删除任何评论
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
  '/comments/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // 获取当前评论
    const result = await query(
      'SELECT * FROM comments WHERE id = ?',
      [id]
    );

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: '评论不存在',
      });
    }

    const comment = result[0];

    // 检查权限：作者可以删除自己的评论，管理员可以删除任何评论
    if (comment.author_id !== userId && userRole !== 'admin' && userRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: '您没有权限删除此评论',
      });
    }

    await execute('DELETE FROM comments WHERE id = ?', [id]);

    res.json({
      success: true,
      message: '评论删除成功',
    });
  })
);


// ==================== 游戏评测路由 (Reviews under /community) ====================

/**
 * @route GET /api/v1/community/reviews
 * @desc 获取评测列表
 * @access Public - 可选认证
 *
 * 支持按游戏和精选状态筛选，按发布时间降序排列。
 *
 * @query {number} [page=1] - 页码
 * @query {number} [limit=20] - 每页条数
 * @query {string} [gameId] - 关联游戏 ID 筛选
 * @query {boolean} [featured] - 是否只显示精选评测（传 "true" 启用）
 *
 * @response 200 - 成功返回评测列表和分页信息
 */
router.get(
  '/reviews',
  optionalAuthenticate,
  validateRequest(paginationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, gameId, featured } = req.query;
    const { reviews, total, page: currentPage, limit: currentLimit } = await reviewService.getReviews(
      { page: Number(page), limit: Number(limit), sortBy: 'publishedAt', sortOrder: 'desc' },
      { gameId: gameId as string, featuredOnly: featured === 'true' }
    );
    const totalPages = Math.ceil(total / currentLimit);
    res.json({ success: true, data: { reviews, pagination: { page: currentPage, limit: currentLimit, total, totalPages, hasNext: currentPage < totalPages, hasPrev: currentPage > 1 } }, message: '评测列表获取成功' });
  })
);

/**
 * @route GET /api/v1/community/reviews/search
 * @desc 搜索评测
 * @access Public - 可选认证
 *
 * 支持按关键字搜索评测，可按游戏 ID 筛选。
 *
 * @query {string} query - 搜索关键字
 * @query {string} [gameId] - 按游戏 ID 筛选
 * @query {number} [page=1] - 页码
 * @query {number} [limit=20] - 每页条数
 *
 * @response 200 - 成功返回搜索结果和分页信息
 */
router.get(
  '/reviews/search',
  optionalAuthenticate,
  validateRequest(searchSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { query, gameId, page = 1, limit = 20 } = req.query;
    const result = await reviewService.searchReviews({ query: query as string, page: Number(page), limit: Number(limit), filters: { gameId: gameId as string } });
    const totalPages = Math.ceil(result.total / result.limit);
    res.json({ success: true, data: { reviews: result.reviews, query: result.query, pagination: { page: result.page, limit: result.limit, total: result.total, totalPages, hasNext: result.page < totalPages, hasPrev: result.page > 1 } }, message: '评测搜索成功' });
  })
);

/**
 * @route GET /api/v1/community/reviews/templates
 * @desc 获取评测模板列表
 * @access Public
 *
 * 返回当前可用的评测模板，用于指导用户撰写评测内容。
 *
 * @response 200 - 成功返回评测模板列表
 */
router.get(
  '/reviews/templates',
  asyncHandler(async (_req: Request, res: Response) => {
    const templates = await reviewTemplateModel.findActive();
    res.json({ success: true, data: templates, message: '评测模板列表获取成功' });
  })
);

/**
 * @route GET /api/v1/community/reviews/:id
 * @desc 获取评测详情
 * @access Public - 可选认证
 *
 * @param {string} id - 路径参数，评测 ID
 *
 * @response 200 - 成功返回评测详情
 * @response 404 - 评测不存在
 */
router.get(
  '/reviews/:id',
  optionalAuthenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const review = await reviewService.getReviewById(req.params.id);
    res.json({ success: true, data: review, message: '评测详情获取成功' });
  })
);

/**
 * @route POST /api/v1/community/reviews
 * @desc 创建评测
 * @access Private - 需要有效访问令牌
 *
 * 创建评测时需提供标题、内容、评分和关联游戏 ID。
 * 评分范围必须为 0 到 5。
 *
 * @headers Authorization: Bearer <access_token>
 * @body {object}
 *   @property {string} title - 评测标题（必填）
 *   @property {string} content - 评测内容（必填）
 *   @property {number} rating - 评分（0-5，必填）
 *   @property {string} gameId - 关联游戏 ID（必填）
 *
 * @response 201 - 评测创建成功
 * @response 400 - 必填字段缺失或评分超出范围
 * @response 401 - 未认证
 */
router.post(
  '/reviews',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const reviewData: ReviewCreateInput = req.body;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: '用户未认证' });
    if (!reviewData.title || !reviewData.content || !reviewData.rating || !reviewData.gameId)
      return res.status(400).json({ success: false, error: '标题、内容、评分和游戏ID是必填字段' });
    if (reviewData.rating < 0 || reviewData.rating > 5)
      return res.status(400).json({ success: false, error: '评分必须在0到5之间' });
    const review = await reviewService.createReview(userId, reviewData);
    res.status(201).json({ success: true, data: review, message: '评测创建成功' });
  })
);

/**
 * @route PUT /api/v1/community/reviews/:id
 * @desc 更新评测
 * @access Private - 需要有效访问令牌
 *
 * 更新评测的权限策略：
 *   - 作者可以更新自己的评测
 *   - 管理员（admin / super_admin）可以更新任何评测
 *
 * @headers Authorization: Bearer <access_token>
 * @param {string} id - 路径参数，评测 ID
 * @body {object} 需要更新的字段
 *
 * @response 200 - 评测更新成功
 * @response 401 - 未认证
 * @response 403 - 没有更新权限
 * @response 404 - 评测不存在
 */
router.put(
  '/reviews/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData: ReviewUpdateInput = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const currentReview = await reviewService.getReviewById(id);
    if (currentReview.authorId !== userId && userRole !== 'admin' && userRole !== 'super_admin')
      return res.status(403).json({ success: false, error: '您没有权限更新此评测' });
    const review = await reviewService.updateReview(id, updateData);
    res.json({ success: true, data: review, message: '评测更新成功' });
  })
);

/**
 * @route DELETE /api/v1/community/reviews/:id
 * @desc 删除评测
 * @access Private - 需要有效访问令牌
 *
 * 删除评测的权限策略：
 *   - 作者可以删除自己的评测
 *   - 管理员（admin / super_admin）可以删除任何评测
 *
 * @headers Authorization: Bearer <access_token>
 * @param {string} id - 路径参数，评测 ID
 *
 * @response 200 - 评测删除成功
 * @response 401 - 未认证
 * @response 403 - 没有删除权限
 * @response 404 - 评测不存在
 */
router.delete(
  '/reviews/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const currentReview = await reviewService.getReviewById(id);
    if (currentReview.authorId !== userId && userRole !== 'admin' && userRole !== 'super_admin')
      return res.status(403).json({ success: false, error: '您没有权限删除此评测' });
    await reviewService.deleteReview(id);
    res.json({ success: true, message: '评测删除成功' });
  })
);

/**
 * @route POST /api/v1/community/reviews/:id/like
 * @desc 点赞/取消点赞评测
 * @access Private - 需要有效访问令牌
 *
 * @headers Authorization: Bearer <access_token>
 * @param {string} id - 路径参数，评测 ID
 *
 * @response 200 - 操作成功
 * @response 401 - 未认证
 */
router.post(
  '/reviews/:id/like',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { likes } = await reviewService.likeReview(req.params.id);
    res.json({ success: true, data: { reviewId: req.params.id, likes, liked: true }, message: '点赞成功' });
  })
);

/**
 * @route POST /api/v1/community/reviews/:id/feature
 * @desc 标记/取消标记精选评测（管理员操作）
 * @access Private - 需要有效访问令牌，且角色为 admin
 *
 * @headers Authorization: Bearer <access_token>
 * @param {string} id - 路径参数，评测 ID
 * @body {object}
 *   @property {boolean} [isFeatured=true] - true 标记精选 / false 取消精选
 *
 * @response 200 - 操作成功
 * @response 401 - 未认证
 * @response 403 - 无管理员权限
 * @response 404 - 评测不存在
 */
router.post(
  '/reviews/:id/feature',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isFeatured = true } = req.body;
    const review = await reviewService.featureReview(id, isFeatured);
    res.json({ success: true, data: review, message: isFeatured ? '评测已标记为精选' : '评测已取消精选' });
  })
);

/**
 * @route GET /api/v1/community/reviews/:id/comments
 * @desc 获取评测的评论列表
 * @access Public - 可选认证
 *
 * @param {string} id - 路径参数，评测 ID
 * @query {number} [page=1] - 页码
 * @query {number} [limit=20] - 每页条数
 *
 * @response 200 - 成功返回评论列表和分页信息
 */
router.get(
  '/reviews/:id/comments',
  optionalAuthenticate,
  validateRequest(paginationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const result = await reviewService.getReviewComments(id, { page: Number(page), limit: Number(limit) });
    const totalPages = Math.ceil(result.total / result.limit);
    res.json({ success: true, data: { reviewId: id, comments: result.comments, pagination: { page: result.page, limit: result.limit, total: result.total, totalPages, hasNext: result.page < totalPages, hasPrev: result.page > 1 } }, message: '评测评论获取成功' });
  })
);

/**
 * @route GET /api/v1/community/stats
 * @desc 获取社区综合统计信息
 * @access Public - 可选认证
 *
 * 并发查询数据库获取社区四项核心统计数据：
 *   - 帖子总数（未删除的社区帖子）
 *   - 评测总数（未删除的游戏评测）
 *   - 评论总数（未删除的评论）
 *   - 活跃用户数（is_active = true 的用户）
 *
 * @response 200 - 成功返回社区统计信息
 *   @body {number} data.posts - 帖子总数
 *   @body {number} data.reviews - 评测总数
 *   @body {number} data.comments - 评论总数
 *   @body {number} data.users - 活跃用户数
 */
router.get(
  '/stats',
  optionalAuthenticate,
  asyncHandler(async (_req: Request, res: Response) => {
    const [postCount, reviewCount, commentCount, userCount] = await Promise.all([
      query('SELECT COUNT(*) as count FROM community_posts WHERE deleted_at IS NULL'),
      query('SELECT COUNT(*) as count FROM reviews WHERE deleted_at IS NULL'),
      query('SELECT COUNT(*) as count FROM comments WHERE deleted_at IS NULL'),
      query('SELECT COUNT(*) as count FROM users WHERE is_active = true'),
    ]);
    res.json({ success: true, data: { posts: parseInt(postCount[0]?.count || '0'), reviews: parseInt(reviewCount[0]?.count || '0'), comments: parseInt(commentCount[0]?.count || '0'), users: parseInt(userCount[0]?.count || '0') }, message: '社区统计获取成功' });
  })
);

export default router;