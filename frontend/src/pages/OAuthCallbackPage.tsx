import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { Spin, Result, Button } from 'antd';
import axios from 'axios';
import SEO from '../components/SEO';

const OAuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { lang: paramLang } = useParams<{ lang?: string }>();
  const lang = paramLang || 'cn';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // 检查是否有错误参数
        const oauthError = searchParams.get('oauth_error');
        if (oauthError) {
          setStatus('error');
          setErrorMsg(decodeURIComponent(oauthError));
          return;
        }

        const accessToken = searchParams.get('accessToken');
        const refreshToken = searchParams.get('refreshToken');

        if (!accessToken || !refreshToken) {
          setStatus('error');
          setErrorMsg('OAuth 回调缺少必要参数');
          return;
        }

        // 保存 tokens
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);

        // 设置 axios 默认头部
        axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

        // 获取用户信息
        const response = await axios.get('/api/v1/auth/me');
        const user = response.data?.data?.user;

        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
        }

        // 清除 URL 中的敏感参数
        window.history.replaceState({}, document.title, window.location.pathname);

        setStatus('success');

        // 使用 window.location.href 强制整页刷新，确保 AuthContext
        // 重新 mount 并从 localStorage 读取新的 token 和用户信息。
        // 不能用 navigate()（SPA 客户端路由），否则 AuthContext 的
        // React state 不会更新，导致显示旧用户或未登录状态。
        setTimeout(() => {
          if (user?.role === 'admin' || user?.role === 'super_admin') {
            window.location.href = '/admin/dashboard';
          } else {
            window.location.href = '/';
          }
        }, 1500);

      } catch (error) {
        console.error('OAuth 回调处理失败:', error);
        setStatus('error');
        setErrorMsg('登录处理失败，请重试');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <SEO title="第三方登录 | GameHub" description="正在处理第三方账号登录..." keywords="OAuth登录,第三方登录,社交登录,GameHub" noindex />
        <div className="text-center">
          <Spin size="large" />
          <p className="mt-4 text-gray-500">正在登录，请稍候...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <SEO title="登录失败 | GameHub" description="第三方登录失败" keywords="OAuth登录失败,第三方登录错误,GameHub" noindex />
        <Result
          status="error"
          title="登录失败"
          subTitle={errorMsg}
          extra={[
            <Button key="login" type="primary" onClick={() => navigate(`/${lang}/login`)}>
              返回登录页
            </Button>,
            <Button key="home" onClick={() => navigate('/')}>
              返回首页
            </Button>,
          ]}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <SEO title="登录成功 | GameHub" description="第三方账号登录成功" keywords="OAuth登录成功,GameHub登录" noindex />
      <Result
        status="success"
        title="登录成功"
        subTitle="即将跳转到首页..."
      />
    </div>
  );
};

export default OAuthCallbackPage;
