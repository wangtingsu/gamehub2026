/**
 * WebSocket 通知服务
 *
 * 基于 Socket.IO 提供实时通知推送功能，包括通用通知、关注通知、
 * 新消息通知和未读数更新等。所有通知按用户 ID 路由到对应的客户端房间。
 *
 * @module socket.service
 */

import { Server as SocketIOServer } from 'socket.io';
import logger from '../utils/logger';

/** Socket.IO 服务实例（全局单例） */
let io: SocketIOServer | null = null;

/**
 * 设置 Socket.IO 实例
 *
 * 在应用初始化阶段由 Socket.IO 启动代码调用，注入服务器实例。
 *
 * @param socketIO - Socket.IO 服务器实例
 */
export const setSocketIO = (socketIO: SocketIOServer): void => {
  io = socketIO;
};

/**
 * 获取 Socket.IO 实例
 *
 * 内部方法，确保在调用通知发送函数前 io 已初始化。
 *
 * @returns Socket.IO 服务器实例
 * @throws 如果 Socket.IO 尚未初始化则抛出错误
 */
const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO 尚未初始化');
  }
  return io;
};

/**
 * 发送通用通知给指定用户
 *
 * 向用户所在的通知房间发送 notification 事件。
 *
 * @param userId - 目标用户 ID
 * @param notification - 通知内容对象
 */
export const sendNotificationToUser = (userId: string, notification: any): void => {
  try {
    getIO().to(`notifications:${userId}`).emit('notification', notification);
  } catch (err) {
    logger.warn(`WebSocket 通知发送失败 (用户 ${userId}): ${err}`);
  }
};

/**
 * 发送关注通知
 *
 * 当用户被关注时，同时发送通用通知和 follow-update 专用事件，
 * 后者用于前端实时更新关注者列表。
 *
 * @param userId - 被关注用户 ID
 * @param follower - 关注者信息对象（包含 id、username、displayName、avatarUrl）
 */
export const sendFollowNotification = (userId: string, follower: any): void => {
  const notification = {
    type: 'follow',
    title: '新关注',
    message: `${follower.displayName || follower.username} 关注了您`,
    data: { follower },
    createdAt: new Date().toISOString(),
  };
  sendNotificationToUser(userId, notification);
  // 同时发送 follow 专用事件（用于前端实时更新关注者列表）
  try {
    getIO().to(`notifications:${userId}`).emit('follow-update', {
      type: 'follow',
      follower: {
        id: follower.id,
        username: follower.username,
        displayName: follower.displayName,
        avatarUrl: follower.avatarUrl,
      },
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn(`WebSocket follow-update 发送失败: ${err}`);
  }
};

/**
 * 发送新消息通知
 *
 * 当用户收到新私信时，通过 WebSocket 推送消息内容和会话 ID。
 *
 * @param userId - 接收消息的用户 ID
 * @param message - 消息对象（包含 id、content、senderId、senderName、createdAt）
 * @param conversationId - 会话 ID
 */
export const sendNewMessageNotification = (
  userId: string,
  message: { id: string; content: string; senderId: string; senderName: string; createdAt: string },
  conversationId: string,
): void => {
  try {
    getIO().to(`notifications:${userId}`).emit('new-message', {
      conversationId,
      message: {
        id: message.id,
        content: message.content,
        senderId: message.senderId,
        senderName: message.senderName,
        createdAt: message.createdAt,
      },
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn(`WebSocket 新消息通知发送失败: ${err}`);
  }
};

/**
 * 发送未读数更新通知
 *
 * 当用户未读消息数量发生变化时，推送更新后的未读数量。
 *
 * @param userId - 目标用户 ID
 * @param unreadCount - 更新后的未读消息数
 */
export const sendUnreadCountUpdate = (userId: string, unreadCount: number): void => {
  try {
    getIO().to(`notifications:${userId}`).emit('unread-count', { unreadCount });
  } catch (err) {
    logger.warn(`WebSocket 未读数更新发送失败: ${err}`);
  }
};
