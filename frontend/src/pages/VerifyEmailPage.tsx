import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button, Result, Typography } from 'antd';
import { CheckCircleOutlined, WarningOutlined, LoadingOutlined, MailOutlined } from '@ant-design/icons';
import SEO from '../components/SEO';
import apiService from '../api';

const { Text } = Typography;

type VerifyStatus = 'checking' | 'confirm' | 'verifying' | 'success' | 'invalid' | 'error';

const VerifyEmailPage = () => {
  const [status, setStatus] = useState<VerifyStatus>('checking');
  const [errorMessage, setErrorMessage] = useState('');
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // 从 URL 读取 token 并检查有效性
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const t = queryParams.get('token');

    if (!t) {
      setStatus('invalid');
      return;
    }
    setToken(t);

    // 检查令牌是否有效（GET 不会消耗令牌）
    apiService.checkVerificationToken(t)
      .then(result => {
        setStatus(result.valid ? 'confirm' : 'invalid');
      })
      .catch(() => {
        setStatus('invalid');
      });
  }, [location.search]);

  // 用户点击确认按钮，执行验证
  const handleConfirm = async () => {
    setIsLoading(true);
    setStatus('verifying');
    try {
      await apiService.verifyEmail(token);
      setStatus('success');
      // 3 秒后跳转登录页
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || '邮箱验证失败，请稍后重试';
      setErrorMessage(message);
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'checking':
        return (
          <Result
            icon={<LoadingOutlined className="text-blue-500 text-6xl" />}
            title="检查验证链接..."
            subTitle="请稍候"
          />
        );
      case 'confirm':
        return (
          <Result
            icon={<MailOutlined className="text-blue-400 text-6xl" />}
            title="验证邮箱"
            subTitle="点击下方按钮完成账户注册"
            extra={[
              <Button
                type="primary"
                size="large"
                key="confirm"
                loading={isLoading}
                onClick={handleConfirm}
                className="w-full h-12"
              >
                确认验证，完成注册
              </Button>,
            ]}
          />
        );
      case 'verifying':
        return (
          <Result
            icon={<LoadingOutlined className="text-blue-500 text-6xl" />}
            title="正在完成注册..."
            subTitle="请稍候"
          />
        );
      case 'success':
        return (
          <Result
            icon={<CheckCircleOutlined className="text-green-500" />}
            status="success"
            title="注册成功！"
            subTitle="您的账户已创建成功，即将跳转到登录页..."
            extra={[
              <Button
                type="primary"
                key="login"
                onClick={() => navigate('/login')}
                className="w-full h-12"
              >
                立即前往登录
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
            subTitle="验证链接无效或已过期，请重新注册。"
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
