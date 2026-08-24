// apply_english_3.js — translate community post categories/tags + user_tags to English
const Database = require('/app/node_modules/better-sqlite3');
const db = new Database('/app/data/gamehub.db');

const CJK = /[一-鿿]/;

const run = db.transaction(() => {
  // 1. community_posts.category (display string, rendered as-is)
  const catMap = {
    '分享': 'Share',
    '投票': 'Poll',
    '推荐': 'Recommend',
    '攻略': 'Guide',
    '求助': 'Help',
    '讨论': 'Discussion',
  };
  for (const [zh, en] of Object.entries(catMap)) {
    const r = db.prepare('UPDATE community_posts SET category = ? WHERE category = ?').run(en, zh);
    console.log(`category ${zh} -> ${en}: ${r.changes} rows`);
  }

  // 2. community_posts.tags (JSON string array)
  const tagMap = { '游戏': 'Gaming', '论坛': 'Forum', '社区': 'Community' };
  const tagRows = db.prepare("SELECT id, tags FROM community_posts WHERE tags IS NOT NULL AND tags != ''").all();
  let tagChanged = 0;
  for (const r of tagRows) {
    try {
      const arr = JSON.parse(r.tags);
      if (Array.isArray(arr)) {
        const mapped = arr.map((t) => tagMap[t] || t);
        const next = JSON.stringify(mapped);
        if (next !== r.tags) {
          db.prepare('UPDATE community_posts SET tags = ? WHERE id = ?').run(next, r.id);
          tagChanged++;
        }
      }
    } catch (e) { /* non-JSON tags, skip */ }
  }
  console.log(`tags translated: ${tagChanged} rows`);

  // 3. user_tags (name + description)
  const userTags = {
    1: { name: 'Highly Active', description: 'Active users who log in frequently' },
    2: { name: 'Content Creator', description: 'Users who have published many reviews or posts' },
    3: { name: 'New User', description: 'New users registered within the last 30 days' },
    4: { name: 'Core Player', description: 'Users with rich game libraries and high engagement' },
    5: { name: 'Dormant User', description: 'Potential churn users who have not logged in for over 30 days' },
    6: { name: 'VIP', description: 'Users with special contributions or paid membership' },
  };
  for (const [id, f] of Object.entries(userTags)) {
    db.prepare('UPDATE user_tags SET name = ?, description = ? WHERE id = ?').run(f.name, f.description, id);
  }
  console.log(`user_tags translated: ${Object.keys(userTags).length} rows`);
});

run();

// verify
const check = (table, cols) => {
  let n = 0;
  for (const c of cols) {
    const rows = db.prepare(`SELECT ${c} AS v FROM ${table}`).all();
    for (const r of rows) if (r.v != null && typeof r.v === 'string' && CJK.test(r.v)) n++;
  }
  console.log(`${table} remaining Chinese: ${n}`);
};
check('community_posts', ['category', 'tags']);
check('user_tags', ['name', 'description']);

console.log('DONE apply_english_3');
