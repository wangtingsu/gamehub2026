/**
 * ============================================================
 * 发现与推荐路由模块
 * ============================================================
 *
 * 本模块提供游戏发现相关的全部 API 接口，涵盖以下功能域：
 *
 * 一、个性化推荐（/recommendations）
 *   - 个性化推荐（已登录用户基于兴趣，未登录用户返回热门）
 *   - 相关内容推荐（基于内容类型和 ID 的关联推荐）
 *   - 热门推荐（全局热门内容）
 *   - "用户也喜欢"（基于游戏的协同过滤推荐）
 *
 * 二、排行榜（/leaderboard）
 *   - 支持多种排行榜类型：评分最高、最多评测、最多收藏、最多讨论
 *
 * 三、趋势分析（/trends）
 *   - 搜索趋势（指定天数内的热门搜索词）
 *   - 游戏热度趋势（指定天数内热度上升最快的游戏）
 *
 * 四、统计数据（/stats）
 *   - 平台和游戏类型分布
 *   - 社区综合统计摘要
 *
 * 路由前缀: /api/v1/discovery
 *
 * @module discoveryRoutes
 */

import { Router, Request, Response } from 'express';
import { optionalAuthenticate, authenticate, validateRequest } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import recommendationService from '../services/recommendation.service';
import discoveryService from '../services/discovery.service';
import searchV2Service from '../services/search-v2.service';

const router = Router();

// ==================== 推荐相关路由 ====================

/**
 * @route GET /api/v1/discovery/recommendations/personalized
 * @desc 获取个性化推荐内容
 * @access Public - 可选认证
 *
 * 认证用户：基于用户的兴趣偏好和行为历史返回个性化推荐。
 * 未认证用户：返回当前热门内容作为默认推荐。
 *
 * @query {number} [limit=10] - 返回结果数量上限
 *
 * @response 200 - 成功返回推荐列表
 *   @body {Array} data.recommendations - 推荐内容列表
 */
router.get(
  '/recommendations/personalized',
  optionalAuthenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Number(req.query.limit) || 10;

    let results;
    if (req.user) {
      // 已登录用户：基于个人兴趣的个性化推荐
      results = await recommendationService.getPersonalizedRecommendations(req.user.id, limit);
    } else {
      // 未登录用户：返回热门推荐
      results = await recommendationService.getTrendingContent(limit);
    }

    res.json({
      success: true,
      data: { recommendations: results },
      message: '获取个性化推荐成功',
    });
  })
);

/**
 * @route GET /api/v1/discovery/recommendations/related/:contentType/:id
 * @desc 获取相关内容推荐
 * @access Public - 可选认证
 *
 * 根据指定的内容类型和内容 ID 查找与之相关的其他内容。
 * 例如查看某个游戏时推荐类似游戏。
 *
 * @param {string} contentType - 路径参数，内容类型（game / review / news 等）
 * @param {string} id - 路径参数，内容 ID
 * @query {number} [limit=8] - 返回结果数量上限
 *
 * @response 200 - 成功返回相关内容推荐列表
 */
router.get(
  '/recommendations/related/:contentType/:id',
  optionalAuthenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { contentType, id } = req.params;
    const limit = Number(req.query.limit) || 8;

    const results = await recommendationService.getRelatedContent(contentType, id, limit);

    res.json({
      success: true,
      data: { recommendations: results },
      message: '获取相关内容推荐成功',
    });
  })
);

/**
 * @route GET /api/v1/discovery/recommendations/trending
 * @desc 获取热门推荐内容
 * @access Public - 可选认证
 *
 * 返回当前平台上的热门内容，基于浏览量、互动量等指标计算。
 *
 * @query {number} [limit=10] - 返回结果数量上限
 *
 * @response 200 - 成功返回热门推荐列表
 */
router.get(
  '/recommendations/trending',
  optionalAuthenticate,
  asyncHandler(async (_req: Request, res: Response) => {
    const limit = Number(_req.query.limit) || 10;

    const results = await recommendationService.getTrendingContent(limit);

    res.json({
      success: true,
      data: { recommendations: results },
      message: '获取热门推荐成功',
    });
  })
);

/**
 * @route GET /api/v1/discovery/recommendations/also-liked/:gameId
 * @desc 获取"用户也喜欢"的游戏推荐
 * @access Public - 可选认证
 *
 * 基于协同过滤算法，查找喜欢指定游戏的用户还喜欢哪些其他游戏。
 * 常用于游戏详情页的"猜你喜欢"或"购买此游戏的用户也买了"模块。
 *
 * @param {string} gameId - 路径参数，源游戏 ID
 * @query {number} [limit=8] - 返回结果数量上限
 *
 * @response 200 - 成功返回"用户也喜欢"推荐列表
 */
router.get(
  '/recommendations/also-liked/:gameId',
  optionalAuthenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { gameId } = req.params;
    const limit = Number(req.query.limit) || 8;

    const results = await recommendationService.getUsersAlsoLiked(gameId, limit);

    res.json({
      success: true,
      data: { recommendations: results },
      message: '获取"用户也喜欢"成功',
    });
  })
);

