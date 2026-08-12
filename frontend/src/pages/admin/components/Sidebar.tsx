import React from 'react';
import { Menu, Modal } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAdminMenu, filterMenu } from './adminMenu.tsx';

interface SidebarProps {
  /** 侧边栏宽度（px），默认 240；传入 80 即为折叠态 */
  width?: number;
  allowedMenus?: string[];
}

/**
 * 管理后台侧边栏
 * - 默认展开不折叠，可通过 width 属性控制宽度
 * - 菜单配置在 adminMenu.ts 中统一管理，方便调用和切换
 */
const Sidebar: React.FC<SidebarProps> = ({ width = 240, allowedMenus }: SidebarProps) => {
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
          window.location.href = '/admin/login';
        },
      });
      return;
    }
    navigate(key);
  };

  const menuItems = getAdminMenu();
  const filteredItems = filterMenu(menuItems, allowedMenus);

  const isCollapsed = width <= 80;

  return (
    <Menu
      mode="inline"
      selectedKeys={[location.pathname]}
      defaultOpenKeys={['/admin/content']}
      items={filteredItems}
      onClick={({ key }) => handleMenuClick(key)}
      inlineCollapsed={isCollapsed}
      style={{
        border: 'none',
        background: 'transparent',
        width,
        minWidth: width,
        maxWidth: width,
        transition: 'width 0.2s',
      }}
    />
  );
};

export default Sidebar;
