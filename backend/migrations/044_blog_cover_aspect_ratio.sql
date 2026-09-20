-- 044: 博客详情页头图宽高比配置
-- 前台博客/攻略/评测详情页顶部头图改用 aspect-ratio 布局，比例可在管理后台「系统配置」中调整
INSERT OR IGNORE INTO system_configs (config_key, config_value, description) VALUES
('blog.cover_aspect_ratio', '21/9', '博客详情页头图宽高比（宽/高，如 16/9、21/9、2/1、3/1）');
