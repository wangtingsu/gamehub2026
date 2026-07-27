-- SMS验证码表
CREATE TABLE IF NOT EXISTS sms_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'login' CHECK (type IN ('login', 'register', 'bind', 'unbind')),
  expires_at TEXT NOT NULL,
  verified_at TEXT,
  attempt_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_codes_phone ON sms_codes(phone);
CREATE INDEX IF NOT EXISTS idx_sms_codes_phone_type ON sms_codes(phone, type);
CREATE INDEX IF NOT EXISTS idx_sms_codes_expires ON sms_codes(expires_at);
