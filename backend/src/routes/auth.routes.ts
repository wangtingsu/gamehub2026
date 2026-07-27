/**
 * ============================================================
 * 认证与授权路由模块
 * ============================================================
 *
 * 本模块提供用户认证相关的全部 API 接口，涵盖以下功能：
 *   - 用户注册（邮箱/手机号两种方式）
 *   - 用户登录（邮箱/手机号验证码两种方式）
 *   - 令牌刷新（Access Token / Refresh Token）
 *   - 用户登出
 *   - 当前用户信息获取与更新
 *   - 密码修改、忘记密码、重置密码
 *   - 邮箱验证
 *   - 双因素认证（2FA）的完整流程（设置、启用、禁用、验证、状态查询）
 *   - 服务健康检查
 *
 * 所有敏感接口均应用速率限制保护，防止暴力攻击。
 * 需要用户认证的接口使用 authenticate 中间件；
 * 需要特定角色的接口额外使用 authorize 中间件。
 *
 * 路由前缀: /api/v1/auth
 *
 * @module authRoutes
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import authService, { incrementTokenVersion, issueTokens } from '../services/auth.service';
import { smsService } from '../services/sms.service';
import { twoFactorService } from '../services/two-factor.service';
import { asyncHandler } from '../middlewares/error.middleware';
import { authenticate, validateRefreshToken, validateRequest, rateLimit } from '../middlewares/auth.middleware';
import { registerSchema, loginSchema, loginByPhoneSchema, registerByPhoneSchema, changePasswordSchema } from '../validators';
import { updateLogoutLog } from '../services/audit-log.service';
import { userModel } from '../models/User';
import config from '../config';

const router = Router();

/**
 * 整个路由模块应用速率限制中间件。
 * 限制：每 15 分钟窗口内最多 20 次请求，保护登录/注册等敏感接口。
 * @see rateLimit
 */
router.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));

/**
 * @route POST /api/v1/auth/register
 * @desc 用户注册（邮箱方式）
 * @access Public
 *
 * 使用 validateRequest(registerSchema) 中间件验证请求体格式。
 * 调用 authService.register() 创建新用户并签发令牌。
 *
 * @body {object} 符合 registerSchema 验证规则的注册数据
 *   @property {string} username - 用户名
 *   @property {string} email - 邮箱地址
 *   @property {string} password - 密码
 *   @property {string} [displayName] - 显示名称（可选）
 *
 * @response 201 - 注册成功
 *   @body {object} data.user - 用户基本信息（不包含敏感字段）
 *   @body {object} data.tokens - 访问令牌和刷新令牌
 * @response 400 - 请求参数验证失败（由 validateRequest 中间件处理）
 * @response 409 - 用户名或邮箱已被占用
 */
router.post(
  '/register',
  validateRequest(registerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { user, tokens } = await authService.register(req.body);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          role: user.role,
        },
        tokens,
      },
      message: '注册成功',
    });
  })
);

/**
 * @route POST /api/v1/auth/login
 * @desc 用户登录（邮箱方式）
 * @access Public
 *
 * 使用 validateRequest(loginSchema) 中间件验证请求体格式。
 * 记录客户端 IP 和 User-Agent 用于审计日志。
 *
 * @body {object} 符合 loginSchema 验证规则的登录数据
 *   @property {string} email - 邮箱地址
 *   @property {string} password - 密码
 *
 * @response 200 - 登录成功
 *   @body {object} data.user - 用户基本信息
 *   @body {object} data.tokens - 访问令牌和刷新令牌
 * @response 400 - 请求参数验证失败
 * @response 401 - 邮箱或密码错误
 */
router.post(
  '/login',
  validateRequest(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { user, tokens } = await authService.login(
      req.body,
      req.ip,
      req.headers['user-agent']
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          role: user.role,
        },
        tokens,
      },
      message: '登录成功',
    });
  })
);

