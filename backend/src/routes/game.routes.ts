/**
 * 游戏主功能路由模块
 *
 * 本模块负责处理游戏核心数据相关的所有 HTTP 路由，包括：
 * - 获取游戏列表（支持搜索、分页、筛选）
 * - 搜索游戏
 * - 获取有论坛帖子的游戏列表（游戏论坛广场用）
 * - 获取游戏详情（支持 ID 或 slug 查找）
 * - 获取游戏评测
 * - 获取游戏社区帖子（论坛）
 * - 创建/更新/删除游戏（管理员）
 *
 * 公开接口使用 optionalAuthenticate 可选身份验证，
 * 管理接口使用 authenticate + authorize('admin') 双重保护，
 * 分页和搜索参数分别通过 paginationSchema 和 searchSchema 进行校验。
 */

import { Router, Request, Response } from 'express';
import { authenticate, optionalAuthenticate, validateRequest, authorize } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import { paginationSchema, searchSchema } from '../validators';
import gameService from '../services/game.service';
import communityService from '../services/community.service';
import { GameCreateInput, GameUpdateInput } from '../types';

const router = Router();

/**
 * @route GET /api/v1/games
 * @desc 获取游戏列表 - 支持分页、排序、搜索和多种条件筛选
 * @access Public（公开接口，可选择是否传入用户身份）
 *
 * @query {number} [page=1]      - 页码，默认第1页
 * @query {number} [limit=20]    - 每页数量，默认20
 * @query {string} [sortBy='createdAt'] - 排序字段
 * @query {string} [sortOrder='desc']   - 排序方向：asc 或 desc
 * @query {string} [search]      - 搜索关键词（传入时走全文搜索逻辑）
 * @query {string} [genre]       - 按游戏类型筛选
 * @query {string} [platform]    - 按平台筛选
 * @query {string} [zone]        - 按展示区域筛选
 *
 * @returns {200} { success: true, data: { games, pagination }, message: '游戏列表获取成功' }
 */
router.get(
  '/',
  optionalAuthenticate,      // 可选身份验证：如果提供了token则解析用户身份，否则为null
  validateRequest(paginationSchema),  // 分页参数验证中间件：校验 page 和 limit 参数格式
  asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', search, genre, platform, zone } = req.query;

    // 如果有搜索参数，使用搜索功能
    if (search) {
      const { games, total, page: currentPage, limit: currentLimit, query: searchQuery } = await gameService.searchGames({
        query: search as string,
        page: Number(page),
        limit: Number(limit),
        filters: {
          genre: genre as string,
          platform: platform as string,
        },
      });

      const totalPages = Math.ceil(total / currentLimit);

      return res.json({
        success: true,
        data: {
          games,
          query: searchQuery,
          pagination: {
            page: currentPage,
            limit: currentLimit,
            total,
            pages: totalPages,
            hasNext: currentPage < totalPages,
            hasPrev: currentPage > 1,
          },
        },
        message: '游戏列表获取成功',
      });
    }

    // 否则使用普通列表查询（支持排序和筛选）
    const { games, total, page: currentPage, limit: currentLimit } = await gameService.getGames({
      page: Number(page),
      limit: Number(limit),
      sortBy: String(sortBy),
      sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
    }, {
      genre: genre as string,
      platform: platform as string,
      displayZone: zone as string,
    });

    const totalPages = Math.ceil(total / currentLimit);

    return res.json({
      success: true,
      data: {
        games,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          total,
          pages: totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
        },
      },
      message: '游戏列表获取成功',
    });
  })
);

/**
 * @route GET /api/v1/games/search
 * @desc 搜索游戏 - 通过关键词搜索游戏，支持按类型和平台筛选
 * @access Public（公开接口，可选择是否传入用户身份）
 *
 * @query {string} query         - 搜索关键词（必填）
 * @query {number} [page=1]      - 页码，默认第1页
 * @query {number} [limit=20]    - 每页数量，默认20
 * @query {string} [genre]       - 按游戏类型筛选
 * @query {string} [platform]    - 按平台筛选
 *
 * @returns {200} { success: true, data: { games, query, pagination }, message: '游戏搜索成功' }
 */
