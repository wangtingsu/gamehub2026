/**
 * 博客文章服务
 * 独立于 news 表，操作 blog_articles 表
 */
import { query, execute } from '../db';
import logger from '../utils/logger';
import { NotFoundError, ValidationError, ConflictError } from '../middlewares/error.middleware';
import { markdownToHtml } from './markdown.service';

const generateSlug = (title: string): string => {
  let slug = title.toLowerCase().replace(/[^\w\s一-鿿-]/g, '').replace(/\s+/g, '-').replace(/--+/g, '-').trim();
  if (!slug) slug = `blog-${Date.now()}`;
  return slug;
};

/**
 * 博客多语言支持的翻译列后缀（不含中文——中文对应基础列 title/content/excerpt）。
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

/** 根据语言本地化博客字段（为空则回退基础列） */
const localizeArticle = (article: any, lang?: string): any => {
  const suffix = langToSuffix(lang);
  if (!suffix) return article;
  const tr = article.translations?.[suffix];
  if (!tr) return article;
  return {
    ...article,
    title: tr.title || article.title,
    content: tr.content || article.content,
    contentHtml: tr.contentHtml || article.contentHtml,
    excerpt: tr.excerpt || article.excerpt,
    faq: tr.faq?.length ? tr.faq : article.faq,
  };
};

/** 博客详情页头图宽高比配置键（后台「系统配置」可调整） */
const BLOG_COVER_RATIO_KEY = 'blog.cover_aspect_ratio';
const DEFAULT_BLOG_COVER_RATIO = '21/9';

/** 读取博客详情页头图宽高比（后台可配置，缺省回退 21/9） */
const getBlogCoverAspectRatio = async (): Promise<string> => {
  try {
    const rows = (await query(
      'SELECT config_value FROM system_configs WHERE config_key = ?',
      [BLOG_COVER_RATIO_KEY]
    )) as any[];
    return rows[0]?.config_value || DEFAULT_BLOG_COVER_RATIO;
  } catch {
    return DEFAULT_BLOG_COVER_RATIO;
  }
};

/** 从翻译对象生成数据库列名与参数（用于 INSERT） */
const translationColumns = (translations?: any): { cols: string[]; params: any[] } => {
  const cols: string[] = [];
  const params: any[] = [];
  for (const suffix of TRANSLATION_SUFFIXES) {
    const tr = translations?.[suffix];
    cols.push(`title_${suffix}`, `content_${suffix}`, `content_html_${suffix}`, `excerpt_${suffix}`, `faq_${suffix}`);
    params.push(tr?.title || null, tr?.content || null, markdownToHtml(tr?.content || ''), tr?.excerpt || null, tr?.faq ? JSON.stringify(tr.faq) : null);
  }
  return { cols, params };
};

