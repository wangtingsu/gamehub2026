/**
 * 消息服务
 *
 * 提供用户间私信（站内信）功能的完整服务层实现。
 * 支持对话管理（创建、查询、清空）、消息收发、未读计数、
 * 实时通知推送（WebSocket）等功能。
 * 数据存储基于关系型数据库，通过 conversation_participants 维护多对多对话关系。
 */
import { query, execute, transaction } from '../db';
import logger from '../utils/logger';
import type { Conversation, ConversationParticipant, Message, PaginationParams } from '../types';
import { NotFoundError } from '../middlewares/error.middleware';
import { createNotification } from './notification.service';
import { sendNewMessageNotification, sendUnreadCountUpdate } from './socket.service';

/**
 * 将数据库行映射为 Conversation 对象
 *
 * 将数据库中的 snake_case 字段转换为前端使用的 camelCase 格式，
 * 并对日期字符串进行 Date 对象转换。
 *
 * @param row - 数据库查询结果行
 * @returns 标准化的 Conversation 对象
 */
const mapConversation = (row: any): Conversation => ({
  id: row.id.toString(),
  subject: row.subject || undefined,
  type: row.type,
  lastMessageAt: row.last_message_at ? new Date(row.last_message_at) : undefined,
  lastMessagePreview: row.last_message_preview || undefined,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
  deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
  version: row.version || 1,
});

/**
 * 将数据库行映射为 ConversationParticipant 对象
 *
 * @param row - 数据库查询结果行
 * @returns 标准化的对话参与者对象
 */
const mapParticipant = (row: any): ConversationParticipant => ({
  id: row.id.toString(),
  conversationId: row.conversation_id.toString(),
  userId: row.user_id.toString(),
  lastReadAt: new Date(row.last_read_at),
  isMuted: Boolean(row.is_muted),
  leftAt: row.left_at ? new Date(row.left_at) : undefined,
  joinedAt: new Date(row.joined_at),
  createdAt: new Date(row.created_at),
});

/**
 * 将数据库行映射为 Message 对象
 *
 * @param row - 数据库查询结果行
 * @returns 标准化的消息对象
 */
const mapMessage = (row: any): Message => ({
  id: row.id.toString(),
  conversationId: row.conversation_id.toString(),
  senderId: row.sender_id.toString(),
  content: row.content,
  messageType: row.message_type,
  replyToId: row.reply_to_id ? row.reply_to_id.toString() : undefined,
  createdAt: new Date(row.created_at),
  deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
  version: row.version || 1,
});

/**
 * 获取用户的会话列表
 *
 * 分页获取当前用户参与的所有未离开对话，包含每个对话的最后一条消息预览。
 * 同时返回未读消息总数，用于在 UI 上展示未读角标。
 *
 * @param userId - 当前用户 ID
 * @param pagination - 分页参数（page 默认 1，limit 默认 20）
 * @returns 会话列表及元数据，包含：
 *   - items: 会话数组（含参与者和未读数）
 *   - total: 总会话数
 *   - unreadTotal: 所有对话的未读消息总数
 *   - page/limit: 当前分页参数
 */
