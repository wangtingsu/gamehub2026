/**
 * 点赞服务
 * 提供统一的点赞/取消点赞功能，支持多种目标类型（评测、新闻、社区帖子、评论、游戏）。
 * 点赞后自动更新目标的点赞计数，并通过异步任务为内容作者发放 XP。
 */

import config from '../config';
import logger from '../utils/logger';
import { query, execute, transaction } from '../db';
import {
  Like,
  LikeCreateInput,
  PaginationParams
} from '../types';
import { NotFoundError, ConflictError } from '../middlewares/error.middleware';
import xpService from './xp.service';

/**
 * 从数据库行映射到 Like 对象
 * 将 snake_case 数据库字段转换为 camelCase 的 Like 类型。
 * @param dbLike - 数据库查询结果行
 * @returns 转换后的 Like 对象
 */
const mapLikeFromDb = (dbLike: any): Like => ({
  id: dbLike.id.toString(),
  userId: dbLike.user_id.toString(),
  targetType: dbLike.target_type as 'review' | 'news' | 'community_post' | 'comment' | 'game',
  targetId: dbLike.target_id.toString(),
  createdAt: new Date(dbLike.created_at),
  deletedAt: dbLike.deleted_at ? new Date(dbLike.deleted_at) : undefined,
  version: dbLike.version ? Number(dbLike.version) : 1,
});

/**
 * 点赞
 * 在事务中执行：验证目标存在、检查未重复点赞、插入点赞记录、更新目标计数，
 * 然后异步查找内容作者并发放 XP（自己给自己点赞不发放 XP）。
 * @param userId - 点赞用户ID
 * @param targetType - 目标类型（review/news/community_post/comment/game）
 * @param targetId - 目标ID
 * @returns 创建的点赞记录
 * @throws NotFoundError - 目标不存在或类型不支持时抛出
 * @throws ConflictError - 已点赞时抛出
 */
export const like = async (userId: string, targetType: string, targetId: string): Promise<Like> => {
  return await transaction(async () => {
    // 检查目标是否存在
    let targetExistsSql = '';
    let targetExistsParams: any[] = [];

    switch (targetType) {
      case 'review':
        targetExistsSql = 'SELECT id FROM reviews WHERE id = ?';
        break;
      case 'news':
        targetExistsSql = 'SELECT id FROM news WHERE id = ?';
        break;
      case 'community_post':
        targetExistsSql = 'SELECT id FROM community_posts WHERE id = ?';
        break;
      case 'comment':
        targetExistsSql = 'SELECT id FROM comments WHERE id = ?';
        break;
      case 'game':
        targetExistsSql = 'SELECT id FROM games WHERE id = ?';
        break;
      default:
        throw new NotFoundError(`不支持的点赞目标类型: ${targetType}`);
    }

    targetExistsParams = [targetId];
    const targetExists = await query(targetExistsSql, targetExistsParams);

    if (targetExists.length === 0) {
      throw new NotFoundError(`目标${targetType} ID ${targetId} 不存在`);
    }

    // 检查是否已经点赞
    const existingLike = await query(
      'SELECT id FROM likes WHERE user_id = ? AND target_type = ? AND target_id = ? AND deleted_at IS NULL',
      [userId, targetType, targetId]
    );

    if (existingLike.length > 0) {
      throw new ConflictError('已经点赞过');
    }

    const result = await execute(
      `INSERT INTO likes (
        user_id, target_type, target_id, created_at
      ) VALUES (?, ?, ?, ?)`,
      [
        userId,
        targetType,
        targetId,
        new Date().toISOString(),
      ]
    );

    // 更新目标的点赞计数
    await updateTargetLikeCount(targetType, targetId, 1);

    const inserted = await query(
      'SELECT * FROM likes WHERE id = ?',
      [result.lastInsertRowid]
    );

    const likeObj = mapLikeFromDb(inserted[0]);
    logger.info(`点赞成功: 用户 ${userId} -> 目标 ${targetType}/${targetId}`);

    // 查找目标作者并发放 XP
    (async () => {
      try {
        const authorField = targetType === 'comment' ? 'author_id' : 'author_id';
        const tableMap: Record<string, string> = {
          review: 'reviews',
          news: 'news',
          community_post: 'community_posts',
          comment: 'comments',
        };
        const table = tableMap[targetType];
        if (table) {
          const rows = await query(`SELECT author_id FROM ${table} WHERE id = ?`, [targetId]);
          if (rows.length > 0) {
            const targetAuthorId = String(rows[0].author_id);
            if (targetAuthorId !== userId) {
              xpService.addXp(targetAuthorId, 'receive_like', targetType, targetId).catch(err => logger.error('XP 发放失败:', err));
            }
          }
        }
      } catch (err) {
        logger.error('查找目标作者失败:', err);
      }
    })();

    return likeObj;
  });
};

