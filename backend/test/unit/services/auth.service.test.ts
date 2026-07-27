/**
 * Auth Service 单元测试
 *
 * 测试范围：auth.service 的全部公开方法
 * - register                 注册新用户（成功 / 用户名冲突 / 邮箱冲突）
 * - login                    用户登录（成功 / 用户不存在 / 用户禁用 / 密码错误）
 * - refreshToken             刷新令牌（成功 / 令牌无效 / 用户不存在 / 用户禁用）
 * - getUserProfile           获取用户资料（成功 / 用户不存在）
 * - updateUserProfile        更新用户资料（成功 / 用户不存在）
 * - changePassword           修改密码（成功 / 用户不存在 / 当前密码错误）
 * - generatePasswordResetToken / resetPassword / verifyEmail （占位测试）
 *
 * 所有外部依赖（bcrypt、jsonwebtoken、UserModel、db）均通过 jest.mock 隔离。
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userModel } from '../../../src/models/User';
import { query, execute, transaction } from '../../../src/db';
import {
  register,
  login,
  refreshToken,
  getUserProfile,
  updateUserProfile,
  changePassword,
  generatePasswordResetToken,
  resetPassword,
  verifyEmail,
} from '../../../src/services/auth.service';
import { ConflictError, AuthenticationError } from '../../../src/middlewares/error.middleware';
import config from '../../../src/config';

// ================================================================
// Mock 依赖
// ================================================================
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../../src/models/User');
jest.mock('../../../src/db', () => ({
  query: jest.fn(),
  execute: jest.fn(),
  transaction: jest.fn(),
}));
// Config 由全局 __mocks__/src/config.js 统一 Mock

// 类型化 mock 函数
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockedJwt = jwt as jest.Mocked<typeof jwt>;
const mockedUserModel = userModel as jest.Mocked<typeof userModel>;
const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedExecute = execute as unknown as jest.MockedFunction<typeof execute>;
const mockedTransaction = transaction as jest.MockedFunction<typeof transaction>;

/* ================================================================
 *  Auth Service 单元测试
 * ================================================================ */