export const getConversations = async (
  userId: string,
  pagination: PaginationParams = {},
): Promise<{ items: Conversation[]; total: number; unreadTotal: number; page: number; limit: number }> => {
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;

  // 获取用户参与的会话总数
  const countResult = await query(
    `SELECT COUNT(*) as total FROM conversation_participants cp
     JOIN conversations c ON cp.conversation_id = c.id
     WHERE cp.user_id = ? AND cp.left_at IS NULL AND c.deleted_at IS NULL`,
    [userId],
  );
  const total = parseInt(countResult[0]?.total || '0');

  // 获取未读消息总数（排除自己发送的消息）
  const unreadResult = await query(
    `SELECT COUNT(*) as total FROM messages m
     JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id AND cp.user_id = ?
     WHERE m.sender_id != ? AND cp.left_at IS NULL AND m.created_at > cp.last_read_at AND m.deleted_at IS NULL`,
    [userId, userId],
  );
  const unreadTotal = parseInt(unreadResult[0]?.total || '0');

  // 获取会话列表（含最后一条消息预览和未读计数）
  const rows = await query(
    `SELECT c.*,
            (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != ? AND m.created_at > cp.last_read_at AND m.deleted_at IS NULL) as unread_count
     FROM conversations c
     JOIN conversation_participants cp ON cp.conversation_id = c.id
     WHERE cp.user_id = ? AND cp.left_at IS NULL AND c.deleted_at IS NULL
     ORDER BY c.last_message_at DESC, c.updated_at DESC
     LIMIT ? OFFSET ?`,
    [userId, userId, limit, offset],
  );

  // 为每个会话填充参与者信息
  const items = await Promise.all(rows.map(async (row: any) => {
    const conv = mapConversation(row);
    conv.unreadCount = parseInt(row.unread_count || '0');

    // 获取该会话的参与者详细信息（用户名、头像等）
    const participants = await query(
      `SELECT cp.*, u.username, u.display_name, u.avatar_url
       FROM conversation_participants cp
       JOIN users u ON cp.user_id = u.id
       WHERE cp.conversation_id = ? AND cp.left_at IS NULL`,
      [row.id],
    );
    conv.participants = participants.map((p: any) => ({
      ...mapParticipant(p),
      username: p.username,
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
    }));

    return conv;
  }));

  return { items, total, unreadTotal, page, limit };
};

/**
 * 获取或创建一对一对话
 *
 * 在两个用户之间查找已有的直接对话，如果不存在则创建新的。
 * 不允许用户与自己创建对话。
 *
 * @param userId1 - 用户 A 的 ID
 * @param userId2 - 用户 B 的 ID
 * @returns 已有的或新创建的 Conversation 对象
 * @throws 当 userId1 与 userId2 相同时抛出错误
 */
export const getOrCreateConversation = async (userId1: string, userId2: string): Promise<Conversation> => {
  if (userId1 === userId2) {
    throw new Error('不能与自己创建对话');
  }

  // 查找现有的一对一对话：type 为 direct，且仅包含这两个参与者
  const existing = await query(
    `SELECT c.id FROM conversations c
     WHERE c.type = 'direct' AND c.deleted_at IS NULL
     AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = c.id AND user_id = ? AND left_at IS NULL)
     AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = c.id AND user_id = ? AND left_at IS NULL)
     AND (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = c.id AND left_at IS NULL) = 2`,
    [userId1, userId2],
  );

  // 如果找到现有对话则直接返回
  if (existing.length > 0) {
    const rows = await query('SELECT * FROM conversations WHERE id = ?', [existing[0].id]);
    return mapConversation(rows[0]);
  }

  // 创建新对话（在事务中同时创建对话和参与者记录）
  return await transaction(async () => {
    const result = await execute(
      `INSERT INTO conversations (type, created_at, updated_at) VALUES ('direct', ?, ?)`,
      [new Date().toISOString(), new Date().toISOString()],
    );
    const convId = result.lastInsertRowid;

    // 添加双方参与者，初始化已读时间为当前时间
    const now = new Date().toISOString();
    await execute(
      `INSERT INTO conversation_participants (conversation_id, user_id, last_read_at, joined_at) VALUES (?, ?, ?, ?)`,
      [convId, userId1, now, now],
    );
    await execute(
      `INSERT INTO conversation_participants (conversation_id, user_id, last_read_at, joined_at) VALUES (?, ?, ?, ?)`,
      [convId, userId2, now, now],
    );

    const convRows = await query('SELECT * FROM conversations WHERE id = ?', [convId]);
    logger.info(`新对话已创建: id=${convId}, users=${userId1},${userId2}`);
    return mapConversation(convRows[0]);
  });
};

/**
 * 创建新的对话（指定参与者列表）
 *
 * 支持创建直接对话（两人）和群组对话（三人及以上）。
 * 根据参与者数量自动判断对话类型。
 *
 * @param participantIds - 参与者用户 ID 列表（至少 2 人）
 * @param subject - 对话主题（可选）
 * @returns 新创建的 Conversation 对象
 * @throws 当参与者少于 2 人时抛出错误
 */
