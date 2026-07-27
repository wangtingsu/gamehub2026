/**
 * 成就系统路由模块
 *
 * 本模块提供成就系统的所有接口，包括：
 * - 公开接口：获取成就列表（支持匿名/已登录用户）
 * - 用户接口：获取当前登录用户/指定用户的成就列表、成就统计
 * - 管理端接口（需管理员权限）：成就的 CRUD 操作
 *
 * @module routes/achievement
 */

import { Router, Request, Response } from 'express';
import { authenticate, optionalAuthenticate, authorize, validateRequest } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import { achievementCreateSchema, achievementUpdateSchema } from '../validators';
import achievementService from '../services/achievement.service';

const router = Router();

// ========== 公开 & 用户接口 ==========

/**
 * 获取所有成就列表
 * 使用 optionalAuthenticate 中间件：已登录用户可获取个性化数据，匿名用户也可获取公开列表
 *
 * @route GET /api/v1/achievements
 * @access Public（optionalAuthenticate — 可选身份验证，不强制登录）
 * @returns {Object} 包含 achievements 数组的 JSON 响应
 */
router.get(
  '/',
  optionalAuthenticate,
  asyncHandler(async (_req: Request, res: Response) => {
    const achievements = await achievementService.getAllAchievements();
    res.json({
      success: true,
      data: achievements,
      message: '获取成功',
    });
  }),
);

/**
 * 获取当前登录用户的成就列表
 * 使用 authenticate 中间件强制要求用户已登录
 * 注意：此路由必须在 /user/:userId 之前定义，否则会被通配路由拦截
 *
 * @route GET /api/v1/achievements/user/me
 * @access Private — 需通过 authenticate 中间件验证登录状态
 * @returns {Object} 包含当前用户成就列表的 JSON 响应
 */
router.get(
  '/user/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const achievements = await achievementService.getUserAchievements(userId);
    res.json({
      success: true,
      data: achievements,
      message: '获取成功',
    });
  }),
);

/**
 * 获取指定用户的成就列表（按用户 ID）
 * 使用 optionalAuthenticate 中间件，允许匿名访问公开成就
 *
 * @route GET /api/v1/achievements/user/:userId
 * @access Public（optionalAuthenticate — 可选身份验证）
 * @param {string} req.params.userId - 目标用户的 ID
 * @returns {Object} 包含该用户成就列表的 JSON 响应
 */
router.get(
  '/user/:userId',
  optionalAuthenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const achievements = await achievementService.getUserAchievements(userId);
    res.json({
      success: true,
      data: achievements,
      message: '获取成功',
    });
  }),
);

/**
 * 获取当前登录用户的成就统计信息
 * 使用 authenticate 中间件强制要求用户已登录
 *
 * @route GET /api/v1/achievements/stats
 * @access Private — 需通过 authenticate 中间件验证登录状态
 * @returns {Object} 包含成就统计数据（解锁数、完成度等）的 JSON 响应
 */
router.get(
  '/stats',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const stats = await achievementService.getAchievementStats(userId);
    res.json({
      success: true,
      data: stats,
      message: '获取成功',
    });
  }),
);

// ========== 管理端路由（需管理员权限）==========

/**
 * 管理员获取所有成就列表
 * 使用 authenticate + authorize('admin') 中间件组合进行登录验证和角色授权
 *
 * @route GET /api/v1/achievements/admin
 * @access Private/Admin — 需登录且拥有 admin 角色
 * @returns {Object} 包含所有成就列表的 JSON 响应
 */
router.get(
  '/admin',
  authenticate,
  authorize('admin'),
  asyncHandler(async (_req: Request, res: Response) => {
    const achievements = await achievementService.getAllAchievements();
    res.json({
      success: true,
      data: achievements,
      message: '获取成功',
    });
  }),
);

/**
 * 管理员创建新成就
 * 使用 authenticate + authorize('admin') 进行权限验证
 * 使用 validateRequest(achievementCreateSchema) 对请求体进行参数校验
 *
 * @route POST /api/v1/achievements/admin
 * @access Private/Admin — 需登录且拥有 admin 角色
 * @param {Object} req.body - 成就创建参数（由 achievementCreateSchema 定义校验规则）
 * @returns {Object} 201 状态码及包含新创建成就数据的 JSON 响应
 */
router.post(
  '/admin',
  authenticate,
  authorize('admin'),
  validateRequest(achievementCreateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const achievement = await achievementService.createAchievement(req.body);
    res.status(201).json({
      success: true,
      data: achievement,
      message: '创建成功',
    });
  }),
);

/**
 * 管理员更新指定成就
 * 使用 authenticate + authorize('admin') 进行权限验证
 * 使用 validateRequest(achievementUpdateSchema) 对请求体进行参数校验
 *
 * @route PUT /api/v1/achievements/admin/:id
 * @access Private/Admin — 需登录且拥有 admin 角色
 * @param {string} req.params.id - 要更新的成就 ID
 * @param {Object} req.body - 成就更新参数（由 achievementUpdateSchema 定义校验规则）
 * @returns {Object} 包含更新后成就数据的 JSON 响应
 */
router.put(
  '/admin/:id',
  authenticate,
  authorize('admin'),
  validateRequest(achievementUpdateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const achievement = await achievementService.updateAchievement(id, req.body);
    res.json({
      success: true,
      data: achievement,
      message: '更新成功',
    });
  }),
);

/**
 * 管理员删除指定成就
 * 使用 authenticate + authorize('admin') 进行权限验证
 *
 * @route DELETE /api/v1/achievements/admin/:id
 * @access Private/Admin — 需登录且拥有 admin 角色
 * @param {string} req.params.id - 要删除的成就 ID
 * @returns {Object} 包含操作结果的 JSON 响应
 */
router.delete(
  '/admin/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await achievementService.deleteAchievement(id);
    res.json({
      success: true,
      message: '删除成功',
    });
  }),
);

export default router;
