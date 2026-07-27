/**
 * =============================================================================
 * 密码重置模型 (PasswordReset Model)
 * =============================================================================
 *
 * 本文件定义 PasswordResetModel 类，负责密码重置数据的持久化操作。
 * 密码重置用于用户在忘记密码时，通过注册邮箱接收重置令牌来设置新密码。
 * 该类提供了令牌的创建、验证、使用、清理等完整生命周期管理，并包含
 * 速率限制（Rate Limiting）功能以防止滥用。
 *
 * 主要功能：
 * - 生成并存储密码重置令牌
 * - 验证用户提交的重置令牌有效性
 * - 标记令牌为已使用（一次性使用）
 * - 管理令牌生命周期（过期、失效、清理）
 * - 速率限制检查（防止接口滥用）
 * - 重置记录查询与统计分析
 *
 * @module models/PasswordReset
 */

import { BaseModel } from './BaseModel';
import { PasswordReset, PasswordResetCreateInput, PasswordResetUpdateInput } from '../types';
import { query } from '../db';
import logger from '../utils/logger';

/**
 * 密码重置模型类
 *
 * 继承自 BaseModel，提供对 password_resets 表的数据库操作。
 * 密码重置令牌具有严格的安全约束：一次性使用、有时效性、
 * 支持软删除和乐观锁。同时提供速率限制机制，防止用户
 * 在短时间内频繁请求密码重置，增强系统安全性。
 *
 * @template PasswordReset - 密码重置记录的类型定义
 * @template PasswordResetCreateInput - 创建重置记录的输入类型
 * @template PasswordResetUpdateInput - 更新重置记录的输入类型
 *
 * @example
 * // 创建重置令牌
 * const reset = await passwordResetModel.createResetToken({
 *   userId: '123',
 *   token: 'reset_token_abc...',
 *   expiresAt: new Date(Date.now() + 3600000),
 * });
 *
 * @example
 * // 验证并使用令牌
 * const valid = await passwordResetModel.validateToken('reset_token_abc...');
 * if (valid) {
 *   await passwordResetModel.useToken('reset_token_abc...');
 *   // 允许用户设置新密码
 * }
 */
export class PasswordResetModel extends BaseModel<
  PasswordReset,
  PasswordResetCreateInput,
  PasswordResetUpdateInput
