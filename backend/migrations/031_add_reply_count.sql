-- 031: 添加评论回复计数字段
ALTER TABLE comments ADD COLUMN reply_count INTEGER DEFAULT 0;
