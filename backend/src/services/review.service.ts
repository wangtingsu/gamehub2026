/**
 * 游戏评测服务
 *
 * 提供游戏评测的完整 CRUD 操作，以及搜索、点赞、精选标记、
 * 评论查看等功能。评测支持结构化评分（scores）和自定义模板（template），
 * 创建时自动发放经验值（XP）并检查成就。
 * 支持公开和管理员两种查询模式，公开查询仅返回已审核通过的内容。
 */
import config from '../config';
import logger from '../utils/logger';
import { query, execute, transaction } from '../db';
import {
  Review,
  ReviewCreateInput,
  ReviewUpdateInput,
  PaginationParams,
  ReviewStatus,
  SearchParams
} from '../types';
import { NotFoundError, ConflictError } from '../middlewares/error.middleware';
import xpService from './xp.service';
import achievementService from './achievement.service';

/**
 * 将数据库行映射为 Review 对象
 *
 * 处理 JSON 字符串字段的解析（如 scores、sections、tags）、
 * 数字格式化、日期转换和布尔值转换。
 *
 * @param dbReview - 数据库查询结果行
 * @returns 标准化的 Review 对象
 */
const mapReviewFromDb = (dbReview: any): Review => ({
  id: dbReview.id.toString(),
  title: dbReview.title,
  content: dbReview.content,
  rating: dbReview.rating ? parseFloat(dbReview.rating) : undefined,
  scores: dbReview.scores ? JSON.parse(dbReview.scores) : undefined,
  templateId: dbReview.template_id ? String(dbReview.template_id) : undefined,
  sections: dbReview.sections ? JSON.parse(dbReview.sections) : undefined,
  gameId: dbReview.game_id ? String(dbReview.game_id) : undefined,
  authorId: dbReview.author_id ? String(dbReview.author_id) : undefined,
  tags: typeof dbReview.tags === 'string' ? JSON.parse(dbReview.tags) : dbReview.tags || [],
  likes: dbReview.likes ? parseInt(dbReview.likes, 10) : 0,
  comments: dbReview.comments ? parseInt(dbReview.comments, 10) : 0,
  isFeatured: Boolean(dbReview.is_featured),
  publishedAt: new Date(dbReview.published_at),
  createdAt: new Date(dbReview.created_at),
  updatedAt: new Date(dbReview.updated_at),
  reviewStatus: dbReview.review_status as ReviewStatus | undefined,
  reviewComment: dbReview.review_comment || undefined,
  reviewedBy: dbReview.reviewed_by ? String(dbReview.reviewed_by) : undefined,
  reviewedAt: dbReview.reviewed_at ? new Date(dbReview.reviewed_at) : undefined,
});

/**
 * 将 camelCase 字符串转换为 snake_case
 *
 * @param str - 输入的 camelCase 字符串
 * @returns 转换后的 snake_case 字符串
 */
const camelToSnakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

/**
 * 获取评测列表
 *
 * 支持分页、游戏筛选、精选筛选和审核状态筛选。
 * 公开查询默认只返回已审核通过（approved）的内容；
 * 管理端可通过传入 reviewStatus='all' 获取所有状态的评测。
 *
 * @param pagination - 分页与排序参数（默认按 createdAt 降序）
 * @param filters - 筛选条件：游戏 ID、是否精选、审核状态
 * @returns 评测列表及分页元数据（包含作者和游戏信息）
 */
export const getReviews = async (
  pagination: PaginationParams = {},
  filters: { gameId?: string; featuredOnly?: boolean; reviewStatus?: string } = {}
): Promise<{ reviews: Review[]; total: number; page: number; limit: number }> => {
  const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
  const offset = (page - 1) * limit;

  // 转换排序字段为 snake_case 并校验安全性，防止 SQL 注入
  const sortColumn = camelToSnakeCase(sortBy);
  const validSortColumns = ['id', 'title', 'rating', 'likes', 'published_at', 'created_at', 'updated_at'];
  const safeSortColumn = validSortColumns.includes(sortColumn) ? sortColumn : 'created_at';
  const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

  // 动态构建 WHERE 子句
  let whereClause = '';
  const queryParams: any[] = [];

  const conditions: string[] = [];

  if (filters.gameId) {
    conditions.push(`r.game_id = ?`);
    queryParams.push(filters.gameId);
  }

  if (filters.featuredOnly !== undefined) {
    conditions.push(`r.is_featured = ?`);
    queryParams.push(filters.featuredOnly ? 1 : 0);
  }

  // 审核状态筛选：公开查询仅显示 approved，管理端传入 'all' 不过滤
  if (filters.reviewStatus === 'all') {
    // 管理端：不过滤审核状态
  } else if (filters.reviewStatus) {
    conditions.push(`r.review_status = ?`);
    queryParams.push(filters.reviewStatus);
  } else {
    conditions.push(`r.review_status = 'approved'`);
  }

  if (conditions.length > 0) {
    whereClause = `WHERE ${conditions.join(' AND ')}`;
  }

  // 先获取总数
  const countSql = `SELECT COUNT(*) as total FROM reviews r ${whereClause}`;
  const countResult = await query(countSql, queryParams);
  const total = parseInt(countResult[0]?.total || 0);

  // 再获取分页数据（含作者和游戏信息）
  const dataSql = `
    SELECT r.*, u.username as author_name, u.display_name as author_display_name, g.title as game_title
    FROM reviews r
    LEFT JOIN users u ON r.author_id = u.id
    LEFT JOIN games g ON r.game_id = g.id
    ${whereClause}
    ORDER BY ${safeSortColumn} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `;

  const dataParams = [...queryParams, limit, offset];
  const result = await query(dataSql, dataParams);

  const reviews = result.map((row: any) => ({
    ...mapReviewFromDb(row),
    authorName: row.author_name,
    authorDisplayName: row.author_display_name,
    gameTitle: row.game_title,
  }));

  logger.debug(`获取评测列表成功，第${page}页，每页${limit}条，共${total}条`);

  return {
    reviews,
    total,
    page,
    limit,
  };
};

