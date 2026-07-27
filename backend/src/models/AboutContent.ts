/**
 * 关于页面内容模型模块
 *
 * 本模块负责管理"关于我们"页面的所有静态内容数据，
 * 包括横幅区（hero）、使命宣言（mission）、愿景（vision）、
 * 核心价值（values）、团队成员（team members）、
 * 发展历程时间线（timeline）和联系方式（contacts）。
 * 不继承 BaseModel，直接使用数据库查询实现独立的 CRUD 操作。
 * 所有公开 API 的数据通过 getAllData() 方法统一聚合返回。
 */

import { query, execute } from '../db';
import logger from '../utils/logger';

/**
 * 关于页面板块接口
 *
 * 表示关于页面中的一个内容板块（如 Hero、Mission、Vision），
 * 每个板块由唯一的 sectionKey 标识。
 */
export interface AboutSection {
  /** 板块 ID */
  id: number;
  /** 板块标识键（如 'hero', 'mission', 'vision'），用于代码中唯一引用 */
  sectionKey: string;
  /** 板块标题 */
  title: string;
  /** 板块描述文本，可为 null */
  description: string | null;
  /** 板块展示图片 URL，可为 null */
  imageUrl: string | null;
  /** 排序序号，升序排列 */
  sortOrder: number;
  /** 是否启用（1 启用 / 0 禁用） */
  isActive: number;
  /** 记录创建时间 */
  createdAt: string;
  /** 记录更新时间 */
  updatedAt: string;
}

/**
 * 核心价值接口
 *
 * 表示企业的核心价值理念，每个价值包含图标、标题和描述。
 */
export interface AboutValue {
  /** 价值 ID */
  id: number;
  /** 价值对应的图标标识（如 FontAwesome 类名） */
  icon: string;
  /** 价值标题 */
  title: string;
  /** 价值描述文本，可为 null */
  description: string | null;
  /** 排序序号，升序排列 */
  sortOrder: number;
  /** 是否启用（1 启用 / 0 禁用） */
  isActive: number;
}

/**
 * 团队成员接口
 *
 * 表示团队中的一名成员信息，包含姓名、角色和头像。
 */
export interface AboutTeamMember {
  /** 成员 ID */
  id: number;
  /** 成员姓名 */
  name: string;
  /** 成员角色/职位 */
  role: string;
  /** 成员头像 URL，可为 null */
  avatarUrl: string | null;
  /** 成员简介描述，可为 null */
  description: string | null;
  /** 排序序号，升序排列 */
  sortOrder: number;
  /** 是否启用（1 启用 / 0 禁用） */
  isActive: number;
}

/**
 * 发展历程条目接口
 *
 * 表示企业发展历程中的一个时间点记录。
 */
export interface AboutTimeline {
  /** 历程条目 ID */
  id: number;
  /** 年份标识 */
  year: string;
  /** 里程碑标题，可为 null */
  title: string | null;
  /** 里程碑详细描述，可为 null */
  description: string | null;
  /** 排序序号，升序排列 */
  sortOrder: number;
  /** 是否启用（1 启用 / 0 禁用） */
  isActive: number;
}

/**
 * 联系方式接口
 *
 * 表示一种联系途径，如邮箱地址、社交媒体链接等。
 */
export interface AboutContact {
  /** 联系方式 ID */
  id: number;
  /** 联系方式的显示标签（如 '电子邮箱', '微信公众号'） */
  label: string;
  /** 联系方式的具体值（如邮箱地址、链接 URL） */
  value: string;
  /** 排序序号，升序排列 */
  sortOrder: number;
  /** 是否启用（1 启用 / 0 禁用） */
  isActive: number;
}

/**
 * 关于页面全部数据接口
 *
 * 聚合了关于页面的所有内容板块数据，
 * 用于提供给前端 API 一次性返回所有信息。
 */
export interface AboutAllData {
  /** Hero 横幅板块内容 */
  hero: AboutSection | null;
  /** 使命宣言板块内容 */
  mission: AboutSection | null;
  /** 愿景板块内容 */
  vision: AboutSection | null;
  /** 核心价值列表 */
  values: AboutValue[];
  /** 团队成员列表 */
  teamMembers: AboutTeamMember[];
  /** 发展历程时间线列表 */
  timeline: AboutTimeline[];
  /** 联系方式列表 */
  contacts: AboutContact[];
}

