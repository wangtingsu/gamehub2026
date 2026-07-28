/**
 * 应用根组件（App.tsx）
 *
 * 这是 GameHub 前端的核心路由和布局入口文件。
 * 定义了整个应用的组件树结构、全局配置、路由系统以及懒加载策略。
 *
 * 职责：
 * - 配置 Ant Design 深色主题
 * - 设置 React Router 路由系统（支持多语言前缀路由）
 * - 使用 React.lazy 实现页面级代码分割
 * - 提供全局错误边界（SentryErrorBoundary）
 * - 管理管理后台独立路由体系
 * - 处理旧路径重定向（如 /reviews -> /community）
 * - 实现基于浏览器语言的首屏自动重定向
 *
 * 路由结构：
 * - /：自动检测浏览器语言并重定向到对应语言版本
 * - /:lang/*：带语言前缀的主站路由（Layout 包裹）
 * - /admin/*：管理后台路由（AdminLayout，独立布局）
 * - /oauth/callback：第三方登录回调
 *
 * 性能优化：
 * - 所有页面组件均使用 React.lazy 懒加载
 * - PageSuspense 组件统一提供 loading fallback
 * - 管理后台组件单独懒加载（访问频率低）
 */

import { Routes, Route, Navigate, useParams } from 'react-router-dom';

/**
 * SSR 安全的导航组件
 *
 * React Router 的 Navigate 组件在 StaticRouter（SSR 环境）下不受支持，
 * 会抛出错误。该组件在服务端渲染时直接返回 null，确保 SSR 流程不出错，
 * 仅在浏览器端执行实际的导航跳转。
 *
 * @param props.to - 目标路径
 * @param props.replace - 是否使用 replace 模式（默认 false）
 * @returns 在 SSR 中返回 null，在浏览器中返回 <Navigate />
 */
const SafeNavigate = (props: { to: string; replace?: boolean }) => {
  if (typeof window === 'undefined') return null;
  return <Navigate {...props} />;
};

	const SafeNavigateWithQuery = (props: { to: string; replace?: boolean }) => {
		if (typeof window === 'undefined') return null;
		const currentSearch = window.location.search;
		return <Navigate to={props.to + currentSearch} replace={props.replace} />;
	};

/**
 * 语言代码到 URL 前缀的映射表
 *
 * 将浏览器语言检测到的语言代码（如 "zh-CN"）映射到
 * URL 路径中使用的短前缀（如 "cn"）。
 */
const urlLangToPrefix: Record<string, string> = { 'en': 'en', 'zh-CN': 'cn', 'ja': 'ja', 'ko': 'ko', 'es': 'es', 'fr': 'fr' };

/**
 * 根路径自动重定向组件
 *
 * 当用户访问根路径 "/" 时，该组件根据浏览器的语言偏好设置，
 * 自动将用户重定向到对应的语言前缀版本。
 *
 * 检测优先级：
 * 1. localStorage 中存储的 i18n 语言偏好
 * 2. 浏览器 navigator.language
 * 3. 默认中文（cn）
 *
 * @param props.path - 可选路径后缀，如 "login" 则跳转到 "/en/login"
 * @returns 在 SSR 中返回 null，在浏览器中执行重定向导航
 */
function RootRedirect({ path }: { path?: string }) {
  if (typeof window === 'undefined') return null;
  const detected = localStorage.getItem('i18nextLng') || navigator.language || 'zh-CN';
  const prefix = urlLangToPrefix[detected] || urlLangToPrefix[detected.split('-')[0]] || 'cn';
  const suffix = path ? `/${path}` : '';
  return <Navigate to={`/${prefix}${suffix}`} replace />;
}
import { lazy, Suspense, ReactNode, useState, useEffect } from 'react';
import { ConfigProvider, theme } from 'antd';
import { AuthProvider, ProtectedRoute } from './contexts/AuthContext';
import LoadingSpinner from './components/LoadingSpinner';
import SentryErrorBoundary, { SentryErrorBoundaryWrapped } from './components/SentryErrorBoundary';
import LanguageRouteWrapper from './components/LanguageRouteWrapper';
import ScrollToTop from './components/ScrollToTop';

