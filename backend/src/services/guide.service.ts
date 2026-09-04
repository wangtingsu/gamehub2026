/**
 * 攻略服务
 * 提供游戏攻略（Guide）的完整 CRUD 操作，包括列表查询、搜索、创建、更新、删除、
 * 点赞、精选管理及评论查询。
 * 攻略发布后需审核通过方可公开显示。
 */

import config from '../config';
import logger from '../utils/logger';
import { query, execute, transaction } from '../db';
import {
  Guide,
  GuideCreateInput,
  GuideUpdateInput,
  PaginationParams,
  ReviewStatus,
  SearchParams
} from '../types';
import { NotFoundError, ValidationError, ConflictError } from '../middlewares/error.middleware';

/**
 * 生成文章 slug（满足 blog_articles.slug 唯一约束）
 * @param title - 标题
 * @returns 小写连字符 slug
 */
const generateSlug = (title: string): string => {
  let slug = title.toLowerCase().replace(/[^\w\s一-鿿-]/g, '').replace(/\s+/g, '-').replace(/--+/g, '-').trim();
  if (!slug) slug = `guide-${Date.now()}`;
  return slug;
};

/**
 * 攻略多语言翻译列后缀（不含中文——中文对应基础列 title/content/excerpt）。
 * 与 blog_articles 表的 title_xx / content_xx / excerpt_xx 列一一对应。
 */
const TRANSLATION_SUFFIXES = ['en', 'ja', 'ko', 'es', 'fr'] as const;
type TranslationSuffix = typeof TRANSLATION_SUFFIXES[number];

/** 将请求语言代码映射为翻译列后缀（中文返回 null，回退基础列） */
const langToSuffix = (lang?: string): TranslationSuffix | null => {
  const l = (lang || 'zh-CN').toLowerCase();
  if (l === 'zh-cn' || l === 'zh' || l === 'cn') return null;
  const base = l.split('-')[0];
  return (TRANSLATION_SUFFIXES as readonly string[]).includes(base)
    ? (base as TranslationSuffix)
    : null;
};

/** 从数据库行读取多语言翻译列，构建 translations 对象（空值省略） */
const readTranslations = (row: any): any => {
  const translations: any = {};
  for (const suffix of TRANSLATION_SUFFIXES) {
    const title = row[`title_${suffix}`];
    const content = row[`content_${suffix}`];
    const excerpt = row[`excerpt_${suffix}`];
    if (title || content || excerpt) {
      translations[suffix] = {
        ...(title ? { title } : {}),
        ...(content ? { content } : {}),
        ...(excerpt ? { excerpt } : {}),
      };
    }
  }
  return translations;
};

/** 根据语言本地化攻略字段（为空则回退基础列）；攻略的 summary 对应 excerpt 列 */
const localizeGuide = (guide: any, lang?: string): any => {
  const suffix = langToSuffix(lang);
  if (!suffix) return guide;
  const tr = guide.translations?.[suffix];
  if (!tr) return guide;
  return {
    ...guide,
    title: tr.title || guide.title,
    content: tr.content || guide.content,
    summary: tr.excerpt || guide.summary,
  };
};

/** 从翻译对象生成数据库列名与参数（用于 INSERT） */
const translationColumns = (translations?: any): { cols: string[]; params: any[] } => {
  const cols: string[] = [];
  const params: any[] = [];
  for (const suffix of TRANSLATION_SUFFIXES) {
    const tr = translations?.[suffix];
    cols.push(`title_${suffix}`, `content_${suffix}`, `excerpt_${suffix}`);
    params.push(tr?.title || null, tr?.content || null, tr?.excerpt || null);
  }
  return { cols, params };
};

/**
 * 从数据库行映射到 Guide 对象
 * 将 snake_case 数据库字段和 JSON 字符串字段转换为 camelCase 的 Guide 类型。
 * @param dbGuide - 数据库查询结果行
 * @returns 转换后的 Guide 对象
 */
