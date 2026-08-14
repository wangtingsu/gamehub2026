/**
 * 游戏服务
 * 提供游戏的完整 CRUD 操作，包括列表查询、搜索、详情获取、评测查询及论坛游戏列表。
 * 支持按分类筛选（类型、平台、推荐等）、安全排序和分页。
 */

import logger from '../utils/logger';
import { query, execute, transaction } from '../db';
import {
  Game,
  GameCreateInput,
  GameUpdateInput,
  PaginationParams,
  SearchParams
} from '../types';
import { NotFoundError, ConflictError } from '../middlewares/error.middleware';

/**
 * 从数据库行映射到 Game 对象
 * 将 snake_case 的数据库字段和 JSON 字符串字段转换为 camelCase 的 Game 类型。
 * @param dbGame - 数据库查询结果行
 * @returns 转换后的 Game 对象
 */
const mapGameFromDb = (dbGame: any): Game => ({
  id: dbGame.id,
  title: dbGame.title,
  slug: dbGame.slug,
  description: dbGame.description,
  releaseDate: dbGame.release_date,
  developer: dbGame.developer,
  publisher: dbGame.publisher,
  genres: typeof dbGame.genres === 'string' ? JSON.parse(dbGame.genres) : dbGame.genres,
  platforms: typeof dbGame.platforms === 'string' ? JSON.parse(dbGame.platforms) : dbGame.platforms,
  rating: dbGame.rating,
  price: dbGame.price,
  discount: dbGame.discount,
  coverImageUrl: dbGame.cover_image_url,
  screenshots: typeof dbGame.screenshots === 'string' ? JSON.parse(dbGame.screenshots) : dbGame.screenshots,
  steamAppId: dbGame.steam_app_id,
  rawgId: dbGame.rawg_id,
  isFeatured: Boolean(dbGame.is_featured),
  displayZone: dbGame.display_zone || undefined,
  views: dbGame.views ?? 0,
  wishlistCount: dbGame.wishlist_count ?? 0,
  purchaseCount: dbGame.purchase_count ?? 0,
  createdAt: dbGame.created_at,
  updatedAt: dbGame.updated_at,
});

/**
 * 将 camelCase 字符串转换为 snake_case
 * 用于将排序字段名从 API 风格转换为数据库列名。
 * @param str - camelCase 格式的字符串
 * @returns snake_case 格式的字符串
 */
const camelToSnakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

/**
 * 获取游戏列表（支持分页和筛选）
 * 根据分页参数和筛选条件（推荐、类型、平台、展示区域）查询游戏。
 * 使用白名单机制防止 SQL 注入排序字段。
 * @param pagination - 分页和排序参数
 * @param filters - 筛选条件（推荐、类型、平台、展示区域）
 * @returns 游戏列表、总数及分页信息
 */
