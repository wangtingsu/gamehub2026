/**
 * 短信服务路由模块
 *
 * 本模块提供短信验证码相关的 REST API，包括：
 * - 发送短信验证码（支持登录、注册、绑定、解绑等场景）
 * - 验证短信验证码
 *
 * 所有短信接口均受速率限制保护，每个 IP 每分钟最多 10 次请求
 *
 * @module routes/sms
 */

import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { smsService } from '../services/sms.service';
import { asyncHandler } from '../middlewares/error.middleware';
import { authenticate, rateLimit } from '../middlewares/auth.middleware';

const router = Router();

/**
 * 短信接口速率限制中间件
 * 限制每个 IP 在 60 秒窗口内最多发送 10 次请求，防止短信轰炸
 */
const smsRateLimit = rateLimit({ windowMs: 60 * 1000, max: 10 });

/**
 * 发送验证码请求参数验证规则（Joi Schema）
 *
 * @field phone - 手机号码，必填
 *   - 格式：以 1 开头，第二位 3-9，后跟 9 位数字（中国大陆手机号）
 *   - 错误提示："请输入有效的手机号码"
 * @field type - 验证码类型，可选
 *   - 取值范围：'login'（登录）、'register'（注册）、'bind'（绑定）、'unbind'（解绑）
 *   - 默认值：'login'
 */
const sendCodeSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^1[3-9]\d{9}$/)
    .required()
    .messages({
      'string.pattern.base': '请输入有效的手机号码',
      'string.empty': '手机号码不能为空',
    }),
  type: Joi.string()
    .valid('login', 'register', 'bind', 'unbind')
    .default('login'),
});

/**
 * 验证验证码请求参数验证规则（Joi Schema）
 *
 * @field phone - 手机号码，必填
 *   - 格式规则同发送验证码
 * @field code - 验证码，必填
 *   - 长度：6 位数字
 *   - 错误提示："验证码为6位数字"
 * @field type - 验证码类型，可选
 *   - 取值范围和默认值同发送验证码
 */
const verifyCodeSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^1[3-9]\d{9}$/)
    .required()
    .messages({
      'string.pattern.base': '请输入有效的手机号码',
      'string.empty': '手机号码不能为空',
    }),
  code: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.length': '验证码为6位数字',
      'string.pattern.base': '验证码为6位数字',
      'string.empty': '验证码不能为空',
    }),
  type: Joi.string()
    .valid('login', 'register', 'bind', 'unbind')
    .default('login'),
});

/**
 * @route POST /api/v1/auth/sms/send-code
 * @desc 发送短信验证码
 * @access Public
 *
 * @middleware smsRateLimit - 速率限制（每 IP 每分钟最多 10 次）
 *
 * @param req.body.phone - 手机号码（中国大陆手机号格式）
 * @param req.body.type - 验证码类型（login/register/bind/unbind），默认为 login
 *
 * @returns 200 - 验证码发送成功
 * @returns 400 - 参数验证失败或发送失败（如手机号格式错误、频率限制等）
 *
 * 验证码发送流程：
 * 1. 使用 Joi Schema 验证输入参数
 * 2. 调用 smsService.sendVerificationCode 发送验证码
 * 3. 发送失败时返回相应错误信息
 */
router.post(
  '/sms/send-code',
  smsRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = sendCodeSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return res.status(400).json({
        success: false,
        error: '输入验证失败',
        details,
      });
    }

    const result = await smsService.sendVerificationCode(value.phone, value.type);

    if (result.success) {
      return res.json({
        success: true,
        message: result.message,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.message,
      });
    }
  })
);

/**
 * @route POST /api/v1/auth/sms/verify-code
 * @desc 验证短信验证码
 * @access Public
 *
 * @param req.body.phone - 手机号码
 * @param req.body.code - 6 位数字验证码
 * @param req.body.type - 验证码类型（login/register/bind/unbind），默认为 login
 *
 * @returns 200 - 验证码验证成功
 * @returns 400 - 参数验证失败或验证失败（如验证码错误、过期等）
 *
 * 验证流程：
 * 1. 使用 Joi Schema 验证输入参数
 * 2. 调用 smsService.verifyCode 验证验证码
 * 3. 验证失败时返回相应错误信息
 */
router.post(
  '/sms/verify-code',
  asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = verifyCodeSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return res.status(400).json({
        success: false,
        error: '输入验证失败',
        details,
      });
    }

    const result = await smsService.verifyCode(value.phone, value.code, value.type);

    if (result.success) {
      return res.json({
        success: true,
        message: result.message,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.message,
      });
    }
  })
);

export default router;
