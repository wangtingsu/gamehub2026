-- 043: 为 blog_articles 增加攻略难度(difficulty)与预计时长(estimated_minutes)列
-- 后台攻略表单有 difficulty（必填）与 estimatedMinutes 字段，但此前无对应列，
-- 更新时这些字段被静默丢弃（表现为"显示修改成功但实际未保存"）。
-- 执行器对 "duplicate column name" 会自动跳过，故幂等。

ALTER TABLE blog_articles ADD COLUMN difficulty TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE blog_articles ADD COLUMN estimated_minutes INTEGER DEFAULT NULL;
