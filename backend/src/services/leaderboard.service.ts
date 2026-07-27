/**
 * 排行榜服务
 * 提供用户排行榜查询功能，支持按 XP、等级、积分和成就数量四种排行方式。
 * 所有排行仅统计活跃且未软删除的用户。
 */

import { query } from '../db';
import logger from '../utils/logger';
import type { UserLeaderboardEntry } from '../types';

/**
 * 获取用户排行榜
 * 根据指定排行类型（xp/level/points/achievements）查询用户排名列表，
 * 按对应指标降序排列，支持分页并自动计算排名序号。
 * @param type - 排行类型：'xp' 按经验值、'level' 按等级、'points' 按积分、'achievements' 按成就数
 * @param limit - 每页返回条数，默认 20
 * @param page - 当前页码，默认 1
 * @returns 排行条目列表、总数及分页信息
 */
export const getUserLeaderboard = async (
  type: 'xp' | 'level' | 'points' | 'achievements',
  limit: number = 20,
  page: number = 1,
): Promise<{ items: UserLeaderboardEntry[]; total: number; page: number; limit: number }> => {
  const offset = (page - 1) * limit;

  try {
    let sql = '';
    let countSql = 'SELECT COUNT(*) as total FROM users WHERE is_active = true AND deleted_at IS NULL';

    switch (type) {
      case 'xp':
        sql = `
          SELECT id, username, display_name, avatar_url, level, total_xp, total_points
          FROM users
          WHERE is_active = true AND deleted_at IS NULL
          ORDER BY total_xp DESC, level DESC
          LIMIT ? OFFSET ?
        `;
        break;
      case 'level':
        sql = `
          SELECT id, username, display_name, avatar_url, level, total_xp, total_points
          FROM users
          WHERE is_active = true AND deleted_at IS NULL
          ORDER BY level DESC, total_xp DESC
          LIMIT ? OFFSET ?
        `;
        break;
      case 'points':
        sql = `
          SELECT id, username, display_name, avatar_url, level, total_xp, total_points
          FROM users
          WHERE is_active = true AND deleted_at IS NULL
          ORDER BY total_points DESC, level DESC
          LIMIT ? OFFSET ?
        `;
        break;
      case 'achievements':
        sql = `
          SELECT u.id, u.username, u.display_name, u.avatar_url, u.level, u.total_xp, u.total_points,
                 COALESCE(upa.achievement_count, 0) as achievement_count
          FROM users u
          LEFT JOIN (
            SELECT user_id, COUNT(*) as achievement_count
            FROM user_platform_achievements
            GROUP BY user_id
          ) upa ON u.id = upa.user_id
          WHERE u.is_active = true AND u.deleted_at IS NULL
          ORDER BY achievement_count DESC, u.level DESC
          LIMIT ? OFFSET ?
        `;
        break;
      default:
        sql = `
          SELECT id, username, display_name, avatar_url, level, total_xp, total_points
          FROM users
          WHERE is_active = true AND deleted_at IS NULL
          ORDER BY total_xp DESC
          LIMIT ? OFFSET ?
        `;
    }

    const countResult = await query(countSql);
    const total = parseInt(countResult[0]?.total || '0');

    const params: any[] = [limit, offset];
    const rows = await query(sql, params);

    const items: UserLeaderboardEntry[] = rows.map((row: any, index: number) => ({
      rank: offset + index + 1,
      userId: row.id.toString(),
      username: row.username,
      displayName: row.display_name || undefined,
      avatarUrl: row.avatar_url || undefined,
      level: row.level || 1,
      totalXp: row.total_xp || 0,
      totalPoints: row.total_points || 0,
      achievementCount: parseInt(row.achievement_count || '0'),
    }));

    logger.debug(`用户排行榜查询: type=${type}, page=${page}, total=${total}`);

    return { items, total, page, limit };
  } catch (error) {
    logger.error('获取用户排行榜失败:', error);
    throw error;
  }
};

export default {
  getUserLeaderboard,
};
