-- 评测扩展迁移
-- 迁移ID: 003
-- 描述: 添加多维评分支持和评测模板系统

-- 为评测表添加子评分维度字段（JSON格式存储子维度评分）
ALTER TABLE reviews ADD COLUMN scores TEXT;

-- 创建评测模板表
CREATE TABLE IF NOT EXISTS review_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  sections TEXT NOT NULL,
  default_scores TEXT,
  score_dimensions TEXT,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认评测模板
INSERT OR IGNORE INTO review_templates (name, description, sections, default_scores, score_dimensions, sort_order) VALUES
(
  '标准评测模板',
  '包含评分、优缺点和总结的标准评测模板',
  '[{"key":"pros","title":"优点","type":"list","placeholder":"逐条列出游戏优点"},{"key":"cons","title":"缺点","type":"list","placeholder":"逐条列出游戏缺点"},{"key":"verdict","title":"总结","type":"textarea","placeholder":"给出最终评价和推荐理由"}]',
  '{"gameplay":3.5,"graphics":3.5,"story":3.5,"audio":3.5,"replayability":3.0}',
  '[{"key":"gameplay","label":"游戏性","description":"玩法、操作手感、游戏机制"},{"key":"graphics","label":"画面表现","description":"图形质量、美术风格、视觉效果"},{"key":"story","label":"剧情叙事","description":"故事情节、角色塑造、世界观"},{"key":"audio","label":"音效音乐","description":"背景音乐、音效设计、配音质量"},{"key":"replayability","label":"重复可玩性","description":"内容丰富度、多周目体验"}]',
  1
),
(
  '深度评测模板',
  '适合长篇深度分析的专业评测模板',
  '[{"key":"pros","title":"优点","type":"list","placeholder":"逐条列出游戏优点"},{"key":"cons","title":"缺点","type":"list","placeholder":"逐条列出游戏缺点"},{"key":"gameplay_analysis","title":"玩法分析","type":"textarea","placeholder":"深入分析游戏玩法机制"},{"key":"story_analysis","title":"剧情分析","type":"textarea","placeholder":"分析游戏剧情和叙事"},{"key":"technical","title":"技术表现","type":"textarea","placeholder":"评价画面、性能、优化等技术方面"},{"key":"verdict","title":"最终评价","type":"textarea","placeholder":"综合评定和推荐"}]',
  '{"gameplay":3.5,"graphics":3.5,"story":3.5,"audio":3.5,"replayability":3.0}',
  '[{"key":"gameplay","label":"游戏性","description":"玩法、操作手感、游戏机制"},{"key":"graphics","label":"画面表现","description":"图形质量、美术风格、视觉效果"},{"key":"story","label":"剧情叙事","description":"故事情节、角色塑造、世界观"},{"key":"audio","label":"音效音乐","description":"背景音乐、音效设计、配音质量"},{"key":"replayability","label":"重复可玩性","description":"内容丰富度、多周目体验"}]',
  2
),
(
  '快速评测模板',
  '简短精炼的快速评测模板',
  '[{"key":"pros","title":"优点","type":"list","placeholder":"简要列出优点"},{"key":"cons","title":"缺点","type":"list","placeholder":"简要列出缺点"},{"key":"verdict","title":"一句话总结","type":"textarea","placeholder":"用一句话总结游戏体验"}]',
  '{"gameplay":3.5,"graphics":3.5,"story":3.5,"audio":3.5,"replayability":3.0}',
  '[{"key":"gameplay","label":"游戏性","description":"玩法、操作手感、游戏机制"},{"key":"graphics","label":"画面表现","description":"图形质量、美术风格、视觉效果"},{"key":"story","label":"剧情叙事","description":"故事情节、角色塑造、世界观"},{"key":"audio","label":"音效音乐","description":"背景音乐、音效设计、配音质量"},{"key":"replayability","label":"重复可玩性","description":"内容丰富度、多周目体验"}]',
  3
);
