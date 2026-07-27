import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, message } from 'antd';
import { UserOutlined, LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import axios from 'axios';
import SEO from '../../../components/SEO';

const { Title, Text } = Typography;

const AdminLogin: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      // 通过 /admin-api 代理调用管理服务器独立登录接口
      const response = await axios.post('/admin-api/v1/admin/login', {
        username: values.username,
        password: values.password,
      });

      if (response.data?.success) {
        const { token } = response.data.data;
        // 存储管理员 token，与前端用户 token 完全独立
        localStorage.setItem('adminToken', token);
        message.success('管理员登录成功');
        // 使用整页跳转确保 React 组件树完全重建，避免客户端路由导航导致的状态不一致
        window.location.href = '/admin/dashboard';
      } else {
        setError(response.data?.error || '登录失败');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '登录失败，请检查用户名和密码';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // 如果已登录，直接整页跳转到仪表盘
  React.useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      window.location.href = '/admin/dashboard';
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <SEO title="管理员登录 | GameHub" description="GameHub 管理后台登录" keywords="管理员登录, 管理后台, GameHub管理" noindex />
      <Card
        className="w-full max-w-md shadow-2xl"
        styles={{
          body: { padding: '40px' },
        }}
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-4">
            <SafetyCertificateOutlined className="text-white text-3xl" />
          </div>
          <Title level={3} className="mb-1">GameHub 管理后台</Title>
          <Text type="secondary">使用管理员账号登录</Text>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            className="mb-4"
            onClose={() => setError(null)}
          />
        )}

        <Form
          onFinish={handleLogin}
          layout="vertical"
          size="large"
          autoComplete="off"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入管理员用户名' }]}
          >
            <Input
              prefix={<UserOutlined className="text-gray-400" />}
              placeholder="管理员用户名"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入管理员密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="管理员密码"
            />
          </Form.Item>

          <Form.Item className="mb-0 mt-6">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              className="h-12 text-base font-medium"
            >
              登录管理后台
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center mt-6">
          <Text type="secondary" className="text-sm">
            此登录页面独立于前端用户系统
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default AdminLogin;
