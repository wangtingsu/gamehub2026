import React, { useState } from 'react';
import { Modal, Table, Button, Input, message, Space, Spin } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useSegmentMembers, useAddMemberToSegment, useRemoveMemberFromSegment } from '../../../../api/hooks';

interface SegmentMembersProps {
  segmentId: number;
  open: boolean;
  onClose: () => void;
}

const SegmentMembers: React.FC<SegmentMembersProps> = ({ segmentId, open, onClose }) => {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSegmentMembers(segmentId, page, 20);
  const addMember = useAddMemberToSegment();
  const removeMember = useRemoveMemberFromSegment();
  const [newUserId, setNewUserId] = useState('');

  const handleAdd = async () => {
    if (!newUserId.trim()) { message.error('请输入用户ID'); return; }
    try {
      await addMember.mutateAsync({ segmentId, userId: newUserId });
      message.success('成员添加成功');
      setNewUserId('');
    } catch { message.error('添加失败'); }
  };

  const handleRemove = (userId: string) => {
    Modal.confirm({
      title: '确认移除',
      content: '确定要将该用户移出分组吗？',
      onOk: () => removeMember.mutateAsync({ segmentId, userId }).then(() => message.success('已移除')),
    });
  };

  const columns = [
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '显示名', dataIndex: 'display_name', key: 'display_name' },
    { title: '角色', dataIndex: 'role', key: 'role' },
    { title: '等级', dataIndex: 'level', key: 'level' },
    { title: '加入时间', dataIndex: 'added_at', key: 'added_at', render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
    {
      title: '操作', key: 'action',
      render: (_: any, record: any) => <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleRemove(record.user_id)}>移除</Button>,
    },
  ];

  return (
    <Modal title="分组成员管理" open={open} onCancel={onClose} footer={null} width={800}>
      <div className="mb-3 flex gap-2">
        <Input placeholder="输入用户ID添加" value={newUserId} onChange={e => setNewUserId(e.target.value)} style={{ width: 200 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} loading={addMember.isPending}>添加成员</Button>
      </div>
      {isLoading ? <div className="flex justify-center py-8"><Spin /></div> :
      <Table columns={columns} dataSource={data?.members || []} rowKey="id" size="small"
        pagination={{ current: page, pageSize: 20, total: data?.total || 0, onChange: setPage, showSizeChanger: false }} />}
    </Modal>
  );
};

export default SegmentMembers;
