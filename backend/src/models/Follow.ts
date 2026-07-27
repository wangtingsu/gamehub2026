/**
 * ============================================================
 * 关注模型 (FollowModel)
 * ============================================================
 * 本文件定义 FollowModel 类，继承自 BaseModel，
 * 用于操作用户关注关系数据表（follows）。
 *
 * 功能涵盖：
 *   - 关注/取消关注用户（防重复、禁止自关注）
 *   - 获取关注者/粉丝列表
 *   - 获取互相关注（双向关注）列表
 *   - 关注数统计
 *   - 批量查询关注状态
 *   - 推荐未关注的用户
 * ============================================================
 */

import { BaseModel } from './BaseModel';
import { Follow, FollowCreateInput, FollowUpdateInput } from '../types';
import { query } from '../db';
import logger from '../utils/logger';

/**
 * 关注模型类
 *
 * 继承自 BaseModel，实体类型为 Follow。
 * 管理用户之间的关注/粉丝关系。
 * 启用了软删除和乐观锁（不启用审计日志）。
 */
export class FollowModel extends BaseModel<Follow, FollowCreateInput, FollowUpdateInput> {
  protected tableName = 'follows';
  protected primaryKey = 'id';

  // 启用软删除和乐观锁（关注不需要审计日志）
  protected softDeleteEnabled = true;
  protected optimisticLockEnabled = true;
  protected auditEnabled = false;

