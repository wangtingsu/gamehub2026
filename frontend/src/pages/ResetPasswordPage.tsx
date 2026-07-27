import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Form, Input, Button, Card, Alert, Typography, Result } from 'antd';
import { LockOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';
import apiService from '../api';

const { Title, Text } = Typography;

const ResetPasswordPage = () => {
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // 从URL中提取token
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const token = queryParams.get('token');

    if (!token) {
      setTokenValid(false);
      return;
    }

    const verifyToken = async () => {
      try {
        // 验证token：尝试解析token，验证基本格式
        if (token.length < 10) {
          setTokenValid(false);
          return;
        }
        setTokenValid(true);
      } catch {
        setTokenValid(false);
      }
    };
    verifyToken();
  }, [location.search]);

  const handleSubmit = async (values: {
    password: string;
    confirmPassword: string;
  }) => {
    try {
      setIsLoading(true);
      setError(null);

      if (values.password !== values.confirmPassword) {
        throw new Error('两次输入的密码不一致');
      }

      const queryParams = new URLSearchParams(location.search);
      const token = queryParams.get('token');

      if (!token) {
        throw new Error('无效的重置链接');
      }

      await apiService.resetPassword(token, values.password);
      setSuccess(true);

    } catch (err) {
      console.error('重置密码失败:', err);
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                          (err as Error)?.message ||
                          '重置密码失败，请稍后重试';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // token无效页面
  if (tokenValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900 p-4">
        <div className="w-full max-w-md">
          <Result
            icon={<WarningOutlined className="text-yellow-500" />}
            status="warning"
            title={t('auth.resetPasswordPage.invalidTokenTitle')}
            subTitle={t('auth.resetPasswordPage.invalidTokenDesc')}
            extra={[
              <Button
                type="primary"
                key="forgot"
                onClick={() => navigate('/forgot-password')}
                className="w-full h-12"
              >
                {t('auth.resetPasswordPage.resendLink')}
              </Button>,
              <Button
                key="login"
                onClick={() => navigate('/login')}
                className="w-full h-12 mt-4"
              >
                {t('auth.resetPasswordPage.backToLogin')}
              </Button>,
            ]}
          />
        </div>
      </div>
    );
  }

  // 重置成功页面
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900 p-4">
        <div className="w-full max-w-md">
          <Result
            icon={<CheckCircleOutlined className="text-green-500" />}
            status="success"
            title={t('auth.resetPasswordPage.successTitle')}
            subTitle={t('auth.resetPasswordPage.successDesc')}
            extra={[
              <Button
                type="primary"
                key="login"
                onClick={() => navigate('/login')}
                className="w-full h-12"
              >
                {t('auth.resetPasswordPage.goToLogin')}
              </Button>,
            ]}
          />
        </div>
      </div>
    );
  }

  // 验证token中
  if (tokenValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <Text type="secondary">{t('auth.resetPasswordPage.verifyingToken')}</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 p-4">
      <SEO
        title={`${t('auth.resetPasswordPage.title')} | GameHub`}
        description={t('auth.resetPasswordPage.subtitle')}
        keywords="set password, new password, reset password, GameHub security"
        noindex
      />
      <div className="w-full max-w-md">
        {/* Logo和标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg mb-4">
            <span className="text-white text-2xl font-bold">G</span>
          </div>
          <Title level={1} className="mb-2">{t('auth.resetPasswordPage.title')}</Title>
          <Text type="secondary">{t('auth.resetPasswordPage.subtitle')}</Text>
        </div>

        {/* 重置密码卡片 */}
        <Card className="shadow-xl border border-dark-700 rounded-2xl bg-dark-800">
          {error && (
            <Alert
              message={t('auth.resetPasswordPage.failedTitle')}
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
            name="resetPassword"
            layout="vertical"
            onFinish={handleSubmit}
            size="large"
          >
            <Form.Item
              name="password"
              label={t('auth.resetPasswordPage.newPasswordLabel')}
              rules={[
                { required: true, message: t('auth.resetPasswordPage.newPasswordRequired') },
                { min: 8, message: t('auth.resetPasswordPage.newPasswordMinLength') },
                { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: t('auth.resetPasswordPage.newPasswordPattern') },
              ]}
              hasFeedback
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder={t('auth.resetPasswordPage.newPasswordLabel')}
                autoComplete="new-password"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label={t('auth.resetPasswordPage.confirmPasswordLabel')}
              dependencies={['password']}
              rules={[
                { required: true, message: t('auth.resetPasswordPage.confirmPasswordRequired') },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error(t('auth.resetPasswordPage.confirmPasswordMismatch')));
                  },
                }),
              ]}
              hasFeedback
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder={t('auth.resetPasswordPage.confirmPasswordLabel')}
                autoComplete="new-password"
              />
            </Form.Item>

            <Form.Item className="mb-4">
              <Button
                type="primary"
                htmlType="submit"
                loading={isLoading}
                size="large"
                className="w-full h-12"
              >
                {isLoading ? t('auth.resetPasswordPage.resetting') : t('auth.resetPasswordPage.resetButton')}
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {/* 底部链接 */}
        <div className="text-center mt-8">
          <Text type="secondary">
            {t('auth.resetPasswordPage.backToLoginLink')}{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">
              {t('auth.resetPasswordPage.backToLoginLink')}
            </Link>
          </Text>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;