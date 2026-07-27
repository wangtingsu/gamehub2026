/**
 * 国际化语言中间件模块
 *
 * 提供多语言检测与切换功能，支持从多种来源按优先级检测用户首选语言：
 * 查询参数 > Accept-Language 请求头 > Cookie > 用户设置 > 默认语言。
 *
 * 语言代码经标准化处理后与支持的语言列表匹配，自动选择最合适的语言。
 * 支持的语言列表与前端 i18n 配置保持一致。
 *
 * @module middlewares/language.middleware
 */

import { Request, Response, NextFunction } from 'express';
import { userModel } from '../models/User';

/**
 * 支持的语言列表（与前端 i18n 配置保持一致）
 * 按优先级排列，第一个为默认语言
 */
export const SUPPORTED_LANGUAGES = ['en', 'zh-CN', 'ja', 'ko', 'es', 'fr'] as const;

/** 默认语言（当无法检测到用户偏好时使用） */
export const DEFAULT_LANGUAGE = 'zh-CN';

/** 支持的语言代码联合类型 */
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

/**
 * 语言检测选项接口
 *
 * 配置语言检测的来源和优先级顺序，以及相关的参数名称。
 */
export interface LanguageDetectionOptions {
  /**
   * 是否从查询参数检测语言
   * @default true
   */
  fromQueryParam?: boolean;

  /**
   * 查询参数名称
   * @default 'lang'
   */
  queryParamName?: string;

  /**
   * 是否从 Accept-Language 请求头检测语言
   * @default true
   */
  fromHeader?: boolean;

  /**
   * 是否从用户认证信息检测语言
   * @default true
   */
  fromUser?: boolean;

  /**
   * 是否从 cookie 检测语言
   * @default false
   */
  fromCookie?: boolean;

  /**
   * cookie 名称
   * @default 'language'
   */
  cookieName?: string;

  /**
   * 是否启用会话存储语言偏好
   * @default false
   */
  useSession?: boolean;
}

/** 默认检测选项 */
const DEFAULT_OPTIONS: LanguageDetectionOptions = {
  fromQueryParam: true,
  queryParamName: 'lang',
  fromHeader: true,
  fromUser: true,
  fromCookie: false,
  cookieName: 'language',
  useSession: false,
};

/**
 * 解析 Accept-Language 请求头
 *
 * 将 HTTP Accept-Language 头部解析为按质量值降序排列的语言代码列表。
 *
 * @param header - Accept-Language 请求头原始值
 *                 示例: "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7"
 * @returns 按优先级排序的语言代码数组
 */
function parseAcceptLanguage(header: string | undefined): string[] {
  if (!header) return [];

  const languages: Array<{ code: string; q: number }> = [];

  // 分割语言条目
  const parts = header.split(',');

  for (const part of parts) {
    const [language, qValue] = part.split(';');
    const code = language.trim().toLowerCase();

    // 提取质量值（q），默认为1
    let q = 1.0;
    if (qValue) {
      const qMatch = qValue.trim().match(/q=([0-9.]+)/);
      if (qMatch) {
        q = parseFloat(qMatch[1]);
      }
    }

    languages.push({ code, q });
  }

  // 按质量值排序
  languages.sort((a, b) => b.q - a.q);

  // 返回语言代码列表
  return languages.map(lang => lang.code);
}

/**
 * 标准化语言代码
 *
 * 将各类语言表示法转换为统一格式：
 * - "en-us" -> "en"
 * - "zh-cn" -> "zh-CN"
 * - "zh-tw" -> "zh-TW"
 * - "zh-hans" -> "zh-CN"
 *
 * @param code - 原始语言代码
 * @returns 标准化后的语言代码，空字符串表示无效输入
 */
function normalizeLanguageCode(code: string): string {
  if (!code) return '';

  // 转换为小写并分割
  const [language, region] = code.toLowerCase().split('-');

  if (!language) return '';

  // 特殊处理：zh-CN 和 zh-TW
  if (language === 'zh') {
    if (region === 'cn' || region === 'hans' || region === 'hans-cn') {
      return 'zh-CN';
    }
    if (region === 'tw' || region === 'hant' || region === 'hant-tw') {
      return 'zh-TW'; // 注意：我们可能不支持zh-TW，但保留处理
    }
    // 默认返回zh-CN
    return 'zh-CN';
  }

  // 其他语言：只返回语言代码
  return language;
}

/**
 * 验证语言代码是否在支持的语言列表中
 *
 * @param language - 待验证的语言代码
 * @returns 是否为支持的语言
 */
function isValidLanguage(language: string): language is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(language as SupportedLanguage);
}

/**
 * 从检测到的语言列表和用户偏好中选择最佳匹配语言
 *
 * 选择优先级：
 * 1. 用户设置的语言（如果有效）
 * 2. 检测到的语言列表中第一个被支持的
 * 3. 默认语言（zh-CN）
 *
 * @param detectedLanguages - 从请求中检测到的语言代码列表（按优先级排序）
 * @param userLanguage      - 用户设置的语言偏好（可选）
 * @returns 最佳匹配的支持语言代码
 */
function selectBestLanguage(
  detectedLanguages: string[],
  userLanguage?: string
): SupportedLanguage {
  // 1. 优先使用用户设置的语言（如果有效）
  if (userLanguage && isValidLanguage(userLanguage)) {
    return userLanguage;
  }

  // 2. 从检测到的语言中选择第一个支持的语言
  for (const lang of detectedLanguages) {
    const normalized = normalizeLanguageCode(lang);
    if (isValidLanguage(normalized)) {
      return normalized;
    }
  }

  // 3. 回退到默认语言
  return DEFAULT_LANGUAGE;
}

