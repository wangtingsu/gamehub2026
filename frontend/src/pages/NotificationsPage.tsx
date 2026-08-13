import { useState } from 'react';
import { Tabs, Pagination, Button, Spin, Empty, Dropdown, Modal } from 'antd';
import {
  BellOutlined,
  MessageOutlined,
  HeartOutlined,
  UserAddOutlined,
  SettingOutlined,
  TagOutlined,
  CheckOutlined,
  FilterOutlined,
  MoreOutlined,
  TrophyOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead } from '../api/hooks';
import type { Notification, NotificationType } from '../api/types';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import SEO from '../components/SEO';

const { confirm } = Modal;

const NotificationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NotificationType | 'all'>('all');
  const [page, setPage] = useState(1);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);

  const { data: notifications = [], isLoading, refetch } = useNotifications({
    type: activeTab === 'all' ? undefined : activeTab,
    page,
    limit: 20,
  });

  const { data: unreadCount = 0 } = useUnreadCount();

  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();

  const getNotificationStats = () => {
    const stats: Record<string, number> = {
      all: notifications.length,
      like: 0, comment: 0, follow: 0, mention: 0,
      system: 0, marketing: 0, unread: 0,
    };
    notifications.forEach(notification => {
      if (stats[notification.type] !== undefined) stats[notification.type]++;
      if (!notification.isRead) stats.unread++;
    });
    return stats;
  };

  const stats = getNotificationStats();

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'like':        return <HeartOutlined style={{ color: '#ef4444' }} />;
      case 'comment':     return <MessageOutlined style={{ color: '#3b82f6' }} />;
      case 'follow':      return <UserAddOutlined style={{ color: '#22c55e' }} />;
      case 'mention':     return <MessageOutlined style={{ color: '#a855f7' }} />;
      case 'system':      return <SettingOutlined style={{ color: 'var(--c-text2)' }} />;
      case 'marketing':   return <TagOutlined style={{ color: '#eab308' }} />;
      case 'new_message': return <MessageOutlined style={{ color: '#06b6d4' }} />;
      case 'achievement_unlocked': return <TrophyOutlined style={{ color: '#f59e0b' }} />;
      case 'level_up':    return <CrownOutlined style={{ color: '#a855f7' }} />;
      default:            return <BellOutlined style={{ color: 'var(--c-text2)' }} />;
    }
  };

  const getNotificationTypeText = (type: NotificationType) => {
    const typeMap: Record<string, string> = {
      like: '点赞', comment: '评论', follow: '关注', mention: '@提及',
      system: '系统', marketing: '营销', new_message: '新消息',
      achievement_unlocked: '成就解锁', level_up: '等级提升',
    };
    return typeMap[type] || type;
  };

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    confirm({
      title: '标记所有通知为已读',
      content: '确定要将所有通知标记为已读吗？',
      onOk: () => markAllAsReadMutation.mutate(),
    });
  };

  const handleSelectNotification = (notificationId: string) => {
    setSelectedNotifications(prev =>
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const handleBatchMarkAsRead = () => {
    if (selectedNotifications.length === 0) return;
    selectedNotifications.forEach(id => handleMarkAsRead(id));
    setSelectedNotifications([]);
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key as NotificationType | 'all');
    setPage(1);
    setSelectedNotifications([]);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const statItems = [
    { key: 'all', label: '全部', color: 'var(--c-focus)' },
    { key: 'like', label: '点赞', color: '#ef4444' },
    { key: 'comment', label: '评论', color: '#3b82f6' },
    { key: 'follow', label: '关注', color: '#22c55e' },
    { key: 'mention', label: '提及', color: '#a855f7' },
    { key: 'system', label: '系统', color: 'var(--c-text2)' },
    { key: 'unread', label: '未读', color: '#f97316' },
  ];

  // ========== 公共主题样式 ==========
  const cardStyle: React.CSSProperties = {
    background: 'var(--c-card)',
    border: '1px solid var(--c-border)',
  };
const iconBoxStyle: React.CSSProperties = {
    width: 48, height: 48, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'color-mix(in srgb, var(--c-focus) 12%, var(--c-card))',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-2">
      <SEO
        title="通知中心 | GameHub"
        description="查看和管理您的 GameHub 通知"
        keywords="通知中心, 消息通知, GameHub通知, 系统通知, 消息提醒"
        noindex
      />

      {/* 页面头部 */}
      <div className="p-6 mb-6" style={{ ...cardStyle, borderRadius: 12 }}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div style={iconBoxStyle}>
              <BellOutlined className="text-xl" style={{ color: 'var(--c-focus)' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--c-text)' }}>通知中心</h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--c-text2)' }}>
                您有 <span className="font-semibold" style={{ color: 'var(--c-focus)' }}>{unreadCount}</span> 条未读通知
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {selectedNotifications.length > 0 && (
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={handleBatchMarkAsRead}
                loading={markAsReadMutation.isPending}
              >
                标记选中为已读 ({selectedNotifications.length})
              </Button>
            )}
            <Button
              icon={<CheckOutlined />}
              onClick={handleMarkAllAsRead}
              loading={markAllAsReadMutation.isPending}
            >
              全部已读
            </Button>
            <Dropdown
              menu={{
                items: [
                  { key: 'refresh', label: '刷新列表', icon: <FilterOutlined />, onClick: () => refetch() },
                ],
              }}
              placement="bottomRight"
            >
              <Button icon={<MoreOutlined />} />
            </Dropdown>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {statItems.map(item => (
          <div
            key={item.key}
            className="text-center cursor-pointer rounded-lg transition-all"
            style={{ ...cardStyle, padding: '16px 12px', borderRadius: 10 }}
            onClick={() => handleTabChange(item.key)}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--c-focus)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--c-border)'; }}
          >
            <div className="text-xl font-bold" style={{ color: item.color }}>
              {stats[item.key] ?? 0}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--c-text2)' }}>
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* 标签页 + 列表 */}
      <div style={{ ...cardStyle, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '0 20px' }}>
          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            className="notifications-tabs"
            items={[
              { key: 'all', label: '全部通知' },
              { key: 'like', label: '点赞' },
              { key: 'comment', label: '评论' },
              { key: 'follow', label: '关注' },
              { key: 'mention', label: '提及' },
              { key: 'system', label: '系统通知' },
              { key: 'marketing', label: '营销通知' },
            ]}
          />
        </div>

        <div style={{ padding: '0 20px 20px' }}>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Spin size="large" />
            </div>
          ) : notifications.length > 0 ? (
            <div>
              {notifications.map(notification => {
                const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
                  addSuffix: true, locale: zhCN,
                });
                const isSelected = selectedNotifications.includes(notification.id);

                return (
                  <div
                    key={notification.id}
                    className="mb-3 rounded-lg transition-all"
                    style={{
                      ...cardStyle,
                      padding: '16px 20px',
                      borderLeft: !notification.isRead
                        ? '4px solid var(--c-focus)'
                        : '1px solid var(--c-border)',
                      outline: isSelected ? '2px solid var(--c-focus)' : undefined,
                      background: !notification.isRead
                        ? 'color-mix(in srgb, var(--c-focus) 4%, var(--c-card))'
                        : 'var(--c-card)',
                    }}
                  >
                    <div className="flex items-start gap-4">
                      {/* 勾选框 */}
                      <div className="flex-shrink-0 pt-0.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectNotification(notification.id)}
                          className="h-4 w-4 rounded cursor-pointer"
                          style={{ accentColor: 'var(--c-focus)' }}
                        />
                      </div>

                      {/* 图标 */}
                      <div className="flex-shrink-0">
                        <div
                          className="w-10 h-10 flex items-center justify-center rounded-full"
                          style={{ background: 'color-mix(in srgb, var(--c-focus) 10%, var(--c-card))' }}
                        >
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>

                      {/* 内容 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="font-semibold truncate" style={{ color: 'var(--c-text)' }}>
                              {notification.title}
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className="text-xs px-2 py-0.5 rounded"
                                style={{
                                  background: 'color-mix(in srgb, var(--c-text2) 15%, var(--c-card))',
                                  color: 'var(--c-text2)',
                                }}
                              >
                                {getNotificationTypeText(notification.type)}
                              </span>
                              {!notification.isRead && (
                                <span
                                  className="text-xs px-2 py-0.5 rounded font-medium"
                                  style={{
                                    background: 'color-mix(in srgb, var(--c-focus) 15%, var(--c-card))',
                                    color: 'var(--c-focus)',
                                  }}
                                >
                                  未读
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs flex-shrink-0" style={{ color: 'var(--c-text2)', opacity: 0.7 }}>
                            {timeAgo}
                          </span>
                        </div>

                        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--c-text2)' }}>
                          {notification.message}
                        </p>

                        <div className="flex items-center gap-2 mt-3">
                          {!notification.isRead && (
                            <Button
                              type="primary"
                              size="small"
                              icon={<CheckOutlined />}
                              onClick={() => handleMarkAsRead(notification.id)}
                              loading={markAsReadMutation.isPending}
                            >
                              标记已读
                            </Button>
                          )}
                          <Button type="text" size="small" icon={<MoreOutlined />} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div>
                  <p style={{ color: 'var(--c-text2)' }}>暂无通知</p>
                  <p className="text-sm" style={{ color: 'var(--c-text2)', opacity: 0.7 }}>
                    {activeTab === 'all'
                      ? '您还没有收到任何通知'
                      : `您还没有收到${getNotificationTypeText(activeTab as NotificationType)}通知`}
                  </p>
                </div>
              }
              className="py-16"
            />
          )}

          {/* 分页 */}
          {notifications.length > 0 && (
            <div
              className="flex justify-center mt-6 pt-4"
              style={{ borderTop: '1px solid var(--c-border)' }}
            >
              <Pagination
                current={page}
                total={stats.all}
                pageSize={20}
                onChange={handlePageChange}
                showSizeChanger={false}
                showQuickJumper
                showTotal={(total, range) => `${range[0]}-${range[1]} 条，共 ${total} 条`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
