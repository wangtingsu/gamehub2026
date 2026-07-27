/**
 * 用户游戏库路由模块
 *
 * 本模块负责处理用户个人游戏库相关的所有 HTTP 路由，包括：
 * - 获取/搜索用户游戏库列表
 * - 获取游戏库统计信息
 * - 添加/更新/移除游戏条目
 * - 获取游戏库条目详情（含游戏信息）
 * - 导入外部游戏库数据
 * - 更新游戏最后游玩时间
 * - 批量获取游戏库状态
 *
 * 所有接口均需要用户登录认证（authenticate），
 * 提供完整的 CRUD 操作和搜索/分页能力。
 */

import { Router, Request, Response } from 'express';
import { authenticate, authorize, validateRequest } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import * as gameLibraryService from '../services/game-library.service';
import { userGameLibraryModel } from '../models/UserGameLibrary';

const router = Router();

/**
 * @route GET /api/v1/library
 * @desc 获取用户游戏库 - 分页查询当前用户的游戏库，支持状态/平台筛选和搜索
 * @access Private（需要登录认证）
 *
 * @query {string} [status]    - 游戏状态筛选（如：playing, completed, wishlist 等）
 * @query {string} [platform]  - 平台筛选
 * @query {number} [page=1]    - 页码，默认第1页
 * @query {number} [limit=20]  - 每页数量，默认20
 * @query {string} [sortBy='added_at'] - 排序字段，默认按添加时间
 * @query {string} [sortOrder='DESC']  - 排序方向，ASC | DESC
 * @query {string} [search]    - 搜索关键词（如有则走搜索逻辑）
 *
 * @returns {200} { success: true, data: { games, pagination } }
 */
router.get(
  '/',
  authenticate,              // 身份验证中间件：确保用户已登录
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const {
      status,
      platform,
      page = '1',
      limit = '20',
      sortBy = 'added_at',
      sortOrder = 'DESC',
      search
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    let result;
    if (search) {
      // 搜索游戏库：根据关键词搜索用户游戏库中的内容
      result = await gameLibraryService.searchUserLibrary(
        userId,
        search as string,
        {
          status: status as any,
          platform: platform as any,
          limit: limitNum,
          offset
        }
      );
    } else {
      // 获取游戏库列表：普通分页查询
      result = await gameLibraryService.getUserGameLibrary(
        userId,
        {
          status: status as any,
          platform: platform as any,
          limit: limitNum,
          offset,
          sortBy: sortBy as any,
          sortOrder: sortOrder as any
        }
      );
    }

    return res.status(200).json({
      success: true,
      data: {
        games: result.games,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.total,
          pages: Math.ceil(result.total / limitNum)
        }
      }
    });
  })
);

/**
 * @route GET /api/v1/library/stats
 * @desc 获取用户游戏库统计 - 查询当前用户的游戏库统计数据
 * @access Private（需要登录认证）
 *
 * @returns {200} { success: true, data: stats } - 包含各状态数量、总游戏数等统计
 */
router.get(
  '/stats',
  authenticate,              // 身份验证中间件：确保用户已登录
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const stats = await gameLibraryService.getLibraryStats(userId);

    return res.status(200).json({
      success: true,
      data: stats
    });
  })
);

/**
 * @route POST /api/v1/library
 * @desc 添加游戏到库 - 将指定游戏添加到当前用户的游戏库中
 * @access Private（需要登录认证）
 *
 * @param {Object} req.body - 请求体
 * @param {string}   req.body.gameId          - 游戏ID（必填）
 * @param {string}   [req.body.status='wishlist'] - 游戏状态，默认"想玩"
 * @param {Array}    [req.body.platforms=[]]      - 拥有的平台列表
 * @param {number}   [req.body.personalRating]    - 个人评分
 * @param {string}   [req.body.personalNotes]     - 个人备注
 * @param {string[]} [req.body.tags=[]]           - 自定义标签
 * @param {string}   [req.body.primaryPlatform]   - 主要平台
 *
 * @returns {201} { success: true, data: { libraryEntry }, message: '游戏已添加到库' }
 * @returns {400} { success: false, error: '游戏ID不能为空' } - 缺少 gameId
 * @returns {400} { success: false, error: '平台数据格式错误' } - platforms 不是数组
 */
router.post(
  '/',
  authenticate,              // 身份验证中间件：确保用户已登录
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const {
      gameId,
      status = 'wishlist',
      platforms = [],
      personalRating,
      personalNotes,
      tags = [],
      primaryPlatform
    } = req.body;

    if (!gameId) {
      return res.status(400).json({
        success: false,
        error: '游戏ID不能为空'
      });
    }

    // 验证平台数据格式
    if (!Array.isArray(platforms)) {
      return res.status(400).json({
        success: false,
        error: '平台数据格式错误'
      });
    }

    const libraryEntry = await gameLibraryService.addGameToLibrary(userId, {
      gameId,
      status,
      platforms,
      personalRating,
      personalNotes,
      tags,
      primaryPlatform
    });

    return res.status(201).json({
      success: true,
      data: {
        libraryEntry
      },
      message: '游戏已添加到库'
    });
  })
);

