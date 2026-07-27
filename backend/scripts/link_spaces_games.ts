import Database from 'better-sqlite3';
const db = new Database('./data/gamehub.db');
try { db.prepare('ALTER TABLE blog_spaces ADD COLUMN game_id INTEGER REFERENCES games(id)').run(); console.log('Added game_id column'); } catch(e: any) { console.log(e.message); }
db.prepare("UPDATE blog_spaces SET game_id=(SELECT id FROM games WHERE games.title=blog_spaces.name LIMIT 1) WHERE game_id IS NULL").run();
const spaces = db.prepare('SELECT id, name, game_id FROM blog_spaces').all();
console.log(spaces);
db.close();
