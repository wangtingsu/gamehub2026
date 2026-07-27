-- 为 games 表添加 display_zone 字段
ALTER TABLE games ADD COLUMN display_zone VARCHAR(20) DEFAULT NULL;
