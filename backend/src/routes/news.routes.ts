/**
 * 新闻路由模块
 *
 * 本模块提供新闻/博客文章相关的所有 REST API 路由，包括：
 * - 获取新闻列表（支持分类筛选、分页，可选仅显示已发布文章）
 * - 搜索新闻（关键词搜索，支持分类筛选）
 * - 获取新闻分类列表（活跃分类）
 * - 获取当前用户的文章列表（按状态筛选）
 * - 获取新闻详情（支持数字 ID 或 slug 查询）
 * - 创建新闻/博客（管理员权限，需审核流程）
 * - 更新新闻（作者或管理员）
 * - 删除新闻（作者或管理员）
 * - 点赞新闻
 * - 获取新闻评论（分页）
 *
 * 路由前缀: /api/v1/news
 * 认证策略: 公开路由可匿名访问，操作类路由需登录并根据角色授权
 */

import { Router, Request, Response } from 'express';
import { authenticate, optionalAuthenticate, validateRequest, authorize } from '../middlewares/auth.middleware';
import { asyncHandler, AuthorizationError } from '../middlewares/error.middleware';
import { paginationSchema, searchSchema } from '../validators';
import newsService from '../services/news.service';
import { newsCategoryModel } from '../models/NewsCategory';
import { NewsCreateInput, NewsUpdateInput } from '../types';

const router = Router();

/**
 * @route GET /api/v1/news
 * @desc 获取新闻列表（支持分页和分类筛选）
 *       默认仅返回已发布（published）状态的新闻。管理员可通过 published 参数控制。
 * @access Public — 可选登录
 *
 * @middleware optionalAuthenticate - 可选身份认证，提供 Token 时解析用户信息
 * @middleware validateRequest(paginationSchema) - 验证分页参数 page 和 limit 的格式
 *
 * @param {number} [req.query.page=1] - 页码，从 1 开始
 * @param {number} [req.query.limit=20] - 每页条数
 * @param {string} [req.query.category] - 按分类筛选（分类 slug 或 ID）
 * @param {string} [req.query.published] - 是否仅返回已发布文章，默认 true
 *
 * @returns {200} {
 *   success: true,
 *   data: {
 *     news: News[],
 *     pagination: { page, limit, total, totalPages, hasNext, hasPrev }
 *   },
 *   message: '新闻列表获取成功'
 * }
 *
 * @example
 *   GET /api/v1/news?page=1&limit=20&category=gaming-news
 */
router.get(
  '/',
  optionalAuthenticate,
  validateRequest(paginationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, category, published, reviewStatus, lang } = req.query;
    const publishedOnly = published === undefined ? true : published === 'true';

    // 管理员可查看所有状态的新闻，普通用户仅看已审核
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
    const reviewStatusFilter = isAdmin ? (reviewStatus as string || 'all') : undefined;

    const { news, total, page: currentPage, limit: currentLimit } = await newsService.getNews(
      {
        page: Number(page),
        limit: Number(limit),
        sortBy: 'publishedAt',
        sortOrder: 'desc',
      },
      {
        category: category as string,
        publishedOnly,
        reviewStatus: reviewStatusFilter,
      },
      lang as string | undefined
    );

    const totalPages = Math.ceil(total / currentLimit);

    res.json({
      success: true,
      data: {
        news,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          total,
          totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
        },
      },
      message: '新闻列表获取成功',
    });
  })
);

/**
 * @route GET /api/v1/news/search
 * @desc 搜索新闻文章（支持关键词搜索和分类筛选）
 *       通过关键词匹配新闻标题和内容，仅搜索已发布的文章。
 * @access Public — 可选登录
 *
 * @middleware optionalAuthenticate - 可选身份认证
 * @middleware validateRequest(searchSchema) - 验证搜索参数格式（query 字段必填）
 *
 * @param {string} req.query.query - 搜索关键词（必填）
 * @param {string} [req.query.category] - 可选，按分类筛选
 * @param {number} [req.query.page=1] - 页码
 * @param {number} [req.query.limit=20] - 每页条数
 *
 * @returns {200} {
 *   success: true,
 *   data: {
 *     news: News[],        // 搜索结果列表
 *     query: string,       // 原始搜索词
 *     category: string,    // 筛选的分类（如有）
 *     pagination: { page, limit, total, totalPages, hasNext, hasPrev }
 *   },
 *   message: '新闻搜索成功'
 * }
 *
 * @example
 *   GET /api/v1/news/search?query=英雄联盟&category=esports&page=1
 */
