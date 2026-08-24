const Database = require('/app/node_modules/better-sqlite3');
const db = new Database('/app/data/gamehub.db', { readonly: true });

const tables = ['languages','games','game_localizations','news','news_categories','news_localizations','blog_articles','guides','reviews','banners','featured_content'];
for (const t of tables) {
  const exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(t);
  if (!exists) { console.log(`\n[${t}] MISSING`); continue; }
  const cols = db.prepare(`PRAGMA table_info(${t})`).all();
  const c = db.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get().c;
  console.log(`\n[${t}] rows=${c} cols=${cols.map(x=>x.name).join(', ')}`);
}

console.log('\n\n=== languages ===');
try { console.log(JSON.stringify(db.prepare('SELECT * FROM languages').all(), null, 0)); } catch(e){ console.log('ERR', e.message); }

console.log('\n\n=== games sample (id,title,description) ===');
try { for (const r of db.prepare('SELECT id,title,description,genres FROM games LIMIT 5').all()) console.log(JSON.stringify(r)); } catch(e){ console.log('ERR', e.message); }

console.log('\n\n=== game_localizations sample ===');
try { for (const r of db.prepare('SELECT * FROM game_localizations LIMIT 5').all()) console.log(JSON.stringify(r)); } catch(e){ console.log('ERR', e.message); }

console.log('\n\n=== news sample ===');
try { for (const r of db.prepare('SELECT * FROM news LIMIT 3').all()) console.log(JSON.stringify(r)); } catch(e){ console.log('ERR', e.message); }

console.log('\n\n=== news_localizations sample ===');
try { for (const r of db.prepare('SELECT * FROM news_localizations LIMIT 3').all()) console.log(JSON.stringify(r)); } catch(e){ console.log('ERR', e.message); }

console.log('\n\n=== blog_articles sample ===');
try { for (const r of db.prepare('SELECT * FROM blog_articles LIMIT 3').all()) console.log(JSON.stringify(r)); } catch(e){ console.log('ERR', e.message); }

console.log('\n\n=== guides sample ===');
try { for (const r of db.prepare('SELECT * FROM guides LIMIT 3').all()) console.log(JSON.stringify(r)); } catch(e){ console.log('ERR', e.message); }

console.log('\n\n=== reviews sample ===');
try { for (const r of db.prepare('SELECT * FROM reviews LIMIT 3').all()) console.log(JSON.stringify(r)); } catch(e){ console.log('ERR', e.message); }
