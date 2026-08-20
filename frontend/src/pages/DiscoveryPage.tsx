import React, { useState } from 'react';
import { Card, Tabs, Row, Col, Statistic, Spin, Empty, Select, Typography } from 'antd';
import {
  BarChartOutlined,
  PieChartOutlined,
  RiseOutlined,
  FireOutlined,
  TeamOutlined,
  PlaySquareOutlined,
  FileTextOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import {
  useSearchTrendData,
  useLeaderboard,
  useDiscoveryDistributions,
  useCommunitySummary,
} from '../api/hooks';
import SEO from '../components/SEO';

const { TabPane } = Tabs;
const { Title } = Typography;

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const DiscoveryPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('trends');
  const [lbType, setLbType] = useState<string>('top_rated');

  const { data: searchTrends, isLoading: trendsLoading } = useSearchTrendData(30);
  const { data: leaderboardData, isLoading: lbLoading } = useLeaderboard(lbType, 10);
  const { data: distributions, isLoading: distLoading } = useDiscoveryDistributions();
  const { data: community, isLoading: commLoading } = useCommunitySummary();

  return (
    <div className=" py-2">
      <SEO
        title={t('discovery.seoTitle')}
        description={t('discovery.seoDesc')}
        keywords="game trends, leaderboard, game data, popular games"
      />

      <Title level={1} className="mb-6 !text-white">{t('discovery.title')}</Title>

      <Tabs activeKey={activeTab} onChange={setActiveTab} className="discovery-tabs">
        <TabPane tab={<span><RiseOutlined /> {t('discovery.tab.trends')}</span>} key="trends">
          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Card title={t('discovery.searchTrendsTitle')} className="shadow-sm bg-dark-800 border-dark-700">
                {trendsLoading ? <div className="h-80 flex items-center justify-center"><Spin size="large" /></div>
                : searchTrends?.length ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={searchTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 14 }} />
                      <YAxis tick={{ fontSize: 14 }} />
                      <Tooltip contentStyle={{ fontSize: 16 }} />
                      <Legend />
                      <Line type="monotone" dataKey="totalSearches" stroke="#3b82f6" name={t('discovery.chart.searchCount')} dot={false} />
                      <Line type="monotone" dataKey="uniqueQueries" stroke="#10b981" name={t('discovery.chart.uniqueQueries')} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <Empty description={t('discovery.noTrendData')} />}
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab={<span><BarChartOutlined /> {t('discovery.tab.leaderboard')}</span>} key="leaderboard">
          <Card
            title={t('discovery.leaderboardTitle')}
            className="shadow-sm bg-dark-800 border-dark-700"
            extra={
              <Select value={lbType} onChange={setLbType} style={{ width: 150 }}>
                <Select.Option value="top_rated">{t('discovery.lb.rating')}</Select.Option>
                <Select.Option value="most_reviewed">{t('discovery.lb.reviews')}</Select.Option>
                <Select.Option value="most_favorited">{t('discovery.lb.favorites')}</Select.Option>
                <Select.Option value="most_discussed">{t('discovery.lb.discussions')}</Select.Option>
              </Select>
            }
          >
            {lbLoading ? <div className="h-80 flex items-center justify-center"><Spin size="large" /></div>
            : leaderboardData?.entries?.length ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={leaderboardData.entries.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 14 }} />
                  <YAxis type="category" dataKey="title" width={180} tick={{ fontSize: 16 }} />
                  <Tooltip contentStyle={{ fontSize: 16 }} />
                  <Bar dataKey="score" fill="#3b82f6" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 16 }}>
                    {leaderboardData.entries.slice(0, 10).map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty description={t('discovery.noLbData')} />}
          </Card>
        </TabPane>

        <TabPane tab={<span><PieChartOutlined /> {t('discovery.tab.stats')}</span>} key="stats">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card title={t('discovery.platformDist')} className="shadow-sm bg-dark-800 border-dark-700">
                {distLoading ? <Spin className="flex justify-center py-20" />
                : distributions?.platforms?.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={distributions.platforms}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(props: { name?: string; payload?: Record<string, unknown> }) => `${props.name || ''} ${((props.payload as Record<string, unknown>)?.percentage as string) || ''}%`}
                        labelLine={{ fontSize: 14 }}
                      >
                        {distributions.platforms.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 16 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <Empty description={t('discovery.noData')} />}
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card title={t('discovery.genreDist')} className="shadow-sm bg-dark-800 border-dark-700">
                {distLoading ? <Spin className="flex justify-center py-20" />
                : distributions?.genres?.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={distributions.genres}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(props: { name?: string; payload?: Record<string, unknown> }) => `${props.name || ''} ${((props.payload as Record<string, unknown>)?.percentage as string) || ''}%`}
                        labelLine={{ fontSize: 14 }}
                      >
                        {distributions.genres.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[(idx + 2) % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 16 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <Empty description={t('discovery.noData')} />}
              </Card>
            </Col>
            <Col xs={24}>
              <Card title={t('discovery.communityOverview')} className="shadow-sm bg-dark-800 border-dark-700">
                {commLoading ? <Spin className="flex justify-center py-2" />
                : community ? (
                  <Row gutter={[16, 16]}>
                    <Col xs={12} sm={8} md={4}>
                      <Statistic title={t('discovery.stat.totalUsers')} value={community.totalUsers} prefix={<TeamOutlined />} />
                    </Col>
                    <Col xs={12} sm={8} md={4}>
                      <Statistic title={t('discovery.stat.totalGames')} value={community.totalGames} prefix={<PlaySquareOutlined />} />
                    </Col>
                    <Col xs={12} sm={8} md={4}>
                      <Statistic title={t('discovery.stat.totalReviews')} value={community.totalReviews} prefix={<FileTextOutlined />} />
                    </Col>
                    <Col xs={12} sm={8} md={4}>
                      <Statistic title={t('discovery.stat.totalPosts')} value={community.totalPosts} prefix={<MessageOutlined />} />
                    </Col>
                    <Col xs={12} sm={8} md={4}>
                      <Statistic title={t('discovery.stat.newUsersToday')} value={community.newUsersToday} prefix={<TeamOutlined />} valueStyle={{ color: '#10b981' }} />
                    </Col>
                    <Col xs={12} sm={8} md={4}>
                      <Statistic title={t('discovery.stat.activeUsers')} value={community.activeUsers} prefix={<FireOutlined />} valueStyle={{ color: '#f59e0b' }} />
                    </Col>
                  </Row>
                ) : <Empty description={t('discovery.noCommunityData')} />}
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default DiscoveryPage;
