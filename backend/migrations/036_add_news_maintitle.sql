-- Migration: 036_add_news_maintitle.sql
-- 新增新闻主标题列 maintitle，用于作为 URL slug 的后缀来源（替代原先的英文标题 title_en 作为 slug 来源）。
-- 执行器对 "duplicate column name" 会自动跳过，故幂等、无副作用。

ALTER TABLE news ADD COLUMN maintitle TEXT;
