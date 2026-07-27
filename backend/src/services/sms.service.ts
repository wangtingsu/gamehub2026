/**
 * 短信验证码服务
 *
 * 提供手机验证码的发送与验证功能，支持多种短信提供商（阿里云、Twilio、
 * 腾讯云），内置频率限制和尝试次数保护。采用策略模式根据配置切换不同
 * 的短信发送渠道，开发环境下支持 Mock 模式便于本地测试。
 *
 * @module sms.service
 */

import crypto from 'crypto';
import config from '../config';
import logger from '../utils/logger';
import { query, execute } from '../db';
import { BadRequestError, TooManyRequestsError } from '../middlewares/error.middleware';

/**
 * 腾讯云 SMS SDK 实例（延迟加载，避免启动时因未安装而报错）
 */
let tencentcloudSdk: any = null;

/**
 * 获取腾讯云 SDK 实例
 *
 * 延迟加载 tencentcloud-sdk-nodejs，仅在首次使用时尝试加载。
 * 如果未安装则返回 null 并记录警告日志。
 *
 * @returns 腾讯云 SDK 对象，未安装时返回 null
 */
function getTencentSdkInstance() {
  if (!tencentcloudSdk) {
    try {
      tencentcloudSdk = require('tencentcloud-sdk-nodejs');
    } catch {
      logger.warn('tencentcloud-sdk-nodejs 未安装，腾讯云短信将不可用');
      return null;
    }
  }
  return tencentcloudSdk;
}

/**
 * 短信发送结果
 *
 * @property success - 是否发送成功
 * @property message - 结果描述信息
 * @property requestId - 短信服务商的请求 ID（用于追踪）
 */
export interface SmsSendResult {
  success: boolean;
  message?: string;
  requestId?: string;
}

/**
 * 短信验证结果
 *
 * @property success - 是否验证成功
 * @property message - 验证结果描述信息
 */
export interface SmsVerifyResult {
  success: boolean;
  message?: string;
}

/**
 * 短信服务类
 *
 * 封装验证码生成、发送、验证的完整生命周期管理。
 * 支持频率限制、尝试次数限制、多短信提供商切换等功能。
 */
class SmsService {
  /**
   * 发送验证码到手机
   *
   * 检查频率限制（同一手机号 60 秒内只能发一次），生成并存储验证码，
   * 然后通过配置的短信提供商发送。支持四种场景：登录、注册、绑定、解绑。
   *
   * @param phone - 目标手机号
   * @param type - 验证码用途类型：login（登录）、register（注册）、bind（绑定）、unbind（解绑）
   * @returns 发送结果，包含成功状态和描述信息
   * @throws TooManyRequestsError - 发送过于频繁时抛出
   */
  async sendVerificationCode(phone: string, type: 'login' | 'register' | 'bind' | 'unbind' = 'login'): Promise<SmsSendResult> {
    try {
      // 检查频率限制：同一手机号60秒内只能发一次
      const recentCode = await query(
        'SELECT id, created_at FROM sms_codes WHERE phone = ? AND type = ? AND verified_at IS NULL AND expires_at > ? ORDER BY created_at DESC LIMIT 1',
        [phone, type, new Date().toISOString()]
      );

      if (recentCode.length > 0) {
        const lastSent = new Date(recentCode[0].created_at).getTime();
        const elapsed = (Date.now() - lastSent) / 1000;
        if (elapsed < config.sms.resendInterval) {
          const waitSeconds = Math.ceil(config.sms.resendInterval - elapsed);
          throw new TooManyRequestsError(`请 ${waitSeconds} 秒后再试`);
        }
      }

      // 生成验证码
      const code = this.generateCode();
      const expiresAt = new Date(Date.now() + config.sms.codeExpiresIn * 1000).toISOString();

      // 存储验证码
      await execute(
        'INSERT INTO sms_codes (phone, code, type, expires_at) VALUES (?, ?, ?, ?)',
        [phone, code, type, expiresAt]
      );

      // 发送验证码
      await this.sendSms(phone, code);

      logger.info('短信验证码发送成功', { phone, type });
      return { success: true, message: '验证码已发送' };
    } catch (error: any) {
      if (error?.statusCode === 429) throw error;
      logger.error('发送短信验证码失败:', error);
      return { success: false, message: '发送验证码失败，请稍后重试' };
    }
  }