/**
 * @route PUT /api/v1/library/:id
 * @desc 更新游戏库条目 - 更新指定游戏库条目的状态、平台、评分等信息
 * @access Private（需要登录认证）
 *
 * @param {string} req.params.id - 游戏库条目ID（路径参数）
 * @param {Object} req.body      - 更新数据
 * @param {string}   [req.body.status]          - 游戏状态
 * @param {Array}    [req.body.platforms]       - 拥有的平台列表
 * @param {number}   [req.body.personalRating]  - 个人评分
 * @param {string}   [req.body.personalNotes]   - 个人备注
 * @param {string[]} [req.body.tags]            - 自定义标签
 * @param {string}   [req.body.primaryPlatform] - 主要平台
 *
 * @returns {200} { success: true, data: { libraryEntry }, message: '游戏库条目已更新' }
 */
router.put(
  '/:id',
  authenticate,              // 身份验证中间件：确保用户已登录
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const libraryId = req.params.id;
    const {
      status,
      platforms,
      personalRating,
      personalNotes,
      tags,
      primaryPlatform
    } = req.body;

    const updatedEntry = await gameLibraryService.updateGameLibraryEntry(
      userId,
      libraryId,
      {
        status,
        platforms,
        personalRating,
        personalNotes,
        tags,
        primaryPlatform
      }
    );

    return res.status(200).json({
      success: true,
      data: {
        libraryEntry: updatedEntry
      },
      message: '游戏库条目已更新'
    });
  })
);

/**
 * @route DELETE /api/v1/library/:id
 * @desc 从库中移除游戏 - 删除指定游戏库条目
 * @access Private（需要登录认证）
 *
 * @param {string} req.params.id - 要删除的游戏库条目ID
 *
 * @returns {200} { success: true, message: '游戏已从库中移除' }
 * @returns {404} { success: false, error: '游戏库条目不存在' }
 */
router.delete(
  '/:id',
  authenticate,              // 身份验证中间件：确保用户已登录
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const libraryId = req.params.id;

    const success = await gameLibraryService.removeGameFromLibrary(userId, libraryId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: '游戏库条目不存在'
      });
    }

    return res.status(200).json({
      success: true,
      message: '游戏已从库中移除'
    });
  })
);

/**
 * @route GET /api/v1/library/:id/details
 * @desc 获取游戏库条目详情（包含游戏信息）- 查询指定条目的完整信息
 * @access Private（需要登录认证）
 *
 * @param {string} req.params.id - 游戏库条目ID
 *
 * @returns {200} { success: true, data: details } - 包含入库信息和关联的游戏详情
 */
router.get(
  '/:id/details',
  authenticate,              // 身份验证中间件：确保用户已登录
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const libraryId = req.params.id;

    const details = await gameLibraryService.getLibraryEntryWithGameDetails(userId, libraryId);

    return res.status(200).json({
      success: true,
      data: details
    });
  })
);

/**
 * @route POST /api/v1/library/import
 * @desc 导入外部游戏库 - 从外部数据（如其他平台）批量导入游戏到用户库
 * @access Private（需要登录认证）
 *
 * @param {Object} req.body - 请求体
 * @param {Array}  req.body.externalData - 外部游戏数据数组（必填）
 *
 * @returns {200} { success: true, data: { importedCount }, message: '成功导入 N 个游戏' }
 * @returns {400} { success: false, error: '外部数据格式错误' }
 */
router.post(
  '/import',
  authenticate,              // 身份验证中间件：确保用户已登录
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { externalData } = req.body;

    if (!Array.isArray(externalData)) {
      return res.status(400).json({
        success: false,
        error: '外部数据格式错误'
      });
    }

    const importedCount = await gameLibraryService.importExternalLibrary(userId, externalData);

    return res.status(200).json({
      success: true,
      data: {
        importedCount
      },
      message: `成功导入 ${importedCount} 个游戏`
    });
  })
);

/**
 * @route POST /api/v1/library/:gameId/last-played
 * @desc 更新游戏最后游玩时间 - 记录用户最近一次游玩该游戏的时间
 * @access Private（需要登录认证）
 *
 * @param {string} req.params.gameId - 游戏ID
 *
 * @returns {200} { success: true, message: '最后游玩时间已更新' }
 * @returns {404} { success: false, error: '游戏不在库中' }
 */
router.post(
  '/:gameId/last-played',
  authenticate,              // 身份验证中间件：确保用户已登录
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const gameId = req.params.gameId;

    const success = await gameLibraryService.updateLastPlayed(userId, gameId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: '游戏不在库中'
      });
    }

    return res.status(200).json({
      success: true,
      message: '最后游玩时间已更新'
    });
  })
);

/**
 * @route GET /api/v1/library/batch-status
 * @desc 批量获取游戏库状态 - 一次性查询多个游戏在当前用户库中的状态
 * @access Private（需要登录认证）
 *
 * @query {string} gameIds - 游戏ID列表，用逗号分隔（必填）
 *
 * @returns {200} { success: true, data: status } - 各游戏对应的库状态
 * @returns {400} { success: false, error: '游戏ID列表不能为空' }
 */
router.get(
  '/batch-status',
  authenticate,              // 身份验证中间件：确保用户已登录
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { gameIds } = req.query;

    if (!gameIds || typeof gameIds !== 'string') {
      return res.status(400).json({
        success: false,
        error: '游戏ID列表不能为空'
      });
    }

    // 将逗号分隔的字符串转换为数组，并过滤掉空字符串
    const ids = gameIds.split(',').filter(id => id.trim());
    if (ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: '游戏ID列表不能为空'
      });
    }

    const status = await gameLibraryService.getBatchLibraryStatus(userId, ids);

    return res.status(200).json({
      success: true,
      data: status
    });
  })
);

export default router;
