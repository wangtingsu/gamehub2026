-- 033: 补齐 SQLite 缺失的表（与 postgres.ts 对齐）
-- 这些表在 postgres.ts 中存在，但 SQLite 的 migrations 目录缺失：
--   1. blog_likes / blog_favorites（博客点赞/收藏）
--   2. newsletter_subscriptions（邮件订阅）
--   3. pending_registrations（邮箱验证待注册用户，此前两套 schema 都缺失，属 bug 修复）
--   4. marketing_campaigns（营销活动，此前两套 schema 都缺失）

-- 博客点赞表
CREATE TABLE IF NOT EXISTS blog_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id INTEGER NOT NULL REFERENCES blog_articles(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, article_id)
);

-- 博客收藏表
CREATE TABLE IF NOT EXISTS blog_favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id INTEGER NOT NULL REFERENCES blog_articles(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, article_id)
);

-- 邮件订阅表
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  subscription_type TEXT NOT NULL DEFAULT 'newsletter',
  is_active INTEGER DEFAULT 1,
  subscribed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at TEXT,
  preferences TEXT DEFAULT '{}',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  version INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_email ON newsletter_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_user_id ON newsletter_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_active ON newsletter_subscriptions(is_active);

-- 待注册用户表（邮箱验证注册流程，auth.service.ts 使用）
CREATE TABLE IF NOT EXISTS pending_registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  verification_token TEXT,
  token_expires_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_email ON pending_registrations(email);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_token ON pending_registrations(verification_token);

-- 营销活动表（MarketingCampaignModel 使用）
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT NOT NULL DEFAULT 'newsletter',
  target_audience TEXT DEFAULT '{}',
  content TEXT DEFAULT '{}',
  schedule TEXT DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  stats TEXT DEFAULT '{}',
  created_by INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  version INTEGER DEFAULT 1
);
