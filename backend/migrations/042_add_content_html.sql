-- 042: 为 blog_articles 与 news 增加 content_html（及多语言）列
-- 用于存储后台保存时由 markdown 转换成的规范 HTML（目录 + 标题锚点 + 配图）。
-- 与 content / content_xx 一一对应；中文对应基础列 content_html。
-- 执行器对 "duplicate column name" 会自动跳过，故幂等、无副作用。

ALTER TABLE blog_articles ADD COLUMN content_html TEXT DEFAULT NULL;
ALTER TABLE blog_articles ADD COLUMN content_html_en TEXT DEFAULT NULL;
ALTER TABLE blog_articles ADD COLUMN content_html_ja TEXT DEFAULT NULL;
ALTER TABLE blog_articles ADD COLUMN content_html_ko TEXT DEFAULT NULL;
ALTER TABLE blog_articles ADD COLUMN content_html_es TEXT DEFAULT NULL;
ALTER TABLE blog_articles ADD COLUMN content_html_fr TEXT DEFAULT NULL;

ALTER TABLE news ADD COLUMN content_html TEXT DEFAULT NULL;
ALTER TABLE news ADD COLUMN content_html_en TEXT DEFAULT NULL;
ALTER TABLE news ADD COLUMN content_html_ja TEXT DEFAULT NULL;
ALTER TABLE news ADD COLUMN content_html_ko TEXT DEFAULT NULL;
ALTER TABLE news ADD COLUMN content_html_es TEXT DEFAULT NULL;
ALTER TABLE news ADD COLUMN content_html_fr TEXT DEFAULT NULL;
