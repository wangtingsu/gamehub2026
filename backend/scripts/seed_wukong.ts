import Database from 'better-sqlite3';
const db = new Database('./data/gamehub.db');

const now = new Date().toISOString();
const authorId = 6; // super_wangminchao

// 黑神话悟空 space_id = 1
const data = [
  // 2条评测
  {
    title: '《黑神话：悟空》— 国产3A的标杆之作',
    content: '玩了60小时通关，这是一款真正意义上的国产3A大作。画面表现力达到了国际一线水准，虚幻5引擎的光影效果令人叹为观止。战斗系统深度十足，七十二变和筋斗云完美融入战斗。强烈推荐！',
    excerpt: '60小时深度体验，国产3A的里程碑之作',
    post_type: 'review', rating: 9.5,
  },
  {
    title: '《黑神话：悟空》评测：虽有瑕疵，但瑕不掩瑜',
    content: '作为国产第一款真正意义上的3A游戏，黑神话悟空交出了一份令人满意的答卷。战斗手感扎实，BOSS设计精彩。不过优化方面还有提升空间，部分场景存在掉帧。总体来说值得购买。',
    excerpt: '客观评价：优秀但还有进步空间',
    post_type: 'review', rating: 8.5,
  },
  // 2条攻略
  {
    title: '《黑神话：悟空》全BOSS打法攻略',
    content: '本文整理了游戏中全部81个BOSS的打法技巧：\n\n1. 黑风大王：注意躲避远程攻击，贴身输出\n2. 黄风怪：利用定身术打断施法\n3. 白骨精：多段变身，耐心等待破绽\n...',
    excerpt: '81个BOSS完整打法指南，助你通关',
    post_type: 'guide',
  },
  {
    title: '《黑神话：悟空》隐藏结局触发条件',
    content: '要触发隐藏结局需要满足以下条件：\n\n1. 收集全部六个根器\n2. 完成所有支线任务\n3. 在最终BOSS战前选择"放下"\n\n隐藏结局揭示了天命的真正含义...',
    excerpt: '全网最全隐藏结局攻略',
    post_type: 'guide',
  },
];

for (const d of data) {
  const slug = `wukong-${d.post_type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
  if (d.post_type === 'review') {
    db.prepare(`INSERT INTO blog_articles (title, slug, content, excerpt, author_id, space_id, category, tags, is_published, published_at, likes, comments, review_status, created_at, updated_at, post_type, rating)
      VALUES (?,?,?,?,?,1,'评测','[]',1,?,?,0,'approved',?,?,'review',?)`).run(
      d.title, slug, d.content, d.excerpt, authorId, now,
      Math.floor(Math.random()*100), now, now, d.rating
    );
  } else {
    db.prepare(`INSERT INTO blog_articles (title, slug, content, excerpt, author_id, space_id, category, tags, is_published, published_at, likes, comments, review_status, created_at, updated_at, post_type)
      VALUES (?,?,?,?,?,1,'攻略','[]',1,?,?,0,'approved',?,?,'guide')`).run(
      d.title, slug, d.content, d.excerpt, authorId, now,
      Math.floor(Math.random()*100), now, now
    );
  }
  console.log(`Inserted: ${d.title}`);
}

// 同时插入原 reviews/guides 表保持数据一致
db.prepare(`INSERT INTO reviews (title, content, rating, game_id, author_id, tags, likes, comments, review_status, published_at, created_at, updated_at)
  VALUES ('黑神话悟空深度体验', '画面精美战斗流畅', 9.0, NULL, ?, '[]', 0, 0, 'approved', ?, ?, ?)`).run(authorId, now, now, now);
db.prepare(`INSERT INTO guides (title, content, game_id, author_id, difficulty, category, likes, comments, review_status, created_at, updated_at)
  VALUES ('黑神话悟空新手入门', '基础操作指南...', NULL, ?, 'easy', '基础', 0, 0, 'approved', ?, ?)`).run(authorId, now, now);

console.log('Done');
db.close();
