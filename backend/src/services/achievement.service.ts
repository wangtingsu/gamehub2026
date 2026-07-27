/**
 * 成就系统服务
 *
 * 负责平台成就的定义、用户成就的解锁检查与授予、成就统计等功能。
 * 成就根据用户行为数据（评测数、帖子数、评论数、关注者数、经验值等）
 * 自动判定解锁条件，解锁后发放积分奖励并发送通知。
 */

import { query, execute } from '../db';
import logger from '../utils/logger';
import type { PlatformAchievement, UserPlatformAchievement, PaginationParams } from '../types';
import { createNotification } from './notification.service';
import { addPoints } from './xp.service';

/**
 * 将数据库行映射为 PlatformAchievement 对象
 * @param row 数据库查询结果行
 * @returns 格式化后的平台成就对象
 */
const mapAchievement = (row: any): PlatformAchievement => ({
  id: row.id.toString(),
  key: row.key,
  name: row.name,
  description: row.description,
  iconUrl: row.icon_url || undefined,
  category: row.category,
  requirementType: row.requirement_type,
  requirementValue: row.requirement_value,
  xpReward: row.xp_reward || 0,
  pointsReward: row.points_reward || 0,
  isHidden: Boolean(row.is_hidden),
  sortOrder: row.sort_order || 0,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
  deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
  version: row.version || 1,
});

/**
 * 将数据库行映射为用户成就解锁记录对象
 * @param row 数据库查询结果行
 * @returns 格式化后的用户成就解锁记录
 */
const mapUserAchievement = (row: any): UserPlatformAchievement => ({
  id: row.id.toString(),
  userId: row.user_id.toString(),
  achievementId: row.achievement_id.toString(),
  unlockedAt: new Date(row.unlocked_at),
  notified: Boolean(row.notified),
  createdAt: new Date(row.created_at),
});

/**
 * 获取用户各维度的统计数据，用于判断成就解锁条件
 *
 * 统计维度包括：评测数、帖子数、评论数、关注者数、用户等级和总经验值。
 *
 * @param userId 用户 ID
 * @returns 包含各项统计数值的对象
 */
const getUserStats = async (userId: string): Promise<Record<string, number>> => {
  // 查询用户发布的评测总数
  const reviewResult = await query(
    'SELECT COUNT(*) as count FROM reviews WHERE author_id = ? AND deleted_at IS NULL',
    [userId],
  );
  // 查询用户发布的社区帖子总数
  const postResult = await query(
    'SELECT COUNT(*) as count FROM community_posts WHERE author_id = ? AND deleted_at IS NULL',
    [userId],
  );
  // 查询用户发表的评论总数
  const commentResult = await query(
    'SELECT COUNT(*) as count FROM comments WHERE author_id = ? AND deleted_at IS NULL',
    [userId],
  );
  // 查询用户的关注者总数
  const followerResult = await query(
    'SELECT COUNT(*) as count FROM follows WHERE following_id = ? AND deleted_at IS NULL',
    [userId],
  );
  // 查询用户的当前等级和累计经验值
  const userResult = await query(
    'SELECT level, total_xp FROM users WHERE id = ?',
    [userId],
  );

  return {
    review_count: parseInt(reviewResult[0]?.count || '0'),
    post_count: parseInt(postResult[0]?.count || '0'),
    comment_count: parseInt(commentResult[0]?.count || '0'),
    follower_count: parseInt(followerResult[0]?.count || '0'),
    level: userResult[0]?.level || 1,
    xp_total: userResult[0]?.total_xp || 0,
  };
};

/**
 * 检查用户的所有成就条件并授予新成就
 *
 * 遍历所有成就定义，将用户统计数据与成就解锁条件逐一比对。
 * 若满足条件且尚未解锁，则创建解锁记录、发放积分奖励（如有）、
 * 发送解锁通知，并返回本次新解锁的成就列表。
 *
 * @param userId 用户 ID
 * @returns 本次新解锁的用户成就列表
 */
