/**
 * ============================================================
 * Passport 认证配置模块 - 社交登录策略注册
 * ============================================================
 *
 * 本文件负责配置 Passport.js 的序列化/反序列化逻辑，并注册所有
 * 社交登录 OAuth 策略。支持的第三方登录平台：
 *
 * - Google         OAuth 2.0
 * - GitHub         OAuth 2.0
 * - Facebook       OAuth 2.0
 * - Twitter        OAuth 2.0 (通过 GitHub 策略适配)
 * - QQ             自定义 OAuth 2.0 策略
 * - WeChat (微信)  自定义 OAuth 2.0 策略
 * - Apple          OAuth 2.0
 *
 * 用户数据存储策略（两种方式）：
 * - 列存储（COLUMN_PROVIDERS）: google / github / facebook / twitter
 *   用户 ID 直接存储在 users 表的对应列中
 * - 表存储（TABLE_PROVIDERS）: qq / wechat / apple
 *   用户 ID 存储在独立的 social_accounts 表中（多账号关联）
 *
 * @module config/passport
 */

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as AppleStrategy } from 'passport-apple';
import { HttpsProxyAgent } from 'https-proxy-agent';
import config from './index';
import { userModel } from '../models/User';
import { socialAccountModel } from '../models/SocialAccount';
import QQStrategy from './passport-qq.strategy';
import WeChatStrategy from './passport-wechat.strategy';
import logger from '../utils/logger';
import { User } from '../types';

// ======================================================================
// Session 序列化/反序列化
// ======================================================================

/**
 * 序列化用户 - 将用户信息存储到 session 中
 *
 * Passport 在用户登录成功后调用此函数，仅将用户 ID 存入 session，
 * 避免存储完整的用户对象。
 *
 * @param user - 登录成功的用户对象
 * @param done - Passport 回调函数，传递序列化后的用户 ID
 */
passport.serializeUser<string>((user: any, done) => {
  done(null, user.id);
});

/**
 * 反序列化用户 - 从 session 中恢复用户信息
 *
 * 每次请求时 Passport 调用此函数，根据 session 中存储的用户 ID
 * 从数据库查询完整的用户信息并附加到 req.user 上。
 *
 * @param id - session 中存储的用户 ID
 * @param done - Passport 回调函数，传递查询到的用户对象
 */
passport.deserializeUser<string>(async (id, done) => {
  try {
    const user = await userModel.findById(id);
    done(null, user || undefined);
  } catch (error) {
    done(error, null);
  }
});

// ======================================================================
// 社交账号存储策略定义
// ======================================================================

/**
 * 使用 users 表列存储 provider ID 的旧版提供商列表
 *
 * 这些提供商将社交账号 ID 直接存储到 users 表的对应列中
 * （如 googleId、githubId 等），每个用户每种平台只能关联一个账号。
 */
const COLUMN_PROVIDERS = ['google', 'github', 'facebook', 'twitter'];

/**
 * 使用 social_accounts 表存储 provider 信息的新版提供商列表
 *
 * 这些提供商将社交账号信息存储到独立的 social_accounts 表中，
 * 支持一个用户关联多个同平台账号。
 */
const TABLE_PROVIDERS = ['qq', 'wechat', 'apple'];

// ======================================================================
// 辅助函数：查找或创建社交登录用户
// ======================================================================

/**
 * 查找或创建社交登录用户
 *
 * 核心逻辑流程：
 * 1. 根据 provider 和 profile.id 查找是否已有关联用户
 * 2. 未找到时，尝试通过邮箱匹配已有用户并关联社交账号
 * 3. 仍未找到时，创建新用户并关联社交账号
 *
 * @param provider - 社交登录提供商名称（google / github / facebook / twitter / qq / wechat / apple）
 * @param profile - OAuth 提供商返回的用户资料
 * @param profile.id - 用户在第三方平台的唯一标识
 * @param profile.username - 用户名（可选）
 * @param profile.displayName - 显示名称
 * @param profile.emails - 邮箱列表（可选）
 * @param profile.photos - 头像列表（可选）
 * @returns Promise<User> - 匹配或创建后的用户对象
 */