  /**
   * 将数据库行记录转换为 Follow 对象
   * @param row 数据库原始行数据
   * @returns 转换后的 Follow 实例
   */
  protected fromRow(row: any): Follow {
    return {
      id: String(row.id),
      followerId: String(row.follower_id),
      followingId: String(row.following_id),
      createdAt: new Date(row.created_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
      version: row.version ? Number(row.version) : 1,
    };
  }

  /**
   * 将 FollowCreateInput 转换为数据库行格式
   * @param data 创建关注时传入的数据
   * @returns 适配 follows 表列格式的对象
   */
  protected toRow(data: FollowCreateInput): any {
    return {
      follower_id: data.followerId,
      following_id: data.followingId,
      created_at: new Date().toISOString(),
      deleted_at: null,
      version: 1,
    };
  }

  /**
   * 关注用户
   * @param followerId  关注者 ID
   * @param followingId 被关注者 ID
   * @returns 关注记录
   * @throws 关注自己时抛出错误
   */
  async follow(followerId: string, followingId: string): Promise<Follow> {
    try {
      // 不允许关注自己
      if (followerId === followingId) {
        throw new Error('不能关注自己');
      }

      // 检查是否已关注
      const existing = await this.findOne(
        'follower_id = ? AND following_id = ? AND deleted_at IS NULL',
        [followerId, followingId]
      );
      if (existing) return existing; // 幂等操作

      return this.create({ followerId, followingId });
    } catch (error) {
      logger.error('关注用户失败:', error);
      throw error;
    }
  }

  /**
   * 取消关注（软删除）
   * @param followerId  关注者 ID
   * @param followingId 被关注者 ID
   * @returns 是否取消成功
   */
  async unfollow(followerId: string, followingId: string): Promise<boolean> {
    try {
      const follow = await this.findOne(
        'follower_id = ? AND following_id = ? AND deleted_at IS NULL',
        [followerId, followingId]
      );
      if (!follow) return false;
      return this.delete(follow.id);
    } catch (error) {
      logger.error('取消关注失败:', error);
      throw error;
    }
  }

  /**
   * 检查是否已关注
   * @param followerId  关注者 ID
   * @param followingId 被关注者 ID
   * @returns 是否已关注
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    try {
      const follow = await this.findOne(
        'follower_id = ? AND following_id = ? AND deleted_at IS NULL',
        [followerId, followingId]
      );
      return !!follow;
    } catch (error) {
      logger.error('检查关注状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户的关注者列表（谁关注了我）
   * @param userId  用户 ID
   * @param options 分页选项
   * @returns 关注记录列表
   */
  async getFollowers(userId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<Follow[]> {
    try {
      return this.findAll({
        where: 'following_id = ?',
        params: [userId],
        orderBy: 'created_at',
        orderDirection: 'DESC',
        limit: options?.limit,
        offset: options?.offset,
      });
    } catch (error) {
      logger.error('获取关注者列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户的关注列表（我关注了谁）
   * @param userId  用户 ID
   * @param options 分页选项
   * @returns 关注记录列表
   */
  async getFollowing(userId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<Follow[]> {
    try {
      return this.findAll({
        where: 'follower_id = ?',
        params: [userId],
        orderBy: 'created_at',
        orderDirection: 'DESC',
        limit: options?.limit,
        offset: options?.offset,
      });
    } catch (error) {
      logger.error('获取关注列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户的关注者数量
   * @param userId 用户 ID
   * @returns 关注者数
   */
  async getFollowerCount(userId: string): Promise<number> {
    try {
      return this.count('following_id = ?', [userId]);
    } catch (error) {
      logger.error('获取关注者数量失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户的关注数量
   * @param userId 用户 ID
   * @returns 关注数
   */
  async getFollowingCount(userId: string): Promise<number> {
    try {
      return this.count('follower_id = ?', [userId]);
    } catch (error) {
      logger.error('获取关注数量失败:', error);
      throw error;
    }
  }

  /**
   * 获取互相关注的用户列表（双向关注）
   * @param userId  用户 ID
   * @param options 分页选项
   * @returns 互相关注的用户 ID 列表
   */
  async getMutualFollows(userId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<string[]> {
    try {
      let sql = `
        SELECT f1.following_id
        FROM follows f1
        INNER JOIN follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
        WHERE f1.follower_id = ? AND f1.deleted_at IS NULL AND f2.deleted_at IS NULL
        ORDER BY f1.created_at DESC
      `;
      const params: any[] = [userId];

      if (options?.limit) {
        sql += ` LIMIT ?`;
        params.push(options.limit);
        if (options?.offset) {
          sql += ` OFFSET ?`;
          params.push(options.offset);
        }
      }

      const rows = await query(sql, params);
      return rows.map((row: any) => String(row.following_id));
    } catch (error) {
      logger.error('获取互相关注用户失败:', error);
      throw error;
    }
  }

  /**
   * 检查两个用户是否互相关注
   * @param userId1 用户 A ID
   * @param userId2 用户 B ID
   * @returns 是否互相关注
   */
  async isMutualFollow(userId1: string, userId2: string): Promise<boolean> {
    try {
      const [follow1, follow2] = await Promise.all([
        this.isFollowing(userId1, userId2),
        this.isFollowing(userId2, userId1),
      ]);
      return follow1 && follow2;
    } catch (error) {
      logger.error('检查互相关注状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取关注全局统计信息
   * @returns 统计对象，含总关注数和最受欢迎用户 Top10
   */
  async getFollowStats(): Promise<{
    totalFollows: number;
    topFollowedUsers: Array<{ userId: string; followerCount: number }>;
  }> {
    try {
      const totalResult = await query('SELECT COUNT(*) as count FROM follows WHERE deleted_at IS NULL');
      const totalFollows = totalResult[0]?.count || 0;

      // 最受欢迎用户 Top 10
      const topResult = await query(`
        SELECT following_id, COUNT(*) as count
        FROM follows WHERE deleted_at IS NULL
        GROUP BY following_id ORDER BY count DESC LIMIT 10
      `);
      const topFollowedUsers = topResult.map((row: any) => ({
        userId: String(row.following_id),
        followerCount: Number(row.count),
      }));

      return { totalFollows: Number(totalFollows), topFollowedUsers };
    } catch (error) {
      logger.error('获取关注统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 批量获取对多个用户的关注状态
   * @param userId        当前用户 ID
   * @param targetUserIds 目标用户 ID 数组
   * @returns 用户 ID 到关注状态的映射
   */
  async getBatchFollowStatus(userId: string, targetUserIds: string[]): Promise<Record<string, boolean>> {
    try {
      if (targetUserIds.length === 0) return {};

      const placeholders = targetUserIds.map(() => '?').join(', ');
      const params = [...targetUserIds, userId];

      const sql = `SELECT following_id FROM ${this.tableName} WHERE following_id IN (${placeholders}) AND follower_id = ? AND deleted_at IS NULL`;
      const rows = await query(sql, params);

      const followingSet = new Set(rows.map((row: any) => String(row.following_id)));
      const result: Record<string, boolean> = {};
      targetUserIds.forEach(targetUserId => {
        result[targetUserId] = followingSet.has(targetUserId);
      });
      return result;
    } catch (error) {
      logger.error('批量获取关注状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取推荐关注用户（当前用户尚未关注的活跃用户）
   * @param userId              当前用户 ID
   * @param options.excludeIds  需要排除的用户 ID
   * @param options.limit       推荐数量
   * @returns 推荐用户 ID 列表
   */
  async getRecommendedUsers(
    userId: string,
    options?: {
      limit?: number;
      excludeIds?: string[];
    }
  ): Promise<string[]> {
    try {
      let sql = `
        SELECT id FROM users
        WHERE id != ? AND deleted_at IS NULL
        AND id NOT IN (SELECT following_id FROM follows WHERE follower_id = ? AND deleted_at IS NULL)
      `;
      const params: any[] = [userId, userId];

      if (options?.excludeIds && options.excludeIds.length > 0) {
        const placeholders = options.excludeIds.map(() => '?').join(', ');
        sql += ` AND id NOT IN (${placeholders})`;
        params.push(...options.excludeIds);
      }

      sql += ` ORDER BY RANDOM()`;

      if (options?.limit) {
        sql += ` LIMIT ?`;
        params.push(options.limit);
      }

      const rows = await query(sql, params);
      return rows.map((row: any) => String(row.id));
    } catch (error) {
      logger.error('获取推荐用户失败:', error);
      throw error;
    }
  }
}

/** 导出 FollowModel 单例实例 */
export const followModel = new FollowModel();