export const checkAndAwardAchievements = async (userId: string): Promise<UserPlatformAchievement[]> => {
  const stats = await getUserStats(userId);
  const newUnlocks: UserPlatformAchievement[] = [];

  // 获取所有未被删除的成就定义，按排序字段升序排列
  const achievements = await query(
    'SELECT * FROM platform_achievements WHERE deleted_at IS NULL ORDER BY sort_order',
  );

  // 获取用户已解锁的成就 ID 集合，用于跳过已解锁项以避免重复授予
  const unlockedRows = await query(
    'SELECT achievement_id FROM user_platform_achievements WHERE user_id = ?',
    [userId],
  );
  const unlockedIds = new Set(unlockedRows.map((r: any) => r.achievement_id.toString()));

  for (const achievement of achievements) {
    // 若成就已解锁，则跳过本次遍历
    if (unlockedIds.has(achievement.id.toString())) continue;

    const reqValue = achievement.requirement_value;
    const statValue = stats[achievement.requirement_type] || 0;

    // 判断用户统计数据是否达到成就要求的阈值
    if (statValue >= reqValue) {
      try {
        // 在 user_platform_achievements 表中插入解锁记录
        const result = await execute(
          `INSERT INTO user_platform_achievements (user_id, achievement_id, unlocked_at, notified)
           VALUES (?, ?, ?, 0)`,
          [userId, achievement.id, new Date().toISOString()],
        );

        // 若成就配置了积分奖励，调用 addPoints 发放奖励
        if (achievement.points_reward > 0) {
          await addPoints(
            userId,
            'achievement_bonus',
            achievement.points_reward,
            'platform_achievement',
            achievement.id.toString(),
            `成就奖励: ${achievement.name}`,
          );
        }

        // 向用户发送成就解锁通知
        await createNotification({
          userId,
          type: 'achievement_unlocked',
          title: '成就解锁',
          message: `恭喜您解锁成就: ${achievement.name}`,
          data: {
            achievementId: achievement.id.toString(),
            achievementKey: achievement.key,
            achievementName: achievement.name,
            pointsReward: achievement.points_reward,
          },
        });

        logger.info(`成就解锁: userId=${userId}, achievement=${achievement.key}`);

        const unlock = { id: result.lastInsertRowid?.toString() || '0' };

        // 组装用户成就对象，包含完整的成就定义信息
        const userAchievement: UserPlatformAchievement = {
          id: unlock.id,
          userId,
          achievementId: achievement.id.toString(),
          achievement: mapAchievement(achievement),
          unlockedAt: new Date(),
          notified: false,
          createdAt: new Date(),
        };
        newUnlocks.push(userAchievement);
      } catch (error) {
        logger.error(`成就解锁失败: userId=${userId}, achievement=${achievement.key}`, error);
      }
    }
  }

  return newUnlocks;
};

/**
 * 获取所有成就定义列表
 * @returns 所有未删除的平台成就列表
 */
export const getAllAchievements = async (): Promise<PlatformAchievement[]> => {
  const rows = await query(
    'SELECT * FROM platform_achievements WHERE deleted_at IS NULL ORDER BY sort_order',
  );
  return rows.map(mapAchievement);
};

/**
 * 获取用户已解锁的成就列表（含成就定义详情）
 * @param userId 用户 ID
 * @returns 该用户已解锁的成就列表，包含完整的成就定义
 */
export const getUserAchievements = async (userId: string): Promise<UserPlatformAchievement[]> => {
  const rows = await query(
    `SELECT upa.*, pa.*
     FROM user_platform_achievements upa
     JOIN platform_achievements pa ON upa.achievement_id = pa.id
     WHERE upa.user_id = ?
     ORDER BY pa.sort_order`,
    [userId],
  );

  return rows.map((row: any) => {
    const achievement = mapAchievement(row);
    const userAchievement = mapUserAchievement(row);
    return { ...userAchievement, achievement };
  });
};

/**
 * 获取成就统计信息
 *
 * 返回用户已解锁的成就数量、成就总数和最近解锁的成就列表（前 5 条）。
 *
 * @param userId 用户 ID
 * @returns 成就统计对象，包含已解锁数、总数和最近解锁记录
 */
export const getAchievementStats = async (
  userId: string,
): Promise<{ unlocked: number; total: number; recentUnlocks: UserPlatformAchievement[] }> => {
  // 查询平台上定义的总成就数
  const totalResult = await query(
    'SELECT COUNT(*) as count FROM platform_achievements WHERE deleted_at IS NULL',
  );
  // 查询用户已解锁的成就数
  const unlockedResult = await query(
    'SELECT COUNT(*) as count FROM user_platform_achievements WHERE user_id = ?',
    [userId],
  );

  // 查询用户最近解锁的 5 条成就记录
  const recentRows = await query(
    `SELECT upa.*, pa.*
     FROM user_platform_achievements upa
     JOIN platform_achievements pa ON upa.achievement_id = pa.id
     WHERE upa.user_id = ?
     ORDER BY upa.unlocked_at DESC
     LIMIT 5`,
    [userId],
  );

  const recentUnlocks = recentRows.map((row: any) => {
    const achievement = mapAchievement(row);
    const userAchievement = mapUserAchievement(row);
    return { ...userAchievement, achievement };
  });

  return {
    unlocked: parseInt(unlockedResult[0]?.count || '0'),
    total: parseInt(totalResult[0]?.count || '0'),
    recentUnlocks,
  };
};

