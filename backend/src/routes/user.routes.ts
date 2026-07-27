/**
 * 用户管理路由模块
 *
 * 本模块提供用户管理相关的 REST API，包括：
 * - 获取用户列表（管理员）
 * - 获取用户详情
 * - 更新用户信息（管理员）
 * - 删除用户（管理员）
 * - 获取/更新用户语言偏好
 *
 * 用户语言偏好支持多语言站点切换（en, zh-CN, ja, ko, es, fr）
 *
 * @module routes/user
 */

import { Router, Request, Response } from 'express';
import { authenticate, authorize, validateRequest } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import { query, execute } from '../db';
import userService from '../services/user.service';
import { paginationSchema } from '../validators';

const router = Router();

/**
 * @route GET /api/v1/users
 * @desc 获取用户列表（管理员）
 * @access Private/Admin
 *
 * @middleware authenticate - 必须登录认证
 * @middleware authorize('admin') - 需要管理员角色
 * @middleware validateRequest(paginationSchema) - 验证分页参数
 *
 * @param req.query.page - 页码，默认 1
 * @param req.query.limit - 每页数量，默认 20
 * @param req.query.search - 搜索关键词（按用户名/邮箱搜索，可选）
 *
 * @returns
 *   - users: 用户数组
 *   - pagination: 分页信息（page, limit, total, pages, hasNext, hasPrev）
 */
router.get(
  '/',
  authenticate,
  authorize('admin'),
  validateRequest(paginationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, search } = req.query;

    const { users, total, page: currentPage, limit: currentLimit } = await userService.getUsers(
      Number(page),
      Number(limit),
      search as string
    );

    const totalPages = Math.ceil(total / currentLimit);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          total,
          pages: totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
        },
      },
      message: '用户列表获取成功',
    });
  })
);

/**
 * @route GET /api/v1/users/:id
 * @desc 获取用户详情
 * @access Private
 *
 * @middleware authenticate - 必须登录认证
 *
 * @param req.params.id - 用户唯一标识
 *
 * @returns 200 - 用户详情
 * @returns 404 - 用户不存在
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const user = await userService.getUserById(id);

    res.json({
      success: true,
      data: user,
      message: '用户详情获取成功',
    });
  })
);

/**
 * @route PUT /api/v1/users/:id
 * @desc 更新用户信息（管理员）
 * @access Private/Admin
 *
 * @middleware authenticate - 必须登录认证
 * @middleware authorize('admin') - 需要管理员角色
 *
 * @param req.params.id - 用户唯一标识
 * @param req.body - 需要更新的用户字段（如 username, email, role, status 等）
 *
 * @returns 200 - 用户信息更新成功
 * @returns 404 - 用户不存在
 */
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;

    const user = await userService.updateUser(id, updateData);

    res.json({
      success: true,
      data: user,
      message: '用户信息更新成功',
    });
  })
);

/**
 * @route DELETE /api/v1/users/:id
 * @desc 删除用户（管理员）
 * @access Private/Admin
 *
 * @middleware authenticate - 必须登录认证
 * @middleware authorize('admin') - 需要管理员角色
 *
 * @param req.params.id - 要删除的用户唯一标识
 *
 * @returns 200 - 用户删除成功
 * @returns 404 - 用户不存在
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await userService.deleteUser(id);

    res.json({
      success: true,
      message: '用户删除成功',
    });
  })
);

/**
 * @route GET /api/v1/users/:id/language
 * @desc 获取用户语言偏好
 * @access Private（用户只能获取自己的，管理员可以获取任何用户的）
 *
 * @middleware authenticate - 必须登录认证
 *
 * @param req.params.id - 用户唯一标识
 *
 * @returns 200 - 获取成功，返回用户当前语言和所有支持的语言列表
 * @returns 403 - 权限不足，非管理员用户只能获取自己的语言偏好
 *
 * 权限控制：
 * - 普通用户：只能获取自己的语言偏好（req.user.id === id）
 * - 管理员：可以获取任何用户的语言偏好
 */
router.get(
  '/:id/language',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const currentUser = (req as any).user;

    // 检查权限：用户只能获取自己的语言偏好，管理员可以获取任何用户的
    if (currentUser.role !== 'admin' && String(currentUser.id) !== id) {
      return res.status(403).json({
        success: false,
        error: '权限不足',
        message: '您只能查看自己的语言偏好',
      });
    }

    const user = await userService.getUserById(id);

    res.json({
      success: true,
      data: {
        userId: id,
        language: user.language || 'en',
        supportedLanguages: ['en', 'zh-CN', 'ja', 'ko', 'es', 'fr'],
      },
      message: '用户语言偏好获取成功',
    });
  })
);

/**
 * @route PUT /api/v1/users/:id/language
 * @desc 更新用户语言偏好
 * @access Private（用户只能更新自己的，管理员可以更新任何用户的）
 *
 * @middleware authenticate - 必须登录认证
 *
 * @param req.params.id - 用户唯一标识
 * @param req.body.language - 目标语言代码，必填
 *
 * @returns 200 - 语言偏好更新成功
 * @returns 400 - 参数验证失败（缺少 language 字段或不支持的语言代码）
 * @returns 403 - 权限不足
 *
 * 权限控制：
 * - 普通用户：只能更新自己的语言偏好（req.user.id === id）
 * - 管理员：可以更新任何用户的语言偏好
 *
 * 支持的语种：
 * - en: 英语
 * - zh-CN: 简体中文
 * - ja: 日语
 * - ko: 韩语
 * - es: 西班牙语
 * - fr: 法语
 */
router.put(
  '/:id/language',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { language } = req.body;
    const currentUser = (req as any).user;

    // 验证语言参数
    if (!language) {
      return res.status(400).json({
        success: false,
        error: '缺少参数',
        message: 'language字段是必需的',
      });
    }

    // 验证支持的语言
    const supportedLanguages = ['en', 'zh-CN', 'ja', 'ko', 'es', 'fr'];
    if (!supportedLanguages.includes(language)) {
      return res.status(400).json({
        success: false,
        error: '不支持的语言',
        message: `不支持的语言代码: ${language}`,
        supportedLanguages,
      });
    }

    // 检查权限：用户只能更新自己的语言偏好，管理员可以更新任何用户的
    if (currentUser.role !== 'admin' && String(currentUser.id) !== id) {
      return res.status(403).json({
        success: false,
        error: '权限不足',
        message: '您只能更新自己的语言偏好',
      });
    }

    // 更新用户语言
    const updatedUser = await userService.updateUser(id, { language });

    res.json({
      success: true,
      data: {
        userId: id,
        language: updatedUser.language || 'en',
        updatedAt: updatedUser.updatedAt,
      },
      message: '用户语言偏好更新成功',
    });
  })
);

// PUT /api/v1/users/me/theme — 保存用户主题偏好
router.put('/me/theme', authenticate, asyncHandler(async (req: Request, res: Response) => {
  await execute('UPDATE users SET theme_preference = ? WHERE id = ?', [req.body.theme || 'dark', req.user!.id]);
  res.json({ success: true, data: { theme: req.body.theme || 'dark' } });
}));

// GET /api/v1/users/me/theme — 获取用户主题偏好
router.get('/me/theme', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const rows = await query('SELECT theme_preference FROM users WHERE id = ?', [req.user!.id]);
  res.json({ success: true, data: { theme: rows[0]?.theme_preference || 'dark' } });
}));

export default router;
