/**
 * 管理员用户画像路由模块
 *
 * 本模块提供用户画像分析相关后台管理接口，分为三大功能区域：
 *
 * 一、标签管理（Tags）
 *   - GET    /profiling/tags              — 获取全部标签
 *   - POST   /profiling/tags              — 创建标签
 *   - DELETE /profiling/tags/:id          — 删除标签
 *   - POST   /profiling/tags/assign       — 为用户分配标签
 *   - DELETE /profiling/tags/assign       — 移除用户标签
 *   - GET    /profiling/user-tags/:userId  — 查询指定用户的所有标签
 *
 * 二、用户分组管理（Segments）
 *   - GET    /profiling/segments                 — 获取全部分组
 *   - POST   /profiling/segments                 — 创建分组（静态/动态）
 *   - PUT    /profiling/segments/:id             — 更新分组
 *   - DELETE /profiling/segments/:id             — 删除分组
 *   - GET    /profiling/segments/:id/members     — 查看分组成员（分页）
 *   - POST   /profiling/segments/:id/members     — 添加成员到分组
 *   - DELETE /profiling/segments/:id/members     — 从分组移除成员
 *   - POST   /profiling/segments/:id/evaluate    — 评估动态分组并更新成员
 *
 * 三、行为分析（Behavior Analysis）
 *   - GET    /profiling/behavior/distributions  — 获取登录频率与等级分布
 *   - GET    /profiling/behavior/peak-hours      — 获取高峰登录时段
 *   - GET    /profiling/behavior/:userId         — 获取指定用户行为画像
 *
 * 所有接口均需管理员身份认证。
 */

import { Router, Request, Response } from 'express';
import { adminAuthenticate } from '../middlewares/admin-auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import { createAuditLog } from '../services/audit-log.service';
import {
  getAllTags,
  createTag,
  deleteTag,
  assignTagToUser,
  removeTagFromUser,
  getUserTags,
  getAllSegments,
  createSegment,
  updateSegment,
  deleteSegment,
  addMemberToSegment,
  removeMemberFromSegment,
  getSegmentMembers,
  evaluateDynamicSegment,
  getUserBehaviorProfile,
  getLoginFrequencyDistribution,
  getLevelDistribution,
  getPeakLoginHours,
} from '../services/profiling.service';

const router = Router();

/**
 * 管理员认证中间件
 * 所有用户画像管理路由都需要管理员身份验证令牌
 */
router.use(adminAuthenticate);

// ============================================================
//  标签管理（Tag Management）
//  用于对用户进行打标分类，便于精细化运营和分析
// ============================================================

/**
 * @route   GET /api/v1/admin/profiling/tags
 * @desc    获取系统中所有用户标签
 * @access  Private/Admin
 *
 * @returns {Object}          响应体
 * @returns {boolean}         .success - 操作是否成功
 * @returns {Array<Object>}   .data    - 标签列表数组
 *
 * @example response:
 *   { "success": true, "data": [ { id: 1, name: "高活跃", color: "#FF0000" }, ... ] }
 */
router.get('/profiling/tags', asyncHandler(async (_req: Request, res: Response) => {
  const tags = await getAllTags();
  res.json({ success: true, data: tags });
}));

/**
 * @route   POST /api/v1/admin/profiling/tags
 * @desc    创建新的用户标签
 * @access  Private/Admin
 *
 * @param   {string} req.body.name        - 标签名称（必填）
 * @param   {string} [req.body.color]     - 标签颜色值，如 "#FF0000"（可选）
 * @param   {string} [req.body.description] - 标签描述说明（可选）
 *
 * @returns {Object}   响应体
 * @returns {boolean}  .success - 操作是否成功
 * @returns {Object}   .data    - 新创建的标签对象
 * @returns {string}   .message - 提示消息
 *
 * @throws  {400} 标签名称为必填项
 *
 * @example request body:
 *   { "name": "高活跃", "color": "#FF0000", "description": "每日登录用户" }
 */
