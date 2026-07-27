/**
 * 用户管理服务
 *
 * 提供用户数据的增删改查管理功能，支持管理员对用户进行状态管理、
 * 角色变更、评论冻结、监控范围设置等操作。同时提供用户权限变更日志
 * 记录以及批量操作功能。
 *
 * @module user.service
 */

import { query, execute } from '../db';
import { User, UserUpdateInput } from '../types';
import { NotFoundError, ValidationError, AuthorizationError } from '../middlewares/error.middleware';
import logger from '../utils/logger';
import { updateUserLevel } from './level.service';

/**
 * 从数据库行记录映射为 User 对象
 *
 * 将数据库查询结果的蛇形命名（snake_case）字段映射为
 * 应用层使用的驼峰命名（camelCase）字段，同时进行类型转换。
 *
 * @param dbUser - 数据库查询结果行
 * @returns 映射后的 User 对象
 */
const mapUserFromDb = (dbUser: any): User => ({
  id: String(dbUser.id),
  username: dbUser.username,
  email: dbUser.email,
  displayName: dbUser.display_name,
  avatarUrl: dbUser.avatar_url,
  bio: dbUser.bio,
  role: dbUser.role,
  language: dbUser.language,
  emailVerified: Boolean(dbUser.email_verified),
  isActive: Boolean(dbUser.is_active),
  lastLogin: dbUser.last_login,
  createdAt: new Date(dbUser.created_at),
  updatedAt: new Date(dbUser.updated_at),
  level: dbUser.level ?? 1,
  totalLoginTime: dbUser.total_login_time ?? 0,
  totalXp: dbUser.total_xp ?? 0,
  totalPoints: dbUser.total_points ?? 0,
  phone: dbUser.phone || undefined,
  phoneVerified: Boolean(dbUser.phone_verified),
  commentFrozen: Boolean(dbUser.comment_frozen),
  frozenUntil: dbUser.frozen_until || undefined,
  googleId: dbUser.google_id,
  githubId: dbUser.github_id,
  facebookId: dbUser.facebook_id,
  twitterId: dbUser.twitter_id,
  twoFactorEnabled: dbUser.two_factor_enabled ?? false,
  twoFactorSecret: dbUser.two_factor_secret,
  twoFactorBackupCodes: dbUser.two_factor_backup_codes,
  twoFactorLastUsed: dbUser.two_factor_last_used,
  marketingOptIn: dbUser.marketing_opt_in ?? false,
  newsletterSubscription: dbUser.newsletter_subscription ?? false,
  emailPreferences: dbUser.email_preferences ?? {
    promotional: false,
    transactional: true,
    newsletter: false,
    system: true,
  },
  notificationSettings: dbUser.notification_settings ?? {
    email: true,
    push: true,
    inApp: true,
    frequency: 'immediate',
  },
  privacySettings: dbUser.privacy_settings ?? {
    profileVisibility: 'public',
    showEmail: false,
    showLastLogin: true,
    showOnlineStatus: true,
  },
  deletedAt: dbUser.deleted_at,
  createdBy: dbUser.created_by,
  updatedBy: dbUser.updated_by,
  version: dbUser.version,
});

/**
 * 获取用户列表（管理员接口）
 *
 * 支持通过搜索关键词、角色、状态和等级进行过滤，
 * 按创建时间降序排列并分页返回。
 *
 * @param page - 当前页码，从 1 开始
 * @param limit - 每页数量
 * @param search - 搜索关键词（匹配用户名、邮箱、显示名称）
 * @param role - 角色过滤
 * @param status - 状态过滤（'active' | 'inactive'）
 * @param level - 等级过滤
 * @returns 用户列表及分页信息
 */
