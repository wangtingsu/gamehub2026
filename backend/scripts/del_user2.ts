import Database from 'better-sqlite3';

const db = new Database('./data/gamehub.db');
const u = db.prepare("SELECT id FROM users WHERE username='super_wangminchao'").get() as any;

if (!u) { console.log('用户不存在'); db.close(); process.exit(0); }

// Check referencing records
const tables = ['community_posts','reviews','guides','blog_articles','comments','social_accounts'];
for (const t of tables) {
  try {
    const cnt = db.prepare(`SELECT COUNT(*) as c FROM ${t} WHERE author_id=?`).get(u.id) as any;
    if (cnt.c > 0) console.log(`${t}: ${cnt.c} rows`);
  } catch(e: any) { console.log(`${t}: ${e.message}`); }
}

// Set user inactive first
db.prepare('UPDATE users SET is_active=0 WHERE id=?').run(u.id);
console.log('已将 super_wangminchao 设为停用状态（保留数据完整性）');
db.close();
