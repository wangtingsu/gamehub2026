/**
 * Layout（页面布局）组件
 *
 * 全局页面布局框架，根据设备类型（手机/桌面）自适应渲染不同的布局结构。
 *
 * 桌面布局：
 * - 左侧可折叠侧边栏（Sidebar），宽度 338px / 折叠后 104px
 * - 中间子导航面板（Sub-navigation），宽度 286px，按导航模式（games / ai / more）切换内容
 * - 右侧主要内容区域（<Outlet />）+ 页脚（Footer）
 * - 子导航面板在无操作 5 秒后自动收起
 *
 * 手机布局：
 * - 顶部 MobileHeader
 * - 中间内容区域（pb-16 留出底部 TabBar 空间）
 * - 底部 MobileTabBar
 *
 * 功能特性：
 * - 响应式断点：767px（md）
 * - 根据当前路径自动切换导航模式
 * - 路由切换时自动滚动到页面顶部
 * - 通过 react-helmet-async 设置 HTML lang 属性实现 SEO
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Layout as AntLayout, Menu } from 'antd';
import { useAuth } from '../contexts/AuthContext';
import {
  UserOutlined,
  HeartOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  ReadOutlined,
  InfoCircleOutlined,
  FireOutlined,
  TrophyOutlined,
  AppstoreOutlined,
  ArrowLeftOutlined,
  TeamOutlined,
  PlayCircleOutlined,
  CompassOutlined,
  CommentOutlined,
  BookOutlined,
} from '@ant-design/icons';
import Sidebar from './Sidebar';
import Footer from './Footer';
import MobileHeader from './MobileHeader';
import MobileTabBar from './MobileTabBar';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import type { MenuProps } from 'antd';

const { Content } = AntLayout;

/**
 * Layout 组件
 *
 * 应用的根级布局组件，包裹所有页面路由。
 * 接收 React Router 的 <Outlet /> 渲染子路由页面，无额外 Props。
 *
 * @example
 * // 在路由配置中使用
 * <Route path="/:lang" element={<Layout />}>
 *   <Route index element={<HomePage />} />
 *   <Route path="games" element={<GamesPage />} />
 * </Route>
 */
