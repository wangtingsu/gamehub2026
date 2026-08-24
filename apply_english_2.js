// apply_english_2.js — translate achievements + redeem codes, delete test news posts
const Database = require('/app/node_modules/better-sqlite3');
const db = new Database('/app/data/gamehub.db');

const CJK = /[一-鿿]/;

function upd(table, id, fields) {
  const keys = Object.keys(fields);
  const set = keys.map((k) => `${k} = ?`).join(', ');
  const vals = keys.map((k) => fields[k]);
  db.prepare(`UPDATE ${table} SET ${set} WHERE id = ?`).run(...vals, id);
}

const achievements = {
  1:  { name: 'First Review', description: 'Publish your first game review' },
  2:  { name: 'Veteran Reviewer', description: 'Publish 10 game reviews' },
  3:  { name: 'First Post', description: 'Publish your first post in the community' },
  4:  { name: 'Community Regular', description: 'Publish 50 posts in the community' },
  5:  { name: 'Comment Master', description: 'Post 100 comments' },
  6:  { name: 'Intermediate Player', description: 'Reach level 5' },
  7:  { name: 'Max Level Player', description: 'Reach level 10' },
  8:  { name: 'XP Builder', description: 'Earn 1,000 XP in total' },
  9:  { name: 'XP Master', description: 'Earn 10,000 XP in total' },
  10: { name: 'First Follower', description: 'Gain your first follower' },
  11: { name: 'Rising Star', description: 'Gain 100 followers' },
};

const redeemCodes = {
  1: { title: 'New User Welcome Pack', description: 'Redeem on registration, ¥20 off orders over ¥100', reward_value: '¥20 off ¥100' },
  2: { title: 'Summer Carnival', description: 'Summer-exclusive redeem code', reward_value: '¥50 coupon' },
  3: { title: 'VIP Member Exclusive', description: 'VIP-player exclusive redeem code', reward_value: 'Limited item bundle' },
};

const run = db.transaction(() => {
  for (const [id, f] of Object.entries(achievements)) upd('platform_achievements', id, f);
  for (const [id, f] of Object.entries(redeemCodes)) upd('redeem_codes', id, f);

  // delete rejected test news posts (id 6, 7) — already verified no comments reference them
  const del = db.prepare('DELETE FROM news WHERE id IN (6, 7) AND review_status = ?').run('rejected');
  console.log('deleted test news rows:', del.changes);
});

run();

// verify no Chinese remains in the touched text columns
const check = (table, cols) => {
  let n = 0;
  for (const c of cols) {
    const rows = db.prepare(`SELECT ${c} AS v FROM ${table}`).all();
    for (const r of rows) if (r.v != null && typeof r.v === 'string' && CJK.test(r.v)) n++;
  }
  console.log(`${table} remaining Chinese: ${n}`);
};
check('platform_achievements', ['name', 'description']);
check('redeem_codes', ['title', 'description', 'reward_value']);

console.log('DONE apply_english_2');
