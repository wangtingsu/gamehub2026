import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card, Alert, Typography, Result, message } from 'antd';
import { MailOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import apiService from '../api';
import SEO from '../components/SEO';

const { Title, Text } = Typography;

const ForgotPasswordPage = () => {
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSubmit = async (values: { email: string }) => {
    try {
      setIsLoading(true);
      setError(null);

      message.loading({ content: t('auth.forgotPasswordPage.sending'), key: 'forgotPassword' });
      await apiService.forgotPassword(values.email);
      message.success({ content: t('auth.forgotPasswordPage.successDesc'), key: 'forgotPassword' });
      setEmailSent(true);

    } catch (err) {
      console.error('发送密码重置邮件失败:', err);
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                          (err as Error)?.message ||
                          '发送失败，请稍后重试';
      message.error({ content: errorMessage, key: 'forgotPassword' });
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 邮件已发送页面
  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900 p-4">
        <div className="w-full max-w-md">
          <Result
            icon={<CheckCircleOutlined className="text-green-500" />}
            status="success"
            title={t('auth.forgotPasswordPage.successTitle')}
            subTitle={t('auth.forgotPasswordPage.successDesc')}
            extra={[
              <Button
                type="primary"
                key="back"
                onClick={() => navigate('/login')}
                className="w-full h-12"
              >
                {t('auth.forgotPasswordPage.backToLogin')}
              </Button>,
              <Button
                key="resend"
                onClick={() => {
                  setEmailSent(false);
                  form.resetFields();
                }}
                className="w-full h-12 mt-4"
              >
                {t('auth.forgotPasswordPage.resend')}
              </Button>,
            ]}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 p-4">
      <SEO
        title={`${t('auth.forgotPasswordPage.title')} | GameHub`}
        description={t('auth.forgotPasswordPage.subtitle')}
        keywords="forgot password, reset password, GameHub password, account recovery"
        noindex
      />
      <div className="w-full max-w-md">
        {/* Logo和标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg mb-4">
            <span className="text-white text-2xl font-bold">G</span>
          </div>
          <Title level={1} className="mb-2">{t('auth.forgotPasswordPage.title')}</Title>
          <Text type="secondary">{t('auth.forgotPasswordPage.subtitle')}</Text>
        </div>

        {/* 重置密码卡片 */}
        <Card className="shadow-xl border border-dark-700 rounded-2xl bg-dark-800">
          {error && (
            <Alert
              message={t('auth.forgotPasswordPage.failedTitle')}
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
            name="forgotPassword"
            layout="vertical"
            onFinish={handleSubmit}
            size="large"
          >
            <Form.Item
              name="email"
              label={t('auth.forgotPasswordPage.emailLabel')}
              rules={[
                { required: true, message: t('auth.forgotPasswordPage.emailRequired') },
                { type: 'email', message: t('auth.forgotPasswordPage.emailInvalid') },
              ]}
              hasFeedback
            >
              <Input
                prefix={<MailOutlined className="text-gray-400" />}
                placeholder={t('auth.forgotPasswordPage.emailPlaceholder')}
                autoComplete="email"
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
                {isLoading ? t('auth.forgotPasswordPage.sending') : t('auth.forgotPasswordPage.sendButton')}
              </Button>
            </Form.Item>

            <div className="text-center">
              <Text type="secondary">
                {t('auth.forgotPasswordPage.rememberPassword')}{' '}
                <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">
                  {t('auth.forgotPasswordPage.backToLoginLink')}
                </Link>
              </Text>
            </div>
          </Form>
        </Card>

        {/* 说明文字 */}
        <div className="mt-6 p-4 bg-dark-800 border border-dark-700 rounded-lg">
          <Text type="secondary" className="text-sm">
            <strong>{t('auth.forgotPasswordPage.hintTitle')}：</strong> {t('auth.forgotPasswordPage.hint')}
          </Text>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;