/**
 * 搜索评测
 *
 * 基于关键词对评测的标题和内容进行模糊匹配搜索。
 * 支持游戏筛选、精选筛选和审核状态筛选。
 *
 * @param searchParams - 搜索参数（关键词、分页、筛选条件）
 * @returns 搜索结果及分页元数据
 */
export const searchReviews = async (
  searchParams: SearchParams
): Promise<{ reviews: Review[]; total: number; page: number; limit: number; query?: string }> => {
  const { query: searchQuery = '', page = 1, limit = 20, filters = {} } = searchParams;
  const offset = (page - 1) * limit;

  let whereClause = '';
  const queryParams: any[] = [];

  const conditions: string[] = [];

  // 关键词搜索：匹配标题和正文
  if (searchQuery) {
    conditions.push(`(r.title LIKE ? OR r.content LIKE ?)`);
    queryParams.push(`%${searchQuery}%`, `%${searchQuery}%`);
  }

  // 应用额外筛选条件
  if (filters.gameId) {
    conditions.push(`r.game_id = ?`);
    queryParams.push(filters.gameId);
  }

  if (filters.featuredOnly !== undefined) {
    conditions.push(`r.is_featured = ?`);
    queryParams.push(filters.featuredOnly ? 1 : 0);
  }

  // 审核状态筛选逻辑同 getReviews
  if (filters.reviewStatus === 'all') {
    // 管理端：不过滤审核状态
  } else if (filters.reviewStatus) {
    conditions.push(`r.review_status = ?`);
    queryParams.push(filters.reviewStatus);
  } else {
    conditions.push(`r.review_status = 'approved'`);
  }

  if (conditions.length > 0) {
    whereClause = `WHERE ${conditions.join(' AND ')}`;
  }

  // 获取总数
  const countSql = `
    SELECT COUNT(*) as total
    FROM reviews r
    ${whereClause}
  `;
  const countResult = await query(countSql, queryParams);
  const total = parseInt(countResult[0]?.total || 0);

  // 获取分页数据
  const dataSql = `
    SELECT r.*, u.username as author_name, u.display_name as author_display_name, g.title as game_title
    FROM reviews r
    LEFT JOIN users u ON r.author_id = u.id
    LEFT JOIN games g ON r.game_id = g.id
    ${whereClause}
    ORDER BY r.published_at DESC, r.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const dataParams = [...queryParams, limit, offset];
  const result = await query(dataSql, dataParams);

  const reviews = result.map((row: any) => ({
    ...mapReviewFromDb(row),
    authorName: row.author_name,
    authorDisplayName: row.author_display_name,
    gameTitle: row.game_title,
  }));

  logger.debug(`搜索评测成功，关键词: "${searchQuery}"，找到${total}条结果`);

  return {
    reviews,
    total,
    page,
    limit,
    query: searchQuery,
  };
};

/**
 * 获取评测详情
 *
 * 返回评测的完整信息，包括作者详情（头像、用户名）和游戏详情（标题、slug、封面）。
 *
 * @param id - 评测 ID
 * @returns 包含作者和游戏信息的增强评测对象
 * @throws 当评测不存在时抛出 NotFoundError
 */
export const getReviewById = async (id: string): Promise<any> => {
  const result = await query(
    `SELECT r.*, u.username as author_name, u.display_name as author_display_name, u.avatar_url as author_avatar,
            g.title as game_title, g.slug as game_slug, g.cover_image_url as game_cover
     FROM reviews r
     LEFT JOIN users u ON r.author_id = u.id
     LEFT JOIN games g ON r.game_id = g.id
     WHERE r.id = ?`,
    [id]
  );

  if (result.length === 0) {
    throw new NotFoundError(`评测ID ${id} 不存在`);
  }

  const row = result[0];
  const review = mapReviewFromDb(row);

  // 返回增强的对象，包含作者和游戏的详细信息
  const enhancedReview = {
    ...review,
    author: {
      id: row.author_id,
      username: row.author_name,
      displayName: row.author_display_name,
      avatarUrl: row.author_avatar,
    },
    game: {
      id: row.game_id,
      title: row.game_title,
      slug: row.game_slug,
      coverImageUrl: row.game_cover,
    },
  };

  logger.debug(`获取评测详情成功: ${review.title} (ID: ${id})`);

  return enhancedReview;
};

/**
 * 创建评测
 *
 * 在事务中完成：验证游戏存在性 -> 查重（同一用户对同一游戏只能有一篇评测） -> 插入记录。
 * 创建成功后异步发放 XP 并检查成就。
 *
 * @param authorId - 作者用户 ID
 * @param reviewData - 评测创建输入（标题、内容、评分、游戏 ID 等）
 * @returns 创建成功的 Review 对象
 * @throws 当游戏不存在时抛出 NotFoundError
 * @throws 当用户已为该游戏写过评测时抛出 ConflictError
 */
export const createReview = async (authorId: string, reviewData: ReviewCreateInput): Promise<Review> => {
  return await transaction(async () => {
    // 验证游戏是否存在
    const gameExists = await query(
      'SELECT id FROM games WHERE id = ?',
      [reviewData.gameId]
    );

    if (gameExists.length === 0) {
      throw new NotFoundError(`游戏ID ${reviewData.gameId} 不存在`);
    }

    // 检查用户是否已为同一游戏写过评测（每人仅限一篇）
    const existingReview = await query(
      'SELECT id FROM reviews WHERE author_id = ? AND game_id = ?',
      [authorId, reviewData.gameId]
    );

    if (existingReview.length > 0) {
      throw new ConflictError('您已经为这款游戏写过评测');
    }

    // 插入评测记录
    const result = await execute(
      `INSERT INTO reviews (
        title, content, rating, scores, template_id, sections, game_id, author_id,
        tags, space_id, published_at, review_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reviewData.title,
        reviewData.content,
        reviewData.rating,
        reviewData.scores ? JSON.stringify(reviewData.scores) : null,
        reviewData.templateId || null,
        reviewData.sections ? JSON.stringify(reviewData.sections) : null,
        reviewData.gameId,
        authorId,
        JSON.stringify(reviewData.tags || []),
        (reviewData as any).spaceId || null,
        new Date().toISOString(),
        'pending',
      ]
    );

    // 查询刚插入的完整记录
    const inserted = await query(
      'SELECT * FROM reviews WHERE id = ?',
      [result.lastInsertRowid]
    );

    const review = mapReviewFromDb(inserted[0]);
    logger.info(`评测创建成功: ${review.title} (ID: ${review.id})`);

    // 异步发放 XP 并检查成就（不阻塞响应）
    xpService.addXp(authorId, 'create_review', 'review', review.id).catch(err => logger.error('XP 发放失败:', err));
    achievementService.checkAndAwardAchievements(authorId).catch(err => logger.error('成就检查失败:', err));

    return review;
  });
};

