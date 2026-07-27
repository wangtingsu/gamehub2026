import React from 'react';
import { Tabs } from 'antd';
import { BarChartOutlined, RiseOutlined, PieChartOutlined, UserOutlined, FileTextOutlined } from '@ant-design/icons';
import SEO from '../../../components/SEO';
import UserGrowthChart from './components/UserGrowthChart';
import GamePopularityTable from './components/GamePopularityTable';
import ContentEngagementChart from './components/ContentEngagementChart';
import DistributionChart from './components/DistributionChart';
import ActiveUsersChart from './components/ActiveUsersChart';

const tabs = [
  { key: 'userGrowth', label: '用户增长趋势', icon: <RiseOutlined />, children: <UserGrowthChart /> },
  { key: 'gamePopularity', label: '游戏热度排行', icon: <BarChartOutlined />, children: <GamePopularityTable /> },
  { key: 'contentEngagement', label: '内容参与度', icon: <FileTextOutlined />, children: <ContentEngagementChart /> },
  { key: 'distribution', label: '平台/类型分布', icon: <PieChartOutlined />, children: <DistributionChart /> },
  { key: 'activeUsers', label: '活跃用户分析', icon: <UserOutlined />, children: <ActiveUsersChart /> },
];

const AnalyticsPage: React.FC = () => {
  return (
    <div>
      <SEO title="业务分析 | GameHub" description="深度业务分析报表" keywords="业务分析, 数据统计, 用户增长, 游戏热度" noindex />
      <h1 className="text-2xl font-bold mb-6">业务分析</h1>
      <Tabs defaultActiveKey="userGrowth" items={tabs} />
    </div>
  );
};

export default AnalyticsPage;
