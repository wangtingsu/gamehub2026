/**
 * ============================================================
 * 邮件服务路由模块
 * ============================================================
 *
 * 本模块提供邮件服务相关的全部 API 接口，涵盖以下功能：
 *
 * 一、邮件服务监控
 *   - 健康检查（/health）：检查邮件服务的连接状态和队列状态
 *
 * 二、邮件模板管理（/templates，需管理员权限）
 *   - CRUD：创建、读取、更新、删除（软删除/硬删除）邮件模板
 *   - 搜索模板（支持按类型和活跃状态筛选）
 *   - 复制模板
 *   - 渲染模板预览
 *
 * 三、邮件发送（/send，需管理员权限）
 *   - 发送测试邮件
 *   - 批量发送邮件（最多 100 个收件人）
 *
 * 四、邮件队列管理（/queue，需管理员权限）
 *   - 获取队列状态
 *   - 清空邮件队列
 *
 * 五、公共邮件发送接口
 *   - 发送验证邮件（用于用户注册邮箱验证）
 *   - 发送密码重置邮件
 *
 * 路由前缀: /api/v1/email
 *
 * @module emailRoutes
 */

import { Router, Request, Response } from 'express';
import { emailService } from '../services/email.service';
import { emailTemplateModel } from '../models/EmailTemplate';
import { asyncHandler } from '../middlewares/error.middleware';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { rateLimitMiddleware } from '../middlewares/rateLimit.middleware';
import logger from '../utils/logger';

const router = Router();

/**
 * 整个路由模块应用速率限制中间件。
 * 限制：每 15 分钟窗口内最多 100 次请求。
 * @see rateLimitMiddleware
 */
router.use(rateLimitMiddleware({ window: 15 * 60, limit: 100 }));

/**
 * @route GET /api/v1/email/health
 * @desc 检查邮件服务健康状态
 * @access Public
 *
 * 返回邮件服务的连接状态、队列状态和模板数量等信息，
 * 用于监控和负载均衡器的健康检查。
 *
 * @response 200 - 成功返回服务状态
 *   @body {string} data.status - 服务状态（healthy / unhealthy）
 *   @body {boolean} data.connection - 邮件服务器连接是否正常
 *   @body {object} data.queue - 队列状态信息
 *   @body {number} data.templates - 模板数量
 *   @body {string} data.timestamp - 检查时间戳
 */
router.get(
  '/health',
  asyncHandler(async (req: Request, res: Response) => {
    const stats = await emailService.getStats();

    res.status(200).json({
      success: true,
      data: {
        status: stats.connection ? 'healthy' : 'unhealthy',
        connection: stats.connection,
        queue: stats.queue,
        templates: stats.templates,
        timestamp: new Date().toISOString(),
      },
      message: '邮件服务状态检查完成',
    });
  })
);

/**
 * @route GET /api/v1/email/templates
 * @desc 获取邮件模板列表
 * @access Private - 需要有效访问令牌，且角色为 admin
 *
 * 支持按模板类型、活跃状态和关键字搜索进行筛选，并支持分页。
 * 使用 authenticate 中间件验证用户身份。
 * 使用 authorize('admin') 中间件限制仅管理员可访问。
 *
 * @headers Authorization: Bearer <access_token>
 * @query {string} [type] - 按模板类型筛选
 * @query {boolean} [active] - 按活跃状态筛选
 * @query {string} [search] - 搜索关键字
 * @query {number} [page=1] - 页码
 * @query {number} [limit=20] - 每页条数
 *
 * @response 200 - 成功返回模板列表和分页信息
 *   @body {Array} data.templates - 模板列表
 *   @body {object} data.pagination - 分页信息
 * @response 401 - 未认证
 * @response 403 - 无管理员权限
 */
