/**
 * ============================================================
 * 微信 OAuth 2.0 认证策略
 * ============================================================
 *
 * 本文件实现了针对微信开放平台（微信扫码登录）的 Passport.js 自定义
 * OAuth2 策略。微信的 OAuth2 实现与标准协议存在以下差异：
 *
 * 1. token 端点返回的是 JSON 格式而非标准的 application/x-www-form-urlencoded
 * 2. 标准 passport-oauth2 无法正确处理微信的 token 响应，需要重写
 *    getOAuthAccessToken 方法
 * 3. 授权 URL 需要添加 display=qr 参数以启用二维码扫码登录
 * 4. 用户信息通过 /sns/userinfo 接口获取，返回 unionid（跨公众号/小程序的
 *    统一标识）和 openid
 *
 * 参考文档：https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/
 *
 * @module config/passport-wechat
 */

import { Strategy as OAuth2Strategy, VerifyFunction } from 'passport-oauth2';
import axios from 'axios';

/**
 * 微信用户资料接口
 *
 * 定义了微信开放平台返回的用户标准化资料结构。
 * 与 Passport.js 的 profile 规范兼容，并扩展了微信特有的 unionid 字段。
 *
 * @interface WeChatProfile
 * @property {string} id - 用户唯一标识（优先使用 unionid，其次使用 openid）
 * @property {string} displayName - 用户昵称
 * @property {string} [username] - 自动生成的唯一用户名
 * @property {Array<{value: string}>} [emails] - 邮箱列表（微信不提供邮箱，始终为空）
 * @property {Array<{value: string}>} [photos] - 头像列表
 * @property {string} [unionid] - 微信 unionid，用于跨平台用户统一标识
 * @property {any} _json - 微信 API 返回的原始用户信息
 */
export interface WeChatProfile {
  /** 用户唯一标识（unionid > openid） */
  id: string;
  /** 用户显示名称（微信昵称） */
  displayName: string;
  /** 自动生成的唯一用户名 */
  username?: string;
  /** 邮箱列表（微信不提供，始终为空数组） */
  emails?: Array<{ value: string }>;
  /** 头像列表 */
  photos?: Array<{ value: string }>;
  /** 微信原始用户数据 */
  _json: any;
  /** 跨平台用户统一标识 */
  unionid?: string;
}

/**
 * 微信 OAuth 2.0 认证策略类
 *
 * 继承自 passport-oauth2 的 OAuth2Strategy，针对微信开放平台的 API 特性
 * 进行了以下适配：
 * - 重写 authorizeURL：添加 display=qr 参数以支持扫码登录
 * - 重写 getOAuthAccessToken：处理微信返回的 JSON 格式 token 响应
 * - 重写 userProfile：调用微信 /sns/userinfo 接口获取用户详情
 *
 * @class WeChatStrategy
 * @extends OAuth2Strategy
 *
 * @example
 * ```typescript
 * passport.use('wechat', new WeChatStrategy({
 *   clientID: 'YOUR_WECHAT_APP_ID',
 *   clientSecret: 'YOUR_WECHAT_APP_SECRET',
 *   callbackURL: 'http://localhost:3003/api/v1/auth/oauth/wechat/callback',
 * }, verifyCallback));
 * ```
 */
export class WeChatStrategy extends OAuth2Strategy {
  /** 微信开放平台 APP ID */
  private appId: string;

  /** 微信开放平台 APP Secret */
  private appSecret: string;

  /**
   * 创建微信 OAuth 策略实例
   *
   * @param options - OAuth 配置选项
   * @param options.clientID - 微信开放平台的 APP ID
   * @param options.clientSecret - 微信开放平台的 APP Secret
   * @param options.callbackURL - 授权回调地址
   * @param options.authorizationURL - 授权页面 URL（默认使用微信扫码登录地址）
   * @param options.tokenURL - 获取 access_token 的 URL（默认使用微信 API）
   * @param verify - Passport 验证回调函数
   */
  constructor(options: any, verify: VerifyFunction) {
    // 设置微信 OAuth2 端点
    options.authorizationURL = options.authorizationURL || 'https://open.weixin.qq.com/connect/qrconnect';
    options.tokenURL = options.tokenURL || 'https://api.weixin.qq.com/sns/oauth2/access_token';
    super(options, verify);
    this.name = 'wechat';
    this.appId = options.clientID;
    this.appSecret = options.clientSecret;
    this._oauth2.useAuthorizationHeaderforGET(true);
  }

