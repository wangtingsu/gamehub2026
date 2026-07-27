/**
 * 私信路由模块
 *
 * 本模块提供用户间私信（站内信）功能的 REST API 路由，包括：
 * - 获取会话列表（分页，含未读数统计）
 * - 创建新会话或获取已存在的会话
 * - 获取单个会话详情（含消息列表，分页）
 * - 在会话中发送消息（支持回复引用）
 * - 标记会话为已读
 * - 获取未读消息总数
 * - 删除单条消息
 * - 清空会话的全部聊天记录
 *
 * 路由前缀: /api/v1/messages
 * 认证策略: 所有消息路由均需要用户登录认证（authenticate）
 */

import { Router, Request, Response } from 'express';
import { authenticate, validateRequest } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import { paginationSchema, sendMessageSchema, createConversationSchema } from '../validators';
import messageService from '../services/message.service';

const router = Router();

// ========================
// 全局中间件：所有消息路由都需要用户登录认证
// 此处的 router.use(authenticate) 会应用于下方所有路由，
// 确保每个请求的 req.user 中包含当前用户的身份信息。
// ========================
router.use(authenticate);

/**
 * @route GET /api/v1/messages/conversations
 * @desc 获取当前用户的所有会话列表
 *       返回用户的会话列表，同时附带总未读消息数，支持分页。
 * @access Private — 需要登录
 *
 * @middleware authenticate - 全局中间件，验证用户 JWT（已在文件顶部通过 router.use 注册）
 * @middleware validateRequest(paginationSchema) - 验证分页参数 page 和 limit 的格式
 *
 * @param {number} [req.query.page=1] - 页码，从 1 开始
 * @param {number} [req.query.limit=20] - 每页返回的会话数
 *
 * @returns {200} {
 *   success: true,
 *   data: {
 *     items: Conversation[],       // 会话列表
 *     unreadTotal: number,         // 所有会话的总未读数
 *     pagination: { page, limit, total, totalPages, hasNext, hasPrev }
 *   },
 *   message: '获取成功'
 * }
 *
 * @example
 *   GET /api/v1/messages/conversations?page=1&limit=20
 */
router.get(
  '/conversations',
  validateRequest(paginationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { page = 1, limit = 20 } = req.query;
    const result = await messageService.getConversations(userId, {
      page: Number(page),
      limit: Number(limit),
    });

    const totalPages = Math.ceil(result.total / result.limit);

    res.json({
      success: true,
      data: {
        items: result.items,
        unreadTotal: result.unreadTotal,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages,
          hasNext: result.page < totalPages,
          hasPrev: result.page > 1,
        },
      },
      message: '获取成功',
    });
  }),
);

/**
 * @route POST /api/v1/messages/conversations
 * @desc 创建新会话或获取已存在的会话
 *       如果两个用户之间已有会话，则直接返回已存在的会话，不会重复创建。
 * @access Private — 需要登录
 *
 * @middleware validateRequest(createConversationSchema) - 验证请求体参数格式
 *
 * @param {string} req.body.participantId - 目标参与者的用户 ID（必填）
 * @param {string} [req.body.subject] - 会话主题（可选，当前实现中未使用）
 *
 * @returns {201} { success: true, data: Conversation, message: '创建成功' }
 * @returns {400} { success: false, error: '...' } — 参数校验失败时返回
 *
 * @example
 *   POST /api/v1/messages/conversations
 *   Body: { "participantId": "user-uuid-456" }
 */
router.post(
  '/conversations',
  validateRequest(createConversationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { participantId, subject } = req.body;
    const conversation = await messageService.getOrCreateConversation(userId, participantId);
    res.status(201).json({
      success: true,
      data: conversation,
      message: '创建成功',
    });
  }),
);

/**
 * @route GET /api/v1/messages/conversations/:id
 * @desc 获取指定会话的详情，包含会话中的消息列表（分页）
 *       返回会话元数据以及该会话下的所有消息，按时间排序。
 * @access Private — 需要登录，只有会话参与者才能查看
 *
 * @middleware validateRequest(paginationSchema) - 验证分页参数格式
 *
 * @param {string} req.params.id - 会话 ID（UUID）
 * @param {number} [req.query.page=1] - 消息页码
 * @param {number} [req.query.limit=50] - 每页消息数，默认为 50
 *
 * @returns {200} {
 *   success: true,
 *   data: {
 *     conversation: Conversation,   // 会话元数据
 *     messages: Message[],          // 消息列表
 *     pagination: { page, limit, total, totalPages, hasNext, hasPrev }
 *   },
 *   message: '获取成功'
 * }
 *
 * @example
 *   GET /api/v1/messages/conversations/conv-uuid-789?page=1&limit=50
 */
