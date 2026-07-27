import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button, Result, Typography } from 'antd';
import { CheckCircleOutlined, WarningOutlined, LoadingOutlined } from '@ant-design/icons';
import SEO from '../components/SEO';
import apiService from '../api';

const { Text } = Typography;

type VerifyStatus = 'verifying' | 'success' | 'invalid' | 'error';

const VerifyEmailPage = () => {
  const [status, setStatus] = useState<VerifyStatus>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const token = queryParams.get('token');

    if (!token) {
      setStatus('invalid');
      return;
    }

    const verify = async () => {
      try {
        await apiService.verifyEmail(token);
        setStatus('success');
      } catch (err: any) {
        const message = err?.response?.data?.message || err?.message || '邮箱验证失败，请稍后重试';
        setErrorMessage(message);
        setStatus('error');
      }
    };

    // 延迟一点让用户看到加载状态
    const timer = setTimeout(verify, 500);
    return () => clearTimeout(timer);
  }, [location.search]);

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <Result
            icon={<LoadingOutlined className="text-blue-500 text-6xl" />}
            title="验证邮箱中..."
            subTitle="请稍候，正在验证您的邮箱地址"
          />
        );
      case 'success':
        return (
          <Result
            icon={<CheckCircleOutlined className="text-green-500" />}
            status="success"
            title="邮箱验证成功"
            subTitle="您的邮箱已成功验证！现在您可以享受 GameHub 的所有功能。"
            extra={[
              <Button
                type="primary"
                key="login"
                onClick={() => navigate('/login')}
                className="w-full h-12"
              >
                前往登录
              </Button>,
              <Button
                key="home"
                onClick={() => navigate('/')}
                className="w-full h-12 mt-4"
              >
                返回首页
              </Button>,
            ]}
          />
        );
      case 'invalid':
        return (
          <Result
            icon={<WarningOutlined className="text-yellow-500" />}
            status="warning"
            title="无效的验证链接"
            subTitle="验证链接无效或已过期，请重新注册或联系客服。"
            extra={[
              <Button
                key="home"
                onClick={() => navigate('/')}
                className="w-full h-12"
              >
                返回首页
              </Button>,
            ]}
          />
        );
      case 'error':
        return (
          <Result
            icon={<WarningOutlined className="text-red-500" />}
            status="error"
            title="验证失败"
            subTitle={errorMessage}
            extra={[
              <Button
                key="home"
                onClick={() => navigate('/')}
                className="w-full h-12"
              >
                返回首页
              </Button>,
            ]}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 p-4">
      <SEO
        title="验证邮箱 | GGHubs"
        description="验证您的 GGHubs 邮箱地址"
        keywords="邮箱验证, 验证邮箱, GGHubs验证, 邮箱认证, 账户验证"
        noindex
      />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg mb-4">
            <span className="text-white text-2xl font-bold">G</span>
          </div>
        </div>

        <div className="bg-dark-800 border border-dark-700 shadow-xl rounded-2xl p-8">
          {renderContent()}
        </div>

        <div className="text-center mt-8">
          <Text type="secondary">
            遇到问题？{' '}
            <Link to="/about" className="text-blue-600 hover:text-blue-800 font-medium">
              联系客服
            </Link>
          </Text>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
