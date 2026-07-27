import Database from 'better-sqlite3';
const db = new Database('./data/gamehub.db');

// Remove all except the 2 distinct reviews we want
db.prepare("DELETE FROM reviews WHERE space_id=1 AND id NOT IN (10, 11)").run();

console.log('Reviews in space 1:', db.prepare('SELECT COUNT(*) as c FROM reviews WHERE space_id=1').get());
console.log('Guides in space 1:', db.prepare('SELECT COUNT(*) as c FROM guides WHERE space_id=1').get());
console.log('Blogs in space 1:', db.prepare('SELECT COUNT(*) as c FROM blog_articles WHERE space_id=1').get());
console.log('Review titles:', db.prepare('SELECT id, title FROM reviews WHERE space_id=1').all());
db.close();
