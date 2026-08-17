import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

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
import jaGames from './locales/ja/games.json';
import jaAuth from './locales/ja/auth.json';
import jaNews from './locales/ja/news.json';
import jaReviews from './locales/ja/reviews.json';
import jaCommunity from './locales/ja/community.json';
import jaHome from './locales/ja/home.json';
import jaDiscovery from './locales/ja/discovery.json';
import jaAdmin from './locales/ja/admin.json';

import ko from './locales/ko/common.json';
import koGames from './locales/ko/games.json';
import koAuth from './locales/ko/auth.json';
import koNews from './locales/ko/news.json';
import koReviews from './locales/ko/reviews.json';
import koCommunity from './locales/ko/community.json';
import koHome from './locales/ko/home.json';
import koDiscovery from './locales/ko/discovery.json';
import koAdmin from './locales/ko/admin.json';

import fr from './locales/fr/common.json';
import frGames from './locales/fr/games.json';
import frAuth from './locales/fr/auth.json';
import frNews from './locales/fr/news.json';
import frReviews from './locales/fr/reviews.json';
import frCommunity from './locales/fr/community.json';
import frHome from './locales/fr/home.json';
import frDiscovery from './locales/fr/discovery.json';
import frAdmin from './locales/fr/admin.json';

import es from './locales/es/common.json';
import esGames from './locales/es/games.json';
import esAuth from './locales/es/auth.json';
import esNews from './locales/es/news.json';
import esReviews from './locales/es/reviews.json';
import esCommunity from './locales/es/community.json';
import esHome from './locales/es/home.json';
import esDiscovery from './locales/es/discovery.json';
import esAdmin from './locales/es/admin.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    interpolation: {
      escapeValue: false,
    },
    ns: ['translation', 'games', 'auth', 'news', 'reviews', 'community', 'admin', 'home', 'discovery'],
    defaultNS: 'translation',
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
      'ja': {
        translation: ja,
        games: jaGames,
        auth: jaAuth,
        news: jaNews,
        reviews: jaReviews,
        community: jaCommunity,
        home: jaHome,
        discovery: jaDiscovery,
        admin: jaAdmin,
      },
      'ko': {
        translation: ko,
        games: koGames,
        auth: koAuth,
        news: koNews,
        reviews: koReviews,
        community: koCommunity,
        home: koHome,
        discovery: koDiscovery,
        admin: koAdmin,
      },
      'fr': {
        translation: fr,
        games: frGames,
        auth: frAuth,
        news: frNews,
        reviews: frReviews,
        community: frCommunity,
        home: frHome,
        discovery: frDiscovery,
        admin: frAdmin,
      },
      'es': {
        translation: es,
        games: esGames,
        auth: esAuth,
        news: esNews,
        reviews: esReviews,
        community: esCommunity,
        home: esHome,
        discovery: esDiscovery,
        admin: esAdmin,
      },
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
        return map[lng] || 'en';
      },
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;