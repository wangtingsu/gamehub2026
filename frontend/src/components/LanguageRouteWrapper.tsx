/**
 * LanguageRouteWrapper（语言路由包装器）组件
 *
 * 负责处理基于 URL 路径的多语言路由支持。
 * 路由模式为 /:lang/...，从路径参数中提取语言标识，
 * 验证其合法性后同步到 i18next 国际化引擎。
 *
 * 支持的语言：en（英语）、cn（中文）、ja（日语）、ko（韩语）、es（西班牙语）、fr（法语）
 */

import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/**
 * LanguageRouteWrapper 组件的属性类型定义
 *
 * @property children - 需要包裹的子组件/路由内容
 */
interface LanguageRouteWrapperProps {
  children: React.ReactNode;
}

/**
 * 支持的语言列表（常量）
 * URL 路径前缀使用简短代码，避免每次渲染时重建数组以提高性能。
 * 这些短代码会被映射到 i18n 的完整语言代码。
 */
const supportedLanguages = ['en', 'cn', 'ja', 'ko', 'es', 'fr'];

/** 默认语言（英文），当语言参数无效时回退到此值 */
const defaultLanguage = 'en';

/**
 * URL 路径代码到 i18n 语言代码的映射表
 * 键为 URL 中使用的短代码，值为 i18next 所需的完整语言标识。
 * 例如："cn" → "zh-CN"
 */
const urlLangToI18n: Record<string, string> = {
  en: 'en',
  cn: 'zh-CN',
  ja: 'ja',
  ko: 'ko',
  es: 'es',
  fr: 'fr',
};

/**
 * LanguageRouteWrapper 组件
 *
 * 路由级多语言包装器。根据 URL 路径中的 :lang 参数执行以下操作：
 * 1. 验证语言参数是否在受支持的语言列表中
 * 2. 若参数无效或缺失，重定向到默认语言（中文）首页
 * 3. 首次挂载或语言变更时，同步更新 i18next 的语言设置
 * 4. 在重定向期间显示加载状态
 *
 * @param props.children - 需要包裹的子组件
 *
 * @example
 * <Route path="/:lang" element={<LanguageRouteWrapper><App /></LanguageRouteWrapper>} />
 */
const LanguageRouteWrapper = ({ children }: LanguageRouteWrapperProps) => {
  const { lang } = useParams<{ lang: string }>();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const prevLangRef = useRef<string | undefined>(undefined);
  const hasSyncedRef = useRef(false);

  /**
   * 语言参数监听与 i18n 同步副作用
   *
   * 当 URL 中的 lang 参数发生变化时：
   * - 若 lang 为空或无效，重定向到默认语言
   * - 若 lang 有效且与当前 i18n 语言不同，调用 i18n.changeLanguage() 切换语言
   * - 使用 prevLangRef 防止重复同步，使用 hasSyncedRef 标记首次同步状态
   */
  useEffect(() => {
    // 如果语言参数无效，重定向到默认语言
    if (!lang) {
      navigate(`/${defaultLanguage}`, { replace: true });
      return;
    }

    if (!supportedLanguages.includes(lang)) {
      // 例如 /zh-CN/cn → /cn，直接跳到默认语言首页
      navigate(`/${defaultLanguage}`, { replace: true });
      return;
    }

    // 首次挂载或语言改变时，同步 i18n 语言
    if (!hasSyncedRef.current || prevLangRef.current !== lang) {
      i18n.changeLanguage(urlLangToI18n[lang] || lang);
      hasSyncedRef.current = true;
    }

    prevLangRef.current = lang;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // 如果语言参数无效或正在重定向，显示加载状态
  if (!lang || !supportedLanguages.includes(lang)) {
    return <div className="flex justify-center items-center h-screen">Loading language...</div>;
  }

  return <>{children}</>;
};

export default LanguageRouteWrapper;