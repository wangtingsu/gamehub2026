import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, InputNumber, Popconfirm, message, Tabs, Card, Space, Tag, Image } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { adminApiClient } from '../../../api/client';
import SEO from '../../../components/SEO';

const BANNER_API = '/admin/banners';
const FEATURED_API = '/admin/featured';

const RecommendPage = () => {
  const [banners, setBanners] = useState<any[]>([]);
  const [featured, setFeatured] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [tab, setTab] = useState('banner');
  const [form] = Form.useForm();

  const fetchBanners = async () => {
    try { const r: any = await adminApiClient.get(BANNER_API); setBanners(r?.data || r || []); } catch {}
  };

  const fetchFeatured = async () => {
    try { const r: any = await adminApiClient.get(FEATURED_API); setFeatured(r?.data || r || []); } catch {}
  };

  useEffect(() => { fetchBanners(); fetchFeatured(); }, []);

  const handleSubmit = async (values: any) => {
    const api = tab === 'banner' ? BANNER_API : FEATURED_API;
    try {
      if (editing?.id) await adminApiClient.put(`${api}/${editing.id}`, values);
      else await adminApiClient.post(api, values);
      message.success(editing?.id ? '更新成功' : '创建成功');
      setModalOpen(false);
      tab === 'banner' ? fetchBanners() : fetchFeatured();
    } catch (e: any) { message.error(e?.response?.data?.error || '操作失败'); }
  };

  const handleDelete = async (id: string) => {
    const api = tab === 'banner' ? BANNER_API : FEATURED_API;
    try {
      await adminApiClient.delete(`${api}/${id}`);
      message.success('删除成功');
      tab === 'banner' ? fetchBanners() : fetchFeatured();
    } catch { message.error('删除失败'); }
  };

  const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (record: any) => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); };

  const typeLabels: Record<string, string> = { hot: '热门', latest: '最新', editor_pick: '编辑推荐', topic: '专题' };
  const typeColors: Record<string, string> = { hot: 'red', latest: 'blue', editor_pick: 'purple', topic: 'orange' };

  return (
    <div style={{ padding: 24 }}>
      <SEO title="推荐管理 | GameHub" description="管理Banner和推荐内容" noindex />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>推荐管理</h2>
        <Button icon={<ReloadOutlined />} onClick={() => { fetchBanners(); fetchFeatured(); }}>刷新</Button>
      </div>

      <Tabs activeKey={tab} onChange={setTab} items={[
        {
          key: 'banner', label: 'Banner 管理',
          children: (
            <Card extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>添加 Banner</Button>}>
              <Table dataSource={banners} rowKey="id" pagination={false}
                columns={[
                  { title: '图片', dataIndex: 'imageUrl', key: 'image', width: 120, render: (url: string) => <Image src={url} width={100} height={56} style={{ objectFit: 'cover', borderRadius: 4 }} /> },
                  { title: '标题', dataIndex: 'title', key: 'title' },
                  { title: '副标题', dataIndex: 'subtitle', key: 'subtitle', ellipsis: true },
                  { title: '位置', dataIndex: 'position', key: 'position', width: 80 },
                  { title: '排序', dataIndex: 'sortOrder', key: 'sort', width: 60 },
                  { title: '状态', dataIndex: 'isActive', key: 'active', width: 60, render: (v: number) => v ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag> },
                  { title: '操作', key: 'action', width: 120, render: (_: any, r: any) => (
                    <Space>
                      <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
                      <Popconfirm title="确定删除？" onConfirm={() => handleDelete(r.id)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </Space>
                  )},
                ]} />
            </Card>
          ),
        },
        {
          key: 'featured', label: '推荐内容',
          children: (
            <Card extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>添加推荐</Button>}>
              <Table dataSource={featured} rowKey="id" pagination={false}
                columns={[
                  { title: '类型', dataIndex: 'featureType', key: 'type', width: 100, render: (t: string) => <Tag color={typeColors[t] || 'default'}>{typeLabels[t] || t}</Tag> },
                  { title: '内容类型', dataIndex: 'contentType', key: 'ctype', width: 80 },
                  { title: '内容ID', dataIndex: 'contentId', key: 'cid', width: 80 },
                  { title: '专题名', dataIndex: 'topicName', key: 'topic', width: 100 },
                  { title: '排序', dataIndex: 'sortOrder', key: 'sort', width: 60 },
                  { title: '操作', key: 'action', width: 120, render: (_: any, r: any) => (
                    <Space>
                      <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
                      <Popconfirm title="确定删除？" onConfirm={() => handleDelete(r.id)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </Space>
                  )},
                ]} />
            </Card>
          ),
        },
      ]} />

      <Modal title={editing?.id ? '编辑' : '添加'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {tab === 'banner' ? (
            <>
              <Form.Item name="title" label="标题" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="subtitle" label="副标题"><Input /></Form.Item>
              <Form.Item name="imageUrl" label="图片URL" rules={[{ required: true }]}><Input placeholder="https://..." /></Form.Item>
              <Form.Item name="linkUrl" label="链接URL"><Input placeholder="/games/1" /></Form.Item>
              <Form.Item name="position" label="位置" initialValue="home">
                <Select options={[{ value: 'home', label: '首页' }, { value: 'games', label: '游戏库' }, { value: 'news', label: '新闻' }, { value: 'ai', label: 'AI助手' }]} />
              </Form.Item>
              <Form.Item name="sortOrder" label="排序" initialValue={0}><InputNumber min={0} /></Form.Item>
              <Form.Item name="isActive" label="启用" initialValue={1}>
                <Select options={[{ value: 1, label: '启用' }, { value: 0, label: '禁用' }]} />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item name="featureType" label="推荐类型" rules={[{ required: true }]}>
                <Select options={[{ value: 'hot', label: '热门' }, { value: 'latest', label: '最新' }, { value: 'editor_pick', label: '编辑推荐' }, { value: 'topic', label: '专题' }]} />
              </Form.Item>
              <Form.Item name="contentType" label="内容类型" rules={[{ required: true }]}>
                <Select options={[{ value: 'game', label: '游戏' }, { value: 'news', label: '新闻' }, { value: 'blog', label: '博客' }, { value: 'review', label: '评测' }, { value: 'guide', label: '攻略' }]} />
              </Form.Item>
              <Form.Item name="contentId" label="内容ID" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="topicName" label="专题名称"><Input /></Form.Item>
              <Form.Item name="sortOrder" label="排序" initialValue={0}><InputNumber min={0} /></Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default RecommendPage;
