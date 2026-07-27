import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Button, theme, Modal } from 'antd';
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import Sidebar from './Sidebar';
import Breadcrumb from './Breadcrumb';
import AdminLogin from '../Login';
import SEO from '../../../components/SEO';

const { Header, Sider, Content } = AntLayout;

const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [allowedMenus, setAllowedMenus] = useState<string[] | undefined>(undefined);
  const location = useLocation();
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  // 检查管理员 token，不存在则显示登录页
  const adminToken = localStorage.getItem('adminToken');
  if (!adminToken && location.pathname !== '/admin/login') {
    return <AdminLogin />;
  }

  // 如果是 /admin/login 路径，直接渲染登录页（不含侧边栏）
  if (location.pathname === '/admin/login') {
    return <AdminLogin />;
  }

  // 加载权限
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const axios = (await import('axios')).default;
        const base = import.meta.env.VITE_ADMIN_API_BASE_URL || '/admin-api/v1';
        const resp = await axios.get(`${base}/admin/permissions`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        if (resp.data?.data?.menus) {
          setAllowedMenus(resp.data.data.menus);
        }
      } catch {
        // 降级：显示全部菜单
        setAllowedMenus(undefined);
      }
    };
    loadPermissions();
  }, [adminToken]);

  const handleLogout = () => {
    Modal.confirm({
      title: '退出管理后台',
      content: '确定要退出管理后台吗？',
      okText: '退出',
      cancelText: '取消',
      onOk: () => {
        localStorage.removeItem('adminToken');
        // 使用整页跳转确保 React 组件树完全重建，避免客户端路由导航导致的状态不一致
        window.location.href = '/admin/login';
      },
    });
  };

  return (
    <>
      <SEO
        title="管理后台 | GameHub"
        description="GameHub 管理后台"
        keywords="管理后台, GameHub管理, 网站管理, 系统管理, 后台管理"
        noindex
      />
      <AntLayout className="min-h-screen">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="light"
        breakpoint="lg"
        collapsedWidth={80}
        className="admin-sider"
        style={{
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div className="p-4">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">GH</span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-gray-800 truncate">GameHub Admin</h1>
                <p className="text-xs text-gray-500 truncate">Management Panel</p>
              </div>
            )}
          </div>
          <Sidebar collapsed={collapsed} allowedMenus={allowedMenus} />
        </div>
      </Sider>

      <AntLayout>
        <Header
          style={{
            background: colorBgContainer,
            padding: '0 16px',
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
          }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: '16px', width: 48, height: 48 }}
            />
            <Breadcrumb />
          </div>

          <div className="flex items-center space-x-4">
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              className="text-gray-600"
            >
              退出
            </Button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold">
              A
            </div>
          </div>
        </Header>

        <Content
          style={{
            margin: '16px',
            padding: 16,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: 8,
          }}
          className="overflow-auto"
        >
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
    </>
  );
};

export default AdminLayout;
