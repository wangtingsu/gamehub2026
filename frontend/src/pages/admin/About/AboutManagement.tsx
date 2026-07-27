import { useState } from 'react';
import { Card, Form, Input, Button, message, Spin, Tabs, Row, Col, Avatar, Upload } from 'antd';
import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { useAboutData, useUpdateAboutSection, useUpdateAboutValue, useUpdateAboutTeamMember, useUpdateAboutTimeline, useUpdateAboutContact } from '../../../api/hooks';
import SEO from '../../../components/SEO';
import { getApiBaseUrl } from '../../../utils/env';

const AboutManagement = () => {
  const { data: aboutData, isLoading } = useAboutData();
  const updateSection = useUpdateAboutSection();
  const updateValue = useUpdateAboutValue();
  const updateTeam = useUpdateAboutTeamMember();
  const updateTimeline = useUpdateAboutTimeline();
  const updateContact = useUpdateAboutContact();

  const [saving, setSaving] = useState<string | null>(null);

  const apiBase = getApiBaseUrl();
  const uploadUrl = `${apiBase}/upload/image`;

  const handleImageUpload = async (file: File, onUrl: (url: string) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json();
      if (json.success && json.data?.file?.url) {
        onUrl(json.data.file.url);
        message.success('图片上传成功');
      } else {
        message.error('图片上传失败');
      }
    } catch {
      message.error('图片上传失败');
    }
    return false;
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Spin size="large" /></div>;
  }

  if (!aboutData) {
    return <div className="text-center py-12 text-gray-500">无法加载关于页面数据</div>;
  }

  return (
    <div>
      <SEO title="关于我们管理 | GameHub" description="管理关于我们页面内容" keywords="关于我们, 团队管理, 内容管理, 网站编辑, About管理" noindex />
      <div className="mb-6">
        <h1 className="text-2xl font-bold">关于我们管理</h1>
        <p className="text-gray-500 mt-1">编辑关于我们页面的所有内容，包括文字和图片</p>
      </div>

      <Tabs defaultActiveKey="sections" tabPosition="left" className="min-h-[600px]">
        {/* 基础板块 */}
        <Tabs.TabPane tab="基础板块" key="sections">
          <Card title="英雄区域" className="mb-4">
            <Form
              layout="vertical"
              initialValues={{ title: aboutData.hero?.title || '', description: aboutData.hero?.description || '' }}
              onFinish={(values) => {
                setSaving('hero');
                updateSection.mutateAsync({ key: 'hero', data: values }).then(() => {
                  message.success('英雄区域已更新');
                }).finally(() => setSaving(null));
              }}
            >
              <Form.Item name="title" label="标题" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="description" label="描述">
                <Input.TextArea rows={3} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={saving === 'hero'}>保存</Button>
              </Form.Item>
            </Form>
          </Card>

          <Row gutter={16}>
            <Col span={12}>
              <Card title="使命" className="mb-4">
                <Form
                  layout="vertical"
                  initialValues={{ title: aboutData.mission?.title || '', description: aboutData.mission?.description || '' }}
                  onFinish={(values) => {
                    setSaving('mission');
                    updateSection.mutateAsync({ key: 'mission', data: values }).then(() => {
                      message.success('使命已更新');
                    }).finally(() => setSaving(null));
                  }}
                >
                  <Form.Item name="title" label="标题" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="description" label="描述">
                    <Input.TextArea rows={4} />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={saving === 'mission'}>保存</Button>
                  </Form.Item>
                </Form>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="愿景" className="mb-4">
                <Form
                  layout="vertical"
                  initialValues={{ title: aboutData.vision?.title || '', description: aboutData.vision?.description || '' }}
                  onFinish={(values) => {
                    setSaving('vision');
                    updateSection.mutateAsync({ key: 'vision', data: values }).then(() => {
                      message.success('愿景已更新');
                    }).finally(() => setSaving(null));
                  }}
                >
                  <Form.Item name="title" label="标题" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="description" label="描述">
                    <Input.TextArea rows={4} />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={saving === 'vision'}>保存</Button>
                  </Form.Item>
                </Form>
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>

        {/* 核心价值 */}
        <Tabs.TabPane tab="核心价值" key="values">
          {aboutData.values.map((v) => (
            <Card key={v.id} title={`${v.title} (ID: ${v.id})`} className="mb-4">
              <Form
                layout="vertical"
                initialValues={{ icon: v.icon, title: v.title, description: v.description || '' }}
                onFinish={(values) => {
                  setSaving(`value-${v.id}`);
                  updateValue.mutateAsync({ id: v.id, data: values }).then(() => {
                    message.success('核心价值已更新');
                  }).finally(() => setSaving(null));
                }}
              >
                <Form.Item name="icon" label="图标名称 (Ant Design Icon 组件名)">
                  <Input placeholder="例如: TeamOutlined, RocketOutlined" />
                </Form.Item>
                <Form.Item name="title" label="标题" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="description" label="描述">
                  <Input.TextArea rows={3} />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={saving === `value-${v.id}`}>保存</Button>
                </Form.Item>
              </Form>
            </Card>
          ))}
        </Tabs.TabPane>

        {/* 团队成员 */}
        <Tabs.TabPane tab="团队成员" key="team">
          {aboutData.teamMembers.map((m) => (
            <Card key={m.id} title={m.name} className="mb-4">
              <Form
                layout="vertical"
                initialValues={{ name: m.name, role: m.role, description: m.description || '' }}
                onFinish={(values) => {
                  setSaving(`team-${m.id}`);
                  updateTeam.mutateAsync({ id: m.id, data: values }).then(() => {
                    message.success('团队成员已更新');
                  }).finally(() => setSaving(null));
                }}
              >
                <div className="flex items-center gap-6 mb-4">
                  <Avatar size={80} src={m.avatarUrl} />
                  <Upload
                    showUploadList={false}
                    beforeUpload={(file) => handleImageUpload(file, (url) => {
                      updateTeam.mutateAsync({ id: m.id, data: { avatarUrl: url } }).then(() => {
                        message.success('头像已更新');
                      });
                    })}
                  >
                    <Button icon={<UploadOutlined />}>替换头像</Button>
                  </Upload>
                </div>
                <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="role" label="职位" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="description" label="简介">
                  <Input.TextArea rows={2} />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={saving === `team-${m.id}`}>保存</Button>
                </Form.Item>
              </Form>
            </Card>
          ))}
        </Tabs.TabPane>

        {/* 发展历程 */}
        <Tabs.TabPane tab="发展历程" key="timeline">
          {aboutData.timeline.map((t) => (
            <Card key={t.id} title={`${t.year} - ${t.title || ''}`} className="mb-4">
              <Form
                layout="vertical"
                initialValues={{ year: t.year, title: t.title || '', description: t.description || '' }}
                onFinish={(values) => {
                  setSaving(`timeline-${t.id}`);
                  updateTimeline.mutateAsync({ id: t.id, data: values }).then(() => {
                    message.success('发展历程已更新');
                  }).finally(() => setSaving(null));
                }}
              >
                <Form.Item name="year" label="时间" rules={[{ required: true }]}>
                  <Input placeholder="例如: 2024, 2025 Q1" />
                </Form.Item>
                <Form.Item name="title" label="标题">
                  <Input />
                </Form.Item>
                <Form.Item name="description" label="描述">
                  <Input.TextArea rows={2} />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={saving === `timeline-${t.id}`}>保存</Button>
                </Form.Item>
              </Form>
            </Card>
          ))}
        </Tabs.TabPane>

        {/* 联系方式 */}
        <Tabs.TabPane tab="联系方式" key="contacts">
          {aboutData.contacts.map((c) => (
            <Card key={c.id} title={c.label} className="mb-4">
              <Form
                layout="vertical"
                initialValues={{ label: c.label, value: c.value }}
                onFinish={(values) => {
                  setSaving(`contact-${c.id}`);
                  updateContact.mutateAsync({ id: c.id, data: values }).then(() => {
                    message.success('联系方式已更新');
                  }).finally(() => setSaving(null));
                }}
              >
                <Form.Item name="label" label="标签" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="value" label="值" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={saving === `contact-${c.id}`}>保存</Button>
                </Form.Item>
              </Form>
            </Card>
          ))}
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
};

export default AboutManagement;
