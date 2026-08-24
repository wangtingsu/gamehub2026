const Database = require('/app/node_modules/better-sqlite3');
const fs = require('fs');

const DB = '/app/data/gamehub.db';
const BACKUP = '/app/data/gamehub_backup_pre_english.db';
const DUMP = '/app/data/content_dump.json';

(async () => {
  // 1. Online backup (handles WAL)
  const src = new Database(DB, { readonly: true });
  await src.backup(BACKUP);
  console.log('BACKUP written to', BACKUP, fs.statSync(BACKUP).size, 'bytes');

  // 2. Dump content
  const dump = {};

  const t = (name) => {
    try { return src.prepare(`SELECT * FROM ${name}`).all(); }
    catch (e) { console.log('SKIP', name, e.message); return []; }
  };

  dump.games = t('games');
  dump.news = t('news');
  dump.news_categories = t('news_categories');
  dump.blog_articles = t('blog_articles');
  dump.reviews = t('reviews');
  dump.about_contacts = t('about_contacts');
  dump.about_sections = t('about_sections');
  dump.about_team_members = t('about_team_members');
  dump.about_timeline = t('about_timeline');
  dump.about_values = t('about_values');
  dump.blog_spaces = t('blog_spaces');

  fs.writeFileSync(DUMP, JSON.stringify(dump, null, 2));
  console.log('DUMP written to', DUMP, fs.statSync(DUMP).size, 'bytes');

  // summary
  for (const k of Object.keys(dump)) console.log('  ', k, dump[k].length, 'rows');
  src.close();
})();