export const createConversation = async (
  participantIds: string[],
  subject?: string,
): Promise<Conversation> => {
  if (participantIds.length < 2) {
    throw new Error('对话至少需要 2 名参与者');
  }

  return await transaction(async () => {
    const now = new Date().toISOString();
    // 两人对话为 direct，多人对话为 group
    const result = await execute(
      `INSERT INTO conversations (subject, type, created_at, updated_at) VALUES (?, ?, ?, ?)`,
      [subject || null, participantIds.length === 2 ? 'direct' : 'group', now, now],
    );
    const convId = result.lastInsertRowid;

    // 逐个添加参与者
    for (const userId of participantIds) {
      await execute(
        `INSERT INTO conversation_participants (conversation_id, user_id, last_read_at, joined_at) VALUES (?, ?, ?, ?)`,
        [convId, userId, now, now],
      );
    }

    const convRows = await query('SELECT * FROM conversations WHERE id = ?', [convId]);
    logger.info(`新对话已创建: id=${convId}, participants=${participantIds.length}`);
    return mapConversation(convRows[0]);
  });
};

/**
 * 获取会话详情（含消息列表）
 *
 * 返回指定对话的详细信息、参与者列表和分页消息记录。
 * 消息按创建时间倒序排列，然后反转为正序显示。
 *
 * @param conversationId - 对话 ID
 * @param userId - 当前用户 ID（用于权限验证）
 * @param pagination - 分页参数（page 默认 1，limit 默认 50）
 * @returns 对话详情、消息分页数据和参与者信息
 * @throws 当用户不是参与者或对话不存在时抛出 NotFoundError
 */