export const getBlogs = async (params: { page?: number; limit?: number; spaceId?: string; category?: string; publishedOnly?: boolean; postType?: string; gameId?: string; lang?: string }) => {
  const { page = 1, limit = 20, spaceId, category, publishedOnly = true, postType, gameId, lang } = params;
  const offset = (page - 1) * limit;

  // Build conditions for blog_articles (no table alias in count query)
  let countWhere = 'WHERE 1=1';
  let mainWhere = 'WHERE 1=1';
  const countVals: any[] = [];
  const mainVals: any[] = [];

  const addCond = (cond: string, val?: any) => {
    countWhere += ' ' + cond; mainWhere += ' ' + cond;
    if (val !== undefined) { countVals.push(val); mainVals.push(val); }
  };

  if (publishedOnly) { addCond('AND is_published=true'); }
  if (category) { addCond('AND category=?', category); }
  if (postType && postType !== 'blog') { addCond('AND blog_article_type=?', postType); }
  else if (postType === 'blog') { addCond('AND (blog_article_type=? OR blog_article_type IS NULL)', 'blog'); }
  if (gameId) { addCond('AND game_id=?', gameId); }

  // When spaceId is given, also include reviews/guides for the associated game
  if (spaceId) {
    const spaceGame = (await query('SELECT game_id FROM blog_spaces WHERE id=?', [spaceId])) as any[];
    const sgid = spaceGame[0]?.game_id;
    if (sgid && !postType) {
      // Main query: space matches OR (same game + review/guide type)
      countWhere += ' AND (space_id=? OR (game_id=? AND blog_article_type IN (\'review\',\'guide\')))';
      mainWhere += ' AND (a.space_id=? OR (a.game_id=? AND a.blog_article_type IN (\'review\',\'guide\')))';
      countVals.push(spaceId, sgid);
      mainVals.push(spaceId, sgid);
    } else {
      addCond('AND space_id=?', spaceId);
    }
  }

  const [{ total }] = await query(`SELECT COUNT(*) as total FROM blog_articles ${countWhere}`, countVals) as any[];
  const articles = await query(
    `SELECT a.*, u.username as author_name, u.display_name as author_display_name, s.name as space_name, s.slug as space_slug
     FROM blog_articles a LEFT JOIN users u ON a.author_id=u.id LEFT JOIN blog_spaces s ON a.space_id=s.id
     ${mainWhere} ORDER BY a.is_pinned DESC, COALESCE(a.published_at, a.created_at) DESC LIMIT ? OFFSET ?`,
    [...mainVals, limit, offset]
  );

  return { articles: (articles || []).map(a => localizeArticle(mapArticle(a), lang)), total: Number(total), page, limit };
};

export const getBlogById = async (id: string, type?: string, lang?: string, opts: { incrementView?: boolean } = {}) => {
  // 三表已合并到 blog_articles，按主键 id 查询；type 仅作为可选的 blog_article_type 过滤
  const typeFilter = type && type !== 'blog' ? ' AND a.blog_article_type=?' : '';
  const params: any[] = type && type !== 'blog' ? [id, type] : [id];
  const rows = await query(
    `SELECT a.*, u.username as author_name, u.display_name as author_display_name, s.name as space_name, s.slug as space_slug
     FROM blog_articles a LEFT JOIN users u ON a.author_id=u.id LEFT JOIN blog_spaces s ON a.space_id=s.id WHERE a.id=?${typeFilter}`,
    params
  );
  if (!rows.length) throw new NotFoundError('文章不存在');
  const row = rows[0];

  // 增加浏览量（仅在用户访问详情时；内部调用如创建/更新传 incrementView:false 避免误增）
  let views = Number(row.views) || 0;
  if (opts.incrementView !== false) {
    await execute('UPDATE blog_articles SET views=views+1 WHERE id=?', [id]);
    views += 1;
  }

  return { ...localizeArticle(mapArticle({ ...row, views, blog_article_type: row.blog_article_type || 'blog' }), lang), coverAspectRatio: await getBlogCoverAspectRatio() };
};

export const getBlogBySlug = async (slug: string, lang?: string, opts: { incrementView?: boolean } = {}) => {
  const rows = await query(
    `SELECT a.*, u.username as author_name, u.display_name as author_display_name, s.name as space_name, s.slug as space_slug
     FROM blog_articles a LEFT JOIN users u ON a.author_id=u.id LEFT JOIN blog_spaces s ON a.space_id=s.id WHERE a.slug=?`, [slug]
  );
  if (!rows.length) throw new NotFoundError('文章不存在');
  const row = rows[0];
  let views = Number(row.views) || 0;
  if (opts.incrementView !== false) {
    await execute('UPDATE blog_articles SET views=views+1 WHERE id=?', [row.id]);
    views += 1;
  }
  return { ...localizeArticle(mapArticle({ ...row, views, blog_article_type: row.blog_article_type || 'blog' }), lang), coverAspectRatio: await getBlogCoverAspectRatio() };
};

