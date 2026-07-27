/**
 * 关注服务
 * 提供用户关注/取消关注、关注者列表、正在关注列表、共同关注等功能的完整实现。
 * 关注操作附带 XP 发放、成就检查和实时通知推送。
 */

import config from '../config';
import logger from '../utils/logger';
import { query, execute, transaction } from '../db';
import {
  Follow,
  FollowCreateInput,
  PaginationParams
} from '../types';
import { NotFoundError, ConflictError } from '../middlewares/error.middleware';
import xpService from './xp.service';
import achievementService from './achievement.service';
import { createNotification } from './notification.service';
import { sendFollowNotification } from './socket.service';

/**
 * 从数据库行映射到 Follow 对象
 * 将 snake_case 的数据库字段转换为 camelCase 的 Follow 类型。
 * @param dbFollow - 数据库查询结果行
 * @returns 转换后的 Follow 对象
 */
const mapFollowFromDb = (dbFollow: any): Follow => ({
  id: dbFollow.id.toString(),
  followerId: dbFollow.follower_id.toString(),
  followingId: dbFollow.following_id.toString(),
  createdAt: new Date(dbFollow.created_at),
  deletedAt: dbFollow.deleted_at ? new Date(dbFollow.deleted_at) : undefined,
  version: dbFollow.version ? Number(dbFollow.version) : 1,
});

/**
 * 关注用户
 * 在事务中完成关注操作：先验证被关注用户存在、未重复关注、非自关注，
 * 然后插入关注记录，最后异步发放 XP、检查成就并推送关注通知。
 * @param followerId - 关注者用户ID
 * @param followingId - 被关注者用户ID
 * @returns 创建的关注记录
 * @throws NotFoundError - 被关注用户不存在时抛出
 * @throws ConflictError - 已关注该用户或尝试关注自己时抛出
 */
export const followUser = async (followerId: string, followingId: string): Promise<Follow> => {
  return await transaction(async () => {
    // 检查被关注用户是否存在
    const userExists = await query(
      'SELECT id FROM users WHERE id = ?',
      [followingId]
    );

    if (userExists.length === 0) {
      throw new NotFoundError(`用户ID ${followingId} 不存在`);
    }

    // 检查是否已经关注
    const existingFollow = await query(
      'SELECT id FROM follows WHERE follower_id = ? AND following_id = ? AND deleted_at IS NULL',
      [followerId, followingId]
    );

    if (existingFollow.length > 0) {
      throw new ConflictError('已经关注该用户');
    }

    // 不能关注自己
    if (followerId === followingId) {
      throw new ConflictError('不能关注自己');
    }

    const result = await execute(
      `INSERT INTO follows (
        follower_id, following_id, created_at
      ) VALUES (?, ?, ?)`,
      [
        followerId,
        followingId,
        new Date().toISOString(),
      ]
    );

    // 查询刚插入的记录
    const inserted = await query(
      'SELECT * FROM follows WHERE id = ?',
      [result.lastInsertRowid]
    );

    const follow = mapFollowFromDb(inserted[0]);
    logger.info(`关注用户成功: 关注者 ${followerId} -> 被关注者 ${followingId}`);

    // 发放 XP 并检查成就
    xpService.addXp(followingId, 'receive_follow', 'follow', followerId).catch(err => logger.error('XP 发放失败:', err));
    achievementService.checkAndAwardAchievements(followingId).catch(err => logger.error('成就检查失败:', err));

    // 创建关注通知（数据库）
    try {
      const followerInfo = await query(
        'SELECT id, username, display_name, avatar_url FROM users WHERE id = ?',
        [followerId],
      );
      if (followerInfo.length > 0) {
        const follower = followerInfo[0];
        await createNotification({
          userId: followingId,
          type: 'follow',
          title: '新关注',
          message: `${follower.display_name || follower.username} 关注了您`,
          data: {
            followerId: followerId,
            followerUsername: follower.username,
            followerDisplayName: follower.display_name,
            followerAvatarUrl: follower.avatar_url,
          },
        });

        // WebSocket 实时推送
        sendFollowNotification(followingId, {
          id: follower.id,
          username: follower.username,
          displayName: follower.display_name,
          avatarUrl: follower.avatar_url,
        });
      }
    } catch (err) {
      logger.error(`发送关注通知失败: followingId=${followingId}, followerId=${followerId}`, err);
    }

    return follow;
  });
};

/**
 * 取消关注
 * 使用软删除策略（设置 deleted_at 字段），保留历史记录。
 * @param followerId - 关注者用户ID
 * @param followingId - 被关注者用户ID（即将取消关注的目标）
 * @returns 取消操作是否成功
 * @throws NotFoundError - 未关注该用户时抛出
 */
export const unfollowUser = async (followerId: string, followingId: string): Promise<boolean> => {
  const now = new Date().toISOString();
  const result = await execute(
    `UPDATE follows
     SET deleted_at = ?
     WHERE follower_id = ? AND following_id = ? AND deleted_at IS NULL`,
    [now, followerId, followingId]
  );

  if (result.changes === 0) {
    throw new NotFoundError('未关注该用户');
  }

  logger.info(`取消关注成功: 关注者 ${followerId} -> 被关注者 ${followingId}`);
  return true;
};

/**
 * 获取用户的关注者（粉丝）列表
 * 支持分页查询，返回关注者及其用户信息（用户名、头像、简介等）。
 * @param userId - 用户ID（被关注者）
 * @param pagination - 分页参数（页码和每页条数）
 * @returns 关注者列表、总数及分页信息
 */
