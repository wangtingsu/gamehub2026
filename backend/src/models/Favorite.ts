/**
 * ============================================================
 * 收藏模型 (FavoriteModel)
 * ============================================================
 * 本文件定义 FavoriteModel 类，继承自 BaseModel，
 * 用于操作用户游戏收藏数据表（favorites）。
 *
 * 功能涵盖：
 *   - 添加/取消收藏（防重复）
 *   - 检查收藏状态
 *   - 收藏数统计
 *   - 批量查询收藏状态
 *   - 获取收藏统计与最受欢迎游戏
 * ============================================================
 */

import { BaseModel } from './BaseModel';
import { Favorite, FavoriteCreateInput, FavoriteUpdateInput } from '../types';
import { query } from '../db';
import logger from '../utils/logger';

/**
 * 收藏模型类
 *
 * 继承自 BaseModel，实体类型为 Favorite。
 * 用于管理用户对游戏的收藏操作（类似心愿单）。
 * 启用了软删除和乐观锁（不启用审计日志）。
 */
export class FavoriteModel extends BaseModel<Favorite, FavoriteCreateInput, FavoriteUpdateInput> {
  protected tableName = 'favorites';
  protected primaryKey = 'id';

  // 启用软删除和乐观锁（收藏不需要审计日志）
  protected softDeleteEnabled = true;
  protected optimisticLockEnabled = true;
  protected auditEnabled = false;

