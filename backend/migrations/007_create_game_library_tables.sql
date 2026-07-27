-- 创建游戏库相关表
-- 迁移ID: 007
-- 描述: 创建用户游戏库、游戏会话、游戏成就等表

-- 创建用户游戏库表
CREATE TABLE IF NOT EXISTS user_game_library (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  game_id INTEGER NOT NULL,
  game_title TEXT NOT NULL,
  game_slug TEXT NOT NULL,

  -- 状态管理
  status TEXT NOT NULL DEFAULT 'wishlist', -- 'wishlist', 'owned', 'playing', 'completed', 'abandoned', 'on_hold'
  added_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_played_at TEXT,
  status_updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

  -- 平台拥有情况 (JSON格式)
  platforms TEXT DEFAULT '[]',

  -- 个人评分和笔记
  personal_rating REAL,
  personal_notes TEXT,
  tags TEXT DEFAULT '[]', -- 用户自定义标签

  -- 主要平台
  primary_platform TEXT,

  -- 时间戳
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

  -- 软删除
  deleted_at TEXT,

  -- 乐观锁版本
  version INTEGER DEFAULT 1,

  -- 约束
  UNIQUE(user_id, game_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- 创建游戏会话表
CREATE TABLE IF NOT EXISTS game_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  game_id INTEGER NOT NULL,
  platform_type TEXT NOT NULL, -- 'pc', 'playstation', 'xbox', 'nintendo', 'mobile', 'vr', 'cloud'
  platform_name TEXT NOT NULL,

  -- 会话时间
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration INTEGER, -- 秒数，计算得出

  -- 会话信息
  session_type TEXT, -- 'singleplayer', 'multiplayer', 'coop'
  players TEXT DEFAULT '[]', -- 一起游玩的用户ID列表 (JSON格式)
  notes TEXT,

  -- 自动追踪数据
  auto_tracked INTEGER DEFAULT 0,
  source TEXT, -- 'manual', 'steam', 'playstation', 'xbox', 'nintendo'

  -- 时间戳
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

  -- 软删除
  deleted_at TEXT,

  -- 乐观锁版本
  version INTEGER DEFAULT 1,

  -- 约束
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- 创建游戏成就表
CREATE TABLE IF NOT EXISTS game_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  external_id TEXT, -- 平台成就ID，如Steam成就ID

  -- 成就信息
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT,
  hidden INTEGER DEFAULT 0,

  -- 成就详情
  points INTEGER NOT NULL DEFAULT 0,
  rarity REAL, -- 稀有度百分比
  category TEXT, -- 分类，如 "故事", "挑战", "收集"

  -- 解锁条件
  unlock_condition TEXT,
  unlock_percentage REAL, -- 全球解锁百分比

  -- 时间戳
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

  -- 软删除
  deleted_at TEXT,

  -- 乐观锁版本
  version INTEGER DEFAULT 1,

  -- 约束
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  UNIQUE(game_id, external_id)
);

-- 创建用户成就表
CREATE TABLE IF NOT EXISTS user_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  game_id INTEGER NOT NULL,
  achievement_id INTEGER NOT NULL,

  -- 解锁信息
  unlocked INTEGER DEFAULT 0,
  unlocked_at TEXT,
  unlock_platform TEXT, -- 'pc', 'playstation', 'xbox', 'nintendo', 'mobile', 'vr', 'cloud'

  -- 进度追踪（用于进度型成就）
  progress REAL,
  target REAL,
  progress_updated_at TEXT,

  -- 时间戳
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

  -- 软删除
  deleted_at TEXT,

  -- 乐观锁版本
  version INTEGER DEFAULT 1,

  -- 约束
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (achievement_id) REFERENCES game_achievements(id) ON DELETE CASCADE,
  UNIQUE(user_id, achievement_id)
);

-- 为现有表添加索引以提高查询性能

-- 用户游戏库索引
CREATE INDEX IF NOT EXISTS idx_user_game_library_user_id ON user_game_library(user_id);
CREATE INDEX IF NOT EXISTS idx_user_game_library_game_id ON user_game_library(game_id);
CREATE INDEX IF NOT EXISTS idx_user_game_library_status ON user_game_library(status);
CREATE INDEX IF NOT EXISTS idx_user_game_library_primary_platform ON user_game_library(primary_platform);

-- 游戏会话索引
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_id ON game_sessions(game_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_start_time ON game_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_game_sessions_platform_type ON game_sessions(platform_type);

-- 游戏成就索引
CREATE INDEX IF NOT EXISTS idx_game_achievements_game_id ON game_achievements(game_id);
CREATE INDEX IF NOT EXISTS idx_game_achievements_external_id ON game_achievements(external_id);
CREATE INDEX IF NOT EXISTS idx_game_achievements_category ON game_achievements(category);

-- 用户成就索引
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_game_id ON user_achievements(game_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON user_achievements(unlocked);