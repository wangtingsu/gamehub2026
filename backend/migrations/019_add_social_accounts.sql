-- 社交账号关联表（统一管理所有第三方登录）
CREATE TABLE IF NOT EXISTS social_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  provider_username TEXT,
  provider_email TEXT,
  provider_avatar_url TEXT,
  provider_data TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id ON social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_provider ON social_accounts(provider, provider_account_id);

-- 添加 Apple 和 QQ/微信相关配置到系统配置表
INSERT OR IGNORE INTO system_configs (config_key, config_value, description) VALUES
  ('oauth.qq.enabled', 'false', 'QQ登录是否启用'),
  ('oauth.wechat.enabled', 'false', '微信登录是否启用'),
  ('oauth.apple.enabled', 'false', 'Apple ID登录是否启用');
