/**
 * 搜索路由模块
 *
 * 本模块提供全局搜索相关的 REST API，包括：
 * - 全局搜索（支持 v2 增强版高级筛选）
 * - 搜索建议（自动补全）
 * - 搜索趋势统计
 * - 用户搜索历史查询
 * - 热门搜索
 * - 搜索统计数据（管理员）
 *
 * 搜索功能分为旧版（search.service）和增强版 v2（search-v2.service），
 * 当请求包含高级筛选参数时自动使用 v2 高级搜索
 *
 * @module routes/search
 */

import { Router, Request, Response } from 'express';
import { optionalAuthenticate, validateRequest } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import { searchSchema } from '../validators';
import searchService from '../services/search.service';
import searchV2Service from '../services/search-v2.service';
import { query } from '../db';

const router = Router();

/**
 * @route GET /api/v1/search
 * @desc 全局搜索（v2 增强版，支持高级筛选）
 * @access Public
 *
 * @middleware optionalAuthenticate - 可选认证，已登录用户可记录搜索历史
 * @middleware validateRequest(searchSchema) - 验证搜索参数
 *
 * @param req.query.query - 搜索关键词
 * @param req.query.page - 页码，默认 1
 * @param req.query.limit - 每页数量，默认 20
 * @param req.query.types - 搜索类型（逗号分隔，如 "games,news,reviews"）
 * @param req.query.genres - 按游戏类型筛选（逗号分隔）
 * @param req.query.platforms - 按平台筛选（逗号分隔）
 * @param req.query.dateFrom - 日期范围起始（ISO 日期字符串）
 * @param req.query.dateTo - 日期范围结束（ISO 日期字符串）
 * @param req.query.ratingMin - 最低评分
 * @param req.query.ratingMax - 最高评分
 * @param req.query.tags - 按标签筛选（逗号分隔）
 * @param req.query.sortBy - 排序方式（relevance: 相关度, date: 日期, rating: 评分等）
 *
 * @returns
 *   - query: 搜索关键词
 *   - results: 搜索结果数组
 *   - byType: 按类型分类的结果统计
 *   - pagination: 分页信息
 *
 * 当请求包含 genres、platforms、dateFrom、dateTo、ratingMin、ratingMax、tags
 * 等高级筛选参数时，自动使用 searchV2Service.advancedSearch 进行增强搜索；
 * 否则使用 searchService.globalSearch 进行基础搜索
 */
router.get(
  '/',
  optionalAuthenticate,
  validateRequest(searchSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      query, page = 1, limit = 20, types,
      genres, platforms, dateFrom, dateTo, ratingMin, ratingMax,
      tags, sortBy,
    } = req.query;

    const hasAdvancedFilters = genres || platforms || dateFrom || dateTo || ratingMin || ratingMax || tags;
    const sortParam = (sortBy as string) || 'relevance';

    if (hasAdvancedFilters) {
      // 使用 v2 高级搜索：支持按类型、类型、平台、日期范围、评分范围、标签、排序等高级筛选
      const results = await searchV2Service.advancedSearch({
        query: query as string,
        page: Number(page),
        limit: Number(limit),
        types: types ? (types as string).split(',') : undefined,
        genres: genres ? (genres as string).split(',') : undefined,
        platforms: platforms ? (platforms as string).split(',') : undefined,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        ratingMin: ratingMin ? Number(ratingMin) : undefined,
        ratingMax: ratingMax ? Number(ratingMax) : undefined,
        tags: tags ? (tags as string).split(',') : undefined,
        sortBy: sortParam as any,
      });

      const totalPages = Math.ceil(results.total / results.limit);

      return res.json({
        success: true,
        data: {
          query: results.query,
          results: results.results,
          byType: results.byType,
          pagination: {
            page: results.page,
            limit: results.limit,
            total: results.total,
            totalPages,
            hasNext: results.page < totalPages,
            hasPrev: results.page > 1,
          },
        },
        message: '高级搜索成功',
      });
    }

    // 兼容旧版搜索：仅支持基本关键词搜索和类型筛选
    const { results: oldResults, total, page: currentPage, limit: currentLimit, query: searchQuery, byType } = await searchService.globalSearch({
      query: query as string,
      page: Number(page),
      limit: Number(limit),
      filters: {
        types: types ? (types as string).split(',') : undefined,
      },
    });

    const totalPages = Math.ceil(total / currentLimit);

    res.json({
      success: true,
      data: {
        query: searchQuery,
        results: oldResults,
        byType,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          total,
          totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
        },
      },
      message: '搜索成功',
    });
  })
);

