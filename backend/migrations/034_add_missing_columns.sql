-- 034: 补齐 PG 有、SQLite 缺失的列（生产 PG 内联迁移与 SQLite migrations 的列级差异）
-- 这些列在生产 PostgreSQL 中存在（由 postgres.ts 内联迁移创建），
-- 但 SQLite 的 migrations/*.sql 未创建，导致查询报 "no such column"。

-- blog_spaces.game_id：博客空间关联的游戏 ID（可空）
ALTER TABLE blog_spaces ADD COLUMN game_id INTEGER;

-- guides.space_id：攻略关联的博客空间 ID（可空）
ALTER TABLE guides ADD COLUMN space_id INTEGER;

-- news.is_pinned：资讯是否置顶（bool，默认 false）
ALTER TABLE news ADD COLUMN is_pinned INTEGER DEFAULT 0;

-- news.game_name：资讯关联的游戏名（冗余字段，可空）
ALTER TABLE news ADD COLUMN game_name TEXT;

-- reviews.space_id：评测关联的博客空间 ID（可空）
ALTER TABLE reviews ADD COLUMN space_id INTEGER;

-- users.theme_preference：用户主题偏好（默认 dark）
ALTER TABLE users ADD COLUMN theme_preference TEXT DEFAULT 'dark';
