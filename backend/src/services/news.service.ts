/**
 * 新闻/博客服务
 *
 * 提供新闻文章（博客）的完整 CRUD 操作，以及搜索、评论、点赞等功能。
 * 支持内容审核状态管理（草稿/待审核/已批准/已拒绝），
 * 草稿发布时自动触发 AI 审核流程。
 * 提供公开和管理员两种查询模式，公开查询仅返回已审核通过的内容。
 */
import config from '../config';
import logger from '../utils/logger';
import { query, execute, transaction } from '../db';
import {
  News,
  NewsCreateInput,
  NewsUpdateInput,
  NewsTranslations,
  PaginationParams,
  ReviewStatus,
  SearchParams
} from '../types';
import { NotFoundError, ConflictError } from '../middlewares/error.middleware';
import { applyAiReview } from './ai-review.service';

/**
 * 新闻多语言支持的翻译列后缀（不含中文——中文对应基础列 title/content/excerpt）。
 * 与 news 表的 title_xx / content_xx / excerpt_xx 列一一对应。
 */
const TRANSLATION_SUFFIXES = ['en', 'ja', 'ko', 'es', 'fr'] as const;
type TranslationSuffix = typeof TRANSLATION_SUFFIXES[number];

/**
 * 将请求语言代码映射为翻译列后缀。
 * 中文（zh-CN / zh / cn）映射为基础列（返回 null），其余取小写前两段并校验。
 *
 * @param lang - 语言代码（如 "en"、"zh-CN"、"ja"），默认 zh-CN
 * @returns 翻译列后缀，中文或未支持语言返回 null（回退基础列）
 */
const langToSuffix = (lang?: string): TranslationSuffix | null => {
  const l = (lang || 'zh-CN').toLowerCase();
  if (l === 'zh-cn' || l === 'zh' || l === 'cn') return null;
  const base = l.split('-')[0];
  return (TRANSLATION_SUFFIXES as readonly string[]).includes(base)
    ? (base as TranslationSuffix)
    : null;
};

/**
 * 根据语言本地化新闻字段。
 * 用该语言的翻译覆盖 title/content/excerpt，为空则回退基础列；其余字段原样保留。
 *
 * @param news - 原始 News 对象（含 translations）
 * @param lang - 请求语言代码
 * @returns 本地化后的 News 对象
 */
const localizeNews = (news: News, lang?: string): News => {
  const suffix = langToSuffix(lang);
  if (!suffix) return news; // 中文或未支持语言 → 基础列
  const tr = news.translations?.[suffix];
  if (!tr) return news;
  return {
    ...news,
    title: tr.title || news.title,
    content: tr.content || news.content,
    excerpt: tr.excerpt || news.excerpt,
  };
};

/**
 * 从翻译对象生成数据库列名与参数（用于 createNews 的 INSERT）。
 *
 * @param translations - 多语言翻译对象
 * @returns 翻译列名数组与对应参数数组
 */
