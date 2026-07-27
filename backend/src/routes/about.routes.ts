/**
 * 关于页面路由模块
 *
 * 本模块提供关于页面的数据接口，包括：
 * - 公开接口：获取完整的关于页面数据（板块、核心价值、团队成员、发展历程、联系方式）
 * - 管理端接口（需管理员权限）：分别更新各个板块的内容
 *
 * @module routes/about
 */

import { Router, Request, Response } from 'express';
import { adminAuthenticate } from '../middlewares/admin-auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import { aboutModel } from '../models/AboutContent';
import logger from '../utils/logger';

const router = Router();

// ========== 公开接口 ==========

/**
 * 获取关于页面的所有数据
 *
 * @route GET /api/v1/about
 * @access Public
 * @returns {Object} 包含 success 状态码、data（全部关于页面数据）、message 提示信息的 JSON 响应
 */
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  try {
    const data = await aboutModel.getAllData();
    res.json({ success: true, data, message: '获取关于页面数据成功' });
  } catch (error) {
    logger.error('获取关于页面数据失败:', error);
    res.status(500).json({ success: false, message: '获取关于页面数据失败' });
  }
}));

// ========== 管理端接口（需要管理员权限）==========

/**
 * 更新指定板块（hero/mission/vision）的内容
 *
 * @route PUT /api/v1/about/sections/:key
 * @access Private/Admin — 需通过 adminAuthenticate 中间件验证管理员身份
 * @param {string} req.params.key - 板块标识，可选值: 'hero' | 'mission' | 'vision'
 * @param {Object} req.body - 板块内容
 * @param {string} [req.body.title] - 板块标题
 * @param {string} [req.body.description] - 板块描述
 * @param {string} [req.body.imageUrl] - 板块图片 URL
 * @returns {Object} 包含更新后板块数据的 JSON 响应
 */
router.put('/sections/:key', adminAuthenticate, asyncHandler(async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { title, description, imageUrl } = req.body;
    await aboutModel.updateSection(key, { title, description, imageUrl });
    const section = await aboutModel.getSection(key);
    res.json({ success: true, data: section, message: '板块更新成功' });
  } catch (error) {
    logger.error('更新板块失败:', error);
    res.status(500).json({ success: false, message: '更新板块失败' });
  }
}));

/**
 * 更新指定核心价值条目
 *
 * @route PUT /api/v1/about/values/:id
 * @access Private/Admin — 需通过 adminAuthenticate 中间件验证管理员身份
 * @param {number} req.params.id - 核心价值条目 ID
 * @param {Object} req.body - 核心价值内容
 * @param {string} [req.body.icon] - 图标标识
 * @param {string} [req.body.title] - 标题
 * @param {string} [req.body.description] - 描述
 * @returns {Object} 包含操作结果的 JSON 响应
 */
router.put('/values/:id', adminAuthenticate, asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { icon, title, description } = req.body;
    await aboutModel.updateValue(Number(id), { icon, title, description });
    res.json({ success: true, message: '核心价值更新成功' });
  } catch (error) {
    logger.error('更新核心价值失败:', error);
    res.status(500).json({ success: false, message: '更新核心价值失败' });
  }
}));

/**
 * 更新指定团队成员信息
 *
 * @route PUT /api/v1/about/team/:id
 * @access Private/Admin — 需通过 adminAuthenticate 中间件验证管理员身份
 * @param {number} req.params.id - 团队成员 ID
 * @param {Object} req.body - 团队成员信息
 * @param {string} [req.body.name] - 姓名
 * @param {string} [req.body.role] - 角色/职位
 * @param {string} [req.body.avatarUrl] - 头像 URL
 * @param {string} [req.body.description] - 简介
 * @returns {Object} 包含操作结果的 JSON 响应
 */
router.put('/team/:id', adminAuthenticate, asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, role, avatarUrl, description } = req.body;
    await aboutModel.updateTeamMember(Number(id), { name, role, avatarUrl, description });
    res.json({ success: true, message: '团队成员更新成功' });
  } catch (error) {
    logger.error('更新团队成员失败:', error);
    res.status(500).json({ success: false, message: '更新团队成员失败' });
  }
}));

/**
 * 更新指定发展历程条目
 *
 * @route PUT /api/v1/about/timeline/:id
 * @access Private/Admin — 需通过 adminAuthenticate 中间件验证管理员身份
 * @param {number} req.params.id - 发展历程条目 ID
 * @param {Object} req.body - 发展历程内容
 * @param {string} [req.body.year] - 年份
 * @param {string} [req.body.title] - 事件标题
 * @param {string} [req.body.description] - 事件描述
 * @returns {Object} 包含操作结果的 JSON 响应
 */
router.put('/timeline/:id', adminAuthenticate, asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { year, title, description } = req.body;
    await aboutModel.updateTimeline(Number(id), { year, title, description });
    res.json({ success: true, message: '发展历程更新成功' });
  } catch (error) {
    logger.error('更新发展历程失败:', error);
    res.status(500).json({ success: false, message: '更新发展历程失败' });
  }
}));

/**
 * 更新指定联系方式条目
 *
 * @route PUT /api/v1/about/contacts/:id
 * @access Private/Admin — 需通过 adminAuthenticate 中间件验证管理员身份
 * @param {number} req.params.id - 联系方式条目 ID
 * @param {Object} req.body - 联系方式内容
 * @param {string} [req.body.label] - 标签（如"邮箱""地址"）
 * @param {string} [req.body.value] - 值（如邮箱地址、物理地址）
 * @returns {Object} 包含操作结果的 JSON 响应
 */
router.put('/contacts/:id', adminAuthenticate, asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { label, value } = req.body;
    await aboutModel.updateContact(Number(id), { label, value });
    res.json({ success: true, message: '联系方式更新成功' });
  } catch (error) {
    logger.error('更新联系方式失败:', error);
    res.status(500).json({ success: false, message: '更新联系方式失败' });
  }
}));

export default router;