// ==================== 排行榜路由 ====================

/**
 * @route GET /api/v1/discovery/leaderboard/:type
 * @desc 获取排行榜数据
 * @access Public - 可选认证
 *
 * 支持四种排行榜类型：
 *   - top_rated：评分最高的游戏
 *   - most_reviewed：评测数最多的游戏
 *   - most_favorited：收藏数最多的游戏
 *   - most_discussed：讨论数最多的游戏
 *
 * @param {string} type - 路径参数，排行榜类型（枚举值之一）
 * @query {number} [limit=20] - 返回结果数量上限
 *
 * @response 200 - 成功返回排行榜条目列表
 *   @body {string} data.type - 排行榜类型
 *   @body {Array} data.entries - 排行榜条目列表
 * @response 400 - 无效的排行榜类型参数
 */
router.get(
  '/leaderboard/:type',
  optionalAuthenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { type } = req.params;
    const limit = Number(req.query.limit) || 20;

    const validTypes = ['top_rated', 'most_reviewed', 'most_favorited', 'most_discussed'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `无效的排行榜类型: ${type}，有效类型: ${validTypes.join(', ')}`,
      });
    }

    const results = await discoveryService.getLeaderboard(
      type as 'top_rated' | 'most_reviewed' | 'most_favorited' | 'most_discussed',
      limit
    );

    res.json({
      success: true,
      data: {
        type,
        entries: results,
      },
      message: '获取排行榜成功',
    });
  })
);

// ==================== 趋势分析路由 ====================

/**
 * @route GET /api/v1/discovery/trends/search
 * @desc 获取搜索趋势（热门搜索词）
 * @access Public - 可选认证
 *
 * 统计指定天数内用户搜索频率最高的关键词。
 * 用于展示"热门搜索"或"搜索趋势"模块。
 *
 * @query {number} [days=30] - 统计时间范围（天数）
 *
 * @response 200 - 成功返回搜索趋势数据
 *   @body {Array} data.trends - 搜索趋势条目列表
 */
router.get(
  '/trends/search',
  optionalAuthenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const days = Number(req.query.days) || 30;

    const trends = await discoveryService.getSearchTrends(days);

    res.json({
      success: true,
      data: { trends },
      message: '获取搜索趋势成功',
    });
  })
);

/**
 * @route GET /api/v1/discovery/trends/games
 * @desc 获取游戏热度趋势
 * @access Public - 可选认证
 *
 * 统计指定天数内热度上升最快的游戏，基于访问量、
 * 互动量和讨论热度等指标计算。
 *
 * @query {number} [days=30] - 统计时间范围（天数）
 * @query {number} [limit=10] - 返回结果数量上限
 *
 * @response 200 - 成功返回游戏趋势数据
 *   @body {Array} data.trends - 游戏热度趋势条目列表
 */
router.get(
  '/trends/games',
  optionalAuthenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const days = Number(req.query.days) || 30;
    const limit = Number(req.query.limit) || 10;

    const trends = await discoveryService.getGameTrends(days, limit);

    res.json({
      success: true,
      data: { trends },
      message: '获取游戏趋势成功',
    });
  })
);

// ==================== 统计数据路由 ====================

/**
 * @route GET /api/v1/discovery/stats/distributions
 * @desc 获取平台和游戏类型分布数据
 * @access Public - 可选认证
 *
 * 并发查询平台分布和类型分布两种统计数据。
 * 用于在首页或发现页展示平台和类型的分布情况。
 *
 * @response 200 - 成功返回分布数据
 *   @body {Array} data.platforms - 各平台的游戏数量分布
 *   @body {Array} data.genres - 各类型的游戏数量分布
 */
router.get(
  '/stats/distributions',
  optionalAuthenticate,
  asyncHandler(async (_req: Request, res: Response) => {
    const [platforms, genres] = await Promise.all([
      discoveryService.getPlatformDistribution(),
      discoveryService.getGenreDistribution(),
    ]);

    res.json({
      success: true,
      data: {
        platforms,
        genres,
      },
      message: '获取分布数据成功',
    });
  })
);

/**
 * @route GET /api/v1/discovery/stats/community
 * @desc 获取社区统计数据摘要
 * @access Public - 可选认证
 *
 * 返回社区整体的统计数据摘要，包括但不限于
 * 总用户数、总游戏数、总评论数、活跃度等指标。
 *
 * @response 200 - 成功返回社区统计数据
 *   @body {object} data - 社区统计摘要信息
 */
router.get(
  '/stats/community',
  optionalAuthenticate,
  asyncHandler(async (_req: Request, res: Response) => {
    const summary = await discoveryService.getCommunitySummary();

    res.json({
      success: true,
      data: summary,
      message: '获取社区统计成功',
    });
  })
);

export default router;
