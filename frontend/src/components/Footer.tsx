/**
 * Footer（页脚）组件
 *
 * 网站底部的全局页脚，包含品牌信息、导航链接分组、社交媒体图标以及网站统计信息。
 * 使用 i18next 实现多语言文本渲染，所有内部链接会根据当前语言自动添加语言前缀。
 *
 * 导航链接分组：
 * - discover（发现）：游戏、在线游戏、免费游戏、休闲游戏、新闻、AI 游戏
 * - community（社区）：论坛、评测、指南、趋势、排行榜、Discord
 * - company（公司）：关于我们、招聘、媒体、联系我们
 * - legal（法律）：隐私政策、服务条款、Cookie 政策、行为准则
 *
 * 社交链接：Twitter、YouTube、Twitch、Discord、GitHub
 */

import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/**
 * Footer 组件
 *
 * 渲染网站全局底部区域，无 Props 入参。从 URL 路径中提取 lang 参数用于本地化链接。
 */
const Footer = () => {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang || 'cn';
  const currentYear = new Date().getFullYear();

  /**
   * 为内部链接添加当前语言前缀
   *
   * 根据 URL 中当前的语言参数（lang），在路径前拼接对应的语言标识。
   * 例如：当前语言为 "en" 时，localize('/games') 返回 "/en/games"
   *
   * @param href - 原始路径（以 "/" 开头）
   * @returns 带有语言前缀的完整路径
   */
  const localize = (href: string) => `/${currentLang}${href}`;

  const footerLinks = {
    discover: [
      { key: 'games', href: localize('/games') },
      { key: 'onlineGames', href: localize('/library/online') },
      { key: 'freeGames', href: localize('/free-games') },
      { key: 'cozyGames', href: localize('/cozy-games') },
      { key: 'news', href: localize('/news') },
      { key: 'aiGaming', href: localize('/ai-gaming') },
    ],
    community: [
      { key: 'forums', href: localize('/community') },
      { key: 'reviews', href: localize('/community') + '?tab=reviews' },
      { key: 'guides', href: localize('/guides') },
      { key: 'trending', href: localize('/trending') },
      { key: 'leaderboard', href: localize('/leaderboard') },
      { key: 'discord', href: 'https://discord.gg/gamehub' },
    ],
    company: [
      { key: 'aboutUs', href: localize('/about') },
      { key: 'careers', href: localize('/about/careers') },
      { key: 'press', href: localize('/about/press') },
      { key: 'contact', href: localize('/about/contact') },
    ],
    legal: [
      { key: 'privacyPolicy', href: localize('/legal/privacy') },
      { key: 'termsOfService', href: localize('/legal/terms') },
      { key: 'cookiePolicy', href: localize('/legal/cookies') },
      { key: 'codeOfConduct', href: localize('/legal/conduct') },
    ],
  };

  const socialLinks = [
    { name: 'Twitter', href: 'https://twitter.com/gamehub', icon: 'twitter' },
    { name: 'YouTube', href: 'https://youtube.com/gamehub', icon: 'youtube' },
    { name: 'Twitch', href: 'https://twitch.tv/gamehub', icon: 'twitch' },
    { name: 'Discord', href: 'https://discord.gg/gamehub', icon: 'discord' },
    { name: 'GitHub', href: 'https://github.com/gamehub', icon: 'github' },
  ];

  return (
    <footer className="bg-dark-800 border-t border-dark-700 px-8">
      <div className="py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">G</span>
              </div>
              <span className="text-2xl font-bold gradient-text">GameHub</span>
            </div>
            <p className="text-gray-400 mb-6 max-w-md">
              {t('footer.brand.tagline')}
            </p>

            {/* Social Links */}
            <div className="flex space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="text-gray-400 hover:text-primary-400 transition-colors p-2 hover:bg-dark-700 rounded-lg"
                  aria-label={social.name}
                >
                  <span className="sr-only">{social.name}</span>
                  <div className="w-5 h-5">
                    {social.icon === 'twitter' && (
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    )}
                    {social.icon === 'youtube' && (
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    )}
                    {social.icon === 'twitch' && (
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
                      </svg>
                    )}
                    {social.icon === 'discord' && (
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
                      </svg>
                    )}
                    {social.icon === 'github' && (
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                      </svg>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Navigation Links — discover / community / company */}
          {['discover', 'community', 'company'].map((category) => (
            <div key={category}>
              <h3 className="text-white font-semibold mb-3 text-base">{t(`footer.categories.${category}`)}</h3>
              <ul className="space-y-2">
                {footerLinks[category as keyof typeof footerLinks].map((link) => (
                  <li key={link.key}>
                    <Link
                      to={link.href}
                      className="text-gray-400 hover:text-primary-400 transition-colors text-sm"
                    >
                      {t(`footer.links.${link.key}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar — legal + copyright */}
        <div className="mt-12 pt-8 border-t border-dark-700">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center flex-wrap gap-x-6 gap-y-1 text-sm text-gray-400">
              {footerLinks.legal.map((link) => (
                <Link
                  key={link.key}
                  to={link.href}
                  className="hover:text-primary-400 transition-colors"
                >
                  {t(`footer.links.${link.key}`)}
                </Link>
              ))}
            </div>
            <div className="text-gray-500 text-sm">
              {t('footer.copyright', { year: currentYear })}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;