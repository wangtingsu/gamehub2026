/**
 * 社区帖子服务
 *
 * 提供社区帖子的完整管理功能，包括：
 * - 帖子的增删改查
 * - 关键词搜索与分类筛选
 * - 帖子置顶/锁定管理
 * - 点赞操作
 * - 帖子评论查询
 * - 创建帖子时自动发放 XP 并检查成就
 */

import config from '../config';
import logger from '../utils/logger';
import { query, execute, transaction } from '../db';
import {
  CommunityPost,
  CommunityPostCreateInput,
  CommunityPostUpdateInput,
  PaginationParams,
  ReviewStatus,
  SearchParams
} from '../types';
import { NotFoundError, ConflictError } from '../middlewares/error.middleware';
import xpService from './xp.service';
import achievementService from './achievement.service';

/**
 * 将数据库行映射为 CommunityPost 对象
 *
 * 处理字段类型转换，包括 ID 转为字符串、JSON 标签解析、
 * 日期解析和可选字段处理。
 *
 * @param dbPost 数据库查询结果行
 * @returns 格式化后的社区帖子对象
 */
const mapCommunityPostFromDb = (dbPost: any): CommunityPost => ({
  id: dbPost.id.toString(),
  title: dbPost.title,
  content: dbPost.content,
  authorId: dbPost.author_id.toString(),
  author: dbPost.author_display_name || dbPost.author_name || dbPost.author_id.toString(),
  publishDate: new Date(dbPost.published_at).toISOString(),
  category: dbPost.category,
  tags: typeof dbPost.tags === 'string' ? JSON.parse(dbPost.tags) : dbPost.tags || [],
  likes: dbPost.likes ? parseInt(dbPost.likes, 10) : 0,
  comments: dbPost.comments ? parseInt(dbPost.comments, 10) : 0,
  isPinned: Boolean(dbPost.is_pinned),
  isLocked: Boolean(dbPost.is_locked),
  publishedAt: new Date(dbPost.published_at),
  createdAt: new Date(dbPost.created_at),
  updatedAt: new Date(dbPost.updated_at),
  gameId: dbPost.game_id ? dbPost.game_id.toString() : undefined,
  gameTitle: dbPost.game_title || undefined,
  reviewStatus: dbPost.review_status as ReviewStatus | undefined,
  reviewComment: dbPost.review_comment || undefined,
  reviewedBy: dbPost.reviewed_by ? String(dbPost.reviewed_by) : undefined,
  reviewedAt: dbPost.reviewed_at ? new Date(dbPost.reviewed_at) : undefined,
});

/**
 * 将驼峰命名(camelCase)转换为下划线命名(snake_case)
 *
 * @param str 驼峰命名字符串
 * @returns 下划线命名字符串
 */
const camelToSnakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

/**
 * 获取社区帖子列表（分页 + 筛选 + 排序）
 *
 * 支持按分类、置顶状态、审核状态和关联游戏进行筛选。
 * 公开查询默认仅显示已审核通过(approved)的内容。
 * 置顶帖子始终排列在前。
 *
 * @param pagination 分页和排序参数
 * @param filters 筛选条件（分类、仅置顶、审核状态、游戏 ID）
 * @returns 分页后的帖子列表、总数和分页信息
 */
export const getCommunityPosts = async (
  pagination: PaginationParams = {},
  filters: { category?: string; pinnedOnly?: boolean; reviewStatus?: string; gameId?: string } = {}
): Promise<{ posts: CommunityPost[]; total: number; page: number; limit: number }> => {
  const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
  const offset = (page - 1) * limit;

  // 将排序字段名转为数据库 snake_case 格式
  const sortColumn = camelToSnakeCase(sortBy);
  // 白名单校验，防止 SQL 注入
  const validSortColumns = ['id', 'title', 'category', 'likes', 'comments', 'published_at', 'created_at', 'updated_at'];
  const safeSortColumn = validSortColumns.includes(sortColumn) ? sortColumn : 'created_at';
  const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

  // 构建动态 WHERE 条件
  let whereClause = '';
  const queryParams: any[] = [];

  const conditions: string[] = [];

  if (filters.category) {
    conditions.push(`cp.category = ?`);
    queryParams.push(filters.category);
  }

  if (filters.pinnedOnly !== undefined) {
    conditions.push(`cp.is_pinned = ?`);
    queryParams.push(filters.pinnedOnly ? 1 : 0);
  }

  if (filters.gameId) {
    conditions.push(`cp.game_id = ?`);
    queryParams.push(filters.gameId);
  }

  // 审核状态筛选：管理端传入 'all' 显示全部，传入指定状态按状态筛选，未传则仅显示已通过
  if (filters.reviewStatus === 'all') {
    // 管理端查看全部内容，不过滤审核状态
  } else if (filters.reviewStatus) {
    conditions.push(`cp.review_status = ?`);
    queryParams.push(filters.reviewStatus);
  } else {
    conditions.push(`cp.review_status = 'approved'`);
  }

  if (conditions.length > 0) {
    whereClause = `WHERE ${conditions.join(' AND ')}`;
  }

  // 查询帖子总数
  const countSql = `SELECT COUNT(*) as total FROM community_posts cp ${whereClause}`;
  const countResult = await query(countSql, queryParams);
  const total = parseInt(countResult[0]?.total || 0);

  // 查询分页数据，置顶帖子优先，然后按指定字段排序
  const dataSql = `
    SELECT cp.*, u.username as author_name, u.display_name as author_display_name,
           g.title as game_title
    FROM community_posts cp
    LEFT JOIN users u ON cp.author_id = u.id
    LEFT JOIN games g ON cp.game_id = g.id
    ${whereClause}
    ORDER BY cp.is_pinned DESC, ${safeSortColumn} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `;

  const dataParams = [...queryParams, limit, offset];
  const result = await query(dataSql, dataParams);

  const posts = result.map((row: any) => ({
    ...mapCommunityPostFromDb(row),
    authorName: row.author_name,
    authorDisplayName: row.author_display_name,
  }));

  logger.debug(`获取社区帖子列表成功，第${page}页，每页${limit}条，共${total}条`);

  return {
    posts,
    total,
    page,
    limit,
  };
};

