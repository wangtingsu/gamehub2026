-- 密码重置功能支持
-- 在用户表中添加密码重置字段

ALTER TABLE users ADD COLUMN reset_token TEXT;
ALTER TABLE users ADD COLUMN reset_token_expires TEXT;