/**
 * 取消点赞
 * 使用软删除（设置 deleted_at）方式取消点赞，并更新目标计数。
 * @param userId - 用户ID
 * @param targetType - 目标类型
 * @param targetId - 目标ID
 * @returns 取消操作是否成功
 * @throws NotFoundError - 未点赞时抛出
 */
export const unlike = async (userId: string, targetType: string, targetId: string): Promise<boolean> => {
  return await transaction(async () => {
    const now = new Date().toISOString();
    const result = await execute(
      `UPDATE likes
       SET deleted_at = ?
       WHERE user_id = ? AND target_type = ? AND target_id = ? AND deleted_at IS NULL`,
      [now, userId, targetType, targetId]
    );

    if (result.changes === 0) {
      throw new NotFoundError('未点赞过');
    }

    // 更新目标的点赞计数
    await updateTargetLikeCount(targetType, targetId, -1);

    logger.info(`取消点赞成功: 用户 ${userId} -> 目标 ${targetType}/${targetId}`);
    return true;
  });
};

/**
 * 更新目标的点赞计数
 * 根据目标类型在对应的表中增减 likes 字段值。
 * 游戏类型（game）暂不支持点赞计数，直接跳过。
 * @param targetType - 目标类型
 * @param targetId - 目标ID
 * @param delta - 增减量（+1 为点赞，-1 为取消点赞）
 */
const updateTargetLikeCount = async (targetType: string, targetId: string, delta: number): Promise<void> => {
  let updateSql = '';

  switch (targetType) {
    case 'review':
      updateSql = 'UPDATE reviews SET likes = likes + ? WHERE id = ?';
      break;
    case 'news':
      updateSql = 'UPDATE news SET likes = likes + ? WHERE id = ?';
      break;
    case 'community_post':
      updateSql = 'UPDATE community_posts SET likes = likes + ? WHERE id = ?';
      break;
    case 'comment':
      updateSql = 'UPDATE comments SET likes = likes + ? WHERE id = ?';
      break;
    case 'game':
      // 游戏可能没有点赞计数，可以跳过或更新其他字段
      return;
  }

  if (updateSql) {
    await execute(updateSql, [delta, targetId]);
    logger.debug(`更新点赞计数成功: 目标 ${targetType}/${targetId}，变化: ${delta}`);
  }
};

/**
 * 检查用户是否已点赞指定目标
 * @param userId - 用户ID
 * @param targetType - 目标类型
 * @param targetId - 目标ID
 * @returns 已点赞返回 true，否则返回 false
 */
export const checkLikeStatus = async (userId: string, targetType: string, targetId: string): Promise<boolean> => {
  const result = await query(
    'SELECT 1 FROM likes WHERE user_id = ? AND target_type = ? AND target_id = ? AND deleted_at IS NULL LIMIT 1',
    [userId, targetType, targetId]
  );

  return result.length > 0;
};

/**
 * 获取指定目标的点赞用户列表
 * 支持分页查询，同时返回点赞用户的详细信息。
 * @param targetType - 目标类型
 * @param targetId - 目标ID
 * @param pagination - 分页参数
 * @returns 点赞列表（含用户信息）、总数及分页信息
 */
