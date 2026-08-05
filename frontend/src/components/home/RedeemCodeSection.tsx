/**
 * RedeemCodeSection - 兑换码专区组件
 *
 * 展示可用的游戏兑换码/优惠码。
 * 支持未登录浏览 + 登录后一键复制/兑换。
 */
import { useState } from 'react';
import { Card, Tag, Typography, Skeleton, Button, message, Tooltip } from 'antd';
import { GiftOutlined, CopyOutlined, CheckOutlined, LoginOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useRedeemCodes, useRedeemCode } from '../../api/hooks';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Paragraph, Text } = Typography;

const RedeemCodeSection = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('home');
  const { user } = useAuth();
  const { data: codes, isLoading } = useRedeemCodes();
  const redeemMutation = useRedeemCode();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [redeemedIds, setRedeemedIds] = useState<Set<number>>(new Set());

  const isLoggedIn = !!user;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      message.success('兑换码已复制');
      setTimeout(() => setCopiedCode(null), 2000);
    }).catch(() => {
      // Fallback
      const input = document.createElement('input');
      input.value = code;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedCode(code);
      message.success('兑换码已复制');
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const handleRedeem = async (code: string, id: number) => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    try {
      await redeemMutation.mutateAsync(code);
      setRedeemedIds((prev) => new Set(prev).add(id));
      message.success('兑换成功！');
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || '兑换失败');
    }
  };

  const codeList = Array.isArray(codes) ? codes.slice(0, 6) : [];

  const rewardLabels: Record<string, string> = {
    discount: '折扣',
    free_game: '免费游戏',
    points: '积分',
    item: '道具',
  };

  return (
    <section className="mb-12">
      <div className="mb-6">
        <Title level={2} className="flex items-center gap-2 !text-white !mb-1">
          <GiftOutlined className="text-yellow-500" />
          {t('redeemCodes', '兑换码专区')}
        </Title>
        <Paragraph className="text-gray-400 !mb-0">
          {t('redeemCodesDesc', '限时兑换码，先到先得！')}
        </Paragraph>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><Skeleton active paragraph={{ rows: 2 }} /></Card>
          ))}
        </div>
      ) : codeList.length === 0 ? (
        <Card className="border-dark-700 bg-dark-800/80 text-center py-8">
          <GiftOutlined className="text-4xl text-gray-600 mb-3" />
          <Paragraph className="text-gray-500">{t('noCodes', '暂无可用兑换码，敬请期待')}</Paragraph>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {codeList.map((item: any, index: number) => {
            const isRedeemed = redeemedIds.has(item.id);
            const remaining = item.usage_limit === 0 ? '∞' : Math.max(0, item.usage_limit - item.used_count);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card
                  className="border-dark-700 bg-dark-800/80 hover:border-yellow-600/50 transition-colors overflow-hidden"
                >
                  {/* 装饰渐变条 */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500" />

                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Title level={5} className="!mb-1 !text-white">{item.title}</Title>
                      {item.game_name && (
                        <Tag color="geekblue" className="text-xs">{item.game_name}</Tag>
                      )}
                    </div>
                    <Tag color={
                      item.reward_type === 'discount' ? 'green' :
                      item.reward_type === 'free_game' ? 'red' :
                      item.reward_type === 'points' ? 'purple' : 'blue'
                    }>
                      {rewardLabels[item.reward_type] || item.reward_type}
                    </Tag>
                  </div>

                  {item.description && (
                    <Paragraph className="text-gray-400 text-sm mb-3 line-clamp-2">
                      {item.description}
                    </Paragraph>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <code className="bg-dark-700 text-yellow-400 px-3 py-1.5 rounded-lg text-lg font-mono font-bold select-all">
                        {item.code}
                      </code>
                      <Tooltip title="复制兑换码">
                        <Button
                          type="text"
                          size="small"
                          icon={copiedCode === item.code ? <CheckOutlined className="text-green-400" /> : <CopyOutlined />}
                          onClick={() => handleCopy(item.code)}
                        />
                      </Tooltip>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>剩余: {remaining}</span>
                    <span>{item.reward_value}</span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-dark-700">
                    {isRedeemed ? (
                      <Button block disabled className="!bg-green-900/30 !text-green-400 !border-green-800">
                        已兑换 ✓
                      </Button>
                    ) : isLoggedIn ? (
                      <Button
                        block
                        type="primary"
                        loading={redeemMutation.isPending}
                        onClick={() => handleRedeem(item.code, item.id)}
                        className="!bg-gradient-to-r !from-yellow-600 !to-orange-600 !border-0 hover:!from-yellow-500 hover:!to-orange-500"
                      >
                        立即兑换
                      </Button>
                    ) : (
                      <Button
                        block
                        icon={<LoginOutlined />}
                        onClick={() => navigate('/login')}
                      >
                        登录后兑换
                      </Button>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default RedeemCodeSection;
