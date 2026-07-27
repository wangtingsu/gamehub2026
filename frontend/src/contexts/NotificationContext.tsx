import { createContext, useContext, useEffect, useCallback, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { queryKeys } from '../api/hooks';
import {
  getSocket,
  joinNotificationRoom,
  leaveNotificationRoom,
  onNotification,
  onNewMessage,
  onFollowUpdate,
  onUnreadCountUpdate,
  disconnectSocket,
} from '../services/socket';
import type { Notification } from '../api/types';
import { message } from 'antd';

// 通知上下文类型
interface NotificationContextType {
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// 显示桌面通知
const showDesktopNotification = (notification: Notification) => {
  if (!('Notification' in window)) return;
  const BrowserNotification = window.Notification;
  if (BrowserNotification.permission === 'granted') {
    new BrowserNotification(notification.title, {
      body: notification.message,
      icon: '/favicon.ico',
    });
  } else if (BrowserNotification.permission !== 'denied') {
    BrowserNotification.requestPermission();
  }
};

// 显示应用内通知
const showInAppNotification = (notif: { title: string; message: string }) => {
  message.info({
    content: (
      <div>
        <div className="font-medium">{notif.title}</div>
        <div className="text-sm">{notif.message}</div>
      </div>
    ),
    duration: 5,
  });
};

// 通知上下文提供者
interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();

  // 刷新通知数据
  const refreshNotifications = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
  }, [queryClient]);

  // 处理新通知
  const handleNotification = useCallback((notif: any) => {
    // 乐观更新未读计数
    queryClient.setQueryData(queryKeys.notifications.unreadCount(), (old: number = 0) =>
      Math.max(0, old + 1),
    );

    // 更新通知列表缓存
    queryClient.setQueryData(
      queryKeys.notifications.lists({ limit: 10 }),
      (old: Notification[] = []) => [notif, ...old.slice(0, 9)],
    );

    showDesktopNotification(notif);
    showInAppNotification(notif);
  }, [queryClient]);

  // 处理新消息
  const handleNewMessage = useCallback((data: any) => {
    // 刷新未读消息数
    queryClient.invalidateQueries({ queryKey: queryKeys.messages.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.messages.unreadCount() });

    const { message: msg } = data;
    if (msg?.senderName) {
      showInAppNotification({
        title: '新消息',
        message: `${msg.senderName}: ${msg.content?.substring(0, 60)}`,
      });
    }
  }, [queryClient]);

  // 处理关注更新
  const handleFollowUpdate = useCallback((data: any) => {
    queryClient.invalidateQueries({ queryKey: ['follow'] });

    if (data?.follower?.displayName) {
      showInAppNotification({
        title: '新关注',
        message: `${data.follower.displayName} 关注了您`,
      });
    }
  }, [queryClient]);

  // 处理未读数更新
  const handleUnreadCount = useCallback((data: { unreadCount: number }) => {
    queryClient.setQueryData(queryKeys.messages.unreadCount(), data.unreadCount);
  }, [queryClient]);

  // 初始化 Socket 连接
  useEffect(() => {
    if (!isAuthenticated || !user) {
      disconnectSocket();
      return;
    }

    // 初始化 Socket（确保连接）
    getSocket();

    // 加入通知房间
    joinNotificationRoom(user.id.toString());

    // 注册事件监听
    const unsubNotification = onNotification(handleNotification);
    const unsubNewMessage = onNewMessage(handleNewMessage);
    const unsubFollow = onFollowUpdate(handleFollowUpdate);
    const unsubUnread = onUnreadCountUpdate(handleUnreadCount);

    return () => {
      unsubNotification();
      unsubNewMessage();
      unsubFollow();
      unsubUnread();
      leaveNotificationRoom(user.id.toString());
    };
  }, [isAuthenticated, user, handleNotification, handleNewMessage, handleFollowUpdate, handleUnreadCount]);

  const value: NotificationContextType = {
    refreshNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// 使用通知上下文的 hook
export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
