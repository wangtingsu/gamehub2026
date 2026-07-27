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
  const [activeTab, setActiveTab] = useState('trends');
  const [lbType, setLbType] = useState<string>('top_rated');

  const { data: searchTrends, isLoading: trendsLoading } = useSearchTrendData(30);
  const { data: leaderboardData, isLoading: lbLoading } = useLeaderboard(lbType, 10);
  const { data: distributions, isLoading: distLoading } = useDiscoveryDistributions();
  const { data: community, isLoading: commLoading } = useCommunitySummary();

  return (
    <div className=" py-8">
      <SEO
        title="发现 | GameHub"
        description="GameHub 发现页面 - 趋势分析、排行榜、数据报告"
        keywords="游戏趋势,排行榜,游戏数据,热门游戏"
      />

      <Title level={1} className="mb-6 !text-white">发现</Title>

      <Tabs activeKey={activeTab} onChange={setActiveTab} className="discovery-tabs">
        <TabPane tab={<span><RiseOutlined /> 趋势分析</span>} key="trends">
          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Card title="搜索趋势（近30天）" className="shadow-sm bg-dark-800 border-dark-700">
                {trendsLoading ? <div className="h-80 flex items-center justify-center"><Spin size="large" /></div>
                : searchTrends?.length ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={searchTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 14 }} />
                      <YAxis tick={{ fontSize: 14 }} />
                      <Tooltip contentStyle={{ fontSize: 16 }} />
                      <Legend />
                      <Line type="monotone" dataKey="totalSearches" stroke="#3b82f6" name="搜索次数" dot={false} />
                      <Line type="monotone" dataKey="uniqueQueries" stroke="#10b981" name="唯一搜索词" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <Empty description="暂无趋势数据" />}
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab={<span><BarChartOutlined /> 排行榜</span>} key="leaderboard">
          <Card
            title="游戏排行榜"
            className="shadow-sm bg-dark-800 border-dark-700"
            extra={
              <Select value={lbType} onChange={setLbType} style={{ width: 150 }}>
                <Select.Option value="top_rated">评分最高</Select.Option>
                <Select.Option value="most_reviewed">评测最多</Select.Option>
                <Select.Option value="most_favorited">收藏最多</Select.Option>
                <Select.Option value="most_discussed">讨论最多</Select.Option>
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
            ) : <Empty description="暂无排行榜数据" />}
          </Card>
        </TabPane>

        <TabPane tab={<span><PieChartOutlined /> 数据报告</span>} key="stats">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card title="平台分布" className="shadow-sm bg-dark-800 border-dark-700">
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
                ) : <Empty description="暂无数据" />}
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card title="类型分布" className="shadow-sm bg-dark-800 border-dark-700">
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
                ) : <Empty description="暂无数据" />}
              </Card>
            </Col>
            <Col xs={24}>
              <Card title="社区概览" className="shadow-sm bg-dark-800 border-dark-700">
                {commLoading ? <Spin className="flex justify-center py-10" />
                : community ? (
                  <Row gutter={[16, 16]}>
                    <Col xs={12} sm={8} md={4}>
                      <Statistic title="总用户" value={community.totalUsers} prefix={<TeamOutlined />} />
                    </Col>
                    <Col xs={12} sm={8} md={4}>
                      <Statistic title="总游戏" value={community.totalGames} prefix={<PlaySquareOutlined />} />
                    </Col>
                    <Col xs={12} sm={8} md={4}>
                      <Statistic title="总评测" value={community.totalReviews} prefix={<FileTextOutlined />} />
                    </Col>
                    <Col xs={12} sm={8} md={4}>
                      <Statistic title="总帖子" value={community.totalPosts} prefix={<MessageOutlined />} />
                    </Col>
                    <Col xs={12} sm={8} md={4}>
                      <Statistic title="今日新用户" value={community.newUsersToday} prefix={<TeamOutlined />} valueStyle={{ color: '#10b981' }} />
                    </Col>
                    <Col xs={12} sm={8} md={4}>
                      <Statistic title="活跃用户(7d)" value={community.activeUsers} prefix={<FireOutlined />} valueStyle={{ color: '#f59e0b' }} />
                    </Col>
                  </Row>
                ) : <Empty description="暂无社区数据" />}
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default DiscoveryPage;
