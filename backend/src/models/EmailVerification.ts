/**
 * =============================================================================
 * 邮箱验证模型 (EmailVerification Model)
 * =============================================================================
 *
 * 本文件定义 EmailVerificationModel 类，负责邮箱验证数据的持久化操作。
 * 邮箱验证用于在用户注册、邮箱变更等场景中，通过发送包含验证令牌的邮件
 * 来确认用户对邮箱的所有权。该类提供了令牌的创建、验证、查询和清理等
 * 完整生命周期管理功能。
 *
 * 主要功能：
 * - 生成并存储邮箱验证令牌
 * - 验证用户提交的令牌有效性
 * - 管理令牌的生命周期（过期、停用、清理）
 * - 查询用户的验证记录和状态
 * - 验证数据的统计与分析
 *
 * @module models/EmailVerification
 */

import { BaseModel } from './BaseModel';
import { EmailVerification, EmailVerificationCreateInput, EmailVerificationUpdateInput } from '../types';
import { query } from '../db';
import logger from '../utils/logger';

/**
 * 邮箱验证模型类
 *
 * 继承自 BaseModel，提供对 email_verifications 表的数据库操作。
 * 该类支持软删除和乐观锁机制，确保令牌数据的安全性和操作的原子性。
 * 验证令牌具有时效性（通过 expires_at 字段控制），超过有效期后
 * 将无法通过验证。
 *
 * @template EmailVerification - 邮箱验证记录的类型定义
 * @template EmailVerificationCreateInput - 创建验证记录的输入类型
 * @template EmailVerificationUpdateInput - 更新验证记录的输入类型
 *
 * @example
 * // 创建验证令牌
 * const verification = await emailVerificationModel.createVerification({
 *   userId: '123',
 *   email: 'user@example.com',
 *   token: 'abc123...',
 *   expiresAt: new Date(Date.now() + 3600000),
 * });
 *
 * @example
 * // 验证令牌
 * const result = await emailVerificationModel.verifyToken('abc123...');
 * if (result) {
 *   console.log('邮箱验证成功！');
 * }
 */
export class EmailVerificationModel extends BaseModel<
  EmailVerification,
  EmailVerificationCreateInput,
  EmailVerificationUpdateInput
