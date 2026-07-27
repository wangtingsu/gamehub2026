/**
 * 通知服务
 *
 * 提供站内通知的完整管理功能，包括创建、查询、标记已读和删除等操作。
 * 支持单个和批量两种创建/标记模式。
 * 通知类型覆盖系统通知、营销通知、消息通知等多种场景。
 * 提供通知统计、旧通知清理等维护功能。
 */
import config from '../config';
import logger from '../utils/logger';
import { query, execute, transaction } from '../db';
import {
  Notification,
  NotificationCreateInput,
  NotificationUpdateInput,
  PaginationParams
} from '../types';
import { NotFoundError } from '../middlewares/error.middleware';

/**
 * 将数据库行映射为 Notification 对象
 *
 * 处理 data 字段的 JSON 解析（兼容字符串和已解析对象两种格式），
 * 对日期字符串进行 Date 对象转换，并确保类型安全性。
 *
 * @param dbNotification - 数据库查询结果行
 * @returns 标准化的 Notification 对象
 */
const mapNotificationFromDb = (dbNotification: any): Notification => {
  // 解析 JSON 格式的数据字段
  const data = dbNotification.data
    ? (typeof dbNotification.data === 'string'
        ? JSON.parse(dbNotification.data)
        : dbNotification.data)
    : undefined;

  return {
    id: dbNotification.id.toString(),
    userId: dbNotification.user_id.toString(),
    type: dbNotification.type as Notification['type'],
    title: dbNotification.title,
    message: dbNotification.message,
    data,
    isRead: Boolean(dbNotification.is_read),
    readAt: dbNotification.read_at ? new Date(dbNotification.read_at) : undefined,
    createdAt: new Date(dbNotification.created_at),
    deletedAt: dbNotification.deleted_at ? new Date(dbNotification.deleted_at) : undefined,
    version: dbNotification.version ? Number(dbNotification.version) : 1,
  };
};

/**
 * 获取用户通知列表
 *
 * 分页获取指定用户的通知列表，支持未读筛选、类型筛选和时间范围筛选。
 * 按创建时间倒序排列（最新的在前）。
 *
 * @param userId - 用户 ID
 * @param pagination - 分页参数（page 默认 1，limit 默认 20）
 * @param filters - 筛选条件（是否仅未读、通知类型、起始日期、结束日期）
 * @returns 通知列表及分页元数据
 */
export const getUserNotifications = async (
  userId: string,
  pagination: PaginationParams = {},
  filters: { unreadOnly?: boolean; type?: Notification['type']; startDate?: Date; endDate?: Date } = {}
): Promise<{ notifications: Notification[]; total: number; page: number; limit: number }> => {
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;

  // 动态构建筛选条件
  const conditions: string[] = ['user_id = ?'];
  const queryParams: any[] = [userId];

  if (filters.unreadOnly) {
    conditions.push('is_read = 0');
  }

  if (filters.type) {
    conditions.push(`type = ?`);
    queryParams.push(filters.type);
  }

  if (filters.startDate) {
    conditions.push(`created_at >= ?`);
    queryParams.push(filters.startDate.toISOString());
  }

  if (filters.endDate) {
    conditions.push(`created_at <= ?`);
    queryParams.push(filters.endDate.toISOString());
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // 先获取总数
  const countSql = `SELECT COUNT(*) as total FROM notifications ${whereClause}`;
  const countResult = await query(countSql, queryParams);
  const total = parseInt(countResult[0]?.total || 0);

  // 再获取分页数据
  const dataSql = `
    SELECT *
    FROM notifications
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;
  const dataParams = [...queryParams, limit, offset];
  const result = await query(dataSql, dataParams);

  const notifications = result.map((row: any) => mapNotificationFromDb(row));

  logger.debug(`获取用户通知列表成功，用户ID: ${userId}，第${page}页，每页${limit}条，共${total}条`);

  return {
    notifications,
    total,
    page,
    limit,
  };
};

/**
 * 获取用户未读通知数量
 *
 * 统计指定用户所有未读通知的条数，用于 UI 角标展示。
 *
 * @param userId - 用户 ID
 * @returns 未读通知数量
 */
export const getUnreadCount = async (userId: string): Promise<number> => {
  const result = await query(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId]
  );
  const count = parseInt(result[0]?.count || 0);
  logger.debug(`获取用户未读通知数量成功，用户ID: ${userId}，未读数量: ${count}`);
  return count;
};

/**
 * 创建通知
 *
 * 插入一条新的通知记录，data 字段自动序列化为 JSON 字符串。
 *
 * @param notificationData - 通知创建数据（用户 ID、类型、标题、消息、附加数据）
 * @returns 创建成功的完整 Notification 对象
 */
export const createNotification = async (notificationData: NotificationCreateInput): Promise<Notification> => {
  const result = await execute(
    `INSERT INTO notifications (
      user_id, type, title, message, data,
      is_read, read_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      notificationData.userId,
      notificationData.type,
      notificationData.title,
      notificationData.message,
      notificationData.data ? JSON.stringify(notificationData.data) : null,
      false,
      null,
      new Date().toISOString(),
    ]
  );

  // 查询刚插入的完整记录
  const inserted = await query(
    'SELECT * FROM notifications WHERE id = ?',
    [result.lastInsertRowid]
  );

  const notification = mapNotificationFromDb(inserted[0]);
  logger.info(`通知创建成功: ID ${notification.id}, 用户ID: ${notification.userId}, 类型: ${notification.type}`);

  return notification;
};

