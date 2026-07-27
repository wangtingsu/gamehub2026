/**
 * 管理员核心路由模块
 *
 * 本模块提供管理员后台核心管理接口，涵盖以下功能区域：
 *
 * 一、管理员登录（无需认证）
 *   - POST /login — 管理员登录验证，颁发 JWT 令牌
 *
 * 二、仪表板统计（需认证）
 *   - GET /dashboard/stats — 获取后台概览统计数据
 *
 * 三、用户管理（需认证）
 *   - GET    /users                    — 获取用户列表（分页/搜索/筛选）
 *   - GET    /users/:id                — 获取单个用户详情
 *   - POST   /users                    — 创建新用户
 *   - PUT    /users/:id                — 更新用户信息
 *   - DELETE /users/:id                — 删除用户
 *   - POST   /users/batch/status       — 批量更新用户状态
 *   - POST   /users/batch/delete       — 批量删除用户
 *   - PUT    /users/:id/role           — 变更用户角色
 *   - POST   /users/:id/recalculate-level — 重新计算用户等级
 *   - PUT    /users/:id/freeze-comment — 冻结/解冻用户评论功能
 *
 * 四、审计日志（需认证）
 *   - GET /audit-logs  — 获取操作审计日志
 *   - GET /login-logs  — 获取登录日志
 *
 * 五、系统配置管理（需认证）
 *   - GET  /settings        — 获取所有系统配置
 *   - GET  /settings/levels — 获取等级配置详情
 *   - PUT  /settings/:key   — 更新或创建单个系统配置项
 *   - PUT  /settings        — 批量更新系统配置
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import config from '../config';
import { adminAuthenticate } from '../middlewares/admin-auth.middleware';
import { authorize } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import logger from '../utils/logger';
import userService from '../services/user.service';
import { createAuditLog, createUserPermissionChangeLog, getAuditLogs, getLoginLogs } from '../services/audit-log.service';
import { getLevelConfigs } from '../services/level.service';
import { query, execute } from '../db';
import { getPermissions, getMenuPaths, type Role } from '../config/permissions.config';

const router = Router();

// ============================================================
//  管理员独立登录（无需认证）
//  使用 bcrypt 验证密码（安全存储），登录成功后颁发 JWT 令牌
// ============================================================

/**
 * @route   POST /api/v1/admin/login
 * @desc    管理员登录接口
 *          使用 bcrypt 验证用户名和密码，成功后返回 JWT 令牌。
 *          若数据库中尚无管理员用户，则自动从配置创建默认管理员（首次运行场景）。
 * @access  Public
 *
 * @param {string} req.body.username - 管理员用户名（必填）
 * @param {string} req.body.password - 管理员密码（必填）
 *
 * @returns {Object}   响应体
 * @returns {boolean}  .success       - 操作是否成功
 * @returns {Object}   .data          - 登录成功后的数据
 * @returns {string}   .data.token    - JWT 认证令牌
 * @returns {string}   .data.username - 用户名
 * @returns {string}   .data.displayName - 显示名称
 * @returns {string}   .data.role     - 角色（admin / super_admin）
 * @returns {string}   .data.expiresIn - 令牌过期时间
 * @returns {string}   .message       - 提示消息
 *
 * @throws {400} 用户名或密码为空
 * @throws {401} 用户名或密码错误 / 管理员用户不存在
 *
 * @example request body:
 *   { "username": "admin", "password": "admin123" }
 * @example response:
 *   {
 *     "success": true,
 *     "data": { "token": "eyJ...", "username": "admin", "displayName": "超级管理员", "role": "super_admin", "expiresIn": "24h" },
 *     "message": "管理员登录成功"
 *   }
 */
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: '用户名和密码不能为空',
    });
  }

  // 从数据库中查找管理员用户（role 为 admin/super_admin/operator）
  let adminUsers = await query(
    `SELECT id, username, email, display_name, avatar_url, role, password_hash, is_active
     FROM users WHERE role IN ('admin', 'super_admin', 'operator') AND username = $1 AND is_active = true`,
    [username]
  );

  // 如果没有管理员用户，尝试从配置创建默认管理员（首次运行）
  if (adminUsers.length === 0) {
    logger.info('未找到管理员用户，尝试从配置创建默认管理员');
    const salt = await bcrypt.genSalt(config.security.bcryptRounds);
    const hashedPassword = await bcrypt.hash(config.admin.password, salt);

    const result = await execute(
      `INSERT INTO users (username, email, display_name, role, password_hash, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, TRUE, ?, ?)`,
      [config.admin.username, 'admin@gamehub.local', '超级管理员', 'super_admin', hashedPassword,
       new Date().toISOString(), new Date().toISOString()]
    );

    adminUsers = await query(
      `SELECT id, username, email, display_name, avatar_url, role, password_hash, is_active
       FROM users WHERE id = ?`,
      [result.lastInsertRowid]
    );
    logger.info('默认管理员用户已创建', { username: config.admin.username });
  }

  if (adminUsers.length === 0) {
    return res.status(401).json({
      success: false,
      error: '管理员用户不存在',
    });
  }

  const adminUser = adminUsers[0];

  // 使用 bcrypt 验证密码
  const isValidPassword = await bcrypt.compare(password, adminUser.password_hash);
  if (!isValidPassword) {
    logger.warn('管理员登录失败：密码错误', { username });
    return res.status(401).json({
      success: false,
      error: '管理员用户名或密码错误',
    });
  }

  const token = jwt.sign(
    {
      id: String(adminUser.id),
      username: adminUser.username,
      email: adminUser.email,
      displayName: adminUser.display_name,
      role: adminUser.role,
    },
    config.admin.jwtSecret,
    { expiresIn: config.admin.jwtExpiresIn as any }
  );

  logger.info('管理员登录成功', { userId: adminUser.id, username: adminUser.username });

  res.json({
    success: true,
    data: {
      token,
      username: adminUser.username,
      displayName: adminUser.display_name,
      role: adminUser.role,
      expiresIn: config.admin.jwtExpiresIn,
    },
    message: '管理员登录成功',
  });
}));

