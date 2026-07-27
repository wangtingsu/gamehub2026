/**
 * ============================================================
 * 社区帖子模型 (CommunityPostModel)
 * ============================================================
 * 本文件定义 CommunityPostModel 类，继承自 BaseModel，
 * 用于操作社区帖子数据表（community_posts）。
 *
 * 功能涵盖：
 *   - 帖子 CRUD 操作
 *   - 按分类/作者查找
 *   - 置顶/取消置顶
 *   - 锁定/解锁帖子
 *   - 点赞数/评论数管理
 *   - 热门帖子排序与搜索
 * ============================================================
 */

import { BaseModel } from './BaseModel';
import { CommunityPost, CommunityPostCreateInput, CommunityPostUpdateInput } from '../types';
import { query } from '../db';
import logger from '../utils/logger';

/**
 * 社区帖子模型类
 *
 * 继承自 BaseModel，实体类型为 CommunityPost。
 * 管理用户在社区中发布的讨论帖，支持置顶、锁定等功能。
 * 启用了软删除、乐观锁和审计日志。
 */
export class CommunityPostModel extends BaseModel<CommunityPost, CommunityPostCreateInput, CommunityPostUpdateInput> {
  protected tableName = 'community_posts';
  protected primaryKey = 'id';

  // 启用软删除、乐观锁和审计日志
  protected softDeleteEnabled = true;
  protected optimisticLockEnabled = true;
  protected auditEnabled = true;

