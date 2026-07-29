/**
 * MobileTabBar（移动端底部标签栏）组件
 *
 * 手机端页面底部的固定导航标签栏，包含 5 个主标签页：
 * - 首页（home）：跳转到首页
 * - 游戏（games）：跳转到游戏列表页
 * - 在线（online）：跳转到在线游戏页
 * - AI（ai）：弹出 Drawer 展开 AI 子功能菜单
 * - 更多（more）：弹出 Drawer 展开用户菜单和更多链接
 *
 * 使用 fixed 定位固定在底部（z-50），并适配 iPhone 安全区域（safe-area-inset-bottom）。
 * 当前激活的标签页会根据路径自动匹配高亮。
 *
 * 仅在移动端布局（屏幕宽度 <= 767px）时由 Layout 组件渲染。
 */

import React, { useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { HomeOutlined, AppstoreOutlined, RobotOutlined, HeartOutlined, BarsOutlined, UserOutlined, ThunderboltOutlined, MessageOutlined, BellOutlined, TrophyOutlined, InfoCircleOutlined, LogoutOutlined, ReadOutlined, CommentOutlined, PlayCircleOutlined, FireOutlined, CompassOutlined, TeamOutlined } from '@ant-design/icons';
import { Drawer, Avatar } from 'antd';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

/**
 * 抽屉面板类型
 * - null: 无抽屉打开
 * - 'ai': 打开 AI 子功能抽屉
 * - 'more': 打开更多菜单抽屉
 */
type DrawerType = null | 'recommend' | 'ai' | 'more';

/**
 * 标签页项的类型定义
 */
interface TabItem {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  subtitle: string;
  path: string;
}

/**
 * MobileTabBar 组件
 *
 * 手机端底部导航栏，无 Props 入参。根据认证状态显示不同的菜单项。
 */
const MobileTabBar = () => {
  const [drawerType, setDrawerType] = useState<DrawerType>(null);
  const [clickedTab, setClickedTab] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const { user, isAuthenticated, logout } = useAuth();
  const currentLang = lang || 'cn';

  /**
   * 底部标签栏配置 — 对齐 PC 端 Sidebar 导航结构
   * 5 个主标签：主页、游戏库、推荐游戏、AI 助手、更多的
   */
  const tabs: TabItem[] = [
    { key: 'home', icon: HomeOutlined, label: '主页', subtitle: 'Home', path: `/${currentLang}/` },
    { key: 'games', icon: AppstoreOutlined, label: '游戏库', subtitle: 'Games', path: `/${currentLang}/games` },
    { key: 'recommend', icon: HeartOutlined, label: '推荐游戏', subtitle: 'Discover', path: '' },
    { key: 'ai', icon: RobotOutlined, label: 'AI 助手', subtitle: 'AI', path: `/${currentLang}/ai` },
    { key: 'more', icon: BarsOutlined, label: '更多的', subtitle: 'More', path: '' },
  ];

  /**
   * 各标签页对应的激活路径列表 — 对齐 PC 端 Sidebar 的 subPaths
   */
  const tabSubPaths: Record<string, string[]> = {
    home: [`/${currentLang}/`, `/${currentLang}`],
    games: [`/${currentLang}/games`, `/${currentLang}/discovery`, `/${currentLang}/trending`, `/${currentLang}/leaderboard`],
    recommend: [`/${currentLang}/library/online`, `/${currentLang}/library/play`, `/${currentLang}/free-games`, `/${currentLang}/cozy-games`],
    ai: [`/${currentLang}/ai`, `/${currentLang}/ai/soul`, `/${currentLang}/ai/npc`, `/${currentLang}/ai/companion`],
    more: [`/${currentLang}/news`, `/${currentLang}/about`, `/${currentLang}/community-forum`, `/${currentLang}/blog`, `/${currentLang}/my`, `/${currentLang}/messages`, `/${currentLang}/notifications`, `/${currentLang}/achievements`, `/${currentLang}/profile`, `/${currentLang}/reviews`, `/${currentLang}/guides`, `/${currentLang}/login`, `/${currentLang}/register`, `/${currentLang}/search`],
  };

  // 直接用当前路径匹配，不依赖变量拼接
  const activeTab = (() => {
    const p = location.pathname;
    // 主页：/、/cn、/cn/
    if (p === '/' || /^\/[a-z]{2}\/?$/.test(p)) return 'home';
    // 游戏库
    if (p.includes('/games') || p.includes('/discovery') || p.includes('/trending') || p.includes('/leaderboard')) return 'games';
    // 推荐游戏
    if (p.includes('/library/online') || p.includes('/library/play') || p.includes('/free-games') || p.includes('/cozy-games')) return 'recommend';
    // AI
    if (p.includes('/ai')) return 'ai';
    // 更多
    if (p.includes('/news') || p.includes('/about') || p.includes('/community-forum') || p.includes('/blog') || p.includes('/my') || p.includes('/messages') || p.includes('/notifications') || p.includes('/achievements') || p.includes('/reviews') || p.includes('/guides') || p.includes('/profile') || p.includes('/login') || p.includes('/register') || p.includes('/search')) return 'more';
    // 兜底
    return 'home';
  })();

  /**
   * 标签页点击处理函数
   * - recommend / ai / more：弹出 Drawer
   * - home / games：直接导航
   */
  const handleTabClick = (tab: TabItem) => {
    // 立即更新点击状态，让高亮即时响应
    setClickedTab(tab.key);
    if (tab.key === 'recommend' || tab.key === 'more') {
      setDrawerType(tab.key as DrawerType);
      return;
    }
    navigate(tab.path);
  };

  /**
   * "更多"菜单项列表
   * 根据用户认证状态显示不同内容：
   * - 已登录：个人中心、消息、通知、成就、新闻、博客、社区、关于、退出登录
   * - 未登录：新闻、博客、社区、关于
   */
  const drawerItems = isAuthenticated
    ? [
        { icon: <UserOutlined />, label: t('navigation.personalCenter', '个人中心'), path: `/${currentLang}/my` },
        { icon: <MessageOutlined />, label: t('navigation.messages', '消息'), path: `/${currentLang}/messages` },
        { icon: <BellOutlined />, label: t('navigation.notifications', '通知'), path: `/${currentLang}/notifications` },
        { icon: <TrophyOutlined />, label: t('navigation.achievements', '成就'), path: `/${currentLang}/achievements` },
        { icon: <ReadOutlined />, label: t('navigation.news', '新闻'), path: `/${currentLang}/news` },
        { icon: <ReadOutlined />, label: t('navigation.blog', '博客空间'), path: `/${currentLang}/blog` },
        { icon: <TeamOutlined />, label: '社区论坛', path: `/${currentLang}/community-forum` },
        { icon: <InfoCircleOutlined />, label: t('navigation.about', '关于'), path: `/${currentLang}/about` },
        { type: 'divider' as const },
        { icon: <LogoutOutlined />, label: t('navigation.logout', '退出登录'), path: 'logout', danger: true },
      ]
    : [
        { icon: <ReadOutlined />, label: t('navigation.news', '新闻'), path: `/${currentLang}/news` },
        { icon: <ReadOutlined />, label: t('navigation.blog', '博客空间'), path: `/${currentLang}/blog` },
        { icon: <TeamOutlined />, label: '社区论坛', path: `/${currentLang}/community-forum` },
        { icon: <InfoCircleOutlined />, label: t('navigation.about', '关于'), path: `/${currentLang}/about` },
      ];

  /**
   * 推荐游戏 Drawer — 对齐 PC 端 recomendSubPaths
   */
  const recommendDrawerItems = [
    { icon: <PlayCircleOutlined />, label: '在线游戏', path: `/${currentLang}/library/online` },
    { icon: <FireOutlined />, label: '免费游戏', path: `/${currentLang}/free-games` },
    { icon: <CompassOutlined />, label: '治愈游戏', path: `/${currentLang}/cozy-games` },
  ];

  /**
   * AI 抽屉菜单 — 对齐 PC 端 aiSubPaths
   */
  const aiDrawerItems = [
    { icon: <RobotOutlined />, label: 'AI 助手', path: `/${currentLang}/ai` },
    { icon: <CommentOutlined />, label: 'AI 聊天', path: `/${currentLang}/ai/soul` },
    { icon: <TeamOutlined />, label: '游戏百科', path: `/${currentLang}/ai/npc` },
    { icon: <ThunderboltOutlined />, label: '命理师', path: `/${currentLang}/ai/companion` },
  ];

  /**
   * "更多"抽屉菜单项点击处理函数
   * 如果点击的是"退出登录"项（含 danger 标记），则执行退出操作并关闭 Drawer；
   * 否则导航到对应路径并关闭 Drawer。
   *
   * @param item - 被点击的菜单项
   */
  const handleDrawerItemClick = (item: typeof drawerItems[number]) => {
    if ('danger' in item && item.danger) {
      logout();
      setDrawerType(null);
      navigate(`/${currentLang}/`);
      return;
    }
    navigate(item.path);
    setDrawerType(null);
  };

  /**
   * AI 抽屉菜单项点击处理函数
   * 导航到对应 AI 功能页面并关闭 Drawer。
   *
   * @param item - 被点击的 AI 菜单项
   */
  const handleAiItemClick = (item: typeof aiDrawerItems[number]) => {
    navigate(item.path);
    setDrawerType(null);
  };

  return (
    <>
      <div className="mobile-tab-bar fixed bottom-0 left-0 right-0 z-50 bg-dark-900 border-t border-dark-700 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-14">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabClick(tab)}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all duration-200 relative mx-0.5 rounded-xl"
                style={{
                  backgroundColor: isActive ? 'rgba(22,119,255,0.15)' : 'transparent',
                  borderWidth: isActive ? 1 : 0,
                  borderColor: isActive ? 'rgba(22,119,255,0.3)' : 'transparent',
                }}
              >
                <Icon style={{
                  color: isActive ? '#1677ff' : '#6b7280',
                  fontSize: 20,
                  fontWeight: isActive ? 'bold' : 'normal',
                }} />
                <span style={{
                  fontSize: 11,
                  lineHeight: '14px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#1677ff' : '#6b7280',
                }}>
                  {tab.label}
                </span>
                <span style={{
                  fontSize: 9,
                  lineHeight: '12px',
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? '#93b8ff' : '#4b5563',
                }}>
                  {tab.subtitle}
                </span>
                {isActive && (
                  <div
                    className="absolute top-0 left-4 right-4 h-0.5 rounded-full"
                    style={{ backgroundColor: '#1677ff' }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recommend Drawer */}
      <Drawer
        title="推荐游戏"
        placement="bottom"
        height="auto"
        open={drawerType === 'recommend'}
        onClose={() => setDrawerType(null)}
        styles={{ body: { padding: '8px 0' } }}
      >
        <div className="flex flex-col">
          {recommendDrawerItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                navigate(item.path);
                setDrawerType(null);
              }}
              className="flex items-center gap-3 px-6 py-4 text-sm text-gray-200 hover:bg-dark-700 transition-colors w-full text-left"
            >
              <span className="text-lg text-gray-400">{item.icon}</span>
              <span className="text-base">{item.label}</span>
            </button>
          ))}
        </div>
      </Drawer>

      {/* AI Drawer */}
      <Drawer
        title="AI 助手"
        placement="bottom"
        height="auto"
        open={drawerType === 'ai'}
        onClose={() => setDrawerType(null)}
        styles={{ body: { padding: '8px 0' } }}
      >
        <div className="flex flex-col">
          {aiDrawerItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleAiItemClick(item)}
              className="flex items-center gap-3 px-6 py-4 text-sm text-gray-200 hover:bg-dark-700 transition-colors w-full text-left"
            >
              <span className="text-lg text-gray-400">{item.icon}</span>
              <span className="text-base">{item.label}</span>
            </button>
          ))}
        </div>
      </Drawer>

      {/* More Drawer */}
      <Drawer
        title={t('navigation.more', '更多的')}
        placement="bottom"
        height="auto"
        open={drawerType === 'more'}
        onClose={() => setDrawerType(null)}
        styles={{ body: { padding: '8px 0' } }}
      >
        {/* User info when authenticated */}
        {isAuthenticated && (
          <div className="flex items-center gap-3 px-4 py-3 border-b border-dark-700 mb-2">
            <Avatar
              size={40}
              className="bg-gradient-to-r from-primary-500 to-secondary-500 flex-shrink-0"
              src={user?.avatarUrl}
            >
              {user?.username?.[0]?.toUpperCase()}
            </Avatar>
            <div>
              <div className="text-sm font-medium text-white">{user?.username || 'User'}</div>
              <div className="text-xs text-gray-400">{user?.email || ''}</div>
            </div>
          </div>
        )}

        {/* Menu items */}
        <div className="flex flex-col">
          {drawerItems.map((item, idx) => {
            if ('type' in item && item.type === 'divider') {
              return <div key={idx} className="border-t border-dark-700 my-1" />;
            }
            const danger = 'danger' in item && item.danger;
            return (
              <button
                key={idx}
                onClick={() => handleDrawerItemClick(item)}
                className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors w-full text-left ${
                  danger
                    ? 'text-red-400 hover:bg-red-500/10'
                    : 'text-gray-200 hover:bg-dark-700'
                }`}
              >
                <span className={`text-lg ${danger ? 'text-red-400' : 'text-gray-400'}`}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </Drawer>
    </>
  );
};

export default MobileTabBar;