// ============================================================
//  以下所有管理路由需要管理员认证
// ============================================================

/**
 * @route GET /api/v1/admin/permissions
 * @desc 获取当前用户的权限和可访问菜单
 * @access Private (需要管理员 JWT)
 */
router.get(
  '/permissions',
  adminAuthenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const role = ((req as any).user?.role || 'user') as Role;
    res.json({
      success: true,
      data: {
        role,
        permissions: getPermissions(role),
        menus: getMenuPaths(role),
      },
    });
  })
);

/**
 * 管理员认证中间件
 * 登录路由之后的所有路由都需要有效的管理员 JWT 令牌
 */
router.use(adminAuthenticate);

// ============================================================
//  管理员共享路由 — 仪表板统计
// ============================================================

/**
 * @route   GET /api/v1/admin/dashboard/stats
 * @desc    获取管理员仪表板概览统计数据
 *          包括用户统计、游戏统计、新闻统计、评测统计及社区统计
 * @access  Private/Admin
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success               - 操作是否成功
 * @returns {Object}    .data                  - 统计数据
 * @returns {Object}    .data.users            - 用户统计：total（总数）, active（活跃数）, newToday（今日新增）
 * @returns {Object}    .data.games            - 游戏统计：total（总数）
 * @returns {Object}    .data.news             - 新闻统计：total（总数）
 * @returns {Object}    .data.reviews          - 评测统计：total（总数）, newToday（今日新增）
 * @returns {Object}    .data.community        - 社区统计：posts（帖子数）, comments（评论数）
 *
 * @example response:
 *   {
 *     "success": true,
 *     "data": {
 *       "users": { "total": 1000, "active": 800, "newToday": 15 },
 *       "games": { "total": 200 },
 *       "news": { "total": 50 },
 *       "reviews": { "total": 500, "newToday": 3 },
 *       "community": { "posts": 150, "comments": 2000 }
 *     }
 *   }
 */
