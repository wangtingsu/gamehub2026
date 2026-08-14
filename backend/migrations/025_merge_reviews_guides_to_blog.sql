-- 025: 合并测评和攻略到博客文章表，统一社区论坛结构
-- 1. 为 blog_articles 添加 post_type 字段（blog/review/guide）
-- 2. 为 blog_articles 添加 game_id 字段
-- 3. 迁移 reviews 数据到 blog_articles
-- 4. 迁移 guides 数据到 blog_articles

-- Step 1: 添加 post_type 列
ALTER TABLE blog_articles ADD COLUMN post_type TEXT NOT NULL DEFAULT 'blog';
ALTER TABLE blog_articles ADD COLUMN game_id INTEGER REFERENCES games(id) ON DELETE SET NULL;
ALTER TABLE blog_articles ADD COLUMN rating REAL;
ALTER TABLE blog_articles ADD COLUMN pros TEXT;
ALTER TABLE blog_articles ADD COLUMN cons TEXT;

-- Step 2: 迁移 reviews → blog_articles (post_type='review')
INSERT INTO blog_articles (title, slug, content, excerpt, cover_image_url, author_id, space_id, category, tags, is_published, is_pinned, published_at, views, likes, comments, review_status, created_at, updated_at, post_type, game_id, rating, pros, cons)
SELECT
  r.title,
  'review-' || r.id || '-' || substr(hex(randomblob(4)),1,8) as slug,
  r.content,
  r.summary as excerpt,
  (SELECT g.cover_image_url FROM games g WHERE g.id = r.game_id) as cover_image_url,
  r.author_id,
  (SELECT COALESCE(bs.id, (SELECT id FROM blog_spaces WHERE slug='reviews' LIMIT 1), 1) FROM blog_spaces bs WHERE bs.slug = 'reviews' LIMIT 1) as space_id,
  '评测' as category,
  '[]' as tags,
  1 as is_published,
  r.is_featured as is_pinned,
  r.created_at as published_at,
  0 as views,
  r.likes,
  r.comments,
  r.review_status,
  r.created_at,
  r.updated_at,
  'review' as post_type,
  r.game_id,
  r.rating,
  r.pros,
  r.cons
FROM reviews r
WHERE NOT EXISTS (SELECT 1 FROM blog_articles ba WHERE ba.title = r.title AND ba.author_id = r.author_id AND ba.post_type = 'review');

-- Step 3: 迁移 guides → blog_articles (post_type='guide')
INSERT INTO blog_articles (title, slug, content, excerpt, cover_image_url, author_id, space_id, category, tags, is_published, is_pinned, published_at, views, likes, comments, review_status, created_at, updated_at, post_type, game_id)
SELECT
  g.title,
  'guide-' || g.id || '-' || substr(hex(randomblob(4)),1,8) as slug,
  g.content,
  g.summary as excerpt,
  g.cover_image_url,
  g.author_id,
  (SELECT COALESCE(bs.id, (SELECT id FROM blog_spaces WHERE slug='guides' LIMIT 1), 1) FROM blog_spaces bs WHERE bs.slug = 'guides' LIMIT 1) as space_id,
  '攻略' as category,
  '[]' as tags,
  1 as is_published,
  0 as is_pinned,
  g.created_at as published_at,
  0 as views,
  g.likes,
  0 as comments,
  'approved' as review_status,
  g.created_at,
  g.updated_at,
  'guide' as post_type,
  g.game_id
FROM guides g
WHERE NOT EXISTS (SELECT 1 FROM blog_articles ba WHERE ba.title = g.title AND ba.author_id = g.author_id AND ba.post_type = 'guide');

-- Step 4: 确保 'reviews' 和 'guides' blog_spaces 存在
INSERT OR IGNORE INTO blog_spaces (name, slug, description, sort_order) VALUES ('评测', 'reviews', '游戏评测文章', 10);
INSERT OR IGNORE INTO blog_spaces (name, slug, description, sort_order) VALUES ('攻略', 'guides', '游戏攻略指南', 20);

-- Step 5: 创建索引
CREATE INDEX IF NOT EXISTS idx_blog_articles_post_type ON blog_articles(post_type);
CREATE INDEX IF NOT EXISTS idx_blog_articles_game_id ON blog_articles(game_id);
