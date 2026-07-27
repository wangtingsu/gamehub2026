-- 为 community_posts 表添加 game_id 字段（游戏论坛功能）
-- 允许帖子关联到特定游戏

ALTER TABLE community_posts ADD COLUMN game_id INTEGER REFERENCES games(id) ON DELETE SET NULL;
CREATE INDEX idx_community_posts_game_id ON community_posts(game_id);
