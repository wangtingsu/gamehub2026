/**
 * 搜索服务
 *
 * 提供全局搜索功能，支持对游戏、评测、新闻、社区帖子和用户等多类型内容的
 * 模糊搜索。使用 LIKE 进行简单文本匹配（替代全文索引），并返回按相关性和
 * 时间排序的结果。同时提供搜索建议（自动补全）和热门搜索功能。
 *
 * @module search.service
 */

import config from '../config';
import logger from '../utils/logger';
import { query } from '../db';
import { SearchParams } from '../types';
import { getWeightedRatingSubquery } from './level.service';

/**
 * 搜索游戏
 *
 * 根据关键词在游戏标题和描述中进行 LIKE 模糊匹配，返回搜索结果列表。
 * 结果包含加权评分平均值和评测数量，并按推荐等级和创建时间降序排列。
 *
 * @param queryText - 搜索关键词
 * @param limit - 最大返回结果数，默认 10
 * @returns 游戏搜索结果数组，包含 id、title、description、coverImageUrl、rating、reviewCount 等字段
 */
const searchGames = async (queryText: string, limit: number = 10): Promise<any[]> => {
  const searchPattern = `%${queryText}%`;

  const result = await query(
    `SELECT g.*,
            (SELECT COUNT(*) FROM reviews WHERE game_id = g.id) as review_count,
            ${getWeightedRatingSubquery()} as avg_rating
     FROM games g
     WHERE g.title LIKE ? OR g.description LIKE ?
     ORDER BY g.is_featured DESC, g.created_at DESC
     LIMIT ?`,
    [searchPattern, searchPattern, limit]
  );

  return result.map((row: any) => ({
    id: row.id,
    type: 'game',
    title: row.title,
    description: row.description,
    coverImageUrl: row.cover_image_url,
    rating: row.avg_rating ? parseFloat(row.avg_rating).toFixed(1) : null,
    reviewCount: Number(row.review_count) || 0,
    createdAt: row.created_at,
  }));
};

/**
 * 搜索评测
 *
 * 根据关键词在评测标题和内容中进行 LIKE 模糊匹配，关联查询作者信息和
 * 对应游戏标题。评测内容截取前 200 个字符作为摘要。
 *
 * @param queryText - 搜索关键词
 * @param limit - 最大返回结果数，默认 10
 * @returns 评测搜索结果数组，包含标题、内容摘要、评分、作者信息和游戏标题
 */
const searchReviews = async (queryText: string, limit: number = 10): Promise<any[]> => {
  const searchPattern = `%${queryText}%`;

  const result = await query(
    `SELECT r.*, u.username, u.display_name, u.avatar_url, g.title as game_title
     FROM reviews r
     LEFT JOIN users u ON r.author_id = u.id
     LEFT JOIN games g ON r.game_id = g.id
     WHERE r.title LIKE ? OR r.content LIKE ?
     ORDER BY r.published_at DESC
     LIMIT ?`,
    [searchPattern, searchPattern, limit]
  );

  return result.map((row: any) => ({
    id: row.id,
    type: 'review',
    title: row.title,
    content: row.content.substring(0, 200) + (row.content.length > 200 ? '...' : ''),
    rating: row.rating,
    author: {
      id: row.author_id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
    },
    gameTitle: row.game_title,
    likes: row.likes,
    publishedAt: row.published_at,
  }));
};

/**
 * 搜索新闻
 *
 * 根据关键词在新闻标题、内容和摘要中进行 LIKE 模糊匹配，
 * 仅返回已发布的新闻，关联查询作者信息。
 *
 * @param queryText - 搜索关键词
 * @param limit - 最大返回结果数，默认 10
 * @returns 新闻搜索结果数组，包含标题、摘要、封面图和作者信息
 */
const searchNews = async (queryText: string, limit: number = 10): Promise<any[]> => {
  const searchPattern = `%${queryText}%`;

  const result = await query(
    `SELECT n.*, u.username, u.display_name, u.avatar_url
     FROM news n
     LEFT JOIN users u ON n.author_id = u.id
     WHERE (n.title LIKE ? OR n.content LIKE ? OR n.excerpt LIKE ?) AND n.is_published = true
     ORDER BY n.published_at DESC
     LIMIT ?`,
    [searchPattern, searchPattern, searchPattern, limit]
  );

  return result.map((row: any) => ({
    id: row.id,
    type: 'news',
    title: row.title,
    excerpt: row.excerpt,
    coverImageUrl: row.cover_image_url,
    author: {
      id: row.author_id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
    },
    category: row.category,
    publishedAt: row.published_at,
    views: row.views,
  }));
};