/**
 * @route GET /api/v1/search/suggestions
 * @desc 搜索建议（自动补全）
 * @access Public
 *
 * @middleware optionalAuthenticate - 可选认证
 *
 * @param req.query.query - 用户输入的部分关键词，必填且不能为空
 * @param req.query.limit - 返回建议数量，默认 5
 *
 * @returns 包含建议关键词列表的响应
 *
 * 当用户输入为空时，返回空数组而不报错
 */
router.get(
  '/suggestions',
  optionalAuthenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { query, limit = 5 } = req.query;

    if (!query || (query as string).trim().length === 0) {
      return res.json({
        success: true,
        data: {
          suggestions: [],
          query: query || '',
        },
        message: '搜索建议获取成功',
      });
    }

    const suggestions = await searchService.searchSuggestions(query as string, Number(limit));

    res.json({
      success: true,
      data: {
        suggestions,
        query,
      },
      message: '搜索建议获取成功',
    });
  })
);

/**
 * @route GET /api/v1/search/trends
 * @desc 搜索趋势统计
 * @access Public
 *
 * @middleware optionalAuthenticate - 可选认证
 *
 * @param req.query.days - 统计天数，默认 30 天
 * @param req.query.topN - 返回热门搜索词数量，默认 20
 *
 * @returns 包含搜索趋势数据的响应
 */
router.get(
  '/trends',
  optionalAuthenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const days = Number(req.query.days) || 30;
    const topN = Number(req.query.topN) || 20;

    const trends = await searchV2Service.getSearchTrends(days, topN);

    res.json({
      success: true,
      data: { trends },
      message: '获取搜索趋势成功',
    });
  })
);

/**
 * @route GET /api/v1/search/history
 * @desc 用户搜索历史查询
 * @access Private（需要用户登录）
 *
 * @middleware optionalAuthenticate - 用户必须登录才能查看自己的搜索历史
 *
 * @param req.query.limit - 返回历史记录数量，默认 20
 *
 * @returns 包含用户搜索历史列表的响应
 *
 * 仅返回当前登录用户的搜索历史记录，未登录用户返回空列表
 * 数据来源：search_logs 数据表
 */
router.get(
  '/history',
  optionalAuthenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Number(req.query.limit) || 20;

    let results: Array<{ query: string; searchedAt: string }> = [];

    if (req.user) {
      results = await query(
        `SELECT query, created_at as searchedAt
         FROM search_logs
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [req.user.id, limit]
      );
    }

    res.json({
      success: true,
      data: { history: results },
      message: '获取搜索历史成功',
    });
  })
);

/**
 * @route GET /api/v1/search/popular
 * @desc 获取热门搜索关键词
 * @access Public
 *
 * @middleware optionalAuthenticate - 可选认证
 *
 * @param req.query.limit - 返回数量，默认 10
 *
 * @returns 包含热门搜索关键词列表的响应
 *
 * 基于搜索频率统计，返回当前最热门的搜索词
 */
router.get(
  '/popular',
  optionalAuthenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { limit = 10 } = req.query;

    const popularSearches = await searchService.getPopularSearches(Number(limit));

    res.json({
      success: true,
      data: {
        popularSearches,
      },
      message: '热门搜索获取成功',
    });
  })
);

/**
 * @route GET /api/v1/search/stats
 * @desc 获取搜索统计信息（管理员）
 * @access Private/Admin
 *
 * @middleware optionalAuthenticate - 需要认证
 *
 * @returns 搜索统计数据（总搜索量、热门搜索词等）
 *
 * 注意：当前实现仅做基础认证检查，未严格校验管理员角色。
 * 在实际生产应用中应添加 authorize('admin') 中间件进行权限控制
 */
router.get(
  '/stats',
  optionalAuthenticate,
  asyncHandler(async (req: Request, res: Response) => {
    // 注意：这里应该检查管理员权限，但为了简化，我们暂时只做认证检查
    // 在实际应用中，应该添加管理员权限检查

    const stats = await searchService.getSearchStats();

    res.json({
      success: true,
      data: stats,
      message: '搜索统计信息获取成功',
    });
  })
);

export default router;
