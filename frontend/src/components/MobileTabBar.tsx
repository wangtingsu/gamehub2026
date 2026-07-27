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

import { useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { HomeOutlined, AppstoreOutlined, RobotOutlined, TeamOutlined, BarsOutlined, PlayCircleOutlined, UserOutlined, HeartOutlined, ThunderboltOutlined, MessageOutlined, BellOutlined, TrophyOutlined, InfoCircleOutlined, LogoutOutlined, ReadOutlined, CommentOutlined } from '@ant-design/icons';
import { Drawer, Avatar } from 'antd';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

/**
 * 抽屉面板类型
 * - null: 无抽屉打开
 * - 'ai': 打开 AI 子功能抽屉
 * - 'more': 打开更多菜单抽屉
 */
type DrawerType = null | 'ai' | 'more';

/**
 * 标签页项的类型定义
 *
 * @property key - 标签页的唯一标识
 * @property icon - 图标组件类型
 * @property labelKey - 多语言翻译 key
 * @property path - 点击后跳转的路径（若为空字符串则表示弹出 Drawer）
 */
interface TabItem {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  path: string;
}

/**
 * MobileTabBar 组件
 *
 * 手机端底部导航栏，无 Props 入参。根据认证状态显示不同的菜单项。
 */
const MobileTabBar = () => {
  const [drawerType, setDrawerType] = useState<DrawerType>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const { user, isAuthenticated, logout } = useAuth();
  const currentLang = lang || 'cn';

  /**
   * 底部标签栏配置
   * 定义 5 个主标签页：首页、游戏、在线、AI（弹出 Drawer）、更多（弹出 Drawer）
   * AI 和更多标签的 path 为空字符串，点击时打开对应的 Drawer 而非直接跳转
   */
  const tabs: TabItem[] = [
    { key: 'home', icon: HomeOutlined, labelKey: 'navigation.home', path: `/${currentLang}/` },
    { key: 'games', icon: AppstoreOutlined, labelKey: 'navigation.games', path: `/${currentLang}/games` },
    { key: 'online', icon: PlayCircleOutlined, labelKey: 'navigation.onlineGames', path: `/${currentLang}/library/online` },
    { key: 'ai', icon: RobotOutlined, labelKey: 'navigation.ai', path: '' },
    { key: 'more', icon: BarsOutlined, labelKey: 'navigation.more', path: '' },
  ];

  /**
   * 各标签页对应的激活路径列表
   * 当当前 URL 路径匹配某标签的任意子路径时，该标签高亮显示。
   * 例如："games" 标签在 /games、/discovery、/trending 等路径下均会高亮。
   */
  const tabSubPaths: Record<string, string[]> = {
    home: [`/${currentLang}`],
    games: [`/${currentLang}/games`, `/${currentLang}/discovery`, `/${currentLang}/trending`, `/${currentLang}/leaderboard`, `/${currentLang}/library`, `/${currentLang}/reviews`],
    online: [`/${currentLang}/library/online`, `/${currentLang}/library/play`],
    ai: [`/${currentLang}/ai`],
    more: [`/${currentLang}/my`, `/${currentLang}/profile`, `/${currentLang}/messages`, `/${currentLang}/notifications`, `/${currentLang}/achievements`, `/${currentLang}/login`, `/${currentLang}/register`, `/${currentLang}/community-forum`, `/${currentLang}/news`, `/${currentLang}/guides`, `/${currentLang}/about`, `/${currentLang}/blog`, `/${currentLang}/search`],
  };

  const activeTab = tabs.find((tab) => {
    const subPaths = tabSubPaths[tab.key] || [];
    return subPaths.some((sp) => location.pathname === sp || location.pathname.startsWith(sp + '/'));
  })?.key || 'home';

  /**
   * 标签页点击处理函数
   * 根据标签类型执行不同操作：
   * - "ai" 标签：打开 AI 功能 Drawer
   * - "more" 标签：打开更多菜单 Drawer
   * - 其他标签：直接导航到对应路径
   *
   * @param tab - 被点击的标签页配置项
   */
  const handleTabClick = (tab: TabItem) => {
    if (tab.key === 'ai') {
      setDrawerType('ai');
      return;
    }
    if (tab.key === 'more') {
      setDrawerType('more');
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
   * AI 抽屉菜单项列表
   * 包含 AI 相关功能入口：人物自画像、心灵驿站、游戏百科、命理师
   */
  const aiDrawerItems = [
    { icon: <RobotOutlined />, label: 'AI 助手', path: `/${currentLang}/ai` },
    { icon: <CommentOutlined />, label: 'AI 聊天', path: `/${currentLang}/ai/soul` },
    { icon: <RobotOutlined />, label: '游戏百科', path: `/${currentLang}/ai/npc` },
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
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                  isActive
                    ? 'text-primary-400'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Icon className={`text-xl ${isActive ? 'text-primary-400' : ''}`} />
                <span className={`text-[10px] leading-none ${isActive ? 'font-medium' : ''}`}>
                  {t(tab.labelKey)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

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
