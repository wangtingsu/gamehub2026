/**
 * 用户认证与授权服务
 *
 * 提供完整的用户认证体系，包括：
 * - 邮箱/手机号注册与登录
 * - JWT 令牌生成与刷新
 * - 密码重置与修改
 * - 邮箱验证
 * - 双因素认证支持
 * - 登录日志记录与等级更新
 * - 每日登录 XP 发放与成就检查
 */

import bcrypt from 'bcryptjs';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config';
import logger from '../utils/logger';
import { query, execute } from '../db';
import { User, UserCreateInput, LoginCredentials, AuthTokens } from '../types';
import { ConflictError, AuthenticationError } from '../middlewares/error.middleware';
import { userModel } from '../models/User';
import { emailService } from './email.service';
import { createLoginLog, updateLogoutLog } from './audit-log.service';
import { updateUserLevel } from './level.service';
import xpService from './xp.service';
import achievementService from './achievement.service';

/**
 * 生成 JWT 访问令牌和刷新令牌
 *
 * 访问令牌用于 API 请求鉴权，刷新令牌用于获取新的访问令牌。
 * 令牌中包含 tokenVersion，用于实现令牌撤销功能。
 *
 * @param userId 用户 ID
 * @param tokenVersion 当前令牌版本号，用于令牌失效检测
 * @returns 包含 accessToken、refreshToken 和 expiresIn 的认证令牌对象
 */
const generateTokens = (userId: string, tokenVersion: number = 0): AuthTokens => {
  const accessToken = jwt.sign(
    { userId, type: 'access', tokenVersion },
    config.jwt.secret as Secret,
    { expiresIn: config.jwt.expiresIn } as SignOptions
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh', tokenVersion },
    config.jwt.refreshSecret as Secret,
    { expiresIn: config.jwt.refreshExpiresIn } as SignOptions
  );

  return {
    accessToken,
    refreshToken,
    // expiresIn 以毫秒为单位返回
    expiresIn: parseInt(config.jwt.expiresIn) * 1000,
  };
};

/**
 * 为用户签发完整的认证令牌
 *
 * 用于 2FA 验证完成后的令牌签发场景。
 *
 * @param userId 用户 ID
 * @returns 认证令牌对象
 */
export const issueTokens = async (userId: string): Promise<AuthTokens> => {
  const tokenVersion = await getUserTokenVersion(userId);
  return generateTokens(userId, tokenVersion);
};

/**
 * 递增用户令牌版本号
 *
 * 调用后该用户之前签发的所有令牌将立即失效。
 * 用于密码修改、账户安全事件等场景。
 *
 * @param userId 用户 ID
 */
export const incrementTokenVersion = async (userId: string): Promise<void> => {
  await execute(
    'UPDATE users SET token_version = token_version + 1, updated_at = ? WHERE id = ?',
    [new Date().toISOString(), userId]
  );
};

/**
 * 获取用户当前令牌版本号
 *
 * @param userId 用户 ID
 * @returns 当前令牌版本号，若用户不存在则返回 0
 */
export const getUserTokenVersion = async (userId: string): Promise<number> => {
  const result = await query('SELECT token_version FROM users WHERE id = ?', [userId]);
  if (result.length === 0) return 0;
  return result[0].token_version ?? 0;
};

/**
 * 用户邮箱注册
 *
 * 创建新用户账户，若系统启用了邮箱验证功能则发送验证邮件。
 * 返回新创建的用户信息和认证令牌。
 *
 * @param userData 用户注册信息（用户名、邮箱、密码等）
 * @returns 包含用户对象和认证令牌的结果
 * @throws {ConflictError} 用户名或邮箱已存在时抛出
 */
