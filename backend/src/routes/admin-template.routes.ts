/**
 * 管理员评测模板管理路由模块
 *
 * 本模块提供游戏评测模板的后台管理接口，包括：
 * - 获取所有评测模板列表
 * - 获取单个评测模板详情
 * - 创建新的评测模板（包含章节配置、评分维度等）
 * - 更新现有评测模板
 * - 删除评测模板
 *
 * 评测模板用于规范游戏评测的结构和评分标准，
 * 包含章节定义、默认评分和评分维度等配置。
 *
 * 所有接口均需管理员身份认证。
 */

import { Router, Request, Response } from 'express';
import { adminAuthenticate } from '../middlewares/admin-auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import { reviewTemplateModel } from '../models/ReviewTemplate';

const router = Router();

/**
 * 管理员认证中间件
 * 所有评测模板管理路由都需要管理员身份验证令牌
 */
router.use(adminAuthenticate);

/**
 * @route   GET /api/v1/admin/review-templates
 * @desc    获取所有评测模板列表
 * @access  Private/Admin
 *
 * @returns {Object}          响应体
 * @returns {boolean}         .success - 操作是否成功
 * @returns {Array<Object>}   .data    - 评测模板数组
 * @returns {string}          .message - 提示消息
 *
 * @example response:
 *   {
 *     "success": true,
 *     "data": [
 *       { "id": 1, "name": "标准评测模板", "sections": [...], ... },
 *       ...
 *     ],
 *     "message": "评测模板列表获取成功"
 *   }
 */
router.get(
  '/review-templates',
  asyncHandler(async (_req: Request, res: Response) => {
    const templates = await reviewTemplateModel.findAll();
    res.json({
      success: true,
      data: templates,
      message: '评测模板列表获取成功',
    });
  })
);

/**
 * @route   GET /api/v1/admin/review-templates/:id
 * @desc    获取单个评测模板的详细信息
 * @access  Private/Admin
 *
 * @param   {string} req.params.id - 评测模板 ID
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success - 操作是否成功
 * @returns {Object}    .data    - 评测模板详情对象
 * @returns {string}    .message - 提示消息
 *
 * @throws  {404} 模板不存在时返回错误
 *
 * @example response:
 *   {
 *     "success": true,
 *     "data": { "id": 1, "name": "标准评测模板", "sections": [...], "scoreDimensions": [...] },
 *     "message": "评测模板详情获取成功"
 *   }
 */
router.get(
  '/review-templates/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const template = await reviewTemplateModel.findById(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: '评测模板不存在',
      });
    }

    res.json({
      success: true,
      data: template,
      message: '评测模板详情获取成功',
    });
  })
);

/**
 * @route   POST /api/v1/admin/review-templates
 * @desc    创建新的评测模板
 * @access  Private/Admin
 *
 * @param   {string}         req.body.name            - 模板名称（必填，不能为空字符串）
 * @param   {string}         [req.body.description]   - 模板描述说明
 * @param   {Array|string}   req.body.sections        - 章节配置（必填，可以是 JSON 字符串或对象数组）
 * @param   {Array|string}   [req.body.defaultScores] - 默认评分配置（可选，JSON 字符串或对象）
 * @param   {Array|string}   [req.body.scoreDimensions] - 评分维度配置（可选，JSON 字符串或对象）
 * @param   {number}         [req.body.sortOrder]     - 排序序号
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success - 操作是否成功
 * @returns {Object}    .data    - 新创建的评测模板对象
 * @returns {string}    .message - 提示消息
 *
 * @throws  {400} 模板名称或章节配置为必填项
 *
 * @example request body:
 *   {
 *     "name": "RPG 游戏评测模板",
 *     "description": "适用于角色扮演类游戏的评测模板",
 *     "sections": [
 *       { "title": "画面表现", "fields": ["画质", "美术风格"] },
 *       { "title": "游戏性", "fields": ["操作手感", "关卡设计"] }
 *     ],
 *     "scoreDimensions": [
 *       { "name": "画面", "maxScore": 10, "weight": 0.3 },
 *       { "name": "玩法", "maxScore": 10, "weight": 0.4 }
 *     ]
 *   }
 * @example response:
 *   { "success": true, "data": { ... 新模板 ... }, "message": "评测模板创建成功" }
 */
