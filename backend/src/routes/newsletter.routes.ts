/**
 * 新闻通讯（Newsletter）路由模块
 *
 * 本模块提供邮件订阅相关的 REST API 路由，包括：
 * - 用户订阅新闻通讯（公开接口，输入邮箱即可订阅）
 * - 用户取消订阅（通过邮箱取消）
 * - 管理员获取订阅列表（分页，支持筛选活跃订阅）
 * - 管理员获取订阅统计数据（总数、活跃数等）
 * - 管理员发送新闻通讯邮件（支持测试模式和批量发送）
 *
 * 路由前缀: /api/v1/newsletter
 * 认证策略: 订阅/取消订阅完全公开；管理后台接口需要 admin 角色认证
 */

import { Router, Request, Response } from 'express';
import { newsletterSubscriptionModel } from '../models/NewsletterSubscription';
import { emailService } from '../services/email.service';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import logger from '../utils/logger';

const router = Router();

/**
 * 邮箱格式验证函数
 * 使用正则表达式验证邮箱地址的基本格式是否正确。
 * 验证规则: 本地部分 + @ + 域名部分，不允许空格。
 *
 * @param email - 待验证的邮箱地址字符串
 * @returns {boolean} 邮箱格式合法返回 true，否则返回 false
 *
 * @example
 *   isValidEmail('user@example.com')  // true
 *   isValidEmail('not-an-email')      // false
 */
