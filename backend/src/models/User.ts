/**
 * ============================================================
 * 用户模型 (UserModel)
 * ============================================================
 * 本文件定义 UserModel 类，继承自 BaseModel，
 * 用于操作用户数据表（users），提供用户相关的数据库操作方法。
 *
 * 功能涵盖：
 *   - 用户注册、登录（含密码哈希验证）
 *   - 用户搜索与统计
 *   - 社交登录（Google / GitHub / Facebook / Twitter）
 *   - 双因素认证（2FA）
 *   - 营销偏好、通知设置、隐私设置
 *   - 语言偏好
 * ============================================================
 */

import { BaseModel } from './BaseModel';
import { User, UserCreateInput, UserUpdateInput } from '../types';
import { query, execute } from '../db';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger';

/**
 * 用户模型类
 *
 * 继承自 BaseModel，实体类型为 User，创建输入 UserCreateInput，更新输入 UserUpdateInput。
 * 启用了软删除、乐观锁和审计日志。
 */
export class UserModel extends BaseModel<User, UserCreateInput, UserUpdateInput> {
  protected tableName = 'users';
  protected primaryKey = 'id';

  // 启用软删除、乐观锁和审计日志
  protected softDeleteEnabled = true;
  protected optimisticLockEnabled = true;
  protected auditEnabled = true;

