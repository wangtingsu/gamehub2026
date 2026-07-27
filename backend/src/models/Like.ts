/**
 * ============================================================
 * 点赞模型 (LikeModel)
 * ============================================================
 * 本文件定义 LikeModel 类，继承自 BaseModel，
 * 用于操作用户点赞数据表（likes）。
 *
 * 功能涵盖：
 *   - 添加/取消点赞（防重复）
 *   - 检查用户点赞状态
 *   - 统计点赞数
 *   - 批量查询点赞状态（用于列表展示）
 *   - 获取点赞用户列表与统计
 * ============================================================
 */

import { BaseModel } from './BaseModel';
import { Like, LikeCreateInput, LikeUpdateInput } from '../types';
import { query } from '../db';
import logger from '../utils/logger';

/**
 * 点赞模型类
 *
 * 继承自 BaseModel，实体类型为 Like。
 * 支持对评测、新闻、社区帖子、评论、游戏等实体的点赞功能。
 * 启用了软删除和乐观锁（不启用审计日志，因点赞操作频率高无需记录）。
 */
export class LikeModel extends BaseModel<Like, LikeCreateInput, LikeUpdateInput> {
  protected tableName = 'likes';
  protected primaryKey = 'id';

  // 启用软删除和乐观锁（点赞不需要审计日志）
  protected softDeleteEnabled = true;
  protected optimisticLockEnabled = true;
  protected auditEnabled = false;