const mapGuideFromDb = (dbGuide: any): Guide => ({
  id: dbGuide.id.toString(),
  title: dbGuide.title,
  maintitle: dbGuide.maintitle || undefined,
  content: dbGuide.content,
  summary: dbGuide.excerpt || dbGuide.summary || undefined,
  difficulty: dbGuide.difficulty || 'medium',
  gameId: dbGuide.game_id ? dbGuide.game_id.toString() : undefined,
  authorId: dbGuide.author_id ? dbGuide.author_id.toString() : undefined,
  coverImageUrl: dbGuide.cover_image_url || undefined,
  tags: typeof dbGuide.tags === 'string' ? JSON.parse(dbGuide.tags) : dbGuide.tags || [],
  steps: typeof dbGuide.steps === 'string' ? JSON.parse(dbGuide.steps) : dbGuide.steps || [],
  isFeatured: Boolean(dbGuide.is_pinned ?? dbGuide.is_featured),
  isPublished: Boolean(dbGuide.is_published),
  likes: dbGuide.likes,
  views: dbGuide.views,
  estimatedMinutes: dbGuide.estimated_minutes || undefined,
  createdAt: new Date(dbGuide.created_at),
  updatedAt: new Date(dbGuide.updated_at),
  reviewStatus: dbGuide.review_status as ReviewStatus | undefined,
  reviewComment: dbGuide.review_comment || undefined,
  reviewedBy: dbGuide.reviewed_by ? String(dbGuide.reviewed_by) : undefined,
  reviewedAt: dbGuide.reviewed_at ? new Date(dbGuide.reviewed_at) : undefined,
  translations: readTranslations(dbGuide),
});

/**
 * 将 camelCase 字符串转换为 snake_case
 * 用于将排序字段名转为数据库列名。
 * @param str - camelCase 格式的字符串
 * @returns snake_case 格式的字符串
 */
const camelToSnakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

/**
 * 获取攻略列表（支持分页和筛选）
 * 支持按游戏、难度、精选状态、作者和审核状态筛选。
 * 公开查询默认仅显示已发布且已审核通过的攻略。
 * @param pagination - 分页和排序参数
 * @param filters - 筛选条件（游戏ID、难度、精选、作者、审核状态）
 * @returns 攻略列表、总数及分页信息
 */
export const getGuides = async (
  pagination: PaginationParams = {},
  filters: { gameId?: string; difficulty?: string; featuredOnly?: boolean; authorId?: string; reviewStatus?: string; lang?: string } = {}
): Promise<{ guides: Guide[]; total: number; page: number; limit: number }> => {
  const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
  const offset = (page - 1) * limit;
  const { lang } = filters;

  const sortColumn = camelToSnakeCase(sortBy);
  const validSortColumns = ['id', 'title', 'difficulty', 'likes', 'views', 'estimated_minutes', 'created_at', 'updated_at'];
  const safeSortColumn = validSortColumns.includes(sortColumn) ? sortColumn : 'created_at';
  const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

  let whereClause = '';
  const queryParams: any[] = [];

  const conditions: string[] = ["g.post_type = 'guide'"];

  if (filters.gameId) {
    conditions.push('g.game_id = ?');
    queryParams.push(filters.gameId);
  }


  if (filters.featuredOnly !== undefined) {
    conditions.push('g.is_pinned = ?');
    queryParams.push(filters.featuredOnly ? 1 : 0);
  }

  if (filters.authorId) {
    conditions.push('g.author_id = ?');
    queryParams.push(filters.authorId);
  }

  // 公开查询仅显示已审核通过的内容；管理端传入reviewStatus覆盖
  if (filters.reviewStatus === 'all') {
    // 管理端：不过滤审核状态
  } else if (filters.reviewStatus) {
    conditions.push('g.review_status = ?');
    queryParams.push(filters.reviewStatus);
  } else {
    conditions.push("g.review_status = 'approved'");
  }

  if (conditions.length > 0) {
    whereClause = `WHERE ${conditions.join(' AND ')}`;
  }

  const countSql = `SELECT COUNT(*) as total FROM blog_articles g ${whereClause}`;
  const countResult = await query(countSql, queryParams);
  const total = parseInt(countResult[0]?.total || 0);

  const dataSql = `
    SELECT g.*, u.username as author_name, u.display_name as author_display_name, u.avatar_url as author_avatar,
           game.title as game_title, game.slug as game_slug, game.cover_image_url as game_cover
    FROM blog_articles g
    LEFT JOIN users u ON g.author_id = u.id
    LEFT JOIN games game ON g.game_id = game.id
    ${whereClause}
    ORDER BY ${safeSortColumn} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `;

  const dataParams = [...queryParams, limit, offset];
  const result = await query(dataSql, dataParams);

  const guides = result.map((row: any) => localizeGuide({
    ...mapGuideFromDb(row),
    authorName: row.author_name,
    authorDisplayName: row.author_display_name,
    authorAvatar: row.author_avatar,
    gameTitle: row.game_title,
    gameSlug: row.game_slug,
    gameCover: row.game_cover,
  }, lang));

  logger.debug(`获取攻略列表成功，第${page}页，每页${limit}条，共${total}条`);

  return {
    guides,
    total,
    page,
    limit,
  };
};

