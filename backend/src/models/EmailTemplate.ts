/**
 * =============================================================================
 * 邮件模板模型 (EmailTemplate Model)
 * =============================================================================
 *
 * 本文件定义 EmailTemplateModel 类，负责邮件模板数据的持久化操作。
 * 邮件模板用于统一管理系统发送的各种邮件内容（如验证邮件、欢迎邮件、
 * 密码重置邮件等），支持模板变量替换、模板复制、搜索筛选以及使用统计
 * 等功能。
 *
 * 主要功能：
 * - 邮件模板的 CRUD（创建、读取、更新、删除）操作
 * - 按模板类型/名称查找模板
 * - 模板变量的替换与校验
 * - 模板的激活/停用管理
 * - 模板复制与搜索
 * - 模板使用统计
 *
 * @module models/EmailTemplate
 */

import { BaseModel } from './BaseModel';
import {
  EmailTemplate,
  EmailTemplateCreateInput,
  EmailTemplateUpdateInput,
} from '../types';
import { query } from '../db';
import logger from '../utils/logger';

/**
 * 邮件模板模型类
 *
 * 继承自 BaseModel，提供对 email_templates 表的数据库操作。
 * 该类支持软删除（soft delete）、乐观锁（optimistic locking）和
 * 审计日志（audit logging）功能，确保数据的安全性和可追溯性。
 *
 * @template EmailTemplate - 邮件模板的完整数据类型
 * @template EmailTemplateCreateInput - 创建邮件模板时的输入数据类型
 * @template EmailTemplateUpdateInput - 更新邮件模板时的输入数据类型
 *
 * @example
 * // 创建新模板
 * const template = await emailTemplateModel.create({
 *   name: '欢迎邮件',
 *   templateType: 'welcome',
 *   subject: '欢迎加入 GameHub！',
 *   body: '亲爱的 {{username}}，感谢您的注册...',
 *   variables: ['username'],
 * });
 *
 * @example
 * // 渲染模板
 * const rendered = await emailTemplateModel.renderTemplate(templateId, {
 *   username: '张三',
 * });
 */
export class EmailTemplateModel extends BaseModel<
  EmailTemplate,
  EmailTemplateCreateInput,
  EmailTemplateUpdateInput
