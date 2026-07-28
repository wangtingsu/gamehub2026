/**
 * SQLite 数据库模块
 *
 * 基于 better-sqlite3 的 SQLite 数据库实现，是 GameHub 后端的默认数据库方案。
 * 提供数据库连接管理、查询执行、事务处理、健康检查、迁移管理等完整功能。
 *
 * 特性：
 * - 自动创建数据目录和数据库文件
 * - 连接失败自动重试（最多 3 次）
 * - WAL 模式提升并发读取性能
 * - 启用外键约束保证数据完整性
 * - 自动执行数据库迁移
 *
 * @module db/sqlite
 */

import Database from 'better-sqlite3';
import config from '../config';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs';

/**
 * 数据文件存储目录
 * 存放 SQLite 数据库文件和迁移脚本
 */
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/** 数据库文件完整路径 */
const dbPath = config.database.path || path.join(dataDir, 'gamehub.db');

/** better-sqlite3 数据库实例 */
let db: Database.Database | null = null;

/** 是否正在建立连接（用于防重入） */
let isConnecting = false;

/** 当前连接尝试次数 */
let connectionAttempts = 0;

/** 最大连接重试次数 */
const MAX_CONNECTION_ATTEMPTS = 3;

/** 当前正在进行的连接 Promise（用于等待并发请求） */
let connectionPromise: Promise<void> | null = null;

/**
 * 连接 SQLite 数据库
 *
 * 建立与 SQLite 数据库文件的连接。如果数据库文件不存在将自动创建。
 * 支持：
 * - 连接复用：已连接则直接返回
 * - 断线重连：健康检查失败时自动清理并重连
 * - 并发等待：多个请求同时到达时共享同一个连接 Promise
 * - 自动重试：连接失败最多重试 MAX_CONNECTION_ATTEMPTS 次
 * - 自动迁移：连接成功立即运行迁移脚本
 *
 * @returns {Promise<void>} 连接完成后 resolve
 * @throws {Error} 达到最大重试次数后抛出错误
 */
export const connectDatabase = async (): Promise<void> => {
  /** 如果已经连接，直接返回 */
  if (db) {
    try {
      /** 快速健康检查，确保连接仍然有效 */
      db.prepare('SELECT 1').get();
      logger.debug('数据库已经连接且健康');
      return;
    } catch (error) {
      logger.warn('数据库连接似乎已断开，尝试重新连接', { error });
      db = null;
      connectionPromise = null;
    }
  }

  /** 如果正在连接中，返回现有的Promise */
  if (connectionPromise) {
    logger.debug('数据库连接正在进行中，等待现有连接完成');
    await connectionPromise;
    return;
  }

  /** 创建新的连接Promise */
  connectionPromise = (async () => {
    isConnecting = true;
    connectionAttempts++;

    try {
      logger.info(`正在连接SQLite数据库 (尝试 ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS}): ${dbPath}`);

      db = new Database(dbPath, {
        verbose: config.nodeEnv === 'development' ? logger.debug : undefined,
      });

      /** 启用外键约束 */
      db.pragma('foreign_keys = ON');

      /** 启用WAL模式提高性能 */
      db.pragma('journal_mode = WAL');

      /** 设置繁忙超时，避免多进程同时访问时立即报错 */
      db.pragma('busy_timeout = 5000');
      /** WAL 自动 checkpoint，每 1000 页触发一次，防止 WAL 文件膨胀导致查询变慢 */
      db.pragma('wal_autocheckpoint = 1000');

      logger.info(`SQLite数据库连接成功: ${dbPath}`);
      logger.debug('数据库连接详情', {
        path: dbPath,
        foreignKeys: 'ON',
        journalMode: 'WAL',
        verboseLogging: config.nodeEnv === 'development'
      });

      /** 运行迁移 */
      await runMigrations();

      /** 重置连接尝试计数 */
      connectionAttempts = 0;
    } catch (error) {
      logger.error(`SQLite数据库连接失败 (尝试 ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS}):`, {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        dbPath
      });

      /** 如果达到最大尝试次数，抛出错误 */
      if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
        logger.error(`达到最大连接尝试次数 (${MAX_CONNECTION_ATTEMPTS})，放弃连接`);
        throw new Error(`无法连接数据库，已尝试 ${connectionAttempts} 次`);
      }

      /** 否则清除状态，允许重试 */
      db = null;
      throw error;
    } finally {
      isConnecting = false;
      connectionPromise = null;
    }
  })();

  try {
    await connectionPromise;
  } catch (error) {
    /** 错误已经在内部处理并重新抛出 */
    throw error;
  }
};

