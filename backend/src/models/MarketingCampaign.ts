/**
 * 营销活动模型 (MarketingCampaignModel)
 *
 * 本文件定义了营销活动的数据访问层模型，继承自 BaseModel 基类。
 * 负责营销活动（如新闻通讯、促销、公告、新用户引导等）的
 * 数据库 CRUD 操作、状态管理、统计信息聚合以及搜索筛选功能。
 *
 * 支持的营销活动类型:
 * - newsletter (新闻通讯)
 * - promotion (促销活动)
 * - announcement (公告)
 * - onboarding (新用户引导)
 *
 * 活动状态流转: draft -> scheduled -> sending -> sent / cancelled / failed
 */

import { BaseModel } from './BaseModel';
import {
  MarketingCampaign,
  MarketingCampaignCreateInput,
  MarketingCampaignUpdateInput,
} from '../types';
import { query } from '../db';
import logger from '../utils/logger';

/**
 * 营销活动模型类
 *
 * 提供营销活动的完整生命周期管理，包括创建、状态更新、统计追踪、
 * 按状态/类型/日期范围搜索，以及全局汇总统计等功能。
 * 默认启用软删除、乐观锁和审计日志。
 *
 * @template MarketingCampaign - 活动记录类型
 * @template MarketingCampaignCreateInput - 创建输入类型
 * @template MarketingCampaignUpdateInput - 更新输入类型
 */
export class MarketingCampaignModel extends BaseModel<
  MarketingCampaign,
  MarketingCampaignCreateInput,
  MarketingCampaignUpdateInput
