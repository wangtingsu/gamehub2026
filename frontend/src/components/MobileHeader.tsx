/**
 * MobileHeader（移动端顶部导航栏）组件
 *
 * 手机端页面顶部的固定导航栏（sticky top-0），包含：
 * - 左侧：GameHub Logo + 品牌名，点击跳转到首页
 * - 右侧：语言切换下拉菜单 + 用户登录/头像
 *
 * 仅在移动端布局（屏幕宽度 <= 767px）时由 Layout 组件渲染。
 * 使用 sticky 定位固定在页面顶部（z-50 层级）。
 */

import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Dropdown, Avatar } from 'antd';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import FlagIcon from './FlagIcon';
import ThemeSwitcher from './ThemeSwitcher';

/**
 * MobileHeader 组件
 *
 * 手机端头部导航栏，无 Props 入参。从 URL 路径和全局上下文中获取所需数据。
 * 仅在手机端布局中渲染。
 */
const MobileHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang || 'cn';

  /**
   * 支持的语言列表
   * 每项包含：代码（code）、显示名称（name）、国旗标识（country）
   */
  const languages = [
    { code: 'en', name: 'English', country: 'US' },
    { code: 'cn', name: '中文', country: 'CN' },
    { code: 'ja', name: '日本語', country: 'JP' },
    { code: 'ko', name: '한국어', country: 'KR' },
    { code: 'es', name: 'Español', country: 'ES' },
    { code: 'fr', name: 'Français', country: 'FR' },
  ];

  /** 当前激活的语言对象，用于显示国旗和名称 */
  const currentLanguage = languages.find((l) => l.code === currentLang) || languages[0];

  /**
   * URL 路径代码到 i18n 完整语言代码的映射表
   * 键为 URL 中使用的短代码，值为 i18next 所需的完整标识
   */
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
    <div className="mobile-header flex items-center justify-between h-14 px-4 border-b border-dark-700 bg-dark-900 sticky top-0 z-50">
      {/* Logo */}
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(`/${currentLang}/`)}>
        <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-lg">G</span>
        </div>
        <span className="text-lg font-bold gradient-text">GameHub</span>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Language switch */}
        <Dropdown
          menu={{
            items: languages.map((l) => ({
              key: l.code,
              label: (
                <span className="flex items-center gap-2 py-1">
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
          <button className="w-8 h-8 flex items-center justify-center rounded-md text-gray-400 hover:text-primary-400 hover:bg-dark-700 transition-colors">
            <FlagIcon country={currentLanguage.country} />
          </button>
        </Dropdown>

        <ThemeSwitcher />

        {/* Login / User avatar */}
        {isAuthenticated ? (
          <Dropdown
            menu={{
              items: [
                {
                  key: `/${currentLang}/my`,
                  icon: <UserOutlined />,
                  label: t('navigation.personalCenter', '个人中心'),
                  onClick: () => navigate(`/${currentLang}/my`),
                },
                { type: 'divider' as const },
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: t('navigation.logout', '退出登录'),
                  danger: true,
                  onClick: () => logout(),
                },
              ],
            }}
            placement="bottomRight"
            trigger={['click']}
          >
            <Avatar
              size="small"
              className="bg-gradient-to-r from-primary-500 to-secondary-500 cursor-pointer flex-shrink-0"
              src={user?.avatarUrl}
            >
              {user?.username?.[0]?.toUpperCase()}
            </Avatar>
          </Dropdown>
        ) : (
          <button
            onClick={() => navigate(`/${currentLang}/login`)}
            className="px-3 py-1.5 text-sm text-primary-400 hover:text-primary-300 font-medium rounded-md hover:bg-dark-700 transition-colors"
          >
            {t('navigation.login', '登入')}
          </button>
        )}
      </div>
    </div>
  );
};

export default MobileHeader;