router.post('/profiling/tags', asyncHandler(async (req: Request, res: Response) => {
  const { name, color, description } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: '标签名称为必填项' });
  }
  const tag = await createTag(name, color, description);

  // 记录标签创建的审计日志
  await createAuditLog({
    userId: (req as any).user.id,
    action: 'create',
    resourceType: 'user_tag',
    resourceId: String(tag.id),
    details: { name, color },
    ipAddress: req.ip,
  });

  res.json({ success: true, data: tag, message: '标签创建成功' });
}));

/**
 * @route   DELETE /api/v1/admin/profiling/tags/:id
 * @desc    删除指定标签
 * @access  Private/Admin
 *
 * @param   {number} req.params.id - 标签 ID
 *
 * @returns {Object}   响应体
 * @returns {boolean}  .success - 操作是否成功
 * @returns {string}   .message - 提示消息
 */
router.delete('/profiling/tags/:id', asyncHandler(async (req: Request, res: Response) => {
  await deleteTag(Number(req.params.id));

  // 记录标签删除的审计日志
  await createAuditLog({
    userId: (req as any).user.id,
    action: 'delete',
    resourceType: 'user_tag',
    resourceId: req.params.id,
    ipAddress: req.ip,
  });

  res.json({ success: true, message: '标签已删除' });
}));

/**
 * @route   POST /api/v1/admin/profiling/tags/assign
 * @desc    为用户分配标签
 * @access  Private/Admin
 *
 * @param   {string} req.body.userId - 目标用户 ID（必填）
 * @param   {number} req.body.tagId  - 标签 ID（必填）
 *
 * @returns {Object}   响应体
 * @returns {boolean}  .success - 操作是否成功
 * @returns {string}   .message - 提示消息
 *
 * @throws  {400} 用户 ID 和标签 ID 为必填项
 */
router.post('/profiling/tags/assign', asyncHandler(async (req: Request, res: Response) => {
  const { userId, tagId } = req.body;
  if (!userId || !tagId) {
    return res.status(400).json({ success: false, message: '用户ID和标签ID为必填项' });
  }
  await assignTagToUser(userId, Number(tagId), (req as any).user.id);
  res.json({ success: true, message: '标签分配成功' });
}));

/**
 * @route   DELETE /api/v1/admin/profiling/tags/assign
 * @desc    移除用户已分配的标签
 * @access  Private/Admin
 *
 * @param   {string} req.body.userId - 目标用户 ID（必填）
 * @param   {number} req.body.tagId  - 标签 ID（必填）
 *
 * @returns {Object}   响应体
 * @returns {boolean}  .success - 操作是否成功
 * @returns {string}   .message - 提示消息
 *
 * @throws  {400} 用户 ID 和标签 ID 为必填项
 */
router.delete('/profiling/tags/assign', asyncHandler(async (req: Request, res: Response) => {
  const { userId, tagId } = req.body;
  if (!userId || !tagId) {
    return res.status(400).json({ success: false, message: '用户ID和标签ID为必填项' });
  }
  await removeTagFromUser(userId, Number(tagId));
  res.json({ success: true, message: '标签已移除' });
}));

/**
 * @route   GET /api/v1/admin/profiling/user-tags/:userId
 * @desc    查询指定用户被分配的所有标签
 * @access  Private/Admin
 *
 * @param   {string} req.params.userId - 用户 ID
 *
 * @returns {Object}          响应体
 * @returns {boolean}         .success - 操作是否成功
 * @returns {Array<Object>}   .data    - 用户标签列表
 */
router.get('/profiling/user-tags/:userId', asyncHandler(async (req: Request, res: Response) => {
  const tags = await getUserTags(req.params.userId);
  res.json({ success: true, data: tags });
}));

// ============================================================
//  用户分组管理（Segment Management）
//  支持静态分组（手动添加/移除成员）和动态分组（根据规则自动计算）
// ============================================================

/**
 * @route   GET /api/v1/admin/profiling/segments
 * @desc    获取系统中所有用户分组列表
 * @access  Private/Admin
 *
 * @returns {Object}          响应体
 * @returns {boolean}         .success - 操作是否成功
 * @returns {Array<Object>}   .data    - 分组列表
 */
router.get('/profiling/segments', asyncHandler(async (_req: Request, res: Response) => {
  const segments = await getAllSegments();
  res.json({ success: true, data: segments });
}));

