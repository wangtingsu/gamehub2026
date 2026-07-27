import Database from 'better-sqlite3';
const db = new Database('./data/gamehub.db');

// 1. Make game_id nullable in reviews (SQLite requires recreating)
// SQLite doesn't support ALTER COLUMN, but we can just insert without constraint issues
// using a new table with nullable game_id
db.pragma('foreign_keys = OFF');

db.exec(`
  CREATE TABLE IF NOT EXISTS reviews_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL, content TEXT NOT NULL, rating REAL NOT NULL,
    game_id INTEGER REFERENCES games(id) ON DELETE SET NULL,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tags TEXT DEFAULT '[]', likes INTEGER DEFAULT 0 INTEGER DEFAULT 0,
    is_featured INTEGER DEFAULT 0,
    published_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    review_status TEXT NOT NULL DEFAULT 'approved',
    review_comment TEXT,
    space_id INTEGER REFERENCES blog_spaces(id)
  );
  INSERT INTO reviews_new SELECT id,title,content,rating,game_id,author_id,tags,likes,comments,is_featured,published_at,created_at,updated_at,review_status,review_comment,space_id FROM reviews;
  DROP TABLE reviews;
  ALTER TABLE reviews_new RENAME TO reviews;
`);

db.pragma('foreign_keys = ON');
console.log('Made reviews.game_id nullable');

// 2. Seed 黑神话悟空 data into reviews and guides (space_id=1)
const now = new Date().toISOString();
const authorId = 6;

const reviews = [
  { title: '《黑神话：悟空》— 国产3A的标杆之作', content: '玩了60小时通关，画面表现力达到了国际一线水准，虚幻5引擎的光影效果令人叹为观止。战斗系统深度十足。强烈推荐！', excerpt: '60小时深度体验，国产3A里程碑', rating: 9.5 },
  { title: '《黑神话：悟空》评测：虽有瑕疵，但瑕不掩瑜', content: '作为国产第一款真正意义上的3A游戏，黑神话悟空交出了令人满意的答卷。战斗手感扎实，BOSS设计精彩。推荐购买。', excerpt: '优秀但还有进步空间', rating: 8.5 },
];

const guides = [
  { title: '《黑神话：悟空》全BOSS打法攻略', content: '81个BOSS完整技巧：黑风大王注意躲避远程、黄风怪利用定身术、白骨精等待破绽...', difficulty: 'hard' },
  { title: '《黑神话：悟空》隐藏结局触发条件', content: '收集全部六个根器、完成所有支线、最终BOSS前选择"放下"即可触发隐藏结局', difficulty: 'medium' },
];

for (const r of reviews) {
  db.prepare(`INSERT INTO reviews (title, content, rating, author_id, space_id, tags, likes, review_status, published_at, created_at, updated_at)
    VALUES (?,?,?,?,1,'[]',?,'approved',?,?,?)`).run(
    r.title, r.content, r.rating, authorId, Math.floor(Math.random()*100), now, now, now
  );
}
console.log(`Inserted ${reviews.length} reviews`);

for (const g of guides) {
  db.prepare(`INSERT INTO guides (title, content, difficulty, author_id, space_id, likes, review_status, created_at, updated_at)
    VALUES (?,?,?,?,1,?,'approved',?,?)`).run(
    g.title, g.content, g.difficulty, '攻略', authorId, Math.floor(Math.random()*100), now, now
  );
}
console.log(`Inserted ${guides.length} guides`);

// 3. Verify
console.log('\n=== reviews for space 1 ===');
console.log(db.prepare('SELECT id, title, space_id FROM reviews WHERE space_id=1').all());
console.log('\n=== guides for space 1 ===');
console.log(db.prepare('SELECT id, title, space_id FROM guides WHERE space_id=1').all());

db.close();
console.log('\nDone');