router.get(
  '/search',
  optionalAuthenticate,
  validateRequest(searchSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { query, category, page = 1, limit = 20, lang } = req.query;

    const { news, total, page: currentPage, limit: currentLimit, query: searchQuery } = await newsService.searchNews({
      query: query as string,
      page: Number(page),
      limit: Number(limit),
      filters: {
        category: category as string,
        publishedOnly: true,
      },
    }, lang as string | undefined);

    const totalPages = Math.ceil(total / currentLimit);

    res.json({
      success: true,
      data: {
        news,
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
      message: '新闻搜索成功',
    });
  })
);

/**
 * @route GET /api/v1/news/categories/list
 * @desc 获取所有活跃的新闻分类列表
 *       返回可用于筛选新闻的分类选项，包含分类名称、slug 等元数据。
 * @access Public — 完全公开，无需认证
 *
 * @returns {200} { success: true, data: NewsCategory[], message: '新闻分类列表获取成功' }
 *
 * @example
 *   GET /api/v1/news/categories/list
 *   Response: { "success": true, "data": [{ "id": 1, "name": "游戏资讯", "slug": "gaming-news" }] }
 */
router.get(
  '/categories/list',
  asyncHandler(async (_req: Request, res: Response) => {
    const categories = await newsCategoryModel.findActive();
    res.json({
      success: true,
      data: categories,
      message: '新闻分类列表获取成功',
    });
  })
);

/**
 * @route GET /api/v1/news/my
 * @desc 获取当前用户创建的文章列表（支持按状态筛选）
 *       用户可查看自己提交的文章及其审核状态（pending / approved / rejected）。
 * @access Private — 需要登录认证
 *
 * @middleware authenticate - 验证用户 JWT Token
 *
 * @param {number} [req.query.page=1] - 页码
 * @param {number} [req.query.limit=20] - 每页条数
 * @param {string} [req.query.status] - 可选，按状态筛选（pending | approved | rejected）
 *
 * @returns {200} {
 *   success: true,
 *   data: {
 *     news: News[],       // 用户文章列表
 *     pagination: { page, limit, total, totalPages, hasNext, hasPrev }
 *   },
 *   message: '我的文章列表获取成功'
 * }
 *
 * @example
 *   GET /api/v1/news/my?page=1&limit=20&status=approved
 */
router.get(
  '/my',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { page = 1, limit = 20, status } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '用户未认证',
      });
    }

    const { news, total, page: currentPage, limit: currentLimit } = await newsService.getMyNews(
      userId,
      { page: Number(page), limit: Number(limit), status: status as string }
    );

    const totalPages = Math.ceil(total / currentLimit);

    res.json({
      success: true,
      data: {
        news,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          total,
          totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
        },
      },
      message: '我的文章列表获取成功',
    });
  })
);

/**
 * @route GET /api/v1/news/:id
 * @desc 根据 ID 或 slug 获取新闻详情
 *       自动识别参数格式：纯数字按主键 ID 查询，否则按 slug 查询。
 * @access Public — 可选登录
 *
 * @middleware optionalAuthenticate - 可选身份认证
 *
 * @param {string} req.params.id - 新闻 ID（数字）或 slug（字符串标识）
 *
 * @returns {200} { success: true, data: News, message: '新闻详情获取成功' }
 * @returns {404} { success: false, error: '新闻不存在' } — 未找到时返回
 *
 * @example
 *   GET /api/v1/news/123           — 按 ID 查询
 *   GET /api/v1/news/lol-champion-rework — 按 slug 查询
 */