export async function findOrCreateSocialUser(
  provider: string,
  profile: { id: string; username?: string; displayName?: string; emails?: Array<{ value: string }>; photos?: Array<{ value: string }> }
): Promise<User> {
  let user: User | null = null;

  // ---- 第一步：查找已关联的用户 ----
  // 旧版列存储：直接在 users 表查询对应列
  if (COLUMN_PROVIDERS.includes(provider)) {
    user = await userModel.findBySocialId(provider as any, profile.id);
  }
  // 新版表存储：先在 social_accounts 表查询，再关联到 users 表
  else if (TABLE_PROVIDERS.includes(provider)) {
    const socialAccount = await socialAccountModel.findByProvider(provider, profile.id);
    if (socialAccount) {
      user = await userModel.findById(socialAccount.userId);
    }
  }

  // 找到已关联用户则直接返回
  if (user) {
    return user;
  }

  // ---- 第二步：通过邮箱匹配已有用户并关联社交账号 ----
  const email = profile.emails?.[0]?.value;
  if (email) {
    user = await userModel.findByEmail(email);
    if (user) {
      // 邮箱已存在 -> 关联社交账号到该用户
      if (COLUMN_PROVIDERS.includes(provider)) {
        // 旧版：更新 users 表的对应列
        await userModel.updateSocialId(user.id, provider as any, profile.id);
      } else if (TABLE_PROVIDERS.includes(provider)) {
        // 新版：在 social_accounts 表创建关联记录
        await socialAccountModel.linkAccount({
          userId: user.id,
          provider,
          providerAccountId: profile.id,
          providerUsername: profile.username,
          providerEmail: email,
          providerAvatarUrl: profile.photos?.[0]?.value,
        });
      }
      logger.info(`社交账号关联成功: ${provider} -> ${email}`);
      return user;
    }
  }

  // ---- 第三步：创建全新用户 ----
  // 生成基础用户名（提供商_用户名 格式）
  const baseUsername = profile.username
    ? `${provider}_${profile.username}`
    : `${provider}_${profile.id.substring(0, 8)}`;

  // 确保用户名唯一，如重复则追加数字后缀
  let username = baseUsername;
  let suffix = 1;
  while (await userModel.usernameExists(username)) {
    username = `${baseUsername}_${suffix}`;
    suffix++;
  }

  // 创建新用户
  const newUser = await userModel.createWithPassword({
    username,
    email: email || `${username}@${provider}.auth`,
    displayName: profile.displayName || username,
    // 生成随机密码，用户无法通过密码登录，仅可使用社交登录
    password: `oauth_${provider}_${profile.id}_${Date.now()}`,
    // 旧版列存储：创建时直接设置社交 ID
    ...(provider === 'google' ? { googleId: profile.id } :
       provider === 'github' ? { githubId: profile.id } :
       provider === 'facebook' ? { facebookId: profile.id } :
       provider === 'twitter' ? { twitterId: profile.id } :
       {}),
  });

  // 新版表存储：创建后在 social_accounts 表中建立关联
  if (TABLE_PROVIDERS.includes(provider)) {
    await socialAccountModel.linkAccount({
      userId: newUser.id,
      provider,
      providerAccountId: profile.id,
      providerUsername: profile.username,
      providerEmail: email,
      providerAvatarUrl: profile.photos?.[0]?.value,
    });
  }

  logger.info(`社交登录新用户创建成功: ${provider} -> ${username}`);
  return newUser;
}

// ======================================================================
// 代理辅助工具
// ======================================================================

