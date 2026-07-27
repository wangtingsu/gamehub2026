/**
 * ============================================================
 * 评测模板模型 (ReviewTemplateModel)
 * ============================================================
 * 本文件定义评测模板相关的数据结构和操作类。
 * 评测模板用于规范用户撰写评测时的结构，包含章节、评分维度等。
 *
 * 由于该模型不涉及软删除等高级功能，未继承 BaseModel，
 * 而是独立实现自己的 CRUD 方法。
 * ============================================================
 */

import { query, execute } from '../db';
import logger from '../utils/logger';

/**
 * 评测模板接口
 * 定义评测模板的数据结构，包含模板名称、章节、评分维度等
 */
export interface ReviewTemplate {
  id: string;
  /** 模板名称 */
  name: string;
  /** 模板描述 */
  description?: string;
  /** 模板章节内容（JSON 字符串） */
  sections: string;
  /** 默认评分（JSON 字符串） */
  defaultScores?: string;
  /** 评分维度（JSON 字符串） */
  scoreDimensions?: string;
  /** 是否激活 */
  isActive: boolean;
  /** 排序权重 */
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/** 创建评测模板时的输入接口 */
export interface ReviewTemplateCreateInput {
  name: string;
  description?: string;
  sections: string;
  defaultScores?: string;
  scoreDimensions?: string;
  sortOrder?: number;
}

/** 更新评测模板时的输入接口 */
export interface ReviewTemplateUpdateInput {
  name?: string;
  description?: string;
  sections?: string;
  defaultScores?: string;
  scoreDimensions?: string;
  sortOrder?: number;
  isActive?: boolean;
}

/**
 * 评测模板模型类
 *
 * 独立实现 CRUD 操作，未继承 BaseModel。
 * 用于管理评测模板数据（review_templates 表）。
 */
class ReviewTemplateModel {
  /** 数据库表名 */
  protected tableName = 'review_templates';

  /**
   * 将数据库行记录转换为 ReviewTemplate 对象
   * @param row 数据库原始行数据
   * @returns 转换后的模板实例
   */
  protected fromRow(row: any): ReviewTemplate {
    return {
      id: String(row.id),
      name: row.name,
      description: row.description || undefined,
      sections: row.sections,
      defaultScores: row.default_scores || undefined,
      scoreDimensions: row.score_dimensions || undefined,
      isActive: Boolean(row.is_active),
      sortOrder: Number(row.sort_order),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * 获取所有评测模板（按排序权重和名称排序）
   * @returns 模板列表
   */
  async findAll(): Promise<ReviewTemplate[]> {
    try {
      const sql = `SELECT * FROM ${this.tableName} ORDER BY sort_order ASC, name ASC`;
      const rows = await query(sql);
      return rows.map((row: any) => this.fromRow(row));
    } catch (error) {
      logger.error('获取评测模板列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有激活状态的评测模板
   * @returns 激活的模板列表
   */
  async findActive(): Promise<ReviewTemplate[]> {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE is_active = true ORDER BY sort_order ASC, name ASC`;
      const rows = await query(sql);
      return rows.map((row: any) => this.fromRow(row));
    } catch (error) {
      logger.error('获取活跃评测模板失败:', error);
      throw error;
    }
  }

  /**
   * 根据 ID 查找评测模板
   * @param id 模板 ID
   * @returns 找到的模板，未找到则返回 null
   */
  async findById(id: string): Promise<ReviewTemplate | null> {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
      const rows = await query(sql, [id]);
      if (rows.length === 0) return null;
      return this.fromRow(rows[0]);
    } catch (error) {
      logger.error('根据ID获取评测模板失败:', error);
      throw error;
    }
  }

  /**
   * 创建评测模板
   * @param data 模板创建数据
   * @returns 新创建的模板
   */
  async create(data: ReviewTemplateCreateInput): Promise<ReviewTemplate> {
    try {
      const sql = `
        INSERT INTO ${this.tableName} (name, description, sections, default_scores, score_dimensions, sort_order, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      `;
      const now = new Date().toISOString();
      const result = await execute(sql, [
        data.name,
        data.description || null,
        data.sections,
        data.defaultScores || null,
        data.scoreDimensions || null,
        data.sortOrder || 0,
        now,
        now,
      ]);
      return this.findById(String(result.lastInsertRowid)) as Promise<ReviewTemplate>;
    } catch (error) {
      logger.error('创建评测模板失败:', error);
      throw error;
    }
  }

  /**
   * 更新评测模板
   * @param id   模板 ID
   * @param data 需要更新的字段
   * @returns 更新后的模板
   */
  async update(id: string, data: ReviewTemplateUpdateInput): Promise<ReviewTemplate> {
    try {
      const fields: string[] = [];
      const params: any[] = [];

      if (data.name !== undefined) { fields.push('name = ?'); params.push(data.name); }
      if (data.description !== undefined) { fields.push('description = ?'); params.push(data.description); }
      if (data.sections !== undefined) { fields.push('sections = ?'); params.push(data.sections); }
      if (data.defaultScores !== undefined) { fields.push('default_scores = ?'); params.push(data.defaultScores); }
      if (data.scoreDimensions !== undefined) { fields.push('score_dimensions = ?'); params.push(data.scoreDimensions); }
      if (data.sortOrder !== undefined) { fields.push('sort_order = ?'); params.push(data.sortOrder); }
      if (data.isActive !== undefined) { fields.push('is_active = ?'); params.push(data.isActive ? 1 : 0); }

      if (fields.length === 0) return this.findById(id) as Promise<ReviewTemplate>;

      fields.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(id);

      const sql = `UPDATE ${this.tableName} SET ${fields.join(', ')} WHERE id = ?`;
      await execute(sql, params);
      return this.findById(id) as Promise<ReviewTemplate>;
    } catch (error) {
      logger.error('更新评测模板失败:', error);
      throw error;
    }
  }

  /**
   * 删除评测模板
   * @param id 模板 ID
   * @returns 是否删除成功
   */
  async delete(id: string): Promise<boolean> {
    try {
      const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
      const result = await execute(sql, [id]);
      return result.changes > 0;
    } catch (error) {
      logger.error('删除评测模板失败:', error);
      throw error;
    }
  }
}

/** 导出 ReviewTemplateModel 单例实例 */
export const reviewTemplateModel = new ReviewTemplateModel();