export const getGames = async (
  pagination: PaginationParams = {},
  filters: { featured?: boolean; genre?: string; platform?: string; displayZone?: string } = {}
): Promise<{ games: Game[]; total: number; page: number; limit: number }> => {
  const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
  const offset = (page - 1) * limit;

  // 转换排序字段为snake_case
  const sortColumn = camelToSnakeCase(sortBy);
  // 确保排序字段安全，防止SQL注入
  const validSortColumns = ['id', 'title', 'slug', 'rating', 'price', 'created_at', 'updated_at', 'release_date'];
  const safeSortColumn = validSortColumns.includes(sortColumn) ? sortColumn : 'created_at';
  const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

  // 构建查询条件
  const whereConditions: string[] = [];
  const queryParams: any[] = [];

  if (filters.featured !== undefined) {
    whereConditions.push(`is_featured = ?`);
    queryParams.push(filters.featured ? 1 : 0);
  }

  if (filters.genre) {
    whereConditions.push(`genres LIKE ?`);
    queryParams.push(`%"${filters.genre}"%`);
  }

  if (filters.platform) {
    whereConditions.push(`platforms LIKE ?`);
    queryParams.push(`%"${filters.platform}"%`);
  }

  if (filters.displayZone) {
    whereConditions.push(`display_zone = ?`);
    queryParams.push(filters.displayZone);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // 首先获取总数
  const countSql = `SELECT COUNT(*) as total FROM games ${whereClause}`;
  const countResult = await query(countSql, queryParams);
  const total = parseInt(countResult[0]?.total || 0);

  // 然后获取分页数据
  const dataSql = `
    SELECT * FROM games
    ${whereClause}
    ORDER BY ${safeSortColumn} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `;

  const dataParams = [...queryParams, limit, offset];
  const result = await query(dataSql, dataParams);

  const games = result.map(mapGameFromDb);

  logger.debug(`获取游戏列表成功，第${page}页，每页${limit}条，共${total}条`);

  return {
    games,
    total,
    page,
    limit,
  };
};

/**
 * 搜索游戏
 * 按关键词（标题/描述）和可选过滤条件（类型、平台）搜索游戏，结果按创建时间降序排列。
 * @param searchParams - 搜索参数，包含关键词、分页和过滤条件
 * @returns 匹配的游戏列表、总数及分页信息
 */
export const searchGames = async (
  searchParams: SearchParams
): Promise<{ games: Game[]; total: number; page: number; limit: number; query?: string }> => {
  const { query: searchQuery = '', page = 1, limit = 20, filters = {} } = searchParams;
  const offset = (page - 1) * limit;

  const whereConditions: string[] = [];
  const queryParams: any[] = [];

  if (searchQuery) {
    whereConditions.push(`(title LIKE ? OR description LIKE ?)`);
    queryParams.push(`%${searchQuery}%`, `%${searchQuery}%`);
  }

  if (filters.genre) {
    whereConditions.push(`genres LIKE ?`);
    queryParams.push(`%"${filters.genre}"%`);
  }

  if (filters.platform) {
    whereConditions.push(`platforms LIKE ?`);
    queryParams.push(`%"${filters.platform}"%`);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // 获取总数
  const countSql = `SELECT COUNT(*) as total FROM games ${whereClause}`;
  const countResult = await query(countSql, queryParams);
  const total = parseInt(countResult[0]?.total || 0);

  // 获取分页数据
  const dataSql = `
    SELECT * FROM games
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;

  const dataParams = [...queryParams, limit, offset];
  const result = await query(dataSql, dataParams);

  const games = result.map(mapGameFromDb);

  logger.debug(`搜索游戏成功，关键词: "${searchQuery}"，找到${total}条结果`);

  return {
    games,
    total,
    page,
    limit,
    query: searchQuery,
  };
};

/**
 * 根据 ID 获取游戏详情
 * @param id - 游戏ID
 * @returns 游戏完整信息
 * @throws NotFoundError - 游戏不存在时抛出
 */
export const getGameById = async (id: string): Promise<Game> => {
  const result = await query(
    `SELECT * FROM games WHERE id = ?`,
    [id]
  );

  if (result.length === 0) {
    throw new NotFoundError(`游戏ID ${id} 不存在`);
  }

  const game = mapGameFromDb(result[0]);
  logger.debug(`获取游戏详情成功: ${game.title} (ID: ${id})`);

  return game;
};

/**
 * 根据 slug 获取游戏详情
 * 适用于 SEO 友好的 URL 路由。
 * @param slug - 游戏唯一标识 slug
 * @returns 游戏完整信息
 * @throws NotFoundError - slug 对应的游戏不存在时抛出
 */
export const getGameBySlug = async (slug: string): Promise<Game> => {
  const result = await query(
    `SELECT * FROM games WHERE slug = ?`,
    [slug]
  );

  if (result.length === 0) {
    throw new NotFoundError(`游戏slug ${slug} 不存在`);
  }

  const game = mapGameFromDb(result[0]);
  logger.debug(`获取游戏详情成功: ${game.title} (slug: ${slug})`);

  return game;
};

/**
 * 将游戏引用（数字 ID 或 slug）解析为数字 ID
 * 用于 /games/:id/reviews、/games/:id/posts 等子路由，
 * 支持 SEO 友好的 slug URL（如 /games/baldurs-gate-3/reviews）。
 * @param ref - 游戏数字 ID 或 slug
 * @returns 数字 ID 字符串
 * @throws NotFoundError - 对应的游戏不存在时抛出
 */
export const resolveGameId = async (ref: string): Promise<string> => {
  // 数字 ID 直接返回
  if (/^\d+$/.test(ref)) {
    return ref;
  }
  // 否则按 slug 查找真实 ID
  const rows = await query('SELECT id FROM games WHERE slug = ?', [ref]);
  if (rows.length === 0) {
    throw new NotFoundError(`游戏 ${ref} 不存在`);
  }
  return String(rows[0].id);
};

/**
 * 创建游戏（管理员操作）
 * 在事务中生成 slug，检查唯一性后插入新游戏记录。
 * @param gameData - 游戏创建数据（标题、描述、类型、平台、价格等）
 * @returns 创建后的游戏完整信息
 * @throws ConflictError - slug 已存在时抛出
 */
export const createGame = async (gameData: GameCreateInput): Promise<Game> => {
  return await transaction(async () => {
    // 生成slug（如果未提供）
    const slug = gameData.slug || generateSlug(gameData.title);

    // 检查slug是否已存在
    const existingGame = await query(
      'SELECT id FROM games WHERE slug = ?',
      [slug]
    );

    if (existingGame.length > 0) {
      throw new ConflictError(`游戏slug "${slug}" 已存在`);
    }

    const result = await execute(
      `INSERT INTO games (
        title, slug, description, release_date, developer, publisher,
        genres, platforms, price, cover_image_url, is_featured
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        gameData.title,
        slug,
        gameData.description,
        gameData.releaseDate,
        gameData.developer,
        gameData.publisher,
        JSON.stringify(gameData.genres || []),
        JSON.stringify(gameData.platforms || []),
        gameData.price || 0,
        gameData.coverImageUrl,
        false, // 新游戏默认不推荐
      ]
    );

    const game = mapGameFromDb({
      ...gameData,
      id: result.lastInsertRowid,
      slug,
      genres: gameData.genres || [],
      platforms: gameData.platforms || [],
      price: gameData.price || 0,
      cover_image_url: gameData.coverImageUrl,
      is_featured: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    logger.info(`游戏创建成功: ${game.title} (ID: ${game.id})`);

    return game;
  });
};

/**
 * 更新游戏信息（管理员操作）
 * 动态构建 UPDATE 语句，仅更新提供的字段。
 * @param id - 游戏ID
 * @param updateData - 要更新的游戏字段（标题、描述、评分、价格等）
 * @returns 更新后的游戏完整信息
 * @throws NotFoundError - 游戏不存在时抛出
 */
export const updateGame = async (
  id: string,
  updateData: GameUpdateInput
): Promise<Game> => {
  const updates: string[] = [];
  const values: any[] = [];

  if (updateData.title !== undefined) {
    updates.push(`title = ?`);
    values.push(updateData.title);
  }

  if (updateData.description !== undefined) {
    updates.push(`description = ?`);
    values.push(updateData.description);
  }

  if (updateData.rating !== undefined) {
    updates.push(`rating = ?`);
    values.push(updateData.rating);
  }

  if (updateData.price !== undefined) {
    updates.push(`price = ?`);
    values.push(updateData.price);
  }

  if (updateData.discount !== undefined) {
    updates.push(`discount = ?`);
    values.push(updateData.discount);
  }

  if (updateData.isFeatured !== undefined) {
    updates.push(`is_featured = ?`);
    values.push(updateData.isFeatured ? 1 : 0);
  }

  if (updates.length === 0) {
    return getGameById(id);
  }

  const now = new Date().toISOString();
  updates.push(`updated_at = ?`);
  values.push(now);

  values.push(id);

  const result = await execute(
    `UPDATE games
     SET ${updates.join(', ')}
     WHERE id = ?`,
    values
  );

  if (result.changes === 0) {
    throw new NotFoundError(`游戏ID ${id} 不存在`);
  }

  const game = await getGameById(id);
  logger.info(`游戏更新成功: ${game.title} (ID: ${id})`);

  return game;
};

/**
 * 删除游戏（管理员操作）
 * 物理删除游戏记录（慎用，关联数据需提前处理）。
 * @param id - 游戏ID
 * @throws NotFoundError - 游戏不存在时抛出
 */
export const deleteGame = async (id: string): Promise<void> => {
  const result = await execute(
    'DELETE FROM games WHERE id = ?',
    [id]
  );

  if (result.changes === 0) {
    throw new NotFoundError(`游戏ID ${id} 不存在`);
  }

  logger.info(`游戏删除成功: ID ${id}`);
};

/**
 * 获取指定游戏的评测列表
 * 支持分页查询，同时关联用户信息和游戏信息，返回评测详细数据。
 * @param gameId - 游戏ID
 * @param pagination - 分页参数
 * @returns 评测列表、总数及分页信息
 */
export const getGameReviews = async (
  gameId: string,
  pagination: PaginationParams = {}
): Promise<{ reviews: any[]; total: number; page: number; limit: number }> => {
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;

  // 首先获取总数
  const countResult = await query(
    'SELECT COUNT(*) as total FROM reviews WHERE game_id = ?',
    [gameId]
  );
  const total = parseInt(countResult[0]?.total || 0);

  // 然后获取分页数据
  const result = await query(
    `SELECT r.*, u.username, u.display_name, u.avatar_url, g.title as game_title
     FROM reviews r
     JOIN users u ON r.author_id = u.id
     LEFT JOIN games g ON r.game_id = g.id
     WHERE r.game_id = ?
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [gameId, limit, offset]
  );

  logger.debug(`获取游戏评测成功，游戏ID: ${gameId}，共${total}条评测`);

  return {
    reviews: result.map((row: any) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      rating: row.rating,
      likes: row.likes,
      gameId: row.game_id?.toString(),
      gameTitle: row.game_title,
      authorId: row.author_id?.toString(),
      author: row.display_name || row.username,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags || [],
      publishDate: row.published_at,
      publishedAt: row.published_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isFeatured: Boolean(row.is_featured),
      isHelpful: Boolean(row.is_helpful),
      comments: row.comments || 0,
      authorInfo: {
        id: row.author_id,
        username: row.username,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
      },
    })),
    total,
    page,
    limit,
  };
};

/**
 * 获取有论坛帖子的游戏列表（含帖子统计）
 * 用于游戏论坛广场页面
 */
export const getGamesWithForumPosts = async (
  options: { page?: number; limit?: number; search?: string } = {}
): Promise<{ games: any[]; total: number; page: number; limit: number }> => {
  const { page = 1, limit = 20, search = '' } = options;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: any[] = [];

  if (search) {
    conditions.push(`g.title LIKE ?`);
    params.push(`%${search}%`);
  }

  // 只返回至少有一个已审核通过帖子的游戏（使用表达式，兼容 PostgreSQL）
  const havingClause = `HAVING COUNT(cp.id) > 0`;

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // 获取总数
  const countSql = `
    SELECT COUNT(*) as total FROM (
      SELECT g.id, COUNT(cp.id) as forum_post_count
      FROM games g
      LEFT JOIN community_posts cp ON cp.game_id = g.id AND cp.deleted_at IS NULL AND cp.review_status = 'approved'
      ${whereClause}
      GROUP BY g.id
      ${havingClause}
    ) sub
  `;
  const countResult = await query(countSql, params);
  const total = parseInt(countResult[0]?.total || 0);

  // 获取分页数据（含帖子、评测、攻略计数）
  const dataSql = `
    SELECT g.*,
           COUNT(DISTINCT cp.id) as forum_post_count,
           COUNT(DISTINCT r.id) as review_count,
           COUNT(DISTINCT gu.id) as guide_count,
           MAX(cp.published_at) as latest_forum_post_date,
           (SELECT cp2.title FROM community_posts cp2 WHERE cp2.game_id = g.id AND cp2.deleted_at IS NULL AND cp2.review_status = 'approved' ORDER BY cp2.published_at DESC LIMIT 1) as latest_post_title
    FROM games g
    LEFT JOIN community_posts cp ON cp.game_id = g.id AND cp.deleted_at IS NULL AND cp.review_status = 'approved'
    LEFT JOIN reviews r ON r.game_id = g.id
    LEFT JOIN guides gu ON gu.game_id = g.id AND gu.review_status = 'approved'
    ${whereClause}
    GROUP BY g.id
    ${havingClause}
    ORDER BY (COUNT(DISTINCT cp.id) + COUNT(DISTINCT r.id) + COUNT(DISTINCT gu.id)) DESC, g.title ASC
    LIMIT ? OFFSET ?
  `;

  const dataParams = [...params, limit, offset];
  const result = await query(dataSql, dataParams);

  const games = result.map((row: any) => ({
    ...mapGameFromDb(row),
    forumPostCount: parseInt(row.forum_post_count) || 0,
    reviewCount: parseInt(row.review_count) || 0,
    guideCount: parseInt(row.guide_count) || 0,
    latestForumPostDate: row.latest_forum_post_date || null,
    latestPostTitle: row.latest_post_title || null,
  }));

  logger.debug(`获取论坛游戏列表成功，第${page}页，每页${limit}条，共${total}个游戏有论坛活动`);

  return { games, total, page, limit };
};

/**
 * 根据游戏标题生成 URL 友好的 slug
 * 移除特殊字符，将空格替换为连字符，合并多余连字符。
 * @param title - 游戏标题
 * @returns 转换后的 slug 字符串
 */
const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // 移除特殊字符
    .replace(/\s+/g, '-')     // 将空格替换为连字符
    .replace(/--+/g, '-')     // 将多个连字符替换为单个
    .trim();
};

export default {
  getGames,
  searchGames,
  getGameById,
  getGameBySlug,
  resolveGameId,
  createGame,
  updateGame,
  deleteGame,
  getGameReviews,
  getGamesWithForumPosts,
};
