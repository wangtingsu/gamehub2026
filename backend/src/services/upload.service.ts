/**
 * 文件上传服务
 *
 * 基于 Multer 中间件实现文件上传功能，提供文件类型验证、大小校验、
 * 安全文件名生成、分类存储（按文件类型和日期组织目录结构）、
 * CDN URL 生成、图片优化（依赖 sharp 库）等功能。
 * 支持单文件和多文件批量上传。
 *
 * @module upload.service
 */

import multer, { FileFilterCallback, StorageEngine } from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request } from 'express';
import config from '../config';
import logger from '../utils/logger';
import { UploadedFile } from '../types';
import { BadRequestError, InternalServerError } from '../middlewares/error.middleware';

/**
 * 确保上传目录存在
 *
 * 递归创建目录（如果不存在），失败时记录错误日志。
 *
 * @param dirPath - 目录路径
 * @returns 目录是否就绪
 */
const ensureUploadDir = (dirPath: string): boolean => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return true;
  } catch (error) {
    logger.error(`创建上传目录失败: ${dirPath}`, error);
    return false;
  }
};

/**
 * 初始化上传目录（非致命，使用 try-catch 避免启动时崩溃）
 * 如果启动时目录创建失败，会在上传时再次尝试创建
 */
try {
  ensureUploadDir(config.upload.path);
  ensureUploadDir(config.upload.tempPath);
} catch (error) {
  logger.warn('初始化上传目录失败，将在上传时重试:', error);
}

/**
 * 生成安全的文件名
 *
 * 在原始文件名基础上添加时间戳和随机字符串，防止文件名冲突和
 * 路径遍历攻击。过滤掉危险字符，仅保留字母、数字、下划线和连字符。
 *
 * @param originalname - 原始文件名
 * @returns 安全的唯一文件名
 */
const generateSafeFilename = (originalname: string): string => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const extension = path.extname(originalname).toLowerCase();
  const basename = path.basename(originalname, extension).replace(/[^a-zA-Z0-9-_]/g, '_');

  return `${basename}_${timestamp}_${randomString}${extension}`;
};

/**
 * 验证文件 MIME 类型是否被允许
 *
 * @param mimetype - 文件的 MIME 类型
 * @returns 是否在允许类型列表中
 */
const validateFileType = (mimetype: string): boolean => {
  return config.upload.allowedTypes.includes(mimetype);
};

/**
 * 验证文件大小是否在允许范围内
 *
 * @param size - 文件字节大小
 * @returns 是否未超过最大限制
 */
const validateFileSize = (size: number | undefined): boolean => {
  // fileFilter 阶段 size 可能为 undefined，跳过检查，multer 的 limits.fileSize 会在上传完成后校验
  if (size === undefined || size === null) return true;
  return size <= config.upload.maxSize;
};

/**
 * Multer 磁盘存储引擎配置
 *
 * 将上传的文件临时存储到 tempPath 目录，使用 generateSafeFilename
 * 生成目标文件名以避免冲突。
 */
const storage: StorageEngine = multer.diskStorage({
  destination: (req, file, cb) => {
    // 临时存储，后续可能移动到最终位置
    cb(null, config.upload.tempPath);
  },
  filename: (req, file, cb) => {
    const safeFilename = generateSafeFilename(file.originalname);
    cb(null, safeFilename);
  },
});

/**
 * Multer 文件过滤器
 *
 * 在文件上传过程中验证 MIME 类型和文件大小，
 * 不符合条件的文件将被拒绝并返回错误信息。
 *
 * @param req - Express 请求对象
 * @param file - Multer 上传的文件对象
 * @param cb - 回调函数，传递验证结果
 */
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  try {
    // 验证MIME类型
    if (config.upload.validation.checkMimeType && !validateFileType(file.mimetype)) {
      logger.warn(`文件类型不被允许: ${file.mimetype}, 原始文件名: ${file.originalname}`);
      return cb(new BadRequestError(`文件类型不被允许。支持的类型: ${config.upload.allowedTypes.join(', ')}`));
    }

    // 验证文件大小
    if (config.upload.validation.checkFileSize && !validateFileSize(file.size)) {
      logger.warn(`文件大小超过限制: ${file.size} bytes, 最大允许: ${config.upload.maxSize} bytes`);
      return cb(new BadRequestError(`文件大小超过限制。最大允许: ${config.upload.maxSize / 1024 / 1024}MB`));
    }

    cb(null, true);
  } catch (error) {
    logger.error('文件过滤错误:', error);
    cb(new InternalServerError('文件验证失败'));
  }
};