/**
 * 更新评测
 *
 * 支持修改标题、内容、评分、结构化评分、模板、章节、标签、审核状态等字段。
 * 动态构建 SET 子句，仅更新有值的字段。
 *
 * @param id - 评测 ID
 * @param updateData - 需要更新的字段数据
 * @returns 更新后的完整 Review 对象
 * @throws 当评测不存在时抛出 NotFoundError
 */
export const updateReview = async (
  id: string,
  updateData: ReviewUpdateInput
): Promise<Review> => {
  const updates: string[] = [];
  const values: any[] = [];

  // 动态构建更新字段列表
  if (updateData.title !== undefined) {
    updates.push(`title = ?`);
    values.push(updateData.title);
  }

  if (updateData.content !== undefined) {
    updates.push(`content = ?`);
    values.push(updateData.content);
  }

  if (updateData.rating !== undefined) {
    updates.push(`rating = ?`);
    values.push(updateData.rating);
  }

  if (updateData.scores !== undefined) {
    updates.push(`scores = ?`);
    values.push(JSON.stringify(updateData.scores));
  }

  if (updateData.templateId !== undefined) {
    updates.push(`template_id = ?`);
    values.push(updateData.templateId);
  }

  if (updateData.sections !== undefined) {
    updates.push(`sections = ?`);
    values.push(JSON.stringify(updateData.sections));
  }

  if (updateData.tags !== undefined) {
    updates.push(`tags = ?`);
    values.push(JSON.stringify(updateData.tags));
  }

  if ((updateData as any).spaceId !== undefined) {
    updates.push(`space_id = ?`);
    values.push((updateData as any).spaceId);
  }

  if (updateData.reviewStatus !== undefined) {
    updates.push(`review_status = ?`);
    values.push(updateData.reviewStatus);
  }

  if (updateData.reviewComment !== undefined) {
    updates.push(`review_comment = ?`);
    values.push(updateData.reviewComment);
  }

  // 没有需要更新的字段则直接返回当前数据
  if (updates.length === 0) {
    return getReviewById(id);
  }

  const now = new Date().toISOString();
  updates.push(`updated_at = ?`);
  values.push(now);

  values.push(id);

  const result = await execute(
    `UPDATE reviews
     SET ${updates.join(', ')}
     WHERE id = ?`,
    values
  );

  if (result.changes === 0) {
    throw new NotFoundError(`评测ID ${id} 不存在`);
  }

  const review = await getReviewById(id);
  logger.info(`评测更新成功: ${review.title} (ID: ${id})`);

  return review;
};

