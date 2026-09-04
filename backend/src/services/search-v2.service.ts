/**
 * 高级搜索服务（v2 版本）
 *
 * 提供跨内容类型的全文搜索功能，支持游戏、评测、新闻、社区帖子和用户五种类型。
 * 特点包括：
 * - 关键词高亮片段提取
 * - 高级筛选器（类型、平台、日期范围、评分范围）
 * - 多种排序方式（相关性、日期、评分、热度）
 * - 搜索结果按类型统计
 * - 搜索建议（联想搜索）
 * - 搜索趋势分析
 * - 搜索日志记录
 *
 * 搜索算法使用 SQL LIKE 模糊匹配 + 加权排序策略。
 */
import config from '../config';
import logger from '../utils/logger';
import { query, execute } from '../db';
import type { SearchParamsV2, SearchResultV2 } from '../types/discovery-types';
import { getWeightedRatingSubquery } from './level.service';

/**
 * 生成搜索结果中匹配关键词的高亮片段
 *
 * 在文本中找到第一个关键词出现位置，截取前后各 50 个字符作为片段。
 * 在片段前后添加省略号以表示截断。
 *
 * @param text - 原始文本
 * @param keywords - 搜索关键词列表
 * @param maxLen - 片段最大长度（默认 100）
 * @returns 包含关键词上下文的高亮片段
 */
