import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Menu, Avatar, Dropdown } from 'antd';
import {
  HomeOutlined,
  AppstoreOutlined,
  RobotOutlined,
  ReadOutlined,
  InfoCircleOutlined,
  UserOutlined,
  TrophyOutlined,
  PlayCircleOutlined,
  CompassOutlined,
  FireOutlined,
  LogoutOutlined,
  MessageOutlined,
  HeartOutlined,
  ThunderboltOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import type { MenuProps } from 'antd';
import FlagIcon from './FlagIcon';
import NotificationBell from './NotificationBell';

/**
 * Sidebar 组件的属性接口
 *
 * @property collapsed - 侧边栏是否处于折叠状态（移动端或窄屏模式）
 * @property onNavigate - 导航后的回调函数（通常用于移动端关闭侧边栏）
 * @property onToggleCollapse - 切换折叠状态的回调
 * @property navMode - 当前导航模式：'main' 主导航 / 'games' 游戏子导航 / 'ai' AI 子导航 / 'more' 更多子导航
 * @property onNavModeChange - 切换导航模式的回调函数
 * @property categoryClickOnly - 点击分类（games/ai/more）时不执行路由跳转，仅切换导航模式（移动端使用）
 */
interface SidebarProps {
  collapsed: boolean;
  onNavigate?: () => void;
  onToggleCollapse?: () => void;
  navMode: 'main' | 'games' | 'ai' | 'more';
  onNavModeChange: (mode: 'main' | 'games' | 'ai' | 'more') => void;
  /** 点击分类（games/ai/more）时不跳转，只切换导航模式（移动端使用） */
  categoryClickOnly?: boolean;
}

/**
 * Sidebar — 应用的侧边导航栏组件
 *
 * 该组件是 GameHub 应用的主导航面板，包含以下功能区域：
 *
 * 1. 头部区域：GameHub Logo 和应用名称，以及语言选择器（支持中/英/日/韩/西/法 6 种语言）
 * 2. 导航菜单区域：包含主页、游戏库、在线游戏、免费游戏、治愈游戏、游戏论坛、AI 助手、
 *    用户（登录后显示个人中心和消息子菜单）等核心导航项，以及"更多"分类入口
 * 3. 社交链接区域：X(Twitter)、YouTube、Discord、TikTok、Facebook 等社交媒体图标链接
 * 4. 用户区域：未登录时不显示；登录后显示通知铃铛、用户头像、昵称和邮箱，
 *    点击弹出下拉菜单提供个人中心和退出登录选项
 *
 * 折叠/展开行为：
 * - 在移动端或窄屏下，侧边栏可以折叠（collapsed 为 true），仅显示图标
 * - 支持"主导航 -> 子导航"的二级导航模式切换（main -> games/ai/more）
 * - 点击折叠侧边栏的空白区域可切换折叠状态或关闭子导航
 *
 * @param props - 组件属性，详见 SidebarProps 接口
 * @returns 侧边导航栏的 JSX 元素
 */
const Sidebar = ({ collapsed, onNavigate, onToggleCollapse, navMode, onNavModeChange, categoryClickOnly }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang || 'cn';

  // 语言配置
  const languages = [
    { code: 'en', name: t('language.en'), country: 'US' },
    { code: 'cn', name: t('language.zh-CN'), country: 'CN' },
    { code: 'ja', name: t('language.ja', '日本語'), country: 'JP' },
    { code: 'ko', name: t('language.ko', '한국어'), country: 'KR' },
    { code: 'es', name: t('language.es', 'Español'), country: 'ES' },
    { code: 'fr', name: t('language.fr', 'Français'), country: 'FR' },
  ];

  const currentLanguage = languages.find((l) => l.code === currentLang) || languages[0];

  // URL 路径前缀 → i18n 语言代码映射
  const urlToI18n: Record<string, string> = {
    en: 'en', cn: 'zh-CN', ja: 'ja', ko: 'ko', es: 'es', fr: 'fr',
  };

  /**
   * 切换应用语言
   *
   * 更新 i18n 语言设置，并将当前页面的 URL 路径中的语言代码替换为新的语言代码，
   * 实现语言切换后停留在当前页面的效果。
   *
   * @param languageCode - 目标语言代码（如 'en'、'cn'、'ja' 等）
   */
  const handleLanguageChange = async (languageCode: string) => {
    await i18n.changeLanguage(urlToI18n[languageCode] || languageCode);
    const currentPath = location.pathname.replace(/^\/[^\/]+/, '') || '/';
    navigate(`/${languageCode}${currentPath}`);
  };

  /**
   * 导航菜单配置项列表
   *
   * 每个菜单项包含：
   * - key：路由路径或唯一标识符，用于匹配当前选中的菜单项
   * - icon：Ant Design 图标组件
   * - label：多语言支持的菜单显示文本
   *
   * 特殊逻辑：
   * - 用户菜单（key 为 /:lang/login）：根据 isAuthenticated 状态动态添加子菜单
   *   （已登录时显示个人中心和消息子项，未登录时无子菜单）
   * - "更多"菜单项（key 为 'more'）：使用自定义 SVG 渲染九宫格图标
   */
  const menuItems: MenuProps['items'] = [
    {
      key: `/${currentLang}/`,
      icon: <HomeOutlined />,
      label: t('navigation.home', '主页'),
    },
    {
      key: `/${currentLang}/games`,
      icon: <AppstoreOutlined />,
      label: t('navigation.games', '游戏库'),
    },
    {
      key: `/${currentLang}/library/online`,
      icon: <PlayCircleOutlined />,
      label: '在线游戏',
    },
    {
      key: `/${currentLang}/free-games`,
      icon: <HeartOutlined />,
      label: '免费游戏',
    },
    {
      key: `/${currentLang}/cozy-games`,
      icon: <ThunderboltOutlined />,
      label: '治愈游戏',
    },
    {
      key: `/${currentLang}/community-forum`,
      icon: <TeamOutlined />,
      label: '社区论坛',
    },
    {
      key: `/${currentLang}/ai`,
      icon: <RobotOutlined />,
      label: t('navigation.ai', 'AI 助手'),
    },
    {
      key: 'more',
      icon: (
        <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
          <circle cx="5" cy="5" r="1.5" />
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="19" cy="5" r="1.5" />
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
          <circle cx="5" cy="19" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
          <circle cx="19" cy="19" r="1.5" />
        </svg>
      ),
      label: t('navigation.more', '更多的'),
    },
  ];

  /**
   * 子导航路径映射 — 用于确定当前 URL 属于哪个导航模式
   *
   * 当当前路径匹配以下子路径列表中的任意一个时，会自动切换到对应的导航模式：
   * - gameSubPaths：游戏库子页面（发现、趋势、排行榜、在线游戏、免费游戏、治愈游戏等）
   * - aiSubPaths：AI 子页面（AI 头像、AI 灵魂、AI NPC、AI 伴侣等）
   * - moreSubPaths：更多子页面（新闻、关于、博客、社区等）
   */
  const gameSubPaths = [`/${currentLang}/games`, `/${currentLang}/discovery`, `/${currentLang}/trending`, `/${currentLang}/leaderboard`, `/${currentLang}/library/online`, `/${currentLang}/library/play`, `/${currentLang}/free-games`, `/${currentLang}/cozy-games`];
  const aiSubPaths = [`/${currentLang}/ai`, `/${currentLang}/ai/soul`, `/${currentLang}/ai/npc`, `/${currentLang}/ai/companion`];
  const moreSubPaths = [`/${currentLang}/news`, `/${currentLang}/about`, `/${currentLang}/community-forum`];

  /**
   * 计算当前选中的菜单项 key
   *
   * 优先级顺序：
   * 1. 先检查当前路径是否匹配 gameSubPaths / aiSubPaths / moreSubPaths 中的子路径
   * 2. 在菜单项中递归查找完全匹配或路径前缀匹配的项
   * 3. 提取路径的第一段作为基础路径进行匹配
   * 4. 若均不匹配，默认选中主页（/:lang/）
   *
   * 匹配规则：路径等于菜单 key，或路径以 "菜单 key/" 或 "菜单 key?" 开头均视为匹配。
   * 这确保如 /cn/games/123 这样的子页面也能正确高亮 "游戏库" 菜单项。
   */
  const selectedKey = (() => {
    const path = location.pathname;

    /**
     * 在菜单项列表中递归查找与当前路径匹配的菜单 key
     *
     * @param items - 菜单项列表
     * @returns 匹配的菜单 key，未找到则返回 undefined
     */
    const findKeyInItems = (items: MenuProps['items']): string | undefined => {
      for (const item of items || []) {
        if (!item) continue;
        if ('key' in item && typeof item.key === 'string') {
          if (path === item.key || path.startsWith(item.key + '/') || path.startsWith(item.key + '?')) {
            return item.key;
          }
        }
        if ('children' in item && item.children) {
          const found = findKeyInItems(item.children as MenuProps['items']);
          if (found) return found;
        }
      }
      return undefined;
    };

    if (gameSubPaths.some((sp) => path === sp || path.startsWith(sp + '/'))) return `/${currentLang}/games`;
    if (aiSubPaths.some((sp) => path === sp || path.startsWith(sp + '/'))) return `/${currentLang}/ai`;
    if (moreSubPaths.some((sp) => path === sp || path.startsWith(sp + '/'))) return 'more';

    const found = findKeyInItems(menuItems);
    if (found) return found;
    const segments = path.replace(/^\/[^\/]+/, '').split('/').filter(Boolean);
    if (segments.length > 0) {
      const basePath = `/${currentLang}/${segments[0]}`;
      for (const item of menuItems) {
        if (item && 'key' in item && typeof item.key === 'string' && item.key === basePath) {
          return item.key;
        }
      }
    }
    return `/${currentLang}/`;
  })();

  /**
   * 处理侧边栏空白区域的点击事件
   *
   * 仅在点击目标与当前元素相同时触发（即点击空白区域而非子元素），实现：
   * - 折叠模式下如果子导航已打开，点击空白关闭子导航并重置为 'main' 模式
   * - 否则切换侧边栏的折叠状态
   *
   * @param e - React 鼠标事件对象
   */
  const handleBlankClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (collapsed && navMode !== 'main') {
        // 子导航打开时，点击空白关闭子导航并展开侧栏
        onNavModeChange('main');
      } else {
        // 子导航未打开时，切换折叠状态
        onToggleCollapse?.();
      }
    }
  };

  /**
   * 处理导航菜单项的点击事件
   *
   * 处理逻辑按优先级：
   * 1. 退出登录：如果 key 为 'logout'，直接调用 logout() 并返回
   * 2. 折叠模式 + 子导航打开时：先关闭子导航再执行导航
   * 3. 分类导航（games/ai/more）：
   *    - 切换对应的导航模式
   *    - 如果 categoryClickOnly 为 true，仅切换模式不执行路由跳转
   *    - 对于 'more' 分类，导航到首页（/）
   * 4. 普通导航项：直接 navigate 到目标路径
   * 5. 导航完成后调用 onNavigate 回调（用于移动端关闭侧边栏）
   *
   * @param param - 菜单点击事件参数，包含 key（菜单项标识符）
   */
  const handleClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') {
      logout();
      return;
    }

    // 收缩模式 + 子导航打开时，点击主导航项先关闭子导航
    if (collapsed && navMode !== 'main') {
      onNavModeChange('main');
      if (key === 'more') {
        onNavModeChange('more');
      } else {
        navigate(key);
      }
      onNavigate?.();
      return;
    }

    if (key === `/${currentLang}/games`) {
      onNavModeChange('games');
      if (categoryClickOnly) return;
    } else if (key === 'more') {
      onNavModeChange('more');
      if (categoryClickOnly) return;
      return;
    } else {
      onNavModeChange('main');
    }
    navigate(key);
    onNavigate?.();
  };

  return (
    /**
     * 侧边栏整体布局（从上到下）：
     *
     * 1. 头部区域（Header）：
     *    - GameHub Logo（渐变背景 + "G"字母）
     *    - 应用名称（折叠时隐藏）
     *    - 语言切换下拉菜单，支持中英文等 6 种语言（折叠时隐藏）
     *
     * 2. 导航菜单区域（Navigation Menu）：
     *    - 使用 Ant Design Menu 组件渲染菜单项
     *    - 支持滚动（当菜单项过多时）
     *    - 空白区域点击可切换折叠状态或关闭子导航
     *
     * 3. 底部区域（Bottom Section）：
     *    - 社交链接：X、YouTube、Discord、TikTok、Facebook 图标（仅展开时显示）
     *    - 用户信息区域：登录后显示通知铃铛、头像、用户名、邮箱，点击弹出
     *      下拉菜单提供个人中心和退出登录选项
     */
    <div className="flex flex-col h-full">
      {/* Header: Logo + Language */}
      <div className="flex items-center h-16 px-4 border-b border-dark-700 gap-2">
        <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-lg">G</span>
        </div>
        {!collapsed && (
          <span className="text-xl font-bold gradient-text truncate flex-1">GameHub</span>
        )}
        {!collapsed && (
          <Dropdown
            menu={{
              items: languages.map((l) => ({
                key: l.code,
                label: (
                  <span className="flex items-center space-x-2 py-1">
                    <FlagIcon country={l.country} />
                    <span>{l.name}</span>
                    {l.code === currentLanguage.code && (
                      <span className="text-primary-500 ml-auto">✓</span>
                    )}
                  </span>
                ),
                onClick: () => handleLanguageChange(l.code),
              })),
            }}
            placement="bottomRight"
          >
            <button className="p-1.5 rounded-md text-gray-400 hover:text-primary-400 hover:bg-dark-700 transition-colors" title="语言">
              <FlagIcon country={currentLanguage.country} />
            </button>
          </Dropdown>
        )}
      </div>

      {/* 导航菜单区域 — 使用 Ant Design Menu 组件渲染侧边导航项，支持键盘导航和主题切换 */}
      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin" onClick={handleBlankClick}>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleClick}
          theme="dark"
          className="sidebar-menu"
          inlineIndent={16}
        />
      </div>

      {/* 底部区域 — 社交链接（折叠时隐藏）和用户信息（通知铃铛、用户下拉菜单） */}
      <div className="border-t border-dark-700" onClick={handleBlankClick}>
        {/* 社交链接 — 仅在展开模式下显示，包含 X/Twitter、YouTube、Discord、TikTok、Facebook */}
        {!collapsed && (
          <div className="flex items-center justify-center gap-5 py-3 px-4 border-b border-dark-700">
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors" title="X">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-red-500 transition-colors" title="YouTube">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
            <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-indigo-400 transition-colors" title="Discord">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6089 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
              </svg>
            </a>
            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-400 transition-colors" title="TikTok">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
              </svg>
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 transition-colors" title="Facebook">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
          </div>
        )}
        {/* 用户区域 — 登录后显示通知铃铛和用户信息，点击用户区域弹出下拉菜单（个人中心/退出登录） */}
        <div className="p-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-1">
              <NotificationBell />
              <Dropdown
                menu={{
                  items: [
                    {
                      key: `/${currentLang}/my`,
                      icon: <UserOutlined />,
                      label: t('navigation.personalCenter', '个人中心'),
                      onClick: () => { navigate(`/${currentLang}/my`); onNavigate?.(); },
                    },
                    { type: 'divider' },
                    {
                      key: 'logout',
                      icon: <LogoutOutlined />,
                      label: t('navigation.logout', '退出登录'),
                      danger: true,
                      onClick: () => { logout(); onNavigate?.(); },
                    },
                  ],
                }}
                placement="topRight"
                trigger={collapsed ? ['click'] : ['hover']}
              >
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-dark-700 cursor-pointer transition-colors flex-1">
                  <Avatar
                    size="small"
                    className="bg-gradient-to-r from-primary-500 to-secondary-500 flex-shrink-0"
                    src={user?.avatarUrl}
                  >
                    {user?.username?.[0]?.toUpperCase()}
                  </Avatar>
                  {!collapsed && (
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-gray-200 truncate">{user?.displayName || user?.username}</div>
                      <div className="text-xs text-gray-500 truncate">{user?.email}</div>
                    </div>
                  )}
                </div>
              </Dropdown>
            </div>
          ) : (
            <button
              onClick={() => navigate(`/${currentLang}/login`)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
            >
              <UserOutlined className="text-lg" />
              {!collapsed && <span className="text-sm">登录</span>}
            </button>
          )}
        </div>
      </div>

    </div>
  );
};

export default Sidebar;