router.get(
  '/conversations/:id',
  validateRequest(paginationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const result = await messageService.getConversation(id, userId, {
      page: Number(page),
      limit: Number(limit),
    });

    const totalPages = Math.ceil(result.total / result.limit);

    res.json({
      success: true,
      data: {
        conversation: result.conversation,
        messages: result.messages,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages,
          hasNext: result.page < totalPages,
          hasPrev: result.page > 1,
        },
      },
      message: '获取成功',
    });
  }),
);

/**
 * @route POST /api/v1/messages/conversations/:id/messages
 * @desc 在指定会话中发送一条消息
 *       支持回复引用（replyToId），可指定回复的目标消息。
 * @access Private — 需要登录，只有会话参与者才能发送
 *
 * @middleware validateRequest(sendMessageSchema) - 验证消息发送参数格式
 *
 * @param {string} req.params.id - 会话 ID
 * @param {string} req.body.content - 消息文本内容（必填）
 * @param {string} [req.body.replyToId] - 可选，回复的目标消息 ID，用于实现引用回复
 *
 * @returns {201} { success: true, data: Message, message: '发送成功' }
 * @returns {400} { success: false, error: '...' } — 内容为空或格式错误时返回
 *
 * @example
 *   POST /api/v1/messages/conversations/conv-uuid-789/messages
 *   Body: { "content": "你好，看到你的游戏评测了！", "replyToId": "msg-uuid-111" }
 */
router.post(
  '/conversations/:id/messages',
  validateRequest(sendMessageSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;
    const { content, replyToId } = req.body;
    const message = await messageService.sendMessage(id, userId, content, replyToId);
    res.status(201).json({
      success: true,
      data: message,
      message: '发送成功',
    });
  }),
);

/**
 * @route POST /api/v1/messages/conversations/:id/read
 * @desc 将当前用户在该会话中的所有消息标记为已读
 *       通常在前端进入会话页面时自动调用。
 * @access Private — 需要登录
 *
 * @param {string} req.params.id - 会话 ID
 *
 * @returns {200} { success: true, message: '已标记为已读' }
 *
 * @example
 *   POST /api/v1/messages/conversations/conv-uuid-789/read
 */
router.post(
  '/conversations/:id/read',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;
    await messageService.markConversationAsRead(id, userId);
    res.json({
      success: true,
      message: '已标记为已读',
    });
  }),
);

/**
 * @route GET /api/v1/messages/unread-count
 * @desc 获取当前用户所有未读消息的总数
 *       前端可用于在导航栏显示未读消息角标。
 * @access Private — 需要登录
 *
 * @returns {200} { success: true, data: { count: number }, message: '获取成功' }
 *
 * @example
 *   GET /api/v1/messages/unread-count
 *   Response: { "success": true, "data": { "count": 5 }, "message": "获取成功" }
 */
router.get(
  '/unread-count',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const count = await messageService.getUnreadCount(userId);
    res.json({
      success: true,
      data: { count },
      message: '获取成功',
    });
  }),
);

/**
 * @route DELETE /api/v1/messages/conversations/:id/messages/:messageId
 * @desc 删除指定会话中的单条消息（软删除或物理删除，取决于 service 实现）
 *       只有消息的发送者才能删除自己的消息。
 * @access Private — 需要登录
 *
 * @param {string} req.params.id - 会话 ID
 * @param {string} req.params.messageId - 要删除的消息 ID
 *
 * @returns {200} { success: true, message: '消息已删除' }
 * @returns {403} { success: false, error: '无权删除此消息' } — 非发送者尝试删除时返回
 *
 * @example
 *   DELETE /api/v1/messages/conversations/conv-uuid-789/messages/msg-uuid-111
 */
router.delete(
  '/conversations/:id/messages/:messageId',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id, messageId } = req.params;
    await messageService.deleteMessage(id, messageId, userId);
    res.json({
      success: true,
      message: '消息已删除',
    });
  }),
);

/**
 * @route DELETE /api/v1/messages/conversations/:id/clear
 * @desc 清空指定会话的全部聊天记录（删除会话中的所有消息）
 *       操作不可逆，但会话本身不会被删除，后续仍可发送新消息。
 * @access Private — 需要登录
 *
 * @param {string} req.params.id - 会话 ID
 *
 * @returns {200} { success: true, message: '聊天记录已清空' }
 *
 * @example
 *   DELETE /api/v1/messages/conversations/conv-uuid-789/clear
 */
router.delete(
  '/conversations/:id/clear',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;
    await messageService.clearConversation(id, userId);
    res.json({
      success: true,
      message: '聊天记录已清空',
    });
  }),
);

export default router;
