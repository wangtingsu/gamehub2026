/**
 * 管理端数据库备份与恢复路由模块
 *
 * 本模块提供数据库备份的完整管理功能，包括：
 * - 备份列表查询（分页，自动同步文件系统状态）
 * - 创建新备份（使用 better-sqlite3 备份 API）
 * - 从备份恢复数据库（含恢复前自动快照保护）
 * - 下载备份文件
 * - 删除备份记录及物理文件
 *
 * 所有接口均需管理员身份验证（adminAuthenticate 中间件全局应用）
 *
 * @module routes/admin-backup
 */

import { Router, Request, Response } from 'express';
import { adminAuthenticate } from '../middlewares/admin-auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import { query, execute, getConnection } from '../db';
import config from '../config';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs';

const router = Router();

// 全局应用管理员身份验证中间件，以下所有路由均需管理员权限
router.use(adminAuthenticate);

/**
 * 备份文件存储目录
 * 存储在项目根目录下的 backups/ 文件夹中
 */
const BACKUP_DIR = path.resolve(process.cwd(), 'backups');

// 确保备份目录存在（启动时自动创建）
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// ========== 备份管理 ==========

/**
 * 获取备份列表（分页）
 *
 * 自动同步文件系统状态：检查每条备份记录对应的物理文件是否存在，
 * 如果文件已被删除，将状态标记为 'file_missing' 并同步最新的文件大小。
 *
 * @route GET /api/v1/admin/backups
 * @access Private/Admin — 通过 router.use(adminAuthenticate) 全局保护
 * @query {number} [page=1] - 页码，最小为 1
 * @query {number} [limit=20] - 每页条数，范围 1~100
 * @returns {Object} 包含备份列表和分页信息的 JSON 响应
 */
router.get('/backups', asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const offset = (page - 1) * limit;

  const countResult = await query('SELECT COUNT(*) as total FROM backups');
  const total = (countResult[0] as any)?.total || 0;

  const backups = await query(
    'SELECT * FROM backups ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );

  // 同步文件系统状态：检查备份文件是否仍然存在
  const syncedBackups = [];
  for (const bk of backups) {
    const b = bk as any;
    const filePath = b.filepath;
    if (filePath && fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      b.file_size = stat.size;
    } else {
      b.status = 'file_missing';
    }
    syncedBackups.push(b);
  }

  res.json({
    success: true,
    data: {
      backups: syncedBackups,
      pagination: { page, limit, total, pages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 },
    },
  });
}));

/**
 * 创建新备份
 *
 * 使用 better-sqlite3 的 backup API 创建数据库快照文件，
 * 并将备份记录写入数据库，包含文件大小、数据库版本等元信息。
 * 备份文件命名格式：gamehub-backup-{timestamp}.db
 *
 * @route POST /api/v1/admin/backups
 * @access Private/Admin
 * @param {Object} req.body - 请求体
 * @param {string} [req.body.description] - 备份描述
 * @returns {Object} 包含新备份 ID、文件名、大小和状态的 JSON 响应
 */