const Layout = () => {
  const { isAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false); // 默认展开不折叠
  const [isMobile, setIsMobile] = useState(false);
  const [navMode, setNavMode] = useState<'main' | 'games' | 'ai' | 'more' | 'recommend'>('main');
  const skipAutoNav = useRef(false);
  const { t, i18n } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang || 'cn';
  const location = useLocation();
  const navigate = useNavigate();

  /**
   * 手机端断点监听效果
   * 使用 window.matchMedia 检测屏幕宽度是否 <= 767px（对应 Tailwind md 断点）
   * 实时更新 isMobile 状态以切换桌面/手机布局
   */
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  /**
   * 根据当前路径自动切换导航模式的子路径配置
   * 定义各导航模式（games / ai / more）所对应的 URL 路径前缀
   * 当页面路径匹配时，自动激活对应的子导航面板
   */
  const gameSubPaths = [`/${currentLang}/games`, `/${currentLang}/discovery`, `/${currentLang}/trending`, `/${currentLang}/leaderboard`];
  const recommendSubPaths = [`/${currentLang}/library/online`, `/${currentLang}/library/play`, `/${currentLang}/free-games`, `/${currentLang}/cozy-games`];
  const moreSubPaths = [`/${currentLang}/news`, `/${currentLang}/about`, `/${currentLang}/community-forum`];

  // 不再根据 URL 自动打开子面板，子面板仅通过点击侧栏菜单手动打开

  /**
   * 路由切换时自动滚动到页面顶部
   * 确保每次页面跳转后视口位于顶部位置，避免停留在上次滚动位置
   */
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname]);

  /**
   * 5 秒无操作自动关闭子导航面板的定时器引用
   * 当子导航（games/ai/more）处于打开状态时，若用户在 5 秒内无交互，则自动收起
   */
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 启动自动关闭定时器
   * 清除已有定时器后重新设定 5 秒倒计时，到期后恢复导航模式为 main 并展开侧栏。
   * 用户每次与子导航交互时调用此函数以重置倒计时。
   */
  const startAutoCloseTimer = useCallback(() => {
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    autoCloseTimerRef.current = setTimeout(() => {
      setNavMode('main');
    }, 5000);
  }, []);

  /**
   * 清除自动关闭定时器
   * 当子导航面板已关闭（navMode === 'main'）时调用此函数清除未执行的定时器
   */
  const clearAutoCloseTimer = useCallback(() => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
  }, []);

  // 子导航打开时启动定时器，切换后清除
  useEffect(() => {
    if (navMode !== 'main') {
      startAutoCloseTimer();
    } else {
      clearAutoCloseTimer();
    }
    return () => clearAutoCloseTimer();
  }, [navMode, startAutoCloseTimer, clearAutoCloseTimer]);

  /**
   * 游戏子导航菜单项
   * 包含：全部游戏、在线游戏、免费游戏、治愈游戏、排行榜、热门、发现
   */
  const gamesNavItems: MenuProps['items'] = [
    { key: `/${currentLang}/games`, icon: <AppstoreOutlined />, label: t('navigation.allGames', '全部游戏') },
    { key: `/${currentLang}/leaderboard`, icon: <TrophyOutlined />, label: t('navigation.leaderboard', '排行榜') },
    { key: `/${currentLang}/trending`, icon: <FireOutlined />, label: t('navigation.trending', '热门') },
    { key: `/${currentLang}/discovery`, icon: <CompassOutlined />, label: t('navigation.discovery', '发现') },
  ];

  const recommendNavItems: MenuProps['items'] = [
    { key: `/${currentLang}/library/online`, icon: <PlayCircleOutlined />, label: t('navigation.onlineGames', '在线游戏') },
    { key: `/${currentLang}/free-games`, icon: <HeartOutlined />, label: t('navigation.freeGames', '免费游戏') },
    { key: `/${currentLang}/cozy-games`, icon: <ThunderboltOutlined />, label: t('navigation.cozyGames', '治愈游戏') },
  ];

  /**
   * AI 子导航菜单项
   * 包含：人物自画像、心灵驿站、游戏百科、命理师
   */
  const aiNavItems: MenuProps['items'] = [
    { key: `/${currentLang}/ai/soul`, icon: <CommentOutlined />, label: t('navigation.soulStation', '心灵驿站') },
    { key: `/${currentLang}/ai/npc`, icon: <BookOutlined />, label: t('navigation.aiGuide', 'AI 攻略') },
    { key: `/${currentLang}/ai/portrait`, icon: <UserOutlined />, label: t('navigation.aiPortrait', 'AI 人物自画像') },
    { key: `/${currentLang}/ai/companion`, icon: <ThunderboltOutlined />, label: t('navigation.aiCompanion', '命理师') },
  ];

  /**
   * 更多子导航菜单项
   * 包含：新闻中心、博客、我的文章（仅管理员）、官方社区、关于我们
   */
  const moreNavItems: MenuProps['items'] = [
    { key: `/${currentLang}/news`, icon: <ReadOutlined />, label: t('navigation.news', '新闻中心') },
    { key: `/${currentLang}/blog`, icon: <ReadOutlined />, label: t('navigation.blog', '博客空间') },
    ...(isAdmin ? [{ key: `/${currentLang}/blog/my` as string, icon: <ReadOutlined />, label: t('navigation.myBlogs', '我的文章') }] : []),
    { key: `/${currentLang}/community-forum`, icon: <TeamOutlined />, label: t('navigation.communityForum', '社区论坛') },
    { key: `/${currentLang}/about`, icon: <InfoCircleOutlined />, label: t('navigation.about', '关于我们') },
  ];

  /**
   * 子导航配置映射表
   * 按导航模式（games / ai / more）组织，每项包含标题和菜单项列表
   */
  const navConfig: Record<string, { title: string; items: MenuProps['items'] }> = {
    games: { title: t('navigation.games', '游戏库'), items: gamesNavItems },
    recommend: { title: t('navigation.recommend', '推荐游戏'), items: recommendNavItems },
    more: { title: t('navigation.more', '更多的'), items: moreNavItems },
  };

  /**
   * 子导航栏当前选中项的 key
   * 根据当前路径 location.pathname 在已激活的导航模式菜单中匹配对应项。
   * 支持精确匹配和前缀匹配（含 "/" 和 "?" 后续字符）。
   * 如无匹配项则默认选中菜单第一项。
   */
  const subNavSelectedKey = (() => {
    const path = location.pathname;
    const items = navConfig[navMode]?.items || [];
    for (const item of items) {
      if (item && 'key' in item && typeof item.key === 'string') {
        if (path === item.key || path.startsWith(item.key + '/') || path.startsWith(item.key + '?')) {
          return item.key;
        }
      }
    }
    return items[0] && 'key' in items[0] ? (items[0].key as string) : '';
  })();

  /**
   * 子导航菜单点击处理函数
   * 点击子导航菜单项时：
   * 1. 清除自动关闭定时器（防止导航时自动收起）
   * 2. 设置 skipAutoNav 标记，阻止自动路径匹配覆盖导航状态
   * 3. 将导航模式重置为 main，展开侧栏
   * 4. 使用 React Router navigate 跳转到目标路径
   *
   * @param param.key - 菜单项的 key，即目标路由路径
   */
  const handleSubNavClick: MenuProps['onClick'] = ({ key }) => {
    clearAutoCloseTimer();
    skipAutoNav.current = true;
    // 先关闭子面板并收起侧栏
    setNavMode('main');
    navigate(key);
  };

  return (
    <AntLayout className="min-h-screen bg-dark-900">
      {/* Layout SEO 基础标签 — 页面专用 SEO 在子组件中覆盖 */}
      <Helmet>
        <html lang={i18n.language} />
      </Helmet>

      {isMobile ? (
        /* ========== 手机布局：顶部导航 + 内容 + 底部Tab栏 ========== */
        <>
          <MobileHeader />
          <div className="mobile-content pb-20" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
            <Outlet />
          </div>
          <MobileTabBar />
        </>
      ) : (
        /* ========== 桌面/平板布局：侧栏 + 子导航 + 内容 ========== */
        <>
          {/* Desktop Sidebar — 鼠标悬停展开，离开收起 */}
          <AntLayout.Sider
            collapsible
            collapsed={collapsed}
            trigger={null}
            width={338}
            collapsedWidth={240}
            theme="dark"
            className="main-sider"
            style={{
              borderRight: '1px solid rgba(51,65,85,0.5)',
              position: 'sticky',
              top: 0,
              height: '100vh',
              overflow: 'hidden',
            }}
          >
            <Sidebar
              collapsed={collapsed}
              onToggleCollapse={() => setCollapsed(!collapsed)}
              navMode={navMode}
              onNavModeChange={(mode) => {
                setNavMode(mode);
              }}
            />
          </AntLayout.Sider>

          {/* Desktop Sub-Navigation Panel */}
          {navMode !== 'main' && (
            <div
              className="sub-nav-panel flex flex-col flex-shrink-0"
              onMouseMove={startAutoCloseTimer}
              onTouchMove={startAutoCloseTimer}
              onClick={startAutoCloseTimer}
              style={{
                width: 286,
                background: 'var(--c-bg)',
                borderRight: '1px solid var(--c-border)',
                height: '100vh',
                position: 'sticky',
                top: 0,
                overflow: 'hidden',
              }}
            >
              <div className="flex items-center h-16 px-4 border-b border-dark-700 gap-3">
                <button
                  onClick={() => { clearAutoCloseTimer(); setNavMode('main'); setCollapsed(false); }}
                  className="p-1 rounded-md text-gray-400 hover:text-primary-400 hover:bg-dark-700 transition-colors"
                  title="返回"
                >
                  <ArrowLeftOutlined className="text-lg" />
                </button>
                <span className="text-base font-semibold text-gray-200 truncate">
                  {navConfig[navMode]?.title}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
                <Menu
                  mode="inline"
                  selectedKeys={[subNavSelectedKey]}
                  items={navConfig[navMode]?.items}
                  onClick={handleSubNavClick}
                  theme="dark"
                  className="sidebar-menu"
                  inlineIndent={16}
                />
              </div>
            </div>
          )}

          {/* Main Content + Footer — 点击内容区关闭子面板 */}
          <AntLayout className="bg-dark-900" onClick={() => { setNavMode('main'); }}>
            <Content className="bg-dark-900 text-gray-100 main-content">
              <div className="px-8 flex-grow">
                <Outlet />
              </div>
            </Content>
            <Footer />
          </AntLayout>
        </>
      )}
    </AntLayout>
  );
};

export default Layout;