export const getLikesForTarget = async (
  targetType: string,
  targetId: string,
  pagination: PaginationParams = {}
): Promise<{ likes: any[]; total: number; page: number; limit: number }> => {
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;

  // 首先获取总数
  const countSql = `SELECT COUNT(*) as total FROM likes WHERE target_type = ? AND target_id = ? AND deleted_at IS NULL`;
  const countResult = await query(countSql, [targetType, targetId]);
  const total = parseInt(countResult[0]?.total || 0);

  // 然后获取分页数据（包括用户信息）
  const dataSql = `
    SELECT l.*, u.username, u.display_name, u.avatar_url
    FROM likes l
    LEFT JOIN users u ON l.user_id = u.id
    WHERE l.target_type = ? AND l.target_id = ? AND l.deleted_at IS NULL
    ORDER BY l.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const result = await query(dataSql, [targetType, targetId, limit, offset]);

  const likes = result.map((row: any) => ({
    ...mapLikeFromDb(row),
    user: {
      id: row.user_id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
    },
  }));

  logger.debug(`获取目标点赞列表成功，目标: ${targetType}/${targetId}，第${page}页，每页${limit}条，共${total}条`);

  return {
    likes,
    total,
    page,
    limit,
  };
};

/**
 * 获取用户的点赞历史
 * 支持按目标类型过滤，查询结果包含点赞目标的标题信息。
 * 通过 CASE WHEN 语句根据 target_type 从不同表中获取标题。
 * @param userId - 用户ID
 * @param pagination - 分页参数
 * @param filters - 可选的过滤条件（目标类型）
 * @returns 点赞历史列表、总数及分页信息
 */
export const getUserLikes = async (
  userId: string,
  pagination: PaginationParams = {},
  filters: { targetType?: string } = {}
): Promise<{ likes: any[]; total: number; page: number; limit: number }> => {
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;

  const conditions: string[] = ['user_id = ? AND deleted_at IS NULL'];
  const queryParams: any[] = [userId];

  if (filters.targetType) {
    conditions.push(`target_type = ?`);
    queryParams.push(filters.targetType);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // 首先获取总数
  const countSql = `SELECT COUNT(*) as total FROM likes ${whereClause}`;
  const countResult = await query(countSql, queryParams);
  const total = parseInt(countResult[0]?.total || 0);

  // 然后获取分页数据（包括目标信息）
  const dataSql = `
    SELECT l.*,
           CASE
             WHEN l.target_type = 'review' THEN r.title
             WHEN l.target_type = 'news' THEN n.title
             WHEN l.target_type = 'community_post' THEN cp.title
             WHEN l.target_type = 'comment' THEN c.content
             WHEN l.target_type = 'game' THEN g.title
           END as target_title
    FROM likes l
    LEFT JOIN reviews r ON l.target_type = 'review' AND l.target_id = r.id
    LEFT JOIN news n ON l.target_type = 'news' AND l.target_id = n.id
    LEFT JOIN community_posts cp ON l.target_type = 'community_post' AND l.target_id = cp.id
    LEFT JOIN comments c ON l.target_type = 'comment' AND l.target_id = c.id
    LEFT JOIN games g ON l.target_type = 'game' AND l.target_id = g.id
    ${whereClause}
    ORDER BY l.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const dataParams = [...queryParams, limit, offset];
  const result = await query(dataSql, dataParams);

  const likes = result.map((row: any) => ({
    ...mapLikeFromDb(row),
    targetTitle: row.target_title,
  }));

  logger.debug(`获取用户点赞历史成功，用户ID: ${userId}，第${page}页，每页${limit}条，共${total}条`);

  return {
    likes,
    total,
    page,
    limit,
  };
};

/**
 * 获取点赞统计信息
 * 支持三个粒度：特定目标（targetType + targetId）、特定类型（仅 targetType）、全局统计。
 * 全局统计时按目标类型分组。
 * @param targetType - 目标类型（可选）
 * @param targetId - 目标ID（可选，需与 targetType 同时提供）
 * @returns 点赞总数和按目标类型分组的计数
 */
export const getLikeStats = async (targetType?: string, targetId?: string): Promise<{
  total: number;
  byTargetType: Record<string, number>;
}> => {
  try {
    if (targetType && targetId) {
      // 获取特定目标的点赞数
      const result = await query(
        `SELECT COUNT(*) as count FROM likes WHERE target_type = ? AND target_id = ? AND deleted_at IS NULL`,
        [targetType, targetId]
      );
      return {
        total: Number(result[0]?.count || 0),
        byTargetType: { [targetType]: Number(result[0]?.count || 0) },
      };
    } else if (targetType) {
      // 获取特定类型的点赞数
      const result = await query(
        `SELECT COUNT(*) as count FROM likes WHERE target_type = ? AND deleted_at IS NULL`,
        [targetType]
      );
      return {
        total: Number(result[0]?.count || 0),
        byTargetType: { [targetType]: Number(result[0]?.count || 0) },
      };
    } else {
      // 获取所有点赞统计
      const totalResult = await query(`SELECT COUNT(*) as count FROM likes WHERE deleted_at IS NULL`);
      const total = Number(totalResult[0]?.count || 0);

      // 按目标类型统计
      const typeResult = await query(`
        SELECT target_type, COUNT(*) as count
        FROM likes
        WHERE deleted_at IS NULL
        GROUP BY target_type
      `);
      const byTargetType: Record<string, number> = {};
      typeResult.forEach((row: any) => {
        byTargetType[row.target_type] = Number(row.count);
      });

      return {
        total,
        byTargetType,
      };
    }
  } catch (error) {
    logger.error('获取点赞统计信息失败:', error);
    throw error;
  }
};

export default {
  like,
  unlike,
  checkLikeStatus,
  getLikesForTarget,
  getUserLikes,
  getLikeStats,
};