function extractHighlight(text: string, keywords: string[], maxLen: number = 100): string {
  if (!text || !keywords.length) return text?.substring(0, maxLen) || '';

  // 查找第一个匹配的关键词位置
  const lowerText = text.toLowerCase();
  let firstIdx = -1;
  for (const kw of keywords) {
    const idx = lowerText.indexOf(kw.toLowerCase());
    if (idx !== -1 && (firstIdx === -1 || idx < firstIdx)) {
      firstIdx = idx;
    }
  }

  // 没有匹配则直接返回文本开头
  if (firstIdx === -1) return text.substring(0, maxLen);

  // 以匹配位置为中心截取上下文片段
  const start = Math.max(0, firstIdx - 50);
  const end = Math.min(text.length, firstIdx + 50);
  let snippet = text.substring(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';
  return snippet;
}

/**
 * 构建高级筛选的 WHERE 子句和参数
 *
 * 支持按类型（genres）、平台（platforms）、日期范围、评分范围筛选。
 * 类型和平台使用 JSONB 数组元素匹配（PostgreSQL 特性）。
 * 表别名可自定义，默认为 'g'。
 *
 * @param filters - 筛选条件对象
 * @param tableAlias - 查询表的别名（默认 'g'）
 * @returns WHERE 子句片段和参数数组
 */
function buildAdvancedFilters(filters: {
  genres?: string[];
  platforms?: string[];
  dateFrom?: string;
  dateTo?: string;
  ratingMin?: number;
  ratingMax?: number;
  tags?: string[];
}, tableAlias: string = 'g'): { clause: string; params: any[] } {
  const conditions: string[] = [];
  const params: any[] = [];

  // 类型筛选：使用 LIKE 匹配 JSON 数组元素（SQLite 兼容）
  if (filters.genres && filters.genres.length > 0) {
    const genreConds = filters.genres.map(() => `${tableAlias}.genres LIKE '%"' || ? || '"%'`);
    conditions.push(`(${genreConds.join(' OR ')})`);
    params.push(...filters.genres);
  }

  // 平台筛选（同类型筛选逻辑）
  if (filters.platforms && filters.platforms.length > 0) {
    const platformConds = filters.platforms.map(() => `${tableAlias}.platforms LIKE '%"' || ? || '"%'`);
    conditions.push(`(${platformConds.join(' OR ')})`);
    params.push(...filters.platforms);
  }

  // 日期范围筛选
  if (filters.dateFrom) {
    conditions.push(`${tableAlias}.created_at >= ?`);
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    conditions.push(`${tableAlias}.created_at <= ?`);
    params.push(filters.dateTo);
  }

  // 评分范围筛选（允许 NULL 评分）
  if (filters.ratingMin !== undefined) {
    conditions.push(`(${tableAlias}.rating IS NULL OR ${tableAlias}.rating >= ?)`);
    params.push(filters.ratingMin);
  }

  if (filters.ratingMax !== undefined) {
    conditions.push(`(${tableAlias}.rating IS NULL OR ${tableAlias}.rating <= ?)`);
    params.push(filters.ratingMax);
  }

  return {
    clause: conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : '',
    params,
  };
}

/**
 * 全文搜索游戏（含高级筛选）
 *
 * 按标题和描述进行模糊匹配，支持高级筛选。
 * 排序策略：相关性（标题匹配优先）、featured 次之、按创建时间降序。
 * 也可按日期、评分或热度排序。
 *
 * @param queryText - 搜索原始文本
 * @param keywords - 分词后的关键词数组
 * @param filters - 搜索参数（含高级筛选）
 * @param limit - 每页条数
 * @param offset - 偏移量
 * @returns 搜索结果和总数
 */
async function searchGamesV2(
  queryText: string,
  keywords: string[],
  filters: SearchParamsV2,
  limit: number = 10,
  offset: number = 0
): Promise<{ results: SearchResultV2[]; total: number }> {
  const searchPattern = `%${queryText}%`;
  const filterResult = buildAdvancedFilters(filters, 'g');

  // WHERE 子句：标题或描述匹配 + 高级筛选条件
  const whereClause = `(g.title LIKE ? OR g.description LIKE ?)${filterResult.clause}`;
  const countParams = [searchPattern, searchPattern, ...filterResult.params];
  const dataParams = [searchPattern, searchPattern, ...filterResult.params, limit, offset];

  // 加权排序：title 匹配优先，featured 次之，时间排序
  const sortClause = filters.sortBy === 'date' ? 'g.created_at DESC' :
    filters.sortBy === 'rating' ? 'coalesce(avg_rating, 0) DESC' :
    filters.sortBy === 'popularity' ? 'g.views DESC' :
    `CASE WHEN g.title LIKE ? THEN 2 ELSE 1 END DESC, g.is_featured DESC, g.created_at DESC`;

  // 按相关性排序时需要额外的参数用于 CASE WHEN
  const dataSortParams = filters.sortBy === 'relevance' || !filters.sortBy ?
    [searchPattern, searchPattern, ...filterResult.params] :
    [...filterResult.params];

  // 获取总数
  const totalResult = await query(
    `SELECT COUNT(*) as total FROM games g WHERE ${whereClause}`,
    countParams
  );
  const total = Number(totalResult[0]?.total || 0);

  // 获取分页数据（含评测数和加权评分）
  const result = await query(
    `SELECT g.*,
            (SELECT COUNT(*) FROM reviews WHERE game_id = g.id) as review_count,
            ${getWeightedRatingSubquery()} as avg_rating
     FROM games g
     WHERE ${whereClause}
     ORDER BY ${sortClause}
     LIMIT ? OFFSET ?`,
    [...dataSortParams, limit, offset]
  );

  return {
    total,
    results: result.map((row: any) => ({
      id: row.id,
      type: 'game' as const,
      title: row.title,
      description: row.description,
      coverImageUrl: row.cover_image_url,
      rating: row.avg_rating ? parseFloat(row.avg_rating).toFixed(1) : null,
      reviewCount: Number(row.review_count) || 0,
      createdAt: row.created_at,
      views: row.views,
      highlight: {
        title: extractHighlight(row.title, keywords),
        description: extractHighlight(row.description, keywords),
      },
    })),
  };
}

/**
 * 全文搜索评测（含高级筛选）
 *
 * 按标题和内容进行模糊匹配，支持日期范围筛选。
 *
 * @param queryText - 搜索原始文本
 * @param keywords - 分词后的关键词数组
 * @param filters - 搜索参数
 * @param limit - 每页条数
 * @param offset - 偏移量
 * @returns 搜索结果和总数（含作者和高亮信息）
 */
async function searchReviewsV2(
  queryText: string,
  keywords: string[],
  filters: SearchParamsV2,
  limit: number = 10,
  offset: number = 0
): Promise<{ results: SearchResultV2[]; total: number }> {
  const searchPattern = `%${queryText}%`;

  // 日期范围筛选
  let dateFilter = '';
  const dateParams: any[] = [];
  if (filters.dateFrom) {
    dateFilter += ' AND r.published_at >= ?';
    dateParams.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    dateFilter += ' AND r.published_at <= ?';
    dateParams.push(filters.dateTo);
  }

  const sortClause = filters.sortBy === 'date' ? 'r.published_at DESC' :
    filters.sortBy === 'rating' ? 'r.rating DESC' :
    'r.published_at DESC';

  // 获取总数
  const totalResult = await query(
    `SELECT COUNT(*) as total FROM reviews r
     WHERE (r.title LIKE ? OR r.content LIKE ?)${dateFilter}`,
    [searchPattern, searchPattern, ...dateParams]
  );
  const total = Number(totalResult[0]?.total || 0);

  // 获取分页数据，关联作者和游戏信息
  const result = await query(
    `SELECT r.*, u.username, u.display_name, u.avatar_url, g.title as game_title
     FROM reviews r
     LEFT JOIN users u ON r.author_id = u.id
     LEFT JOIN games g ON r.game_id = g.id
     WHERE (r.title LIKE ? OR r.content LIKE ?)${dateFilter}
     ORDER BY ${sortClause}
     LIMIT ? OFFSET ?`,
    [searchPattern, searchPattern, ...dateParams, limit, offset]
  );

  return {
    total,
    results: result.map((row: any) => ({
      id: row.id,
      type: 'review' as const,
      title: row.title,
      content: row.content?.substring(0, 200),
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
      highlight: {
        title: extractHighlight(row.title, keywords),
        content: extractHighlight(row.content || '', keywords, 150),
      },
    })),
  };
}

/**
 * 全文搜索新闻
 *
 * 按标题、内容和摘要进行模糊匹配，仅搜索已发布的新闻。
 * 支持日期范围筛选。
 *
 * @param queryText - 搜索原始文本
 * @param keywords - 分词后的关键词数组
 * @param filters - 搜索参数
 * @param limit - 每页条数
 * @param offset - 偏移量
 * @returns 搜索结果和总数（含作者和高亮信息）
 */
async function searchNewsV2(
  queryText: string,
  keywords: string[],
  filters: SearchParamsV2,
  limit: number = 10,
  offset: number = 0
): Promise<{ results: SearchResultV2[]; total: number }> {
  const searchPattern = `%${queryText}%`;

  // 日期范围筛选
  let dateFilter = '';
  const dateParams: any[] = [];
  if (filters.dateFrom) {
    dateFilter += ' AND n.published_at >= ?';
    dateParams.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    dateFilter += ' AND n.published_at <= ?';
    dateParams.push(filters.dateTo);
  }

  // 获取总数（仅已发布的新闻）
  const totalResult = await query(
    `SELECT COUNT(*) as total FROM news n
     WHERE (n.title LIKE ? OR n.content LIKE ? OR n.excerpt LIKE ?) AND n.is_published = true${dateFilter}`,
    [searchPattern, searchPattern, searchPattern, ...dateParams]
  );
  const total = Number(totalResult[0]?.total || 0);

  // 获取分页数据，关联作者信息
  const result = await query(
    `SELECT n.*, u.username, u.display_name, u.avatar_url
     FROM news n
     LEFT JOIN users u ON n.author_id = u.id
     WHERE (n.title LIKE ? OR n.content LIKE ? OR n.excerpt LIKE ?) AND n.is_published = true${dateFilter}
     ORDER BY n.published_at DESC
     LIMIT ? OFFSET ?`,
    [searchPattern, searchPattern, searchPattern, ...dateParams, limit, offset]
  );

  return {
    total,
    results: result.map((row: any) => ({
      id: row.id,
      type: 'news' as const,
      slug: row.slug,
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
      highlight: {
        title: extractHighlight(row.title, keywords),
        content: extractHighlight(row.content || row.excerpt || '', keywords, 150),
      },
    })),
  };
}

/**
 * 搜索社区帖子
 *
 * 按标题和内容进行模糊匹配，仅搜索未锁定（is_locked = false）的帖子。
 * 支持日期范围筛选，排序上已置顶帖优先。
 *
 * @param queryText - 搜索原始文本
 * @param keywords - 分词后的关键词数组
 * @param filters - 搜索参数
 * @param limit - 每页条数
 * @param offset - 偏移量
 * @returns 搜索结果和总数（含作者和高亮信息）
 */
async function searchCommunityPostsV2(
  queryText: string,
  keywords: string[],
  filters: SearchParamsV2,
  limit: number = 10,
  offset: number = 0
): Promise<{ results: SearchResultV2[]; total: number }> {
  const searchPattern = `%${queryText}%`;

  // 日期范围筛选
  let dateFilter = '';
  const dateParams: any[] = [];
  if (filters.dateFrom) {
    dateFilter += ' AND cp.published_at >= ?';
    dateParams.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    dateFilter += ' AND cp.published_at <= ?';
    dateParams.push(filters.dateTo);
  }

  // 获取总数
  const totalResult = await query(
    `SELECT COUNT(*) as total FROM community_posts cp
     WHERE (cp.title LIKE ? OR cp.content LIKE ?) AND cp.is_locked = false${dateFilter}`,
    [searchPattern, searchPattern, ...dateParams]
  );
  const total = Number(totalResult[0]?.total || 0);

  // 获取分页数据（已置顶优先）
  const result = await query(
    `SELECT cp.*, u.username, u.display_name, u.avatar_url
     FROM community_posts cp
     LEFT JOIN users u ON cp.author_id = u.id
     WHERE (cp.title LIKE ? OR cp.content LIKE ?) AND cp.is_locked = false${dateFilter}
     ORDER BY cp.is_pinned DESC, cp.published_at DESC
     LIMIT ? OFFSET ?`,
    [searchPattern, searchPattern, ...dateParams, limit, offset]
  );

  return {
    total,
    results: result.map((row: any) => ({
      id: row.id,
      type: 'community_post' as const,
      title: row.title,
      content: row.content?.substring(0, 200),
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
      highlight: {
        title: extractHighlight(row.title, keywords),
        content: extractHighlight(row.content || '', keywords, 150),
      },
    })),
  };
}

/**
 * 搜索用户
 *
 * 按用户名、显示名称和个人简介进行模糊匹配。
 *
 * @param queryText - 搜索原始文本
 * @param keywords - 分词后的关键词数组
 * @param _filters - 搜索参数（用户搜索暂不支持高级筛选）
 * @param limit - 每页条数
 * @param offset - 偏移量
 * @returns 搜索结果和总数（含高亮信息）
 */
async function searchUsersV2(
  queryText: string,
  keywords: string[],
  _filters: SearchParamsV2,
  limit: number = 10,
  offset: number = 0
): Promise<{ results: SearchResultV2[]; total: number }> {
  const searchPattern = `%${queryText}%`;

  // 获取总数
  const totalResult = await query(
    `SELECT COUNT(*) as total FROM users
     WHERE username LIKE ? OR display_name LIKE ? OR bio LIKE ?`,
    [searchPattern, searchPattern, searchPattern]
  );
  const total = Number(totalResult[0]?.total || 0);

  // 获取分页数据
  const result = await query(
    `SELECT id, username, display_name, avatar_url, bio, created_at
     FROM users
     WHERE username LIKE ? OR display_name LIKE ? OR bio LIKE ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [searchPattern, searchPattern, searchPattern, limit, offset]
  );

  return {
    total,
    results: result.map((row: any) => ({
      id: row.id,
      type: 'user' as const,
      title: row.display_name || row.username,
      description: row.bio,
      avatarUrl: row.avatar_url,
      createdAt: row.created_at,
      highlight: {
        title: extractHighlight(row.display_name || row.username, keywords),
      },
    })),
  };
}

/**
 * 记录搜索日志
 *
 * 将用户的搜索行为记录到 search_logs 表中，用于后续搜索趋势分析和热门关键词统计。
 * 日志记录失败不影响搜索结果返回。
 *
 * @param queryText - 搜索关键词
 * @param resultCount - 搜索结果数量
 * @param userId - 搜索用户 ID（可选，未登录用户为 null）
 * @param ipAddress - 用户 IP 地址（可选）
 * @param filters - 搜索筛选条件 JSON 字符串（可选）
 */
export const logSearchQuery = async (
  queryText: string,
  resultCount: number,
  userId?: string,
  ipAddress?: string,
  filters?: string
): Promise<void> => {
  try {
    await execute(
      `INSERT INTO search_logs (query, result_count, user_id, ip_address, filters, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [queryText, resultCount, userId || null, ipAddress || null, filters || null]
    );
  } catch (error) {
    logger.warn(`记录搜索日志失败: ${error}`);
  }
};

/**
 * 高级搜索（v2 版本）
 *
 * 整合全文搜索 + 高级筛选 + 高亮功能的核心入口。
 * 支持多类型并行搜索，搜索结果跨类型混合，按指定排序方式重排。
 * 排序方式包括：相关性（默认）、日期、评分。
 * 搜索完成后异步记录搜索日志。
 *
 * @param searchParams - 搜索参数（关键词、分页、搜索类型、高级筛选、排序方式）
 * @returns 聚合的搜索结果，包含：
 *   - results: 当前页的搜索结果数组
 *   - total: 总结果数
 *   - page/limit: 当前分页参数
 *   - query: 搜索关键词
 *   - byType: 各类型的命中数量统计
 */
export const advancedSearch = async (
  searchParams: SearchParamsV2
): Promise<{
  results: SearchResultV2[];
  total: number;
  page: number;
  limit: number;
  query?: string;
  byType: Record<string, number>;
}> => {
  const { query: searchQuery = '', page = 1, limit = 20, types, sortBy } = searchParams;
  const offset = (page - 1) * limit;
  // 将搜索文本拆分为独立的关键词（去空）
  const keywords = searchQuery.trim().split(/\s+/).filter(Boolean);

  // 空查询直接返回空结果
  if (!searchQuery.trim()) {
    return { results: [], total: 0, page, limit, query: searchQuery, byType: {} };
  }

  // 确定要搜索的内容类型（默认搜索全部五种类型）
  const typesToSearch = types || ['game', 'review', 'news', 'community_post', 'user'];
  const allResults: SearchResultV2[] = [];
  const typeTotals: Record<string, number> = {};
  // 每种类型内部查询更大的结果集以支持跨类型排序
  const perTypeLimit = limit * 3;
  const searchPromises: Promise<{ results: SearchResultV2[]; total: number }>[] = [];

  // 构建筛选参数（排除类型限制，只保留高级筛选条件）
  const filters = { ...searchParams };

  // 按类型并行发起搜索
  if (typesToSearch.includes('game')) {
    searchPromises.push(searchGamesV2(searchQuery, keywords, filters, perTypeLimit, 0));
  }
  if (typesToSearch.includes('review')) {
    searchPromises.push(searchReviewsV2(searchQuery, keywords, filters, perTypeLimit, 0));
  }
  if (typesToSearch.includes('news')) {
    searchPromises.push(searchNewsV2(searchQuery, keywords, filters, perTypeLimit, 0));
  }
  if (typesToSearch.includes('community_post')) {
    searchPromises.push(searchCommunityPostsV2(searchQuery, keywords, filters, perTypeLimit, 0));
  }
  if (typesToSearch.includes('user')) {
    searchPromises.push(searchUsersV2(searchQuery, keywords, filters, perTypeLimit, 0));
  }

  const resultsByType = await Promise.all(searchPromises);

  // 汇总各类型的结果
  resultsByType.forEach(({ results, total }) => {
    allResults.push(...results);
    if (results.length > 0) {
      typeTotals[results[0].type] = total;
    }
  });

  // 按排序方式重排混合结果
  if (sortBy === 'date') {
    allResults.sort((a, b) => {
      const dateA = a.publishedAt || a.createdAt || '';
      const dateB = b.publishedAt || b.createdAt || '';
      return dateB.localeCompare(dateA);
    });
  } else if (sortBy === 'rating') {
    allResults.sort((a, b) => {
      const rA = typeof a.rating === 'string' ? parseFloat(a.rating) : (a.rating || 0);
      const rB = typeof b.rating === 'string' ? parseFloat(b.rating) : (b.rating || 0);
      return rB - rA;
    });
  }
  // sortBy 为 'relevance' 或未指定时保持各类型内部的默认排序

  const total = allResults.length;
  // 应用分页截取
  const paginatedResults = allResults.slice(offset, offset + limit);

  // 按类型统计实际命中数
  const byType: Record<string, number> = {};
  allResults.forEach(r => {
    byType[r.type] = (byType[r.type] || 0) + 1;
  });

  // 异步记录搜索日志（不阻塞响应）
  logSearchQuery(searchQuery, total, undefined, undefined, JSON.stringify(searchParams));

  logger.debug(`高级搜索成功，关键词: "${searchQuery}"，找到${total}条结果，排序: ${sortBy || 'relevance'}`);

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
 * 获取搜索建议（v2 版本）
 *
 * 根据输入文本提供实时搜索建议，按类型分组返回。
 * 建议来源包括：游戏（按权重排序）、用户、评测、新闻。
 * 总建议数不超过 limit * 3 条，每种类型有独立配额。
 *
 * @param searchText - 用户已输入的文字
 * @param limit - 每种类型返回的建议条数（默认 5）
 * @returns 搜索建议数组，每条包含类型、ID、标题和可选副标题/图片
 */
export const getSearchSuggestionsV2 = async (
  searchText: string,
  limit: number = 5
): Promise<Array<{
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
}>> => {
  if (!searchText.trim()) return [];

  const suggestions: Array<{
    type: string;
    id: string;
    title: string;
    subtitle?: string;
    image?: string;
  }> = [];
  const pattern = `%${searchText}%`;

  // 游戏建议（按权重排序：标题前缀匹配优先，featured 次之）
  const gameResults = await query(
    `SELECT id, title, cover_image_url FROM games
     WHERE title LIKE ?
     ORDER BY CASE WHEN title LIKE ? THEN 2 ELSE 1 END DESC, is_featured DESC, created_at DESC
     LIMIT ?`,
    [pattern, pattern, limit]
  );
  for (const row of gameResults) {
    suggestions.push({
      type: 'game',
      id: row.id,
      title: row.title,
      image: row.cover_image_url,
    });
  }

  // 如果游戏建议已满，跳过其他类型
  if (suggestions.length >= limit * 2) return suggestions.slice(0, limit * 3);

  // 用户建议
  const userResults = await query(
    `SELECT id, username, display_name, avatar_url FROM users
     WHERE username LIKE ? OR display_name LIKE ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [pattern, pattern, limit]
  );
  for (const row of userResults) {
    suggestions.push({
      type: 'user',
      id: row.id,
      title: row.display_name || row.username,
      subtitle: row.username,
      image: row.avatar_url,
    });
  }

  // 评测建议
  const reviewResults = await query(
    `SELECT r.id, r.title, g.title as game_title FROM reviews r
     LEFT JOIN games g ON r.game_id = g.id
     WHERE r.title LIKE ?
     ORDER BY r.published_at DESC
     LIMIT ?`,
    [pattern, limit]
  );
  for (const row of reviewResults) {
    suggestions.push({
      type: 'review',
      id: row.id,
      title: row.title,
      subtitle: row.game_title,
    });
  }

  // 新闻建议（仅已发布的新闻）
  const newsResults = await query(
    `SELECT id, title, cover_image_url FROM news
     WHERE title LIKE ? AND is_published = true
     ORDER BY published_at DESC
     LIMIT ?`,
    [pattern, Math.max(2, Math.floor(limit / 2))]
  );
  for (const row of newsResults) {
    suggestions.push({
      type: 'news',
      id: row.id,
      title: row.title,
      image: row.cover_image_url,
      subtitle: '新闻',
    });
  }

  return suggestions.slice(0, limit * 3);
};

/**
 * 获取搜索趋势（热门搜索关键词）
 *
 * 统计指定天数内的热门搜索关键词及其搜索次数和每日趋势数据。
 * 用于运营分析，了解用户搜索热点。
 *
 * @param days - 统计天数范围（默认 30 天）
 * @param topN - 返回的热门关键词数量（默认 20）
 * @returns 热门关键词列表，每条包含关键词、总搜索数和每日趋势数组
 */
export const getSearchTrends = async (
  days: number = 30,
  topN: number = 20
): Promise<Array<{ keyword: string; count: number; trend: Array<{ date: string; count: number }> }>> => {
  try {
    // 获取热门关键词 TOP N
    const topKeywords = await query(
      `SELECT query, COUNT(*) as count
       FROM search_logs
       WHERE created_at >= datetime('now', ?)
       GROUP BY query
       ORDER BY count DESC
       LIMIT ?`,
      [`-${days} days`, topN]
    );

    const results: Array<{ keyword: string; count: number; trend: Array<{ date: string; count: number }> }> = [];

    // 对每个关键词，获取其每日搜索趋势
    for (const row of topKeywords) {
      const trendData = await query(
        `SELECT date(created_at) as date, COUNT(*) as count
         FROM search_logs
         WHERE query = ? AND created_at >= datetime('now', ?)
         GROUP BY date(created_at)
         ORDER BY date ASC`,
        [row.query, `-${days} days`]
      );

      results.push({
        keyword: row.query,
        count: row.count,
        trend: trendData.map((t: any) => ({
          date: t.date,
          count: t.count,
        })),
      });
    }

    return results;
  } catch (error) {
    logger.warn(`获取搜索趋势失败: ${error}`);
    return [];
  }
};

export default {
  advancedSearch,
  getSearchSuggestionsV2,
  getSearchTrends,
  logSearchQuery,
};