  /**
   * 将数据库行记录转换为 CommunityPost 对象
   * 处理 tags JSON 字段的解析
   * @param row 数据库原始行数据
   * @returns 转换后的 CommunityPost 实例
   */
  protected fromRow(row: any): CommunityPost {
    return {
      id: String(row.id),
      title: row.title,
      content: row.content,
      authorId: String(row.author_id),
      category: row.category,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags || [],
      likes: Number(row.likes),
      comments: Number(row.comments),
      isPinned: Boolean(row.is_pinned),
      isLocked: Boolean(row.is_locked),
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
   * 将 CommunityPostCreateInput 转换为数据库行格式
   * @param data 创建帖子时传入的数据
   * @returns 适配 community_posts 表列格式的对象
   */
  protected toRow(data: CommunityPostCreateInput): any {
    return {
      title: data.title,
      content: data.content,
      author_id: null, // 需在 service 层设置
      category: data.category,
      tags: JSON.stringify(data.tags || []),
      likes: 0,
      comments: 0,
      is_pinned: false,
      is_locked: false,
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
   * 根据分类查找帖子（支持分页、仅置顶筛选）
   * @param category               帖子分类
   * @param options.pinnedOnly     是否仅置顶帖
   * @param options.limit          每页条数
   * @param options.offset         偏移量
   * @returns 帖子列表
   */
  async findByCategory(category: string, options?: {
    limit?: number;
    offset?: number;
    pinnedOnly?: boolean;
  }): Promise<CommunityPost[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE category = ?`;
      const params: any[] = [category];

      if (options?.pinnedOnly) {
        sql += ` AND is_pinned = 1`;
      }

      sql += ` ORDER BY is_pinned DESC, published_at DESC`;

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
      logger.error('根据分类查找社区帖子失败:', error);
      throw error;
    }
  }

  /**
   * 根据作者 ID 查找帖子
   * @param authorId 作者 ID
   * @param options  分页选项
   * @returns 帖子列表
   */
  async findByAuthorId(authorId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<CommunityPost[]> {
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
      logger.error('根据作者ID查找社区帖子失败:', error);
      throw error;
    }
  }

  /**
   * 获取置顶帖子
   * @param category 可选：按分类过滤
   * @returns 置顶帖子列表
   */
  async getPinnedPosts(category?: string): Promise<CommunityPost[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE is_pinned = 1`;
      const params: any[] = [];

      if (category) {
        sql += ` AND category = ?`;
        params.push(category);
      }

      sql += ` ORDER BY published_at DESC`;
      const rows = await query(sql, params);
      return rows.map((row: any) => this.fromRow(row));
    } catch (error) {
      logger.error('获取置顶帖子失败:', error);
      throw error;
    }
  }

  /**
   * 增加帖子点赞数
   * @param postId 帖子 ID
   * @returns 是否更新成功
   */
  async incrementLikes(postId: string): Promise<boolean> {
    try {
      const sql = `UPDATE ${this.tableName} SET likes = likes + 1, updated_at = ? WHERE id = ?`;
      const result = await query(sql, [new Date().toISOString(), postId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('增加社区帖子点赞数失败:', error);
      throw error;
    }
  }

  /**
   * 增加帖子评论数
   * @param postId 帖子 ID
   * @returns 是否更新成功
   */
  async incrementComments(postId: string): Promise<boolean> {
    try {
      const sql = `UPDATE ${this.tableName} SET comments = comments + 1, updated_at = ? WHERE id = ?`;
      const result = await query(sql, [new Date().toISOString(), postId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('增加社区帖子评论数失败:', error);
      throw error;
    }
  }

  /**
   * 置顶帖子
   * @param postId 帖子 ID
   * @returns 是否更新成功
   */
  async pinPost(postId: string): Promise<boolean> {
    try {
      const sql = `UPDATE ${this.tableName} SET is_pinned = 1, updated_at = ? WHERE id = ?`;
      const result = await query(sql, [new Date().toISOString(), postId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('置顶帖子失败:', error);
      throw error;
    }
  }

  /**
   * 取消置顶帖子
   * @param postId 帖子 ID
   * @returns 是否更新成功
   */
  async unpinPost(postId: string): Promise<boolean> {
    try {
      const sql = `UPDATE ${this.tableName} SET is_pinned = 0, updated_at = ? WHERE id = ?`;
      const result = await query(sql, [new Date().toISOString(), postId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('取消置顶帖子失败:', error);
      throw error;
    }
  }

  /**
   * 锁定帖子（锁定后用户无法回复）
   * @param postId 帖子 ID
   * @returns 是否更新成功
   */
  async lockPost(postId: string): Promise<boolean> {
    try {
      const sql = `UPDATE ${this.tableName} SET is_locked = 1, updated_at = ? WHERE id = ?`;
      const result = await query(sql, [new Date().toISOString(), postId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('锁定帖子失败:', error);
      throw error;
    }
  }

  /**
   * 解锁帖子
   * @param postId 帖子 ID
   * @returns 是否更新成功
   */
  async unlockPost(postId: string): Promise<boolean> {
    try {
      const sql = `UPDATE ${this.tableName} SET is_locked = 0, updated_at = ? WHERE id = ?`;
      const result = await query(sql, [new Date().toISOString(), postId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('解锁帖子失败:', error);
      throw error;
    }
  }

  /**
   * 搜索社区帖子（支持标题/内容模糊搜索，按分类/作者/标签筛选）
   * @param queryText        搜索关键字
   * @param options.category 按分类筛选
   * @param options.authorId 按作者筛选
   * @param options.tags     按标签筛选
   * @param options.limit    每页条数
   * @param options.offset   偏移量
   * @returns 匹配的帖子列表
   */
  async searchPosts(queryText: string, options?: {
    limit?: number;
    offset?: number;
    category?: string;
    authorId?: string;
    tags?: string[];
  }): Promise<CommunityPost[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName}`;
      const params: any[] = [];
      const conditions: string[] = [];

      if (queryText) {
        conditions.push('(title LIKE ? OR content LIKE ?)');
        params.push(`%${queryText}%`, `%${queryText}%`);
      }
      if (options?.category) { conditions.push('category = ?'); params.push(options.category); }
      if (options?.authorId) { conditions.push('author_id = ?'); params.push(options.authorId); }

      // 标签搜索（使用 LIKE 匹配 JSON 数组）
      if (options?.tags && options.tags.length > 0) {
        const tagConditions = options.tags.map(tag => `tags LIKE ?`);
        conditions.push(`(${tagConditions.join(' OR ')})`);
        options.tags.forEach(tag => params.push(`%"${tag}"%`));
      }

      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }

      sql += ` ORDER BY is_pinned DESC, published_at DESC`;

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
      logger.error('搜索社区帖子失败:', error);
      throw error;
    }
  }

  /**
   * 获取社区帖子统计信息
   * @returns 统计对象，含总数、按分类分布、总点赞数、总评论数
   */
  async getCommunityStats(): Promise<{
    total: number;
    byCategory: Record<string, number>;
    totalLikes: number;
    totalComments: number;
  }> {
    try {
      const totalResult = await query(`SELECT COUNT(*) as count FROM ${this.tableName}`);
      const total = totalResult[0]?.count || 0;

      const categoryResult = await query(`SELECT category, COUNT(*) as count FROM ${this.tableName} GROUP BY category`);
      const byCategory: Record<string, number> = {};
      categoryResult.forEach((row: any) => { byCategory[row.category] = row.count; });

      const likesResult = await query(`SELECT SUM(likes) as total FROM ${this.tableName}`);
      const totalLikes = likesResult[0]?.total || 0;

      const commentsResult = await query(`SELECT SUM(comments) as total FROM ${this.tableName}`);
      const totalComments = commentsResult[0]?.total || 0;

      return { total, byCategory, totalLikes, totalComments };
    } catch (error) {
      logger.error('获取社区统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取热门帖子（按点赞数*2 + 评论数排序）
   * @param limit 返回条数上限
   * @returns 热门帖子列表
   */
  async getPopularPosts(limit: number = 10): Promise<CommunityPost[]> {
    try {
      const sql = `
        SELECT * FROM ${this.tableName}
        WHERE is_locked = 0
        ORDER BY (likes * 2 + comments) DESC, published_at DESC
        LIMIT ?
      `;
      const rows = await query(sql, [limit]);
      return rows.map((row: any) => this.fromRow(row));
    } catch (error) {
      logger.error('获取热门帖子失败:', error);
      throw error;
    }
  }
}

/** 导出 CommunityPostModel 单例实例 */
export const communityPostModel = new CommunityPostModel();
