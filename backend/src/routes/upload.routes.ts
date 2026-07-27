/**
 * 文件上传路由模块
 *
 * 本模块提供文件上传相关的 REST API，包括：
 * - 获取上传配置信息
 * - 单文件上传
 * - 多文件上传
 * - 图片上传（含自动优化）
 * - 文档上传（PDF、Word、Excel 等）
 * - 获取/删除已上传文件信息
 * - 上传服务健康检查
 *
 * 所有上传接口均受速率限制保护，每 15 分钟最多 100 次请求
 *
 * @module routes/upload
 */

import { Router, Request, Response, NextFunction } from 'express';
import { singleUpload, multipleUpload, handleUpload, getUploadConfig, deleteUploadedFile, getFileInfo } from '../services/upload.service';
import { asyncHandler } from '../middlewares/error.middleware';
import { authenticate, rateLimit } from '../middlewares/auth.middleware';
import config from '../config';
import logger from '../utils/logger';

const router = Router();

/**
 * 上传接口全局速率限制中间件
 * 所有上传路由均受此限制：每个 IP 在 15 分钟窗口内最多 100 次请求
 */
router.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

/**
 * @route GET /api/v1/upload/config
 * @desc 获取上传配置信息
 * @access Public
 *
 * 返回前端的上传配置参数（最大文件大小、允许的文件类型等），
 * 以及已启用的功能特性（图片优化、病毒扫描、CDN 等）
 *
 * @returns
 *   - config: 上传配置详情（文件大小限制、类型限制等）
 *   - features: 已启用的功能特性标记
 */
router.get(
  '/config',
  asyncHandler(async (req: Request, res: Response) => {
    const uploadConfig = getUploadConfig();

    res.status(200).json({
      success: true,
      data: {
        config: uploadConfig,
        features: {
          imageOptimization: config.upload.image.maxWidth > 0,
          virusScan: config.upload.validation.virusScan,
          cdnEnabled: config.upload.cdn.enabled,
        },
      },
      message: '上传配置获取成功',
    });
  })
);

/**
 * @route POST /api/v1/upload/single
 * @desc 单文件上传
 * @access Private（需要用户认证）
 *
 * @middleware authenticate - 必须登录认证
 *
 * 使用 multer 中间件处理单文件上传，然后调用 handleUpload 保存文件。
 * 上传成功后返回文件信息和上传者信息
 *
 * @returns 201 - 文件上传成功
 * @returns 400 - 文件验证失败（类型不支持、大小超限等）
 */
router.post(
  '/single',
  authenticate,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // 使用 multer 中间件处理文件上传
    singleUpload(req, res, async (err: any) => {
      if (err) {
        logger.error('文件上传中间件错误:', err);
        return next(err);
      }

      try {
        const uploadedFile = await handleUpload(req) as any;

        res.status(201).json({
          success: true,
          data: {
            file: uploadedFile,
            user: {
              id: req.user?.id,
              username: req.user?.username,
            },
          },
          message: '文件上传成功',
        });
      } catch (error) {
        next(error);
      }
    });
  })
);

/**
 * @route POST /api/v1/upload/multiple
 * @desc 多文件上传
 * @access Private（需要用户认证）
 *
 * @middleware authenticate - 必须登录认证
 *
 * 使用 multer 中间件处理多文件上传，支持同时上传多个文件。
 * 上传成功后返回文件列表、数量统计和上传者信息
 *
 * @returns 201 - 所有文件上传成功
 * @returns 400 - 文件验证失败
 */
router.post(
  '/multiple',
  authenticate,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    multipleUpload(req, res, async (err: any) => {
      if (err) {
        logger.error('多文件上传中间件错误:', err);
        return next(err);
      }

      try {
        const uploadedFiles = await handleUpload(req) as any[];

        res.status(201).json({
          success: true,
          data: {
            files: uploadedFiles,
            count: uploadedFiles.length,
            user: {
              id: req.user?.id,
              username: req.user?.username,
            },
          },
          message: `成功上传 ${uploadedFiles.length} 个文件`,
        });
      } catch (error) {
        next(error);
      }
    });
  })
);

/**
 * @route POST /api/v1/upload/image
 * @desc 图片上传（专门用于图片，可自动优化）
 * @access Private（需要用户认证）
 *
 * @middleware authenticate - 必须登录认证
 *
 * 专门用于图片文件上传的端点。
 * 使用 multer 中间件处理后，检查文件 MIME 类型是否为 image/*，
 * 若不匹配则返回错误。可扩展图片优化功能（如调整尺寸、压缩等），
 * 但当前实现中优化代码被注释掉，仅完成上传和存储
 *
 * @returns 201 - 图片上传成功，包含图片尺寸（宽/高）和格式信息
 * @returns 400 - 上传的文件不是图片类型
 */
