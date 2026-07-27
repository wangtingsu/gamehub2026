const Database = require('better-sqlite3');
const db = new Database('./data/gamehub.db');

// 检查是否已存在
const exists = db.prepare('SELECT migration_name FROM schema_migrations WHERE migration_name = ?').get('006_add_language_support.sql');
if (!exists) {
    console.log('插入006迁移记录');
    db.prepare('INSERT INTO schema_migrations (migration_name) VALUES (?)').run('006_add_language_support.sql');
} else {
    console.log('006迁移记录已存在');
}

// 检查索引是否存在
const indexCheck = db.prepare(`SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'`).all();
console.log('现有索引:', indexCheck.map(idx => idx.name));

db.close();