/**
 * 批量创建通知
 *
 * 为多个用户或同一用户创建多条通知。逐条创建并记录日志，
 * 单条创建失败不影响其他通知的创建。
 *
 * @param notificationsData - 通知创建数据数组
 * @returns 成功创建的 Notification 对象数组
 */
export const createBatchNotifications = async (notificationsData: NotificationCreateInput[]): Promise<Notification[]> => {
  const createdNotifications: Notification[] = [];

  // 逐条创建，失败时记录错误但继续处理其他通知
  for (const notificationData of notificationsData) {
    try {
      const result = await execute(
        `INSERT INTO notifications (
          user_id, type, title, message, data,
          is_read, read_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          notificationData.userId,
          notificationData.type,
          notificationData.title,
          notificationData.message,
          notificationData.data ? JSON.stringify(notificationData.data) : null,
          false,
          null,
          new Date().toISOString(),
        ]
      );

      const inserted = await query(
        'SELECT * FROM notifications WHERE id = ?',
        [result.lastInsertRowid]
      );

      const notification = mapNotificationFromDb(inserted[0]);
      createdNotifications.push(notification);
      logger.debug(`批量通知创建成功: ID ${notification.id}, 用户ID: ${notification.userId}`);
    } catch (error) {
      logger.error(`创建通知失败 (用户: ${notificationData.userId}):`, error);
      // 继续处理其他通知，不中断批量流程
    }
  }

  logger.info(`批量通知创建完成，成功创建${createdNotifications.length}条通知`);
  return createdNotifications;
};

/**
 * 标记单个通知为已读
 *
 * 将指定通知标记为已读，同时记录阅读时间。
 *
 * @param notificationId - 通知 ID
 * @returns 更新后的 Notification 对象
 * @throws 当通知不存在时抛出 NotFoundError
 */
export const markAsRead = async (notificationId: string): Promise<Notification> => {
  const now = new Date().toISOString();
  const result = await execute(
    `UPDATE notifications
     SET is_read = true, read_at = ?, updated_at = ?
     WHERE id = ?`,
    [now, now, notificationId]
  );

  if (result.changes === 0) {
    throw new NotFoundError(`通知ID ${notificationId} 不存在`);
  }

  const updated = await query(
    'SELECT * FROM notifications WHERE id = ?',
    [notificationId]
  );

  const notification = mapNotificationFromDb(updated[0]);
  logger.info(`通知标记为已读成功: ID ${notificationId}`);

  return notification;
};

/**
 * 批量标记通知为已读
 *
 * 将指定 ID 列表中的所有未读通知标记为已读。
 * 使用 IN 查询实现一次数据库更新。
 *
 * @param notificationIds - 通知 ID 数组
 * @returns 实际更新的通知数量
 */
export const markBatchAsRead = async (notificationIds: string[]): Promise<number> => {
  if (notificationIds.length === 0) {
    return 0;
  }

  // 生成 IN 子句的占位符
  const placeholders = notificationIds.map(() => '?').join(', ');
  const now = new Date().toISOString();
  const sql = `
    UPDATE notifications
    SET is_read = true, read_at = ?, updated_at = ?
    WHERE id IN (${placeholders}) AND is_read = false
  `;

  const result = await execute(sql, [now, now, ...notificationIds]);
  const updatedCount = result.changes;

  logger.info(`批量标记通知为已读成功，更新了${updatedCount}条通知`);

  return updatedCount;
};

/**
 * 标记用户所有通知为已读
 *
 * 将指定用户的所有未读通知一次性标记为已读。
 *
 * @param userId - 用户 ID
 * @returns 实际更新的通知数量
 */
export const markAllAsRead = async (userId: string): Promise<number> => {
  const now = new Date().toISOString();
  const result = await execute(
    `UPDATE notifications
     SET is_read = true, read_at = ?, updated_at = ?
     WHERE user_id = ? AND is_read = false`,
    [now, now, userId]
  );

  const updatedCount = result.changes;
  logger.info(`标记用户所有通知为已读成功，用户ID: ${userId}，更新了${updatedCount}条通知`);

  return updatedCount;
};

/**
 * 删除通知（软删除）
 *
 * 将指定通知的 deleted_at 字段设置为当前时间，数据仍保留在数据库中。
 *
 * @param notificationId - 通知 ID
 * @throws 当通知不存在时抛出 NotFoundError
 */
export const deleteNotification = async (notificationId: string): Promise<void> => {
  const now = new Date().toISOString();
  const result = await execute(
    'UPDATE notifications SET deleted_at = ? WHERE id = ?',
    [now, notificationId]
  );

  if (result.changes === 0) {
    throw new NotFoundError(`通知ID ${notificationId} 不存在`);
  }

  logger.info(`通知删除成功: ID ${notificationId}`);
};

/**
 * 删除用户所有通知（软删除）
 *
 * 将指定用户所有未删除的通知进行软删除。
 *
 * @param userId - 用户 ID
 * @returns 实际删除的通知数量
 */
export const deleteAllUserNotifications = async (userId: string): Promise<number> => {
  const now = new Date().toISOString();
  const result = await execute(
    `UPDATE notifications
     SET deleted_at = ?
     WHERE user_id = ? AND deleted_at IS NULL`,
    [now, userId]
  );

  const deletedCount = result.changes;
  logger.info(`删除用户所有通知成功，用户ID: ${userId}，删除了${deletedCount}条通知`);

  return deletedCount;
};

/**
 * 获取通知统计信息
 *
 * 统计指定用户（或全平台）的通知总数、未读数和按类型的分布。
 *
 * @param userId - 用户 ID（可选，不传则统计全部用户）
 * @returns 统计信息：总通知数、未读数和按类型分类的计数
 */
export const getNotificationStats = async (userId?: string): Promise<{
  total: number;
  unread: number;
  byType: Record<string, number>;
}> => {
  const conditions: string[] = ['deleted_at IS NULL'];
  const params: any[] = [];

  if (userId) {
    conditions.push(`user_id = ?`);
    params.push(userId);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const sql = `SELECT * FROM notifications ${whereClause}`;

  const result = await query(sql, params);
  const total = result.length;
  const unread = result.filter((row: any) => row.is_read === 0).length;

  // 按通知类型分组计数
  const byType: Record<string, number> = {};
  result.forEach((row: any) => {
    const type = row.type;
    byType[type] = (byType[type] || 0) + 1;
  });

  logger.debug(`获取通知统计信息成功，用户ID: ${userId || '全部'}，总计: ${total}，未读: ${unread}`);

  return {
    total,
    unread,
    byType,
  };
};

/**
 * 清理旧通知（软删除）
 *
 * 将超过指定天数的通知进行软删除，用于定期维护和数据清理。
 *
 * @param daysToKeep - 保留通知的天数（默认 30 天）
 * @returns 实际清理的通知数量
 */
export const cleanupOldNotifications = async (daysToKeep: number = 30): Promise<number> => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const now = new Date().toISOString();
  const result = await execute(
    `UPDATE notifications
     SET deleted_at = ?
     WHERE created_at < ? AND deleted_at IS NULL`,
    [now, cutoffDate.toISOString()]
  );

  const cleanedCount = result.changes;
  logger.info(`清理旧通知成功，清理了${cleanedCount}条${daysToKeep}天前的通知`);

  return cleanedCount;
};

/**
 * 创建系统通知
 *
 * 快捷方法，创建一个类型为 system 的通知。
 *
 * @param userId - 目标用户 ID
 * @param title - 通知标题
 * @param message - 通知消息内容
 * @param data - 附加数据（可选）
 * @returns 创建成功的 Notification 对象
 */
export const createSystemNotification = async (
  userId: string,
  title: string,
  message: string,
  data?: Record<string, any>
): Promise<Notification> => {
  return createNotification({
    userId,
    type: 'system',
    title,
    message,
    data,
  });
};

/**
 * 创建营销通知（批量）
 *
 * 向指定的一组用户发送相同的营销通知内容。
 *
 * @param userIds - 目标用户 ID 数组
 * @param title - 通知标题
 * @param message - 通知消息内容
 * @param data - 附加数据（可选）
 * @returns 成功创建的 Notification 对象数组
 */
export const createMarketingNotifications = async (
  userIds: string[],
  title: string,
  message: string,
  data?: Record<string, any>
): Promise<Notification[]> => {
  const notificationsData: NotificationCreateInput[] = userIds.map(userId => ({
    userId,
    type: 'marketing',
    title,
    message,
    data,
  }));

  return createBatchNotifications(notificationsData);
};

export default {
  getUserNotifications,
  getUnreadCount,
  createNotification,
  createBatchNotifications,
  markAsRead,
  markBatchAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllUserNotifications,
  getNotificationStats,
  cleanupOldNotifications,
  createSystemNotification,
  createMarketingNotifications,
};