router.get(
  '/templates',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const { type, active, search, page = 1, limit = 20 } = req.query;

    const filters: any = {};
    if (type) filters.templateType = type as string;
    if (active !== undefined) filters.isActive = active === 'true';

    const options: any = {};
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    if (limitNum > 0) {
      options.limit = limitNum;
      options.offset = (pageNum - 1) * limitNum;
    }

    const templates = await emailTemplateModel.searchTemplates(
      search as string,
      filters,
      options
    );

    const total = await emailTemplateModel.count(
      undefined,
      undefined,
      true // 包含已删除的
    );

    res.status(200).json({
      success: true,
      data: {
        templates,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      message: '邮件模板列表获取成功',
    });
  })
);

/**
 * @route GET /api/v1/email/templates/:id
 * @desc 获取邮件模板详情
 * @access Private - 需要有效访问令牌，且角色为 admin
 *
 * @headers Authorization: Bearer <access_token>
 * @param {string} id - 路径参数，模板 ID
 *
 * @response 200 - 成功返回模板详情
 * @response 401 - 未认证
 * @response 403 - 无管理员权限
 * @response 404 - 模板不存在
 */
router.get(
  '/templates/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const template = await emailTemplateModel.findById(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: '邮件模板不存在',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        template,
      },
      message: '邮件模板详情获取成功',
    });
  })
);

/**
 * @route POST /api/v1/email/templates
 * @desc 创建邮件模板
 * @access Private - 需要有效访问令牌，且角色为 admin
 *
 * 创建邮件模板时需提供名称、模板类型、主题和正文等必填字段。
 * 模板名称必须是唯一的，不能与已有模板重名。
 * 可选字段包括描述和模板变量列表。
 *
 * @headers Authorization: Bearer <access_token>
 * @body {object}
 *   @property {string} name - 模板名称（必填且唯一）
 *   @property {string} description - 模板描述（可选）
 *   @property {string} templateType - 模板类型（必填，如 notification / verification 等）
 *   @property {string} subject - 邮件主题模板（必填）
 *   @property {string} body - 邮件正文模板（必填，支持变量占位符）
 *   @property {string[]} [variables=[]] - 模板变量列表（可选）
 *
 * @response 201 - 模板创建成功
 * @response 400 - 缺少必需字段
 * @response 401 - 未认证
 * @response 403 - 无管理员权限
 * @response 409 - 模板名称已存在
 */
router.post(
  '/templates',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      name,
      description,
      templateType,
      subject,
      body,
      variables = [],
    } = req.body;

    // 验证必需字段
    if (!name || !templateType || !subject || !body) {
      return res.status(400).json({
        success: false,
        error: '缺少必需字段: name, templateType, subject, body',
      });
    }

    // 检查模板名称是否已存在
    const existing = await emailTemplateModel.findByName(name);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: '模板名称已存在',
      });
    }

    // 创建模板
    const template = await emailTemplateModel.create({
      name,
      description,
      templateType,
      subject,
      body,
      variables,
    }, {
      userId: req.user?.id,
    });

    res.status(201).json({
      success: true,
      data: {
        template,
      },
      message: '邮件模板创建成功',
    });
  })
);

/**
 * @route PUT /api/v1/email/templates/:id
 * @desc 更新邮件模板
 * @access Private - 需要有效访问令牌，且角色为 admin
 *
 * 更新指定 ID 的邮件模板。如果更新名称，会检查是否与其他模板冲突。
 * 更新记录中会记录操作人 ID。
 *
 * @headers Authorization: Bearer <access_token>
 * @param {string} id - 路径参数，模板 ID
 * @body {object} 需要更新的字段
 *   @property {string} [name] - 模板名称（可选，更新时会检查唯一性）
 *   @property {string} [description] - 模板描述（可选）
 *   @property {string} [templateType] - 模板类型（可选）
 *   @property {string} [subject] - 邮件主题模板（可选）
 *   @property {string} [body] - 邮件正文模板（可选）
 *   @property {string[]} [variables] - 模板变量列表（可选）
 *
 * @response 200 - 模板更新成功
 * @response 401 - 未认证
 * @response 403 - 无管理员权限
 * @response 404 - 模板不存在
 * @response 409 - 更新后的模板名称与已有模板冲突
 * @response 500 - 模板更新失败
 */
