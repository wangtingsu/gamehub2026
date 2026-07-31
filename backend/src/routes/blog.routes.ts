import { Router, Request, Response } from 'express';
import { authenticate, optionalAuthenticate, authorize } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import { execute, query } from '../db';
import blogService from '../services/blog.service';

const router = Router();

// 博客空间内容联合查询（blog_articles + reviews + guides）
router.get('/space/:spaceId/content', optionalAuthenticate, asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, postType, search } = req.query;
  const result = await blogService.getSpaceContent({
    spaceId: req.params.spaceId,
    page: Number(page) || 1, limit: Number(limit) || 20,
    postType: postType as string, search: search as string,
  });
  res.json({ success: true, data: result, message: '空间内容获取成功' });
}));

router.get('/', optionalAuthenticate, asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, spaceId, category, postType } = req.query;
  const result = await blogService.getBlogs({
    page: Number(page) || 1, limit: Number(limit) || 20,
    spaceId: spaceId as string, category: category as string, postType: postType as string,
  });
  res.json({ success: true, data: result, message: '博客列表获取成功' });
}));

router.get('/:id', optionalAuthenticate, asyncHandler(async (req: Request, res: Response) => {
  const blog = await blogService.getBlogById(req.params.id, req.query.type as string);
  res.json({ success: true, data: blog, message: '博客详情获取成功' });
}));

router.post('/', authenticate, authorize('admin'), asyncHandler(async (req: Request, res: Response) => {
  const blog = await blogService.createBlog(req.user!.id, req.body);
  res.status(201).json({ success: true, data: blog, message: '博客创建成功' });
}));

router.put('/:id', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const blog = await blogService.updateBlog(req.params.id, req.body);
  res.json({ success: true, data: blog, message: '博客更新成功' });
}));

router.post('/:id/like', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id; const articleId = req.params.id;
  const existing = await query('SELECT id FROM blog_likes WHERE user_id=? AND article_id=?', [userId, articleId]);
  if (existing.length) {
    await execute('DELETE FROM blog_likes WHERE user_id=? AND article_id=?', [userId, articleId]);
    await execute('UPDATE blog_articles SET likes = MAX(0, likes - 1) WHERE id=?', [articleId]);
    res.json({ success: true, data: { liked: false }, message: '取消点赞' });
  } else {
    await execute('INSERT INTO blog_likes (user_id,article_id) VALUES (?,?)', [userId, articleId]);
    await execute('UPDATE blog_articles SET likes = likes + 1 WHERE id=?', [articleId]);
    res.json({ success: true, data: { liked: true }, message: '点赞成功' });
  }
}));

router.post('/:id/favorite', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id; const articleId = req.params.id;
  const existing = await query('SELECT id FROM blog_favorites WHERE user_id=? AND article_id=?', [userId, articleId]);
  if (existing.length) {
    await execute('DELETE FROM blog_favorites WHERE user_id=? AND article_id=?', [userId, articleId]);
    res.json({ success: true, data: { favorited: false }, message: '取消收藏' });
  } else {
    await execute('INSERT INTO blog_favorites (user_id,article_id) VALUES (?,?)', [userId, articleId]);
    res.json({ success: true, data: { favorited: true }, message: '收藏成功' });
  }
}));

router.get('/:id/status', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id; const articleId = req.params.id;
  const liked = await query('SELECT 1 FROM blog_likes WHERE user_id=? AND article_id=?', [userId, articleId]);
  const favorited = await query('SELECT 1 FROM blog_favorites WHERE user_id=? AND article_id=?', [userId, articleId]);
  const likeCount = await query('SELECT likes FROM blog_articles WHERE id=?', [articleId]);
  const favCount = await query('SELECT COUNT(*) as c FROM blog_favorites WHERE article_id=?', [articleId]);
  res.json({ success: true, data: {
    liked: liked.length > 0, favorited: favorited.length > 0,
    likes: likeCount[0]?.likes || 0, favorites: favCount[0]?.c || 0,
  }});
}));

router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req: Request, res: Response) => {
  await blogService.deleteBlog(req.params.id);
  res.json({ success: true, message: '博客删除成功' });
}));

router.get('/space/detail/:slug', optionalAuthenticate, asyncHandler(async (req: Request, res: Response) => {
  const detail = await blogService.getSpaceDetail(req.params.slug);
  if (!detail) return res.status(404).json({ success: false, error: '空间不存在' });
  res.json({ success: true, data: detail });
}));

router.get('/space/:spaceId/popular', optionalAuthenticate, asyncHandler(async (req: Request, res: Response) => {
  const article = await blogService.getPopularArticle(req.params.spaceId);
  res.json({ success: true, data: article });
}));

router.get('/space/:spaceId/category/:postType', optionalAuthenticate, asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query;
  const result = await blogService.getArticlesByPostType(
    req.params.spaceId, req.params.postType,
    Number(page) || 1, Number(limit) || 12
  );
  res.json({ success: true, data: result });
}));

export default router;