/**
 * 搜索社区帖子
 *
 * 根据关键词在社区帖子标题和内容中进行 LIKE 模糊匹配，
 * 仅返回未锁定的帖子，已置顶的帖子优先显示。
 *
 * @param queryText - 搜索关键词
 * @param limit - 最大返回结果数，默认 10
 * @returns 社区帖子搜索结果数组，包含标题、内容摘要、作者信息和分类
 */
const searchCommunityPosts = async (queryText: string, limit: number = 10): Promise<any[]> => {
  const searchPattern = `%${queryText}%`;

  const result = await query(
    `SELECT cp.*, u.username, u.display_name, u.avatar_url
     FROM community_posts cp
     LEFT JOIN users u ON cp.author_id = u.id
     WHERE (cp.title LIKE ? OR cp.content LIKE ?) AND cp.is_locked = false
     ORDER BY cp.is_pinned DESC, cp.published_at DESC
     LIMIT ?`,
    [searchPattern, searchPattern, limit]
  );

  return result.map((row: any) => ({
    id: row.id,
    type: 'community_post',
    title: row.title,
    content: row.content.substring(0, 200) + (row.content.length > 200 ? '...' : ''),
    author: {
      id: row.author_id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
    },
    category: row.category,
    likes: row.likes,
    comments: row.comments,
    publishedAt: row.published_at,
  }));
};

/**
 * 搜索用户
 *
 * 根据关键词在用户名、显示名称和个人简介中进行 LIKE 模糊匹配，
 * 返回匹配的用户基本信息。
 *
 * @param queryText - 搜索关键词
 * @param limit - 最大返回结果数，默认 10
 * @returns 用户搜索结果数组，包含用户名、显示名称、头像和个人简介
 */
