/**
 * 管理后台独立入口文件
 *
 * 该文件是 GameHub 管理后台的独立渲染入口点。
 * 与主站前端分离打包，作为一个独立的应用运行。
 *
 * 为何独立：
 * - 管理后台与主站前端使用不同的构建入口和路由体系
 * - 管理后台页面仅管理员可访问，不需要主站的完整功能
 * - 独立加载可以减少主站前端 bundle 的体积
 * - 管理后台路由使用 /admin 前缀，与主站前端分发路由不重叠
 *
 * 职责：
 * - 创建独立的 React 根节点渲染管理后台
 * - 配置管理后台特有的路由系统（/admin/*）
 * - 提供管理后台页面的懒加载和错误边界
 * - 根路径自动重定向到 /admin/dashboard
 */

import { StrictMode, lazy, Suspense, ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import './index.css'
import LoadingSpinner from './components/LoadingSpinner'
import SentryErrorBoundary from './components/SentryErrorBoundary'

/**
 * 管理后台页面安全包装器组件
 *
 * 为管理后台的每个页面组件提供统一的错误边界和加载状态处理。
 * - SentryErrorBoundary：捕获页面渲染错误，上报 Sentry 监控
 * - Suspense：懒加载页面组件加载时显示 LoadingSpinner 占位
 *
 * @param children - 被包裹的子组件（通常是懒加载的管理后台页面组件）
 * @returns 包含错误边界和 Suspense 的包装组件
 */
function PageSuspense({ children }: { children: ReactNode }) {
  return (
    <SentryErrorBoundary>
      <Suspense fallback={<LoadingSpinner />}>
        {children}
      </Suspense>
    </SentryErrorBoundary>
  );
}

/**
 * 所有管理后台页面组件均使用懒加载（代码分割）
 *
 * 由于管理后台只有管理员才能访问，访问频率远低于主站页面，
 * 因此所有后台组件都使用 React.lazy 进行懒加载，
 * 减少首次加载时需要下载的 JS 体积。
 */
const AdminLayout = lazy(() => import('./pages/admin/components/AdminLayout'))
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'))
const AnalyticsPage = lazy(() => import('./pages/admin/Analytics'))
const ProfilingPage = lazy(() => import('./pages/admin/Profiling'))
const UserManagement = lazy(() => import('./pages/admin/Users'))
const GameManagement = lazy(() => import('./pages/admin/Games'))
const ContentManagement = lazy(() => import('./pages/admin/Content'))
const AboutManagement = lazy(() => import('./pages/admin/About/AboutManagement'))
const AdminMonitoring = lazy(() => import('./pages/admin/Monitoring'))
const AuditLogsPage = lazy(() => import('./pages/admin/AuditLogs'))
const SystemSettings = lazy(() => import('./pages/admin/Settings'))
const UploadManager = lazy(() => import('./pages/admin/Uploads'))
const EmailManager = lazy(() => import('./pages/admin/Email'))
const DeploymentsPage = lazy(() => import('./pages/admin/Deployments'))
const BackupsPage = lazy(() => import('./pages/admin/Backups'))
const AdminLogin = lazy(() => import('./pages/admin/Login'))
const AdminReviewQueue = lazy(() => import('./pages/admin/ReviewQueue'))
const AdminRecommend = lazy(() => import('./pages/admin/Recommend'))
const AdminNotifications = lazy(() => import('./pages/admin/Notifications'))
const AdminBlogs = lazy(() => import('./pages/admin/Blogs'))

/**
 * 管理后台路由配置组件
 *
 * 定义管理后台的所有路由规则，包含在 AdminLayout 布局下的所有子页面。
 *
 * 路由结构：
 * /admin 或 /admin/ → 重定向到 /admin/dashboard
 * /admin/dashboard       - 仪表盘首页
 * /admin/analytics       - 数据分析
 * /admin/profiling       - 性能分析
 * /admin/users           - 用户管理
 * /admin/games           - 游戏管理
 * /admin/review-queue    - 审核队列
 * /admin/content         - 内容管理（含 news/reviews/community/guides 子标签）
 * /admin/about           - 关于页面管理
 * /admin/monitoring      - 系统监控
 * /admin/audit-logs      - 审计日志
 * /admin/settings        - 系统设置
 * /admin/uploads         - 文件上传管理
 * /admin/email           - 邮件管理
 * /admin/deployments     - 部署管理
 * /admin/backups         - 备份管理
 * /admin/login           - 管理员登录
 *
 * 注意：
 * - 每个路由都使用 PageSuspense 包裹，确保独立错误边界
 * - 根路径 "/" 和未匹配路径 "*" 都重定向到 /admin/dashboard
 *
 * @returns 管理后台的 React Router 路由配置
 */
function AdminRoutes() {
  return (
    <Routes>
      <Route path="/admin" element={
        <PageSuspense>
          <AdminLayout />
        </PageSuspense>
      }>
        <Route index element={<Navigate to="dashboard" />} />
        <Route path="dashboard" element={
          <PageSuspense><AdminDashboard /></PageSuspense>
        } />
        <Route path="analytics" element={
          <PageSuspense><AnalyticsPage /></PageSuspense>
        } />
        <Route path="profiling" element={
          <PageSuspense><ProfilingPage /></PageSuspense>
        } />
        <Route path="users" element={
          <PageSuspense><UserManagement /></PageSuspense>
        } />
        <Route path="games" element={
          <PageSuspense><GameManagement /></PageSuspense>
        } />
        <Route path="review-queue" element={
          <PageSuspense><AdminReviewQueue /></PageSuspense>
        } />
        <Route path="recommend" element={
          <PageSuspense><AdminRecommend /></PageSuspense>
        } />
        <Route path="notifications" element={
          <PageSuspense><AdminNotifications /></PageSuspense>
        } />
        <Route path="blogs" element={
          <PageSuspense><AdminBlogs /></PageSuspense>
        } />
        <Route path="content" element={
          <PageSuspense><ContentManagement /></PageSuspense>
        }>
          <Route index element={null} />
          <Route path="news" element={null} />
          <Route path="blogs" element={null} />
          <Route path="blogspaces" element={null} />
          <Route path="reviews" element={null} />
          <Route path="community" element={null} />
          <Route path="guides" element={null} />
        </Route>
        <Route path="about" element={
          <PageSuspense><AboutManagement /></PageSuspense>
        } />
        <Route path="monitoring" element={
          <PageSuspense><AdminMonitoring /></PageSuspense>
        } />
        <Route path="audit-logs" element={
          <PageSuspense><AuditLogsPage /></PageSuspense>
        } />
        <Route path="settings" element={
          <PageSuspense><SystemSettings /></PageSuspense>
        } />
        <Route path="uploads" element={
          <PageSuspense><UploadManager /></PageSuspense>
        } />
        <Route path="email" element={
          <PageSuspense><EmailManager /></PageSuspense>
        } />
        <Route path="deployments" element={
          <PageSuspense><DeploymentsPage /></PageSuspense>
        } />
        <Route path="backups" element={
          <PageSuspense><BackupsPage /></PageSuspense>
        } />
        <Route path="login" element={
          <PageSuspense><AdminLogin /></PageSuspense>
        } />
      </Route>

      {/* 根路径重定向到 /admin/dashboard */}
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
}

/**
 * 挂载管理后台应用到 DOM
 *
 * 获取页面根挂载点（id="root"），创建 React 根节点并渲染管理后台。
 *
 * 渲染层级（从外到内）：
 * 1. StrictMode        - React 严格模式（开发环境会检查潜在问题）
 * 2. QueryClientProvider - React Query 状态管理
 * 3. ConfigProvider    - Ant Design 全局配置
 * 4. BrowserRouter     - 客户端路由
 * 5. AdminRoutes       - 管理后台路由配置
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider>
        <BrowserRouter>
          <AdminRoutes />
        </BrowserRouter>
      </ConfigProvider>
    </QueryClientProvider>
  </StrictMode>,
)