/**
 * Multer 上传实例
 *
 * 配置了存储引擎、文件过滤器和大小限制的 Multer 实例。
 * 默认限制单文件上传。
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxSize,
    files: 1, // 单文件上传，可根据需求调整
  },
});

/**
 * 根据 MIME 类型获取文件分类
 *
 * 将文件分为 image（图片）、document（文档）、archive（压缩包）、
 * other（其他）四类，用于按类别组织存储目录。
 *
 * @param mimetype - 文件的 MIME 类型
 * @returns 文件分类标识
 */
const getFileCategory = (mimetype: string): 'image' | 'document' | 'archive' | 'other' => {
  if (mimetype.startsWith('image/')) {
    return 'image';
  } else if (
    mimetype.startsWith('text/') ||
    mimetype.includes('pdf') ||
    mimetype.includes('word') ||
    mimetype.includes('excel') ||
    mimetype.includes('powerpoint') ||
    mimetype.includes('presentation') ||
    mimetype.includes('document')
  ) {
    return 'document';
  } else if (
    mimetype.includes('zip') ||
    mimetype.includes('rar') ||
    mimetype.includes('7z') ||
    mimetype.includes('compressed')
  ) {
    return 'archive';
  } else {
    return 'other';
  }
};

/**
 * 根据文件类型和日期确定最终存储路径
 *
 * 按 category/year/month/day 四层目录组织文件，例如：
 * image/2024/01/15/filename.jpg。如目录不存在则自动创建。
 *
 * @param mimetype - 文件的 MIME 类型
 * @param filename - 文件名（含扩展名）
 * @returns 文件的完整目标路径
 * @throws InternalServerError - 目录创建失败时抛出
 */
const getFinalDestination = (mimetype: string, filename: string): string => {
  const category = getFileCategory(mimetype);
  const date = new Date();
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  const categoryPath = path.join(config.upload.path, category, year, month, day);
  if (!ensureUploadDir(categoryPath)) {
    throw new InternalServerError(`无法创建上传目录: ${categoryPath}`);
  }

  return path.join(categoryPath, filename);
};

/**
 * 处理上传的文件
 *
 * 将文件从临时存储位置移动到按日期/类型组织的最终目录，
 * 生成访问 URL（支持 CDN 或本地路径），并清理临时文件。
 *
 * @param tempFilePath - 临时文件路径
 * @param originalFile - Multer 上传的原始文件信息
 * @returns 处理后的上传文件信息对象
 * @throws InternalServerError - 文件处理失败时抛出
 */
const processUploadedFile = async (tempFilePath: string, originalFile: Express.Multer.File): Promise<UploadedFile> => {
  let finalDestination = '';
  try {
    const finalFilename = generateSafeFilename(originalFile.originalname);
    finalDestination = getFinalDestination(originalFile.mimetype, finalFilename);

    // 移动文件（使用 copy + unlink 替代 rename，避免跨文件系统错误）
    try {
      fs.renameSync(tempFilePath, finalDestination);
    } catch (renameError: any) {
      if (renameError.code === 'EXDEV') {
        // 跨设备：先复制再删除
        fs.copyFileSync(tempFilePath, finalDestination);
        fs.unlinkSync(tempFilePath);
      } else {
        throw renameError;
      }
    }

    // 生成访问URL
    let fileUrl: string;
    if (config.upload.cdn.enabled && config.upload.cdn.baseUrl) {
      // 使用CDN URL
      const relativePath = path.relative(config.upload.path, finalDestination);
      fileUrl = `${config.upload.cdn.baseUrl}/${relativePath.replace(/\\/g, '/')}`;
    } else {
      // 本地URL（相对路径）
      const relativePath = path.relative(process.cwd(), finalDestination);
      fileUrl = `/uploads/${relativePath.split(path.sep).slice(1).join('/')}`;
    }

    const uploadedFile: UploadedFile = {
      filename: finalFilename,
      originalname: originalFile.originalname,
      mimetype: originalFile.mimetype,
      size: originalFile.size,
      path: finalDestination,
      url: fileUrl,
    };

    logger.info(`文件上传成功: ${uploadedFile.originalname} -> ${uploadedFile.path}`);
    return uploadedFile;
  } catch (error) {
    logger.error(`处理上传文件失败 (temp: ${tempFilePath}, dest: ${finalDestination}):`, error);
    throw new InternalServerError('处理上传文件失败');
  }
};

/**
 * 清理临时文件
 *
 * 删除指定路径列表中的临时文件，单个文件删除失败不影响其他文件。
 *
 * @param filePaths - 需要清理的文件路径列表
 */
const cleanupTempFiles = (filePaths: string[]): void => {
  filePaths.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        logger.debug(`临时文件已清理: ${filePath}`);
      } catch (error) {
        logger.warn(`清理临时文件失败: ${filePath}`, error);
      }
    }
  });
};

/**
 * 单文件上传中间件
 *
 * 字段名为 'file'，处理单个文件上传请求。
 */
