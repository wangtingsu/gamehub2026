/**
 * 管理端部署管理路由模块
 *
 * 本模块提供应用部署的完整管理功能，包括：
 * - 部署列表查询（分页，支持按状态筛选）
 * - 创建新部署任务
 * - 更新部署状态及日志
 * - 获取单个部署详情
 * - 回滚部署（自动创建新的回滚部署记录）
 * - 删除部署记录
 *
 * 所有接口均需管理员身份验证（adminAuthenticate 中间件全局应用）
 *
 * @module routes/admin-deployment
 */

import { Router, Request, Response } from 'express';
import { adminAuthenticate } from '../middlewares/admin-auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import { query, execute } from '../db';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import config from '../config';

const router = Router();

// 全局应用管理员身份验证中间件，以下所有路由均需管理员权限
router.use(adminAuthenticate);

// ========== 部署管理 ==========

/**
 * 获取部署列表（分页，支持状态筛选）
 *
 * @route GET /api/v1/admin/deployments
 * @access Private/Admin — 通过 router.use(adminAuthenticate) 全局保护
 * @query {number} [page=1] - 页码，最小为 1
 * @query {number} [limit=20] - 每页条数，范围 1~100
 * @query {string} [status] - 按部署状态筛选（如 'deploying' | 'success' | 'failed' 等）
 * @returns {Object} 包含部署列表和分页信息的 JSON 响应
 */
router.get('/deployments', asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const offset = (page - 1) * limit;
  const status = req.query.status as string;

  let countSql = 'SELECT COUNT(*) as total FROM deployments';
  let dataSql = 'SELECT * FROM deployments';
  const params: any[] = [];
  const countParams: any[] = [];

  if (status) {
    countSql += ' WHERE status = ?';
    dataSql += ' WHERE status = ?';
    countParams.push(status);
    params.push(status);
  }

  dataSql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const countResult = await query(countSql, countParams);
  const total = (countResult[0] as any)?.total || 0;
  const deployments = await query(dataSql, params);

  res.json({
    success: true,
    data: {
      deployments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    },
  });
}));

/**
 * 创建新部署任务
 *
 * 在数据库中插入一条部署记录，状态初始为 'deploying'，
 * 同时创建对应的审计日志记录。
 *
 * @route POST /api/v1/admin/deployments
 * @access Private/Admin
 * @param {Object} req.body - 请求体
 * @param {string} req.body.version - 部署版本号（必填）
 * @param {string} [req.body.description] - 部署描述
 * @param {string} [req.body.branch=main] - 部署分支
 * @param {string} [req.body.commit_hash] - 提交哈希
 * @returns {Object} 包含新部署 ID、版本号和状态的 JSON 响应
 */
router.post('/deployments', asyncHandler(async (req: Request, res: Response) => {
  const { version, description, branch, commit_hash } = req.body;
  const currentUser = (req as any).user;

  if (!version) {
    return res.status(400).json({ success: false, message: '版本号不能为空' });
  }

  const now = new Date().toISOString();
  const result = await execute(
    `INSERT INTO deployments (version, description, branch, commit_hash, status, deployer_id, deployer_name, started_at, log, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'deploying', ?, ?, ?, ?, ?, ?)`,
    [
      version,
      description || '',
      branch || 'main',
      commit_hash || '',
      currentUser.id,
      currentUser.displayName || currentUser.username,
      now,
      `[${now}] 开始部署版本 ${version}...\n`,
      now,
      now,
    ]
  );

  await createAuditLog({
    userId: currentUser.id,
    action: 'deploy_create',
    resourceType: 'deployment',
    resourceId: String(result.lastInsertRowid),
    details: { version, branch, commit_hash },
    ipAddress: req.ip,
  });

  logger.info(`部署创建成功: 版本=${version}, 操作人=${currentUser.username}`);

  res.json({
    success: true,
    data: { id: result.lastInsertRowid, version, status: 'deploying' },
    message: '部署任务已创建',
  });
}));

/**
 * 更新指定部署的状态和日志
 *
 * 支持更新部署状态（如 'success' | 'failed'），
 * 当状态为 'success' 或 'failed' 时自动记录完成时间。
 * 日志内容会累积追加到已有日志之后。
 *
 * @route PUT /api/v1/admin/deployments/:id/status
 * @access Private/Admin
 * @param {number} req.params.id - 部署记录 ID
 * @param {Object} req.body - 请求体
 * @param {string} [req.body.status] - 部署状态
 * @param {string} [req.body.log] - 追加的日志内容
 * @returns {Object} 包含操作结果的 JSON 响应
 */