router.post(
  '/image',
  authenticate,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    singleUpload(req, res, async (err: any) => {
      if (err) {
        logger.error('图片上传中间件错误:', err);
        return next(err);
      }

      try {
        // 检查是否为图片
        if (!req.file?.mimetype.startsWith('image/')) {
          return next(new Error('请上传图片文件'));
        }

        const uploadedFile = await handleUpload(req) as any;

        // 可选：图片优化
        // if (config.upload.image.maxWidth > 0) {
        //   const optimized = await optimizeImage(uploadedFile.path);
        //   uploadedFile.optimized = true;
        // }

        res.status(201).json({
          success: true,
          data: {
            file: uploadedFile,
            imageInfo: {
              width: (req.file as any)?.width || null,
              height: (req.file as any)?.height || null,
              format: req.file?.mimetype.split('/')[1],
            },
            user: {
              id: req.user?.id,
              username: req.user?.username,
            },
          },
          message: '图片上传成功',
        });
      } catch (error) {
        next(error);
      }
    });
  })
);

/**
 * @route POST /api/v1/upload/document
 * @desc 文档上传（专门用于文档文件）
 * @access Private（需要用户认证）
 *
 * @middleware authenticate - 必须登录认证
 *
 * 专门用于文档文件上传的端点。
 * 检查 MIME 类型是否匹配 PDF、Word、Excel、PowerPoint 或纯文本文件，
 * 若不匹配则返回错误。可扩展提取文档元信息（如 PDF 页数、Word 字数等）
 *
 * @returns 201 - 文档上传成功
 * @returns 400 - 上传的文件不是支持的文档类型
 *
 * 支持的文档类型：
 * - PDF（application/pdf）
 * - Word（application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.*）
 * - Excel（application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.*）
 * - PowerPoint（application/vnd.ms-powerpoint, application/vnd.openxmlformats-officedocument.presentationml.*）
 * - 纯文本（text/*）
 */
router.post(
  '/document',
  authenticate,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    singleUpload(req, res, async (err: any) => {
      if (err) {
        logger.error('文档上传中间件错误:', err);
        return next(err);
      }

      try {
        // 检查是否为文档
        const isDocument = req.file?.mimetype.includes('pdf') ||
                          req.file?.mimetype.includes('word') ||
                          req.file?.mimetype.includes('excel') ||
                          req.file?.mimetype.includes('powerpoint') ||
                          req.file?.mimetype.includes('presentation') ||
                          req.file?.mimetype.includes('document') ||
                          req.file?.mimetype.startsWith('text/');

        if (!isDocument) {
          return next(new Error('请上传文档文件 (PDF, Word, Excel, PowerPoint, 文本文件等)'));
        }

        const uploadedFile = await handleUpload(req) as any;

        res.status(201).json({
          success: true,
          data: {
            file: uploadedFile,
            documentInfo: {
              pageCount: null, // 可扩展：使用库提取PDF页数等
              wordCount: null,
            },
            user: {
              id: req.user?.id,
              username: req.user?.username,
            },
          },
          message: '文档上传成功',
        });
      } catch (error) {
        next(error);
      }
    });
  })
);

/**
 * @route GET /api/v1/upload/files
 * @desc 获取所有已上传文件的列表
 * @access Private（需要用户认证）
 *
 * 递归扫描上传目录，返回所有文件的元数据列表。
 * 支持分页查询。
 */
router.get(
  '/files',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const fs = require('fs');
    const path = require('path');
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const allFiles: any[] = [];

    function scanDirectory(dir: string, basePath: string) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relative = path.relative(basePath, fullPath).replace(/\\/g, '/');
        if (entry.isDirectory()) {
          scanDirectory(fullPath, basePath);
        } else {
          try {
            const stat = fs.statSync(fullPath);
            const urlPath = `/uploads/${relative}`;
            allFiles.push({
              id: relative,
              filename: entry.name,
              originalName: entry.name,
              path: fullPath,
              url: urlPath,
              mimeType: getMimeType(entry.name),
              size: stat.size,
              createdAt: stat.birthtime.toISOString(),
            });
          } catch { /* skip inaccessible files */ }
        }
      }
    }

    function getMimeType(filename: string): string {
      const ext = path.extname(filename).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
        '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
        '.pdf': 'application/pdf', '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.txt': 'text/plain', '.zip': 'application/zip',
      };
      return mimeMap[ext] || 'application/octet-stream';
    }

    scanDirectory(config.upload.path, config.upload.path);

    // 按时间倒序排列
    allFiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = allFiles.length;
    const start = (page - 1) * limit;
    const items = allFiles.slice(start, start + limit);

    res.status(200).json({
      success: true,
      data: {
        files: items,
        pagination: { page, limit, total },
      },
      message: '文件列表获取成功',
    });
  })
);

