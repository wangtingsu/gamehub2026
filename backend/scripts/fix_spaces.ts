import Database from 'better-sqlite3';
const db = new Database('./data/gamehub.db');

// 1. 给博客空间关联 game_id（模糊匹配游戏名）
const spaces = db.prepare('SELECT id, name FROM blog_spaces WHERE game_id IS NULL').all() as any[];
for (const s of spaces) {
  const game = db.prepare('SELECT id FROM games WHERE title LIKE ? LIMIT 1').get(`%${s.name}%`) as any;
  if (game) {
    db.prepare('UPDATE blog_spaces SET game_id=? WHERE id=?').run(game.id, s.id);
    console.log(`Linked space "${s.name}" → game ${game.id}`);
  }
}

// 2. 给迁移后的评测/攻略设置 game_id（从原表补充）
// reviews already have game_id from migration ✓
// guides already have game_id from migration ✓

// 3. 给博客文章也补上 game_id（如果有的话）
// Original blog posts don't have game_id, that's OK

console.log('\n=== Result ===');
const result = db.prepare('SELECT bs.id, bs.name, bs.game_id, g.title as game_title FROM blog_spaces bs LEFT JOIN games g ON bs.game_id=g.id').all();
console.log(result);

db.close();
console.log('Done');
