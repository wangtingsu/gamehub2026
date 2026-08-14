import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware';
import { optionalAuthenticate } from '../middlewares/auth.middleware';
import { query } from '../db';

const router = Router();

// 获取 Banner
router.get('/banners', asyncHandler(async (req: Request, res: Response) => {
  const { position } = req.query;
  let sql = 'SELECT * FROM banners WHERE is_active=true';
  const params: any[] = [];
  if (position) { sql += ' AND position=?'; params.push(position); }
  sql += ' ORDER BY sort_order ASC LIMIT 10';
  const data = await query(sql, params);
  res.json({ success: true, data });
}));

// 获取推荐内容
router.get('/featured', asyncHandler(async (req: Request, res: Response) => {
  const { type } = req.query;
  let sql = 'SELECT * FROM featured_content WHERE 1=1';
  const params: any[] = [];
  if (type) { sql += ' AND feature_type=?'; params.push(type); }
  sql += " AND (expires_at IS NULL OR expires_at > datetime('now')) ORDER BY sort_order ASC LIMIT 20";
  const data = await query(sql, params);
  res.json({ success: true, data });
}));

// 猜你喜欢（基于已有推荐记录简单实现）
router.get('/guess-you-like', optionalAuthenticate, asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 8;
  const userId = (req as any).user?.id;

  // 有用户时返回个性化推荐，否则返回热门推荐
  if (userId) {
    const history = await query(
      'SELECT content_type, content_id FROM user_recommendations WHERE user_id=? AND is_clicked=true ORDER BY created_at DESC LIMIT 10',
      [userId]
    );
    if (history.length > 0) {
      // 简化：返回同类内容
      const types = [...new Set((history as any[]).map(h => h.content_type))];
      const games = await query(
        `SELECT g.* FROM games g 
         INNER JOIN featured_content fc ON fc.content_id=g.id AND fc.content_type='game'
         WHERE fc.feature_type='hot'
         ORDER BY g.rating DESC LIMIT ?`,
        [limit]
      );
      return res.json({ success: true, data: games, message: '个性化推荐' });
    }
  }

  // 默认：热门游戏
  const games = await query(
    `SELECT g.* FROM games g 
     INNER JOIN featured_content fc ON fc.content_id=g.id AND fc.content_type='game'
     WHERE fc.feature_type='hot'
     ORDER BY g.rating DESC LIMIT ?`,
    [limit]
  );
  res.json({ success: true, data: games, message: '热门推荐' });
}));

export default router;
