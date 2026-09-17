import { query, execute } from '../db';
import logger from '../utils/logger';
import { NotFoundError } from '../middlewares/error.middleware';

const generateSlug = (name: string): string => name.toLowerCase().replace(/[^\w\s一-鿿-]/g,'').replace(/\s+/g,'-').replace(/--+/g,'-').trim()||`space-${Date.now()}`;

/** 将数据库行转换为 BlogSpace 对象 */
const mapSpace = (r: any) => ({
  id: String(r.id),
  name: r.name,
  slug: r.slug,
  coverImageUrl: r.cover_image_url,
  description: r.description,
  sortOrder: r.sort_order,
  isActive: !!r.is_active,
  gameId: r.game_id ? String(r.game_id) : undefined,
  gameTitle: r.game_title || undefined,
  gameSlug: r.game_slug || undefined,
  createdAt: r.created_at,
});

export const getSpaces = async (activeOnly = false) => {
  const where = activeOnly ? 'WHERE bs.is_active=1' : '';
  const rows = await query(
    `SELECT bs.*, g.title as game_title, g.slug as game_slug
     FROM blog_spaces bs
     LEFT JOIN games g ON bs.game_id = g.id
     ${where} ORDER BY bs.sort_order ASC, bs.id ASC`
  );
  return rows.map(mapSpace);
};

export const createSpace = async (data: any) => {
  const slug = data.slug || generateSlug(data.name);

  // 关联游戏（可选）：校验 games 表存在
  let gameId: number | null = null;
  if (data.gameId !== undefined && data.gameId !== null && data.gameId !== '') {
    const game = await query('SELECT id FROM games WHERE id = ?', [data.gameId]);
    if (game.length === 0) throw new NotFoundError(`游戏ID ${data.gameId} 不存在`);
    gameId = Number(data.gameId);
  }

  const r = await execute(
    'INSERT INTO blog_spaces (name,slug,cover_image_url,description,sort_order,game_id) VALUES (?,?,?,?,?,?)',
    [data.name, slug, data.coverImageUrl || null, data.description || null, data.sortOrder || 0, gameId]
  );
  const rows = await query(
    `SELECT bs.*, g.title as game_title, g.slug as game_slug
     FROM blog_spaces bs LEFT JOIN games g ON bs.game_id = g.id WHERE bs.id = ?`,
    [r.lastInsertRowid]
  );
  return rows[0] ? mapSpace(rows[0]) : null;
};

export const updateSpace = async (id: string, data: any) => {
  const sets: string[] = []; const vals: any[] = [];
  if (data.name !== undefined) { sets.push('name=?'); vals.push(data.name); }
  if (data.coverImageUrl !== undefined) { sets.push('cover_image_url=?'); vals.push(data.coverImageUrl); }
  if (data.description !== undefined) { sets.push('description=?'); vals.push(data.description); }
  if (data.sortOrder !== undefined) { sets.push('sort_order=?'); vals.push(data.sortOrder); }
  if (data.isActive !== undefined) { sets.push('is_active=?'); vals.push(data.isActive ? 1 : 0); }
  if (data.gameId !== undefined) {
    if (data.gameId === null || data.gameId === '') {
      sets.push('game_id=?'); vals.push(null);
    } else {
      const game = await query('SELECT id FROM games WHERE id = ?', [data.gameId]);
      if (game.length === 0) throw new NotFoundError(`游戏ID ${data.gameId} 不存在`);
      sets.push('game_id=?'); vals.push(Number(data.gameId));
    }
  }
  if (!sets.length) return null;
  vals.push(id);
  await execute(`UPDATE blog_spaces SET ${sets.join(',')} WHERE id=?`, vals);
  const rows = await query(
    `SELECT bs.*, g.title as game_title, g.slug as game_slug
     FROM blog_spaces bs LEFT JOIN games g ON bs.game_id = g.id WHERE bs.id = ?`,
    [id]
  );
  return rows[0] ? mapSpace(rows[0]) : null;
};

export const deleteSpace = async (id: string) => {
  await execute('DELETE FROM blog_spaces WHERE id=?', [id]);
};

export default { getSpaces, createSpace, updateSpace, deleteSpace };
