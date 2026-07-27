-- 用户标签与画像系统迁移
-- 迁移ID: 011
-- 描述: 创建用户标签、标签分配、用户分组、分组成员表

-- 1. 用户标签表
CREATE TABLE IF NOT EXISTS user_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(50) NOT NULL UNIQUE,
  color VARCHAR(7) DEFAULT '#1890ff',
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. 用户标签分配表
CREATE TABLE IF NOT EXISTS user_tag_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  assigned_by INTEGER,
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, tag_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES user_tags(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 3. 用户分组表
CREATE TABLE IF NOT EXISTS user_segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  criteria TEXT,
  is_dynamic INTEGER DEFAULT 0,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. 分组成员表
CREATE TABLE IF NOT EXISTS segment_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  segment_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  added_by INTEGER,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(segment_id, user_id),
  FOREIGN KEY (segment_id) REFERENCES user_segments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 5. 默认标签
INSERT OR IGNORE INTO user_tags (name, color, description) VALUES
('高活跃', '#52c41a', '登录频率高的活跃用户'),
('内容创作者', '#1890ff', '发布过较多评测或帖子的用户'),
('新用户', '#faad14', '注册时间不足30天的新用户'),
('核心玩家', '#722ed1', '游戏库丰富、参与度高的用户'),
('沉睡用户', '#d9d9d9', '超过30天未登录的潜在流失用户'),
('VIP', '#f5222d', '特殊贡献或付费用户');
