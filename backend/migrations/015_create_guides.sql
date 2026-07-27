-- 攻略指南功能迁移
-- 迁移ID: 015
-- 描述: 创建攻略指南表

CREATE TABLE IF NOT EXISTS guides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  difficulty TEXT DEFAULT 'medium',
  game_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL,
  cover_image_url TEXT,
  tags TEXT,
  steps TEXT,
  is_featured INTEGER DEFAULT 0,
  is_published INTEGER DEFAULT 1,
  likes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  estimated_minutes INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games(id),
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_guides_game_id ON guides(game_id);
CREATE INDEX IF NOT EXISTS idx_guides_author_id ON guides(author_id);
CREATE INDEX IF NOT EXISTS idx_guides_difficulty ON guides(difficulty);
CREATE INDEX IF NOT EXISTS idx_guides_is_featured ON guides(is_featured);
CREATE INDEX IF NOT EXISTS idx_guides_is_published ON guides(is_published);
CREATE INDEX IF NOT EXISTS idx_guides_created_at ON guides(created_at);
