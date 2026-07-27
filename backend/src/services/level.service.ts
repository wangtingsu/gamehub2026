/**
 * 等级服务
 * 实现用户等级体系，等级由两个因素决定：
 * 1. 累计登录时长（小时）达到固定阈值
 * 2. 累计 XP 每满 XP_PER_LEVEL 额外提升 1 级
 * 等级越高，用户评论的权重加成越大。
 */

import { query, execute } from '../db';
import logger from '../utils/logger';
import type { LevelConfig } from '../types';
import { createNotification } from './notification.service';

/**
 * 固定等级阈值配置（单位：小时）
 * 定义了从 2 级到 10 级每级所需的累计登录时长。
 * 等级 1 为初始等级，无需任何时长。
 */
const LEVEL_THRESHOLDS: Record<number, number> = {
  2: 10,
  3: 30,
  4: 100,
  5: 200,
  6: 400,
  7: 700,
  8: 1100,
  9: 1600,
  10: 2200,
};

/** XP 对等级的加成：每 XP_PER_LEVEL 点 XP 提升 1 级 */
const XP_PER_LEVEL = 500;

/** 最高等级限制 */
const MAX_LEVEL = 10;
/** 评论权重基准值（等级 1 的权重） */
const WEIGHT_BASE = 1;
/** 每升一级的权重增量系数 */
const WEIGHT_COEFFICIENT = 0.5;

/**
 * 获取完整等级配置列表
 * 遍历 1 到 MAX_LEVEL，计算每级所需的登录时长、XP 和权重。
 * 等级 1 为初始等级，所有需求均为 0。
 * @returns 等级配置数组，包含等级、所需小时数、权重和所需 XP
 */
export const getLevelConfigs = async (): Promise<LevelConfig[]> => {
  const levels: LevelConfig[] = [];

  for (let lv = 1; lv <= MAX_LEVEL; lv++) {
    if (lv === 1) {
      levels.push({ level: 1, requiredHours: 0, weight: WEIGHT_BASE, requiredXp: 0 });
    } else {
      const hours = LEVEL_THRESHOLDS[lv] || Infinity;
      const weight = WEIGHT_BASE + (lv - 1) * WEIGHT_COEFFICIENT;
      const requiredXp = (lv - 1) * XP_PER_LEVEL;
      levels.push({ level: lv, requiredHours: hours, weight, requiredXp });
    }
  }

  return levels;
};

/**
 * 根据累计登录时长和 XP 计算用户等级
 * 等级计算公式：
 * 基础等级 = 根据登录时长（小时）匹配阈值表
 * XP 加成 = floor(totalXp / XP_PER_LEVEL)
 * 最终等级 = min(基础等级 + XP 加成, MAX_LEVEL)
 * @param totalLoginMinutes - 累计登录总分钟数
 * @param totalXp - 累计 XP 总数
 * @returns 计算后的等级（1 到 MAX_LEVEL 之间）
 */
export const calculateLevel = async (
  totalLoginMinutes: number,
  totalXp: number = 0,
): Promise<number> => {
  // 基础等级：根据登录时长
  const totalHours = totalLoginMinutes / 60;
  let baseLevel = 1;
  for (const [level, hours] of Object.entries(LEVEL_THRESHOLDS)) {
    if (totalHours >= hours) {
      baseLevel = parseInt(level);
    } else {
      break;
    }
  }

  // XP 加成：每 XP_PER_LEVEL 点 XP 提升 1 级
  const xpBonus = Math.floor(totalXp / XP_PER_LEVEL);

  const finalLevel = Math.min(baseLevel + xpBonus, MAX_LEVEL);
  return Math.max(1, finalLevel);
};

/**
 * 获取用户评论权重
 * 根据用户等级计算其在评论评分中的权重值。
 * @param level - 用户等级
 * @returns 权重值（等级越高权重越大）
 */
export const getUserCommentWeight = async (level: number): Promise<number> => {
  return getLevelWeight(level);
};

/**
 * 获取用户的等级进度信息
 * 查询用户当前等级、当前 XP、升级所需 XP 和进度百分比。
 * @param userId - 用户ID
 * @returns 等级进度信息（当前等级、当前XP、下级所需XP、进度百分比、登录时长）
 */
