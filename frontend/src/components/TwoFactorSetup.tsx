import { useState, useEffect } from 'react';
import { Card, Button, Typography, Alert, Space, Input, Modal, List, Tag, Spin } from 'antd';
import { SafetyOutlined, CheckCircleOutlined, WarningOutlined, CopyOutlined } from '@ant-design/icons';
import { authService } from '../api/authService';

const { Title, Text, Paragraph } = Typography;

/**
 * TwoFactorSetup — 双因素认证（2FA）设置组件
 *
 * 该组件提供完整的双因素认证管理功能，基于 TOTP（基于时间的一次性密码）协议，
 * 兼容 Google Authenticator、Microsoft Authenticator、Authy 等标准身份验证器应用。
 *
 * 核心功能流程：
 * 1. 加载状态：组件挂载时查询用户当前的 2FA 启用状态
 * 2. 启用流程：
 *    a. 点击"启用双因素认证"按钮，调用 API 获取密钥、OTPAuth URI 和备份码
 *    b. 显示设置弹窗（Setup Modal）：展示二维码（供身份验证器扫描）、密钥文本、
 *       备份码列表（每个一次性使用）
 *    c. 用户在身份验证器中添加账号后，输入 6 位验证码验证
 *    d. 验证成功后，显示备份码确认弹窗，提醒用户妥善保存
 * 3. 禁用流程：点击"禁用双因素认证"按钮，确认后调用 API 禁用它
 * 4. 错误处理：所有 API 调用失败时显示错误提示，支持关闭
 * 5. 备份码复制：提供一键复制所有备份码到剪贴板的功能（2 秒后重置按钮文字）
 *
 * 状态管理：
 * - loading：初始加载 2FA 状态时显示 Spin 加载动画
 * - enabled：2FA 是否已启用，决定页面显示"启用"或"禁用"按钮
 * - setupVisible：设置弹窗可见性
 * - showBackupCodes：首次启用成功后显示备份码确认弹窗
 * - disableVisible：禁用确认弹窗可见性
 * - submitting：防止重复提交
 * - error：API 错误信息
 * - copied：备份码复制成功后的按钮反馈状态
 *
 * @returns 包含 2FA 状态卡片和三个弹窗（设置/备份码/禁用确认）的 React 元素
 */