router.get(
  '/search',
  optionalAuthenticate,      // 可选身份验证：如果提供了token则解析用户身份，否则为null
  validateRequest(searchSchema),      // 搜索参数验证中间件：校验 query 等参数格式
  asyncHandler(async (req: Request, res: Response) => {
    const { query, page = 1, limit = 20, genre, platform } = req.query;

    const { games, total, page: currentPage, limit: currentLimit, query: searchQuery } = await gameService.searchGames({
      query: query as string,
      page: Number(page),
      limit: Number(limit),
      filters: {
        genre: genre as string,
        platform: platform as string,
      },
    });

    const totalPages = Math.ceil(total / currentLimit);

    res.json({
      success: true,
      data: {
        games,
        query: searchQuery,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          total,
          pages: totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
        },
      },
      message: '游戏搜索成功',
    });
  })
);

/**
 * @route GET /api/v1/games/forum-stats
 * @desc 获取有论坛帖子的游戏列表 - 用于游戏论坛广场页面的展示
 * @access Public（公开接口，可选择是否传入用户身份）
 *
 * @query {number} [page=1]   - 页码，默认第1页
 * @query {number} [limit=20] - 每页数量，默认20
 * @query {string} [search]   - 搜索关键词
 *
 * @returns {200} { success: true, data: { games, pagination }, message: '论坛游戏列表获取成功' }
 */
router.get(
  '/forum-stats',
  optionalAuthenticate,      // 可选身份验证：如果提供了token则解析用户身份，否则为null
  asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, search } = req.query;

    const { games, total, page: currentPage, limit: currentLimit } = await gameService.getGamesWithForumPosts({
      page: Number(page),
      limit: Number(limit),
      search: search as string,
    });

    const totalPages = Math.ceil(total / currentLimit);

    res.json({
      success: true,
      data: {
        games,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          total,
          totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
        },
      },
      message: '论坛游戏列表获取成功',
    });
  })
);

/**
 * @route GET /api/v1/games/:id
 * @desc 获取游戏详情 - 支持通过 ID 或 slug 查找游戏
 * @access Public（公开接口，可选择是否传入用户身份）
 *
 * @param {string} req.params.id - 游戏ID 或 slug（先尝试按ID查找，失败则按slug查找）
 *
 * @returns {200} { success: true, data: game, message: '游戏详情获取成功' }
 */
router.get(
  '/:id',
  optionalAuthenticate,      // 可选身份验证：如果提供了token则解析用户身份，否则为null
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // 尝试按ID获取，如果失败则按slug获取（兼容两种查找方式）
    let game;
    try {
      game = await gameService.getGameById(id);
    } catch (error) {
      // 如果不是ID，可能是一个slug
      game = await gameService.getGameBySlug(id);
    }

    res.json({
      success: true,
      data: game,
      message: '游戏详情获取成功',
    });
  })
);

/**
 * @route GET /api/v1/games/:id/reviews
 * @desc 获取游戏的评测 - 分页查询指定游戏的用户评测列表
 * @access Public（公开接口，可选择是否传入用户身份）
 *
 * @param {string} req.params.id  - 游戏ID
 * @query {number} [page=1]       - 页码，默认第1页
 * @query {number} [limit=20]     - 每页数量，默认20
 *
 * @returns {200} { success: true, data: { gameId, reviews, pagination }, message: '游戏评测获取成功' }
 */
router.get(
  '/:id/reviews',
  optionalAuthenticate,      // 可选身份验证：如果提供了token则解析用户身份，否则为null
  validateRequest(paginationSchema),  // 分页参数验证中间件：校验 page 和 limit 参数格式
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const { reviews, total, page: currentPage, limit: currentLimit } = await gameService.getGameReviews(id, {
      page: Number(page),
      limit: Number(limit),
    });

    const totalPages = Math.ceil(total / currentLimit);

    res.json({
      success: true,
      data: {
        gameId: id,
        reviews,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          total,
          totalPages,
        },
      },
      message: '游戏评测获取成功',
    });
  })
);

/**
 * @route GET /api/v1/games/:id/posts
 * @desc 获取游戏的社区帖子（论坛）- 分页查询指定游戏的社区讨论帖子
 * @access Public（公开接口，可选择是否传入用户身份）
 *
 * @param {string} req.params.id  - 游戏ID
 * @query {number} [page=1]       - 页码，默认第1页
 * @query {number} [limit=20]     - 每页数量，默认20
 *
 * @returns {200} { success: true, data: { posts, pagination }, message: '游戏论坛帖子获取成功' }
 */
