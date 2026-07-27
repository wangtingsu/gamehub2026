const Database = require('better-sqlite3');
const db = new Database('./data/gamehub.db');

// 检查schema_migrations表是否存在
const tableExists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'`).get();
if (!tableExists) {
    console.log('schema_migrations表不存在');
} else {
    const rows = db.prepare('SELECT * FROM schema_migrations').all();
    console.log('已应用的迁移:', rows);
}

// 插入005迁移记录（如果不存在）
const check = db.prepare('SELECT migration_name FROM schema_migrations WHERE migration_name = ?').get('005_add_fulltext_search.sql');
if (!check) {
    console.log('插入005迁移记录');
    db.prepare('INSERT INTO schema_migrations (migration_name) VALUES (?)').run('005_add_fulltext_search.sql');
} else {
    console.log('005迁移记录已存在');
}

// 检查games表是否有search_vector列
const columns = db.prepare(`PRAGMA table_info(games)`).all();
const hasSearchVector = columns.some(col => col.name === 'search_vector');
console.log('games表是否有search_vector列:', hasSearchVector);

db.close();