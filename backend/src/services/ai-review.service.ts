/**
 * AI 内容审核服务
 *
 * 集成 DeepSeek API 对用户提交的博客文章进行自动化内容审核。
 * 审核维度包括内容质量、内容安全、标题相关性和分类合理性。
 * 审核结果分为通过(approved)、拒绝(rejected)和人工审核(error)三种状态。
 */

import deepseekService from './deepseek.service';
import { approveContent, rejectContent } from './content-review.service';
import logger from '../utils/logger';

/**
 * AI 审核结果接口
 * @property decision 审核决策：approved 表示通过，rejected 表示拒绝，error 表示需要人工审核
 * @property score 内容质量评分（0-100）
 * @property reason 审核说明，拒绝时包含具体原因
 */
export interface AiReviewResult {
  decision: 'approved' | 'rejected' | 'error';
  score: number;
  reason: string;
}

/**
 * AI 审核系统提示词
 * 指导 DeepSeek 模型从内容质量、安全性、标题相关性和分类合理性四个维度评估文章
 */
const REVIEW_SYSTEM_PROMPT = `你是一个游戏社区博客内容审核助手。请审核用户提交的博客文章，从以下维度评估：

1. **内容质量**：是否有实质性内容，是否过短或无意义
2. **内容安全**：是否包含广告、恶意链接、人身攻击、违法信息
3. **标题相关性**：标题与内容是否匹配
4. **分类合理性**：内容是否适合所选分类

请以 JSON 格式回复，格式如下：
{
  "decision": "approved" 或 "rejected",
  "score": 0-100 的分数（60分以上为通过），
  "reason": "若拒绝，请用中文说明具体原因（20字以内）"
}

注意：
- 正常游戏讨论、技术分享、社区故事等一律通过
- 只有明显违规（广告、恶意、无意义灌水）才拒绝
- 不确定时选择 approved
- 如果不使用 JSON 格式回复将导致系统错误`;

/**
 * AI 审核博客文章内容
 *
 * 调用 DeepSeek API 对文章标题、内容和分类进行综合评估。
 * 若 AI 服务未启用或调用失败，返回 error 状态，让文章进入人工审核流程。
 *
 * @param title 博客文章标题
 * @param content 博客文章正文内容（截取前 2000 字符）
 * @param category 文章所属分类
 * @returns AI 审核结果对象
 */
export const reviewBlogContent = async (
  title: string,
  content: string,
  category: string,
): Promise<AiReviewResult> => {
  // 若 AI 服务未启用（未配置 API Key），返回 error 让文章进入人工审核
  if (!deepseekService.isEnabled()) {
    logger.warn('AI 审核跳过：DeepSeek 服务未启用');
    return { decision: 'error', score: 0, reason: 'AI 审核服务未配置' };
  }

  try {
    // 构造提交给 AI 的用户消息，内容截取前 2000 字符以控制 token 消耗
    const userMessage = `请审核这篇博客文章：

标题：${title}
分类：${category}
内容：
${content.slice(0, 2000)}`;

    // 调用 DeepSeek API，使用低温度(0.3)保证审核一致性，要求 JSON 格式输出
    const response = await deepseekService.generateResponse(
      REVIEW_SYSTEM_PROMPT,
      [{ role: 'user', content: userMessage }],
      { temperature: 0.3, maxTokens: 512, responseFormat: 'json_object' },
    );

    // 尝试解析 AI 返回的 JSON 响应
    const parsed = parseReviewResponse(response);

    if (!parsed) {
      logger.warn('AI 审核响应解析失败，标记为人工审核', { response });
      return { decision: 'error', score: 0, reason: 'AI 审核格式异常，需人工复核' };
    }

    logger.info(`AI 审核完成: title="${title}", decision=${parsed.decision}, score=${parsed.score}, reason="${parsed.reason}"`);
    return parsed;

  } catch (error) {
    logger.error('AI 审核调用失败，转入人工审核:', error);
    return { decision: 'error', score: 0, reason: 'AI 审核服务暂时不可用' };
  }
};

/**
 * 执行 AI 审核并根据结果自动更新文章审核状态
 *
 * 根据 AI 审核结果调用 content-review.service 的 approveContent 或 rejectContent
 * 更新文章的审核状态。若 AI 返回 error，则保持 pending 状态等待人工审核。
 *
 * @param newsId 文章 ID
 * @param title 文章标题
 * @param content 文章正文
 * @param category 文章分类
 * @returns AI 审核结果对象
 */
export const applyAiReview = async (
  newsId: string,
  title: string,
  content: string,
  category: string,
): Promise<AiReviewResult> => {
  const result = await reviewBlogContent(title, content, category);

  // 系统审核人员固定标识
  const SYSTEM_REVIEWER_ID = 'ai-system';

  switch (result.decision) {
    case 'approved':
      try {
        // AI 判定通过，自动更新文章状态为已审核通过
        await approveContent('news', newsId, SYSTEM_REVIEWER_ID);
        logger.info(`AI 自动通过审核: newsId=${newsId}, title="${title}"`);
      } catch (err) {
        logger.error(`AI 审核通过时写入失败: newsId=${newsId}`, err);
      }
      break;

    case 'rejected':
      try {
        // AI 判定拒绝，自动更新文章状态为已拒绝并附带原因
        await rejectContent('news', newsId, SYSTEM_REVIEWER_ID, result.reason);
        logger.info(`AI 自动拒绝审核: newsId=${newsId}, title="${title}", reason="${result.reason}"`);
      } catch (err) {
        logger.error(`AI 审核拒绝时写入失败: newsId=${newsId}`, err);
      }
      break;

    case 'error':
      // AI 不可用或解析失败，文章保持 pending 状态，等待人工审核
      logger.info(`AI 审核不可用，转入人工审核: newsId=${newsId}, title="${title}"`);
      break;
  }

  return result;
};

/**
 * 解析 AI 审核的 JSON 响应
 *
 * 尝试直接解析 JSON，若失败则尝试从文本中提取 JSON 块。
 * 对 decision 字段进行校验：若值为 approved 或 rejected 则直接返回；
 * 若不符合但评分 >= 60，视为通过。
 *
 * @param response AI 返回的原始响应字符串
 * @returns 解析成功的审核结果对象，或 null（解析失败）
 */
function parseReviewResponse(response: string): AiReviewResult | null {
  try {
    // 尝试直接解析 JSON
    const parsed = JSON.parse(response.trim());

    if (parsed && typeof parsed === 'object') {
      const decision = parsed.decision as string;
      const score = typeof parsed.score === 'number' ? parsed.score : parseInt(parsed.score, 10) || 0;
      const reason = parsed.reason || '';

      // 验证 decision 字段是否为合法值
      if (decision === 'approved' || decision === 'rejected') {
        return { decision, score, reason };
      }

      // 若 decision 不符合预期但评分 >= 60，出于宽容策略视为通过
      if (score >= 60) {
        return { decision: 'approved', score, reason };
      }
    }
  } catch {
    // 不是标准 JSON，尝试从响应文本中提取 JSON 块（使用正则匹配第一个 {} 结构）
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return parseReviewResponse(jsonMatch[0]);
      }
    } catch {
      // 无法解析
    }
  }

  return null;
}

export default { reviewBlogContent, applyAiReview };