router.get('/dashboard/stats', asyncHandler(async (req: Request, res: Response) => {
  const userCount = await query('SELECT COUNT(*) as total, SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active FROM users');
  const gameCount = await query('SELECT COUNT(*) as total FROM games');
  const reviewCount = await query('SELECT COUNT(*) as total FROM reviews');
  const newsCount = await query('SELECT COUNT(*) as total FROM news');

  // 今日新增
  const today = new Date().toISOString().split('T')[0];
  const newUsersToday = await query("SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = ?", [today]);
  const newReviewsToday = await query("SELECT COUNT(*) as count FROM reviews WHERE DATE(created_at) = ?", [today]);

  // 社区统计
  const postCount = await query('SELECT COUNT(*) as total FROM community_posts');
  const commentCount = await query('SELECT COUNT(*) as total FROM comments');

  res.json({
    success: true,
    data: {
      users: {
        total: (userCount[0] as any)?.total || 0,
        active: (userCount[0] as any)?.active || 0,
        newToday: (newUsersToday[0] as any)?.count || 0,
      },
      games: { total: (gameCount[0] as any)?.total || 0 },
      news: { total: (newsCount[0] as any)?.total || 0 },
      reviews: {
        total: (reviewCount[0] as any)?.total || 0,
        newToday: (newReviewsToday[0] as any)?.count || 0,
      },
      community: {
        posts: (postCount[0] as any)?.total || 0,
        comments: (commentCount[0] as any)?.total || 0,
      },
    },
  });
}));

// ============================================================
//  用户管理（User Management）
//  提供用户的增删改查、角色变更、等级重算、评论冻结等操作
// ============================================================

/**
 * @route   GET /api/v1/admin/users
 * @desc    获取用户列表（支持分页、搜索、按角色/状态/等级筛选）
 * @access  Private/Admin
 *
 * @param   {number} [req.query.page]   - 当前页码（默认 1）
 * @param   {number} [req.query.limit]  - 每页数量（默认 20）
 * @param   {string} [req.query.search] - 搜索关键词（匹配用户名/邮箱等）
 * @param   {string} [req.query.role]   - 按角色筛选
 * @param   {string} [req.query.status] - 按状态筛选
 * @param   {number} [req.query.level]  - 按等级筛选
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success             - 操作是否成功
 * @returns {Object}    .data                - 数据
 * @returns {Array}     .data.users          - 用户列表
 * @returns {Object}    .data.pagination     - 分页信息
 * @returns {number}    .data.pagination.page   - 当前页码
 * @returns {number}    .data.pagination.limit  - 每页数量
 * @returns {number}    .data.pagination.total  - 总记录数
 * @returns {number}    .data.pagination.pages  - 总页数
 * @returns {boolean}   .data.pagination.hasNext - 是否有下一页
 * @returns {boolean}   .data.pagination.hasPrev - 是否有上一页
 *
 * @example request:  /api/v1/admin/users?page=1&limit=20&role=user&search=test
 */
router.get('/users', asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, search, role, status, level } = req.query;

  const result = await userService.getUsers(
    Number(page),
    Number(limit),
    search as string,
    role as string,
    status as string,
    level ? Number(level) : undefined
  );

  res.json({
    success: true,
    data: {
      users: result.users,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: Math.ceil(result.total / result.limit),
        hasNext: result.page * result.limit < result.total,
        hasPrev: result.page > 1,
      },
    },
  });
}));

/**
 * @route   GET /api/v1/admin/users/:id
 * @desc    获取单个用户的详细信息
 * @access  Private/Admin
 *
 * @param   {string} req.params.id - 用户 ID
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success - 操作是否成功
 * @returns {Object}    .data    - 用户详细信息
 */
router.get('/users/:id', asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getUserById(req.params.id);
  res.json({ success: true, data: user });
}));

/**
 * @route   POST /api/v1/admin/users
 * @desc    创建新用户（管理员操作）
 * @access  Private/Admin
 *
 * @param {string} req.body.username   - 用户名（必填）
 * @param {string} req.body.password   - 密码（必填）
 * @param {string} [req.body.email]    - 邮箱
 * @param {string} [req.body.phone]    - 手机号
 * @param {string} [req.body.displayName] - 显示名称
 * @param {string} [req.body.role]     - 角色（默认 "user"）
 * @param {string} [req.body.status]   - 状态
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success - 操作是否成功
 * @returns {Object}    .data    - 新创建的用户对象
 * @returns {string}    .message - 提示消息
 *
 * @throws {400} 用户名和密码是必填项
 * @throws {403} 非超级管理员不能创建管理员账户
 */
