import React, { useState } from 'react';
import { Card, Table, Tag, Button, Modal, Input, ColorPicker, message, Space, Select, Spin } from 'antd';
import { PlusOutlined, DeleteOutlined, UserAddOutlined } from '@ant-design/icons';
import { useProfilingTags, useCreateProfilingTag, useDeleteProfilingTag, useAssignTagToUser, useRemoveTagFromUser, useUserTags } from '../../../../api/hooks';

const TagManager: React.FC = () => {
  const { data: tags, isLoading } = useProfilingTags();
  const createTag = useCreateProfilingTag();
  const deleteTag = useDeleteProfilingTag();
  const assignTag = useAssignTagToUser();
  const removeTag = useRemoveTagFromUser();

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#1890ff');
  const [newDesc, setNewDesc] = useState('');

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignTagId, setAssignTagId] = useState<number | null>(null);

  const { data: userTags } = useUserTags(assignUserId);

  const handleCreate = async () => {
    if (!newName.trim()) { message.error('请输入标签名称'); return; }
    try {
      const colorStr = typeof newColor === 'string' ? newColor : (newColor as any)?.toHexString?.() || '#1890ff';
      await createTag.mutateAsync({ name: newName, color: colorStr, description: newDesc });
      message.success('标签创建成功');
      setCreateOpen(false);
      setNewName('');
      setNewDesc('');
    } catch { message.error('创建失败'); }
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后，该标签将从所有用户移除。确定要删除吗？',
      onOk: () => deleteTag.mutateAsync(id).then(() => message.success('已删除')),
    });
  };

  const handleAssign = async () => {
    if (!assignUserId || !assignTagId) { message.error('请填写完整信息'); return; }
    try {
      await assignTag.mutateAsync({ userId: assignUserId, tagId: assignTagId });
      message.success('标签分配成功');
    } catch { message.error('分配失败'); }
  };

  const handleRemoveTag = async (tagId: number) => {
    try {
      await removeTag.mutateAsync({ userId: assignUserId, tagId });
      message.success('标签已移除');
    } catch { message.error('移除失败'); }
  };

  const columns = [
    { title: '标签名称', dataIndex: 'name', key: 'name', render: (text: string, record: any) => <Tag color={record.color}>{text}</Tag> },
    { title: '颜色', dataIndex: 'color', key: 'color', render: (color: string) => <div className="w-6 h-6 rounded-full" style={{ backgroundColor: color }} /> },
    { title: '描述', dataIndex: 'description', key: 'description' },
    {
      title: '操作', key: 'action',
      render: (_: any, record: any) => <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>删除</Button>,
    },
  ];

  return (
    <Card title="用户标签管理" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>新建标签</Button>}>
      {isLoading ? <div className="flex justify-center py-8"><Spin /></div> :
      <Table columns={columns} dataSource={tags || []} rowKey="id" pagination={false} size="middle" />}

      <Card className="mt-4" title="分配标签到用户" size="small">
        <Space.Compact className="w-full mb-3">
          <Input placeholder="输入用户ID" value={assignUserId} onChange={e => setAssignUserId(e.target.value)} style={{ width: 200 }} />
          <Select placeholder="选择标签" value={assignTagId} onChange={v => setAssignTagId(v)} style={{ width: 160 }}
            options={(tags || []).map(t => ({ value: t.id, label: t.name }))} />
          <Button type="primary" icon={<UserAddOutlined />} onClick={handleAssign} loading={assignTag.isPending}>分配</Button>
        </Space.Compact>
        {assignUserId && (
          <div>
            <span className="text-sm text-gray-500 mr-2">当前标签：</span>
            {userTags?.length ? userTags.map(t => (
              <Tag key={t.id} color={t.color} closable onClose={() => handleRemoveTag(t.id)}>{t.name}</Tag>
            )) : <span className="text-sm text-gray-400">无标签</span>}
          </div>
        )}
      </Card>

      <Modal title="新建标签" open={createOpen} onOk={handleCreate} onCancel={() => setCreateOpen(false)} confirmLoading={createTag.isPending}>
        <div className="space-y-3">
          <div><label className="block text-sm mb-1">名称</label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="输入标签名称" /></div>
          <div><label className="block text-sm mb-1">颜色</label><ColorPicker value={newColor} onChange={c => setNewColor(c.toHexString())} /></div>
          <div><label className="block text-sm mb-1">描述</label><Input.TextArea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="可选描述" /></div>
        </div>
      </Modal>
    </Card>
  );
};

export default TagManager;