export const createBlog = async (authorId: string, data: any) => {
  // 主标题（maintitle）作为 URL slug 后缀来源，必填且唯一
  const maintitle = (data.maintitle || '').trim();
  if (!maintitle) throw new ValidationError('主标题（maintitle）不能为空');
  // 基础标题允许为空（支持仅英文等单语言发布，与新闻一致），空值存空串
  const title = (data.title || '').trim();
  const existingMain = await query('SELECT id FROM blog_articles WHERE LOWER(maintitle) = LOWER(?)', [maintitle]);
  if (existingMain.length > 0) throw new ConflictError('主标题已存在，请更换');
  let slug = data.slug || generateSlug(maintitle);
  // 确保 slug 唯一，避免同名/同 slug 标题触发 blog_articles_slug_key 唯一约束冲突
  const existing = await query('SELECT id FROM blog_articles WHERE slug = ?', [slug]);
  if (existing.length > 0) {
    slug = `${slug}-${Date.now()}`;
  }
  const now = new Date().toISOString();
  const tr = translationColumns(data.translations);
  const cols = ['title','maintitle','slug','content','content_html','excerpt','cover_image_url','author_id','space_id','category','tags','faq','is_published','is_pinned','published_at','review_status','created_at','updated_at', ...tr.cols];
  const placeholders = cols.map(() => '?').join(',');
  const values = [title, maintitle, slug, data.content||'', markdownToHtml(data.content||''), data.excerpt||'', data.coverImageUrl||'', authorId, data.spaceId, data.category||'博客', JSON.stringify(data.tags||[]), JSON.stringify(data.faq||[]), 1, data.isPinned?1:0, now, 'pending', now, now, ...tr.params];
  const r = await execute(
    `INSERT INTO blog_articles (${cols.join(',')}) VALUES (${placeholders})`,
    values
  );
  return getBlogById(String(r.lastInsertRowid), undefined, undefined, { incrementView: false });
};

export const updateBlog = async (id: string, data: any) => {
  const sets: string[] = []; const vals: any[] = [];

  // 主标题（maintitle）：若提供则校验唯一性，并据此重新生成 slug
  if (data.maintitle !== undefined) {
    const maintitle = (data.maintitle || '').trim();
    if (!maintitle) throw new ValidationError('主标题（maintitle）不能为空');
    const existingMain = await query('SELECT id FROM blog_articles WHERE LOWER(maintitle) = LOWER(?) AND id != ?', [maintitle, id]);
    if (existingMain.length > 0) throw new ConflictError('主标题已存在，请更换');
    sets.push('maintitle=?'); vals.push(maintitle);
    const newSlug = generateSlug(maintitle);
    const existingSlug = await query('SELECT id FROM blog_articles WHERE slug = ? AND id != ?', [newSlug, id]);
    sets.push('slug=?'); vals.push(existingSlug.length > 0 ? `${newSlug}-${Date.now()}` : newSlug);
  }

  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    if (k === 'maintitle' || k === 'translations') continue; // 已在上面处理
    const col = k.replace(/[A-Z]/g, m => '_'+m.toLowerCase());
    if (['coverImageUrl','isPublished','isPinned','spaceId','reviewStatus'].includes(k)) {
      sets.push(`${col}=?`); vals.push(['isPublished','isPinned'].includes(k) ? (v?1:0) : v);
    } else if (['title','content','excerpt','category','tags','faq'].includes(k)) {
      sets.push(`${col}=?`); vals.push((k==='tags' || k==='faq') ? JSON.stringify(v) : v);
      if (k === 'content') { sets.push('content_html=?'); vals.push(markdownToHtml((v as string) || '')); }
    }
  }

  // 多语言翻译列
  if (data.translations !== undefined) {
    for (const suffix of TRANSLATION_SUFFIXES) {
      const tr = data.translations?.[suffix];
      if (tr && (tr.title !== undefined || tr.content !== undefined || tr.excerpt !== undefined || tr.faq !== undefined)) {
        sets.push(`title_${suffix}=?`, `content_${suffix}=?`, `content_html_${suffix}=?`, `excerpt_${suffix}=?`, `faq_${suffix}=?`);
        vals.push(tr.title ?? null, tr.content ?? null, tr.content ? markdownToHtml(tr.content) : null, tr.excerpt ?? null, tr.faq ? JSON.stringify(tr.faq) : null);
      }
    }
  }

  if (!sets.length) return getBlogById(id, undefined, undefined, { incrementView: false });
  vals.push(new Date().toISOString()); sets.push('updated_at=?');
  vals.push(id);
  await execute(`UPDATE blog_articles SET ${sets.join(',')} WHERE id=?`, vals);
  return getBlogById(id, undefined, undefined, { incrementView: false });
};