/**
 * 搜索社区帖子（分页 + 筛选）
 *
 * 支持按关键词搜索标题和内容，附加分类和审核状态筛选。
 *
 * @param searchParams 搜索参数，包含关键词、分页和筛选条件
 * @returns 分页后的帖子列表、总数和搜索关键词
 */
export const searchCommunityPosts = async (
  searchParams: SearchParams
): Promise<{ posts: CommunityPost[]; total: number; page: number; limit: number; query?: string }> => {
  const { query: searchQuery = '', page = 1, limit = 20, filters = {} } = searchParams;
  const offset = (page - 1) * limit;

  let whereClause = '';
  const queryParams: any[] = [];

  const conditions: string[] = [];

  // 关键词匹配标题或内容
  if (searchQuery) {
    conditions.push(`(cp.title LIKE ? OR cp.content LIKE ?)`);
    queryParams.push(`%${searchQuery}%`, `%${searchQuery}%`);
  }

  // 按分类筛选
  if (filters.category) {
    conditions.push(`cp.category = ?`);
    queryParams.push(filters.category);
  }

  // 审核状态筛选逻辑同 getCommunityPosts
  if (filters.reviewStatus === 'all') {
    // 管理端：不过滤审核状态
  } else if (filters.reviewStatus) {
    conditions.push(`cp.review_status = ?`);
    queryParams.push(filters.reviewStatus);
  } else {
    conditions.push(`cp.review_status = 'approved'`);
  }

  if (conditions.length > 0) {
    whereClause = `WHERE ${conditions.join(' AND ')}`;
  }

  // 查询总数
  const countSql = `
    SELECT COUNT(*) as total
    FROM community_posts cp
    ${whereClause}
  `;
  const countResult = await query(countSql, queryParams);
  const total = parseInt(countResult[0]?.total || 0);

  // 查询分页数据，置顶帖优先，按发布时间和创建时间倒序
  const dataSql = `
    SELECT cp.*, u.username as author_name, u.display_name as author_display_name,
           g.title as game_title
    FROM community_posts cp
    LEFT JOIN users u ON cp.author_id = u.id
    LEFT JOIN games g ON cp.game_id = g.id
    ${whereClause}
    ORDER BY cp.is_pinned DESC, cp.published_at DESC, cp.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const dataParams = [...queryParams, limit, offset];
  const result = await query(dataSql, dataParams);

  const posts = result.map((row: any) => ({
    ...mapCommunityPostFromDb(row),
    authorName: row.author_name,
    authorDisplayName: row.author_display_name,
  }));

  logger.debug(`搜索社区帖子成功，关键词: "${searchQuery}"，找到${total}条结果`);

  return {
    posts,
    total,
    page,
    limit,
    query: searchQuery,
  };
};

/**
 * 获取社区帖子详情
 *
 * @param id 帖子 ID
 * @returns 包含完整作者信息的帖子详情
 * @throws {NotFoundError} 帖子不存在时抛出
 */
export const getCommunityPostById = async (id: string): Promise<any> => {
  const result = await query(
    `SELECT cp.*, u.username as author_name, u.display_name as author_display_name,
            u.avatar_url as author_avatar, g.title as game_title
     FROM community_posts cp
     LEFT JOIN users u ON cp.author_id = u.id
     LEFT JOIN games g ON cp.game_id = g.id
     WHERE cp.id = ?`,
    [id]
  );

  if (result.length === 0) {
    throw new NotFoundError(`社区帖子ID ${id} 不存在`);
  }

  const row = result[0];
  const post = mapCommunityPostFromDb(row);

  // 增强的返回对象，包含作者信息
  const enhancedPost = {
    ...post,
    author: {
      id: row.author_id,
      username: row.author_name,
      displayName: row.author_display_name,
      avatarUrl: row.author_avatar,
    },
  };

  logger.debug(`获取社区帖子详情成功: ${post.title} (ID: ${id})`);

  return enhancedPost;
};

/**
 * 创建社区帖子
 *
 * 在事务中操作：插入帖子记录（初始审核状态为 pending），
 * 发放 XP 奖励并检查成就解锁。
 *
 * @param authorId 作者 ID
 * @param postData 帖子创建数据（标题、内容、分类、标签、关联游戏等）
 * @returns 创建完成的社区帖子对象
 */
export const createCommunityPost = async (authorId: string, postData: CommunityPostCreateInput): Promise<CommunityPost> => {
  return await transaction(async () => {
    const result = await execute(
      `INSERT INTO community_posts (
        title, content, author_id, category, tags, published_at, review_status, game_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        postData.title,
        postData.content,
        authorId,
        postData.category,
        JSON.stringify(postData.tags || []),
        new Date().toISOString(),
        'pending',  // 新帖默认待审核状态
        postData.gameId || null,
      ]
    );

    const inserted = await query(
      'SELECT * FROM community_posts WHERE id = ?',
      [result.lastInsertRowid]
    );

    const post = mapCommunityPostFromDb(inserted[0]);
    logger.info(`社区帖子创建成功: ${post.title} (ID: ${post.id})`);

    // 异步发放创建帖子的 XP 奖励并检查成就
    xpService.addXp(authorId, 'create_community_post', 'community_post', post.id).catch(err => logger.error('XP 发放失败:', err));
    achievementService.checkAndAwardAchievements(authorId).catch(err => logger.error('成就检查失败:', err));

    return post;
  });
};

