-- 040: 为 FAQ 增加多语言列（faq_en/ja/ko/es/fr）
-- 与 title_xx/content_xx/excerpt_xx 多语言列保持一致；中文对应基础列 faq。
-- 每列存储 JSON 数组 [{ question, answer }]，供对应语言详情页输出 FAQPage 结构化数据。
-- 执行器对 "duplicate column name" 会自动跳过，故幂等、无副作用。

ALTER TABLE blog_articles ADD COLUMN faq_en TEXT DEFAULT NULL;
ALTER TABLE blog_articles ADD COLUMN faq_ja TEXT DEFAULT NULL;
ALTER TABLE blog_articles ADD COLUMN faq_ko TEXT DEFAULT NULL;
ALTER TABLE blog_articles ADD COLUMN faq_es TEXT DEFAULT NULL;
ALTER TABLE blog_articles ADD COLUMN faq_fr TEXT DEFAULT NULL;

ALTER TABLE news ADD COLUMN faq_en TEXT DEFAULT NULL;
ALTER TABLE news ADD COLUMN faq_ja TEXT DEFAULT NULL;
ALTER TABLE news ADD COLUMN faq_ko TEXT DEFAULT NULL;
ALTER TABLE news ADD COLUMN faq_es TEXT DEFAULT NULL;
ALTER TABLE news ADD COLUMN faq_fr TEXT DEFAULT NULL;
