-- Migration: 005_add_fulltext_search.sql
-- 添加SQLite全文搜索支持（简化版）

-- 为games表添加全文搜索列（使用TEXT类型，因为SQLite不支持tsvector）
ALTER TABLE games ADD COLUMN search_vector TEXT;

-- 为reviews表添加全文搜索列
ALTER TABLE reviews ADD COLUMN search_vector TEXT;

-- 为news表添加全文搜索列
ALTER TABLE news ADD COLUMN search_vector TEXT;

-- 为community_posts表添加全文搜索列
ALTER TABLE community_posts ADD COLUMN search_vector TEXT;

-- 为comments表添加全文搜索列
ALTER TABLE comments ADD COLUMN search_vector TEXT;

-- 注意：SQLite全文搜索需要使用FTS5虚拟表，这里只是添加占位列
-- 实际搜索功能需要通过其他方式实现