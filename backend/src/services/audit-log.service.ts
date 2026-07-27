/**
 * 审计日志服务
 *
 * 提供系统操作审计日志和用户登录日志的创建、查询功能。
 * 审计日志用于追踪管理操作，登录日志用于监控用户登录行为和计算在线时长。
 */

import { query, execute } from '../db';
import logger from '../utils/logger';
import { AuditLog, AuditLogCreateInput } from '../types';

/**
 * 创建审计日志记录
 *
 * 记录用户在系统中的关键操作，如内容审核、权限变更等。
 * details 字段会被序列化为 JSON 字符串存储。
 *
 * @param data 审计日志数据，包含操作人、操作类型、资源类型、资源 ID、详情和 IP 地址
 */
export const createAuditLog = async (data: AuditLogCreateInput): Promise<void> => {
  try {
    await execute(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.userId,
        data.action,
        data.resourceType,
        data.resourceId || null,
        data.details ? JSON.stringify(data.details) : null,
        data.ipAddress || null,
        new Date().toISOString(),
      ]
    );
  } catch (error) {
    // 审计日志创建失败不应影响主流程，仅记录错误日志
    logger.error('创建审计日志失败:', error);
  }
};

/**
 * 创建用户权限变更日志
 *
 * 专门记录用户角色、等级、状态变更及冻结/解冻操作。
 *
 * @param targetUserId 被操作的目标用户 ID
 * @param changedBy 操作人 ID
 * @param changeType 变更类型：角色变更、等级变更、状态变更、冻结、解冻
 * @param oldValue 变更前的值（可选）
 * @param newValue 变更后的值（可选）
 */
export const createUserPermissionChangeLog = async (
  targetUserId: string,
  changedBy: string,
  changeType: 'role_change' | 'level_change' | 'status_change' | 'freeze' | 'unfreeze',
  oldValue?: string,
  newValue?: string
): Promise<void> => {
  try {
    await execute(
      `INSERT INTO user_permission_changes (target_user_id, changed_by, change_type, old_value, new_value, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [targetUserId, changedBy, changeType, oldValue || null, newValue || null, new Date().toISOString()]
    );
  } catch (error) {
    logger.error('创建权限变更日志失败:', error);
  }
};

/**
 * 获取审计日志列表（分页 + 筛选）
 *
 * 支持按用户 ID、操作类型和资源类型进行筛选。
 *
 * @param page 页码，从 1 开始，默认为 1
 * @param limit 每页条数，默认为 20
 * @param filters 可选的筛选条件，包括 userId、action、resourceType
 * @returns 分页后的审计日志列表及总数
 */
export const getAuditLogs = async (
  page: number = 1,
  limit: number = 20,
  filters?: { userId?: string; action?: string; resourceType?: string }
): Promise<{ logs: AuditLog[]; total: number; page: number; limit: number }> => {
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const params: any[] = [];

  // 构建动态 WHERE 条件
  if (filters?.userId) {
    conditions.push('al.user_id = ?');
    params.push(filters.userId);
  }
  if (filters?.action) {
    conditions.push('al.action = ?');
    params.push(filters.action);
  }
  if (filters?.resourceType) {
    conditions.push('al.resource_type = ?');
    params.push(filters.resourceType);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  // 获取匹配条件的总记录数
  const countResult = await query(
    `SELECT COUNT(*) as total FROM audit_logs al ${whereClause}`,
    params
  );
  const total = parseInt(countResult[0]?.total || 0);

  // 获取分页数据，左连接 users 表获取操作人用户名
  const dataParams = [...params, limit, offset];
  const result = await query(
    `SELECT al.*, u.username as operator_name
     FROM audit_logs al
     LEFT JOIN users u ON al.user_id = u.id
     ${whereClause}
     ORDER BY al.created_at DESC
     LIMIT ? OFFSET ?`,
    dataParams
  );

  // 将查询结果映射为 AuditLog 对象，details 字段从 JSON 字符串反序列化
  const logs = result.map((row: any) => ({
    id: String(row.id),
    userId: String(row.user_id),
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id ? String(row.resource_id) : undefined,
    details: row.details ? (typeof row.details === 'string' ? JSON.parse(row.details) : row.details) : undefined,
    ipAddress: row.ip_address,
    createdAt: new Date(row.created_at),
    operatorName: row.operator_name,
  }));

  return { logs, total, page, limit };
};

/**
 * 创建登录日志记录
 *
 * 记录用户的每次登录尝试，包括成功和失败的尝试。
 *
 * @param data 登录日志数据，包含用户 ID、登录结果、IP 地址、User-Agent 和失败原因
 */
export const createLoginLog = async (data: {
  userId: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  failReason?: string;
}): Promise<void> => {
  try {
    await execute(
      `INSERT INTO login_logs (user_id, login_time, success, ip_address, user_agent, fail_reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.userId,
        new Date().toISOString(),
        data.success ? 1 : 0,
        data.ipAddress || null,
        data.userAgent || null,
        data.failReason || null,
        new Date().toISOString(),
      ]
    );
  } catch (error) {
    logger.error('创建登录日志失败:', error);
  }
};

