/**
 * 管理后台菜单配置
 * 集中管理所有菜单项，方便多页面共用和切换
 */
import {
  DashboardOutlined, UserOutlined, PlayCircleOutlined, FileTextOutlined,
  SettingOutlined, LogoutOutlined, SafetyOutlined, AuditOutlined,
  UploadOutlined, MailOutlined, BarChartOutlined, TagsOutlined,
  RocketOutlined, StarOutlined, DatabaseOutlined, BellOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

export type AdminMenuItem = Required<MenuProps>['items'][number];

/** 获取默认管理后台菜单 */
export function getAdminMenu(): AdminMenuItem[] {
  return [
    { key: '/admin/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/admin/analytics', icon: <BarChartOutlined />, label: '业务分析' },
    { key: '/admin/profiling', icon: <TagsOutlined />, label: '用户画像' },
    { key: '/admin/users', icon: <UserOutlined />, label: '用户管理' },
    { key: '/admin/monitoring', icon: <SafetyOutlined />, label: '监控' },
    { key: '/admin/audit-logs', icon: <AuditOutlined />, label: '审计日志' },
    { key: '/admin/deployments', icon: <RocketOutlined />, label: '部署管理' },
    { key: '/admin/backups', icon: <DatabaseOutlined />, label: '备份恢复' },
    { key: '/admin/uploads', icon: <UploadOutlined />, label: '文件管理' },
    { key: '/admin/email', icon: <MailOutlined />, label: '邮件管理' },
    { key: '/admin/notifications', icon: <BellOutlined />, label: '通知管理' },
    { key: '/admin/games', icon: <PlayCircleOutlined />, label: '游戏管理' },
    { key: '/admin/recommend', icon: <StarOutlined />, label: '推荐管理' },
    { key: '/admin/review-queue', icon: <CheckCircleOutlined />, label: '审核队列' },
    {
      key: '/admin/content', icon: <FileTextOutlined />, label: '内容管理',
      children: [
        { key: '/admin/content/news', label: '新闻' },
        { key: '/admin/content/blogs', label: '博客' },
        { key: '/admin/content/guides', label: '攻略' },
        { key: '/admin/content/reviews', label: '评测' },
        { key: '/admin/content/community', label: '论坛' },
        { key: '/admin/content/blogspaces', label: '空间' },
      ],
    },
    { type: 'divider' as const },
    { key: '/admin/about', icon: <FileTextOutlined />, label: 'About' },
    { key: '/admin/settings', icon: <SettingOutlined />, label: 'Settings' },
    { key: '/admin/logout', icon: <LogoutOutlined />, label: 'Logout', danger: true },
  ];
}

/** 根据权限过滤菜单 */
export function filterMenu(items: AdminMenuItem[], allowedMenus?: string[]): AdminMenuItem[] {
  if (!allowedMenus) return items;
  return items
    .map(item => {
      if (!item || !('key' in item)) return null;
      const menuItem = item as any;
      if (menuItem.children && Array.isArray(menuItem.children)) {
        const filteredChildren = menuItem.children.filter(
          (child: any) => child && child.key && allowedMenus.includes(child.key)
        );
        if (filteredChildren.length === 0) return null;
        return { ...menuItem, children: filteredChildren };
      }
      if (menuItem.key === '/admin/logout') return item;
      return allowedMenus.includes(menuItem.key) ? item : null;
    })
    .filter(Boolean) as AdminMenuItem[];
}