/**
 * 获取 SQLite 数据库连接实例
 *
 * @returns {Database.Database} better-sqlite3 Database 实例
 * @throws {Error} 数据库未连接时抛出错误
 */
export const getConnection = (): Database.Database => {
  if (!db) {
    throw new Error('数据库未连接');
  }
  return db;
};

/**
 * 执行数据库查询（读取操作）
 *
 * 执行 SELECT 语句并返回结果行数组。
 * 如果数据库尚未连接，会自动尝试重连。
 * 使用参数化查询防止 SQL 注入。
 *
 * @typeparam T - 结果行的类型，默认为 any
 * @param {string} sql - SQL 查询语句
 * @param {any[]} [params=[]] - 查询参数数组，与 SQL 中的 ? 占位符对应
 * @returns {Promise<T[]>} 查询结果行数组
 * @throws {Error} 数据库未连接且重连失败时抛出错误
 */
export const query = async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
  if (!db) {
    /** 尝试重新连接数据库 */
    await connectDatabase();
  }

  if (!db) {
    throw new Error('数据库未连接');
  }

  // 将 PostgreSQL 风格的 $N 占位符转换为 SQLite 的 ? 占位符
  const convertedSql = sql.replace(/\$\d+/g, '?');

  const start = Date.now();
  try {
    const stmt = db.prepare(convertedSql);
    const result = params.length > 0 ? stmt.all(...params) : stmt.all();
    const duration = Date.now() - start;

    logger.debug('数据库查询执行', {
      query: sql,
      params,
      duration: `${duration}ms`,
      rows: Array.isArray(result) ? result.length : 0,
    });

    return result as T[];
  } catch (error) {
    logger.error('数据库查询失败:', {
      query: sql,
      params,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
};

/**
 * 执行数据库写入操作
 *
 * 执行 INSERT / UPDATE / DELETE 等数据变更语句。
 * 返回变更行数和最后插入行的自增 ID。
 * 如果数据库尚未连接，会自动尝试重连。
 *
 * @param {string} sql - SQL 语句
 * @param {any[]} [params=[]] - 执行参数数组
 * @returns {Promise<{ changes: number; lastInsertRowid: number }>} 执行结果
 * @throws {Error} 数据库未连接且重连失败时抛出错误
 */
export const execute = async (sql: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid: number }> => {
  if (!db) {
    /** 尝试重新连接数据库 */
    logger.debug('数据库未连接，尝试重新连接以执行操作');
    await connectDatabase();
  }

  if (!db) {
    throw new Error('数据库未连接');
  }

  // 将 PostgreSQL 风格的 $N 占位符转换为 SQLite 的 ? 占位符
  const convertedSql = sql.replace(/\$\d+/g, '?');

  const start = Date.now();
  try {
    const stmt = db.prepare(convertedSql);
    const result = stmt.run(...params);
    const duration = Date.now() - start;

    logger.debug('数据库执行', {
      query: sql,
      params,
      duration: `${duration}ms`,
      changes: result.changes,
    });

    return {
      changes: result.changes,
      lastInsertRowid: Number(result.lastInsertRowid),
    };
  } catch (error) {
    logger.error('数据库执行失败:', {
      query: sql,
      params,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
};

/**
 * 执行数据库事务
 *
 * 执行 BEGIN / COMMIT / ROLLBACK 事务控制。
 * 回调成功自动提交，回调抛出异常自动回滚。
 *
 * @typeparam T - 回调函数的返回类型
 * @param {() => Promise<T>} callback - 要在事务内执行的回调函数
 * @returns {Promise<T>} 回调函数的返回值
 * @throws {Error} 数据库未连接时抛出错误；回调中的异常也会被传递
 */
export const transaction = async <T>(callback: () => Promise<T>): Promise<T> => {
  if (!db) {
    throw new Error('数据库未连接');
  }

  try {
    db.prepare('BEGIN').run();
    const result = await callback();
    db.prepare('COMMIT').run();
    return result;
  } catch (error) {
    db.prepare('ROLLBACK').run();
    logger.error('数据库事务失败:', error);
    throw error;
  }
};

/**
 * 数据库健康检查
 *
 * 执行 SELECT 1 检查数据库连接是否正常。
 * 适用于监控系统的健康检测端点。
 *
 * @returns {Promise<boolean>} 数据库正常返回 true，异常或未连接返回 false
 */
export const checkHealth = async (): Promise<boolean> => {
  try {
    if (!db) {
      return false;
    }
    db.prepare('SELECT 1').get();
    return true;
  } catch (error) {
    logger.error('数据库健康检查失败:', error);
    return false;
  }
};

/**
 * 关闭数据库连接
 *
 * 关闭 SQLite 数据库连接并清理资源。
 *
 * @returns {Promise<void>} 关闭完成后 resolve
 */
export const closeDatabase = async (): Promise<void> => {
  try {
    if (db) {
      db.close();
      db = null;
      logger.info('数据库连接已关闭');
    }
  } catch (error) {
    logger.error('关闭数据库连接时出错:', error);
    throw error;
  }
};

/**
 * 运行数据库迁移
 *
 * 执行所有待处理的数据库迁移脚本，创建或更新数据库表结构。
 * 迁移步骤：
 * 1. 创建 schema_migrations 迁移记录表
 * 2. 获取已应用的迁移列表
 * 3. 从 migrations/ 目录查找 .sql 迁移文件
 * 4. 按文件名排序，逐个应用未执行的迁移
 * 5. 若无迁移目录，运行内联的「旧迁移」以保持向后兼容
 *
 * 迁移文件中的 SQL 语句以分号分割，逐条执行。
 * 遇到 "duplicate column" 错误会跳过（兼容 ALTER TABLE ADD COLUMN IF NOT EXISTS）。
 *
 * @returns {Promise<void>} 迁移完成后 resolve
 * @throws {Error} 数据库未连接或迁移执行失败时抛出错误
 */
export const runMigrations = async (): Promise<void> => {
  if (!db) {
    throw new Error('数据库未连接');
  }

  try {
    logger.info('开始数据库迁移...');

    /** 创建迁移记录表 */
    db.prepare(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        migration_name TEXT UNIQUE NOT NULL,
        applied_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    /** 获取已应用的迁移 */
    let appliedMigrations: string[] = [];
    try {
      const rows = db.prepare('SELECT migration_name FROM schema_migrations ORDER BY id ASC').all();
      appliedMigrations = rows.map((row: any) => row.migration_name);
    } catch (error) {
      logger.warn('无法获取已应用的迁移，可能是第一次运行:', error);
    }

    /** 迁移文件目录 */
    const path = require('path');
    const fs = require('fs');
    const migrationsDir = path.join(process.cwd(), 'migrations');

    if (!fs.existsSync(migrationsDir)) {
      logger.warn(`迁移目录不存在: ${migrationsDir}，跳过文件迁移`);
      /** 运行内置的迁移以保持向后兼容 */
      await runLegacyMigrations();
      return;
    }

    /** 获取所有迁移文件并按文件名排序 */
    const files = fs.readdirSync(migrationsDir)
      .filter((file: string) => file.endsWith('.sql'))
      .sort();

    /** 筛选出尚未应用的迁移 */
    const pendingMigrations = files.filter((file: string) => !appliedMigrations.includes(file));

    if (pendingMigrations.length === 0) {
      logger.info('没有待处理的迁移');
      return;
    }

    logger.info(`发现 ${pendingMigrations.length} 个待处理迁移`);

    /** 逐个应用迁移文件 */
    for (const filename of pendingMigrations) {
      logger.info(`应用迁移: ${filename}`);
      const filePath = path.join(migrationsDir, filename);
      const sqlContent = fs.readFileSync(filePath, 'utf-8');

      /** 分割 SQL 语句 */
      const statements = sqlContent
        .split(';')
        .map((stmt: string) => stmt.trim())
        .filter((stmt: string) => stmt.length > 0);

      for (const sql of statements) {
        /** 移除 SQL 注释行（-- 开头的行），过滤纯注释语句 */
        const lines = sql.split('\n');
        const nonCommentLines = lines.filter((line: string) => {
          const trimmed = line.trim();
          return trimmed !== '' && !trimmed.startsWith('--');
        });
        if (nonCommentLines.length === 0) {
          logger.debug('跳过纯注释SQL语句');
          continue;
        }

        const trimmedSql = sql.trim();
        try {
          db.prepare(trimmedSql).run();
          logger.debug(`执行SQL: ${trimmedSql.substring(0, 100)}...`);
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          /** 跳过 "duplicate column" 错误（SQLite 不支持 ALTER TABLE ADD COLUMN IF NOT EXISTS） */
          if (errMsg.includes('duplicate column name')) {
            logger.warn(`列已存在，跳过: ${trimmedSql.substring(0, 80)}...`);
            continue;
          }
          logger.error(`执行SQL失败: ${trimmedSql.substring(0, 100)}...`, error);
          throw error;
        }
      }

      /** 记录已完成的迁移 */
      db.prepare('INSERT INTO schema_migrations (migration_name) VALUES (?)').run(filename);
      logger.info(`迁移完成: ${filename}`);
    }

    logger.info('数据库迁移完成');
  } catch (error) {
    logger.error('数据库迁移失败:', error);
    throw error;
  }
};

/**
 * 向后兼容的旧迁移
 *
 * 当 migrations/ 目录不存在时调用此方法。
 * 通过内联 SQL 创建所有必要的数据库表，确保应用在
 * 没有迁移文件的环境下仍能正常运行。
 *
 * 包含的表：users、news、games、community_posts、comments、
 * reviews、review_templates、guides、news_categories、favorites、
 * about_content、system_configs
 *
 * @returns {Promise<void>} 迁移完成后 resolve
 * @throws {Error} 数据库未连接时抛出错误
 */
async function runLegacyMigrations(): Promise<void> {
  if (!db) {
    throw new Error('数据库未连接');
  }

  logger.info('运行向后兼容的旧迁移...');

  /**
   * 创建用户表
   * 存储用户账户信息、认证凭据、第三方登录绑定和个性化设置
   */
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      avatar_url TEXT,
      bio TEXT,
      language TEXT DEFAULT 'en',
      role TEXT DEFAULT 'user',
      email_verified INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      last_login TEXT,
      google_id TEXT,
      github_id TEXT,
      facebook_id TEXT,
      twitter_id TEXT,
      two_factor_enabled INTEGER DEFAULT 0,
      two_factor_secret TEXT,
      two_factor_backup_codes TEXT,
      two_factor_last_used TEXT,
      marketing_opt_in INTEGER DEFAULT 1,
      newsletter_subscription INTEGER DEFAULT 1,
      email_preferences TEXT,
      notification_settings TEXT,
      privacy_settings TEXT,
      deleted_at TEXT,
      version INTEGER DEFAULT 1,
      created_by INTEGER,
      updated_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // ======== 核心数据表 ========

  /**
   * 创建新闻表
   * 存储游戏行业新闻、新作发布、赛事资讯等内容
   */
  db.prepare(`
    CREATE TABLE IF NOT EXISTS news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      content TEXT NOT NULL,
      excerpt TEXT,
      cover_image_url TEXT,
      author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      tags TEXT DEFAULT '[]',
      is_published INTEGER DEFAULT 0,
      published_at TEXT,
      views INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      game_name TEXT,
      review_status TEXT NOT NULL DEFAULT 'approved',
      review_comment TEXT,
      reviewed_by INTEGER,
      reviewed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  /**
   * 创建博客空间表
   * 存储游戏专区卡片信息，每张卡片关联多篇博客文章
   */
  db.prepare(`
    CREATE TABLE IF NOT EXISTS blog_spaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      cover_image_url TEXT,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  /**
   * 创建博客文章表
   * 独立的博客系统，与新闻表分离
   */
  db.prepare(`
    CREATE TABLE IF NOT EXISTS blog_articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      content TEXT NOT NULL,
      excerpt TEXT,
      cover_image_url TEXT,
      author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      space_id INTEGER NOT NULL REFERENCES blog_spaces(id) ON DELETE CASCADE,
      category TEXT NOT NULL DEFAULT '博客',
      tags TEXT DEFAULT '[]',
      is_published INTEGER DEFAULT 0,
      is_pinned INTEGER DEFAULT 0,
      published_at TEXT,
      views INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      review_status TEXT NOT NULL DEFAULT 'pending',
      review_comment TEXT,
      reviewed_by INTEGER REFERENCES users(id),
      reviewed_at TEXT,
      deleted_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  /**
   * 创建游戏表
   * 存储游戏基本信息、评分、价格、图片和平台兼容性
   */
  db.prepare(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      release_date TEXT,
      developer TEXT,
      publisher TEXT,
      genres TEXT DEFAULT '[]',
      platforms TEXT DEFAULT '[]',
      rating REAL DEFAULT 0,
      price REAL DEFAULT 0,
      discount INTEGER DEFAULT 0,
      cover_image_url TEXT,
      screenshots TEXT DEFAULT '[]',
      steam_app_id INTEGER,
      rawg_id INTEGER,
      is_featured INTEGER DEFAULT 0,
      display_zone TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  /**
   * 创建社区帖子表
   * 存储用户在社区中发布的讨论帖子
   */
  db.prepare(`
    CREATE TABLE IF NOT EXISTS community_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      tags TEXT DEFAULT '[]',
      likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      is_pinned INTEGER DEFAULT 0,
      is_locked INTEGER DEFAULT 0,
      review_status TEXT NOT NULL DEFAULT 'approved',
      review_comment TEXT,
      published_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  /**
   * 创建评论表
   * 存储用户对新闻、评测、社区帖子等的评论
   */
  db.prepare(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      parent_type TEXT NOT NULL,
      parent_id INTEGER NOT NULL,
      parent_title TEXT,
      likes INTEGER DEFAULT 0,
      is_frozen INTEGER DEFAULT 0,
      frozen_until TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  /**
   * 创建评测表
   * 存储用户对游戏的评分和评论文本
   */
  db.prepare(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      game_id INTEGER NOT NULL,
      author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating REAL NOT NULL,
      summary TEXT,
      pros TEXT,
      cons TEXT,
      is_featured INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      review_status TEXT NOT NULL DEFAULT 'approved',
      review_comment TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  /**
   * 创建评测模板表
   * 存储评测的分类模板和评分字段配置
   */
  db.prepare(`
    CREATE TABLE IF NOT EXISTS review_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      description TEXT,
      rating_field TEXT DEFAULT '{}',
      pros_field TEXT DEFAULT '{}',
      cons_field TEXT DEFAULT '{}',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  /**
   * 创建攻略指南表
   * 存储玩家分享的游戏攻略、指南和技巧文章
   */
  db.prepare(`
    CREATE TABLE IF NOT EXISTS guides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      game_id INTEGER NOT NULL,
      author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      difficulty TEXT,
      category TEXT,
      cover_image_url TEXT,
      likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      review_status TEXT NOT NULL DEFAULT 'approved',
      review_comment TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // ======== 辅助表 ========

  /**
   * 创建新闻分类表
   * 存储新闻栏目的分类信息
   */
  db.prepare(`
    CREATE TABLE IF NOT EXISTS news_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  /**
   * 创建收藏表
   * 存储用户对游戏的收藏记录
   */
  db.prepare(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      game_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, game_id)
    )
  `).run();

  /**
   * 创建关于页面内容表
   * 存储"关于我们"页面的区块内容
   */
  db.prepare(`
    CREATE TABLE IF NOT EXISTS about_content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section_key TEXT UNIQUE NOT NULL,
      title TEXT,
      description TEXT,
      image_url TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  /**
   * 创建系统配置表
   * 存储键值对的系统配置项
   */
  db.prepare(`
    CREATE TABLE IF NOT EXISTS system_configs (
      key TEXT PRIMARY KEY,
      value TEXT,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  logger.warn('运行简化版旧迁移，可能不包含所有表');

  /** 创建迁移记录 */
  try {
    db.prepare('INSERT INTO schema_migrations (migration_name) VALUES (?)').run('legacy_migration');
  } catch (error) {
    /** 忽略重复错误 */
  }

  logger.info('向后兼容迁移完成');
}

/**
 * SQLite 数据库模块默认导出
 *
 * 聚合所有数据库操作方法为默认导出对象。
 */
export default {
  connectDatabase,
  getConnection,
  query,
  execute,
  transaction,
  checkHealth,
  closeDatabase,
  runMigrations,
};