router.post('/users', asyncHandler(async (req: Request, res: Response) => {
  const { username, email, phone, password, displayName, role, status } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: '用户名和密码是必填项' });
  }

  // 非超级管理员不能创建管理员或超级管理员
  if ((role === 'admin' || role === 'super_admin') && (req as any).user?.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: '只有超级管理员才能创建管理员账户' });
  }

  try {
    const { userModel } = require('../models/User');
    const user = await userModel.createWithPassword({
      username,
      email,
      phone,
      password,
      displayName,
      role: role || 'user',
    });

    // 记录创建用户的审计日志
    await createAuditLog({
      userId: 'admin',
      action: 'create',
      resourceType: 'user',
      resourceId: user.id,
      details: { username },
      ipAddress: req.ip,
    });

    res.json({ success: true, data: user, message: '用户创建成功' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || '创建用户失败' });
  }
}));

/**
 * @route   PUT /api/v1/admin/users/:id
 * @desc    更新用户信息
 * @access  Private/Admin
 *
 * @param {string} req.params.id   - 要更新的用户 ID
 * @param {Object} req.body        - 要更新的字段键值对
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success - 操作是否成功
 * @returns {Object}    .data    - 更新后的用户对象
 * @returns {string}    .message - 提示消息
 *
 * @throws {403} 只有超级管理员才能修改管理员账号或将角色提升为管理员
 */
router.put('/users/:id', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const targetUser = await userService.getUserById(req.params.id);

  // 只有超级管理员可以修改超级管理员或其他管理员的角色
  if (currentUser?.role !== 'super_admin') {
    if (targetUser.role === 'super_admin' || targetUser.role === 'admin') {
      return res.status(403).json({ success: false, message: '只有超级管理员才能修改管理员账户' });
    }
    // 非超级管理员不能将角色提升为 admin 或 super_admin
    if (req.body.role && (req.body.role === 'admin' || req.body.role === 'super_admin')) {
      return res.status(403).json({ success: false, message: '只有超级管理员才能提升用户角色为管理员' });
    }
  }

  const user = await userService.updateUser(req.params.id, req.body);

  // 记录更新用户的审计日志
  await createAuditLog({
    userId: 'admin',
    action: 'update',
    resourceType: 'user',
    resourceId: req.params.id,
    details: { updates: Object.keys(req.body) },
    ipAddress: req.ip,
  });

  res.json({ success: true, data: user, message: '用户更新成功' });
}));

/**
 * @route   DELETE /api/v1/admin/users/:id
 * @desc    删除指定用户（危险操作）
 * @access  Private/Admin
 *
 * @param {string} req.params.id - 要删除的用户 ID
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success - 操作是否成功
 * @returns {string}    .message - 提示消息
 *
 * @throws {403} 只有超级管理员才能删除管理员或超级管理员账户
 */
router.delete('/users/:id', asyncHandler(async (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const targetUser = await userService.getUserById(req.params.id);

  // 只有超级管理员可以删除管理员或超级管理员
  if ((targetUser.role === 'admin' || targetUser.role === 'super_admin') && currentUser?.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: '只有超级管理员才能删除管理员账户' });
  }

  await userService.deleteUser(req.params.id);

  // 记录删除用户的审计日志
  await createAuditLog({
    userId: 'admin',
    action: 'delete',
    resourceType: 'user',
    resourceId: req.params.id,
    details: { username: targetUser.username },
    ipAddress: req.ip,
  });

  res.json({ success: true, message: '用户删除成功' });
}));

/**
 * @route   POST /api/v1/admin/users/batch/status
 * @desc    批量更新用户状态（如启用/禁言/封禁等）
 * @access  Private/Admin
 *
 * @param   {string[]} req.body.userIds - 要操作的用户 ID 列表（必填，非空数组）
 * @param   {string}   req.body.status  - 目标状态值
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success         - 操作是否成功
 * @returns {Object}    .data            - 数据
 * @returns {number}    .data.affected   - 受影响用户数
 * @returns {string}    .message         - 提示消息
 *
 * @throws {400} 用户 ID 列表不能为空
 * @throws {403} 只有超级管理员才能批量操作管理员账户
 *
 * @example request body:
 *   { "userIds": ["1", "2", "3"], "status": "banned" }
 */