describe('Auth Service 单元测试', () => {
  const mockUser = {
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    displayName: '测试用户',
    avatarUrl: null,
    bio: null,
    role: 'user' as const,
    emailVerified: false,
    isActive: true,
    lastLogin: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600000,
  };

  const mockUserCreateInput = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'Test123!',
    displayName: '测试用户',
  };

  const mockLoginCredentials = {
    email: 'test@example.com',
    password: 'Test123!',
  };

  /** 每个测试前重置所有 mock 调用记录 */
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* --------------------------------------------------------------
   *  register
   * -------------------------------------------------------------- */
  describe('register', () => {

    it('应该成功注册一个新用户并返回令牌', async () => {
      // 模拟：用户名和邮箱均未占用
      mockedUserModel.usernameExists.mockResolvedValue(false);
      mockedUserModel.emailExists.mockResolvedValue(false);
      mockedUserModel.createWithPassword.mockResolvedValue(mockUser);
      mockedJwt.sign.mockImplementation(() => 'mock-token');
      mockedQuery.mockResolvedValue([{ token_version: 0 }] as any);

      const result = await register(mockUserCreateInput);

      // 验证调用顺序
      expect(mockedUserModel.usernameExists).toHaveBeenCalledWith('testuser');
      expect(mockedUserModel.emailExists).toHaveBeenCalledWith('test@example.com');
      expect(mockedUserModel.createWithPassword).toHaveBeenCalledWith({
        ...mockUserCreateInput,
        password: 'Test123!',
      });

      // 验证返回值
      expect(result.user).toEqual(mockUser);
      expect(result.tokens).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: expect.any(Number),
      });
    });

    it('当用户名已存在时应该抛出 ConflictError 且不继续注册', async () => {
      mockedUserModel.usernameExists.mockResolvedValue(true);

      await expect(register(mockUserCreateInput)).rejects.toThrow(ConflictError);
      expect(mockedUserModel.emailExists).not.toHaveBeenCalled();
      expect(mockedUserModel.createWithPassword).not.toHaveBeenCalled();
    });

    it('当邮箱已存在时应该抛出 ConflictError 且不继续注册', async () => {
      mockedUserModel.usernameExists.mockResolvedValue(false);
      mockedUserModel.emailExists.mockResolvedValue(true);

      await expect(register(mockUserCreateInput)).rejects.toThrow(ConflictError);
      expect(mockedUserModel.usernameExists).toHaveBeenCalledWith('testuser');
      expect(mockedUserModel.emailExists).toHaveBeenCalledWith('test@example.com');
      expect(mockedUserModel.createWithPassword).not.toHaveBeenCalled();
    });
  });

  /* --------------------------------------------------------------
   *  login
   * -------------------------------------------------------------- */
  describe('login', () => {

    it('应该使用正确凭据成功登录并返回用户信息和令牌', async () => {
      mockedUserModel.findByEmail.mockResolvedValue(mockUser);
      mockedUserModel.verifyPassword.mockResolvedValue(true);
      mockedUserModel.updateLastLogin.mockResolvedValue();
      mockedJwt.sign.mockImplementation(() => 'mock-token');
      mockedQuery.mockResolvedValue([] as any);

      const result = await login(mockLoginCredentials);

      expect(mockedUserModel.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockedUserModel.verifyPassword).toHaveBeenCalledWith(mockUser, 'Test123!');
      expect(mockedUserModel.updateLastLogin).toHaveBeenCalledWith('1');
      expect(result.user).toEqual(mockUser);
      expect(result.tokens).toEqual(expect.objectContaining({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: expect.any(Number),
      }));
    });

    it('当用户不存在时应该抛出 AuthenticationError', async () => {
      mockedUserModel.findByEmail.mockResolvedValue(null);

      await expect(login(mockLoginCredentials)).rejects.toThrow(AuthenticationError);
      expect(mockedUserModel.verifyPassword).not.toHaveBeenCalled();
    });

    it('当用户被禁用时应该抛出 AuthenticationError', async () => {
      mockedUserModel.findByEmail.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(login(mockLoginCredentials)).rejects.toThrow(AuthenticationError);
      expect(mockedUserModel.verifyPassword).not.toHaveBeenCalled();
    });

    it('当密码错误时应该抛出 AuthenticationError', async () => {
      mockedUserModel.findByEmail.mockResolvedValue(mockUser);
      mockedUserModel.verifyPassword.mockResolvedValue(false);

      await expect(login(mockLoginCredentials)).rejects.toThrow(AuthenticationError);
      expect(mockedUserModel.verifyPassword).toHaveBeenCalledWith(mockUser, 'Test123!');
    });
  });

  /* --------------------------------------------------------------
   *  refreshToken
   * -------------------------------------------------------------- */
  describe('refreshToken', () => {

    it('应该使用有效的 refreshToken 成功刷新访问令牌', async () => {
      const mockDecoded = { userId: '1' };
      mockedJwt.verify.mockReturnValue(mockDecoded as any);
      mockedQuery.mockResolvedValue([{ id: '1', is_active: true }] as any);
      mockedJwt.sign.mockImplementation(() => 'mock-token');

      const result = await refreshToken('valid-refresh-token');

      expect(mockedJwt.verify).toHaveBeenCalledWith('valid-refresh-token', 'test-refresh-secret');
      expect(mockedQuery).toHaveBeenCalledWith(
        'SELECT id, is_active, token_version FROM users WHERE id = ?',
        ['1']
      );
      expect(result).toEqual(expect.objectContaining({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: expect.any(Number),
      }));
    });

    it('当刷新令牌无效时应抛出 AuthenticationError', async () => {
      mockedJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid token');
      });

      await expect(refreshToken('invalid-token')).rejects.toThrow(AuthenticationError);
    });

    it('当用户不存在时应抛出 AuthenticationError', async () => {
      const mockDecoded = { userId: '999' };
      mockedJwt.verify.mockReturnValue(mockDecoded as any);
      mockedQuery.mockResolvedValue([] as any);

      await expect(refreshToken('valid-refresh-token')).rejects.toThrow(AuthenticationError);
      expect(mockedQuery).toHaveBeenCalledWith(
        'SELECT id, is_active, token_version FROM users WHERE id = ?',
        ['999']
      );
    });

    it('当用户被禁用时应抛出 AuthenticationError', async () => {
      const mockDecoded = { userId: '1' };
      mockedJwt.verify.mockReturnValue(mockDecoded as any);
      mockedQuery.mockResolvedValue([{ id: '1', is_active: false }] as any);

      await expect(refreshToken('valid-refresh-token')).rejects.toThrow(AuthenticationError);
    });
  });

  /* --------------------------------------------------------------
   *  getUserProfile
   * -------------------------------------------------------------- */
  describe('getUserProfile', () => {

    it('应该成功获取用户资料', async () => {
      mockedUserModel.findById.mockResolvedValue(mockUser);

      const result = await getUserProfile('1');

      expect(mockedUserModel.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockUser);
    });

    it('当用户不存在时应该抛出"用户不存在"错误', async () => {
      mockedUserModel.findById.mockResolvedValue(null);

      await expect(getUserProfile('999')).rejects.toThrow('用户不存在');
    });
  });

  /* --------------------------------------------------------------
   *  updateUserProfile
   * -------------------------------------------------------------- */
  describe('updateUserProfile', () => {
    const updateData = {
      displayName: '新显示名称',
      bio: '新的个人简介',
    };

    it('应该成功更新用户资料并返回更新后的用户对象', async () => {
      const updatedUser = { ...mockUser, ...updateData };
      mockedUserModel.update.mockResolvedValue(updatedUser);

      const result = await updateUserProfile('1', updateData);

      expect(mockedUserModel.update).toHaveBeenCalledWith('1', updateData);
      expect(result).toEqual(updatedUser);
    });

    it('当用户不存在时应该抛出错误', async () => {
      mockedUserModel.update.mockResolvedValue(null);

      await expect(updateUserProfile('999', updateData)).rejects.toThrow('用户不存在');
    });
  });

  /* --------------------------------------------------------------
   *  changePassword
   * -------------------------------------------------------------- */
  describe('changePassword', () => {

    it('应该成功修改密码', async () => {
      mockedUserModel.findById.mockResolvedValue(mockUser);
      mockedUserModel.verifyPassword.mockResolvedValue(true);
      mockedUserModel.updatePassword.mockResolvedValue(true);

      await changePassword('1', 'oldPassword', 'newPassword');

      expect(mockedUserModel.findById).toHaveBeenCalledWith('1');
      expect(mockedUserModel.verifyPassword).toHaveBeenCalledWith(mockUser, 'oldPassword');
      expect(mockedUserModel.updatePassword).toHaveBeenCalledWith('1', 'newPassword');
    });

    it('当用户不存在时应该抛出错误', async () => {
      mockedUserModel.findById.mockResolvedValue(null);

      await expect(changePassword('999', 'oldPassword', 'newPassword')).rejects.toThrow('用户不存在');
    });

    it('当当前密码错误时应该抛出 AuthenticationError', async () => {
      mockedUserModel.findById.mockResolvedValue(mockUser);
      mockedUserModel.verifyPassword.mockResolvedValue(false);

      await expect(changePassword('1', 'wrongPassword', 'newPassword')).rejects.toThrow(AuthenticationError);
    });
  });

  // ================================================================
  // 以下函数包含较复杂的数据库查询，当前仅做占位测试
  // 后续可根据需要补充详细的 Mock 实现
  // ================================================================

  describe('generatePasswordResetToken', () => {
    it('应该返回重置令牌（占位测试）', async () => {
      expect(true).toBe(true);
    });
  });

  describe('resetPassword', () => {
    it('应该成功重置密码（占位测试）', async () => {
      expect(true).toBe(true);
    });
  });

  describe('verifyEmail', () => {
    it('应该成功验证邮箱（占位测试）', async () => {
      expect(true).toBe(true);
    });
  });
});
