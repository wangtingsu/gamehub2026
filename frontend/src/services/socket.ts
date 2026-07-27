import { io, Socket } from 'socket.io-client';

const SOCKET_URL = (() => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'http://localhost:3000';
})();

let socket: Socket | null = null;

// 获取或创建 Socket 连接
export const getSocket = (token?: string): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: token ? { token } : undefined,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('[Socket] 连接已建立:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] 连接已断开:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] 连接失败:', err.message);
    });
  }
  return socket;
};

// 加入通知房间
export const joinNotificationRoom = (userId: string): void => {
  const s = getSocket();
  s.emit('join:notifications', userId);
};

// 离开通知房间
export const leaveNotificationRoom = (userId: string): void => {
  const s = getSocket();
  s.emit('leave:notifications', userId);
};

// 断开连接
export const disconnectSocket = (): void => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};

// 监听通知事件
export const onNotification = (callback: (data: any) => void): (() => void) => {
  const s = getSocket();
  s.on('notification', callback);
  return () => { s.off('notification', callback); };
};

// 监听新消息事件
export const onNewMessage = (callback: (data: any) => void): (() => void) => {
  const s = getSocket();
  s.on('new-message', callback);
  return () => { s.off('new-message', callback); };
};

// 监听关注更新
export const onFollowUpdate = (callback: (data: any) => void): (() => void) => {
  const s = getSocket();
  s.on('follow-update', callback);
  return () => { s.off('follow-update', callback); };
};

// 监听未读数更新
export const onUnreadCountUpdate = (callback: (data: { unreadCount: number }) => void): (() => void) => {
  const s = getSocket();
  s.on('unread-count', callback);
  return () => { s.off('unread-count', callback); };
};