/**
 * 创建新的成就定义（管理端接口）
 * @param data 成就创建参数，包含标识键、名称、描述、分类、解锁条件及奖励配置
 * @returns 创建完成的平台成就对象
 */
export const createAchievement = async (data: {
  key: string;
  name: string;
  description: string;
  category: string;
  requirementType: string;
  requirementValue: number;
  xpReward?: number;
  pointsReward?: number;
  isHidden?: boolean;
  sortOrder?: number;
}): Promise<PlatformAchievement> => {
  const result = await execute(
    `INSERT INTO platform_achievements (key, name, description, category, requirement_type, requirement_value, xp_reward, points_reward, is_hidden, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.key, data.name, data.description, data.category,
      data.requirementType, data.requirementValue,
      data.xpReward || 0, data.pointsReward || 0,
      data.isHidden ? 1 : 0, data.sortOrder || 0,
    ],
  );

  const rows = await query('SELECT * FROM platform_achievements WHERE id = ?', [result.lastInsertRowid]);
  return mapAchievement(rows[0]);
};

/**
 * 更新成就定义（管理端接口）
 *
 * 仅更新传入的字段，未传入的字段保持不变。
 *
 * @param id 成就 ID
 * @param data 需要更新的字段，所有字段均为可选
 * @returns 更新完成的平台成就对象
 * @throws {Error} 当未提供任何需要更新的字段时抛出
 * @throws {Error} 当指定 ID 的成就不存在时抛出
 */
export const updateAchievement = async (
  id: string,
  data: Partial<{
    name: string;
    description: string;
    category: string;
    requirementType: string;
    requirementValue: number;
    xpReward: number;
    pointsReward: number;
    isHidden: boolean;
    sortOrder: number;
  }>,
): Promise<PlatformAchievement> => {
  // 动态拼接 SET 子句，仅包含需要更新的字段
  const sets: string[] = [];
  const params: any[] = [];

  if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name); }
  if (data.description !== undefined) { sets.push('description = ?'); params.push(data.description); }
  if (data.category !== undefined) { sets.push('category = ?'); params.push(data.category); }
  if (data.requirementType !== undefined) { sets.push('requirement_type = ?'); params.push(data.requirementType); }
  if (data.requirementValue !== undefined) { sets.push('requirement_value = ?'); params.push(data.requirementValue); }
  if (data.xpReward !== undefined) { sets.push('xp_reward = ?'); params.push(data.xpReward); }
  if (data.pointsReward !== undefined) { sets.push('points_reward = ?'); params.push(data.pointsReward); }
  if (data.isHidden !== undefined) { sets.push('is_hidden = ?'); params.push(data.isHidden ? 1 : 0); }
  if (data.sortOrder !== undefined) { sets.push('sort_order = ?'); params.push(data.sortOrder); }

  if (sets.length === 0) throw new Error('没有需要更新的字段');

  // 自动更新 updated_at 时间戳
  sets.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);

  await execute(
    `UPDATE platform_achievements SET ${sets.join(', ')} WHERE id = ?`,
    params,
  );

  const rows = await query('SELECT * FROM platform_achievements WHERE id = ?', [id]);
  if (rows.length === 0) throw new Error(`成就 ID ${id} 不存在`);
  return mapAchievement(rows[0]);
};

/**
 * 软删除成就定义（管理端接口）
 *
 * 设置 deleted_at 字段而非物理删除，保留历史数据。
 *
 * @param id 成就 ID
 */
export const deleteAchievement = async (id: string): Promise<void> => {
  const now = new Date().toISOString();
  await execute(
    'UPDATE platform_achievements SET deleted_at = ? WHERE id = ?',
    [now, id],
  );
  logger.info(`成就已删除: id=${id}`);
};

export default {
  checkAndAwardAchievements,
  getAllAchievements,
  getUserAchievements,
  getAchievementStats,
  createAchievement,
  updateAchievement,
  deleteAchievement,
};