/**
 * 搜索攻略
 * 按关键词（标题、内容、摘要）和可选过滤条件搜索，结果按创建时间降序排列。
 * @param searchParams - 搜索参数，包含关键词、分页和过滤条件
 * @returns 匹配的攻略列表、总数及分页信息
 */
export const searchGuides = async (
  searchParams: SearchParams
): Promise<{ guides: Guide[]; total: number; page: number; limit: number; query?: string }> => {
  const { query: searchQuery = '', page = 1, limit = 20, filters = {} } = searchParams;
  const offset = (page - 1) * limit;
  const lang = filters.lang;

  let whereClause = '';
  const queryParams: any[] = [];

  const conditions: string[] = ['g.is_published = 1', "g.post_type = 'guide'"];

  if (searchQuery) {
    conditions.push('(g.title LIKE ? OR g.content LIKE ? OR g.excerpt LIKE ?)');
    queryParams.push(`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`);
  }

  if (filters.gameId) {
    conditions.push('g.game_id = ?');
    queryParams.push(filters.gameId);
  }


  // 公开搜索仅显示已审核通过的内容；管理端传入reviewStatus覆盖
  if (filters.reviewStatus === 'all') {
    // 管理端：不过滤审核状态
  } else if (filters.reviewStatus) {
    conditions.push('g.review_status = ?');
    queryParams.push(filters.reviewStatus);
  } else {
    conditions.push("g.review_status = 'approved'");
  }

  if (conditions.length > 0) {
    whereClause = `WHERE ${conditions.join(' AND ')}`;
  }

  const countSql = `SELECT COUNT(*) as total FROM blog_articles g ${whereClause}`;
  const countResult = await query(countSql, queryParams);
  const total = parseInt(countResult[0]?.total || 0);

  const dataSql = `
    SELECT g.*, u.username as author_name, u.display_name as author_display_name, u.avatar_url as author_avatar,
           game.title as game_title, game.slug as game_slug
    FROM blog_articles g
    LEFT JOIN users u ON g.author_id = u.id
    LEFT JOIN games game ON g.game_id = game.id
    ${whereClause}
    ORDER BY g.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const dataParams = [...queryParams, limit, offset];
  const result = await query(dataSql, dataParams);

  const guides = result.map((row: any) => localizeGuide({
    ...mapGuideFromDb(row),
    authorName: row.author_name,
    authorDisplayName: row.author_display_name,
    authorAvatar: row.author_avatar,
    gameTitle: row.game_title,
    gameSlug: row.game_slug,
  }, lang));

  logger.debug(`搜索攻略成功，关键词: "${searchQuery}"，找到${total}条结果`);

  return {
    guides,
    total,
    page,
    limit,
    query: searchQuery,
  };
};

/**
 * 根据 ID 获取攻略详情（含作者和游戏信息）
 * 关联查询作者和游戏表，返回增强的攻略数据。
 * @param id - 攻略ID
 * @returns 包含作者信息和游戏信息的完整攻略对象
 * @throws NotFoundError - 攻略不存在时抛出
 */
export const getGuideById = async (id: string, lang?: string): Promise<any> => {
  const result = await query(
    `SELECT g.*, u.username as author_name, u.display_name as author_display_name, u.avatar_url as author_avatar,
            game.title as game_title, game.slug as game_slug, game.cover_image_url as game_cover
     FROM blog_articles g
     LEFT JOIN users u ON g.author_id = u.id
     LEFT JOIN games game ON g.game_id = game.id
     WHERE g.id = ? AND g.post_type = 'guide'`,
    [id]
  );

  if (result.length === 0) {
    throw new NotFoundError(`攻略ID ${id} 不存在`);
  }

  const row = result[0];
  const guide = localizeGuide(mapGuideFromDb(row), lang);

  const enhancedGuide = {
    ...guide,
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

  logger.debug(`获取攻略详情成功: ${guide.title} (ID: ${id})`);

  return enhancedGuide;
};

/**
 * 创建攻略
 * 在事务中验证游戏存在后插入记录，新攻略默认为未发布（is_published=0）且待审核（pending）。
 * @param authorId - 作者用户ID
 * @param guideData - 攻略创建数据（标题、内容、步骤、难度等）
 * @returns 创建后的攻略对象
 * @throws NotFoundError - 关联的游戏不存在时抛出
 */
export const createGuide = async (authorId: string, guideData: GuideCreateInput): Promise<Guide> => {
  return await transaction(async () => {
    const gameExists = await query(
      'SELECT id FROM games WHERE id = ?',
      [guideData.gameId]
    );

    if (gameExists.length === 0) {
      throw new NotFoundError(`游戏ID ${guideData.gameId} 不存在`);
    }

    // 主标题（maintitle）：作为 URL slug 后缀来源，必填且唯一（缺省回退标题）
    const maintitle = (guideData.maintitle || guideData.title || '').trim();
    if (!maintitle) throw new ValidationError('主标题（maintitle）不能为空');
    const existingMain = await query('SELECT id FROM blog_articles WHERE LOWER(maintitle) = LOWER(?)', [maintitle]);
    if (existingMain.length > 0) throw new ConflictError('主标题已存在，请更换');

    // 生成 slug，确保唯一（blog_articles.slug 有唯一约束）
    let slug = generateSlug(maintitle);
    const slugExists = await query('SELECT id FROM blog_articles WHERE slug = ?', [slug]);
    if (slugExists.length > 0) {
      slug = `${slug}-${Date.now()}`;
    }

    const tr = translationColumns((guideData as any).translations);
    const cols = [
      'title', 'maintitle', 'slug', 'content', 'excerpt', 'cover_image_url', 'author_id', 'space_id', 'category', 'tags',
      'is_published', 'is_pinned', 'published_at', 'review_status', 'post_type', 'game_id', 'created_at', 'updated_at',
      ...tr.cols,
    ];
    const placeholders = cols.map(() => '?').join(',');
    const values = [
      guideData.title,
      maintitle,
      slug,
      guideData.content,
      guideData.summary || '',
      guideData.coverImageUrl || null,
      authorId,
      (guideData as any).spaceId || 1,
      '攻略',
      JSON.stringify(guideData.tags || []),
      0, // is_published = 0，待审核
      0, // is_pinned = 0
      null, // published_at（未发布）
      'pending',
      'guide',
      guideData.gameId,
      new Date().toISOString(),
      new Date().toISOString(),
      ...tr.params,
    ];

    const result = await execute(
      `INSERT INTO blog_articles (${cols.join(',')}) VALUES (${placeholders})`,
      values
    );

    const inserted = await query(
      'SELECT * FROM blog_articles WHERE id = ?',
      [result.lastInsertRowid]
    );

    const guide = mapGuideFromDb(inserted[0]);
    logger.info(`攻略创建成功: ${guide.title} (ID: ${guide.id})`);

    return guide;
  });
};

/**
 * 更新攻略信息
 * 动态构建 UPDATE 语句，仅更新提供的字段，支持标题、内容、步骤、审核状态等。
 * @param id - 攻略ID
 * @param updateData - 要更新的攻略字段
 * @returns 更新后的攻略对象
 * @throws NotFoundError - 攻略不存在时抛出
 */
export const updateGuide = async (
  id: string,
  updateData: GuideUpdateInput
): Promise<Guide> => {
  const updates: string[] = [];
  const values: any[] = [];

  // 主标题（maintitle）：若提供则校验唯一性，并据此重新生成 slug
  if ((updateData as any).maintitle !== undefined) {
    const maintitle = ((updateData as any).maintitle || '').trim();
    if (!maintitle) throw new ValidationError('主标题（maintitle）不能为空');
    const existingMain = await query('SELECT id FROM blog_articles WHERE LOWER(maintitle) = LOWER(?) AND id != ?', [maintitle, id]);
    if (existingMain.length > 0) throw new ConflictError('主标题已存在，请更换');
    updates.push('maintitle = ?');
    values.push(maintitle);
    const newSlug = generateSlug(maintitle);
    const existingSlug = await query('SELECT id FROM blog_articles WHERE slug = ? AND id != ?', [newSlug, id]);
    updates.push('slug = ?');
    values.push(existingSlug.length > 0 ? `${newSlug}-${Date.now()}` : newSlug);
  }

  if (updateData.title !== undefined) {
    updates.push('title = ?');
    values.push(updateData.title);
  }

  if (updateData.content !== undefined) {
    updates.push('content = ?');
    values.push(updateData.content);
  }

  if (updateData.summary !== undefined) {
    updates.push('excerpt = ?');
    values.push(updateData.summary);
  }

  if (updateData.coverImageUrl !== undefined) {
    updates.push('cover_image_url = ?');
    values.push(updateData.coverImageUrl);
  }

  if (updateData.tags !== undefined) {
    updates.push('tags = ?');
    values.push(JSON.stringify(updateData.tags));
  }

  if ((updateData as any).spaceId !== undefined) {
    updates.push('space_id = ?');
    values.push((updateData as any).spaceId);
  }

  if (updateData.isFeatured !== undefined) {
    updates.push('is_pinned = ?');
    values.push(updateData.isFeatured ? 1 : 0);
  }

  if (updateData.isPublished !== undefined) {
    updates.push('is_published = ?');
    values.push(updateData.isPublished ? 1 : 0);
  }

  if (updateData.reviewStatus !== undefined) {
    updates.push('review_status = ?');
    values.push(updateData.reviewStatus);
  }

  if (updateData.reviewComment !== undefined) {
    updates.push('review_comment = ?');
    values.push(updateData.reviewComment);
  }

  // 多语言翻译列
  if ((updateData as any).translations !== undefined) {
    for (const suffix of TRANSLATION_SUFFIXES) {
      const tr = (updateData as any).translations?.[suffix];
      if (tr && (tr.title !== undefined || tr.content !== undefined || tr.excerpt !== undefined)) {
        updates.push(`title_${suffix} = ?`, `content_${suffix} = ?`, `excerpt_${suffix} = ?`);
        values.push(tr.title ?? null, tr.content ?? null, tr.excerpt ?? null);
      }
    }
  }

  if (updates.length === 0) {
    return getGuideById(id);
  }

  const now = new Date().toISOString();
  updates.push('updated_at = ?');
  values.push(now);
  values.push(id);

  const result = await execute(
    `UPDATE blog_articles SET ${updates.join(', ')} WHERE id = ? AND post_type = 'guide'`,
    values
  );

  if (result.changes === 0) {
    throw new NotFoundError(`攻略ID ${id} 不存在`);
  }

  const guide = await getGuideById(id);
  logger.info(`攻略更新成功: ${guide.title} (ID: ${id})`);

  return guide;
};

/**
 * 删除攻略（物理删除）
 * @param id - 攻略ID
 * @throws NotFoundError - 攻略不存在时抛出
 */
export const deleteGuide = async (id: string): Promise<void> => {
  const rows = await query("SELECT content FROM blog_articles WHERE id = ? AND post_type = 'guide'", [id]) as any[];
  if (rows.length > 0 && rows[0].content) {
    const { cleanupContentImages } = require('./image-cleanup.service');
    cleanupContentImages(rows[0].content);
  }
  const result = await execute(
    "DELETE FROM blog_articles WHERE id = ? AND post_type = 'guide'",
    [id]
  );

  if (result.changes === 0) {
    throw new NotFoundError(`攻略ID ${id} 不存在`);
  }

  logger.info(`攻略删除成功: ID ${id}`);
};

/**
 * 攻略点赞
 * 增加攻略的点赞计数器并返回最新点赞数。
 * @param id - 攻略ID
 * @returns 当前点赞数
 * @throws NotFoundError - 攻略不存在时抛出
 */
export const likeGuide = async (id: string): Promise<{ likes: number }> => {
  await execute(
    "UPDATE blog_articles SET likes = likes + 1 WHERE id = ? AND post_type = 'guide'",
    [id]
  );

  const result = await query(
    "SELECT likes FROM blog_articles WHERE id = ? AND post_type = 'guide'",
    [id]
  );

  if (result.length === 0) {
    throw new NotFoundError(`攻略ID ${id} 不存在`);
  }

  const likes = result[0].likes;
  logger.debug(`攻略点赞成功: ID ${id}, 当前点赞数: ${likes}`);

  return { likes };
};

/**
 * 设置/取消攻略精选状态（管理员操作）
 * @param id - 攻略ID
 * @param isFeatured - 是否设为精选
 * @returns 更新后的攻略对象
 * @throws NotFoundError - 攻略不存在时抛出
 */
export const featureGuide = async (id: string, isFeatured: boolean): Promise<Guide> => {
  const result = await execute(
    "UPDATE blog_articles SET is_pinned = ? WHERE id = ? AND post_type = 'guide'",
    [isFeatured ? 1 : 0, id]
  );

  if (result.changes === 0) {
    throw new NotFoundError(`攻略ID ${id} 不存在`);
  }

  const guide = await getGuideById(id);
  const status = isFeatured ? '精选' : '取消精选';
  logger.info(`攻略${status}成功: ${guide.title} (ID: ${id})`);

  return guide;
};

/**
 * 增加攻略的浏览次数
 * 每次访问详情页时调用，实现访问计数。
 * @param id - 攻略ID
 */
export const incrementViewCount = async (id: string): Promise<void> => {
  await execute(
    "UPDATE blog_articles SET views = views + 1 WHERE id = ? AND post_type = 'guide'",
    [id]
  );
};

/**
 * 获取攻略的评论列表
 * 通过统一的 comments 表（parent_type = 'guide'）查询指定攻略的评论。
 * @param guideId - 攻略ID
 * @param pagination - 分页参数
 * @returns 评论列表、总数及分页信息
 */
export const getGuideComments = async (
  guideId: string,
  pagination: PaginationParams = {}
): Promise<{ comments: any[]; total: number; page: number; limit: number }> => {
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;

  const countResult = await query(
    'SELECT COUNT(*) as total FROM comments WHERE parent_type = ? AND parent_id = ?',
    ['guide', guideId]
  );
  const total = parseInt(countResult[0]?.total || 0);

  const result = await query(
    `SELECT c.*, u.username, u.display_name, u.avatar_url
     FROM comments c
     JOIN users u ON c.author_id = u.id
     WHERE c.parent_type = ? AND c.parent_id = ?
     ORDER BY c.created_at DESC
     LIMIT ? OFFSET ?`,
    ['guide', guideId, limit, offset]
  );

  logger.debug(`获取攻略评论成功，攻略ID: ${guideId}，共${total}条评论`);

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

/**
 * 获取指定游戏的所有攻略
 * 是对 getGuides 的便捷封装，按 gameId 筛选。
 * @param gameId - 游戏ID
 * @param pagination - 分页参数
 * @returns 攻略列表、总数及分页信息
 */
export const getGameGuides = async (
  gameId: string,
  pagination: PaginationParams = {},
  lang?: string
): Promise<{ guides: Guide[]; total: number; page: number; limit: number }> => {
  return getGuides(pagination, { gameId, lang });
};

export default {
  getGuides,
  searchGuides,
  getGuideById,
  createGuide,
  updateGuide,
  deleteGuide,
  likeGuide,
  featureGuide,
  incrementViewCount,
  getGuideComments,
  getGameGuides,
};
