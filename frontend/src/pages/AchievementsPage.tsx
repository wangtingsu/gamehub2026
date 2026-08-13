import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Tabs, Row, Col, Tag, Typography, Progress, Statistic, Empty, Spin } from 'antd';
import { TrophyOutlined, LockOutlined, CheckCircleOutlined, StarOutlined, FireOutlined, TeamOutlined, RiseOutlined } from '@ant-design/icons';
import { useUserAchievements, useAchievementStats, usePlatformAchievements } from '../api/hooks';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import type { UserPlatformAchievement } from '../api/types';

const { Title, Text, Paragraph } = Typography;

const categoryConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  social: { label: '社交', icon: <TeamOutlined />, color: '#eb2f96' },
  content: { label: '内容', icon: <StarOutlined />, color: '#1890ff' },
  growth: { label: '成长', icon: <RiseOutlined />, color: '#52c41a' },
  milestone: { label: '里程碑', icon: <FireOutlined />, color: '#fa8c16' },
};

const AchievementsPage: React.FC = () => {
  const { userId: paramUserId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const userId = paramUserId || user?.id;

  const { data: allAchievements = [], isLoading: loadingAll } = usePlatformAchievements(userId ? String(userId) : undefined);
  const { data: userAchievements = [], isLoading: loadingUser } = useUserAchievements(userId ? String(userId) : undefined);
  const { data: stats, isLoading: loadingStats } = useAchievementStats();
  const [activeCategory, setActiveCategory] = useState('all');

  const unlockedIds = new Set(userAchievements.map(ua => ua.achievementId));
  const unlockedAchievements = userAchievements.filter(ua => ua.achievement);
  const lockedAchievements = allAchievements.filter(a => !unlockedIds.has(a.id) && !a.isHidden);

  const categoryAchievements = activeCategory === 'all'
    ? [...unlockedAchievements, ...lockedAchievements.map(a => ({ achievement: a } as UserPlatformAchievement))]
    : [
        ...unlockedAchievements.filter(ua => ua.achievement?.category === activeCategory),
        ...lockedAchievements.filter(a => a.category === activeCategory).map(a => ({ achievement: a } as UserPlatformAchievement)),
      ];

  const isLoading = loadingAll || loadingUser || loadingStats;

  return (
    <div className=" py-2">
      <SEO title="成就 | GameHub" description="GameHub 成就系统" keywords="成就系统,成就列表,游戏成就,成就徽章,成就进度" />

      <Title level={1} className="mb-6 flex items-center">
        <TrophyOutlined className="mr-3 text-yellow-500" />
        成就
      </Title>

      {/* Stats Header */}
      {stats && (
        <Row gutter={16} className="mb-6">
          <Col span={8}>
            <Card className="shadow-sm text-center">
              <Statistic
                title="已解锁"
                value={stats.unlocked}
                suffix={`/ ${stats.total}`}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
              <Progress
                percent={Math.round((stats.unlocked / stats.total) * 100)}
                size="small"
                className="mt-2"
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card className="shadow-sm text-center">
              <Statistic
                title="最近解锁"
                value={stats.recentUnlocks?.length || 0}
                suffix="个"
                prefix={<TrophyOutlined className="text-yellow-500" />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card className="shadow-sm text-center">
              <Statistic
                title="完成度"
                value={stats.total > 0 ? Math.round((stats.unlocked / stats.total) * 100) : 0}
                suffix="%"
                prefix={<StarOutlined className="text-blue-500" />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Category Tabs */}
      <Card className="shadow-sm">
        <Tabs activeKey={activeCategory} onChange={setActiveCategory}>
          <Tabs.TabPane tab="全部" key="all" />
          {Object.entries(categoryConfig).map(([key, config]) => (
            <Tabs.TabPane
              key={key}
              tab={<span>{config.icon} {config.label}</span>}
            />
          ))}
        </Tabs>

        {isLoading ? (
          <div className="text-center py-2"><Spin size="large" /></div>
        ) : categoryAchievements.length === 0 ? (
          <Empty description="暂无成就" className="py-2" />
        ) : (
          <Row gutter={[16, 16]}>
            {categoryAchievements.map((item) => {
              const achievement = item.achievement;
              if (!achievement) return null;
              const isUnlocked = unlockedIds.has(achievement.id);
              const catConfig = categoryConfig[achievement.category] || categoryConfig.milestone;

              return (
                <Col xs={24} sm={12} md={8} lg={6} key={achievement.id}>
                  <Card
                    className={`h-full shadow-sm transition-all ${
                      isUnlocked ? 'opacity-100' : 'opacity-60'
                    }`}
                    hoverable
                  >
                    <div className="text-center">
                      <div className={`text-4xl mb-3 ${isUnlocked ? '' : 'grayscale'}`}>
                        {isUnlocked ? (
                          <TrophyOutlined className="text-yellow-500" />
                        ) : (
                          <LockOutlined className="text-gray-400" />
                        )}
                      </div>
                      <Tag color={catConfig.color}>{catConfig.label}</Tag>
                      <Title level={5} className="mt-2 mb-1">{achievement.name}</Title>
                      <Paragraph type="secondary" className="text-sm mb-3">
                        {achievement.description}
                      </Paragraph>
                      {isUnlocked ? (
                        <div className="text-green-500 text-sm">
                          <CheckCircleOutlined className="mr-1" />
                          已解锁 · {item.unlockedAt ? new Date(item.unlockedAt).toLocaleDateString() : ''}
                        </div>
                      ) : (
                        <div className="text-gray-400 text-sm">
                          <LockOutlined className="mr-1" />
                          未解锁
                        </div>
                      )}
                      {(achievement.xpReward > 0 || achievement.pointsReward > 0) && (
                        <div className="mt-2 text-xs text-gray-400">
                          {achievement.xpReward > 0 && <span className="mr-2">+{achievement.xpReward} XP</span>}
                          {achievement.pointsReward > 0 && <span>+{achievement.pointsReward} 积分</span>}
                        </div>
                      )}
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Card>
    </div>
  );
};

export default AchievementsPage;
