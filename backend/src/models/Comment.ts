/**
 * ============================================================
 * 评论模型 (CommentModel)
 * ============================================================
 * 本文件定义 CommentModel 类，继承自 BaseModel，
 * 用于操作用户评论数据表（comments）。
 *
 * 功能涵盖：
 *   - 评论 CRUD 操作
 *   - 按父级类型/ID 查找评论
 *   - 按作者查找、搜索评论
 *   - 点赞数管理、编辑标记
 *   - 评论统计与去重检查
 * ============================================================
 */

import { BaseModel } from './BaseModel';
import { Comment, CommentCreateInput } from '../types';
import { query } from '../db';
import logger from '../utils/logger';

/**
 * 评论模型类
 *
 * 继承自 BaseModel，实体类型为 Comment。
 * 支持对评测、新闻、社区帖子的评论功能，包括嵌套评论（回复）。
 * 启用了软删除、乐观锁和审计日志。
 */
export class CommentModel extends BaseModel<Comment, CommentCreateInput, Partial<Comment>> {
  protected tableName = 'comments';
  protected primaryKey = 'id';

  // 启用软删除、乐观锁和审计日志
  protected softDeleteEnabled = true;
  protected optimisticLockEnabled = true;
  protected auditEnabled = true;

  /**
   * 将数据库行记录转换为 Comment 对象
   * @param row 数据库原始行数据
   * @returns 转换后的 Comment 实例
   */
  protected fromRow(row: any): Comment {
    return {
      id: String(row.id),
      content: row.content,
      authorId: String(row.author_id),
      parentType: row.parent_type as 'review' | 'news' | 'community_post',
      parentId: String(row.parent_id),
      likes: Number(row.likes),
      isEdited: Boolean(row.is_edited),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      // 嵌套评论支持
      parentCommentId: row.parent_comment_id ? String(row.parent_comment_id) : undefined,
      replyCount: row.reply_count ? Number(row.reply_count) : 0,
      // 软删除、乐观锁和审计字段
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
      version: row.version ? Number(row.version) : 1,
      createdBy: row.created_by || undefined,
      updatedBy: row.updated_by || undefined,
    };
  }

