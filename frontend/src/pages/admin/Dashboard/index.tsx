import React from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Progress, Space, Spin } from 'antd';
import {
  UserOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useDashboardStats, useGamePopularity, useAuditLogStats } from '../../../api/hooks';
import SEO from '../../../components/SEO';

const Dashboard: React.FC = () => {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: popularGames, isLoading: gamesLoading } = useGamePopularity('rating', 5);
  const { data: auditLogs } = useAuditLogStats(5);

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.users?.total ?? 0,
      icon: <UserOutlined />,
      color: '#3b82f6',
      growth: stats?.users?.growth ?? 0,
      prefix: '',
    },
    {
      title: 'Games',
      value: stats?.games?.total ?? 0,
      icon: <PlayCircleOutlined />,
      color: '#10b981',
      growth: stats?.games?.growth ?? 0,
      prefix: '',
    },
    {
      title: 'Content',
      value: (stats?.news?.total ?? 0) + (stats?.reviews?.total ?? 0) + (stats?.community?.posts ?? 0),
      icon: <FileTextOutlined />,
      color: '#8b5cf6',
      growth: stats?.reviews?.growth ?? 0,
      prefix: '',
    },
    {
      title: 'Today Reviews',
      value: stats?.reviews?.newToday ?? 0,
      icon: <FileTextOutlined />,
      color: '#f59e0b',
      growth: 0,
      prefix: '',
    },
  ];

  const gameColumns = [
    {
      title: 'Game Title',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <span className="font-medium">{text}</span>,
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating: number) => (
        <div className="flex items-center">
          <Progress
            percent={rating * 10}
            size="small"
            showInfo={false}
            strokeColor={rating >= 4.5 ? '#10b981' : rating >= 4.0 ? '#f59e0b' : '#ef4444'}
          />
          <span className="ml-2">{Number(rating).toFixed(1)}</span>
        </div>
      ),
    },
    {
      title: 'Review Count',
      dataIndex: 'reviewCount',
      key: 'reviewCount',
      width: 100,
    },
    {
      title: 'Platforms',
      dataIndex: 'platforms',
      key: 'platforms',
      render: (platforms: string[]) => (
        <Space size={[0, 8]} wrap>
          {platforms?.slice(0, 2).map((platform) => (
            <Tag key={platform} color="blue">{platform}</Tag>
          ))}
          {platforms?.length > 2 && <Tag>+{platforms.length - 2}</Tag>}
        </Space>
      ),
    },
  ];

  const activityColumns = [
    {
      title: 'User',
      dataIndex: 'user_name',
      key: 'user_name',
      render: (text: string) => <span className="font-medium">{text || '-'}</span>,
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
    },
    {
      title: 'Resource',
      dataIndex: 'resource_type',
      key: 'resource_type',
    },
    {
      title: 'Time',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => <span className="text-gray-500">{text ? new Date(text).toLocaleString() : '-'}</span>,
    },
  ];

  if (statsLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <SEO title="仪表盘 | GameHub" description="管理后台仪表盘，查看网站运营数据" keywords="仪表盘, 管理后台, 数据统计, 网站概览, 运营数据" noindex />
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} className="mb-8">
        {statCards.map((stat) => (
          <Col xs={24} sm={12} lg={6} key={stat.title}>
            <Card className="shadow-sm border-gray-200 hover:shadow-md transition-shadow duration-300">
              <div className="flex items-start justify-between">
                <div>
                  <Statistic
                    title={stat.title}
                    value={stat.value}
                    prefix={stat.prefix}
                    valueStyle={{ color: stat.color }}
                    className="mb-2"
                  />
                  {stat.growth !== 0 && (
                    <div className={`flex items-center text-sm ${stat.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.growth >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                      <span className="ml-1">{Math.abs(stat.growth)}% from last month</span>
                    </div>
                  )}
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: `${stat.color}15` }}>
                  <div style={{ color: stat.color, fontSize: '24px' }}>{stat.icon}</div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        {/* 热门游戏 */}
        <Col xs={24} lg={16}>
          <Card
            title="Popular Games"
            className="shadow-sm border-gray-200"
            extra={
              <div className="flex items-center space-x-2">
                <EyeOutlined className="text-gray-500" />
                <span className="text-sm text-gray-500">Last 30 days</span>
              </div>
            }
          >
            {gamesLoading ? <div className="flex justify-center py-8"><Spin /></div> : (
              <Table columns={gameColumns} dataSource={popularGames || []} pagination={false} size="middle" rowKey="id" />
            )}
          </Card>
        </Col>

        {/* 系统状态 */}
        <Col xs={24} lg={8}>
          <Card
            title="System Status"
            className="shadow-sm border-gray-200"
            extra={<Tag color="green">All Systems Operational</Tag>}
          >
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Database</span>
                  <span className="text-sm text-gray-500">92%</span>
                </div>
                <Progress percent={92} strokeColor="#10b981" size="small" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">API Response</span>
                  <span className="text-sm text-gray-500">99.8%</span>
                </div>
                <Progress percent={99.8} strokeColor="#3b82f6" size="small" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Users</span>
                  <span className="text-sm text-gray-500">{stats?.users?.active ?? 0} active</span>
                </div>
                <Progress percent={Math.round(((stats?.users?.active ?? 0) / Math.max(stats?.users?.total ?? 1, 1)) * 100)} strokeColor="#f59e0b" size="small" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Today New Users</span>
                  <span className="text-sm text-gray-500">{stats?.users?.newToday ?? 0}</span>
                </div>
                <Progress percent={Math.min((stats?.users?.newToday ?? 0) * 5, 100)} strokeColor="#8b5cf6" size="small" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 最近活动 */}
      <Row gutter={[16, 16]} className="mt-6">
        <Col xs={24}>
          <Card
            title="Recent Activities"
            className="shadow-sm border-gray-200"
          >
            <Table
              columns={activityColumns}
              dataSource={Array.isArray(auditLogs) ? auditLogs : []}
              pagination={false}
              size="middle"
              className="admin-table"
            />
          </Card>
        </Col>
      </Row>

      <style>{`
        .dashboard :global(.ant-card-head) {
          border-bottom: 1px solid #f0f0f0;
        }
        .dashboard :global(.ant-card-head-title) {
          font-weight: 600;
        }
        .dashboard :global(.admin-table .ant-table-thead > tr > th) {
          background-color: #fafafa;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