/**
 * @route POST /api/v1/auth/login/phone
 * @desc 手机号验证码登录
 * @access Public
 *
 * 使用 validateRequest(loginByPhoneSchema) 中间件验证请求体格式。
 * 先通过 smsService 验证短信验证码，验证通过后再进行登录操作。
 *
 * @body {object} 符合 loginByPhoneSchema 验证规则的登录数据
 *   @property {string} phone - 手机号码
 *   @property {string} code - 短信验证码
 *
 * @response 200 - 登录成功
 *   @body {object} data.user - 用户基本信息（含手机号）
 *   @body {object} data.tokens - 访问令牌和刷新令牌
 * @response 400 - 参数验证失败或短信验证码错误
 */
router.post(
  '/login/phone',
  validateRequest(loginByPhoneSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { phone, code } = req.body;

    // 验证短信验证码
    const verifyResult = await smsService.verifyCode(phone, code, 'login');
    if (!verifyResult.success) {
      return res.status(400).json({
        success: false,
        error: verifyResult.message,
      });
    }

    const { user, tokens } = await authService.loginByPhone(
      phone,
      req.ip,
      req.headers['user-agent']
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          role: user.role,
          phone: user.phone,
        },
        tokens,
      },
      message: '登录成功',
    });
  })
);

/**
 * @route POST /api/v1/auth/register/phone
 * @desc 手机号注册
 * @access Public
 *
 * 使用 validateRequest(registerByPhoneSchema) 中间件验证请求体格式。
 * 先验证短信验证码，注册成功后将手机号标记为已验证。
 *
 * @body {object} 符合 registerByPhoneSchema 验证规则的注册数据
 *   @property {string} username - 用户名
 *   @property {string} phone - 手机号码
 *   @property {string} code - 短信验证码
 *   @property {string} password - 密码
 *   @property {string} [displayName] - 显示名称（可选）
 *
 * @response 201 - 注册成功
 *   @body {object} data.user - 用户基本信息（含手机号）
 *   @body {object} data.tokens - 访问令牌和刷新令牌
 * @response 400 - 参数验证失败或短信验证码错误
 */
router.post(
  '/register/phone',
  validateRequest(registerByPhoneSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { username, phone, code, password, displayName } = req.body;

    // 验证短信验证码
    const verifyResult = await smsService.verifyCode(phone, code, 'register');
    if (!verifyResult.success) {
      return res.status(400).json({
        success: false,
        error: verifyResult.message,
      });
    }

    const { user, tokens } = await authService.registerByPhone({
      username,
      phone,
      password,
      displayName,
    });

    // 标记手机已验证
    await smsService.markPhoneVerified(phone);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          phone: user.phone,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          role: user.role,
        },
        tokens,
      },
      message: '注册成功',
    });
  })
);

/**
 * @route POST /api/v1/auth/refresh
 * @desc 刷新访问令牌
 * @access Public
 *
 * 使用 validateRefreshToken 中间件验证刷新令牌的有效性。
 * 调用 authService.refreshToken() 签发新的令牌对。
 *
 * @body {object}
 *   @property {string} refreshToken - 有效的刷新令牌
 *
 * @response 200 - 令牌刷新成功
 *   @body {object} data - 新的访问令牌和刷新令牌
 * @response 401 - 刷新令牌无效或已过期（由 validateRefreshToken 中间件处理）
 */
router.post(
  '/refresh',
  validateRefreshToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const tokens = await authService.refreshToken(refreshToken);

    res.json({
      success: true,
      data: tokens,
      message: '令牌刷新成功',
    });
  })
);

/**
 * @route POST /api/v1/auth/logout
 * @desc 用户登出
 * @access Private - 需要有效访问令牌
 *
 * 使用 authenticate 中间件验证用户身份。
 * 记录登出日志并递增令牌版本号，使该用户所有已签发的令牌立即失效。
 *
 * @headers Authorization: Bearer <access_token>
 *
 * @response 200 - 登出成功
 * @response 401 - 未提供或提供了无效的访问令牌
 */
router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    // 记录登出日志，更新登录时长
    if (req.user) {
      await updateLogoutLog(req.user.id);
      // 递增令牌版本，使所有已签发令牌立即失效（实现令牌撤销）
      await incrementTokenVersion(req.user.id);
    }

    res.json({
      success: true,
      message: '登出成功',
    });
  })
);

