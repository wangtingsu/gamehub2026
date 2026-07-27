/**
 * 通知模型模块
 *
 * 本模块负责管理游戏平台中所有用户通知的数据库操作，
 * 包括系统通知、营销通知、互动通知（点赞、评论、关注、提及）等的
 * 创建、查询、标记已读和删除功能。
 * 支持软删除、乐观锁和操作审计特性。
 */

import { BaseModel } from './BaseModel';
import { Notification, NotificationCreateInput, NotificationUpdateInput } from '../types';
import { query } from '../db';
import logger from '../utils/logger';

/**
 * 通知模型
 *
 * 继承自 BaseModel，提供通知相关的所有数据库操作方法。
 * 支持多种通知类型（点赞、评论、关注、提及、系统、营销），
 * 具备批量创建、批量标记已读、按条件查询和统计等功能。
 * 启用了软删除（删除后仍保留数据）、乐观锁（防止并发冲突）和操作审计（记录变更历史）。
 */
export class NotificationModel extends BaseModel<Notification, NotificationCreateInput, NotificationUpdateInput> {
  /** 数据库表名 */
  protected tableName = 'notifications';
  /** 主键字段名 */
  protected primaryKey = 'id';

  /** 启用软删除：删除操作仅标记 deleted_at，不实际删除记录 */
  protected softDeleteEnabled = true;
  /** 启用乐观锁：通过 version 字段防止并发更新冲突 */
  protected optimisticLockEnabled = true;
  /** 启用操作审计：自动记录创建者/更新者信息 */
  protected auditEnabled = true;

  /**
   * 将数据库行记录转换为 Notification 业务对象
   *
   * @param row - 从数据库查询得到的原始行数据
   * @returns 转换后的 Notification 对象
   */
  protected fromRow(row: any): Notification {
    // 解析 JSON 格式的附加数据字段
    const data = row.data
      ? (typeof row.data === 'string'
          ? JSON.parse(row.data)
          : row.data)
      : undefined;

    return {
      id: String(row.id),                               // 通知唯一标识
      userId: String(row.user_id),                      // 接收通知的用户 ID
      type: row.type as 'like' | 'comment' | 'follow' | 'mention' | 'system' | 'marketing', // 通知类型
      title: row.title,                                 // 通知标题
      message: row.message,                             // 通知正文内容
      data,                                             // 附加数据（如相关资源的 ID 等）
      isRead: Boolean(row.is_read),                     // 是否已读
      readAt: row.read_at ? new Date(row.read_at) : undefined, // 阅读时间
      createdAt: new Date(row.created_at),              // 创建时间
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined, // 软删除时间
      version: row.version ? Number(row.version) : 1,   // 乐观锁版本号
    };
  }

  /**
   * 将 NotificationCreateInput 业务对象转换为数据库行记录
   *
   * @param data - 前端传入的通知创建输入数据
   * @returns 适用于数据库插入的行记录对象
   */
  protected toRow(data: NotificationCreateInput): any {
    return {
      user_id: data.userId,                     // 接收通知的用户 ID
      type: data.type,                          // 通知类型
      title: data.title,                        // 通知标题
      message: data.message,                    // 通知正文
      data: data.data ? JSON.stringify(data.data) : null, // JSON 序列化的附加数据
      is_read: 0,                               // 初始状态为未读
      read_at: null,                            // 初始无阅读时间
      created_at: new Date().toISOString(),     // 当前时间作为创建时间
      deleted_at: null,                         // 初始未删除
      version: 1,                               // 初始版本号
      created_by: null,                         // 系统创建，无创建者
      updated_by: null,                         // 初始无更新者
    };
  }

  /**
   * 创建单条通知
   *
   * 封装了基础 create 方法，添加错误日志记录。
   *
   * @param data - 通知创建输入数据
   * @returns 创建成功的 Notification 对象
   * @throws 创建失败时抛出异常
   */
  async createNotification(data: NotificationCreateInput): Promise<Notification> {
    try {
      return this.create(data);
    } catch (error) {
      logger.error('创建通知失败:', error);
      throw error;
    }
  }

