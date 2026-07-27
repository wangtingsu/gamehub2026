/**
 * 图片清理服务
 *
 * 提供以下功能：
 * - 从内容中提取本地图片路径
 * - 删除内容时同步清理关联的本地图片
 * - 扫描并清理孤儿图片（未被任何内容引用的本地图片）
 */
import fs from 'fs';
import path from 'path';
import { query } from '../db';
import logger from '../utils/logger';
import config from '../config';

/** 本地图片 URL 前缀 */
const UPLOAD_PREFIX = '/uploads/';

/**
 * 从内容文本中提取所有本地图片路径
 * 支持 HTML img 标签和 Markdown 图片语法
 */
export const extractLocalImagePaths = (content: string): string[] => {
  if (!content) return [];
  const paths = new Set<string>();

  // 匹配 HTML img 标签: src="/uploads/..."
  const htmlRegex = /src=["'](\/uploads\/[^"']+)["']/gi;
  let m;
  while ((m = htmlRegex.exec(content)) !== null) {
    paths.add(decodeURI(m[1]));
  }

  // 匹配 Markdown 图片: ![alt](/uploads/...)
  const mdRegex = /!\[.*?\]\((\/uploads\/[^)]+)\)/gi;
  while ((m = mdRegex.exec(content)) !== null) {
    paths.add(decodeURI(m[1]));
  }

  return Array.from(paths);
};

/**
 * 删除指定路径的本地图片文件
 */
export const deleteLocalImage = (urlPath: string): boolean => {
  try {
    const uploadDir = config.upload.path;
    // /uploads/image/2026/07/20/file.jpg → uploadDir/image/2026/07/20/file.jpg
    const relativePath = urlPath.replace(/^\/uploads\//, '');
    const fullPath = path.join(uploadDir, relativePath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      logger.info(`图片已删除: ${urlPath}`);

      // 尝试删除空目录
      const dir = path.dirname(fullPath);
      try {
        const files = fs.readdirSync(dir);
        if (files.length === 0) {
          fs.rmdirSync(dir);
          // 继续尝试删除上级空目录
          const parentDir = path.dirname(dir);
          const parentFiles = fs.readdirSync(parentDir);
          if (parentFiles.length === 0) fs.rmdirSync(parentDir);
        }
      } catch { /* 目录非空或权限不足，跳过 */ }

      return true;
    }
    return false;
  } catch (error) {
    logger.error(`删除本地图片失败: ${urlPath}`, error);
    return false;
  }
};

/**
 * 删除内容时清理其引用的本地图片
 */
export const cleanupContentImages = (content: string): number => {
  const paths = extractLocalImagePaths(content);
  let deleted = 0;
  for (const p of paths) {
    if (deleteLocalImage(p)) deleted++;
  }
  return deleted;
};

/**
 * 扫描所有内容表中的本地图片引用，返回被引用的图片路径集合
 */
const getAllReferencedImages = async (): Promise<Set<string>> => {
  const referenced = new Set<string>();

  const tables = ['news', 'blog_articles', 'reviews', 'guides', 'community_posts', 'comments'];
  for (const table of tables) {
    try {
      const rows = await query(`SELECT content FROM ${table}`) as any[];
      for (const row of rows) {
        if (row.content) {
          const paths = extractLocalImagePaths(row.content);
          paths.forEach(p => referenced.add(p));
        }
      }
    } catch (e: any) {
      logger.debug(`扫描表 ${table} 失败: ${e.message}`);
    }
  }

  return referenced;
};

/**
 * 扫描上传目录中的所有图片文件，返回文件路径集合
 */
const getAllUploadedImages = (): string[] => {
  const uploadDir = config.upload.path;
  const files: string[] = [];

  const walkDir = (dir: string) => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch { /* skip inaccessible dirs */ }
  };

  walkDir(uploadDir);
  return files;
};

/**
 * 清理孤儿图片（未被任何内容引用的图片）
 * @returns 删除的图片数量
 */
export const cleanupOrphanImages = async (): Promise<number> => {
  const referenced = await getAllReferencedImages();
  const uploaded = getAllUploadedImages();

  let deleted = 0;
  for (const fullPath of uploaded) {
    // 将绝对路径转为 URL 路径进行匹配
    const urlPath = fullPath.replace(config.upload.path, UPLOAD_PREFIX).replace(/\\/g, '/');
    if (!referenced.has(urlPath)) {
      try {
        fs.unlinkSync(fullPath);
        deleted++;
        logger.info(`清理孤儿图片: ${urlPath}`);
      } catch (e: any) {
        logger.error(`删除孤儿图片失败: ${fullPath}`, e);
      }
    }
  }

  return deleted;
};

export default { extractLocalImagePaths, deleteLocalImage, cleanupContentImages, cleanupOrphanImages };
