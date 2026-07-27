-- 用户等级与权限系统迁移
-- 迁移ID: 010
-- 描述: 添加用户等级、登录追踪、审计日志、管理员监控、系统配置

-- 1. 用户表新增字段
ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN total_login_time REAL DEFAULT 0; -- 累计登录时长（分钟）
ALTER TABLE users ADD COLUMN phone TEXT;
ALTER TABLE users ADD COLUMN phone_verified INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN comment_frozen INTEGER DEFAULT 0; -- 评论功能是否被冻结
ALTER TABLE users ADD COLUMN frozen_until TEXT; -- 冻结截止时间

-- 2. 登录日志表
CREATE TABLE IF NOT EXISTS login_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  login_time TEXT NOT NULL,
  logout_time TEXT,
  duration_minutes REAL DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT,
  success INTEGER DEFAULT 1,
  fail_reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. 审计日志表
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL,         -- create, update, delete, login, role_change, etc.
  resource_type TEXT NOT NULL,  -- user, comment, review, system_config, etc.
  resource_id TEXT,
  details TEXT,                 -- JSON格式的详情
  ip_address TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. 管理员监控范围表
CREATE TABLE IF NOT EXISTS admin_monitoring_scopes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL,        -- 管理员用户ID
  monitored_user_id INTEGER,        -- 被监控的特定用户ID（NULL表示按部门/标签范围）
  scope_type TEXT NOT NULL DEFAULT 'user', -- user, department, tag
  scope_value TEXT,                 -- 部门名或标签名
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (monitored_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. 用户权限变更日志（管理员监控用）
CREATE TABLE IF NOT EXISTS user_permission_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_user_id INTEGER NOT NULL,
  changed_by INTEGER NOT NULL,
  change_type TEXT NOT NULL,  -- role_change, level_change, status_change, freeze, unfreeze
  old_value TEXT,
  new_value TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. 系统配置表
CREATE TABLE IF NOT EXISTS system_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_key TEXT UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  updated_by INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 7. 插入默认系统配置
INSERT OR IGNORE INTO system_configs (config_key, config_value, description) VALUES
('level.level2_hours', '10', '升到Lv.2所需累计登录时长(小时)'),
('level.level3_hours', '30', '升到Lv.3所需累计登录时长(小时)'),
('level.level4_hours', '100', '升到Lv.4所需累计登录时长(小时)'),
('level.level5_hours', '200', '升到Lv.5所需累计登录时长(小时)'),
('level.level6_hours', '400', '升到Lv.6所需累计登录时长(小时)'),
('level.level7_hours', '700', '升到Lv.7所需累计登录时长(小时)'),
('level.level8_hours', '1100', '升到Lv.8所需累计登录时长(小时)'),
('level.level9_hours', '1600', '升到Lv.9所需累计登录时长(小时)'),
('level.level10_hours', '2200', '升到Lv.10所需累计登录时长(小时)'),
('level.weight_base', '1', '评论权重基础分'),
('level.weight_coefficient', '0.5', '评论权重等级系数: 权重 = 基础分 + (等级-1) × 系数'),
('level.max_level', '10', '最高等级'),
('registration.email_enabled', 'true', '邮箱注册开关'),
('registration.phone_enabled', 'false', '手机注册开关');

-- 8. 更新已有用户的等级为默认值
UPDATE users SET level = 1 WHERE level IS NULL;
UPDATE users SET total_login_time = 0 WHERE total_login_time IS NULL;
UPDATE users SET comment_frozen = 0 WHERE comment_frozen IS NULL;