/**
 * @route GET /api/v1/auth/me
 * @desc 获取当前登录用户的个人信息
 * @access Private - 需要有效访问令牌
 *
 * @headers Authorization: Bearer <access_token>
 *
 * @response 200 - 成功返回用户信息
 *   @body {object} data.user - 完整的用户资料
 * @response 401 - 未认证
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.getUserProfile(req.user.id);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          role: user.role,
          emailVerified: user.emailVerified,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
        },
      },
    });
  })
);

/**
 * @route PUT /api/v1/auth/me
 * @desc 更新当前登录用户的个人信息
 * @access Private - 需要有效访问令牌
 *
 * @headers Authorization: Bearer <access_token>
 *
 * @body {object} 需要更新的用户字段
 *   @property {string} [displayName] - 显示名称
 *   @property {string} [avatarUrl] - 头像 URL
 *   @property {string} [bio] - 个人简介
 *
 * @response 200 - 用户信息更新成功
 * @response 401 - 未认证
 */
router.put(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.updateUserProfile(req.user.id, req.body);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          role: user.role,
        },
      },
      message: '用户信息更新成功',
    });
  })
);

/**
 * @route POST /api/v1/auth/change-password
 * @desc 修改密码
 * @access Private - 需要有效访问令牌
 *
 * 使用 validateRequest(changePasswordSchema) 中间件验证请求体格式。
 * 需要提供当前密码以验证身份，然后设置新密码。
 *
 * @headers Authorization: Bearer <access_token>
 * @body {object} 符合 changePasswordSchema 验证规则的密码数据
 *   @property {string} currentPassword - 当前密码
 *   @property {string} newPassword - 新密码
 *
 * @response 200 - 密码修改成功
 * @response 400 - 参数验证失败或当前密码错误
 * @response 401 - 未认证
 */
router.post(
  '/change-password',
  authenticate,
  validateRequest(changePasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;

    await authService.changePassword(
      req.user.id,
      currentPassword,
      newPassword
    );

    res.json({
      success: true,
      message: '密码修改成功',
    });
  })
);

/**
 * @route POST /api/v1/auth/forgot-password
 * @desc 忘记密码 —— 发送密码重置邮件
 * @access Public
 *
 * 根据提供的邮箱地址生成密码重置令牌。
 * 出于安全考虑，即使邮箱不存在也返回成功消息，防止用户枚举攻击。
 * 开发环境下在响应中返回 resetToken 以便调试。
 *
 * @body {object}
 *   @property {string} email - 注册时使用的邮箱地址
 *
 * @response 200 - 请求已受理（无论邮箱是否存在均返回成功）
 *   @body {object} [data.resetToken] - 开发环境下返回的重置令牌
 * @response 400 - 邮箱参数缺失
 */
router.post(
  '/forgot-password',
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: '邮箱不能为空',
      });
    }

    // 生成重置令牌（简化处理，实际应该发送邮件）
    const resetToken = await authService.generatePasswordResetToken(email);

    // 出于安全考虑，即使邮箱不存在也返回成功
    return res.json({
      success: true,
      message: '如果邮箱存在，重置链接已发送',
      // 开发环境返回令牌用于测试
      ...(process.env.NODE_ENV === 'development' && resetToken && {
        data: { resetToken },
      }),
    });
  })
);

/**
 * @route POST /api/v1/auth/reset-password
 * @desc 重置密码
 * @access Public
 *
 * 使用重置令牌验证身份并设置新密码。
 * 重置令牌通常通过邮件中的链接传递给用户。
 *
 * @body {object}
 *   @property {string} resetToken - 从忘记密码接口获取的重置令牌
 *   @property {string} newPassword - 新密码
 *
 * @response 200 - 密码重置成功
 * @response 400 - 重置令牌或新密码为空
 * @response 401 - 重置令牌无效或已过期
 */
router.post(
  '/reset-password',
  asyncHandler(async (req: Request, res: Response) => {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        error: '重置令牌和新密码不能为空',
      });
    }

    await authService.resetPassword(resetToken, newPassword);

    return res.json({
      success: true,
      message: '密码重置成功',
    });
  })
);

