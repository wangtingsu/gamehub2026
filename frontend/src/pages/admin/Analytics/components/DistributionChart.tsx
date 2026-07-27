import React from 'react';
import { Card, Row, Col, Table, Spin, Empty } from 'antd';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useDistributions } from '../../../../api/hooks';

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'];

const DistributionChart: React.FC = () => {
  const { data, isLoading } = useDistributions();

  const distColumns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '数量', dataIndex: 'count', key: 'count' },
    { title: '占比', dataIndex: 'percentage', key: 'percentage', render: (v: number) => `${v}%` },
  ];

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={12}>
        <Card title="平台分布">
          {isLoading ? <div className="flex justify-center py-8"><Spin /></div> :
           !data?.platforms?.length ? <Empty description="暂无数据" /> :
          <>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={data.platforms} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percentage }: any) => `${name} ${percentage || 0}%`}>
                  {data.platforms.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <Table columns={distColumns} dataSource={data.platforms} rowKey="name" pagination={false} size="small" />
          </>}
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card title="游戏类型分布">
          {isLoading ? <div className="flex justify-center py-8"><Spin /></div> :
           !data?.genres?.length ? <Empty description="暂无数据" /> :
          <>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={data.genres} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percentage }: any) => `${name} ${percentage || 0}%`}>
                  {data.genres.map((_, i) => (
                    <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <Table columns={distColumns} dataSource={data.genres} rowKey="name" pagination={false} size="small" />
          </>}
        </Card>
      </Col>
    </Row>
  );
};

export default DistributionChart;
