/**
 * 认证服务模块
 *
 * 封装所有与用户认证相关的 API 接口调用，包括：
 * - 邮箱/密码登录注册
 * - 手机号登录注册（含短信验证码）
 * - OAuth 第三方登录
 * - 双因素认证（2FA）
 * - 当前用户信息获取
 *
 * @module api/authService
 */

import apiClient from './client';
import type { AuthResponseData, LoginByPhoneRequest, RegisterByPhoneRequest, SendSmsCodeRequest, User } from './types';

/**
 * 认证服务对象
 * 提供统一的用户认证相关 API 调用方法
 */
export const authService = {
  /**
   * 邮箱密码登录
   *
   * @param data - 登录参数（邮箱和密码）
   * @returns 用户信息和认证令牌
   */
  login: (data: { email: string; password: string }) =>
    apiClient.post<AuthResponseData>('/auth/login', data),

  /**
   * 邮箱注册
   *
   * @param data - 注册参数（用户名、邮箱、密码、可选显示名）
   * @returns 用户信息和认证令牌
   */
  register: (data: { username: string; email: string; password: string; displayName?: string }) =>
    apiClient.post<AuthResponseData>('/auth/register', data),

  /**
   * 手机号登录
   *
   * @param data - 手机登录参数（手机号和验证码）
   * @returns 用户信息和认证令牌
   */
  loginByPhone: (data: LoginByPhoneRequest) =>
    apiClient.post<AuthResponseData>('/auth/login/phone', data),

  /**
   * 手机号注册
   *
   * @param data - 手机注册参数
   * @returns 用户信息和认证令牌
   */
  registerByPhone: (data: RegisterByPhoneRequest) =>
    apiClient.post<AuthResponseData>('/auth/register/phone', data),

  /**
   * 发送短信验证码
   *
   * @param data - 发送参数（手机号和验证码类型）
   */
  sendSmsCode: (data: SendSmsCodeRequest) =>
    apiClient.post<void>('/auth/sms/send-code', data),

  /**
   * 获取当前登录用户信息
   *
   * @returns 当前用户对象
   */
  getCurrentUser: () =>
    apiClient.get<{ user: User }>('/auth/me').then(res => res.user),

  /**
   * 获取支持的 OAuth 第三方登录提供商列表
   *
   * @returns 第三方登录提供商列表
   */
  getOAuthProviders: () =>
    apiClient.get<{ providers: { provider: string; name: string; enabled: boolean; icon?: string }[] }>('/auth/oauth/providers'),

  /**
   * 获取指定 OAuth 提供商的授权 URL
   *
   * @param provider - 提供商名称（如 google、github）
   * @returns OAuth 授权跳转 URL
   */
  getOAuthUrl: (provider: string) =>
    apiClient.get<string>(`/auth/oauth/url/${provider}`),

  /**
   * 用户登出
   *
   * 通知后端递增令牌版本号，使当前签发的所有令牌失效，
   * 并记录登出日志和登录时长。
   */
  logout: () =>
    apiClient.post<void>('/auth/logout'),

  // ==================== 双因素认证（2FA）方法 ====================

  /**
   * 获取当前用户的双因素认证状态
   *
   * @returns 2FA 启用状态和最后使用时间
   */
  getTwoFactorStatus: () =>
    apiClient.get<{ enabled: boolean; lastUsed: string | null }>('/auth/two-factor/status'),

  /**
   * 初始化双因素认证设置
   *
   * @returns 包含密钥、OAuth URI 和备用恢复码的设置信息
   */
  setupTwoFactor: () =>
    apiClient.post<{ secret: string; otpauthUri: string; backupCodes: string[] }>('/auth/two-factor/setup'),

  /**
   * 启用双因素认证（验证一次性验证码后启用）
   *
   * @param code - 验证器应用生成的一次性验证码
   * @returns 启用成功后的备用恢复码
   */
  enableTwoFactor: (code: string) =>
    apiClient.post<{ backupCodes: string[] }>('/auth/two-factor/enable', { code }),

  /**
   * 禁用双因素认证
   */
  disableTwoFactor: () =>
    apiClient.post<void>('/auth/two-factor/disable'),

  /**
   * 验证双因素认证（登录流程中的第二步验证）
   *
   * @param partialAuthToken - 第一步认证成功后获得的临时令牌
   * @param code - 验证器应用生成的一次性验证码
   * @returns 完成认证后的用户信息和完整令牌
   */
  verifyTwoFactor: (partialAuthToken: string, code: string) =>
    apiClient.post<{ user: any; tokens: { accessToken: string; refreshToken: string } }>('/auth/two-factor/verify', { partialAuthToken, code }),
};
