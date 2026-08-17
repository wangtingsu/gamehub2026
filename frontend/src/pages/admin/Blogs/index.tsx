import React, { useState, useEffect, useRef } from 'react';
import { Table, Button, Space, Input, Modal, Form, Select, Tag, message, Popconfirm, Image, Spin, Upload } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { EditOutlined, DeleteOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { apiService } from '../../../api';
import type { BlogArticle } from '../../../api/types';
import SEO from '../../../components/SEO';
import BlogEditor from '../../../components/blog/BlogEditor';

const { Search } = Input;

/**
 * 封面图片上传组件
 * 支持：上传、URL 输入、预览、删除
 */
const CoverImageField: React.FC<{ value?: string; onChange?: (url: string) => void }> = ({ value, onChange }) => {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/v1/upload/image', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const d = await res.json();
      if (d.success && d.data?.file?.url) {
        onChange?.(d.data.file.url);
        message.success('封面上传成功');
      } else {
        message.error(d.error || d.message || '上传失败');
      }
    } catch (e: any) {
      message.error('上传失败: ' + (e.message || '网络错误'));
    } finally {
      setUploading(false);
    }
  };

  if (value) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <Image
            src={value}
            width={320}
            height={180}
            style={{ objectFit: 'cover', borderRadius: 8 }}
            preview={{ mask: '点击查看大图' }}
          />
          <button
            type="button"
            onClick={() => onChange?.('')}
            style={{
              position: 'absolute',
              top: -8,
              right: -8,
              width: 24,
              height: 24,
              background: '#ef4444',
              color: '#fff',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              border: 'none',
              cursor: 'pointer',
            }}
            title="删除封面图"
          >
            ✕
          </button>
        </div>
        <Space>
          <Input
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder="图片 URL"
            style={{ width: 280 }}
            size="small"
          />
          <Upload
            accept="image/*"
            showUploadList={false}
            beforeUpload={(f) => {
              handleUpload(f);
              return false;
            }}
          >
            <Button size="small" icon={<UploadOutlined />} loading={uploading}>
              替换
            </Button>
          </Upload>
          <Button size="small" danger onClick={() => onChange?.('')}>
            删除
          </Button>
        </Space>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <Upload
        accept="image/*"
        showUploadList={false}
        beforeUpload={(f) => {
          handleUpload(f);
          return false;
        }}
      >
        <div
          style={{
            width: 200,
            height: 120,
            border: '2px dashed #d1d5db',
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {uploading ? (
            <Spin />
          ) : (
            <PlusOutlined style={{ fontSize: 24, color: '#9ca3af' }} />
          )}
          <span style={{ fontSize: 13, color: '#9ca3af', marginTop: 8 }}>
            {uploading ? '上传中...' : '点击上传封面图'}
          </span>
        </div>
      </Upload>
      <div style={{ flex: 1 }}>
        <Input
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="或直接粘贴在线图片 URL"
          allowClear
        />
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
          支持 JPG、PNG、WebP，推荐尺寸 1200×630
        </p>
      </div>
    </div>
  );
};

