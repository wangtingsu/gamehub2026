import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Card, Button, Tag, Space, Modal, Form, Input, message, Popconfirm, Typography, Tooltip, Descriptions, Alert, Spin
} from 'antd';
import {
  RocketOutlined, RollbackOutlined, DeleteOutlined, PlusOutlined, ReloadOutlined, EyeOutlined, CheckCircleOutlined, CloseCircleOutlined, SyncOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';
import apiService from '../../../api';
import SEO from '../../../components/SEO';

const { TextArea } = Input;
const { Title, Text } = Typography;

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  pending: { color: 'default', icon: <SyncOutlined />, label: '待部署' },
  deploying: { color: 'processing', icon: <SyncOutlined spin />, label: '部署中' },
  success: { color: 'success', icon: <CheckCircleOutlined />, label: '成功' },
  failed: { color: 'error', icon: <CloseCircleOutlined />, label: '失败' },
  rolled_back: { color: 'warning', icon: <RollbackOutlined />, label: '已回滚' },
};

const Deployments: React.FC = () => {
  const [deployments, setDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDeploy, setSelectedDeploy] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.getDeployments({ page, limit: 15 });
      setDeployments(res.deployments || []);
      setTotal(res.pagination?.total || 0);
    } catch (err: any) {
      message.error(err?.message || '获取部署记录失败');
    }
    setLoading(false);
  }, [page]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async (values: any) => {
    setSubmitting(true);
    try {
      await apiService.createDeployment(values);
      message.success('部署任务已创建');
      setCreateModalOpen(false);
      form.resetFields();
      loadData();
    } catch (err: any) {
      message.error(err?.message || '创建部署失败');
    }
    setSubmitting(false);
  };

  const handleRollback = async (id: string) => {
    try {
      const res = await apiService.rollbackDeployment(id);
      message.success(res?.message || '回滚任务已创建');
      loadData();
    } catch (err: any) {
      message.error(err?.message || '回滚失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiService.deleteDeployment(id);
      message.success('部署记录已删除');
      loadData();
    } catch (err: any) {
      message.error(err?.message || '删除失败');
    }
  };

  const showDetail = async (id: string) => {
    try {
      const res = await apiService.getDeployment(id);
      setSelectedDeploy(res);
      setDetailModalOpen(true);
    } catch (err: any) {
      message.error(err?.message || '获取部署详情失败');
    }
  };

  const columns = [
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 140,
      render: (ver: string, record: any) => (
        <Space>
          <RocketOutlined className="text-primary-500" />
          <Text strong>{ver}</Text>
          {record.rollback_version && <Tag color="orange">回滚目标: {record.rollback_version}</Tag>}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const cfg = statusConfig[status] || { color: 'default', icon: null, label: status };
        return <Tag color={cfg.color} icon={cfg.icon}>{cfg.label}</Tag>;
      },
    },
    {
      title: '分支',
      dataIndex: 'branch',
      key: 'branch',
      width: 100,
      render: (branch: string) => branch || '-',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc: string) => desc || '-',
    },
    {
      title: '部署人',
      dataIndex: 'deployer_name',
      key: 'deployer_name',
      width: 100,
    },
    {
      title: '部署时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (date: string) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: '完成时间',
      dataIndex: 'completed_at',
      key: 'completed_at',
      width: 170,
      render: (date: string) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title="查看详情">
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => showDetail(record.id)} />
          </Tooltip>
          {record.status !== 'rolled_back' && (
            <Popconfirm
              title="确认回滚到此版本？"
              description="将创建一条新的回滚部署记录"
              onConfirm={() => handleRollback(record.id)}
            >
              <Tooltip title="回滚">
                <Button type="link" size="small" icon={<RollbackOutlined />} danger />
              </Tooltip>
            </Popconfirm>
          )}
          <Popconfirm title="确认删除此部署记录？" onConfirm={() => handleDelete(record.id)}>
            <Tooltip title="删除">
              <Button type="link" size="small" icon={<DeleteOutlined />} danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <SEO title="部署管理 | GameHub" description="管理后台部署管理" keywords="部署管理,版本发布,上线管理,部署记录,系统部署,GameHub" noindex />
      <div className="flex items-center justify-between mb-6">
        <div>
          <Title level={4} style={{ margin: 0 }}>部署管理</Title>
          <Text type="secondary">管理应用程序版本发布与回滚</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            新建部署
          </Button>
        </Space>
      </div>

      <Alert
        message="部署管理说明"
        description="部署功能记录版本发布历史和回滚操作。创建部署后需在服务器手动执行对应版本的部署脚本，系统仅记录管理操作。"
        type="info"
        showIcon
        className="mb-4"
      />

      <Card>
        <Table
          columns={columns}
          dataSource={deployments}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: 15,
            total,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            showTotal: (t) => `共 ${t} 条记录`,
          }}
          scroll={{ x: 1000 }}
          locale={{ emptyText: '暂无部署记录' }}
        />
      </Card>

      {/* 新建部署弹窗 */}
      <Modal
        title="新建部署"
        open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="version" label="版本号" rules={[{ required: true, message: '请输入版本号' }]}>
            <Input placeholder="例如: v1.2.3" />
          </Form.Item>
          <Form.Item name="branch" label="分支" initialValue="main">
            <Input placeholder="main" />
          </Form.Item>
          <Form.Item name="commit_hash" label="提交 Hash">
            <Input placeholder="Git commit hash" />
          </Form.Item>
          <Form.Item name="description" label="发布说明">
            <TextArea rows={3} placeholder="描述本次发布的内容和变更" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 部署详情弹窗 */}
      <Modal
        title={`部署详情 - ${selectedDeploy?.version || ''}`}
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={<Button onClick={() => setDetailModalOpen(false)}>关闭</Button>}
        width={640}
      >
        {selectedDeploy ? (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="版本">{selectedDeploy.version}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusConfig[selectedDeploy.status]?.color}>
                {statusConfig[selectedDeploy.status]?.label || selectedDeploy.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="分支">{selectedDeploy.branch || '-'}</Descriptions.Item>
            <Descriptions.Item label="提交 Hash">{selectedDeploy.commit_hash || '-'}</Descriptions.Item>
            <Descriptions.Item label="部署人">{selectedDeploy.deployer_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{selectedDeploy.created_at ? new Date(selectedDeploy.created_at).toLocaleString() : '-'}</Descriptions.Item>
            <Descriptions.Item label="完成时间">{selectedDeploy.completed_at ? new Date(selectedDeploy.completed_at).toLocaleString() : '-'}</Descriptions.Item>
            {selectedDeploy.rollback_version && (
              <Descriptions.Item label="回滚目标">{selectedDeploy.rollback_version}</Descriptions.Item>
            )}
            <Descriptions.Item label="描述" span={2}>{selectedDeploy.description || '-'}</Descriptions.Item>
            {selectedDeploy.log && (
              <Descriptions.Item label="日志" span={2}>
                <pre style={{ maxHeight: 200, overflow: 'auto', background: '#f5f5f5', padding: 8, borderRadius: 4, fontSize: 12, whiteSpace: 'pre-wrap' }}>
                  {selectedDeploy.log}
                </pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        ) : (
          <Spin />
        )}
      </Modal>
    </div>
  );
};

export default Deployments;
