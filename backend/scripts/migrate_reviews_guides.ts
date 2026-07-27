import Database from 'better-sqlite3';

const db = new Database('./data/gamehub.db');
db.pragma('foreign_keys = ON');

// 1. Create review/guide spaces
db.prepare(`INSERT OR IGNORE INTO blog_spaces (name, slug, description, sort_order) VALUES ('评测', 'reviews', '游戏评测文章', 10)`).run();
db.prepare(`INSERT OR IGNORE INTO blog_spaces (name, slug, description, sort_order) VALUES ('攻略', 'guides', '游戏攻略指南', 20)`).run();
const reviewSpace = db.prepare(`SELECT id FROM blog_spaces WHERE slug='reviews'`).get() as any;
const guideSpace = db.prepare(`SELECT id FROM blog_spaces WHERE slug='guides'`).get() as any;
console.log('Spaces:', reviewSpace?.id, guideSpace?.id);

// 2. Migrate reviews
const reviews = db.prepare('SELECT * FROM reviews').all();
console.log(`Migrating ${reviews.length} reviews...`);
for (const r of reviews as any[]) {
  const slug = `review-${r.id}-${Date.now().toString(36)}`;
  db.prepare(`INSERT OR IGNORE INTO blog_articles (title, slug, content, excerpt, author_id, space_id, category, tags, is_published, published_at, views, likes, comments, review_status, created_at, updated_at, post_type, game_id, rating)
    VALUES (?,?,?,?,?,?,?,?,1,?,0,?,?,?,?,?,'review',?,?)`).run(
    r.title, slug, r.content, '', r.author_id, reviewSpace.id, '评测', '[]',
    r.created_at, r.likes||0, r.comments||0, r.review_status||'approved', r.created_at, r.updated_at,
    r.game_id, r.rating
  );
}

// 3. Migrate guides
const guides = db.prepare('SELECT * FROM guides').all();
console.log(`Migrating ${guides.length} guides...`);
for (const g of guides as any[]) {
  const slug = `guide-${g.id}-${Date.now().toString(36)}`;
  db.prepare(`INSERT OR IGNORE INTO blog_articles (title, slug, content, cover_image_url, author_id, space_id, category, tags, is_published, published_at, likes, comments, review_status, created_at, updated_at, post_type, game_id)
    VALUES (?,?,?,?,?,?,?,?,1,?,?,?,?,?,?,'guide',?)`).run(
    g.title, slug, g.content, g.cover_image_url||'', g.author_id, guideSpace.id, '攻略', '[]',
    g.created_at, g.likes||0, g.comments||0, g.review_status||'approved', g.created_at, g.updated_at, g.game_id
  );
}

// 4. Verify
const counts = db.prepare(`SELECT post_type, COUNT(*) as cnt FROM blog_articles GROUP BY post_type`).all();
console.log('Blog articles by type:', counts);

db.close();
console.log('Done');
