/**
 * 邮件服务
 * 提供邮件发送、模板渲染、队列重试、批量发送等功能
 * 支持测试模式（捕获邮件到文件）和生产模式（SMTP发送）
 * 支持基于配置的指数退避重试策略
 */

import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import fs from 'fs';
import path from 'path';
import config from '../config';
import logger from '../utils/logger';
import { emailTemplateModel } from '../models/EmailTemplate';
import { NotFoundError, InternalServerError, BadRequestError } from '../middlewares/error.middleware';

/**
 * 邮件发送选项接口
 * 定义单次邮件发送的完整参数
 */
export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: string | Buffer;
    contentType?: string;
  }>;
  headers?: Record<string, string>;
}

/**
 * 模板邮件发送选项接口
 * 使用预定义的邮件模板，支持变量替换后发送
 */
export interface TemplateEmailOptions {
  to: string | string[];
  templateType: 'verification' | 'welcome' | 'password_reset' | 'newsletter' | 'promotional' | 'notification';
  templateName?: string;
  variables?: Record<string, string>;
  attachments?: EmailOptions['attachments'];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

/**
 * 邮件发送结果接口
 * 标识发送成功或失败，附带详细信息
 */
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  response?: string;
}

/**
 * 邮件队列项接口
 * 存储待重试的邮件及其发送状态
 */
export interface EmailQueueItem {
  id: string;
  options: EmailOptions;
  attempts: number;
  maxAttempts: number;
  lastAttempt?: Date;
  nextAttempt?: Date;
}

/**
 * 邮件服务类
 * 封装了 nodemailer 的邮件发送逻辑，提供模板渲染、队列重试、批量发送等功能。
 * 支持测试模式（jsonTransport）和生产模式（SMTP）。
 * 队列模式下使用指数退避策略进行重试。
 */
class EmailService {
  private transporter: Transporter | null = null;
  private isInitialized = false;
  private queue: EmailQueueItem[] = [];
  private isProcessingQueue = false;
  private readonly maxQueueSize = 1000;

  constructor() {
    this.initialize();
  }

  /**
   * 初始化邮件传输器
   * 根据配置创建 nodemailer Transporter 实例。
   * 测试模式下使用 jsonTransport 将邮件捕获到文件；
   * 生产模式下使用 SMTP 配置并验证连接可用性。
   */
  private async initialize(): Promise<void> {
    try {
      if (config.email.test.enabled) {
        // 测试模式：将邮件记录到文件
        this.transporter = nodemailer.createTransport({
          jsonTransport: config.email.test.captureToFile,
        } as any);
        logger.info('邮件服务运行在测试模式');
      } else {
        // 生产模式：使用SMTP
        this.transporter = nodemailer.createTransport({
          host: config.email.host,
          port: config.email.port,
          secure: config.email.secure,
          auth: {
            user: config.email.user,
            pass: config.email.password,
          },
          // 连接池选项
          pool: config.email.queue.enabled,
          maxConnections: config.email.queue.enabled ? config.email.queue.concurrency : 1,
          maxMessages: config.email.queue.enabled ? 100 : 1,
        } as any);

        // 验证连接
        await this.transporter.verify();
        logger.info('邮件服务初始化成功');
      }

      this.isInitialized = true;
    } catch (error) {
      logger.error('邮件服务初始化失败:', error);
      this.isInitialized = false;
    }
  }

  /**
   * 检查邮件服务是否已就绪
   * @returns 如果传输器已初始化且可用则返回 true
   */
  public isReady(): boolean {
    return this.isInitialized && this.transporter !== null;
  }

  /**
   * 获取邮件传输器当前状态
   * @returns 包含初始化状态、测试模式开关、队列启用状态及队列大小的状态对象
   */
  public getStatus(): {
    initialized: boolean;
    testMode: boolean;
    queueEnabled: boolean;
    queueSize: number;
  } {
    return {
      initialized: this.isInitialized,
      testMode: config.email.test.enabled,
      queueEnabled: config.email.queue.enabled,
      queueSize: this.queue.length,
    };
  }

