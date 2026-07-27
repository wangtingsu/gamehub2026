/**
 * 游戏攻略路由模块
 *
 * 本模块负责处理游戏攻略相关的所有 HTTP 路由，包括：
 * - 获取攻略列表（支持分页、筛选）
 * - 搜索攻略
 * - 获取指定游戏的攻略列表
 * - 获取攻略详情（含浏览量递增）
 * - 创建/更新/删除攻略
 * - 点赞攻略
 * - 标记/取消精选攻略（管理员）
 * - 获取攻略评论
 *
 * 公开接口使用 optionalAuthenticate 可选身份验证，
 * 创建/管理接口使用 authenticate + authorize('admin') 权限控制，
 * 更新/删除接口会校验操作者是否为作者或管理员，
 * 分页和搜索参数分别通过 paginationSchema 和 searchSchema 进行校验。
 */

import { Router, Request, Response } from 'express';
import { authenticate, optionalAuthenticate, validateRequest, authorize } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import { paginationSchema, searchSchema } from '../validators';
import guideService from '../services/guide.service';
import { GuideCreateInput, GuideUpdateInput } from '../types';

const router = Router();

/**
 * @route GET /api/v1/guides
 * @desc 获取攻略列表 - 分页查询攻略，支持按游戏、难度、精选状态和作者筛选
 * @access Public（公开接口，可选择是否传入用户身份）
 *
 * @query {number} [page=1]      - 页码，默认第1页
 * @query {number} [limit=20]    - 每页数量，默认20
 * @query {string} [gameId]      - 按游戏ID筛选
 * @query {string} [difficulty]  - 按难度筛选（如：easy, medium, hard）
 * @query {string} [featured]    - 是否只显示精选攻略（'true' 时启用）
 * @query {string} [authorId]    - 按作者ID筛选
 *
 * @returns {200} { success: true, data: { guides, pagination }, message: '攻略列表获取成功' }
 */
router.get(
  '/',
  optionalAuthenticate,      // 可选身份验证：如果提供了token则解析用户身份，否则为null
  validateRequest(paginationSchema),  // 分页参数验证中间件：校验 page 和 limit 格式
  asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, gameId, difficulty, featured, authorId } = req.query;

    // 调用服务层获取攻略列表，按创建时间降序排列
    const { guides, total, page: currentPage, limit: currentLimit } = await guideService.getGuides(
      {
        page: Number(page),
        limit: Number(limit),
        sortBy: 'createdAt',
        sortOrder: 'desc',
      },
      {
        gameId: gameId as string,
        difficulty: difficulty as string,
        featuredOnly: featured === 'true',
        authorId: authorId as string,
      }
    );

    const totalPages = Math.ceil(total / currentLimit);

    res.json({
      success: true,
      data: {
        guides,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          total,
          totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
        },
      },
      message: '攻略列表获取成功',
    });
  })
);

/**
 * @route GET /api/v1/guides/search
 * @desc 搜索攻略 - 通过关键词搜索攻略，支持按游戏和难度筛选
 * @access Public（公开接口，可选择是否传入用户身份）
 *
 * @query {string} query           - 搜索关键词（必填）
 * @query {number} [page=1]        - 页码，默认第1页
 * @query {number} [limit=20]      - 每页数量，默认20
 * @query {string} [gameId]        - 按游戏ID筛选
 * @query {string} [difficulty]    - 按难度筛选
 *
 * @returns {200} { success: true, data: { guides, query, pagination }, message: '攻略搜索成功' }
 */
