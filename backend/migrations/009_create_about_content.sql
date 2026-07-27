-- 创建关于我们页面内容表
CREATE TABLE IF NOT EXISTS about_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS about_values (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  icon TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS about_team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  avatar_url TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS about_timeline (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year TEXT NOT NULL,
  title TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS about_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 插入默认数据
INSERT INTO about_sections (section_key, title, description, sort_order) VALUES
('hero', '关于 GameHub', 'GameHub 是一个专注于游戏爱好者的社区平台，我们致力于为玩家提供最好的游戏资讯、评测、交流和发现体验。', 1),
('mission', '我们的使命', '连接全球游戏爱好者，打造一个开放、包容、专业的游戏社区。我们相信游戏不仅仅是娱乐，更是连接人与人、文化与文化的桥梁。通过 GameHub，我们希望帮助玩家发现更多优质游戏，分享游戏体验，建立有意义的连接。', 2),
('vision', '我们的愿景', '成为全球最受玩家信赖的游戏社区平台，为数百万游戏爱好者提供最好的服务。我们致力于构建一个集游戏资讯、评测、社区、交易于一体的综合性平台，让每个玩家都能在这里找到属于自己的游戏家园。', 3);

INSERT INTO about_values (icon, title, description, sort_order) VALUES
('TeamOutlined', '玩家至上', '我们始终将玩家的需求和体验放在首位，致力于打造最优质的游戏社区平台。', 1),
('RocketOutlined', '技术创新', '不断探索和应用最新技术，为玩家提供流畅、智能的游戏服务平台。', 2),
('HeartOutlined', '热爱游戏', '我们是一群热爱游戏的开发者，希望通过我们的平台连接更多游戏爱好者。', 3),
('TrophyOutlined', '追求卓越', '在内容质量、用户体验和技术创新上追求极致，永不满足于现状。', 4);

INSERT INTO about_team_members (name, role, avatar_url, description, sort_order) VALUES
('张明', '创始人 & CEO', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop', '10年游戏行业经验，前腾讯游戏高级产品经理', 1),
('李华', '技术总监', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop', '全栈开发专家，专注于游戏平台架构设计', 2),
('王芳', '内容总监', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=200&auto=format&fit=crop', '资深游戏媒体人，前IGN中国编辑', 3),
('刘强', '社区经理', 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=200&auto=format&fit=crop', '电竞社区运营专家，擅长用户增长和活跃度提升', 4);

INSERT INTO about_timeline (year, title, description, sort_order) VALUES
('2024', '项目启动', 'GameHub 项目启动，团队组建完成', 1),
('2025 Q1', '天使轮融资', '完成天使轮融资，开始产品研发', 2),
('2025 Q3', '内测版上线', '平台内测版上线，获得首批1000名用户', 3),
('2026 Q1', '正式版发布', '正式版发布，用户突破10万', 4),
('2026 Q2', '移动端计划', '计划推出移动端App，拓展国际市场', 5);

INSERT INTO about_contacts (label, value, sort_order) VALUES
('邮箱', 'contact@gamehub.com', 1),
('商务合作', 'business@gamehub.com', 2),
('用户支持', 'support@gamehub.com', 3);
