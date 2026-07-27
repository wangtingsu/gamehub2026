/**
 * 用户游戏库模型模块
 *
 * 本模块负责管理用户的个人游戏收藏库，记录用户拥有的游戏、
 * 游玩状态（已拥有、已通关、已白金等）、多平台拥有情况、
 * 个人评分和笔记等信息。
 * 支持从外部平台（如 Steam、PlayStation）导入游戏库数据。
 * 启用了软删除和乐观锁特性。
 */

import { BaseModel } from './BaseModel';
import { UserGameLibrary, UserGameLibraryCreateInput, UserGameLibraryUpdateInput } from '../types';
import { query } from '../db';
import logger from '../utils/logger';

/**
 * 用户游戏库模型
 *
 * 继承自 BaseModel，提供用户游戏库相关的所有数据库操作方法。
 * 支持按状态/平台筛选、批量查询游戏是否在库中、导入外部游戏库、
 * 更新最后游玩时间以及获取完整的库统计信息等功能。
 * 启用了软删除（删除后仍保留数据）和乐观锁（防止并发冲突），未启用审计。
 */
export class UserGameLibraryModel extends BaseModel<UserGameLibrary, UserGameLibraryCreateInput, UserGameLibraryUpdateInput> {
  /** 数据库表名 */
  protected tableName = 'user_game_library';
  /** 主键字段名 */
  protected primaryKey = 'id';

  /** 启用软删除：删除操作仅标记 deleted_at，不实际删除记录 */
  protected softDeleteEnabled = true;
  /** 启用乐观锁：通过 version 字段防止并发更新冲突 */
  protected optimisticLockEnabled = true;
  /** 未启用操作审计 */
  protected auditEnabled = false;

  /**
   * 将数据库行记录转换为 UserGameLibrary 业务对象
   *
   * @param row - 从数据库查询得到的原始行数据
   * @returns 转换后的 UserGameLibrary 对象
   */
  protected fromRow(row: any): UserGameLibrary {
    return {
      id: String(row.id),                           // 游戏库条目唯一标识
      userId: String(row.user_id),                  // 用户 ID
      gameId: String(row.game_id),                  // 游戏 ID
      gameTitle: row.game_title,                    // 游戏名称
      gameSlug: row.game_slug,                      // 游戏 URL 友好标识

      // ---- 状态管理 ----
      status: row.status as any,                    // 游玩状态（如 owned/playing/completed/platinumed 等）
      addedAt: new Date(row.added_at),              // 添加到库的时间
      lastPlayedAt: row.last_played_at ? new Date(row.last_played_at) : undefined, // 最后游玩时间
      statusUpdatedAt: new Date(row.status_updated_at), // 状态最后更新时间

      // ---- 平台拥有情况 ----
      platforms: typeof row.platforms === 'string' ? JSON.parse(row.platforms) : row.platforms || [], // 拥有的平台列表（JSON 数组）

      // ---- 个人评分和笔记 ----
      personalRating: row.personal_rating ? Number(row.personal_rating) : undefined, // 用户个人评分
      personalNotes: row.personal_notes || undefined, // 用户个人笔记
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags || [], // 用户自定义标签（JSON 数组）

      // ---- 主要平台 ----
      primaryPlatform: row.primary_platform as any, // 主要游玩平台

      // ---- 时间戳 ----
      createdAt: new Date(row.created_at),          // 记录创建时间
      updatedAt: new Date(row.updated_at),          // 记录更新时间

      // ---- 软删除 ----
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined, // 软删除时间
      version: row.version ? Number(row.version) : 1, // 乐观锁版本号
    };
  }

  /**
   * 将 UserGameLibraryCreateInput 业务对象转换为数据库行记录
   *
   * @param data - 前端传入的游戏库创建输入数据
   * @returns 适用于数据库插入的行记录对象
   */
  protected toRow(data: UserGameLibraryCreateInput): any {
    return {
      user_id: data.userId,                           // 用户 ID
      game_id: data.gameId,                           // 游戏 ID
      game_title: data.gameTitle || '',               // 游戏名称（需从游戏表获取）
      game_slug: data.gameSlug || '',                 // 游戏 URL 标识（需从游戏表获取）
      status: data.status,                            // 游玩状态
      added_at: new Date().toISOString(),             // 添加到库的时间
      status_updated_at: new Date().toISOString(),    // 状态更新时间
      platforms: JSON.stringify(data.platforms || []), // JSON 序列化的平台列表
      personal_rating: data.personalRating || null,   // 个人评分
      personal_notes: data.personalNotes || null,     // 个人笔记
      tags: JSON.stringify(data.tags || []),          // JSON 序列化的标签列表
      primary_platform: data.primaryPlatform || null, // 主要游玩平台
      created_at: new Date().toISOString(),           // 记录创建时间
      updated_at: new Date().toISOString(),           // 记录更新时间
      deleted_at: null,                               // 初始未删除
      version: 1,                                     // 初始版本号
    };
  }