router.post('/users/batch/status', asyncHandler(async (req: Request, res: Response) => {
  const { userIds, status } = req.body;
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ success: false, message: '请提供用户ID列表' });
  }
  // 只有超级管理员可以批量操作管理员用户
  const currentUser = (req as any).user;
  if (currentUser?.role !== 'super_admin') {
    const adminUsers = await query(
      `SELECT id FROM users WHERE id IN (${userIds.map(() => '?').join(',')}) AND (role = 'admin' OR role = 'super_admin')`,
      userIds
    );
    if (adminUsers.length > 0) {
      return res.status(403).json({ success: false, message: '只有超级管理员才能批量操作管理员账户' });
    }
  }
  const count = await userService.batchUpdateStatus(userIds, status);
  res.json({ success: true, data: { affected: count }, message: `已更新 ${count} 个用户状态` });
}));

/**
 * @route   POST /api/v1/admin/users/batch/delete
 * @desc    批量删除用户（危险操作）
 * @access  Private/Admin
 *
 * @param   {string[]} req.body.userIds - 要删除的用户 ID 列表（必填，非空数组）
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success         - 操作是否成功
 * @returns {Object}    .data            - 数据
 * @returns {number}    .data.affected   - 已删除的用户数
 * @returns {string}    .message         - 提示消息
 *
 * @throws {400} 用户 ID 列表不能为空
 * @throws {403} 只有超级管理员才能批量删除管理员账户
 */
router.post('/users/batch/delete', asyncHandler(async (req: Request, res: Response) => {
  const { userIds } = req.body;
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ success: false, message: '请提供用户ID列表' });
  }
  // 只有超级管理员可以批量删除管理员用户
  const currentUser = (req as any).user;
  if (currentUser?.role !== 'super_admin') {
    const adminUsers = await query(
      `SELECT id FROM users WHERE id IN (${userIds.map(() => '?').join(',')}) AND (role = 'admin' OR role = 'super_admin')`,
      userIds
    );
    if (adminUsers.length > 0) {
      return res.status(403).json({ success: false, message: '只有超级管理员才能批量删除管理员账户' });
    }
  }
  const count = await userService.batchDeleteUsers(userIds);
  res.json({ success: true, data: { affected: count }, message: `已删除 ${count} 个用户` });
}));

// ============================================================
//  角色变更（Role Change）
//  用于变更用户角色，仅超级管理员可提升角色为管理员
// ============================================================

/**
 * @route   PUT /api/v1/admin/users/:id/role
 * @desc    变更指定用户的角色
 * @access  Private/SuperAdmin
 *
 * @param {string} req.params.id  - 目标用户 ID
 * @param {string} req.body.role  - 新角色（必填，如 "admin", "super_admin", "user" 等）
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success - 操作是否成功
 * @returns {Object}    .data    - 更新后的用户对象
 * @returns {string}    .message - 提示消息
 *
 * @throws {400} 新角色不能为空
 * @throws {403} 只有超级管理员才能将角色变更为管理员
 *
 * @example request body:
 *   { "role": "admin" }
 */
router.put('/users/:id/role', asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.body;
  const currentUser = (req as any).user;
  const oldUser = await userService.getUserById(req.params.id);

  if (!role) {
    return res.status(400).json({ success: false, message: '请提供新角色' });
  }

  // 只有超级管理员可以将角色变更为 admin 或 super_admin
  if ((role === 'admin' || role === 'super_admin') && currentUser?.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: '只有超级管理员才能变更角色为管理员' });
  }

  const updated = await userService.changeUserRole(req.params.id, role, currentUser?.id || 'admin');

  // 记录用户权限变更日志
  await createUserPermissionChangeLog(
    req.params.id,
    'admin',
    'role_change',
    oldUser.role,
    role
  );

  // 记录角色变更的审计日志
  await createAuditLog({
    userId: 'admin',
    action: 'role_change',
    resourceType: 'user',
    resourceId: req.params.id,
    details: { from: oldUser.role, to: role, username: oldUser.username },
    ipAddress: req.ip,
  });

  res.json({ success: true, data: updated, message: '角色变更成功' });
}));

// ============================================================
//  等级管理（Level Management）
//  提供用户等级的重新计算功能
// ============================================================

/**
 * @route   POST /api/v1/admin/users/:id/recalculate-level
 * @desc    重新计算指定用户的等级
 *          根据用户的行为数据（如发帖数、登录次数等）重新计算等级
 * @access  Private/Admin
 *
 * @param {string} req.params.id - 目标用户 ID
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success - 操作是否成功
 * @returns {Object}    .data    - 更新后的用户对象（含新等级）
 * @returns {string}    .message - 提示消息
 */
