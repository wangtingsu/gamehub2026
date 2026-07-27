import React from 'react';
import { Card, Table, Tag, Progress, Spin, Empty, Select } from 'antd';
import { useGamePopularity } from '../../../../api/hooks';

const sortOptions = [
  { value: 'rating', label: '按评分' },
  { value: 'reviews', label: '按评测数' },
  { value: 'engagement', label: '按热度' },
];

const GamePopularityTable: React.FC = () => {
  const [sortBy, setSortBy] = React.useState('rating');
  const { data, isLoading } = useGamePopularity(sortBy, 10);

  const columns = [
    {
      title: '排名',
      key: 'rank',
      width: 60,
      render: (_: any, __: any, i: number) => (
        <span className={`font-bold ${i < 3 ? 'text-yellow-500' : 'text-gray-500'}`}>#{i + 1}</span>
      ),
    },
    {
      title: '游戏名称',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <span className="font-medium">{text}</span>,
    },
    {
      title: '评分',
      dataIndex: 'rating',
      key: 'rating',
      width: 140,
      render: (rating: number) => (
        <div className="flex items-center gap-2">
          <Progress percent={rating * 10} size="small" showInfo={false}
            strokeColor={rating >= 4.5 ? '#52c41a' : rating >= 4 ? '#faad14' : '#ff4d4f'} />
          <span className="text-sm font-medium">{Number(rating).toFixed(1)}</span>
        </div>
      ),
    },
    {
      title: '评测数',
      dataIndex: 'reviewCount',
      key: 'reviewCount',
      width: 80,
    },
    {
      title: '平台',
      dataIndex: 'platforms',
      key: 'platforms',
      width: 160,
      render: (platforms: string[]) => (
        <span>{platforms.slice(0, 3).join(' / ')}{platforms.length > 3 ? '...' : ''}</span>
      ),
    },
    {
      title: '类型',
      dataIndex: 'genres',
      key: 'genres',
      width: 160,
      render: (genres: string[]) => (
        <span>{genres.slice(0, 2).join(', ')}{genres.length > 2 ? '...' : ''}</span>
      ),
    },
  ];

  return (
    <Card
      title="游戏热度排行"
      extra={
        <Select value={sortBy} onChange={setSortBy} options={sortOptions} style={{ width: 120 }} />
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-12"><Spin size="large" /></div>
      ) : !data || data.length === 0 ? (
        <Empty description="暂无数据" />
      ) : (
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          pagination={false}
          size="middle"
        />
      )}
    </Card>
  );
};

export default GamePopularityTable;