> {
  /** 对应的数据库表名 */
  protected tableName = 'email_verifications';
  /** 表的主键字段名 */
  protected primaryKey = 'id';

  /* 启用软删除：使旧令牌过期时标记 deleted_at 而非物理删除 */
  protected softDeleteEnabled = true;
  /* 启用乐观锁：通过 version 字段防止并发更新冲突 */
  protected optimisticLockEnabled = true;
  /* 不启用审计日志：验证令牌的变更无需审计追踪 */
  protected auditEnabled = false;

  /**
   * 将数据库查询结果行转换为 EmailVerification 业务对象
   *
   * 将数据库中的原始行数据（下划线命名）映射为符合 TypeScript 类型
   * 定义的 EmailVerification 对象（驼峰命名），处理字段类型转换。
   *
   * @param row - 从数据库查询到的原始行数据
   * @returns 转换后的 EmailVerification 业务对象
   */
  protected fromRow(row: any): EmailVerification {
    return {
      id: String(row.id),                                  // 主键
      userId: String(row.user_id),                         // 用户 ID
      email: row.email,                                    // 验证的邮箱地址
      token: row.token,                                    // 验证令牌
      expiresAt: new Date(row.expires_at),                 // 令牌过期时间
      verifiedAt: row.verified_at ? new Date(row.verified_at) : undefined, // 验证通过时间
      createdAt: new Date(row.created_at),                 // 记录创建时间
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,   // 软删除时间
      version: row.version ? Number(row.version) : 1,      // 乐观锁版本号
    };
  }

  /**
   * 将 EmailVerificationCreateInput 业务对象转换为数据库行格式
   *
   * 将创建验证记录时的输入数据转换为数据库可存储的格式，
   * 包括字段命名转换和时间序列化。
   *
   * @param data - 创建邮箱验证记录的输入数据
   * @returns 适合数据库插入的行数据对象
   */
  protected toRow(data: EmailVerificationCreateInput): any {
    return {
      user_id: data.userId,                                // 用户 ID
      email: data.email,                                   // 邮箱地址
      token: data.token,                                   // 验证令牌
      expires_at: data.expiresAt.toISOString(),             // 过期时间（ISO 格式）
      verified_at: null,                                   // 初始未验证
      created_at: new Date().toISOString(),                 // 创建时间
      deleted_at: null,                                    // 初始未删除
      version: 1,                                          // 初始版本号
    };
  }

  /**
   * 创建邮箱验证令牌
   *
   * 生成一条新的邮箱验证记录。如果该用户和邮箱已有未过期的有效令牌，
   * 则自动将旧令牌标记为已过期（软删除），确保同一时间只有一个有效令牌。
   *
   * @param data - 创建验证记录的输入数据，包含用户 ID、邮箱、令牌值和过期时间
   * @returns 创建成功的邮箱验证记录
   * @throws 数据库操作失败时抛出错误
   */
  async createVerification(data: EmailVerificationCreateInput): Promise<EmailVerification> {
    try {
      // 检查是否已有未过期的验证令牌存在
      const existing = await this.findOne(
        'user_id = ? AND email = ? AND verified_at IS NULL AND expires_at > ? AND deleted_at IS NULL',
        [data.userId, data.email, new Date().toISOString()]
      );

      if (existing) {
        // 使旧令牌过期（软删除），防止令牌堆积
        await this.update(existing.id, { deletedAt: new Date() });
      }

      return this.create(data);
    } catch (error) {
      logger.error('创建邮箱验证令牌失败:', error);
      throw error;
    }
  }

  /**
   * 验证邮箱验证令牌
   *
   * 检查指定的令牌是否有效（未使用、未过期、未删除），
   * 如果有效则将其标记为已验证状态。
   *
   * @param token - 要验证的令牌字符串
   * @returns 验证成功并更新后的 EmailVerification 记录，令牌无效则返回 null
   * @throws 数据库操作失败时抛出错误
   */
  async verifyToken(token: string): Promise<EmailVerification | null> {
    try {
      // 查找有效令牌：未使用、未过期、未删除
      const verification = await this.findOne(
        'token = ? AND verified_at IS NULL AND expires_at > ? AND deleted_at IS NULL',
        [token, new Date().toISOString()]
      );

      if (!verification) {
        return null;
      }

      // 标记为已验证
      const updated = await this.update(verification.id, {
        verifiedAt: new Date(),
      });

      return updated;
    } catch (error) {
      logger.error('验证令牌失败:', error);
      throw error;
    }
  }

  /**
   * 获取指定用户和邮箱的有效验证令牌
   *
   * 查询尚未使用、未过期且未被软删除的验证令牌。
   *
   * @param userId - 用户 ID
   * @param email - 邮箱地址
   * @returns 有效的验证令牌记录，未找到则返回 null
   * @throws 数据库查询失败时抛出错误
   */
  async getActiveVerification(userId: string, email: string): Promise<EmailVerification | null> {
    try {
      return this.findOne(
        'user_id = ? AND email = ? AND verified_at IS NULL AND expires_at > ? AND deleted_at IS NULL',
        [userId, email, new Date().toISOString()]
      );
    } catch (error) {
      logger.error('获取有效验证令牌失败:', error);
      throw error;
    }
  }

  /**
   * 检查令牌是否有效
   *
   * 快速判断一个令牌是否可以用于验证，不涉及状态变更。
   *
   * @param token - 要检查的令牌字符串
   * @returns 令牌有效返回 true，否则返回 false
   * @throws 数据库查询失败时抛出错误
   */
  async isTokenValid(token: string): Promise<boolean> {
    try {
      const verification = await this.findOne(
        'token = ? AND verified_at IS NULL AND expires_at > ? AND deleted_at IS NULL',
        [token, new Date().toISOString()]
      );
      return !!verification;
    } catch (error) {
      logger.error('检查令牌有效性失败:', error);
      throw error;
    }
  }

  /**
   * 获取令牌的详细信息
   *
   * 无论令牌是否已使用或过期，只要未被软删除即可查询。
   * 通常用于展示令牌的状态信息给用户。
   *
   * @param token - 要查询的令牌字符串
   * @returns 令牌的完整记录信息，未找到则返回 null
   * @throws 数据库查询失败时抛出错误
   */
  async getTokenInfo(token: string): Promise<EmailVerification | null> {
    try {
      return this.findOne('token = ? AND deleted_at IS NULL', [token]);
    } catch (error) {
      logger.error('获取令牌信息失败:', error);
      throw error;
    }
  }

  /**
   * 清理所有过期的验证令牌
   *
   * 将已过期但尚未被软删除的验证令牌标记为删除状态。
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
        WHERE expires_at <= ? AND deleted_at IS NULL
      `;
      const result = await query(sql, [
        new Date().toISOString(),
        new Date().toISOString(),
        new Date().toISOString(),
      ]);
      return result.affectedRows || 0;
    } catch (error) {
      logger.error('清理过期验证令牌失败:', error);
      throw error;
    }
  }

  /**
   * 查询指定用户的验证历史记录
   *
   * 支持按邮箱筛选、仅查看已验证记录、分页等选项，
   * 结果按创建时间降序排列。
   *
   * @param userId - 用户 ID
   * @param options - 可选查询选项
   * @param options.limit - 每页返回的记录数
   * @param options.offset - 分页偏移量
   * @param options.email - 按邮箱地址筛选
   * @param options.verifiedOnly - 是否仅返回已验证的记录
   * @returns 用户的验证记录数组
   * @throws 数据库查询失败时抛出错误
   */
  async getUserVerifications(userId: string, options?: {
    limit?: number;
    offset?: number;
    email?: string;
    verifiedOnly?: boolean;
  }): Promise<EmailVerification[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName} WHERE user_id = ? AND deleted_at IS NULL`;
      const params: any[] = [userId];

      // 按邮箱筛选
      if (options?.email) {
        sql += ` AND email = ?`;
        params.push(options.email);
      }

      // 仅查看已验证记录
      if (options?.verifiedOnly) {
        sql += ` AND verified_at IS NOT NULL`;
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
      logger.error('获取用户验证记录失败:', error);
      throw error;
    }
  }

  /**
   * 检查指定用户的指定邮箱是否已验证
   *
   * @param userId - 用户 ID
   * @param email - 邮箱地址
   * @returns 已验证返回 true，否则返回 false
   * @throws 数据库查询失败时抛出错误
   */
  async isEmailVerified(userId: string, email: string): Promise<boolean> {
    try {
      const verification = await this.findOne(
        'user_id = ? AND email = ? AND verified_at IS NOT NULL AND deleted_at IS NULL',
        [userId, email]
      );
      return !!verification;
    } catch (error) {
      logger.error('检查邮箱验证状态失败:', error);
      throw error;
    }
  }

  /**
   * 重新发送验证邮件（创建新令牌）
   *
   * 当用户请求重新发送验证邮件时调用。
   * 会先停用该用户和邮箱的所有旧令牌，然后创建一个新的验证令牌。
   *
   * @param userId - 用户 ID
   * @param email - 要验证的邮箱地址
   * @param token - 新生成的验证令牌
   * @param expiresAt - 新令牌的过期时间
   * @returns 创建的新的验证记录
   * @throws 数据库操作失败时抛出错误
   */
  async resendVerification(userId: string, email: string, token: string, expiresAt: Date): Promise<EmailVerification> {
    try {
      // 先停用所有旧的验证令牌
      await this.deactivateUserVerifications(userId, email);

      // 创建新的验证令牌
      return this.createVerification({
        userId,
        email,
        token,
        expiresAt,
      });
    } catch (error) {
      logger.error('重新发送验证邮件失败:', error);
      throw error;
    }
  }

  /**
   * 停用指定用户和邮箱的所有验证令牌
   *
   * 将所有匹配的未删除验证标记为已删除（软删除），
   * 用于在重新发送验证邮件或用户修改邮箱时清理旧令牌。
   *
   * @param userId - 用户 ID
   * @param email - 邮箱地址
   * @returns 被停用的令牌数量
   * @throws 数据库操作失败时抛出错误
   */
  async deactivateUserVerifications(userId: string, email: string): Promise<number> {
    try {
      const sql = `
        UPDATE ${this.tableName}
        SET deleted_at = ?, updated_at = ?
        WHERE user_id = ? AND email = ? AND deleted_at IS NULL
      `;
      const result = await query(sql, [
        new Date().toISOString(),
        new Date().toISOString(),
        userId,
        email,
      ]);
      return result.affectedRows || 0;
    } catch (error) {
      logger.error('停用用户验证令牌失败:', error);
      throw error;
    }
  }

  /**
   * 获取验证相关的统计数据
   *
   * 统计系统中邮箱验证的整体情况，包括：
   * - total: 验证记录总数（未软删除）
   * - verified: 已完成验证的记录数
   * - expired: 已过期但未验证的记录数
   * - pending: 待验证的有效记录数
   *
   * @returns 统计结果对象
   * @throws 数据库查询失败时抛出错误
   */
  async getVerificationStats(): Promise<{
    total: number;
    verified: number;
    expired: number;
    pending: number;
  }> {
    try {
      const now = new Date().toISOString();

      // 查询验证记录总数
      const totalResult = await query(
        'SELECT COUNT(*) as count FROM email_verifications WHERE deleted_at IS NULL'
      );
      const total = totalResult[0]?.count || 0;

      // 查询已验证的记录数
      const verifiedResult = await query(
        'SELECT COUNT(*) as count FROM email_verifications WHERE verified_at IS NOT NULL AND deleted_at IS NULL'
      );
      const verified = verifiedResult[0]?.count || 0;

      // 查询已过期未验证的记录数
      const expiredResult = await query(
        'SELECT COUNT(*) as count FROM email_verifications WHERE expires_at <= ? AND verified_at IS NULL AND deleted_at IS NULL',
        [now]
      );
      const expired = expiredResult[0]?.count || 0;

      // 查询待验证的有效记录数
      const pendingResult = await query(
        'SELECT COUNT(*) as count FROM email_verifications WHERE expires_at > ? AND verified_at IS NULL AND deleted_at IS NULL',
        [now]
      );
      const pending = pendingResult[0]?.count || 0;

      return {
        total: Number(total),
        verified: Number(verified),
        expired: Number(expired),
        pending: Number(pending),
      };
    } catch (error) {
      logger.error('获取验证统计信息失败:', error);
      throw error;
    }
  }
}

/** 导出单例实例，供全局使用 */
export const emailVerificationModel = new EmailVerificationModel();
