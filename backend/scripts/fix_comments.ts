import Database from 'better-sqlite3';
const db = new Database('./data/gamehub.db');
try { db.prepare('ALTER TABLE comments ADD COLUMN reply_count INTEGER DEFAULT 0').run(); console.log('Added reply_count'); } catch(e: any) { console.log(e.message); }
try { db.prepare('ALTER TABLE comments ADD COLUMN is_edited INTEGER DEFAULT 0').run(); console.log('Added is_edited'); } catch(e: any) { console.log(e.message); }
db.close();
