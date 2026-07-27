import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Card, Button, Tag, Space, Modal, Input, message, Popconfirm, Typography, Tooltip, Alert, Spin, Statistic, Row, Col, Descriptions
} from 'antd';
import {
  CloudDownloadOutlined, RestOutlined, DeleteOutlined, PlusOutlined, ReloadOutlined, DownloadOutlined, ExclamationCircleOutlined, CheckCircleOutlined, DatabaseOutlined, FileProtectOutlined
} from '@ant-design/icons';
import apiService from '../../../api';
import SEO from '../../../components/SEO';

const { TextArea } = Input;
const { Title, Text } = Typography;

const Backups: React.FC = () => {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<any>(null);
  const [descModalOpen, setDescModalOpen] = useState(false);
  const [backupDescription, setBackupDescription] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.getBackups({ page, limit: 15 });
      setBackups(res.backups || []);
      setTotal(res.pagination?.total || 0);
    } catch (err: any) {
      message.error(err?.message || '获取备份列表失败');
    }
    setLoading(false);
  }, [page]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      const res = await apiService.createBackup(backupDescription || undefined);
      message.success(`备份创建成功！文件: ${res.filename}`);
      setDescModalOpen(false);
      setBackupDescription('');
      loadData();
    } catch (err: any) {
      message.error(err?.message || '创建备份失败');
    }
    setCreating(false);
  };

  const handleRestore = async () => {
    if (!selectedBackup) return;
    setRestoring(true);
    try {
      const res = await apiService.restoreBackup(selectedBackup.id);
      message.success(res?.message || '数据库已从备份恢复');
      setRestoreModalOpen(false);
      setSelectedBackup(null);
    } catch (err: any) {
      message.error(err?.message || '恢复失败');
    }
    setRestoring(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await apiService.deleteBackup(id);
      message.success('备份已删除');
      loadData();
    } catch (err: any) {
      message.error(err?.message || '删除备份失败');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '未知';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  const columns = [
    {
      title: '文件名',
      dataIndex: 'filename',
      key: 'filename',
      render: (name: string) => (
        <Space>
          <DatabaseOutlined className="text-primary-500" />
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: '文件大小',
      dataIndex: 'file_size',
      key: 'file_size',
      width: 120,
      render: (size: number) => formatFileSize(size),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => (
        <Tag color={type === 'manual' ? 'blue' : type === 'scheduled' ? 'green' : 'default'}>
          {type === 'manual' ? '手动' : type === 'scheduled' ? '定时' : type === 'pre_restore' ? '快照' : type}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const config: Record<string, { color: string; label: string }> = {
          completed: { color: 'success', label: '完成' },
          creating: { color: 'processing', label: '创建中' },
          failed: { color: 'error', label: '失败' },
          restoring: { color: 'warning', label: '恢复中' },
          file_missing: { color: 'default', label: '文件缺失' },
        };
        const c = config[status] || { color: 'default', label: status };
        return <Tag color={c.color}>{c.label}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (date: string) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: '操作人',
      dataIndex: 'operator_name',
      key: 'operator_name',
      width: 100,
      render: (name: string) => name || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: any) => (
        <Space>
          {record.status === 'completed' && (
            <Tooltip title="从该备份恢复">
              <Button
                type="link"
                size="small"
                icon={<RestOutlined />}
                onClick={() => { setSelectedBackup(record); setRestoreModalOpen(true); }}
              />
            </Tooltip>
          )}
          <Tooltip title="下载备份文件">
            <Button
              type="link"
              size="small"
              icon={<DownloadOutlined />}
              disabled={record.status !== 'completed'}
              href={`${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/admin/backups/${record.id}/download`}
              target="_blank"
            />
          </Tooltip>
          <Popconfirm
            title="确认删除此备份？"
            description="备份文件将被永久删除"
            onConfirm={() => handleDelete(record.id)}
          >
            <Tooltip title="删除备份">
              <Button type="link" size="small" icon={<DeleteOutlined />} danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <SEO title="备份恢复 | GameHub" description="管理后台数据库备份与恢复" keywords="备份恢复,数据库备份,数据恢复,系统备份,备份管理,GameHub" noindex />
      <div className="flex items-center justify-between mb-6">
        <div>
          <Title level={4} style={{ margin: 0 }}>备份恢复</Title>
          <Text type="secondary">数据库备份创建、下载和恢复操作</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setDescModalOpen(true)}>
            创建备份
          </Button>
        </Space>
      </div>

      <Alert
        message="操作提醒"
        description="恢复操作将替换当前数据库为所选备份版本，建议恢复前先创建当前数据库的备份。恢复期间服务可能短暂不可用。"
        type="warning"
        showIcon
        className="mb-4"
      />

      <Row gutter={[16, 16]} className="mb-4">
        <Col span={6}>
          <Card size="small">
            <Statistic title="备份总数" value={total} prefix={<FileProtectOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={backups}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: 15,
            total,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            showTotal: (t) => `共 ${t} 个备份`,
          }}
          scroll={{ x: 900 }}
          locale={{ emptyText: '暂无备份数据' }}
        />
      </Card>

      {/* 创建备份弹窗 */}
      <Modal
        title="创建数据库备份"
        open={descModalOpen}
        onCancel={() => { setDescModalOpen(false); setBackupDescription(''); }}
        onOk={handleCreateBackup}
        confirmLoading={creating}
      >
        <div className="mb-4">
          <Text>创建当前数据库的完整备份（SQL格式）。</Text>
        </div>
        <Input.TextArea
          placeholder="备份描述（可选）"
          rows={3}
          value={backupDescription}
          onChange={(e) => setBackupDescription(e.target.value)}
        />
      </Modal>

      {/* 恢复确认弹窗 */}
      <Modal
        title={<><ExclamationCircleOutlined className="text-warning mr-2" />确认恢复数据库</>}
        open={restoreModalOpen}
        onCancel={() => { setRestoreModalOpen(false); setSelectedBackup(null); }}
        onOk={handleRestore}
        confirmLoading={restoring}
        okText="确认恢复"
        okButtonProps={{ danger: true }}
      >
        <div className="py-4">
          <Alert
            message="此操作不可逆！"
            description={
              <ul className="m-0 pl-4">
                <li>当前数据库将被替换为所选备份版本</li>
                <li>恢复前系统会自动创建当前数据的快照备份</li>
                <li>恢复期间服务可能短暂不可用</li>
              </ul>
            }
            type="error"
            showIcon
            className="mb-4"
          />
          {selectedBackup && (
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="备份文件">{selectedBackup.filename}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{new Date(selectedBackup.created_at).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="文件大小">{formatFileSize(selectedBackup.file_size)}</Descriptions.Item>
            </Descriptions>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Backups;
