/**
 * ============================================================
 * 评测模型 (ReviewModel)
 * ============================================================
 * 本文件定义 ReviewModel 类，继承自 BaseModel，
 * 用于操作游戏评测数据表（reviews）。
 *
 * 功能涵盖：
 *   - 评测 CRUD 操作
 *   - 按游戏/作者查找评测
 *   - 获取热门评测、搜索评测
 *   - 点赞数/评论数管理
 *   - 评测去重检查
 * ============================================================
 */

import { BaseModel } from './BaseModel';
import { Review, ReviewCreateInput, ReviewUpdateInput } from '../types';
import { query } from '../db';
import logger from '../utils/logger';

/**
 * 评测模型类
 *
 * 继承自 BaseModel，实体类型为 Review。
 * 管理游戏评测（评价）内容，包含评分、标签、点赞量等。
 * 启用了软删除、乐观锁和审计日志。
 */
export class ReviewModel extends BaseModel<Review, ReviewCreateInput, ReviewUpdateInput> {
  protected tableName = 'reviews';
  protected primaryKey = 'id';

  // 启用软删除、乐观锁和审计日志
  protected softDeleteEnabled = true;
  protected optimisticLockEnabled = true;
  protected auditEnabled = true;

  /**
   * 将数据库行记录转换为 Review 对象
   * 处理 tags JSON 字段的解析
   * @param row 数据库原始行数据
   * @returns 转换后的 Review 实例
   */
  protected fromRow(row: any): Review {
    return {
      id: String(row.id),
      title: row.title,
      content: row.content,
      rating: Number(row.rating),
      gameId: String(row.game_id),
      authorId: String(row.author_id),
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags || [],
      likes: Number(row.likes),
      comments: Number(row.comments),
      isFeatured: Boolean(row.is_featured),
      publishedAt: new Date(row.published_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      // 软删除、乐观锁和审计字段
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
      version: row.version ? Number(row.version) : 1,
      createdBy: row.created_by || undefined,
      updatedBy: row.updated_by || undefined,
    };
  }

  /**
   * 将 ReviewCreateInput 转换为数据库行格式
   * @param data 创建评测时传入的数据
   * @returns 适配 reviews 表列格式的对象
   */
  protected toRow(data: ReviewCreateInput): any {
    return {
      title: data.title,
      content: data.content,
      rating: data.rating,
      game_id: data.gameId,
      author_id: null, // 需在 service 层设置
      tags: JSON.stringify(data.tags || []),
      likes: 0,
      comments: 0,
      is_featured: false,
      published_at: new Date().toISOString(),
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
   * 根据游戏 ID 查找评测（支持分页、排序和精选筛选）
   * @param gameId             游戏 ID
   * @param options.featured   是否仅精选评测
   * @param options.sortBy     排序字段
   * @param options.sortOrder  排序方向
   * @param options.limit      每页条数
   * @param options.offset     偏移量
   * @returns 评测列表
   */
  async findByGameId(gameId: string, options?: {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    featured?: boolean;
  }): Promise<Review[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE game_id = ?`;
      const params: any[] = [gameId];

      if (options?.featured !== undefined) {
        sql += ` AND is_featured = ?`;
        params.push(options.featured ? 1 : 0);
      }

      // 排序（白名单校验）
      if (options?.sortBy) {
        const safeSortColumns = ['id', 'rating', 'likes', 'comments', 'published_at', 'created_at'];
        const sortColumn = options.sortBy.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        const safeSortColumn = safeSortColumns.includes(sortColumn) ? sortColumn : 'published_at';
        const sortOrder = options.sortOrder === 'ASC' ? 'ASC' : 'DESC';
        sql += ` ORDER BY ${safeSortColumn} ${sortOrder}`;
      } else {
        sql += ` ORDER BY published_at DESC`;
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
      logger.error('根据游戏ID查找评测失败:', error);
      throw error;
    }
  }

  /**
   * 根据作者 ID 查找评测
   * @param authorId 作者（用户）ID
   * @param options  分页选项
   * @returns 评测列表
   */
  async findByAuthorId(authorId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<Review[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE author_id = ? ORDER BY published_at DESC`;
      const params: any[] = [authorId];

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
      logger.error('根据作者ID查找评测失败:', error);
      throw error;
    }
  }

  /**
   * 获取热门（精选）评测
   * @param limit 返回条数上限
   * @returns 精选评测列表
   */
  async getFeaturedReviews(limit: number = 10): Promise<Review[]> {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE is_featured = 1 ORDER BY likes DESC, published_at DESC LIMIT ?`;
      const rows = await query(sql, [limit]);
      return rows.map((row: any) => this.fromRow(row));
    } catch (error) {
      logger.error('获取热门评测失败:', error);
      throw error;
    }
  }

  /**
   * 增加评测的点赞数
   * @param reviewId 评测 ID
   * @returns 是否更新成功
   */
  async incrementLikes(reviewId: string): Promise<boolean> {
    try {
      const sql = `UPDATE ${this.tableName} SET likes = likes + 1, updated_at = ? WHERE id = ?`;
      const result = await query(sql, [new Date().toISOString(), reviewId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('增加评测点赞数失败:', error);
      throw error;
    }
  }

  /**
   * 增加评测的评论数
   * @param reviewId 评测 ID
   * @returns 是否更新成功
   */
  async incrementComments(reviewId: string): Promise<boolean> {
    try {
      const sql = `UPDATE ${this.tableName} SET comments = comments + 1, updated_at = ? WHERE id = ?`;
      const result = await query(sql, [new Date().toISOString(), reviewId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('增加评测评论数失败:', error);
      throw error;
    }
  }

  /**
   * 获取评测统计信息（点赞数和评论数）
   * @param reviewId 评测 ID
   * @returns 统计对象
   */
  async getReviewStats(reviewId: string): Promise<{
    likes: number;
    comments: number;
    averageRating?: number;
  }> {
    try {
      const sql = `SELECT likes, comments FROM ${this.tableName} WHERE id = ?`;
      const rows = await query(sql, [reviewId]);
      if (rows.length === 0) {
        throw new Error('评测不存在');
      }
      return { likes: Number(rows[0].likes), comments: Number(rows[0].comments) };
    } catch (error) {
      logger.error('获取评测统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 检查用户是否已对某游戏发表过评测（一人一评）
   * @param userId 用户 ID
   * @param gameId 游戏 ID
   * @returns 是否已评测
   */
  async userHasReviewedGame(userId: string, gameId: string): Promise<boolean> {
    try {
      const sql = `SELECT 1 FROM ${this.tableName} WHERE author_id = ? AND game_id = ? LIMIT 1`;
      const rows = await query(sql, [userId, gameId]);
      return rows.length > 0;
    } catch (error) {
      logger.error('检查用户是否已评测游戏失败:', error);
      throw error;
    }
  }

  /**
   * 搜索评测（支持按标题、内容、游戏、作者和最低评分筛选）
   * @param queryText          搜索关键字
   * @param options.gameId     按游戏筛选
   * @param options.authorId   按作者筛选
   * @param options.minRating  最低评分
   * @param options.limit      每页条数
   * @param options.offset     偏移量
   * @returns 匹配的评测列表
   */
  async searchReviews(queryText: string, options?: {
    limit?: number;
    offset?: number;
    gameId?: string;
    authorId?: string;
    minRating?: number;
  }): Promise<Review[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName}`;
      const params: any[] = [];
      const conditions: string[] = [];

      if (queryText) {
        conditions.push('(title LIKE ? OR content LIKE ?)');
        params.push(`%${queryText}%`, `%${queryText}%`);
      }
      if (options?.gameId) { conditions.push('game_id = ?'); params.push(options.gameId); }
      if (options?.authorId) { conditions.push('author_id = ?'); params.push(options.authorId); }
      if (options?.minRating !== undefined) { conditions.push('rating >= ?'); params.push(options.minRating); }

      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
      sql += ` ORDER BY published_at DESC`;

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
      logger.error('搜索评测失败:', error);
      throw error;
    }
  }
}

/** 导出 ReviewModel 单例实例 */
export const reviewModel = new ReviewModel();