> {
  /** 对应的数据库表名 */
  protected tableName = 'email_templates';
  /** 表的主键字段名 */
  protected primaryKey = 'id';

  /* 启用软删除：删除时仅标记 deleted_at，不真正删除数据 */
  protected softDeleteEnabled = true;
  /* 启用乐观锁：通过 version 字段防止并发更新冲突 */
  protected optimisticLockEnabled = true;
  /* 启用审计日志：自动记录数据变更的操作人和操作时间 */
  protected auditEnabled = true;

  /**
   * 将数据库查询结果行转换为 EmailTemplate 业务对象
   *
   * 该方法负责将数据库中的原始行数据（包含下划线命名和 JSON 字符串字段）
   * 映射为符合 TypeScript 类型定义的 EmailTemplate 对象（使用驼峰命名）。
   * 特别处理 variables 字段的 JSON 解析以及时间字段的 Date 对象转换。
   *
   * @param row - 从数据库查询到的原始行数据
   * @returns 转换后的 EmailTemplate 业务对象
   */
  protected fromRow(row: any): EmailTemplate {
    // 解析 JSON 字段：variables 可能是 JSON 字符串或已解析的数组
    const variables = row.variables
      ? (typeof row.variables === 'string'
          ? JSON.parse(row.variables)
          : row.variables)
      : [];

    return {
      id: String(row.id),                              // 主键，统一转为字符串
      name: row.name,                                   // 模板名称
      description: row.description || undefined,        // 模板描述（可选）
      templateType: row.template_type as                // 模板类型（枚举）
        'verification' | 'welcome' | 'password_reset' | 'newsletter' | 'promotional' | 'notification',
      subject: row.subject,                             // 邮件主题
      body: row.body,                                   // 邮件正文
      variables,                                        // 模板变量列表
      isActive: Boolean(row.is_active),                 // 是否激活
      version: row.version_string || '1.0.0',           // 版本号
      createdBy: row.created_by || undefined,           // 创建人
      createdAt: new Date(row.created_at),              // 创建时间
      updatedAt: new Date(row.updated_at),              // 更新时间
      updatedBy: row.updated_by || undefined,           // 最后更新人
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined, // 软删除时间
    };
  }

  /**
   * 将 EmailTemplateCreateInput 业务对象转换为数据库行格式
   *
   * 将创建模板时的输入数据转换为数据库可存储的格式，
   * 包括驼峰命名到下划线命名的映射、JSON 序列化、
   * 默认值设置等。
   *
   * @param data - 创建邮件模板的输入数据
   * @returns 适合数据库插入的行数据对象
   */
  protected toRow(data: EmailTemplateCreateInput): any {
    return {
      name: data.name,                                  // 模板名称
      description: data.description || null,             // 模板描述
      template_type: data.templateType,                  // 模板类型
      subject: data.subject,                             // 邮件主题
      body: data.body,                                   // 邮件正文
      variables: JSON.stringify(data.variables || []),   // 模板变量（JSON 序列化）
      is_active: 1,                                      // 默认激活
      version_string: '1.0.0',                           // 初始版本号
      created_by: null,                                  // 创建人（需在 service 层设置）
      created_at: new Date().toISOString(),               // 创建时间
      updated_at: new Date().toISOString(),               // 更新时间
      updated_by: null,                                   // 更新人
      deleted_at: null,                                   // 软删除标记
      version: 1,                                         // 乐观锁版本号
    };
  }

  /**
   * 根据模板类型查找模板
   *
   * 按指定的模板类型从数据库中检索匹配的邮件模板。
   * 可选择仅返回激活状态的模板，结果按名称升序排列。
   *
   * @param templateType - 模板类型，如 'verification'、'welcome'、'password_reset' 等
   * @param activeOnly - 是否仅返回激活状态的模板，默认为 true
   * @returns 匹配的邮件模板数组
   * @throws 数据库查询失败时抛出错误
   *
   * @example
   * const templates = await emailTemplateModel.findByType('welcome');
   * const allTemplates = await emailTemplateModel.findByType('promotional', false);
   */
  async findByType(
    templateType: EmailTemplate['templateType'],
    activeOnly: boolean = true
  ): Promise<EmailTemplate[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE template_type = ?`;
      const params: any[] = [templateType];

      if (activeOnly) {
        sql += ` AND is_active = 1`;
      }

      sql += ` ORDER BY name ASC`;

      const rows = await query(sql, params);
      return rows.map((row: any) => this.fromRow(row));
    } catch (error) {
      logger.error(`根据类型查找邮件模板失败 (${templateType}):`, error);
      throw error;
    }
  }

  /**
   * 根据模板名称查找单个模板
   *
   * @param name - 模板名称（必须精确匹配）
   * @returns 找到的邮件模板对象，未找到时返回 null
   *
   * @example
   * const template = await emailTemplateModel.findByName('欢迎邮件');
   */
  async findByName(name: string): Promise<EmailTemplate | null> {
    return this.findOne('name = ?', [name]);
  }

  /**
   * 获取所有激活状态的模板列表
   *
   * 查询所有 is_active = 1 的模板，结果按模板类型和名称排序。
   *
   * @returns 激活的邮件模板数组
   */
  async getActiveTemplates(): Promise<EmailTemplate[]> {
    return this.findAll({
      where: 'is_active = 1',
      orderBy: 'template_type, name',
      orderDirection: 'ASC',
    });
  }

  /**
   * 设置模板的激活/停用状态
   *
   * 用于启用或禁用某个邮件模板。停用的模板将不会在发送邮件时被使用。
   *
   * @param templateId - 目标模板的唯一标识符
   * @param isActive - true 表示激活，false 表示停用
   * @returns 操作成功返回 true，否则返回 false
   * @throws 数据库更新失败时抛出错误
   */
  async setActiveStatus(templateId: string, isActive: boolean): Promise<boolean> {
    try {
      const result = await this.update(templateId, { isActive });
      return result !== null;
    } catch (error) {
      logger.error('设置模板激活状态失败:', error);
      throw error;
    }
  }

  /**
   * 渲染邮件模板（简单变量替换）
   *
   * 将模板中的占位符（如 {{username}}）替换为实际的值。
   * 仅对激活状态的模板进行渲染，未激活或未找到时返回 null。
   *
   * @param templateId - 模板的唯一标识符
   * @param variables - 变量名到变量值的映射对象
   * @returns 渲染后的邮件主题和正文，失败时返回 null
   * @throws 数据库查询失败或渲染异常时抛出错误
   *
   * @example
   * const result = await emailTemplateModel.renderTemplate('id', {
   *   username: '张三',
   *   year: '2026',
   * });
   * // result = { subject: '欢迎张三加入 GameHub', body: '亲爱的张三...' }
   */
  async renderTemplate(
    templateId: string,
    variables: Record<string, string>
  ): Promise<{ subject: string; body: string } | null> {
    try {
      const template = await this.findById(templateId);
      if (!template || !template.isActive) {
        return null;
      }

      let subject = template.subject;
      let body = template.body;

      // 简单变量替换：遍历所有变量，将 {{key}} 替换为实际值
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        subject = subject.replace(new RegExp(placeholder, 'g'), value);
        body = body.replace(new RegExp(placeholder, 'g'), value);
      }

      return { subject, body };
    } catch (error) {
      logger.error('渲染邮件模板失败:', error);
      throw error;
    }
  }

  /**
   * 验证提供的变量是否匹配模板定义的变量列表
   *
   * 检查调用方提供的变量与模板定义所需的变量是否一致，
   * 返回缺少的变量和多余的变量列表，方便调用方定位问题。
   *
   * @param templateId - 模板的唯一标识符
   * @param variables - 调用方提供的变量键值对
   * @returns 验证结果，包含：
   *   - valid: 是否完全匹配（无缺失、无多余）
   *   - missing: 模板定义但未提供的变量名列表
   *   - extra: 提供但模板未定义的变量名列表
   * @throws 数据库查询失败时抛出错误
   */
  async validateVariables(
    templateId: string,
    variables: Record<string, string>
  ): Promise<{ valid: boolean; missing: string[]; extra: string[] }> {
    try {
      const template = await this.findById(templateId);
      if (!template) {
        return { valid: false, missing: [], extra: [] };
      }

      const definedVariables = template.variables || [];
      const providedKeys = Object.keys(variables);

      // 找出模板需要但未提供的变量
      const missing = definedVariables.filter(v => !providedKeys.includes(v));
      // 找出提供但模板未定义的变量
      const extra = providedKeys.filter(v => !definedVariables.includes(v));

      return {
        valid: missing.length === 0 && extra.length === 0,
        missing,
        extra,
      };
    } catch (error) {
      logger.error('验证模板变量失败:', error);
      throw error;
    }
  }

  /**
   * 复制已有模板为新模板
   *
   * 基于指定的模板创建一个新的模板副本，可指定新模板的名称。
   * 新模板默认激活，版本号重置为 1.0.0。
   * 如果新名称已存在，则抛出异常。
   *
   * @param templateId - 要复制的源模板标识符
   * @param newName - 新模板的名称（必须与现有模板名称不重复）
   * @returns 新创建的模板对象，源模板不存在时返回 null
   * @throws 当新模板名称已存在时抛出错误
   * @throws 数据库操作失败时抛出错误
   */
  async duplicateTemplate(
    templateId: string,
    newName: string
  ): Promise<EmailTemplate | null> {
    try {
      const template = await this.findById(templateId);
      if (!template) {
        return null;
      }

      // 检查名称是否已存在，避免重复
      const existing = await this.findByName(newName);
      if (existing) {
        throw new Error(`模板名称 "${newName}" 已存在`);
      }

      // 基于源模板创建新模板
      const newTemplate = await this.create({
        name: newName,
        description: template.description ? `${template.description} (副本)` : '副本',
        templateType: template.templateType,
        subject: template.subject,
        body: template.body,
        variables: template.variables,
      });

      return newTemplate;
    } catch (error) {
      logger.error('复制邮件模板失败:', error);
      throw error;
    }
  }

  /**
   * 获取模板使用统计数据
   *
   * 统计系统中邮件模板的整体使用情况，包括：
   * - 模板总数（未软删除）
   * - 激活模板数量
   * - 按模板类型分组的数量统计
   *
   * @returns 统计结果对象
   * @throws 数据库查询失败时抛出错误
   */
  async getTemplateStats(): Promise<{
    total: number;
    active: number;
    byType: Record<string, number>;
  }> {
    try {
      // 查询模板总数
      const totalResult = await query(
        'SELECT COUNT(*) as count FROM email_templates WHERE deleted_at IS NULL'
      );
      const total = totalResult[0]?.count || 0;

      // 查询激活状态模板数
      const activeResult = await query(
        'SELECT COUNT(*) as count FROM email_templates WHERE is_active = 1 AND deleted_at IS NULL'
      );
      const active = activeResult[0]?.count || 0;

      // 按模板类型分组统计
      const typeResult = await query(`
        SELECT template_type, COUNT(*) as count
        FROM email_templates
        WHERE deleted_at IS NULL
        GROUP BY template_type
      `);

      const byType: Record<string, number> = {};
      typeResult.forEach((row: any) => {
        byType[row.template_type] = row.count;
      });

      return {
        total: Number(total),
        active: Number(active),
        byType,
      };
    } catch (error) {
      logger.error('获取模板统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 搜索邮件模板
   *
   * 支持按关键字搜索（匹配模板名称、描述和主题），
   * 同时支持按模板类型和激活状态进行筛选，并支持分页。
   *
   * @param queryText - 搜索关键词，用于模糊匹配 name、description、subject 字段
   * @param filters - 可选的筛选条件
   * @param filters.templateType - 按模板类型精确筛选
   * @param filters.isActive - 按激活状态筛选
   * @param options - 分页选项
   * @param options.limit - 每页返回数量
   * @param options.offset - 偏移量（跳过的记录数）
   * @returns 符合条件的邮件模板数组
   * @throws 数据库查询失败时抛出错误
   *
   * @example
   * // 搜索包含"欢迎"的激活验证模板
   * const results = await emailTemplateModel.searchTemplates(
   *   '欢迎',
   *   { templateType: 'verification', isActive: true },
   *   { limit: 10, offset: 0 }
   * );
   */
  async searchTemplates(
    queryText?: string,
    filters?: {
      templateType?: string;
      isActive?: boolean;
    },
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<EmailTemplate[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName}`;
      const params: any[] = [];
      const conditions: string[] = [];

      // 软删除过滤：只查询未删除的记录
      if (this.softDeleteEnabled) {
        conditions.push('deleted_at IS NULL');
      }

      // 文本搜索：模糊匹配名称、描述和主题
      if (queryText) {
        conditions.push(`(name LIKE ? OR description LIKE ? OR subject LIKE ?)`);
        params.push(`%${queryText}%`, `%${queryText}%`, `%${queryText}%`);
      }

      // 按模板类型筛选
      if (filters?.templateType) {
        conditions.push(`template_type = ?`);
        params.push(filters.templateType);
      }

      // 按激活状态筛选
      if (filters?.isActive !== undefined) {
        conditions.push(`is_active = ?`);
        params.push(filters.isActive ? 1 : 0);
      }

      // 构建 WHERE 子句
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }

      // 排序：默认按模板类型和名称升序
      sql += ` ORDER BY template_type, name ASC`;

      // 分页支持
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
      logger.error('搜索邮件模板失败:', error);
      throw error;
    }
  }

  /**
   * 创建邮件模板（重写父类的 create 方法）
   *
   * 在父类 create 方法基础上增加了对 createdBy 参数的支持，
   * 用于在创建时记录创建者信息，便于审计追踪。
   *
   * @param data - 创建邮件模板的输入数据
   * @param options - 可选参数
   * @param options.userId - 创建者的用户 ID，将记录到 created_by 字段
   * @returns 创建成功的邮件模板对象
   * @throws 数据库操作失败时抛出错误
   */
  async create(
    data: EmailTemplateCreateInput,
    options?: {
      userId?: string | number;
    }
  ): Promise<EmailTemplate> {
    // 设置创建者信息（如有提供）
    const createData = { ...data };
    if (options?.userId) {
      (createData as any).createdBy = options.userId;
    }

    return super.create(createData, options);
  }
}

/** 导出单例实例，供全局使用 */
export const emailTemplateModel = new EmailTemplateModel();
