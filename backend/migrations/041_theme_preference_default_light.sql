-- 主题偏好默认值从 dark 改为 light（浅色主题作为默认）
-- 此前主题同步功能刚上线，现有用户的 theme_preference 均为旧默认 'dark'（无显式选择），统一切到新默认 'light'
UPDATE users SET theme_preference = 'light' WHERE theme_preference IS NULL OR theme_preference = 'dark';