router.put(
  '/templates/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    // 检查模板是否存在
    const existing = await emailTemplateModel.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: '邮件模板不存在',
      });
    }

    // 如果更新名称，检查是否与其他模板冲突
    if (updates.name && updates.name !== existing.name) {
      const nameExists = await emailTemplateModel.findByName(updates.name);
      if (nameExists) {
        return res.status(409).json({
          success: false,
          error: '模板名称已存在',
        });
      }
    }

    // 更新模板
    const updated = await emailTemplateModel.update(id, updates, {
      userId: req.user?.id,
    });

    if (!updated) {
      return res.status(500).json({
        success: false,
        error: '邮件模板更新失败',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        template: updated,
      },
      message: '邮件模板更新成功',
    });
  })
);

/**
 * @route DELETE /api/v1/email/templates/:id
 * @desc 删除邮件模板
 * @access Private - 需要有效访问令牌，且角色为 admin
 *
 * 默认执行软删除（设置 deleted_at 时间戳）。
 * 如果查询参数 hardDelete=true，则执行硬删除（从数据库永久移除）。
 *
 * @headers Authorization: Bearer <access_token>
 * @param {string} id - 路径参数，模板 ID
 * @query {boolean} [hardDelete=false] - true 为永久删除，false（默认）为软删除
 *
 * @response 200 - 模板删除成功
 * @response 401 - 未认证
 * @response 403 - 无管理员权限
 * @response 404 - 模板不存在
 * @response 500 - 模板删除失败
 */
router.delete(
  '/templates/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { hardDelete } = req.query;

    // 检查模板是否存在
    const existing = await emailTemplateModel.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: '邮件模板不存在',
      });
    }

    const deleted = await emailTemplateModel.delete(id, hardDelete === 'true');

    if (!deleted) {
      return res.status(500).json({
        success: false,
        error: '邮件模板删除失败',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id,
        deleted: true,
        hardDelete: hardDelete === 'true',
      },
      message: hardDelete === 'true' ? '邮件模板永久删除成功' : '邮件模板删除成功',
    });
  })
);

/**
 * @route POST /api/v1/email/templates/:id/duplicate
 * @desc 复制邮件模板
 * @access Private - 需要有效访问令牌，且角色为 admin
 *
 * 基于已有模板创建一个新的模板副本，需指定新模板的名称。
 *
 * @headers Authorization: Bearer <access_token>
 * @param {string} id - 路径参数，源模板 ID
 * @body {object}
 *   @property {string} newName - 新模板的名称（必填）
 *
 * @response 201 - 模板复制成功
 * @response 400 - 缺少新模板名称
 * @response 401 - 未认证
 * @response 403 - 无管理员权限
 * @response 404 - 源模板不存在或复制失败
 */
router.post(
  '/templates/:id/duplicate',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { newName } = req.body;

    if (!newName) {
      return res.status(400).json({
        success: false,
        error: '缺少新模板名称',
      });
    }

    const duplicated = await emailTemplateModel.duplicateTemplate(id, newName);

    if (!duplicated) {
      return res.status(404).json({
        success: false,
        error: '邮件模板不存在或复制失败',
      });
    }

    res.status(201).json({
      success: true,
      data: {
        template: duplicated,
      },
      message: '邮件模板复制成功',
    });
  })
);

/**
 * @route POST /api/v1/email/templates/:id/render
 * @desc 渲染邮件模板预览
 * @access Private - 需要有效访问令牌，且角色为 admin
 *
 * 使用提供的变量替换模板中的占位符，生成渲染后的邮件内容预览。
 * 用于在发送前验证模板效果。
 *
 * @headers Authorization: Bearer <access_token>
 * @param {string} id - 路径参数，模板 ID
 * @body {object}
 *   @property {object} [variables={}] - 模板变量键值对
 *
 * @response 200 - 模板渲染成功
 *   @body {object} data.rendered - 渲染后的邮件内容
 *   @body {object} data.variables - 使用的变量映射
 * @response 401 - 未认证
 * @response 403 - 无管理员权限
 * @response 404 - 模板不存在或渲染失败
 */
