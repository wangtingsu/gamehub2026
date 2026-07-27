import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Upload, Typography, Tag, Modal, message, Statistic, Row, Col } from 'antd';
import { UploadOutlined, DeleteOutlined, FileImageOutlined, FileTextOutlined, InboxOutlined, ReloadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd/es/upload/interface';
import type { ColumnsType } from 'antd/es/table';
import apiService from '../../../api';
import type { UploadedFileInfo, UploadConfig } from '../../../api/types';
import SEO from '../../../components/SEO';

const { Title } = Typography;
const { Dragger } = Upload;

const UploadManager: React.FC = () => {
  const [files, setFiles] = useState<UploadedFileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<UploadConfig | null>(null);
  const [features, setFeatures] = useState<string[]>([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

  const loadConfig = useCallback(async () => {
    try {
      const result = await apiService.getUploadConfig();
      setConfig(result.config);
      setFeatures(result.features || []);
    } catch {
      // ignore
    }
  }, []);

  const loadFiles = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const result = await apiService.getUploadedFiles({ page, limit: pagination.limit });
      setFiles(result.files || []);
      setPagination(prev => ({ ...prev, page, total: result.pagination?.total || 0 }));
    } catch {
      message.error('获取文件列表失败');
    }
    setLoading(false);
  }, [pagination.limit]);

  useEffect(() => {
    loadConfig();
    loadFiles();
  }, [loadConfig, loadFiles]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const isImage = file.type.startsWith('image/');
      if (isImage) {
        await apiService.uploadImage(file);
      } else {
        await apiService.uploadFile(file);
      }
      message.success(`${file.name} 上传成功`);
      loadFiles(); // 重新加载文件列表
    } catch {
      message.error(`${file.name} 上传失败`);
    }
    setUploading(false);
    return false;
  };

  const handleDelete = (record: UploadedFileInfo) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除文件 ${record.originalName || record.filename} 吗？`,
      onOk: async () => {
        try {
          // 使用相对路径删除
          const filename = record.filename;
          await apiService.deleteFile(filename);
          message.success('文件已删除');
          loadFiles();
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    showUploadList: false,
    beforeUpload: (file) => {
      handleUpload(file);
      return false;
    },
    accept: config?.allowedTypes?.join(',') || 'image/*,.pdf,.doc,.docx',
  };

  const formatSize = (size: number) => {
    if (!size) return '-';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  };

  const columns: ColumnsType<UploadedFileInfo> = [
    {
      title: '文件名',
      dataIndex: 'originalName',
      key: 'originalName',
      render: (name: string, record) => (
        <span>
          {(record.mimeType || '').startsWith('image/')
            ? <FileImageOutlined className="mr-2 text-blue-500" />
            : <FileTextOutlined className="mr-2 text-orange-500" />
          }
          {name || record.filename}
        </span>
      ),
    },
    {
      title: '类型',
      dataIndex: 'mimeType',
      key: 'mimeType',
      width: 140,
      render: (type: string) => <Tag>{type || 'unknown'}</Tag>,
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      render: (size: number) => formatSize(size),
    },
    {
      title: '上传时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      width: 200,
      ellipsis: true,
      render: (url: string) => url ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs">{url}</a> : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDelete(record)}
        >
          删除
        </Button>
      ),
    },
  ];

  return (
    <div>
      <SEO title="文件管理 | GameHub" description="管理上传文件" keywords="文件管理, 文件上传, 图片管理, GameHub" noindex />
      <div className="flex items-center justify-between mb-6">
        <Title level={3}><UploadOutlined className="mr-2" />文件管理</Title>
        <div className="flex gap-2">
          <Button icon={<ReloadOutlined />} onClick={() => loadFiles()}>刷新</Button>
          <Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadModalOpen(true)}>
            上传文件
          </Button>
        </div>
      </div>

      {config && (
        <Row gutter={16} className="mb-6">
          <Col span={6}>
            <Card>
              <Statistic title="最大文件大小" value={config.maxSize / 1024 / 1024} suffix="MB" />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="图片最大宽度" value={config.image.maxWidth} suffix="px" />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="CDN加速" value={config.cdn.enabled ? '已开启' : '未开启'} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="病毒扫描" value={config.validation.virusScan ? '已开启' : '未开启'} />
            </Card>
          </Col>
        </Row>
      )}

      <Card>
        <Table
          columns={columns}
          dataSource={files}
          loading={loading}
          rowKey="id"
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            onChange: (p) => loadFiles(p),
            showTotal: (t) => `共 ${t} 个文件`,
          }}
          scroll={{ x: 900 }}
          locale={{ emptyText: '暂无上传文件' }}
        />
      </Card>

      <Modal
        title="上传文件"
        open={uploadModalOpen}
        onCancel={() => setUploadModalOpen(false)}
        footer={null}
        width={600}
      >
        <Dragger {...uploadProps}>
          <p className="text-4xl text-gray-300"><InboxOutlined /></p>
          <p className="text-lg mt-4">点击或拖拽文件到此区域上传</p>
          <p className="text-gray-400">
            支持 {config?.allowedTypes?.join(', ') || '常见图片和文档'} 格式
            {config && `，单个文件不超过 ${(config.maxSize / 1024 / 1024).toFixed(0)}MB`}
          </p>
        </Dragger>
        {uploading && <div className="text-center mt-4 text-blue-500">上传中...</div>}
      </Modal>
    </div>
  );
};

export default UploadManager;
