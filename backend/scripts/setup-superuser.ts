#!/usr/bin/env ts-node

/**
 * GameHub 超级用户初始化 / 维护脚本
 *
 * 功能：
 * 1. 检查指定超级用户是否存在
 * 2. 不存在则创建新用户，角色为 super_admin
 * 3. 已存在但密码不匹配则更新密码
 * 4. 已存在但角色不是 super_admin 则提升角色
 *
 * 用法：直接运行 ts-node scripts/setup-superuser.ts
 *
 * 注意：超级用户的凭据直接硬编码在此文件中，仅用于开发和内部管理。
 *       生产环境应使用环境变量或密钥管理服务。
 */

import bcrypt from 'bcryptjs';
import { connectDatabase, query, execute } from '../src/db';
import config from '../src/config';
import logger from '../src/utils/logger';

/** 超级用户的登录用户名 */
const SUPER_USERNAME = 'super_wangminchao';

/** 超级用户的登录密码 */
const SUPER_PASSWORD = '4219011oave@';

/**
 * 超级用户设置主逻辑
 *
 * 工作流程：
 * 1. 连接数据库
 * 2. 查询是否已存在该用户
 * 3. 存在则检查密码和角色；不存在则创建
 * 4. 最终验证用户信息并输出结果
 */
async function setupSuperUser() {
  await connectDatabase();

  logger.info('检查超级用户状态...');

  const existing = await query<{
    id: number;
    username: string;
    password_hash: string;
    role: string;
  }>(
    `SELECT id, username, password_hash, role FROM users WHERE username = ?`,
    [SUPER_USERNAME]
  );

  if (existing.length === 0) {
    // ---------- 创建新超级用户 ----------
    const salt = await bcrypt.genSalt(config.security.bcryptRounds);
    const hashedPassword = await bcrypt.hash(SUPER_PASSWORD, salt);

    await execute(
      `INSERT INTO users (username, email, display_name, role, password_hash, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        SUPER_USERNAME,
        'super_wangminchao@gamehub.local',
        '超级管理员',
        'super_admin',
        hashedPassword,
        new Date().toISOString(),
        new Date().toISOString(),
      ]
    );

    logger.info(`超级用户 "${SUPER_USERNAME}" 已创建（角色: super_admin）`);
  } else {
    const user = existing[0];
    const isMatch = await bcrypt.compare(SUPER_PASSWORD, user.password_hash);

    if (!isMatch) {
      // ---------- 密码不匹配，更新密码 ----------
      const salt = await bcrypt.genSalt(config.security.bcryptRounds);
      const hashedPassword = await bcrypt.hash(SUPER_PASSWORD, salt);

      await execute(
        `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`,
        [hashedPassword, new Date().toISOString(), user.id]
      );

      logger.info(`超级用户 "${SUPER_USERNAME}" 密码已更新`);
    } else {
      logger.info(`超级用户 "${SUPER_USERNAME}" 已存在且密码正确，无需操作`);
    }

    // ---------- 确保角色为 super_admin ----------
    if (user.role !== 'super_admin') {
      await execute(
        `UPDATE users SET role = 'super_admin', updated_at = ? WHERE id = ?`,
        [new Date().toISOString(), user.id]
      );
      logger.info(`用户 "${SUPER_USERNAME}" 角色已升级为 super_admin`);
    }
  }

  // ---------- 最终验证 ----------
  const verified = await query<{ username: string; role: string }>(
    `SELECT username, role FROM users WHERE username = ?`,
    [SUPER_USERNAME]
  );

  if (verified.length > 0) {
    logger.info(`验证成功: ${verified[0].username} (${verified[0].role})`);
    console.log(`\n✅ 超级用户配置完成`);
    console.log(`   用户名: ${SUPER_USERNAME}`);
    console.log(`   角色:   ${verified[0].role}`);
    console.log(`\n   管理员登录地址: http://localhost:3002/api/v1/admin/login`);
  } else {
    console.error('\n❌ 超级用户验证失败');
    process.exit(1);
  }
}

setupSuperUser()
  .catch((error) => {
    logger.error('设置超级用户失败:', error);
    process.exit(1);
  });

