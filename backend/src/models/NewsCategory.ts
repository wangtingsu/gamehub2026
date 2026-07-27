/**
 * ============================================================
 * 新闻分类模型 (NewsCategoryModel)
 * ============================================================
 * 本文件定义新闻分类相关的数据结构和操作类。
 * 用于管理新闻的分类标签（如"行业动态"、"新作发布"等）。
 *
 * 由于该模型较简单，未继承 BaseModel，而是独立实现 CRUD 方法。
 * ============================================================
 */

import { query, execute } from '../db';
import logger from '../utils/logger';

/**
 * 新闻分类接口
 * 定义新闻分类的数据结构
 */
export interface NewsCategory {
  id: string;
  /** 分类名称 */
  name: string;
  /** URL 友好标识符 */
  slug: string;
  /** 分类描述 */
  description?: string;
  /** 排序权重 */
  sortOrder: number;
  /** 是否激活 */
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** 创建新闻分类时的输入接口 */
export interface NewsCategoryCreateInput {
  name: string;
  slug?: string;
  description?: string;
  sortOrder?: number;
}

/** 更新新闻分类时的输入接口 */
export interface NewsCategoryUpdateInput {
  name?: string;
  slug?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

/**
 * 新闻分类模型类
 *
 * 独立实现 CRUD 操作，用于管理 news_categories 表。
 */
class NewsCategoryModel {
  /** 数据库表名 */
  protected tableName = 'news_categories';

  /**
   * 将数据库行记录转换为 NewsCategory 对象
   * @param row 数据库原始行数据
   * @returns 转换后的分类实例
   */
  protected fromRow(row: any): NewsCategory {
    return {
      id: String(row.id),
      name: row.name,
      slug: row.slug,
      description: row.description || undefined,
      sortOrder: Number(row.sort_order),
      isActive: Boolean(row.is_active),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * 获取所有分类（按排序权重和名称排序）
   * @returns 分类列表
   */
  async findAll(): Promise<NewsCategory[]> {
    try {
      const sql = `SELECT * FROM ${this.tableName} ORDER BY sort_order ASC, name ASC`;
      const rows = await query(sql);
      return rows.map((row: any) => this.fromRow(row));
    } catch (error) {
      logger.error('获取新闻分类列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有激活状态的分类
   * @returns 激活的分类列表
   */
  async findActive(): Promise<NewsCategory[]> {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE is_active = true ORDER BY sort_order ASC, name ASC`;
      const rows = await query(sql);
      return rows.map((row: any) => this.fromRow(row));
    } catch (error) {
      logger.error('获取活跃新闻分类失败:', error);
      throw error;
    }
  }

  /**
   * 根据 ID 查找分类
   * @param id 分类 ID
   * @returns 找到的分类，未找到则返回 null
   */
  async findById(id: string): Promise<NewsCategory | null> {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
      const rows = await query(sql, [id]);
      if (rows.length === 0) return null;
      return this.fromRow(rows[0]);
    } catch (error) {
      logger.error('根据ID获取新闻分类失败:', error);
      throw error;
    }
  }

  /**
   * 根据 slug 查找分类
   * @param slug 分类 URL 标识符
   * @returns 找到的分类，未找到则返回 null
   */
  async findBySlug(slug: string): Promise<NewsCategory | null> {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE slug = ?`;
      const rows = await query(sql, [slug]);
      if (rows.length === 0) return null;
      return this.fromRow(rows[0]);
    } catch (error) {
      logger.error('根据slug获取新闻分类失败:', error);
      throw error;
    }
  }

  /**
   * 创建新闻分类
   * @param data 分类创建数据
   * @returns 新创建的分类
   */
  async create(data: NewsCategoryCreateInput): Promise<NewsCategory> {
    try {
      const slug = data.slug || this.generateSlug(data.name);
      const sql = `
        INSERT INTO ${this.tableName} (name, slug, description, sort_order, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, ?, ?)
      `;
      const now = new Date().toISOString();
      const result = await execute(sql, [
        data.name, slug, data.description || null, data.sortOrder || 0, now, now,
      ]);
      return this.findById(String(result.lastInsertRowid)) as Promise<NewsCategory>;
    } catch (error) {
      logger.error('创建新闻分类失败:', error);
      throw error;
    }
  }

  /**
   * 更新新闻分类
   * @param id   分类 ID
   * @param data 需要更新的字段
   * @returns 更新后的分类
   */
  async update(id: string, data: NewsCategoryUpdateInput): Promise<NewsCategory> {
    try {
      const fields: string[] = [];
      const params: any[] = [];

      if (data.name !== undefined) { fields.push('name = ?'); params.push(data.name); }
      if (data.slug !== undefined) { fields.push('slug = ?'); params.push(data.slug); }
      if (data.description !== undefined) { fields.push('description = ?'); params.push(data.description); }
      if (data.sortOrder !== undefined) { fields.push('sort_order = ?'); params.push(data.sortOrder); }
      if (data.isActive !== undefined) { fields.push('is_active = ?'); params.push(data.isActive ? 1 : 0); }

      if (fields.length === 0) return this.findById(id) as Promise<NewsCategory>;

      fields.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(id);

      const sql = `UPDATE ${this.tableName} SET ${fields.join(', ')} WHERE id = ?`;
      await execute(sql, params);
      return this.findById(id) as Promise<NewsCategory>;
    } catch (error) {
      logger.error('更新新闻分类失败:', error);
      throw error;
    }
  }

  /**
   * 删除新闻分类
   * @param id 分类 ID
   * @returns 是否删除成功
   */
  async delete(id: string): Promise<boolean> {
    try {
      const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
      const result = await execute(sql, [id]);
      return result.changes > 0;
    } catch (error) {
      logger.error('删除新闻分类失败:', error);
      throw error;
    }
  }

  /**
   * 检查 slug 是否已存在
   * @param slug       待检查的 slug
   * @param excludeId  排除的分类 ID
   * @returns 是否存在
   */
  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    try {
      let sql = `SELECT 1 FROM ${this.tableName} WHERE slug = ?`;
      const params: any[] = [slug];
      if (excludeId) { sql += ` AND id != ?`; params.push(excludeId); }
      const rows = await query(sql, params);
      return rows.length > 0;
    } catch (error) {
      logger.error('检查分类slug是否存在失败:', error);
      throw error;
    }
  }

  /**
   * 检查分类名称是否已存在
   * @param name       待检查的名称
   * @param excludeId  排除的分类 ID
   * @returns 是否存在
   */
  async nameExists(name: string, excludeId?: string): Promise<boolean> {
    try {
      let sql = `SELECT 1 FROM ${this.tableName} WHERE name = ?`;
      const params: any[] = [name];
      if (excludeId) { sql += ` AND id != ?`; params.push(excludeId); }
      const rows = await query(sql, params);
      return rows.length > 0;
    } catch (error) {
      logger.error('检查分类名称是否存在失败:', error);
      throw error;
    }
  }

  /**
   * 从名称生成 URL 友好 slug
   * @param name 分类名称
   * @returns 生成的 slug
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();
  }
}

/** 导出 NewsCategoryModel 单例实例 */
export const newsCategoryModel = new NewsCategoryModel();