  /**
   * 批量创建通知
   *
   * 遍历通知列表逐条创建，单条失败不会影响其他通知的创建。
   * 适用于营销通知等需要向多个用户发送相同内容的场景。
   *
   * @param notifications - 通知创建输入数据数组
   * @returns 成功创建的 Notification 对象数组
   * @throws 批量创建过程中发生严重错误时抛出异常
   */
  async createBatchNotifications(notifications: NotificationCreateInput[]): Promise<Notification[]> {
    try {
      const results: Notification[] = [];
      for (const notification of notifications) {
        try {
          const result = await this.create(notification);
          results.push(result);
        } catch (error) {
          logger.error(`创建通知失败 (用户: ${notification.userId}):`, error);
          // 继续处理其他通知，不中断批量操作
        }
      }
      return results;
    } catch (error) {
      logger.error('批量创建通知失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户的通知列表
   *
   * 支持分页、按未读状态筛选、按类型筛选和按时间范围筛选。
   * 结果按创建时间降序排列（最新的在前）。
   *
   * @param userId - 用户 ID
   * @param options - 查询选项（可选）
   * @param options.limit - 每页数量限制
   * @param options.offset - 分页偏移量
   * @param options.unreadOnly - 是否仅查询未读通知
   * @param options.type - 按通知类型筛选
   * @param options.startDate - 起始时间（含）
   * @param options.endDate - 结束时间（含）
   * @returns 符合条件的 Notification 对象数组
   * @throws 查询失败时抛出异常
   */
  async getUserNotifications(userId: string, options?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    type?: Notification['type'];
    startDate?: Date;
    endDate?: Date;
  }): Promise<Notification[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE user_id = ?`;
      const params: any[] = [userId];

      // 仅查询未读通知
      if (options?.unreadOnly) {
        sql += ` AND is_read = 0`;
      }

      // 按通知类型筛选
      if (options?.type) {
        sql += ` AND type = ?`;
        params.push(options.type);
      }

      // 按起始时间筛选
      if (options?.startDate) {
        sql += ` AND created_at >= ?`;
        params.push(options.startDate.toISOString());
      }

      // 按结束时间筛选
      if (options?.endDate) {
        sql += ` AND created_at <= ?`;
        params.push(options.endDate.toISOString());
      }

      // 按创建时间降序排列
      sql += ` ORDER BY created_at DESC`;

      // 分页查询
      if (options?.limit) {
        sql += ` LIMIT ?`;
        params.push(options.limit);

        if (options?.offset) {
          sql += ` OFFSET ?`;
          params.push(options.offset);
        }
      }

      const rows = await query(sql, params);
      return rows.map((row: any) => this.fromRow(row));
    } catch (error) {
      logger.error('获取用户通知列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户未读通知数量
   *
   * @param userId - 用户 ID
   * @returns 未读通知的总数
   * @throws 查询失败时抛出异常
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      return this.count('user_id = ? AND is_read = 0', [userId]);
    } catch (error) {
      logger.error('获取未读通知数量失败:', error);
      throw error;
    }
  }

  /**
   * 将单条通知标记为已读
   *
   * 更新通知的 is_read 为 true，并记录阅读时间。
   *
   * @param notificationId - 通知 ID
   * @returns 标记成功返回 true，通知不存在返回 false
   * @throws 更新失败时抛出异常
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const result = await this.update(notificationId, {
        isRead: true,
        readAt: new Date(),
      });
      return result !== null;
    } catch (error) {
      logger.error('标记通知为已读失败:', error);
      throw error;
    }
  }

  /**
   * 批量将通知标记为已读
   *
   * 使用一条 SQL UPDATE 语句同时更新多条通知，提高性能。
   * 仅更新当前状态为未读（is_read = 0）的通知。
   *
   * @param notificationIds - 需要标记为已读的通知 ID 数组
   * @returns 实际标记成功的通知数量
   * @throws 更新失败时抛出异常
   */
  async markBatchAsRead(notificationIds: string[]): Promise<number> {
    try {
      if (notificationIds.length === 0) {
        return 0;
      }

      const placeholders = notificationIds.map(() => '?').join(', ');
      const sql = `
        UPDATE ${this.tableName}
        SET is_read = 1, read_at = ?, updated_at = ?
        WHERE id IN (${placeholders}) AND is_read = 0
      `;
      const params = [new Date().toISOString(), new Date().toISOString(), ...notificationIds];

      const result = await query(sql, params);
      return result.affectedRows || 0;
    } catch (error) {
      logger.error('批量标记通知为已读失败:', error);
      throw error;
    }
  }

  /**
   * 将用户所有通知标记为已读
   *
   * 一次性将指定用户的所有未读通知标记为已读，
   * 适用于用户点击"全部标记已读"场景。
   *
   * @param userId - 用户 ID
   * @returns 标记成功的通知数量
   * @throws 更新失败时抛出异常
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const sql = `
        UPDATE ${this.tableName}
        SET is_read = 1, read_at = ?, updated_at = ?
        WHERE user_id = ? AND is_read = 0
      `;
      const result = await query(sql, [
        new Date().toISOString(),
        new Date().toISOString(),
        userId,
      ]);
      return result.affectedRows || 0;
    } catch (error) {
      logger.error('标记所有通知为已读失败:', error);
      throw error;
    }
  }

  /**
   * 删除单条通知（软删除）
   *
   * 由于启用了软删除，实际执行的是标记 deleted_at 字段，
   * 数据仍保留在数据库中。
   *
   * @param notificationId - 通知 ID
   * @returns 删除成功返回 true，通知不存在返回 false
   * @throws 删除失败时抛出异常
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      return this.delete(notificationId);
    } catch (error) {
      logger.error('删除通知失败:', error);
      throw error;
    }
  }

  /**
   * 删除用户所有通知（软删除）
   *
   * 将指定用户所有未删除的通知标记为软删除。
   *
   * @param userId - 用户 ID
   * @returns 被删除的通知数量
   * @throws 删除失败时抛出异常
   */
  async deleteAllUserNotifications(userId: string): Promise<number> {
    try {
      // 使用软删除：设置 deleted_at 字段
      const sql = `
        UPDATE ${this.tableName}
        SET deleted_at = ?, updated_at = ?
        WHERE user_id = ? AND deleted_at IS NULL
      `;
      const result = await query(sql, [
        new Date().toISOString(),
        new Date().toISOString(),
        userId,
      ]);
      return result.affectedRows || 0;
    } catch (error) {
      logger.error('删除用户所有通知失败:', error);
      throw error;
    }
  }

  /**
   * 获取通知统计信息
   *
   * 统计通知的总数、未读数和按类型分类的数量。
   * 可针对特定用户统计，也可统计全平台（不传 userId）。
   *
   * @param userId - 用户 ID（可选，不传则统计全平台）
   * @returns 统计结果对象，包含 total（总数）、unread（未读数）和 byType（按类型分类计数）
   * @throws 查询失败时抛出异常
   */
  async getNotificationStats(userId?: string): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
  }> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE deleted_at IS NULL`;
      const params: any[] = [];

      // 按用户筛选
      if (userId) {
        sql += ` AND user_id = ?`;
        params.push(userId);
      }

      const rows = await query(sql, params);
      const total = rows.length;
      const unread = rows.filter((row: any) => row.is_read === 0).length;

      // 按类型分组统计
      const byType: Record<string, number> = {};
      rows.forEach((row: any) => {
        const type = row.type;
        byType[type] = (byType[type] || 0) + 1;
      });

      return {
        total,
        unread,
        byType,
      };
    } catch (error) {
      logger.error('获取通知统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 清理旧通知（软删除）
   *
   * 将指定天数之前创建的通知标记为软删除，
   * 用于定期清理过期通知以保持数据库性能。
   *
   * @param daysToKeep - 保留通知的天数，默认 30 天
   * @returns 被清理的通知数量
   * @throws 清理失败时抛出异常
   */
  async cleanupOldNotifications(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const sql = `
        UPDATE ${this.tableName}
        SET deleted_at = ?, updated_at = ?
        WHERE created_at < ? AND deleted_at IS NULL
      `;
      const result = await query(sql, [
        new Date().toISOString(),
        new Date().toISOString(),
        cutoffDate.toISOString(),
      ]);
      return result.affectedRows || 0;
    } catch (error) {
      logger.error('清理旧通知失败:', error);
      throw error;
    }
  }

  /**
   * 创建系统通知
   *
   * 快捷方法，自动将通知类型设置为 'system'。
   * 系统通知由平台自动触发（如账号安全提醒、功能更新等）。
   *
   * @param userId - 目标用户 ID
   * @param title - 通知标题
   * @param message - 通知正文
   * @param data - 附加数据（可选），可用于传递相关资源的上下文信息
   * @returns 创建成功的 Notification 对象
   * @throws 创建失败时抛出异常
   */
  async createSystemNotification(
    userId: string,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<Notification> {
    try {
      return this.create({
        userId,
        type: 'system',
        title,
        message,
        data,
      });
    } catch (error) {
      logger.error('创建系统通知失败:', error);
      throw error;
    }
  }

  /**
   * 创建营销通知
   *
   * 向多个用户发送相同内容的营销通知。
   * 内部调用 createBatchNotifications 实现批量发送。
   *
   * @param userIds - 目标用户 ID 数组
   * @param title - 通知标题
   * @param message - 通知正文
   * @param data - 附加数据（可选）
   * @returns 成功创建的 Notification 对象数组
   * @throws 创建失败时抛出异常
   */
  async createMarketingNotification(
    userIds: string[],
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<Notification[]> {
    try {
      const notifications: NotificationCreateInput[] = userIds.map(userId => ({
        userId,
        type: 'marketing',
        title,
        message,
        data,
      }));

      return this.createBatchNotifications(notifications);
    } catch (error) {
      logger.error('创建营销通知失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const notificationModel = new NotificationModel();
