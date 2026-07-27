-- Migration: 013_add_search_logs.sql
-- 添加搜索日志表用于搜索趋势分析

-- 创建搜索日志表
CREATE TABLE IF NOT EXISTS search_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    result_count INTEGER DEFAULT 0,
    user_id TEXT,
    ip_address TEXT,
    filters TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引：按时间查询
CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON search_logs(created_at);

-- 索引：按关键词查询
CREATE INDEX IF NOT EXISTS idx_search_logs_query ON search_logs(query);

-- 索引：按用户查询
CREATE INDEX IF NOT EXISTS idx_search_logs_user_id ON search_logs(user_id);

-- 索引：复合索引用于趋势分析
CREATE INDEX IF NOT EXISTS idx_search_logs_query_date ON search_logs(query, created_at);
