/**
 * User Service 单元测试
 *
 * 测试范围：user.service 的全部公开方法
 * - getUsers      获取用户列表（无搜索 / 带搜索 / 空列表）
 * - getUserById   获取单个用户（成功 / 不存在抛 NotFoundError）
 * - updateUser    更新用户（正常更新 / 无数据更新 / 无效角色 / 无效状态 / 用户不存在）
 * - deleteUser    删除用户（成功 / 不存在抛 NotFoundError）
 *
 * 所有数据库操作通过 jest.mock 隔离，Mock 原始 SQL 查询结果。
 */

import { query, execute } from '../../../src/db';
import {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} from '../../../src/services/user.service';
import { NotFoundError, ValidationError } from '../../../src/middlewares/error.middleware';

// ================================================================
// Mock 依赖
// ================================================================
jest.mock('../../../src/db', () => ({
  query: jest.fn(),
  execute: jest.fn(),
}));

// 类型化 mock 函数
const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedExecute = execute as jest.MockedFunction<typeof execute>;

/* ================================================================
 *  User Service 单元测试
 * ================================================================ */
describe('User Service 单元测试', () => {
  const mockUserRow = {
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    display_name: '测试用户',
    avatar_url: null,
    bio: null,
    role: 'user',
    language: 'en',
    email_verified: 0,
    is_active: 1,
    last_login: null,
    level: 1,
    total_login_time: 0,
    total_points: 0,
    total_xp: 0,
    phone: null,
    phone_verified: 0,
    comment_frozen: 0,
    frozen_until: null,
    google_id: null,
    github_id: null,
    facebook_id: null,
    twitter_id: null,
    two_factor_enabled: 0,
    two_factor_secret: null,
    two_factor_backup_codes: null,
    two_factor_last_used: null,
    marketing_opt_in: 0,
    newsletter_subscription: 0,
    email_preferences: null,
    notification_settings: null,
    privacy_settings: null,
    deleted_at: null,
    created_by: null,
    updated_by: null,
    version: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockUser = {
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    displayName: '测试用户',
    avatarUrl: null,
    bio: null,
    role: 'user' as const,
    language: 'en',
    emailVerified: false,
    isActive: true,
    lastLogin: null,
    createdAt: new Date(mockUserRow.created_at),
    updatedAt: new Date(mockUserRow.updated_at),
    level: 1,
    totalLoginTime: 0,
    totalPoints: 0,
    totalXp: 0,
    phone: undefined,
    phoneVerified: false,
    commentFrozen: false,
    frozenUntil: undefined,
    googleId: null,
    githubId: null,
    facebookId: null,
    twitterId: null,
    twoFactorEnabled: 0,
    twoFactorSecret: null,
    twoFactorBackupCodes: null,
    twoFactorLastUsed: null,
    marketingOptIn: 0,
    newsletterSubscription: 0,
    emailPreferences: {
      promotional: false,
      transactional: true,
      newsletter: false,
      system: true,
    },
    notificationSettings: {
      email: true,
      push: true,
      inApp: true,
      frequency: 'immediate',
    },
    privacySettings: {
      profileVisibility: 'public',
      showEmail: false,
      showLastLogin: true,
      showOnlineStatus: true,
    },
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
    version: null,
  };

  /** 每个测试前重置所有 mock 调用记录 */
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* --------------------------------------------------------------
   *  getUsers
   * -------------------------------------------------------------- */
  describe('getUsers', () => {

    it('应该成功获取用户列表（无搜索关键词）', async () => {
      const mockCountResult = [{ total: '2' }];
      const mockDataResult = [mockUserRow, { ...mockUserRow, id: '2' }];

      mockedQuery
        .mockResolvedValueOnce(mockCountResult as any)  // 第一次：COUNT 查询
        .mockResolvedValueOnce(mockDataResult as any);   // 第二次：数据查询

      const result = await getUsers(1, 20);

      expect(mockedQuery).toHaveBeenCalledTimes(2);
      expect(mockedQuery).toHaveBeenNthCalledWith(
        1,
        'SELECT COUNT(*) as total FROM users ',
        []
      );
      expect(mockedQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('SELECT * FROM users'),
        [20, 0]
      );

      expect(result).toEqual({
        users: [mockUser, { ...mockUser, id: '2' }],
        total: 2,
        page: 1,
        limit: 20,
      });
    });

    it('应该成功获取用户列表（带搜索关键词）', async () => {
      const mockCountResult = [{ total: '1' }];
      const mockDataResult = [mockUserRow];

      mockedQuery
        .mockResolvedValueOnce(mockCountResult as any)
        .mockResolvedValueOnce(mockDataResult as any);

      const result = await getUsers(1, 20, 'test');

      expect(mockedQuery).toHaveBeenCalledTimes(2);
      expect(mockedQuery).toHaveBeenNthCalledWith(
        1,
        'SELECT COUNT(*) as total FROM users WHERE (username LIKE ? OR email LIKE ? OR display_name LIKE ?)',
        ['%test%', '%test%', '%test%']
      );
      expect(result.total).toBe(1);
    });

    it('应该处理空用户列表的情况', async () => {
      const mockCountResult = [{ total: '0' }];
      const mockDataResult: any[] = [];

      mockedQuery
        .mockResolvedValueOnce(mockCountResult as any)
        .mockResolvedValueOnce(mockDataResult as any);

      const result = await getUsers(1, 20);

      expect(result).toEqual({
        users: [],
        total: 0,
        page: 1,
        limit: 20,
      });
    });
  });

  /* --------------------------------------------------------------
   *  getUserById
   * -------------------------------------------------------------- */
  describe('getUserById', () => {

    it('应该成功获取用户并映射为 User 对象', async () => {
      const mockResult = [mockUserRow];
      mockedQuery.mockResolvedValue(mockResult as any);

      const result = await getUserById('1');

      expect(mockedQuery).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = ?',
        ['1']
      );
      expect(result).toEqual(mockUser);
    });

    it('当用户不存在时应抛出 NotFoundError', async () => {
      const mockResult: any[] = [];
      mockedQuery.mockResolvedValue(mockResult as any);

      await expect(getUserById('999')).rejects.toThrow(NotFoundError);
      expect(mockedQuery).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = ?',
        ['999']
      );
    });
  });

  /* --------------------------------------------------------------
   *  updateUser
   * -------------------------------------------------------------- */
  describe('updateUser', () => {

    it('应该成功更新用户的显示名称、简介和角色', async () => {
      const updateData = {
        displayName: '新显示名称',
        bio: '新的个人简介',
        role: 'admin' as const,
        status: 'active' as const,
      };

      const updatedUserRow = {
        ...mockUserRow,
        display_name: '新显示名称',
        bio: '新的个人简介',
        role: 'admin',
        is_active: true,
      };

      mockedExecute.mockResolvedValue({ changes: 1 } as any);
      const mockResult = [updatedUserRow];
      mockedQuery.mockResolvedValue(mockResult as any);

      const result = await updateUser('1', updateData);

      expect(result.displayName).toBe('新显示名称');
      expect(result.bio).toBe('新的个人简介');
      expect(result.role).toBe('admin');
    });

    it('当没有提供更新数据时应返回现有用户信息', async () => {
      const mockResult = [mockUserRow];
      mockedQuery.mockResolvedValue(mockResult as any);

      const result = await updateUser('1', {});

      expect(mockedQuery).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = ?',
        ['1']
      );
      expect(result).toEqual(mockUser);
    });

    it('当角色值无效时应抛出 ValidationError', async () => {
      await expect(
        updateUser('1', { role: 'invalid-role' as any })
      ).rejects.toThrow(ValidationError);
    });

    it('当状态值无效时应抛出 ValidationError', async () => {
      await expect(
        updateUser('1', { status: 'invalid-status' as any })
      ).rejects.toThrow(ValidationError);
    });

    it('当用户不存在时应抛出 NotFoundError', async () => {
      const mockResult: any[] = [];
      mockedQuery.mockResolvedValue(mockResult as any);

      await expect(
        updateUser('999', { displayName: '新名称' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  /* --------------------------------------------------------------
   *  deleteUser
   * -------------------------------------------------------------- */
  describe('deleteUser', () => {

    it('应该成功删除用户（物理删除）', async () => {
      mockedExecute.mockResolvedValue({ changes: 1 } as any);

      await deleteUser('1');

      expect(mockedExecute).toHaveBeenCalledWith(
        'DELETE FROM users WHERE id = ?',
        ['1']
      );
    });

    it('当用户不存在时应抛出 NotFoundError', async () => {
      mockedExecute.mockResolvedValue({ changes: 0 } as any);

      await expect(deleteUser('999')).rejects.toThrow(NotFoundError);
    });
  });
});