export const getFollowers = async (
  userId: string,
  pagination: PaginationParams = {}
): Promise<{ followers: any[]; total: number; page: number; limit: number }> => {
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;

  // 首先获取总数
  const countSql = `SELECT COUNT(*) as total FROM follows WHERE following_id = ? AND deleted_at IS NULL`;
  const countResult = await query(countSql, [userId]);
  const total = parseInt(countResult[0]?.total || 0);

  // 然后获取分页数据（包括关注者信息）
  const dataSql = `
    SELECT f.*, u.username, u.display_name, u.avatar_url, u.bio
    FROM follows f
    LEFT JOIN users u ON f.follower_id = u.id
    WHERE f.following_id = ? AND f.deleted_at IS NULL
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const result = await query(dataSql, [userId, limit, offset]);

  const followers = result.map((row: any) => ({
    ...mapFollowFromDb(row),
    follower: {
      id: row.follower_id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      bio: row.bio,
    },
  }));

  logger.debug(`获取关注者列表成功，用户ID: ${userId}，第${page}页，每页${limit}条，共${total}条`);

  return {
    followers,
    total,
    page,
    limit,
  };
};

/**
 * 获取用户正在关注的用户列表
 * 支持分页查询，返回被关注者及其用户信息。
 * @param userId - 用户ID（关注者）
 * @param pagination - 分页参数（页码和每页条数）
 * @returns 正在关注列表、总数及分页信息
 */
export const getFollowing = async (
  userId: string,
  pagination: PaginationParams = {}
): Promise<{ following: any[]; total: number; page: number; limit: number }> => {
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;

  // 首先获取总数
  const countSql = `SELECT COUNT(*) as total FROM follows WHERE follower_id = ? AND deleted_at IS NULL`;
  const countResult = await query(countSql, [userId]);
  const total = parseInt(countResult[0]?.total || 0);

  // 然后获取分页数据（包括被关注者信息）
  const dataSql = `
    SELECT f.*, u.username, u.display_name, u.avatar_url, u.bio
    FROM follows f
    LEFT JOIN users u ON f.following_id = u.id
    WHERE f.follower_id = ? AND f.deleted_at IS NULL
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const result = await query(dataSql, [userId, limit, offset]);

  const following = result.map((row: any) => ({
    ...mapFollowFromDb(row),
    followingUser: {
      id: row.following_id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      bio: row.bio,
    },
  }));

  logger.debug(`获取正在关注列表成功，用户ID: ${userId}，第${page}页，每页${limit}条，共${total}条`);

  return {
    following,
    total,
    page,
    limit,
  };
};

/**
 * 检查关注状态
 * 查询指定用户是否已关注目标用户。
 * @param followerId - 关注者用户ID
 * @param followingId - 被关注者用户ID
 * @returns 已关注返回 true，否则返回 false
 */
export const checkFollowStatus = async (followerId: string, followingId: string): Promise<boolean> => {
  const result = await query(
    'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ? AND deleted_at IS NULL LIMIT 1',
    [followerId, followingId]
  );

  return result.length > 0;
};

/**
 * 获取关注统计信息
 * 查询用户的关注者数量和正在关注数量。
 * @param userId - 用户ID
 * @returns 关注者数量和正在关注数量
 */
export const getFollowStats = async (userId: string): Promise<{
  followersCount: number;
  followingCount: number;
}> => {
  const followersResult = await query(
    'SELECT COUNT(*) as count FROM follows WHERE following_id = ? AND deleted_at IS NULL',
    [userId]
  );
  const followersCount = parseInt(followersResult[0]?.count || 0);

  const followingResult = await query(
    'SELECT COUNT(*) as count FROM follows WHERE follower_id = ? AND deleted_at IS NULL',
    [userId]
  );
  const followingCount = parseInt(followingResult[0]?.count || 0);

  logger.debug(`获取关注统计信息成功，用户ID: ${userId}，关注者: ${followersCount}，正在关注: ${followingCount}`);

  return {
    followersCount,
    followingCount,
  };
};

/**
 * 获取两个用户的共同关注（互相关注的用户交集）
 * 使用 SQL INTERSECT 查询两个用户的关注列表交集。
 * @param userId1 - 用户1的ID
 * @param userId2 - 用户2的ID
 * @param limit - 返回的最大条数，默认为 10
 * @returns 共同关注的用户信息列表
 */
export const getMutualFollows = async (
  userId1: string,
  userId2: string,
  limit: number = 10
): Promise<any[]> => {
  const result = await query(
    `SELECT u.id, u.username, u.display_name, u.avatar_url
     FROM users u
     WHERE u.id IN (
       SELECT f1.following_id
       FROM follows f1
       WHERE f1.follower_id = ? AND f1.deleted_at IS NULL
       INTERSECT
       SELECT f2.following_id
       FROM follows f2
       WHERE f2.follower_id = ? AND f2.deleted_at IS NULL
     )
     LIMIT ?`,
    [userId1, userId2, limit]
  );

  const mutualFollows = result.map((row: any) => ({
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
  }));

  logger.debug(`获取共同关注成功，用户1: ${userId1}，用户2: ${userId2}，数量: ${mutualFollows.length}`);

  return mutualFollows;
};

export default {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  checkFollowStatus,
  getFollowStats,
  getMutualFollows,
};
