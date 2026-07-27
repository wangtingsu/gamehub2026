import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// 同步加载所有语言的翻译资源（全命名空间预加载，避免 H1/H2 显示 i18n key）
import zhCN from './locales/zh-CN/common.json';
import zhCNGames from './locales/zh-CN/games.json';
import zhCNAuth from './locales/zh-CN/auth.json';
import zhCNSNews from './locales/zh-CN/news.json';
import zhCNReviews from './locales/zh-CN/reviews.json';
import zhCNCommunity from './locales/zh-CN/community.json';
import zhCNHome from './locales/zh-CN/home.json';
import zhCNDiscovery from './locales/zh-CN/discovery.json';

import en from './locales/en/common.json';
import enGames from './locales/en/games.json';
import enAuth from './locales/en/auth.json';
import enNews from './locales/en/news.json';
import enReviews from './locales/en/reviews.json';
import enCommunity from './locales/en/community.json';
import enHome from './locales/en/home.json';
import enDiscovery from './locales/en/discovery.json';

import ja from './locales/ja/common.json';
import ko from './locales/ko/common.json';
import fr from './locales/fr/common.json';
import es from './locales/es/common.json';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'zh-CN',
    debug: process.env.NODE_ENV === 'development',
    interpolation: {
      escapeValue: false,
    },
    ns: ['translation', 'games', 'auth', 'news', 'reviews', 'community', 'admin', 'home', 'discovery'],
    defaultNS: 'translation',
    backend: {
      loadPath: (lng: string, ns: string) => {
        const fileName = ns === 'translation' ? 'common' : ns;
        return `/locales/${lng}/${fileName}.json`;
      },
    },
    resources: {
      'en': {
        translation: en,
        games: enGames,
        auth: enAuth,
        news: enNews,
        reviews: enReviews,
        community: enCommunity,
        home: enHome,
        discovery: enDiscovery,
      },
      'zh-CN': {
        translation: zhCN,
        games: zhCNGames,
        auth: zhCNAuth,
        news: zhCNSNews,
        reviews: zhCNReviews,
        community: zhCNCommunity,
        home: zhCNHome,
        discovery: zhCNDiscovery,
      },
      'ja': { translation: ja },
      'ko': { translation: ko },
      'fr': { translation: fr },
      'es': { translation: es },
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      convertDetectedLanguage: (lng: string) => {
        const map: Record<string, string> = {
          'en': 'en', 'zh': 'zh-CN', 'ja': 'ja', 'ko': 'ko', 'es': 'es', 'fr': 'fr',
          'zh-CN': 'zh-CN', 'zh-TW': 'zh-CN', 'zh-HK': 'zh-CN',
        };
        return map[lng] || 'zh-CN';
      },
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;