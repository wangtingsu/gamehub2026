const Database = require('better-sqlite3');
const db = new Database('./data/gamehub.db');

// 检查users表是否有language列
const columns = db.prepare(`PRAGMA table_info(users)`).all();
console.log('users表列:', columns.map(c => ({name: c.name, type: c.type})));

// 检查games表是否有title_en列
const gameColumns = db.prepare(`PRAGMA table_info(games)`).all();
console.log('games表列:', gameColumns.map(c => c.name).filter(name => name.startsWith('title_') || name.startsWith('description_')));

// 检查news表的多语言列
const newsColumns = db.prepare(`PRAGMA table_info(news)`).all();
console.log('news表列:', newsColumns.map(c => c.name).filter(name => name.startsWith('title_') || name.startsWith('content_') || name.startsWith('excerpt_')));

// 检查languages表是否存在
const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name IN ('languages', 'game_localizations', 'news_localizations')`).all();
console.log('存在的表:', tables);

db.close();