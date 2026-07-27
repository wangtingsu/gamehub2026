import React from 'react';
import { Menu, Modal } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  UserOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  SettingOutlined,
  LogoutOutlined,
  SafetyOutlined,
  AuditOutlined,
  CrownOutlined,
  UploadOutlined,
  MailOutlined,
  BarChartOutlined,
  TagsOutlined,
  RocketOutlined,
  StarOutlined,
  DatabaseOutlined,
  BellOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

type MenuItem = Required<MenuProps>['items'][number];

interface SidebarProps {
  collapsed: boolean;
  allowedMenus?: string[];
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, allowedMenus }: SidebarProps) => {
  // collapsed parameter is currently not used but kept for future responsive features
  void collapsed;
  const navigate = useNavigate();
  const location = useLocation();

  const handleMenuClick = (key: string) => {
    if (key === '/admin/logout') {
      Modal.confirm({
        title: '退出管理后台',
        content: '确定要退出管理后台吗？',
        okText: '退出',
        cancelText: '取消',
        onOk: () => {
          localStorage.removeItem('adminToken');
          // 使用整页跳转确保 React 组件树完全重建
          window.location.href = '/admin/login';
        },
      });
      return;
    }
    navigate(key);
  };

  const menuItems: MenuItem[] = [
    {
      key: '/admin/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/admin/analytics',
      icon: <BarChartOutlined />,
      label: '业务分析',
    },
    {
      key: '/admin/profiling',
      icon: <TagsOutlined />,
      label: '用户画像',
    },
    {
      key: '/admin/users',
      icon: <UserOutlined />,
      label: '用户管理',
    },
    {
      key: '/admin/monitoring',
      icon: <SafetyOutlined />,
      label: '监控',
    },
    {
      key: '/admin/audit-logs',
      icon: <AuditOutlined />,
      label: '审计日志',
    },
    {
      key: '/admin/deployments',
      icon: <RocketOutlined />,
      label: '部署管理',
    },
    {
      key: '/admin/backups',
      icon: <DatabaseOutlined />,
      label: '备份恢复',
    },
    {
      key: '/admin/uploads',
      icon: <UploadOutlined />,
      label: '文件管理',
    },
    {
      key: '/admin/email',
      icon: <MailOutlined />,
      label: '邮件管理',
    },
    {
      key: '/admin/notifications',
      icon: <BellOutlined />,
      label: '通知管理',
    },
    {
      key: '/admin/games',
      icon: <PlayCircleOutlined />,
      label: '游戏管理',
    },
    {
      key: '/admin/recommend',
      icon: <StarOutlined />,
      label: '推荐管理',
    },
    {
      key: '/admin/review-queue',
      icon: <CheckCircleOutlined />,
      label: '审核队列',
    },
    {
      key: '/admin/content',
      icon: <FileTextOutlined />,
      label: '内容管理',
      children: [
        {
          key: '/admin/content/news',
          label: '新闻',
        },
        {
          key: '/admin/content/blogs',
          label: '博客',
        },
        {
          key: '/admin/content/guides',
          label: '攻略',
        },
        {
          key: '/admin/content/reviews',
          label: '测评',
        },
        {
          key: '/admin/content/community',
          label: '论坛',
        },
        {
          key: '/admin/content/blogspaces',
          label: '空间',
        },
      ],
    },
    {
      type: 'divider',
    },
    {
      key: '/admin/about',
      icon: <FileTextOutlined />,
      label: 'About',
    },
    {
      key: '/admin/settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
    {
      key: '/admin/logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
    },
  ];

  // 根据权限过滤菜单项（退出登录项始终保留，嵌套子菜单也过滤）
  const filteredItems = allowedMenus
    ? menuItems
        .map(item => {
          if (!item || !('key' in item)) return null;
          const menuItem = item as any;
          // 有子菜单的项：过滤 children
          if (menuItem.children && Array.isArray(menuItem.children)) {
            const filteredChildren = menuItem.children.filter(
              (child: any) => child && child.key && (allowedMenus.includes(child.key) || child.key === '/admin/logout')
            );
            if (filteredChildren.length === 0) return null;
            return { ...menuItem, children: filteredChildren };
          }
          // 无子菜单：直接检查 key
          if (menuItem.key === '/admin/logout') return item;
          return allowedMenus.includes(menuItem.key) ? item : null;
        })
        .filter(Boolean)
    : menuItems;

  return (
    <Menu
      mode="inline"
      selectedKeys={[location.pathname]}
      defaultOpenKeys={['/admin/content']}
      items={filteredItems}
      onClick={({ key }) => handleMenuClick(key)}
      style={{
        border: 'none',
        background: 'transparent',
      }}
    />
  );
};

export default Sidebar;