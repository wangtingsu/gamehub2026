-- 添加 verification_token_expires 字段到 users 表
ALTER TABLE users ADD COLUMN verification_token_expires TEXT;

-- 为电话号码添加唯一索引（允许空值）
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
