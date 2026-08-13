/**
 * 博客文章服务
 * 独立于 news 表，操作 blog_articles 表
 */
import { query, execute } from '../db';
import logger from '../utils/logger';
import { NotFoundError } from '../middlewares/error.middleware';

const generateSlug = (title: string): string => {
  let slug = title.toLowerCase().replace(/[^\w\s一-鿿-]/g, '').replace(/\s+/g, '-').replace(/--+/g, '-').trim();
  if (!slug) slug = `blog-${Date.now()}`;
  return slug;
};

export const getBlogs = async (params: { page?: number; limit?: number; spaceId?: string; category?: string; publishedOnly?: boolean; postType?: string; gameId?: string }) => {
  const { page = 1, limit = 20, spaceId, category, publishedOnly = true, postType, gameId } = params;
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
  if (postType && postType !== 'blog') { addCond('AND post_type=?', postType); }
  else if (postType === 'blog') { addCond('AND (post_type=? OR post_type IS NULL)', 'blog'); }
  if (gameId) { addCond('AND game_id=?', gameId); }

  // When spaceId is given, also include reviews/guides for the associated game
  if (spaceId) {
    const spaceGame = (await query('SELECT game_id FROM blog_spaces WHERE id=?', [spaceId])) as any[];
    const sgid = spaceGame[0]?.game_id;
    if (sgid && !postType) {
      // Main query: space matches OR (same game + review/guide type)
      countWhere += ' AND (space_id=? OR (game_id=? AND post_type IN (\'review\',\'guide\')))';
      mainWhere += ' AND (a.space_id=? OR (a.game_id=? AND a.post_type IN (\'review\',\'guide\')))';
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
     ${mainWhere} ORDER BY a.is_pinned DESC, a.created_at DESC LIMIT ? OFFSET ?`,
    [...mainVals, limit, offset]
  );

  return { articles: (articles || []).map(mapArticle), total: Number(total), page, limit };
};

export const getBlogById = async (id: string, type?: string) => {
  let row: any = null;
  let table = '';

  // 根据类型或依次尝试三张表
  if (!type || type === 'blog') {
    const rows = await query(
      `SELECT a.*, u.username as author_name, u.display_name as author_display_name, s.name as space_name, s.slug as space_slug
       FROM blog_articles a LEFT JOIN users u ON a.author_id=u.id LEFT JOIN blog_spaces s ON a.space_id=s.id WHERE a.id=?`, [id]
    );
    if (rows.length) { row = rows[0]; table = 'blog_articles'; }
  }
  if (!row && (!type || type === 'review')) {
    const rows = await query(
      `SELECT r.*, u.username as author_name, u.display_name as author_display_name, s.name as space_name, s.slug as space_slug
       FROM reviews r LEFT JOIN users u ON r.author_id=u.id LEFT JOIN blog_spaces s ON r.space_id=s.id WHERE r.id=?`, [id]
    );
    if (rows.length) { row = rows[0]; table = 'reviews'; }
  }
  if (!row && (!type || type === 'guide')) {
    const rows = await query(
      `SELECT g.*, u.username as author_name, u.display_name as author_display_name, s.name as space_name, s.slug as space_slug
       FROM guides g LEFT JOIN users u ON g.author_id=u.id LEFT JOIN blog_spaces s ON g.space_id=s.id WHERE g.id=?`, [id]
    );
    if (rows.length) { row = rows[0]; table = 'guides'; }
  }

  if (!row) throw new NotFoundError('文章不存在');

  // 增加浏览量
  if (table === 'blog_articles') await execute('UPDATE blog_articles SET views=views+1 WHERE id=?', [id]);
  else if (table === 'reviews') await execute('UPDATE reviews SET likes=likes WHERE id=?', [id]); // reviews no views column
  else if (table === 'guides') await execute('UPDATE guides SET likes=likes WHERE id=?', [id]);

  return mapArticle({ ...row, post_type: row.post_type || (table === 'reviews' ? 'review' : table === 'guides' ? 'guide' : 'blog') });
};

export const createBlog = async (authorId: string, data: any) => {
  let slug = data.slug || generateSlug(data.title);
  // 确保 slug 唯一，避免同名/同 slug 标题触发 blog_articles_slug_key 唯一约束冲突
  const existing = await query('SELECT id FROM blog_articles WHERE slug = ?', [slug]);
  if (existing.length > 0) {
    slug = `${slug}-${Date.now()}`;
  }
  const now = new Date().toISOString();
  const r = await execute(
    `INSERT INTO blog_articles (title,slug,content,excerpt,cover_image_url,author_id,space_id,category,tags,is_published,is_pinned,published_at,review_status,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [data.title, slug, data.content, data.excerpt||'', data.coverImageUrl||'', authorId, data.spaceId, data.category||'博客', JSON.stringify(data.tags||[]), 1, data.isPinned?1:0, now, 'pending', now, now]
  );
  return getBlogById(String(r.lastInsertRowid));
};

export const updateBlog = async (id: string, data: any) => {
  const sets: string[] = []; const vals: any[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    const col = k.replace(/[A-Z]/g, m => '_'+m.toLowerCase());
    if (['coverImageUrl','isPublished','isPinned','spaceId','reviewStatus'].includes(k)) {
      sets.push(`${col}=?`); vals.push(['isPublished','isPinned'].includes(k) ? (v?1:0) : v);
    } else if (['title','content','excerpt','category','tags'].includes(k)) {
      sets.push(`${col}=?`); vals.push(k==='tags' ? JSON.stringify(v) : v);
    }
  }
  if (!sets.length) return getBlogById(id);
  vals.push(new Date().toISOString()); sets.push('updated_at=?');
  vals.push(id);
  await execute(`UPDATE blog_articles SET ${sets.join(',')} WHERE id=?`, vals);
  return getBlogById(id);
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

const mapArticle = (row: any) => ({
  id: String(row.id), title: row.title, slug: row.slug, content: row.content, excerpt: row.excerpt||'',
  coverImageUrl: row.cover_image_url, authorId: String(row.author_id),
  authorName: row.author_name, authorDisplayName: row.author_display_name,
  spaceId: String(row.space_id), spaceName: row.space_name, spaceSlug: row.space_slug,
  category: row.category, tags: typeof row.tags==='string'?JSON.parse(row.tags):row.tags||[],
  isPublished: !!row.is_published, isPinned: !!row.is_pinned,
  publishedAt: row.published_at, views: row.views||0, likes: row.likes||0, comments: row.comments||0,
  reviewStatus: row.review_status, createdAt: row.created_at, updatedAt: row.updated_at,
  postType: row.post_type || 'blog', rating: row.rating || null, gameId: row.game_id ? String(row.game_id) : null,
  pros: row.pros || null, cons: row.cons || null,
});

// ====== 联合查询三表（博客空间内容） ======
export const getSpaceContent = async (params: { spaceId: string; postType?: string; page?: number; limit?: number; search?: string }) => {
  const { spaceId, postType, page = 1, limit = 20, search } = params;
  const offset = (page - 1) * limit;

  let searchFilter = '';
  const vals: any[] = [];
  if (search) { searchFilter = 'AND (title LIKE ? OR content LIKE ?)'; vals.push(`%${search}%`, `%${search}%`); }

  let unionSQL = '';
  const typeFilter = !postType || postType === 'all';

  // blog_articles
  if (typeFilter || postType === 'blog') {
    unionSQL += `SELECT id, title, content, '' as excerpt, '' as cover_image_url, author_id, space_id, 'blog' as post_type, NULL as rating, likes, 0 as comments, created_at, published_at as publish_date, 0 as views, 0 as difficulty_val FROM blog_articles WHERE space_id=? ${searchFilter}`;
    vals.push(spaceId, ...vals.slice(-(search ? 2 : 0)));
  }
  // reviews
  if (typeFilter || postType === 'review') {
    if (unionSQL) unionSQL += ' UNION ALL ';
    unionSQL += `SELECT id, title, content, '' as excerpt, '' as cover_image_url, author_id, space_id, 'review' as post_type, rating, likes, 0 as comments, created_at, published_at as publish_date, 0 as views, 0 as difficulty_val FROM reviews WHERE space_id=? ${searchFilter}`;
    vals.push(spaceId, ...(search ? [`%${search}%`, `%${search}%`] : []));
  }
  // guides
  if (typeFilter || postType === 'guide') {
    if (unionSQL) unionSQL += ' UNION ALL ';
    unionSQL += `SELECT id, title, content, '' as excerpt, cover_image_url, author_id, space_id, 'guide' as post_type, NULL as rating, likes, 0 as comments, created_at, created_at as publish_date, 0 as views, CASE WHEN difficulty='hard' THEN 3 WHEN difficulty='medium' THEN 2 ELSE 1 END as difficulty_val FROM guides WHERE space_id=? ${searchFilter}`;
    vals.push(spaceId, ...(search ? [`%${search}%`, `%${search}%`] : []));
  }

  // Count
  const countSQL = `SELECT COUNT(*) as total FROM (${unionSQL}) combined`;
  const [{ total }] = await query(countSQL, vals) as any[];

  // Paginated query with author join
  const dataSQL = `SELECT combined.*, u.username as author_name, u.display_name as author_display_name FROM (${unionSQL}) combined LEFT JOIN users u ON combined.author_id=u.id ORDER BY combined.created_at DESC LIMIT ? OFFSET ?`;
  const articles = await query(dataSQL, [...vals, limit, offset]);

  return {
    articles: (articles || []).map((row: any) => ({
      id: String(row.id), title: row.title, content: row.content,
      excerpt: row.excerpt || '', coverImageUrl: row.cover_image_url || '',
      authorId: String(row.author_id), authorName: row.author_name, authorDisplayName: row.author_display_name,
      spaceId: String(row.space_id), postType: row.post_type,
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

// ====== 按 post_type 分类查询 ======
export const getArticlesByPostType = async (spaceId: string, postType: string, page = 1, limit = 12) => {
  const offset = (page - 1) * limit;
  const [{ total }] = await query(
    `SELECT COUNT(*) as total FROM blog_articles WHERE space_id=$1 AND post_type=$2 AND is_published=true`, [spaceId, postType]
  ) as any[];
  const articles = await query(
    `SELECT a.*, u.username as author_name, u.display_name as author_display_name
     FROM blog_articles a LEFT JOIN users u ON a.author_id=u.id
     WHERE a.space_id=$1 AND a.post_type=$2 AND a.is_published=true
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
    `SELECT post_type, COUNT(*) as cnt FROM blog_articles WHERE space_id=$1 AND is_published=true GROUP BY post_type`,
    [space.id]
  ) as any[];
  const typeCounts: Record<string, number> = {};
  counts.forEach((r: any) => { typeCounts[r.post_type] = r.cnt; });
  const [{ total }] = await query('SELECT COUNT(*) as total FROM blog_articles WHERE space_id=$1 AND is_published=true', [space.id]) as any[];
  return {
    id: String(space.id), name: space.name, slug: space.slug, coverImageUrl: space.cover_image_url,
    description: space.description, sortOrder: space.sort_order, isActive: !!space.is_active,
    totalArticles: Number(total), typeCounts,
  };
};

export default { getBlogs, getBlogById, createBlog, updateBlog, deleteBlog, getSpaceContent, getPopularArticle, getArticlesByPostType, getSpaceDetail };
