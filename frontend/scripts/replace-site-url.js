#!/usr/bin/env node

/**
 * replace-site-url.js - 构建时站点 URL 占位符替换脚本
 *
 * 将静态文件中的 __SITE_URL__ 占位符替换为环境变量 VITE_SITE_URL 的值
 * 主要用于在构建时动态设置 robots.txt 中的站点 URL
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '../public');
const siteUrl = process.env.VITE_SITE_URL || 'https://gamehub.example.com';

console.log(`正在替换 __SITE_URL__ 为: ${siteUrl}`);

// 需要处理的静态文件列表
const filesToProcess = [
  'robots.txt'
];

filesToProcess.forEach(filename => {
  const filePath = path.join(publicDir, filename);

  // 跳过不存在的文件
  if (!fs.existsSync(filePath)) {
    console.warn(`文件未找到: ${filename}`);
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    // 替换所有 __SITE_URL__ 占位符为实际站点 URL
    content = content.replace(/__SITE_URL__/g, siteUrl);

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`已更新: ${filename}`);
    } else {
      console.log(`无需更改: ${filename}`);
    }
  } catch (error) {
    console.error(`处理 ${filename} 时出错:`, error.message);
  }
});

console.log('站点 URL 替换完成。');