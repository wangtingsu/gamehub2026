import { query, execute } from '../db';
import logger from '../utils/logger';

const generateSlug = (name: string): string => name.toLowerCase().replace(/[^\w\s一-鿿-]/g,'').replace(/\s+/g,'-').replace(/--+/g,'-').trim()||`space-${Date.now()}`;

export const getSpaces = async (activeOnly = false) => {
  const where = activeOnly ? 'WHERE is_active=1' : '';
  const rows = await query(`SELECT * FROM blog_spaces ${where} ORDER BY sort_order ASC, id ASC`);
  return rows.map(r => ({ id: String(r.id), name: r.name, slug: r.slug, coverImageUrl: r.cover_image_url, description: r.description, sortOrder: r.sort_order, isActive: !!r.is_active, createdAt: r.created_at }));
};

export const createSpace = async (data: any) => {
  const slug = data.slug || generateSlug(data.name);
  const r = await execute(
    'INSERT INTO blog_spaces (name,slug,cover_image_url,description,sort_order) VALUES (?,?,?,?,?)',
    [data.name, slug, data.coverImageUrl||null, data.description||null, data.sortOrder||0]
  );
  const rows = await query('SELECT * FROM blog_spaces WHERE id=?', [r.lastInsertRowid]);
  return rows[0] ? { id: String(rows[0].id), name: rows[0].name, slug: rows[0].slug, coverImageUrl: rows[0].cover_image_url, description: rows[0].description, sortOrder: rows[0].sort_order, isActive: !!rows[0].is_active } : null;
};

export const updateSpace = async (id: string, data: any) => {
  const sets: string[] = []; const vals: any[] = [];
  if (data.name !== undefined) { sets.push('name=?'); vals.push(data.name); }
  if (data.coverImageUrl !== undefined) { sets.push('cover_image_url=?'); vals.push(data.coverImageUrl); }
  if (data.description !== undefined) { sets.push('description=?'); vals.push(data.description); }
  if (data.sortOrder !== undefined) { sets.push('sort_order=?'); vals.push(data.sortOrder); }
  if (data.isActive !== undefined) { sets.push('is_active=?'); vals.push(data.isActive?1:0); }
  if (!sets.length) return null;
  vals.push(id);
  await execute(`UPDATE blog_spaces SET ${sets.join(',')} WHERE id=?`, vals);
  const rows = await query('SELECT * FROM blog_spaces WHERE id=?', [id]);
  return rows[0] ? { id: String(rows[0].id), name: rows[0].name, slug: rows[0].slug, coverImageUrl: rows[0].cover_image_url, description: rows[0].description, sortOrder: rows[0].sort_order, isActive: !!rows[0].is_active } : null;
};

export const deleteSpace = async (id: string) => {
  await execute('DELETE FROM blog_spaces WHERE id=?', [id]);
};

export default { getSpaces, createSpace, updateSpace, deleteSpace };
