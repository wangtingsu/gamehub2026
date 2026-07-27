/**
 * 客户端 Hydration 入口文件（独立入口）
 *
 * 该文件是 GameHub 在浏览器端的备用 hydration 入口点。
 * 与 renderer/_default.page.client.tsx 功能类似，但作为独立脚本
 * 在 SSR HTML 模板中通过 Nginx try_files 回退引用。
 *
 * 主要职责：
 * 1. 从 window.__DEHYDRATED_STATE__ 恢复服务端预取的 React Query 数据
 * 2. 等待 i18n 国际化初始化完成后，从 URL 路径检测用户语言偏好
 * 3. 使用 createRoot 创建 React 根节点，挂载完整的组件树
 * 4. 配置 Ant Design 深色主题及所有全局 Provider
 *
 * 与 _default.page.client.tsx 的区别：
 * - 此文件额外包含 i18n 初始化等待逻辑和主题配置
 * - 使用 createRoot 而非 hydrateRoot（作为纯客户端回退入口）
 * - 在生产环境部署中作为独立的 bundle 被引用
 *
 * 注意：前端已包含 BrowserRouter，因此在组件树外层包裹 BrowserRouter
 */

import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider, hydrate } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import { ConfigProvider, theme } from 'antd'
import { AuthProvider } from '../src/contexts/AuthContext'
import { NotificationProvider } from '../src/contexts/NotificationContext'
import App from '../src/App'
import { queryClient } from '../src/lib/queryClient'
import i18n from '../src/i18n'
import '../src/index.css'

/**
 * 从服务端注入的反序列化缓存数据
 *
 * 恢复 SSR 阶段预取的 React Query 缓存数据，
 * 避免 hydration 后重复发起网络请求。
 * 数据来源：_default.page.server.tsx 中的
 * window.__DEHYDRATED_STATE__ 内联脚本。
 */
const dehydratedState = (window as any).__DEHYDRATED_STATE__
if (dehydratedState) {
  hydrate(queryClient, dehydratedState)
}

/**
 * 等待 i18n 国际化初始化完成
 *
 * i18n 初始化完成后执行以下操作：
 * 1. 从浏览器 URL 路径中检测用户语言（如 /en, /cn, /ja 等）
 * 2. 设置 i18n 的当前语言，确保页面以正确语言显示
 * 3. 使用 createRoot 将 React 应用挂载到 DOM 上
 *
 * 组件树 Provider 层级（从外到内）：
 * 1. ConfigProvider    - Ant Design 深色主题配置
 * 2. HelmetProvider    - 页面头部管理（SEO）
 * 3. QueryClientProvider - 服务端状态缓存
 * 4. AuthProvider      - 用户认证上下文
 * 5. NotificationProvider - 全局通知
 * 6. BrowserRouter     - 客户端路由
 */
i18n.init().then(() => {
  const langMatch = window.location.pathname.match(/^\/([a-z]{2}(-[A-Z]{2})?)/)
  if (langMatch) {
    i18n.changeLanguage(langMatch[1])
  }
  createRoot(
    document.getElementById('root')!).render(
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorBgContainer: '#1e293b',
          colorText: '#f1f5f9',
          colorTextSecondary: '#94a3b8',
          colorBorder: '#334155',
        },
      }}
    >
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <NotificationProvider>
              <BrowserRouter>
              <App />
            </BrowserRouter>
            </NotificationProvider>
          </AuthProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ConfigProvider>
  )
})
