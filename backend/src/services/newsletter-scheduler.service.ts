/**
 * 新闻通讯调度服务
 *
 * 基于 node-cron 实现定时新闻通讯发送功能。
 * 定期从新闻表中提取最新文章，生成 HTML 格式的新闻通讯内容，
 * 并发给所有活跃的邮件订阅用户。
 * 调度周期通过环境变量 NEWSLETTER_CRON_SCHEDULE 配置，默认每周一 9:00 执行（北京时间）。
 * 当 SMTP 未配置时自动跳过调度启动。
 */
import * as cron from 'node-cron';
import { newsletterSubscriptionModel } from '../models/NewsletterSubscription';
import { newsModel } from '../models/News';
import { emailService } from './email.service';
import logger from '../utils/logger';
import config from '../config';

/**
 * 新闻通讯调度器
 *
 * 负责管理定时任务的启停、新闻内容的生成和批量邮件发送。
 * 通过单例模式导出，整个应用共享一个调度器实例。
 * 发送采用分批策略（每批 50 封），批次间间隔 2 秒以避免 SMTP 限流。
 */
class NewsletterScheduler {
  /** cron 定时任务实例 */
  private task: any = null;

  /** 是否正在发送中，用于防止任务重叠执行 */
  private isRunning = false;

  /**
   * 启动调度任务
   *
   * 检查 SMTP 配置是否完整，如果未配置则跳过启动。
   * 从环境变量读取调度表达式和时区配置，创建 cron 定时任务。
   * 不阻塞主进程启动。
   */
  start(): void {
    // 如果 SMTP 未配置，不启动调度
    if (!config.email.user || !config.email.host) {
      logger.info('新闻通讯调度器: SMTP 未配置，跳过启动');
      return;
    }

    // 读取调度配置，默认每周一 9:00（北京时间）
    const schedule = process.env.NEWSLETTER_CRON_SCHEDULE || '0 9 * * 1';
    const timezone = process.env.NEWSLETTER_CRON_TIMEZONE || 'Asia/Shanghai';

    this.task = cron.schedule(
      schedule,
      () => {
        this.sendNewsletter().catch((err) =>
          logger.error('定时发送新闻通讯失败:', err)
        );
      },
      { timezone }
    );

    logger.info(`新闻通讯调度器已启动，调度表达式: ${schedule}，时区: ${timezone}`);
  }

  /**
   * 停止调度任务
   *
   * 停止 cron 定时任务并清理引用。
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('新闻通讯调度器已停止');
    }
  }

  /**
   * 执行新闻通讯发送
   *
   * 主要执行流程：
   * 1. 检查是否有发送任务正在运行（防重叠）
   * 2. 获取最近一周的热门新闻作为内容
   * 3. 生成 HTML 格式的新闻通讯
   * 4. 获取所有活跃的订阅者
   * 5. 分批发送邮件（每批 50 封，间隔 2 秒）
   *
   * @returns 发送统计结果，包含总订阅数、成功数和失败数
   */
  async sendNewsletter(): Promise<{ total: number; success: number; failed: number }> {
    // 防止任务重叠：如果上一次发送还未完成则跳过
    if (this.isRunning) {
      logger.warn('新闻通讯发送任务已在运行中，跳过本次执行');
      return { total: 0, success: 0, failed: 0 };
    }

    this.isRunning = true;
    logger.info('开始发送新闻通讯...');

    try {
      // 获取最近的热门新闻作为内容（最多 10 篇）
      const recentNews = await newsModel.findAll({
        orderBy: 'publish_date',
        orderDirection: 'DESC',
        limit: 10,
      });

      if (recentNews.length === 0) {
        logger.info('没有最新的新闻内容，跳过本次新闻通讯');
        return { total: 0, success: 0, failed: 0 };
      }

      // 生成新闻通讯 HTML 内容
      const newsletterContent = this.generateNewsletterContent(recentNews as any[]);

      // 获取所有活跃订阅者
      const subscribers = await newsletterSubscriptionModel.getActiveSubscriptions();
      if (subscribers.length === 0) {
        logger.info('没有活跃的订阅者，跳过本次新闻通讯');
        return { total: 0, success: 0, failed: 0 };
      }

      logger.info(`准备向 ${subscribers.length} 位订阅者发送新闻通讯`);

      // 分批发送，避免 SMTP 限流
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

        // 统计该批次的发送结果
        for (const r of results) {
          if (r.result.success) successCount++;
          else failedCount++;
        }

        // 每批间隔 2 秒，避免被 SMTP 限流
        if (i + batchSize < subscribers.length) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      logger.info(`新闻通讯发送完成: ${successCount} 成功, ${failedCount} 失败`);
      return { total: subscribers.length, success: successCount, failed: failedCount };
    } catch (error) {
      logger.error('发送新闻通讯失败:', error);
      return { total: 0, success: 0, failed: 0 };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 从新闻文章列表生成新闻通讯 HTML
   *
   * 将文章列表渲染为带样式的 HTML 邮件内容，包含标题、摘要和发布日期。
   * 使用表格布局和内联样式以确保邮件客户端兼容性。
   *
   * @param news - 新闻文章列表
   * @returns 完整的 HTML 邮件内容字符串
   */
  private generateNewsletterContent(news: any[]): string {
    // 生成每篇文章的 HTML 片段
    const itemsHtml = news
      .map(
        (item) => `
      <div style="margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #eee;">
        <h3 style="margin: 0 0 8px; font-size: 18px; color: #333;">
          <a href="${config.siteUrl}/news/${item.id}" style="color: #2563eb; text-decoration: none;">${item.title}</a>
        </h3>
        <p style="margin: 0 0 4px; font-size: 14px; color: #666; line-height: 1.6;">${item.summary || ''}</p>
        <span style="font-size: 12px; color: #999;">${item.publishDate ? new Date(item.publishDate).toLocaleDateString('zh-CN') : ''}</span>
      </div>`
      )
      .join('');

    // 组装完整的邮件 HTML，包含页头和页脚
    return `
    <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px; color: #ffffff;">GameHub 游戏资讯</h1>
        <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.85);">每周精选游戏新闻，直达您的邮箱</p>
      </div>
      <div style="padding: 24px; background: #ffffff; border: 1px solid #e5e7eb;">
        ${itemsHtml}
      </div>
      <div style="padding: 20px; text-align: center; font-size: 12px; color: #999; background: #f9fafb; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="margin: 0 0 8px;">您收到此邮件是因为您订阅了 GameHub 游戏资讯。</p>
        <p style="margin: 0;">
          <a href="${config.siteUrl}/newsletter/unsubscribe" style="color: #666; text-decoration: underline;">取消订阅</a>
        </p>
      </div>
    </div>`;
  }
}

/** 新闻通讯调度器单例实例 */
export const newsletterScheduler = new NewsletterScheduler();