const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/**
 * @route POST /api/v1/newsletter/subscribe
 * @desc 用户通过邮箱订阅新闻通讯
 *       公开接口，无需登录。如果邮箱已经存在且处于非活跃状态，将重新激活订阅；
 *       如果已活跃订阅，则返回已订阅提示。
 *       订阅成功后会异步发送欢迎邮件（如果 SMTP 已配置）。
 * @access Public — 完全公开，无需认证
 *
 * @param {string} req.body.email - 用户邮箱地址（必填，需符合邮箱格式）
 * @param {string} [req.body.subscriptionType] - 订阅类型，可选值: 'newsletter' | 'promotional' | 'all'，默认 'newsletter'
 *
 * @returns {200} { success: true, message: '订阅成功！...' | '订阅已重新激活' | '您已经订阅过了' }
 * @returns {400} { success: false, error: '请输入有效的邮箱地址' } — 邮箱格式不正确时返回
 * @returns {500} { success: false, error: '订阅失败，请稍后重试' } — 服务器错误时返回
 *
 * @example
 *   POST /api/v1/newsletter/subscribe
 *   Body: { "email": "user@example.com", "subscriptionType": "all" }
 */
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    logger.debug('订阅请求 body:', { body: req.body, type: typeof req.body, keys: Object.keys(req.body || {}) });
    const { email, subscriptionType } = req.body;

    // 验证邮箱格式
    if (!email || !isValidEmail(email)) {
      logger.warn('邮箱验证失败:', { email, bodyString: JSON.stringify(req.body) });
      return res.status(400).json({ success: false, error: '请输入有效的邮箱地址' });
    }

    // 已登录用户使用真实 userId，否则生成访客 ID
    const userId = (req as any).user?.id || `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    // 验证并规范化订阅类型
    const type = (['newsletter', 'promotional', 'all'].includes(subscriptionType) ? subscriptionType : 'newsletter') as 'newsletter' | 'promotional' | 'all';

    // 检查邮箱是否已存在订阅记录
    const existing = await newsletterSubscriptionModel.findByEmail(email);
    if (existing) {
      if (!existing.isActive) {
        // 之前取消过订阅，重新激活
        await newsletterSubscriptionModel.subscribe({ userId: existing.userId, email: existing.email, subscriptionType: existing.subscriptionType });
        return res.json({ success: true, message: '订阅已重新激活' });
      }
      return res.json({ success: true, message: '您已经订阅过了' });
    }

    // 创建新的订阅记录
    await newsletterSubscriptionModel.subscribe({ userId, email, subscriptionType: type });

    // 异步发送欢迎邮件（如果 SMTP 服务已配置就绪）
    if (emailService.isReady()) {
      emailService.sendWelcomeEmail(email, email.split('@')[0]).catch((err) =>
        logger.warn('发送欢迎邮件失败:', err)
      );
    }

    res.json({ success: true, message: '订阅成功！我们会将最新资讯发送到您的邮箱。' });
  } catch (error) {
    logger.error('订阅失败:', error);
    res.status(500).json({ success: false, error: '订阅失败，请稍后重试' });
  }
});

/**
 * @route POST /api/v1/newsletter/unsubscribe
 * @desc 通过邮箱地址取消订阅新闻通讯
 *       公开接口，无需登录。将订阅记录标记为非活跃状态，不会物理删除记录。
 * @access Public — 完全公开，无需认证
 *
 * @param {string} req.body.email - 要取消订阅的邮箱地址（必填）
 *
 * @returns {200} { success: true, message: '取消订阅成功' | '未找到订阅信息' }
 * @returns {400} { success: false, error: '请输入有效的邮箱地址' } — 邮箱格式不正确时返回
 * @returns {500} { success: false, error: '取消订阅失败' } — 服务器错误时返回
 *
 * @example
 *   POST /api/v1/newsletter/unsubscribe
 *   Body: { "email": "user@example.com" }
 */
router.post('/unsubscribe', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, error: '请输入有效的邮箱地址' });
    }

    const subscription = await newsletterSubscriptionModel.findByEmail(email);
    if (!subscription) {
      return res.json({ success: true, message: '未找到订阅信息' });
    }

    await newsletterSubscriptionModel.unsubscribe(subscription.userId);
    res.json({ success: true, message: '取消订阅成功' });
  } catch (error) {
    logger.error('取消订阅失败:', error);
    res.status(500).json({ success: false, error: '取消订阅失败' });
  }
});

/**
 * @route GET /api/v1/newsletter/subscriptions
 * @desc 管理员获取所有订阅列表（支持分页和活跃筛选）
 * @access Private/Admin — 需要 admin 或 super_admin 角色
 *
 * @middleware authenticate - 验证用户 JWT Token
 * @middleware authorize('admin') - 验证管理员角色
 *
 * @param {number} [req.query.page=1] - 页码，最小为 1
 * @param {number} [req.query.limit=20] - 每页条数，1~100
 * @param {string} [req.query.active] - 设为 'true' 时仅返回活跃订阅
 *
 * @returns {200} {
 *   success: true,
 *   data: { items: Subscription[], total: number, page: number, limit: number, totalPages: number }
 * }
 *
 * @example
 *   GET /api/v1/newsletter/subscriptions?page=1&limit=20&active=true
 */
router.get('/subscriptions', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  try {
    // 限制分页参数的合理范围
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;
    const activeOnly = req.query.active === 'true';

    let items;
    let total: number;

    if (activeOnly) {
      // 仅获取活跃订阅者
      items = await newsletterSubscriptionModel.getActiveSubscriptions(limit, offset);
      total = (await newsletterSubscriptionModel.getSubscriptionStats()).active;
    } else {
      // 获取全部订阅者（含已取消的）
      items = await newsletterSubscriptionModel.findAll({
        limit,
        offset,
        orderBy: 'created_at',
        orderDirection: 'DESC',
      });
      total = (await newsletterSubscriptionModel.getSubscriptionStats()).total;
    }

    res.json({
      success: true,
      data: { items, total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('获取订阅列表失败:', error);
    res.status(500).json({ success: false, error: '获取订阅列表失败' });
  }
});

/**
 * @route GET /api/v1/newsletter/stats
 * @desc 管理员获取订阅统计数据
 *       返回订阅总数、活跃订阅数等统计指标。
 * @access Private/Admin — 需要 admin 或 super_admin 角色
 *
 * @middleware authenticate - 验证用户 JWT Token
 * @middleware authorize('admin') - 验证管理员角色
 *
 * @returns {200} {
 *   success: true,
 *   data: {
 *     total: number,      // 总订阅数（含已取消）
 *     active: number,     // 当前活跃订阅数
 *     ...
 *   }
 * }
 *
 * @example
 *   GET /api/v1/newsletter/stats
 *   Response: { "success": true, "data": { "total": 1000, "active": 850 } }
 */
router.get('/stats', authenticate, authorize('admin'), async (_req: Request, res: Response) => {
  try {
    const stats = await newsletterSubscriptionModel.getSubscriptionStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('获取订阅统计失败:', error);
    res.status(500).json({ success: false, error: '获取订阅统计失败' });
  }
});

/**
 * @route POST /api/v1/newsletter/send
 * @desc 管理员发送新闻通讯邮件给所有活跃订阅者
 *       支持两种模式：
 *       1. 测试模式（提供 testEmail 参数）：仅发送到指定测试邮箱
 *       2. 批量模式（不提供 testEmail）：发送给所有活跃订阅者，每批 50 封
 * @access Private/Admin — 需要 admin 或 super_admin 角色
 *
 * @middleware authenticate - 验证用户 JWT Token
 * @middleware authorize('admin') - 验证管理员角色
 *
 * @param {string} req.body.subject - 邮件主题（必填）
 * @param {string} req.body.content - 邮件正文内容（必填，支持 HTML）
 * @param {string} [req.body.testEmail] - 测试邮箱地址，提供时仅发送到此邮箱
 *
 * @returns {200} {
 *   success: true,
 *   data: { total: number, success: number, failed: number } | EmailResult,
 *   message: '...'
 * }
 * @returns {400} { success: false, error: '请提供邮件主题和内容' | '测试邮箱地址无效' }
 * @returns {500} { success: false, error: '发送新闻通讯失败' }
 *
 * @example
 *   // 测试模式
 *   POST /api/v1/newsletter/send
 *   Body: { "subject": "本月游戏资讯", "content": "<h1>资讯内容</h1>", "testEmail": "admin@example.com" }
 *
 *   // 批量发送模式
 *   POST /api/v1/newsletter/send
 *   Body: { "subject": "本月游戏资讯", "content": "<h1>资讯内容</h1>" }
 */
router.post('/send', authenticate, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const { subject, content, testEmail } = req.body;

    // 验证邮件主题和内容不为空
    if (!subject || !content) {
      return res.status(400).json({ success: false, error: '请提供邮件主题和内容' });
    }

    // 测试模式：仅发送到指定邮箱
    if (testEmail) {
      if (!isValidEmail(testEmail)) {
        return res.status(400).json({ success: false, error: '测试邮箱地址无效' });
      }
      const result = await emailService.sendNewsletterEmail(testEmail, content, subject);
      return res.json({
        success: result.success,
        message: result.success ? '测试邮件发送成功' : '测试邮件发送失败',
        data: result,
      });
    }

    // 获取所有活跃订阅者列表
    const subscribers = await newsletterSubscriptionModel.getActiveSubscriptions();
    if (subscribers.length === 0) {
      return res.json({ success: true, message: '没有活跃的订阅者' });
    }

    // 分批发送邮件，每批 50 封，避免邮件服务器过载
    const batchSize = 50;
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);
      const results = await emailService.sendBulkEmails(
        batch.map((s) => ({ email: s.email })),
        'newsletter',
        undefined
      );

      for (const r of results) {
        if (r.result.success) successCount++;
        else failedCount++;
      }
    }

    res.json({
      success: true,
      data: { total: subscribers.length, success: successCount, failed: failedCount },
      message: `发送完成: ${successCount} 成功, ${failedCount} 失败`,
    });
  } catch (error) {
    logger.error('发送新闻通讯失败:', error);
    res.status(500).json({ success: false, error: '发送新闻通讯失败' });
  }
});

export default router;