router.get(
  '/:id',
  optionalAuthenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const lang = req.query.lang as string | undefined;

    // 自动判断：纯数字 ID 按主键查询，否则按 slug 查询
    const isNumeric = /^\d+$/.test(id);
    const news = isNumeric
      ? await newsService.getNewsById(id, lang)
      : await newsService.getNewsBySlug(id, lang);

    res.json({
      success: true,
      data: news,
      message: '新闻详情获取成功',
    });
  })
);

/**
 * @route POST /api/v1/news
 * @desc 创建新闻/博客文章
 *       需要管理员或 super_admin 权限的后台管理操作。
 *       普通用户不可直接调用此接口（被 authorize('admin') 拦截）。
 *       创建后根据用户角色和 AI 审核结果返回不同提示信息。
 * @access Private — 需要登录且具有 admin 角色
 *
 * @middleware authenticate - 验证用户 JWT Token
 * @middleware authorize('admin') - 验证用户角色为 admin 或 super_admin
 *
 * @param {string} req.body.title - 新闻标题（必填）
 * @param {string} req.body.content - 新闻内容（必填，支持 HTML 或 Markdown）
 * @param {string} req.body.category - 新闻分类（必填，分类 ID 或 slug）
 * @param {string} [req.body.summary] - 可选，文章摘要
 * @param {string[]} [req.body.tags] - 可选，标签数组
 * @param {string} [req.body.coverImage] - 可选，封面图片 URL
 * @param {string} [req.body.status] - 可选，发布状态（draft / published）
 *
 * @returns {201} {
 *   success: true,
 *   data: News,
 *   message: '新闻创建成功' | '博客发布成功！' | '博客提交成功，等待管理员审核' | ...
 * }
 * @returns {400} { success: false, error: '标题、内容和分类是必填字段' }
 * @returns {401} { success: false, error: '用户未认证' }
 * @returns {403} { success: false, error: '无权限' } — 非管理员尝试创建时返回
 *
 * @example
 *   POST /api/v1/news
 *   Body: { "title": "2026年最受期待游戏", "content": "<p>文章内容...</p>", "category": "gaming-news" }
 */
router.post(
  '/',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const newsData: NewsCreateInput = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '用户未认证',
      });
    }

    // 验证必需字段：标题、内容和分类不能为空
    if (!newsData.title || !newsData.content || !newsData.category) {
      return res.status(400).json({
        success: false,
        error: '标题、内容和分类是必填字段',
      });
    }

    const news = await newsService.createNews(userId, newsData);

    // 根据 AI 审核结果返回相应消息
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
    let message: string;
    if (isAdmin) {
      message = '新闻创建成功';
    } else if (news.reviewStatus === 'approved') {
      message = '博客发布成功！';
    } else if (news.reviewStatus === 'rejected') {
      message = `博客内容未通过审核：${news.reviewComment || '内容不符合规范'}`;
    } else {
      message = '博客提交成功，等待管理员审核';
    }

    res.status(201).json({
      success: true,
      data: news,
      message,
    });
  })
);

/**
 * @route PUT /api/v1/news/:id
 * @desc 更新指定新闻文章
 *       权限控制：管理员和 super_admin 可以更新任意文章；
 *       普通作者只能更新自己的文章，否则抛出 AuthorizationError。
 * @access Private — 需要登录（作者或管理员）
 *
 * @middleware authenticate - 验证用户 JWT Token
 *
 * @param {string} req.params.id - 要更新的新闻 ID
 * @param {string} [req.body.title] - 新标题
 * @param {string} [req.body.content] - 新内容
 * @param {string} [req.body.category] - 新分类
 * @param {string} [req.body.status] - 新状态（draft / published）
 * @param {string} [req.body.summary] - 新摘要
 * @param {string[]} [req.body.tags] - 新标签列表
 * @param {string} [req.body.coverImage] - 新封面图 URL
 *
 * @returns {200} { success: true, data: News, message: '新闻更新成功' }
 * @returns {401} { success: false, error: '用户未认证' }
 * @returns {403} { success: false, error: '无权修改此文章' } — 非作者/管理员尝试修改时返回
 *
 * @example
 *   PUT /api/v1/news/123
 *   Body: { "title": "更新后的标题", "status": "published" }
 */
