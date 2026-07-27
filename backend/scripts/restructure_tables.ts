import Database from 'better-sqlite3';
const db = new Database('./data/gamehub.db');

// 1. Add space_id to reviews and guides
for (const t of ['reviews', 'guides']) {
  try { db.prepare(`ALTER TABLE ${t} ADD COLUMN space_id INTEGER REFERENCES blog_spaces(id)`).run(); console.log(`Added space_id to ${t}`); }
  catch(e: any) { console.log(`${t}: ${e.message}`); }
}

// 2. Link existing reviews to blog spaces by game_id match
db.prepare(`UPDATE reviews SET space_id=(SELECT bs.id FROM blog_spaces bs WHERE bs.game_id=reviews.game_id LIMIT 1) WHERE space_id IS NULL`).run();
db.prepare(`UPDATE guides SET space_id=(SELECT bs.id FROM blog_spaces bs WHERE bs.game_id=guides.game_id LIMIT 1) WHERE space_id IS NULL`).run();

// Also set space_id for reviews/guides with game_id matching blog_spaces.game_id
// For those without matching spaces, set to the game-specific space

// 3. Remove migrated reviews/guides from blog_articles (keep only post_type='blog')
const deleted = db.prepare(`DELETE FROM blog_articles WHERE post_type IN ('review','guide')`).run();
console.log(`Removed ${deleted.changes} migrated articles from blog_articles`);

// 4. Verify structure
console.log('\n=== reviews (sample) ===');
console.log(db.prepare('SELECT id, title, game_id, space_id FROM reviews LIMIT 3').all());
console.log('\n=== guides ===');
console.log(db.prepare('SELECT id, title, game_id, space_id FROM guides').all());
console.log('\n=== blog_articles (should only be post_type=blog) ===');
console.log(db.prepare('SELECT id, title, post_type, space_id, game_id FROM blog_articles').all());

db.close();
console.log('\nDone');
