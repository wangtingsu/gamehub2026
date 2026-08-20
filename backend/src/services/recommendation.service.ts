/**
 * 游戏推荐服务
 *
 * 提供多维度的游戏推荐功能，包括个性化推荐、相关内容推荐、
 * 热门推荐和协同过滤推荐（基于收藏关联）。
 * 推荐算法基于用户行为数据（收藏、评测、游戏库）和
 * 游戏属性（类型、平台、评分、热度）计算综合推荐分数。
 */
import logger from '../utils/logger';
import { query } from '../db';
import type { RecommendationItem } from '../types/discovery-types';
import { getWeightedRatingSubquery } from './level.service';

/**
 * 获取个性化推荐（基于用户收藏/游戏库/评测历史）
 *
 * 分析用户的收藏、游戏库和评测记录，提取偏好的游戏类型和平台，
 * 然后推荐未拥有/评测过的相关游戏。
 * 推荐分数计算公式：类型匹配 +3 分，平台匹配 +2 分，featured +1 分。
 * 如果用户没有偏好数据，则降级返回热门推荐。
 *
 * @param userId - 用户 ID
 * @param limit - 返回结果数量上限（默认 10）
 * @returns 个性化推荐游戏列表
 */
export const getPersonalizedRecommendations = async (
  userId: string,
  limit: number = 10
): Promise<RecommendationItem[]> => {
  try {
    // 1. 获取用户收藏和游戏库中的游戏类型和平台
    const userPreferences = await query(
      `SELECT
        g.genres,
        g.platforms,
        g.id as game_id
      FROM favorites f
      JOIN games g ON f.game_id = g.id
      WHERE f.user_id = ?
      UNION
      SELECT
        g.genres,
        g.platforms,
        g.id as game_id
      FROM user_game_library ugl
      JOIN games g ON ugl.game_id = g.id
      WHERE ugl.user_id = ?`,
      [userId, userId]
    );

    // 2. 获取用户已评测的游戏（需要在推荐中排除）
    const reviewedGames = await query(
      `SELECT DISTINCT game_id FROM reviews WHERE author_id = ?`,
      [userId]
    );

    // 3. 提取用户的偏好类型和平台，以及已拥有/评测的游戏 ID
    const genreSet = new Set<string>();
    const platformSet = new Set<string>();
    const ownedGameIds = new Set<string>();

    for (const pref of userPreferences) {
      try {
        const genres = typeof pref.genres === 'string' ? JSON.parse(pref.genres) : (pref.genres || []);
        const platforms = typeof pref.platforms === 'string' ? JSON.parse(pref.platforms) : (pref.platforms || []);
        genres.forEach((g: string) => genreSet.add(g));
        platforms.forEach((p: string) => platformSet.add(p));
      } catch {
        // 跳过 JSON 解析失败的记录
      }
      ownedGameIds.add(pref.game_id);
    }
    // 添加已评测游戏的 ID 到排除列表
    for (const r of reviewedGames) {
      ownedGameIds.add(r.game_id);
    }

    // 如果没有偏好数据，返回热门推荐作为降级方案
    if (genreSet.size === 0 && platformSet.size === 0) {
      return getTrendingContent(limit);
    }

    const genres = Array.from(genreSet);
    const platforms = Array.from(platformSet);

    // 4. 构建推荐查询：使用 JSONB 数组元素匹配类型和平台
    // 使用 EXISTS 子查询判断游戏是否匹配用户的偏好类型/平台
    const genreConditions = genres.map(() => `g.genres LIKE '%"' || ? || '"%'`);
    const platformConditions = platforms.map(() => `g.platforms LIKE '%"' || ? || '"%'`);

    // 排除用户已拥有或已评测的游戏
    const excludeIds = Array.from(ownedGameIds).filter(Boolean);
    const excludeCondition = excludeIds.length > 0
      ? `AND g.id NOT IN (${excludeIds.map(() => '?').join(',')})`
      : '';

    const allConditions = [...genreConditions, ...platformConditions];

    // 加权评分：类型匹配 +3，平台匹配 +2，featured +1
    const genreScore = genreConditions.length > 0
      ? `(${genreConditions.map(c => `CASE WHEN ${c} THEN 3 ELSE 0 END`).join(' + ')})`
      : '0';
    const platformScore = platformConditions.length > 0
      ? `(${platformConditions.map(c => `CASE WHEN ${c} THEN 2 ELSE 0 END`).join(' + ')})`
      : '0';
    const featuredScore = 'CASE WHEN g.is_featured THEN 1 ELSE 0 END';

    const scoreExpr = `${genreScore} + ${platformScore} + ${featuredScore}`;

    // 执行推荐查询（params 重复传入用于 WHERE 和 CASE WHEN 的匹配条件）
    const results = await query(
      `SELECT g.id, g.title, g.cover_image_url,
              ${getWeightedRatingSubquery()} as avg_rating,
              ${scoreExpr} as score
       FROM games g
       WHERE (${allConditions.join(' OR ')})
         ${excludeCondition}
       ORDER BY score DESC, g.created_at DESC
       LIMIT ?`,
      [...genres, ...platforms, ...genres, ...platforms, ...excludeIds, limit]
    );

    return results.map((row: any) => ({
      id: row.id,
      type: 'game' as const,
      title: row.title,
      coverImageUrl: row.cover_image_url,
      rating: row.avg_rating ? parseFloat(row.avg_rating).toFixed(1) : null,
      reason: 'Recommended for you',
      score: row.score,
    }));
  } catch (error) {
    logger.error(`获取个性化推荐失败: ${error}`);
    return getTrendingContent(limit);
  }
};

