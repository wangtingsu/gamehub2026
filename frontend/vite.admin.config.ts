/**
 * vite.admin.config.ts - 管理后台专属 Vite 构建配置
 *
 * 用于构建管理后台（admin）的独立 bundle
 * 输出到 dist/admin 目录，以 admin.html 为入口
 * 开发服务器运行在 3003 端口，代理 /api 到管理后台服务
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react({}),
  ],
  build: {
    target: 'es2020',
    minify: 'terser',
    manifest: true,
    sourcemap: false,
    outDir: 'dist/admin',  // 输出到独立目录，与主应用隔离
    rollupOptions: {
      input: 'admin.html',  // 管理后台入口 HTML
      output: {
        // 代码分割策略：分离 vendor、UI 库、工具库、API 层和管理后台页面
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'vendor';
            if (id.includes('antd') || id.includes('@ant-design/icons')) return 'ui';
            if (id.includes('axios') || id.includes('date-fns') || id.includes('framer-motion')) return 'utils';
            if (id.includes('@tanstack/react-query')) return 'query';
            if (id.includes('@sentry')) return 'sentry';
            return 'vendor';
          }
          if (id.includes('/src/api/')) return 'api';
          if (id.includes('/src/contexts/')) return 'contexts';
          // 按管理后台页面模块分割
          if (id.includes('/src/pages/admin/')) {
            const match = id.match(/\/pages\/admin\/(\w+)/);
            if (match) return `admin-${match[1].toLowerCase()}`;
          }
        },
      },
    },
  },
  server: {
    port: 3003,
    host: true,
    // 开发时代理 /api 请求到管理后台服务（3002 端口）
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: ['@sentry/react'],
  },
})
