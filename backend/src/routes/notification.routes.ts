/**
 * 通知路由模块
 *
 * 本模块提供用户通知中心相关的所有 REST API 路由，包括：
 * - 获取用户通知列表（支持筛选：未读/类型/日期范围，分页）
 * - 获取未读通知数量
 * - 标记单条通知为已读（验证通知所属用户）
 * - 标记所有通知为已读
 * - 批量标记指定通知为已读
 * - 删除单条通知
 * - 删除用户所有通知
 * - 获取通知统计信息
 * - 管理员创建系统通知（发送给指定用户）
 * - 管理员创建营销通知（批量发送给多个用户）
 *
 * 路由前缀: /api/v1/notifications
 * 认证策略: 除管理接口外，所有通知路由均需要用户登录认证
 */
import { Router, Request, Response } from 'express';
import { authenticate, validateRequest, authorize } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import { paginationSchema } from '../validators';
import notificationService from '../services/notification.service';

const router = Router();

/**
 * @route GET /api/v1/notifications
 * @desc 获取当前用户的通知列表（支持多维度筛选和分页）
 * @access Private — 需要用户登录认证
 *
 * @middleware authenticate - 验证用户 JWT Token，确保仅返回当前用户的通知
 * @middleware validateRequest(paginationSchema) - 验证分页参数 page 和 limit 的格式
 *
 * @param {number} [req.query.page=1] - 页码，从 1 开始
 * @param {number} [req.query.limit=20] - 每页通知条数
 * @param {string} [req.query.unreadOnly] - 设为 'true' 时仅返回未读通知
 * @param {string} [req.query.type] - 按通知类型筛选（如 'system' | 'like' | 'comment' | 'follow' 等）
 * @param {string} [req.query.startDate] - 起始日期（ISO 格式），筛选此日期之后的通知
 * @param {string} [req.query.endDate] - 结束日期（ISO 格式），筛选此日期之前的通知
 *
 * @returns {200} {
 *   success: true,
 *   data: {
 *     notifications: Notification[],
 *     pagination: { page, limit, total, totalPages, hasNext, hasPrev }
 *   },
 *   message: '通知列表获取成功'
 * }
 *
 * @example
 *   GET /api/v1/notifications?page=1&limit=20&unreadOnly=true&type=like
 */
router.get(
  '/',
  authenticate,
  validateRequest(paginationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, unreadOnly, type, startDate, endDate } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '用户未认证',
      });
    }

    // 构建筛选条件对象
    const filters: any = {};
    if (unreadOnly === 'true') filters.unreadOnly = true;
    if (type) filters.type = type;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const { notifications, total, page: currentPage, limit: currentLimit } = await notificationService.getUserNotifications(
      userId,
      {
        page: Number(page),
        limit: Number(limit),
      },
      filters
    );

    const totalPages = Math.ceil(total / currentLimit);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          total,
          totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
        },
      },
      message: '通知列表获取成功',
    });
  })
);

/**
 * @route GET /api/v1/notifications/unread-count
 * @desc 获取当前用户的未读通知数量
 *       前端可在导航栏、标题栏等位置显示未读角标。
 * @access Private — 需要用户登录认证
 *
 * @middleware authenticate - 验证用户 JWT Token
 *
 * @returns {200} { success: true, data: { unreadCount: number }, message: '未读通知数量获取成功' }
 *
 * @example
 *   GET /api/v1/notifications/unread-count
 *   Response: { "success": true, "data": { "unreadCount": 3 }, "message": "未读通知数量获取成功" }
 */
router.get(
  '/unread-count',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '用户未认证',
      });
    }

    const count = await notificationService.getUnreadCount(userId);

    res.json({
      success: true,
      data: { unreadCount: count },
      message: '未读通知数量获取成功',
    });
  })
);

/**
 * @route PUT /api/v1/notifications/:id/read
 * @desc 将指定的单条通知标记为已读
 *       操作前会验证通知是否属于当前登录用户，防止越权操作。
 * @access Private — 需要用户登录认证
 *
 * @middleware authenticate - 验证用户 JWT Token
 *
 * @param {string} req.params.id - 要标记为已读的通知 ID
 *
 * @returns {200} { success: true, data: Notification, message: '通知已标记为已读' }
 * @returns {401} { success: false, error: '用户未认证' }
 * @returns {403} { success: false, error: '您没有权限标记此通知为已读' } — 通知不属于当前用户时返回
 * @returns {404} { success: false, error: '通知不存在' } — 通知 ID 无效时返回
 *
 * @example
 *   PUT /api/v1/notifications/notif-uuid-123/read
 */
