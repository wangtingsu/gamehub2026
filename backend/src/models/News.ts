/**
 * ============================================================
 * 新闻模型 (NewsModel)
 * ============================================================
 * 本文件定义 NewsModel 类，继承自 BaseModel，
 * 用于操作新闻资讯数据表（news）。
 *
 * 功能涵盖：
 *   - 新闻 CRUD 操作
 *   - 按 slug、分类、作者查找
 *   - 发布/取消发布管理
 *   - 浏览量、点赞数、评论数管理
 *   - 新闻搜索与统计
 * ============================================================
 */

import { BaseModel } from './BaseModel';
import { News, NewsCreateInput, NewsUpdateInput } from '../types';
import { query } from '../db';
import logger from '../utils/logger';

/**
 * 新闻模型类
 *
 * 继承自 BaseModel，实体类型为 News。
 * 管理游戏资讯文章的发布、分类、搜索等。
 * 启用了软删除、乐观锁和审计日志。
 */
export class NewsModel extends BaseModel<News, NewsCreateInput, NewsUpdateInput> {
  protected tableName = 'news';
  protected primaryKey = 'id';

  // 启用软删除、乐观锁和审计日志
  protected softDeleteEnabled = true;
  protected optimisticLockEnabled = true;
  protected auditEnabled = true;