export const getLevelProgress = async (
  userId: string,
): Promise<{
  currentLevel: number;
  currentXp: number;
  nextLevelXp: number;
  progress: number;
  totalLoginHours: number;
}> => {
  const users = await query(
    'SELECT level, total_xp, total_login_time FROM users WHERE id = ?',
    [userId],
  );
  if (users.length === 0) {
    return { currentLevel: 1, currentXp: 0, nextLevelXp: XP_PER_LEVEL, progress: 0, totalLoginHours: 0 };
  }

  const currentLevel = users[0].level || 1;
  const currentXp = users[0].total_xp || 0;
  const totalLoginMinutes = users[0].total_login_time || 0;

  const configs = await getLevelConfigs();
  const currentConfig = configs.find(c => c.level === currentLevel) || configs[0];
  const nextConfig = configs.find(c => c.level === currentLevel + 1);

  if (!nextConfig || currentLevel >= MAX_LEVEL) {
    return {
      currentLevel,
      currentXp,
      nextLevelXp: currentConfig.requiredXp || XP_PER_LEVEL,
      progress: 1,
      totalLoginHours: Math.round(totalLoginMinutes / 60),
    };
  }

  const levelStartXp = currentConfig.requiredXp || 0;
  const levelEndXp = nextConfig.requiredXp || XP_PER_LEVEL;
  const levelRange = levelEndXp - levelStartXp;
  const xpInLevel = currentXp - levelStartXp;
  const progress = levelRange > 0 ? Math.min(1, Math.max(0, xpInLevel / levelRange)) : 0;

  return {
    currentLevel,
    currentXp,
    nextLevelXp: levelEndXp,
    progress,
    totalLoginHours: Math.round(totalLoginMinutes / 60),
  };
};

/**
 * 更新用户等级
 * 根据当前登录时长和 XP 重新计算等级，若等级发生变化则更新数据库，
 * 并发送等级提升通知。
 * @param userId - 用户ID
 * @returns 更新后的等级
 */
export const updateUserLevel = async (userId: string): Promise<number> => {
  const users = await query(
    'SELECT total_login_time, total_xp, level FROM users WHERE id = ?',
    [userId],
  );
  if (users.length === 0) return 1;

  const totalLoginTime = users[0].total_login_time || 0;
  const totalXp = users[0].total_xp || 0;
  const oldLevel = users[0].level || 1;
  const newLevel = await calculateLevel(totalLoginTime, totalXp);

  if (newLevel !== oldLevel) {
    await execute('UPDATE users SET level = ?, updated_at = ? WHERE id = ?', [
      newLevel, new Date().toISOString(), userId,
    ]);

    logger.info(`用户等级已更新: userId=${userId}, ${oldLevel} -> ${newLevel}`);

    // 发送等级升级通知
    try {
      await createNotification({
        userId,
        type: 'level_up',
        title: '等级提升',
        message: `恭喜！您已升级至 Lv.${newLevel}`,
        data: { oldLevel, newLevel },
      });
    } catch (err) {
      logger.error(`发送等级升级通知失败: userId=${userId}`, err);
    }
  }

  return newLevel;
};

// ========== 加权评分相关 ==========

/**
 * 获取用户等级的权重值
 * 权重公式：WEIGHT_BASE + (level - 1) * WEIGHT_COEFFICIENT。
 * 等级越高，权重值越大，在评分计算中的影响力也越大。
 * @param level - 用户等级
 * @returns 权重值
 */
export const getLevelWeight = (level: number): number => {
  return WEIGHT_BASE + (level - 1) * WEIGHT_COEFFICIENT;
};

/**
 * 生成加权评分的 SQL 子查询（用于 SELECT 列中替代 AVG(rating)）
 * 用法: ... (加权子查询) as avg_rating ...
 * 要求外层查询的 games 表别名为 g
 */
export const getWeightedRatingSubquery = (): string => {
  return `(
    SELECT SUM(r_sub.rating * (1 + (COALESCE(u_sub.level, 1) - 1) * ${WEIGHT_COEFFICIENT})) /
           NULLIF(SUM(1 + (COALESCE(u_sub.level, 1) - 1) * ${WEIGHT_COEFFICIENT}), 0)
    FROM reviews r_sub
    LEFT JOIN users u_sub ON r_sub.author_id = u_sub.id
    WHERE r_sub.game_id = g.id
  )`;
};

/**
 * 生成加权评分 GROUP BY 子查询（用于 FROM 子句中的派生表）
 * 用法: (${getWeightedRatingGroupQuery()}) r
 */
export const getWeightedRatingGroupQuery = (): string => {
  return `
    SELECT r_sub.game_id,
           COUNT(*) as reviewCount,
           SUM(r_sub.rating * (1 + (COALESCE(u_sub.level, 1) - 1) * ${WEIGHT_COEFFICIENT})) /
           NULLIF(SUM(1 + (COALESCE(u_sub.level, 1) - 1) * ${WEIGHT_COEFFICIENT}), 0) as avgScore
    FROM reviews r_sub
    LEFT JOIN users u_sub ON r_sub.author_id = u_sub.id
    GROUP BY r_sub.game_id
  `;
};

export default {
  getLevelConfigs,
  calculateLevel,
  getUserCommentWeight,
  updateUserLevel,
  getLevelProgress,
  getLevelWeight,
  getWeightedRatingSubquery,
  getWeightedRatingGroupQuery,
};