/**
 * 语言中间件工厂函数
 *
 * 创建根据配置选项检测和设置用户语言的多源检测中间件。
 * 检测完成后将语言信息附加到 req.language 和响应 Content-Language 头。
 *
 * 检测优先级（受 options 控制）：
 * 1. URL 查询参数（如 ?lang=en）
 * 2. Accept-Language 请求头
 * 3. Cookie 中的语言设置
 * 4. 用户数据库中的语言偏好（需已认证）
 *
 * @param options - 语言检测选项，可覆盖默认配置
 * @returns Express 中间件函数
 */
export function createLanguageMiddleware(options: LanguageDetectionOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const detectedLanguages: string[] = [];

      // 1. 从查询参数检测
      if (opts.fromQueryParam && opts.queryParamName) {
        const queryLang = req.query[opts.queryParamName];
        if (queryLang && typeof queryLang === 'string') {
          detectedLanguages.push(queryLang);
        }
      }

      // 2. 从请求头检测
      if (opts.fromHeader) {
        const headerLang = req.get('Accept-Language');
        if (headerLang) {
          const parsed = parseAcceptLanguage(headerLang);
          detectedLanguages.push(...parsed);
        }
      }

      // 3. 从cookie检测
      if (opts.fromCookie && opts.cookieName) {
        const cookieLang = req.cookies?.[opts.cookieName];
        if (cookieLang && typeof cookieLang === 'string') {
          detectedLanguages.push(cookieLang);
        }
      }

      // 4. 从用户检测（如果已认证）
      let userLanguage: string | undefined;
      if (opts.fromUser && (req as any).user?.id) {
        try {
          const user = await userModel.findById((req as any).user.id);
          if (user?.language) {
            userLanguage = user.language;
          }
        } catch (error) {
          // 忽略错误，继续使用其他检测方法
          console.warn('获取用户语言偏好失败:', error);
        }
      }

      // 5. 选择最佳语言
      const selectedLanguage = selectBestLanguage(detectedLanguages, userLanguage);

      // 将语言信息附加到请求对象
      (req as any).language = selectedLanguage;
      (req as any).languageDetected = true;
      (req as any).languageSources = {
        fromQueryParam: opts.fromQueryParam && req.query[opts.queryParamName || 'lang'] ? true : false,
        fromHeader: opts.fromHeader && req.get('Accept-Language') ? true : false,
        fromUser: userLanguage ? true : false,
        fromCookie: opts.fromCookie && req.cookies?.[opts.cookieName || 'language'] ? true : false,
      };

      // 设置响应头
      res.setHeader('Content-Language', selectedLanguage);

      // 将语言信息也附加到响应对象，以便在需要时使用
      (res as any).language = selectedLanguage;

      next();
    } catch (error) {
      console.error('语言中间件错误:', error);
      // 出错时使用默认语言
      (req as any).language = DEFAULT_LANGUAGE;
      (req as any).languageDetected = false;
      res.setHeader('Content-Language', DEFAULT_LANGUAGE);
      next();
    }
  };
}

/**
 * 获取当前请求的语言
 *
 * 在路由处理器中调用此函数获取已检测到的语言代码。
 *
 * @param req - Express 请求对象
 * @returns 当前请求的语言代码，默认返回 zh-CN
 */
export function getRequestLanguage(req: Request): SupportedLanguage {
  return (req as any).language || DEFAULT_LANGUAGE;
}

/**
 * 设置响应语言 cookie
 *
 * 将用户选择的语言持久化到浏览器 cookie 中，以便后续访问时自动识别。
 *
 * @param res      - Express 响应对象
 * @param language - 要设置的语言代码
 * @param options  - Cookie 配置选项
 * @param options.maxAge   - Cookie 有效期（毫秒），默认 1 年
 * @param options.path     - Cookie 路径，默认 "/"
 * @param options.domain   - Cookie 域名（可选）
 * @param options.secure   - 是否仅 HTTPS 传输，生产环境默认 true
 * @param options.httpOnly - 是否禁止 JavaScript 访问，默认 true
 * @param options.sameSite - SameSite 策略，默认 "lax"
 */
export function setLanguageCookie(res: Response, language: SupportedLanguage, options: {
  maxAge?: number;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
} = {}) {
  const {
    maxAge = 365 * 24 * 60 * 60 * 1000, // 1年
    path = '/',
    domain,
    secure = process.env.NODE_ENV === 'production',
    httpOnly = true,
    sameSite = 'lax',
  } = options;

  res.cookie('language', language, {
    maxAge,
    path,
    domain,
    secure,
    httpOnly,
    sameSite,
  });
}

/**
 * 语言验证中间件
 *
 * 检查请求中检测到的语言是否在支持语言列表中，
 * 如果不支持则返回 400 错误，并列出所有支持的语言。
 *
 * @param req  - Express 请求对象
 * @param res  - Express 响应对象
 * @param next - Express 下一个中间件函数
 * @returns 语言有效时调用 next()，无效则返回 400
 */
export function validateLanguageMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const language = (req as any).language || DEFAULT_LANGUAGE;

  if (!isValidLanguage(language)) {
    return res.status(400).json({
      success: false,
      error: '不支持的语言',
      message: `不支持的语言代码: ${language}`,
      supportedLanguages: SUPPORTED_LANGUAGES,
    });
  }

  return next();
}

/** 默认语言中间件实例（使用默认选项） */
export const languageMiddleware = createLanguageMiddleware();

export default {
  createLanguageMiddleware,
  languageMiddleware,
  getRequestLanguage,
  setLanguageCookie,
  validateLanguageMiddleware,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
};