router.post('/users/:id/recalculate-level', asyncHandler(async (req: Request, res: Response) => {
  const updated = await userService.recalculateUserLevel(req.params.id);
  res.json({ success: true, data: updated, message: '等级重新计算完成' });
}));

// ============================================================
//  评论冻结/解冻（Comment Freeze）
//  用于管控用户的评论权限
// ============================================================

/**
 * @route   PUT /api/v1/admin/users/:id/freeze-comment
 * @desc    冻结或解冻指定用户的评论功能权限
 * @access  Private/Admin
 *
 * @param {string}  req.params.id     - 目标用户 ID
 * @param {boolean} req.body.frozen   - true=冻结，false=解冻
 * @param {string}  [req.body.until]  - 冻结截止时间（可选，ISO 日期字符串）
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success - 操作是否成功
 * @returns {Object}    .data    - 更新后的用户对象
 * @returns {string}    .message - 提示消息（冻结/解冻成功）
 *
 * @example request body:
 *   { "frozen": true, "until": "2026-07-01T00:00:00Z" }
 */
router.put('/users/:id/freeze-comment', asyncHandler(async (req: Request, res: Response) => {
  const { frozen, until } = req.body;

  const updated = await userService.setCommentFreeze(req.params.id, frozen, until);

  // 记录评论冻结/解冻的权限变更日志
  await createUserPermissionChangeLog(
    req.params.id,
    'admin',
    frozen ? 'freeze' : 'unfreeze',
    String(!frozen),
    String(frozen)
  );

  res.json({ success: true, data: updated, message: frozen ? '评论功能已冻结' : '评论功能已解冻' });
}));

// ============================================================
//  审计日志（Audit Logs）
//  提供管理员操作审计日志和用户登录日志的查询
// ============================================================

/**
 * @route   GET /api/v1/admin/audit-logs
 * @desc    获取管理员操作审计日志列表（支持分页和筛选）
 * @access  Private/Admin
 *
 * @param   {number} [req.query.page]        - 当前页码（默认 1）
 * @param   {number} [req.query.limit]       - 每页数量（默认 20）
 * @param   {string} [req.query.userId]      - 按操作用户 ID 筛选
 * @param   {string} [req.query.action]      - 按操作类型筛选（如 create, update, delete）
 * @param   {string} [req.query.resourceType] - 按资源类型筛选（如 user, guide, review）
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success - 操作是否成功
 * @returns {Object}    .data    - 审计日志数据（含分页信息）
 *
 * @example request:  /api/v1/admin/audit-logs?page=1&limit=20&action=delete
 */
router.get('/audit-logs', asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, userId, action, resourceType } = req.query;
  const result = await getAuditLogs(Number(page), Number(limit), {
    userId: userId as string,
    action: action as string,
    resourceType: resourceType as string,
  });
  res.json({ success: true, data: result });
}));

/**
 * @route   GET /api/v1/admin/login-logs
 * @desc    获取用户登录日志列表（支持分页和按用户筛选）
 * @access  Private/Admin
 *
 * @param   {number} [req.query.page]   - 当前页码（默认 1）
 * @param   {number} [req.query.limit]  - 每页数量（默认 20）
 * @param   {string} [req.query.userId] - 按用户 ID 筛选
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success - 操作是否成功
 * @returns {Object}    .data    - 登录日志数据（含分页信息）
 *
 * @example request:  /api/v1/admin/login-logs?page=1&limit=20&userId=123
 */
router.get('/login-logs', asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, userId } = req.query;
  const result = await getLoginLogs(Number(page), Number(limit), userId as string);
  res.json({ success: true, data: result });
}));

// ============================================================
//  系统配置管理（System Configuration）
//  提供系统配置项的查看、更新和批量更新功能
// ============================================================

/**
 * @route   GET /api/v1/admin/settings
 * @desc    获取所有系统配置项列表（按配置键排序）
 * @access  Private/Admin
 *
 * @returns {Object}          响应体
 * @returns {boolean}         .success - 操作是否成功
 * @returns {Array<Object>}   .data    - 系统配置项列表
 *
 * @example response:
 *   {
 *     "success": true,
 *     "data": [
 *       { "config_key": "site_name", "config_value": "GameHub", "description": "站点名称" },
 *       ...
 *     ]
 *   }
 */
