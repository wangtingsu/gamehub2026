#!/usr/bin/env ts-node

/**
 * GameHub 数据库迁移工具
 *
 * 本脚本提供数据库 schema 的版本化管理功能，支持三个命令：
 *   npm run migrate:up     — 运行所有待处理的迁移（执行 .sql 文件）
 *   npm run migrate:down   — 回滚最后一次迁移（从迁移表中移除记录）
 *   npm run migrate:status — 显示所有迁移文件的状态（已应用 / 待处理）
 *
 * 迁移文件约定：
 * - 放置于 backend/migrations/ 目录下
 * - 以 .sql 扩展名结尾
 * - 按文件名排序依次执行（建议使用时间戳或序号前缀命名）
 * - 文件内容为纯 SQL 语句，以分号分隔
 *
 * 迁移记录表（schema_migrations）自动创建，用于追踪已应用的迁移。
 */

import path from 'path';
import fs from 'fs';
import { connectDatabase, query, execute } from '../src/db';
import logger from '../src/utils/logger';

/** 迁移文件所在目录 */
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

/** 数据库中用于记录迁移历史的表名 */
const MIGRATION_TABLE = 'schema_migrations';

// ================================================================
// 内部辅助函数
// ================================================================

/**
 * 确保迁移记录表存在
 *
 * 如果表不存在则自动创建，结构为：
 * - id:            自增主键
 * - migration_name: 迁移文件名（唯一约束）
 * - applied_at:     应用时间戳（默认当前时间）
 */
async function ensureMigrationTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      migration_name TEXT UNIQUE NOT NULL,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await execute(sql);
  logger.debug('迁移表已就绪');
}

/**
 * 查询已应用的迁移文件列表
 *
 * @returns 已应用迁移的文件名数组，按 id 升序排列
 */
async function getAppliedMigrations(): Promise<string[]> {
  try {
    const rows = await query<{ migration_name: string }>(
      `SELECT migration_name FROM ${MIGRATION_TABLE} ORDER BY id ASC`
    );
    return rows.map(row => row.migration_name);
  } catch (error) {
    // 表可能不存在，返回空列表
    return [];
  }
}

/**
 * 扫描迁移目录，获取所有 .sql 文件并按文件名排序
 *
 * @returns 排序后的迁移文件名数组
 */
function getMigrationFiles(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    logger.warn(`迁移目录不存在: ${MIGRATIONS_DIR}`);
    return [];
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort(); // 按文件名排序

  return files;
}

/**
 * 读取迁移文件的内容
 *
 * @param filename 迁移文件名
 * @returns 文件内容的完整字符串
 */
function readMigrationFile(filename: string): string {
  const filePath = path.join(MIGRATIONS_DIR, filename);
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * 执行单个迁移文件
 *
 * 将 SQL 文件按分号分割为独立语句，逐条执行。
 * 执行完所有语句后，在迁移表中插入一条记录。
 *
 * @param filename  迁移文件名
 * @param direction 'up' 执行迁移 / 'down' 回滚（down 尚未完整实现）
 */
async function runMigration(filename: string, direction: 'up' | 'down') {
  const content = readMigrationFile(filename);

  if (direction === 'up') {
    logger.info(`应用迁移: ${filename}`);

    // 分割 SQL 语句（以分号分隔，去除空白）
    const statements = content
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    // 逐条执行
    for (const sql of statements) {
      try {
        await execute(sql);
        logger.debug(`执行SQL: ${sql.substring(0, 100)}...`);
      } catch (error) {
        logger.error(`执行SQL失败: ${sql.substring(0, 100)}...`, error);
        throw error;
      }
    }

    // 记录迁移
    await execute(
      `INSERT INTO ${MIGRATION_TABLE} (migration_name) VALUES (?)`,
      [filename]
    );

    logger.info(`迁移完成: ${filename}`);
  } else {
    logger.warn(`down迁移尚未实现: ${filename}`);
    // TODO: 未来可以实现实际的 down SQL 回滚逻辑
  }
}

// ================================================================
// 公开 API
// ================================================================

/**
 * 运行所有待处理的迁移
 *
 * 流程：连接数据库 -> 确保迁移表存在 -> 获取已应用列表 ->
 *       筛选待处理文件 -> 逐个执行 up 迁移
 */
export async function migrateUp() {
  try {
    await connectDatabase();
    await ensureMigrationTable();

    const applied = await getAppliedMigrations();
    const allFiles = getMigrationFiles();
    const pending = allFiles.filter(file => !applied.includes(file));

    if (pending.length === 0) {
      logger.info('没有待处理的迁移');
      return;
    }

    logger.info(`发现 ${pending.length} 个待处理迁移`);

    for (const filename of pending) {
      await runMigration(filename, 'up');
    }

    logger.info('所有迁移完成');
  } catch (error) {
    logger.error('迁移失败:', error);
    process.exit(1);
  }
}

/**
 * 回滚最后一次迁移
 *
 * 当前实现仅从迁移记录表中移除最后一条记录，
 * 尚未实现反向 SQL 的执行。
 */
export async function migrateDown() {
  try {
    await connectDatabase();
    await ensureMigrationTable();

    const applied = await getAppliedMigrations();

    if (applied.length === 0) {
      logger.info('没有已应用的迁移');
      return;
    }

    const lastMigration = applied[applied.length - 1];
    logger.info(`回滚迁移: ${lastMigration}`);

    // 从迁移记录表中删除该记录
    await execute(
      `DELETE FROM ${MIGRATION_TABLE} WHERE migration_name = ?`,
      [lastMigration]
    );

    logger.info(`已回滚: ${lastMigration}`);
  } catch (error) {
    logger.error('回滚失败:', error);
    process.exit(1);
  }
}

/**
 * 显示所有迁移文件的状态
 *
 * 列出每个迁移文件是「已应用」还是「待处理」，
 * 并给出汇总统计。
 */
export async function migrateStatus() {
  try {
    await connectDatabase();
    await ensureMigrationTable();

    const applied = await getAppliedMigrations();
    const allFiles = getMigrationFiles();

    console.log('\n迁移状态:');
    console.log('='.repeat(80));

    for (const file of allFiles) {
      const status = applied.includes(file) ? '✅ 已应用' : '⏳ 待处理';
      console.log(`${status} ${file}`);
    }

    console.log(`\n总计: ${allFiles.length} 个迁移文件, ${applied.length} 个已应用, ${allFiles.length - applied.length} 个待处理`);
  } catch (error) {
    logger.error('获取迁移状态失败:', error);
    process.exit(1);
  }
}

// ================================================================
// 命令行入口
// ================================================================

async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'up':
      await migrateUp();
      break;
    case 'down':
      await migrateDown();
      break;
    case 'status':
      await migrateStatus();
      break;
    default:
      console.log(`
数据库迁移工具

用法:
  npm run migrate:up     # 运行所有待处理的迁移
  npm run migrate:down   # 回滚最后一次迁移
  npm run migrate:status # 显示迁移状态

或者直接运行:
  ts-node scripts/migrate.ts [up|down|status]
      `);
      process.exit(1);
  }

  process.exit(0);
}

/** 如果作为独立脚本直接运行，则进入 main */
if (require.main === module) {
  main().catch(error => {
    logger.error('迁移工具执行失败:', error);
    process.exit(1);
  });
}