router.post(
  '/templates/:id/render',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { variables = {} } = req.body;

    const rendered = await emailTemplateModel.renderTemplate(id, variables);

    if (!rendered) {
      return res.status(404).json({
        success: false,
        error: '邮件模板不存在或渲染失败',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        rendered,
        variables,
      },
      message: '邮件模板渲染成功',
    });
  })
);

/**
 * @route POST /api/v1/email/send/test
 * @desc 发送测试邮件
 * @access Private - 需要有效访问令牌，且角色为 admin
 *
 * 向指定邮箱发送一封测试邮件，用于验证邮件服务和模板配置是否正确。
 *
 * @headers Authorization: Bearer <access_token>
 * @body {object}
 *   @property {string} to - 收件人邮箱地址（必填）
 *   @property {string} [templateType=notification] - 模板类型
 *   @property {string} [templateName] - 模板名称（可选，默认使用模板类型匹配）
 *   @property {object} [variables={}] - 模板变量键值对
 *
 * @response 200 - 测试邮件发送成功
 * @response 400 - 缺少收件人邮箱
 * @response 401 - 未认证
 * @response 403 - 无管理员权限
 * @response 500 - 发送失败
 */
router.post(
  '/send/test',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const { to, templateType, templateName, variables } = req.body;

    if (!to) {
      return res.status(400).json({
        success: false,
        error: '缺少收件人邮箱',
      });
    }

    const result = await emailService.sendTemplateEmail({
      to,
      templateType: templateType || 'notification',
      templateName,
      variables: variables || {},
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || '发送测试邮件失败',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        result,
      },
      message: '测试邮件发送成功',
    });
  })
);

/**
 * @route POST /api/v1/email/send/bulk
 * @desc 批量发送邮件
 * @access Private - 需要有效访问令牌，且角色为 admin
 *
 * 向多个收件人批量发送相同模板的邮件。
 * 单次批量发送的最大收件人数为 100。
 * 返回每个收件人的发送结果及汇总统计。
 *
 * @headers Authorization: Bearer <access_token>
 * @body {object}
 *   @property {string[]} recipients - 收件人邮箱地址列表（必填，最多 100 个）
 *   @property {string} templateType - 邮件模板类型（必填）
 *   @property {string} [templateName] - 模板名称（可选）
 *   @property {object} [variables={}] - 模板变量键值对
 *
 * @response 200 - 批量发送完成
 *   @body {Array} data.results - 每个收件人的发送结果
 *   @body {object} data.summary - 汇总统计（total, success, failure, successRate）
 * @response 400 - 缺少收件人列表或模板类型，或收件人数超过限制
 * @response 401 - 未认证
 * @response 403 - 无管理员权限
 */
router.post(
  '/send/bulk',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      recipients,
      templateType,
      templateName,
      variables = {},
    } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: '缺少收件人列表',
      });
    }

    if (!templateType) {
      return res.status(400).json({
        success: false,
        error: '缺少邮件模板类型',
      });
    }

    // 限制批量发送数量
    const maxRecipients = 100;
    if (recipients.length > maxRecipients) {
      return res.status(400).json({
        success: false,
        error: `收件人数量超过限制 (最多 ${maxRecipients} 个)`,
      });
    }

    // 处理批量发送
    const results = await emailService.sendBulkEmails(
      recipients,
      templateType,
      templateName
    );

    // 统计结果
    const successCount = results.filter(r => r.result.success).length;
    const failureCount = results.filter(r => !r.result.success).length;

    res.status(200).json({
      success: true,
      data: {
        results,
        summary: {
          total: results.length,
          success: successCount,
          failure: failureCount,
          successRate: results.length > 0 ? (successCount / results.length) * 100 : 0,
        },
      },
      message: `批量邮件发送完成，成功: ${successCount}, 失败: ${failureCount}`,
    });
  })
);

