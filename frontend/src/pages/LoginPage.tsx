import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { useNavigate, useLocation, useParams, Link } from 'react-router-dom';
import { Form, Input, Button, Card, Alert, Typography, Divider, Spin, Tabs } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined, PhoneOutlined, MessageOutlined, GoogleOutlined, GithubOutlined, WechatOutlined, AppleOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';
import TwoFactorVerify from '../components/TwoFactorVerify';
import { useSmsCountdown } from '../hooks/useSmsCountdown';
import apiService from '../api';
import type { OAuthProvider } from '../api/types';

const { Title, Text, Paragraph } = Typography;

// OAuth 提供商图标映射
const providerIcons: Record<string, React.ReactNode> = {
  google: <GoogleOutlined />,
  github: <GithubOutlined />,
  apple: <AppleOutlined />,
  wechat: <WechatOutlined />,
};

const LoginPage = () => {
  const [form] = Form.useForm();
  const [phoneForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { countdown, start: startCountdown } = useSmsCountdown();
  const [enabledProviders, setEnabledProviders] = useState<OAuthProvider[]>([]);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginByPhone, sendSmsCode, isAuthenticated, isLoading: authLoading, twoFactorRequired } = useAuth();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang || 'cn';

  // 获取已启用的 OAuth 提供商列表
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const result = await apiService.getOAuthProviders();
        setEnabledProviders(result.providers || []);
      } catch {
        // 静默失败，不显示 OAuth 按钮
      }
    };
    fetchProviders();
  }, []);

  // 如果已经登录，在浏览器绘制前立即重定向到对应页面（避免闪烁）
  useLayoutEffect(() => {
    if (!authLoading && isAuthenticated) {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          if (user.role === 'admin' || user.role === 'super_admin') {
            navigate('/admin/dashboard', { replace: true });
          } else {
            navigate(`/${currentLang}`, { replace: true });
          }
          return;
        } catch {
          // ignore parse error
        }
      }
      navigate(`/${currentLang}`, { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, currentLang]);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  // 邮箱登录提交
  const handleEmailLogin = async (values: { email: string; password: string }) => {
    try {
      setSubmitting(true);
      setError(null);
      await login(values);

      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          if (user.role === 'admin' || user.role === 'super_admin') {
            navigate('/admin/dashboard', { replace: true });
            return;
          }
        } catch {
          // ignore parse error
        }
      }
      navigate(from, { replace: true });
    } catch (err: any) {
      // 双因素认证场景，不显示错误消息
      if (err.code === 'TWO_FACTOR_REQUIRED') return;
      console.error('登录失败:', err);
      const errorMessage = err?.response?.data?.message ||
                          err?.message ||
                          '登录失败，请检查邮箱和密码';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // 手机号登录提交
  const handlePhoneLogin = async (values: { phone: string; code: string }) => {
    try {
      setSubmitting(true);
      setError(null);
      await loginByPhone(values);

      navigate(from, { replace: true });
    } catch (err) {
      console.error('手机号登录失败:', err);
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                          (err as Error)?.message ||
                          t('auth.loginPage.loginFailed');
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // 发送短信验证码
  const handleSendCode = async () => {
    try {
      const phone = phoneForm.getFieldValue('phone');
      if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
        setError(t('auth.loginPage.phoneInvalid'));
        return;
      }
      setError(null);
      await sendSmsCode(phone, 'login');
      startCountdown();
    } catch (err) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                          (err as Error)?.message ||
                          t('auth.loginPage.loginFailed');
      setError(errorMessage);
    }
  };

  // 双因素认证验证
  if (twoFactorRequired) {
    return <TwoFactorVerify />;
  }

  // 等待认证状态加载完成 或 已登录等待重定向
  if (authLoading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <Spin size="large" />
      </div>
    );
  }

  const loginForm = (
    <>
      {error && (
        <Alert
          message={t('auth.loginPage.loginFailed')}
          description={error}
          type="error"
          showIcon
          className="mb-6"
          closable
          onClose={() => setError(null)}
        />
      )}

      <Form
        form={form}
        name="login"
        layout="vertical"
        onFinish={handleEmailLogin}
        size="large"
      >
        <Form.Item
          name="email"
          label={t('auth.loginPage.emailLabel')}
          rules={[
            { required: true, message: t('auth.loginPage.emailRequired') },
            { type: 'email', message: t('auth.loginPage.emailInvalid') },
          ]}
        >
          <Input
            prefix={<UserOutlined className="text-gray-400" />}
            placeholder={t('auth.loginPage.emailPlaceholder')}
            autoComplete="email"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label={t('auth.loginPage.passwordLabel')}
          rules={[
            { required: true, message: t('auth.loginPage.passwordRequired') },
            { min: 8, message: t('auth.loginPage.passwordMinLength') },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined className="text-gray-400" />}
            placeholder={t('auth.loginPage.passwordPlaceholder')}
            autoComplete="current-password"
          />
        </Form.Item>

        <div style={{ textAlign: 'right', marginTop: -16, marginBottom: 16 }}>
          <Link to={`/${currentLang}/forgot-password`} className="text-gray-400 hover:text-blue-400" style={{ fontSize: 13 }}>
            忘记密码？
          </Link>
        </div>

        <Form.Item className="mb-4">
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            icon={<LoginOutlined />}
            size="large"
            className="w-full h-12"
          >
            {submitting ? t('auth.loginPage.loggingIn') : t('auth.loginPage.loginButton')}
          </Button>
        </Form.Item>
      </Form>
    </>
  );

  const phoneLoginForm = (
    <>
      {error && (
        <Alert
          message={t('auth.loginPage.loginFailed')}
          description={error}
          type="error"
          showIcon
          className="mb-6"
          closable
          onClose={() => setError(null)}
        />
      )}

      <Form
        form={phoneForm}
        name="phoneLogin"
        layout="vertical"
        onFinish={handlePhoneLogin}
        size="large"
      >
        <Form.Item
          name="phone"
          label={t('auth.loginPage.phoneLabel')}
          rules={[
            { required: true, message: t('auth.loginPage.phoneRequired') },
            { pattern: /^1[3-9]\d{9}$/, message: t('auth.loginPage.phoneInvalid') },
          ]}
        >
          <Input
            prefix={<PhoneOutlined className="text-gray-400" />}
            placeholder={t('auth.loginPage.phoneLabel')}
            autoComplete="tel"
          />
        </Form.Item>

        <Form.Item
          name="code"
          label={t('auth.loginPage.codeLabel')}
          rules={[
            { required: true, message: t('auth.loginPage.codeRequired') },
            { len: 6, message: t('auth.loginPage.codeLength') },
          ]}
        >
          <div className="flex gap-2">
            <Input
              prefix={<MessageOutlined className="text-gray-400" />}
              placeholder={t('auth.loginPage.codeLabel')}
              className="flex-1"
              maxLength={6}
              onChange={(e) => {
                if (e.target.value.length === 6) {
                  setTimeout(() => phoneForm.submit(), 100);
                }
              }}
            />
            <Button
              disabled={countdown > 0}
              onClick={handleSendCode}
              className="whitespace-nowrap"
            >
              {countdown > 0 ? `${countdown}s` : t('auth.loginPage.sendCode')}
            </Button>
          </div>
        </Form.Item>

        <Form.Item className="mb-4">
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            icon={<LoginOutlined />}
            size="large"
            className="w-full h-12"
          >
            {submitting ? t('auth.loginPage.loggingIn') : t('auth.loginPage.loginButton')}
          </Button>
        </Form.Item>
      </Form>
    </>
  );

  const tabItems = [
    { key: 'phone', label: t('auth.loginPage.phoneLogin'), children: phoneLoginForm },
    { key: 'email', label: t('auth.loginPage.emailLogin'), children: loginForm },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 p-4">
      <SEO
        title={`${t('auth.loginPage.loginButton')} | GameHub`}
        description={t('auth.loginPage.subtitle')}
        keywords="login, GameHub login, gaming community, account login"
        noindex
      />
      <div className="w-full max-w-md">
        {/* Logo和标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg mb-4">
            <span className="text-white text-2xl font-bold">G</span>
          </div>
          <Title level={1} className="mb-2 !text-gray-100">{t('auth.loginPage.title')}</Title>
          <Text className="text-gray-400">{t('auth.loginPage.subtitle')}</Text>
        </div>

        {/* 登录卡片 */}
        <Card className="shadow-xl border-0 rounded-2xl !bg-dark-800">
          {/* 欢迎 & 注册引导 */}
          <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-4 mb-6 text-center">
            <Text className="text-blue-300 text-base font-medium">
              👋 {t('auth.loginPage.bannerTitle')}
            </Text>
            <div className="mt-2 text-blue-400">
              {t('auth.loginPage.bannerNoAccount')}
              <Link
                to={`/${currentLang}/register`}
                className="text-blue-300 font-bold hover:text-blue-200 ml-1 underline"
              >
                {t('auth.loginPage.bannerRegister')}
              </Link>
              {t('auth.loginPage.bannerSupport')}
            </div>
          </div>

          <Tabs items={tabItems} />

          {/* 社交登录 */}
          {enabledProviders.length > 0 && (
            <>
              <Divider>{t('auth.loginPage.orUseOther')}</Divider>
              <div className="space-y-2">
                <div className="flex justify-center gap-2 flex-wrap">
                  {enabledProviders.map((provider) => {
                    const icon = providerIcons[provider.provider];
                    return (
                      <Button
                        key={provider.provider}
                        icon={icon}
                        onClick={() => window.location.href = `/api/v1/auth/oauth/${provider.provider}`}
                        size="large"
                        className="flex-1 h-10 min-w-[120px]"
                      >
                        {provider.name}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </Card>

        {/* 底部链接 */}
        <div className="text-center mt-8 space-y-4">
          <div>
            <Text className="text-gray-400">{t('auth.loginPage.noAccount')} </Text>
            <Link to={`/${currentLang}/register`} className="text-blue-400 hover:text-blue-300 font-medium">
              {t('auth.loginPage.registerNow')}
            </Link>
          </div>

          <div>
            <Link to={`/${currentLang}/forgot-password`} className="text-gray-500 hover:text-blue-400 text-sm">
              {t('auth.loginPage.forgotPassword')}
            </Link>
          </div>

          <div>
            <Text className="text-gray-400">{t('auth.loginPage.backToLogin')} </Text>
            <Link to="/" className="text-blue-400 hover:text-blue-300 font-medium">
              {t('auth.loginPage.backToHomePage')}
            </Link>
          </div>

          <div className="text-xs text-gray-500">
            {t('auth.loginPage.copyright', { year: new Date().getFullYear() })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
