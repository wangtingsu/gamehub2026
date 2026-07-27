-- 为用户表添加 token_version 字段（支持令牌轮换和撤销）
ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0;

-- 注意：管理员用户种子数据将在 admin 登录路由首次使用时自动创建
-- 使用 bcrypt 哈希密码而非明文存储，确保安全