const searchUsers = async (queryText: string, limit: number = 10): Promise<any[]> => {
  const searchPattern = `%${queryText}%`;

  const result = await query(
    `SELECT id, username, display_name, avatar_url, bio, created_at
     FROM users
     WHERE username LIKE ? OR display_name LIKE ? OR bio LIKE ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [searchPattern, searchPattern, searchPattern, limit]
  );

  return result.map((row: any) => ({
    id: row.id,
    type: 'user',
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    createdAt: row.created_at,
  }));
};

/**
 * 全局搜索
 *
 * 在多种内容类型中并行执行搜索，支持按类型过滤。将所有类型的搜索结果
 * 合并后按类型统计数量，并支持分页返回。
 *
 * @param searchParams - 搜索参数，包含关键词、页码、每页数量和过滤条件
 * @param searchParams.query - 搜索关键词
 * @param searchParams.page - 当前页码，从 1 开始
 * @param searchParams.limit - 每页结果数
 * @param searchParams.filters - 过滤条件，filters.types 可指定搜索类型数组
 * @returns 搜索结果对象，包含结果列表、总数、分页信息和按类型的数量统计
 */
export const globalSearch = async (
  searchParams: SearchParams
): Promise<{
  results: any[];
  total: number;
  page: number;
  limit: number;
  query?: string;
  byType: Record<string, number>;
}> => {
  const { query: searchQuery = '', page = 1, limit = 20, filters = {} } = searchParams;
  const offset = (page - 1) * limit;

  // 如果没有搜索词，直接返回空结果，避免无效查询
  if (!searchQuery.trim()) {
    return {
      results: [],
      total: 0,
      page,
      limit,
      query: searchQuery,
      byType: {},
    };
  }

  // 根据过滤条件决定要搜索的类型，默认搜索全部五种类型
  const typesToSearch = filters.types || ['game', 'review', 'news', 'community_post', 'user'];
  const allResults: any[] = [];

  // 并行搜索所有指定的类型，提高性能
  const searchPromises: Promise<any[]>[] = [];

  if (typesToSearch.includes('game')) {
    searchPromises.push(searchGames(searchQuery, limit * 2));
  }
  if (typesToSearch.includes('review')) {
    searchPromises.push(searchReviews(searchQuery, limit * 2));
  }
  if (typesToSearch.includes('news')) {
    searchPromises.push(searchNews(searchQuery, limit * 2));
  }
  if (typesToSearch.includes('community_post')) {
    searchPromises.push(searchCommunityPosts(searchQuery, limit * 2));
  }
  if (typesToSearch.includes('user')) {
    searchPromises.push(searchUsers(searchQuery, limit * 2));
  }

  const resultsByType = await Promise.all(searchPromises);

  // 合并结果
  resultsByType.forEach(results => {
    allResults.push(...results);
  });

  // 按类型统计
  const byType: Record<string, number> = {};
  allResults.forEach(result => {
    byType[result.type] = (byType[result.type] || 0) + 1;
  });

  // 分页
  const total = allResults.length;
  const paginatedResults = allResults.slice(offset, offset + limit);

  logger.debug(`全局搜索成功，关键词: "${searchQuery}"，找到${total}条结果，按类型: ${JSON.stringify(byType)}`);

  return {
    results: paginatedResults,
    total,
    page,
    limit,
    query: searchQuery,
    byType,
  };
};

/**
 * 搜索建议（自动补全）
 *
 * 根据输入文本实时返回搜索建议，分别在游戏、用户和评测三种类型中
 * 进行前缀模糊匹配，合并后返回最多 limit * 3 条建议。
 * 游戏和用户建议附带图片，评测建议附带所属游戏名称。
 *
 * @param searchText - 用户输入的搜索文本
 * @param limit - 每种类型的最大建议数，默认 5
 * @returns 搜索建议数组，每条建议包含 type、id、title 等字段
 */
export const searchSuggestions = async (searchText: string, limit: number = 5): Promise<any[]> => {
  if (!searchText.trim()) {
    return [];
  }

  const suggestions: any[] = [];
  const searchPattern = `%${searchText}%`;

  // 查询游戏建议：按标题模糊匹配，推荐等级高的优先
  const gameSuggestions = await query(
    `SELECT id, title, cover_image_url
     FROM games
     WHERE title LIKE ?
     ORDER BY is_featured DESC, created_at DESC
     LIMIT ?`,
    [searchPattern, limit]
  );
  suggestions.push(...gameSuggestions.map((row: any) => ({
    type: 'game',
    id: row.id,
    title: row.title,
    image: row.cover_image_url,
  })));

  // 查询用户建议：按用户名或显示名称模糊匹配
  const userSuggestions = await query(
    `SELECT id, username, display_name, avatar_url
     FROM users
     WHERE username LIKE ? OR display_name LIKE ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [searchPattern, searchPattern, limit]
  );
  suggestions.push(...userSuggestions.map((row: any) => ({
    type: 'user',
    id: row.id,
    title: row.display_name || row.username,
    image: row.avatar_url,
    subtitle: row.username,
  })));

  // 查询评测建议：按评测标题模糊匹配，关联游戏标题作为副标题
  const reviewSuggestions = await query(
    `SELECT r.id, r.title, g.title as game_title
     FROM reviews r
     LEFT JOIN games g ON r.game_id = g.id
     WHERE r.title LIKE ?
     ORDER BY r.published_at DESC
     LIMIT ?`,
    [searchPattern, limit]
  );
  suggestions.push(...reviewSuggestions.map((row: any) => ({
    type: 'review',
    id: row.id,
    title: row.title,
    subtitle: row.game_title,
  })));

  logger.debug(`生成搜索建议成功，关键词: "${searchText}"，建议数量: ${suggestions.length}`);

  // 限制总建议数，避免建议列表过长
  return suggestions.slice(0, limit * 3);
};

/**
 * 获取热门搜索词
 *
 * 返回预设的热门搜索关键词列表，后续可接入搜索日志系统
 * 实现基于真实数据的动态热门搜索。
 *
 * @param limit - 最大返回数量，默认 10
 * @returns 热门搜索词字符串数组
 */
export const getPopularSearches = async (limit: number = 10): Promise<string[]> => {
  // TODO: 集成搜索日志或缓存热门搜索，目前返回静态示例数据
  const popularSearches = [
    'RPG',
    '射击',
    '冒险',
    '多人游戏',
    '独立游戏',
    '2024年新游',
    '免费游戏',
    'Steam特惠',
  ];

  return popularSearches.slice(0, limit);
};

/**
 * 获取搜索统计信息
 *
 * 返回搜索系统的统计数据（总搜索次数和热门查询），
 * 待接入搜索日志后可提供真实统计数据。
 *
 * @returns 搜索统计对象，包含总搜索次数和热门查询列表
 */
export const getSearchStats = async (): Promise<{
  totalSearches: number;
  popularQueries: { query: string; count: number }[];
}> => {
  // TODO: 接入搜索统计系统，目前返回空数据占位
  return {
    totalSearches: 0,
    popularQueries: [],
  };
};

export default {
  globalSearch,
  searchSuggestions,
  getPopularSearches,
  getSearchStats,
};