router.put('/deployments/:id/status', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, log } = req.body;
  const currentUser = (req as any).user;

  const existing = await query('SELECT * FROM deployments WHERE id = ?', [id]);
  if (!existing.length) {
    return res.status(404).json({ success: false, message: '部署记录不存在' });
  }

  const now = new Date().toISOString();
  const updates: string[] = ['updated_at = ?'];
  const params: any[] = [now];

  if (status) {
    updates.push('status = ?');
    params.push(status);
    if (status === 'success' || status === 'failed') {
      updates.push('completed_at = ?');
      params.push(now);
    }
  }

  if (log !== undefined) {
    updates.push('log = ?');
    const existingLog = (existing[0] as any).log || '';
    params.push(existingLog + `[${now}] ${log}\n`);
  }

  params.push(id);
  await execute(`UPDATE deployments SET ${updates.join(', ')} WHERE id = ?`, params);

  res.json({ success: true, message: '部署状态已更新' });
}));

/**
 * 获取单个部署的详细信息
 *
 * @route GET /api/v1/admin/deployments/:id
 * @access Private/Admin
 * @param {number} req.params.id - 部署记录 ID
 * @returns {Object} 包含部署详情的 JSON 响应
 */
router.get('/deployments/:id', asyncHandler(async (req: Request, res: Response) => {
  const deployments = await query('SELECT * FROM deployments WHERE id = ?', [req.params.id]);
  if (!deployments.length) {
    return res.status(404).json({ success: false, message: '部署记录不存在' });
  }
  res.json({ success: true, data: deployments[0] });
}));

/**
 * 回滚指定部署
 *
 * 回滚流程：
 * 1. 创建一个新的部署记录，版本号为 rollback-{原版本号}，状态为 'deploying'
 * 2. 将原部署记录的状态标记为 'rolled_back'
 * 3. 记录审计日志
 *
 * @route POST /api/v1/admin/deployments/:id/rollback
 * @access Private/Admin
 * @param {number} req.params.id - 要回滚到的目标部署记录 ID
 * @returns {Object} 包含新的回滚部署信息和目标版本的 JSON 响应
 */
router.post('/deployments/:id/rollback', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const currentUser = (req as any).user;
  const now = new Date().toISOString();

  const deployments = await query('SELECT * FROM deployments WHERE id = ?', [id]);
  if (!deployments.length) {
    return res.status(404).json({ success: false, message: '部署记录不存在' });
  }

  const deploy = deployments[0] as any;

  // 创建回滚部署记录
  const result = await execute(
    `INSERT INTO deployments (version, description, branch, status, deployer_id, deployer_name, started_at, rollback_version, log, created_at, updated_at)
     VALUES (?, ?, ?, 'deploying', ?, ?, ?, ?, ?, ?, ?)`,
    [
      `rollback-${deploy.version}`,
      `回滚到版本 ${deploy.version}`,
      deploy.branch,
      currentUser.id,
      currentUser.displayName || currentUser.username,
      now,
      deploy.version,
      `[${now}] 开始回滚到版本 ${deploy.version}...\n`,
      now,
      now,
    ]
  );

  // 标记原部署为已回滚
  await execute('UPDATE deployments SET status = ?, updated_at = ? WHERE id = ?', ['rolled_back', now, id]);

  await createAuditLog({
    userId: currentUser.id,
    action: 'deploy_rollback',
    resourceType: 'deployment',
    resourceId: String(id),
    details: { rollbackVersion: deploy.version, newDeploymentId: result.lastInsertRowid },
    ipAddress: req.ip,
  });

  res.json({
    success: true,
    data: { id: result.lastInsertRowid, rollbackTo: deploy.version, status: 'deploying' },
    message: `回滚任务已创建，目标版本: ${deploy.version}`,
  });
}));

/**
 * 删除指定部署记录
 *
 * @route DELETE /api/v1/admin/deployments/:id
 * @access Private/Admin
 * @param {number} req.params.id - 要删除的部署记录 ID
 * @returns {Object} 包含操作结果的 JSON 响应
 */
router.delete('/deployments/:id', asyncHandler(async (req: Request, res: Response) => {
  await execute('DELETE FROM deployments WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: '部署记录已删除' });
}));

/**
 * 辅助函数：创建审计日志
 *
 * 调用审计日志服务记录操作历史，如果服务调用失败仅记录警告，
 * 不会中断主流程。
 *
 * @param {Object} data - 审计日志数据
 * @param {string} data.userId - 操作人 ID
 * @param {string} data.action - 操作标识
 * @param {string} data.resourceType - 资源类型
 * @param {string} data.resourceId - 资源 ID
 * @param {any} [data.details] - 操作详情
 * @param {string} [data.ipAddress] - 操作人 IP 地址
 */
async function createAuditLog(data: {
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: any;
  ipAddress?: string;
}) {
  try {
    const { createAuditLog: logFn } = require('../services/audit-log.service');
    await logFn(data);
  } catch (err) {
    logger.warn('创建审计日志失败:', err);
  }
}

export default router;
