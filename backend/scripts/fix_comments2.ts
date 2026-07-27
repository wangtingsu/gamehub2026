import Database from 'better-sqlite3';
const db = new Database('./data/gamehub.db');
for (const [col, type] of [['is_frozen','INTEGER DEFAULT 0'],['frozen_until','TEXT'],['version','INTEGER DEFAULT 1']] as const) {
  try { db.prepare(`ALTER TABLE comments ADD COLUMN ${col} ${type}`).run(); console.log('Added',col); } catch(e: any) { console.log(col, e.message); }
}
db.close();