export const getConversation = async (
  conversationId: string,
  userId: string,
  pagination: PaginationParams = {},
): Promise<{ conversation: Conversation; messages: Message[]; total: number; page: number; limit: number }> => {
  // 验证用户是该对话的参与者且未离开
  const participant = await query(
    `SELECT * FROM conversation_participants WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL`,
    [conversationId, userId],
  );
  if (participant.length === 0) {
    throw new NotFoundError('对话不存在或无权访问');
  }

  // 验证对话存在且未被删除
  const convRows = await query('SELECT * FROM conversations WHERE id = ? AND deleted_at IS NULL', [conversationId]);
  if (convRows.length === 0) {
    throw new NotFoundError('对话不存在');
  }

  // 获取所有参与者详细信息
  const participants = await query(
    `SELECT cp.*, u.username, u.display_name, u.avatar_url
     FROM conversation_participants cp
     JOIN users u ON cp.user_id = u.id
     WHERE cp.conversation_id = ? AND cp.left_at IS NULL`,
    [conversationId],
  );

  const conversation: Conversation = {
    ...mapConversation(convRows[0]),
    participants: participants.map((p: any) => ({
      ...mapParticipant(p),
      username: p.username,
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
    })),
    unreadCount: 0,
  };

  // 分页获取消息记录
  const { page = 1, limit = 50 } = pagination;
  const offset = (page - 1) * limit;

  const countResult = await query(
    'SELECT COUNT(*) as total FROM messages WHERE conversation_id = ? AND deleted_at IS NULL',
    [conversationId],
  );
  const total = parseInt(countResult[0]?.total || '0');

  // 查询时倒序取最新的消息，返回前反转为正序
  const msgRows = await query(
    `SELECT * FROM messages WHERE conversation_id = ? AND deleted_at IS NULL
     ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [conversationId, limit, offset],
  );
  const messages = msgRows.reverse().map(mapMessage);

  return { conversation, messages, total, page, limit };
};

/**
 * 发送消息
 *
 * 在指定对话中发送一条消息，支持回复引用（replyToId）。
 * 发送成功后更新对话的最后消息预览、发送者的已读时间，
 * 并通过 WebSocket 向其他参与者推送实时通知和未读计数更新。
 *
 * @param conversationId - 目标对话 ID
 * @param senderId - 发送者用户 ID
 * @param content - 消息正文
 * @param replyToId - 被回复的消息 ID（可选，用于回复引用）
 * @returns 创建成功的 Message 对象
 * @throws 当用户不是参与者时抛出 NotFoundError
 * @throws 当消息内容为空时抛出错误
 */
export const sendMessage = async (
  conversationId: string,
  senderId: string,
  content: string,
  replyToId?: string,
): Promise<Message> => {
  // 验证用户是对话的参与者
  const participant = await query(
    `SELECT * FROM conversation_participants WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL`,
    [conversationId, senderId],
  );
  if (participant.length === 0) {
    throw new NotFoundError('对话不存在或无权发送消息');
  }

  // 验证消息内容非空
  if (!content || content.trim().length === 0) {
    throw new Error('消息内容不能为空');
  }

  let message!: Message;

  // 在事务中执行消息写入和相关更新
  await transaction(async () => {
    const now = new Date().toISOString();

    // 插入消息记录
    const result = await execute(
      `INSERT INTO messages (conversation_id, sender_id, content, reply_to_id, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [conversationId, senderId, content.trim(), replyToId || null, now],
    );

    // 更新对话的最后消息预览（超过 100 字截断）
    const preview = content.trim().length > 100 ? content.trim().substring(0, 100) + '...' : content.trim();
    await execute(
      `UPDATE conversations SET last_message_at = ?, last_message_preview = ?, updated_at = ? WHERE id = ?`,
      [now, preview, now, conversationId],
    );

    // 发送者已读当前对话的所有消息
    await execute(
      `UPDATE conversation_participants SET last_read_at = ? WHERE conversation_id = ? AND user_id = ?`,
      [now, conversationId, senderId],
    );

    const msgRows = await query('SELECT * FROM messages WHERE id = ?', [result.lastInsertRowid]);
    message = mapMessage(msgRows[0]);
  });

  // 事务外发送通知（避免嵌套事务问题）
  try {
    // 获取除发送者外的其他参与者
    const otherParticipants = await query(
      `SELECT user_id FROM conversation_participants WHERE conversation_id = ? AND user_id != ? AND left_at IS NULL`,
      [conversationId, senderId],
    );

    // 获取发送者的显示名称
    const senderInfo = await query(
      'SELECT display_name, username FROM users WHERE id = ?',
      [senderId],
    );
    const senderName = senderInfo[0]?.display_name || senderInfo[0]?.username || '用户';
    const preview = message.content.length > 100 ? message.content.substring(0, 100) + '...' : message.content;

    // 逐个通知其他参与者
    for (const p of otherParticipants) {
      const participantUserId = p.user_id.toString();
      try {
        // 创建站内通知
        await createNotification({
          userId: participantUserId,
          type: 'new_message',
          title: '新消息',
          message: `${senderName}: ${preview}`,
          data: {
            conversationId,
            senderId,
            senderName,
            preview,
          },
        });

        // WebSocket 实时推送新消息到在线用户
        sendNewMessageNotification(
          participantUserId,
          {
            id: message.id,
            content: message.content,
            senderId,
            senderName,
            createdAt: message.createdAt.toISOString(),
          },
          conversationId,
        );

        // 推送未读消息计数更新
        const unreadResult = await query(
          `SELECT COUNT(*) as total FROM messages m
           JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id AND cp.user_id = ?
           WHERE m.sender_id != ? AND cp.left_at IS NULL AND m.created_at > cp.last_read_at AND m.deleted_at IS NULL`,
          [participantUserId, senderId],
        );
        const unreadCount = parseInt(unreadResult[0]?.total || '0');
        sendUnreadCountUpdate(participantUserId, unreadCount);
      } catch (err) {
        logger.error(`发送新消息通知失败: userId=${participantUserId}, conv=${conversationId}`, err);
      }
    }
  } catch (err) {
    logger.error(`发送消息通知失败: ${err}`);
  }

  logger.info(`消息已发送: convId=${conversationId}, senderId=${senderId}`);
  return message!;
};

/**
 * 标记对话为已读
 *
 * 将用户在指定对话中的最后阅读时间更新为当前时间，
 * 用于计算未读消息数量。
 *
 * @param conversationId - 对话 ID
 * @param userId - 当前用户 ID
 */