/**
 * @route GET /api/v1/upload/files/:filename
 * @desc 获取已上传文件的信息
 * @access Private（需要用户认证）
 *
 * @middleware authenticate - 必须登录认证
 *
 * @param req.params.filename - 文件名
 *
 * @returns 200 - 文件信息获取成功
 * @returns 400 - 文件名无效（包含路径遍历字符）
 * @returns 404 - 文件不存在
 *
 * 安全措施：对文件名进行路径遍历攻击防护，
 * 拒绝包含 ".."、"/" 或 "\" 的文件名
 */
router.get(
  '/files/:filename',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { filename } = req.params;

    // 安全验证：防止路径遍历攻击
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: '文件名无效',
      });
    }

    // 在实际应用中，需要根据数据库记录查找文件路径
    // 这里简化处理：假设文件在uploads目录下
    const filePath = `${config.upload.path}/${filename}`;
    const fileInfo = getFileInfo(filePath);

    if (!fileInfo) {
      return res.status(404).json({
        success: false,
        error: '文件不存在',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        file: fileInfo,
      },
      message: '文件信息获取成功',
    });
  })
);

/**
 * @route DELETE /api/v1/upload/files/:filename
 * @desc 删除已上传的文件
 * @access Private（需要用户认证）
 *
 * @middleware authenticate - 必须登录认证
 *
 * @param req.params.filename - 要删除的文件名
 *
 * @returns 200 - 文件删除成功
 * @returns 400 - 文件名无效（包含路径遍历字符）
 * @returns 404 - 文件不存在或删除失败
 *
 * 安全措施：对文件名进行路径遍历攻击防护
 * 注意：生产环境中应通过数据库记录查找文件路径并验证用户权限
 */
router.delete(
  '/files/:filename',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { filename } = req.params;

    // 安全验证：防止路径遍历攻击
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: '文件名无效',
      });
    }

    // 在实际应用中，需要根据数据库记录查找文件路径，并验证用户权限
    // 这里简化处理：假设文件在uploads目录下
    const filePath = `${config.upload.path}/${filename}`;
    const deleted = deleteUploadedFile(filePath);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: '文件不存在或删除失败',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        filename,
        deleted: true,
      },
      message: '文件删除成功',
    });
  })
);

/**
 * @route GET /api/v1/upload/health
 * @desc 检查上传服务健康状态
 * @access Public
 *
 * 检查上传目录和临时目录是否存在且可写，
 * 同时返回当前上传限制配置（最大文件大小、允许类型数量等）
 *
 * @returns
 *   - status: 服务状态（'healthy' 表示正常）
 *   - directories: 目录状态（路径、是否存在、是否可写）
 *   - limits: 上传限制配置
 *   - timestamp: 检查时间戳
 */
router.get(
  '/health',
  asyncHandler(async (req: Request, res: Response) => {
    // 检查上传目录是否可访问
    const fs = require('fs');
    const uploadDirExists = fs.existsSync(config.upload.path);
    const tempDirExists = fs.existsSync(config.upload.tempPath);

    // 检查目录是否可写
    let uploadWritable = false;
    let tempWritable = false;

    try {
      if (uploadDirExists) {
        fs.accessSync(config.upload.path, fs.constants.W_OK);
        uploadWritable = true;
      }
    } catch (error) {
      logger.warn('上传目录不可写:', error);
    }

    try {
      if (tempDirExists) {
        fs.accessSync(config.upload.tempPath, fs.constants.W_OK);
        tempWritable = true;
      }
    } catch (error) {
      logger.warn('临时目录不可写:', error);
    }

    res.status(200).json({
      success: true,
      data: {
        status: 'healthy',
        directories: {
          upload: {
            path: config.upload.path,
            exists: uploadDirExists,
            writable: uploadWritable,
          },
          temp: {
            path: config.upload.tempPath,
            exists: tempDirExists,
            writable: tempWritable,
          },
        },
        limits: {
          maxFileSize: config.upload.maxSize,
          maxFileSizeMB: config.upload.maxSize / 1024 / 1024,
          allowedTypesCount: config.upload.allowedTypes.length,
        },
        timestamp: new Date().toISOString(),
      },
      message: '上传服务运行正常',
    });
  })
);

export default router;