/**
 * 数据库行数据转换器集合
 *
 * 包含所有 About 相关数据类型的行记录转换函数，
 * 用于将数据库查询结果的原始行对象转换为类型化的业务对象。
 */
const fromRow = {
  /**
   * 将数据库行转换为 AboutSection 对象
   * @param row - 数据库查询原始行
   */
  section: (row: any): AboutSection => ({
    id: row.id,                         // 板块 ID
    sectionKey: row.section_key,        // 板块标识键
    title: row.title,                   // 板块标题
    description: row.description || null, // 板块描述
    imageUrl: row.image_url || null,    // 板块展示图片
    sortOrder: row.sort_order,          // 排序序号
    isActive: row.is_active,            // 启用状态
    createdAt: row.created_at,          // 创建时间
    updatedAt: row.updated_at,          // 更新时间
  }),

  /**
   * 将数据库行转换为 AboutValue 对象
   * @param row - 数据库查询原始行
   */
  value: (row: any): AboutValue => ({
    id: row.id,                         // 价值 ID
    icon: row.icon,                     // 图标标识
    title: row.title,                   // 价值标题
    description: row.description || null, // 价值描述
    sortOrder: row.sort_order,          // 排序序号
    isActive: row.is_active,            // 启用状态
  }),

  /**
   * 将数据库行转换为 AboutTeamMember 对象
   * @param row - 数据库查询原始行
   */
  teamMember: (row: any): AboutTeamMember => ({
    id: row.id,                         // 成员 ID
    name: row.name,                     // 成员姓名
    role: row.role,                     // 成员角色
    avatarUrl: row.avatar_url || null,  // 头像 URL
    description: row.description || null, // 成员简介
    sortOrder: row.sort_order,          // 排序序号
    isActive: row.is_active,            // 启用状态
  }),

  /**
   * 将数据库行转换为 AboutTimeline 对象
   * @param row - 数据库查询原始行
   */
  timeline: (row: any): AboutTimeline => ({
    id: row.id,                         // 历程条目 ID
    year: row.year,                     // 年份
    title: row.title || null,           // 里程碑标题
    description: row.description || null, // 里程碑描述
    sortOrder: row.sort_order,          // 排序序号
    isActive: row.is_active,            // 启用状态
  }),

  /**
   * 将数据库行转换为 AboutContact 对象
   * @param row - 数据库查询原始行
   */
  contact: (row: any): AboutContact => ({
    id: row.id,                         // 联系方式 ID
    label: row.label,                   // 显示标签
    value: row.value,                   // 具体值（邮箱、链接等）
    sortOrder: row.sort_order,          // 排序序号
    isActive: row.is_active,            // 启用状态
  }),
};

/**
 * 关于页面内容模型
 *
 * 独立的数据访问模型（不继承 BaseModel），
 * 负责管理"关于我们"页面的所有静态内容数据的增删改查操作。
 * 包含五个数据表：about_sections（板块）、about_values（核心价值）、
 * about_team_members（团队成员）、about_timeline（发展历程）、
 * about_contacts（联系方式）。
 * 提供 getAllData() 方法一次性聚合所有数据供前端使用。
 */
export class AboutModel {
  // ======================== 板块管理（Sections） ========================

  /**
   * 获取指定标识的板块内容
   *
   * 根据 sectionKey 查询对应的板块数据（仅返回启用状态的记录）。
   *
   * @param key - 板块标识键（如 'hero', 'mission', 'vision'）
   * @returns 查询到的 AboutSection 对象，未找到或出错时返回 null
   */
  async getSection(key: string): Promise<AboutSection | null> {
    try {
      const rows = await query('SELECT * FROM about_sections WHERE section_key = ? AND is_active = 1', [key]);
      return rows.length ? fromRow.section(rows[0]) : null;
    } catch (error) {
      logger.error('获取关于页面板块失败:', error);
      return null;
    }
  }

  /**
   * 更新指定标识的板块内容
   *
   * 动态构建 SET 子句，仅更新提供了值的字段。
   *
   * @param key - 板块标识键
   * @param data - 要更新的字段对象，支持 title（标题）、description（描述）、imageUrl（图片 URL）
   * @returns 更新成功返回 true，未变更返回 true，更新失败抛出异常
   * @throws 更新操作失败时抛出异常
   */
  async updateSection(key: string, data: { title?: string; description?: string; imageUrl?: string | null }): Promise<boolean> {
    try {
      const fields: string[] = [];
      const params: any[] = [];
      if (data.title !== undefined) { fields.push('title = ?'); params.push(data.title); }
      if (data.description !== undefined) { fields.push('description = ?'); params.push(data.description); }
      if (data.imageUrl !== undefined) { fields.push('image_url = ?'); params.push(data.imageUrl); }
      if (fields.length === 0) return true;
      fields.push('updated_at = NOW()');
      params.push(key);
      const result = await execute(`UPDATE about_sections SET ${fields.join(', ')} WHERE section_key = ?`, params);
      return result.changes > 0;
    } catch (error) {
      logger.error('更新关于页面板块失败:', error);
      throw error;
    }
  }

