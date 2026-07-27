import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { HelmetProvider } from 'react-helmet-async'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { queryClient } from './lib/queryClient'
import { createIDBPersister } from './lib/queryPersister'
import './i18n' // 国际化配置
import './index.css'
import '@uiw/react-md-editor/markdown-editor.css'
import App from './App.tsx'

// Sentry 监控初始化
// 扩展Window接口以包含Sentry
declare global {
  interface Window {
    Sentry?: {
      metrics: {
        distribution: (name: string, value: number, options: any) => void;
      };
      captureMessage: (message: string, options?: any) => void;
      captureException: (error: any, context?: any) => void;
    };
  }
}

// Web Vitals性能监控（v5 API）
import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals'
import type { Metric } from 'web-vitals'

// 报告Web Vitals指标
const reportWebVitals = (metric: Metric) => {
  // 发送到监控系统（如Sentry、Google Analytics等）
  const { name, value, id, rating } = metric

  // 发送到Sentry（如果可用）
  if (window.Sentry) {
    window.Sentry.metrics.distribution('web_vitals', value, {
      unit: name,
      tags: { id, rating }
    })
  }

  // 开发环境日志
  if (import.meta.env.DEV) {
    console.log(`📊 Web Vitals - ${name}:`, {
      value: Math.round(value),
      rating,
      id
    })
  }
}

// 监控所有Web Vitals指标
if (import.meta.env.PROD) {
  onCLS(reportWebVitals)
  onINP(reportWebVitals)
  onFCP(reportWebVitals)
  onLCP(reportWebVitals)
  onTTFB(reportWebVitals)
}

// React Query 持久化到 IndexedDB（仅生产环境启用）
if (import.meta.env.PROD) {
  const persister = createIDBPersister()
  persistQueryClient({
    queryClient,
    persister,
    maxAge: 1000 * 60 * 60 * 12, // 12 小时
    buster: import.meta.env.VITE_APP_VERSION || '1.0.0',
  })
}

// 启动时加载用户主题
const savedTheme = localStorage.getItem('app-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <App />
          {/* 开发环境下显示React Query开发工具 */}
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </HelmetProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)

// 延迟初始化 Sentry（不阻塞首屏渲染和交互）
import('./../sentry.config.js').then(m => m.default());
