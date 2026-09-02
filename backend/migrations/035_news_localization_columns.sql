-- Migration: 035_news_localization_columns.sql
-- 防御性迁移：确保 news 表存在多语言翻译列（title_xx / content_xx / excerpt_xx）。
-- 迁移 006 已添加这些列，本文件重复声明以兼容未执行 006 的旧库；
-- 执行器对 "duplicate column name" 会自动跳过，故幂等、无副作用。
-- 注意：中文（zh）对应基础列 title/content/excerpt，不在此翻译列集合内。

ALTER TABLE news ADD COLUMN title_en TEXT;
ALTER TABLE news ADD COLUMN content_en TEXT;
ALTER TABLE news ADD COLUMN excerpt_en TEXT;

ALTER TABLE news ADD COLUMN title_ja TEXT;
ALTER TABLE news ADD COLUMN content_ja TEXT;
ALTER TABLE news ADD COLUMN excerpt_ja TEXT;

ALTER TABLE news ADD COLUMN title_ko TEXT;
ALTER TABLE news ADD COLUMN content_ko TEXT;
ALTER TABLE news ADD COLUMN excerpt_ko TEXT;

ALTER TABLE news ADD COLUMN title_es TEXT;
ALTER TABLE news ADD COLUMN content_es TEXT;
ALTER TABLE news ADD COLUMN excerpt_es TEXT;

ALTER TABLE news ADD COLUMN title_fr TEXT;
ALTER TABLE news ADD COLUMN content_fr TEXT;
ALTER TABLE news ADD COLUMN excerpt_fr TEXT;
