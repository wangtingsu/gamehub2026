-- 043: 完成三表合并 —— blog_articles 统一承载博客/攻略/评测
-- 1) 补齐 reviews/guides 独有、但 blog_articles 缺失的字段（防止删表后丢失）
-- 2) post_type 重命名为 blog_article_type
-- 3) 删除已废弃的 reviews / guides 表（数据已由 025 迁入）

ALTER TABLE blog_articles ADD COLUMN summary TEXT;
ALTER TABLE blog_articles ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0;
ALTER TABLE blog_articles ADD COLUMN steps TEXT;
ALTER TABLE blog_articles ADD COLUMN scores TEXT;
ALTER TABLE blog_articles ADD COLUMN search_vector TEXT;
ALTER TABLE blog_articles ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE blog_articles ADD COLUMN created_by INTEGER;
ALTER TABLE blog_articles ADD COLUMN updated_by INTEGER;

ALTER TABLE blog_articles RENAME COLUMN post_type TO blog_article_type;

DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS guides;
