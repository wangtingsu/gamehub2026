-- 030: 用户关注游戏论坛
CREATE TABLE IF NOT EXISTS user_forum_follows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  forum_type TEXT NOT NULL DEFAULT 'game',
  forum_id TEXT NOT NULL,
  forum_name TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, forum_type, forum_id)
);
CREATE INDEX IF NOT EXISTS idx_forum_follows_user ON user_forum_follows(user_id);
