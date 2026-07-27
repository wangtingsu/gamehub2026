-- 迁移ID: 014
-- 描述: 创建游戏化系统表（XP、积分、成就、私信）并扩展通知类型
-- 创建日期: 2026-04-25

-- ==================== 1. 用户表扩展 ====================
ALTER TABLE users ADD COLUMN total_xp INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN total_points INTEGER DEFAULT 0;

-- ==================== 2. 经验值事务表 ====================
CREATE TABLE IF NOT EXISTS xp_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  action_key TEXT NOT NULL,
  xp_amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reference_type TEXT,
  reference_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_action ON xp_transactions(user_id, action_key);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created ON xp_transactions(user_id, created_at DESC);

-- ==================== 3. 积分事务表 ====================
CREATE TABLE IF NOT EXISTS point_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  action_key TEXT NOT NULL,
  points_amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reference_type TEXT,
  reference_id INTEGER,
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created ON point_transactions(user_id, created_at DESC);

-- ==================== 4. 平台成就表 ====================
CREATE TABLE IF NOT EXISTS platform_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT,
  category TEXT NOT NULL CHECK (category IN ('social', 'content', 'growth', 'milestone')),
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL,
  xp_reward INTEGER DEFAULT 0,
  points_reward INTEGER DEFAULT 0,
  is_hidden INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  version INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS user_platform_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  achievement_id INTEGER NOT NULL,
  unlocked_at TEXT DEFAULT CURRENT_TIMESTAMP,
  notified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, achievement_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (achievement_id) REFERENCES platform_achievements(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_upa_user ON user_platform_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_upa_achievement ON user_platform_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_upa_unlocked ON user_platform_achievements(user_id, unlocked_at DESC);

-- 插入预定义成就
INSERT OR IGNORE INTO platform_achievements (key, name, description, category, requirement_type, requirement_value, xp_reward, points_reward, sort_order) VALUES
('first_review', '初次评测', '发表第一篇游戏评测', 'content', 'review_count', 1, 100, 50, 1),
('ten_reviews', '资深评测师', '发表10篇游戏评测', 'content', 'review_count', 10, 500, 200, 2),
('first_post', '初次发帖', '在社区发表第一个帖子', 'content', 'post_count', 1, 50, 20, 3),
('fifty_posts', '社区活跃分子', '在社区发表50个帖子', 'content', 'post_count', 50, 500, 200, 4),
('hundred_comments', '评论达人', '发表100条评论', 'content', 'comment_count', 100, 300, 100, 5),
('reach_level_5', '中级玩家', '达到等级5', 'growth', 'level', 5, 200, 100, 6),
('reach_level_10', '满级玩家', '达到等级10', 'growth', 'level', 10, 1000, 500, 7),
('thousand_xp', '经验累积', '累计获得1000点经验值', 'growth', 'xp_total', 1000, 200, 100, 8),
('ten_thousand_xp', '经验大师', '累计获得10000点经验值', 'growth', 'xp_total', 10000, 2000, 1000, 9),
('first_follower', '初获关注', '获得第一个关注者', 'social', 'follower_count', 1, 50, 20, 10),
('hundred_followers', '人气之星', '获得100个关注者', 'social', 'follower_count', 100, 500, 200, 11);

-- ==================== 5. 私信系统表 ====================
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject TEXT,
  type TEXT DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  last_message_at TEXT,
  last_message_preview TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  version INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  last_read_at TEXT DEFAULT CURRENT_TIMESTAMP,
  is_muted INTEGER DEFAULT 0,
  left_at TEXT,
  joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(conversation_id, user_id),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_cp_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_cp_conversation ON conversation_participants(conversation_id);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system')),
  reply_to_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  version INTEGER DEFAULT 1,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(conversation_id, created_at);

-- ==================== 6. 更新通知类型 ====================
-- 重建 notifications 表以扩展 type CHECK 约束
CREATE TABLE IF NOT EXISTS notifications_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'mention', 'system', 'marketing', 'new_message', 'achievement_unlocked', 'level_up')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data TEXT,
  is_read INTEGER DEFAULT 0,
  read_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  version INTEGER DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO notifications_new SELECT * FROM notifications;
DROP TABLE IF EXISTS notifications;
ALTER TABLE notifications_new RENAME TO notifications;

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