export const deleteBlog = async (id: string) => {
  const rows = await query('SELECT content FROM blog_articles WHERE id=?', [id]) as any[];
  if (rows.length > 0 && rows[0].content) {
    const { cleanupContentImages } = require('./image-cleanup.service');
    cleanupContentImages(rows[0].content);
  }
  const r = await execute('DELETE FROM blog_articles WHERE id=?', [id]);
  if (!r.changes) throw new NotFoundError('博客不存在');
};

const mapArticle = (row: any) => {
  // 读取多语言翻译列（不含中文，中文对应基础列）
  const translations: any = {};
  for (const suffix of TRANSLATION_SUFFIXES) {
    const title = row[`title_${suffix}`];
    const content = row[`content_${suffix}`];
    const contentHtml = row[`content_html_${suffix}`];
    const excerpt = row[`excerpt_${suffix}`];
    const faq = row[`faq_${suffix}`];
    if (title || content || contentHtml || excerpt || faq) {
      translations[suffix] = {
        ...(title ? { title } : {}),
        ...(content ? { content } : {}),
        ...(contentHtml ? { contentHtml } : {}),
        ...(excerpt ? { excerpt } : {}),
        ...(faq ? { faq: typeof faq === 'string' ? JSON.parse(faq) : faq } : {}),
      };
    }
  }

  return {
    id: String(row.id), title: row.title, slug: row.slug, maintitle: row.maintitle || undefined,
    content: row.content, contentHtml: row.content_html, excerpt: row.excerpt||'',
    coverImageUrl: row.cover_image_url, authorId: String(row.author_id),
    authorName: row.author_name, authorDisplayName: row.author_display_name,
    spaceId: String(row.space_id), spaceName: row.space_name, spaceSlug: row.space_slug,
    category: row.category, tags: typeof row.tags==='string'?JSON.parse(row.tags):row.tags||[],
    faq: typeof row.faq==='string'?JSON.parse(row.faq):row.faq||[],
    isPublished: !!row.is_published, isPinned: !!row.is_pinned,
    publishedAt: row.published_at, views: row.views||0, likes: row.likes||0, comments: row.comments||0,
    reviewStatus: row.review_status, createdAt: row.created_at, updatedAt: row.updated_at,
    blogArticleType: row.blog_article_type || 'blog', rating: row.rating || null, gameId: row.game_id ? String(row.game_id) : null,
    pros: row.pros || null, cons: row.cons || null,
    translations,
  };
};