/**
 * 获取相关内容推荐
 *
 * 根据当前内容（游戏或评测）的类型和属性，推荐相似的内容。
 * - 游戏：基于同类型和同平台推荐其他游戏
 * - 评测：推荐同一游戏的其他评测
 *
 * @param contentType - 当前内容的类型（'game' 或 'review'）
 * @param contentId - 当前内容的 ID
 * @param limit - 返回结果数量上限（默认 8）
 * @returns 相关推荐内容列表
 */
export const getRelatedContent = async (
  contentType: string,
  contentId: string,
  limit: number = 8
): Promise<RecommendationItem[]> => {
  try {
    if (contentType === 'game') {
      // 基于同类型和同平台的游戏推荐
      const game = await query(
        `SELECT genres, platforms FROM games WHERE id = ?`,
        [contentId]
      );
      if (!game.length) return [];

      const g = game[0];
      let genres: string[] = [];
      let platforms: string[] = [];
      try {
        genres = typeof g.genres === 'string' ? JSON.parse(g.genres) : (g.genres || []);
        platforms = typeof g.platforms === 'string' ? JSON.parse(g.platforms) : (g.platforms || []);
      } catch { /* ignore */ }

      if (!genres.length && !platforms.length) return [];

      // 同类型加权 +3，同平台加权 +1
      const genreConds = genres.map(() => `g.genres LIKE '%"' || ? || '"%'`);
      const platformConds = platforms.map(() => `g.platforms LIKE '%"' || ? || '"%'`);

      const scoreGenre = genreConds.length > 0
        ? `(${genreConds.map(c => `CASE WHEN ${c} THEN 3 ELSE 0 END`).join(' + ')})`
        : '0';
      const scorePlatform = platformConds.length > 0
        ? `(${platformConds.map(c => `CASE WHEN ${c} THEN 1 ELSE 0 END`).join(' + ')})`
        : '0';

      const results = await query(
        `SELECT g.id, g.title, g.cover_image_url,
                ${getWeightedRatingSubquery()} as avg_rating,
                (${scoreGenre} + ${scorePlatform}) as score
         FROM games g
         WHERE g.id != ?
           AND (${[...genreConds, ...platformConds].join(' OR ')})
         ORDER BY score DESC, g.created_at DESC
         LIMIT ?`,
        [...genres, ...platforms, contentId, ...genres, ...platforms, limit]
      );

      return results.map((row: any) => ({
        id: row.id,
        type: 'game' as const,
        title: row.title,
        coverImageUrl: row.cover_image_url,
        rating: row.avg_rating ? parseFloat(row.avg_rating).toFixed(1) : null,
        reason: 'Related content',
        score: row.score,
      }));
    }

    if (contentType === 'review') {
      // 同游戏的其他评测推荐（按点赞数排序）
      const review = await query(
        `SELECT game_id FROM reviews WHERE id = ?`,
        [contentId]
      );
      if (!review.length) return [];
      const gameId = review[0].game_id;

      const results = await query(
        `SELECT r.id, r.title, g.title as game_title, g.cover_image_url, r.rating, r.likes
         FROM reviews r
         JOIN games g ON r.game_id = g.id
         WHERE r.game_id = ? AND r.id != ?
         ORDER BY r.likes DESC
         LIMIT ?`,
        [gameId, contentId, limit]
      );

      return results.map((row: any) => ({
        id: row.id,
        type: 'review' as const,
        title: row.title,
        coverImageUrl: row.cover_image_url,
        rating: row.rating,
        reason: `More reviews for ${row.game_title}`,
        score: row.likes || 0,
        likes: row.likes,
      }));
    }

    return [];
  } catch (error) {
    logger.error(`获取相关内容推荐失败: ${error}`);
    return [];
  }
};

