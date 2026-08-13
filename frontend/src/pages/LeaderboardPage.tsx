import React, { useState } from 'react';
import { Card, Table, Tabs, Tag, Typography, Avatar, Segmented } from 'antd';
import { TrophyOutlined, CaretUpOutlined, CaretDownOutlined, MinusOutlined, UserOutlined, FireOutlined, StarOutlined, CrownOutlined, GiftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useLeaderboard, useUserLeaderboard } from '../api/hooks';
import type { LeaderboardEntry, UserLeaderboardEntry } from '../api/types';
import SEO from '../components/SEO';

const { Title } = Typography;
const { TabPane } = Tabs;

const LeaderboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState('top_rated');
  const [activeTab, setActiveTab] = useState('games');
  const [userType, setUserType] = useState<string>('xp');

  // Game leaderboard
  const { data: lbData, isLoading: lbLoading } = useLeaderboard(
    activeTab === 'games' ? activeType : 'top_rated',
    50,
  );

  // User leaderboard
  const { data: userLbData, isLoading: userLbLoading } = useUserLeaderboard(
    activeTab === 'users' ? userType : 'xp',
    50,
  );

  const gameColumns = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
      render: (rank: number) => (
        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm
          ${rank === 1 ? 'bg-yellow-400 text-yellow-900' :
            rank === 2 ? 'bg-gray-400 text-white' :
            rank === 3 ? 'bg-amber-600 text-white' :
            'bg-dark-700 text-gray-300'}`}
        >
          {rank}
        </div>
      ),
    },
    {
      title: '游戏名称',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: LeaderboardEntry) => (
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate(`/games/${record.id}`)}>
          <div className="w-10 h-10 rounded bg-gradient-to-br from-gray-600 to-gray-700 flex-shrink-0 overflow-hidden">
            {record.coverImageUrl ? (
              <img src={record.coverImageUrl} alt={record.title} className="w-full h-full object-cover" loading="lazy" onError={(e) => { const el = e.target as HTMLImageElement; el.onerror = null; el.style.display = 'none'; el.parentElement!.classList.add('flex', 'items-center', 'justify-center'); el.parentElement!.textContent = '🎮'; }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">🎮</div>
            )}
          </div>
          <div>
            <div className="font-medium text-white">{title}</div>
            {record.rating && (
              <div className="text-xs text-gray-400">
                {'★'.repeat(Math.round(Number(record.rating) / 2))}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: '评分',
      dataIndex: 'rating',
      key: 'rating',
      width: 100,
      render: (rating: number | string) => rating ? <Tag color="blue">{rating}</Tag> : '-',
    },
    {
      title: '评测数',
      dataIndex: 'reviewCount',
      key: 'reviewCount',
      width: 100,
      render: (count: number) => count || 0,
    },
    {
      title: '综合得分',
      dataIndex: 'score',
      key: 'score',
      width: 120,
      sorter: (a: LeaderboardEntry, b: LeaderboardEntry) => b.score - a.score,
      render: (score: number) => (
        <span className="font-semibold text-primary-500">{Number(score).toFixed(1)}</span>
      ),
    },
    {
      title: '趋势',
      dataIndex: 'trend',
      key: 'trend',
      width: 80,
      render: (trend: string) => {
        if (trend === 'up') return <CaretUpOutlined className="text-green-500 text-lg" />;
        if (trend === 'down') return <CaretDownOutlined className="text-red-500 text-lg" />;
        return <MinusOutlined className="text-gray-400" />;
      },
    },
  ];

  const userColumns = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
      render: (rank: number) => (
        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm
          ${rank === 1 ? 'bg-yellow-400 text-yellow-900' :
            rank === 2 ? 'bg-gray-400 text-white' :
            rank === 3 ? 'bg-amber-600 text-white' :
            'bg-dark-700 text-gray-300'}`}
        >
          {rank}
        </div>
      ),
    },
    {
      title: '用户',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (_name: string, record: UserLeaderboardEntry) => (
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate(`/profile/${record.userId}`)}>
          <Avatar size={40} icon={<UserOutlined />} src={record.avatarUrl} />
          <div>
            <div className="font-medium text-white">{record.displayName || record.username}</div>
            <Tag className="text-xs" color="cyan">Lv.{record.level}</Tag>
          </div>
        </div>
      ),
    },
    {
      title: '等级',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: number) => <Tag color="purple">Lv.{level}</Tag>,
    },
    {
      title: '经验值 (XP)',
      dataIndex: 'totalXp',
      key: 'totalXp',
      width: 130,
      sorter: (a: UserLeaderboardEntry, b: UserLeaderboardEntry) => b.totalXp - a.totalXp,
      render: (val: number) => <span className="font-semibold text-orange-500">{val.toLocaleString()}</span>,
    },
    {
      title: '积分',
      dataIndex: 'totalPoints',
      key: 'totalPoints',
      width: 100,
      sorter: (a: UserLeaderboardEntry, b: UserLeaderboardEntry) => b.totalPoints - a.totalPoints,
      render: (val: number) => <span className="font-semibold text-green-500">{val.toLocaleString()}</span>,
    },
    {
      title: '成就',
      dataIndex: 'achievementCount',
      key: 'achievementCount',
      width: 80,
      sorter: (a: UserLeaderboardEntry, b: UserLeaderboardEntry) => b.achievementCount - a.achievementCount,
      render: (val: number) => <span className="font-semibold text-blue-500">{val}</span>,
    },
  ];

  const userTypeOptions = [
    { label: <span><FireOutlined /> 经验值</span>, value: 'xp' },
    { label: <span><CrownOutlined /> 等级</span>, value: 'level' },
    { label: <span><GiftOutlined /> 积分</span>, value: 'points' },
    { label: <span><StarOutlined /> 成就</span>, value: 'achievements' },
  ];

  return (
    <div className=" py-2">
      <SEO
        title="排行榜 | GameHub"
        description="GameHub 排行榜 - 游戏排行和用户排行"
        keywords="排行榜,游戏排名,用户排名,热门游戏,最佳游戏"
        noindex
      />

      <Title level={1} className="mb-6 flex items-center !text-white">
        <TrophyOutlined className="mr-3 text-yellow-500" />
        排行榜
      </Title>

      <Card className="shadow-sm bg-dark-800 border-dark-700">
        <Tabs activeKey={activeTab} onChange={setActiveTab} className="leaderboard-tabs">
          <TabPane tab={<span><TrophyOutlined /> 游戏排行</span>} key="games">
            <Tabs activeKey={activeType} onChange={setActiveType} tabBarStyle={{ marginBottom: 16 }}>
              <TabPane tab="评分最高" key="top_rated" />
              <TabPane tab="评测最多" key="most_reviewed" />
              <TabPane tab="收藏最多" key="most_favorited" />
              <TabPane tab="讨论最多" key="most_discussed" />
            </Tabs>
            <Table
              dataSource={lbData?.entries || []}
              columns={gameColumns}
              rowKey="rank"
              loading={lbLoading && activeTab === 'games'}
              pagination={false}
              className="leaderboard-table"
            />
          </TabPane>

          <TabPane tab={<span><UserOutlined /> 用户排行</span>} key="users">
            <div className="mb-6">
              <Segmented
                value={userType}
                onChange={(val) => setUserType(val as string)}
                options={userTypeOptions}
                block
              />
            </div>
            <Table
              dataSource={userLbData?.items || []}
              columns={userColumns}
              rowKey="rank"
              loading={userLbLoading && activeTab === 'users'}
              pagination={false}
              className="leaderboard-table"
            />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default LeaderboardPage;