  /**
   * 将数据库行记录转换为 News 对象
   * 处理 tags JSON 字段的解析
   * @param row 数据库原始行数据
   * @returns 转换后的 News 实例
   */
  protected fromRow(row: any): News {
    return {
      id: String(row.id),
      title: row.title,
      slug: row.slug,
      content: row.content,
      excerpt: row.excerpt || undefined,
      coverImageUrl: row.cover_image_url || undefined,
      authorId: String(row.author_id),
      category: row.category,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags || [],
      isPublished: Boolean(row.is_published),
      isPinned: Boolean(row.is_pinned),
      publishedAt: row.published_at ? new Date(row.published_at) : undefined,
      views: Number(row.views),
      likes: Number(row.likes),
      comments: Number(row.comments),
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
   * 将 NewsCreateInput 转换为数据库行格式
   * @param data 创建新闻时传入的数据
   * @returns 适配 news 表列格式的对象
   */
  protected toRow(data: NewsCreateInput): any {
    const slug = data.slug || this.generateSlug(data.title);

    return {
      title: data.title,
      slug,
      content: data.content,
      excerpt: data.excerpt || null,
      cover_image_url: data.coverImageUrl || null,
      author_id: null, // 需在 service 层设置
      category: data.category,
      tags: JSON.stringify(data.tags || []),
      is_published: false, // 默认未发布
      published_at: null,
      views: 0,
      likes: 0,
      comments: 0,
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
   * 根据 slug 查找新闻
   * @param slug 新闻 URL 友好标识符
   * @returns 找到的新闻，未找到则返回 null
   */
  async findBySlug(slug: string): Promise<News | null> {
    return this.findOne('slug = ?', [slug]);
  }

  /**
   * 检查 slug 是否已存在
   * @param slug          待检查的 slug
   * @param excludeNewsId 排除的新闻 ID
   * @returns 是否存在
   */
  async slugExists(slug: string, excludeNewsId?: string): Promise<boolean> {
    try {
      let sql = `SELECT 1 FROM ${this.tableName} WHERE slug = ?`;
      const params: any[] = [slug];
      if (excludeNewsId) {
        sql += ` AND id != ?`;
        params.push(excludeNewsId);
      }
      const rows = await query(sql, params);
      return rows.length > 0;
    } catch (error) {
      logger.error('检查slug是否存在失败:', error);
      throw error;
    }
  }

  /**
   * 根据分类查找新闻
   * @param category               分类标识
   * @param options.publishedOnly  是否仅已发布
   * @param options.limit          每页条数
   * @param options.offset         偏移量
   * @returns 新闻列表
   */
  async findByCategory(category: string, options?: {
    limit?: number;
    offset?: number;
    publishedOnly?: boolean;
  }): Promise<News[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE category = ?`;
      const params: any[] = [category];

      if (options?.publishedOnly) {
        sql += ` AND is_published = 1`;
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
      logger.error('根据分类查找新闻失败:', error);
      throw error;
    }
  }

  /**
   * 根据作者 ID 查找新闻
   * @param authorId               作者 ID
   * @param options.publishedOnly  是否仅已发布
   * @param options.limit          每页条数
   * @param options.offset         偏移量
   * @returns 新闻列表
   */
  async findByAuthorId(authorId: string, options?: {
    limit?: number;
    offset?: number;
    publishedOnly?: boolean;
  }): Promise<News[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE author_id = ?`;
      const params: any[] = [authorId];

      if (options?.publishedOnly) {
        sql += ` AND is_published = 1`;
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
      logger.error('根据作者ID查找新闻失败:', error);
      throw error;
    }
  }

  /**
   * 获取已发布的新闻（支持分页、分类筛选和排序）
   * @param options 查询选项
   * @returns 已发布的新闻列表
   */
  async getPublishedNews(options?: {
    limit?: number;
    offset?: number;
    category?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<News[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE is_published = 1`;
      const params: any[] = [];

      if (options?.category) {
        sql += ` AND category = ?`;
        params.push(options.category);
      }

      // 排序（白名单校验）
      if (options?.sortBy) {
        const safeSortColumns = ['id', 'title', 'views', 'likes', 'comments', 'published_at', 'created_at'];
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
      logger.error('获取已发布新闻失败:', error);
      throw error;
    }
  }

  /**
   * 增加新闻浏览量
   * @param newsId 新闻 ID
   * @returns 是否更新成功
   */
  async incrementViews(newsId: string): Promise<boolean> {
    try {
      const sql = `UPDATE ${this.tableName} SET views = views + 1, updated_at = ? WHERE id = ?`;
      const result = await query(sql, [new Date().toISOString(), newsId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('增加新闻浏览量失败:', error);
      throw error;
    }
  }

  /**
   * 增加新闻点赞数
   * @param newsId 新闻 ID
   * @returns 是否更新成功
   */
  async incrementLikes(newsId: string): Promise<boolean> {
    try {
      const sql = `UPDATE ${this.tableName} SET likes = likes + 1, updated_at = ? WHERE id = ?`;
      const result = await query(sql, [new Date().toISOString(), newsId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('增加新闻点赞数失败:', error);
      throw error;
    }
  }

  /**
   * 增加新闻评论数
   * @param newsId 新闻 ID
   * @returns 是否更新成功
   */
  async incrementComments(newsId: string): Promise<boolean> {
    try {
      const sql = `UPDATE ${this.tableName} SET comments = comments + 1, updated_at = ? WHERE id = ?`;
      const result = await query(sql, [new Date().toISOString(), newsId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('增加新闻评论数失败:', error);
      throw error;
    }
  }

  /**
   * 发布新闻（设置 is_published = 1 并记录发布时间）
   * @param newsId 新闻 ID
   * @returns 是否更新成功
   */
  async publishNews(newsId: string): Promise<boolean> {
    try {
      const sql = `UPDATE ${this.tableName} SET is_published = 1, published_at = ?, updated_at = ? WHERE id = ?`;
      const result = await query(sql, [new Date().toISOString(), new Date().toISOString(), newsId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('发布新闻失败:', error);
      throw error;
    }
  }

  /**
   * 取消发布新闻
   * @param newsId 新闻 ID
   * @returns 是否更新成功
   */
  async unpublishNews(newsId: string): Promise<boolean> {
    try {
      const sql = `UPDATE ${this.tableName} SET is_published = 0, updated_at = ? WHERE id = ?`;
      const result = await query(sql, [new Date().toISOString(), newsId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('取消发布新闻失败:', error);
      throw error;
    }
  }

  /**
   * 搜索新闻（支持按标题、内容、摘要模糊搜索，按分类/作者筛选）
   * @param queryText              搜索关键字
   * @param options.category       按分类筛选
   * @param options.authorId       按作者筛选
   * @param options.publishedOnly  仅已发布
   * @param options.limit          每页条数
   * @param options.offset         偏移量
   * @returns 匹配的新闻列表
   */
  async searchNews(queryText: string, options?: {
    limit?: number;
    offset?: number;
    category?: string;
    authorId?: string;
    publishedOnly?: boolean;
  }): Promise<News[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName}`;
      const params: any[] = [];
      const conditions: string[] = [];

      if (queryText) {
        conditions.push('(title LIKE ? OR content LIKE ? OR excerpt LIKE ?)');
        params.push(`%${queryText}%`, `%${queryText}%`, `%${queryText}%`);
      }
      if (options?.category) { conditions.push('category = ?'); params.push(options.category); }
      if (options?.authorId) { conditions.push('author_id = ?'); params.push(options.authorId); }
      if (options?.publishedOnly) { conditions.push('is_published = 1'); }

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
      logger.error('搜索新闻失败:', error);
      throw error;
    }
  }

  /**
   * 获取新闻统计信息
   * @returns 统计对象，含总数、已发布数、按分类分布
   */
  async getNewsStats(): Promise<{
    total: number;
    published: number;
    byCategory: Record<string, number>;
  }> {
    try {
      const totalResult = await query(`SELECT COUNT(*) as count FROM ${this.tableName}`);
      const total = totalResult[0]?.count || 0;

      const publishedResult = await query(`SELECT COUNT(*) as count FROM ${this.tableName} WHERE is_published = 1`);
      const published = publishedResult[0]?.count || 0;

      const categoryResult = await query(`SELECT category, COUNT(*) as count FROM ${this.tableName} GROUP BY category`);
      const byCategory: Record<string, number> = {};
      categoryResult.forEach((row: any) => { byCategory[row.category] = row.count; });

      return { total, published, byCategory };
    } catch (error) {
      logger.error('获取新闻统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 从标题生成 URL 友好 slug
   * @param title 新闻标题
   * @returns 生成的 slug 字符串
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();
  }
}

/** 导出 NewsModel 单例实例 */
export const newsModel = new NewsModel();
