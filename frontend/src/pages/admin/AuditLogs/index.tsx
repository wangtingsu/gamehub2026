import React, { useState, useEffect } from 'react';
import { Table, Card, Tag, Typography, Tabs, Select } from 'antd';
import { AuditOutlined, LoginOutlined } from '@ant-design/icons';
import apiService from '../../../api';
import SEO from '../../../components/SEO';

const { Title } = Typography;
const { TabPane } = Tabs;

const AuditLogs: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loginLogs, setLoginLogs] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [loginTotal, setLoginTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState<string | undefined>();

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const result = await apiService.getAuditLogs({ page, limit: 20, userId });
      setAuditLogs(result.logs || []);
      setAuditTotal(result.total || 0);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const loadLoginLogs = async () => {
    setLoading(true);
    try {
      const result = await apiService.getLoginLogs({ page, limit: 20, userId });
      setLoginLogs(result.logs || []);
      setLoginTotal(result.total || 0);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadAuditLogs(); }, [page, userId]);

  const auditColumns = [
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
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 110,
      render: (action: string) => {
        const labels: Record<string, string> = {
          create: '创建', update: '更新', delete: '删除',
          role_change: '角色变更', level_reset: '等级重置',
          batch_update: '批量更新',
        };
        return <Tag>{labels[action] || action}</Tag>;
      },
    },
    { title: '资源类型', dataIndex: 'resourceType', key: 'resourceType', width: 100 },
    { title: '资源ID', dataIndex: 'resourceId', key: 'resourceId', width: 100 },
    {
      title: '详情',
      dataIndex: 'details',
      key: 'details',
      render: (d: any) => d ? JSON.stringify(d).substring(0, 80) : '-',
    },
    { title: 'IP', dataIndex: 'ipAddress', key: 'ipAddress', width: 120 },
  ];

  const loginColumns = [
    {
      title: '登录时间',
      dataIndex: 'loginTime',
      key: 'loginTime',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString(),
    },
    { title: '用户', dataIndex: 'username', key: 'username', width: 120 },
    {
      title: '状态',
      dataIndex: 'success',
      key: 'success',
      width: 80,
      render: (s: boolean) => s ? <Tag color="success">成功</Tag> : <Tag color="error">失败</Tag>,
    },
    {
      title: '时长(分)',
      dataIndex: 'durationMinutes',
      key: 'durationMinutes',
      width: 80,
      render: (v: number) => v ? v.toFixed(1) : '-',
    },
    { title: 'IP', dataIndex: 'ipAddress', key: 'ipAddress', width: 120 },
    { title: '失败原因', dataIndex: 'failReason', key: 'failReason' },
  ];

  return (
    <div>
      <SEO title="审计日志 | GameHub" description="查看系统审计日志和登录记录" keywords="审计日志, 操作日志, 系统审计, 登录日志, 安全审计" noindex />
      <Title level={3}><AuditOutlined className="mr-2" />审计日志</Title>

      <Tabs defaultActiveKey="audit">
        <TabPane tab="操作日志" key="audit">
          <Card>
            <Table
              columns={auditColumns}
              dataSource={auditLogs}
              rowKey="id"
              loading={loading}
              size="small"
              pagination={{
                current: page,
                pageSize: 20,
                total: auditTotal,
                onChange: (p) => setPage(p),
                showTotal: (t) => `共 ${t} 条`,
              }}
            />
          </Card>
        </TabPane>
        <TabPane tab={<><LoginOutlined /> 登录日志</>} key="login">
          <Card>
            <Table
              columns={loginColumns}
              dataSource={loginLogs}
              rowKey="id"
              loading={loading}
              size="small"
              pagination={{
                current: page,
                pageSize: 20,
                total: loginTotal,
                onChange: (p) => setPage(p),
                showTotal: (t) => `共 ${t} 条`,
              }}
            />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default AuditLogs;
