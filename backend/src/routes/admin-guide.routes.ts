/**
 * 管理员攻略管理路由模块
 *
 * 本模块提供攻略相关后台管理接口，包括：
 * - 获取攻略列表（支持分页，含未发布状态）
 * - 获取单个攻略详情
 * - 更新攻略内容
 * - 删除攻略
 *
 * 所有接口均需管理员身份认证。
 */

import { Router, Request, Response } from 'express';
import { adminAuthenticate } from '../middlewares/admin-auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import guideService from '../services/guide.service';

const router = Router();

/**
 * 管理员认证中间件
 * 所有攻略管理路由都需要管理员身份验证令牌
 */
router.use(adminAuthenticate);

/**
 * @route   GET /api/v1/admin/guides
 * @desc    获取所有攻略列表（管理员可见含未发布的攻略）
 * @access  Private/Admin
 *
 * @param   {number} req.query.page   - 当前页码（默认 1）
 * @param   {number} req.query.limit  - 每页数量（默认 50）
 *
 * @returns {Object} 响应体
 * @returns {boolean}        .success        - 操作是否成功
 * @returns {Array<Object>}  .data           - 攻略列表
 * @returns {Object}         .pagination     - 分页信息
 * @returns {number}         .pagination.page  - 当前页码
 * @returns {number}         .pagination.limit - 每页数量
 * @returns {number}         .pagination.total - 攻略总数
 * @returns {string}         .message        - 提示消息
 *
 * @example response:
 *   {
 *     "success": true,
 *     "data": [...],
 *     "pagination": { "page": 1, "limit": 50, "total": 100 },
 *     "message": "攻略列表获取成功"
 *   }
 */
router.get(
  '/guides',
  asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 50 } = req.query;

    const { guides, total } = await guideService.getGuides(
      {
        page: Number(page),
        limit: Number(limit),
        sortBy: 'createdAt',
        sortOrder: 'desc',
      },
      {}
    );

    res.json({
      success: true,
      data: guides,
      pagination: { page: Number(page), limit: Number(limit), total },
      message: '攻略列表获取成功',
    });
  })
);

/**
 * @route   GET /api/v1/admin/guides/:id
 * @desc    获取单个攻略详情（管理员可查看完整信息）
 * @access  Private/Admin
 *
 * @param   {string} req.params.id - 攻略唯一标识 ID
 *
 * @returns {Object}  响应体
 * @returns {boolean}        .success  - 操作是否成功
 * @returns {Object}         .data     - 攻略详情对象
 * @returns {string}         .message  - 提示消息
 *
 * @throws  {404} 攻略不存在时返回错误
 *
 * @example response:
 *   {
 *     "success": true,
 *     "data": { ... 攻略详情 ... },
 *     "message": "攻略详情获取成功"
 *   }
 */
router.get(
  '/guides/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const guide = await guideService.getGuideById(id);

    res.json({
      success: true,
      data: guide,
      message: '攻略详情获取成功',
    });
  })
);

/**
 * @route   PUT /api/v1/admin/guides/:id
 * @desc    更新指定攻略内容（管理员编辑操作）
 * @access  Private/Admin
 *
 * @param   {string} req.params.id - 要更新的攻略 ID
 * @param   {Object} req.body      - 更新数据（包含要修改的攻略字段）
 *
 * @returns {Object}  响应体
 * @returns {boolean}        .success  - 操作是否成功
 * @returns {Object}         .data     - 更新后的攻略对象
 * @returns {string}         .message  - 提示消息
 *
 * @throws  {404} 攻略不存在时返回错误
 *
 * @example request body:
 *   { "title": "新标题", "content": "更新后的内容" }
 * @example response:
 *   {
 *     "success": true,
 *     "data": { ... 更新后的攻略 ... },
 *     "message": "攻略更新成功"
 *   }
 */
router.put(
  '/guides/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;

    const guide = await guideService.updateGuide(id, updateData);

    res.json({
      success: true,
      data: guide,
      message: '攻略更新成功',
    });
  })
);

/**
 * @route   DELETE /api/v1/admin/guides/:id
 * @desc    删除指定攻略（危险操作，需超级管理员权限）
 * @access  Private/SuperAdmin
 *
 * @param   {string} req.params.id - 要删除的攻略 ID
 *
 * @returns {Object}  响应体
 * @returns {boolean}        .success  - 操作是否成功
 * @returns {string}         .message  - 提示消息
 *
 * @throws  {404} 攻略不存在时返回错误
 *
 * @example response:
 *   {
 *     "success": true,
 *     "message": "攻略删除成功"
 *   }
 */
router.delete(
  '/guides/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await guideService.deleteGuide(id);

    res.json({
      success: true,
      message: '攻略删除成功',
    });
  })
);

export default router;