/**
 * @route GET /api/v1/email/queue
 * @desc 获取邮件队列状态
 * @access Private - 需要有效访问令牌，且角色为 admin
 *
 * 返回当前邮件队列的状态信息，包括待发送邮件数量、
 * 队列处理进度等。
 *
 * @headers Authorization: Bearer <access_token>
 *
 * @response 200 - 成功返回队列状态
 * @response 401 - 未认证
 * @response 403 - 无管理员权限
 */
router.get(
  '/queue',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const queueStatus = emailService.getQueueStatus();

    res.status(200).json({
      success: true,
      data: {
        queue: queueStatus,
      },
      message: '邮件队列状态获取成功',
    });
  })
);

/**
 * @route DELETE /api/v1/email/queue
 * @desc 清空邮件队列
 * @access Private - 需要有效访问令牌，且角色为 admin
 *
 * 移除当前邮件队列中所有待发送的邮件。
 * 返回被移除的邮件数量。
 *
 * @headers Authorization: Bearer <access_token>
 *
 * @response 200 - 队列已清空
 *   @body {number} data.clearedCount - 被移除的邮件数量
 * @response 401 - 未认证
 * @response 403 - 无管理员权限
 */
router.delete(
  '/queue',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const clearedCount = emailService.clearQueue();

    res.status(200).json({
      success: true,
      data: {
        clearedCount,
      },
      message: `邮件队列已清空，移除了 ${clearedCount} 封邮件`,
    });
  })
);

/**
 * @route POST /api/v1/email/verification
 * @desc 发送邮箱验证邮件（公共接口）
 * @access Public
 *
 * 用于用户注册或修改邮箱时发送验证邮件。
 * 调用者需提供收件人邮箱和验证链接。
 *
 * @body {object}
 *   @property {string} email - 收件人邮箱地址（必填）
 *   @property {string} verificationLink - 验证链接 URL（必填）
 *   @property {string} [userName] - 收件人用户名（可选，用于邮件内称呼）
 *
 * @response 200 - 验证邮件发送成功
 *   @body {string} data.email - 收件人邮箱
 *   @body {string} data.messageId - 邮件消息 ID
 * @response 400 - 缺少必需字段
 * @response 500 - 发送失败
 */
router.post(
  '/verification',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, verificationLink, userName } = req.body;

    if (!email || !verificationLink) {
      return res.status(400).json({
        success: false,
        error: '缺少必需字段: email, verificationLink',
      });
    }

    const result = await emailService.sendVerificationEmail(
      email,
      verificationLink,
      userName
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || '发送验证邮件失败',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        email,
        messageId: result.messageId,
      },
      message: '验证邮件发送成功',
    });
  })
);

/**
 * @route POST /api/v1/email/password-reset
 * @desc 发送密码重置邮件（公共接口）
 * @access Public
 *
 * 用于用户忘记密码时发送密码重置邮件。
 * 调用者需提供收件人邮箱和重置链接。
 *
 * @body {object}
 *   @property {string} email - 收件人邮箱地址（必填）
 *   @property {string} resetLink - 密码重置链接 URL（必填）
 *   @property {string} [userName] - 收件人用户名（可选，用于邮件内称呼）
 *
 * @response 200 - 密码重置邮件发送成功
 *   @body {string} data.email - 收件人邮箱
 *   @body {string} data.messageId - 邮件消息 ID
 * @response 400 - 缺少必需字段
 * @response 500 - 发送失败
 */
router.post(
  '/password-reset',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, resetLink, userName } = req.body;

    if (!email || !resetLink) {
      return res.status(400).json({
        success: false,
        error: '缺少必需字段: email, resetLink',
      });
    }

    const result = await emailService.sendPasswordResetEmail(
      email,
      resetLink,
      userName
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || '发送密码重置邮件失败',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        email,
        messageId: result.messageId,
      },
      message: '密码重置邮件发送成功',
    });
  })
);

export default router;
