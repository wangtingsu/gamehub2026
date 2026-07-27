/**
 * 内容审核服务
 *
 * 提供多类型内容的审核队列管理，支持对新闻(news)、评测(review)、
 * 社区帖子(community)和指南(guide)四种内容类型进行审核操作。
 * 包含待审核队列获取、审核通过/拒绝、审核统计等功能。
 */

import { query, execute } from '../db';
import logger from '../utils/logger';
import { ReviewStatus } from '../types';
import { createAuditLog } from './audit-log.service';

/**
 * 审核队列项接口
 * 表示一条待审核或已审核的内容记录
 */
export interface ReviewQueueItem {
  id: string;
  type: 'news' | 'review' | 'community' | 'guide';
  title: string;
  content: string;
  authorId: string;
  authorName: string | null;
  reviewStatus: ReviewStatus;
  reviewComment?: string | null;
  createdAt: string;
  submittedAt: string;
}

/**
 * 审核统计接口
 * 表示某一内容类型的各审核状态分布
 */
export interface ReviewStats {
  type: string;
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

/**
 * 受审核的内容类型与数据库表名映射表
 * 用于构建 UNION ALL 查询，统一处理多种内容类型的审核队列
 */
const CONTENT_TABLES = [
  { type: 'news', table: 'news' },
  { type: 'blog', table: 'blog_articles' },
  { type: 'guide', table: 'guides' },
  { type: 'review', table: 'reviews' },
  { type: 'community', table: 'community_posts' },
] as const;

/**
 * 获取待审核/已审核内容队列（分页 + 筛选）
 *
 * 使用 UNION ALL 跨多种内容类型（news、review、community、guide）
 * 查询审核队列，支持按审核状态和内容类型筛选。
 * 关联 users 表获取作者显示名。
 *
 * @param options 查询选项：页码、每页条数、内容类型、审核状态
 * @returns 分页后的审核队列列表及总数
 */
export const getPendingContentQueue = async (options: {
  page?: number;
  limit?: number;
  type?: string;
  status?: ReviewStatus;
}): Promise<{ items: ReviewQueueItem[]; total: number; page: number; limit: number }> => {
  try {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;
    const status = options.status || 'pending';

    // 构建 UNION ALL 查询，遍历 CONTENT_TABLES 为每种类型生成子查询
    const unions = CONTENT_TABLES
      .filter(t => !options.type || t.type === options.type)
      .map(t => {
        // guides 表使用别名 g，其他表使用首字母作为别名
        const withAuthor = t.table === 'guides'
          ? `LEFT JOIN users u ON g.author_id = u.id`
          : `LEFT JOIN users u ON ${t.table[0]}.author_id = u.id`;
        const alias = t.table === 'guides' ? 'g' : t.table[0];
        return `SELECT '${t.type}' AS type, ${alias}.id, ${alias}.title,
                substr(${alias}.content, 1, 200) AS content,
                ${alias}.author_id AS authorId, COALESCE(u.display_name, u.username) AS authorName,
                ${alias}.review_status AS reviewStatus, ${alias}.review_comment AS reviewComment,
                ${alias}.created_at AS createdAt, ${alias}.created_at AS submittedAt
                FROM ${t.table} ${alias}
                ${withAuthor}
                WHERE ${alias}.review_status = ?`;
      })
      .join(' UNION ALL ');

    // 计数查询：在外层包裹 COUNT 子查询
    const countSql = `SELECT COUNT(*) AS total FROM (${unions}) AS combined`;
    // 动态生成与 UNION 子查询数量匹配的 status 参数
    const unionCount = CONTENT_TABLES.filter(t => !options.type || t.type === options.type).length;
    const statusParams = Array(unionCount).fill(status);
    const countResult = await query(countSql, statusParams);
    const total = Number(countResult[0]?.total || 0);

    // 分页数据查询
    const dataSql = `SELECT * FROM (${unions}) AS combined ORDER BY submittedAt DESC LIMIT ? OFFSET ?`;
    const allParams = [
      ...Array(CONTENT_TABLES.filter(t => !options.type || t.type === options.type).length).fill(status),
      limit,
      offset,
    ];
    const rows = await query(dataSql, allParams);

    // 将查询结果映射为 ReviewQueueItem 对象
    const items: ReviewQueueItem[] = rows.map((row: any) => ({
      id: String(row.id),
      type: row.type as ReviewQueueItem['type'],
      title: row.title,
      content: row.content,
      authorId: String(row.authorId),
      authorName: row.authorName || null,
      reviewStatus: (row.reviewStatus || 'pending') as ReviewStatus,
      reviewComment: row.reviewComment || null,
      createdAt: row.createdAt,
      submittedAt: row.submittedAt,
    }));

    return { items, total, page, limit };
  } catch (error) {
    logger.error('获取审核队列失败:', error);
    throw error;
  }
};

/**
 * 审核通过内容
 *
 * 将指定内容的审核状态更新为 approved。
 * 对于 news 和 guides 类型，同时设置 is_published = 1。
 * 操作记录写入审计日志。
 *
 * @param type 内容类型（news/review/community/guide）
 * @param id 内容 ID
 * @param reviewerId 审核人 ID
 * @throws {Error} 未知内容类型时抛出
 */
export const approveContent = async (
  type: string,
  id: string,
  reviewerId: string
): Promise<void> => {
  try {
    const table = CONTENT_TABLES.find(t => t.type === type)?.table;
    if (!table) {
      throw new Error(`未知的内容类型: ${type}`);
    }

    const now = new Date().toISOString();

    // 更新审核状态为 approved，记录审核人和审核时间
    await execute(
      `UPDATE ${table} SET review_status = 'approved', reviewed_by = ?, reviewed_at = ? WHERE id = ?`,
      [reviewerId, now, id]
    );

    // 新闻、博客、指南通过后同时发布（设为可见状态）
    if (table === 'news' || table === 'blog_articles' || table === 'guides') {
      await execute(
        `UPDATE ${table} SET is_published = true WHERE id = ? AND review_status = 'approved'`,
        [id]
      );
    }

    // 记录审计日志
    await createAuditLog({
      userId: reviewerId,
      action: 'content.approve',
      resourceType: type,
      resourceId: id,
      details: { reviewStatus: 'approved' },
    });

    logger.info(`内容审核通过: type=${type}, id=${id}, reviewer=${reviewerId}`);
  } catch (error) {
    logger.error(`审核通过失败: type=${type}, id=${id}`, error);
    throw error;
  }
};

/**
 * 审核拒绝内容
 *
 * 将指定内容的审核状态更新为 rejected，附带拒绝原因。
 * 操作记录写入审计日志。
 *
 * @param type 内容类型（news/review/community/guide）
 * @param id 内容 ID
 * @param reviewerId 审核人 ID
 * @param comment 拒绝原因说明
 * @throws {Error} 未知内容类型时抛出
 */
export const rejectContent = async (
  type: string,
  id: string,
  reviewerId: string,
  comment: string
): Promise<void> => {
  try {
    const table = CONTENT_TABLES.find(t => t.type === type)?.table;
    if (!table) {
      throw new Error(`未知的内容类型: ${type}`);
    }

    const now = new Date().toISOString();

    // 更新审核状态为 rejected，附带拒绝评论
    await execute(
      `UPDATE ${table} SET review_status = 'rejected', review_comment = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?`,
      [comment, reviewerId, now, id]
    );

    // 记录审计日志
    await createAuditLog({
      userId: reviewerId,
      action: 'content.reject',
      resourceType: type,
      resourceId: id,
      details: { reviewStatus: 'rejected', reviewComment: comment },
    });

    logger.info(`内容审核拒绝: type=${type}, id=${id}, reviewer=${reviewerId}, comment=${comment}`);
  } catch (error) {
    logger.error(`审核拒绝失败: type=${type}, id=${id}`, error);
    throw error;
  }
};

/**
 * 获取各类内容的审核统计
 *
 * 统计每种内容类型（news/review/community/guide）的
 * 待审核(pending)、已通过(approved)、已拒绝(rejected)数量，
 * 并按类型分组返回。
 *
 * @returns 各类内容的审核统计数组
 */
export const getReviewStats = async (): Promise<ReviewStats[]> => {
  try {
    // 构建 UNION ALL 查询获取所有内容的审核状态
    const unions = CONTENT_TABLES
      .map(t => {
        const alias = t.table === 'guides' ? 'g' : t.table[0];
        return `SELECT '${t.type}' AS type, ${alias}.review_status AS review_status
                FROM ${t.table} ${alias}`;
      })
      .join(' UNION ALL ');

    const sql = `
      SELECT type, review_status, COUNT(*) AS count
      FROM (${unions}) AS combined
      GROUP BY type, review_status
      ORDER BY type, review_status
    `;

    const rows = await query(sql);

    // 初始化各类型的统计对象
    const statsMap: Record<string, ReviewStats> = {};
    for (const t of CONTENT_TABLES) {
      statsMap[t.type] = { type: t.type, pending: 0, approved: 0, rejected: 0, total: 0 };
    }

    // 遍历分组结果填充统计数据
    for (const row of rows) {
      const stat = statsMap[row.type];
      if (stat) {
        const status = row.review_status as ReviewStatus;
        if (status === 'pending') stat.pending = Number(row.count);
        else if (status === 'approved') stat.approved = Number(row.count);
        else if (status === 'rejected') stat.rejected = Number(row.count);
        stat.total = stat.pending + stat.approved + stat.rejected;
      }
    }

    return Object.values(statsMap);
  } catch (error) {
    logger.error('获取审核统计失败:', error);
    throw error;
  }
};