router.get('/settings', asyncHandler(async (req: Request, res: Response) => {
  const configs = await query('SELECT * FROM system_configs ORDER BY config_key');
  res.json({ success: true, data: configs });
}));

/**
 * @route   GET /api/v1/admin/settings/levels
 * @desc    获取用户等级配置详情
 * @access  Private/Admin
 *
 * @returns {Object}          响应体
 * @returns {boolean}         .success - 操作是否成功
 * @returns {Array<Object>}   .data    - 等级配置列表
 */
router.get('/settings/levels', asyncHandler(async (req: Request, res: Response) => {
  const levels = await getLevelConfigs();
  res.json({ success: true, data: levels });
}));

/**
 * @route   PUT /api/v1/admin/settings/:key
 * @desc    更新或创建单个系统配置项
 *          若配置键已存在则更新，否则新增
 * @access  Private/Admin
 *
 * @param {string} req.params.key       - 配置键名（在 URL 路径中）
 * @param {string} req.body.value       - 配置值（必填）
 * @param {string} [req.body.description] - 配置描述（可选，仅新增时有效）
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success - 操作是否成功
 * @returns {string}    .message - 提示消息
 *
 * @throws {400} 配置值不能为空
 *
 * @example request:  PUT /api/v1/admin/settings/site_name
 *   body: { "value": "GameHub 2.0", "description": "站点名称" }
 */
router.put('/settings/:key', asyncHandler(async (req: Request, res: Response) => {
  const { key } = req.params;
  const { value, description } = req.body;

  if (!value) {
    return res.status(400).json({ success: false, message: '请提供配置值' });
  }

  const existing = await query('SELECT id FROM system_configs WHERE config_key = ?', [key]);

  if (existing.length > 0) {
    // 更新已有配置
    await execute(
      'UPDATE system_configs SET config_value = ?, description = COALESCE(?, description), updated_by = ?, updated_at = ? WHERE config_key = ?',
      [value, description || null, 'admin', new Date().toISOString(), key]
    );
  } else {
    // 新增配置项
    await execute(
      'INSERT INTO system_configs (config_key, config_value, description, updated_by, updated_at) VALUES (?, ?, ?, ?, ?)',
      [key, value, description || null, 'admin', new Date().toISOString()]
    );
  }

  // 记录配置更新的审计日志
  await createAuditLog({
    userId: 'admin',
    action: 'update',
    resourceType: 'system_config',
    resourceId: key,
    details: { configKey: key, configValue: value },
    ipAddress: req.ip,
  });

  res.json({ success: true, message: '配置更新成功' });
}));

/**
 * @route   PUT /api/v1/admin/settings
 * @desc    批量更新系统配置项
 * @access  Private/Admin
 *
 * @param {Object} req.body.configs - 配置键值对对象（必填）
 *           键为配置名，值为配置值
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success - 操作是否成功
 * @returns {string}    .message - 提示消息
 *
 * @throws {400} 配置对象不能为空或类型不正确
 *
 * @example request body:
 *   { "configs": { "site_name": "GameHub 2.0", "max_upload_size": "10MB" } }
 */
router.put('/settings', asyncHandler(async (req: Request, res: Response) => {
  const { configs } = req.body;

  if (!configs || typeof configs !== 'object') {
    return res.status(400).json({ success: false, message: '请提供配置对象' });
  }

  for (const [key, value] of Object.entries(configs)) {
    const existing = await query('SELECT id FROM system_configs WHERE config_key = ?', [key]);
    if (existing.length > 0) {
      await execute(
        'UPDATE system_configs SET config_value = ?, updated_by = ?, updated_at = ? WHERE config_key = ?',
        [value, 'admin', new Date().toISOString(), key]
      );
    }
  }

  // 记录批量配置更新的审计日志
  await createAuditLog({
    userId: 'admin',
    action: 'batch_update',
    resourceType: 'system_config',
    details: { configs: Object.keys(configs) },
    ipAddress: req.ip,
  });

  res.json({ success: true, message: '批量配置更新成功' });
}));

export default router;
