/**
 * GameHub 后端测试全局配置文件
 *
 * 本文件在整个测试套件运行前执行，负责：
 * - 设置测试环境变量（使用 SQLite 内存数据库）
 * - 在全局 beforeAll 中建立测试数据库连接
 * - 在全局 afterAll 中关闭测试数据库连接
 * - 提供 beforeEach 钩子供测试数据清理使用
 */

// ============================================================
// 测试环境变量设置
// 将所有环境变量切换为测试模式，使用 SQLite 内存数据库
// 避免对开发/生产数据库造成影响
// ============================================================
process.env.NODE_ENV = 'test';
process.env.DB_TYPE = 'sqlite';
// 从已有的开发数据库复制到测试数据库（开发库有完整模式，避免迁移链中的列缺失问题）
// 测试完成后清理测试数据库
process.env.DATABASE_URL = 'sqlite://./data/test.db';
process.env.DB_PATH = './data/test.db';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { connectDatabase, closeDatabase } from '../src/db';
import logger from '../src/utils/logger';

// 从开发数据库复制到测试数据库（确保模式完整）
const srcDb = path.join(__dirname, '..', 'data', 'gamehub.db');
const dstDb = path.join(__dirname, '..', 'data', 'test.db');

/** 在所有测试用例执行之前，建立测试数据库连接 */
beforeAll(async () => {
  try {
    // 使用 sqlite3 CLI 的 VACUUM INTO 创建测试数据库副本
    // 确保所有 WAL 变更都已写入，模式完整
    if (fs.existsSync(srcDb)) {
      // 清理旧的测试数据库
      if (fs.existsSync(dstDb)) fs.unlinkSync(dstDb);
      if (fs.existsSync(dstDb + '-wal')) fs.unlinkSync(dstDb + '-wal');
      if (fs.existsSync(dstDb + '-shm')) fs.unlinkSync(dstDb + '-shm');

      // 使用 better-sqlite3 的 backup API 复制数据库
      // 避免直接文件复制可能导致的 WAL 不一致
      const Database = require('better-sqlite3');
      const src = new Database(srcDb, { readonly: true });
      await src.backup(dstDb);
      src.close();
      logger.info('测试数据库已从开发数据库复制（含完整 WAL 变更）');
    }
    await connectDatabase();
    logger.info('测试数据库连接成功');
  } catch (error) {
    logger.error('测试数据库连接失败:', error);
    throw error;
  }
});

/** 在所有测试用例执行完毕之后，关闭测试数据库连接并清理测试文件 */
afterAll(async () => {
  try {
    await closeDatabase();
    logger.info('测试数据库连接已关闭');
    // 清理测试数据库文件
    if (fs.existsSync(dstDb)) {
      fs.unlinkSync(dstDb);
    }
    if (fs.existsSync(dstDb + '-wal')) {
      fs.unlinkSync(dstDb + '-wal');
    }
    if (fs.existsSync(dstDb + '-shm')) {
      fs.unlinkSync(dstDb + '-shm');
    }
    logger.info('测试数据库文件已清理');
  } catch (error) {
    logger.error('关闭测试数据库连接时出错:', error);
  }
});

/** 在每个测试用例执行之前，清理测试数据 */
beforeEach(async () => {
  // 注意：由各测试文件自行管理数据隔离
  // 此处预留钩子供子测试套件使用
});