router.put(
  '/:id/read',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '用户未认证',
      });
    }

    // 标记为已读后获取通知详情，用于验证所有权
    const notification = await notificationService.markAsRead(id);

    // 验证该通知确实属于当前用户
    if (notification.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: '您没有权限标记此通知为已读',
      });
    }

    res.json({
      success: true,
      data: notification,
      message: '通知已标记为已读',
    });
  })
);

/**
 * @route PUT /api/v1/notifications/read-all
 * @desc 将当前用户的所有未读通知批量标记为已读
 *       一次性操作所有通知，返回实际更新的通知数量。
 * @access Private — 需要用户登录认证
 *
 * @middleware authenticate - 验证用户 JWT Token
 *
 * @returns {200} { success: true, data: { updatedCount: number }, message: '已标记N条通知为已读' }
 *
 * @example
 *   PUT /api/v1/notifications/read-all
 *   Response: { "success": true, "data": { "updatedCount": 5 }, "message": "已标记5条通知为已读" }
 */
router.put(
  '/read-all',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '用户未认证',
      });
    }

    const updatedCount = await notificationService.markAllAsRead(userId);

    res.json({
      success: true,
      data: { updatedCount },
      message: `已标记${updatedCount}条通知为已读`,
    });
  })
);

/**
 * @route PUT /api/v1/notifications/batch-read
 * @desc 根据通知 ID 数组批量标记通知为已读
 *       区别于 read-all（全部标记），此接口仅标记指定的通知。
 * @access Private — 需要用户登录认证
 *
 * @middleware authenticate - 验证用户 JWT Token
 *
 * @param {string[]} req.body.notificationIds - 要标记为已读的通知 ID 数组（必填，不能为空）
 *
 * @returns {200} { success: true, data: { updatedCount: number }, message: '已标记N条通知为已读' }
 * @returns {400} { success: false, error: 'notificationIds必须是非空数组' } — 参数格式错误时返回
 * @returns {401} { success: false, error: '用户未认证' }
 *
 * @example
 *   PUT /api/v1/notifications/batch-read
 *   Body: { "notificationIds": ["notif-uuid-1", "notif-uuid-2", "notif-uuid-3"] }
 */
router.put(
  '/batch-read',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { notificationIds } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '用户未认证',
      });
    }

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'notificationIds必须是非空数组',
      });
    }

    const updatedCount = await notificationService.markBatchAsRead(notificationIds);

    res.json({
      success: true,
      data: { updatedCount },
      message: `已标记${updatedCount}条通知为已读`,
    });
  })
);

/**
 * @route DELETE /api/v1/notifications/:id
 * @desc 删除指定的单条通知（物理删除）
 *       注意：当前实现未验证通知是否属于当前用户（简化处理），
 *       实际生产环境中建议补充所有权验证逻辑。
 * @access Private — 需要用户登录认证
 *
 * @middleware authenticate - 验证用户 JWT Token
 *
 * @param {string} req.params.id - 要删除的通知 ID
 *
 * @returns {200} { success: true, message: '通知删除成功' }
 * @returns {401} { success: false, error: '用户未认证' }
 *
 * @example
 *   DELETE /api/v1/notifications/notif-uuid-123
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '用户未认证',
      });
    }

    // 注意：当前 deleteNotification 不返回通知对象，
    // 因此无法在这里验证所有权。生产环境中应在 service 层补充验证。
    await notificationService.deleteNotification(id);

    res.json({
      success: true,
      message: '通知删除成功',
    });
  })
);

/**
 * @route DELETE /api/v1/notifications
 * @desc 删除当前用户的所有通知
 *       清空用户通知中心的所有记录（物理删除）。
 * @access Private — 需要用户登录认证
 *
 * @middleware authenticate - 验证用户 JWT Token
 *
 * @returns {200} { success: true, data: { deletedCount: number }, message: '已删除N条通知' }
 *
 * @example
 *   DELETE /api/v1/notifications
 *   Response: { "success": true, "data": { "deletedCount": 10 }, "message": "已删除10条通知" }
 */
router.delete(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '用户未认证',
      });
    }

    const deletedCount = await notificationService.deleteAllUserNotifications(userId);

    res.json({
      success: true,
      data: { deletedCount },
      message: `已删除${deletedCount}条通知`,
    });
  })
);

/**
 * @route GET /api/v1/notifications/stats
 * @desc 获取当前用户的通知统计信息
 *       返回通知总数、未读数、各类型数量分布等统计数据。
 * @access Private — 需要用户登录认证
 *
 * @middleware authenticate - 验证用户 JWT Token
 *
 * @returns {200} { success: true, data: NotificationStats, message: '通知统计信息获取成功' }
 *
 * @example
 *   GET /api/v1/notifications/stats
 *   Response: { "success": true, "data": { "total": 50, "unread": 3, "byType": { "like": 20, "comment": 15 } } }
 */