export const singleUpload = upload.single('file');

/**
 * 多文件上传中间件
 *
 * 字段名为 'files'，最多支持同时上传 10 个文件。
 */
export const multipleUpload = upload.array('files', 10);

/**
 * 处理上传结果
 *
 * 接收经过 Multer 中间件处理后的请求，将临时文件移动到最终存储位置。
 * 支持单文件和文件数组两种模式，上传失败时自动清理临时文件。
 *
 * @param req - Express 请求对象（需包含 Multer 处理后的 file 或 files 字段）
 * @returns 单个 UploadedFile 对象或 UploadedFile 数组
 * @throws BadRequestError - 没有上传文件或格式错误时抛出
 * @throws InternalServerError - 文件处理失败时抛出
 */
export const handleUpload = async (req: Request): Promise<UploadedFile | UploadedFile[]> => {
  try {
    if (!req.file && !req.files) {
      throw new BadRequestError('没有上传文件');
    }

    // 单文件上传
    if (req.file) {
      const tempFilePath = path.join(config.upload.tempPath, req.file.filename);
      return await processUploadedFile(tempFilePath, req.file);
    }

    // 多文件上传
    if (req.files && Array.isArray(req.files)) {
      const files = req.files as Express.Multer.File[];
      const processedFiles: UploadedFile[] = [];

      for (const file of files) {
        const tempFilePath = path.join(config.upload.tempPath, file.filename);
        const processedFile = await processUploadedFile(tempFilePath, file);
        processedFiles.push(processedFile);
      }

      return processedFiles;
    }

    throw new BadRequestError('上传文件格式错误');
  } catch (error) {
    // 清理临时文件
    if (req.file) {
      const tempFilePath = path.join(config.upload.tempPath, req.file.filename);
      cleanupTempFiles([tempFilePath]);
    } else if (req.files && Array.isArray(req.files)) {
      const files = req.files as Express.Multer.File[];
      const tempFilePaths = files.map(file => path.join(config.upload.tempPath, file.filename));
      cleanupTempFiles(tempFilePaths);
    }

    if (error instanceof Error && error.message.includes('BadRequest')) {
      throw error;
    }

    logger.error('处理上传失败:', error);
    throw new InternalServerError('文件上传处理失败');
  }
};

/**
 * 获取上传配置信息
 *
 * 返回前端可用的上传配置，包括最大文件大小、允许的文件类型和 CDN 配置，
 * 便于前端在上传前进行预校验。
 *
 * @returns 上传配置对象，包含 maxSize、allowedTypes、CDN 等信息
 */