  // ======================== 核心价值管理（Values） ========================

  /**
   * 获取所有启用的核心价值列表
   *
   * 结果按 sortOrder 升序排列，用于在前端按顺序展示。
   *
   * @returns AboutValue 对象数组，查询失败返回空数组
   */
  async getValues(): Promise<AboutValue[]> {
    try {
      const rows = await query('SELECT * FROM about_values WHERE is_active = 1 ORDER BY sort_order ASC', []);
      return rows.map(fromRow.value);
    } catch (error) {
      logger.error('获取核心价值列表失败:', error);
      return [];
    }
  }

  /**
   * 更新指定核心价值的内容
   *
   * 动态构建 SET 子句，仅更新提供了值的字段。
   *
   * @param id - 核心价值 ID
   * @param data - 要更新的字段对象，支持 icon（图标）、title（标题）、description（描述）
   * @returns 更新成功返回 true，未变更返回 true，更新失败抛出异常
   * @throws 更新操作失败时抛出异常
   */
  async updateValue(id: number, data: { icon?: string; title?: string; description?: string | null }): Promise<boolean> {
    try {
      const fields: string[] = [];
      const params: any[] = [];
      if (data.icon !== undefined) { fields.push('icon = ?'); params.push(data.icon); }
      if (data.title !== undefined) { fields.push('title = ?'); params.push(data.title); }
      if (data.description !== undefined) { fields.push('description = ?'); params.push(data.description); }
      if (fields.length === 0) return true;
      fields.push('updated_at = NOW()');
      params.push(id);
      const result = await execute(`UPDATE about_values SET ${fields.join(', ')} WHERE id = ?`, params);
      return result.changes > 0;
    } catch (error) {
      logger.error('更新核心价值失败:', error);
      throw error;
    }
  }

  // ======================== 团队成员管理（Team Members） ========================

  /**
   * 获取所有启用的团队成员列表
   *
   * 结果按 sortOrder 升序排列。
   *
   * @returns AboutTeamMember 对象数组，查询失败返回空数组
   */
  async getTeamMembers(): Promise<AboutTeamMember[]> {
    try {
      const rows = await query('SELECT * FROM about_team_members WHERE is_active = 1 ORDER BY sort_order ASC', []);
      return rows.map(fromRow.teamMember);
    } catch (error) {
      logger.error('获取团队成员列表失败:', error);
      return [];
    }
  }

  /**
   * 更新指定团队成员的信息
   *
   * 动态构建 SET 子句，仅更新提供了值的字段。
   *
   * @param id - 团队成员 ID
   * @param data - 要更新的字段对象，支持 name（姓名）、role（角色）、avatarUrl（头像）、description（简介）
   * @returns 更新成功返回 true，未变更返回 true，更新失败抛出异常
   * @throws 更新操作失败时抛出异常
   */
  async updateTeamMember(id: number, data: { name?: string; role?: string; avatarUrl?: string | null; description?: string | null }): Promise<boolean> {
    try {
      const fields: string[] = [];
      const params: any[] = [];
      if (data.name !== undefined) { fields.push('name = ?'); params.push(data.name); }
      if (data.role !== undefined) { fields.push('role = ?'); params.push(data.role); }
      if (data.avatarUrl !== undefined) { fields.push('avatar_url = ?'); params.push(data.avatarUrl); }
      if (data.description !== undefined) { fields.push('description = ?'); params.push(data.description); }
      if (fields.length === 0) return true;
      fields.push('updated_at = NOW()');
      params.push(id);
      const result = await execute(`UPDATE about_team_members SET ${fields.join(', ')} WHERE id = ?`, params);
      return result.changes > 0;
    } catch (error) {
      logger.error('更新团队成员失败:', error);
      throw error;
    }
  }

  // ======================== 发展历程管理（Timeline） ========================

