import Database from 'better-sqlite3';
const db = new Database('./data/gamehub.db');
db.prepare("UPDATE users SET is_active=1 WHERE username='super_wangminchao'").run();
const u = db.prepare("SELECT id, username, role, is_active FROM users WHERE username='super_wangminchao'").get();
console.log(JSON.stringify(u));
db.close();
