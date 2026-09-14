-- 039: 为新闻表 news 增加 FAQ 列
-- 存储 JSON 数组 [{ question, answer }]，供新闻详情页输出 FAQPage 结构化数据。
-- 执行器对 "duplicate column name" 会自动跳过，故幂等、无副作用。

ALTER TABLE news ADD COLUMN faq TEXT DEFAULT '[]';