  /**
   * 将 CommentCreateInput 转换为数据库行格式
   * @param data 创建评论时传入的数据
   * @returns 适配 comments 表列格式的对象
   */
  protected toRow(data: CommentCreateInput): any {
    return {
      content: data.content,
      author_id: null, // 需在 service 层设置
      parent_type: data.parentType,
      parent_id: data.parentId,
      parent_comment_id: data.parentCommentId || null, // 嵌套评论支持
      likes: 0,
      is_edited: false,
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
   * 根据父级类型和 ID 查找评论（支持分页排序）
   * @param parentType 父级类型（review | news | community_post）
   * @param parentId   父级记录 ID
   * @param options    分页与排序选项
   * @returns 评论列表
   */
  async findByParent(parentType: string, parentId: string, options?: {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<Comment[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE parent_type = ? AND parent_id = ?`;
      const params: any[] = [parentType, parentId];

      // 排序（白名单校验）
      if (options?.sortBy) {
        const safeSortColumns = ['id', 'likes', 'created_at'];
        const sortColumn = options.sortBy.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        const safeSortColumn = safeSortColumns.includes(sortColumn) ? sortColumn : 'created_at';
        const sortOrder = options.sortOrder === 'ASC' ? 'ASC' : 'DESC';
        sql += ` ORDER BY ${safeSortColumn} ${sortOrder}`;
      } else {
        sql += ` ORDER BY created_at ASC`; // 评论通常按时间正序显示
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
      logger.error('根据父级查找评论失败:', error);
      throw error;
    }
  }

  /**
   * 根据作者 ID 查找评论
   * @param authorId           作者 ID
   * @param options.parentType 按父级类型筛选
   * @param options.limit      每页条数
   * @param options.offset     偏移量
   * @returns 评论列表
   */
  async findByAuthorId(authorId: string, options?: {
    limit?: number;
    offset?: number;
    parentType?: string;
  }): Promise<Comment[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE author_id = ?`;
      const params: any[] = [authorId];

      if (options?.parentType) {
        sql += ` AND parent_type = ?`;
        params.push(options.parentType);
      }
      sql += ` ORDER BY created_at DESC`;

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
      logger.error('根据作者ID查找评论失败:', error);
      throw error;
    }
  }

  /**
   * 增加评论的点赞数
   * @param commentId 评论 ID
   * @returns 是否更新成功
   */
  async incrementLikes(commentId: string): Promise<boolean> {
    try {
      const sql = `UPDATE ${this.tableName} SET likes = likes + 1, updated_at = ? WHERE id = ?`;
      const result = await query(sql, [new Date().toISOString(), commentId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('增加评论点赞数失败:', error);
      throw error;
    }
  }

  /**
   * 标记评论为已编辑
   * @param commentId 评论 ID
   * @returns 是否更新成功
   */
  async markAsEdited(commentId: string): Promise<boolean> {
    try {
      const sql = `UPDATE ${this.tableName} SET is_edited = 1, updated_at = ? WHERE id = ?`;
      const result = await query(sql, [new Date().toISOString(), commentId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('标记评论为已编辑失败:', error);
      throw error;
    }
  }

  /**
   * 获取评论统计信息
   * @param parentType 父级类型（可选）
   * @param parentId   父级 ID（可选）
   * @returns 统计对象，包含总数和按父级类型分组的数量
   */
  async getCommentStats(parentType?: string, parentId?: string): Promise<{
    total: number;
    byParentType: Record<string, number>;
  }> {
    try {
      if (parentType && parentId) {
        const result = await query(
          `SELECT COUNT(*) as count FROM ${this.tableName} WHERE parent_type = ? AND parent_id = ?`,
          [parentType, parentId]
        );
        return { total: result[0]?.count || 0, byParentType: { [parentType]: result[0]?.count || 0 } };
      } else if (parentType) {
        const result = await query(
          `SELECT COUNT(*) as count FROM ${this.tableName} WHERE parent_type = ?`, [parentType]
        );
        return { total: result[0]?.count || 0, byParentType: { [parentType]: result[0]?.count || 0 } };
      } else {
        const totalResult = await query(`SELECT COUNT(*) as count FROM ${this.tableName}`);
        const total = totalResult[0]?.count || 0;
        const typeResult = await query(`
          SELECT parent_type, COUNT(*) as count FROM ${this.tableName} GROUP BY parent_type
        `);
        const byParentType: Record<string, number> = {};
        typeResult.forEach((row: any) => { byParentType[row.parent_type] = row.count; });
        return { total, byParentType };
      }
    } catch (error) {
      logger.error('获取评论统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 检查用户是否已对同一父级发表过评论
   * @param parentType 父级类型
   * @param parentId   父级 ID
   * @param userId     用户 ID
   * @returns 是否已评论
   */
  async userHasCommented(parentType: string, parentId: string, userId: string): Promise<boolean> {
    try {
      const sql = `SELECT 1 FROM ${this.tableName} WHERE parent_type = ? AND parent_id = ? AND author_id = ? LIMIT 1`;
      const rows = await query(sql, [parentType, parentId, userId]);
      return rows.length > 0;
    } catch (error) {
      logger.error('检查用户是否已评论失败:', error);
      throw error;
    }
  }

  /**
   * 搜索评论（支持按内容、父级类型、作者筛选）
   * @param queryText 搜索关键字
   * @param options   筛选与分页选项
   * @returns 匹配的评论列表
   */
  async searchComments(queryText: string, options?: {
    limit?: number;
    offset?: number;
    parentType?: string;
    authorId?: string;
  }): Promise<Comment[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName}`;
      const params: any[] = [];
      const conditions: string[] = [];

      if (queryText) { conditions.push('content LIKE ?'); params.push(`%${queryText}%`); }
      if (options?.parentType) { conditions.push('parent_type = ?'); params.push(options.parentType); }
      if (options?.authorId) { conditions.push('author_id = ?'); params.push(options.authorId); }

      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
      sql += ` ORDER BY created_at DESC`;

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
      logger.error('搜索评论失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户的评论历史
   * @param userId 用户 ID
   * @param limit  返回条数上限
   * @returns 用户的历史评论列表
   */
  async getUserCommentHistory(userId: string, limit: number = 20): Promise<Comment[]> {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE author_id = ? ORDER BY created_at DESC LIMIT ?`;
      const rows = await query(sql, [userId, limit]);
      return rows.map((row: any) => this.fromRow(row));
    } catch (error) {
      logger.error('获取用户评论历史失败:', error);
      throw error;
    }
  }
}

/** 导出 CommentModel 单例实例 */
export const commentModel = new CommentModel();
