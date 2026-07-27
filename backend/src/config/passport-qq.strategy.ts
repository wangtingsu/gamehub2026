/**
 * ============================================================
 * QQ OAuth 2.0 认证策略
 * ============================================================
 *
 * 本文件实现了针对 QQ 互联开放平台的 Passport.js 自定义 OAuth2 策略。
 * QQ 的 OAuth2 实现与标准协议存在以下差异：
 *
 * 1. token 端点返回的不是标准 JSON，而是 application/x-www-form-urlencoded 格式
 * 2. 获取用户 OpenID 需要先调用 /oauth2.0/me 端点，返回 JSONP 格式数据
 * 3. 用户信息端点 /user/get_user_info 需要同时传入 access_token、openid 和
 *    oauth_consumer_key（即 appId）
 *
 * 参考文档：https://wiki.connect.qq.com/
 *
 * @module config/passport-qq
 */

import { Strategy as OAuth2Strategy, VerifyFunction } from 'passport-oauth2';
import axios from 'axios';

/**
 * QQ 用户资料接口
 *
 * 定义了 QQ 互联平台返回的用户标准化资料结构。
 * 与 Passport.js 的 profile 规范兼容。
 *
 * @interface QQProfile
 * @property {string} id - 用户在 QQ 的唯一标识（OpenID）
 * @property {string} displayName - 用户昵称（来自 QQ 的 nickname）
 * @property {string} [username] - 自动生成的唯一用户名（基于 OpenID）
 * @property {Array<{value: string}>} [emails] - 邮箱列表（QQ 互联不提供邮箱，始终为空）
 * @property {Array<{value: string}>} [photos] - 头像列表（依次尝试大尺寸和中尺寸）
 * @property {any} _json - QQ API 返回的原始用户信息对象
 */
export interface QQProfile {
  /** 用户在 QQ 的唯一标识（OpenID） */
  id: string;
  /** 用户显示名称（QQ 昵称） */
  displayName: string;
  /** 自动生成的唯一用户名 */
  username?: string;
  /** 邮箱列表（QQ 不提供，始终为空数组） */
  emails?: Array<{ value: string }>;
  /** 头像列表 */
  photos?: Array<{ value: string }>;
  /** QQ API 返回的原始数据 */
  _json: any;
}

/**
 * QQ OAuth 2.0 认证策略类
 *
 * 继承自 passport-oauth2 的 OAuth2Strategy，针对 QQ 互联开放平台的
 * API 特性进行了适配。主要覆盖了 userProfile 方法以处理 QQ 特有的
 * 获取用户信息的流程（先获取 OpenID，再获取用户详情）。
 *
 * @class QQStrategy
 * @extends OAuth2Strategy
 *
 * @example
 * ```typescript
 * passport.use('qq', new QQStrategy({
 *   clientID: 'YOUR_QQ_APP_ID',
 *   clientSecret: 'YOUR_QQ_APP_KEY',
 *   callbackURL: 'http://localhost:3003/api/v1/auth/oauth/qq/callback',
 *   scope: 'get_user_info',
 * }, verifyCallback));
 * ```
 */
export class QQStrategy extends OAuth2Strategy {
  /**
   * 创建 QQ OAuth 策略实例
   *
   * @param options - OAuth 配置选项
   * @param options.clientID - QQ 互联应用的 APP ID
   * @param options.clientSecret - QQ 互联应用的 APP Key
   * @param options.callbackURL - 授权回调地址
   * @param options.authorizationURL - 授权页面 URL（默认使用 QQ 官方地址）
   * @param options.tokenURL - 获取 token 的 URL（默认使用 QQ 官方地址）
   * @param verify - Passport 验证回调函数
   */
  constructor(options: any, verify: VerifyFunction) {
    // 设置 QQ OAuth2 端点（保留通过 options 覆盖的灵活性）
    options.authorizationURL = options.authorizationURL || 'https://graph.qq.com/oauth2.0/authorize';
    options.tokenURL = options.tokenURL || 'https://graph.qq.com/oauth2.0/token';
    super(options, verify);
    this.name = 'qq';
    // QQ 要求 access_token 通过 HTTP Authorization 请求头发送
    this._oauth2.useAuthorizationHeaderforGET(true);
  }

  /**
   * 获取 QQ 用户资料
   *
   * 重写父类的 userProfile 方法，实现 QQ 特有的两步式用户信息获取流程：
   *
   * 步骤一：调用 /oauth2.0/me 接口获取用户的 OpenID
   *   - QQ 返回格式：callback( {"client_id":"xxx","openid":"xxx"} )
   *   - 需要通过正则表达式从 JSONP 响应中提取 openid
   *
   * 步骤二：调用 /user/get_user_info 接口获取用户详细信息
   *   - 需要传入 access_token、oauth_consumer_key（appId）、openid 三个参数
   *   - 返回用户昵称、头像等信息
   *
   * @param accessToken - 从 QQ 获取的 access token
   * @param done - Passport 回调函数，传递标准化后的 QQProfile
   */
  async userProfile(accessToken: string, done: (err?: Error | null, profile?: QQProfile) => void) {
    try {
      // ---- 步骤一：获取 OpenID ----
      const openIdResponse = await axios.get('https://graph.qq.com/oauth2.0/me', {
        params: { access_token: accessToken },
      });

      // QQ 以 JSONP 格式返回：callback( {"client_id":"xxx","openid":"xxx"} );
      // 使用正则提取 JSON 部分中的 openid 字段值
      const match = openIdResponse.data.match(/\{"client_id":"[^"]+","openid":"([^"]+)"\}/);
      const openId = match ? match[1] : null;

      if (!openId) {
        return done(new Error('Failed to get QQ OpenID'));
      }

      // ---- 步骤二：获取用户详细信息 ----
      const userInfoResponse = await axios.get('https://graph.qq.com/user/get_user_info', {
        params: {
          access_token: accessToken,
          oauth_consumer_key: (this as any)._oauth2._clientId, // QQ 要求的 APP ID
          openid: openId,
        },
      });

      const userInfo = userInfoResponse.data;

      // 构建符合 Passport 标准的 profile 对象
      const profile: QQProfile = {
        id: openId,
        displayName: userInfo.nickname || 'QQ用户',
        username: `qq_${openId.substring(0, 8)}`,
        emails: [], // QQ 互联不提供用户邮箱
        // 优先使用大尺寸头像，其次中尺寸
        photos: userInfo.figureurl_qq_2
          ? [{ value: userInfo.figureurl_qq_2 }]
          : userInfo.figureurl_qq_1
            ? [{ value: userInfo.figureurl_qq_1 }]
            : [],
        _json: userInfo,
      };

      done(null, profile);
    } catch (error) {
      done(error as Error);
    }
  }
}

export default QQStrategy;
