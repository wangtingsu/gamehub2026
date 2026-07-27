-- 部署管理和备份恢复功能
-- 迁移ID: 012
-- 描述: 创建部署记录表和备份记录表

-- 创建部署记录表
CREATE TABLE IF NOT EXISTS deployments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL,
  description TEXT,
  branch TEXT,
  commit_hash TEXT,
  status TEXT DEFAULT 'pending',
  deployer_id INTEGER,
  deployer_name TEXT,
  started_at TEXT,
  completed_at TEXT,
  rollback_version TEXT,
  log TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 创建备份记录表
CREATE TABLE IF NOT EXISTS backups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  type TEXT DEFAULT 'manual',
  status TEXT DEFAULT 'completed',
  description TEXT,
  operator_id INTEGER,
  operator_name TEXT,
  db_version TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
