import React, { useState, useEffect } from 'react';
import { Row, Col, Table, Card, Tag, Typography } from 'antd';
import { SafetyOutlined, UserOutlined, PlayCircleOutlined, FileTextOutlined, TeamOutlined } from '@ant-design/icons';
import apiService from '../../../api';
import SEO from '../../../components/SEO';

const { Title, Text } = Typography;

const statCards = [
  { key: 'totalUsers', label: '总用户数', icon: <UserOutlined />, color: 'blue', dataIndex: 'users.total' },
  { key: 'totalGames', label: '游戏总数', icon: <PlayCircleOutlined />, color: 'green', dataIndex: 'games.total' },
  { key: 'totalNews', label: '新闻总数', icon: <FileTextOutlined />, color: 'orange', dataIndex: 'news.total' },
  { key: 'totalReviews', label: '评测总数', icon: <TeamOutlined />, color: 'purple', dataIndex: 'reviews.total' },
];

const Monitoring: React.FC = () => {
  const [permissionChanges, setPermissionChanges] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const loadChanges = async () => {
    setLoading(true);
    try {
      // 获取仪表盘统计数据
      const statsData = await apiService.getAdminStats();
      setStats(statsData);
      // 获取监控操作日志
      const changes = await apiService.getAuditLogs({ page: 1, limit: 50 });
      setPermissionChanges(changes.logs || []);
      setTotal(changes.total || 0);
    } catch (err) {
      console.error('获取监控数据失败:', err);
    }
    setLoading(false);
  };

  useEffect(() => { loadChanges(); }, [page]);

  const columns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '操作人',
      dataIndex: 'operatorName',
      key: 'operatorName',
      width: 120,
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (action: string) => {
        const actionLabels: Record<string, { color: string; label: string }> = {
          create: { color: 'green', label: '创建' },
          update: { color: 'blue', label: '更新' },
          delete: { color: 'red', label: '删除' },
          role_change: { color: 'purple', label: '角色变更' },
          level_reset: { color: 'gold', label: '等级重置' },
          batch_update: { color: 'cyan', label: '批量更新' },
        };
        const config = actionLabels[action] || { color: 'default', label: action };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '资源',
      dataIndex: 'resourceType',
      key: 'resourceType',
      width: 100,
    },
    {
      title: '详情',
      dataIndex: 'details',
      key: 'details',
      render: (details: any) => details ? JSON.stringify(details).substring(0, 100) : '-',
    },
  ];

  return (
    <div>
      <SEO title="监控面板 | GameHub" description="管理员监控面板，查看系统运行状态和操作记录" keywords="监控面板, 系统监控, 操作日志, 运行状态, 管理员监控" noindex />
      <Title level={3}><SafetyOutlined className="mr-2" />管理员监控面板</Title>

      {/* 统计概览 */}
      {stats && (
        <Row gutter={[16, 16]} className="mb-6">
          {statCards.map(({ key, label, icon, color, dataIndex }) => (
            <Col span={6} key={key}>
              <Card className="border-l-4" style={{ borderLeftColor: `var(--${color}-500, #1677ff)` }}>
                <div className="flex items-center justify-between">
                  <div>
                    <Text type="secondary">{label}</Text>
                    <div className="text-2xl font-bold">
                      {dataIndex.split('.').reduce((obj, key) => obj?.[key], stats as any) ?? 0}
                    </div>
                  </div>
                  <div className="text-3xl opacity-20">{icon}</div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Card title="最近操作记录" className="mb-6">
        <Table
          columns={columns}
          dataSource={permissionChanges}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: 20,
            total,
            onChange: (p) => setPage(p),
            showTotal: (t) => `共 ${t} 条`,
          }}
          size="small"
        />
      </Card>
    </div>
  );
};

export default Monitoring;
