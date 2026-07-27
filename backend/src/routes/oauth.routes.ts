/**
 * OAuth 认证路由模块
 *
 * 本模块负责处理第三方 OAuth 登录相关的所有路由，包括：
 * - 获取已启用的 OAuth 提供商列表
 * - 获取特定提供商的 OAuth 授权 URL
 * - 发起 OAuth 认证流程
 * - 处理 OAuth 回调并生成 JWT 令牌
 *
 * 支持的提供商：Google、GitHub、Facebook、Twitter、QQ、微信、Apple ID
 *
 * Google OAuth 使用手动代理方式处理回调（因为 passport-google-oauth20
 * 的 HTTP 请求不支持自定义 agent，在中国大陆需要通过代理访问 Google API）。
 * 其他提供商使用 Passport.js 标准回调。
 *
 * @module routes/oauth
 */

import { Router, Request, Response } from 'express';
import https from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';
import passport, { findOrCreateSocialUser } from '../config/passport.config';
import config from '../config';
import logger from '../utils/logger';
import { asyncHandler } from '../middlewares/error.middleware';
import { issueTokens } from '../services/auth.service';

const router = Router();

/**
 * OAuth 提供商配置映射表
 * 记录每个提供商的显示名称和图标标识，用于前端展示
 */
const OAUTH_PROVIDERS: Record<string, { name: string; icon: string }> = {
  google: { name: 'Google', icon: 'google' },
  github: { name: 'GitHub', icon: 'github' },
  facebook: { name: 'Facebook', icon: 'facebook' },
  twitter: { name: 'Twitter', icon: 'twitter' },
  qq: { name: 'QQ', icon: 'qq' },
  wechat: { name: '微信', icon: 'wechat' },
  apple: { name: 'Apple ID', icon: 'apple' },
};

// ======================================================================
// 代理辅助工具
// ======================================================================

/**
 * 从环境变量获取 HTTPS 代理 Agent
 *
 * 读取 HTTPS_PROXY / HTTP_PROXY 环境变量，创建 HttpsProxyAgent 实例。
 * 如果未配置代理或创建失败，返回 undefined（直连模式）。
 *
 * @returns HttpsProxyAgent 实例，或 undefined
 */
function getProxyAgent(): HttpsProxyAgent<string> | undefined {
  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy;

  if (!proxyUrl) return undefined;

  try {
    return new HttpsProxyAgent(proxyUrl);
  } catch (e) {
    logger.warn('创建代理 agent 失败，将使用直连:', e);
    return undefined;
  }
}

/**
 * 发起 HTTPS 请求（支持自动代理）
 *
 * 如果配置了 HTTPS_PROXY 环境变量，请求会通过代理服务器；
 * 否则直连目标服务器。
 *
 * @param url      - 完整的 HTTPS URL
 * @param options  - 请求选项（method、headers、body）
 * @returns 包含 HTTP 状态码和解析后的响应体
 */
function httpsRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {}
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const agent = getProxyAgent();

    const reqOptions: https.RequestOptions = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      agent,
      timeout: 15000,
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => (data += chunk.toString()));
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode || 0,
            data: JSON.parse(data || '{}'),
          });
        } catch {
          resolve({ status: res.statusCode || 0, data: {} });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('HTTPS 请求超时'));
    });

    req.on('error', (err) => {
      // 代理连接失败时给出更友好的错误信息
      if ((err as any).code === 'ECONNREFUSED' && agent) {
        reject(
          new Error(
            `代理连接失败 (${(err as any).address}:${(err as any).port})，请检查代理服务是否运行`
          )
        );
      } else {
        reject(err);
      }
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// ======================================================================
// OAuth 路由
// ======================================================================

/**
 * @route GET /api/v1/auth/oauth/providers
 * @desc 获取已启用的 OAuth 提供商列表
 * @access Public
 */
router.get('/oauth/providers', (_req: Request, res: Response) => {
  const providers = Object.entries(config.oauth)
    .filter(([key]) => key !== 'frontendUrl')
    .filter(([, value]: [string, any]) => value.enabled)
    .map(([key]) => ({
      provider: key,
      name: OAUTH_PROVIDERS[key]?.name || key,
      icon: OAUTH_PROVIDERS[key]?.icon || key,
    }));

  res.json({
    success: true,
    data: { providers },
  });
});

/**
 * @route GET /api/v1/auth/oauth/url/:provider
 * @desc 获取 OAuth 授权 URL
 * @access Public
 */
router.get('/oauth/url/:provider', (req: Request, res: Response) => {
  const { provider } = req.params;
  const oauthConfig = (config.oauth as any)[provider];

  if (!oauthConfig || !oauthConfig.enabled) {
    return res.status(400).json({
      success: false,
      error: `不支持的 OAuth 提供商: ${provider}`,
    });
  }

  const baseUrl = `${config.apiPrefix}/auth/oauth/${provider}`;
  res.json({
    success: true,
    data: { url: baseUrl },
  });
});

/**
 * @route GET /api/v1/auth/oauth/:provider
 * @desc 发起 OAuth 认证（重定向到第三方登录页）
 * @access Public
 */
router.get(
  '/oauth/:provider',
  (req: Request, res: Response, next) => {
    const { provider } = req.params;
    const oauthConfig = (config.oauth as any)[provider];

    if (!oauthConfig || !oauthConfig.enabled) {
      return res.status(400).json({
        success: false,
        error: `不支持的 OAuth 提供商: ${provider}`,
      });
    }

    // 使用 Passport 中间件重定向到第三方 OAuth 页面
    // session: false — 本应用使用 JWT 令牌认证，不依赖 session
    const authOptions: any = {
      scope: provider === 'github' ? ['user:email'] : ['profile', 'email'],
      session: false,
    };
    // Google: 强制显示账号选择页面，避免自动使用浏览器已登录的账号
    if (provider === 'google') {
      authOptions.prompt = 'select_account';
    }
    // 注意：GitHub OAuth 不支持 prompt 参数。GitHub 授权是持久化的，
    // 一旦用户在 GitHub 上授权过该 OAuth App，后续登录将自动跳过授权页。
    // 如需重新看到授权页，需在 GitHub Settings → Applications 中 Revoke 该应用。
    passport.authenticate(provider, authOptions)(req, res, next);
  }
);

// ======================================================================
// Google OAuth 回调（手动代理方式）
// ======================================================================
// 因为 passport-google-oauth20 的 HTTP 请求不支持自定义 agent，
// Google 的 token 交换和 userinfo 获取通过本模块的 httpsRequest
// （支持 HTTPS_PROXY 代理）手动完成。用户查找/创建使用统一的
// findOrCreateSocialUser，令牌签发使用 auth.service 的 issueTokens。
// ======================================================================

/**
 * @route GET /api/v1/auth/oauth/google/callback
 * @desc Google OAuth 回调处理（手动代理方式）
 * @access Public
 */
router.get(
  '/oauth/google/callback',
  asyncHandler(async (req: Request, res: Response) => {
    // 使用 try-catch 包裹全部逻辑，确保任何错误（包括网络超时、
    // 代理连接失败等）都重定向到前端，而不是返回 JSON 500
    try {
      const { code } = req.query;

      // 参数校验
      if (!code) {
        return res.redirect(
          `${config.oauth.frontendUrl}/login?oauth_error=no_code`
        );
      }

      const oauthConfig = config.oauth.google;
      if (!oauthConfig.enabled) {
        return res.redirect(
          `${config.oauth.frontendUrl}/login?oauth_error=provider_disabled`
        );
      }

      // ---- 第1步：用授权码换取 access_token ----
      const tokenParams = new URLSearchParams({
        code: String(code),
        client_id: oauthConfig.clientId,
        client_secret: oauthConfig.clientSecret,
        redirect_uri: oauthConfig.callbackUrl,
        grant_type: 'authorization_code',
      });

      const tokenResult = await httpsRequest(
        'https://oauth2.googleapis.com/token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: tokenParams.toString(),
        }
      );

      if (!tokenResult.data.access_token) {
        logger.error('Google token 交换失败', {
          error: tokenResult.data.error,
          error_description: tokenResult.data.error_description,
        });
        return res.redirect(
          `${config.oauth.frontendUrl}/login?oauth_error=token_exchange_failed`
        );
      }

      const accessToken = tokenResult.data.access_token;

      // ---- 第2步：获取 Google 用户信息 ----
      const userResult = await httpsRequest(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!userResult.data.email) {
        logger.error('Google 用户信息获取失败', userResult.data);
        return res.redirect(
          `${config.oauth.frontendUrl}/login?oauth_error=userinfo_failed`
        );
      }

      const googleProfile = userResult.data;

      // ---- 第3步：查找或创建用户（使用统一的社交登录逻辑） ----
      const user = await findOrCreateSocialUser('google', {
        id: googleProfile.id,
        username: googleProfile.email?.split('@')[0],
        displayName: googleProfile.name || googleProfile.email?.split('@')[0],
        emails: googleProfile.email
          ? [{ value: googleProfile.email }]
          : [],
        photos: googleProfile.picture
          ? [{ value: googleProfile.picture }]
          : [],
      });

      // ---- 第4步：签发 JWT 令牌并重定向到前端 ----
      const tokens = await issueTokens(user.id);

      const redirectUrl = new URL(
        `${config.oauth.frontendUrl}/oauth/callback`
      );
      redirectUrl.searchParams.set('accessToken', tokens.accessToken);
      redirectUrl.searchParams.set('refreshToken', tokens.refreshToken);

      logger.info(`Google OAuth 登录成功`, {
        userId: user.id,
        email: user.email,
      });

      res.redirect(redirectUrl.toString());
    } catch (e: any) {
      // 网络超时、代理连接失败等所有未预期的错误都重定向到前端
      logger.error(`Google OAuth 回调异常:`, e.message);
      res.redirect(
        `${config.oauth.frontendUrl}/login?oauth_error=${encodeURIComponent(e.message || 'server_error')}`
      );
    }
  })
);

// ======================================================================
// 通用 OAuth 回调（Passport 标准方式，适用于 Google 以外的提供商）
// ======================================================================

/**
 * @route GET /api/v1/auth/oauth/:provider/callback
 * @desc 通用 OAuth 回调处理（Passport.js 标准方式）
 * @access Public
 *
 * 注意：Google 的回调由 /oauth/google/callback 专门处理（见上方），
 * 此路由不会匹配 Google 提供商。
 */
router.get(
  '/oauth/:provider/callback',
  asyncHandler(async (req: Request, res: Response) => {
    // 使用 try-catch 包裹全部逻辑，与 Google 回调保持一致的错误处理策略：
    // 任何未预期的错误（网络超时、Passport 内部异常等）都重定向到前端，
    // 而不是返回 JSON 500
    try {
      const { provider } = req.params;

      // Google 由专门的路由处理，这里不应该到达
      if (provider === 'google') {
        return res.redirect(
          `${config.oauth.frontendUrl}/login?oauth_error=wrong_route`
        );
      }

      const oauthConfig = (config.oauth as any)[provider];
      if (!oauthConfig?.enabled) {
        return res.redirect(
          `${config.oauth.frontendUrl}/login?oauth_error=provider_disabled`
        );
      }

      // 将 passport.authenticate 包装为 Promise，确保异步回调中的
      // 错误也能被外层 try-catch 捕获
      await new Promise<void>((resolve, reject) => {
        passport.authenticate(
          provider,
          { session: false },
          async (err: any, user: any, info: any) => {
            try {
              if (err) {
                logger.error(`OAuth ${provider} 认证错误:`, err.message);
                res.redirect(
                  `${config.oauth.frontendUrl}/login?oauth_error=${encodeURIComponent(err.message)}`
                );
                return resolve();
              }

              if (!user) {
                logger.error(`OAuth ${provider} 认证失败: 无用户返回`, info);
                res.redirect(
                  `${config.oauth.frontendUrl}/login?oauth_error=auth_failed`
                );
                return resolve();
              }

              const tokens = await issueTokens(user.id);

              const redirectUrl = new URL(
                `${config.oauth.frontendUrl}/oauth/callback`
              );
              redirectUrl.searchParams.set('accessToken', tokens.accessToken);
              redirectUrl.searchParams.set('refreshToken', tokens.refreshToken);

              logger.info(`OAuth ${provider} 登录成功`, {
                userId: user.id,
                email: user.email,
              });

              res.redirect(redirectUrl.toString());
              resolve();
            } catch (innerError: any) {
              reject(innerError);
            }
          }
        )(req, res);
      });
    } catch (e: any) {
      // 网络超时、Passport 内部异常等所有未预期的错误都重定向到前端
      logger.error(`OAuth ${req.params.provider} 回调异常:`, e.message);
      res.redirect(
        `${config.oauth.frontendUrl}/login?oauth_error=${encodeURIComponent(e.message || 'server_error')}`
      );
    }
  })
);

export default router;