  /**
   * 获取用户的游戏库列表
   *
   * 支持按游玩状态、平台筛选，并提供分页和排序功能。
   * 如果启用了软删除，会自动过滤已删除的记录。
   *
   * @param userId - 用户 ID
   * @param options - 查询选项（可选）
   * @param options.status - 按游玩状态筛选（如 'owned', 'playing', 'completed'）
   * @param options.platform - 按平台筛选（在 platforms JSON 中匹配 platformType）
   * @param options.limit - 每页数量限制
   * @param options.offset - 分页偏移量
   * @param options.sortBy - 排序字段，可选 'added_at'（添加时间）、'last_played_at'（最后游玩）、'game_title'（游戏名称）
   * @param options.sortOrder - 排序方向，'ASC'（升序）或 'DESC'（降序）
   * @returns 符合条件的 UserGameLibrary 对象数组
   * @throws 查询失败时抛出异常
   */
  async getUserLibrary(userId: string, options?: {
    status?: string;
    platform?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'added_at' | 'last_played_at' | 'game_title';
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<UserGameLibrary[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE user_id = ?`;
      const params: any[] = [userId];

      // 按游玩状态筛选
      if (options?.status) {
        sql += ` AND status = ?`;
        params.push(options.status);
      }

      // 按平台筛选（在 JSON 格式的 platforms 字段中模糊匹配 platformType）
      if (options?.platform) {
        sql += ` AND platforms LIKE ?`;
        params.push(`%"platformType":"${options.platform}"%`);
      }

      // 软删除过滤
      if (this.softDeleteEnabled) {
        sql += ` AND deleted_at IS NULL`;
      }

      // 排序处理（默认按添加时间降序排列）
      const sortBy = options?.sortBy || 'added_at';
      const sortOrder = options?.sortOrder || 'DESC';
      sql += ` ORDER BY ${sortBy} ${sortOrder}`;

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
      logger.error('获取用户游戏库失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户的游戏库统计信息
   *
   * 统计用户游戏库的总数、按状态分布、按平台分布，
   * 以及平均评分。为个人资料页和仪表盘提供数据支撑。
   *
   * @param userId - 用户 ID
   * @returns 统计结果对象，包含：
   *   - totalGames: 游戏总数
   *   - byStatus: 按游玩状态分类的计数
   *   - byPlatform: 按平台分类的计数（仅统计 owned 为 true 的平台）
   *   - totalPlayTime: 总游玩时间（需从游戏会话表获取，当前返回 0）
   *   - averageRating: 用户平均评分（可选）
   * @throws 查询失败时抛出异常
   */
  async getUserLibraryStats(userId: string): Promise<{
    totalGames: number;
    byStatus: Record<string, number>;
    byPlatform: Record<string, number>;
    totalPlayTime: number;
    averageRating?: number;
  }> {
    try {
      // 查询游戏总数
      const totalResult = await query(
        `SELECT COUNT(*) as count FROM ${this.tableName} WHERE user_id = ? AND deleted_at IS NULL`,
        [userId]
      );
      const totalGames = totalResult[0]?.count || 0;

      // 按游玩状态分组统计
      const statusResult = await query(
        `SELECT status, COUNT(*) as count FROM ${this.tableName} WHERE user_id = ? AND deleted_at IS NULL GROUP BY status`,
        [userId]
      );
      const byStatus: Record<string, number> = {};
      statusResult.forEach((row: any) => {
        byStatus[row.status] = Number(row.count);
      });

      // 按平台统计（需遍历并解析 JSON 格式的 platforms 字段）
      const platformResult = await query(
        `SELECT platforms FROM ${this.tableName} WHERE user_id = ? AND deleted_at IS NULL`,
        [userId]
      );
      const byPlatform: Record<string, number> = {};
      platformResult.forEach((row: any) => {
        const platforms = typeof row.platforms === 'string' ? JSON.parse(row.platforms) : row.platforms || [];
        platforms.forEach((platform: any) => {
          if (platform.owned) {
            const platformType = platform.platformType;
            byPlatform[platformType] = (byPlatform[platformType] || 0) + 1;
          }
        });
      });

      // 计算平均评分（忽略未评分的游戏）
      const ratingResult = await query(
        `SELECT AVG(personal_rating) as avg_rating FROM ${this.tableName} WHERE user_id = ? AND personal_rating IS NOT NULL AND deleted_at IS NULL`,
        [userId]
      );
      const averageRating = ratingResult[0]?.avg_rating ? Number(ratingResult[0].avg_rating) : undefined;

      return {
        totalGames: Number(totalGames),                          // 游戏总数
        byStatus,                                                // 按状态分布
        byPlatform,                                              // 按平台分布
        totalPlayTime: 0,                                        // TODO: 从游戏会话表获取实际数据
        averageRating,                                           // 平均评分
      };
    } catch (error) {
      logger.error('获取用户游戏库统计失败:', error);
      throw error;
    }
  }

  /**
   * 检查指定游戏是否已在用户的游戏库中
   *
   * @param userId - 用户 ID
   * @param gameId - 游戏 ID
   * @returns 游戏在库中返回 true，否则返回 false
   * @throws 查询失败时抛出异常
   */
  async isGameInLibrary(userId: string, gameId: string): Promise<boolean> {
    try {
      const sql = `SELECT 1 FROM ${this.tableName} WHERE user_id = ? AND game_id = ? AND deleted_at IS NULL`;
      const rows = await query(sql, [userId, gameId]);
      return rows.length > 0;
    } catch (error) {
      logger.error('检查游戏是否在库中失败:', error);
      throw error;
    }
  }

  /**
   * 更新游戏的最后游玩时间
   *
   * 当用户开始玩某款游戏时调用，记录最新的游玩时间戳。
   *
   * @param userId - 用户 ID
   * @param gameId - 游戏 ID
   * @returns 更新成功返回 true，未找到记录返回 false
   * @throws 更新失败时抛出异常
   */
  async updateLastPlayed(userId: string, gameId: string): Promise<boolean> {
    try {
      const sql = `
        UPDATE ${this.tableName}
        SET last_played_at = ?, updated_at = ?
        WHERE user_id = ? AND game_id = ? AND deleted_at IS NULL
      `;
      const result = await query(sql, [
        new Date().toISOString(),
        new Date().toISOString(),
        userId,
        gameId
      ]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('更新最后游玩时间失败:', error);
      throw error;
    }
  }

  /**
   * 批量查询游戏是否在用户的游戏库中
   *
   * 一次性检查多个游戏的库状态，返回一个以 gameId 为键的映射表。
   * 用于游戏列表页或详情页批量展示游戏库状态。
   *
   * @param userId - 用户 ID
   * @param gameIds - 需要查询的游戏 ID 数组
   * @returns 以 gameId 为键、是否在库中为值的映射对象
   * @throws 查询失败时抛出异常
   */
  async getBatchLibraryStatus(userId: string, gameIds: string[]): Promise<Record<string, boolean>> {
    try {
      if (gameIds.length === 0) {
        return {};
      }

      const placeholders = gameIds.map(() => '?').join(',');
      const params = [...gameIds, userId];

      const sql = `
        SELECT game_id
        FROM ${this.tableName}
        WHERE game_id IN (${placeholders}) AND user_id = ? AND deleted_at IS NULL
      `;

      const rows = await query(sql, params);
      const inLibrarySet = new Set();

      rows.forEach((row: any) => {
        inLibrarySet.add(row.game_id);
      });

      // 构建每个游戏是否在库中的映射
      const result: Record<string, boolean> = {};
      gameIds.forEach(gameId => {
        result[gameId] = inLibrarySet.has(gameId);
      });

      return result;
    } catch (error) {
      logger.error('批量获取游戏库状态失败:', error);
      throw error;
    }
  }

  /**
   * 导入外部游戏库数据
   *
   * 从 Steam、PlayStation Network 等外部平台导入用户的游戏库数据。
   * 仅导入用户库中尚不存在的游戏，避免重复。
   *
   * @param userId - 目标用户 ID
   * @param externalData - 外部游戏库数据数组，每项包含：
   *   - gameId: 游戏 ID
   *   - gameTitle: 游戏名称
   *   - gameSlug: 游戏 URL 标识
   *   - status: 游玩状态
   *   - platforms: 拥有的平台列表
   *   - purchaseDate: 购买日期（可选）
   * @returns 成功导入的新增游戏数量
   * @throws 导入过程中发生严重错误时抛出异常
   */
  async importExternalLibrary(userId: string, externalData: Array<{
    gameId: string;
    gameTitle: string;
    gameSlug: string;
    status: string;
    platforms: any[];
    purchaseDate?: Date;
  }>): Promise<number> {
    try {
      let importedCount = 0;

      for (const item of externalData) {
        // 检查该游戏是否已存在于用户库中
        const existing = await this.findOne(
          'user_id = ? AND game_id = ? AND deleted_at IS NULL',
          [userId, item.gameId]
        );

        if (!existing) {
          // 创建新的游戏库条目
          const libraryItem: UserGameLibraryCreateInput = {
            userId,
            gameId: item.gameId,
            status: item.status as any,
            platforms: item.platforms,
          };

          await this.create(libraryItem);
          importedCount++;
        }
      }

      return importedCount;
    } catch (error) {
      logger.error('导入外部游戏库失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const userGameLibraryModel = new UserGameLibraryModel();
