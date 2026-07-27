-- 添加索引以提高查询性能
-- 迁移ID: 002
-- 描述: 添加数据库索引

-- 游戏表索引
CREATE INDEX IF NOT EXISTS idx_games_title ON games(title);
CREATE INDEX IF NOT EXISTS idx_games_rating ON games(rating DESC);
CREATE INDEX IF NOT EXISTS idx_games_slug ON games(slug);

-- 评测表索引
CREATE INDEX IF NOT EXISTS idx_reviews_author_game ON reviews(author_id, game_id);
CREATE INDEX IF NOT EXISTS idx_reviews_game_id ON reviews(game_id);
CREATE INDEX IF NOT EXISTS idx_reviews_published_at ON reviews(published_at DESC);

-- 收藏表索引
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_game ON favorites(game_id);

-- 新闻表索引
CREATE INDEX IF NOT EXISTS idx_news_slug ON news(slug);
CREATE INDEX IF NOT EXISTS idx_news_category ON news(category);
CREATE INDEX IF NOT EXISTS idx_news_published ON news(published_at DESC) WHERE is_published = 1;

-- 社区帖子表索引
CREATE INDEX IF NOT EXISTS idx_community_posts_category ON community_posts(category);
CREATE INDEX IF NOT EXISTS idx_community_posts_published ON community_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_author ON community_posts(author_id);

-- 评论表索引
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_type, parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);