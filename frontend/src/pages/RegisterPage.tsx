import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Form, Input, Button, Card, Alert, Typography, Divider, Checkbox, Tabs, Spin, Select, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined, MessageOutlined, CheckCircleOutlined, InfoCircleOutlined, LoadingOutlined, GoogleOutlined, GithubOutlined, WechatOutlined, GlobalOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';
import { useSmsCountdown } from '../hooks/useSmsCountdown';
import apiService from '../api';
import type { OAuthProvider } from '../api/types';

const { Title, Text, Paragraph } = Typography;

// OAuth 提供商图标映射
const providerIcons: Record<string, React.ReactNode> = {
  google: <GoogleOutlined />,
  github: <GithubOutlined />,
  wechat: <WechatOutlined />,
};

const RegisterPage = () => {
  const [form] = Form.useForm();
  const [phoneForm] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const { countdown, start: startCountdown } = useSmsCountdown();
  const [enabledProviders, setEnabledProviders] = useState<OAuthProvider[]>([]);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang || 'cn';
  const { register, registerByPhone, sendSmsCode, isAuthenticated } = useAuth();

  // 获取已启用的 OAuth 提供商列表（用于社交注册）
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const result = await apiService.getOAuthProviders();
        setEnabledProviders(result.providers || []);
      } catch {
        // 静默失败
      }
    };
    fetchProviders();
  }, []);

  // 如果已经登录，重定向到主页
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <Spin size="large" />
      </div>
    );
  }

  // 邮箱失焦检查重复
  const handleEmailBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const email = e.target.value;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setEmailChecking(true);
    setEmailExists(false);
    try {
      const result = await apiService.checkEmail(email);
      if (!result.available) {
        setEmailExists(true);
        form.setFields([{ name: 'email', errors: [t('auth.registerPage.emailExists')] }]);
      } else {
        setEmailExists(false);
        form.setFields([{ name: 'email', errors: [] }]);
      }
    } catch {
      // 检查失败不阻塞
    } finally {
      setEmailChecking(false);
    }
  };

  // 邮箱注册提交
  const handleEmailRegister = async (values: {
    email: string;
    password: string;
    confirmPassword: string;
    agreeTerms: boolean;
    region?: string;
  }) => {
    try {
      setIsLoading(true);
      setError(null);

      if (values.password !== values.confirmPassword) {
        throw new Error(t('auth.registerPage.confirmPasswordMismatch'));
      }

      if (!values.agreeTerms) {
        throw new Error(t('auth.registerPage.agreeTerms'));
      }

      await register({
        username: values.username,
        email: values.email,
        password: values.password,
        region: values.region,
      });

      setSuccess(true);
    } catch (err) {
      console.error('注册失败:', err);
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                          (err as Error)?.message ||
                          t('auth.registerPage.registerFailed');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 手机号注册提交
  const handlePhoneRegister = async (values: {
    phone: string;
    code: string;
    agreeTerms: boolean;
    region?: string;
  }) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!values.agreeTerms) {
        throw new Error(t('auth.registerPage.agreeTerms'));
      }

      await registerByPhone({
        username: values.phone,
        phone: values.phone,
        code: values.code,
        // 手机注册通过短信验证码认证，密码随机生成即可
        password: Array.from({length:16},()=>'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random()*62)]).join(''),
        region: values.region,
      });

      setSuccess(true);

      setTimeout(() => {
        navigate('/', { replace: true });
      }, 3000);

    } catch (err) {
      console.error('手机号注册失败:', err);
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                          (err as Error)?.message ||
                          t('auth.registerPage.registerFailed');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 发送短信验证码
  const handleSendCode = async () => {
    try {
      const phone = phoneForm.getFieldValue('phone');
      if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
        setError(t('auth.registerPage.phoneInvalid'));
        return;
      }
      setError(null);
      await sendSmsCode(phone, 'register');
      startCountdown();
    } catch (err) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                          (err as Error)?.message ||
                          t('auth.registerPage.registerFailed');
      setError(errorMessage);
    }
  };

  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  // 重发验证邮件
  const handleResendVerification = async () => {
    setResendingEmail(true);
    try {
      await apiService.resendVerificationEmail(form.getFieldValue('email'));
      setResendSent(true);
      message.success(t('auth.registerPage.resendVerifyEmailSent'));
    } catch {
      message.error(t('common.error'));
    } finally {
      setResendingEmail(false);
    }
  };

  // 注册成功页面
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900 p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-xl border border-dark-700 rounded-2xl bg-dark-800 text-center">
            <MailOutlined className="text-6xl text-blue-400 mb-6" />
            <Title level={2} className="mb-4">{t('auth.registerPage.checkEmailTitle')}</Title>
            <Paragraph className="text-gray-400">
              {t('auth.registerPage.checkEmailDesc', { email: form.getFieldValue('email') })}
            </Paragraph>
          </Card>
        </div>
      </div>
    );
  }

  const emailRegisterForm = (
    <>
      <Form
        form={form}
        name="register"
        layout="vertical"
        onFinish={handleEmailRegister}
        size="large"
        initialValues={{ agreeTerms: false }}
      >
        <Form.Item
          name="username"
          label={t('auth.registerPage.usernameLabel')}
          rules={[
            { required: true, message: t('auth.registerPage.usernameRequired') },
            { min: 3, max: 20, message: t('auth.registerPage.usernameMinMax') },
            { pattern: /^[a-zA-Z0-9_]+$/, message: t('auth.registerPage.usernamePattern') },
          ]}
          hasFeedback
        >
          <Input
            prefix={<UserOutlined className="text-gray-400" />}
            placeholder={t('auth.registerPage.usernameLabel')}
            autoComplete="username"
          />
        </Form.Item>

        <Form.Item
          name="email"
          label={t('auth.registerPage.emailLabel')}
          rules={[
            { required: true, message: t('auth.registerPage.emailRequired') },
            { type: 'email', message: t('auth.registerPage.emailInvalid') },
          ]}
          hasFeedback
          validateStatus={emailExists ? 'error' : emailChecking ? 'validating' : undefined}
          help={emailExists ? t('auth.registerPage.emailExists') : undefined}
        >
          <Input
            prefix={<MailOutlined className="text-gray-400" />}
            suffix={emailChecking ? <LoadingOutlined className="text-gray-400" /> : null}
            placeholder={t('auth.registerPage.emailPlaceholder')}
            autoComplete="email"
            onBlur={handleEmailBlur}
          />
        </Form.Item>

        <Form.Item
          name="password"
          label={t('auth.registerPage.passwordLabel')}
          rules={[
            { required: true, message: t('auth.registerPage.passwordRequired') },
            { min: 8, message: t('auth.registerPage.passwordMinLength') },
            { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: t('auth.registerPage.passwordPattern') },
          ]}
          hasFeedback
        >
          <Input.Password
            prefix={<LockOutlined className="text-gray-400" />}
            placeholder={t('auth.registerPage.passwordLabel')}
            autoComplete="new-password"
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label={t('auth.registerPage.confirmPasswordLabel')}
          dependencies={['password']}
          rules={[
            { required: true, message: t('auth.registerPage.confirmPasswordRequired') },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error(t('auth.registerPage.confirmPasswordMismatch')));
              },
            }),
          ]}
          hasFeedback
        >
          <Input.Password
            prefix={<LockOutlined className="text-gray-400" />}
            placeholder={t('auth.registerPage.confirmPasswordLabel')}
            autoComplete="new-password"
          />
        </Form.Item>

        <Form.Item
          name="region"
          label={t('auth.registerPage.regionLabel')}
        >
          <Select
            prefix={<GlobalOutlined className="text-gray-400" />}
            placeholder={t('auth.registerPage.regionPlaceholder')}
            allowClear
            options={[
              { value: 'china', label: t('auth.registerPage.regionChina') },
              { value: 'hongkong', label: t('auth.registerPage.regionHongKong') },
              { value: 'taiwan', label: t('auth.registerPage.regionTaiwan') },
              { value: 'japan', label: t('auth.registerPage.regionJapan') },
              { value: 'korea', label: t('auth.registerPage.regionKorea') },
              { value: 'northAmerica', label: t('auth.registerPage.regionNorthAmerica') },
              { value: 'europe', label: t('auth.registerPage.regionEurope') },
              { value: 'southeastAsia', label: t('auth.registerPage.regionSoutheastAsia') },
              { value: 'other', label: t('auth.registerPage.regionOther') },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="agreeTerms"
          valuePropName="checked"
          rules={[
            {
              validator: (_, value) =>
                value ? Promise.resolve() : Promise.reject(new Error(t('auth.registerPage.agreeTerms'))),
            },
          ]}
        >
          <Checkbox>
            {t('auth.registerPage.agreeTerms')}{' '}
            <Link to={`/${currentLang}/terms`} className="text-blue-600 hover:text-blue-800">
              {t('auth.registerPage.termsOfService')}
            </Link>{' '}
            {t('auth.registerPage.privacyPolicy')}
          </Checkbox>
        </Form.Item>

        <Form.Item className="mb-4">
          <Button
            type="primary"
            htmlType="submit"
            loading={isLoading}
            size="large"
            className="w-full h-12"
          >
            {isLoading ? t('auth.registerPage.registering') : t('auth.registerPage.registerButton')}
          </Button>
        </Form.Item>
      </Form>
    </>
  );

  const phoneRegisterForm = (
    <>
      <Form
        form={phoneForm}
        name="phoneRegister"
        layout="vertical"
        onFinish={handlePhoneRegister}
        size="large"
        initialValues={{ agreeTerms: false }}
      >
        <Form.Item
          name="username"
          label={t('auth.registerPage.usernameLabel')}
          rules={[
            { required: true, message: t('auth.registerPage.usernameRequired') },
            { min: 3, max: 20, message: t('auth.registerPage.usernameMinMax') },
            { pattern: /^[a-zA-Z0-9_]+$/, message: t('auth.registerPage.usernamePattern') },
          ]}
          hasFeedback
        >
          <Input
            prefix={<UserOutlined className="text-gray-400" />}
            placeholder={t('auth.registerPage.usernameLabel')}
            autoComplete="username"
          />
        </Form.Item>

        <Form.Item
          name="phone"
          label={t('auth.registerPage.phoneLabel')}
          rules={[
            { required: true, message: t('auth.registerPage.phoneRequired') },
            { pattern: /^1[3-9]\d{9}$/, message: t('auth.registerPage.phoneInvalid') },
          ]}
          hasFeedback
        >
          <Input
            prefix={<PhoneOutlined className="text-gray-400" />}
            placeholder={t('auth.registerPage.phonePlaceholder')}
            autoComplete="tel"
          />
        </Form.Item>

        <Form.Item
          name="code"
          label={t('auth.registerPage.codeLabel')}
          rules={[
            { required: true, message: t('auth.registerPage.codeRequired') },
            { len: 6, message: t('auth.registerPage.codeLength') },
          ]}
        >
          <div className="flex gap-2">
            <Input
              prefix={<MessageOutlined className="text-gray-400" />}
              placeholder={t('auth.registerPage.codeLabel')}
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
              {countdown > 0 ? `${countdown}s` : t('auth.registerPage.sendCode')}
            </Button>
          </div>
        </Form.Item>

        <Form.Item
          name="region"
          label={t('auth.registerPage.regionLabel')}
        >
          <Select
            prefix={<GlobalOutlined className="text-gray-400" />}
            placeholder={t('auth.registerPage.regionPlaceholder')}
            allowClear
            options={[
              { value: 'china', label: t('auth.registerPage.regionChina') },
              { value: 'hongkong', label: t('auth.registerPage.regionHongKong') },
              { value: 'taiwan', label: t('auth.registerPage.regionTaiwan') },
              { value: 'japan', label: t('auth.registerPage.regionJapan') },
              { value: 'korea', label: t('auth.registerPage.regionKorea') },
              { value: 'northAmerica', label: t('auth.registerPage.regionNorthAmerica') },
              { value: 'europe', label: t('auth.registerPage.regionEurope') },
              { value: 'southeastAsia', label: t('auth.registerPage.regionSoutheastAsia') },
              { value: 'other', label: t('auth.registerPage.regionOther') },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="agreeTerms"
          valuePropName="checked"
          rules={[
            {
              validator: (_, value) =>
                value ? Promise.resolve() : Promise.reject(new Error(t('auth.registerPage.agreeTerms'))),
            },
          ]}
        >
          <Checkbox>
            {t('auth.registerPage.agreeTerms')}{' '}
            <Link to={`/${currentLang}/terms`} className="text-blue-600 hover:text-blue-800">
              {t('auth.registerPage.termsOfService')}
            </Link>{' '}
            {t('auth.registerPage.privacyPolicy')}
          </Checkbox>
        </Form.Item>

        <Form.Item className="mb-4">
          <Button
            type="primary"
            htmlType="submit"
            loading={isLoading}
            size="large"
            className="w-full h-12"
          >
            {isLoading ? t('auth.registerPage.registering') : t('auth.registerPage.registerButton')}
          </Button>
        </Form.Item>
      </Form>
    </>
  );

  const tabItems = [
    // { key: 'phone', label: t('auth.registerPage.phoneRegister'), children: phoneRegisterForm }, // 手机注册已禁用
    { key: 'email', label: t('auth.registerPage.emailRegister'), children: emailRegisterForm },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 p-4">
      <SEO
        title={`${t('auth.registerPage.title')} | GameHub`}
        description={t('auth.registerPage.subtitle')}
        keywords="register, GameHub register, create account, gaming community"
        noindex
      />
      <div className="w-full max-w-md">
        {/* Logo和标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg mb-4">
            <span className="text-white text-2xl font-bold">G</span>
          </div>
          <Title level={1} className="mb-2">{t('auth.registerPage.title')}</Title>
          <Text type="secondary">{t('auth.registerPage.subtitle')}</Text>
        </div>

        {/* 注册卡片 */}
        <Card className="shadow-xl border border-dark-700 rounded-2xl bg-dark-800">
          {error && (
            <Alert
              message={t('auth.registerPage.registerFailed')}
              description={error}
              type="error"
              showIcon
              className="mb-6"
              closable
              onClose={() => setError(null)}
            />
          )}

          <Tabs items={tabItems} />

          {/* 社交账号快速注册（与登录页一致，动态获取已启用的提供商） */}
          {enabledProviders.length > 0 && (
            <>
          <Divider>
            <span className="text-gray-400 text-sm">{t('auth.registerPage.socialDivider')}</span>
          </Divider>
          <div className="flex justify-center gap-3 flex-wrap">
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
          <div className="text-center mt-3">
            <Text type="secondary" className="text-xs">
              {t('auth.registerPage.socialAutoCreate')}
            </Text>
          </div>
            </>
          )}
        </Card>

        {/* 底部链接 */}
        <div className="text-center mt-8 space-y-4">
          <div>
            <Text type="secondary">{t('auth.registerPage.hasAccount')} </Text>
            <Link to={`/${currentLang}/login`} className="text-blue-600 hover:text-blue-800 font-medium">
              {t('auth.registerPage.loginNow')}
            </Link>
          </div>

          <div>
            <Text type="secondary">{t('auth.registerPage.backToHomePage')} </Text>
            <Link to="/" className="text-blue-600 hover:text-blue-800 font-medium">
              {t('auth.registerPage.backToHomePage')}
            </Link>
          </div>

          <div className="text-xs text-gray-400">
            {t('auth.registerPage.copyright', { year: new Date().getFullYear() })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