const TwoFactorSetup = () => {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [lastUsed, setLastUsed] = useState<string | null>(null);
  const [setupVisible, setSetupVisible] = useState(false);
  const [disableVisible, setDisableVisible] = useState(false);
  const [setupData, setSetupData] = useState<{
    secret: string;
    otpauthUri: string;
    backupCodes: string[];
  } | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  /**
   * 加载用户的双因素认证状态
   *
   * 调用 authService.getTwoFactorStatus() 获取当前 2FA 启用状态
   * 和上次使用时间。加载失败时静默处理，不干扰用户体验。
   */
  const loadStatus = async () => {
    try {
      setLoading(true);
      const status = await authService.getTwoFactorStatus();
      setEnabled(status.enabled);
      setLastUsed(status.lastUsed);
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  };

  /**
   * 初始化双因素认证设置
   *
   * 调用 API 获取 2FA 设置数据（密钥、OTPAuth URI、备份码），
   * 然后打开设置弹窗展示二维码和备份码。
   * 密钥用于在身份验证器应用中手动添加账号，
   * OTPAuth URI 用于生成二维码供身份验证器扫描。
   */
  const handleSetup = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const data = await authService.setupTwoFactor();
      setSetupData(data);
      setBackupCodes(data.backupCodes);
      setSetupVisible(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || '设置失败');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * 验证验证码并启用双因素认证
   *
   * 用户输入 6 位验证码后：
   * 1. 校验验证码长度是否为 6 位
   * 2. 调用 API 验证并启用 2FA
   * 3. 验证成功后关闭设置弹窗，打开备份码展示弹窗
   * 4. 更新 enabled 状态为 true
   * 5. 清空验证码输入框
   */
  const handleEnable = async () => {
    if (verifyCode.length !== 6) {
      setError('请输入6位验证码');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      const result = await authService.enableTwoFactor(verifyCode);
      setBackupCodes(result.backupCodes);
      setSetupVisible(false);
      setShowBackupCodes(true);
      setEnabled(true);
      setVerifyCode('');
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || '验证失败');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * 禁用双因素认证
   *
   * 用户确认后调用 API 禁用 2FA，更新 enabled 状态，
   * 并关闭所有相关弹窗。操作不可逆，禁用后账号将失去额外的安全保护。
   */
  const handleDisable = async () => {
    try {
      setSubmitting(true);
      await authService.disableTwoFactor();
      setEnabled(false);
      setDisableVisible(false);
      setShowBackupCodes(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || '禁用失败');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * 复制备份码到剪贴板
   *
   * 使用 navigator.clipboard.writeText() 将所有备份码以换行符分隔复制，
   * 并将按钮文案临时改为"已复制"，2 秒后恢复原状。
   */
  const handleCopyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <Card className="shadow-sm border-0 rounded-xl">
        <div className="text-center py-4">
          <Spin />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-sm border-0 rounded-xl">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <SafetyOutlined className="text-2xl mt-1" style={{ color: enabled ? '#52c41a' : '#d9d9d9' }} />
            <div>
              <Title level={5} className="mb-1">双因素认证 (2FA)</Title>
              <Paragraph className="text-gray-500 mb-2" style={{ fontSize: 13 }}>
                使用身份验证器应用为您的账号增加额外的安全保护
              </Paragraph>
              {enabled && lastUsed && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  上次使用: {new Date(lastUsed).toLocaleString()}
                </Text>
              )}
            </div>
          </div>
          <Tag color={enabled ? 'green' : 'default'}>
            {enabled ? '已启用' : '未启用'}
          </Tag>
        </div>

        {error && (
          <Alert message={error} type="error" showIcon className="mt-3" closable onClose={() => setError(null)} />
        )}

        <div className="mt-4">
          {!enabled ? (
            <Button type="primary" onClick={handleSetup} loading={submitting}>
              启用双因素认证
            </Button>
          ) : (
            <Button danger onClick={() => setDisableVisible(true)} loading={submitting}>
              禁用双因素认证
            </Button>
          )}
        </div>
      </Card>

      {/* Setup Modal */}
      <Modal
        title="设置双因素认证"
        open={setupVisible}
        onCancel={() => { setSetupVisible(false); setVerifyCode(''); setError(null); }}
        footer={null}
        width={480}
      >
        {setupData && (
          <Space direction="vertical" size="middle" className="w-full">
            <Paragraph>
              请使用身份验证器应用（如 Google Authenticator、Microsoft Authenticator）扫描以下二维码或手动输入密钥：
            </Paragraph>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupData.otpauthUri)}`}
                alt="2FA QR Code"
                className="inline-block"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="mt-2">
                <Text copyable className="text-xs font-mono">{setupData.secret}</Text>
              </div>
            </div>

            <div>
              <Text strong>备份码</Text>
              <Paragraph className="text-gray-500" style={{ fontSize: 12 }}>
                请妥善保管以下备份码，每个备份码只能使用一次。如果丢失身份验证器，可以使用备份码登录。
              </Paragraph>
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, i) => (
                  <Text key={i} code className="text-center font-mono">{code}</Text>
                ))}
              </div>
              <Button
                size="small"
                icon={<CopyOutlined />}
                className="mt-2"
                onClick={handleCopyBackupCodes}
              >
                {copied ? '已复制' : '复制备份码'}
              </Button>
            </div>

            <div className="border-t pt-4">
              <Paragraph>
                请在下方输入身份验证器应用中的 6 位验证码以完成设置：
              </Paragraph>
              <Input
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="输入 6 位验证码"
                maxLength={6}
                className="w-48 text-center tracking-widest"
                onPressEnter={handleEnable}
              />
              <Button
                type="primary"
                className="ml-3"
                onClick={handleEnable}
                loading={submitting}
                disabled={verifyCode.length !== 6}
              >
                确认并启用
              </Button>
            </div>
          </Space>
        )}
      </Modal>

      {/* Backup Codes Modal (first time) */}
      <Modal
        title="双因素认证已启用"
        open={showBackupCodes}
        onCancel={() => setShowBackupCodes(false)}
        footer={
          <Button type="primary" onClick={() => setShowBackupCodes(false)}>
            我已保存备份码
          </Button>
        }
        width={480}
      >
        <div className="text-center mb-4">
          <CheckCircleOutlined className="text-5xl text-green-500" />
          <Title level={4} className="mt-2">双因素认证已成功启用</Title>
        </div>
        <Alert
          message="请保存以下备份码"
          description="每个备份码只能使用一次。建议打印或保存到安全位置。"
          type="warning"
          showIcon
          className="mb-4"
          icon={<WarningOutlined />}
        />
        <div className="grid grid-cols-2 gap-2">
          {backupCodes.map((code, i) => (
            <Text key={i} code className="text-center font-mono">{code}</Text>
          ))}
        </div>
        <Button
          icon={<CopyOutlined />}
          className="mt-3 w-full"
          onClick={handleCopyBackupCodes}
        >
          {copied ? '已复制' : '复制所有备份码'}
        </Button>
      </Modal>

      {/* Disable Confirm Modal */}
      <Modal
        title="禁用双因素认证"
        open={disableVisible}
        onCancel={() => setDisableVisible(false)}
        onOk={handleDisable}
        confirmLoading={submitting}
        okText="确认禁用"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <Paragraph>
          禁用双因素认证将降低您账号的安全性。确定要继续吗？
        </Paragraph>
      </Modal>
    </>
  );
};

export default TwoFactorSetup;
