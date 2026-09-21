/**
 * IndexNow 推送服务
 *
 * 在内容发布/更新时，向 IndexNow 协议端点推送变更 URL，
 * 让 Bing、Yandex、Naver 等支持 IndexNow 的搜索引擎即时抓取，
 * 替代被动等待 sitemap 轮询。
 *
 * 认证方式：密钥文件。密钥文件位于站点根目录（frontend/public/<key>.txt），
 * 由 nginx 直接静态托管，内容即为下方 INDEXNOW_KEY。
 *
 * @module services/indexnow
 */

import axios from 'axios';
import config from '../config';
import logger from '../utils/logger';

/** IndexNow 密钥（与 frontend/public/<key>.txt 内容一致） */
const INDEXNOW_KEY = 'b0918b7b446be8932fc86fd355db89d2';

/** IndexNow 官方端点 */
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

/**
 * 将站点内路径拼接为完整 URL
 *
 * @param path - 站点内路径（如 /news/some-slug，可省略前导斜杠）
 * @returns 完整 URL
 */
function buildSiteUrl(path: string): string {
  return `${config.siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * 向 IndexNow 推送一批变更 URL（生产环境才推送，失败不阻断主流程）
 *
 * @param paths - 站点内路径数组（如 ['/news/some-slug', '/reviews/12']）
 */
export async function notifyIndexNow(paths: string[]): Promise<void> {
  if (process.env.NODE_ENV !== 'production') return;
  if (!paths || paths.length === 0) return;

  let host: string;
  try {
    host = new URL(config.siteUrl).host;
  } catch {
    logger.error('IndexNow 推送跳过：SITE_URL 无效', { siteUrl: config.siteUrl });
    return;
  }

  const urlList = paths.map(buildSiteUrl);

  try {
    await axios.post(
      INDEXNOW_ENDPOINT,
      {
        host,
        key: INDEXNOW_KEY,
        keyLocation: `${config.siteUrl}/${INDEXNOW_KEY}.txt`,
        urlList,
      },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' }, timeout: 5000 }
    );
    logger.info('IndexNow 推送成功', { count: urlList.length });
  } catch (error) {
    logger.error('IndexNow 推送失败:', { error: error instanceof Error ? error.message : error });
  }
}

export default { notifyIndexNow };