export const getUsers = async (
  page: number = 1,
  limit: number = 20,
  search?: string,
  role?: string,
  status?: string,
  level?: number
): Promise<{ users: User[]; total: number; page: number; limit: number }> => {
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: any[] = [];

  if (search) {
    conditions.push('(username LIKE ? OR email LIKE ? OR display_name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (role) {
    conditions.push('role = ?');
    params.push(role);
  }

  if (status === 'active') {
    conditions.push('is_active = true');
  } else if (status === 'inactive') {
    conditions.push('is_active = 0');
  }

  if (level) {
    conditions.push('level = ?');
    params.push(level);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countResult = await query(`SELECT COUNT(*) as total FROM users ${whereClause}`, params);
  const total = parseInt(countResult[0]?.total || 0);

  const dataParams = [...params, limit, offset];
  const result = await query(
    `SELECT * FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    dataParams
  );

  const users = result.map(mapUserFromDb);
  return { users, total, page, limit };
};

/**
 * 获取用户详情
 *
 * 根据用户 ID 查询完整的用户信息。
 *
 * @param id - 用户 ID
 * @returns 用户对象
 * @throws NotFoundError - 用户不存在时抛出
 */
export const getUserById = async (id: string): Promise<User> => {
  const result = await query('SELECT * FROM users WHERE id = ?', [id]);
  if (result.length === 0) {
    throw new NotFoundError(`用户ID ${id} 不存在`);
  }
  return mapUserFromDb(result[0]);
};

/**
 * 更新用户信息（管理员接口）
 *
 * 支持更新显示名称、头像、个人简介、语言、角色、等级、
 * 登录时长、评论冻结状态、账户状态等字段。
 * 只更新提供的字段，未提供的字段保持不变。
 *
 * @param id - 用户 ID
 * @param updateData - 需要更新的用户数据
 * @returns 更新后的用户对象
 * @throws ValidationError - 角色或等级参数校验失败时抛出
 */
export const updateUser = async (
  id: string,
  updateData: UserUpdateInput & { role?: string; status?: string; language?: string }
): Promise<User> => {
  const updates: string[] = [];
  const values: any[] = [];

  if (updateData.displayName !== undefined) {
    updates.push('display_name = ?');
    values.push(updateData.displayName);
  }

  if (updateData.avatarUrl !== undefined) {
    updates.push('avatar_url = ?');
    values.push(updateData.avatarUrl);
  }

  if (updateData.bio !== undefined) {
    updates.push('bio = ?');
    values.push(updateData.bio);
  }

  if (updateData.language !== undefined) {
    updates.push('language = ?');
    values.push(updateData.language);
  }

  if (updateData.role !== undefined) {
    const validRoles = ['super_admin', 'admin', 'user'];
    if (!validRoles.includes(updateData.role)) {
      throw new ValidationError(`角色无效，必须是: ${validRoles.join(', ')}`);
    }
    updates.push('role = ?');
    values.push(updateData.role);
  }

  if (updateData.level !== undefined) {
    const maxLevel = 10;
    if (updateData.level < 1 || updateData.level > maxLevel) {
      throw new ValidationError(`等级必须在 1-${maxLevel} 之间`);
    }
    updates.push('level = ?');
    values.push(updateData.level);
  }

  if (updateData.totalLoginTime !== undefined) {
    updates.push('total_login_time = ?');
    values.push(updateData.totalLoginTime);
  }

  if (updateData.commentFrozen !== undefined) {
    updates.push('comment_frozen = ?');
    values.push(updateData.commentFrozen ? 1 : 0);
  }

  if (updateData.frozenUntil !== undefined) {
    updates.push('frozen_until = ?');
    values.push(updateData.frozenUntil);
  }

  if (updateData.status !== undefined) {
    const validStatuses = ['active', 'inactive', 'suspended'];
    if (!validStatuses.includes(updateData.status)) {
      throw new ValidationError(`状态无效，必须是: ${validStatuses.join(', ')}`);
    }
    updates.push('is_active = ?');
    values.push(updateData.status === 'active' ? 1 : 0);
  }

  if (updates.length === 0) {
    return getUserById(id);
  }

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  await execute(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    values
  );

  const user = await getUserById(id);
  logger.info(`用户信息更新成功: ${user.username} (ID: ${id})`);
  return user;
};

/**
 * 删除用户（管理员接口）
 *
 * 从数据库中物理删除用户记录。
 *
 * @param id - 用户 ID
 * @throws NotFoundError - 用户不存在时抛出
 */
export const deleteUser = async (id: string): Promise<void> => {
  const result = await execute('DELETE FROM users WHERE id = ?', [id]);
  if (result.changes === 0) {
    throw new NotFoundError(`用户ID ${id} 不存在`);
  }
  logger.info(`用户删除成功: ID ${id}`);
};

/**
 * 变更用户角色（超级管理员专用）
 *
 * 修改指定用户的角色，不允许修改超级管理员的角色。
 * 变更记录会写入操作日志。
 *
 * @param targetUserId - 目标用户 ID
 * @param newRole - 新角色（super_admin | admin | user）
 * @param operatorId - 操作人 ID
 * @returns 更新后的用户对象
 * @throws ValidationError - 角色值无效时抛出
 * @throws AuthorizationError - 试图修改超级管理员角色时抛出
 */
export const changeUserRole = async (
  targetUserId: string,
  newRole: string,
  operatorId: string
): Promise<User> => {
  const validRoles = ['super_admin', 'admin', 'user'];
  if (!validRoles.includes(newRole)) {
    throw new ValidationError(`角色无效，必须是: ${validRoles.join(', ')}`);
  }

  const user = await getUserById(targetUserId);
  const oldRole = user.role;

  // 不允许修改超级管理员
  if (oldRole === 'super_admin' && operatorId !== targetUserId) {
    throw new AuthorizationError('不能修改超级管理员的角色');
  }

  await execute('UPDATE users SET role = ?, updated_at = ? WHERE id = ?', [
    newRole, new Date().toISOString(), targetUserId
  ]);

  const updated = await getUserById(targetUserId);
  logger.info(`用户角色变更: ${user.username} (${oldRole} -> ${newRole}), 操作人: ${operatorId}`);

  return updated;
};

/**
 * 重新计算用户等级
 *
 * 根据用户的登录时长等数据调用等级服务自动计算并更新用户等级。
 *
 * @param targetUserId - 目标用户 ID
 * @returns 等级更新后的用户对象
 */
export const recalculateUserLevel = async (targetUserId: string): Promise<User> => {
  const user = await getUserById(targetUserId);
  const newLevel = await updateUserLevel(targetUserId);
  return { ...user, level: newLevel };
};

/**
 * 冻结或解冻用户评论功能
 *
 * 禁止或恢复用户在社区中发表评论的权限。
 * 超级管理员的评论功能不能被冻结。
 *
 * @param targetUserId - 目标用户 ID
 * @param frozen - true 为冻结，false 为解冻
 * @param until - 冻结截止时间（ISO 格式），为空表示永久冻结
 * @returns 更新后的用户对象
 * @throws AuthorizationError - 试图冻结超级管理员时抛出
 */
export const setCommentFreeze = async (
  targetUserId: string,
  frozen: boolean,
  until?: string
): Promise<User> => {
  const user = await getUserById(targetUserId);
  if (user.role === 'super_admin') {
    throw new AuthorizationError('不能冻结超级管理员的评论功能');
  }

  await execute(
    'UPDATE users SET comment_frozen = ?, frozen_until = ?, updated_at = ? WHERE id = ?',
    [frozen ? 1 : 0, until || null, new Date().toISOString(), targetUserId]
  );

  const updated = await getUserById(targetUserId);
  logger.info(`用户评论功能${frozen ? '冻结' : '解冻'}: ${user.username} (ID: ${targetUserId})`);

  return updated;
};

/**
 * 获取管理员可监控的用户列表
 *
 * 根据管理员设置的监控范围（按用户、部门或标签），
 * 返回受监控的用户列表。只有 admin 角色的用户可以调用此接口。
 *
 * @param adminId - 管理员用户 ID
 * @param page - 当前页码
 * @param limit - 每页数量
 * @returns 受监控的用户列表及分页信息
 * @throws AuthorizationError - 非管理员用户调用时抛出
 */
export const getMonitoredUsers = async (
  adminId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ users: User[]; total: number; page: number; limit: number }> => {
  const admin = await getUserById(adminId);
  if (admin.role !== 'admin') {
    throw new AuthorizationError('只有管理员可以查看监控列表');
  }

  const offset = (page - 1) * limit;

  // 获取管理员监控范围
  const scopes = await query(
    'SELECT monitored_user_id, scope_type, scope_value FROM admin_monitoring_scopes WHERE admin_id = ?',
    [adminId]
  );

  if (scopes.length === 0) {
    return { users: [], total: 0, page, limit };
  }

  // 构建查询条件
  const userIds: string[] = [];
  const departments: string[] = [];
  const tags: string[] = [];

  scopes.forEach((scope: any) => {
    if (scope.scope_type === 'user' && scope.monitored_user_id) {
      userIds.push(String(scope.monitored_user_id));
    } else if (scope.scope_type === 'department' && scope.scope_value) {
      departments.push(scope.scope_value);
    } else if (scope.scope_type === 'tag' && scope.scope_value) {
      tags.push(scope.scope_value);
    }
  });

  const conditions: string[] = ['u.role = ?'];
  const params: any[] = ['user'];

  if (userIds.length > 0) {
    conditions.push(`u.id IN (${userIds.map(() => '?').join(',')})`);
    params.push(...userIds);
  }

  // 这里简化处理，实际应根据部门/标签过滤
  // 假设有个 profile 字段存储部门或标签信息
  // 当前版本按用户ID过滤

  const whereClause = 'WHERE ' + conditions.join(' AND ');

  const countResult = await query(`SELECT COUNT(*) as total FROM users u ${whereClause}`, params);
  const total = parseInt(countResult[0]?.total || 0);

  const dataParams = [...params, limit, offset];
  const result = await query(
    `SELECT u.* FROM users u ${whereClause} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
    dataParams
  );

  const users = result.map(mapUserFromDb);
  return { users, total, page, limit };
};

/**
 * 设置管理员监控范围
 *
 * 清除旧的监控范围设置，替换为新的监控范围列表。
 * 支持按用户、部门或标签三种粒度设置。
 *
 * @param adminId - 管理员用户 ID
 * @param scopes - 监控范围数组，每个元素包含监控类型和值
 * @throws AuthorizationError - 非管理员用户调用时抛出
 */
export const setMonitoringScope = async (
  adminId: string,
  scopes: Array<{ monitoredUserId?: string; scopeType: 'user' | 'department' | 'tag'; scopeValue?: string }>
): Promise<void> => {
  const admin = await getUserById(adminId);
  if (admin.role !== 'admin') {
    throw new AuthorizationError('只有管理员可以设置监控范围');
  }

  // 清除旧范围
  await execute('DELETE FROM admin_monitoring_scopes WHERE admin_id = ?', [adminId]);

  // 添加新范围
  for (const scope of scopes) {
    await execute(
      'INSERT INTO admin_monitoring_scopes (admin_id, monitored_user_id, scope_type, scope_value) VALUES (?, ?, ?, ?)',
      [adminId, scope.monitoredUserId || null, scope.scopeType, scope.scopeValue || null]
    );
  }

  logger.info(`管理员监控范围已更新: adminId=${adminId}, scopes=${JSON.stringify(scopes)}`);
};

/**
 * 获取用户权限变更日志
 *
 * 查询用户角色、权限等变更的历史记录，可指定目标用户过滤，
 * 支持分页返回。
 *
 * @param targetUserId - 目标用户 ID（可选，不传则查询所有变更）
 * @param page - 当前页码
 * @param limit - 每页数量
 * @returns 变更日志列表及总数
 */
export const getUserPermissionChanges = async (
  targetUserId?: string,
  page: number = 1,
  limit: number = 20
): Promise<{ changes: any[]; total: number }> => {
  const offset = (page - 1) * limit;
  let whereClause = '';
  const params: any[] = [];

  if (targetUserId) {
    whereClause = 'WHERE upc.target_user_id = ?';
    params.push(targetUserId);
  }

  const countResult = await query(
    `SELECT COUNT(*) as total FROM user_permission_changes upc ${whereClause}`,
    params
  );
  const total = parseInt(countResult[0]?.total || 0);

  const dataParams = [...params, limit, offset];
  const result = await query(
    `SELECT upc.*, u1.username as target_name, u2.username as changed_by_name
     FROM user_permission_changes upc
     LEFT JOIN users u1 ON upc.target_user_id = u1.id
     LEFT JOIN users u2 ON upc.changed_by = u2.id
     ${whereClause}
     ORDER BY upc.created_at DESC
     LIMIT ? OFFSET ?`,
    dataParams
  );

  const changes = result.map((row: any) => ({
    id: String(row.id),
    targetUserId: String(row.target_user_id),
    targetName: row.target_name,
    changedBy: String(row.changed_by),
    changedByName: row.changed_by_name,
    changeType: row.change_type,
    oldValue: row.old_value,
    newValue: row.new_value,
    createdAt: row.created_at,
  }));

  return { changes, total };
};

/**
 * 批量更新用户状态
 *
 * 同时对多个用户执行激活或停用操作。
 *
 * @param userIds - 目标用户 ID 数组
 * @param status - 目标状态：'active' 激活 / 'inactive' 停用
 * @returns 受影响的行数
 */
export const batchUpdateStatus = async (
  userIds: string[],
  status: 'active' | 'inactive'
): Promise<number> => {
  const isActive = status === 'active' ? 1 : 0;
  const placeholders = userIds.map(() => '?').join(',');
  const result = await execute(
    `UPDATE users SET is_active = ?, updated_at = ? WHERE id IN (${placeholders})`,
    [isActive, new Date().toISOString(), ...userIds]
  );
  logger.info(`批量更新用户状态: ${status}, 数量: ${userIds.length}, 影响: ${result.changes}行`);
  return result.changes || 0;
};

/**
 * 批量删除用户
 *
 * 同时从数据库中物理删除多个用户记录。
 *
 * @param userIds - 目标用户 ID 数组
 * @returns 受影响的行数
 */
export const batchDeleteUsers = async (userIds: string[]): Promise<number> => {
  const placeholders = userIds.map(() => '?').join(',');
  const result = await execute(
    `DELETE FROM users WHERE id IN (${placeholders})`,
    userIds
  );
  logger.info(`批量删除用户: 数量: ${userIds.length}, 影响: ${result.changes}行`);
  return result.changes || 0;
};

export default {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  changeUserRole,
  recalculateUserLevel,
  setCommentFreeze,
  getMonitoredUsers,
  setMonitoringScope,
  getUserPermissionChanges,
  batchUpdateStatus,
  batchDeleteUsers,
};
