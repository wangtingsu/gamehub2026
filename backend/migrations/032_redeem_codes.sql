-- 兑换码系统
CREATE TABLE IF NOT EXISTS redeem_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  game_name TEXT,
  reward_type TEXT DEFAULT 'discount',  -- discount | free_game | points | item
  reward_value TEXT,
  min_order_amount REAL DEFAULT 0,
  usage_limit INTEGER DEFAULT 0,         -- 0 = 不限
  used_count INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  starts_at TEXT,
  expires_at TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 兑换记录
CREATE TABLE IF NOT EXISTS redeem_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code_id INTEGER NOT NULL REFERENCES redeem_codes(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  redeemed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_redeem_codes_code ON redeem_codes(code);
CREATE INDEX IF NOT EXISTS idx_redeem_codes_active ON redeem_codes(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_redeem_logs_user ON redeem_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_redeem_logs_code ON redeem_logs(code_id);
