import { Router, Request, Response } from 'express';
import { adminAuthenticate } from '../middlewares/admin-auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import { query, execute } from '../db';

const router = Router();
router.use(adminAuthenticate);

// ====== Banner 管理 ======
router.get('/banners', asyncHandler(async (_req: Request, res: Response) => {
  const rows = await query('SELECT * FROM banners ORDER BY sort_order ASC');
  res.json({ success: true, data: rows });
}));

router.post('/banners', asyncHandler(async (req: Request, res: Response) => {
  const { title, subtitle, imageUrl, linkUrl, sortOrder, position } = req.body;
  const r = await execute(
    'INSERT INTO banners (title, subtitle, image_url, link_url, sort_order, position) VALUES (?,?,?,?,?,?)',
    [title, subtitle || '', imageUrl, linkUrl || '', sortOrder || 0, position || 'home']
  );
  res.json({ success: true, data: { id: String(r.lastInsertRowid) } });
}));

router.put('/banners/:id', asyncHandler(async (req: Request, res: Response) => {
  const { title, subtitle, imageUrl, linkUrl, sortOrder, isActive, position } = req.body;
  await execute(
    'UPDATE banners SET title=?, subtitle=?, image_url=?, link_url=?, sort_order=?, is_active=?, position=?, updated_at=? WHERE id=?',
    [title, subtitle || '', imageUrl, linkUrl || '', sortOrder || 0, isActive ? 1 : 0, position || 'home', new Date().toISOString(), req.params.id]
  );
  res.json({ success: true });
}));

router.delete('/banners/:id', asyncHandler(async (req: Request, res: Response) => {
  await execute('DELETE FROM banners WHERE id=?', [req.params.id]);
  res.json({ success: true });
}));

// ====== 推荐内容管理 ======
router.get('/featured', asyncHandler(async (req: Request, res: Response) => {
  const { type } = req.query;
  let sql = 'SELECT * FROM featured_content';
  const params: any[] = [];
  if (type) { sql += ' WHERE feature_type=?'; params.push(type); }
  sql += ' ORDER BY sort_order ASC, created_at DESC';
  const rows = await query(sql, params);
  res.json({ success: true, data: rows });
}));

router.post('/featured', asyncHandler(async (req: Request, res: Response) => {
  const { contentType, contentId, featureType, topicName, sortOrder, expiresAt } = req.body;
  const r = await execute(
    'INSERT OR REPLACE INTO featured_content (content_type, content_id, feature_type, topic_name, sort_order, expires_at, created_by) VALUES (?,?,?,?,?,?,?)',
    [contentType, contentId, featureType, topicName || null, sortOrder || 0, expiresAt || null, (req as any).admin?.id || 1]
  );
  res.json({ success: true, data: { id: String(r.lastInsertRowid) } });
}));

router.put('/featured/:id', asyncHandler(async (req: Request, res: Response) => {
  const { contentType, contentId, featureType, topicName, sortOrder, expiresAt } = req.body;
  await execute(
    'UPDATE featured_content SET content_type=?, content_id=?, feature_type=?, topic_name=?, sort_order=?, expires_at=?, updated_at=? WHERE id=?',
    [contentType, contentId, featureType, topicName || null, sortOrder || 0, expiresAt || null, new Date().toISOString(), req.params.id]
  );
  res.json({ success: true });
}));

router.delete('/featured/:id', asyncHandler(async (req: Request, res: Response) => {
  await execute('DELETE FROM featured_content WHERE id=?', [req.params.id]);
  res.json({ success: true });
}));

export default router;