router.get(
  '/search',
  optionalAuthenticate,      // 可选身份验证：如果提供了token则解析用户身份，否则为null
  validateRequest(searchSchema),      // 搜索参数验证中间件：校验 query 等参数格式
  asyncHandler(async (req: Request, res: Response) => {
    const { query, gameId, difficulty, page = 1, limit = 20 } = req.query;

    const { guides, total, page: currentPage, limit: currentLimit, query: searchQuery } = await guideService.searchGuides({
      query: query as string,
      page: Number(page),
      limit: Number(limit),
      filters: {
        gameId: gameId as string,
        difficulty: difficulty as string,
      },
    });

    const totalPages = Math.ceil(total / currentLimit);

    res.json({
      success: true,
      data: {
        guides,
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
      message: '攻略搜索成功',
    });
  })
);

/**
 * @route GET /api/v1/guides/game/:gameId
 * @desc 获取游戏的攻略列表 - 按游戏ID查询关联的所有攻略，支持分页
 * @access Public（公开接口，可选择是否传入用户身份）
 *
 * @param {string} req.params.gameId - 游戏ID
 * @query {number} [page=1]   - 页码，默认第1页
 * @query {number} [limit=20] - 每页数量，默认20
 *
 * @returns {200} { success: true, data: { guides, pagination }, message: '游戏攻略列表获取成功' }
 */
router.get(
  '/game/:gameId',
  optionalAuthenticate,      // 可选身份验证：如果提供了token则解析用户身份，否则为null
  asyncHandler(async (req: Request, res: Response) => {
    const { gameId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const { guides, total, page: currentPage, limit: currentLimit } = await guideService.getGameGuides(gameId, {
      page: Number(page),
      limit: Number(limit),
    });

    const totalPages = Math.ceil(total / currentLimit);

    res.json({
      success: true,
      data: {
        guides,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          total,
          totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
        },
      },
      message: '游戏攻略列表获取成功',
    });
  })
);

/**
 * @route GET /api/v1/guides/:id
 * @desc 获取攻略详情 - 查询指定攻略的完整内容，同时异步递增浏览量
 * @access Public（公开接口，可选择是否传入用户身份）
 *
 * @param {string} req.params.id - 攻略ID
 *
 * @returns {200} { success: true, data: guide, message: '攻略详情获取成功' }
 *
 * @description
 * 访问详情时会异步调用 incrementViewCount 递增攻略的浏览次数，
 * 该操作不阻塞响应返回，即使递增失败也不影响正常内容展示。
 */
router.get(
  '/:id',
  optionalAuthenticate,      // 可选身份验证：如果提供了token则解析用户身份，否则为null
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const guide = await guideService.getGuideById(id);

    // 异步递增浏览量，不阻塞响应
    guideService.incrementViewCount(id).catch(() => {});

    res.json({
      success: true,
      data: guide,
      message: '攻略详情获取成功',
    });
  })
);

/**
 * @route POST /api/v1/guides
 * @desc 创建攻略（管理员）- 新增一篇游戏攻略
 * @access Private/Admin（需要登录认证且为管理员角色）
 *
 * @param {Object} req.body - 请求体
 * @param {string} req.body.title    - 攻略标题（必填）
 * @param {string} req.body.content  - 攻略内容（必填）
 * @param {string} req.body.gameId   - 关联的游戏ID（必填）
 * @param {string} [req.body.difficulty] - 攻略难度
 * @param {...}    [req.body.otherFields] - 其他攻略属性
 *
 * @returns {201} { success: true, data: guide, message: '攻略创建成功' }
 * @returns {400} { success: false, error: '标题、内容和游戏ID是必填字段' }
 * @returns {401} { success: false, error: '用户未认证' }
 */
router.post(
  '/',
  authenticate,              // 身份验证中间件：确保用户已登录
  authorize('admin'),        // 权限控制中间件：仅管理员可访问
  asyncHandler(async (req: Request, res: Response) => {
    const guideData: GuideCreateInput = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '用户未认证',
      });
    }

    // 验证必填字段
    if (!guideData.title || !guideData.content || !guideData.gameId) {
      return res.status(400).json({
        success: false,
        error: '标题、内容和游戏ID是必填字段',
      });
    }

    const guide = await guideService.createGuide(userId, guideData);

    res.status(201).json({
      success: true,
      data: guide,
      message: '攻略创建成功',
    });
  })
);

/**
 * @route PUT /api/v1/guides/:id
 * @desc 更新攻略（作者或管理员）- 修改指定攻略的内容
 * @access Private（需要登录认证，仅作者或管理员可操作）
 *
 * @param {string} req.params.id - 要更新的攻略ID
 * @param {Object} req.body      - 更新数据（GuideUpdateInput）
 *
 * @returns {200} { success: true, data: guide, message: '攻略更新成功' }
 * @returns {403} { success: false, error: '您没有权限更新此攻略' } - 非作者且非管理员
 *
 * @description
 * 权限校验逻辑：仅攻略作者、admin 或 super_admin 角色可以更新。
 */
