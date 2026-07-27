import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, Modal, Form, Select, Tag, message, Popconfirm, Switch } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EditOutlined, DeleteOutlined, EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { apiService } from '../../../api';
import { useNewsArticle } from '../../../api/hooks';
import type { NewsArticle } from '../../../api/types';
import SEO from '../../../components/SEO';
import MDEditor from '@uiw/react-md-editor';

const { Search } = Input;
const { TextArea } = Input;

interface BlogItem extends NewsArticle {}

const Blogs: React.FC = () => {
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<BlogItem | null>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const data = await apiService.getBlogPosts({ limit: 200 });
      setBlogs(Array.isArray(data) ? data : []);
    } catch { message.error('获取博客列表失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBlogs(); }, []);

  const handleAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ category: '博客', content: '' });
    setModalVisible(true);
  };

  const handleEdit = (blog: BlogItem) => {
    setEditing(blog);
    form.setFieldsValue({
      title: blog.title,
      content: blog.content,
      category: blog.category || '博客',
      tags: (blog.tags || []).join(','),
      coverImageUrl: (blog as any).coverImageUrl || blog.imageUrl || '',
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try { await apiService.deleteBlogPost(id); message.success('删除成功'); fetchBlogs(); }
    catch { message.error('删除失败'); }
  };

  const handleSubmit = async (values: any) => {
    const data = {
      ...values,
      tags: values.tags ? String(values.tags).split(',').map((t: string) => t.trim()) : [],
    };
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
    } catch { message.error('保存失败'); }
  };

  const filteredBlogs = blogs.filter(b =>
    !searchText || b.title?.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns: ColumnsType<BlogItem> = [
    { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true,
      render: (t: string) => <span className="font-medium">{t}</span> },
    { title: '作者', dataIndex: 'author', key: 'author', width: 100 },
    { title: '标签', dataIndex: 'tags', key: 'tags', width: 200,
      render: (tags: string[]) => <Space size={4}>{tags?.slice(0, 3).map(t => <Tag key={t} color="geekblue">{t}</Tag>)}</Space> },
    { title: '日期', dataIndex: 'publishDate', key: 'publishDate', width: 120,
      render: (d: string) => d ? new Date(d).toLocaleDateString('zh-CN') : '-' },
    { title: '操作', key: 'actions', width: 180,
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<EyeOutlined />} size="small" className="text-blue-500"
            onClick={() => window.open(`/${record.category === '博客' ? 'blog' : 'news'}/${record.id}`, '_blank')} />
          <Button type="text" icon={<EditOutlined />} size="small" className="text-green-500" onClick={() => handleEdit(record)} />
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)} okText="是" cancelText="否">
            <Button type="text" icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <SEO title="博客管理 | GameHub" description="管理博客文章" noindex />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">博客管理</h1>
        <Space>
          <Search placeholder="搜索博客..." allowClear onSearch={setSearchText} onChange={e => setSearchText(e.target.value)} style={{ width: 250 }} />
          <Button icon={<ReloadOutlined />} onClick={fetchBlogs}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>发布博客</Button>
        </Space>
      </div>

      <Table columns={columns} dataSource={filteredBlogs} rowKey="id" loading={loading}
        pagination={{ pageSize: 10, showTotal: t => `共 ${t} 篇` }} />

      <Modal title={editing ? '编辑博客' : '发布博客'} open={modalVisible}
        onCancel={() => setModalVisible(false)} footer={null} width={900} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="博客标题" />
          </Form.Item>
          <Form.Item label="内容" name="content" rules={[{ required: true, message: '请输入内容' }]}>
            <MDEditor value={form.getFieldValue('content')} onChange={v => form.setFieldsValue({ content: v })} height={400} />
          </Form.Item>
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
          <Form.Item className="mb-0">
            <Space className="justify-end w-full">
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">{editing ? '更新' : '发布'}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Blogs;
