/**
 * 经验值（XP）与积分服务
 *
 * 管理用户的经验值和积分系统。支持通过预定义的奖励规则添加 XP 和积分，
 * 记录每笔交易的详细历史，并提供按日/周/月的统计数据。
 * 不同的用户行为（登录、发帖、评论等）对应不同的 XP/积分奖励值。
 *
 * @module xp.service
 */

import { query, execute } from '../db';
import logger from '../utils/logger';
import type { XpTransaction, PointTransaction, PaginationParams } from '../types';

/**
 * XP 和积分奖励规则配置
 *
 * 定义不同用户行为对应的经验值（xp）和积分（points）奖励。
 * 各行为说明：
 * - daily_login: 每日登录奖励
 * - create_review: 发布评测
 * - create_community_post: 发布社区帖子
 * - create_comment: 发表评论
 * - receive_like: 收到点赞
 * - receive_follow: 新增关注者
 * - post_pinned: 帖子被置顶
 * - achievement_bonus: 成就奖励（xp 和 points 动态设置，此处占位）
 */
const XP_REWARDS: Record<string, { xp: number; points: number }> = {
  daily_login: { xp: 10, points: 0 },
  create_review: { xp: 50, points: 10 },
  create_community_post: { xp: 20, points: 5 },
  create_comment: { xp: 5, points: 1 },
  receive_like: { xp: 2, points: 0 },
  receive_follow: { xp: 5, points: 1 },
  post_pinned: { xp: 30, points: 10 },
  achievement_bonus: { xp: 0, points: 0 }, // 动态设置
};

/**
 * 将数据库行记录映射为 XpTransaction 对象
 *
 * @param row - 数据库查询结果行
 * @returns 映射后的 XpTransaction 对象
 */
const mapXpTransaction = (row: any): XpTransaction => ({
  id: row.id.toString(),
  userId: row.user_id.toString(),
  actionKey: row.action_key,
  xpAmount: row.xp_amount,
  balanceAfter: row.balance_after,
  referenceType: row.reference_type || undefined,
  referenceId: row.reference_id ? row.reference_id.toString() : undefined,
  createdAt: new Date(row.created_at),
});

/**
 * 将数据库行记录映射为 PointTransaction 对象
 *
 * @param row - 数据库查询结果行
 * @returns 映射后的 PointTransaction 对象
 */
const mapPointTransaction = (row: any): PointTransaction => ({
  id: row.id.toString(),
  userId: row.user_id.toString(),
  actionKey: row.action_key,
  pointsAmount: row.points_amount,
  balanceAfter: row.balance_after,
  referenceType: row.reference_type || undefined,
  referenceId: row.reference_id ? row.reference_id.toString() : undefined,
  description: row.description || undefined,
  createdAt: new Date(row.created_at),
});

/**
 * 添加经验值（并同步添加对应积分）
 *
 * 根据操作类型从 XP_REWARDS 表中查找对应的 XP 和积分奖励，
 * 更新用户的总 XP 和总积分，并在事务表中记录详细流水。
 * 如果操作类型未在奖励表中定义，则不进行任何操作。
 *
 * @param userId - 用户 ID
 * @param actionKey - 操作类型键名（需在 XP_REWARDS 中定义）
 * @param referenceType - 关联内容的类型（如 'review'、'post' 等）
 * @param referenceId - 关联内容的 ID
 * @returns 本次添加的 XP 数、积分数及更新后的余额
 */
export const addXp = async (
  userId: string,
  actionKey: string,
  referenceType?: string,
  referenceId?: string,
): Promise<{ xpAdded: number; pointsAdded: number; balanceAfterXp: number; balanceAfterPoints: number }> => {
  const reward = XP_REWARDS[actionKey];
  if (!reward) {
    logger.warn(`未知的 XP 操作: ${actionKey}`);
    return { xpAdded: 0, pointsAdded: 0, balanceAfterXp: 0, balanceAfterPoints: 0 };
  }

  // 获取当前 XP/积分
  const userRows = await query('SELECT total_xp, total_points FROM users WHERE id = ?', [userId]);
  if (userRows.length === 0) {
    logger.warn(`用户不存在: ${userId}`);
    return { xpAdded: 0, pointsAdded: 0, balanceAfterXp: 0, balanceAfterPoints: 0 };
  }

  const currentXp = userRows[0].total_xp || 0;
  const currentPoints = userRows[0].total_points || 0;
  const newXp = currentXp + reward.xp;
  const newPoints = currentPoints + reward.points;

  // 更新用户 XP 和积分
  await execute(
    'UPDATE users SET total_xp = ?, total_points = ?, updated_at = ? WHERE id = ?',
    [newXp, newPoints, new Date().toISOString(), userId],
  );

  // 记录 XP 事务
  if (reward.xp > 0) {
    await execute(
      `INSERT INTO xp_transactions (user_id, action_key, xp_amount, balance_after, reference_type, reference_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, actionKey, reward.xp, newXp, referenceType || null, referenceId || null],
    );
  }

  // 记录积分事务
  if (reward.points > 0) {
    await execute(
      `INSERT INTO point_transactions (user_id, action_key, points_amount, balance_after, reference_type, reference_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, actionKey, reward.points, newPoints, referenceType || null, referenceId || null],
    );
  }

  logger.info(`XP/积分添加成功: userId=${userId}, action=${actionKey}, xp=${reward.xp}, points=${reward.points}`);
  return { xpAdded: reward.xp, pointsAdded: reward.points, balanceAfterXp: newXp, balanceAfterPoints: newPoints };
};