  /**
   * 将数据库行记录转换为 User 对象
   * 处理 JSON 字段的解析（email_preferences、notification_settings 等）
   * @param row 数据库原始行数据
   * @returns 转换后的 User 实例
   */
  protected fromRow(row: any): User {
    // 解析邮件偏好 JSON 字段，提供默认值
    const emailPreferences = row.email_preferences
      ? (typeof row.email_preferences === 'string'
          ? JSON.parse(row.email_preferences)
          : row.email_preferences)
      : { promotional: true, transactional: true, newsletter: true, system: true };

    // 解析通知设置 JSON 字段
    const notificationSettings = row.notification_settings
      ? (typeof row.notification_settings === 'string'
          ? JSON.parse(row.notification_settings)
          : row.notification_settings)
      : { email: true, push: false, inApp: true, frequency: 'immediate' };

    // 解析隐私设置 JSON 字段
    const privacySettings = row.privacy_settings
      ? (typeof row.privacy_settings === 'string'
          ? JSON.parse(row.privacy_settings)
          : row.privacy_settings)
      : { profileVisibility: 'public', showEmail: false, showLastLogin: true, showOnlineStatus: true };

    // 解析双因素认证备用验证码
    const twoFactorBackupCodes = row.two_factor_backup_codes
      ? (typeof row.two_factor_backup_codes === 'string'
          ? JSON.parse(row.two_factor_backup_codes)
          : row.two_factor_backup_codes)
      : undefined;

    return {
      id: String(row.id),
      username: row.username,
      email: row.email,
      displayName: row.display_name || undefined,
      avatarUrl: row.avatar_url ?? null,
      bio: row.bio ?? null,
      language: row.language || undefined,
      role: row.role as 'super_admin' | 'admin' | 'user',
      emailVerified: Boolean(row.email_verified),
      isActive: Boolean(row.is_active),
      lastLogin: row.last_login ? new Date(row.last_login) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),

      // 等级与登录时长
      level: row.level ?? 1,
      totalLoginTime: row.total_login_time ?? 0,
      totalXp: row.total_xp ?? 0,
      totalPoints: row.total_points ?? 0,

      // 手机相关
      phone: row.phone || undefined,
      phoneVerified: Boolean(row.phone_verified),

      // 评论冻结状态
      commentFrozen: Boolean(row.comment_frozen),
      frozenUntil: row.frozen_until ? new Date(row.frozen_until) : undefined,

      // 社交登录 ID
      googleId: row.google_id || undefined,
      githubId: row.github_id || undefined,
      facebookId: row.facebook_id || undefined,
      twitterId: row.twitter_id || undefined,

      // 双因素认证
      twoFactorEnabled: Boolean(row.two_factor_enabled),
      twoFactorSecret: row.two_factor_secret || undefined,
      twoFactorBackupCodes,
      twoFactorLastUsed: row.two_factor_last_used ? new Date(row.two_factor_last_used) : undefined,

      // 营销偏好
      marketingOptIn: row.marketing_opt_in !== undefined ? Boolean(row.marketing_opt_in) : true,
      newsletterSubscription: row.newsletter_subscription !== undefined ? Boolean(row.newsletter_subscription) : true,
      emailPreferences,

      // 用户设置
      notificationSettings,
      privacySettings,

      // 软删除支持
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,

      // 审计字段
      createdBy: row.created_by || undefined,
      updatedBy: row.updated_by || undefined,

      // 乐观锁版本
      version: row.version ? Number(row.version) : 1,
    };
  }

  /**
   * 将 UserCreateInput 转换为数据库行格式
   * 处理 JSON 序列化（email_preferences、notification_settings、privacy_settings）
   * @param data 创建用户时传入的数据
   * @returns 适配 users 表列格式的对象
   */
  protected toRow(data: UserCreateInput): any {
    // 默认邮件偏好
    const emailPreferences = data.emailPreferences || {
      promotional: true,
      transactional: true,
      newsletter: true,
      system: true,
    };

    // 默认通知设置
    const notificationSettings = data.notificationSettings || {
      email: true,
      push: false,
      inApp: true,
      frequency: 'immediate',
    };

    // 默认隐私设置
    const privacySettings = data.privacySettings || {
      profileVisibility: 'public',
      showEmail: false,
      showLastLogin: true,
      showOnlineStatus: true,
    };

    return {
      username: data.username,
      email: data.email,
      display_name: data.displayName || null,
      avatar_url: null,
      language: data.language || 'en',
      bio: null,
      role: data.role || 'user',
      email_verified: 0,
      is_active: 1,
      last_login: null,
      level: 1,
      total_login_time: 0,
      comment_frozen: 0,
      frozen_until: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),

      // 手机
      phone: data.phone || null,
      phone_verified: 0,

      // 社交登录字段
      google_id: data.googleId || null,
      github_id: data.githubId || null,
      facebook_id: data.facebookId || null,
      twitter_id: data.twitterId || null,

      // 双因素认证（默认禁用）
      two_factor_enabled: 0,
      two_factor_secret: null,
      two_factor_backup_codes: null,
      two_factor_last_used: null,

      // 营销偏好
      marketing_opt_in: data.marketingOptIn !== undefined ? (data.marketingOptIn ? 1 : 0) : 1,
      newsletter_subscription: data.newsletterSubscription !== undefined ? (data.newsletterSubscription ? 1 : 0) : 1,
      email_preferences: JSON.stringify(emailPreferences),

      // 用户设置
      notification_settings: JSON.stringify(notificationSettings),
      privacy_settings: JSON.stringify(privacySettings),

      // 软删除字段（默认 NULL）
      deleted_at: null,

      // 乐观锁版本（初始为 1）
      version: 1,
    };
  }

  /**
   * 根据邮箱查找用户
   * @param email 用户邮箱
   * @returns 找到的用户，未找到则返回 null
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.findOne('email = ?', [email]);
  }

  /**
   * 根据用户名查找用户
   * @param username 用户名
   * @returns 找到的用户，未找到则返回 null
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.findOne('username = ?', [username]);
  }

  /**
   * 创建用户并自动哈希密码
   * @param data 包含密码的完整用户注册信息
   * @returns 新创建的用户对象
   */
  async createWithPassword(data: UserCreateInput & { password: string }): Promise<User> {
    try {
      // 生成密码哈希盐值并加密
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(data.password, salt);

      const row = this.toRow(data);
      row.password_hash = passwordHash;

      const columns = Object.keys(row).join(', ');
      const placeholders = Object.keys(row).map(() => '?').join(', ');
      const values = Object.values(row);

      const sql = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`;
      const result = await execute(sql, values);

      const newUser = await this.findById(result.lastInsertRowid);
      if (!newUser) {
        throw new Error('创建用户后获取失败');
      }
      return newUser;
    } catch (error) {
      logger.error('创建用户失败:', error);
      throw error;
    }
  }

  /**
   * 验证用户密码是否正确
   * @param user     用户对象
   * @param password 待验证的明文密码
   * @returns 密码是否匹配
   */
  async verifyPassword(user: User, password: string): Promise<boolean> {
    try {
      const rows = await query(
        `SELECT password_hash FROM ${this.tableName} WHERE id = ?`,
        [user.id]
      );
      if (rows.length === 0) return false;

      const passwordHash = rows[0].password_hash;
      return bcrypt.compare(password, passwordHash);
    } catch (error) {
      logger.error('验证密码失败:', error);
      return false;
    }
  }

  /**
   * 更新用户密码
   * @param userId      用户 ID
   * @param newPassword 新密码（明文）
   * @returns 是否更新成功
   */
  async updatePassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);

      const sql = `
        UPDATE ${this.tableName}
        SET password_hash = ?, updated_at = ?
        WHERE id = ?
      `;
      const result = await execute(sql, [passwordHash, new Date().toISOString(), userId]);
      return result.changes > 0;
    } catch (error) {
      logger.error('更新密码失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户的最后登录时间
   * @param userId 用户 ID
   */
  async updateLastLogin(userId: string): Promise<void> {
    try {
      await execute(
        `UPDATE ${this.tableName} SET last_login = ? WHERE id = ?`,
        [new Date().toISOString(), userId]
      );
    } catch (error) {
      logger.error('更新最后登录时间失败:', error);
      // 不抛出错误，因为这不是关键操作
    }
  }

  /**
   * 根据关键字搜索用户（支持用户名、邮箱、显示名模糊匹配）
   * @param queryText 搜索关键字
   * @param options   分页及角色筛选选项
   * @returns 匹配的用户列表
   */
  async searchUsers(queryText: string, options?: {
    limit?: number;
    offset?: number;
    role?: string;
  }): Promise<User[]> {
    try {
      let sql = `
        SELECT * FROM ${this.tableName}
        WHERE (username LIKE ? OR email LIKE ? OR display_name LIKE ?)
      `;
      const params: any[] = [`%${queryText}%`, `%${queryText}%`, `%${queryText}%`];

      if (options?.role) {
        sql += ` AND role = ?`;
        params.push(options.role);
      }

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
      logger.error('搜索用户失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户统计数据（评测数、评论数、收藏数、最后活动时间）
   * @param userId 用户 ID
   * @returns 用户统计数据对象
   */
  async getUserStats(userId: string): Promise<{
    reviewCount: number;
    commentCount: number;
    favoriteCount: number;
    lastActivity: Date | null;
  }> {
    try {
      const reviewResult = await query(
        'SELECT COUNT(*) as count FROM reviews WHERE author_id = ?', [userId]
      );
      const reviewCount = reviewResult[0]?.count || 0;

      const commentResult = await query(
        'SELECT COUNT(*) as count FROM comments WHERE author_id = ?', [userId]
      );
      const commentCount = commentResult[0]?.count || 0;

      const favoriteResult = await query(
        'SELECT COUNT(*) as count FROM favorites WHERE user_id = ?', [userId]
      );
      const favoriteCount = favoriteResult[0]?.count || 0;

      const activityResult = await query(`
        SELECT MAX(created_at) as last_activity FROM (
          SELECT created_at FROM reviews WHERE author_id = ?
          UNION ALL
          SELECT created_at FROM comments WHERE author_id = ?
        )
      `, [userId, userId]);
      const lastActivity = activityResult[0]?.last_activity
        ? new Date(activityResult[0].last_activity)
        : null;

      return { reviewCount, commentCount, favoriteCount, lastActivity };
    } catch (error) {
      logger.error('获取用户统计数据失败:', error);
      throw error;
    }
  }

  /**
   * 检查邮箱是否已被注册
   * @param email          待检查的邮箱
   * @param excludeUserId 排除的用户 ID（更新场景）
   * @returns 是否存在
   */
  async emailExists(email: string, excludeUserId?: string): Promise<boolean> {
    try {
      let sql = `SELECT 1 FROM ${this.tableName} WHERE email = ?`;
      const params: any[] = [email];
      if (excludeUserId) {
        sql += ` AND id != ?`;
        params.push(excludeUserId);
      }
      const rows = await query(sql, params);
      return rows.length > 0;
    } catch (error) {
      logger.error('检查邮箱是否存在失败:', error);
      throw error;
    }
  }

  /**
   * 检查用户名是否已被注册
   * @param username       待检查的用户名
   * @param excludeUserId  排除的用户 ID
   * @returns 是否存在
   */
  async usernameExists(username: string, excludeUserId?: string): Promise<boolean> {
    try {
      let sql = `SELECT 1 FROM ${this.tableName} WHERE username = ?`;
      const params: any[] = [username];
      if (excludeUserId) {
        sql += ` AND id != ?`;
        params.push(excludeUserId);
      }
      const rows = await query(sql, params);
      return rows.length > 0;
    } catch (error) {
      logger.error('检查用户名是否存在失败:', error);
      throw error;
    }
  }

  /**
   * 根据社交登录提供方和 ID 查找用户
   * @param provider 社交平台名称（google | github | facebook | twitter）
   * @param socialId 社交平台用户 ID
   * @returns 找到的用户，未找到则返回 null
   */
  async findBySocialId(provider: 'google' | 'github' | 'facebook' | 'twitter', socialId: string): Promise<User | null> {
    try {
      const field = `${provider}_id`;
      return this.findOne(`${field} = ?`, [socialId]);
    } catch (error) {
      logger.error(`根据${provider} ID查找用户失败:`, error);
      throw error;
    }
  }

  /**
   * 更新用户的社交登录 ID
   * @param userId   用户 ID
   * @param provider 社交平台名称
   * @param socialId 社交平台用户 ID
   * @returns 是否更新成功
   */
  async updateSocialId(userId: string, provider: 'google' | 'github' | 'facebook' | 'twitter', socialId: string): Promise<boolean> {
    try {
      const field = `${provider}_id`;
      const sql = `UPDATE ${this.tableName} SET ${field} = ?, updated_at = ? WHERE id = ?`;
      const result = await query(sql, [socialId, new Date().toISOString(), userId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error(`更新用户${provider} ID失败:`, error);
      throw error;
    }
  }

  /**
   * 启用或禁用双因素认证
   * @param userId      用户 ID
   * @param enabled     是否启用
   * @param secret      双因素密钥
   * @param backupCodes 备用恢复码
   * @returns 是否更新成功
   */
  async updateTwoFactor(userId: string, enabled: boolean, secret?: string, backupCodes?: string[]): Promise<boolean> {
    try {
      const updates: Record<string, any> = {
        two_factor_enabled: enabled ? 1 : 0,
        updated_at: new Date().toISOString(),
      };
      if (secret) updates.two_factor_secret = secret;
      if (backupCodes) updates.two_factor_backup_codes = JSON.stringify(backupCodes);

      const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      values.push(userId);

      const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
      const result = await query(sql, values);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('更新用户双因素认证设置失败:', error);
      throw error;
    }
  }

  /**
   * 更新双因素认证的最后使用时间
   * @param userId 用户 ID
   */
  async updateTwoFactorLastUsed(userId: string): Promise<void> {
    try {
      await query(
        `UPDATE ${this.tableName} SET two_factor_last_used = ? WHERE id = ?`,
        [new Date().toISOString(), userId]
      );
    } catch (error) {
      logger.error('更新双因素认证最后使用时间失败:', error);
    }
  }

  /**
   * 更新用户的营销偏好设置
   * @param userId                     用户 ID
   * @param preferences                偏好对象
   * @param preferences.marketingOptIn 是否接受营销推广
   * @param preferences.newsletterSubscription 是否订阅新闻通讯
   * @param preferences.emailPreferences 邮件子偏好
   * @returns 是否更新成功
   */
  async updateMarketingPreferences(userId: string, preferences: {
    marketingOptIn?: boolean;
    newsletterSubscription?: boolean;
    emailPreferences?: {
      promotional?: boolean;
      transactional?: boolean;
      newsletter?: boolean;
      system?: boolean;
    };
  }): Promise<boolean> {
    try {
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };

      if (preferences.marketingOptIn !== undefined) {
        updates.marketing_opt_in = preferences.marketingOptIn ? 1 : 0;
      }
      if (preferences.newsletterSubscription !== undefined) {
        updates.newsletter_subscription = preferences.newsletterSubscription ? 1 : 0;
      }
      if (preferences.emailPreferences) {
        const user = await this.findById(userId);
        if (user) {
          const merged = { ...user.emailPreferences, ...preferences.emailPreferences };
          updates.email_preferences = JSON.stringify(merged);
        } else {
          updates.email_preferences = JSON.stringify(preferences.emailPreferences);
        }
      }

      if (Object.keys(updates).length === 1) return true; // 只有 updated_at，无实际更新

      const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      values.push(userId);

      const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
      const result = await query(sql, values);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('更新用户营销偏好失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户的通知设置
   * @param userId  用户 ID
   * @param settings 通知设置对象
   * @returns 是否更新成功
   */
  async updateNotificationSettings(userId: string, settings: {
    email?: boolean;
    push?: boolean;
    inApp?: boolean;
    frequency?: 'immediate' | 'daily' | 'weekly';
  }): Promise<boolean> {
    try {
      const user = await this.findById(userId);
      if (!user) return false;

      const merged = { ...user.notificationSettings, ...settings };
      const updates = {
        notification_settings: JSON.stringify(merged),
        updated_at: new Date().toISOString(),
      };

      const sql = `UPDATE ${this.tableName} SET notification_settings = ?, updated_at = ? WHERE id = ?`;
      const result = await query(sql, [updates.notification_settings, updates.updated_at, userId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('更新用户通知设置失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户的隐私设置
   * @param userId  用户 ID
   * @param settings 隐私设置对象
   * @returns 是否更新成功
   */
  async updatePrivacySettings(userId: string, settings: {
    profileVisibility?: 'public' | 'friends' | 'private';
    showEmail?: boolean;
    showLastLogin?: boolean;
    showOnlineStatus?: boolean;
  }): Promise<boolean> {
    try {
      const user = await this.findById(userId);
      if (!user) return false;

      const merged = { ...user.privacySettings, ...settings };
      const updates = {
        privacy_settings: JSON.stringify(merged),
        updated_at: new Date().toISOString(),
      };

      const sql = `UPDATE ${this.tableName} SET privacy_settings = ?, updated_at = ? WHERE id = ?`;
      const result = await query(sql, [updates.privacy_settings, updates.updated_at, userId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('更新用户隐私设置失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户的登录历史（简化版）
   * @param userId 用户 ID
   * @param limit  返回条数上限
   * @returns 登录历史数组
   */
  async getLoginHistory(userId: string, limit: number = 10): Promise<Array<{ date: Date; ip?: string; device?: string }>> {
    try {
      const user = await this.findById(userId);
      if (!user || !user.lastLogin) return [];
      return [{ date: user.lastLogin, ip: undefined, device: undefined }];
    } catch (error) {
      logger.error('获取用户登录历史失败:', error);
      return [];
    }
  }

  /**
   * 增强搜索用户（支持按活跃、邮箱验证、营销偏好等多种条件筛选）
   * @param queryText 搜索关键字
   * @param options   筛选和分页选项
   * @returns 匹配的用户列表
   */
  async searchUsersEnhanced(
    queryText?: string,
    options?: {
      limit?: number;
      offset?: number;
      role?: string;
      isActive?: boolean;
      emailVerified?: boolean;
      marketingOptIn?: boolean;
      newsletterSubscription?: boolean;
    }
  ): Promise<User[]> {
    try {
      let sql = `SELECT * FROM ${this.tableName}`;
      const params: any[] = [];
      const conditions: string[] = [];

      // 软删除过滤
      if (this.softDeleteEnabled) {
        conditions.push(`${this.deletedAtField} IS NULL`);
      }

      if (queryText) {
        conditions.push('(username LIKE ? OR email LIKE ? OR display_name LIKE ?)');
        params.push(`%${queryText}%`, `%${queryText}%`, `%${queryText}%`);
      }
      if (options?.role) { conditions.push('role = ?'); params.push(options.role); }
      if (options?.isActive !== undefined) { conditions.push('is_active = ?'); params.push(options.isActive ? 1 : 0); }
      if (options?.emailVerified !== undefined) { conditions.push('email_verified = ?'); params.push(options.emailVerified ? 1 : 0); }
      if (options?.marketingOptIn !== undefined) { conditions.push('marketing_opt_in = ?'); params.push(options.marketingOptIn ? 1 : 0); }
      if (options?.newsletterSubscription !== undefined) { conditions.push('newsletter_subscription = ?'); params.push(options.newsletterSubscription ? 1 : 0); }

      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }

      sql += ` ORDER BY created_at DESC`;

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
      logger.error('增强搜索用户失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户的语言偏好
   * @param userId   用户 ID
   * @param language 语言代码（如 'en', 'zh-CN', 'ja'）
   * @returns 是否更新成功
   */
  async updateLanguage(userId: string, language: string): Promise<boolean> {
    try {
      const sql = `UPDATE ${this.tableName} SET language = ?, updated_at = ? WHERE id = ?`;
      const result = await query(sql, [language, new Date().toISOString(), userId]);
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('更新用户语言偏好失败:', error);
      throw error;
    }
  }
}

/** 导出 UserModel 单例实例 */
export const userModel = new UserModel();