/**
 * 从环境变量获取 HTTPS 代理 Agent
 *
 * 读取 HTTPS_PROXY / HTTP_PROXY 环境变量，创建 HttpsProxyAgent 实例。
 * 如果未配置代理或创建失败，返回 undefined（直连模式）。
 *
 * Google OAuth 在 oauth.routes.ts 中手动使用代理；
 * GitHub、Facebook 等 Passport 策略通过 _oauth2.setAgent() 注入代理。
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
    logger.warn('创建代理 agent 失败，OAuth 将使用直连:', e);
    return undefined;
  }
}

// ======================================================================
// OAuth 策略注册
// ======================================================================
// 每个策略在注册前会检查对应提供商是否已启用（enabled），
// 未配置凭据的提供商不会注册，避免运行时错误。
// ======================================================================

// ---- Google OAuth 2.0 ----
if (config.oauth.google.enabled) {
  passport.use(
    'google',
    new GoogleStrategy(
      {
        clientID: config.oauth.google.clientId,
        clientSecret: config.oauth.google.clientSecret,
        callbackURL: config.oauth.google.callbackUrl,
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const user = await findOrCreateSocialUser('google', {
            id: profile.id,
            username: profile.username || profile.displayName,
            displayName: profile.displayName,
            emails: profile.emails,
            photos: profile.photos,
          });
          done(null, user);
        } catch (error) {
          done(error as Error, undefined as any);
        }
      }
    )
  );
  logger.info('Google OAuth 策略已注册');
}

// ---- GitHub OAuth 2.0 ----
if (config.oauth.github.enabled) {
  passport.use(
    'github',
    new GitHubStrategy(
      {
        clientID: config.oauth.github.clientId,
        clientSecret: config.oauth.github.clientSecret,
        callbackURL: config.oauth.github.callbackUrl,
        scope: ['user:email'],
      },
      async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
        try {
          const user = await findOrCreateSocialUser('github', {
            id: profile.id,
            username: profile.username,
            displayName: profile.displayName,
            emails: profile.emails,
            photos: profile.photos,
          });
          done(null, user);
        } catch (error) {
          done(error as Error, undefined as any);
        }
      }
    )
  );
  logger.info('GitHub OAuth 策略已注册');

  // 注入代理支持：passport-github2 内部使用 oauth 库发 HTTPS 请求，
  // 不会自动读取 HTTPS_PROXY 环境变量，需手动设置 agent
  const ghProxy = getProxyAgent();
  if (ghProxy) {
    try {
      (passport as any)._strategies.github._oauth2.setAgent(ghProxy);
      logger.info('GitHub OAuth 已配置代理');
    } catch (e) {
      logger.warn('GitHub OAuth 代理配置失败:', e);
    }
  }
}

// ---- Facebook OAuth 2.0 ----
if (config.oauth.facebook.enabled) {
  passport.use(
    'facebook',
    new FacebookStrategy(
      {
        clientID: config.oauth.facebook.clientId,
        clientSecret: config.oauth.facebook.clientSecret,
        callbackURL: config.oauth.facebook.callbackUrl,
        profileFields: ['id', 'displayName', 'emails', 'photos'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const user = await findOrCreateSocialUser('facebook', {
            id: profile.id,
            username: profile.displayName,
            displayName: profile.displayName,
            emails: profile.emails,
            photos: profile.photos,
          });
          done(null, user);
        } catch (error) {
          done(error as Error, undefined as any);
        }
      }
    )
  );
  logger.info('Facebook OAuth 策略已注册');

  // 注入代理支持（与 GitHub 同理）
  const fbProxy = getProxyAgent();
  if (fbProxy) {
    try {
      (passport as any)._strategies.facebook._oauth2.setAgent(fbProxy);
      logger.info('Facebook OAuth 已配置代理');
    } catch (e) {
      logger.warn('Facebook OAuth 代理配置失败:', e);
    }
  }
}

// ---- Twitter OAuth 2.0 ----
// TODO: Twitter OAuth 需要专用的 Twitter OAuth2 策略（如 passport-twitter-oauth2），
// 不能复用 GitHubStrategy（passport-github2 硬编码了 GitHub 的 API 端点）。
// 在实现正确的 Twitter 策略之前，Twitter 登录不会正常工作。
if (config.oauth.twitter.enabled) {
  logger.warn(
    'Twitter OAuth 当前使用的策略尚未正确实现（需要 passport-twitter-oauth2），' +
    'Twitter 登录将不可用。请设置 TWITTER_CLIENT_ID 为空来禁用。'
  );
  // 以下代码保留作为实现 Twitter OAuth 的起点，但当前不会注册策略。
  // 如需实现 Twitter 登录，请：
  // 1. npm install passport-twitter-oauth2
  // 2. 参考 Twitter OAuth 2.0 文档配置正确的端点
  // 3. 将下方代码块取消注释并替换为 TwitterStrategy
  /*
  passport.use(
    'twitter',
    new TwitterStrategy(
      {
        clientID: config.oauth.twitter.clientId,
        clientSecret: config.oauth.twitter.clientSecret,
        callbackURL: config.oauth.twitter.callbackUrl,
        scope: ['tweet.read', 'users.read'],
      },
      async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
        try {
          const user = await findOrCreateSocialUser('twitter', {
            id: profile.id,
            username: profile.username,
            displayName: profile.displayName,
            emails: profile.emails,
            photos: profile.photos,
          });
          done(null, user);
        } catch (error) {
          done(error as Error, undefined as any);
        }
      }
    )
  );
  logger.info('Twitter OAuth 策略已注册');
  */
}