export const markConversationAsRead = async (conversationId: string, userId: string): Promise<void> => {
  const now = new Date().toISOString();
  await execute(
    `UPDATE conversation_participants SET last_read_at = ? WHERE conversation_id = ? AND user_id = ?`,
    [now, conversationId, userId],
  );
};

/**
 * 删除单条消息（软删除）
 *
 * 仅允许发送者删除自己的消息。删除操作为软删除，
 * 将 deleted_at 字段设置为当前时间，数据仍保留在数据库中。
 *
 * @param conversationId - 消息所在对话 ID
 * @param messageId - 要删除的消息 ID
 * @param userId - 请求删除的用户 ID（必须是发送者）
 * @throws 当用户不是参与者时抛出 NotFoundError
 * @throws 当消息不存在或用户无权删除时抛出 NotFoundError
 */
export const deleteMessage = async (conversationId: string, messageId: string, userId: string): Promise<void> => {
  // 验证用户是对话的参与者
  const participant = await query(
    `SELECT * FROM conversation_participants WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL`,
    [conversationId, userId],
  );
  if (participant.length === 0) {
    throw new NotFoundError('对话不存在或无权操作');
  }

  // 验证消息存在且属于当前用户（仅发送者可删除）
  const message = await query(
    `SELECT * FROM messages WHERE id = ? AND conversation_id = ? AND sender_id = ? AND deleted_at IS NULL`,
    [messageId, conversationId, userId],
  );
  if (message.length === 0) {
    throw new NotFoundError('消息不存在或无权删除');
  }

  // 执行软删除
  const now = new Date().toISOString();
  await execute(
    `UPDATE messages SET deleted_at = ? WHERE id = ?`,
    [now, messageId],
  );

  logger.info(`消息已删除: messageId=${messageId}, conversationId=${conversationId}, userId=${userId}`);
};

/**
 * 清空聊天记录（软删除）
 *
 * 将指定对话中的所有消息进行软删除，同时清除对话的最后消息预览。
 * 仅对话参与者可执行此操作。
 *
 * @param conversationId - 对话 ID
 * @param userId - 请求操作的用户 ID（必须是参与者）
 * @throws 当用户不是参与者时抛出 NotFoundError
 */
export const clearConversation = async (conversationId: string, userId: string): Promise<void> => {
  // 验证用户是对话的参与者
  const participant = await query(
    `SELECT * FROM conversation_participants WHERE conversation_id = ? AND user_id = ? AND left_at IS NULL`,
    [conversationId, userId],
  );
  if (participant.length === 0) {
    throw new NotFoundError('对话不存在或无权操作');
  }

  // 软删除该对话所有未删除的消息
  const now = new Date().toISOString();
  await execute(
    `UPDATE messages SET deleted_at = ? WHERE conversation_id = ? AND deleted_at IS NULL`,
    [now, conversationId],
  );

  // 清空对话的最后消息预览
  await execute(
    `UPDATE conversations SET last_message_at = NULL, last_message_preview = NULL, updated_at = ? WHERE id = ?`,
    [now, conversationId],
  );

  logger.info(`聊天记录已清空: conversationId=${conversationId}, userId=${userId}`);
};

/**
 * 获取用户未读消息总数
 *
 * 统计所有对话中未被当前用户阅读的消息数量。
 * 排除自己发送的消息，基于用户上次阅读时间计算。
 *
 * @param userId - 用户 ID
 * @returns 未读消息总数
 */
export const getUnreadCount = async (userId: string): Promise<number> => {
  const result = await query(
    `SELECT COUNT(*) as total FROM messages m
     JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id AND cp.user_id = ?
     WHERE m.sender_id != ? AND cp.left_at IS NULL AND m.created_at > cp.last_read_at AND m.deleted_at IS NULL`,
    [userId, userId],
  );
  return parseInt(result[0]?.total || '0');
};

export default {
  getConversations,
  getOrCreateConversation,
  createConversation,
  getConversation,
  sendMessage,
  markConversationAsRead,
  getUnreadCount,
  deleteMessage,
  clearConversation,
};
