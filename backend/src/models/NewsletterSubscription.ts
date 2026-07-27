/**
 * 新闻通讯订阅模型 (NewsletterSubscriptionModel)
 *
 * 本文件定义了新闻通讯订阅的数据访问层模型，继承自 BaseModel 基类。
 * 负责用户订阅信息（包括订阅类型、偏好设置、活跃状态等）的
 * 数据库 CRUD 操作，以及订阅激活/取消、偏好更新、批量导入等功能。
 *
 * 核心业务流程:
 * - 用户首次订阅 -> 创建新订阅记录，状态为活跃
 * - 用户再次订阅（已退订）-> 重新激活旧订阅
 * - 用户取消订阅 -> 标记为不活跃，记录退订时间
 * - 批量导入 -> 支持从外部系统导入订阅列表
 */

import { BaseModel } from './BaseModel';
import {
  NewsletterSubscription,
  NewsletterSubscriptionCreateInput,
  NewsletterSubscriptionUpdateInput,
} from '../types';
import { query } from '../db';
import logger from '../utils/logger';

/**
 * 新闻通讯订阅模型类
 *
 * 管理用户对新闻通讯的订阅关系，支持多种订阅类型（newsletter/promotional/all），
 * 提供灵活的偏好设置、订阅状态变更和统计查询功能。
 * 默认启用软删除、乐观锁和审计日志。
 *
 * @template NewsletterSubscription - 订阅记录类型
 * @template NewsletterSubscriptionCreateInput - 创建订阅输入类型
 * @template NewsletterSubscriptionUpdateInput - 更新订阅输入类型
 */
export class NewsletterSubscriptionModel extends BaseModel<
  NewsletterSubscription,
  NewsletterSubscriptionCreateInput,
  NewsletterSubscriptionUpdateInput
