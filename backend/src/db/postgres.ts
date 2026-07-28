/**
 * PostgreSQL 数据库模块
 *
 * 基于 pg（node-postgres）连接池的 PostgreSQL 数据库实现，
 * 是 GameHub 后端生产环境的推荐数据库方案。
 *
 * 特性：
 * - 连接池管理：自动管理连接生命周期，提高并发性能
 * - 占位符转换：自动将 SQLite 风格的 ? 占位符转换为 PostgreSQL 的 $1, $2 格式
 * - 兼容接口：返回与 SQLite 模块一致的 { changes, lastInsertRowid } 格式
 * - 连接池错误处理：防止空闲连接断开导致进程崩溃
 * - 全面的数据库迁移系统：支持增量迁移、幂等执行
 *
 * @module db/postgres
 */

import { Pool, PoolConfig } from 'pg';
import config from '../config';
import logger from '../utils/logger';

/**
 * 数据库连接池配置对象
 *
 * 从 config.database 中读取 PostgreSQL 连接参数，
 * 包括主机、端口、数据库名、用户名、密码、最大连接数、空闲超时和连接超时等。
 * 支持 SSL 连接（通过 DB_SSL 环境变量控制）。
 */
const poolConfig: PoolConfig = {
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  max: config.database.maxConnections,
  idleTimeoutMillis: config.database.idleTimeout,
  connectionTimeoutMillis: config.database.connectionTimeout,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

// 创建连接池
const pool = new Pool(poolConfig);

/**
 * 监听连接池错误事件
 *
 * node-postgres 在空闲客户端连接断开时会发出 'error' 事件，
 * 必须注册监听器，否则未被捕获的 error 事件将导致 Node.js 进程崩溃（引发 nginx 502）。
 * 此处仅记录错误日志，不进行进程级别的处理。
 */
pool.on('error', (err) => {
  logger.error('数据库连接池发生意外错误:', err);
});

/**
 * 连接 PostgreSQL 数据库
 *
 * 从连接池获取一个客户端测试连接可用性，
 * 同时检查并记录数据库版本信息。
 *
 * @returns {Promise<void>} 连接测试完成后 resolve
 * @throws 连接测试失败时抛出错误
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    // 测试连接
    const client = await pool.connect();
    logger.info('PostgreSQL数据库连接测试成功');

    // 检查数据库版本
    const result = await client.query('SELECT version()');
    logger.info(`数据库版本: ${result.rows[0].version}`);

    client.release();
  } catch (error) {
    logger.error('PostgreSQL数据库连接失败:', error);
    throw error;
  }
};

/**
 * 获取数据库连接池实例
 *
 * @returns {Pool} pg Pool 连接池实例
 */
export const getConnection = () => pool;

/**
 * 将 SQLite 风格 ? 占位符转换为 PostgreSQL $1, $2 格式
 *
 * 允许应用层使用与 SQLite 模块一致的参数占位符风格，
 * 提升不同数据库间切换的兼容性。
 *
 * @param {string} sql - 包含 ? 占位符的原始 SQL 语句
 * @returns {string} 转换为 $N 格式的 PostgreSQL 兼容 SQL 语句
 */
const convertPlaceholders = (sql: string): string => {
  if (!sql.includes('?')) return sql;
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
};

/**
 * 执行数据库查询（读取操作）
 *
 * 执行 SELECT 类查询语句并返回结果行数组。
 * 自动将 SQLite 风格的 ? 占位符转换为 PostgreSQL 的 $N 格式。
 * 记录查询执行耗时用于性能监控。
 *
 * @param {string} text - SQL 查询语句，支持 ? 或 $N 占位符
 * @param {any[]} [params] - 查询参数数组
 * @returns {Promise<any[]>} 查询结果行数组（与 SQLite 接口兼容）
 * @throws 查询失败时抛出错误
 */
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const pgText = params && params.length > 0 ? convertPlaceholders(text) : text;
  try {
    const result = await pool.query(pgText, params);
    const duration = Date.now() - start;

    logger.debug('数据库查询执行', {
      query: pgText,
      duration: `${duration}ms`,
      rows: result.rowCount,
    });

    // 返回 rows 数组，与 SQLite 接口兼容
    return result.rows;
  } catch (error) {
    logger.error('数据库查询失败:', {
      query: pgText,
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
 * 对于 INSERT 语句，自动追加 RETURNING id 以获取插入行的自增 ID。
 * 返回 { changes, lastInsertRowid } 格式，与 SQLite 模块的 execute 接口兼容。
 *
 * @param {string} text - SQL 语句
 * @param {any[]} [params] - 执行参数数组
 * @returns {Promise<{ changes: number; lastInsertRowid: number }>} 执行结果
 * @throws 执行失败时抛出错误
 */
export const execute = async (text: string, params?: any[]) => {
  const start = Date.now();
  const pgText = params && params.length > 0 ? convertPlaceholders(text) : text;

  // For INSERT statements, append RETURNING id to get the inserted row ID
  const trimmed = pgText.trimStart();
  const isInsert = /^INSERT\b/i.test(trimmed);
  const finalSQL = isInsert ? pgText + ' RETURNING id' : pgText;

  try {
    const result = await pool.query(finalSQL, params);
    const duration = Date.now() - start;

    logger.debug('数据库执行', {
      query: finalSQL,
      duration: `${duration}ms`,
      rows: result.rowCount,
    });

    return {
      changes: result.rowCount || 0,
      lastInsertRowid: isInsert && result.rows.length > 0 ? result.rows[0].id : 0,
    };
  } catch (error) {
    logger.error('数据库执行失败:', {
      query: finalSQL,
      params,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
};

/**
 * 执行数据库事务
 *
 * 从事务连接池获取一个专有客户端连接，在事务上下文中执行回调函数。
 * 事务控制流程：
 * - 回调成功则提交事务（COMMIT）
 * - 回调抛出异常则回滚事务（ROLLBACK）
 * - 无论成功或失败，finally 块中释放客户端回连接池
 *
 * @typeparam T - 回调函数的返回类型
 * @param {(client: any) => Promise<T>} callback - 要在事务内执行的回调函数，接收 pg 客户端实例
 * @returns {Promise<T>} 回调函数的返回值
 * @throws 事务失败时抛出错误
 */
export const transaction = async <T>(callback: (client: any) => Promise<T>): Promise<T> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('数据库事务失败:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * 数据库健康检查
 *
 * 执行 SELECT 1 简单查询以验证数据库连接是否正常。
 * 适用于负载均衡器和监控系统的健康检测端点，不抛出异常。
 *
 * @returns {Promise<boolean>} 数据库正常返回 true，异常或未连接返回 false
 */
export const checkHealth = async (): Promise<boolean> => {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    logger.error('数据库健康检查失败:', error);
    return false;
  }
};

/**
 * 关闭数据库连接池
 *
 * 优雅地关闭 pg 连接池，等待所有客户端连接释放。
 * 在应用关闭时调用，确保数据库资源被正确释放。
 *
 * @returns {Promise<void>} 关闭完成后 resolve
 * @throws 关闭过程出错时抛出错误
 */
export const closeDatabase = async (): Promise<void> => {
  try {
    await pool.end();
    logger.info('数据库连接池已关闭');
  } catch (error) {
    logger.error('关闭数据库连接池时出错:', error);
    throw error;
  }
};

/**
 * 运行数据库迁移
 *
 * 依次执行所有数据库迁移脚本，包括创建扩展、创建表结构、
 * 建立索引、添加软删除字段、全文搜索、多语言支持、
 * 用户等级/权限系统、游戏化系统等。
 *
 * 迁移机制：
 * - 通过 schema_migrations 表记录已应用的迁移
 * - 增量执行：仅运行未应用过的迁移
 * - 幂等性：每个迁移中的 SQL 均使用 IF NOT EXISTS / IF EXISTS 子句
 * - 自动跳过已存在的列或索引
 *
 * @returns {Promise<void>} 迁移完成后 resolve
 * @throws {Error} 迁移失败时抛出错误
 */
export const runMigrations = async (): Promise<void> => {
  try {
    logger.info('开始PostgreSQL数据库迁移...');

    await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await pool.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (' +
      'id SERIAL PRIMARY KEY, migration_name TEXT UNIQUE NOT NULL, applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW())'
    );

    const appliedResult = await pool.query(
      'SELECT migration_name FROM schema_migrations ORDER BY id ASC'
    );
    const applied = new Set(appliedResult.rows.map((r: any) => r.migration_name));

    /**
     * 应用单个迁移
     *
     * 如果迁移尚未应用，逐条执行其 SQL 语句数组。
     * 遇到 "already exists" 或 "duplicate column" 错误会自动跳过,
     * 确保迁移的幂等性。
     *
     * @param {string} name - 迁移名称（如 "001_initial_schema"）
     * @param {string[]} queries - 该迁移包含的 SQL 语句数组
     * @returns {Promise<void>} 迁移应用完成后 resolve
     */
    const apply = async (name: string, queries: string[]): Promise<void> => {
      if (applied.has(name)) {
        logger.debug('Migration already applied, skipping: ' + name);
        return;
      }
      logger.info('Applying migration: ' + name);
      for (const q of queries) {
        const trimmed = q.trim();
        if (!trimmed) continue;
        try {
          await pool.query(trimmed);
        } catch (e: any) {
          const msg = e.message || '';
          if (msg.includes('already exists') || msg.includes('duplicate column')) {
            logger.warn('Column/index already exists, skipping: ' + trimmed.substring(0, 80));
            continue;
          }
          throw e;
        }
      }
      await pool.query('INSERT INTO schema_migrations (migration_name) VALUES ($1)', [name]);
      logger.info('Migration completed: ' + name);
    };

    /**
     * 迁移 001：初始表结构
     *
     * 创建核心数据表：users（用户）、games（游戏）、reviews（评测）、
     * favorites（收藏）、news（新闻）、community_posts（社区帖子）、
     * comments（评论）。使用 IF NOT EXISTS 确保幂等性。
     */
    await apply('001_initial_schema', [
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT,
        avatar_url TEXT,
        bio TEXT,
        role TEXT DEFAULT 'user',
        email_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS games (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        release_date DATE,
        developer TEXT,
        publisher TEXT,
        genres JSONB DEFAULT '[]',
        platforms JSONB DEFAULT '[]',
        rating NUMERIC(3,2),
        price NUMERIC(10,2),
        discount NUMERIC(5,2),
        cover_image_url TEXT,
        screenshots JSONB DEFAULT '[]',
        steam_app_id INTEGER,
        rawg_id INTEGER,
        is_featured BOOLEAN DEFAULT FALSE,
        display_zone VARCHAR(20) DEFAULT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        rating NUMERIC(3,2) NOT NULL,
        game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tags JSONB DEFAULT '[]',
        likes INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        is_featured BOOLEAN DEFAULT FALSE,
        published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, game_id)
      )`,
      `CREATE TABLE IF NOT EXISTS news (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        content TEXT NOT NULL,
        excerpt TEXT,
        cover_image_url TEXT,
        author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        tags JSONB DEFAULT '[]',
        is_published BOOLEAN DEFAULT FALSE,
        published_at TIMESTAMP WITH TIME ZONE,
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS community_posts (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        tags JSONB DEFAULT '[]',
        likes INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        is_pinned BOOLEAN DEFAULT FALSE,
        is_locked BOOLEAN DEFAULT FALSE,
        published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        parent_type TEXT NOT NULL CHECK (parent_type IN ('review', 'news', 'community_post')),
        parent_id INTEGER NOT NULL,
        likes INTEGER DEFAULT 0,
        is_edited BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
    ]);

    /**
     * 迁移 002：添加索引
     *
     * 为 games、reviews、favorites、news、community_posts、comments 等
     * 核心数据表的关键字段添加数据库索引，提升查询性能。
     */
    await apply('002_add_indexes', [
      'CREATE INDEX IF NOT EXISTS idx_games_title ON games(title)',
      'CREATE INDEX IF NOT EXISTS idx_games_rating ON games(rating DESC)',
      'CREATE INDEX IF NOT EXISTS idx_games_slug ON games(slug)',
      'CREATE INDEX IF NOT EXISTS idx_reviews_author_game ON reviews(author_id, game_id)',
      'CREATE INDEX IF NOT EXISTS idx_reviews_game_id ON reviews(game_id)',
      'CREATE INDEX IF NOT EXISTS idx_reviews_published_at ON reviews(published_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_favorites_game ON favorites(game_id)',
      'CREATE INDEX IF NOT EXISTS idx_news_slug ON news(slug)',
      'CREATE INDEX IF NOT EXISTS idx_news_category ON news(category)',
      'CREATE INDEX IF NOT EXISTS idx_news_published ON news(published_at DESC) WHERE is_published = TRUE',
      'CREATE INDEX IF NOT EXISTS idx_community_posts_category ON community_posts(category)',
      'CREATE INDEX IF NOT EXISTS idx_community_posts_published ON community_posts(published_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_community_posts_author ON community_posts(author_id)',
      'CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_type, parent_id)',
      'CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id)',
    ]);

    /**
     * 迁移 002b：新闻分类
     *
     * 创建 news_categories 表存储新闻栏目分类，
     * 并插入预设分类数据（行业动态、新作发布、游戏更新、赛事资讯、硬件科技、游戏文化）。
     */
    await apply('002_news_categories', [
      `CREATE TABLE IF NOT EXISTS news_categories (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      `INSERT INTO news_categories (name, slug, description, sort_order) VALUES
        ('行业动态', 'industry', '游戏行业最新动态和新闻', 1),
        ('新作发布', 'new-releases', '新游戏发布和预告信息', 2),
        ('游戏更新', 'updates', '游戏版本更新和补丁说明', 3),
        ('赛事资讯', 'esports', '电竞赛事相关新闻', 4),
        ('硬件科技', 'hardware', '游戏硬件和技术相关新闻', 5),
        ('游戏文化', 'culture', '游戏文化、艺术和相关话题', 6)
      ON CONFLICT (slug) DO NOTHING`,
    ]);

    /**
     * 迁移 003：软删除和乐观锁
     *
     * 为所有核心数据表添加 deleted_at（软删除时间戳）、
     * version（乐观锁版本号）、created_by（创建者）、
     * updated_by（更新者）字段。
     * 并给 comments 表添加 parent_comment_id 支持嵌套回复。
     */
    await apply('003_add_soft_delete_fields', [
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL',
      'ALTER TABLE games ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE',
      'ALTER TABLE games ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1',
      'ALTER TABLE games ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL',
      'ALTER TABLE games ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL',
      'ALTER TABLE reviews ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE',
      'ALTER TABLE reviews ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1',
      'ALTER TABLE reviews ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL',
      'ALTER TABLE reviews ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL',
      'ALTER TABLE news ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE',
      'ALTER TABLE news ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1',
      'ALTER TABLE news ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL',
      'ALTER TABLE news ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL',
      'ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE',
      'ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1',
      'ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL',
      'ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL',
      'ALTER TABLE comments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE',
      'ALTER TABLE comments ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1',
      'ALTER TABLE comments ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL',
      'ALTER TABLE comments ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL',
      'ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_comment_id INTEGER REFERENCES comments(id) ON DELETE SET NULL',
      'ALTER TABLE favorites ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE',
      'ALTER TABLE favorites ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1',
    ]);

    /**
     * 迁移 003b：评测分数和模板
     *
     * 为 reviews 表添加 scores 字段（JSON 格式的维度评分），
     * 创建 review_templates 表管理评测模板，支持自定义评分维度。
     */
    await apply('003_review_scores_templates', [
      'ALTER TABLE reviews ADD COLUMN IF NOT EXISTS scores JSONB',
      `CREATE TABLE IF NOT EXISTS review_templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        sections JSONB NOT NULL,
        default_scores JSONB,
        score_dimensions JSONB,
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
    ]);
    /** 迁移完成标记 */

    /**
     * 迁移 004：关联表（点赞、关注、通知、邮箱验证、密码重置、邮件模板）
     *
     * 创建 likes（点赞）、follows（关注）、notifications（通知）、
     * email_verifications（邮箱验证）、password_resets（密码重置）、
     * email_templates（邮件模板）等关联表。
     * 并为 games 表添加推广标签、推荐截止日期、折扣截止日期等营销字段。
     */
    await apply('004_create_association_tables', [
      `CREATE TABLE IF NOT EXISTS likes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_type TEXT NOT NULL CHECK (target_type IN ('review', 'news', 'community_post', 'comment', 'game')),
        target_id INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        version INTEGER DEFAULT 1,
        UNIQUE(user_id, target_type, target_id)
      )`,
      `CREATE TABLE IF NOT EXISTS follows (
        id SERIAL PRIMARY KEY,
        follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        version INTEGER DEFAULT 1,
        UNIQUE(follower_id, following_id)
      )`,
      `CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'mention', 'system', 'marketing', 'new_message', 'achievement_unlocked', 'level_up')),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        data JSONB,
        is_read INTEGER DEFAULT 0,
        read_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        version INTEGER DEFAULT 1
      )`,
      `CREATE TABLE IF NOT EXISTS email_verifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        verified_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        version INTEGER DEFAULT 1
      )`,
      `CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        version INTEGER DEFAULT 1
      )`,
      `CREATE TABLE IF NOT EXISTS email_templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        template_type TEXT NOT NULL CHECK (template_type IN ('verification', 'welcome', 'password_reset', 'newsletter', 'promotional', 'notification')),
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        variables JSONB,
        is_active INTEGER DEFAULT 1,
        version_string TEXT DEFAULT '1.0.0',
        created_by INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_by INTEGER,
        deleted_at TIMESTAMP WITH TIME ZONE
      )`,
      'ALTER TABLE games ADD COLUMN IF NOT EXISTS promotional_tag TEXT',
      'ALTER TABLE games ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP WITH TIME ZONE',
      'ALTER TABLE games ADD COLUMN IF NOT EXISTS discount_end_date TIMESTAMP WITH TIME ZONE',
      'ALTER TABLE games ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0',
      'ALTER TABLE games ADD COLUMN IF NOT EXISTS wishlist_count INTEGER DEFAULT 0',
      'ALTER TABLE games ADD COLUMN IF NOT EXISTS purchase_count INTEGER DEFAULT 0',
      'ALTER TABLE games ADD COLUMN IF NOT EXISTS meta_title TEXT',
      'ALTER TABLE games ADD COLUMN IF NOT EXISTS meta_description TEXT',
      'CREATE INDEX IF NOT EXISTS idx_likes_user_target ON likes(user_id, target_type, target_id)',
      'CREATE INDEX IF NOT EXISTS idx_likes_target ON likes(target_type, target_id)',
      'CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id)',
      'CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token)',
      'CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token)',
      'CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(template_type, is_active)',
      'CREATE INDEX IF NOT EXISTS idx_comments_parent_comment ON comments(parent_comment_id)',
    ]);

    /**
     * 迁移 005：全文搜索
     *
     * 为 games、reviews、news、community_posts、comments 表
     * 添加 tsvector 类型的 search_vector 列和 GIN 索引，
     * 支持 PostgreSQL 原生的全文搜索功能。
     */
    await apply('005_add_fulltext_search', [
      'ALTER TABLE games ADD COLUMN IF NOT EXISTS search_vector tsvector',
      'ALTER TABLE reviews ADD COLUMN IF NOT EXISTS search_vector tsvector',
      'ALTER TABLE news ADD COLUMN IF NOT EXISTS search_vector tsvector',
      'ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS search_vector tsvector',
      'ALTER TABLE comments ADD COLUMN IF NOT EXISTS search_vector tsvector',
      'CREATE INDEX IF NOT EXISTS idx_games_search_vector ON games USING GIN(search_vector)',
      'CREATE INDEX IF NOT EXISTS idx_reviews_search_vector ON reviews USING GIN(search_vector)',
      'CREATE INDEX IF NOT EXISTS idx_news_search_vector ON news USING GIN(search_vector)',
      'CREATE INDEX IF NOT EXISTS idx_community_posts_search_vector ON community_posts USING GIN(search_vector)',
      'CREATE INDEX IF NOT EXISTS idx_comments_search_vector ON comments USING GIN(search_vector)',
    ]);

    /**
     * 迁移 006：多语言支持
     *
     * 为 users 表添加语言偏好字段；为 games 和 news 表添加
     * 多语言标题/内容列（en、zh-CN、ja、ko、es、fr）；
     * 创建 languages 语言表、game_localizations 和 news_localizations
     * 本地化内容表，实现完整的国际化（i18n）支持。
     */
    await apply('006_add_language_support', [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en'`,
      'ALTER TABLE games ADD COLUMN IF NOT EXISTS title_en TEXT',
      'ALTER TABLE games ADD COLUMN IF NOT EXISTS title_zh TEXT',
      'ALTER TABLE games ADD COLUMN IF NOT EXISTS title_ja TEXT',
      'ALTER TABLE games ADD COLUMN IF NOT EXISTS title_ko TEXT',
      'ALTER TABLE games ADD COLUMN IF NOT EXISTS title_es TEXT',
      'ALTER TABLE games ADD COLUMN IF NOT EXISTS title_fr TEXT',
      'ALTER TABLE games ADD COLUMN IF NOT EXISTS description_en TEXT',
      'ALTER TABLE games ADD COLUMN IF NOT EXISTS description_zh TEXT',
      'ALTER TABLE games ADD COLUMN IF NOT EXISTS description_ja TEXT',
      'ALTER TABLE games ADD COLUMN IF NOT EXISTS description_ko TEXT',
      'ALTER TABLE games ADD COLUMN IF NOT EXISTS description_es TEXT',
      'ALTER TABLE games ADD COLUMN IF NOT EXISTS description_fr TEXT',
      'ALTER TABLE news ADD COLUMN IF NOT EXISTS title_en TEXT',
      'ALTER TABLE news ADD COLUMN IF NOT EXISTS title_zh TEXT',
      'ALTER TABLE news ADD COLUMN IF NOT EXISTS title_ja TEXT',
      'ALTER TABLE news ADD COLUMN IF NOT EXISTS title_ko TEXT',
      'ALTER TABLE news ADD COLUMN IF NOT EXISTS title_es TEXT',
      'ALTER TABLE news ADD COLUMN IF NOT EXISTS title_fr TEXT',
      'ALTER TABLE news ADD COLUMN IF NOT EXISTS content_en TEXT',
      'ALTER TABLE news ADD COLUMN IF NOT EXISTS content_zh TEXT',
      'ALTER TABLE news ADD COLUMN IF NOT EXISTS content_ja TEXT',
      'ALTER TABLE news ADD COLUMN IF NOT EXISTS content_ko TEXT',
      'ALTER TABLE news ADD COLUMN IF NOT EXISTS content_es TEXT',
      'ALTER TABLE news ADD COLUMN IF NOT EXISTS content_fr TEXT',
      'ALTER TABLE news ADD COLUMN IF NOT EXISTS excerpt_en TEXT',
      'ALTER TABLE news ADD COLUMN IF NOT EXISTS excerpt_zh TEXT',
      'ALTER TABLE news ADD COLUMN IF NOT EXISTS excerpt_ja TEXT',
      'ALTER TABLE news ADD COLUMN IF NOT EXISTS excerpt_ko TEXT',
      'ALTER TABLE news ADD COLUMN IF NOT EXISTS excerpt_es TEXT',
      'ALTER TABLE news ADD COLUMN IF NOT EXISTS excerpt_fr TEXT',
      `CREATE TABLE IF NOT EXISTS languages (
        code TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        native_name TEXT,
        is_active INTEGER DEFAULT 1,
        is_default INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      `INSERT INTO languages (code, name, native_name, is_default, sort_order) VALUES
        ('en', 'English', 'English', 1, 1),
        ('zh-CN', 'Chinese (Simplified)', '简体中文', 0, 2),
        ('ja', 'Japanese', '日本語', 0, 3),
        ('ko', 'Korean', '한국어', 0, 4),
        ('es', 'Spanish', 'Español', 0, 5),
        ('fr', 'French', 'Français', 0, 6)
      ON CONFLICT (code) DO NOTHING`,
      `CREATE TABLE IF NOT EXISTS game_localizations (
        id SERIAL PRIMARY KEY,
        game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        language_code TEXT NOT NULL REFERENCES languages(code) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        developer TEXT,
        publisher TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(game_id, language_code)
      )`,
      `CREATE TABLE IF NOT EXISTS news_localizations (
        id SERIAL PRIMARY KEY,
        news_id INTEGER NOT NULL REFERENCES news(id) ON DELETE CASCADE,
        language_code TEXT NOT NULL REFERENCES languages(code) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        excerpt TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(news_id, language_code)
      )`,
      'CREATE INDEX IF NOT EXISTS idx_users_language ON users(language)',
      'CREATE INDEX IF NOT EXISTS idx_languages_is_active ON languages(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_game_localizations_game_lang ON game_localizations(game_id, language_code)',
      'CREATE INDEX IF NOT EXISTS idx_news_localizations_news_lang ON news_localizations(news_id, language_code)',
    ]);

    /**
     * 迁移 007：游戏库表
     *
     * 创建 user_game_library（用户游戏库）、game_sessions（游戏会话记录）、
     * game_achievements（游戏成就定义）、user_achievements（用户成就解锁记录）表，
     * 支持用户个人游戏库管理、游戏时间追踪和成就系统。
     */
    await apply('007_create_game_library_tables', [
      `CREATE TABLE IF NOT EXISTS user_game_library (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        game_title TEXT NOT NULL,
        game_slug TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'wishlist',
        added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_played_at TIMESTAMP WITH TIME ZONE,
        status_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        platforms JSONB DEFAULT '[]',
        personal_rating REAL,
        personal_notes TEXT,
        tags JSONB DEFAULT '[]',
        primary_platform TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        version INTEGER DEFAULT 1,
        UNIQUE(user_id, game_id)
      )`,
      `CREATE TABLE IF NOT EXISTS game_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        platform_type TEXT NOT NULL,
        platform_name TEXT NOT NULL,
        start_time TIMESTAMP WITH TIME ZONE NOT NULL,
        end_time TIMESTAMP WITH TIME ZONE,
        duration INTEGER,
        session_type TEXT,
        players JSONB DEFAULT '[]',
        notes TEXT,
        auto_tracked INTEGER DEFAULT 0,
        source TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        version INTEGER DEFAULT 1
      )`,
      `CREATE TABLE IF NOT EXISTS game_achievements (
        id SERIAL PRIMARY KEY,
        game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        external_id TEXT,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        icon_url TEXT,
        hidden INTEGER DEFAULT 0,
        points INTEGER NOT NULL DEFAULT 0,
        rarity REAL,
        category TEXT,
        unlock_condition TEXT,
        unlock_percentage REAL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        version INTEGER DEFAULT 1,
        UNIQUE(game_id, external_id)
      )`,
      `CREATE TABLE IF NOT EXISTS user_achievements (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        achievement_id INTEGER NOT NULL REFERENCES game_achievements(id) ON DELETE CASCADE,
        unlocked INTEGER DEFAULT 0,
        unlocked_at TIMESTAMP WITH TIME ZONE,
        unlock_platform TEXT,
        progress REAL,
        target REAL,
        progress_updated_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        version INTEGER DEFAULT 1,
        UNIQUE(user_id, achievement_id)
      )`,
      'CREATE INDEX IF NOT EXISTS idx_user_game_library_user_id ON user_game_library(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_game_library_game_id ON user_game_library(game_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_game_library_status ON user_game_library(status)',
      'CREATE INDEX IF NOT EXISTS idx_user_game_library_primary_platform ON user_game_library(primary_platform)',
      'CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_game_sessions_game_id ON game_sessions(game_id)',
      'CREATE INDEX IF NOT EXISTS idx_game_sessions_start_time ON game_sessions(start_time)',
      'CREATE INDEX IF NOT EXISTS idx_game_sessions_platform_type ON game_sessions(platform_type)',
      'CREATE INDEX IF NOT EXISTS idx_game_achievements_game_id ON game_achievements(game_id)',
      'CREATE INDEX IF NOT EXISTS idx_game_achievements_external_id ON game_achievements(external_id)',
      'CREATE INDEX IF NOT EXISTS idx_game_achievements_category ON game_achievements(category)',
      'CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_achievements_game_id ON user_achievements(game_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON user_achievements(unlocked)',
    ]);

    /**
     * 迁移 008：密码重置字段
     *
     * 为 users 表添加 reset_token 和 reset_token_expires 字段，
     * 支持基于令牌的密码重置流程。
     */
    await apply('008_add_password_reset_fields', [
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP WITH TIME ZONE',
    ]);

    /**
     * 迁移 009：关于页面内容
     *
     * 创建 about_sections（章节）、about_values（核心价值观）、
     * about_team_members（团队成员）、about_timeline（发展历程）、
     * about_contacts（联系方式）表，并插入预设的"关于我们"页面数据。
     */
    await apply('009_create_about_content', [
      `CREATE TABLE IF NOT EXISTS about_sections (
        id SERIAL PRIMARY KEY,
        section_key TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        image_url TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS about_values (
        id SERIAL PRIMARY KEY,
        icon TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS about_team_members (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        avatar_url TEXT,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS about_timeline (
        id SERIAL PRIMARY KEY,
        year TEXT NOT NULL,
        title TEXT,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS about_contacts (
        id SERIAL PRIMARY KEY,
        label TEXT NOT NULL,
        value TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      `INSERT INTO about_sections (section_key, title, description, sort_order) VALUES
        ('hero', '关于 GameHub', 'GameHub 是一个专注于游戏爱好者的社区平台，我们致力于为玩家提供最好的游戏资讯、评测、交流和发现体验。', 1),
        ('mission', '我们的使命', '连接全球游戏爱好者，打造一个开放、包容、专业的游戏社区。我们相信游戏不仅仅是娱乐，更是连接人与人、文化与文化的桥梁。通过 GameHub，我们希望帮助玩家发现更多优质游戏，分享游戏体验，建立有意义的连接。', 2),
        ('vision', '我们的愿景', '成为全球最受玩家信赖的游戏社区平台，为数百万游戏爱好者提供最好的服务。我们致力于构建一个集游戏资讯、评测、社区、交易于一体的综合性平台，让每个玩家都能在这里找到属于自己的游戏家园。', 3)
      ON CONFLICT (section_key) DO NOTHING`,
      `INSERT INTO about_values (icon, title, description, sort_order) VALUES
        ('TeamOutlined', '玩家至上', '我们始终将玩家的需求和体验放在首位，致力于打造最优质的游戏社区平台。', 1),
        ('RocketOutlined', '技术创新', '不断探索和应用最新技术，为玩家提供流畅、智能的游戏服务平台。', 2),
        ('HeartOutlined', '热爱游戏', '我们是一群热爱游戏的开发者，希望通过我们的平台连接更多游戏爱好者。', 3),
        ('TrophyOutlined', '追求卓越', '在内容质量、用户体验和技术创新上追求极致，永不满足于现状。', 4)
      ON CONFLICT DO NOTHING`,
      `INSERT INTO about_team_members (name, role, avatar_url, description, sort_order) VALUES
        ('王敏超', '创始人', '/avatars/wangminchao.jpg', 'GameHub 创始人，全面负责公司战略与产品方向', 1),
        ('杨俊杰', '技术总监', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop', '全栈开发专家，负责平台技术架构与研发管理', 2),
        ('Bella', '内容总监', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=200&auto=format&fit=crop', '资深游戏媒体人，负责平台内容策略与运营', 3),
        ('谷志锋', '社区经理', 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=200&auto=format&fit=crop', '社区运营专家，负责用户增长与社区生态建设', 4)
      ON CONFLICT DO NOTHING`,
      `INSERT INTO about_timeline (year, title, description, sort_order) VALUES
        ('2025年10月', '项目启动', 'GameHub 项目启动，开始产品研发', 1),
        ('2025年12月', '团队组建完成', '核心团队组建完成，确定产品方向', 2),
        ('2026 Q1', '内测版上线', '平台内测版上线，获得首批用户', 3),
        ('2026年5月', '正式版发布', '正式版发布，面向全球游戏玩家', 4)
      ON CONFLICT DO NOTHING`,
      `INSERT INTO about_contacts (label, value, sort_order) VALUES
        ('邮箱', 'wangmin_chao@foxmail.com', 1),
        ('商务合作', 'wangmin_chao@foxmail.com', 2),
        ('用户支持', 'wangmin_chao@foxmail.com', 3)
      ON CONFLICT DO NOTHING`,
    ]);

    /**
     * 迁移 010：用户等级与权限系统
     *
     * 为 users 表添加 level（等级）、total_login_time（累计登录时长）、
     * phone（手机号）、comment_frozen（评论冻结）等字段。
     * 创建 login_logs（登录日志）、audit_logs（审计日志）、
     * admin_monitoring_scopes（管理员监控范围）、user_permission_changes（权限变更记录）、
     * system_configs（系统配置）表。
     * 插入预设的等级门槛配置数据。
     */
    await apply('010_add_user_level_and_permission_system', [
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS total_login_time REAL DEFAULT 0',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified INTEGER DEFAULT 0',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS comment_frozen INTEGER DEFAULT 0',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS frozen_until TIMESTAMP WITH TIME ZONE',
      `CREATE TABLE IF NOT EXISTS login_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        login_time TIMESTAMP WITH TIME ZONE NOT NULL,
        logout_time TIMESTAMP WITH TIME ZONE,
        duration_minutes REAL DEFAULT 0,
        ip_address TEXT,
        user_agent TEXT,
        success INTEGER DEFAULT 1,
        fail_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        details JSONB,
        ip_address TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS admin_monitoring_scopes (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        monitored_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        scope_type TEXT NOT NULL DEFAULT 'user',
        scope_value TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS user_permission_changes (
        id SERIAL PRIMARY KEY,
        target_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        changed_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        change_type TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS system_configs (
        id SERIAL PRIMARY KEY,
        config_key TEXT UNIQUE NOT NULL,
        config_value TEXT NOT NULL,
        description TEXT,
        updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      `INSERT INTO system_configs (config_key, config_value, description) VALUES
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
        ('level.weight_coefficient', '0.5', '评论权重等级系数: 权重 = 基础分 + (等级-1) x 系数'),
        ('level.max_level', '10', '最高等级'),
        ('registration.email_enabled', 'true', '邮箱注册开关'),
        ('registration.phone_enabled', 'false', '手机注册开关')
      ON CONFLICT (config_key) DO NOTHING`,
    ]);

    /**
     * 迁移 011：用户标签与画像
     *
     * 创建 user_tags（用户标签定义）、user_tag_assignments（标签分配）、
     * user_segments（用户分群）、segment_members（分群成员）表。
     * 插入预设的用户标签（高活跃、内容创作者、新用户、核心玩家、沉睡用户、VIP）。
     */
    await apply('011_user_tags_and_profiling', [
      `CREATE TABLE IF NOT EXISTS user_tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        color VARCHAR(7) DEFAULT '#1890ff',
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS user_tag_assignments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tag_id INTEGER NOT NULL REFERENCES user_tags(id) ON DELETE CASCADE,
        assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, tag_id)
      )`,
      `CREATE TABLE IF NOT EXISTS user_segments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        criteria TEXT,
        is_dynamic INTEGER DEFAULT 0,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS segment_members (
        id SERIAL PRIMARY KEY,
        segment_id INTEGER NOT NULL REFERENCES user_segments(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        added_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(segment_id, user_id)
      )`,
      `INSERT INTO user_tags (name, color, description) VALUES
        ('高活跃', '#52c41a', '登录频率高的活跃用户'),
        ('内容创作者', '#1890ff', '发布过较多评测或帖子的用户'),
        ('新用户', '#faad14', '注册时间不足30天的新用户'),
        ('核心玩家', '#722ed1', '游戏库丰富、参与度高的用户'),
        ('沉睡用户', '#d9d9d9', '超过30天未登录的潜在流失用户'),
        ('VIP', '#f5222d', '特殊贡献或付费用户')
      ON CONFLICT (name) DO NOTHING`,
    ]);

    /**
     * 迁移 012：部署与备份
     *
     * 创建 deployments（部署记录）和 backups（备份记录）表，
     * 用于跟踪平台版本发布历史和数据备份状态。
     */
    await apply('012_add_deployment_and_backup_tables', [
      `CREATE TABLE IF NOT EXISTS deployments (
        id SERIAL PRIMARY KEY,
        version TEXT NOT NULL,
        description TEXT,
        branch TEXT,
        commit_hash TEXT,
        status TEXT DEFAULT 'pending',
        deployer_id INTEGER,
        deployer_name TEXT,
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        rollback_version TEXT,
        log TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS backups (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        file_size INTEGER DEFAULT 0,
        type TEXT DEFAULT 'manual',
        status TEXT DEFAULT 'completed',
        description TEXT,
        operator_id INTEGER,
        operator_name TEXT,
        db_version TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
    ]);

    /**
     * 迁移 013：搜索日志
     *
     * 创建 search_logs 表记录用户搜索查询，包括查询内容、
     * 结果数量和过滤条件，用于搜索分析和优化。
     */
    await apply('013_add_search_logs', [
      `CREATE TABLE IF NOT EXISTS search_logs (
        id SERIAL PRIMARY KEY,
        query TEXT NOT NULL,
        result_count INTEGER DEFAULT 0,
        user_id TEXT,
        ip_address TEXT,
        filters JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      'CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON search_logs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_search_logs_query ON search_logs(query)',
      'CREATE INDEX IF NOT EXISTS idx_search_logs_user_id ON search_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_search_logs_query_date ON search_logs(query, created_at)',
    ]);

    /**
     * 迁移 014：游戏化系统
     *
     * 为 users 表添加 total_xp（总经验值）和 total_points（总积分）字段。
     * 创建 xp_transactions（经验值流水）、point_transactions（积分流水）、
     * platform_achievements（平台成就定义）、user_platform_achievements（用户成就解锁）、
     * conversations（私信会话）、conversation_participants（会话参与者）、
     * messages（私信消息）表。
     * 插入预设的平台成就数据（如首次评测、资深评测师等）。
     */
    await apply('014_gamification_system', [
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0',
      `CREATE TABLE IF NOT EXISTS xp_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action_key TEXT NOT NULL,
        xp_amount INTEGER NOT NULL,
        balance_after INTEGER NOT NULL,
        reference_type TEXT,
        reference_id INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      'CREATE INDEX IF NOT EXISTS idx_xp_transactions_user ON xp_transactions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_xp_transactions_action ON xp_transactions(user_id, action_key)',
      'CREATE INDEX IF NOT EXISTS idx_xp_transactions_created ON xp_transactions(user_id, created_at DESC)',
      `CREATE TABLE IF NOT EXISTS point_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action_key TEXT NOT NULL,
        points_amount INTEGER NOT NULL,
        balance_after INTEGER NOT NULL,
        reference_type TEXT,
        reference_id INTEGER,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      'CREATE INDEX IF NOT EXISTS idx_point_transactions_user ON point_transactions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_point_transactions_created ON point_transactions(user_id, created_at DESC)',
      `CREATE TABLE IF NOT EXISTS platform_achievements (
        id SERIAL PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        icon_url TEXT,
        category TEXT NOT NULL CHECK (category IN ('social', 'content', 'growth', 'milestone')),
        requirement_type TEXT NOT NULL,
        requirement_value INTEGER NOT NULL,
        xp_reward INTEGER DEFAULT 0,
        points_reward INTEGER DEFAULT 0,
        is_hidden INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        version INTEGER DEFAULT 1
      )`,
      `CREATE TABLE IF NOT EXISTS user_platform_achievements (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        achievement_id INTEGER NOT NULL REFERENCES platform_achievements(id) ON DELETE CASCADE,
        unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        notified INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, achievement_id)
      )`,
      'CREATE INDEX IF NOT EXISTS idx_upa_user ON user_platform_achievements(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_upa_achievement ON user_platform_achievements(achievement_id)',
      'CREATE INDEX IF NOT EXISTS idx_upa_unlocked ON user_platform_achievements(user_id, unlocked_at DESC)',
      `INSERT INTO platform_achievements (key, name, description, category, requirement_type, requirement_value, xp_reward, points_reward, sort_order) VALUES
        ('first_review', '初次评测', '发表第一篇游戏评测', 'content', 'review_count', 1, 100, 50, 1),
        ('ten_reviews', '资深评测师', '发表10篇游戏评测', 'content', 'review_count', 10, 500, 200, 2),
        ('first_post', '初次发帖', '在社区发表第一个帖子', 'content', 'post_count', 1, 50, 20, 3),
        ('fifty_posts', '社区活跃分子', '在社区发表50个帖子', 'content', 'post_count', 50, 500, 200, 4),
        ('hundred_comments', '评论达人', '发表100条评论', 'content', 'comment_count', 100, 300, 100, 5),
        ('reach_level_5', '中级玩家', '达到等级5', 'growth', 'level', 5, 200, 100, 6),
        ('reach_level_10', '满级玩家', '达到等级10', 'growth', 'level', 10, 1000, 500, 7),
        ('thousand_xp', '经验累积', '累计获得1000点经验值', 'growth', 'xp_total', 1000, 200, 100, 8),
        ('ten_thousand_xp', '经验大师', '累计获得10000点经验值', 'growth', 'xp_total', 10000, 2000, 1000, 9),
        ('first_follower', '初获关注', '获得第一个关注者', 'social', 'follower_count', 1, 50, 20, 10),
        ('hundred_followers', '人气之星', '获得100个关注者', 'social', 'follower_count', 100, 500, 200, 11)
      ON CONFLICT (key) DO NOTHING`,
      `CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        subject TEXT,
        type TEXT DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
        last_message_at TIMESTAMP WITH TIME ZONE,
        last_message_preview TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        version INTEGER DEFAULT 1
      )`,
      `CREATE TABLE IF NOT EXISTS conversation_participants (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_muted INTEGER DEFAULT 0,
        left_at TIMESTAMP WITH TIME ZONE,
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(conversation_id, user_id)
      )`,
      'CREATE INDEX IF NOT EXISTS idx_cp_user ON conversation_participants(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_cp_conversation ON conversation_participants(conversation_id)',
      `CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system')),
        reply_to_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        version INTEGER DEFAULT 1
      )`,
      'CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)',
      'CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)',
      'CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(conversation_id, created_at)',
    ]);

    /**
     * 迁移 015：攻略指南
     *
     * 创建 guides 表存储玩家分享的游戏攻略和指南文章，
     * 包含难度等级、步骤分解、推荐时长等字段。
     */
    await apply('015_create_guides', [
      `CREATE TABLE IF NOT EXISTS guides (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        difficulty TEXT DEFAULT 'medium',
        game_id INTEGER NOT NULL REFERENCES games(id),
        author_id INTEGER NOT NULL REFERENCES users(id),
        cover_image_url TEXT,
        tags TEXT,
        steps TEXT,
        is_featured INTEGER DEFAULT 0,
        is_published INTEGER DEFAULT 1,
        likes INTEGER DEFAULT 0,
        views INTEGER DEFAULT 0,
        estimated_minutes INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      'CREATE INDEX IF NOT EXISTS idx_guides_game_id ON guides(game_id)',
      'CREATE INDEX IF NOT EXISTS idx_guides_author_id ON guides(author_id)',
      'CREATE INDEX IF NOT EXISTS idx_guides_difficulty ON guides(difficulty)',
      'CREATE INDEX IF NOT EXISTS idx_guides_is_featured ON guides(is_featured)',
      'CREATE INDEX IF NOT EXISTS idx_guides_is_published ON guides(is_published)',
      'CREATE INDEX IF NOT EXISTS idx_guides_created_at ON guides(created_at)',
    ]);

    /**
     * 迁移 016：用户认证字段
     *
     * 为 users 表添加第三方登录 ID（Google、GitHub、Facebook、Twitter）、
     * 双因素认证字段（enabled、secret、backup_codes）、
     * 邮箱验证令牌、营销偏好和隐私设置等字段。
     */
    await apply('016_add_user_auth_columns', [
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS github_id TEXT',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_id TEXT',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_id TEXT',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled INTEGER DEFAULT 0',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_last_used TIMESTAMP WITH TIME ZONE',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_opt_in INTEGER DEFAULT 1',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS newsletter_subscription INTEGER DEFAULT 1',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS email_preferences TEXT',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_settings TEXT',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_settings TEXT',
      'CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)',
      'CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id)',
      'CREATE INDEX IF NOT EXISTS idx_users_facebook_id ON users(facebook_id)',
      'CREATE INDEX IF NOT EXISTS idx_users_twitter_id ON users(twitter_id)',
      'CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token)',
    ]);

    /**
     * 迁移 017：短信验证码
     *
     * 创建 sms_codes 表存储手机短信验证码，
     * 支持登录、注册、绑定、解绑等场景。
     */
    await apply('017_sms_codes', [
      `CREATE TABLE IF NOT EXISTS sms_codes (
        id SERIAL PRIMARY KEY,
        phone TEXT NOT NULL,
        code TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'login' CHECK (type IN ('login', 'register', 'bind', 'unbind')),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        verified_at TIMESTAMP WITH TIME ZONE,
        attempt_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      'CREATE INDEX IF NOT EXISTS idx_sms_codes_phone ON sms_codes(phone)',
      'CREATE INDEX IF NOT EXISTS idx_sms_codes_phone_type ON sms_codes(phone, type)',
      'CREATE INDEX IF NOT EXISTS idx_sms_codes_expires ON sms_codes(expires_at)',
    ]);

    /**
     * 迁移 018：验证令牌过期时间
     *
     * 为 users 表添加 verification_token_expires 字段，
     * 设置邮箱验证令牌的过期时间。
     */
    await apply('018_add_verification_expires', [
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP WITH TIME ZONE',
    ]);

    /**
     * 迁移 019：第三方社交账户
     *
     * 创建 social_accounts 表存储用户绑定的第三方社交账户信息，
     * 支持多平台 OAuth 登录的统一管理。
     */
    await apply('019_add_social_accounts', [
      `CREATE TABLE IF NOT EXISTS social_accounts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        provider_account_id TEXT NOT NULL,
        provider_username TEXT,
        provider_email TEXT,
        provider_avatar_url TEXT,
        provider_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(provider, provider_account_id)
      )`,
      'CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id ON social_accounts(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_social_accounts_provider ON social_accounts(provider, provider_account_id)',
      `INSERT INTO system_configs (config_key, config_value, description) VALUES
        ('oauth.qq.enabled', 'false', 'QQ登录是否启用'),
        ('oauth.wechat.enabled', 'false', '微信登录是否启用'),
        ('oauth.apple.enabled', 'false', 'Apple ID登录是否启用')
      ON CONFLICT (config_key) DO NOTHING`,
    ]);

    /**
     * 迁移 020：令牌版本管理
     *
     * 为 users 表添加 token_version 字段，
     * 支持令牌失效机制，管理员可强制用户重新登录。
     */
    await apply('020_add_admin_user_and_token_version', [
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0',
    ]);

    /**
     * 迁移 021：邮件订阅
     *
     * 创建 newsletter_subscriptions 表管理用户的邮件订阅状态，
     * 支持订阅类型、偏好设置和退订功能。
     */
    await apply('021_newsletter_subscriptions', [
      `CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        email TEXT NOT NULL,
        subscription_type TEXT NOT NULL DEFAULT 'newsletter',
        is_active INTEGER DEFAULT 1,
        subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        unsubscribed_at TIMESTAMP WITH TIME ZONE,
        preferences JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        version INTEGER DEFAULT 1
      )`,
      'CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_email ON newsletter_subscriptions(email)',
      'CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_user_id ON newsletter_subscriptions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_active ON newsletter_subscriptions(is_active)',
    ]);

    /**
     * 迁移 022：更新关于页面团队和联系方式数据
     *
     * 更新 about_team_members 和 about_contacts 表中
     * 预设的团队成员信息和联系方式数据。
     */
    await apply('022_update_about_team_and_contacts', [
      `UPDATE about_team_members SET name = '王敏超', role = '创始人', avatar_url = '/avatars/wangminchao.jpg', description = 'GameHub 创始人，全面负责公司战略与产品方向' WHERE sort_order = 1`,
      `UPDATE about_team_members SET name = '杨俊杰', role = '技术总监', description = '全栈开发专家，负责平台技术架构与研发管理' WHERE sort_order = 2`,
      `UPDATE about_team_members SET name = 'Bella', role = '内容总监', description = '资深游戏媒体人，负责平台内容策略与运营' WHERE sort_order = 3`,
      `UPDATE about_team_members SET name = '谷志锋', role = '社区经理', description = '社区运营专家，负责用户增长与社区生态建设' WHERE sort_order = 4`,
      `UPDATE about_contacts SET value = 'wangmin_chao@foxmail.com' WHERE label = '邮箱'`,
      `UPDATE about_contacts SET value = 'wangmin_chao@foxmail.com' WHERE label = '商务合作'`,
      `UPDATE about_contacts SET value = 'wangmin_chao@foxmail.com' WHERE label = '用户支持'`,
    ]);

    /**
     * 迁移 023：内容审核状态
     *
     * 为 news、community_posts、reviews、guides 表添加
     * review_status（审核状态）、review_comment（审核意见）、
     * reviewed_by（审核人）、reviewed_at（审核时间）字段。
     */
    await apply('023_add_content_review_status', [
      `ALTER TABLE news ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) NOT NULL DEFAULT 'approved'`,
      `ALTER TABLE news ADD COLUMN IF NOT EXISTS review_comment TEXT`,
      `ALTER TABLE news ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL`,
      `ALTER TABLE news ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE`,
      `ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) NOT NULL DEFAULT 'approved'`,
      `ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS review_comment TEXT`,
      `ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL`,
      `ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE`,
      `ALTER TABLE reviews ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) NOT NULL DEFAULT 'approved'`,
      `ALTER TABLE reviews ADD COLUMN IF NOT EXISTS review_comment TEXT`,
      `ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL`,
      `ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE`,
      `ALTER TABLE guides ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) NOT NULL DEFAULT 'approved'`,
      `ALTER TABLE guides ADD COLUMN IF NOT EXISTS review_comment TEXT`,
      `ALTER TABLE guides ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL`,
      `ALTER TABLE guides ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE`,
      `CREATE INDEX IF NOT EXISTS idx_news_review_status ON news(review_status)`,
      `CREATE INDEX IF NOT EXISTS idx_community_posts_review_status ON community_posts(review_status)`,
      `CREATE INDEX IF NOT EXISTS idx_reviews_review_status ON reviews(review_status)`,
      `CREATE INDEX IF NOT EXISTS idx_guides_review_status ON guides(review_status)`,
    ]);

    /**
     * 迁移 024：游戏专区论坛
     *
     * 为 community_posts 表添加 game_id 字段，将社区帖子关联到特定游戏，
     * 支持按游戏分区的讨论专区功能。
     */
    await apply('024_add_game_forum', [
      `ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS game_id INTEGER REFERENCES games(id) ON DELETE SET NULL`,
      `CREATE INDEX IF NOT EXISTS idx_community_posts_game_id ON community_posts(game_id)`,
    ]);

    /**
     * 迁移 025：补充缺失的列和博客表
     *
     * 修复历史遗留问题：
     * - news 表缺少 is_pinned 列（代码中使用但初始迁移未包含）
     * - reviews 表缺少 summary / pros / cons 列
     * - blog_spaces 和 blog_articles 表完全缺失（代码中使用但从未创建）
     */
    await apply('025_add_blog_tables_and_fix_news', [
      `ALTER TABLE news ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE reviews ADD COLUMN IF NOT EXISTS summary TEXT`,
      `ALTER TABLE reviews ADD COLUMN IF NOT EXISTS pros TEXT`,
      `ALTER TABLE reviews ADD COLUMN IF NOT EXISTS cons TEXT`,
      `CREATE TABLE IF NOT EXISTS blog_spaces (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        cover_image_url TEXT,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS blog_articles (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        content TEXT NOT NULL,
        excerpt TEXT,
        cover_image_url TEXT,
        author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        space_id INTEGER NOT NULL REFERENCES blog_spaces(id) ON DELETE CASCADE,
        category TEXT NOT NULL DEFAULT '博客',
        tags JSONB DEFAULT '[]',
        is_published BOOLEAN DEFAULT FALSE,
        is_pinned BOOLEAN DEFAULT FALSE,
        published_at TIMESTAMPTZ,
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        review_status TEXT NOT NULL DEFAULT 'pending',
        review_comment TEXT,
        reviewed_by INTEGER REFERENCES users(id),
        reviewed_at TIMESTAMPTZ,
        deleted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `ALTER TABLE email_templates DROP CONSTRAINT IF EXISTS email_templates_name_key`,
      `ALTER TABLE email_templates ADD CONSTRAINT email_templates_name_key UNIQUE (name)`,
    ]);

    /**
     * 迁移 026：新闻点赞表
     */
    await apply('026_news_likes', [
      `CREATE TABLE IF NOT EXISTS news_likes (
        id SERIAL PRIMARY KEY,
        news_id INTEGER NOT NULL REFERENCES news(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(news_id, user_id)
      )`,
    ]);

    /**
     * 迁移 027：评论点赞表
     */
    await apply('027_comment_likes', [
      `CREATE TABLE IF NOT EXISTS comment_likes (
        id SERIAL PRIMARY KEY,
        comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(comment_id, user_id)
      )`,
    ]);

    /**
     * 迁移 028：AI 对话历史表
     */
    await apply('028_ai_history', [
      `CREATE TABLE IF NOT EXISTS ai_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT,
        content TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
    ]);

    /**
     * 迁移 029：推荐系统和横幅管理
     *
     * 创建 banners、featured_content、user_recommendations 三张表，
     * 支持首页横幅轮播、编辑精选内容、个性化推荐记录。
     */
    await apply('029_recommendations', [
      `CREATE TABLE IF NOT EXISTS banners (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        subtitle TEXT,
        image_url TEXT NOT NULL,
        link_url TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        position TEXT DEFAULT 'home',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS featured_content (
        id SERIAL PRIMARY KEY,
        content_type TEXT NOT NULL,
        content_id INTEGER NOT NULL,
        feature_type TEXT NOT NULL,
        topic_name TEXT,
        sort_order INTEGER DEFAULT 0,
        expires_at TIMESTAMPTZ,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(content_type, content_id, feature_type)
      )`,
      `CREATE TABLE IF NOT EXISTS user_recommendations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content_type TEXT NOT NULL,
        content_id INTEGER NOT NULL,
        score REAL DEFAULT 0,
        reason TEXT,
        is_clicked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
    ]);

    /**
     * 迁移 030：补全遗漏的表和列（与 SQLite 表结构对齐）
     *
     * - blog_favorites / blog_likes 表
     * - blog_articles / blog_spaces 补充列
     * - news / users / reviews / guides 补充列
     */
    await apply('030_add_blog_social_and_missing_columns', [
      // blog 社交表
      `CREATE TABLE IF NOT EXISTS blog_favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        article_id INTEGER NOT NULL REFERENCES blog_articles(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, article_id)
      )`,
      `CREATE TABLE IF NOT EXISTS blog_likes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        article_id INTEGER NOT NULL REFERENCES blog_articles(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, article_id)
      )`,
      // blog_articles 补充列
      `ALTER TABLE blog_articles ADD COLUMN IF NOT EXISTS cons TEXT`,
      `ALTER TABLE blog_articles ADD COLUMN IF NOT EXISTS pros TEXT`,
      `ALTER TABLE blog_articles ADD COLUMN IF NOT EXISTS rating REAL`,
      `ALTER TABLE blog_articles ADD COLUMN IF NOT EXISTS game_id INTEGER REFERENCES games(id) ON DELETE SET NULL`,
      `ALTER TABLE blog_articles ADD COLUMN IF NOT EXISTS post_type TEXT NOT NULL DEFAULT 'blog'`,
      // blog_spaces 补充列
      `ALTER TABLE blog_spaces ADD COLUMN IF NOT EXISTS game_id INTEGER REFERENCES games(id) ON DELETE SET NULL`,
      // news 补充列
      `ALTER TABLE news ADD COLUMN IF NOT EXISTS game_name TEXT`,
      // users 补充列
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'dark'`,
      // reviews 补充列
      `ALTER TABLE reviews ADD COLUMN IF NOT EXISTS space_id INTEGER REFERENCES blog_spaces(id) ON DELETE SET NULL`,
      // guides 补充列
      `ALTER TABLE guides ADD COLUMN IF NOT EXISTS space_id INTEGER REFERENCES blog_spaces(id) ON DELETE SET NULL`,
    ]);

    logger.info('PostgreSQL数据库迁移完成');
  } catch (error) {
    logger.error('PostgreSQL数据库迁移失败:', error);
    throw error;
  }
};

/**
 * PostgreSQL 数据库模块默认导出
 *
 * 聚合所有数据库操作方法为一个默认导出对象，
 * 与 SQLite 模块保持一致的接口签名，方便上层统一调用。
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