  /**
   * 发送邮件（基础方法）
   * 组装邮件选项（发件人、收件人、主题、正文、附件等）并调用 nodemailer 发送。
   * 若配置了队列模式且发送失败，自动将邮件加入重试队列。
   * @param options - 邮件发送选项，包含收件人、主题、HTML正文等
   * @returns 邮件发送结果，包含成功状态和消息ID
   * @throws InternalServerError - 邮件服务未初始化时抛出
   */
  public async sendEmail(options: EmailOptions): Promise<EmailSendResult> {
    try {
      if (!this.isReady()) {
        throw new InternalServerError('邮件服务未初始化');
      }

      // 准备邮件选项
      const mailOptions: SendMailOptions = {
        from: config.email.fromName
          ? `${config.email.fromName} <${config.email.from}>`
          : config.email.from,
        to: Array.isArray(options.to) ? options.to.join(',') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(',') : options.cc) : undefined,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(',') : options.bcc) : undefined,
        replyTo: options.replyTo || config.email.replyTo,
        attachments: options.attachments,
        headers: options.headers,
      };

      // 发送邮件
      const info = await this.transporter!.sendMail(mailOptions);

      // 测试模式：记录到文件
      if (config.email.test.enabled && config.email.test.captureToFile) {
        this.captureEmailToFile(mailOptions, info);
      }

      logger.info(`邮件发送成功: ${info.messageId}`, {
        to: options.to,
        subject: options.subject,
      });

      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('发送邮件失败:', error);