/**
 * @route   POST /api/v1/admin/profiling/segments
 * @desc    创建用户分组
 * @access  Private/Admin
 *
 * @param   {string}   req.body.name        - 分组名称（必填）
 * @param   {string}   [req.body.description] - 分组描述
 * @param   {Object}   [req.body.criteria]  - 动态分组的筛选条件（JSON，仅动态分组需要）
 * @param   {boolean}  [req.body.isDynamic]  - 是否为动态分组（true=动态，false=静态）
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success - 操作是否成功
 * @returns {Object}    .data    - 新创建的分组对象
 * @returns {string}    .message - 提示消息
 *
 * @throws  {400} 分组名称为必填项
 *
 * @example request body:
 *   { "name": "高价值用户", "isDynamic": true, "criteria": { "loginCount": { "$gte": 30 } } }
 */
router.post('/profiling/segments', asyncHandler(async (req: Request, res: Response) => {
  const { name, description, criteria, isDynamic } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: '分组名称为必填项' });
  }
  const segment = await createSegment({
    name,
    description,
    criteria: criteria ? JSON.stringify(criteria) : undefined,
    isDynamic: isDynamic ? 1 : 0,
    createdBy: (req as any).user.id,
  });

  // 记录分组创建的审计日志
  await createAuditLog({
    userId: (req as any).user.id,
    action: 'create',
    resourceType: 'user_segment',
    resourceId: String(segment.id),
    details: { name, isDynamic },
    ipAddress: req.ip,
  });

  res.json({ success: true, data: segment, message: '分组创建成功' });
}));

/**
 * @route   PUT /api/v1/admin/profiling/segments/:id
 * @desc    更新用户分组信息
 * @access  Private/Admin
 *
 * @param   {number}   req.params.id          - 分组 ID
 * @param   {string}   [req.body.name]        - 新名称
 * @param   {string}   [req.body.description] - 新描述
 * @param   {Object}   [req.body.criteria]    - 新筛选条件
 * @param   {boolean}  [req.body.isDynamic]   - 是否动态分组
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success - 操作是否成功
 * @returns {Object}    .data    - 更新后的分组对象
 * @returns {string}    .message - 提示消息
 */
router.put('/profiling/segments/:id', asyncHandler(async (req: Request, res: Response) => {
  const { name, description, criteria, isDynamic } = req.body;
  const segment = await updateSegment(Number(req.params.id), {
    name,
    description,
    criteria: criteria ? JSON.stringify(criteria) : undefined,
    isDynamic,
  });
  res.json({ success: true, data: segment, message: '分组更新成功' });
}));

/**
 * @route   DELETE /api/v1/admin/profiling/segments/:id
 * @desc    删除用户分组
 * @access  Private/Admin
 *
 * @param   {number} req.params.id - 分组 ID
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success - 操作是否成功
 * @returns {string}    .message - 提示消息
 */
router.delete('/profiling/segments/:id', asyncHandler(async (req: Request, res: Response) => {
  await deleteSegment(Number(req.params.id));

  // 记录分组删除的审计日志
  await createAuditLog({
    userId: (req as any).user.id,
    action: 'delete',
    resourceType: 'user_segment',
    resourceId: req.params.id,
    ipAddress: req.ip,
  });

  res.json({ success: true, message: '分组已删除' });
}));

/**
 * @route   GET /api/v1/admin/profiling/segments/:id/members
 * @desc    获取指定分组的成员列表（支持分页）
 * @access  Private/Admin
 *
 * @param   {number} req.params.id      - 分组 ID
 * @param   {number} [req.query.page]   - 当前页码（默认 1）
 * @param   {number} [req.query.limit]  - 每页数量（默认 20）
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success - 操作是否成功
 * @returns {Object}    .data    - 分组成员数据（含分页信息）
 */
router.get('/profiling/segments/:id/members', asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20 } = req.query;
  const result = await getSegmentMembers(Number(req.params.id), Number(page), Number(limit));
  res.json({ success: true, data: result });
}));

/**
 * @route   POST /api/v1/admin/profiling/segments/:id/members
 * @desc    手动添加成员到静态分组
 * @access  Private/Admin
 *
 * @param   {number} req.params.id   - 分组 ID
 * @param   {string} req.body.userId - 要添加的用户 ID（必填）
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success - 操作是否成功
 * @returns {string}    .message - 提示消息
 *
 * @throws  {400} 用户 ID 为必填项
 */