const translationColumns = (translations?: NewsTranslations): { cols: string[]; params: any[] } => {
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
 * 将数据库行映射为 News 对象
 *
 * 处理 JSON 字符串字段的解析（如 tags）、日期字段的转换、
 * 数字和布尔字段的类型转换。
 *
 * @param dbNews - 数据库查询结果行
 * @returns 标准化的 News 对象
 */
const mapNewsFromDb = (dbNews: any): News => {
  // 读取多语言翻译列（不含中文，中文对应基础列）
  const translations: NewsTranslations = {};
  for (const suffix of TRANSLATION_SUFFIXES) {
    const title = dbNews[`title_${suffix}`];
    const content = dbNews[`content_${suffix}`];
    const excerpt = dbNews[`excerpt_${suffix}`];
    if (title || content || excerpt) {
      translations[suffix] = {
        ...(title ? { title } : {}),
        ...(content ? { content } : {}),
        ...(excerpt ? { excerpt } : {}),
      };
    }
  }

  return {
    id: dbNews.id.toString(),
    title: dbNews.title,
    slug: dbNews.slug,
    content: dbNews.content,
    excerpt: dbNews.excerpt || '',
    coverImageUrl: dbNews.cover_image_url,
    authorId: dbNews.author_id.toString(),
    authorName: dbNews.author_name || null,
    authorDisplayName: dbNews.author_display_name || null,
    category: dbNews.category,
    tags: typeof dbNews.tags === 'string' ? JSON.parse(dbNews.tags) : dbNews.tags || [],
    isPublished: Boolean(dbNews.is_published),
    isPinned: Boolean(dbNews.is_pinned),
    gameName: dbNews.game_name || undefined,
    publishedAt: dbNews.published_at ? new Date(dbNews.published_at) : undefined,
    views: dbNews.views,
    likes: dbNews.likes,
    comments: dbNews.comments,
    createdAt: new Date(dbNews.created_at),
    updatedAt: new Date(dbNews.updated_at),
    translations,
    reviewStatus: dbNews.review_status as ReviewStatus | undefined,
    reviewComment: dbNews.review_comment || undefined,
    reviewedBy: dbNews.reviewed_by ? String(dbNews.reviewed_by) : undefined,
    reviewedAt: dbNews.reviewed_at ? new Date(dbNews.reviewed_at) : undefined,
  };
};

/**
 * 将 camelCase 字符串转换为 snake_case
 *
 * 用于将前端传入的排序字段名转换为数据库列名。
 * 例如：createdAt -> created_at
 *
 * @param str - 输入的 camelCase 字符串
 * @returns 转换后的 snake_case 字符串
 */
const camelToSnakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

/**
 * 获取新闻列表
 *
 * 支持分页、分类筛选、发布状态筛选和审核状态筛选。
 * 公开查询默认只返回已审核通过（approved）的新闻；
 * 管理端可通过传入 reviewStatus='all' 获取所有状态的新闻。
 *
 * @param pagination - 分页与排序参数（默认按 createdAt 降序）
 * @param filters - 筛选条件：分类、是否仅已发布、审核状态
 * @returns 新闻列表及分页元数据
 */
export const getNews = async (
  pagination: PaginationParams = {},
  filters: { category?: string; publishedOnly?: boolean; reviewStatus?: string } = {},
  lang?: string
): Promise<{ news: News[]; total: number; page: number; limit: number }> => {
  const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
  const offset = (page - 1) * limit;

  // 转换排序字段为 snake_case 并校验安全性，防止 SQL 注入
  const sortColumn = camelToSnakeCase(sortBy);
  const validSortColumns = ['id', 'title', 'slug', 'category', 'views', 'likes', 'published_at', 'created_at', 'updated_at'];
  const safeSortColumn = validSortColumns.includes(sortColumn) ? sortColumn : 'created_at';
  const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

  // 构建动态 WHERE 子句
  let whereClause = '';
  const queryParams: any[] = [];

  const conditions: string[] = [];

  if (filters.category) {
    conditions.push(`category = ?`);
    queryParams.push(filters.category);
  }

  if (filters.publishedOnly !== undefined) {
    conditions.push(`is_published = ?`);
    queryParams.push(filters.publishedOnly ? 1 : 0);
  }

  // 审核状态筛选：公开查询仅显示 approved，管理端传入 'all' 不过滤
  if (filters.reviewStatus === 'all') {
    // 管理端：不过滤审核状态
  } else if (filters.reviewStatus) {
    conditions.push(`n.review_status = ?`);
    queryParams.push(filters.reviewStatus);
  } else {
    conditions.push(`n.review_status = 'approved'`);
  }

  if (conditions.length > 0) {
    whereClause = `WHERE ${conditions.join(' AND ')}`;
  }

  // 先获取总数，再获取分页数据（避免在大数据集下性能问题）
  const countSql = `SELECT COUNT(*) as total FROM news n ${whereClause}`;
  const countResult = await query(countSql, queryParams);
  const total = parseInt(countResult[0]?.total || 0);

  // 获取分页数据，关联作者信息
  const dataSql = `
    SELECT n.*, u.username as author_name, u.display_name as author_display_name
    FROM news n
    LEFT JOIN users u ON n.author_id = u.id
    ${whereClause}
    ORDER BY n.is_pinned DESC, n.${safeSortColumn} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `;

  const dataParams = [...queryParams, limit, offset];
  const result = await query(dataSql, dataParams);

  const news = result.map(mapNewsFromDb).map((n) => localizeNews(n, lang));

  logger.debug(`获取新闻列表成功，第${page}页，每页${limit}条，共${total}条`);

  return {
    news,
    total,
    page,
    limit,
  };
};

/**
 * 搜索新闻
 *
 * 基于关键词对新闻的标题、内容和摘要进行模糊匹配搜索。
 * 支持分类筛选、发布状态筛选和审核状态筛选。
 * 公开搜索默认只返回已审核通过的内容。
 *
 * @param searchParams - 搜索参数（关键词、分页、筛选条件）
 * @returns 搜索结果及分页元数据
 */
export const searchNews = async (
  searchParams: SearchParams,
  lang?: string
): Promise<{ news: News[]; total: number; page: number; limit: number; query?: string }> => {
  const { query: searchQuery = '', page = 1, limit = 20, filters = {} } = searchParams;
  const offset = (page - 1) * limit;

  let whereClause = '';
  const queryParams: any[] = [];

  const conditions: string[] = [];

  // 关键词搜索：匹配标题、正文和摘要
  if (searchQuery) {
    conditions.push(`(title LIKE ? OR content LIKE ? OR excerpt LIKE ?)`);
    queryParams.push(`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`);
  }

  // 应用额外筛选条件
  if (filters.category) {
    conditions.push(`category = ?`);
    queryParams.push(filters.category);
  }

  if (filters.publishedOnly !== undefined) {
    conditions.push(`is_published = ?`);
    queryParams.push(filters.publishedOnly ? 1 : 0);
  }

  // 审核状态筛选逻辑同 getNews
  if (filters.reviewStatus === 'all') {
    // 管理端：不过滤审核状态
  } else if (filters.reviewStatus) {
    conditions.push(`review_status = ?`);
    queryParams.push(filters.reviewStatus);
  } else {
    conditions.push(`review_status = 'approved'`);
  }

  if (conditions.length > 0) {
    whereClause = `WHERE ${conditions.join(' AND ')}`;
  }

  // 获取总数
  const countSql = `SELECT COUNT(*) as total FROM news ${whereClause}`;
  const countResult = await query(countSql, queryParams);
  const total = parseInt(countResult[0]?.total || 0);

  // 获取分页数据
  const dataSql = `
    SELECT * FROM news
    ${whereClause}
    ORDER BY published_at DESC, created_at DESC
    LIMIT ? OFFSET ?
  `;

  const dataParams = [...queryParams, limit, offset];
  const result = await query(dataSql, dataParams);

  const news = result.map(mapNewsFromDb).map((n) => localizeNews(n, lang));

  logger.debug(`搜索新闻成功，关键词: "${searchQuery}"，找到${total}条结果`);

  return {
    news,
    total,
    page,
    limit,
    query: searchQuery,
  };
};

/**
 * 通过 ID 获取新闻详情
 *
 * 返回新闻详情及作者信息，同时自动增加浏览量计数。
 *
 * @param id - 新闻 ID
 * @returns News 对象
 * @throws 当新闻不存在时抛出 NotFoundError
 */
export const getNewsById = async (id: string, lang?: string): Promise<News> => {
  const result = await query(
    `SELECT n.*, u.username as author_name, u.display_name as author_display_name
     FROM news n
     LEFT JOIN users u ON n.author_id = u.id
     WHERE n.id = ?`,
    [id]
  );

  if (result.length === 0) {
    throw new NotFoundError(`新闻ID ${id} 不存在`);
  }

  const news = localizeNews(mapNewsFromDb(result[0]), lang);
  // 增加浏览量（每次访问 +1）
  await execute(
    'UPDATE news SET views = views + 1 WHERE id = ?',
    [id]
  );

  logger.debug(`获取新闻详情成功: ${news.title} (ID: ${id})`);

  return news;
};

/**
 * 通过 Slug 获取新闻详情
 *
 * 根据 URL 友好的 slug 查找新闻，同时自动增加浏览量计数。
 *
 * @param slug - 新闻的 URL 标识
 * @returns News 对象
 * @throws 当 slug 对应的新闻不存在时抛出 NotFoundError
 */
export const getNewsBySlug = async (slug: string, lang?: string): Promise<News> => {
  const result = await query(
    `SELECT n.*, u.username as author_name, u.display_name as author_display_name
     FROM news n
     LEFT JOIN users u ON n.author_id = u.id
     WHERE n.slug = ?`,
    [slug]
  );

  if (result.length === 0) {
    throw new NotFoundError(`新闻slug ${slug} 不存在`);
  }

  const news = localizeNews(mapNewsFromDb(result[0]), lang);
  // 增加浏览量
  await execute(
    'UPDATE news SET views = views + 1 WHERE id = ?',
    [news.id]
  );

  logger.debug(`获取新闻详情成功: ${news.title} (slug: ${slug})`);

  return news;
};

/**
 * 创建新闻/博客文章
 *
 * 支持普通用户和管理员创建文章。草稿状态不触发 AI 审核；
 * 发布状态（非草稿）自动进入"pending"审核队列并触发 AI 审核。
 * 如果 slug 冲突且非草稿状态则抛出冲突异常。
 *
 * @param authorId - 作者用户 ID
 * @param newsData - 新闻创建输入数据
 * @param enableAiReview - 是否启用 AI 自动审核（默认启用）
 * @returns 创建成功的完整 News 对象
 * @throws 当 slug 已存在且非草稿时抛出 ConflictError
 */
export const createNews = async (
  authorId: string,
  newsData: NewsCreateInput,
  enableAiReview = true,
): Promise<News> => {
  // 根据前端传入状态确定初始审核状态
  const isDraft = newsData.status === 'draft';
  const initialStatus = isDraft ? 'draft' : 'pending';

  let newsId = '';

  // 事务内插入文章记录
  await transaction(async () => {
    const slug = generateSlug(newsData.title);

    // 非草稿模式下检查 slug 唯一性
    if (!isDraft) {
      const existingNews = await query(
        'SELECT id FROM news WHERE slug = ?',
        [slug]
      );

      if (existingNews.length > 0) {
        throw new ConflictError(`新闻slug "${slug}" 已存在`);
      }
    }

    const { cols: trCols, params: trParams } = translationColumns(newsData.translations);

    const result = await execute(
      `INSERT INTO news (
        title, slug, content, excerpt, cover_image_url, author_id,
        category, tags, is_published, is_pinned, game_name, published_at, review_status
        ${trCols.length ? `, ${trCols.join(', ')}` : ''}
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?${trCols.length ? `, ${trCols.map(() => '?').join(', ')}` : ''})`,
      [
        newsData.title,
        slug,
        newsData.content,
        newsData.excerpt || '',
        newsData.coverImageUrl || '',
        authorId,
        newsData.category,
        JSON.stringify(newsData.tags || []),
        1,
        newsData.isPinned ? 1 : 0,
        newsData.gameName || null,
        new Date().toISOString(),
        initialStatus,
        ...trParams,
      ]
    );

    newsId = String(result.lastInsertRowid);
    logger.info(`新闻创建成功: ${newsData.title} (ID: ${newsId})`);
  });

  // 草稿不执行 AI 审核，仅在非草稿且启用 AI 审核时触发
  if (!isDraft && enableAiReview) {
    try {
      await applyAiReview(newsId, newsData.title, newsData.content, newsData.category);
    } catch (error) {
      logger.error(`AI 审核执行异常: newsId=${newsId}`, error);
    }
  }

  // 返回最新的文章完整数据
  return getNewsById(newsId);
};

/**
 * 更新新闻文章
 *
 * 支持修改标题、内容、分类、标签、发布状态、审核状态和审核意见等字段。
 * 当文章从草稿提交为待审核状态时，可触发 AI 自动审核。
 *
 * @param id - 新闻 ID
 * @param updateData - 需要更新的字段数据
 * @param enableAiReview - 是否在草稿提交审核时触发 AI 审核（默认 false）
 * @returns 更新后的完整 News 对象
 * @throws 当新闻不存在时抛出 NotFoundError
 */
export const updateNews = async (
  id: string,
  updateData: NewsUpdateInput,
  enableAiReview = false,
): Promise<News> => {
  const updates: string[] = [];
  const values: any[] = [];

  // 记录旧审核状态，用于判断是否需要触发 AI 审核
  let oldStatus: string | undefined;

  if (updateData.reviewStatus !== undefined) {
    const existing = await getNewsById(id);
    oldStatus = existing.reviewStatus;
  }

  // 动态构建更新字段列表（仅包含有值的字段）
  if (updateData.title !== undefined) {
    updates.push(`title = ?`);
    values.push(updateData.title);
  }

  if (updateData.content !== undefined) {
    updates.push(`content = ?`);
    values.push(updateData.content);
  }

  if (updateData.excerpt !== undefined) {
    updates.push(`excerpt = ?`);
    values.push(updateData.excerpt);
  }

  if (updateData.gameName !== undefined) {
    updates.push(`game_name = ?`);
    values.push(updateData.gameName || null);
  }

  if (updateData.isPinned !== undefined) {
    updates.push(`is_pinned = ?`);
    values.push(updateData.isPinned ? 1 : 0);
  }

  if (updateData.coverImageUrl !== undefined) {
    updates.push(`cover_image_url = ?`);
    values.push(updateData.coverImageUrl);
  }

  if (updateData.category !== undefined) {
    updates.push(`category = ?`);
    values.push(updateData.category);
  }

  if (updateData.tags !== undefined) {
    updates.push(`tags = ?`);
    values.push(JSON.stringify(updateData.tags));
  }

  if (updateData.isPublished !== undefined) {
    updates.push(`is_published = ?`);
    values.push(updateData.isPublished ? 1 : 0);

    // 发布时同时设置发布时间
    if (updateData.isPublished) {
      updates.push(`published_at = ?`);
      values.push(new Date().toISOString());
    }
  }

  if (updateData.reviewStatus !== undefined) {
    updates.push(`review_status = ?`);
    values.push(updateData.reviewStatus);
  }

  if (updateData.reviewComment !== undefined) {
    updates.push(`review_comment = ?`);
    values.push(updateData.reviewComment);
  }

  // 多语言翻译字段更新
  if (updateData.translations !== undefined) {
    for (const suffix of TRANSLATION_SUFFIXES) {
      const tr = updateData.translations[suffix];
      if (!tr) continue;
      if (tr.title !== undefined) {
        updates.push(`title_${suffix} = ?`);
        values.push(tr.title || null);
      }
      if (tr.content !== undefined) {
        updates.push(`content_${suffix} = ?`);
        values.push(tr.content || null);
      }
      if (tr.excerpt !== undefined) {
        updates.push(`excerpt_${suffix} = ?`);
        values.push(tr.excerpt || null);
      }
    }
  }

  // 没有需要更新的字段则直接返回当前数据
  if (updates.length === 0) {
    return getNewsById(id);
  }

  const now = new Date().toISOString();
  updates.push(`updated_at = ?`);
  values.push(now);

  values.push(id);

  const result = await execute(
    `UPDATE news
     SET ${updates.join(', ')}
     WHERE id = ?`,
    values
  );

  if (result.changes === 0) {
    throw new NotFoundError(`新闻ID ${id} 不存在`);
  }

  const news = await getNewsById(id);

  // 草稿提交审核时触发 AI 审核（oldStatus=draft, newStatus=pending）
  if (enableAiReview && oldStatus === 'draft' && updateData.reviewStatus === 'pending') {
    try {
      await applyAiReview(id, news.title, news.content, news.category);
      // 重新获取最新数据（含 AI 审核结果）
      return getNewsById(id);
    } catch (error) {
      logger.error(`AI 审核执行异常: newsId=${id}`, error);
    }
  }

  logger.info(`新闻更新成功: ${news.title} (ID: ${id})`);

  return news;
};

/**
 * 获取当前用户的文章列表
 *
 * 查看指定用户创建的所有文章，支持按审核状态筛选。
 *
 * @param userId - 用户 ID
 * @param pagination - 分页参数及可选的状态筛选（status）
 * @returns 文章列表及分页元数据
 */
export const getMyNews = async (
  userId: string,
  pagination: PaginationParams & { status?: string } = {},
  lang?: string
): Promise<{ news: News[]; total: number; page: number; limit: number }> => {
  const { page = 1, limit = 20, status } = pagination;
  const offset = (page - 1) * limit;

  const countParams: any[] = [userId];
  const dataParams: any[] = [userId];

  // 状态筛选（支持 'all' 不过滤）
  let statusFilter = '';
  if (status && status !== 'all') {
    statusFilter = ' AND n.review_status = ?';
    countParams.push(status);
    dataParams.push(status);
  }

  const countResult = await query(
    `SELECT COUNT(*) as total FROM news WHERE author_id = ?${statusFilter}`,
    countParams
  );
  const total = parseInt(countResult[0]?.total || 0);

  dataParams.push(limit, offset);
  const result = await query(
    `SELECT n.*, u.username as author_name, u.display_name as author_display_name
     FROM news n
     LEFT JOIN users u ON n.author_id = u.id
     WHERE n.author_id = ?${statusFilter}
     ORDER BY n.created_at DESC
     LIMIT ? OFFSET ?`,
    dataParams
  );

  const news = result.map(mapNewsFromDb).map((n) => localizeNews(n, lang));

  return { news, total, page, limit };
};

/**
 * 获取新闻的作者 ID
 *
 * 用于权限校验，判断当前用户是否为文章作者。
 *
 * @param id - 新闻 ID
 * @returns 作者用户 ID，如果新闻不存在则返回 null
 */
export const getNewsAuthorId = async (id: string): Promise<string | null> => {
  const result = await query('SELECT author_id FROM news WHERE id = ?', [id]);
  if (result.length === 0) return null;
  return result[0].author_id?.toString() || null;
};

/**
 * 删除新闻
 *
 * 物理删除指定的新闻记录。调用前应由上层路由进行权限校验
 * （管理员或作者本人可删除）。
 *
 * @param id - 新闻 ID
 * @throws 当新闻不存在时抛出 NotFoundError
 */
export const deleteNews = async (id: string): Promise<void> => {
  // 删除前获取内容以清理图片
  const rows = await query('SELECT content FROM news WHERE id = ?', [id]) as any[];
  if (rows.length > 0 && rows[0].content) {
    const { cleanupContentImages } = require('./image-cleanup.service');
    cleanupContentImages(rows[0].content);
  }

  const result = await execute(
    'DELETE FROM news WHERE id = ?',
    [id]
  );

  if (result.changes === 0) {
    throw new NotFoundError(`新闻ID ${id} 不存在`);
  }

  logger.info(`新闻删除成功: ID ${id}`);
};

/**
 * 点赞新闻
 *
 * 增加指定新闻的点赞计数并返回最新的点赞数。
 *
 * @param id - 新闻 ID
 * @returns 包含最新点赞数的对象
 * @throws 当新闻不存在时抛出 NotFoundError
 */
export const likeNews = async (id: string, userId: string): Promise<{ likes: number; liked: boolean }> => {
  // 检查是否已点赞
  const existing = await query(
    'SELECT id FROM news_likes WHERE news_id = ? AND user_id = ?',
    [id, userId]
  );

  if (existing.length > 0) {
    // 已点赞 → 取消点赞
    await execute('DELETE FROM news_likes WHERE news_id = ? AND user_id = ?', [id, userId]);
    await execute('UPDATE news SET likes = MAX(0, likes - 1) WHERE id = ?', [id]);
  } else {
    // 未点赞 → 点赞
    await execute('INSERT INTO news_likes (news_id, user_id) VALUES (?, ?)', [id, userId]);
    await execute('UPDATE news SET likes = likes + 1 WHERE id = ?', [id]);
  }

  const result = await query('SELECT likes FROM news WHERE id = ?', [id]);
  if (result.length === 0) throw new NotFoundError(`新闻ID ${id} 不存在`);

  return { likes: result[0].likes, liked: existing.length === 0 };
};

/**
 * 获取新闻评论列表
 *
 * 分页获取指定新闻下的评论，按创建时间倒序排列。
 *
 * @param newsId - 新闻 ID
 * @param pagination - 分页参数
 * @returns 评论列表及分页元数据（每条评论包含作者信息）
 */
export const getNewsComments = async (
  newsId: string,
  pagination: PaginationParams = {}
): Promise<{ comments: any[]; total: number; page: number; limit: number }> => {
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;

  // 先获取总数
  const countResult = await query(
    'SELECT COUNT(*) as total FROM comments WHERE parent_type = ? AND parent_id = ?',
    ['news', newsId]
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
    ['news', newsId, limit, offset]
  );

  logger.debug(`获取新闻评论成功，新闻ID: ${newsId}，共${total}条评论`);

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
 * 生成 URL 友好的 Slug
 *
 * 将标题转换为小写，移除特殊字符，将空格替换为连字符。
 *
 * @param title - 文章标题
 * @returns 生成的 slug 字符串
 */
const generateSlug = (title: string): string => {
  let slug = title
    .toLowerCase()
    .replace(/[^\w\s一-鿿-]/g, '') // 保留中文字符
    .replace(/\s+/g, '-')     // 将空格替换为连字符
    .replace(/--+/g, '-')     // 将多个连字符替换为单个
    .trim();

  // 纯特殊字符标题会导致 slug 为空，使用时间戳作为后备
  if (!slug) {
    slug = `news-${Date.now()}`;
  }

  return slug;
};

export const pinNews = async (id: string): Promise<News> => {
  await execute('UPDATE news SET is_pinned = 1 WHERE id = ?', [id]);
  return getNewsById(id);
};

export const unpinNews = async (id: string): Promise<News> => {
  await execute('UPDATE news SET is_pinned = 0 WHERE id = ?', [id]);
  return getNewsById(id);
};

export default {
  getNews,
  searchNews,
  getNewsById,
  getNewsBySlug,
  createNews,
  updateNews,
  deleteNews,
  likeNews,
  getNewsComments,
  getMyNews,
  getNewsAuthorId,
  pinNews,
  unpinNews,
};
