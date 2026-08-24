const Database = require('/app/node_modules/better-sqlite3');
const db = new Database('/app/data/gamehub.db', { readonly: true });

const CJK = /[一-鿿]/;

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();

for (const { name: t } of tables) {
  const cols = db.prepare(`PRAGMA table_info(${t})`).all();
  let any = false;
  for (const c of cols) {
    // only inspect text-ish columns
    if (!/TEXT|CHAR|VARCHAR|JSON/i.test(c.type)) continue;
    let n = 0;
    try {
      const rows = db.prepare(`SELECT ${c.name} AS v FROM ${t}`).all();
      for (const r of rows) {
        if (r.v != null && typeof r.v === 'string' && CJK.test(r.v)) n++;
      }
    } catch (e) { continue; }
    if (n > 0) {
      any = true;
      console.log(`${t}.${c.name}: ${n} rows with Chinese`);
    }
  }
  if (!any) console.log(`[${t}] clean`);
}
