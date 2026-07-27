import React from 'react';
import { Tabs } from 'antd';
import { TagsOutlined, GroupOutlined, BarChartOutlined } from '@ant-design/icons';
import SEO from '../../../components/SEO';
import TagManager from './components/TagManager';
import SegmentList from './components/SegmentList';
import BehaviorAnalysis from './components/BehaviorAnalysis';

const ProfilingPage: React.FC = () => {
  const tabs = [
    { key: 'tags', label: '用户标签', icon: <TagsOutlined />, children: <TagManager /> },
    { key: 'segments', label: '用户分组', icon: <GroupOutlined />, children: <SegmentList /> },
    { key: 'behavior', label: '行为分析', icon: <BarChartOutlined />, children: <BehaviorAnalysis /> },
  ];

  return (
    <div>
      <SEO title="用户画像 | GameHub" description="用户画像与行为分析" keywords="用户画像, 用户标签, 行为分析, 用户分组" noindex />
      <h1 className="text-2xl font-bold mb-6">用户画像</h1>
      <Tabs defaultActiveKey="tags" items={tabs} />
    </div>
  );
};

export default ProfilingPage;