router.post(
  '/review-templates',
  asyncHandler(async (req: Request, res: Response) => {
    const { name, description, sections, defaultScores, scoreDimensions, sortOrder } = req.body;

    // 验证必填字段：模板名称
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: '模板名称是必填字段',
      });
    }

    // 验证必填字段：章节配置
    if (!sections) {
      return res.status(400).json({
        success: false,
        error: '模板章节配置是必填字段',
      });
    }

    const template = await reviewTemplateModel.create({
      name: name.trim(),
      description,
      sections: typeof sections === 'string' ? sections : JSON.stringify(sections),
      defaultScores: defaultScores ? (typeof defaultScores === 'string' ? defaultScores : JSON.stringify(defaultScores)) : undefined,
      scoreDimensions: scoreDimensions ? (typeof scoreDimensions === 'string' ? scoreDimensions : JSON.stringify(scoreDimensions)) : undefined,
      sortOrder,
    });

    res.status(201).json({
      success: true,
      data: template,
      message: '评测模板创建成功',
    });
  })
);

/**
 * @route   PUT /api/v1/admin/review-templates/:id
 * @desc    更新现有评测模板（支持部分更新）
 * @access  Private/Admin
 *
 * @param   {string}         req.params.id            - 要更新的评测模板 ID
 * @param   {string}         [req.body.name]          - 新模板名称
 * @param   {string}         [req.body.description]   - 新描述
 * @param   {Array|string}   [req.body.sections]      - 新章节配置（JSON 字符串或对象数组）
 * @param   {Array|string}   [req.body.defaultScores] - 新默认评分
 * @param   {Array|string}   [req.body.scoreDimensions] - 新评分维度
 * @param   {number}         [req.body.sortOrder]     - 新排序序号
 * @param   {boolean}        [req.body.isActive]      - 是否启用
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success - 操作是否成功
 * @returns {Object}    .data    - 更新后的评测模板对象
 * @returns {string}    .message - 提示消息
 *
 * @throws  {404} 模板不存在时返回错误
 *
 * @example request body:
 *   { "name": "更新后的模板名称", "sections": [ ... 新配置 ... ] }
 */
router.put(
  '/review-templates/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, sections, defaultScores, scoreDimensions, sortOrder, isActive } = req.body;

    // 检查模板是否存在
    const existing = await reviewTemplateModel.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: '评测模板不存在',
      });
    }

    const template = await reviewTemplateModel.update(id, {
      name: name?.trim(),
      description: description !== undefined ? description : undefined,
      sections: sections ? (typeof sections === 'string' ? sections : JSON.stringify(sections)) : undefined,
      defaultScores: defaultScores !== undefined ? (typeof defaultScores === 'string' ? defaultScores : JSON.stringify(defaultScores)) : undefined,
      scoreDimensions: scoreDimensions !== undefined ? (typeof scoreDimensions === 'string' ? scoreDimensions : JSON.stringify(scoreDimensions)) : undefined,
      sortOrder,
      isActive,
    });

    res.json({
      success: true,
      data: template,
      message: '评测模板更新成功',
    });
  })
);

/**
 * @route   DELETE /api/v1/admin/review-templates/:id
 * @desc    删除指定评测模板（危险操作，需超级管理员权限）
 * @access  Private/SuperAdmin
 *
 * @param   {string} req.params.id - 要删除的评测模板 ID
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success - 操作是否成功
 * @returns {string}    .message - 提示消息
 *
 * @throws  {404} 模板不存在时返回错误
 *
 * @example response:
 *   { "success": true, "message": "评测模板删除成功" }
 */
router.delete(
  '/review-templates/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // 检查模板是否存在
    const existing = await reviewTemplateModel.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: '评测模板不存在',
      });
    }

    await reviewTemplateModel.delete(id);

    res.json({
      success: true,
      message: '评测模板删除成功',
    });
  })
);

export default router;
