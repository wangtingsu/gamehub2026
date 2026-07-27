/**
 * ============================================================
 * 游戏模型 (GameModel)
 * ============================================================
 * 本文件定义 GameModel 类，继承自 BaseModel，
 * 用于操作游戏数据表（games），提供游戏相关的数据库操作方法。
 *
 * 功能涵盖：
 *   - 游戏 CRUD 操作
 *   - 按 slug 查找、搜索、筛选
 *   - 获取热门游戏 / 特色游戏
 *   - 游戏评分更新与统计
 *   - Slug 自动生成与唯一性校验
 * ============================================================
 */

import { BaseModel } from './BaseModel';
import { Game, GameCreateInput, GameUpdateInput } from '../types';
import { query } from '../db';
import logger from '../utils/logger';

/**
 * 游戏模型类
 *
 * 继承自 BaseModel，实体类型为 Game。
 * 启用了软删除、乐观锁和审计日志。
 */
export class GameModel extends BaseModel<Game, GameCreateInput, GameUpdateInput> {
  protected tableName = 'games';
  protected primaryKey = 'id';

  // 启用软删除、乐观锁和审计日志
  protected softDeleteEnabled = true;
  protected optimisticLockEnabled = true;
  protected auditEnabled = true;

  /**
   * 将数据库行记录转换为 Game 对象
   * 处理 JSON 字段（genres、platforms、screenshots）的解析
   * @param row 数据库原始行数据
   * @returns 转换后的 Game 实例
   */
  protected fromRow(row: any): Game {
    return {
      id: String(row.id),
      title: row.title,
      slug: row.slug,
      description: row.description || undefined,
      releaseDate: row.release_date ? new Date(row.release_date) : undefined,
      developer: row.developer || undefined,
      publisher: row.publisher || undefined,
      // 解析 JSON 数组字段
      genres: typeof row.genres === 'string' ? JSON.parse(row.genres) : row.genres || [],
      platforms: typeof row.platforms === 'string' ? JSON.parse(row.platforms) : row.platforms || [],
      rating: row.rating ? Number(row.rating) : undefined,
      price: row.price ? Number(row.price) : undefined,
      discount: row.discount ? Number(row.discount) : undefined,
      coverImageUrl: row.cover_image_url || undefined,
      screenshots: typeof row.screenshots === 'string' ? JSON.parse(row.screenshots) : row.screenshots || [],
      steamAppId: row.steam_app_id ? Number(row.steam_app_id) : undefined,
      rawgId: row.rawg_id ? Number(row.rawg_id) : undefined,
      isFeatured: Boolean(row.is_featured),
      displayZone: row.display_zone || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),

      // 营销字段
      promotionalTag: row.promotional_tag || undefined,
      featuredUntil: row.featured_until ? new Date(row.featured_until) : undefined,
      discountEndDate: row.discount_end_date ? new Date(row.discount_end_date) : undefined,
      views: row.views ? Number(row.views) : 0,
      wishlistCount: row.wishlist_count ? Number(row.wishlist_count) : 0,
      purchaseCount: row.purchase_count ? Number(row.purchase_count) : 0,
      metaTitle: row.meta_title || undefined,
      metaDescription: row.meta_description || undefined,

      // 软删除、乐观锁和审计字段
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
      version: row.version ? Number(row.version) : 1,
      createdBy: row.created_by || undefined,
      updatedBy: row.updated_by || undefined,
    };
  }

  /**
   * 将 GameCreateInput 转换为数据库行格式
   * 处理 JSON 序列化（genres、platforms、screenshots）
   * @param data 创建游戏时传入的数据
   * @returns 适配 games 表列格式的对象
   */
  protected toRow(data: GameCreateInput): any {
    const slug = data.slug || this.generateSlug(data.title);

    return {
      title: data.title,
      slug,
      description: data.description || null,
      release_date: data.releaseDate ? data.releaseDate.toISOString() : null,
      developer: data.developer || null,
      publisher: data.publisher || null,
      genres: JSON.stringify(data.genres || []),
      platforms: JSON.stringify(data.platforms || []),
      price: data.price || 0,
      discount: 0, // 默认无折扣
      cover_image_url: data.coverImageUrl || null,
      screenshots: JSON.stringify([]), // 默认空数组
      steam_app_id: null,
      rawg_id: null,
      is_featured: false, // 默认不推荐
      display_zone: data.displayZone || null,

      // 营销字段默认值
      promotional_tag: null,
      featured_until: null,
      discount_end_date: null,
      views: 0,
      wishlist_count: 0,
      purchase_count: 0,
      meta_title: null,
      meta_description: null,

      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),

      // BaseModel 字段
      deleted_at: null,
      version: 1,
      created_by: null,
      updated_by: null,
    };
  }

  /**
   * 根据 slug 查找游戏
   * @param slug 游戏 URL 友好标识符
   * @returns 找到的游戏，未找到则返回 null
   */
  async findBySlug(slug: string): Promise<Game | null> {
    return this.findOne('slug = ?', [slug]);
  }

  /**
   * 检查 slug 是否已被使用
   * @param slug          待检查的 slug
   * @param excludeGameId 排除的游戏 ID（更新场景）
   * @returns 是否存在
   */
  async slugExists(slug: string, excludeGameId?: string): Promise<boolean> {
    try {
      let sql = `SELECT 1 FROM ${this.tableName} WHERE slug = ?`;
      const params: any[] = [slug];
      if (excludeGameId) {
        sql += ` AND id != ?`;
        params.push(excludeGameId);
      }
      const rows = await query(sql, params);
      return rows.length > 0;
    } catch (error) {
      logger.error('检查slug是否存在失败:', error);
      throw error;
    }
  }

  /**
   * 搜索游戏（支持标题、描述模糊匹配，按类型/平台/推荐状态筛选）
   * @param queryText        搜索关键字
   * @param options.genre    按游戏类型筛选
   * @param options.platform 按平台筛选
   * @param options.featured 是否仅推荐游戏
   * @param options.sortBy   排序字段
   * @param options.sortOrder 排序方向
   * @param options.limit    每页条数
   * @param options.offset   偏移量
   * @returns 匹配的游戏列表
   */
  async searchGames(queryText: string, options?: {
    limit?: number;
    offset?: number;
    genre?: string;
    platform?: string;
    featured?: boolean;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<Game[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName}`;
      const params: any[] = [];
      const conditions: string[] = [];

      if (queryText) {
        conditions.push('(title LIKE ? OR description LIKE ?)');
        params.push(`%${queryText}%`, `%${queryText}%`);
      }
      if (options?.genre) { conditions.push('genres LIKE ?'); params.push(`%"${options.genre}"%`); }
      if (options?.platform) { conditions.push('platforms LIKE ?'); params.push(`%"${options.platform}"%`); }
      if (options?.featured !== undefined) { conditions.push('is_featured = ?'); params.push(options.featured ? 1 : 0); }

      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }

      // 排序（白名单校验防止 SQL 注入）
      if (options?.sortBy) {
        const safeSortColumns = ['id', 'title', 'slug', 'rating', 'price', 'created_at', 'updated_at', 'release_date'];
        const sortColumn = options.sortBy.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        const safeSortColumn = safeSortColumns.includes(sortColumn) ? sortColumn : 'created_at';
        const sortOrder = options.sortOrder === 'ASC' ? 'ASC' : 'DESC';
        sql += ` ORDER BY ${safeSortColumn} ${sortOrder}`;
      } else {
        sql += ` ORDER BY created_at DESC`;
      }

      if (options?.limit) {
        sql += ` LIMIT ?`;
        params.push(options.limit);
        if (options.offset) {
          sql += ` OFFSET ?`;
          params.push(options.offset);
        }
      }

      const rows = await query(sql, params);
      return rows.map((row: any) => this.fromRow(row));
    } catch (error) {
      logger.error('搜索游戏失败:', error);
      throw error;
    }
  }

  /**
   * 获取推荐/热门游戏列表
   * @param limit 返回条数上限
   * @returns 特色游戏列表
   */
  async getFeaturedGames(limit: number = 10): Promise<Game[]> {
    try {
      const sql = `
        SELECT * FROM ${this.tableName}
        WHERE is_featured = 1
        ORDER BY rating DESC, created_at DESC
        LIMIT ?
      `;
      const rows = await query(sql, [limit]);
      return rows.map((row: any) => this.fromRow(row));
    } catch (error) {
      logger.error('获取热门游戏失败:', error);
      throw error;
    }
  }

  /**
   * 更新游戏评分
   * @param gameId    游戏 ID
   * @param newRating 新评分值
   * @returns 是否更新成功
   */
  async updateRating(gameId: string, newRating: number): Promise<boolean> {
    try {
      const sql = `UPDATE ${this.tableName} SET rating = ?, updated_at = ? WHERE id = ?`;
      const result = await query(sql, [newRating, new Date().toISOString(), gameId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('更新游戏评分失败:', error);
      throw error;
    }
  }

  /**
   * 获取游戏统计信息（评测数、平均评分、收藏数）
   * @param gameId 游戏 ID
   * @returns 统计信息对象
   */
  async getGameStats(gameId: string): Promise<{
    reviewCount: number;
    averageRating: number;
    favoriteCount: number;
  }> {
    try {
      // 评测数量和加权平均评分（按用户等级加权）
      const reviewResult = await query(`
        SELECT COUNT(*) as count,
               SUM(r.rating * (1 + (COALESCE(u.level, 1) - 1) * 0.5)) /
               NULLIF(SUM(1 + (COALESCE(u.level, 1) - 1) * 0.5), 0) as avg_rating
        FROM reviews r
        LEFT JOIN users u ON r.author_id = u.id
        WHERE r.game_id = ?
      `, [gameId]);
      const reviewCount = reviewResult[0]?.count || 0;
      const averageRating = reviewResult[0]?.avg_rating ? Number(reviewResult[0].avg_rating) : 0;

      // 收藏数
      const favoriteResult = await query(
        'SELECT COUNT(*) as count FROM favorites WHERE game_id = ?', [gameId]
      );
      const favoriteCount = favoriteResult[0]?.count || 0;

      return { reviewCount, averageRating, favoriteCount };
    } catch (error) {
      logger.error('获取游戏统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 从标题生成 URL 友好 slug
   * @param title 游戏标题
   * @returns 生成的 slug 字符串
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')  // 移除非字母数字、空格、短横字符
      .replace(/\s+/g, '-')       // 空格替换为短横
      .replace(/--+/g, '-')       // 合并连续短横
      .trim();
  }
}

/** 导出 GameModel 单例实例 */
export const gameModel = new GameModel();
