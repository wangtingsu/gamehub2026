/**
 * 客户端渲染入口文件（浏览器端 hydration）
 *
 * 该文件是 GameHub 在浏览器端的渲染入口点。
 * 当服务器端渲染（SSR）生成的 HTML 加载到浏览器后，
 * 此文件负责执行 hydration 过程，将静态 HTML 激活为可交互的 React 应用。
 *
 * 职责：
 * - 从 window.__DEHYDRATED_STATE__ 恢复服务端预取的 React Query 缓存数据
 * - 使用 hydrateRoot 将 React 组件树挂载到 SSR 生成的 DOM 节点上
 * - 配置所有全局 Provider 组件（路由、状态管理、UI 库、认证、国际化等）
 *
 * 注意：
 * - 此文件不自导任何 vite-plugin-ssr 钩子，避免加载客户端路由运行时
 * - 作为自执行 hydration 入口，由 SSR 模板（_default.page.server.tsx）生成的 HTML 直接引用
 */

import React from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider, hydrate } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import { ConfigProvider } from 'antd'
import { AuthProvider } from '../src/contexts/AuthContext'
import { NotificationProvider } from '../src/contexts/NotificationContext'
import App from '../src/App'
import { queryClient } from '../src/lib/queryClient'
import '../src/i18n'
import '../src/index.css'

const dehydratedState = (window as any).__DEHYDRATED_STATE__

if (dehydratedState) {
  hydrate(queryClient, dehydratedState)
}

const AppWrapper = (
  <ConfigProvider>
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

// Vike 注入 pageContext 时使用 hydrateRoot，否则（spa/client-only）使用 createRoot
const pageContextEl = document.getElementById('vike_pageContext')
const root = document.getElementById('root')
if (root) {
  if (pageContextEl) {
    hydrateRoot(root, AppWrapper)
  } else {
    createRoot(root).render(AppWrapper)
  }
}