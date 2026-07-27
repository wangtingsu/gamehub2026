-- Banner 横幅管理
CREATE TABLE IF NOT EXISTS banners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  position TEXT DEFAULT 'home',  -- home | games | news | ai
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 推荐内容（热门/最新/编辑精选/专题）
CREATE TABLE IF NOT EXISTS featured_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_type TEXT NOT NULL,  -- game | news | blog | review | guide
  content_id INTEGER NOT NULL,
  feature_type TEXT NOT NULL,  -- hot | latest | editor_pick | topic | banner
  topic_name TEXT,             -- 专题名称（feature_type=topic时使用）
  sort_order INTEGER DEFAULT 0,
  expires_at TEXT,             -- 过期时间
  created_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(content_type, content_id, feature_type)
);

-- 用户推荐记录（猜你喜欢）
CREATE TABLE IF NOT EXISTS user_recommendations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  content_id INTEGER NOT NULL,
  score REAL DEFAULT 0,
  reason TEXT,
  is_clicked INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
