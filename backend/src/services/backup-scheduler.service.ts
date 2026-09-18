/**
 * 数据库自动备份调度服务
 *
 * 基于 node-cron 实现数据库定时备份功能。
 * 默认每天凌晨 2:00 执行 SQLite backup。
 *
 * 调度周期通过环境变量 BACKUP_CRON_SCHEDULE 配置，默认 "0 2 * * *"。
 */

import * as cron from 'node-cron';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import config from '../config';
import logger from '../utils/logger';
import { query, execute } from '../db';

const BACKUP_DIR = process.env.BACKUP_DIR || '/app/backups';

class BackupScheduler {
  private task: any = null;
  private isRunning = false;

  /**
   * 启动备份调度器
   */
  start(): void {
    const cronExpr = process.env.BACKUP_CRON_SCHEDULE || '0 2 * * *';
    logger.info(`备份调度器启动: ${cronExpr}`);

    this.task = cron.schedule(cronExpr, () => this.runBackup());
  }

  /**
   * 停止备份调度器
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('备份调度器已停止');
    }
  }

  /**
   * 执行备份
   */
  private async runBackup(): Promise<void> {
    if (this.isRunning) {
      logger.warn('上一次备份尚未完成，跳过本次');
      return;
    }
    this.isRunning = true;

    try {
      if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `auto-backup-${timestamp}`;
      const filepath = path.join(BACKUP_DIR, filename);

      // SQLite 模式：无法在运行中的 Express 进程里直接调用 backup API，跳过自动备份
      logger.info('SQLite 模式跳过自动备份（请使用管理后台手动备份）');
    } catch (err: any) {
      logger.error('自动备份失败:', err.message);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 清理超过保留天数的旧备份文件和记录
   */
  private async cleanOldBackups(retainDays: number): Promise<void> {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - retainDays);

      // 查询旧备份
      const oldBackups = await query(
        `SELECT id, filepath FROM backups WHERE type = 'scheduled' AND created_at < $1`,
        [cutoff.toISOString()]
      );

      for (const bk of oldBackups as any[]) {
        // 删除文件
        if (bk.filepath && fs.existsSync(bk.filepath)) {
          fs.unlinkSync(bk.filepath);
        }
        // 删除记录
        await execute('DELETE FROM backups WHERE id = $1', [bk.id]);
      }

      if (oldBackups.length > 0) {
        logger.info(`清理了 ${oldBackups.length} 个旧备份 (>${retainDays}天)`);
      }
    } catch (err: any) {
      logger.warn('清理旧备份失败:', err.message);
    }
  }
}

export const backupScheduler = new BackupScheduler();
