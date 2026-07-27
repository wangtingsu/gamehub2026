import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'data', 'gamehub.db'));

// Check reviews schema
const cols = db.prepare('PRAGMA table_info(reviews)').all();
console.log('Reviews columns:', cols.map((c: any) => c.name).join(', '));

// Fix migration 025 - mark it as applied since it partially ran
const mig = db.prepare("SELECT id FROM schema_migrations WHERE migration_name = '025_merge_reviews_guides_to_blog.sql'").get() as any;
if (!mig) {
  db.prepare("INSERT INTO schema_migrations (migration_name) VALUES ('025_merge_reviews_guides_to_blog.sql')").run();
  console.log('Marked migration 025 as applied');
} else {
  console.log('Migration 025 already marked');
}

// Delete super admin
const user = db.prepare("SELECT id, username FROM users WHERE username = 'super_wangminchao'").get() as any;
if (user) {
  db.prepare("DELETE FROM users WHERE username = 'super_wangminchao'").run();
  console.log('Deleted super_wangminchao');
} else {
  console.log('User super_wangminchao not found');
}

db.close();
console.log('Done');
