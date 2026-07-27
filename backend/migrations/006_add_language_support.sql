-- Migration: 006_add_language_support.sql
-- 添加多语言支持

-- 为用户表添加language字段
ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'en';

-- 更新现有用户的语言字段（如果用户有last_login，则根据地理信息推断，否则使用默认值'en'）
UPDATE users SET language = 'en' WHERE language IS NULL;

-- 为游戏表添加多语言字段支持
-- 注意：这是一个简化的实现，实际生产环境可能需要更复杂的本地化表结构
-- 这里我们添加语言特定的字段，对于更复杂的需求可以使用单独的翻译表
ALTER TABLE games ADD COLUMN title_en TEXT;
ALTER TABLE games ADD COLUMN title_zh TEXT;
ALTER TABLE games ADD COLUMN title_ja TEXT;
ALTER TABLE games ADD COLUMN title_ko TEXT;
ALTER TABLE games ADD COLUMN title_es TEXT;
ALTER TABLE games ADD COLUMN title_fr TEXT;

ALTER TABLE games ADD COLUMN description_en TEXT;
ALTER TABLE games ADD COLUMN description_zh TEXT;
ALTER TABLE games ADD COLUMN description_ja TEXT;
ALTER TABLE games ADD COLUMN description_ko TEXT;
ALTER TABLE games ADD COLUMN description_es TEXT;
ALTER TABLE games ADD COLUMN description_fr TEXT;

-- 将现有数据迁移到英语字段（作为默认语言）
UPDATE games SET
  title_en = title,
  description_en = description
WHERE title_en IS NULL;

-- 为新闻表添加多语言字段支持
ALTER TABLE news ADD COLUMN title_en TEXT;
ALTER TABLE news ADD COLUMN title_zh TEXT;
ALTER TABLE news ADD COLUMN title_ja TEXT;
ALTER TABLE news ADD COLUMN title_ko TEXT;
ALTER TABLE news ADD COLUMN title_es TEXT;
ALTER TABLE news ADD COLUMN title_fr TEXT;

ALTER TABLE news ADD COLUMN content_en TEXT;
ALTER TABLE news ADD COLUMN content_zh TEXT;
ALTER TABLE news ADD COLUMN content_ja TEXT;
ALTER TABLE news ADD COLUMN content_ko TEXT;
ALTER TABLE news ADD COLUMN content_es TEXT;
ALTER TABLE news ADD COLUMN content_fr TEXT;

ALTER TABLE news ADD COLUMN excerpt_en TEXT;
ALTER TABLE news ADD COLUMN excerpt_zh TEXT;
ALTER TABLE news ADD COLUMN excerpt_ja TEXT;
ALTER TABLE news ADD COLUMN excerpt_ko TEXT;
ALTER TABLE news ADD COLUMN excerpt_es TEXT;
ALTER TABLE news ADD COLUMN excerpt_fr TEXT;

-- 将现有数据迁移到英语字段
UPDATE news SET
  title_en = title,
  content_en = content,
  excerpt_en = excerpt
WHERE title_en IS NULL;

-- 创建语言配置表（可选，用于存储支持的语言列表）
CREATE TABLE IF NOT EXISTS languages (
  code TEXT PRIMARY KEY, -- 语言代码，如 'en', 'zh-CN'
  name TEXT NOT NULL,    -- 语言名称，如 'English', '简体中文'
  native_name TEXT,      -- 本地语言名称，如 'English', '中文'
  is_active INTEGER DEFAULT 1, -- 是否激活
  is_default INTEGER DEFAULT 0, -- 是否为默认语言
  sort_order INTEGER DEFAULT 0, -- 排序顺序
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 插入支持的语言
INSERT OR IGNORE INTO languages (code, name, native_name, is_default, sort_order) VALUES
  ('en', 'English', 'English', 1, 1),
  ('zh-CN', 'Chinese (Simplified)', '简体中文', 0, 2),
  ('ja', 'Japanese', '日本語', 0, 3),
  ('ko', 'Korean', '한국어', 0, 4),
  ('es', 'Spanish', 'Español', 0, 5),
  ('fr', 'French', 'Français', 0, 6);

-- 创建游戏本地化表（可选，用于更复杂的本地化需求）
CREATE TABLE IF NOT EXISTS game_localizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  language_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  developer TEXT,
  publisher TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (language_code) REFERENCES languages(code) ON DELETE CASCADE,
  UNIQUE(game_id, language_code)
);

-- 创建新闻本地化表（可选）
CREATE TABLE IF NOT EXISTS news_localizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  news_id INTEGER NOT NULL,
  language_code TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE,
  FOREIGN KEY (language_code) REFERENCES languages(code) ON DELETE CASCADE,
  UNIQUE(news_id, language_code)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_language ON users(language);
CREATE INDEX IF NOT EXISTS idx_languages_is_active ON languages(is_active);
CREATE INDEX IF NOT EXISTS idx_game_localizations_game_lang ON game_localizations(game_id, language_code);
CREATE INDEX IF NOT EXISTS idx_news_localizations_news_lang ON news_localizations(news_id, language_code);

-- 迁移现有数据到本地化表（可选，如果需要更精细的本地化管理）
-- 注意：这是一个示例，实际执行可能需要根据数据量分批处理
-- INSERT OR IGNORE INTO game_localizations (game_id, language_code, title, description, developer, publisher)
-- SELECT id, 'en', title, description, developer, publisher FROM games;

-- INSERT OR IGNORE INTO news_localizations (news_id, language_code, title, content, excerpt)
-- SELECT id, 'en', title, content, excerpt FROM news;

