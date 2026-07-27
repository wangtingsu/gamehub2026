-- 新闻分类表迁移
-- 迁移ID: 002
-- 描述: 创建新闻分类管理表

CREATE TABLE IF NOT EXISTS news_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认分类
INSERT OR IGNORE INTO news_categories (name, slug, description, sort_order) VALUES
  ('行业动态', 'industry', '游戏行业最新动态和新闻', 1),
  ('新作发布', 'new-releases', '新游戏发布和预告信息', 2),
  ('游戏更新', 'updates', '游戏版本更新和补丁说明', 3),
  ('赛事资讯', 'esports', '电竞赛事相关新闻', 4),
  ('硬件科技', 'hardware', '游戏硬件和技术相关新闻', 5),
  ('游戏文化', 'culture', '游戏文化、艺术和相关话题', 6);
