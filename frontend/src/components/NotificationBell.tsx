import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Spin, Button } from 'antd';
import {
  BellOutlined, MessageOutlined, HeartOutlined, UserAddOutlined,
  SettingOutlined, EyeOutlined,
} from '@ant-design/icons';
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead } from '../api/hooks';
import type { Notification } from '../api/types';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface NotificationBellProps {
  compact?: boolean;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ compact = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { data: unreadCount = 0, isLoading: countLoading } = useUnreadCount();
  const { data: notifications = [], isLoading: notificationsLoading } = useNotifications(
    { limit: 10, unreadOnly: false }
  );

  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current && !popupRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ESC 关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  const getNotificationIcon = (type: Notification['type']) => {
    const iconCls = 'text-base';
    switch (type) {
      case 'like':        return <HeartOutlined className={iconCls} style={{ color: '#ef4444' }} />;
      case 'comment':     return <MessageOutlined className={iconCls} style={{ color: '#3b82f6' }} />;
      case 'follow':      return <UserAddOutlined className={iconCls} style={{ color: '#22c55e' }} />;
      case 'mention':     return <MessageOutlined className={iconCls} style={{ color: '#a855f7' }} />;
      case 'system':      return <SettingOutlined className={iconCls} style={{ color: 'var(--c-text2)' }} />;
      case 'marketing':   return <BellOutlined className={iconCls} style={{ color: '#eab308' }} />;
      default:            return <BellOutlined className={iconCls} style={{ color: 'var(--c-text2)' }} />;
    }
  };

  const getNotificationTypeText = (type: Notification['type']) => {
    const typeMap: Record<Notification['type'], string> = {
      like: '点赞', comment: '评论', follow: '关注', mention: '@提及',
      system: '系统', marketing: '营销', new_message: '新消息',
      achievement_unlocked: '成就解锁', level_up: '升级',
    };
    return typeMap[type] || type;
  };

  const handleMarkAsRead = (notificationId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) handleMarkAsRead(notification.id);
    setIsOpen(false);
  };

  const renderNotificationItem = (notification: Notification) => {
    const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
      addSuffix: true, locale: zhCN,
    });

    return (
      <div
        key={notification.id}
        className="cursor-pointer transition-colors px-4 py-3"
        style={{
          background: !notification.isRead
            ? 'color-mix(in srgb, var(--c-focus) 8%, var(--c-card))'
            : 'var(--c-card)',
          borderBottom: '1px solid var(--c-border)',
        }}
        onClick={() => handleNotificationClick(notification)}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {getNotificationIcon(notification.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium text-sm truncate" style={{ color: 'var(--c-text)' }}>
                  {notification.title}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--c-text2)' }}>
                  {getNotificationTypeText(notification.type)}
                </div>
              </div>
              {!notification.isRead && (
                <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: 'var(--c-focus)' }} />
              )}
            </div>
            <p className="text-sm mt-1 line-clamp-2" style={{ color: 'var(--c-text2)' }}>
              {notification.message}
            </p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs" style={{ color: 'var(--c-text2)', opacity: 0.7 }}>{timeAgo}</span>
              {!notification.isRead && (
                <Button
                  type="text"
                  size="small"
                  className="text-xs"
                  style={{ color: 'var(--c-focus)' }}
                  onClick={(e) => handleMarkAsRead(notification.id, e)}
                  loading={markAsReadMutation.isPending}
                >
                  标记已读
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      {/* 铃铛按钮 */}
      <Badge count={unreadCount} overflowCount={99} size="small" offset={[-2, 2]}
        className={countLoading ? 'opacity-50' : ''}>
        <button
          ref={buttonRef}
          className="p-2 rounded-lg transition-colors"
          style={{ color: isOpen ? 'var(--c-focus)' : 'var(--c-text2)' }}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="通知"
          onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.color = 'var(--c-text)'; }}
          onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.color = 'var(--c-text2)'; }}
        >
          <BellOutlined className="text-xl" />
        </button>
      </Badge>

      {/* 自定义弹出面板 */}
      {isOpen && (
        <div
          ref={popupRef}
          className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto z-50"
          style={{
            background: 'var(--c-card)',
            border: '1px solid var(--c-border)',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          {/* 头部 */}
          <div
            className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
            style={{
              background: 'var(--c-card)',
              borderBottom: '1px solid var(--c-border)',
              borderRadius: '12px 12px 0 0',
            }}
          >
            <div className="font-semibold text-base" style={{ color: 'var(--c-text)' }}>通知</div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  className="text-xs px-2 py-1 rounded transition-colors"
                  style={{ color: 'var(--c-focus)' }}
                  onClick={handleMarkAllAsRead}
                  disabled={markAllAsReadMutation.isPending}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'color-mix(in srgb, var(--c-focus) 10%, transparent)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {markAllAsReadMutation.isPending ? '处理中...' : '全部已读'}
                </button>
              )}
              <Link
                to="/notifications"
                onClick={() => setIsOpen(false)}
                style={{ color: 'var(--c-text2)' }}
                className="hover:opacity-80 transition-opacity"
              >
                <EyeOutlined />
              </Link>
            </div>
          </div>

          {/* 列表 */}
          {notificationsLoading ? (
            <div className="flex justify-center py-10"><Spin size="small" /></div>
          ) : notifications.length > 0 ? (
            notifications.map(renderNotificationItem)
          ) : (
            <div className="py-12 text-center" style={{ background: 'var(--c-card)' }}>
              <BellOutlined className="text-3xl mb-3 block" style={{ color: 'var(--c-text2)', opacity: 0.4 }} />
              <div style={{ color: 'var(--c-text2)' }}>暂无通知</div>
              <div className="text-sm mt-1" style={{ color: 'var(--c-text2)', opacity: 0.6 }}>
                当有新通知时会显示在这里
              </div>
            </div>
          )}

          {/* 底部 */}
          {notifications.length > 0 && (
            <div
              className="sticky bottom-0 px-4 py-3"
              style={{
                background: 'var(--c-card)',
                borderTop: '1px solid var(--c-border)',
                borderRadius: '0 0 12px 12px',
              }}
            >
              <Link
                to="/notifications"
                className="block text-center text-sm font-medium transition-opacity hover:opacity-80"
                style={{ color: 'var(--c-focus)' }}
                onClick={() => setIsOpen(false)}
              >
                查看所有通知
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