/**
 * 更新社区帖子（作者或管理员）
 *
 * 动态拼接需要更新的字段，仅更新传入的字段。
 *
 * @param id 帖子 ID
 * @param updateData 需要更新的字段（标题、内容、分类、标签、审核状态等）
 * @returns 更新完成的社区帖子对象
 * @throws {NotFoundError} 帖子不存在时抛出
 */
export const updateCommunityPost = async (
  id: string,
  updateData: CommunityPostUpdateInput
): Promise<CommunityPost> => {
  // 动态构建 SET 子句
  const updates: string[] = [];
  const values: any[] = [];

  if (updateData.title !== undefined) {
    updates.push(`title = ?`);
    values.push(updateData.title);
  }

  if (updateData.content !== undefined) {
    updates.push(`content = ?`);
    values.push(updateData.content);
  }

  if (updateData.category !== undefined) {
    updates.push(`category = ?`);
    values.push(updateData.category);
  }

  if (updateData.tags !== undefined) {
    updates.push(`tags = ?`);
    values.push(JSON.stringify(updateData.tags));
  }

  if (updateData.reviewStatus !== undefined) {
    updates.push(`review_status = ?`);
    values.push(updateData.reviewStatus);
  }

  if (updateData.reviewComment !== undefined) {
    updates.push(`review_comment = ?`);
    values.push(updateData.reviewComment);
  }

  // 无字段更新时直接返回当前数据
  if (updates.length === 0) {
    return getCommunityPostById(id);
  }

  const now = new Date().toISOString();
  updates.push(`updated_at = ?`);
  values.push(now);

  values.push(id);

  const result = await execute(
    `UPDATE community_posts
     SET ${updates.join(', ')}
     WHERE id = ?`,
    values
  );

  if (result.changes === 0) {
    throw new NotFoundError(`社区帖子ID ${id} 不存在`);
  }

  const post = await getCommunityPostById(id);
  logger.info(`社区帖子更新成功: ${post.title} (ID: ${id})`);

  return post;
};

/**
 * 删除社区帖子（作者或管理员）
 *
 * 物理删除帖子记录。
 *
 * @param id 帖子 ID
 * @throws {NotFoundError} 帖子不存在时抛出
 */
export const deleteCommunityPost = async (id: string): Promise<void> => {
  const rows = await query('SELECT content FROM community_posts WHERE id = ?', [id]) as any[];
  if (rows.length > 0 && rows[0].content) {
    const { cleanupContentImages } = require('./image-cleanup.service');
    cleanupContentImages(rows[0].content);
  }
  const result = await execute(
    'DELETE FROM community_posts WHERE id = ?',
    [id]
  );

  if (result.changes === 0) {
    throw new NotFoundError(`社区帖子ID ${id} 不存在`);
  }

  logger.info(`社区帖子删除成功: ID ${id}`);
};

