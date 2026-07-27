-- 添加用户认证相关缺失字段
-- OAuth社交登录、双因素认证、营销偏好和用户设置

-- OAuth社交登录字段
ALTER TABLE users ADD COLUMN google_id TEXT;
ALTER TABLE users ADD COLUMN github_id TEXT;
ALTER TABLE users ADD COLUMN facebook_id TEXT;
ALTER TABLE users ADD COLUMN twitter_id TEXT;

-- 双因素认证字段
ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN two_factor_secret TEXT;
ALTER TABLE users ADD COLUMN two_factor_backup_codes TEXT;
ALTER TABLE users ADD COLUMN two_factor_last_used TEXT;

-- 邮箱验证令牌字段
ALTER TABLE users ADD COLUMN verification_token TEXT;

-- 营销偏好字段
ALTER TABLE users ADD COLUMN marketing_opt_in INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN newsletter_subscription INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN email_preferences TEXT;
ALTER TABLE users ADD COLUMN notification_settings TEXT;
ALTER TABLE users ADD COLUMN privacy_settings TEXT;

-- 经验值和积分字段
ALTER TABLE users ADD COLUMN total_xp INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN total_points INTEGER DEFAULT 0;

-- 为社交登录ID创建索引
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);
CREATE INDEX IF NOT EXISTS idx_users_facebook_id ON users(facebook_id);
CREATE INDEX IF NOT EXISTS idx_users_twitter_id ON users(twitter_id);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
