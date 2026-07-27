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
import { hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider, hydrate } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import { ConfigProvider } from 'antd'
import { AuthProvider } from '../src/contexts/AuthContext'
import { NotificationProvider } from '../src/contexts/NotificationContext'
import App from '../src/App'
import { queryClient } from '../src/lib/queryClient'
// 初始化 react-i18next 插件（含 LanguageDetector），确保 i18n.changeLanguage() 可用
import '../src/i18n'

// 不导出任何 vite-plugin-ssr 钩子，避免加载客户端路由运行时
// 此文件作为自执行 hydration 入口，由 SSR 模板直接引用

/**
 * 从服务端注入的反序列化缓存数据
 *
 * 在 SSR 阶段，服务端会将 React Query 的缓存数据序列化并注入到 HTML 的
 * window.__DEHYDRATED_STATE__ 变量中。客户端通过该变量恢复缓存状态，
 * 避免在 hydration 后重新发起网络请求。
 */
const dehydratedState = (window as any).__DEHYDRATED_STATE__

/**
 * 恢复服务端预取的 React Query 缓存数据
 *
 * 如果服务端注入了脱水（dehydrated）状态数据，
 * 则在 hydrateRoot 之前将数据重新注入到 QueryClient 中，
 * 确保客户端能直接使用服务端获取的数据，无需额外请求。
 */
if (dehydratedState) {
  hydrate(queryClient, dehydratedState)
}

/**
 * 获取页面根挂载点，并执行 React 应用的 hydration
 *
 * 获取 SSR 生成的 DOM 容器节点（id="root"），
 * 使用 hydrateRoot 将 React 组件树激活为可交互的应用。
 *
 * 组件树外层包裹了以下全局 Provider（从外到内）：
 * 1. ConfigProvider    - Ant Design 全局配置（主题、国际化等）
 * 2. HelmetProvider    - 页面头部管理（SEO meta 标签、标题等）
 * 3. QueryClientProvider - React Query 服务端状态管理
 * 4. AuthProvider      - 用户认证上下文
 * 5. NotificationProvider - 全局通知上下文
 * 6. BrowserRouter     - 客户端路由
 *
 * 这种 Provider 嵌套顺序确保了内层组件可以访问外层提供的所有上下文。
 */
const root = document.getElementById('root')
if (root) {
  hydrateRoot(
    root,
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
}