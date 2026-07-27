/**
 * Navbar（顶部导航栏）组件
 *
 * 桌面端和手机端公用的顶部导航栏，使用 sticky 定位固定在页面顶部（z-40）。
 * 包含以下功能区域：
 * - 左侧：侧栏折叠/展开按钮 + Logo（侧栏折叠或手机端时显示）
 * - 右侧：搜索框（手机端为图标按钮，点击弹出 Drawer）、语言切换、通知铃铛、用户登录/头像
 *
 * 使用毛玻璃效果（glass-effect）样式。
 */

import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Bars3Icon, UserCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { Dropdown, Avatar, Button, Drawer } from 'antd';
import { DownOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import SearchBar from './SearchBar';
import NotificationBell from './NotificationBell';
import FlagIcon from './FlagIcon';
import ThemeSwitcher from './ThemeSwitcher';

/**
 * Navbar 组件的属性类型定义
 *
 * @property collapsed - 侧栏是否处于折叠状态
 * @property isMobile - 当前是否为手机端屏幕
 * @property onToggleSidebar - 切换侧栏折叠状态的回调函数
 */
interface NavbarProps {
  collapsed: boolean;
  isMobile: boolean;
  onToggleSidebar: () => void;
}

/**
 * Navbar 组件
 *
 * 全局顶部导航栏。接收侧栏折叠状态和设备类型作为 Props。
 * 手机端将 SearchBar 收起为图标按钮，点击后弹出 Drawer 展示。
 *
 * @example
 * <Navbar
 *   collapsed={collapsed}
 *   isMobile={isMobile}
 *   onToggleSidebar={() => setCollapsed(!collapsed)}
 * />
 */
const Navbar = ({ collapsed, isMobile, onToggleSidebar }: NavbarProps) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
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
   * 语言切换处理函数
   * 切换 i18n 语言并同步更新 URL 路径。
   * 保留当前页面路径（去掉旧语言前缀后拼接新语言前缀）。
   *
   * @param languageCode - 目标语言代码（如 "en"、"cn"）
   */
  const handleLanguageChange = async (languageCode: string) => {
    await i18n.changeLanguage(urlToI18n[languageCode] || languageCode);
    const currentPath = location.pathname.replace(/^\/[^\/]+/, '') || '/';
    navigate(`/${languageCode}${currentPath}`);
  };

  return (
    <header>
    <nav className="glass-effect sticky top-0 z-40 border-b border-dark-700">
      <div className="px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Left: toggle + logo */}
          <div className="flex items-center">
            {isMobile ? (
              <button
                onClick={onToggleSidebar}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-dark-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                aria-label="Toggle menu"
              >
                <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
              </button>
            ) : (
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={onToggleSidebar}
                className="text-gray-400 hover:text-white !border-0 !shadow-none"
                style={{ fontSize: '18px', width: 40, height: 40 }}
              />
            )}

            {/* Logo: show when sidebar collapsed (desktop) or always (mobile) */}
            {(isMobile || collapsed) && (
              <Link to={`/${currentLang}/`} className="flex items-center space-x-2 ml-1">
                <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">G</span>
                </div>
                <span className="text-xl font-bold gradient-text">GameHub</span>
              </Link>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex items-center space-x-1 sm:space-x-3">
            {/* Search: icon on mobile, bar on tablet+ */}
            {isMobile ? (
              <>
                <button
                  onClick={() => setSearchOpen(true)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  aria-label="Search"
                >
                  <MagnifyingGlassIcon className="w-5 h-5" />
                </button>
                {searchOpen && (
                  <Drawer
                    placement="top"
                    open={searchOpen}
                    onClose={() => setSearchOpen(false)}
                    height="auto"
                    styles={{ body: { padding: '12px', background: '#1e293b' } }}
                  >
                    <SearchBar />
                  </Drawer>
                )}
              </>
            ) : (
              <SearchBar compact />
            )}

            {/* Language */}
            <Dropdown
              menu={{
                items: languages.map((lang) => ({
                  key: lang.code,
                  label: (
                    <span className="flex items-center space-x-2 py-1">
                      <FlagIcon country={lang.country} />
                      <span>{lang.name}</span>
                      {lang.code === currentLanguage.code && (
                        <span className="text-primary-500 ml-auto">✓</span>
                      )}
                    </span>
                  ),
                  onClick: () => handleLanguageChange(lang.code),
                })),
              }}
              placement="bottomRight"
            >
              <button className="p-3 min-h-[44px] text-gray-400 hover:text-primary-400 transition-colors flex items-center space-x-1">
                <FlagIcon country={currentLanguage.country} />
                <span className="text-sm font-medium hidden sm:inline">{currentLanguage.code.toUpperCase()}</span>
              </button>
            </Dropdown>

            {/* Notifications */}
            <ThemeSwitcher />
            {isAuthenticated && <NotificationBell />}

            {/* User */}
            {isAuthenticated ? (
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'center',
                      icon: <UserCircleIcon className="w-4 h-4" />,
                      label: t('navigation.personalCenter', '个人中心'),
                      onClick: () => navigate(`/${currentLang}/my`),
                    },
                    {
                      key: 'logout',
                      icon: <LogoutOutlined />,
                      label: t('navigation.logout'),
                      danger: true,
                      onClick: () => logout(),
                    },
                  ],
                }}
                placement="bottomRight"
              >
                <div className="flex items-center space-x-2 cursor-pointer hover:bg-dark-800 px-2 py-2 rounded-lg transition-colors">
                  <Avatar
                    size="small"
                    className="bg-gradient-to-r from-primary-500 to-secondary-500"
                    src={user?.avatarUrl}
                  >
                    {user?.username?.[0]?.toUpperCase()}
                  </Avatar>
                  <DownOutlined className="text-gray-400 text-xs hidden sm:inline" />
                </div>
              </Dropdown>
            )}
            {!isAuthenticated ? (
              <button
                className="btn btn-outline text-sm py-2 px-3 sm:px-4"
                onClick={() => navigate(`/${currentLang}/login`)}
              >
                {t('auth.login')}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
    </header>
  );
};

export default Navbar;
