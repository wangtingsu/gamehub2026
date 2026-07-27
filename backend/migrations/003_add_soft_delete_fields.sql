-- 迁移ID: 003
-- 描述: 为所有表添加软删除、乐观锁和审计字段
-- 创建日期: 2026-04-21

-- 为用户表添加缺失字段
ALTER TABLE users ADD COLUMN deleted_at TEXT;
ALTER TABLE users ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN created_by INTEGER;
ALTER TABLE users ADD COLUMN updated_by INTEGER;

-- 为游戏表添加缺失字段
ALTER TABLE games ADD COLUMN deleted_at TEXT;
ALTER TABLE games ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE games ADD COLUMN created_by INTEGER;
ALTER TABLE games ADD COLUMN updated_by INTEGER;

-- 为评测表添加缺失字段
ALTER TABLE reviews ADD COLUMN deleted_at TEXT;
ALTER TABLE reviews ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE reviews ADD COLUMN created_by INTEGER;
ALTER TABLE reviews ADD COLUMN updated_by INTEGER;

-- 为新闻表添加缺失字段
ALTER TABLE news ADD COLUMN deleted_at TEXT;
ALTER TABLE news ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE news ADD COLUMN created_by INTEGER;
ALTER TABLE news ADD COLUMN updated_by INTEGER;

-- 为社区帖子表添加缺失字段
ALTER TABLE community_posts ADD COLUMN deleted_at TEXT;
ALTER TABLE community_posts ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE community_posts ADD COLUMN created_by INTEGER;
ALTER TABLE community_posts ADD COLUMN updated_by INTEGER;

-- 为评论表添加缺失字段
ALTER TABLE comments ADD COLUMN deleted_at TEXT;
ALTER TABLE comments ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE comments ADD COLUMN created_by INTEGER;
ALTER TABLE comments ADD COLUMN updated_by INTEGER;
ALTER TABLE comments ADD COLUMN parent_comment_id INTEGER; -- 嵌套评论支持

-- 为收藏表添加缺失字段
ALTER TABLE favorites ADD COLUMN deleted_at TEXT;
ALTER TABLE favorites ADD COLUMN version INTEGER DEFAULT 1;

