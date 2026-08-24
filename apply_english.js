// Overwrite primary Chinese content columns with English (backup already taken).
const Database = require('/app/node_modules/better-sqlite3');
const db = new Database('/app/data/gamehub.db');

function upd(table, id, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) return;
  const set = keys.map(k => `${k} = ?`).join(', ');
  const vals = keys.map(k => fields[k]);
  db.prepare(`UPDATE ${table} SET ${set} WHERE id = ?`).run(...vals, id);
}
const J = (arr) => JSON.stringify(arr);

const run = db.transaction(() => {
  // ===================== games =====================
  const games = {
    1:  { title: 'Elden Ring', description: 'A dark fantasy action RPG developed by FromSoftware and published by Bandai Namco Entertainment.', genres: J(['Action RPG','Open World','Dark Fantasy']), publisher: 'Bandai Namco Entertainment' },
    2:  { title: 'Cyberpunk 2077', description: 'An open-world action RPG developed and published by CD Projekt.', genres: J(['Action RPG','Open World','Cyberpunk']) },
    3:  { title: "Baldur's Gate 3", description: "A role-playing game by Larian Studios, based on the Dungeons & Dragons 5e ruleset.", genres: J(['RPG','Turn-Based Strategy','Fantasy']) },
    4:  { title: 'Stardew Valley', description: 'A simulation RPG developed by ConcernedApe.', genres: J(['Simulation','RPG','Casual']) },
    5:  { title: 'Hollow Knight', description: 'A Metroidvania game developed by Team Cherry.', genres: J(['Action Adventure','Platformer','Metroidvania']) },
    6:  { title: 'Genshin Impact', description: "Embark on an adventure across Teyvat, explore seven nations, collect characters, and uncover the world's secrets.", genres: J(['Open World','Action RPG','Gacha']), developer: 'miHoYo', publisher: 'miHoYo' },
    7:  { title: 'League of Legends', description: "The world's most popular competitive MOBA, featuring 5v5 team battles and hundreds of champions to master.", genres: J(['MOBA','Competitive','Strategy']) },
    8:  { title: 'Fortnite', description: 'A 100-player battle royale combining building and shooting, with constant crossovers and innovative gameplay.', genres: J(['Battle Royale','Shooter','Building']) },
    9:  { title: 'Naraka: Bladepoint', description: 'A melee-weapon battle royale with grappling hooks and close-quarters combat.', genres: J(['Battle Royale','Action','Melee Combat']), developer: 'NetEase', publisher: 'NetEase' },
    10: { title: 'Destiny 2', description: 'A sci-fi looter-shooter FPS — explore the solar system and collect exotic weapons.', genres: J(['FPS','MMO','Sci-Fi']) },
    11: { title: 'Animal Crossing: New Horizons', description: 'Build your dream home on a deserted island and live alongside adorable animal neighbors.', genres: J(['Simulation','Social','Casual']), developer: 'Nintendo', publisher: 'Nintendo' },
    12: { title: 'Sky: Children of the Light', description: 'Fly and explore the Kingdom of Sky, make friends, and share warm candlelight.', genres: J(['Adventure','Social','Cozy']) },
    13: { title: 'Starlit Fields', description: 'Grow alien plants on an interstellar farm and befriend friendly extraterrestrial creatures.', genres: J(['Simulation','Farming','Cozy']) },
    14: { title: 'Undertale', description: 'A subversive RPG you can beat peacefully — every choice matters.', genres: J(['RPG','Pixel Art','Cozy']) },
    15: { title: 'Cuphead', description: 'A retro-animation side-scrolling shooter — take on bosses with a friend.', genres: J(['Side-Scrolling','Shooter','Co-op']) },
    18: { title: 'Counter-Strike 2', description: 'The classic competitive FPS.', genres: J(['FPS','Competitive','Shooter']) },
    19: { title: 'Apex Legends', description: 'A hero-shooter battle royale.', genres: J(['Battle Royale','FPS']) },
    20: { title: 'Palworld', description: 'Collect creatures and build your base.', genres: J(['Survival','Building','Collection']) },
    21: { title: 'The Legend of Zelda: Tears of the Kingdom', description: 'A brand-new adventure in Hyrule.', genres: J(['Action Adventure','Open World']), developer: 'Nintendo', publisher: 'Nintendo' },
    22: { title: 'Dave the Diver', description: 'Fish by day, run a restaurant by night.', genres: J(['Simulation','Adventure','RPG']) },
    23: { title: 'Vampire Survivors', description: 'An auto-firing survival game.', genres: J(['Action','Roguelite']) },
    24: { title: 'Animal Well', description: 'A pixel-art puzzle exploration game.', genres: J(['Puzzle','Exploration','Indie']) },
  };
  for (const [id, f] of Object.entries(games)) upd('games', Number(id), f);

  // ===================== news =====================
  upd('news', 1, {
    title: '2026 Gaming Industry Trends Report: AI and Cloud Gaming Lead the Way',
    content: "As 2026 unfolds, the gaming industry is undergoing unprecedented change. Artificial intelligence is fundamentally transforming the game development pipeline, from procedural content generation to intelligent NPC behavior, with the scope of AI applications continuing to expand.\n\nCloud gaming has also made significant progress; the widespread adoption of 5G networks has made high-fidelity game streaming far more viable. Several major companies have launched mature cloud gaming services, and the subscription business model is becoming the mainstream.\n\nMoreover, the cross-platform trend is accelerating. A growing number of games support seamless play across PC, console, and mobile, breaking down traditional platform barriers.",
    excerpt: 'AI, cloud gaming, and cross-platform trends are reshaping the gaming industry',
    category: 'Industry News',
    tags: J(['Industry Trends','AI','Cloud Gaming','Cross-Platform']),
  });
  upd('news', 2, {
    title: 'Black Myth: Wukong Surpasses 30 Million Global Sales',
    content: "Game Science has announced that Black Myth: Wukong has surpassed 30 million copies sold worldwide, making it the best-selling Chinese-developed game of all time.\n\nThe game has received widespread acclaim since its release, with its stunning visuals, fluid combat, and deep roots in Chinese culture earning recognition from players around the world.\n\nGame Science is reportedly developing DLC content expected to launch later this year, and a film adaptation is also in preparation.",
    excerpt: 'A Chinese AAA hit hits a new milestone; DLC is in development',
    category: 'New Releases',
    tags: J(['Black Myth: Wukong','Chinese Games','Sales']),
  });
  upd('news', 3, {
    title: 'Sony PS6 Specs Reportedly Leaked: Major Ray-Tracing Boost',
    content: "Developers recently leaked partial specs for the next-generation PlayStation console on social media. The PS6 will reportedly feature a custom AMD chip with ray-tracing performance more than 4x that of the PS5.\n\nThe new console will also support 8K gaming and refresh rates up to 240Hz, along with faster NVMe SSD storage reaching read speeds of up to 20GB/s.\n\nSony has yet to officially respond to the reports. Industry analysts believe the PS6 could launch during the 2027 holiday season.",
    excerpt: 'Next-gen PlayStation specs leak, with ray-tracing performance up 4x',
    category: 'Hardware & Tech',
    tags: J(['Sony','PS6','Hardware','Ray Tracing']),
  });

  // ===================== news_categories =====================
  const newsCats = {
    1: { name: 'Industry News', description: 'Latest news and updates from the gaming industry' },
    2: { name: 'New Releases', description: 'New game launches and announcements' },
    3: { name: 'Game Updates', description: 'Game version updates and patch notes' },
    4: { name: 'Esports', description: 'Esports tournament news' },
    5: { name: 'Hardware & Tech', description: 'Gaming hardware and technology news' },
    6: { name: 'Gaming Culture', description: 'Gaming culture, art, and related topics' },
  };
  for (const [id, f] of Object.entries(newsCats)) upd('news_categories', Number(id), f);

  // ===================== reviews (legacy table) =====================
  const reviews = {
    1: { title: 'An epic open-world experience! Deep combat and breathtaking world-building.', content: 'An epic open-world experience! Deep combat and breathtaking world-building.' },
    2: { title: 'Gorgeous visuals, but genuinely difficult and not very beginner-friendly.', content: 'Gorgeous visuals, but genuinely difficult and not very beginner-friendly.' },
    3: { title: 'After many updates, the experience is now quite good — Night City is captivating.', content: 'After many updates, the experience is now quite good — Night City is captivating.' },
    4: { title: "Plagued with issues at launch, now largely fixed, but there's still room for improvement.", content: "Plagued with issues at launch, now largely fixed, but there's still room for improvement." },
    5: { title: 'A well-deserved Game of the Year! Story and character writing reach new heights.', content: 'A well-deserved Game of the Year! Story and character writing reach new heights.' },
    6: { title: 'The perfect D&D experience — every choice matters.', content: 'The perfect D&D experience — every choice matters.' },
    7: { title: 'A cozy masterpiece! Farming, fishing, and mining make time fly.', content: 'A cozy masterpiece! Farming, fishing, and mining make time fly.' },
    8: { title: 'The art style and music are fantastic, with a strong sense of exploration.', content: 'The art style and music are fantastic, with a strong sense of exploration.' },
  };
  for (const [id, f] of Object.entries(reviews)) upd('reviews', Number(id), f);

  // ===================== blog_articles =====================
  const CAT_BLOGTECH = 'Blog/Tech', CAT_REVIEW = 'Review', CAT_GUIDE = 'Guide', CAT_BLOG = 'Blog', CAT_GAME_NEWS = 'Game News', CAT_GENSHIN = 'Genshin Impact';

  // id 1 — junk test post, only category is Chinese
  upd('blog_articles', 1, { category: CAT_BLOGTECH });

  // migrated reviews (id 2-9) mirror legacy reviews table
  const migReview = {
    2: 'An epic open-world experience! Deep combat and breathtaking world-building.',
    3: 'Gorgeous visuals, but genuinely difficult and not very beginner-friendly.',
    4: 'After many updates, the experience is now quite good — Night City is captivating.',
    5: "Plagued with issues at launch, now largely fixed, but there's still room for improvement.",
    6: 'A well-deserved Game of the Year! Story and character writing reach new heights.',
    7: 'The perfect D&D experience — every choice matters.',
    8: 'A cozy masterpiece! Farming, fishing, and mining make time fly.',
    9: 'The art style and music are fantastic, with a strong sense of exploration.',
  };
  for (const [id, txt] of Object.entries(migReview)) upd('blog_articles', Number(id), { title: txt, content: txt, category: CAT_REVIEW });

  // Black Myth guides (id 10-19)
  const bmwGuides = {
    10: { title: 'Chapter 1 Full Walkthrough', content: '<h2>Route</h2><p>Spawn Point → Starter Village → Wilderness → Chapter 1 Boss</p>', excerpt: 'The optimal route from spawn to the boss' },
    11: { title: 'Hidden Boss Trigger Conditions Guide', content: '<h2>Trigger Conditions</h2><p>Collect specific items to activate them at designated locations</p>', excerpt: 'How to trigger every hidden boss' },
    12: { title: 'All Spell Locations', content: '<h2>Immobilize</h2><p>Obtained automatically through the main story</p>', excerpt: 'Locations for all spells including Immobilize and Pluck of Many' },
    13: { title: 'How to Get the Ultimate Ruyi Jingu Bang', content: '<h2>Evolution Path</h2><p>From base attack 80 to ultimate 200</p>', excerpt: 'The full five-stage evolution process' },
    14: { title: 'All Achievements Guide', content: '<h2>Main Story Achievements</h2><p>Complete the main story for 30%</p>', excerpt: 'Requirements for 50+ achievements' },
    15: { title: 'Optimal Speedrun Route', content: '<h2>Speedrun Route</h2><p>Skip non-essential fights and use flight transformations</p>', excerpt: 'World-record-level speedrun tips' },
    16: { title: 'PVP Arena Build Guide', content: '<h2>Recommended Builds</h2><p>Dodge and pressure builds are strong in the current patch</p>', excerpt: 'Builds and combo tutorials for climbing the ranks' },
    17: { title: 'New Game+ Difficulty Changes Explained', content: '<h2>New Game+</h2><p>New boss forms and higher equipment caps</p>', excerpt: 'New content and difficulty in NG+ and NG++' },
    18: { title: 'All Hidden Areas Collection', content: '<h2>Chapter 1</h2><p>Three hidden areas with powerful items</p>', excerpt: 'Secret area locations in every chapter' },
    19: { title: '10 Essential Tips for Beginners', content: '<h2>Tip 1</h2><p>Use transformations wisely to scout ahead</p>', excerpt: 'Efficient tips for getting up to speed fast' },
  };
  for (const [id, f] of Object.entries(bmwGuides)) {
    upd('blog_articles', Number(id), { title: f.title, content: f.content, excerpt: f.excerpt, category: CAT_GUIDE, tags: J(['Guide','Black Myth']) });
  }

  // Genshin series (id 20-32)
  const genshin = {
    20: { title: "Genshin Impact Beginner's Guide", slug: 'genshin-impact-beginners-guide-1785815023074', content: '## Elemental Reactions\n\nSwirl, Vaporize, Melt... mastering elemental reactions is at the core of Genshin Impact combat.', excerpt: 'Elemental reactions for beginners', category: CAT_GENSHIN },
    21: { title: 'Genshin Impact Fontaine Preview', slug: 'genshin-impact-fontaine-preview-1785815023121', content: '## Fontaine\n\nThe nation of water is about to open, bringing a brand-new underwater exploration experience.', excerpt: 'New region, new characters', category: CAT_GENSHIN },
    22: { title: 'Genshin Impact Team Comps', slug: 'genshin-impact-team-comps-1785815023123', content: '## National Team\n\nBennett + Xiangling + Xingqiu + Chongyun — a classic setup.', excerpt: 'Tier-0 team comps for the current patch', category: CAT_GENSHIN },
    23: { title: 'Genshin Impact Ascension Materials', slug: 'genshin-impact-ascension-materials-1785815023124', content: '## Mondstadt\n\nVenti requires Cecilia Flowers and Hurricane Seeds.', excerpt: 'Everything you need to level up', category: CAT_GENSHIN },
    24: { title: 'Genshin Impact Spiral Abyss Full-Star Guide', slug: 'genshin-impact-spiral-abyss-guide-1785815023126', content: '## First Half\n\nA Hu Tao Vaporize team clears it fast.', excerpt: 'Floor 12 guide', category: CAT_GENSHIN },
    25: { title: 'Genshin Impact 5-Star Tier List', slug: 'genshin-impact-5-star-tier-list-1785815023127', content: '## Must-Pulls\n\nZhongli > Kazuha > Yelan for the best value.', excerpt: 'Pull recommendations', category: CAT_GENSHIN },
    26: { title: 'Genshin Impact Music Appreciation', slug: 'genshin-impact-music-appreciation-1785815023129', content: '## Music\n\nThe music composed by Yu-Peng Chen for Genshin Impact is a work of art.', excerpt: 'The art of Yu-Peng Chen', category: CAT_GENSHIN },
    27: { title: 'Inazuma Exploration Guide', slug: 'inazuma-exploration-guide-1785815023130', content: '## Inazuma\n\nUnlock all Electroculi and domain locations.', excerpt: 'The nation of thunder', category: CAT_GENSHIN },
    28: { title: 'Sumeru Rainforest Side Quests', slug: 'sumeru-rainforest-side-quests-1785815023131', content: '## Sumeru\n\n20 easy-to-miss hidden side quests.', excerpt: 'Hidden quests', category: CAT_GENSHIN },
    29: { title: 'Genshin Impact Wish Rituals', slug: 'genshin-impact-wish-rituals-1785815023132', content: '## Wishes\n\nWishing at exactly 4 AM has the highest 5-star rate!', excerpt: 'Ritual time', category: CAT_GENSHIN },
    30: { title: 'Genshin Impact Artifact Sets for Every Character', slug: 'genshin-impact-artifact-sets-1785815079953', content: '## Main DPS\n\nHu Tao uses Crimson Witch, Ayaka uses Blizzard Strayer.', excerpt: 'Optimal artifact recommendations', category: CAT_GUIDE },
    31: { title: 'Genshin Impact Daily Commission Speedrun Route', slug: 'genshin-impact-daily-route-1785815079998', content: '## Route\n\nMondstadt → Liyue → Inazuma is the optimal order.', excerpt: 'Clear your dailies in 15 minutes', category: CAT_GUIDE },
    32: { title: 'Genshin Impact Co-op Domain Strategies', slug: 'genshin-impact-coop-domains-1785815080000', content: '## Stormterror\n\nUse platform mechanics to dodge AoE.', excerpt: 'Weekly boss speedrun guide', category: CAT_GUIDE },
  };
  for (const [id, f] of Object.entries(genshin)) {
    upd('blog_articles', Number(id), { title: f.title, slug: f.slug, content: f.content, excerpt: f.excerpt, category: f.category });
  }

  // GameHub official templates (id 33-42)
  const officialTemplates = {
    beginner: { titleSuffix: 'GameHub Official Blog', content: '## Basics\n\nLearn the core gameplay and controls.\n\n## Recommended Route\n\n1. Complete the main story quests\n2. Unlock key features', excerpt: 'Your gaming journey from zero', category: CAT_BLOG },
    comps:    { titleSuffix: 'GameHub Official Blog', content: '## Top Comps\n\nThe strongest team compositions in the current patch.\n\n- Main DPS\n- Support and buffer', excerpt: 'Team comps and character analysis', category: CAT_GUIDE },
    review:   { titleSuffix: 'GameHub Official Blog', content: '## Verdict 9/10\n\nGorgeous visuals and rich gameplay.\n\n## Pros & Cons\n\nPros: outstanding visuals\nCons: some repetitive quests', excerpt: 'A complete analysis of the gameplay experience', category: CAT_REVIEW },
    easter:   { titleSuffix: 'GameHub Official Blog', content: '## Chapter 1\n\nFind all hidden areas.\n\n## Rewards\n\nRare gear awaits.', excerpt: 'All hidden elements', category: CAT_GUIDE },
    patch:    { titleSuffix: 'GameHub Official Blog', content: '## New Features\n\n1. New characters released\n2. New map opened\n\n## Improvements\n\n- Combat balance adjustments', excerpt: 'Latest patch content', category: CAT_BLOG },
  };
  const officialPosts = {
    33: ['beginner', "Beginner's Guide"], 34: ['comps', 'Best Team Comps'], 35: ['review', 'In-Depth Review'],
    36: ['easter', 'Hidden Easter Eggs Collection'], 37: ['patch', 'Patch Notes Explained'],
    38: ['beginner', "Beginner's Guide", 'Genshin Impact'], 39: ['comps', 'Best Team Comps', 'Genshin Impact'],
    40: ['review', 'In-Depth Review', 'Genshin Impact'], 41: ['easter', 'Hidden Easter Eggs Collection', 'Genshin Impact'],
    42: ['patch', 'Patch Notes Explained', 'Genshin Impact'],
  };
  for (const [id, [key, baseTitle, suffix]] of Object.entries(officialPosts)) {
    const tpl = officialTemplates[key];
    const fullSuffix = suffix || tpl.titleSuffix;
    upd('blog_articles', Number(id), {
      title: `${baseTitle} - ${fullSuffix}`,
      content: tpl.content, excerpt: tpl.excerpt, category: tpl.category,
      tags: J(['Games','Guide']),
    });
  }

  // Per-game template posts (id 43-82)
  const gamePosts = [
    { ch: '黑神话悟空', en: 'Black Myth: Wukong', slug: 'black-myth-wukong' },
    { ch: '艾尔登法环', en: 'Elden Ring', slug: 'elden-ring' },
    { ch: '赛博朋克2077', en: 'Cyberpunk 2077', slug: 'cyberpunk-2077' },
    { ch: '博德之门3', en: "Baldur's Gate 3", slug: 'baldurs-gate-3' },
    { ch: '星露谷物语', en: 'Stardew Valley', slug: 'stardew-valley' },
    { ch: '空洞骑士', en: 'Hollow Knight', slug: 'hollow-knight' },
    { ch: '英雄联盟', en: 'League of Legends', slug: 'league-of-legends' },
    { ch: '我的世界', en: 'Minecraft', slug: 'minecraft' },
    { ch: '崩坏星穹铁道', en: 'Honkai: Star Rail', slug: 'honkai-star-rail' },
    { ch: 'CS2', en: 'CS2', slug: 'cs2' },
  ];
  let gid = 43;
  for (const g of gamePosts) {
    const posts = [
      { type: 'guide',  title: `Beginner's Guide - ${g.en}`, content: `## ${g.en}\n\nDetailed beginner's guide content.`, excerpt: "Beginner's Guide", category: CAT_GUIDE },
      { type: 'review', title: `Patch Notes - ${g.en}`, content: `## ${g.en}\n\nDetailed patch notes.`, excerpt: 'Patch notes', category: CAT_REVIEW },
      { type: 'blog',   title: `Best Characters - ${g.en}`, content: `## ${g.en}\n\nDetailed best-character recommendations.`, excerpt: 'Best character recommendations', category: CAT_BLOG },
      { type: 'guide',  title: `Hidden Collection Guide - ${g.en}`, content: `## ${g.en}\n\nDetailed hidden-collection guide.`, excerpt: 'Hidden collection guide', category: CAT_GUIDE },
    ];
    for (const p of posts) {
      const row = db.prepare('SELECT slug FROM blog_articles WHERE id = ?').get(gid);
      const newSlug = row && row.slug.startsWith(g.ch) ? g.slug + row.slug.slice(g.ch.length) : (row ? row.slug : null);
      const fields = { title: p.title, content: p.content, excerpt: p.excerpt, category: p.category };
      if (newSlug) fields.slug = newSlug;
      upd('blog_articles', gid, fields);
      gid++;
    }
  }

  // id 83 — 2026 most anticipated games list
  upd('blog_articles', 83, {
    title: 'The 10 Most Anticipated Games of 2026',
    content: "## Introduction\n\n2026 is shaping up to be one of the most exciting years in gaming history.\n\n## 1. Black Myth: Wukong DLC\n\nThe first DLC will expand the main story.\n\n## 2. GTA 6\n\nLaunching October 28.\n\n## 3. Elden Ring DLC\n\nOver 30 brand-new bosses.\n\n## 4-10. More blockbusters\n\nZelda DLC, Final Fantasy VII Part 3, Hollow Knight: Silksong, Ghost of Tsushima 2, Resident Evil 9, Death Stranding 2, and Baldur's Gate 3 Definitive Edition.\n\n## Closing\n\nWhich one are you most excited about? Leave a comment!",
    excerpt: 'A rundown of 10 blockbusters',
    category: CAT_GAME_NEWS,
  });

  // id 86 — junk pending post, category only
  upd('blog_articles', 86, { category: CAT_BLOGTECH });

  // ===================== blog_spaces =====================
  const spaces = {
    1:  { name: 'GameHub Official Blog', slug: 'gamehub-official-blog', description: 'Testing only' },
    2:  { name: 'Genshin Impact', slug: 'genshin-impact', description: 'Genshin Impact community' },
    3:  { name: 'Black Myth: Wukong', description: 'Journey of the Destined One to the West' },
    4:  { name: 'Elden Ring', description: 'The epic of the Tarnished' },
    5:  { name: 'Cyberpunk 2077', description: 'Legend of Night City' },
    6:  { name: "Baldur's Gate 3", description: 'A DnD epic' },
    7:  { name: 'Stardew Valley', description: 'Pastoral idyll' },
    8:  { name: 'Hollow Knight', description: 'Adventure in Hallownest' },
    9:  { name: 'League of Legends', description: "Summoner's Rift" },
    10: { name: 'Minecraft', description: 'Infinite creativity' },
    11: { name: 'Honkai: Star Rail', description: 'The Astral Express' },
    12: { name: 'CS2', description: 'Classic FPS' },
  };
  for (const [id, f] of Object.entries(spaces)) upd('blog_spaces', Number(id), f);

  // ===================== about_* =====================
  upd('about_contacts', 1, { label: 'Email' });
  upd('about_contacts', 2, { label: 'Business Cooperation' });
  upd('about_contacts', 3, { label: 'User Support' });

  upd('about_sections', 1, { title: 'About GameHub', description: 'GameHub is a community platform for gaming enthusiasts, dedicated to providing players with the best gaming news, reviews, discussion, and discovery experience.' });
  upd('about_sections', 2, { title: 'Our Mission', description: 'Connect gamers around the world and build an open, inclusive, and professional gaming community. We believe games are more than entertainment — they are a bridge connecting people and cultures. Through GameHub, we help players discover great games, share experiences, and build meaningful connections.' });
  upd('about_sections', 3, { title: 'Our Vision', description: "Become the world's most trusted gaming community platform, serving millions of gamers. We are building a comprehensive platform combining news, reviews, community, and marketplace, so every player can find their gaming home here." });

  const team = {
    1: { name: 'Wang Minchao', role: 'Founder', description: 'Founder of GameHub, overseeing company strategy and product direction.' },
    2: { name: 'Yang Junjie', role: 'Chief Technology Officer', description: 'Full-stack development expert, responsible for platform architecture and engineering management.' },
    3: { name: 'Bella', role: 'Content Director', description: 'Veteran gaming media professional, responsible for content strategy and operations.' },
    4: { name: 'Gu Zhifeng', role: 'Community Manager', description: 'Community operations expert, responsible for user growth and community ecosystem building.' },
  };
  for (const [id, f] of Object.entries(team)) upd('about_team_members', Number(id), f);

  const timeline = {
    1: { year: 'October 2025', title: 'Project Launch', description: 'GameHub project launched, product development begins' },
    2: { year: 'December 2025', title: 'Team Assembled', description: 'Core team assembled, product direction defined' },
    3: { year: '2026 Q1', title: 'Beta Launch', description: 'Platform beta launched, first users onboarded' },
    4: { year: 'May 2026', title: 'Official Release', description: 'Official release, open to gamers worldwide' },
  };
  for (const [id, f] of Object.entries(timeline)) upd('about_timeline', Number(id), f);

  const values = {
    1: { title: 'Players First', description: "We always put players' needs and experience first, striving to build the best gaming community platform." },
    2: { title: 'Innovation', description: 'We continuously explore and apply the latest technology to provide a smooth, intelligent gaming service platform.' },
    3: { title: 'Passion for Games', description: 'We are developers who love games, hoping to connect more gaming enthusiasts through our platform.' },
    4: { title: 'Pursuit of Excellence', description: 'We strive for the highest standards in content quality, user experience, and technology, never settling for the status quo.' },
  };
  for (const [id, f] of Object.entries(values)) upd('about_values', Number(id), f);
});

run();

const counts = {};
for (const t of ['games','news','news_categories','blog_articles','blog_spaces','reviews','about_contacts','about_sections','about_team_members','about_timeline','about_values']) {
  counts[t] = db.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get().c;
}
console.log('APPLIED. row counts:', JSON.stringify(counts));
db.close();