  /**
   * 将数据库行记录转换为 Favorite 对象
   * @param row 数据库原始行数据
   * @returns 转换后的 Favorite 实例
   */
  protected fromRow(row: Record<string, any>): Favorite {
    return {
      id: String(row.id),
      userId: String(row.user_id),
      gameId: String(row.game_id),
      createdAt: new Date(row.created_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
      version: row.version ? Number(row.version) : 1,
    };
  }

  /**
   * 将 FavoriteCreateInput 转换为数据库行格式
   * @param data 创建收藏时传入的数据
   * @returns 适配 favorites 表列格式的对象
   */
  protected toRow(data: FavoriteCreateInput): Record<string, any> {
    return {
      user_id: data.userId,
      game_id: data.gameId,
      created_at: new Date().toISOString(),
      deleted_at: null,
      version: 1,
    };
  }

  /**
   * 添加收藏（如果已收藏则直接返回现有记录，实现幂等性）
   * @param data 收藏数据
   * @returns 收藏记录
   */
  async favorite(data: FavoriteCreateInput): Promise<Favorite> {
    try {
      const existing = await this.findOne(
        'user_id = ? AND game_id = ? AND deleted_at IS NULL',
        [data.userId, data.gameId]
      );
      if (existing) return existing; // 幂等操作
      return this.create(data);
    } catch (error) {
      logger.error('添加收藏失败:', error);
      throw error;
    }
  }

  /**
   * 取消收藏（软删除）
   * @param userId 用户 ID
   * @param gameId 游戏 ID
   * @returns 是否取消成功
   */
  async unfavorite(userId: string, gameId: string): Promise<boolean> {
    try {
      const favorite = await this.findOne(
        'user_id = ? AND game_id = ? AND deleted_at IS NULL',
        [userId, gameId]
      );
      if (!favorite) return false;
      return this.delete(favorite.id);
    } catch (error) {
      logger.error('取消收藏失败:', error);
      throw error;
    }
  }

  /**
   * 检查用户是否已收藏某游戏
   * @param userId 用户 ID
   * @param gameId 游戏 ID
   * @returns 是否已收藏
   */
  async hasFavorited(userId: string, gameId: string): Promise<boolean> {
    try {
      const favorite = await this.findOne(
        'user_id = ? AND game_id = ? AND deleted_at IS NULL',
        [userId, gameId]
      );
      return !!favorite;
    } catch (error) {
      logger.error('检查收藏状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取某游戏的收藏数量
   * @param gameId 游戏 ID
   * @returns 收藏总数
   */
  async getFavoriteCount(gameId: string): Promise<number> {
    try {
      return this.count('game_id = ? AND deleted_at IS NULL', [gameId]);
    } catch (error) {
      logger.error('获取收藏数失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户的收藏列表（支持分页排序）
   * @param userId 用户 ID
   * @param options 分页与排序选项
   * @returns 收藏记录列表
   */
  async getUserFavorites(userId: string, options?: {
    limit?: number;
    offset?: number;
    orderBy?: 'created_at' | 'game_id';
    orderDirection?: 'ASC' | 'DESC';
  }): Promise<Favorite[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE user_id = ? AND deleted_at IS NULL`;
      const params: any[] = [userId];

      const orderBy = options?.orderBy || 'created_at';
      const orderDirection = options?.orderDirection || 'DESC';
      sql += ` ORDER BY ${orderBy} ${orderDirection}`;

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
      logger.error('获取用户收藏列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取某游戏的收藏用户列表
   * @param gameId  游戏 ID
   * @param options 分页选项
   * @returns 用户 ID 和收藏时间的数组
   */
  async getFavoritedUsers(gameId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<Array<{ userId: string; favoritedAt: Date }>> {
    try {
      let sql = `SELECT user_id, created_at FROM ${this.tableName} WHERE game_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`;
      const params: any[] = [gameId];

      if (options?.limit) {
        sql += ` LIMIT ?`;
        params.push(options.limit);
        if (options?.offset) {
          sql += ` OFFSET ?`;
          params.push(options.offset);
        }
      }

      const rows = await query(sql, params);
      return rows.map((row: Record<string, any>) => ({
        userId: String(row.user_id),
        favoritedAt: new Date(row.created_at),
      }));
    } catch (error) {
      logger.error('获取收藏用户列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取收藏全局统计信息
   * @returns 统计对象，含总收藏数、最受欢迎游戏 Top10、平均每人收藏数
   */
  async getFavoriteStats(): Promise<{
    totalFavorites: number;
    topFavoritedGames: Array<{ gameId: string; count: number }>;
    averageFavoritesPerUser: number;
  }> {
    try {
      const totalResult = await query('SELECT COUNT(*) as count FROM favorites WHERE deleted_at IS NULL');
      const totalFavorites = totalResult[0]?.count || 0;

      // 最受欢迎游戏 Top 10
      const topResult = await query(`
        SELECT game_id, COUNT(*) as count FROM favorites WHERE deleted_at IS NULL GROUP BY game_id ORDER BY count DESC LIMIT 10
      `);
      const topFavoritedGames = topResult.map((row: any) => ({
        gameId: String(row.game_id),
        count: Number(row.count),
      }));

      // 平均每人收藏数
      const userResult = await query('SELECT COUNT(DISTINCT user_id) as user_count FROM favorites WHERE deleted_at IS NULL');
      const userCount = userResult[0]?.user_count || 1;
      const averageFavoritesPerUser = Number(totalFavorites) / Number(userCount);

      return {
        totalFavorites: Number(totalFavorites),
        topFavoritedGames,
        averageFavoritesPerUser,
      };
    } catch (error) {
      logger.error('获取收藏统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 批量获取用户对多个游戏的收藏状态
   * @param userId  用户 ID
   * @param gameIds 游戏 ID 数组
   * @returns 游戏 ID 到收藏状态的映射
   */
  async getBatchFavoriteStatus(userId: string, gameIds: string[]): Promise<Record<string, boolean>> {
    try {
      if (gameIds.length === 0) return {};

      const placeholders = gameIds.map(() => '?').join(',');
      const params = [...gameIds, userId];

      const sql = `SELECT game_id FROM ${this.tableName} WHERE game_id IN (${placeholders}) AND user_id = ? AND deleted_at IS NULL`;
      const rows = await query(sql, params);

      const favoritedSet = new Set(rows.map((row: any) => row.game_id));
      const result: Record<string, boolean> = {};
      gameIds.forEach(gameId => { result[gameId] = favoritedSet.has(gameId); });
      return result;
    } catch (error) {
      logger.error('批量获取收藏状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户收藏的游戏 ID 列表
   * @param userId 用户 ID
   * @returns 游戏 ID 数组
   */
  async getUserFavoriteGameIds(userId: string): Promise<string[]> {
    try {
      const sql = `SELECT game_id FROM ${this.tableName} WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`;
      const rows = await query(sql, [userId]);
      return rows.map((row: any) => String(row.game_id));
    } catch (error) {
      logger.error('获取用户收藏游戏ID列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户收藏的游戏数量
   * @param userId 用户 ID
   * @returns 收藏数
   */
  async getUserFavoriteCount(userId: string): Promise<number> {
    try {
      return this.count('user_id = ? AND deleted_at IS NULL', [userId]);
    } catch (error) {
      logger.error('获取用户收藏数量失败:', error);
      throw error;
    }
  }
}

/** 导出 FavoriteModel 单例实例 */
export const favoriteModel = new FavoriteModel();