router.post('/backups', asyncHandler(async (req: Request, res: Response) => {
  const { description } = req.body;
  const currentUser = (req as any).user;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `gamehub-backup-${timestamp}.db`;
  const filepath = path.join(BACKUP_DIR, filename);

  // 根据数据库类型执行备份
  try {
    const { execSync } = require('child_process');

    // SQLite: 使用 better-sqlite3 backup API
    const db = getConnection();
    await db.backup(filepath, {
      progress({ totalPages, remainingPages }: { totalPages: number; remainingPages: number }) {
        logger.debug(`备份进度: ${totalPages - remainingPages}/${totalPages} 页`);
      },
    });

    // 使用实际的文件路径
    const actualFile = filepath;
    const fileSize = fs.existsSync(actualFile) ? fs.statSync(actualFile).size : 0;

    // 获取数据库版本
    let dbVersion = 'unknown';
    try {
      const verResult = await query('SELECT sqlite_version() as ver');
      dbVersion = (verResult[0] as any)?.ver || 'unknown';
    } catch {
      dbVersion = 'unknown';
    }

    const result = await execute(
      `INSERT INTO backups (filename, filepath, file_size, type, status, description, operator_id, operator_name, db_version, created_at)
       VALUES ($1, $2, $3, 'manual', 'completed', $4, $5, $6, $7, $8)`,
      [
        path.basename(actualFile),
        actualFile,
        fileSize,
        description || `手动备份 by ${currentUser.displayName || currentUser.username}`,
        currentUser.id,
        currentUser.displayName || currentUser.username,
        dbVersion,
        new Date().toISOString(),
      ]
    );

    logger.info(`数据库备份成功: ${path.basename(actualFile)}, 大小: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);

    res.json({
      success: true,
      data: { id: result.lastInsertRowid || result.insertId, filename: path.basename(actualFile), file_size: fileSize, status: 'completed' },
      message: '备份创建成功',
    });
  } catch (err: any) {
    logger.error('数据库备份失败:', err);
    res.status(500).json({ success: false, message: `备份失败: ${err.message}` });
  }
}));

/**
 * 从指定备份文件恢复数据库
 *
 * 恢复流程：
 * 1. 先创建当前数据库的备份快照（pre-restore snapshot），作为安全回退点
 * 2. 关闭当前数据库连接
 * 3. 用备份文件替换当前数据库文件
 * 4. 删除 WAL/SHM 文件以强制冷启动
 * 5. 重新建立数据库连接
 * 6. 记录恢复操作到备份表和审计日志
 *
 * @route POST /api/v1/admin/backups/:id/restore
 * @access Private/Admin
 * @param {number} req.params.id - 要恢复的备份记录 ID
 * @returns {Object} 包含恢复操作结果和恢复前快照信息的 JSON 响应
 */
router.post('/backups/:id/restore', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const currentUser = (req as any).user;

  const backups = await query('SELECT * FROM backups WHERE id = ?', [id]);
  if (!backups.length) {
    return res.status(404).json({ success: false, message: '备份记录不存在' });
  }

  const backup = backups[0] as any;

  if (!fs.existsSync(backup.filepath)) {
    return res.status(404).json({ success: false, message: '备份文件不存在，可能已被删除' });
  }

  // 恢复前先创建当前数据库的备份（安全快照，用于回退）
  const preRestoreTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const preRestoreSuffix = '.db';
  const preRestoreFilename = `pre-restore-snapshot-${preRestoreTimestamp}${preRestoreSuffix}`;
  const preRestoreFilepath = path.join(BACKUP_DIR, preRestoreFilename);

  try {
    const { execSync } = require('child_process');

    // SQLite: 使用 better-sqlite3 backup API
    const db = getConnection();
    await db.backup(preRestoreFilepath);

    const dbPath = config.database.path || './data/gamehub.db';
    const absDbPath = path.resolve(process.cwd(), dbPath);

    const { closeDatabase } = require('../db');
    await closeDatabase();

    fs.copyFileSync(backup.filepath, absDbPath);
    ['-wal', '-shm'].forEach(suffix => {
      const p = absDbPath + suffix;
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });

    const { connectDatabase } = require('../db');
    await connectDatabase();

    // 记录恢复操作到备份表
    const preRestoreSize = fs.existsSync(preRestoreFilepath) ? fs.statSync(preRestoreFilepath).size : 0;
    await execute(
      `INSERT INTO backups (filename, filepath, file_size, type, status, description, operator_id, operator_name, created_at)
       VALUES ($1, $2, $3, 'pre_restore', 'completed', $4, $5, $6, $7)`,
      [
        preRestoreFilename,
        preRestoreFilepath,
        preRestoreSize,
        `恢复前自动快照 (还原自备份 #${id})`,
        currentUser.id,
        currentUser.displayName || currentUser.username,
        new Date().toISOString(),
      ]
    );

    logger.warn(`数据库已从备份恢复: ${backup.filename}, 操作人: ${currentUser.username}`);

    res.json({
      success: true,
      message: '数据库已从备份恢复成功',
      data: { preRestoreSnapshot: preRestoreFilename },
    });
  } catch (err: any) {
    logger.error('数据库恢复失败:', err);
    res.status(500).json({ success: false, message: `恢复失败: ${err.message}` });
  }
}));

/**
 * 下载指定备份文件
 *
 * @route GET /api/v1/admin/backups/:id/download
 * @access Private/Admin
 * @param {number} req.params.id - 备份记录 ID
 * @returns {Stream} 以文件流形式返回备份文件供下载
 */
router.get('/backups/:id/download', asyncHandler(async (req: Request, res: Response) => {
  const backups = await query('SELECT * FROM backups WHERE id = ?', [req.params.id]);
  if (!backups.length) {
    return res.status(404).json({ success: false, message: '备份记录不存在' });
  }
  const backup = backups[0] as any;

  if (!fs.existsSync(backup.filepath)) {
    return res.status(404).json({ success: false, message: '备份文件不存在' });
  }

  res.download(backup.filepath, backup.filename);
}));

/**
 * 删除指定备份记录及对应的物理文件
 *
 * @route DELETE /api/v1/admin/backups/:id
 * @access Private/Admin
 * @param {number} req.params.id - 要删除的备份记录 ID
 * @returns {Object} 包含操作结果的 JSON 响应
 */
router.delete('/backups/:id', asyncHandler(async (req: Request, res: Response) => {
  const backups = await query('SELECT * FROM backups WHERE id = ?', [req.params.id]);
  if (!backups.length) {
    return res.status(404).json({ success: false, message: '备份记录不存在' });
  }
  const backup = backups[0] as any;

  // 删除物理文件
  if (backup.filepath && fs.existsSync(backup.filepath)) {
    try {
      fs.unlinkSync(backup.filepath);
    } catch (err) {
      logger.warn(`删除备份文件失败: ${backup.filepath}`, err);
    }
  }

  await execute('DELETE FROM backups WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: '备份已删除' });
}));

export default router;
