-- 迁移ID: 004
-- 描述: 创建关联表（点赞、关注、通知等）和添加游戏营销字段
-- 创建日期: 2026-04-21

-- 创建点赞表
CREATE TABLE IF NOT EXISTS likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('review', 'news', 'community_post', 'comment', 'game')),
  target_id INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  version INTEGER DEFAULT 1,
  UNIQUE(user_id, target_type, target_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建关注表
CREATE TABLE IF NOT EXISTS follows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  follower_id INTEGER NOT NULL,
  following_id INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  version INTEGER DEFAULT 1,
  UNIQUE(follower_id, following_id),
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建通知表
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'mention', 'system', 'marketing')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data TEXT, -- JSON格式的附加数据
  is_read INTEGER DEFAULT 0,
  read_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  version INTEGER DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建邮箱验证表
CREATE TABLE IF NOT EXISTS email_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  verified_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  version INTEGER DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建密码重置表
CREATE TABLE IF NOT EXISTS password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  version INTEGER DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建邮件模板表
CREATE TABLE IF NOT EXISTS email_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL CHECK (template_type IN ('verification', 'welcome', 'password_reset', 'newsletter', 'promotional', 'notification')),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  variables TEXT, -- JSON格式的变量列表
  is_active INTEGER DEFAULT 1,
  version_string TEXT DEFAULT '1.0.0',
  created_by INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER,
  deleted_at TEXT
);

-- 为游戏表添加营销字段
ALTER TABLE games ADD COLUMN promotional_tag TEXT;
ALTER TABLE games ADD COLUMN featured_until TEXT;
ALTER TABLE games ADD COLUMN discount_end_date TEXT;
ALTER TABLE games ADD COLUMN views INTEGER DEFAULT 0;
ALTER TABLE games ADD COLUMN wishlist_count INTEGER DEFAULT 0;
ALTER TABLE games ADD COLUMN purchase_count INTEGER DEFAULT 0;
ALTER TABLE games ADD COLUMN meta_title TEXT;
ALTER TABLE games ADD COLUMN meta_description TEXT;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_likes_user_target ON likes(user_id, target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_likes_target ON likes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(template_type, is_active);
CREATE INDEX IF NOT EXISTS idx_comments_parent_comment ON comments(parent_comment_id);