/**
 * @route GET /api/v1/auth/verify-email/:token
 * @desc 验证邮箱地址
 * @access Public
 *
 * 使用邮件中的验证令牌来确认用户邮箱的有效性。
 * 令牌通常包含在注册后发送的验证邮件链接中。
 *
 * @param {string} token - 路径参数，邮箱验证令牌
 *
 * @response 200 - 邮箱验证成功
 * @response 400 - 令牌参数为空
 * @response 401 - 令牌无效或已过期
 */
router.get(
  '/verify-email/:token',
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: '验证令牌不能为空',
      });
    }

    await authService.verifyEmail(token);

    return res.json({
      success: true,
      message: '邮箱验证成功',
    });
  })
);

/**
 * @route POST /api/v1/auth/two-factor/verify
 * @desc 完成双因素认证（2FA）验证
 * @access Public - 带部分认证令牌
 *
 * 在常规登录后，如果用户启用了 2FA，需要调用此接口完成第二因素验证。
 * 使用部分认证令牌（partial_auth）来标识用户身份。
 * 支持两种验证方式：
 *   1. TOTP（基于时间的一次性密码）
 *   2. 备份码（当 TOTP 不可用时）
 *
 * @body {object}
 *   @property {string} partialAuthToken - 部分认证令牌（登录时签发）
 *   @property {string} code - TOTP 验证码或备份码
 *
 * @response 200 - 双因素认证通过
 *   @body {object} data.user - 用户信息
 *   @body {object} data.tokens - 完整访问令牌和刷新令牌
 * @response 400 - 参数缺失
 * @response 401 - 令牌无效、验证码错误或 2FA 未启用
 */
router.post(
  '/two-factor/verify',
  asyncHandler(async (req: Request, res: Response) => {
    const { partialAuthToken, code } = req.body;

    if (!partialAuthToken || !code) {
      return res.status(400).json({
        success: false,
        error: 'partialAuthToken 和 code 不能为空',
      });
    }

    try {
      // 解码并验证部分认证令牌
      const decoded = jwt.verify(partialAuthToken, config.jwt.secret) as any;

      if (decoded.type !== 'partial_auth' || decoded.purpose !== 'two_factor') {
        return res.status(401).json({
          success: false,
          error: '无效的部分认证令牌',
        });
      }

      const user = await userModel.findById(decoded.userId);
      if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        return res.status(401).json({
          success: false,
          error: '双因素认证未启用或配置不完整',
        });
      }

      // 先尝试 TOTP 验证
      const isValidTotp = twoFactorService.verifyTOTP(code, user.twoFactorSecret);
      if (isValidTotp) {
        await userModel.updateTwoFactorLastUsed(decoded.userId);

        const tokens = await issueTokens(user.id);

        return res.json({
          success: true,
          data: { user, tokens },
          message: '双因素认证通过',
        });
      }

      // 如果 TOTP 验证失败，尝试备份码
      if (user.twoFactorBackupCodes && user.twoFactorBackupCodes.length > 0) {
        const isValidBackup = twoFactorService.verifyBackupCode(code, user.twoFactorBackupCodes);
        if (isValidBackup) {
          // 移除已使用的备份码
          const remainingCodes = twoFactorService.removeUsedBackupCode(code, user.twoFactorBackupCodes);
          await userModel.updateTwoFactor(decoded.userId, true, user.twoFactorSecret, remainingCodes);
          await userModel.updateTwoFactorLastUsed(decoded.userId);

          const tokens = await issueTokens(user.id);

          return res.json({
            success: true,
            data: { user, tokens },
            message: '双因素认证通过（备份码）',
          });
        }
      }

      return res.status(401).json({
        success: false,
        error: '验证码无效',
      });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({
          success: false,
          error: '部分认证令牌已过期或无效',
        });
      }
      throw error;
    }
  })
);

/**
 * @route POST /api/v1/auth/two-factor/setup
 * @desc 获取双因素认证设置信息
 * @access Private - 需要有效访问令牌
 *
 * 生成新的 2FA 密钥和 OTP Auth URI（用于生成二维码），
 * 同时生成一组备份码。密钥会被临时存储，待用户验证后正式启用。
 *
 * @headers Authorization: Bearer <access_token>
 *
 * @response 200 - 设置信息已生成
 *   @body {string} data.secret - 2FA 密钥
 *   @body {string} data.otpauthUri - OTP Auth URI（用于生成二维码）
 *   @body {string[]} data.backupCodes - 备份码列表
 * @response 400 - 双因素认证已启用，不能重复设置
 * @response 401 - 未认证
 * @response 404 - 用户不存在
 */