  /**
   * 生成微信授权 URL
   *
   * 重写父类的 authorizeURL 方法，在标准 OAuth2 授权 URL 后添加
   * display=qr 参数，以启用微信的二维码扫码登录界面。
   *
   * @param options - 额外的授权参数（可选）
   * @returns 完整的微信授权 URL 字符串
   */
  authorizeURL(options: any = {}): string {
    // @ts-expect-error - authorizeURL exists at runtime but missing from passport-oauth2 types
    const url = super.authorizeURL(options);
    // 微信扫码登录需要 display=qr 参数
    return `${url}&display=qr`;
  }

  /**
   * 获取 OAuth Access Token
   *
   * 重写父类的 getOAuthAccessToken 方法。微信的 access_token 端点的
   * 特殊性在于：
   * - 返回的是 JSON 格式（而非标准 OAuth2 的 URL 编码格式）
   * - 成功时返回 access_token、expires_in、refresh_token、openid、unionid、scope
   * - 失败时返回 errcode 和 errmsg
   *
   * 因此不能使用 passport-oauth2 默认的 token 解析逻辑，需要手动调用
   * 微信 API 并解析响应。
   *
   * @param code - 授权回调时获取的 authorization code
   * @param options - 额外的 token 请求参数
   * @returns 包含 accessToken、refreshToken、expiresIn、openid、unionid、scope 的对象
   * @throws 当微信返回 errcode 时抛出错误
   */
  async getOAuthAccessToken(code: string, options: any): Promise<any> {
    const url = 'https://api.weixin.qq.com/sns/oauth2/access_token';
    const response = await axios.get(url, {
      params: {
        appid: this.appId,
        secret: this.appSecret,
        code: code,
        grant_type: 'authorization_code',
      },
    });

    const data = response.data;
    if (data.errcode) {
      throw new Error(`微信登录失败: ${data.errmsg}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      openid: data.openid,
      unionid: data.unionid,
      scope: data.scope,
    };
  }

  /**
   * 获取微信用户资料
   *
   * 重写父类的 userProfile 方法，调用微信的 /sns/userinfo 接口
   * 获取用户详细信息（昵称、头像、性别等）。
   *
   * 用户唯一标识 id 的选用策略：
   * - 优先使用 unionid（如果已绑定开放平台，unionid 在同一开放平台下唯一）
   * - 其次使用 openid（仅在当前公众号/应用下唯一）
   *
   * 注意：当前实现中 openid 为空字符串占位，实际需要从请求上下文中获取
   * 有效的 openid。在完整实现中，应当在 getOAuthAccessToken 阶段保存
   * openid 以供 userProfile 使用。
   *
   * @param accessToken - 微信 access token
   * @param done - Passport 回调函数，传递标准化后的 WeChatProfile
   */
  async userProfile(accessToken: string, done: (err?: Error | null, profile?: WeChatProfile) => void) {
    try {
      // 使用 access_token 获取微信用户信息
      const userInfoResponse = await axios.get('https://api.weixin.qq.com/sns/userinfo', {
        params: {
          access_token: accessToken,
          openid: '', // TODO: 需要从请求上下文中获取 openid
        },
      });

      const userInfo = userInfoResponse.data;

      // 检查微信 API 是否返回错误
      if (userInfo.errcode) {
        return done(new Error(`获取微信用户信息失败: ${userInfo.errmsg}`));
      }

      // 构建符合 Passport 标准的 profile 对象
      const profile: WeChatProfile = {
        id: userInfo.unionid || userInfo.openid,
        unionid: userInfo.unionid,
        displayName: userInfo.nickname || '微信用户',
        username: `wechat_${(userInfo.unionid || userInfo.openid).substring(0, 8)}`,
        emails: [], // 微信不提供用户邮箱
        photos: userInfo.headimgurl ? [{ value: userInfo.headimgurl }] : [],
        _json: userInfo,
      };

      done(null, profile);
    } catch (error) {
      done(error as Error);
    }
  }
}

export default WeChatStrategy;
