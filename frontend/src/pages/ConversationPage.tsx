import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Avatar, Typography, Input, Button, Spin, Empty, Modal, Popconfirm, message as antMsg } from 'antd';
import { SendOutlined, ArrowLeftOutlined, UserOutlined, DeleteOutlined, ClearOutlined } from '@ant-design/icons';
import { useConversation, useSendMessage, useMarkConversationRead, useMessageUnreadCount, useDeleteMessage, useClearConversation } from '../api/hooks';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';

const { Text } = Typography;
const { TextArea } = Input;

const ConversationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [newMessage, setNewMessage] = useState('');

  const { data, isLoading } = useConversation(id || '');
  const sendMessage = useSendMessage();
  const markRead = useMarkConversationRead();
  const { refetch: refetchUnread } = useMessageUnreadCount();
  const deleteMessage = useDeleteMessage();
  const clearConversation = useClearConversation();

  const conversation = data?.conversation;
  const messages = data?.messages || [];
  const otherParticipant = conversation?.participants?.find(p => p.userId !== user?.id);

  // Mark as read on mount
  useEffect(() => {
    if (id) {
      markRead.mutate(id);
      refetchUnread();
    }
  }, [id]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    if (!newMessage.trim() || !id) return;
    try {
      await sendMessage.mutateAsync({ conversationId: id, content: newMessage.trim() });
      setNewMessage('');
    } catch {
      antMsg.error('发送失败');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!id) return;
    try {
      await deleteMessage.mutateAsync({ conversationId: id, messageId });
      antMsg.success('消息已删除');
    } catch {
      antMsg.error('删除失败');
    }
  };

  const handleClearConversation = async () => {
    if (!id) return;
    try {
      await clearConversation.mutateAsync(id);
      antMsg.success('聊天记录已清空');
    } catch {
      antMsg.error('清空失败');
    }
  };

  const showClearConfirm = () => {
    Modal.confirm({
      title: '清空聊天记录',
      content: '确定要清空该对话的所有消息吗？此操作不可恢复。',
      okText: '确定清空',
      okType: 'danger',
      cancelText: '取消',
      onOk: handleClearConversation,
    });
  };

  if (isLoading) {
    return (
      <div className=" py-8">
        <div className="text-center py-12"><Spin size="large" /></div>
      </div>
    );
  }

  return (
    <div className=" py-8">
      <SEO title="消息 | GameHub" description="GameHub 即时通讯，查看和发送消息" keywords="私信,消息,聊天,即时通讯,GameHub消息" noindex />

      <Card className="shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-dark-700">
          <div className="flex items-center">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/messages')}
              className="mr-3"
            />
            <Avatar size={40} icon={<UserOutlined />} src={otherParticipant?.avatarUrl} />
            <div className="ml-3">
              <Text strong className="text-base">
                {otherParticipant?.displayName || otherParticipant?.username || '用户'}
              </Text>
            </div>
          </div>

          {/* 右侧操作按钮 */}
          <Popconfirm
            title="清空聊天记录"
            description="确定要清空该对话的所有消息吗？此操作不可恢复。"
            onConfirm={handleClearConversation}
            okText="确定清空"
            okType="danger"
            cancelText="取消"
          >
            <Button
              danger
              size="small"
              icon={<ClearOutlined />}
              loading={clearConversation.isPending}
            >
              清除聊天记录
            </Button>
          </Popconfirm>
        </div>

        {/* Messages */}
        <div className="h-[500px] overflow-y-auto mb-4 px-2">
          {messages.length === 0 ? (
            <Empty description="暂无消息" className="py-20" />
          ) : (
            <div className="space-y-4 py-4">
              {messages.map((msg) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}
                  >
                    <div className="flex items-end gap-2 max-w-[70%]">
                      {/* 删除按钮（仅自己的消息） */}
                      {isMe && (
                        <Popconfirm
                          title="删除这条消息？"
                          onConfirm={() => handleDeleteMessage(msg.id)}
                          okText="删除"
                          okType="danger"
                          cancelText="取消"
                          placement="topRight"
                        >
                          <Button
                            type="text"
                            size="small"
                            icon={<DeleteOutlined />}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                          />
                        </Popconfirm>
                      )}

                      <div
                        className={`px-4 py-2.5 rounded-2xl ${
                          isMe
                            ? 'bg-primary-500 text-white rounded-br-md'
                            : 'bg-gray-100 dark:bg-dark-700 rounded-bl-md'
                        }`}
                      >
                        <Text className={`text-sm whitespace-pre-wrap ${isMe ? 'text-white' : ''}`}>
                          {msg.content}
                        </Text>
                        <div className={`text-xs mt-1 ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex items-end gap-3 border-t border-gray-200 dark:border-dark-700 pt-4">
          <TextArea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息，Enter 发送，Shift+Enter 换行"
            rows={2}
            className="flex-1"
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            loading={sendMessage.isPending}
            disabled={!newMessage.trim()}
            className="h-10"
          >
            发送
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ConversationPage;
