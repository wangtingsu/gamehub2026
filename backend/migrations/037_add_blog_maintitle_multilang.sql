-- Migration: 037_add_blog_maintitle_multilang.sql
-- 为博客文章表 blog_articles 增加主标题列 maintitle（作为 URL slug 后缀来源）
-- 以及多语言翻译列（title_xx / content_xx / excerpt_xx，不含中文——中文对应基础列）。
-- 执行器对 "duplicate column name" 会自动跳过，故幂等、无副作用。

ALTER TABLE blog_articles ADD COLUMN maintitle TEXT;

ALTER TABLE blog_articles ADD COLUMN title_en TEXT;
ALTER TABLE blog_articles ADD COLUMN content_en TEXT;
ALTER TABLE blog_articles ADD COLUMN excerpt_en TEXT;

ALTER TABLE blog_articles ADD COLUMN title_ja TEXT;
ALTER TABLE blog_articles ADD COLUMN content_ja TEXT;
ALTER TABLE blog_articles ADD COLUMN excerpt_ja TEXT;

ALTER TABLE blog_articles ADD COLUMN title_ko TEXT;
ALTER TABLE blog_articles ADD COLUMN content_ko TEXT;
ALTER TABLE blog_articles ADD COLUMN excerpt_ko TEXT;

ALTER TABLE blog_articles ADD COLUMN title_es TEXT;
ALTER TABLE blog_articles ADD COLUMN content_es TEXT;
ALTER TABLE blog_articles ADD COLUMN excerpt_es TEXT;

ALTER TABLE blog_articles ADD COLUMN title_fr TEXT;
ALTER TABLE blog_articles ADD COLUMN content_fr TEXT;
ALTER TABLE blog_articles ADD COLUMN excerpt_fr TEXT;
