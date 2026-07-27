import Database from 'better-sqlite3';
const db = new Database('./data/gamehub.db');
console.log('DB OK');
db.close();
