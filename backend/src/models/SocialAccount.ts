/**
 * 社交账号模型模块
 *
 * 本模块负责管理用户绑定的第三方社交账号信息，
 * 支持多种 OAuth 提供商（如 Google、Facebook、Steam、Discord 等）
 * 的账号关联、解绑和查询操作，实现社交登录功能的数据层支持。
 */

import { BaseModel } from './BaseModel';
import { query, execute } from '../db';
import logger from '../utils/logger';

/**
 * 社交账号接口
 *
 * 表示用户绑定的一个第三方社交平台账号，
 * 包含提供商信息、平台用户 ID、用户名、邮箱等扩展信息。
 */
export interface SocialAccount {
  /** 社交账号记录的唯一标识 */
  id: string;
  /** 关联的本平台用户 ID */
  userId: string;
  /** OAuth 提供商名称（如 google, facebook, steam, discord 等） */
  provider: string;
  /** 第三方平台中的用户唯一标识 */
  providerAccountId: string;
  /** 第三方平台中的用户显示名称（可选） */
  providerUsername?: string;
  /** 第三方平台中绑定的邮箱地址（可选） */
  providerEmail?: string;
  /** 第三方平台中的用户头像 URL（可选） */
  providerAvatarUrl?: string;
  /** OAuth 提供商的原始用户数据（JSON 字符串，可选） */
  providerData?: string;
  /** 记录创建时间 */
  createdAt: Date;
  /** 记录最后更新时间 */
  updatedAt: Date;
}

/**
 * 社交账号创建输入接口
 *
 * 用于关联新的第三方社交账号时所需的数据结构。
 */
export interface SocialAccountCreateInput {
  /** 关联的本平台用户 ID */
  userId: string;
  /** OAuth 提供商名称 */
  provider: string;
  /** 第三方平台中的用户唯一标识 */
  providerAccountId: string;
  /** 第三方平台中的用户显示名称（可选） */
  providerUsername?: string;
  /** 第三方平台中绑定的邮箱地址（可选） */
  providerEmail?: string;
  /** 第三方平台中的用户头像 URL（可选） */
  providerAvatarUrl?: string;
  /** OAuth 提供商的原始用户数据（JSON 字符串，可选） */
  providerData?: string;
}

/**
 * 社交账号模型
 *
 * 继承自 BaseModel，提供第三方社交账号的数据库操作方法。
 * 支持通过提供商和平台用户 ID 查找、按用户查询所有绑定账号、
 * 关联新账号和解绑等操作。
 */
export class SocialAccountModel extends BaseModel<SocialAccount, SocialAccountCreateInput, any> {
  /** 数据库表名 */
  protected tableName = 'social_accounts';
  /** 主键字段名 */
  protected primaryKey = 'id';

  /**
   * 将数据库行记录转换为 SocialAccount 业务对象
   *
   * @param row - 从数据库查询得到的原始行数据
   * @returns 转换后的 SocialAccount 对象
   */
  protected fromRow(row: any): SocialAccount {
    return {
      id: String(row.id),                                   // 社交账号记录 ID
      userId: String(row.user_id),                          // 关联的本平台用户 ID
      provider: row.provider,                               // OAuth 提供商名称
      providerAccountId: row.provider_account_id,           // 第三方平台用户 ID
      providerUsername: row.provider_username || undefined, // 第三方平台用户名
      providerEmail: row.provider_email || undefined,       // 第三方平台邮箱
      providerAvatarUrl: row.provider_avatar_url || undefined, // 第三方平台头像 URL
      providerData: row.provider_data || undefined,         // OAuth 原始数据
      createdAt: new Date(row.created_at),                  // 创建时间
      updatedAt: new Date(row.updated_at),                  // 更新时间
    };
  }

  /**
   * 将 SocialAccountCreateInput 业务对象转换为数据库行记录
   *
   * @param data - 前端传入的社交账号创建输入数据
   * @returns 适用于数据库插入的行记录对象
   */
  protected toRow(data: SocialAccountCreateInput): any {
    return {
      user_id: data.userId,                       // 关联的本平台用户 ID
      provider: data.provider,                    // OAuth 提供商名称
      provider_account_id: data.providerAccountId, // 第三方平台用户 ID
      provider_username: data.providerUsername || null,  // 第三方平台用户名
      provider_email: data.providerEmail || null,        // 第三方平台邮箱
      provider_avatar_url: data.providerAvatarUrl || null, // 第三方平台头像 URL
      provider_data: data.providerData || null,          // OAuth 原始数据
      created_at: new Date().toISOString(),       // 当前时间作为创建时间
      updated_at: new Date().toISOString(),       // 当前时间作为更新时间
    };
  }

  /**
   * 根据提供商和平台账号 ID 查找社交账号
   *
   * 用于 OAuth 登录回调时，判断该第三方账号是否已绑定到本平台的某个用户。
   *
   * @param provider - OAuth 提供商名称（如 google, facebook）
   * @param providerAccountId - 第三方平台中的用户唯一标识
   * @returns 找到的 SocialAccount 对象，未找到返回 null
   */
  async findByProvider(provider: string, providerAccountId: string): Promise<SocialAccount | null> {
    return this.findOne('provider = ? AND provider_account_id = ?', [provider, providerAccountId]);
  }

  /**
   * 获取用户绑定的所有社交账号
   *
   * 返回指定用户已关联的所有第三方平台账号列表。
   *
   * @param userId - 本平台用户 ID
   * @returns 该用户绑定的 SocialAccount 对象数组
   */
  async findByUser(userId: string): Promise<SocialAccount[]> {
    return this.findAll({
      where: 'user_id = ?',
      params: [userId],
    });
  }

  /**
   * 关联社交账号到用户
   *
   * 在 OAuth 登录流程中，将第三方账号与平台用户进行绑定。
   *
   * @param data - 社交账号创建输入数据
   * @returns 创建成功的 SocialAccount 对象
   */
  async linkAccount(data: SocialAccountCreateInput): Promise<SocialAccount> {
    return this.create(data);
  }

  /**
   * 解除社交账号关联
   *
   * 从数据库中删除指定用户与指定提供商之间的关联记录。
   *
   * @param userId - 本平台用户 ID
   * @param provider - 需要解绑的 OAuth 提供商名称
   * @returns 解绑成功返回 true，未找到对应记录返回 false
   * @throws 删除操作失败时抛出异常
   */
  async unlinkAccount(userId: string, provider: string): Promise<boolean> {
    try {
      const result = await execute(
        'DELETE FROM social_accounts WHERE user_id = ? AND provider = ?',
        [userId, provider]
      );
      return result.changes > 0;
    } catch (error) {
      logger.error('解除社交账号关联失败:', error);
      throw error;
    }
  }

  /**
   * 检查用户是否已关联特定提供商
   *
   * 用于判断某个第三方账号是否已经被当前用户绑定。
   *
   * @param userId - 本平台用户 ID
   * @param provider - OAuth 提供商名称
   * @returns 已关联返回 true，未关联返回 false
   */
  async isLinked(userId: string, provider: string): Promise<boolean> {
    const result = await query(
      'SELECT 1 FROM social_accounts WHERE user_id = ? AND provider = ?',
      [userId, provider]
    );
    return result.length > 0;
  }
}

/** 社交账号模型单例实例 */
export const socialAccountModel = new SocialAccountModel();