// ====== 博客空间内容（三表已合并到 blog_articles） ======
export const getSpaceContent = async (params: { spaceId: string; postType?: string; page?: number; limit?: number; search?: string }) => {
  const { spaceId, postType, page = 1, limit = 20, search } = params;
  const offset = (page - 1) * limit;

  const searchFilter = search ? 'AND (title LIKE ? OR content LIKE ?)' : '';
  const searchVals = search ? [`%${search}%`, `%${search}%`] : [];
  const typeFilter = postType && postType !== 'all' ? 'AND blog_article_type=?' : '';
  const typeVals = postType && postType !== 'all' ? [postType] : [];

  const where = `WHERE space_id=? ${typeFilter} ${searchFilter}`;
  const vals: any[] = [spaceId, ...typeVals, ...searchVals];

  // Count
  const [{ total }] = await query(`SELECT COUNT(*) as total FROM blog_articles ${where}`, vals) as any[];

  // Paginated query with author join（difficulty 字符串映射为数值，与旧 UNION 行为一致）
  const dataSQL = `SELECT a.id, a.title, a.content, a.excerpt, a.cover_image_url, a.author_id, a.space_id, a.blog_article_type, a.rating, a.likes, a.comments, a.created_at, a.published_at as publish_date, a.views,
       CASE WHEN a.difficulty='hard' THEN 3 WHEN a.difficulty='medium' THEN 2 ELSE 1 END as difficulty_val,
       u.username as author_name, u.display_name as author_display_name
     FROM blog_articles a LEFT JOIN users u ON a.author_id=u.id ${where} ORDER BY a.created_at DESC LIMIT ? OFFSET ?`;
  const articles = await query(dataSQL, [...vals, limit, offset]);

  return {
    articles: (articles || []).map((row: any) => ({
      id: String(row.id), title: row.title, content: row.content,
      excerpt: row.excerpt || '', coverImageUrl: row.cover_image_url || '',
      authorId: String(row.author_id), authorName: row.author_name, authorDisplayName: row.author_display_name,
      spaceId: String(row.space_id), blogArticleType: row.blog_article_type,
      rating: row.rating || null, likes: row.likes || 0, comments: row.comments || 0,
      publishDate: row.publish_date, createdAt: row.created_at, views: row.views || 0,
      difficulty: row.difficulty_val || 0,
    })),
    total: Number(total), page, limit,
  };
};

// ====== 热门文章（综合热度 = views + likes*2 + comments*3）======
export const getPopularArticle = async (spaceId: string) => {
  const rows = await query(
    `SELECT a.*, u.username as author_name, u.display_name as author_display_name
     FROM blog_articles a LEFT JOIN users u ON a.author_id=u.id
     WHERE a.space_id=$1 AND a.is_published=true
     ORDER BY (a.views + a.likes*2 + a.comments*3) DESC LIMIT 1`, [spaceId]
  );
  return rows.length ? mapArticle(rows[0]) : null;
};

// ====== 按 blog_article_type 分类查询 ======
export const getArticlesByPostType = async (spaceId: string, postType: string, page = 1, limit = 12) => {
  const offset = (page - 1) * limit;
  const [{ total }] = await query(
    `SELECT COUNT(*) as total FROM blog_articles WHERE space_id=$1 AND blog_article_type=$2 AND is_published=true`, [spaceId, postType]
  ) as any[];
  const articles = await query(
    `SELECT a.*, u.username as author_name, u.display_name as author_display_name
     FROM blog_articles a LEFT JOIN users u ON a.author_id=u.id
     WHERE a.space_id=$1 AND a.blog_article_type=$2 AND a.is_published=true
     ORDER BY a.likes DESC, a.views DESC LIMIT $3 OFFSET $4`,
    [spaceId, postType, limit, offset]
  );
  return { articles: (articles || []).map(mapArticle), total: Number(total), page, limit };
};

// ====== 空间详情（含各类型文章数量） ======
export const getSpaceDetail = async (slug: string) => {
  const spaces = await query('SELECT * FROM blog_spaces WHERE slug=$1', [slug]) as any[];
  if (!spaces.length) return null;
  const space = spaces[0];
  const counts = await query(
    `SELECT blog_article_type, COUNT(*) as cnt FROM blog_articles WHERE space_id=$1 AND is_published=true GROUP BY blog_article_type`,
    [space.id]
  ) as any[];
  const typeCounts: Record<string, number> = {};
  counts.forEach((r: any) => { typeCounts[r.blog_article_type] = r.cnt; });
  const [{ total }] = await query('SELECT COUNT(*) as total FROM blog_articles WHERE space_id=$1 AND is_published=true', [space.id]) as any[];
  return {
    id: String(space.id), name: space.name, slug: space.slug, coverImageUrl: space.cover_image_url,
    description: space.description, sortOrder: space.sort_order, isActive: !!space.is_active,
    totalArticles: Number(total), typeCounts,
  };
};

export default { getBlogs, getBlogById, getBlogBySlug, createBlog, updateBlog, deleteBlog, getSpaceContent, getPopularArticle, getArticlesByPostType, getSpaceDetail };