router.put(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData: NewsUpdateInput = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // 非管理员只能更新自己的文章
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      const authorId = await newsService.getNewsAuthorId(id);
      if (!authorId || authorId !== userId) {
        throw new AuthorizationError('无权修改此文章');
      }
    }

    const news = await newsService.updateNews(id, updateData, true);

    res.json({
      success: true,
      data: news,
      message: '新闻更新成功',
    });
  })
);

/**
 * @route DELETE /api/v1/news/:id
 * @desc 删除指定新闻文章
 *       权限控制同更新：管理员可删除任意文章，普通作者只能删除自己的文章。
 * @access Private — 需要登录（作者或管理员）
 *
 * @middleware authenticate - 验证用户 JWT Token
 *
 * @param {string} req.params.id - 要删除的新闻 ID
 *
 * @returns {200} { success: true, message: '新闻删除成功' }
 * @returns {401} { success: false, error: '用户未认证' }
 * @returns {403} { success: false, error: '无权删除此文章' } — 非作者/管理员尝试删除时返回
 *
 * @example
 *   DELETE /api/v1/news/123
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // 非管理员只能删除自己的文章
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      const authorId = await newsService.getNewsAuthorId(id);
      if (!authorId || authorId !== userId) {
        throw new AuthorizationError('无权删除此文章');
      }
    }

    await newsService.deleteNews(id);

    res.json({
      success: true,
      message: '新闻删除成功',
    });
  })
);

/**
 * @route POST /api/v1/news/:id/like
 * @desc 点赞新闻文章
 *       增加新闻的点赞计数。注意：当前实现中点赞不区分用户，
 *       每次调用都会增加点赞数（适合用作"热度"计数）。
 * @access Private — 需要登录
 *
 * @middleware authenticate - 验证用户 JWT Token
 *
 * @param {string} req.params.id - 新闻 ID
 *
 * @returns {200} { success: true, data: { likes: number }, message: '点赞成功' }
 *
 * @example
 *   POST /api/v1/news/123/like
 *   Response: { "success": true, "data": { "likes": 128 }, "message": "点赞成功" }
 */
router.post(
  '/:id/like',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { likes, liked } = await newsService.likeNews(id, req.user!.id);

    res.json({
      success: true,
      data: { likes, liked },
      message: liked ? '点赞成功' : '已取消点赞',
    });
  })
);

router.post('/:id/pin', authenticate, authorize('admin'), asyncHandler(async (req: Request, res: Response) => {
  const news = await newsService.pinNews(req.params.id);
  res.json({ success: true, data: news, message: '置顶成功' });
}));

router.post('/:id/unpin', authenticate, authorize('admin'), asyncHandler(async (req: Request, res: Response) => {
  const news = await newsService.unpinNews(req.params.id);
  res.json({ success: true, data: news, message: '取消置顶成功' });
}));

/**
 * @route GET /api/v1/news/:id/comments
 * @desc 获取指定新闻文章的评论列表（支持分页）
 * @access Public — 可选登录
 *
 * @middleware optionalAuthenticate - 可选身份认证
 * @middleware validateRequest(paginationSchema) - 验证分页参数格式
 *
 * @param {string} req.params.id - 新闻 ID
 * @param {number} [req.query.page=1] - 页码
 * @param {number} [req.query.limit=20] - 每页评论数
 *
 * @returns {200} {
 *   success: true,
 *   data: {
 *     newsId: string,
 *     comments: Comment[],
 *     pagination: { page, limit, total, totalPages, hasNext, hasPrev }
 *   },
 *   message: '新闻评论获取成功'
 * }
 *
 * @example
 *   GET /api/v1/news/123/comments?page=1&limit=20
 */
router.get(
  '/:id/comments',
  optionalAuthenticate,
  validateRequest(paginationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const { comments, total, page: currentPage, limit: currentLimit } = await newsService.getNewsComments(id, {
      page: Number(page),
      limit: Number(limit),
    });

    const totalPages = Math.ceil(total / currentLimit);

    res.json({
      success: true,
      data: {
        newsId: id,
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
      message: '新闻评论获取成功',
    });
  })
);

export default router;