router.get(
  '/:id/posts',
  optionalAuthenticate,      // 可选身份验证：如果提供了token则解析用户身份，否则为null
  validateRequest(paginationSchema),  // 分页参数验证中间件：校验 page 和 limit 参数格式
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const { posts, total, page: currentPage, limit: currentLimit } = await communityService.getCommunityPosts(
      { page: Number(page), limit: Number(limit), sortBy: 'publishedAt', sortOrder: 'desc' },
      { gameId: id }
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
      message: '游戏论坛帖子获取成功',
    });
  })
);

/**
 * @route POST /api/v1/games
 * @desc 创建游戏（管理员）- 新增一个游戏条目
 * @access Private/Admin（需要登录认证且为管理员角色）
 *
 * @param {Object} req.body - 请求体
 * @param {string}   req.body.title         - 游戏标题（必填）
 * @param {string[]} req.body.genres        - 游戏类型数组（必填，至少一项）
 * @param {string[]} req.body.platforms     - 游戏平台数组（必填，至少一项）
 * @param {string}   [req.body.description] - 游戏描述
 * @param {...}      [req.body.otherFields] - 其他游戏属性字段
 *
 * @returns {201} { success: true, data: game, message: '游戏创建成功' }
 * @returns {400} { success: false, error: '游戏标题不能为空' } - 缺少标题
 * @returns {400} { success: false, error: '至少需要选择一个游戏类型' } - 未选类型
 * @returns {400} { success: false, error: '至少需要选择一个游戏平台' } - 未选平台
 */
router.post(
  '/',
  authenticate,              // 身份验证中间件：确保用户已登录
  authorize('admin'),        // 权限控制中间件：仅管理员可访问
  asyncHandler(async (req: Request, res: Response) => {
    const gameData: GameCreateInput = req.body;

    // 验证必需字段
    if (!gameData.title) {
      return res.status(400).json({
        success: false,
        error: '游戏标题不能为空',
      });
    }

    if (!gameData.genres || !Array.isArray(gameData.genres) || gameData.genres.length === 0) {
      return res.status(400).json({
        success: false,
        error: '至少需要选择一个游戏类型',
      });
    }

    if (!gameData.platforms || !Array.isArray(gameData.platforms) || gameData.platforms.length === 0) {
      return res.status(400).json({
        success: false,
        error: '至少需要选择一个游戏平台',
      });
    }

    const game = await gameService.createGame(gameData);

    return res.status(201).json({
      success: true,
      data: game,
      message: '游戏创建成功',
    });
  })
);

/**
 * @route PUT /api/v1/games/:id
 * @desc 更新游戏（管理员）- 更新指定游戏的详细信息
 * @access Private/Admin（需要登录认证且为管理员角色）
 *
 * @param {string} req.params.id - 游戏ID
 * @param {Object} req.body      - 要更新的游戏数据（GameUpdateInput）
 *
 * @returns {200} { success: true, data: game, message: '游戏更新成功' }
 */
router.put(
  '/:id',
  authenticate,              // 身份验证中间件：确保用户已登录
  authorize('admin'),        // 权限控制中间件：仅管理员可访问
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData: GameUpdateInput = req.body;

    const game = await gameService.updateGame(id, updateData);

    return res.json({
      success: true,
      data: game,
      message: '游戏更新成功',
    });
  })
);

/**
 * @route DELETE /api/v1/games/:id
 * @desc 删除游戏（管理员）- 删除指定游戏及其关联数据
 * @access Private/Admin（需要登录认证且为管理员角色）
 *
 * @param {string} req.params.id - 要删除的游戏ID
 *
 * @returns {200} { success: true, message: '游戏删除成功' }
 */
router.delete(
  '/:id',
  authenticate,              // 身份验证中间件：确保用户已登录
  authorize('admin'),        // 权限控制中间件：仅管理员可访问
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await gameService.deleteGame(id);

    return res.json({
      success: true,
      message: '游戏删除成功',
    });
  })
);

export default router;
