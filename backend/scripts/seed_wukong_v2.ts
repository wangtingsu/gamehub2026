import Database from 'better-sqlite3';
const db = new Database('./data/gamehub.db');

const now = new Date().toISOString();
const authorId = 6;
const spaceId = 1; // 黑神话悟空

// Insert reviews
const reviews = [
  { title: '《黑神话：悟空》— 国产3A的标杆之作', content: '玩了60小时通关，画面表现力一流。战斗系统深度十足，强烈推荐！', rating: 9.5 },
  { title: '《黑神话：悟空》评测：虽有瑕疵但瑕不掩瑜', content: '国产第一款3A游戏，战斗扎实，BOSS设计精彩，值得购买。', rating: 8.5 },
];
for (const r of reviews) {
  db.prepare(`INSERT INTO reviews (title, content, rating, author_id, space_id, tags, likes, review_status, published_at, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
    r.title, r.content, r.rating, authorId, spaceId, '[]', Math.floor(Math.random()*100), 'approved', now, now, now
  );
}
console.log(`Inserted ${reviews.length} reviews`);

// Insert guides
const guides = [
  { title: '《黑神话：悟空》全BOSS打法攻略', content: '81个BOSS完整技巧：黑风大王注意躲避、黄风怪定身术、白骨精等破绽...', difficulty: 'hard' },
  { title: '《黑神话：悟空》隐藏结局触发条件', content: '收集全部根器、完成支线、最终BOSS前选择放下即可触发隐藏结局', difficulty: 'medium' },
];
for (const g of guides) {
  db.prepare(`INSERT INTO guides (title, content, difficulty, game_id, author_id, space_id, likes, review_status, created_at, updated_at)
    VALUES (?,?,?,1,?,?,?,?,?,?)`).run(
    g.title, g.content, g.difficulty, authorId, spaceId, Math.floor(Math.random()*100), 'approved', now, now
  );
}
console.log(`Inserted ${guides.length} guides`);

// Verify
console.log('\n=== reviews in space 1 ===');
console.log(db.prepare('SELECT id, title, space_id FROM reviews WHERE space_id=1').all());
console.log('\n=== guides in space 1 ===');
console.log(db.prepare('SELECT id, title, space_id FROM guides WHERE space_id=1').all());

db.close();
console.log('\nDone');
