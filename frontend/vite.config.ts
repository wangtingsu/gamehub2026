/**
 * vite.config.ts - 主应用 Vite 构建配置
 *
 * 为 GameHub 前端提供完整的构建配置，包括：
 * - React + SSR 集成
 * - PWA 支持（离线缓存、API 缓存、图片缓存、字体缓存）
 * - 构建时图片优化（自动转换为 webp/avif）
 * - 构建包分析
 * - 开发服务器代理配置（API、WebSocket、管理后台、SEO 文件）
 * - 代码分割（vendor、UI、工具库、API 层、布局组件、搜索、通知等）
 * - 安全头部（Content-Security-Policy）
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import vike from 'vike/plugin'
import { VitePWA } from 'vite-plugin-pwa'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // 资源基础路径，可通过 VITE_CDN_URL 环境变量覆盖，用于 CDN 部署
  base: process.env.VITE_CDN_URL || '/',
  plugins: [
    react({}),
    // Vike SSR — enabled in production build, disabled in dev
    ...(mode === 'production' ? [vike()] : []),
    // PWA 配置：可通过 VITE_DISABLE_PWA 环境变量关闭
    process.env.VITE_DISABLE_PWA ? undefined : VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/**/*'],
      selfDestroying: true,
      manifest: {
        name: 'GameHub',
        short_name: 'GameHub',
        description: '游戏社区平台 - 发现、评测、分享游戏',
        theme_color: '#1677ff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/favicon.ico', sizes: '64x64', type: 'image/x-icon' },
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['assets/**/*.{js,css,woff2,woff}'],
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//, /^\/health/, /^\/metrics/],
        runtimeCaching: [
          {
            // API 缓存策略：StaleWhileRevalidate，缓存 1 小时
            urlPattern: /^https?:\/\/api\.gamehub\.example\.com\/api\/v1\/(games|news|reviews)/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 },
            },
          },
          {
            // 图片缓存策略：CacheFirst，缓存 30 天
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // 字体缓存策略：CacheFirst，缓存 365 天
            urlPattern: /^https?:\/\/fonts\.(?:googleapis|gstatic)\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'font-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
    // 图片优化 — 构建时自动转换为 webp/avif 格式并压缩
    ViteImageOptimizer({
      includePublic: true,
      png: { quality: 80 },
      jpeg: { quality: 80, progressive: true },
      jpg: { quality: 80, progressive: true },
      webp: { quality: 75, lossless: false },
      avif: { quality: 60, lossless: false },
      svg: { multipass: true },
    }),
    // 构建包可视化分析器
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html'
    }),
  ],
  build: {
    target: 'es2020',
    minify: 'terser',
    manifest: true,
    sourcemap: process.env.NODE_ENV !== 'production',
    rollupOptions: {
      output: {
        // 代码分割策略：将不同模块分离为独立 chunk，优化加载性能
        manualChunks(id) {
          // node_modules 按模块分组
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'vendor';
            if (id.includes('antd') || id.includes('@ant-design/icons')) return 'ui';
            if (id.includes('axios') || id.includes('date-fns') || id.includes('i18next') || id.includes('framer-motion')) return 'utils';
            if (id.includes('@tanstack/react-query')) return 'auth';
            if (id.includes('@sentry')) return 'sentry';
            return 'vendor';
          }
          // src/ 代码按功能模块分割
          if (id.includes('/src/api/')) return 'api';
          if (id.includes('/src/contexts/')) return 'contexts';
          if (id.includes('/src/components/Layout') || id.includes('/src/components/Navbar') || id.includes('/src/components/Footer')) return 'layout';
          if (id.includes('/src/components/SearchBar')) return 'search';
          if (id.includes('/src/components/NotificationBell')) return 'notifications';
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
    open: true,
    hmr: {
      overlay: true  // 热更新错误时显示覆盖层
    },
    headers: {
      // Content-Security-Policy 安全策略头部
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.sentry-cdn.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' http://localhost:* ws://localhost:* https://api.gamehub.example.com https://sentry.io; frame-src 'none'; object-src 'none'",
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true,  // WebSocket 支持
      },
      '/admin-api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/admin-api/, '/api'),
      },
      '/llms.txt': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/llms-full.txt': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/sitemap.xml': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'socket.io-client', 'dayjs'],
    exclude: ['@sentry/react'],
    force: true,
  },
  ssr: {
    target: 'node',
  },
}))
