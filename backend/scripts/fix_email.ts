import Database from 'better-sqlite3';
const db = new Database('./data/gamehub.db');
db.prepare("UPDATE users SET email='super_wangminchao@gamehub.com' WHERE username='super_wangminchao'").run();
const u = db.prepare("SELECT username,email,role FROM users WHERE username='super_wangminchao'").get();
console.log(JSON.stringify(u));
db.close();