> {
  /** 数据库表名 */
  protected tableName = 'newsletter_subscriptions';

  /** 主键字段名 */
  protected primaryKey = 'id';

  /** 启用软删除：取消订阅时保留记录，仅标记 deleted_at 而非物理删除 */
  protected softDeleteEnabled = true;

  /** 启用乐观锁：通过 version 字段防止并发更新冲突 */
  protected optimisticLockEnabled = true;

  /** 启用审计日志：记录数据变更历史 */
  protected auditEnabled = true;

  /**
   * 将数据库行记录转换为 NewsletterSubscription 领域对象
   *
   * 处理从数据库查询出的原始行数据，解析 JSON 字段（preferences 和 stats），
   * 并进行适当的类型转换，组装成上层业务逻辑可用的订阅对象。
   *
   * @param row - 从数据库查询出的原始行数据（可能包含 JSON 字符串字段）
   * @returns 转换后的 NewsletterSubscription 对象
   */
  protected fromRow(row: any): NewsletterSubscription {
    // 解析订阅偏好设置（JSON 对象，包含主题、频率等个性化配置）
    const preferences = row.preferences
      ? (typeof row.preferences === 'string'
          ? JSON.parse(row.preferences)
          : row.preferences)
      : {};

    // 解析交互统计数据（JSON 对象，包含发送、打开、点击等指标）
    const stats = row.stats
      ? (typeof row.stats === 'string'
          ? JSON.parse(row.stats)
          : row.stats)
      : {
          totalRecipients: 0,
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
          unsubscribed: 0,
          complaints: 0,
        };

    return {
      id: String(row.id),
      userId: String(row.user_id),
      email: row.email,
      subscriptionType: row.subscription_type as 'newsletter' | 'promotional' | 'all',
      isActive: Boolean(row.is_active),
      subscribedAt: new Date(row.subscribed_at),
      unsubscribedAt: row.unsubscribed_at ? new Date(row.unsubscribed_at) : undefined,
      preferences,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
      version: row.version ? Number(row.version) : 1,
    };
  }

  /**
   * 将 NewsletterSubscriptionCreateInput 转换为数据库行记录
   *
   * 将创建订阅的输入数据映射为数据库扁平化行格式，
   * 新订阅默认是活跃状态（is_active = 1），并通过 JSON.stringify
   * 序列化偏好设置对象。
   *
   * @param data - 创建订阅所需的输入数据
   * @returns 数据库行记录对象，包含所有必填字段的默认值
   */
  protected toRow(data: NewsletterSubscriptionCreateInput): any {
    const preferences = data.preferences || {};

    return {
      user_id: data.userId,
      email: data.email,
      subscription_type: data.subscriptionType || 'newsletter',
      is_active: 1,
      subscribed_at: new Date().toISOString(),
      unsubscribed_at: null,
      preferences: JSON.stringify(preferences),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      version: 1,
    };
  }

  /**
   * 根据用户 ID 查找订阅
   *
   * 通过用户唯一标识查询其订阅记录，用于判断用户订阅状态
   * 或获取用户当前的订阅配置。
   *
   * @param userId - 用户的唯一标识
   * @returns 匹配的订阅对象，若未找到则返回 null
   */
  async findByUserId(userId: string): Promise<NewsletterSubscription | null> {
    return this.findOne('user_id = ?', [userId]);
  }

  /**
   * 根据邮箱查找订阅
   *
   * 通过邮箱地址查询订阅记录，常用于邮箱去重和批量导入时的
   * 重复检查。
   *
   * @param email - 订阅邮箱地址
   * @returns 匹配的订阅对象，若未找到则返回 null
   */
  async findByEmail(email: string): Promise<NewsletterSubscription | null> {
    return this.findOne('email = ?', [email]);
  }

  /**
   * 获取活跃订阅列表
   *
   * 查询所有活跃的订阅记录（is_active = true），
   * 按订阅时间倒序排列，支持分页。
   *
   * @param limit - 可选，返回记录数上限
   * @param offset - 可选，分页偏移量
   * @returns 活跃订阅对象数组
   */
  async getActiveSubscriptions(limit?: number, offset?: number): Promise<NewsletterSubscription[]> {
    return this.findAll({
      where: 'is_active = true',
      orderBy: 'subscribed_at',
      orderDirection: 'DESC',
      limit,
      offset,
    });
  }

  /**
   * 订阅新闻通讯
   *
   * 处理用户订阅请求的核心方法。有三种情况：
   * 1. 用户从未订阅 -> 创建新订阅记录
   * 2. 用户已退订（isActive = false）-> 重新激活旧订阅
   * 3. 用户已活跃订阅 -> 直接返回现有记录（幂等性保证）
   *
   * 注意：激活操作使用底层 query 直接执行 SQL，以避免 BaseModel.update()
   * 可能存在的驼峰字段到下划线字段的转换问题。
   *
   * @param data - 订阅创建输入数据（包含 userId、email、订阅类型等）
   * @returns 订阅成功后的 NewsletterSubscription 对象
   */
  async subscribe(data: NewsletterSubscriptionCreateInput): Promise<NewsletterSubscription> {
    try {
      // 检查是否已存在订阅记录
      const existing = await this.findByUserId(data.userId);
      if (existing) {
        // 如果存在但不活跃，则激活它
        if (!existing.isActive) {
          // 直接使用底层 query 激活，避免 BaseModel.update() 的驼峰->下划线转换问题
          const sql = `UPDATE ${this.tableName} SET is_active = 1, unsubscribed_at = NULL, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`;
          await query(sql, [existing.id]);
          const updated = await this.findById(existing.id);
          if (!updated) {
            throw new Error('激活订阅失败');
          }
          return updated;
        }
        // 如果已活跃，直接返回现有订阅（幂等操作）
        return existing;
      }

      // 创建新订阅
      return this.create(data);
    } catch (error) {
      logger.error('订阅新闻通讯失败:', error);
      throw error;
    }
  }

  /**
   * 取消订阅
   *
   * 将用户订阅标记为不活跃状态（is_active = 0），并记录退订时间。
   * 不会物理删除记录，便于后续分析退订原因或重新激活。
   *
   * 注意：使用底层 query 直接执行 SQL，以避免 BaseModel.update()
   * 可能存在的字段名转换问题。
   *
   * @param userId - 要取消订阅的用户 ID
   * @returns 取消成功返回 true，订阅不存在或取消失败返回 false
   */
  async unsubscribe(userId: string): Promise<boolean> {
    try {
      const subscription = await this.findByUserId(userId);
      if (!subscription) {
        return false;
      }

      // 直接使用底层 query 更新，避免 BaseModel.update() 的驼峰->下划线转换问题
      const sql = `UPDATE ${this.tableName} SET is_active = $1, unsubscribed_at = $2, updated_at = NOW() WHERE id = $3 AND deleted_at IS NULL`;
      const result = await query(sql, [0, new Date().toISOString(), subscription.id]);

      return result && result.length > 0;
    } catch (error) {
      logger.error('取消订阅失败:', error);
      throw error;
    }
  }

  /**
   * 更新订阅偏好
   *
   * 修改用户订阅的偏好设置，如订阅频率、内容偏好、通知方式等。
   * 偏好设置以 JSON 格式存储，更新时会整体替换偏好对象。
   *
   * @param userId - 要更新偏好的用户 ID
   * @param preferences - 新的偏好设置对象（覆盖式更新）
   * @returns 更新成功返回 true，用户不存在或更新失败返回 false
   */
  async updatePreferences(
    userId: string,
    preferences: NewsletterSubscriptionUpdateInput['preferences']
  ): Promise<boolean> {
    try {
      const subscription = await this.findByUserId(userId);
      if (!subscription) {
        return false;
      }

      const result = await this.update(subscription.id, { preferences });
      return result !== null;
    } catch (error) {
      logger.error('更新订阅偏好失败:', error);
      throw error;
    }
  }

  /**
   * 获取订阅统计数据
   *
   * 聚合统计全局订阅概况，包括总订阅数、活跃/非活跃订阅数，
   * 以及按订阅类型（newsletter/promotional/all）的分布统计。
   *
   * @returns 订阅统计对象，包含总数、活跃数、非活跃数和类型分布
   */
  async getSubscriptionStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byType: Record<string, number>;
  }> {
    try {
      // 总订阅数（排除已软删除的记录）
      const totalResult = await query(
        'SELECT COUNT(*) as count FROM newsletter_subscriptions WHERE deleted_at IS NULL'
      );
      const total = totalResult[0]?.count || 0;

      // 活跃订阅数（is_active = true 且未软删除）
      const activeResult = await query(
        'SELECT COUNT(*) as count FROM newsletter_subscriptions WHERE is_active = true AND deleted_at IS NULL'
      );
      const active = activeResult[0]?.count || 0;

      // 按订阅类型统计数量
      const typeResult = await query(`
        SELECT subscription_type, COUNT(*) as count
        FROM newsletter_subscriptions
        WHERE deleted_at IS NULL
        GROUP BY subscription_type
      `);

      const byType: Record<string, number> = {};
      typeResult.forEach((row: any) => {
        byType[row.subscription_type] = row.count;
      });

      return {
        total: Number(total),
        active: Number(active),
        inactive: Number(total) - Number(active),
        byType,
      };
    } catch (error) {
      logger.error('获取订阅统计数据失败:', error);
      throw error;
    }
  }

  /**
   * 批量导入订阅
   *
   * 从外部系统批量导入订阅列表，支持自动去重和用户ID关联。
   * 对于已存在的邮箱地址：
   * - 如果原有记录缺少用户ID，且本次提供了用户ID，则补充关联
   * - 否则跳过创建，计入成功计数
   * 对于不存在的邮箱地址，创建新的订阅记录。
   *
   * 每条导入记录的失败信息都会被收集，便于排查和重试。
   *
   * @param subscriptions - 待导入的订阅数组，每项包含邮箱、用户ID、订阅类型和偏好
   * @returns 导入结果，包含成功数、失败数及详细错误列表
   */
  async importSubscriptions(
    subscriptions: Array<{
      email: string;
      userId?: string;
      subscriptionType?: 'newsletter' | 'promotional' | 'all';
      preferences?: NewsletterSubscriptionCreateInput['preferences'];
    }>
  ): Promise<{
    success: number;
    failed: number;
    errors: Array<{ email: string; error: string }>;
  }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ email: string; error: string }>,
    };

    // 逐条处理导入记录（暂未启用批量事务，便于逐条错误处理）
    for (const sub of subscriptions) {
      try {
        // 检查邮箱是否已存在订阅记录
        const existing = await this.findByEmail(sub.email);
        if (existing) {
          // 如果存在但未关联用户ID，则补充用户ID关联
          if (!existing.userId && sub.userId) {
            await this.update(existing.id, { userId: sub.userId });
          }
          results.success++;
          continue;
        }

        // 创建新订阅记录
        await this.create({
          email: sub.email,
          userId: sub.userId || '0', // 使用 "0" 表示未注册用户
          subscriptionType: sub.subscriptionType || 'newsletter',
          preferences: sub.preferences,
        });
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          email: sub.email,
          error: error instanceof Error ? error.message : '未知错误',
        });
      }
    }

    return results;
  }
}

// 导出单例实例，便于全局复用
export const newsletterSubscriptionModel = new NewsletterSubscriptionModel();
