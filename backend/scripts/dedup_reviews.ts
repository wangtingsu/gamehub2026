import Database from 'better-sqlite3';
const db = new Database('./data/gamehub.db');

// Dedup reviews: keep only one per (title, author_id)
const dups = db.prepare(`
  SELECT title, author_id, COUNT(*) as cnt, MIN(id) as keep_id
  FROM blog_articles WHERE post_type='review'
  GROUP BY title, author_id HAVING cnt > 1
`).all();
console.log('Duplicate groups:', dups.length);

for (const d of dups as any[]) {
  db.prepare(`DELETE FROM blog_articles WHERE post_type='review' AND title=? AND author_id=? AND id!=?`)
    .run(d.title, d.author_id, d.keep_id);
}

const counts = db.prepare('SELECT post_type, COUNT(*) as cnt FROM blog_articles GROUP BY post_type').all();
console.log('After cleanup:', counts);
db.close();