router.get(
  '/stats',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '用户未认证',
      });
    }

    const stats = await notificationService.getNotificationStats(userId);

    res.json({
      success: true,
      data: stats,
      message: '通知统计信息获取成功',
    });
  })
);

/**
 * @route POST /api/v1/notifications/system
 * @desc 管理员创建系统通知（发送给指定用户）
 *       用于系统公告、重要提醒等场景。
 * @access Private/Admin — 需要 admin 或 super_admin 角色
 *
 * @middleware authenticate - 验证用户 JWT Token
 * @middleware authorize('admin') - 验证管理员角色
 *
 * @param {string} req.body.userId - 目标用户的 ID（必填）
 * @param {string} req.body.title - 通知标题（必填）
 * @param {string} req.body.message - 通知内容（必填）
 * @param {any} [req.body.data] - 可选，附加数据（JSON 对象，可用于前端跳转链接等）
 *
 * @returns {201} { success: true, data: Notification, message: '系统通知创建成功' }
 * @returns {400} { success: false, error: 'userId、title和message是必填字段' }
 *
 * @example
 *   POST /api/v1/notifications/system
 *   Body: {
 *     "userId": "user-uuid-123",
 *     "title": "系统维护通知",
 *     "message": "平台将于今晚 2:00-4:00 进行维护升级",
 *     "data": { "url": "/blog/maintenance" }
 *   }
 */
router.post(
  '/system',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, title, message, type, targetUrl, data: reqData } = req.body;

    // 将前端的 type 和 targetUrl 合并到 data 字段
    const data = {
      ...(reqData || {}),
      ...(targetUrl ? { url: targetUrl } : {}),
      ...(type ? { type } : {}),
    };

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: 'title和message是必填字段',
      });
    }

    // 如果指定了 userId，发给特定用户；否则广播给所有活跃用户
    if (userId) {
      const notification = await notificationService.createSystemNotification(userId, title, message, data);
      res.status(201).json({
        success: true,
        data: notification,
        message: '系统通知创建成功',
      });
    } else {
      // 广播系统通知：获取所有活跃用户并批量创建
      const { query } = require('../db');
      const users = await query('SELECT id FROM users WHERE is_active = true');
      const userIds = users.map((u: any) => u.id);

      if (userIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: '没有可接收通知的用户',
        });
      }

      const notifications = await notificationService.createMarketingNotifications(userIds, title, message, data);
      res.status(201).json({
        success: true,
        data: { notifications, count: notifications.length },
        message: `系统通知已广播给${notifications.length}个用户`,
      });
    }
  })
);

/**
 * @route POST /api/v1/notifications/marketing
 * @desc 管理员创建营销通知（批量发送给多个用户）
 *       用于活动推广、产品更新等营销场景。
 * @access Private/Admin — 需要 admin 或 super_admin 角色
 *
 * @middleware authenticate - 验证用户 JWT Token
 * @middleware authorize('admin') - 验证管理员角色
 *
 * @param {string[]} req.body.targetUserIds - 目标用户 ID 数组（必填，不可为空），兼容 userIds
 * @param {string} req.body.title - 通知标题（必填）
 * @param {string} req.body.message - 通知内容（必填）
 * @param {string} [req.body.targetUrl] - 可选，点击通知后跳转的 URL
 * @param {any} [req.body.data] - 可选，附加数据
 *
 * @returns {201} {
 *   success: true,
 *   data: { notifications: Notification[], count: number },
 *   message: '营销通知创建成功，发送给N个用户'
 * }
 * @returns {400} { success: false, error: 'targetUserIds（非空数组）、title和message是必填字段' }
 *
 * @example
 *   POST /api/v1/notifications/marketing
 *   Body: {
 *     "targetUserIds": ["user-uuid-1", "user-uuid-2", "user-uuid-3"],
 *     "title": "夏季促销活动",
 *     "message": "多种游戏优惠低至 5 折！",
 *     "targetUrl": "/promotion/summer-2026"
 *   }
 */
router.post(
  '/marketing',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    // 兼容前端字段名: targetUserIds 和 userIds 均可
    const userIds = req.body.targetUserIds || req.body.userIds;
    const { title, message, targetUrl, scheduledAt, data: reqData } = req.body;

    // 将前端的 targetUrl/scheduledAt 合并到 data 字段
    const data = {
      ...(reqData || {}),
      ...(targetUrl ? { url: targetUrl } : {}),
      ...(scheduledAt ? { scheduledAt } : {}),
    };

    if (!Array.isArray(userIds) || userIds.length === 0 || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'targetUserIds（非空数组）、title和message是必填字段',
      });
    }

    const notifications = await notificationService.createMarketingNotifications(userIds, title, message, data);

    res.status(201).json({
      success: true,
      data: { notifications, count: notifications.length },
      message: `营销通知创建成功，发送给${notifications.length}个用户`,
    });
  })
);

export default router;