  /**
   * 获取所有启用的发展历程列表
   *
   * 结果按 sortOrder 升序排列，按时间线顺序展示企业里程碑。
   *
   * @returns AboutTimeline 对象数组，查询失败返回空数组
   */
  async getTimeline(): Promise<AboutTimeline[]> {
    try {
      const rows = await query('SELECT * FROM about_timeline WHERE is_active = 1 ORDER BY sort_order ASC', []);
      return rows.map(fromRow.timeline);
    } catch (error) {
      logger.error('获取发展历程列表失败:', error);
      return [];
    }
  }

  /**
   * 更新指定发展历程条目的内容
   *
   * 动态构建 SET 子句，仅更新提供了值的字段。
   *
   * @param id - 历程条目 ID
   * @param data - 要更新的字段对象，支持 year（年份）、title（标题）、description（描述）
   * @returns 更新成功返回 true，未变更返回 true，更新失败抛出异常
   * @throws 更新操作失败时抛出异常
   */
  async updateTimeline(id: number, data: { year?: string; title?: string | null; description?: string | null }): Promise<boolean> {
    try {
      const fields: string[] = [];
      const params: any[] = [];
      if (data.year !== undefined) { fields.push('year = ?'); params.push(data.year); }
      if (data.title !== undefined) { fields.push('title = ?'); params.push(data.title); }
      if (data.description !== undefined) { fields.push('description = ?'); params.push(data.description); }
      if (fields.length === 0) return true;
      fields.push('updated_at = NOW()');
      params.push(id);
      const result = await execute(`UPDATE about_timeline SET ${fields.join(', ')} WHERE id = ?`, params);
      return result.changes > 0;
    } catch (error) {
      logger.error('更新发展历程失败:', error);
      throw error;
    }
  }

  // ======================== 联系方式管理（Contacts） ========================

  /**
   * 获取所有启用的联系方式列表
   *
   * 结果按 sortOrder 升序排列。
   *
   * @returns AboutContact 对象数组，查询失败返回空数组
   */
  async getContacts(): Promise<AboutContact[]> {
    try {
      const rows = await query('SELECT * FROM about_contacts WHERE is_active = 1 ORDER BY sort_order ASC', []);
      return rows.map(fromRow.contact);
    } catch (error) {
      logger.error('获取联系方式列表失败:', error);
      return [];
    }
  }

  /**
   * 更新指定联系方式的标签或值
   *
   * 动态构建 SET 子句，仅更新提供了值的字段。
   *
   * @param id - 联系方式 ID
   * @param data - 要更新的字段对象，支持 label（显示标签）、value（具体值）
   * @returns 更新成功返回 true，未变更返回 true，更新失败抛出异常
   * @throws 更新操作失败时抛出异常
   */
  async updateContact(id: number, data: { label?: string; value?: string }): Promise<boolean> {
    try {
      const fields: string[] = [];
      const params: any[] = [];
      if (data.label !== undefined) { fields.push('label = ?'); params.push(data.label); }
      if (data.value !== undefined) { fields.push('value = ?'); params.push(data.value); }
      if (fields.length === 0) return true;
      fields.push('updated_at = NOW()');
      params.push(id);
      const result = await execute(`UPDATE about_contacts SET ${fields.join(', ')} WHERE id = ?`, params);
      return result.changes > 0;
    } catch (error) {
      logger.error('更新联系方式失败:', error);
      throw error;
    }
  }

  // ======================== 聚合查询（Aggregated Data） ========================

  /**
   * 获取关于页面的全部内容数据
   *
   * 并行查询所有子数据表（板块、核心价值、团队成员、发展历程、联系方式），
   * 聚合为一个完整的 AboutAllData 对象返回给前端。
   * 使用 Promise.all 实现并发查询以提高性能。
   *
   * @returns 包含所有关于页面数据的 AboutAllData 对象
   */
  async getAllData(): Promise<AboutAllData> {
    const [hero, mission, vision, values, teamMembers, timeline, contacts] = await Promise.all([
      this.getSection('hero'),      // Hero 横幅板块
      this.getSection('mission'),   // 使命宣言板块
      this.getSection('vision'),    // 愿景板块
      this.getValues(),             // 核心价值列表
      this.getTeamMembers(),        // 团队成员列表
      this.getTimeline(),           // 发展历程时间线
      this.getContacts(),           // 联系方式列表
    ]);
    return { hero, mission, vision, values, teamMembers, timeline, contacts };
  }
}

/** 关于页面内容模型单例实例 */
export const aboutModel = new AboutModel();