// ---- QQ OAuth 2.0 ----
// 使用自定义 QQStrategy，需要配置 QQ_APP_ID 和 QQ_APP_KEY
if (config.oauth.qq.enabled) {
  passport.use(
    'qq',
    new QQStrategy(
      {
        clientID: config.oauth.qq.appId,
        clientSecret: config.oauth.qq.appKey,
        callbackURL: config.oauth.qq.callbackUrl,
        scope: 'get_user_info',
      },
      async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
        try {
          const user = await findOrCreateSocialUser('qq', {
            id: profile.id,
            username: profile.username,
            displayName: profile.displayName,
            emails: profile.emails,
            photos: profile.photos,
          });
          done(null, user);
        } catch (error) {
          done(error as Error, undefined as any);
        }
      }
    )
  );
  logger.info('QQ OAuth 策略已注册');
}

// ---- WeChat OAuth 2.0 ----
// 使用自定义 WeChatStrategy，需要配置 WECHAT_APP_ID 和 WECHAT_APP_SECRET
if (config.oauth.wechat.enabled) {
  passport.use(
    'wechat',
    new WeChatStrategy(
      {
        clientID: config.oauth.wechat.appId,
        clientSecret: config.oauth.wechat.appSecret,
        callbackURL: config.oauth.wechat.callbackUrl,
      },
      async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
        try {
          const user = await findOrCreateSocialUser('wechat', {
            id: profile.id,
            username: profile.username,
            displayName: profile.displayName,
            emails: profile.emails,
            photos: profile.photos,
          });
          done(null, user);
        } catch (error) {
          done(error as Error, undefined as any);
        }
      }
    )
  );
  logger.info('WeChat OAuth 策略已注册');
}

// ---- Apple OAuth 2.0 ----
// 需要配置 APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY_PATH
if (config.oauth.apple.enabled) {
  passport.use(
    'apple',
    new AppleStrategy(
      {
        clientID: config.oauth.apple.clientId,
        teamID: config.oauth.apple.teamId,
        keyID: config.oauth.apple.keyId,
        privateKeyPath: config.oauth.apple.privateKeyPath || undefined,
        callbackURL: config.oauth.apple.callbackUrl,
        scope: ['name', 'email'],
      },
      async (_accessToken: string, _refreshToken: string, idToken: any, profile: any, done: any) => {
        try {
          // Apple 的 user profile 从 idToken 中解析，profile 参数可能为空
          const userId = profile?.id || idToken?.sub || '';
          const user = await findOrCreateSocialUser('apple', {
            id: userId,
            username: profile?.displayName || `apple_${userId.substring(0, 8)}`,
            displayName: profile?.displayName || 'Apple用户',
            emails: profile?.emails || (idToken?.email ? [{ value: idToken.email }] : []),
            photos: [],
          });
          done(null, user);
        } catch (error) {
          done(error as Error, undefined as any);
        }
      }
    )
  );
  logger.info('Apple OAuth 策略已注册');
}

export default passport;
