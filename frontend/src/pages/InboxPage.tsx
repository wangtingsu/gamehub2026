import React, { useState, useEffect } from 'react';
import { Card, List, Avatar, Input, Button, Badge, Typography, Empty, Modal, Spin, message as antMsg } from 'antd';
import { MessageOutlined, PlusOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useConversations, useCreateConversation, useMessageUnreadCount } from '../api/hooks';
import SEO from '../components/SEO';

const { Title, Text } = Typography;
const { Search } = Input;

const InboxPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchUser, setSearchUser] = useState('');

  const { data, isLoading } = useConversations({ page, limit: 20 });
  const { data: unreadCount } = useMessageUnreadCount();
  const createConversation = useCreateConversation();

  const conversations = data?.items || [];
  const pagination = data?.pagination;

  // 处理从外部传入的 userId 参数（来自"发私信"按钮）
  useEffect(() => {
    const targetUserId = searchParams.get('userId');
    if (targetUserId) {
      // 直接创建对话并跳转
      createConversation.mutateAsync({ participantId: targetUserId }).then((result) => {
        navigate(`/messages/${result.id}`, { replace: true });
      }).catch(() => {
        antMsg.error('创建对话失败');
      });
    }
  }, [searchParams, navigate, createConversation]);

  const handleCreateConversation = async () => {
    if (!searchUser.trim()) {
      antMsg.warning('请输入用户ID');
      return;
    }
    try {
      const result = await createConversation.mutateAsync({ participantId: searchUser.trim() });
      setCreateModalOpen(false);
      setSearchUser('');
      navigate(`/messages/${result.id}`);
    } catch (err) {
      antMsg.error('创建对话失败，请确认用户 ID 是否正确');
    }
  };

  return (
    <div className=" py-8">
      <SEO title="私信 | GameHub" description="GameHub 私信系统" keywords="私信,消息,站内信,聊天,GameHub消息" noindex />

      <div className="flex items-center justify-between mb-6">
        <Title level={3} className="mb-0 flex items-center">
          <MessageOutlined className="mr-3 text-primary-500" />
          私信
          {unreadCount && unreadCount > 0 && (
            <Badge count={unreadCount} className="ml-3" />
          )}
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
          新消息
        </Button>
      </div>

      <Card className="shadow-sm bg-dark-800 border-dark-700">
        {isLoading ? (
          <div className="text-center py-12"><Spin size="large" /></div>
        ) : conversations.length === 0 ? (
          <Empty description="暂无私信" className="py-12" />
        ) : (
          <List
            dataSource={conversations}
            renderItem={(conv) => {
              const otherParticipant = conv.participants?.[0];
              return (
                <List.Item
                  className="cursor-pointer hover:bg-dark-800 px-4 rounded-lg transition-colors"
                  onClick={() => navigate(`/messages/${conv.id}`)}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge count={conv.unreadCount} size="small" offset={[-5, 5]}>
                        <Avatar size={48} icon={<UserOutlined />} src={otherParticipant?.avatarUrl} />
                      </Badge>
                    }
                    title={
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {otherParticipant?.displayName || otherParticipant?.username || '用户'}
                        </span>
                        <Text type="secondary" className="text-xs">
                          {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleDateString() : ''}
                        </Text>
                      </div>
                    }
                    description={
                      <Text type="secondary" ellipsis className="text-sm">
                        {conv.lastMessagePreview || '暂无消息'}
                      </Text>
                    }
                  />
                </List.Item>
              );
            }}
            pagination={
              pagination && pagination.total > 20
                ? {
                    current: page,
                    pageSize: 20,
                    total: pagination.total,
                    onChange: setPage,
                    showSizeChanger: false,
                  }
                : false
            }
          />
        )}
      </Card>

      <Modal
        title="新消息"
        open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); setSearchUser(''); }}
        onOk={handleCreateConversation}
        confirmLoading={createConversation.isPending}
        okText="开始对话"
      >
        <div className="py-4">
          <Text className="block mb-2">输入对方用户名：</Text>
          <Search
            placeholder="请输入用户名"
            value={searchUser}
            onChange={(e) => setSearchUser(e.target.value)}
            onSearch={handleCreateConversation}
            enterButton="开始"
            size="large"
          />
        </div>
      </Modal>
    </div>
  );
};

export default InboxPage;