router.put(
  '/:id',
  authenticate,              // 身份验证中间件：确保用户已登录
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData: GuideUpdateInput = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // 先获取当前攻略信息，校验操作者是否有权限
    const currentGuide = await guideService.getGuideById(id);

    // 仅作者本人、admin 或 super_admin 可以更新
    if (currentGuide.authorId !== userId && userRole !== 'admin' && userRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: '您没有权限更新此攻略',
      });
    }

    const guide = await guideService.updateGuide(id, updateData);

    res.json({
      success: true,
      data: guide,
      message: '攻略更新成功',
    });
  })
);

/**
 * @route DELETE /api/v1/guides/:id
 * @desc 删除攻略（作者或管理员）- 删除指定攻略
 * @access Private（需要登录认证，仅作者或管理员可操作）
 *
 * @param {string} req.params.id - 要删除的攻略ID
 *
 * @returns {200} { success: true, message: '攻略删除成功' }
 * @returns {403} { success: false, error: '您没有权限删除此攻略' } - 非作者且非管理员
 *
 * @description
 * 权限校验逻辑：仅攻略作者、admin 或 super_admin 角色可以删除。
 */
router.delete(
  '/:id',
  authenticate,              // 身份验证中间件：确保用户已登录
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // 先获取当前攻略信息，校验操作者是否有权限
    const currentGuide = await guideService.getGuideById(id);

    // 仅作者本人、admin 或 super_admin 可以删除
    if (currentGuide.authorId !== userId && userRole !== 'admin' && userRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: '您没有权限删除此攻略',
      });
    }

    await guideService.deleteGuide(id);

    res.json({
      success: true,
      message: '攻略删除成功',
    });
  })
);

/**
 * @route POST /api/v1/guides/:id/like
 * @desc 点赞攻略 - 为指定攻略增加一个赞
 * @access Private（需要登录认证）
 *
 * @param {string} req.params.id - 攻略ID
 *
 * @returns {200} { success: true, data: { guideId, likes, liked }, message: '点赞成功' }
 */
router.post(
  '/:id/like',
  authenticate,              // 身份验证中间件：确保用户已登录
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { likes } = await guideService.likeGuide(id);

    res.json({
      success: true,
      data: { guideId: id, likes, liked: true },
      message: '点赞成功',
    });
  })
);

/**
 * @route POST /api/v1/guides/:id/feature
 * @desc 标记/取消精选攻略（管理员）- 将攻略设为精选或取消精选状态
 * @access Private/Admin（需要登录认证且为管理员角色）
 *
 * @param {string}  req.params.id         - 攻略ID
 * @param {boolean} [req.body.isFeatured=true] - 是否设为精选，默认 true
 *
 * @returns {200} { success: true, data: guide, message: '攻略已标记为精选' | '攻略已取消精选' }
 */
router.post(
  '/:id/feature',
  authenticate,              // 身份验证中间件：确保用户已登录
  authorize('admin'),        // 权限控制中间件：仅管理员可访问
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isFeatured = true } = req.body;

    const guide = await guideService.featureGuide(id, isFeatured);

    res.json({
      success: true,
      data: guide,
      message: isFeatured ? '攻略已标记为精选' : '攻略已取消精选',
    });
  })
);

/**
 * @route GET /api/v1/guides/:id/comments
 * @desc 获取攻略评论 - 分页查询指定攻略的评论列表
 * @access Public（公开接口，可选择是否传入用户身份）
 *
 * @param {string} req.params.id  - 攻略ID
 * @query {number} [page=1]       - 页码，默认第1页
 * @query {number} [limit=20]     - 每页数量，默认20
 *
 * @returns {200} { success: true, data: { guideId, comments, pagination }, message: '攻略评论获取成功' }
 */
router.get(
  '/:id/comments',
  optionalAuthenticate,      // 可选身份验证：如果提供了token则解析用户身份，否则为null
  validateRequest(paginationSchema),  // 分页参数验证中间件：校验 page 和 limit 格式
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const { comments, total, page: currentPage, limit: currentLimit } = await guideService.getGuideComments(id, {
      page: Number(page),
      limit: Number(limit),
    });

    const totalPages = Math.ceil(total / currentLimit);

    res.json({
      success: true,
      data: {
        guideId: id,
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
      message: '攻略评论获取成功',
    });
  })
);

export default router;