/**
 * 删除评测（作者或管理员）
 *
 * 物理删除指定的评测记录。
 *
 * @param id - 评测 ID
 * @throws 当评测不存在时抛出 NotFoundError
 */
export const deleteReview = async (id: string): Promise<void> => {
  const rows = await query('SELECT content FROM reviews WHERE id = ?', [id]) as any[];
  if (rows.length > 0 && rows[0].content) {
    const { cleanupContentImages } = require('./image-cleanup.service');
    cleanupContentImages(rows[0].content);
  }
  const result = await execute(
    'DELETE FROM reviews WHERE id = ?',
    [id]
  );

  if (result.changes === 0) {
    throw new NotFoundError(`评测ID ${id} 不存在`);
  }

  logger.info(`评测删除成功: ID ${id}`);
};

/**
 * 点赞评测
 *
 * 增加指定评测的点赞计数并返回最新的点赞数。
 *
 * @param id - 评测 ID
 * @returns 包含最新点赞数的对象
 * @throws 当评测不存在时抛出 NotFoundError
 */
export const likeReview = async (id: string): Promise<{ likes: number }> => {
  await execute(
    'UPDATE reviews SET likes = likes + 1 WHERE id = ?',
    [id]
  );

  const result = await query(
    'SELECT likes FROM reviews WHERE id = ?',
    [id]
  );

  if (result.length === 0) {
    throw new NotFoundError(`评测ID ${id} 不存在`);
  }

  const likes = result[0].likes;
  logger.debug(`评测点赞成功: ID ${id}, 当前点赞数: ${likes}`);

  return { likes };
};

/**
 * 标记/取消精选评测（管理员操作）
 *
 * @param id - 评测 ID
 * @param isFeatured - 是否设为精选
 * @returns 更新后的 Review 对象
 * @throws 当评测不存在时抛出 NotFoundError
 */
export const featureReview = async (id: string, isFeatured: boolean): Promise<Review> => {
  const result = await execute(
    'UPDATE reviews SET is_featured = ? WHERE id = ?',
    [isFeatured ? 1 : 0, id]
  );

  if (result.changes === 0) {
    throw new NotFoundError(`评测ID ${id} 不存在`);
  }

  const review = await getReviewById(id);
  const status = isFeatured ? '精选' : '取消精选';
  logger.info(`评测${status}成功: ${review.title} (ID: ${id})`);

  return review;
};

/**
 * 获取评测评论列表
 *
 * 分页获取指定评测下的评论，按创建时间倒序排列。
 *
 * @param reviewId - 评测 ID
 * @param pagination - 分页参数
 * @returns 评论列表及分页元数据（每条评论包含作者信息）
 */
export const getReviewComments = async (
  reviewId: string,
  pagination: PaginationParams = {}
): Promise<{ comments: any[]; total: number; page: number; limit: number }> => {
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;

  // 先获取总数
  const countResult = await query(
    'SELECT COUNT(*) as total FROM comments WHERE parent_type = ? AND parent_id = ?',
    ['review', reviewId]
  );
  const total = parseInt(countResult[0]?.total || 0);

  // 再获取分页数据，关联用户信息
  const result = await query(
    `SELECT c.*, u.username, u.display_name, u.avatar_url
     FROM comments c
     JOIN users u ON c.author_id = u.id
     WHERE c.parent_type = ? AND c.parent_id = ?
     ORDER BY c.created_at DESC
     LIMIT ? OFFSET ?`,
    ['review', reviewId, limit, offset]
  );

  logger.debug(`获取评测评论成功，评测ID: ${reviewId}，共${total}条评论`);

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
  getReviews,
  searchReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
  likeReview,
  featureReview,
  getReviewComments,
};
