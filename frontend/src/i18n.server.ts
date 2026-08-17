// SSR 安全版 i18n 初始化
// 不含浏览器专用插件 (LanguageDetector, Backend)
// 翻译资源通过静态 import 加载
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import zhCN from './locales/zh-CN/common.json';
import en from './locales/en/common.json';
import ja from './locales/ja/common.json';
import ko from './locales/ko/common.json';
import fr from './locales/fr/common.json';
import es from './locales/es/common.json';

i18n
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    resources: {
      'zh-CN': { translation: zhCN },
      'en': { translation: en },
      'ja': { translation: ja },
      'ko': { translation: ko },
      'fr': { translation: fr },
      'es': { translation: es },
    },
    ns: ['translation', 'games', 'auth', 'news', 'reviews', 'community', 'admin', 'home', 'discovery'],
    defaultNS: 'translation',
    lng: 'en',
    react: {
      useSuspense: false,
    },
  });

export default i18n;
