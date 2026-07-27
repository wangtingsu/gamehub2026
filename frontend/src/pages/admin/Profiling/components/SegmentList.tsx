import React, { useState } from 'react';
import { Card, Table, Button, Tag, Modal, Input, Switch, message, Space, Spin } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, ReloadOutlined, TeamOutlined } from '@ant-design/icons';
import { useSegments, useCreateSegment, useUpdateSegment, useDeleteSegment, useEvaluateDynamicSegment } from '../../../../api/hooks';
import SegmentMembers from './SegmentMembers';

const SegmentList: React.FC = () => {
  const { data: segments, isLoading } = useSegments();
  const createSegment = useCreateSegment();
  const updateSegment = useUpdateSegment();
  const deleteSegment = useDeleteSegment();
  const evaluateSegment = useEvaluateDynamicSegment();

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', description: '', isDynamic: false, minLevel: '' as any, maxLevel: '' as any, daysSinceLogin: '' as any, daysSinceRegister: '' as any, isActive: '' as any });

  const [membersOpen, setMembersOpen] = useState(false);
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(null);

  const resetForm = () => {
    setForm({ name: '', description: '', isDynamic: false, minLevel: '', maxLevel: '', daysSinceLogin: '', daysSinceRegister: '', isActive: '' });
    setEditId(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { message.error('请输入分组名称'); return; }
    const criteria: any = {};
    if (form.minLevel !== '') criteria.minLevel = Number(form.minLevel);
    if (form.maxLevel !== '') criteria.maxLevel = Number(form.maxLevel);
    if (form.daysSinceLogin !== '') criteria.daysSinceLogin = Number(form.daysSinceLogin);
    if (form.daysSinceRegister !== '') criteria.daysSinceRegister = Number(form.daysSinceRegister);
    if (form.isActive !== '') criteria.isActive = form.isActive;

    try {
      if (editId) {
        await updateSegment.mutateAsync({ id: editId, data: { ...form, criteria: form.isDynamic ? criteria : undefined } });
        message.success('分组已更新');
      } else {
        await createSegment.mutateAsync({ ...form, criteria: form.isDynamic ? criteria : undefined });
        message.success('分组已创建');
      }
      setModalOpen(false);
      resetForm();
    } catch { message.error('保存失败'); }
  };

  const handleEvaluate = async (id: number) => {
    try {
      const result = await evaluateSegment.mutateAsync(id);
      message.success(`动态分组已更新，影响 ${result.affected} 个用户`);
    } catch { message.error('评估失败'); }
  };

  const viewMembers = (id: number) => {
    setSelectedSegmentId(id);
    setMembersOpen(true);
  };

  const columns = [
    { title: '分组名称', dataIndex: 'name', key: 'name', render: (text: string) => <span className="font-medium">{text}</span> },
    { title: '描述', dataIndex: 'description', key: 'description' },
    { title: '类型', dataIndex: 'isDynamic', key: 'isDynamic', render: (v: number) => v === 1 ? <Tag color="blue">动态</Tag> : <Tag>静态</Tag> },
    { title: '成员数', dataIndex: 'memberCount', key: 'memberCount' },
    {
      title: '操作', key: 'action', width: 300,
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<TeamOutlined />} onClick={() => viewMembers(record.id)}>成员</Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => {
            setEditId(record.id);
            setForm({ name: record.name, description: record.description || '', isDynamic: !!record.isDynamic, minLevel: '', maxLevel: '', daysSinceLogin: '', daysSinceRegister: '', isActive: '' });
            setModalOpen(true);
          }}>编辑</Button>
          {record.isDynamic === 1 && <Button type="link" icon={<ReloadOutlined />} onClick={() => handleEvaluate(record.id)}>重新计算</Button>}
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => {
            Modal.confirm({ title: '确认删除', content: `确定删除分组"${record.name}"？`, onOk: () => deleteSegment.mutateAsync(record.id).then(() => message.success('已删除')) });
          }}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card title="用户分组" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { resetForm(); setModalOpen(true); }}>新建分组</Button>}>
        {isLoading ? <div className="flex justify-center py-8"><Spin /></div> :
        <Table columns={columns} dataSource={segments || []} rowKey="id" pagination={false} size="middle" />}
      </Card>

      <Modal title={editId ? '编辑分组' : '新建分组'} open={modalOpen} onOk={handleSave} onCancel={() => { setModalOpen(false); resetForm(); }} confirmLoading={createSegment.isPending || updateSegment.isPending} width={500}>
        <div className="space-y-3">
          <div><label className="block text-sm mb-1">名称 *</label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="block text-sm mb-1">描述</label><Input.TextArea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div><label className="block text-sm mb-1">动态分组</label><Switch checked={form.isDynamic} onChange={v => setForm({ ...form, isDynamic: v })} /></div>
          {form.isDynamic && (
            <div className="p-3 bg-gray-50 rounded space-y-2">
              <span className="text-sm text-gray-500">筛选条件（仅对动态分组生效）</span>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="最低等级" type="number" value={form.minLevel} onChange={e => setForm({ ...form, minLevel: e.target.value })} />
                <Input placeholder="最高等级" type="number" value={form.maxLevel} onChange={e => setForm({ ...form, maxLevel: e.target.value })} />
                <Input placeholder="最近N天未登录" type="number" value={form.daysSinceLogin} onChange={e => setForm({ ...form, daysSinceLogin: e.target.value })} />
                <Input placeholder="注册天数以内" type="number" value={form.daysSinceRegister} onChange={e => setForm({ ...form, daysSinceRegister: e.target.value })} />
              </div>
            </div>
          )}
        </div>
      </Modal>

      {selectedSegmentId && (
        <SegmentMembers segmentId={selectedSegmentId} open={membersOpen} onClose={() => setMembersOpen(false)} />
      )}
    </>
  );
};

export default SegmentList;
