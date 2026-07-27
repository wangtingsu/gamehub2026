import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Typography, Tag, message, Space, Select, DatePicker, Statistic, Row, Col, Popconfirm } from 'antd';
import { BellOutlined, PlusOutlined, DeleteOutlined, SendOutlined, TeamOutlined, NotificationOutlined, BarChartOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import apiService from '../../../api';
import type { Notification, NotificationQueryParams } from '../../../api/types';
import SEO from '../../../components/SEO';

const { Title, Text } = Typography;
const { TextArea } = Input;

const AdminNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<(Notification & { key: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ total: number; unread: number; byType: Record<string, number> } | null>(null);
  const [page, setPage] = useState(1);
  const [systemModalOpen, setSystemModalOpen] = useState(false);
  const [marketingModalOpen, setMarketingModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [systemForm] = Form.useForm();
  const [marketingForm] = Form.useForm();

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const result = await apiService.getNotifications({ page, limit: 20 } as NotificationQueryParams);
      setNotifications((result || []).map((n: Notification) => ({ ...n, key: n.id })));
    } catch {
      message.error('加载通知列表失败');
    }
    setLoading(false);
  };

  const loadStats = async () => {
    try {
      const result = await apiService.getNotificationStats();
      setStats(result);
    } catch {
      // stats may not be available
    }
  };

  useEffect(() => {
    loadNotifications();
    loadStats();
  }, [page]);

  const handleSendSystem = async (values: any) => {
    setSending(true);
    try {
      await apiService.sendSystemNotification({
        title: values.title,
        message: values.message,
        type: values.type || 'system',
        targetUrl: values.targetUrl,
      });
      message.success('系统通知已发送');
      setSystemModalOpen(false);
      systemForm.resetFields();
      loadNotifications();
    } catch (err: any) {
      message.error(err?.response?.data?.error || err?.message || '发送失败');
    }
    setSending(false);
  };

  const handleSendMarketing = async (values: any) => {
    setSending(true);
    try {
      await apiService.sendMarketingNotification({
        title: values.title,
        message: values.message,
        targetUserIds: values.targetUserIds?.split(',').map((s: string) => s.trim()).filter(Boolean),
        targetUrl: values.targetUrl,
        scheduledAt: values.scheduledAt?.toISOString(),
      });
      message.success('营销通知已发送');
      setMarketingModalOpen(false);
      marketingForm.resetFields();
    } catch (err: any) {
      message.error(err?.response?.data?.error || err?.message || '发送失败');
    }
    setSending(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await apiService.deleteNotification(id);
      message.success('通知已删除');
      loadNotifications();
    } catch {
      message.error('删除失败');
    }
  };

  const handleDeleteAll = async () => {
    try {
      await apiService.deleteAllNotifications();
      message.success('所有通知已清空');
      loadNotifications();
      loadStats();
    } catch {
      message.error('清空失败');
    }
  };

  const columns: ColumnsType<Notification & { key: string }> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      width: 200,
    },
    {
      title: '内容',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (text) => <Text ellipsis={{ tooltip: text }} className="max-w-xs block">{text}</Text>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => {
        const colors: Record<string, string> = { system: 'blue', marketing: 'purple', reminder: 'orange' };
        return <Tag color={colors[type] || 'default'}>{type || 'system'}</Tag>;
      },
    },
    {
      title: '已读',
      dataIndex: 'read',
      key: 'read',
      width: 80,
      render: (read: boolean) => read
        ? <Tag color="green">已读</Tag>
        : <Tag color="red">未读</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Popconfirm title="确定删除此通知？" onConfirm={() => handleDelete(record.id)}>
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <SEO title="通知管理 | GameHub 管理后台" description="管理 GameHub 系统通知和营销通知" keywords="通知管理, 系统通知, 消息推送, GameHub管理, 通知发送" noindex />

      <div className="flex justify-between items-center mb-6">
        <Title level={3} className="mb-0">
          <BellOutlined className="mr-2" />
          通知管理
        </Title>
        <Space>
          <Button type="primary" icon={<NotificationOutlined />} onClick={() => setSystemModalOpen(true)}>
            发送系统通知
          </Button>
          <Button icon={<TeamOutlined />} onClick={() => setMarketingModalOpen(true)}>
            发送营销通知
          </Button>
          <Popconfirm title="确定清空所有通知？此操作不可恢复。" onConfirm={handleDeleteAll}>
            <Button danger icon={<DeleteOutlined />}>
              清空全部
            </Button>
          </Popconfirm>
        </Space>
      </div>

      {/* Stats Cards */}
      {stats && (
        <Row gutter={16} className="mb-6">
          <Col span={6}>
            <Card>
              <Statistic title="总通知数" value={stats.total} prefix={<BellOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="未读通知" value={stats.unread} valueStyle={{ color: stats.unread > 0 ? '#cf1322' : undefined }} prefix={<BarChartOutlined />} />
            </Card>
          </Col>
          {Object.entries(stats.byType).slice(0, 4).map(([type, count]) => (
            <Col span={6} key={type}>
              <Card>
                <Statistic title={`${type} 类型`} value={count} />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Notifications Table */}
      <Card className="shadow-sm border-0 rounded-xl">
        <Table
          columns={columns}
          dataSource={notifications}
          loading={loading}
          pagination={{
            current: page,
            pageSize: 20,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
          }}
          locale={{ emptyText: '暂无通知' }}
        />
      </Card>

      {/* System Notification Modal */}
      <Modal
        title={<><NotificationOutlined className="mr-2" />发送系统通知</>}
        open={systemModalOpen}
        onCancel={() => { setSystemModalOpen(false); systemForm.resetFields(); }}
        onOk={() => systemForm.submit()}
        confirmLoading={sending}
        okText="发送"
      >
        <Form form={systemForm} layout="vertical" onFinish={handleSendSystem}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="通知标题" />
          </Form.Item>
          <Form.Item name="message" label="内容" rules={[{ required: true, message: '请输入内容' }]}>
            <TextArea rows={4} placeholder="通知内容" />
          </Form.Item>
          <Form.Item name="type" label="类型" initialValue="system">
            <Select
              options={[
                { value: 'system', label: '系统通知' },
                { value: 'reminder', label: '提醒通知' },
                { value: 'update', label: '更新通知' },
              ]}
            />
          </Form.Item>
          <Form.Item name="targetUrl" label="目标链接">
            <Input placeholder="点击通知后跳转的 URL（可选）" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Marketing Notification Modal */}
      <Modal
        title={<><SendOutlined className="mr-2" />发送营销通知</>}
        open={marketingModalOpen}
        onCancel={() => { setMarketingModalOpen(false); marketingForm.resetFields(); }}
        onOk={() => marketingForm.submit()}
        confirmLoading={sending}
        okText="发送"
        width={600}
      >
        <Form form={marketingForm} layout="vertical" onFinish={handleSendMarketing}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="通知标题" />
          </Form.Item>
          <Form.Item name="message" label="内容" rules={[{ required: true, message: '请输入内容' }]}>
            <TextArea rows={4} placeholder="通知内容" />
          </Form.Item>
          <Form.Item name="targetUserIds" label="目标用户 ID" help="多个 ID 用逗号分隔，留空则发送给所有用户">
            <Input placeholder="user1,user2,user3" />
          </Form.Item>
          <Form.Item name="targetUrl" label="目标链接">
            <Input placeholder="点击通知后跳转的 URL（可选）" />
          </Form.Item>
          <Form.Item name="scheduledAt" label="定时发送">
            <DatePicker showTime className="w-full" placeholder="选择定时发送时间（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminNotifications;
