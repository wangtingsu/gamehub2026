import React from 'react';
import { Card, Row, Col, Statistic, Spin, Empty } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useContentEngagement } from '../../../../api/hooks';
import PeriodSelector from './PeriodSelector';

const ContentEngagementChart: React.FC = () => {
  const [days, setDays] = React.useState(30);
  const { data, isLoading } = useContentEngagement(days);

  const chartData = React.useMemo(() => {
    if (!data?.daily) return [];
    const grouped: Record<string, any> = {};
    for (const item of data.daily) {
      if (!grouped[item.date]) grouped[item.date] = { date: item.date };
      grouped[item.date][item.type] = item.count;
    }
    return Object.values(grouped);
  }, [data]);

  return (
    <Card title="内容参与度" extra={<PeriodSelector value={days} onChange={(d) => setDays(d)} />}>
      {isLoading ? (
        <div className="flex justify-center py-12"><Spin size="large" /></div>
      ) : !data ? (
        <Empty description="暂无数据" />
      ) : (
        <>
          <Row gutter={16} className="mb-6">
            <Col span={6}><Statistic title="新闻浏览" value={data.newsViews} /></Col>
            <Col span={6}><Statistic title="评测" value={data.reviews} /></Col>
            <Col span={6}><Statistic title="帖子" value={data.posts} /></Col>
            <Col span={6}><Statistic title="评论" value={data.comments} /></Col>
          </Row>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" fontSize={12} tick={{ fill: '#888' }} />
              <YAxis fontSize={12} tick={{ fill: '#888' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="reviews" stackId="a" fill="#1890ff" name="评测" />
              <Bar dataKey="posts" stackId="a" fill="#52c41a" name="帖子" />
              <Bar dataKey="comments" stackId="a" fill="#faad14" name="评论" />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </Card>
  );
};

export default ContentEngagementChart;
