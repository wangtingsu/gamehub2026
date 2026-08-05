import { useState } from 'react';
import { Card, Input, Button, Typography, Alert, Space } from 'antd';
import { KeyOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text, Paragraph } = Typography;

/**
 * TwoFactorVerify — 双因素认证（2FA）验证页面组件
 *
 * 该组件在用户登录后且账号开启了 2FA 时显示，要求用户输入身份验证器应用
 * 中的 TOTP 验证码来完成登录流程。支持以下功能：
 *
 * 1. 验证码输入：6 位数字输入框，自动过滤非数字字符，居中对齐且字间距加宽
 *    方便用户核对输入的验证码
 * 2. 验证提交：调用 AuthContext 中的 verifyTwoFactor 方法进行验证，
 *    验证成功后由 AuthContext 处理后续登录成功逻辑
 * 3. 错误处理：验证失败时显示 Alert 错误提示（可关闭）
 * 4. 返回登录：提供"返回登录"按钮，调用 cancelTwoFactor 取消 2FA 验证流程
 *    回到登录页面
 * 5. 加载状态：提交验证码时按钮显示加载状态，防止重复提交
 * 6. 自动聚焦：验证码输入框自动获取焦点，提升用户体验
 *
 * 布局特点：
 * - 全屏居中布局（min-h-screen + flex）
 * - 渐变色背景（从浅灰到灰色）
 * - 白色圆角卡片包含所有内容
 * - 顶部带有渐变蓝色的钥匙图标，直观传达安全验证的用途
 *
 * @returns 全屏居中的 2FA 验证表单页面
 */
const TwoFactorVerify = () => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const { twoFactorEmail, verifyTwoFactor, cancelTwoFactor } = useAuth();

  const handleSubmit = async () => {
    if (code.length !== 6) {
      setError(t('twoFactor.enterCode', '请输入6位验证码'));
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await verifyTwoFactor(code);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || t('twoFactor.verifyFailed', '验证失败，请重试'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0 rounded-2xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg mb-4">
              <KeyOutlined className="text-white text-2xl" />
            </div>
            <Title level={3} className="mb-2">{t('twoFactor.title', '双因素认证')}</Title>
            <Paragraph className="text-gray-500 mb-1">
              {t('twoFactor.instruction', '请输入您的身份验证器应用中的验证码')}
            </Paragraph>
            {twoFactorEmail && (
              <Text type="secondary" className="text-sm">
                {t('twoFactor.account', '账号')}: {twoFactorEmail}
              </Text>
            )}
          </div>

          {error && (
            <Alert
              message={t('twoFactor.alertTitle', '验证失败')}
              description={error}
              type="error"
              showIcon
              className="mb-4"
              closable
              onClose={() => setError(null)}
            />
          )}

          <Space direction="vertical" size="large" className="w-full">
            <div className="text-center">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder={t('twoFactor.codePlaceholder', '输入 6 位验证码')}
                size="large"
                maxLength={6}
                className="w-48 text-center text-2xl tracking-[0.5em]"
                prefix={<KeyOutlined className="text-gray-400" />}
                onPressEnter={handleSubmit}
                autoFocus
              />
            </div>

            <Button
              type="primary"
              size="large"
              block
              onClick={handleSubmit}
              loading={loading}
              disabled={code.length !== 6}
            >
              {t('twoFactor.verify', '验证')}
            </Button>

            <Button
              type="text"
              block
              icon={<ArrowLeftOutlined />}
              onClick={cancelTwoFactor}
            >
              {t('twoFactor.backToLogin', '返回登录')}
            </Button>
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default TwoFactorVerify;