export const getUploadConfig = () => {
  return {
    maxSize: config.upload.maxSize,
    maxSizeMB: config.upload.maxSize / 1024 / 1024,
    allowedTypes: config.upload.allowedTypes,
    allowedExtensions: config.upload.allowedTypes.map(mime => {
      // 简化的MIME类型到扩展名映射
      const mimeToExt: Record<string, string[]> = {
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'image/gif': ['.gif'],
        'image/webp': ['.webp'],
        'image/svg+xml': ['.svg'],
        'image/bmp': ['.bmp'],
        'image/tiff': ['.tiff', '.tif'],
        'application/pdf': ['.pdf'],
        'application/msword': ['.doc'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        'application/vnd.ms-excel': ['.xls'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        'application/vnd.ms-powerpoint': ['.ppt'],
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
        'text/plain': ['.txt'],
        'text/csv': ['.csv'],
        'application/zip': ['.zip'],
        'application/x-rar-compressed': ['.rar'],
        'application/x-7z-compressed': ['.7z'],
      };
      return mimeToExt[mime] || ['.bin'];
    }).flat(),
    path: config.upload.path,
    cdnEnabled: config.upload.cdn.enabled,
    cdnBaseUrl: config.upload.cdn.baseUrl,
  };
};

/**
 * 检查文件是否存在
 *
 * @param filePath - 文件路径
 * @returns 文件是否存在
 */
export const fileExists = (filePath: string): boolean => {
  return fs.existsSync(filePath);
};

/**
 * 删除上传的文件
 *
 * 从磁盘中删除指定路径的文件，删除失败时记录错误日志。
 *
 * @param filePath - 要删除的文件路径
 * @returns 是否成功删除（文件不存在也返回 true 的语义？实际返回 false）
 */
export const deleteUploadedFile = (filePath: string): boolean => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`文件已删除: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`删除文件失败: ${filePath}`, error);
    return false;
  }
};

/**
 * 获取文件信息
 *
 * 根据文件路径读取文件元数据（大小、扩展名等），推断 MIME 类型，
 * 并生成访问 URL。用于文件管理场景。
 *
 * @param filePath - 文件完整路径
 * @returns 文件信息对象，文件不存在时返回 null
 */
export const getFileInfo = (filePath: string): UploadedFile | null => {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const stats = fs.statSync(filePath);
    const filename = path.basename(filePath);

    // 从文件路径推断MIME类型（简化处理）
    const extension = path.extname(filePath).toLowerCase();
    const extensionToMime: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.bmp': 'image/bmp',
      '.tiff': 'image/tiff',
      '.tif': 'image/tiff',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.7z': 'application/x-7z-compressed',
    };

    const mimetype = extensionToMime[extension] || 'application/octet-stream';

    // 生成URL
    let fileUrl: string;
    if (config.upload.cdn.enabled && config.upload.cdn.baseUrl) {
      const relativePath = path.relative(config.upload.path, filePath);
      fileUrl = `${config.upload.cdn.baseUrl}/${relativePath.replace(/\\/g, '/')}`;
    } else {
      const relativePath = path.relative(process.cwd(), filePath);
      fileUrl = `/uploads/${relativePath.split(path.sep).slice(1).join('/')}`;
    }

    return {
      filename,
      originalname: filename,
      mimetype,
      size: stats.size,
      path: filePath,
      url: fileUrl,
    };
  } catch (error) {
    logger.error(`获取文件信息失败: ${filePath}`, error);
    return null;
  }
};

/**
 * 批量处理文件上传
 *
 * 对多个文件逐一处理后返回结果，单个文件处理失败不影响其他文件。
 * 适用于需要批量上传的场景。
 *
 * @param files - Multer 上传的文件数组
 * @returns 成功处理的 UploadedFile 数组
 */
export const uploadFiles = async (files: Express.Multer.File[]): Promise<UploadedFile[]> => {
  const processedFiles: UploadedFile[] = [];

  for (const file of files) {
    try {
      const tempFilePath = path.join(config.upload.tempPath, file.filename);
      const processedFile = await processUploadedFile(tempFilePath, file);
      processedFiles.push(processedFile);
    } catch (error) {
      logger.error(`处理文件 ${file.originalname} 失败:`, error);
      // 继续处理其他文件
    }
  }

  return processedFiles;
};

/**
 * 图片优化处理
 *
 * 使用 sharp 库对上传的图片进行压缩和尺寸调整，可选地缩小宽高
 * 以适配最大尺寸限制。需要依赖 sharp 库（可选），未安装时直接返回原路径。
 *
 * @param filePath - 图片文件路径
 * @param options - 优化选项
 * @param options.maxWidth - 最大宽度（默认使用配置值）
 * @param options.maxHeight - 最大高度（默认使用配置值）
 * @param options.quality - JPEG/WebP 质量（1-100，默认使用配置值）
 * @returns 优化后的文件路径（失败时返回原路径）
 */
export const optimizeImage = async (filePath: string, options?: {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}): Promise<string> => {
  try {
    // 检查是否为图片
    const mimetype = path.extname(filePath).toLowerCase();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff'];

    if (!imageExtensions.includes(mimetype)) {
      return filePath; // 非图片文件，直接返回原路径
    }

    // 如果没有安装sharp，直接返回原路径
    let sharp;
    try {
      sharp = require('sharp');
    } catch (error) {
      logger.warn('sharp库未安装，跳过图片优化');
      return filePath;
    }

    const image = sharp(filePath);
    const metadata = await image.metadata();

    const maxWidth = options?.maxWidth || config.upload.image.maxWidth;
    const maxHeight = options?.maxHeight || config.upload.image.maxHeight;
    const quality = options?.quality || config.upload.image.quality;

    let needResize = false;
    let resizeOptions: any = {};

    if (metadata.width && metadata.height) {
      if (metadata.width > maxWidth || metadata.height > maxHeight) {
        needResize = true;
        resizeOptions = {
          width: metadata.width > maxWidth ? maxWidth : undefined,
          height: metadata.height > maxHeight ? maxHeight : undefined,
          fit: 'inside',
          withoutEnlargement: true,
        };
      }
    }

    // 生成优化后的文件名
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const basename = path.basename(filePath, ext);
    const optimizedPath = path.join(dir, `${basename}_optimized${ext}`);

    if (needResize) {
      await image
        .resize(resizeOptions)
        .jpeg({ quality })
        .png({ quality: Math.floor(quality * 0.9) })
        .webp({ quality })
        .toFile(optimizedPath);
    } else {
      // 只调整质量
      await image
        .jpeg({ quality })
        .png({ quality: Math.floor(quality * 0.9) })
        .webp({ quality })
        .toFile(optimizedPath);
    }

    // 删除原文件，替换为优化后的文件
    fs.unlinkSync(filePath);
    fs.renameSync(optimizedPath, filePath);

    return filePath;
  } catch (error) {
    logger.error('图片优化失败:', error);
    return filePath; // 失败时返回原文件
  }
};