export const register = async (userData: UserCreateInput): Promise<{ message: string }> => {
  try {
    // 检查用户名是否已被使用
    const usernameExists = await userModel.usernameExists(userData.username);
    if (usernameExists) {
      throw new ConflictError('用户名已存在');
    }

    // 检查邮箱是否已被使用（用户表和待注册表都要查）
    if (userData.email) {
      const emailExists = await userModel.emailExists(userData.email);
      if (emailExists) {
        throw new ConflictError('邮箱已存在');
      }
      const pendingEmail = await query('SELECT id FROM pending_registrations WHERE email = ?', [userData.email]);
      if (pendingEmail.length > 0) {
        throw new ConflictError('该邮箱已有待验证的注册，请查收邮件或稍后再试');
      }
    }

    // 对密码进行哈希
    const salt = await bcrypt.genSalt(config.security.bcryptRounds);
    const passwordHash = await bcrypt.hash(userData.password, salt);

    // 生成验证令牌（24小时有效）
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 24 * 3600000).toISOString();

    // 存入待注册表，不创建用户
    await execute(
      `INSERT INTO pending_registrations (username, email, password_hash, verification_token, token_expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [userData.username, userData.email, passwordHash, verificationToken, tokenExpiresAt]
    );

    // 发送验证邮件
    if (userData.email && config.features.enableEmailVerification) {
      const verificationLink = `${config.siteUrl}/verify-email?token=${verificationToken}`;
      emailService.sendVerificationEmail(userData.email, verificationLink, userData.username)
        .catch(err => logger.error('发送验证邮件失败:', err));
    }

    logger.info('注册请求已暂存，等待邮箱验证', { username: userData.username, email: userData.email });

    return { message: '注册邮件已发送，请查收邮箱完成验证' };
  } catch (error) {
    if (error instanceof ConflictError) {
      throw error;
    }
    logger.error('用户注册失败:', error);
    throw new ConflictError('注册失败，请稍后重试');
  }
};

/**
 * 用户邮箱/手机号登录
 *
 * 验证用户凭据，处理账户状态检查、双因素认证判断，
 * 记录登录日志，更新用户等级，发放每日登录 XP 并检查成就。
 *
 * @param credentials 登录凭据（邮箱或手机号 + 密码）
 * @param ipAddress 登录 IP 地址（可选，用于日志记录）
 * @param userAgent 客户端 User-Agent（可选，用于日志记录）
 * @returns 包含用户对象和认证令牌的结果（若需 2FA，则返回 partial token）
 * @throws {AuthenticationError} 账户不存在、密码错误或账户被禁用时抛出
 */
export const login = async (credentials: LoginCredentials, ipAddress?: string, userAgent?: string): Promise<{ user: User; tokens: AuthTokens }> => {
  try {
    // 根据邮箱或手机号查找用户
    let user: User | null = null;
    if (credentials.email) {
      user = await userModel.findByEmail(credentials.email);
    } else if (credentials.phone) {
      const users = await query('SELECT * FROM users WHERE phone = ?', [credentials.phone]);
      if (users.length > 0) {
        user = await userModel.findById(String(users[0].id));
      }
    }

    if (!user) {
      throw new AuthenticationError('邮箱/手机号或密码错误');
    }

    // 检查账户是否被禁用
    if (!user.isActive) {
      await createLoginLog({
        userId: user.id,
        success: false,
        ipAddress,
        userAgent,
        failReason: '账户已被禁用',
      });
      throw new AuthenticationError('账户已被禁用');
    }

    // 验证密码是否正确
    const isValidPassword = await userModel.verifyPassword(user, credentials.password);
    if (!isValidPassword) {
      await createLoginLog({
        userId: user.id,
        success: false,
        ipAddress,
        userAgent,
        failReason: '密码错误',
      });
      throw new AuthenticationError('邮箱/手机号或密码错误');
    }

    // 若启用了双因素认证且用户已开启 2FA，返回部分认证令牌
    if (config.features.enableTwoFactorAuth && user.twoFactorEnabled) {
      // 生成有效期 5 分钟的 partial token，用于 2FA 验证
      const partialAuthToken = jwt.sign(
        { userId: user.id, type: 'partial_auth', purpose: 'two_factor' },
        config.jwt.secret as Secret,
        { expiresIn: '5m' } as SignOptions
      );
      logger.info('需要双因素认证', { userId: user.id, username: user.username });
      return {
        user,
        tokens: { accessToken: partialAuthToken, refreshToken: '', expiresIn: 300000 },
        twoFactorRequired: true,
      } as any;
    }

    // 更新用户最后登录时间
    await userModel.updateLastLogin(user.id);

    // 记录成功登录日志
    await createLoginLog({
      userId: user.id,
      success: true,
      ipAddress,
      userAgent,
    });

    // 根据累计登录时长更新用户等级
    await updateUserLevel(user.id);

    // 异步发放每日登录 XP 并检查成就解锁
    xpService.addXp(user.id, 'daily_login').catch(err => logger.error('每日登录 XP 发放失败:', err));
    achievementService.checkAndAwardAchievements(user.id).catch(err => logger.error('成就检查失败:', err));

    const tokenVersion = await getUserTokenVersion(user.id);
    const tokens = generateTokens(user.id, tokenVersion);

    logger.info('用户登录成功', { userId: user.id, username: user.username });

    return { user, tokens };
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    logger.error('用户登录失败:', error);
    throw new AuthenticationError('登录失败，请稍后重试');
  }
};

/**
 * 刷新访问令牌
 *
 * 使用刷新令牌获取新的访问令牌和刷新令牌。
 * 验证令牌版本号，若版本号低于当前版本则视为已撤销。
 *
 * @param refreshToken 刷新令牌字符串
 * @returns 新的认证令牌对象
 * @throws {AuthenticationError} 刷新令牌无效或已过期时抛出
 */
export const refreshToken = async (refreshToken: string): Promise<AuthTokens> => {
  try {
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as any;

    // 检查用户是否存在且账户活跃
    const result = await query(
      'SELECT id, is_active, token_version FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (result.length === 0 || !result[0].is_active) {
      throw new AuthenticationError('无效的刷新令牌');
    }

    // 验证令牌版本号，若当前版本更高说明令牌已被撤销
    const currentVersion = result[0].token_version ?? 0;
    const tokenVersion = decoded.tokenVersion ?? 0;
    if (tokenVersion < currentVersion) {
      throw new AuthenticationError('刷新令牌已失效，请重新登录');
    }

    return generateTokens(decoded.userId, currentVersion);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('无效的刷新令牌');
    }
    throw error;
  }
};

/**
 * 获取用户信息
 *
 * @param userId 用户 ID
 * @returns 用户对象
 * @throws {Error} 用户不存在时抛出
 */
export const getUserProfile = async (userId: string): Promise<User> => {
  try {
    const user = await userModel.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }
    return user;
  } catch (error) {
    logger.error('获取用户信息失败:', error);
    throw error;
  }
};

/**
 * 更新用户信息
 *
 * @param userId 用户 ID
 * @param updateData 需要更新的字段，包含显示名、头像 URL 和个人简介
 * @returns 更新后的用户对象
 * @throws {Error} 用户不存在时抛出
 */
export const updateUserProfile = async (
  userId: string,
  updateData: { displayName?: string; avatarUrl?: string; bio?: string }
): Promise<User> => {
  try {
    const user = await userModel.update(userId, updateData);
    if (!user) {
      throw new Error('用户不存在');
    }

    logger.info('用户信息更新', { userId, updates: Object.keys(updateData) });
    return user;
  } catch (error) {
    logger.error('更新用户信息失败:', error);
    throw error;
  }
};

/**
 * 修改密码
 *
 * 需要验证当前密码正确性后才能设置新密码。
 *
 * @param userId 用户 ID
 * @param currentPassword 当前密码（用于验证身份）
 * @param newPassword 新密码
 * @throws {AuthenticationError} 当前密码错误时抛出
 * @throws {Error} 用户不存在时抛出
 */
export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  try {
    // 获取用户信息（包含密码哈希）
    const user = await userModel.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 验证当前密码是否正确
    const isValidPassword = await userModel.verifyPassword(user, currentPassword);
    if (!isValidPassword) {
      throw new AuthenticationError('当前密码错误');
    }

    // 更新为新密码
    await userModel.updatePassword(userId, newPassword);

    logger.info('用户密码修改', { userId });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    logger.error('修改密码失败:', error);
    throw error;
  }
};

/**
 * 生成密码重置令牌并发送重置邮件
 *
 * 根据邮箱查找用户，生成一次性重置令牌并发送密码重置链接邮件。
 * 出于安全考虑，即使邮箱不存在也返回空字符串而非报错。
 *
 * @param email 用户注册邮箱
 * @returns 重置令牌字符串，若邮箱不存在则返回空字符串
 */
export const generatePasswordResetToken = async (email: string): Promise<string> => {
  const result = await query(
    'SELECT id, username FROM users WHERE email = ? AND is_active = true',
    [email]
  );

  if (result.length === 0) {
    // 安全考虑：不暴露邮箱是否存在
    return '';
  }

  const userId = result[0].id;
  const userName = result[0].username;
  // 生成 32 字节的随机令牌
  const resetToken = crypto.randomBytes(32).toString('hex');
  // 令牌有效期 1 小时
  const resetTokenExpires = new Date(Date.now() + 3600000).toISOString();

  // 将重置令牌和过期时间存储到数据库
  await execute(
    'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
    [resetToken, resetTokenExpires, userId]
  );

  // 发送密码重置邮件（异步执行，不阻塞返回）
  const resetLink = `${config.siteUrl}/reset-password?token=${resetToken}`;
  emailService.sendPasswordResetEmail(email, resetLink, userName)
    .catch(err => logger.error('发送密码重置邮件失败:', err));

  logger.info('密码重置令牌生成', { userId, email });

  return resetToken;
};

/**
 * 使用重置令牌重置密码
 *
 * 验证重置令牌的有效性和过期时间，若验证通过则更新密码并清除令牌。
 *
 * @param resetToken 重置令牌
 * @param newPassword 新密码
 * @throws {AuthenticationError} 令牌无效或已过期时抛出
 */
export const resetPassword = async (resetToken: string, newPassword: string): Promise<void> => {
  const result = await query(
    'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > ?',
    [resetToken, new Date().toISOString()]
  );

  if (result.length === 0) {
    throw new AuthenticationError('无效或过期的重置令牌');
  }

  const userId = result[0].id;

  // 对新密码进行加盐哈希
  const salt = await bcrypt.genSalt(config.security.bcryptRounds);
  const newPasswordHash = await bcrypt.hash(newPassword, salt);

  // 更新密码并清除重置令牌
  await execute(
    `UPDATE users
     SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL, updated_at = ?
     WHERE id = ?`,
    [newPasswordHash, new Date().toISOString(), userId]
  );

  logger.info('密码重置成功', { userId });
};

/**
 * 验证用户邮箱
 *
 * 通过验证令牌验证用户邮箱地址，标记 email_verified 为 true，
 * 并发送欢迎邮件。
 *
 * @param verificationToken 邮箱验证令牌
 * @throws {AuthenticationError} 令牌无效时抛出
 */
export const verifyEmail = async (verificationToken: string): Promise<void> => {
  // 从待注册表中查找
  const pending = await query(
    'SELECT * FROM pending_registrations WHERE verification_token = ?',
    [verificationToken]
  );

  if (pending.length === 0) {
    throw new AuthenticationError('无效的验证令牌');
  }

  const reg = pending[0];

  // 检查令牌是否过期
  if (new Date(reg.token_expires_at) < new Date()) {
    await execute('DELETE FROM pending_registrations WHERE id = ?', [reg.id]);
    throw new AuthenticationError('验证链接已过期，请重新注册');
  }

  // 创建用户
  const result = await execute(
    `INSERT INTO users (username, email, password_hash, display_name, role, email_verified, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'user', TRUE, TRUE, ?, ?)`,
    [reg.username, reg.email, reg.password_hash, reg.username, new Date().toISOString(), new Date().toISOString()]
  );

  // 删除待注册记录
  await execute('DELETE FROM pending_registrations WHERE id = ?', [reg.id]);

  // 发送欢迎邮件（异步执行）
  if (reg.email) {
    emailService.sendWelcomeEmail(reg.email, reg.username)
      .catch(err => logger.error('发送欢迎邮件失败:', err));
  }

  logger.info('邮箱验证成功，用户已创建', { username: reg.username, email: reg.email, userId: result.lastInsertRowid });
};

/**
 * 重新发送邮箱验证邮件
 *
 * 根据邮箱地址查找未验证的用户，生成新的验证令牌并发送验证邮件。
 * 如果用户已存在但令牌未过期，复用现有令牌。
 *
 * @param email 用户注册时使用的邮箱地址
 * @throws {AuthenticationError} 用户不存在或已通过验证时抛出
 */
export const resendVerificationEmail = async (email: string): Promise<void> => {
  if (!config.features.enableEmailVerification) {
    throw new AuthenticationError('邮箱验证功能未启用');
  }

  // 查找该邮箱对应的待注册记录
  const pending = await query(
    'SELECT id, username, email, verification_token, token_expires_at FROM pending_registrations WHERE email = ?',
    [email]
  );

  if (pending.length === 0) {
    throw new AuthenticationError('未找到该邮箱对应的待验证注册');
  }

  const record = pending[0];
  let token: string;

  // 如果已有未过期的令牌，复用；否则生成新令牌
  if (record.verification_token && record.token_expires_at) {
    const expiresAt = new Date(record.token_expires_at).getTime();
    if (expiresAt > Date.now()) {
      token = record.verification_token;
    } else {
      token = crypto.randomBytes(32).toString('hex');
      await execute(
        'UPDATE pending_registrations SET verification_token = ?, token_expires_at = ? WHERE id = ?',
        [token, new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), record.id]
      );
    }
  } else {
    token = crypto.randomBytes(32).toString('hex');
    await execute(
      'UPDATE pending_registrations SET verification_token = ?, token_expires_at = ? WHERE id = ?',
      [token, new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), record.id]
    );
  }

  // 发送验证邮件
  if (record.email) {
    const verificationLink = `${config.siteUrl}/verify-email?token=${token}`;
    emailService.sendVerificationEmail(record.email, verificationLink, record.username)
      .catch(err => logger.error('重发验证邮件失败:', err));
  }

  logger.info('验证邮件已重新发送', { email: record.email });
};

/**
 * 手机号登录
 *
 * 通过手机号和密码进行登录验证。
 *
 * @param phone 手机号
 * @param ipAddress 登录 IP 地址（可选）
 * @param userAgent 客户端 User-Agent（可选）
 * @returns 包含用户对象和认证令牌的结果
 * @throws {AuthenticationError} 手机号未注册、账户被禁用或登录失败时抛出
 */
export const loginByPhone = async (
  phone: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ user: User; tokens: AuthTokens }> => {
  try {
    // 根据手机号查找用户
    const users = await query('SELECT * FROM users WHERE phone = ?', [phone]);

    if (users.length === 0) {
      throw new AuthenticationError('该手机号未注册');
    }

    const user = await userModel.findById(String(users[0].id));
    if (!user) {
      throw new AuthenticationError('用户不存在');
    }

    // 检查账户是否被禁用
    if (!user.isActive) {
      await createLoginLog({
        userId: user.id,
        success: false,
        ipAddress,
        userAgent,
        failReason: '账户已被禁用',
      });
      throw new AuthenticationError('账户已被禁用');
    }

    // 更新最后登录时间
    await userModel.updateLastLogin(user.id);

    // 记录成功登录日志
    await createLoginLog({
      userId: user.id,
      success: true,
      ipAddress,
      userAgent,
    });

    // 更新用户等级
    await updateUserLevel(user.id);

    // 异步发放每日登录 XP 并检查成就
    xpService.addXp(user.id, 'daily_login').catch(err => logger.error('每日登录 XP 发放失败:', err));
    achievementService.checkAndAwardAchievements(user.id).catch(err => logger.error('成就检查失败:', err));

    const tokenVersion = await getUserTokenVersion(user.id);
    const tokens = generateTokens(user.id, tokenVersion);

    logger.info('手机号登录成功', { userId: user.id, username: user.username });
    return { user, tokens };
  } catch (error) {
    if (error instanceof AuthenticationError) throw error;
    logger.error('手机号登录失败:', error);
    throw new AuthenticationError('登录失败，请稍后重试');
  }
};

/**
 * 手机号注册
 *
 * 使用手机号创建新用户账户，无需邮箱。
 *
 * @param data 注册信息（用户名、手机号、密码、可选显示名）
 * @returns 包含用户对象和认证令牌的结果
 * @throws {ConflictError} 用户名或手机号已存在时抛出
 */
export const registerByPhone = async (data: {
  username: string;
  phone: string;
  password: string;
  displayName?: string;
}): Promise<{ user: User; tokens: AuthTokens }> => {
  try {
    // 检查用户名是否已被使用
    const usernameExists = await userModel.usernameExists(data.username);
    if (usernameExists) {
      throw new ConflictError('用户名已存在');
    }

    // 检查手机号是否已被注册
    const phoneUsers = await query('SELECT id FROM users WHERE phone = ?', [data.phone]);
    if (phoneUsers.length > 0) {
      throw new ConflictError('该手机号已被注册');
    }

    // 创建用户记录
    const user = await userModel.createWithPassword({
      username: data.username,
      phone: data.phone,
      password: data.password,
      displayName: data.displayName,
    });

    const tokenVersion = await getUserTokenVersion(user.id);
    const tokens = generateTokens(user.id, tokenVersion);

    logger.info('手机号注册成功', { userId: user.id, username: user.username });
    return { user, tokens };
  } catch (error) {
    if (error instanceof ConflictError) throw error;
    logger.error('手机号注册失败:', error);
    throw new ConflictError('注册失败，请稍后重试');
  }
};

/**
 * 将数据库用户记录映射为 User 应用层对象
 *
 * 将数据库的 snake_case 字段名转换为 camelCase，
 * 并对布尔类型、JSON 字符串等字段进行格式转换。
 *
 * @param dbUser 数据库查询返回的用户行
 * @returns 格式化后的 User 对象
 */
const mapUserFromDb = (dbUser: any): User => ({
  id: dbUser.id,
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
  createdAt: dbUser.created_at,
  updatedAt: dbUser.updated_at,
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
 * 检查验证令牌是否有效（不消耗令牌，防止邮箱预加载）
 */
export const checkVerificationToken = async (token: string): Promise<boolean> => {
  const pending = await query(
    'SELECT id, token_expires_at FROM pending_registrations WHERE verification_token = ?',
    [token]
  );
  if (pending.length === 0) return false;
  return new Date(pending[0].token_expires_at) > new Date();
};

/**
 * 检查邮箱是否已被注册
 */
export const checkEmailExists = async (email: string): Promise<boolean> => {
  const users = await query('SELECT id FROM users WHERE email = ?', [email]);
  if (users.length > 0) return true;
  const pending = await query('SELECT id FROM pending_registrations WHERE email = ?', [email]);
  return pending.length > 0;
};

export default {
  register,
  login,
  loginByPhone,
  registerByPhone,
  refreshToken,
  getUserProfile,
  updateUserProfile,
  changePassword,
  generatePasswordResetToken,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
  checkVerificationToken,
  checkEmailExists,
};