router.post(
  '/two-factor/setup',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await userModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({ success: false, error: '双因素认证已经启用' });
    }

    // 生成新的密钥
    const secret = twoFactorService.generateSecret();
    const otpauthUri = twoFactorService.generateOTPAuthURI(secret, user.email || user.username);

    // 临时存储密钥（待用户验证后正式启用）
    await userModel.updateTwoFactor(req.user.id, false, secret);

    const backupCodes = twoFactorService.generateBackupCodes(8);

    res.json({
      success: true,
      data: {
        secret,
        otpauthUri,
        backupCodes,
      },
      message: '双因素认证设置信息已生成',
    });
  })
);

/**
 * @route POST /api/v1/auth/two-factor/enable
 * @desc 启用双因素认证
 * @access Private - 需要有效访问令牌
 *
 * 用户在完成 setup 后，使用 Authenticator 应用生成一个验证码，
 * 调用此接口验证后正式启用 2FA。
 *
 * @headers Authorization: Bearer <access_token>
 * @body {object}
 *   @property {string} code - 从 Authenticator 应用获取的 TOTP 验证码
 *
 * @response 200 - 双因素认证已启用
 *   @body {string[]} data.backupCodes - 生成的备份码列表
 * @response 400 - 验证码无效或尚未完成设置、或已启用
 * @response 401 - 未认证
 */
router.post(
  '/two-factor/enable',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: '验证码不能为空' });
    }

    const user = await userModel.findById(req.user.id);
    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ success: false, error: '请先完成双因素认证设置' });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({ success: false, error: '双因素认证已经启用' });
    }

    const isValid = twoFactorService.verifyTOTP(code, user.twoFactorSecret);
    if (!isValid) {
      return res.status(400).json({ success: false, error: '验证码无效' });
    }

    const backupCodes = twoFactorService.generateBackupCodes(8);
    await userModel.updateTwoFactor(req.user.id, true, user.twoFactorSecret, backupCodes);

    res.json({
      success: true,
      data: { backupCodes },
      message: '双因素认证已启用',
    });
  })
);

/**
 * @route POST /api/v1/auth/two-factor/disable
 * @desc 禁用双因素认证
 * @access Private - 需要有效访问令牌
 *
 * 移除用户的 2FA 相关设置，包括密钥和备份码。
 *
 * @headers Authorization: Bearer <access_token>
 *
 * @response 200 - 双因素认证已禁用
 * @response 400 - 双因素认证未启用，无法禁用
 * @response 401 - 未认证
 */
router.post(
  '/two-factor/disable',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await userModel.findById(req.user.id);
    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ success: false, error: '双因素认证未启用' });
    }

    await userModel.updateTwoFactor(req.user.id, false);

    res.json({
      success: true,
      message: '双因素认证已禁用',
    });
  })
);

/**
 * @route GET /api/v1/auth/two-factor/status
 * @desc 获取当前用户的双因素认证状态
 * @access Private - 需要有效访问令牌
 *
 * @headers Authorization: Bearer <access_token>
 *
 * @response 200 - 成功返回 2FA 状态
 *   @body {boolean} data.enabled - 是否已启用
 *   @body {string|null} data.lastUsed - 最后使用时间
 * @response 401 - 未认证
 * @response 404 - 用户不存在
 */
router.get(
  '/two-factor/status',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await userModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    res.json({
      success: true,
      data: {
        enabled: user.twoFactorEnabled,
        lastUsed: user.twoFactorLastUsed || null,
      },
    });
  })
);

/**
 * @route GET /api/v1/auth/health
 * @desc 认证服务健康检查
 * @access Public
 *
 * 用于监控和负载均衡器检查认证服务的运行状态。
 *
 * @response 200 - 服务正常运行
 *   @body {string} data.service - 服务名称（auth）
 *   @body {string} data.status - 服务状态（healthy）
 *   @body {string} data.timestamp - 当前时间戳
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      service: 'auth',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
