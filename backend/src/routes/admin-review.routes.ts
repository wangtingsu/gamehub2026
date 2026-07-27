/**
 * 管理员内容审核路由模块
 *
 * 本模块提供内容审核后台管理接口，包括：
 * - 获取待审核内容队列（支持按类型和状态筛选）
 * - 获取审核统计概览
 * - 审核通过指定内容
 * - 审核拒绝指定内容（需填写拒绝原因）
 *
 * 所有接口均需管理员身份认证。
 */

import { Router, Request, Response } from 'express';
import { adminAuthenticate } from '../middlewares/admin-auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import {
  getPendingContentQueue,
  getReviewStats,
  approveContent,
  rejectContent,
} from '../services/content-review.service';

const router = Router();

/**
 * 管理员认证中间件
 * 所有内容审核路由都需要管理员身份验证令牌
 */
router.use(adminAuthenticate);

/**
 * @route   GET /api/v1/admin/review/queue
 * @desc    获取待审核内容队列列表（支持分页、按类型和状态筛选）
 * @access  Private/Admin
 *
 * @param   {number}  [req.query.page]   - 当前页码（默认 1）
 * @param   {number}  [req.query.limit]  - 每页数量（默认 20）
 * @param   {string}  [req.query.type]   - 筛选内容类型（如 "guide", "review", "comment" 等）
 * @param   {string}  [req.query.status] - 筛选审核状态：pending | approved | rejected
 *
 * @returns {Object}   响应体
 * @returns {boolean}  .success           - 操作是否成功
 * @returns {Array}    .data              - 审核队列条目列表
 * @returns {Object}   .pagination        - 分页信息
 * @returns {number}   .pagination.page   - 当前页码
 * @returns {number}   .pagination.limit  - 每页数量
 * @returns {number}   .pagination.total  - 总记录数
 * @returns {string}   .message           - 提示消息
 *
 * @example request:  /api/v1/admin/review/queue?page=1&limit=20&type=guide&status=pending
 * @example response:
 *   {
 *     "success": true,
 *     "data": [ ... ],
 *     "pagination": { "page": 1, "limit": 20, "total": 50 },
 *     "message": "审核队列获取成功"
 *   }
 */
router.get(
  '/review/queue',
  asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, type, status } = req.query;

    const result = await getPendingContentQueue({
      page: Number(page),
      limit: Number(limit),
      type: type as string | undefined,
      status: status as 'pending' | 'approved' | 'rejected' | undefined,
    });

    res.json({
      success: true,
      data: {
        items: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
        },
      },
      message: '审核队列获取成功',
    });
  })
);

/**
 * @route   GET /api/v1/admin/review/stats
 * @desc    获取内容审核统计概览（如待审核数量、通过率等）
 * @access  Private/Admin
 *
 * @returns {Object}   响应体
 * @returns {boolean}  .success - 操作是否成功
 * @returns {Object}   .data    - 审核统计数据
 * @returns {string}   .message - 提示消息
 *
 * @example response:
 *   {
 *     "success": true,
 *     "data": { "pending": 15, "approved": 120, "rejected": 8 },
 *     "message": "审核统计获取成功"
 *   }
 */
router.get(
  '/review/stats',
  asyncHandler(async (_req: Request, res: Response) => {
    const stats = await getReviewStats();

    res.json({
      success: true,
      data: stats,
      message: '审核统计获取成功',
    });
  })
);

/**
 * @route   PUT /api/v1/admin/review/:type/:id/approve
 * @desc    审核通过指定内容
 * @access  Private/Admin
 *
 * @param   {string} req.params.type - 内容类型（如 guide, review, comment 等）
 * @param   {string} req.params.id   - 内容唯一标识 ID
 *
 * @returns {Object}   响应体
 * @returns {boolean}  .success - 操作是否成功
 * @returns {string}   .message - 提示消息
 *
 * @example request: PUT /api/v1/admin/review/guide/123/approve
 * @example response:
 *   { "success": true, "message": "内容审核通过" }
 */
router.put(
  '/review/:type/:id/approve',
  asyncHandler(async (req: Request, res: Response) => {
    const { type, id } = req.params;
    const reviewerId = (req as any).user?.id || 'system';

    await approveContent(type, id, reviewerId);

    res.json({
      success: true,
      message: '内容审核通过',
    });
  })
);

/**
 * @route   PUT /api/v1/admin/review/:type/:id/reject
 * @desc    审核拒绝指定内容（需填写拒绝原因）
 * @access  Private/Admin
 *
 * @param   {string} req.params.type    - 内容类型（如 guide, review, comment 等）
 * @param   {string} req.params.id      - 内容唯一标识 ID
 * @param   {string} req.body.comment   - 拒绝原因（必填，不能为空）
 *
 * @returns {Object}    响应体
 * @returns {boolean}   .success - 操作是否成功
 * @returns {string}    .message - 提示消息
 *
 * @throws  {400} 拒绝原因不能为空
 *
 * @example request body:
 *   { "comment": "内容包含不符合社区规范的描述" }
 * @example response:
 *   { "success": true, "message": "内容已拒绝" }
 */
router.put(
  '/review/:type/:id/reject',
  asyncHandler(async (req: Request, res: Response) => {
    const { type, id } = req.params;
    const { comment } = req.body;
    const reviewerId = (req as any).user?.id || 'system';

    // 验证拒绝原因是否填写
    if (!comment || !comment.trim()) {
      res.status(400).json({
        success: false,
        message: '请填写拒绝原因',
      });
      return;
    }

    await rejectContent(type, id, reviewerId, comment);

    res.json({
      success: true,
      message: '内容已拒绝',
    });
  })
);

export default router;