> {
  /** 数据库表名 */
  protected tableName = 'marketing_campaigns';

  /** 主键字段名 */
  protected primaryKey = 'id';

  /** 启用软删除：删除记录时标记 deleted_at 而非物理删除 */
  protected softDeleteEnabled = true;

  /** 启用乐观锁：通过 version 字段防止并发更新冲突 */
  protected optimisticLockEnabled = true;

  /** 启用审计日志：记录数据变更历史 */
  protected auditEnabled = true;

  /**
   * 将数据库行记录转换为 MarketingCampaign 领域对象
   *
   * 负责将从数据库查询出的原始行数据，经过 JSON 字段解析和类型转换，
   * 组装成上层业务逻辑可用的 MarketingCampaign 对象。
   * 处理的 JSON 字段包括：targetAudience（目标受众）、content（内容）、
   * schedule（调度计划）、stats（统计数据）。
   *
   * @param row - 从数据库查询出的原始行数据（可能包含 JSON 字符串字段）
   * @returns 转换后的 MarketingCampaign 对象
   */
  protected fromRow(row: any): MarketingCampaign {
    // 解析目标受众配置：用户分组、用户ID列表、筛选条件
    const targetAudience = row.target_audience
      ? (typeof row.target_audience === 'string'
          ? JSON.parse(row.target_audience)
          : row.target_audience)
      : { userSegments: [], userIds: [], filters: {} };

    // 解析活动内容：邮件主题和正文
    const content = row.content
      ? (typeof row.content === 'string'
          ? JSON.parse(row.content)
          : row.content)
      : { subject: '', body: '' };

    // 解析调度计划：发送时间和时区
    const schedule = row.schedule
      ? (typeof row.schedule === 'string'
          ? JSON.parse(row.schedule)
          : row.schedule)
      : { sendAt: new Date(), timezone: 'UTC' };

    // 解析统计数据：收件人、发送、送达、打开、点击、退信、退订、投诉
    const stats = row.stats
      ? (typeof row.stats === 'string'
          ? JSON.parse(row.stats)
          : row.stats)
      : {
          totalRecipients: 0,
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
          unsubscribed: 0,
          complaints: 0,
        };

    return {
      id: String(row.id),
      name: row.name,
      description: row.description || undefined,
      campaignType: row.campaign_type as 'newsletter' | 'promotion' | 'announcement' | 'onboarding',
      targetAudience,
      content,
      schedule,
      status: row.status as 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled' | 'failed',
      stats,
      createdBy: String(row.created_by),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
      version: row.version ? Number(row.version) : 1,
    };
  }

  /**
   * 将 MarketingCampaignCreateInput 转换为数据库行记录
   *
   * 将上层业务传入的创建数据，经过字段映射和 JSON 序列化，
   * 转换为数据库可存储的扁平化行记录格式。
   * 新创建的活动默认状态为 "draft"（草稿），并初始化空统计数据。
   *
   * @param data - 创建营销活动所需的输入数据
   * @returns 数据库行记录对象，包含所有必填字段的默认值
   */
  protected toRow(data: MarketingCampaignCreateInput): any {
    return {
      name: data.name,
      description: data.description || null,
      campaign_type: data.campaignType,
      target_audience: JSON.stringify(data.targetAudience),
      content: JSON.stringify(data.content),
      schedule: JSON.stringify(data.schedule),
      status: 'draft',
      stats: JSON.stringify({
        totalRecipients: 0,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        unsubscribed: 0,
        complaints: 0,
      }),
      created_by: data.createdBy || '0', // 默认系统创建
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      version: 1,
    };
  }

  /**
   * 创建营销活动（重写父类 create 方法）
   *
   * 在父类 create 方法基础上，增加了对创建者（userId）参数的支持。
   * 如果传入了 userId，会将其注入到创建数据中，以便记录活动的创建人。
   *
   * @param data - 营销活动创建输入数据
   * @param options - 可选配置项
   * @param options.userId - 创建者的用户ID，将设置为活动的 createdBy 字段
   * @returns 创建成功的 MarketingCampaign 对象
   */
  async create(
    data: MarketingCampaignCreateInput,
    options?: {
      userId?: string | number;
    }
  ): Promise<MarketingCampaign> {
    // 设置创建者
    const createData = { ...data };
    if (options?.userId) {
      (createData as any).createdBy = options.userId;
    }

    return super.create(createData, options);
  }

  /**
   * 根据状态查找营销活动
   *
   * 按活动状态（如 draft、scheduled、sent 等）进行筛选，
   * 结果按创建时间倒序排列，支持分页。
   *
   * @param status - 营销活动状态值
   * @param limit - 可选，返回记录数上限
   * @param offset - 可选，分页偏移量
   * @returns 匹配状态条件的营销活动数组
   */
  async findByStatus(
    status: MarketingCampaign['status'],
    limit?: number,
    offset?: number
  ): Promise<MarketingCampaign[]> {
    return this.findAll({
      where: 'status = ?',
      params: [status],
      orderBy: 'created_at',
      orderDirection: 'DESC',
      limit,
      offset,
    });
  }

  /**
   * 获取待发送的营销活动
   *
   * 查询所有状态为 "scheduled"（已调度）且调度时间已到当前时间的活动，
   * 按调度时间升序排列，通常由定时任务调度器调用，用于触发实际发送流程。
   *
   * @param limit - 每次最多获取的记录数，默认 10 条
   * @returns 待发送的营销活动数组
   */
  async getPendingCampaigns(limit: number = 10): Promise<MarketingCampaign[]> {
    try {
      const now = new Date().toISOString();
      const sql = `
        SELECT * FROM ${this.tableName}
        WHERE status = 'scheduled'
          AND JSON_EXTRACT(schedule, '$.sendAt') <= ?
          AND deleted_at IS NULL
        ORDER BY JSON_EXTRACT(schedule, '$.sendAt') ASC
        LIMIT ?
      `;
      const rows = await query(sql, [now, limit]);
      return rows.map((row: any) => this.fromRow(row));
    } catch (error) {
      logger.error('获取待发送营销活动失败:', error);
      throw error;
    }
  }

  /**
   * 更新营销活动状态
   *
   * 修改指定营销活动的状态字段，用于活动生命周期流转。
   * 典型调用场景：从 "scheduled" -> "sending" -> "sent"，
   * 或活动取消时设置为 "cancelled"。
   *
   * @param campaignId - 营销活动的唯一标识
   * @param status - 目标状态值
   * @returns 更新成功返回 true，失败返回 false
   */
  async updateStatus(
    campaignId: string,
    status: MarketingCampaign['status']
  ): Promise<boolean> {
    try {
      const result = await this.update(campaignId, { status });
      return result !== null;
    } catch (error) {
      logger.error('更新营销活动状态失败:', error);
      throw error;
    }
  }

  /**
   * 更新营销活动统计信息
   *
   * 合并式更新指定活动的统计数据，不会覆盖已有统计项。
   * 例如：发送后更新 sent 和 delivered 计数，打开邮件后更新 opened 计数。
   *
   * @param campaignId - 营销活动的唯一标识
   * @param stats - 需要更新的统计字段（部分更新，非全覆盖）
   * @returns 更新成功返回 true，活动不存在或更新失败返回 false
   */
  async updateStats(
    campaignId: string,
    stats: Partial<MarketingCampaign['stats']>
  ): Promise<boolean> {
    try {
      const campaign = await this.findById(campaignId);
      if (!campaign) {
        return false;
      }

      // 合并统计信息：保留原有统计，用新值覆盖或补充
      const mergedStats = { ...campaign.stats, ...stats };
      const result = await this.update(campaignId, { stats: mergedStats });
      return result !== null;
    } catch (error) {
      logger.error('更新营销活动统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取营销活动统计数据
   *
   * 查询指定活动的完整统计对象，包含发送、送达、打开率等指标。
   *
   * @param campaignId - 营销活动的唯一标识
   * @returns 活动的统计数据对象，若活动不存在则返回 null
   */
  async getCampaignStats(campaignId: string): Promise<MarketingCampaign['stats'] | null> {
    try {
      const campaign = await this.findById(campaignId);
      return campaign?.stats || null;
    } catch (error) {
      logger.error('获取营销活动统计数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有营销活动的汇总统计
   *
   * 聚合计算全局营销活动运营指标，包括：
   * - 总活动数（按状态和类型分别统计）
   * - 总发送量和总收件人数
   * - 平均打开率（打开数/收件人数）
   * - 平均点击率（点击数/收件人数）
   *
   * @returns 汇总统计对象，包含总量、比率和分类统计
   */
  async getOverallStats(): Promise<{
    totalCampaigns: number;
    totalSent: number;
    totalRecipients: number;
    averageOpenRate: number;
    averageClickRate: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
  }> {
    try {
      // 总活动数（排除已软删除的）
      const totalResult = await query(
        'SELECT COUNT(*) as count FROM marketing_campaigns WHERE deleted_at IS NULL'
      );
      const totalCampaigns = totalResult[0]?.count || 0;

      // 按状态统计活动数量
      const statusResult = await query(`
        SELECT status, COUNT(*) as count
        FROM marketing_campaigns
        WHERE deleted_at IS NULL
        GROUP BY status
      `);

      const byStatus: Record<string, number> = {};
      statusResult.forEach((row: any) => {
        byStatus[row.status] = row.count;
      });

      // 按活动类型统计数量
      const typeResult = await query(`
        SELECT campaign_type, COUNT(*) as count
        FROM marketing_campaigns
        WHERE deleted_at IS NULL
        GROUP BY campaign_type
      `);

      const byType: Record<string, number> = {};
      typeResult.forEach((row: any) => {
        byType[row.campaign_type] = row.count;
      });

      // 遍历所有已发送活动，汇总统计指标
      const sentCampaigns = await this.findByStatus('sent');
      let totalSent = 0;
      let totalRecipients = 0;
      let totalOpened = 0;
      let totalClicked = 0;

      sentCampaigns.forEach(campaign => {
        totalSent++;
        totalRecipients += campaign.stats.totalRecipients;
        totalOpened += campaign.stats.opened;
        totalClicked += campaign.stats.clicked;
      });

      // 计算平均打开率和点击率（保留两位小数）
      const averageOpenRate = totalRecipients > 0 ? (totalOpened / totalRecipients) * 100 : 0;
      const averageClickRate = totalRecipients > 0 ? (totalClicked / totalRecipients) * 100 : 0;

      return {
        totalCampaigns: Number(totalCampaigns),
        totalSent,
        totalRecipients,
        averageOpenRate: Number(averageOpenRate.toFixed(2)),
        averageClickRate: Number(averageClickRate.toFixed(2)),
        byStatus,
        byType,
      };
    } catch (error) {
      logger.error('获取营销活动汇总统计失败:', error);
      throw error;
    }
  }

  /**
   * 搜索营销活动
   *
   * 支持按关键词、活动类型、状态、创建者和日期范围进行组合筛选。
   * 关键词同时在活动名称和描述字段中进行模糊匹配。
   * 默认按创建时间倒序排列，支持分页。
   *
   * @param queryText - 可选，搜索关键词（匹配 name 和 description 字段）
   * @param filters - 可选，筛选条件集合
   * @param filters.campaignType - 活动类型筛选
   * @param filters.status - 活动状态筛选
   * @param filters.startDate - 创建时间起始范围
   * @param filters.endDate - 创建时间结束范围
   * @param filters.createdBy - 创建者ID筛选
   * @param options - 可选，分页参数
   * @param options.limit - 每页记录数
   * @param options.offset - 分页偏移量
   * @returns 符合条件的营销活动数组
   */
  async searchCampaigns(
    queryText?: string,
    filters?: {
      campaignType?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
      createdBy?: string;
    },
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<MarketingCampaign[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName}`;
      const params: any[] = [];
      const conditions: string[] = [];

      // 自动排除已软删除的记录
      if (this.softDeleteEnabled) {
        conditions.push('deleted_at IS NULL');
      }

      // 按关键词模糊搜索名称和描述字段
      if (queryText) {
        conditions.push(`(name LIKE ? OR description LIKE ?)`);
        params.push(`%${queryText}%`, `%${queryText}%`);
      }

      // 按活动类型精确筛选
      if (filters?.campaignType) {
        conditions.push(`campaign_type = ?`);
        params.push(filters.campaignType);
      }

      // 按活动状态精确筛选
      if (filters?.status) {
        conditions.push(`status = ?`);
        params.push(filters.status);
      }

      // 按创建者ID精确筛选
      if (filters?.createdBy) {
        conditions.push(`created_by = ?`);
        params.push(filters.createdBy);
      }

      // 按创建时间范围筛选（起始）
      if (filters?.startDate) {
        conditions.push(`created_at >= ?`);
        params.push(filters.startDate.toISOString());
      }

      // 按创建时间范围筛选（截止）
      if (filters?.endDate) {
        conditions.push(`created_at <= ?`);
        params.push(filters.endDate.toISOString());
      }

      // 组合所有筛选条件
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }

      // 默认按创建时间倒序排列（最新在前）
      sql += ` ORDER BY created_at DESC`;

      // 添加分页限制
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
      logger.error('搜索营销活动失败:', error);
      throw error;
    }
  }
}

// 导出单例实例，便于全局复用
export const marketingCampaignModel = new MarketingCampaignModel();