/**
 * 仅添加积分（不添加 XP）
 *
 * 用于成就奖励等需要自定义积分数量的场景，与 addXp 不同的是
 * 此方法只添加积分而不添加经验值，且积分数量由调用方指定。
 *
 * @param userId - 用户 ID
 * @param actionKey - 操作类型键名
 * @param amount - 要添加的积分数量
 * @param referenceType - 关联内容的类型
 * @param referenceId - 关联内容的 ID
 * @param description - 积分来源描述
 * @returns 更新后的积分余额
 */
export const addPoints = async (
  userId: string,
  actionKey: string,
  amount: number,
  referenceType?: string,
  referenceId?: string,
  description?: string,
): Promise<number> => {
  const userRows = await query('SELECT total_points FROM users WHERE id = ?', [userId]);
  if (userRows.length === 0) {
    logger.warn(`用户不存在: ${userId}`);
    return 0;
  }

  const currentPoints = userRows[0].total_points || 0;
  const newPoints = currentPoints + amount;

  await execute(
    'UPDATE users SET total_points = ?, updated_at = ? WHERE id = ?',
    [newPoints, new Date().toISOString(), userId],
  );

  await execute(
    `INSERT INTO point_transactions (user_id, action_key, points_amount, balance_after, reference_type, reference_id, description)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, actionKey, amount, newPoints, referenceType || null, referenceId || null, description || null],
  );

  logger.info(`积分添加成功: userId=${userId}, amount=${amount}, newBalance=${newPoints}`);
  return newPoints;
};

/**
 * 获取 XP 历史记录
 *
 * 查询指定用户的经验值变动流水，按时间倒序排列并分页返回。
 *
 * @param userId - 用户 ID
 * @param pagination - 分页参数（page、limit）
 * @returns XP 交易历史及分页信息
 */
export const getXpHistory = async (
  userId: string,
  pagination: PaginationParams = {},
): Promise<{ items: XpTransaction[]; total: number; page: number; limit: number }> => {
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;

  const countResult = await query(
    'SELECT COUNT(*) as total FROM xp_transactions WHERE user_id = ?',
    [userId],
  );
  const total = parseInt(countResult[0]?.total || '0');

  const rows = await query(
    'SELECT * FROM xp_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [userId, limit, offset],
  );

  const items = rows.map(mapXpTransaction);
  logger.debug(`XP 历史查询: userId=${userId}, page=${page}, total=${total}`);

  return { items, total, page, limit };
};

/**
 * 获取积分历史记录
 *
 * 查询指定用户的积分变动流水，按时间倒序排列并分页返回。
 *
 * @param userId - 用户 ID
 * @param pagination - 分页参数（page、limit）
 * @returns 积分交易历史及分页信息
 */
export const getPointHistory = async (
  userId: string,
  pagination: PaginationParams = {},
): Promise<{ items: PointTransaction[]; total: number; page: number; limit: number }> => {
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;

  const countResult = await query(
    'SELECT COUNT(*) as total FROM point_transactions WHERE user_id = ?',
    [userId],
  );
  const total = parseInt(countResult[0]?.total || '0');

  const rows = await query(
    'SELECT * FROM point_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [userId, limit, offset],
  );

  const items = rows.map(mapPointTransaction);
  logger.debug(`积分历史查询: userId=${userId}, page=${page}, total=${total}`);

  return { items, total, page, limit };
};

/**
 * 获取 XP/积分统计信息
 *
 * 返回用户的累计 XP 和积分总数，以及当日、当周、当月的
 * XP 获得量统计。
 *
 * @param userId - 用户 ID
 * @returns 统计对象，包含总 XP、总积分、今日/本周/本月的 XP 获得量
 */
export const getXpStats = async (
  userId: string,
): Promise<{ totalXp: number; totalPoints: number; xpToday: number; xpThisWeek: number; xpThisMonth: number }> => {
  const userRows = await query(
    'SELECT total_xp, total_points FROM users WHERE id = ?',
    [userId],
  );

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const todayResult = await query(
    "SELECT COALESCE(SUM(xp_amount), 0) as total FROM xp_transactions WHERE user_id = ? AND created_at >= ?",
    [userId, todayStart],
  );

  const weekResult = await query(
    "SELECT COALESCE(SUM(xp_amount), 0) as total FROM xp_transactions WHERE user_id = ? AND created_at >= ?",
    [userId, weekStart.toISOString()],
  );

  const monthResult = await query(
    "SELECT COALESCE(SUM(xp_amount), 0) as total FROM xp_transactions WHERE user_id = ? AND created_at >= ?",
    [userId, monthStart],
  );

  return {
    totalXp: userRows[0]?.total_xp || 0,
    totalPoints: userRows[0]?.total_points || 0,
    xpToday: parseInt(todayResult[0]?.total || '0'),
    xpThisWeek: parseInt(weekResult[0]?.total || '0'),
    xpThisMonth: parseInt(monthResult[0]?.total || '0'),
  };
};

export default {
  addXp,
  addPoints,
  getXpHistory,
  getPointHistory,
  getXpStats,
  XP_REWARDS,
};