import { NotificationProvider } from './contexts/NotificationContext';
import Layout from './components/Layout';

// 所有页面组件均使用懒加载（代码分割），由 PageSuspense 提供 fallback
const HomePage = lazy(() => import('./pages/HomePage'));
const GamesPage = lazy(() => import('./pages/GamesPage'));
const CategoryGamesPage = lazy(() => import('./pages/CategoryGamesPage'));
const GameDetailPage = lazy(() => import('./pages/GameDetailPage'));
const GameForumPage = lazy(() => import('./pages/GameForumPage'));
const CommunityForumHubPage = lazy(() => import('./pages/CommunityForumHubPage'));
const NewsPage = lazy(() => import('./pages/NewsPage'));
const CategoryNewsPage = lazy(() => import('./pages/CategoryNewsPage'));
const NewsDetailPage = lazy(() => import('./pages/NewsDetailPage'));
const ReviewsPage = lazy(() => import('./pages/ReviewsPage'));
const ReviewDetailPage = lazy(() => import('./pages/ReviewDetailPage'));
const ReviewNewPage = lazy(() => import('./pages/ReviewNewPage'));
const PostNewPage = lazy(() => import('./pages/PostNewPage'));
const GuidesPage = lazy(() => import('./pages/GuidesPage'));
const GuideDetailPage = lazy(() => import('./pages/GuideDetailPage'));
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const CommunityPostDetailPage = lazy(() => import('./pages/CommunityPostDetailPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const CareersPage = lazy(() => import('./pages/CareersPage'));
const PressPage = lazy(() => import('./pages/PressPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const PrintOrderPage = lazy(() => import('./pages/PrintOrderPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const BlogSpacePage = lazy(() => import('./pages/BlogSpacePage'));
const BlogDetailPage = lazy(() => import('./pages/BlogDetailPage'));
const BlogNewPage = lazy(() => import('./pages/BlogNewPage'));
const BlogEditPage = lazy(() => import('./pages/BlogEditPage'));
const MyBlogsPage = lazy(() => import('./pages/MyBlogsPage'));
const OnlineGamesPage = lazy(() => import('./pages/OnlineGamesPage'));
const GamePlayPage = lazy(() => import('./pages/GamePlayPage'));
const LegalPage = lazy(() => import('./pages/LegalPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const OAuthCallbackPage = lazy(() => import('./pages/OAuthCallbackPage'));
const SearchResultsPage = lazy(() => import('./pages/SearchResultsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const GameLibraryPage = lazy(() => import('./pages/GameLibraryPage'));
const DiscoveryPage = lazy(() => import('./pages/DiscoveryPage'));
const TrendingPage = lazy(() => import('./pages/TrendingPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const InboxPage = lazy(() => import('./pages/InboxPage'));
const ConversationPage = lazy(() => import('./pages/ConversationPage'));
const AchievementsPage = lazy(() => import('./pages/AchievementsPage'));
const PersonalCenterPage = lazy(() => import('./pages/PersonalCenterPage'));
const AiAssistantPage = lazy(() => import('./pages/AiAssistantPage'));
const CozyGamesPage = lazy(() => import('./pages/CozyGamesPage'));
const FreeGamesPage = lazy(() => import('./pages/FreeGamesPage'));
const AIGamingPage = lazy(() => import('./pages/AIGamingPage'));
const SoulStation = lazy(() => import('./components/ai/SoulStation'));
const GameNPC = lazy(() => import('./components/ai/GameNPC'));
const GameCompanion = lazy(() => import('./components/ai/GameCompanion'));

// 管理员页面懒加载（访问频率低）
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const UserManagement = lazy(() => import('./pages/admin/Users'));
const GameManagement = lazy(() => import('./pages/admin/Games'));
const ContentManagement = lazy(() => import('./pages/admin/Content'));
const AboutManagement = lazy(() => import('./pages/admin/About/AboutManagement'));
const AdminMonitoring = lazy(() => import('./pages/admin/Monitoring'));
const AuditLogsPage = lazy(() => import('./pages/admin/AuditLogs'));
const RecommendPage = lazy(() => import('./pages/admin/Recommend'));
const ReviewQueuePage = lazy(() => import('./pages/admin/ReviewQueue'));
const SystemSettings = lazy(() => import('./pages/admin/Settings'));
const UploadManager = lazy(() => import('./pages/admin/Uploads'));
const EmailManager = lazy(() => import('./pages/admin/Email'));
const AnalyticsPage = lazy(() => import('./pages/admin/Analytics'));
const ProfilingPage = lazy(() => import('./pages/admin/Profiling'));
const DeploymentsPage = lazy(() => import('./pages/admin/Deployments'));
const BackupsPage = lazy(() => import('./pages/admin/Backups'));
const AdminNotifications = lazy(() => import('./pages/admin/Notifications'));
const AdminLogin = lazy(() => import('./pages/admin/Login'));
const AdminLayout = lazy(() => import('./pages/admin/components/AdminLayout'));

/**
 * 页面安全包装器组件
 *
 * 为每个页面组件提供统一的错误边界和加载状态处理。
 * 包裹在外部可以确保：
 * - 单个页面的渲染错误不会导致整个应用崩溃（SentryErrorBoundary 捕获）
 * - 懒加载页面组件加载过程中显示 LoadingSpinner 占位
 *
 * @param children - 被包裹的子组件（通常是懒加载的页面组件）
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
 * 旧版评测路径重定向组件
 *
 * 将旧的 /reviews/:id 路径重定向到 /community/reviews/:id，
 * 保持向后兼容性，确保老链接仍然有效。
 *
 * @returns 执行重定向导航的 SafeNavigate 组件
 */
function ReviewRedirect() {
  const params = useParams();
  return <SafeNavigate to={`../community/reviews/${params.id}`} replace />;
}

/**
 * 游戏详情页单数路径到复数路径的重定向组件
 *
 * 将旧的 /game/:id 路径重定向到 /games/:id，
 * 统一路由路径的命名规范（使用复数形式）。
 *
 * @returns 执行重定向导航的 SafeNavigate 组件
 */
function GameDetailRedirect() {
  const params = useParams();
  return <SafeNavigate to={`../games/${params.id}`} replace />;
}

/**
 * 应用根组件
 *
 * 这是整个 GameHub 前端应用的根组件，定义了：
 *
 * 1. 全局配置层：
 *    - SentryErrorBoundaryWrapped：应用级错误边界（Sentry 监控）
 *    - ConfigProvider：Ant Design 深色主题（深色背景配色方案）
 *    - AuthProvider：用户认证上下文
 *    - NotificationProvider：全局通知上下文
 *
 * 2. 路由系统（React Router）：
 *    - "/"：根路径重定向到浏览器语言对应的版本
 *    - "/:lang/*"：带语言前缀的主站路由，包裹 Layout 组件
 *    - "/admin/*"：管理后台路由，独立 AdminLayout
 *    - "/oauth/callback"：OAuth 登录回调
 *
 * 3. 性能优化：
 *    - 所有页面组件均使用 React.lazy + Suspense 实现懒加载
 *    - PageSuspense 统一提供错误边界 + 加载 fallback
 *    - 管理后台页面单独懒加载（用户访问频率较低）
 *
 * 路由组成说明：
 * - 首页：游戏列表页（临时替代首页）
 * - 游戏系统：games、game-forums、library
 * - 内容系统：news、community、guides、blog
 * - AI 功能：ai（包含语音角色、AI NPC、AI 伴侣等子路由）
 * - 用户系统：login、register、profile、notifications、messages
 * - 专题页：cozy-games、free-games、ai-gaming、discovery、trending
 * - 通用页：about、legal、search、achievements、print（3D打印）
 * - 管理后台：dashboard、users、games、content、monitoring 等
 *
 * @returns 完整的 React 应用组件树
 */
function ThemeAwareConfig({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState(() =>
    localStorage.getItem('app-theme') || 'dark'
  );

  useEffect(() => {
    const check = () => {
      const t = document.documentElement.getAttribute('data-theme') ||
        localStorage.getItem('app-theme') || 'dark';
      setCurrentTheme(t);
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    window.addEventListener('storage', check);
    return () => {
      observer.disconnect();
      window.removeEventListener('storage', check);
    };
  }, []);

  const isLight = currentTheme === 'light';
  return (
    <ConfigProvider
      theme={{
        algorithm: isLight ? theme.defaultAlgorithm : theme.darkAlgorithm,
        token: {
          colorBgContainer: isLight ? '#ffffff' : '#1e293b',
          colorText: isLight ? '#1e293b' : '#f1f5f9',
          colorTextSecondary: isLight ? '#64748b' : '#94a3b8',
          colorBorder: isLight ? '#e2e8f0' : '#334155',
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}

function App() {
  return (
    <SentryErrorBoundaryWrapped>
      <ThemeAwareConfig>
        <AuthProvider>
          <Suspense fallback={null}>
            <NotificationProvider>
              <ScrollToTop />
              <Routes>
                {/* 根路径重定向到检测到的语言 */}
                <Route path="/" element={<RootRedirect />} />
                {/* /login 重定向到带语言前缀的登录页 */}
                <Route path="/login" element={<RootRedirect path="login" />} />
                {/* /verify-email 重定向到带语言前缀的验证邮箱页（保留 query 参数） */}
                <Route path="/verify-email" element={<SafeNavigateWithQuery to="/cn/verify-email" replace />} />

                {/* OAuth 回调页面 */}
                <Route path="/oauth/callback" element={
                  <PageSuspense>
                    <OAuthCallbackPage />
                  </PageSuspense>
                } />

                {/* 管理后台 - 独立路由，不继承主站 Layout */}
                {/* 使用独立的管理员认证系统，不依赖前端用户登录 */}
                <Route path="/admin" element={
                  <PageSuspense>
                    <AdminLayout />
                  </PageSuspense>
                }>
                  <Route index element={<SafeNavigate to="dashboard" />} />
                  <Route path="dashboard" element={
                    <PageSuspense>
                      <AdminDashboard />
                    </PageSuspense>
                  } />
                  <Route path="analytics" element={
                    <PageSuspense>
                      <AnalyticsPage />
                    </PageSuspense>
                  } />
                  <Route path="profiling" element={
                    <PageSuspense>
                      <ProfilingPage />
                    </PageSuspense>
                  } />
                  <Route path="users" element={
                    <PageSuspense>
                      <UserManagement />
                    </PageSuspense>
                  } />
                  <Route path="games" element={
                    <PageSuspense>
                      <GameManagement />
                    </PageSuspense>
                  } />
                  <Route path="content" element={
                    <PageSuspense>
                      <ContentManagement />
                    </PageSuspense>
                  }>
                    <Route index element={null} />
                    <Route path="news" element={null} />
                    <Route path="reviews" element={null} />
                    <Route path="community" element={null} />
                    <Route path="blogs" element={null} />
                    <Route path="blogspaces" element={null} />
                    <Route path="guides" element={null} />
                  </Route>
                  <Route path="about" element={
                    <PageSuspense>
                      <AboutManagement />
                    </PageSuspense>
                  } />
                  <Route path="monitoring" element={
                    <PageSuspense>
                      <AdminMonitoring />
                    </PageSuspense>
                  } />
                  <Route path="audit-logs" element={
                    <PageSuspense>
                      <AuditLogsPage />
                    </PageSuspense>
                  } />
                  <Route path="recommend" element={<PageSuspense><RecommendPage /></PageSuspense>} />
                  <Route path="review-queue" element={
                    <PageSuspense>
                      <ReviewQueuePage />
                    </PageSuspense>
                  } />
                  <Route path="settings" element={
                    <PageSuspense>
                      <SystemSettings />
                    </PageSuspense>
                  } />
                  <Route path="uploads" element={
                    <PageSuspense>
                      <UploadManager />
                    </PageSuspense>
                  } />
                  <Route path="email" element={
                    <PageSuspense>
                      <EmailManager />
                    </PageSuspense>
                  } />
                  <Route path="notifications" element={
                    <PageSuspense>
                      <AdminNotifications />
                    </PageSuspense>
                  } />
                  <Route path="deployments" element={
                    <PageSuspense>
                      <DeploymentsPage />
                    </PageSuspense>
                  } />
                  <Route path="backups" element={
                    <PageSuspense>
                      <BackupsPage />
                    </PageSuspense>
                  } />
                  <Route path="login" element={
                    <PageSuspense>
                      <AdminLogin />
                    </PageSuspense>
                  } />
                </Route>

                {/* 语言前缀路由 */}
                <Route path=":lang" element={<LanguageRouteWrapper><Suspense fallback={<LoadingSpinner />}><Layout /></Suspense></LanguageRouteWrapper>}>
                  {/* 首页临时替换为游戏列表页面 */}
                  <Route index element={
                    <PageSuspense>
                      <GamesPage />
                    </PageSuspense>
                  } />
                  <Route path="games" element={
                    <PageSuspense>
                      <GamesPage />
                    </PageSuspense>
                  } />
                  <Route path="games/category/:category" element={
                    <PageSuspense>
                      <CategoryGamesPage />
                    </PageSuspense>
                  } />
                  <Route path="game/:id" element={
                    <PageSuspense>
                      <GameDetailRedirect />
                    </PageSuspense>
                  } />
                  <Route path="games/:id" element={
                    <PageSuspense>
                      <GameDetailPage />
                    </PageSuspense>
                  } />
                  <Route path="games/:id/forum" element={
                    <PageSuspense>
                      <GameForumPage />
                    </PageSuspense>
                  } />
                  <Route path="community-forum" element={
                    <PageSuspense>
                      <CommunityForumHubPage />
                    </PageSuspense>
                  } />
                  <Route path="library">
                    <Route index element={<SafeNavigate to="online" replace />} />
                    <Route path="online" element={
                      <PageSuspense>
                        <OnlineGamesPage />
                      </PageSuspense>
                    } />
                    <Route path="play/:gameId" element={
                      <PageSuspense>
                        <GamePlayPage />
                      </PageSuspense>
                    } />
                    <Route path="mine" element={
                      <ProtectedRoute fallback={<SafeNavigate to="/login" />}>
                        <PageSuspense>
                          <GameLibraryPage />
                        </PageSuspense>
                      </ProtectedRoute>
                    } />
                  </Route>
                  <Route path="news" element={
                    <PageSuspense>
                      <NewsPage />
                    </PageSuspense>
                  } />
                  <Route path="news/category/:category" element={
                    <PageSuspense>
                      <CategoryNewsPage />
                    </PageSuspense>
                  } />
                  <Route path="news/:id" element={
                    <PageSuspense>
                      <NewsDetailPage />
                    </PageSuspense>
                  } />
                  <Route path="community" element={<SafeNavigate to="../community-forum" replace />} />
                  <Route path="game-forums" element={<SafeNavigate to="../community-forum" replace />} />
                  <Route path="community/posts/:id" element={
                    <PageSuspense>
                      <CommunityPostDetailPage />
                    </PageSuspense>
                  } />
                  <Route path="community/posts/new" element={
                    <ProtectedRoute requireAdmin={true}>
                      <PageSuspense>
                        <PostNewPage />
                      </PageSuspense>
                    </ProtectedRoute>
                  } />
                  <Route path="community/reviews/new" element={
                    <ProtectedRoute requireAdmin={true}>
                      <PageSuspense>
                        <ReviewNewPage />
                      </PageSuspense>
                    </ProtectedRoute>
                  } />
                  <Route path="community/reviews/:id" element={
                    <PageSuspense>
                      <ReviewDetailPage />
                    </PageSuspense>
                  } />
                  <Route path="guides" element={
                    <PageSuspense>
                      <GuidesPage />
                    </PageSuspense>
                  } />
                  <Route path="guides/:id" element={
                    <PageSuspense>
                      <GuideDetailPage />
                    </PageSuspense>
                  } />
                  {/* 旧 /reviews 路径重定向到 /community */}
                  <Route path="reviews" element={<SafeNavigate to="../community" replace />} />
                  <Route path="reviews/:id" element={
                    <ReviewRedirect />
                  } />
                  <Route path="search" element={
                    <PageSuspense>
                      <SearchResultsPage />
                    </PageSuspense>
                  } />
                  <Route path="discovery" element={
                    <PageSuspense>
                      <DiscoveryPage />
                    </PageSuspense>
                  } />
                  <Route path="trending" element={
                    <PageSuspense>
                      <TrendingPage />
                    </PageSuspense>
                  } />
                  <Route path="cozy-games" element={
                    <PageSuspense>
                      <CozyGamesPage />
                    </PageSuspense>
                  } />
                  <Route path="free-games" element={
                    <PageSuspense>
                      <FreeGamesPage />
                    </PageSuspense>
                  } />
                  <Route path="ai-gaming" element={
                    <PageSuspense>
                      <AIGamingPage />
                    </PageSuspense>
                  } />
                  <Route path="leaderboard" element={
                    <PageSuspense>
                      <LeaderboardPage />
                    </PageSuspense>
                  } />
                  <Route path="ai" element={
                    <PageSuspense>
                      <AiAssistantPage />
                    </PageSuspense>
                  }>
                    <Route index element={<SafeNavigate to="soul" replace />} />
                    <Route path="soul" element={<PageSuspense><SoulStation /></PageSuspense>} />
                    <Route path="npc" element={<PageSuspense><GameNPC /></PageSuspense>} />
                    <Route path="companion" element={<PageSuspense><GameCompanion /></PageSuspense>} />
                  </Route>
                  <Route path="notifications" element={
                    <ProtectedRoute fallback={<SafeNavigate to="/login" />}>
                      <PageSuspense>
                        <NotificationsPage />
                      </PageSuspense>
                    </ProtectedRoute>
                  } />
                  <Route path="messages" element={
                    <ProtectedRoute fallback={<SafeNavigate to="/login" />}>
                      <PageSuspense>
                        <InboxPage />
                      </PageSuspense>
                    </ProtectedRoute>
                  } />
                  <Route path="messages/:id" element={
                    <ProtectedRoute fallback={<SafeNavigate to="/login" />}>
                      <PageSuspense>
                        <ConversationPage />
                      </PageSuspense>
                    </ProtectedRoute>
                  } />
                  <Route path="achievements" element={
                    <PageSuspense>
                      <AchievementsPage />
                    </PageSuspense>
                  } />
                  <Route path="achievements/:userId" element={
                    <PageSuspense>
                      <AchievementsPage />
                    </PageSuspense>
                  } />
                  <Route path="about" element={
                    <PageSuspense>
                      <AboutPage />
                    </PageSuspense>
                  } />
                  <Route path="about/careers" element={
                    <PageSuspense>
                      <CareersPage />
                    </PageSuspense>
                  } />
                  <Route path="about/press" element={
                    <PageSuspense>
                      <PressPage />
                    </PageSuspense>
                  } />
                  <Route path="about/contact" element={
                    <PageSuspense>
                      <ContactPage />
                    </PageSuspense>
                  } />
                  <Route path="blog" element={
                    <PageSuspense><BlogPage /></PageSuspense>
                  } />
                  <Route path="blog/space/:slug" element={
                    <PageSuspense><BlogSpacePage /></PageSuspense>
                  } />
                  <Route path="blog/new" element={
                    <ProtectedRoute requireAdmin={true}>
                      <PageSuspense><BlogNewPage /></PageSuspense>
                    </ProtectedRoute>
                  } />
                  <Route path="blog/edit/:id" element={
                    <ProtectedRoute requireAdmin={true}>
                      <PageSuspense><BlogEditPage /></PageSuspense>
                    </ProtectedRoute>
                  } />
                  <Route path="blog/my" element={
                    <ProtectedRoute requireAdmin={true}>
                      <PageSuspense><MyBlogsPage /></PageSuspense>
                    </ProtectedRoute>
                  } />
                  <Route path="blog/:id" element={
                    <PageSuspense><BlogDetailPage /></PageSuspense>
                  } />
                  <Route path="privacy" element={<SafeNavigate to="../legal/privacy" replace />} />
                  <Route path="legal/privacy" element={
                    <PageSuspense>
                      <LegalPage pageKey="privacy" />
                    </PageSuspense>
                  } />
                  <Route path="terms" element={<SafeNavigate to="../legal/terms" replace />} />
                  <Route path="cookies" element={<SafeNavigate to="../legal/cookies" replace />} />
                  <Route path="conduct" element={<SafeNavigate to="../legal/conduct" replace />} />
                  <Route path="legal/terms" element={
                    <PageSuspense>
                      <LegalPage pageKey="terms" />
                    </PageSuspense>
                  } />
                  <Route path="legal/cookies" element={
                    <PageSuspense>
                      <LegalPage pageKey="cookies" />
                    </PageSuspense>
                  } />
                  <Route path="legal/conduct" element={
                    <PageSuspense>
                      <LegalPage pageKey="codeOfConduct" />
                    </PageSuspense>
                  } />

                  {/* 3D 打印服务 */}
                  <Route path="print" element={
                    <PageSuspense>
                      <PrintOrderPage />
                    </PageSuspense>
                  } />

                  {/* 个人中心 - 需要登录 */}
                  <Route path="my" element={
                    <ProtectedRoute fallback={<SafeNavigate to="/login" />}>
                      <PageSuspense>
                        <PersonalCenterPage />
                      </PageSuspense>
                    </ProtectedRoute>
                  } />

                  {/* 登录页面 */}
                  <Route path="login" element={
                    <PageSuspense>
                      <LoginPage />
                    </PageSuspense>
                  } />

                  {/* 注册页面 */}
                  <Route path="register" element={
                    <PageSuspense>
                      <RegisterPage />
                    </PageSuspense>
                  } />

                  {/* 个人资料页面 - 需要登录 */}
                  <Route path="profile" element={
                    <ProtectedRoute fallback={<SafeNavigate to="/login" />}>
                      <PageSuspense>
                        <ProfilePage />
                      </PageSuspense>
                    </ProtectedRoute>
                  } />

                  {/* 忘记密码页面 */}
                  <Route path="forgot-password" element={
                    <PageSuspense>
                      <ForgotPasswordPage />
                    </PageSuspense>
                  } />

                  {/* 重置密码页面 */}
                  <Route path="reset-password" element={
                    <PageSuspense>
                      <ResetPasswordPage />
                    </PageSuspense>
                  } />

                  {/* 邮箱验证页面 */}
                  <Route path="verify-email" element={
                    <PageSuspense>
                      <VerifyEmailPage />
                    </PageSuspense>
                  } />

                  <Route path="*" element={
                    <PageSuspense>
                      <NotFoundPage />
                    </PageSuspense>
                  } />
                </Route>
              </Routes>
          </NotificationProvider>
        </Suspense>
        </AuthProvider>
      </ThemeAwareConfig>
    </SentryErrorBoundaryWrapped>
  );
}

/** App 根组件导出，供入口文件（renderer 或 hydrate）引用 */
export default App;