  /**
   * 验证手机验证码
   *
   * 查找未使用且未过期的验证码进行匹配。验证失败时增加尝试计数，
   * 超过 5 次尝试后验证码自动失效。验证通过后将验证码标记为已使用。
   *
   * @param phone - 手机号
   * @param code - 用户输入的验证码
   * @param type - 验证码用途类型，需与发送时一致
   * @returns 验证结果，包含成功状态和描述信息
   * @throws BadRequestError - 验证码错误、过期或已失效时抛出
   */
  async verifyCode(phone: string, code: string, type: 'login' | 'register' | 'bind' | 'unbind' = 'login'): Promise<SmsVerifyResult> {
    try {
      // 查找未使用的、未过期的验证码
      const result = await query(
        'SELECT id, attempt_count FROM sms_codes WHERE phone = ? AND code = ? AND type = ? AND verified_at IS NULL AND expires_at > ? ORDER BY created_at DESC LIMIT 1',
        [phone, code, type, new Date().toISOString()]
      );

      if (result.length === 0) {
        // 检查是否有过期或已使用的验证码记录（用于尝试计数）
        const attempts = await query(
          'SELECT id, attempt_count FROM sms_codes WHERE phone = ? AND type = ? AND verified_at IS NULL ORDER BY created_at DESC LIMIT 1',
          [phone, type]
        );

        if (attempts.length > 0 && attempts[0].attempt_count >= 5) {
          throw new BadRequestError('验证码已失效，请重新获取');
        }

        // 增加尝试次数
        if (attempts.length > 0) {
          await execute(
            'UPDATE sms_codes SET attempt_count = attempt_count + 1 WHERE id = ?',
            [attempts[0].id]
          );
        }

        throw new BadRequestError('验证码错误或已过期');
      }

      // 验证通过，标记为已使用
      await execute(
        'UPDATE sms_codes SET verified_at = ? WHERE id = ?',
        [new Date().toISOString(), result[0].id]
      );

      logger.info('短信验证码验证成功', { phone, type });
      return { success: true, message: '验证成功' };
    } catch (error: any) {
      if (error?.statusCode === 400 || error?.statusCode === 429) throw error;
      logger.error('验证短信验证码失败:', error);
      return { success: false, message: '验证失败' };
    }
  }

  /**
   * 检查手机号是否已验证
   *
   * 查询 users 表中该手机号的 phone_verified 标记。
   *
   * @param phone - 手机号
   * @returns 该手机号是否已被验证
   */
  async isPhoneVerified(phone: string): Promise<boolean> {
    const result = await query(
      'SELECT COUNT(*) as count FROM users WHERE phone = ? AND phone_verified = 1',
      [phone]
    );
    return result[0]?.count > 0;
  }

  /**
   * 标记手机为已验证
   *
   * 更新 users 表中对应手机号的 phone_verified 字段为 1。
   *
   * @param phone - 手机号
   */
  async markPhoneVerified(phone: string): Promise<void> {
    await execute(
      'UPDATE users SET phone_verified = 1, updated_at = ? WHERE phone = ?',
      [new Date().toISOString(), phone]
    );
  }

  /**
   * 生成验证码
   */
  private generateCode(): string {
    const length = config.sms.codeLength;
    // 生成指定位数的数字验证码，避免以0开头
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return String(Math.floor(min + crypto.randomInt(0, max - min + 1)));
  }

  /**
   * 实际发送短信（根据不同provider）
   */
  private async sendSms(phone: string, code: string): Promise<void> {
    if (config.sms.testMode || config.sms.provider === 'mock') {
      // 测试模式：打印到控制台
      logger.info(`[短信服务 - Mock] 发送验证码到 ${phone}: ${code}`);
      console.log(`\n📱 [短信验证码] 手机: ${phone}, 验证码: ${code}, 有效期: ${config.sms.codeExpiresIn}秒\n`);
      return;
    }

    switch (config.sms.provider) {
      case 'aliyun':
        await this.sendAliyunSms(phone, code);
        break;
      case 'twilio':
        await this.sendTwilioSms(phone, code);
        break;
      case 'tencent':
        await this.sendTencentSms(phone, code);
        break;
      default:
        logger.warn(`不支持的短信提供商: ${config.sms.provider}，使用Mock模式`);
        logger.info(`[短信服务 - Mock] 发送验证码到 ${phone}: ${code}`);
        console.log(`\n📱 [短信验证码] 手机: ${phone}, 验证码: ${code}, 有效期: ${config.sms.codeExpiresIn}秒\n`);
    }
  }

  /**
   * 阿里云短信发送
   */
  private async sendAliyunSms(phone: string, code: string): Promise<void> {
    // 集成阿里云 SMS SDK
    // const dysmsapi = require('@alicloud/dysmsapi');
    // const client = new dysmsapi({
    //   accessKeyId: config.sms.accessKeyId,
    //   accessKeySecret: config.sms.accessKeySecret,
    // });
    // await client.sendSms({
    //   PhoneNumbers: phone,
    //   SignName: config.sms.signName,
    //   TemplateCode: config.sms.templateCode,
    //   TemplateParam: JSON.stringify({ code }),
    // });
    logger.info(`[阿里云短信] 发送验证码到 ${phone}: ${code}`);
  }

