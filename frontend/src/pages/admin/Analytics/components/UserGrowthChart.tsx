import React from 'react';
import { Card, Spin, Empty } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useUserGrowth } from '../../../../api/hooks';
import PeriodSelector from './PeriodSelector';

const UserGrowthChart: React.FC = () => {
  const [period, setPeriod] = React.useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [days, setDays] = React.useState(30);
  const { data, isLoading } = useUserGrowth(period, days);

  return (
    <Card
      title="用户增长趋势"
      extra={<PeriodSelector value={days} onChange={(d) => setDays(d)} />}
    >
      {isLoading ? (
        <div className="flex justify-center py-12"><Spin size="large" /></div>
      ) : !data || data.length === 0 ? (
        <Empty description="暂无数据" />
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" fontSize={12} tick={{ fill: '#888' }} />
            <YAxis yAxisId="left" fontSize={12} tick={{ fill: '#888' }} />
            <YAxis yAxisId="right" orientation="right" fontSize={12} tick={{ fill: '#888' }} />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="newUsers" stroke="#1890ff" name="新增用户" strokeWidth={2} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#52c41a" name="累计用户" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default UserGrowthChart;