> {
  /** 对应的数据库表名 */
  protected tableName = 'password_resets';
  /** 表的主键字段名 */
  protected primaryKey = 'id';

  /* 启用软删除：使旧令牌过期时标记 deleted_at 而非物理删除 */
  protected softDeleteEnabled = true;
  /* 启用乐观锁：通过 version 字段防止并发更新冲突 */
  protected optimisticLockEnabled = true;
  /* 不启用审计日志：重置令牌的变更无需审计追踪 */
  protected auditEnabled = false;

  /**
   * 将数据库查询结果行转换为 PasswordReset 业务对象
   *
   * 将数据库中的原始行数据（下划线命名）映射为符合 TypeScript 类型
   * 定义的 PasswordReset 对象（驼峰命名），处理字段类型转换。
   *
   * @param row - 从数据库查询到的原始行数据
   * @returns 转换后的 PasswordReset 业务对象
   */
  protected fromRow(row: any): PasswordReset {
    return {
      id: String(row.id),                                  // 主键
      userId: String(row.user_id),                         // 用户 ID
      token: row.token,                                    // 重置令牌
      expiresAt: new Date(row.expires_at),                 // 令牌过期时间
      usedAt: row.used_at ? new Date(row.used_at) : undefined,   // 使用时间
      createdAt: new Date(row.created_at),                 // 创建时间
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined, // 软删除时间
      version: row.version ? Number(row.version) : 1,      // 乐观锁版本号
    };
  }

  /**
   * 将 PasswordResetCreateInput 业务对象转换为数据库行格式
   *
   * 将创建重置记录时的输入数据转换为数据库可存储的格式，
   * 包括字段命名转换和时间序列化。
   *
   * @param data - 创建密码重置记录的输入数据
   * @returns 适合数据库插入的行数据对象
   */
  protected toRow(data: PasswordResetCreateInput): any {
    return {
      user_id: data.userId,                                // 用户 ID
      token: data.token,                                   // 重置令牌
      expires_at: data.expiresAt.toISOString(),             // 过期时间（ISO 格式）
      used_at: null,                                       // 初始未使用
      created_at: new Date().toISOString(),                 // 创建时间
      deleted_at: null,                                    // 初始未删除
      version: 1,                                          // 初始版本号
    };
  }

  /**
   * 创建密码重置令牌
   *
   * 生成一条新的密码重置记录。如果该用户已有未使用的有效令牌，
   * 则自动将旧令牌标记为过期（软删除），确保同一用户同时只有一个
   * 有效的重置令牌。
   *
   * @param data - 创建重置记录的输入数据，包含用户 ID、令牌值和过期时间
   * @returns 创建成功的密码重置记录
   * @throws 数据库操作失败时抛出错误
   */
  async createResetToken(data: PasswordResetCreateInput): Promise<PasswordReset> {
    try {
      // 检查是否已有未使用的有效令牌存在
      const existing = await this.findOne(
        'user_id = ? AND used_at IS NULL AND expires_at > ? AND deleted_at IS NULL',
        [data.userId, new Date().toISOString()]
      );

      if (existing) {
        // 使旧令牌过期（软删除），确保同一时间只有一个有效令牌
        await this.update(existing.id, { deletedAt: new Date() });
      }

      return this.create(data);
    } catch (error) {
      logger.error('创建密码重置令牌失败:', error);
      throw error;
    }
  }

  /**
   * 验证重置令牌是否有效
   *
   * 检查指定的重置令牌是否存在且有效（未使用、未过期、未删除）。
   * 此方法仅验证，不改变令牌状态。
   *
   * @param token - 要验证的重置令牌字符串
   * @returns 有效的 PasswordReset 记录，无效则返回 null
   * @throws 数据库查询失败时抛出错误
   */
  async validateToken(token: string): Promise<PasswordReset | null> {
    try {
      const reset = await this.findOne(
        'token = ? AND used_at IS NULL AND expires_at > ? AND deleted_at IS NULL',
        [token, new Date().toISOString()]
      );

      if (!reset) {
        return null;
      }

      return reset;
    } catch (error) {
      logger.error('验证重置令牌失败:', error);
      throw error;
    }
  }

  /**
   * 使用重置令牌（标记为已使用）
   *
   * 在用户成功使用令牌完成密码重置后调用。
   * 令牌被标记为已使用（used_at），不可再次使用，
   * 确保令牌的一次性特性。
   *
   * @param token - 要使用的重置令牌字符串
   * @returns 标记成功返回 true，令牌无效返回 false
   * @throws 数据库操作失败时抛出错误
   */
  async useToken(token: string): Promise<boolean> {
    try {
      const reset = await this.validateToken(token);
      if (!reset) {
        return false;
      }

      const result = await this.update(reset.id, {
        usedAt: new Date(),
      });

      return result !== null;
    } catch (error) {
      logger.error('使用重置令牌失败:', error);
      throw error;
    }
  }

  /**
   * 获取指定用户的有效重置令牌
   *
   * 查询指定用户尚未使用、未过期且未删除的密码重置令牌。
   * 常用于在用户发起重置请求后，检查是否存在可用的有效令牌。
   *
   * @param userId - 用户 ID
   * @returns 有效的 PasswordReset 记录，未找到则返回 null
   * @throws 数据库查询失败时抛出错误
   */
  async getActiveUserToken(userId: string): Promise<PasswordReset | null> {
    try {
      return this.findOne(
        'user_id = ? AND used_at IS NULL AND expires_at > ? AND deleted_at IS NULL',
        [userId, new Date().toISOString()]
      );
    } catch (error) {
      logger.error('获取用户有效重置令牌失败:', error);
      throw error;
    }
  }

  /**
   * 检查重置令牌是否有效
   *
   * 快速判断一个令牌是否可用于密码重置，不涉及状态变更。
   * 内部调用 validateToken 方法。
   *
   * @param token - 要检查的令牌字符串
   * @returns 令牌有效返回 true，否则返回 false
   * @throws 数据库查询失败时抛出错误
   */
  async isTokenValid(token: string): Promise<boolean> {
    try {
      const reset = await this.validateToken(token);
      return !!reset;
    } catch (error) {
      logger.error('检查重置令牌有效性失败:', error);
      throw error;
    }
  }

  /**
   * 获取重置令牌的详细信息
   *
   * 无论令牌是否已使用或过期，只要未被软删除即可查询。
   * 通常用于展示令牌的状态信息给用户或进行调试。
   *
   * @param token - 要查询的令牌字符串
   * @returns 令牌的完整记录信息，未找到则返回 null
   * @throws 数据库查询失败时抛出错误
   */
  async getTokenInfo(token: string): Promise<PasswordReset | null> {
    try {
      return this.findOne('token = ? AND deleted_at IS NULL', [token]);
    } catch (error) {
      logger.error('获取重置令牌信息失败:', error);
      throw error;
    }
  }

  /**
   * 清理所有过期或已使用的重置令牌
   *
   * 将已过期或已使用但尚未软删除的重置令牌标记为删除状态。
   * 清理条件包括：
   * - 已超过有效期的令牌（expires_at <= 当前时间）
   * - 已被使用的令牌（used_at IS NOT NULL）
   * 通常在定时任务或系统维护时调用，保持数据库的整洁。
   *
   * @returns 被清理的令牌数量
   * @throws 数据库操作失败时抛出错误
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const sql = `
        UPDATE ${this.tableName}
        SET deleted_at = ?, updated_at = ?
        WHERE (expires_at <= ? OR used_at IS NOT NULL) AND deleted_at IS NULL
      `;
      const result = await query(sql, [
        new Date().toISOString(),
        new Date().toISOString(),
        new Date().toISOString(),
      ]);
      return result.affectedRows || 0;
    } catch (error) {
      logger.error('清理过期重置令牌失败:', error);
      throw error;
    }
  }

  /**
   * 获取指定用户的所有密码重置记录
   *
   * 支持筛选（仅已使用/仅有效）、分页查询。
   * 结果按创建时间降序排列，方便查看最近的记录。
   *
   * @param userId - 用户 ID
   * @param options - 可选查询选项
   * @param options.limit - 每页返回的记录数
   * @param options.offset - 分页偏移量
   * @param options.usedOnly - 是否仅返回已使用的记录
   * @param options.activeOnly - 是否仅返回有效的记录（未使用且未过期）
   * @returns 用户的密码重置记录数组
   * @throws 数据库查询失败时抛出错误
   */
  async getUserResets(userId: string, options?: {
    limit?: number;
    offset?: number;
    usedOnly?: boolean;
    activeOnly?: boolean;
  }): Promise<PasswordReset[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE user_id = ? AND deleted_at IS NULL`;
      const params: any[] = [userId];

      // 仅查看已使用的记录
      if (options?.usedOnly) {
        sql += ` AND used_at IS NOT NULL`;
      }

      // 仅查看有效的记录（未使用且未过期）
      if (options?.activeOnly) {
        sql += ` AND used_at IS NULL AND expires_at > ?`;
        params.push(new Date().toISOString());
      }

      // 按创建时间降序排列
      sql += ` ORDER BY created_at DESC`;

      // 分页
      if (options?.limit) {
        sql += ` LIMIT ?`;
        params.push(options.limit);

        if (options?.offset) {
          sql += ` OFFSET ?`;
          params.push(options.offset);
        }
      }

      const rows = await query(sql, params);
      return rows.map((row: any) => this.fromRow(row));
    } catch (error) {
      logger.error('获取用户重置记录失败:', error);
      throw error;
    }
  }

  /**
   * 使指定用户的所有重置令牌失效
   *
   * 将该用户所有未删除的重置令牌标记为软删除状态。
   * 常用于以下场景：
   * - 用户成功重置密码后
   * - 用户取消重置操作时
   * - 管理员强制失效用户的所有令牌时
   *
   * @param userId - 用户 ID
   * @returns 被失效的令牌数量
   * @throws 数据库操作失败时抛出错误
   */
  async invalidateUserTokens(userId: string): Promise<number> {
    try {
      const sql = `
        UPDATE ${this.tableName}
        SET deleted_at = ?, updated_at = ?
        WHERE user_id = ? AND deleted_at IS NULL
      `;
      const result = await query(sql, [
        new Date().toISOString(),
        new Date().toISOString(),
        userId,
      ]);
      return result.affectedRows || 0;
    } catch (error) {
      logger.error('使用户令牌过期失败:', error);
      throw error;
    }
  }

  /**
   * 获取密码重置的统计数据
   *
   * 统计系统中密码重置的整体情况，包括：
   * - total: 重置记录总数（未软删除）
   * - used: 已使用的记录数
   * - expired: 已过期未使用的记录数
   * - active: 当前有效的记录数
   *
   * @returns 统计结果对象
   * @throws 数据库查询失败时抛出错误
   */
  async getResetStats(): Promise<{
    total: number;
    used: number;
    expired: number;
    active: number;
  }> {
    try {
      const now = new Date().toISOString();

      // 查询重置记录总数
      const totalResult = await query(
        'SELECT COUNT(*) as count FROM password_resets WHERE deleted_at IS NULL'
      );
      const total = totalResult[0]?.count || 0;

      // 查询已使用的记录数
      const usedResult = await query(
        'SELECT COUNT(*) as count FROM password_resets WHERE used_at IS NOT NULL AND deleted_at IS NULL'
      );
      const used = usedResult[0]?.count || 0;

      // 查询已过期未使用的记录数
      const expiredResult = await query(
        'SELECT COUNT(*) as count FROM password_resets WHERE expires_at <= ? AND used_at IS NULL AND deleted_at IS NULL',
        [now]
      );
      const expired = expiredResult[0]?.count || 0;

      // 查询当前有效的记录数（未过期且未使用）
      const activeResult = await query(
        'SELECT COUNT(*) as count FROM password_resets WHERE expires_at > ? AND used_at IS NULL AND deleted_at IS NULL',
        [now]
      );
      const active = activeResult[0]?.count || 0;

      return {
        total: Number(total),
        used: Number(used),
        expired: Number(expired),
        active: Number(active),
      };
    } catch (error) {
      logger.error('获取重置统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户在指定时间内的重置尝试次数
   *
   * 用于安全检查，统计用户在最近一段时间内发起密码重置请求的次数。
   * 配合 isUserRateLimited 方法实现速率限制功能。
   *
   * @param userId - 用户 ID
   * @param hours - 统计的时间范围（小时数），默认为 24 小时
   * @returns 用户在该时间范围内的重置请求次数
   * @throws 数据库查询失败时抛出错误
   */
  async getRecentResetAttempts(userId: string, hours: number = 24): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - hours);

      const result = await query(
        'SELECT COUNT(*) as count FROM password_resets WHERE user_id = ? AND created_at >= ? AND deleted_at IS NULL',
        [userId, cutoffDate.toISOString()]
      );

      return result[0]?.count || 0;
    } catch (error) {
      logger.error('获取最近重置尝试次数失败:', error);
      throw error;
    }
  }

  /**
   * 检查用户是否被限制重置密码（速率限制）
   *
   * 判断用户在指定时间范围内的重置请求次数是否已达到上限。
   * 超过上限后将拒绝该用户的进一步重置请求，防止接口被滥用。
   *
   * @param userId - 用户 ID
   * @param maxAttempts - 允许的最大尝试次数，默认为 5 次
   * @param hours - 统计的时间范围（小时数），默认为 24 小时
   * @returns 超出限制返回 true（应拒绝请求），否则返回 false
   * @throws 数据库查询失败时抛出错误
   *
   * @example
   * const isLimited = await passwordResetModel.isUserRateLimited('123');
   * if (isLimited) {
   *   return res.status(429).json({ message: '重置密码请求过于频繁，请稍后再试' });
   * }
   */
  async isUserRateLimited(userId: string, maxAttempts: number = 5, hours: number = 24): Promise<boolean> {
    try {
      const attempts = await this.getRecentResetAttempts(userId, hours);
      return attempts >= maxAttempts;
    } catch (error) {
      logger.error('检查用户速率限制失败:', error);
      throw error;
    }
  }
}

/** 导出单例实例，供全局使用 */
export const passwordResetModel = new PasswordResetModel();
