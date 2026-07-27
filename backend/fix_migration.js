const Database = require('better-sqlite3');
const db = new Database('./data/gamehub.db');

// 检查reviews表结构
const columns = db.prepare(`PRAGMA table_info(reviews)`).all();
console.log('reviews表列:', columns.map(c => ({name: c.name, type: c.type, notnull: c.notnull, dflt_value: c.dflt_value})));

// 检查published_at列是否存在
const hasPublishedAt = columns.some(c => c.name === 'published_at');
console.log('has published_at column:', hasPublishedAt);

if (!hasPublishedAt) {
  console.log('尝试添加published_at列...');
  try {
    // 先添加列，不允许NULL，无默认值
    db.prepare(`ALTER TABLE reviews ADD COLUMN published_at TEXT`).run();
    console.log('列添加成功');
    // 更新现有行的值为created_at
    db.prepare(`UPDATE reviews SET published_at = created_at WHERE published_at IS NULL`).run();
    console.log('数据更新成功');
  } catch (error) {
    console.error('添加列失败:', error.message);
  }
} else {
  console.log('published_at列已存在');
}

// 检查其他可能缺失的列
const expectedColumns = ['id', 'title', 'content', 'rating', 'game_id', 'author_id', 'tags', 'likes', 'comments', 'is_featured', 'published_at', 'created_at', 'updated_at', 'deleted_at', 'version', 'created_by', 'updated_by'];
for (const col of expectedColumns) {
  if (!columns.some(c => c.name === col)) {
    console.log(`缺失列: ${col}`);
  }
}

db.close();