/**
 * 点赞社区帖子
 *
 * 将帖子的点赞数加 1 并返回当前点赞数。
 *
 * @param id 帖子 ID
 * @returns 当前点赞数
 * @throws {NotFoundError} 帖子不存在时抛出
 */
export const likeCommunityPost = async (id: string): Promise<{ likes: number }> => {
  await execute(
    'UPDATE community_posts SET likes = likes + 1 WHERE id = ?',
    [id]
  );

  const result = await query(
    'SELECT likes FROM community_posts WHERE id = ?',
    [id]
  );

  if (result.length === 0) {
    throw new NotFoundError(`社区帖子ID ${id} 不存在`);
  }

  const likes = result[0].likes;
  logger.debug(`社区帖子点赞成功: ID ${id}, 当前点赞数: ${likes}`);

  return { likes };
};

/**
 * 置顶/取消置顶社区帖子（管理员/版主操作）
 *
 * 置顶时作者可获得额外的 XP 奖励。
 *
 * @param id 帖子 ID
 * @param isPinned true 为置顶，false 为取消置顶
 * @returns 更新后的帖子对象
 * @throws {NotFoundError} 帖子不存在时抛出
 */
export const pinCommunityPost = async (id: string, isPinned: boolean): Promise<CommunityPost> => {
  const result = await execute(
    'UPDATE community_posts SET is_pinned = ? WHERE id = ?',
    [isPinned ? 1 : 0, id]
  );

  if (result.changes === 0) {
    throw new NotFoundError(`社区帖子ID ${id} 不存在`);
  }

  const post = await getCommunityPostById(id);

  // 置顶时向作者发放额外 XP 奖励
  xpService.addXp(post.authorId, 'post_pinned', 'community_post', id).catch(err => logger.error('XP 发放失败:', err));

  const status = isPinned ? '置顶' : '取消置顶';
  logger.info(`社区帖子${status}成功: ${post.title} (ID: ${id})`);

  return post;
};

/**
 * 锁定/解锁社区帖子（管理员/版主操作）
 *
 * 锁定后用户无法在帖子下发表新评论。
 *
 * @param id 帖子 ID
 * @param isLocked true 为锁定，false 为解锁
 * @returns 更新后的帖子对象
 * @throws {NotFoundError} 帖子不存在时抛出
 */
export const lockCommunityPost = async (id: string, isLocked: boolean): Promise<CommunityPost> => {
  const result = await execute(
    'UPDATE community_posts SET is_locked = ? WHERE id = ?',
    [isLocked ? 1 : 0, id]
  );

  if (result.changes === 0) {
    throw new NotFoundError(`社区帖子ID ${id} 不存在`);
  }

  const post = await getCommunityPostById(id);
  const status = isLocked ? '锁定' : '解锁';
  logger.info(`社区帖子${status}成功: ${post.title} (ID: ${id})`);

  return post;
};

/**
 * 获取帖子的评论列表（分页）
 *
 * @param postId 帖子 ID
 * @param pagination 分页参数
 * @returns 分页后的评论列表及总数
 */
export const getCommunityPostComments = async (
  postId: string,
  pagination: PaginationParams = {}
): Promise<{ comments: any[]; total: number; page: number; limit: number }> => {
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;

  // 查询评论总数
  const countResult = await query(
    'SELECT COUNT(*) as total FROM comments WHERE parent_type = ? AND parent_id = ?',
    ['community_post', postId]
  );
  const total = parseInt(countResult[0]?.total || 0);

  // 查询分页数据，关联用户表获取作者信息
  const result = await query(
    `SELECT c.*, u.username, u.display_name, u.avatar_url
     FROM comments c
     JOIN users u ON c.author_id = u.id
     WHERE c.parent_type = ? AND c.parent_id = ?
     ORDER BY c.created_at DESC
     LIMIT ? OFFSET ?`,
    ['community_post', postId, limit, offset]
  );

  logger.debug(`获取社区帖子评论成功，帖子ID: ${postId}，共${total}条评论`);

  return {
    comments: result.map((row: any) => ({
      id: row.id,
      content: row.content,
      author: {
        id: row.author_id,
        username: row.username,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
      },
      likes: row.likes,
      isEdited: Boolean(row.is_edited),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    total,
    page,
    limit,
  };
};

export default {
  getCommunityPosts,
  searchCommunityPosts,
  getCommunityPostById,
  createCommunityPost,
  updateCommunityPost,
  deleteCommunityPost,
  likeCommunityPost,
  pinCommunityPost,
  lockCommunityPost,
  getCommunityPostComments,
};
