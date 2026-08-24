const Database = require('/app/node_modules/better-sqlite3');
const db = new Database('/app/data/gamehub.db', { readonly: true });

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('=== TABLES ===');
for (const t of tables) console.log(t.name);

console.log('\n=== SCHEMA ===');
for (const t of tables) {
  const cols = db.prepare(`PRAGMA table_info(${t.name})`).all();
  const rowCount = db.prepare(`SELECT COUNT(*) AS c FROM ${t.name}`).get().c;
  console.log(`\n[${t.name}]  rows=${rowCount}`);
  for (const c of cols) console.log(`  ${c.name} ${c.type}`);
}