  /**
   * Twilio 短信发送
   */
  private async sendTwilioSms(phone: string, code: string): Promise<void> {
    // 集成 Twilio SDK
    // const twilio = require('twilio');
    // const client = twilio(config.sms.accessKeyId, config.sms.accessKeySecret);
    // await client.messages.create({
    //   body: `您的 GameHub 验证码是: ${code}`,
    //   to: phone,
    //   from: config.sms.signName,
    // });
    logger.info(`[Twilio短信] 发送验证码到 ${phone}: ${code}`);
  }

  /**
   * 腾讯云短信发送（通过 tencentcloud-sdk-nodejs）
   *
   * 前置条件：
   *   1. 已在腾讯云 SMS 控制台创建应用，获取 SdkAppId
   *   2. 已创建并审核通过签名（SignName）
   *   3. 已创建并审核通过模板（TemplateId），参数为 {code} 或 {1}
   *   4. 已创建 API 密钥（SecretId + SecretKey）
   *
   * 环境变量:
   *   TENCENT_SECRET_ID / TENCENTCLOUD_SECRET_ID  — API 密钥 ID
   *   TENCENT_SECRET_KEY / TENCENTCLOUD_SECRET_KEY  — API 密钥 Key
   *   SMS_SDK_APP_ID                                 — 短信应用 AppId（如 1400xxxxxx）
   *   SMS_TEMPLATE_ID / SMS_TEMPLATE_CODE            — 短信模板 ID
   *   TENCENT_SMS_SIGN_NAME / SMS_SIGN_NAME          — 短信签名（需已审核）
   *   TENCENT_SMS_REGION / SMS_REGION                — 地域（默认 ap-guangzhou）
   */
  private async sendTencentSms(phone: string, code: string): Promise<void> {
    const sdk = getTencentSdkInstance();
    if (!sdk) {
      logger.error('tencentcloud-sdk-nodejs 不可用，无法发送腾讯云短信');
      throw new Error('短信服务未就绪：请安装 tencentcloud-sdk-nodejs');
    }

    const { tencent } = config.sms;
    if (!tencent.secretId || !tencent.secretKey) {
      logger.error('腾讯云短信未配置 TENCENT_SECRET_ID / TENCENT_SECRET_KEY');
      throw new Error('短信服务配置不完整：缺少腾讯云凭证');
    }
    if (!tencent.smsSdkAppId) {
      logger.error('腾讯云短信未配置 SMS_SDK_APP_ID');
      throw new Error('短信服务配置不完整：缺少 SdkAppId');
    }
    if (!tencent.templateId) {
      logger.error('腾讯云短信未配置 SMS_TEMPLATE_ID');
      throw new Error('短信服务配置不完整：缺少短信模板 ID');
    }

    try {
      // 使用 API 3.0 通用 SDK
      const SmsClient = sdk.sms.v20210111.Client;
      const client = new SmsClient({
        credential: {
          secretId: tencent.secretId,
          secretKey: tencent.secretKey,
        },
        region: tencent.region,
        profile: {
          signMethod: 'HmacSHA256',
          httpProfile: {
            reqMethod: 'POST',
            reqTimeout: 10,
            endpoint: 'sms.tencentcloudapi.com',
          },
        },
      });

      // 格式化手机号：添加 +86 前缀（中国大陆手机号）
      const phoneNumber = phone.startsWith('+') ? phone : `+86${phone}`;

      const params = {
        SmsSdkAppId: tencent.smsSdkAppId,
        SignName: tencent.signName,
        TemplateId: tencent.templateId,
        TemplateParamSet: [code],
        PhoneNumberSet: [phoneNumber],
      };

      const result = await client.SendSms(params);

      // 检查发送结果
      const sendStatus = result?.SendStatusSet?.[0];
      if (sendStatus?.Code === 'Ok') {
        logger.info(`[腾讯云短信] 发送成功 → ${phone}, SerialNo: ${sendStatus.SerialNo}`);
      } else {
        const errMsg = sendStatus?.Message || '未知错误';
        logger.error(`[腾讯云短信] 发送失败 → ${phone}: ${errMsg}`, { Code: sendStatus?.Code });
        throw new Error(`短信发送失败: ${errMsg}`);
      }
    } catch (error: any) {
      // 区分 SDK 报错与业务报错
      if (error.message?.startsWith('短信发送失败')) {
        throw error;
      }
      logger.error('[腾讯云短信] SDK 调用异常:', error);
      throw new Error(`短信服务异常: ${error.message || '请检查配置后重试'}`);
    }
  }
}

export const smsService = new SmsService();
export default smsService;