      // 如果是队列模式，将邮件加入队列重试
      if (config.email.queue.enabled && config.email.retry.maxAttempts > 0) {
        const queueItem: EmailQueueItem = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          options,
          attempts: 0,
          maxAttempts: config.email.retry.maxAttempts,
        };
        this.addToQueue(queueItem);
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 使用模板发送邮件
   * 从数据库中查找指定类型的邮件模板，渲染模板中的变量，然后发送。
   * 若指定了模板名称则优先使用，否则使用默认模板。
   * @param options - 模板邮件选项，包含收件人、模板类型和变量
   * @returns 邮件发送结果
   * @throws NotFoundError - 未找到指定类型的模板时抛出
   * @throws InternalServerError - 模板渲染失败时抛出
   */
  public async sendTemplateEmail(options: TemplateEmailOptions): Promise<EmailSendResult> {
    try {
      // 查找邮件模板
      const templates = await emailTemplateModel.findByType(options.templateType, true);

      if (templates.length === 0) {
        throw new NotFoundError(`未找到 ${options.templateType} 类型的邮件模板`);
      }

      // 如果指定了模板名称，使用该模板；否则使用第一个模板
      let template = templates[0];
      if (options.templateName) {
        const namedTemplate = templates.find(t => t.name === options.templateName);
        if (namedTemplate) {
          template = namedTemplate;
        } else {
          logger.warn(`未找到模板 "${options.templateName}"，使用默认模板`);
        }
      }

      // 渲染模板
      const rendered = await emailTemplateModel.renderTemplate(
        template.id,
        options.variables || {}
      );

      if (!rendered) {
        throw new InternalServerError('邮件模板渲染失败');
      }

      // 验证变量（可选）
      const validation = await emailTemplateModel.validateVariables(
        template.id,
        options.variables || {}
      );

      if (!validation.valid) {
        logger.warn(`邮件模板变量验证失败: missing=${validation.missing.join(',')}, extra=${validation.extra.join(',')}`);
      }

      // 发送邮件
      return this.sendEmail({
        to: options.to,
        subject: rendered.subject,
        html: rendered.body,
        attachments: options.attachments,
        cc: options.cc,
        bcc: options.bcc,
        replyTo: options.replyTo,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('发送模板邮件失败:', error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 发送验证邮件
   * 使用 'verification' 模板发送邮箱验证链接。
   * @param to - 收件人邮箱地址
   * @param verificationLink - 验证链接
   * @param userName - 收件人用户名（可选）
   * @returns 邮件发送结果
   */
  public async sendVerificationEmail(to: string, verificationLink: string, userName?: string): Promise<EmailSendResult> {
    return this.sendTemplateEmail({
      to,
      templateType: 'verification',
      variables: {
        userName: userName || '用户',
        verificationLink,
        year: new Date().getFullYear().toString(),
      },
    });
  }

  /**
   * 发送欢迎邮件
   * 使用 'welcome' 模板向新注册用户发送欢迎邮件。
   * @param to - 收件人邮箱地址
   * @param userName - 用户名称
   * @returns 邮件发送结果
   */
  public async sendWelcomeEmail(to: string, userName: string): Promise<EmailSendResult> {
    return this.sendTemplateEmail({
      to,
      templateType: 'welcome',
      variables: {
        userName,
        year: new Date().getFullYear().toString(),
      },
    });
  }

  /**
   * 发送密码重置邮件
   * 使用 'password_reset' 模板发送密码重置链接。
   * @param to - 收件人邮箱地址
   * @param resetLink - 密码重置链接
   * @param userName - 收件人用户名（可选）
   * @returns 邮件发送结果
   */
  public async sendPasswordResetEmail(to: string, resetLink: string, userName?: string): Promise<EmailSendResult> {
    return this.sendTemplateEmail({
      to,
      templateType: 'password_reset',
      variables: {
        userName: userName || '用户',
        resetLink,
        year: new Date().getFullYear().toString(),
      },
    });
  }

  /**
   * 发送新闻通讯
   * 使用 'newsletter' 模板向订阅用户发送新闻通讯内容。
   * @param to - 收件人邮箱地址（单个或数组）
   * @param newsletterContent - 新闻通讯正文内容
   * @param subject - 邮件主题（可选，会覆盖模板主题）
   * @param variables - 额外的模板变量（可选）
   * @returns 邮件发送结果
   */
  public async sendNewsletterEmail(
    to: string | string[],
    newsletterContent: string,
    subject?: string,
    variables?: Record<string, string>
  ): Promise<EmailSendResult> {
    const templateVars = {
      content: newsletterContent,
      year: new Date().getFullYear().toString(),
      ...variables,
    };

    return this.sendTemplateEmail({
      to,
      templateType: 'newsletter',
      variables: templateVars,
    });
  }

  /**
   * 发送营销邮件
   * 使用 'promotional' 模板发送推广内容，包含标题、描述、CTA按钮和图片等。
   * @param to - 收件人邮箱地址（单个或数组）
   * @param promotionData - 营销数据，包含标题、描述、CTA链接文本和图片URL
   * @param variables - 额外的模板变量（可选）
   * @returns 邮件发送结果
   */
  public async sendPromotionalEmail(
    to: string | string[],
    promotionData: {
      title: string;
      description: string;
      ctaLink?: string;
      ctaText?: string;
      imageUrl?: string;
    },
    variables?: Record<string, string>
  ): Promise<EmailSendResult> {
    const templateVars = {
      promotionTitle: promotionData.title,
      promotionDescription: promotionData.description,
      ctaLink: promotionData.ctaLink || '#',
      ctaText: promotionData.ctaText || '了解更多',
      imageUrl: promotionData.imageUrl || '',
      year: new Date().getFullYear().toString(),
      ...variables,
    };

    return this.sendTemplateEmail({
      to,
      templateType: 'promotional',
      variables: templateVars,
    });
  }

  /**
   * 发送通知邮件
   * 使用 'notification' 模板向用户发送通知消息，包含标题、消息正文和操作链接。
   * @param to - 收件人邮箱地址（单个或数组）
   * @param notification - 通知数据，包含标题、消息内容和操作链接
   * @param variables - 额外的模板变量（可选）
   * @returns 邮件发送结果
   */
  public async sendNotificationEmail(
    to: string | string[],
    notification: {
      title: string;
      message: string;
      actionLink?: string;
      actionText?: string;
    },
    variables?: Record<string, string>
  ): Promise<EmailSendResult> {
    const templateVars = {
      notificationTitle: notification.title,
      notificationMessage: notification.message,
      actionLink: notification.actionLink || '#',
      actionText: notification.actionText || '查看详情',
      year: new Date().getFullYear().toString(),
      ...variables,
    };

    return this.sendTemplateEmail({
      to,
      templateType: 'notification',
      variables: templateVars,
    });
  }

  /**
   * 批量发送邮件
   * 遍历收件人列表，逐一向每个收件人发送模板邮件，返回每封邮件的发送结果。
   * 注意：当前为顺序发送，大批量场景下会有性能开销。
   * @param recipients - 收件人列表，每个包含邮箱和可选的自定义模板变量
   * @param templateType - 使用的邮件模板类型
   * @param templateName - 使用的模板名称（可选）
   * @returns 每封邮件的发送结果数组
   */
  public async sendBulkEmails(
    recipients: Array<{ email: string; variables?: Record<string, string> }>,
    templateType: TemplateEmailOptions['templateType'],
    templateName?: string
  ): Promise<Array<{ email: string; result: EmailSendResult }>> {
    const results: Array<{ email: string; result: EmailSendResult }> = [];

    for (const recipient of recipients) {
      try {
        const result = await this.sendTemplateEmail({
          to: recipient.email,
          templateType,
          templateName,
          variables: recipient.variables,
        });
        results.push({ email: recipient.email, result });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          email: recipient.email,
          result: {
            success: false,
            error: errorMessage,
          },
        });
      }
    }

    return results;
  }

  /**
   * 添加邮件到重试队列
   * 若队列已满（超过 maxQueueSize），移除最旧的邮件。
   * 若队列处理器未运行，自动启动。
   * @param item - 邮件队列项，包含发送选项和重试配置
   */
  private addToQueue(item: EmailQueueItem): void {
    if (this.queue.length >= this.maxQueueSize) {
      logger.warn('邮件队列已满，丢弃最旧的邮件');
      this.queue.shift(); // 移除最旧的邮件
    }

    item.nextAttempt = new Date(Date.now() + config.email.retry.delay);
    this.queue.push(item);
    logger.debug(`邮件已添加到队列: ${item.id}, 队列大小: ${this.queue.length}`);

    // 启动队列处理（如果未运行）
    if (!this.isProcessingQueue) {
      this.processQueue();
    }
  }

  /**
   * 处理邮件重试队列
   * 遍历到期需重试的邮件，逐一尝试发送。
   * 发送成功则移出队列；失败则使用指数退避策略（delay * 2^(attempts-1)）安排下次重试。
   * 达到最大重试次数后移出队列并记录错误日志。
   * 若队列仍有待处理邮件，则在 5 秒后再次触发处理。
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.queue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      const now = new Date();
      const itemsToProcess = this.queue.filter(
        item => !item.nextAttempt || item.nextAttempt <= now
      );

      for (const item of itemsToProcess) {
        try {
          // 发送邮件
          const result = await this.sendEmail(item.options);

          if (result.success) {
            // 从队列中移除成功发送的邮件
            this.queue = this.queue.filter(qItem => qItem.id !== item.id);
            logger.info(`队列邮件发送成功: ${item.id}`);
          } else {
            // 发送失败，增加重试计数
            item.attempts++;
            item.lastAttempt = new Date();

            if (item.attempts >= item.maxAttempts) {
              // 达到最大重试次数，从队列中移除
              this.queue = this.queue.filter(qItem => qItem.id !== item.id);
              logger.error(`队列邮件达到最大重试次数: ${item.id}`, {
                attempts: item.attempts,
                error: result.error,
              });
            } else {
              // 安排下次重试
              const delay = config.email.retry.delay * Math.pow(2, item.attempts - 1); // 指数退避
              item.nextAttempt = new Date(Date.now() + delay);
              logger.warn(`队列邮件发送失败，安排重试: ${item.id}`, {
                attempt: item.attempts,
                nextAttempt: item.nextAttempt,
                error: result.error,
              });
            }
          }
        } catch (error) {
          logger.error(`处理队列邮件失败: ${item.id}`, error);
          item.attempts++;
          item.lastAttempt = new Date();

          if (item.attempts >= item.maxAttempts) {
            this.queue = this.queue.filter(qItem => qItem.id !== item.id);
          } else {
            const delay = config.email.retry.delay * Math.pow(2, item.attempts - 1);
            item.nextAttempt = new Date(Date.now() + delay);
          }
        }
      }
    } catch (error) {
      logger.error('处理邮件队列失败:', error);
    } finally {
      this.isProcessingQueue = false;

      // 如果队列中还有待处理邮件，安排下次处理
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), 5000); // 5秒后再次处理
      }
    }
  }

  /**
   * 捕获邮件到文件（测试模式）
   * 将邮件内容序列化为 JSON 并追加到指定的日志文件中。
   * 自动创建日志目录（如果不存在）。
   * @param mailOptions - 发送的邮件选项
   * @param info - nodemailer 返回的发送信息
   */
  private captureEmailToFile(mailOptions: SendMailOptions, info: any): void {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        messageId: info.messageId,
        mailOptions,
        info,
      };

      const logLine = JSON.stringify(logEntry) + '\n';

      // 确保日志目录存在
      const logDir = path.dirname(config.email.test.filePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      // 追加到日志文件
      fs.appendFileSync(config.email.test.filePath, logLine, 'utf8');
    } catch (error) {
      logger.error('捕获邮件到文件失败:', error);
    }
  }

  /**
   * 获取邮件队列状态
   * 统计待处理、重试中和下次重试时间等信息。
   * @returns 队列统计信息，包含总量、待处理量、重试中量和下次重试时间
   */
  public getQueueStatus(): {
    total: number;
    pending: number;
    retrying: number;
    nextRetry?: Date;
  } {
    const now = new Date();
    const pending = this.queue.filter(item => !item.nextAttempt || item.nextAttempt <= now);
    const retrying = this.queue.filter(item => item.attempts > 0);
    const nextRetry = this.queue
      .filter(item => item.nextAttempt && item.nextAttempt > now)
      .sort((a, b) => (a.nextAttempt!.getTime() - b.nextAttempt!.getTime()))[0]?.nextAttempt;

    return {
      total: this.queue.length,
      pending: pending.length,
      retrying: retrying.length,
      nextRetry,
    };
  }

  /**
   * 清空邮件队列
   * 移除所有待发送的邮件并记录日志。
   * @returns 被移除的邮件数量
   */
  public clearQueue(): number {
    const count = this.queue.length;
    this.queue = [];
    logger.info(`邮件队列已清空，移除了 ${count} 封邮件`);
    return count;
  }

  /**
   * 测试邮件服务连接
   * 调用 nodemailer transporter.verify() 验证 SMTP 连接是否正常。
   * @returns 连接测试结果，成功返回 true
   */
  public async testConnection(): Promise<boolean> {
    try {
      if (!this.transporter) {
        return false;
      }

      await this.transporter.verify();
      return true;
    } catch (error) {
      logger.error('邮件连接测试失败:', error);
      return false;
    }
  }

  /**
   * 获取邮件服务统计信息
   * 整合连接状态、队列状态和模板统计信息为一个结果返回。
   * @returns 包含连接状态、队列统计和模板统计的完整服务信息
   */
  public async getStats(): Promise<{
    connection: boolean;
    queue: {
      total: number;
      pending: number;
      retrying: number;
    };
    templates: {
      total: number;
      active: number;
      byType: Record<string, number>;
    };
  }> {
    const connectionStatus = await this.testConnection();
    const queueStatus = this.getQueueStatus();
    const templateStats = await emailTemplateModel.getTemplateStats();

    return {
      connection: connectionStatus,
      queue: {
        total: queueStatus.total,
        pending: queueStatus.pending,
        retrying: queueStatus.retrying,
      },
      templates: {
        total: templateStats.total,
        active: templateStats.active,
        byType: templateStats.byType,
      },
    };
  }
}

/** 导出 EmailService 单例实例 */
export const emailService = new EmailService();