const Blogs: React.FC = () => {
  const [blogs, setBlogs] = useState<BlogArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<BlogArticle | null>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const data = await apiService.getBlogPosts({ limit: 200 });
      setBlogs(Array.isArray(data) ? data : []);
    } catch {
      message.error('获取博客列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const handleAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      category: '博客',
      content: '',
      coverImageUrl: '',
    });
    setModalVisible(true);
  };

  const handleEdit = (blog: BlogArticle) => {
    setEditing(blog);
    form.setFieldsValue({
      title: blog.title,
      content: blog.content,
      category: blog.category || '博客',
      tags: (blog.tags || []).join(','),
      coverImageUrl: (blog as any).coverImageUrl || (blog as any).coverImage || '',
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await apiService.deleteBlogPost(id);
      message.success('删除成功');
      fetchBlogs();
    } catch {
      message.error('删除失败');
    }
  };

  const handleSubmit = async (values: any) => {
    const data = {
      ...values,
      tags: values.tags
        ? String(values.tags)
            .split(',')
            .map((t: string) => t.trim())
            .filter(Boolean)
        : [],
    };
    setSubmitting(true);
    try {
      if (editing?.id) {
        await apiService.updateBlogPost(String(editing.id), data);
        message.success('更新成功');
      } else {
        await apiService.createBlogPost(data);
        message.success('发布成功');
      }
      setModalVisible(false);
      fetchBlogs();
    } catch {
      message.error('保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBlogs = blogs.filter(
    (b) =>
      !searchText || b.title?.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns: ColumnsType<BlogArticle> = [
    {
      title: '封面',
      dataIndex: 'coverImageUrl',
      key: 'coverImageUrl',
      width: 80,
      render: (url: string) =>
        url ? (
          <Image
            src={url}
            width={60}
            height={40}
            style={{ objectFit: 'cover', borderRadius: 4 }}
            preview={{ mask: null }}
          />
        ) : (
          <div
            style={{
              width: 60,
              height: 40,
              background: '#f3f4f6',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d1d5db',
              fontSize: 12,
            }}
          >
            无
          </div>
        ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (t: string) => <span style={{ fontWeight: 500 }}>{t}</span>,
    },
    {
      title: '作者',
      dataIndex: 'author',
      key: 'author',
      width: 100,
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 200,
      render: (tags: string[]) => (
        <Space size={4} wrap>
          {tags?.slice(0, 3).map((t) => (
            <Tag key={t} color="geekblue">
              {t}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '日期',
      dataIndex: 'publishedAt',
      key: 'publishedAt',
      width: 120,
      render: (d: string) =>
        d ? new Date(d).toLocaleDateString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            size="small"
            style={{ color: '#3b82f6' }}
            onClick={() =>
              window.open(
                `/${(record.postType || 'blog') === 'blog' ? 'blog' : 'news'}/${record.id}`,
                '_blank'
              )
            }
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            style={{ color: '#22c55e' }}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="确定删除？"
            onConfirm={() => handleDelete(record.id)}
            okText="是"
            cancelText="否"
          >
            <Button
              type="text"
              icon={<DeleteOutlined />}
              size="small"
              danger
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <SEO title="博客管理 | GameHub" description="管理博客文章" noindex />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>博客管理</h1>
        <Space>
          <Search
            placeholder="搜索博客..."
            allowClear
            onSearch={setSearchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchBlogs}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            发布博客
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={filteredBlogs}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 篇` }}
      />

      <Modal
        title={editing ? '编辑博客' : '发布博客'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={960}
        destroyOnClose
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {/* 封面图片 */}
          <Form.Item label="封面图片" name="coverImageUrl">
            <CoverImageField />
          </Form.Item>

          {/* 标题 */}
          <Form.Item
            label="标题"
            name="title"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="博客标题" size="large" />
          </Form.Item>

          {/* 内容 - 使用增强版 BlogEditor */}
          <Form.Item
            label="内容"
            name="content"
            rules={[{ required: true, message: '请输入内容' }]}
          >
            <BlogEditor
              height={420}
              placeholder="使用 Markdown 编写博客内容..."
            />
          </Form.Item>

          {/* 分类 & 标签 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item label="分类" name="category" initialValue="博客">
              <Select>
                <Select.Option value="博客">博客</Select.Option>
                <Select.Option value="博客/技术">技术</Select.Option>
                <Select.Option value="博客/游戏">游戏</Select.Option>
                <Select.Option value="博客/杂谈">杂谈</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item label="标签（逗号分隔）" name="tags">
              <Input placeholder="React, TypeScript, 游戏开发" />
            </Form.Item>
          </div>

          {/* 操作按钮 */}
          <Form.Item style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editing ? '更新' : '发布'}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Blogs;