  /**
   * 将数据库行记录转换为 Like 对象
   * @param row 数据库原始行数据
   * @returns 转换后的 Like 实例
   */
  protected fromRow(row: any): Like {
    return {
      id: String(row.id),
      userId: String(row.user_id),
      targetType: row.target_type as 'review' | 'news' | 'community_post' | 'comment' | 'game',
      targetId: String(row.target_id),
      createdAt: new Date(row.created_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
      version: row.version ? Number(row.version) : 1,
    };
  }

  /**
   * 将 LikeCreateInput 转换为数据库行格式
   * @param data 创建点赞时传入的数据
   * @returns 适配 likes 表列格式的对象
   */
  protected toRow(data: LikeCreateInput): any {
    return {
      user_id: data.userId,
      target_type: data.targetType,
      target_id: data.targetId,
      created_at: new Date().toISOString(),
      deleted_at: null,
      version: 1,
    };
  }

  /**
   * 添加点赞（如果已点赞则直接返回现有点赞记录，实现幂等性）
   * @param data 点赞数据
   * @returns 点赞记录
   */
  async like(data: LikeCreateInput): Promise<Like> {
    try {
      // 检查是否已点赞（且未删除）
      const existing = await this.findOne(
        'user_id = ? AND target_type = ? AND target_id = ? AND deleted_at IS NULL',
        [data.userId, data.targetType, data.targetId]
      );
      if (existing) {
        return existing; // 幂等：已点赞则直接返回
      }
      return this.create(data);
    } catch (error) {
      logger.error('添加点赞失败:', error);
      throw error;
    }
  }

  /**
   * 取消点赞（软删除）
   * @param userId     用户 ID
   * @param targetType 目标类型
   * @param targetId   目标 ID
   * @returns 是否取消成功
   */
  async unlike(userId: string, targetType: Like['targetType'], targetId: string): Promise<boolean> {
    try {
      const like = await this.findOne(
        'user_id = ? AND target_type = ? AND target_id = ? AND deleted_at IS NULL',
        [userId, targetType, targetId]
      );
      if (!like) return false;
      return this.delete(like.id);
    } catch (error) {
      logger.error('取消点赞失败:', error);
      throw error;
    }
  }

  /**
   * 检查用户是否已点赞
   * @param userId     用户 ID
   * @param targetType 目标类型
   * @param targetId   目标 ID
   * @returns 是否已点赞
   */
  async hasLiked(userId: string, targetType: Like['targetType'], targetId: string): Promise<boolean> {
    try {
      const like = await this.findOne(
        'user_id = ? AND target_type = ? AND target_id = ? AND deleted_at IS NULL',
        [userId, targetType, targetId]
      );
      return !!like;
    } catch (error) {
      logger.error('检查点赞状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取指定目标的点赞数量
   * @param targetType 目标类型
   * @param targetId   目标 ID
   * @returns 点赞总数
   */
  async getLikeCount(targetType: Like['targetType'], targetId: string): Promise<number> {
    try {
      return this.count('target_type = ? AND target_id = ? AND deleted_at IS NULL', [targetType, targetId]);
    } catch (error) {
      logger.error('获取点赞数失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户的点赞列表
   * @param userId              用户 ID
   * @param options.targetType  按目标类型筛选
   * @param options.limit       每页条数
   * @param options.offset      偏移量
   * @returns 点赞记录列表
   */
  async getUserLikes(userId: string, options?: {
    targetType?: Like['targetType'];
    limit?: number;
    offset?: number;
  }): Promise<Like[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE user_id = ? AND deleted_at IS NULL`;
      const params: any[] = [userId];

      if (options?.targetType) {
        sql += ` AND target_type = ?`;
        params.push(options.targetType);
      }
      sql += ` ORDER BY created_at DESC`;

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
      logger.error('获取用户点赞列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取指定目标的点赞用户列表
   * @param targetType 目标类型
   * @param targetId   目标 ID
   * @param options    分页选项
   * @returns 用户 ID 和点赞时间的数组
   */
  async getLikedUsers(targetType: Like['targetType'], targetId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<Array<{ userId: string; likedAt: Date }>> {
    try {
      let sql = `SELECT user_id, created_at FROM ${this.tableName} WHERE target_type = ? AND target_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`;
      const params: any[] = [targetType, targetId];

      if (options?.limit) {
        sql += ` LIMIT ?`;
        params.push(options.limit);
        if (options?.offset) {
          sql += ` OFFSET ?`;
          params.push(options.offset);
        }
      }

      const rows = await query(sql, params);
      return rows.map((row: any) => ({
        userId: String(row.user_id),
        likedAt: new Date(row.created_at),
      }));
    } catch (error) {
      logger.error('获取点赞用户列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取点赞全局统计信息
   * @returns 统计对象，含总点赞数、按类型分布、最受欢迎目标 Top10
   */
  async getLikeStats(): Promise<{
    totalLikes: number;
    byTargetType: Record<string, number>;
    topLikedTargets: Array<{ targetType: string; targetId: string; count: number }>;
  }> {
    try {
      // 总点赞数
      const totalResult = await query('SELECT COUNT(*) as count FROM likes WHERE deleted_at IS NULL');
      const totalLikes = totalResult[0]?.count || 0;

      // 按目标类型统计
      const typeResult = await query(`
        SELECT target_type, COUNT(*) as count FROM likes WHERE deleted_at IS NULL GROUP BY target_type
      `);
      const byTargetType: Record<string, number> = {};
      typeResult.forEach((row: any) => { byTargetType[row.target_type] = row.count; });

      // 最受欢迎目标 Top 10
      const topResult = await query(`
        SELECT target_type, target_id, COUNT(*) as count
        FROM likes WHERE deleted_at IS NULL
        GROUP BY target_type, target_id
        ORDER BY count DESC LIMIT 10
      `);
      const topLikedTargets = topResult.map((row: any) => ({
        targetType: row.target_type,
        targetId: String(row.target_id),
        count: Number(row.count),
      }));

      return { totalLikes: Number(totalLikes), byTargetType, topLikedTargets };
    } catch (error) {
      logger.error('获取点赞统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 批量获取用户对多个目标的点赞状态
   * 用于列表页一次查询多个实体的点赞状态
   * @param userId  用户 ID
   * @param targets 目标数组
   * @returns 以 "targetType:targetId" 为键的点赞状态映射
   */
  async getBatchLikeStatus(
    userId: string,
    targets: Array<{ targetType: Like['targetType']; targetId: string }>
  ): Promise<Record<string, boolean>> {
    try {
      if (targets.length === 0) return {};

      const conditions = targets.map((_, index) => `(target_type = ? AND target_id = ?)`).join(' OR ');
      const params = targets.flatMap(target => [target.targetType, target.targetId]);
      params.push(userId);

      const sql = `SELECT target_type, target_id FROM ${this.tableName} WHERE (${conditions}) AND user_id = ? AND deleted_at IS NULL`;
      const rows = await query(sql, params);

      const likedSet = new Set(rows.map((row: any) => `${row.target_type}:${row.target_id}`));
      const result: Record<string, boolean> = {};
      targets.forEach(target => {
        result[`${target.targetType}:${target.targetId}`] = likedSet.has(`${target.targetType}:${target.targetId}`);
      });
      return result;
    } catch (error) {
      logger.error('批量获取点赞状态失败:', error);
      throw error;
    }
  }
}

/** 导出 LikeModel 单例实例 */
export const likeModel = new LikeModel();
