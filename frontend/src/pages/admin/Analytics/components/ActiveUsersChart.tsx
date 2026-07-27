import React from 'react';
import { Card, Row, Col, Statistic, Spin, Empty } from 'antd';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useActiveUsers } from '../../../../api/hooks';
import PeriodSelector from './PeriodSelector';

const ActiveUsersChart: React.FC = () => {
  const [days, setDays] = React.useState(30);
  const { data, isLoading } = useActiveUsers(days);

  return (
    <Card title="活跃用户分析" extra={<PeriodSelector value={days} onChange={(d) => setDays(d)} />}>
      {isLoading ? (
        <div className="flex justify-center py-12"><Spin size="large" /></div>
      ) : !data ? (
        <Empty description="暂无数据" />
      ) : (
        <>
          <Row gutter={16} className="mb-6">
            <Col span={6}><Statistic title="总登录次数" value={data.totalLogins} /></Col>
            <Col span={6}><Statistic title="活跃用户" value={data.activeUsers} /></Col>
            <Col span={6}><Statistic title="新增用户" value={data.newUsers} /></Col>
            <Col span={6}><Statistic title="人均登录" value={data.avgLoginsPerUser} /></Col>
          </Row>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.daily} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" fontSize={12} tick={{ fill: '#888' }} />
              <YAxis fontSize={12} tick={{ fill: '#888' }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="logins" stroke="#1890ff" fill="#1890ff" fillOpacity={0.1} name="登录次数" strokeWidth={2} />
              <Area type="monotone" dataKey="activeUsers" stroke="#52c41a" fill="#52c41a" fillOpacity={0.1} name="活跃用户" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </>
      )}
    </Card>
  );
};

export default ActiveUsersChart;