/**
 * 获取热门推荐（基于综合热度评分）
 *
 * 按综合热度评分对游戏进行排序推荐。
 * 热度评分 = views * 0.3 + review_count * 10 * 0.4 + 新游戏加分 * 0.3
 * 新游戏加分：发布 30 天内的游戏额外加 50 分。
 *
 * @param limit - 返回结果数量上限（默认 10）
 * @returns 热门游戏推荐列表
 */
export const getTrendingContent = async (limit: number = 10): Promise<RecommendationItem[]> => {
  const newGameBonus = `CASE WHEN g.created_at > datetime('now', '-30 days') THEN 50 ELSE 0 END`;

  try {
    const results = await query(
      `SELECT g.id, g.title, g.cover_image_url,
              ${getWeightedRatingSubquery()} as avg_rating,
              g.views,
              (SELECT COUNT(*) FROM reviews WHERE game_id = g.id) as review_count,
              g.created_at,
              (g.views * 0.3 + (SELECT COUNT(*) FROM reviews WHERE game_id = g.id) * 10 * 0.4 +
               ${newGameBonus} * 0.3) as hot_score
       FROM games g
       ORDER BY hot_score DESC
       LIMIT ?`,
      [limit]
    );

    return results.map((row: any) => ({
      id: row.id,
      type: 'game' as const,
      title: row.title,
      coverImageUrl: row.cover_image_url,
      rating: row.avg_rating ? parseFloat(row.avg_rating).toFixed(1) : null,
      reason: 'Trending',
      score: row.hot_score,
      likes: row.views,
    }));
  } catch (error) {
    logger.error(`获取热门推荐失败: ${error}`);
    return [];
  }
};

/**
 * 获取"用户也喜欢"（基于收藏关联的协同过滤）
 *
 * 通过分析其他用户的收藏行为进行协同过滤推荐。
 * 先找出收藏了指定游戏的用户，再找出这些用户还收藏的其他游戏，
 * 按收藏人数降序排列，实现"购买此商品的用户也购买了"类似推荐。
 *
 * @param gameId - 当前游戏 ID
 * @param limit - 返回结果数量上限（默认 8）
 * @returns 基于协同过滤的推荐列表
 */
export const getUsersAlsoLiked = async (
  gameId: string,
  limit: number = 8
): Promise<RecommendationItem[]> => {
  try {
    // 找收藏了该游戏的用户
    const users = await query(
      `SELECT DISTINCT user_id FROM favorites WHERE game_id = ?`,
      [gameId]
    );
    if (!users.length) return [];

    const userIds = users.map((u: any) => u.user_id);

    // 这些用户还收藏的其他游戏（排除当前游戏，按收藏人数排序）
    const results = await query(
      `SELECT f.game_id, g.title, g.cover_image_url,
              ${getWeightedRatingSubquery()} as avg_rating,
              COUNT(DISTINCT f.user_id) as user_count
       FROM favorites f
       JOIN games g ON f.game_id = g.id
       WHERE f.user_id IN (${userIds.map(() => '?').join(',')})
         AND f.game_id != ?
       GROUP BY f.game_id, g.title, g.cover_image_url
       ORDER BY user_count DESC
       LIMIT ?`,
      [...userIds, gameId, limit]
    );

    return results.map((row: any) => ({
      id: row.game_id,
      type: 'game' as const,
      title: row.title,
      coverImageUrl: row.cover_image_url,
      rating: row.avg_rating ? parseFloat(row.avg_rating).toFixed(1) : null,
      reason: `${row.user_count} users also liked`,
      score: row.user_count,
    }));
  } catch (error) {
    logger.error(`获取"用户也喜欢"失败: ${error}`);
    return [];
  }
};

export default {
  getPersonalizedRecommendations,
  getRelatedContent,
  getTrendingContent,
  getUsersAlsoLiked,
};