router.post('/profiling/segments/:id/members', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ success: false, message: '用户ID为必填项' });
  }
  await addMemberToSegment(Number(req.params.id), userId, (req as any).user.id);
  res.json({ success: true, message: '成员添加成功' });
}));

/**
 * @route   DELETE /api/v1/admin/profiling/segments/:id/members
 * @desc    从静态分组中移除指定成员
 * @access  Private/Admin
 *
 * @param   {number} req.params.id   - 分组 ID
 * @param   {string} req.body.userId - 要移除的用户 ID（必填）
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success - 操作是否成功
 * @returns {string}    .message - 提示消息
 *
 * @throws  {400} 用户 ID 为必填项
 */
router.delete('/profiling/segments/:id/members', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ success: false, message: '用户ID为必填项' });
  }
  await removeMemberFromSegment(Number(req.params.id), userId);
  res.json({ success: true, message: '成员已移除' });
}));

/**
 * @route   POST /api/v1/admin/profiling/segments/:id/evaluate
 * @desc    重新评估动态分组，根据筛选条件自动更新组成员
 * @access  Private/Admin
 *
 * @param   {number} req.params.id - 动态分组 ID
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success - 操作是否成功
 * @returns {Object}    .data    - 评估结果（含影响用户数）
 * @returns {string}    .message - 提示消息，包含影响的用户数量
 */
router.post('/profiling/segments/:id/evaluate', asyncHandler(async (req: Request, res: Response) => {
  const result = await evaluateDynamicSegment(Number(req.params.id));
  res.json({ success: true, data: result, message: `动态分组已更新，影响 ${result.affected} 个用户` });
}));

// ============================================================
//  行为分析（Behavior Analysis）
//  提供用户行为数据的聚合统计与分析
// ============================================================

/**
 * @route   GET /api/v1/admin/profiling/behavior/distributions
 * @desc    获取用户登录频率分布和等级分布统计数据
 * @access  Private/Admin
 *
 * 注意：此路径必须在 /profiling/behavior/:userId 之前注册，
 *       避免 :userId 泛匹配拦截 "distributions" 路径。
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success                           - 操作是否成功
 * @returns {Object}    .data                              - 统计数据
 * @returns {Object}    .data.loginFrequency               - 登录频率分布
 * @returns {Object}    .data.levelDistribution            - 等级分布
 */
router.get('/profiling/behavior/distributions', asyncHandler(async (_req: Request, res: Response) => {
  const [frequency, levels] = await Promise.all([
    getLoginFrequencyDistribution(),
    getLevelDistribution(),
  ]);
  res.json({ success: true, data: { loginFrequency: frequency, levelDistribution: levels } });
}));

/**
 * @route   GET /api/v1/admin/profiling/behavior/peak-hours
 * @desc    查询用户高峰登录时段分布
 * @access  Private/Admin
 *
 * @param   {number} [req.query.days] - 统计天数范围（默认 30 天，最大 365 天）
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success - 操作是否成功
 * @returns {Object}    .data    - 高峰时段分布数据
 *
 * @example request:  /api/v1/admin/profiling/behavior/peak-hours?days=7
 */
router.get('/profiling/behavior/peak-hours', asyncHandler(async (req: Request, res: Response) => {
  const days = Math.min(parseInt(req.query.days as string) || 30, 365);
  const data = await getPeakLoginHours(days);
  res.json({ success: true, data });
}));

/**
 * @route   GET /api/v1/admin/profiling/behavior/:userId
 * @desc    获取指定用户的详细行为画像
 * @access  Private/Admin
 *
 * @param   {string} req.params.userId - 用户 ID
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success - 操作是否成功
 * @returns {Object}    .data    - 用户行为画像数据
 *          （包含登录频率、游戏偏好、活跃时段等行为特征）
 */
router.get('/profiling/behavior/:userId', asyncHandler(async (req: Request, res: Response) => {
  const profile = await getUserBehaviorProfile(req.params.userId);
  res.json({ success: true, data: profile });
}));

export default router;
