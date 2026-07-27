import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Typography, Tag, message, Space, Switch, InputNumber, Tabs, Descriptions, Divider, Select } from 'antd';
import { MailOutlined, PlusOutlined, EditOutlined, DeleteOutlined, CopyOutlined, EyeOutlined, SendOutlined, DeleteRowOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import apiService from '../../../api';
import type { EmailTemplate, EmailQueueStatus, PaginationParams } from '../../../api/types';
import SEO from '../../../components/SEO';

const { Title, Text } = Typography;
const { TextArea } = Input;

const EmailManager: React.FC = () => {
  const [templates, setTemplates] = useState<(EmailTemplate & { key: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [queueStatus, setQueueStatus] = useState<EmailQueueStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const result = await apiService.getEmailTemplates({ page, limit: 20 });
      setTemplates(result.templates.map((t: EmailTemplate) => ({ ...t, key: t.id })));
      setTotal(result.pagination.total);
    } catch {
      message.error('加载邮件模板失败');
    }
    setLoading(false);
  };

  const loadQueueStatus = async () => {
    try {
      const status = await apiService.getEmailQueueStatus();
      setQueueStatus(status);
    } catch {
      // 忽略
    }
  };

  useEffect(() => {
    loadTemplates();
    loadQueueStatus();
  }, [page]);

  const handleCreate = () => {
    setEditingTemplate(null);
    form.resetFields();
    setEditModalOpen(true);
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    form.setFieldsValue({
      name: template.name,
      description: template.description,
      templateType: template.templateType,
      subject: template.subject,
      body: template.body,
      isActive: template.isActive,
    });
    setEditModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      if (editingTemplate) {
        await apiService.updateEmailTemplate(editingTemplate.id, values);
        message.success('模板已更新');
      } else {
        await apiService.createEmailTemplate(values);
        message.success('模板已创建');
      }

      setEditModalOpen(false);
      loadTemplates();
    } catch {
      // 表单验证错误会被自动处理
    }
    setSaving(false);
  };

  const handleDelete = (template: EmailTemplate) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除模板"${template.name}"吗？`,
      onOk: async () => {
        try {
          await apiService.deleteEmailTemplate(template.id);
          message.success('模板已删除');
          loadTemplates();
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  const handleDuplicate = async (template: EmailTemplate) => {
    try {
      await apiService.duplicateEmailTemplate(template.id, `${template.name} (副本)`);
      message.success('模板已复制');
      loadTemplates();
    } catch {
      message.error('复制失败');
    }
  };

  const handlePreview = async (template: EmailTemplate) => {
    try {
      const result = await apiService.renderEmailTemplate(template.id);
      setPreviewHtml(result.rendered);
      setPreviewOpen(true);
    } catch {
      message.error('预览生成失败');
    }
  };

  const handleClearQueue = () => {
    Modal.confirm({
      title: '确认清空',
      content: '确定要清空邮件队列吗？这将移除所有待发送的邮件。',
      onOk: async () => {
        try {
          await apiService.clearEmailQueue();
          message.success('队列已清空');
          loadQueueStatus();
        } catch {
          message.error('清空失败');
        }
      },
    });
  };

  const columns: ColumnsType<EmailTemplate & { key: string }> = [
    {
      title: '模板名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Space>
          <MailOutlined className="text-blue-500" />
          <span>{name}</span>
          {!record.isActive && <Tag color="default">已禁用</Tag>}
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'templateType',
      key: 'templateType',
      width: 120,
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: '主题',
      dataIndex: 'subject',
      key: 'subject',
      width: 250,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (active: boolean) => active ? <Tag color="green">启用</Tag> : <Tag color="default">禁用</Tag>,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 170,
      render: (date: string) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 260,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" icon={<CopyOutlined />} onClick={() => handleDuplicate(record)}>复制</Button>
          <Button type="link" icon={<EyeOutlined />} onClick={() => handlePreview(record)}>预览</Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <SEO title="邮件管理 | GameHub" description="管理邮件模板和发送系统邮件" keywords="邮件管理, 邮件模板, 邮件发送, 模板管理, 系统邮件" noindex />
      <div className="flex items-center justify-between mb-6">
        <Title level={3}><MailOutlined className="mr-2" />邮件管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建模板
        </Button>
      </div>

      {/* 队列状态 */}
      {queueStatus && (
        <Card size="small" className="mb-4">
          <Space split={<Divider type="vertical" />}>
            <Text>队列状态:</Text>
            <Text>待发送: <strong>{queueStatus.pending}</strong></Text>
            <Text>处理中: <strong>{queueStatus.processing}</strong></Text>
            <Text>已失败: <strong>{queueStatus.failed}</strong></Text>
            <Text>已发送: <strong>{queueStatus.sent}</strong></Text>
            <Button size="small" icon={<DeleteRowOutlined />} onClick={handleClearQueue}>清空队列</Button>
          </Space>
        </Card>
      )}

      <Card title="邮件模板列表">
        <Table
          columns={columns}
          dataSource={templates}
          loading={loading}
          rowKey="id"
          pagination={{
            current: page,
            pageSize: 20,
            total,
            onChange: (p) => setPage(p),
            showTotal: (t) => `共 ${t} 个模板`,
          }}
        />
      </Card>

      {/* 编辑/创建模板弹窗 */}
      <Modal
        title={editingTemplate ? '编辑模板' : '新建模板'}
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          size="middle"
        >
          <Form.Item
            name="name"
            label="模板名称"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="例如：欢迎邮件" />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input placeholder="模板用途说明" />
          </Form.Item>

          <Form.Item
            name="templateType"
            label="模板类型"
            rules={[{ required: true, message: '请选择模板类型' }]}
          >
            <Select
              placeholder="选择模板类型"
              options={[
                { label: '欢迎邮件', value: 'welcome' },
                { label: '密码重置', value: 'password_reset' },
                { label: '邮箱验证', value: 'email_verification' },
                { label: '通知', value: 'notification' },
                { label: '营销', value: 'marketing' },
                { label: '自定义', value: 'custom' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="subject"
            label="邮件主题"
            rules={[{ required: true, message: '请输入邮件主题' }]}
          >
            <Input placeholder="例如：欢迎加入 GameHub！" />
          </Form.Item>

          <Form.Item
            name="body"
            label="邮件正文 (HTML)"
            rules={[{ required: true, message: '请输入邮件正文' }]}
          >
            <TextArea rows={12} placeholder="<h1>欢迎, {{username}}!</h1><p>感谢您注册 GameHub。</p>" />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="启用状态"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* 预览弹窗 */}
      <Modal
        title="模板预览"
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={null}
        width={700}
      >
        <div
          className="border rounded p-4"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      </Modal>
    </div>
  );
};

export default EmailManager;