/**
 * 更新登出日志并计算登录时长
 *
 * 查找用户最近一条未登出的成功登录记录，更新登出时间和持续时间（分钟），
 * 并将本次登录时长累加到用户的总登录时长中。
 *
 * @param userId 用户 ID
 */
export const updateLogoutLog = async (userId: string): Promise<void> => {
  try {
    // 查找用户最近一条未登出的成功登录记录
    const logs = await query(
      'SELECT id, login_time FROM login_logs WHERE user_id = ? AND logout_time IS NULL AND success = 1 ORDER BY login_time DESC LIMIT 1',
      [userId]
    );

    if (logs.length === 0) return;

    const log = logs[0];
    const loginTime = new Date(log.login_time);
    const logoutTime = new Date();
    // 计算登录时长（分钟），保留两位小数
    const durationMinutes = (logoutTime.getTime() - loginTime.getTime()) / 60000;

    // 更新登出时间和时长
    await execute(
      'UPDATE login_logs SET logout_time = ?, duration_minutes = ? WHERE id = ?',
      [logoutTime.toISOString(), Math.round(durationMinutes * 100) / 100, log.id]
    );

    // 将本次登录时长累加到用户累计登录时长
    if (durationMinutes > 0) {
      await execute(
        'UPDATE users SET total_login_time = total_login_time + ?, updated_at = ? WHERE id = ?',
        [Math.round(durationMinutes * 100) / 100, new Date().toISOString(), userId]
      );
    }
  } catch (error) {
    logger.error('更新登出日志失败:', error);
  }
};

/**
 * 获取登录日志列表（分页）
 *
 * 可选择按用户 ID 筛选，返回结果包含用户名信息。
 *
 * @param page 页码，从 1 开始，默认为 1
 * @param limit 每页条数，默认为 20
 * @param userId 可选，筛选指定用户的登录日志
 * @returns 分页后的登录日志列表及总数
 */
export const getLoginLogs = async (
  page: number = 1,
  limit: number = 20,
  userId?: string
): Promise<{ logs: any[]; total: number; page: number; limit: number }> => {
  const offset = (page - 1) * limit;
  let whereClause = '';
  const params: any[] = [];

  if (userId) {
    whereClause = 'WHERE ll.user_id = ?';
    params.push(userId);
  }

  // 获取匹配条件的总记录数
  const countResult = await query(
    `SELECT COUNT(*) as total FROM login_logs ll ${whereClause}`,
    params
  );
  const total = parseInt(countResult[0]?.total || 0);

  // 获取分页数据，左连接 users 表获取用户名
  const dataParams = [...params, limit, offset];
  const result = await query(
    `SELECT ll.*, u.username
     FROM login_logs ll
     LEFT JOIN users u ON ll.user_id = u.id
     ${whereClause}
     ORDER BY ll.login_time DESC
     LIMIT ? OFFSET ?`,
    dataParams
  );

  // 将数据库行映射为日志对象
  const logs = result.map((row: any) => ({
    id: String(row.id),
    userId: String(row.user_id),
    username: row.username,
    loginTime: row.login_time,
    logoutTime: row.logout_time,
    durationMinutes: row.duration_minutes,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    success: Boolean(row.success),
    failReason: row.fail_reason,
  }));

  return { logs, total, page, limit };
};

export default {
  createAuditLog,
  createUserPermissionChangeLog,
  getAuditLogs,
  createLoginLog,
  updateLogoutLog,
  getLoginLogs,
};
