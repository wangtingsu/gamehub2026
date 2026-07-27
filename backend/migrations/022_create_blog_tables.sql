-- ============================================================
-- 022: 创建博客空间表和博客文章表 + 补充 reviews 缺失列
-- ============================================================
-- blog_spaces: 游戏专区卡片，每张卡片关联多篇博客文章
-- blog_articles: 独立的博客系统，与新闻表分离
-- reviews 扩展列: summary, pros, cons（在 runLegacyMigrations 中存在但初始迁移中缺失）
--
-- 这些表和列原本仅在 runLegacyMigrations() 中创建，
-- 但后续迁移（025）依赖它们，因此需要通过文件迁移来创建。
-- ============================================================

-- 为 reviews 表补充缺失的列（来自 runLegacyMigrations 但 001 迁移中未包含）
-- 使用宽松的错误处理：列可能已存在
ALTER TABLE reviews ADD COLUMN summary TEXT;
ALTER TABLE reviews ADD COLUMN pros TEXT;
ALTER TABLE reviews ADD COLUMN cons TEXT;

-- 博客空间表
CREATE TABLE IF NOT EXISTS blog_spaces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  cover_image_url TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 博客文章表
CREATE TABLE IF NOT EXISTS blog_articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  cover_image_url TEXT,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  space_id INTEGER NOT NULL REFERENCES blog_spaces(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT '博客',
  tags TEXT DEFAULT '[]',
  is_published INTEGER DEFAULT 0,
  is_pinned INTEGER DEFAULT 0,
  published_at TEXT,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  review_status TEXT NOT NULL DEFAULT 'pending',
  review_comment TEXT,
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TEXT,
  deleted_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
