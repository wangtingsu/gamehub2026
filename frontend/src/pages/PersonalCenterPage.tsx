import { useState } from 'react';
import { Tabs, Avatar, Typography, Card, Row, Col, Statistic, Progress, Badge } from 'antd';
import {
  UserOutlined,
  TrophyOutlined,
  MessageOutlined,
  BookOutlined,
  StarOutlined,
  BgColorsOutlined,
} from '@ant-design/icons';
import { Dropdown } from 'antd';
import { useAuth } from '../contexts/AuthContext';
import { useGamificationStats, useMessageUnreadCount, useAchievementStats, useLibraryStats } from '../api/hooks';
import InboxPage from './InboxPage';
import AchievementsPage from './AchievementsPage';
import GameLibraryPage from './GameLibraryPage';
import SEO from '../components/SEO';

const { Title, Text } = Typography;

const PersonalCenterPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('messages');

  const { data: gamification } = useGamificationStats();
  const { data: unreadCount } = useMessageUnreadCount();
  const { data: achievementStats } = useAchievementStats();
  const { data: libraryStats } = useLibraryStats();

  return (
    <div className="bg-dark-900 personal-center">
      <SEO title="个人中心 | GameHub" description="GameHub 个人中心" keywords="个人中心,个人资料,账户设置,用户中心,GameHub" noindex />

      {/* 用户信息头部 */}
      <div className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white py-2">
        <div className="px-4">
          <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Avatar
              size={80}
              icon={<UserOutlined />}
              src={user?.avatarUrl}
              className="border-2 border-white/60 shadow-lg"
            />
            <div className="flex-1">
              <Title level={3} className="text-white mb-1">
                {user?.displayName || user?.username || '用户'}
              </Title>
              <Text className="text-white/80 text-base">{user?.email}</Text>
              {gamification && (
                <div className="mt-3 flex items-center space-x-6">
                  <span className="text-white/90 font-semibold">
                    Lv.{gamification.currentLevel}
                  </span>
                  <span className="text-white/80">
                    <TrophyOutlined className="mr-1" />
                    {gamification.totalXp} XP
                  </span>
                  <span className="text-white/80">
                    <StarOutlined className="mr-1" />
                    {gamification.totalPoints} 积分
                  </span>
                </div>
              )}
            </div>
            <Dropdown menu={{ items: [
              { key: 'dark', label: <span>⚫ 深色</span>, onClick: () => { localStorage.setItem('app-theme','dark'); document.documentElement.setAttribute('data-theme','dark');  } },
              { key: 'light', label: <span>⚪ 浅色</span>, onClick: () => { localStorage.setItem('app-theme','light'); document.documentElement.setAttribute('data-theme','light');  } },
            ] }} trigger={['click']}>
              <span className="text-white/80 cursor-pointer hover:text-white text-lg"><BgColorsOutlined /></span>
            </Dropdown>
          </div>
          </div>
          {gamification && (
            <div className="mt-4 max-w-md">
              <div className="flex justify-between text-sm text-white/80 mb-1">
                <span className="text-white/80">等级进度</span>
                <span className="text-white/80">
                  {gamification.currentXp} / {gamification.nextLevelXp} XP
                </span>
              </div>
              <Progress
                percent={Math.round(gamification.progress * 100)}
                strokeColor="#fff"
                railColor="rgba(255,255,255,0.3)"
                showInfo={false}
              />
            </div>
          )}
        </div>
      </div>

      {/* 概览统计 + 标签页区域 */}
      <div className="px-4 -mt-6 relative z-10">
        {/* 概览统计卡片 */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={8}>
            <Card className="shadow-sm text-center bg-dark-800 border-dark-700" hoverable>
              <Badge count={unreadCount || 0} size="small" offset={[5, -5]}>
                <MessageOutlined className="text-2xl text-primary-500 mb-2" />
              </Badge>
              <Statistic
                title="私信"
                value={unreadCount || 0}
                suffix="条未读"
                styles={{ content: { fontSize: 24, color: unreadCount ? '#1890ff' : '#999' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="shadow-sm text-center bg-dark-800 border-dark-700" hoverable>
              <TrophyOutlined className="text-2xl text-yellow-500 mb-2" />
              <Statistic
                title="成就"
                value={achievementStats?.unlocked || 0}
                suffix={`/ ${achievementStats?.total || 0}`}
                styles={{ content: { fontSize: 24, color: '#52c41a' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="shadow-sm text-center bg-dark-800 border-dark-700" hoverable>
              <BookOutlined className="text-2xl text-purple-500 mb-2" />
              <Statistic
                title="游戏库"
                value={libraryStats?.totalGames || 0}
                suffix="个游戏"
                styles={{ content: { fontSize: 24, color: '#722ed1' } }}
              />
            </Card>
          </Col>
        </Row>

        {/* 功能标签页 */}
        <Card className="shadow-sm mb-8 bg-dark-800 border-dark-700">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            tabBarGutter={32}
            size="large"
            items={[
              {
                key: 'messages',
                label: (
                  <span>
                    <MessageOutlined /> 私信
                    {unreadCount && unreadCount > 0 ? (
                      <span className="ml-1 text-xs text-primary-500">
                        ({unreadCount})
                      </span>
                    ) : null}
                  </span>
                ),
                children: activeTab === 'messages' ? <InboxPage /> : null,
              },
              {
                key: 'achievements',
                label: (
                  <span>
                    <TrophyOutlined /> 成就
                  </span>
                ),
                children: activeTab === 'achievements' ? <AchievementsPage /> : null,
              },
              {
                key: 'library',
                label: (
                  <span>
                    <BookOutlined /> 我的游戏库
                  </span>
                ),
                children: activeTab === 'library' ? <GameLibraryPage /> : null,
              },
            ]}
          />
        </Card>
      </div>
    </div>
  );
};

export default PersonalCenterPage;
