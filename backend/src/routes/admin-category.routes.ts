/**
 * 管理端新闻分类管理路由模块
 *
 * 本模块提供新闻分类的完整 CRUD（增删改查）管理功能，包括：
 * - 获取全部分类列表
 * - 获取单个分类详情
 * - 创建新分类（含 slug 自动生成、名称/slug 唯一性校验）
 * - 更新分类（含名称/slug 唯一性校验，排除自身）
 * - 删除分类
 *
 * 所有接口均需管理员身份验证（adminAuthenticate 中间件全局应用）
 *
 * @module routes/admin-category
 */

import { Router, Request, Response } from 'express';
import { adminAuthenticate } from '../middlewares/admin-auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import { newsCategoryModel } from '../models/NewsCategory';

const router = Router();

// 所有分类管理路由需要认证
router.use(adminAuthenticate);

/**
 * @route GET /api/v1/admin/categories
 * @desc 获取所有新闻分类
 * @access Private/Admin — 通过 router.use(adminAuthenticate) 全局保护
 * @returns {Object} 包含全部分类列表的 JSON 响应
 */
router.get(
  '/categories',
  asyncHandler(async (_req: Request, res: Response) => {
    const categories = await newsCategoryModel.findAll();
    res.json({
      success: true,
      data: categories,
      message: '分类列表获取成功',
    });
  })
);

/**
 * @route GET /api/v1/admin/categories/:id
 * @desc 获取单个新闻分类详情
 * @access Private/Admin
 * @param {string} req.params.id - 分类 ID
 * @returns {Object} 包含分类详情的 JSON 响应；分类不存在时返回 404
 */
router.get(
  '/categories/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const category = await newsCategoryModel.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: '分类不存在',
      });
    }

    res.json({
      success: true,
      data: category,
      message: '分类详情获取成功',
    });
  })
);

/**
 * @route POST /api/v1/admin/categories
 * @desc 创建新闻分类
 * @access Private/Admin
 * @param {Object} req.body - 请求体
 * @param {string} req.body.name - 分类名称（必填，不能为空）
 * @param {string} [req.body.slug] - 分类标识/别名（可选，不传则自动从 name 生成）
 * @param {string} [req.body.description] - 分类描述
 * @param {number} [req.body.sortOrder] - 排序权重
 * @returns {Object} 201 状态码及包含新创建分类数据的 JSON 响应
 *
 * 参数校验说明：
 * - name 为必填字段，不能为空字符串
 * - slug 可选，不传时由 name 自动生成（转为小写、去除非字母数字字符、空格替换为连字符）
 * - slug 和 name 均需唯一，重复时返回 400 错误
 */
router.post(
  '/categories',
  asyncHandler(async (req: Request, res: Response) => {
    const { name, slug, description, sortOrder } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: '分类名称是必填字段',
      });
    }

    const slugToUse = slug || name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');

    const slugExist = await newsCategoryModel.slugExists(slugToUse);
    if (slugExist) {
      return res.status(400).json({
        success: false,
        error: '该分类标识已存在',
      });
    }

    const nameExist = await newsCategoryModel.nameExists(name.trim());
    if (nameExist) {
      return res.status(400).json({
        success: false,
        error: '该分类名称已存在',
      });
    }

    const category = await newsCategoryModel.create({
      name: name.trim(),
      slug: slugToUse,
      description,
      sortOrder,
    });

    res.status(201).json({
      success: true,
      data: category,
      message: '分类创建成功',
    });
  })
);

/**
 * @route PUT /api/v1/admin/categories/:id
 * @desc 更新新闻分类
 * @access Private/Admin
 * @param {string} req.params.id - 要更新的分类 ID
 * @param {Object} req.body - 请求体（所有字段均可选）
 * @param {string} [req.body.name] - 分类名称
 * @param {string} [req.body.slug] - 分类标识
 * @param {string} [req.body.description] - 分类描述
 * @param {number} [req.body.sortOrder] - 排序权重
 * @param {boolean} [req.body.isActive] - 是否启用
 * @returns {Object} 包含更新后分类数据的 JSON 响应
 *
 * 参数校验说明：
 * - 先检查分类是否存在，不存在返回 404
 * - 如果更新 name，需校验新名称不与其他分类重复（排除自身）
 * - 如果更新 slug，需校验新 slug 不与其他分类重复（排除自身）
 */
router.put(
  '/categories/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, slug, description, sortOrder, isActive } = req.body;

    const existing = await newsCategoryModel.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: '分类不存在',
      });
    }

    if (name) {
      const nameExist = await newsCategoryModel.nameExists(name.trim(), id);
      if (nameExist) {
        return res.status(400).json({
          success: false,
          error: '该分类名称已存在',
        });
      }
    }

    if (slug) {
      const slugExist = await newsCategoryModel.slugExists(slug, id);
      if (slugExist) {
        return res.status(400).json({
          success: false,
          error: '该分类标识已存在',
        });
      }
    }

    const category = await newsCategoryModel.update(id, {
      name: name?.trim(),
      slug,
      description: description !== undefined ? description : undefined,
      sortOrder,
      isActive,
    });

    res.json({
      success: true,
      data: category,
      message: '分类更新成功',
    });
  })
);

/**
 * @route DELETE /api/v1/admin/categories/:id
 * @desc 删除新闻分类
 * @access Private/SuperAdmin — 仅超级管理员可操作
 * @param {string} req.params.id - 要删除的分类 ID
 * @returns {Object} 包含操作结果的 JSON 响应
 *
 * 参数校验说明：
 * - 先检查分类是否存在，不存在返回 404
 */
router.delete(
  '/categories/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const existing = await newsCategoryModel.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: '分类不存在',
      });
    }

    await newsCategoryModel.delete(id);

    res.json({
      success: true,
      message: '分类删除成功',
    });
  })
);

export default router;
