/**
 * DeepSeek AI 服务客户端
 *
 * 封装对 DeepSeek API 的 HTTP 调用，提供统一的 AI 对话接口。
 * 支持自定义系统提示词、消息历史和生成参数（温度、最大 Token 数、响应格式）。
 * 内置错误处理和友好的中文错误消息反馈。
 */

import axios from 'axios';
import config from '../config';
import logger from '../utils/logger';

/**
 * 聊天消息接口
 * 表示发送给 AI 模型的一条消息
 */
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * AI 生成选项接口
 * @property temperature 生成温度（0-2），值越低输出越确定，越高越有创造性
 * @property maxTokens 最大生成 Token 数
 * @property responseFormat 响应格式：text（纯文本）或 json_object（JSON 对象）
 */
interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json_object';
}

/**
 * DeepSeek AI 服务类
 *
 * 封装与 DeepSeek API 的通信，提供聊天补全功能。
 * 支持通过配置启用/禁用服务，当 API Key 未配置时服务自动降级。
 */
class DeepseekService {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private defaultMaxTokens: number;
  private timeout: number;
  private enabled: boolean;

  /**
   * 从应用配置中初始化服务参数
   */
  constructor() {
    this.apiKey = config.deepseek.apiKey;
    this.baseUrl = config.deepseek.baseUrl;
    this.model = config.deepseek.model;
    this.defaultMaxTokens = config.deepseek.maxTokens;
    this.timeout = config.deepseek.timeout;
    this.enabled = config.deepseek.enabled;
  }

  /**
   * 检查 AI 服务是否已启用
   *
   * @returns true 表示服务可用，false 表示未配置或已禁用
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  private getMockReply(messages: Array<{ role: string; content: string }>): string {
    const lastMsg = messages[messages.length - 1]?.content || '';
    const replies = [
      '听起来很有意思！说说你的想法吧~',
      '这个问题很好，让我想想...我觉得可以从不同角度来考虑。',
      '感谢分享！游戏中的这些体验确实让人难忘。',
      '我也遇到过类似的情况，多尝试几次就会找到方法的。',
      '哈哈，这个确实好玩！你还有什么有趣的经历吗？'
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  /**
   * 向 DeepSeek API 发送聊天请求并获取响应
   *
   * 构建 system prompt + 消息历史，调用聊天补全接口。
   * 支持设置温度、最大 Token 数和 JSON 响应格式。
   * 当服务未启用或调用失败时，返回友好的中文提示而非抛出异常。
   *
   * @param systemPrompt 系统提示词，定义 AI 的行为角色和输出规范
   * @param messages 对话消息列表（user/assistant 角色交替）
   * @param options 可选的生成参数配置
   * @returns AI 生成的响应文本，或在出错时返回错误提示
   */
  async generateResponse(
    systemPrompt: string,
    messages: Array<{ role: string; content: string }>,
    options?: GenerateOptions,
  ): Promise<string> {
    // 服务未启用时直接返回提示信息
    if (!this.enabled) {
      logger.warn('DeepSeek API 未启用（缺少 DEEPSEEK_API_KEY）');
      return 'AI 功能暂未配置，请在 .env 中设置 DEEPSEEK_API_KEY';
    }

    // 将 system prompt 和用户消息合并为完整的请求消息数组
    const chatMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    try {
      // 调用 DeepSeek 聊天补全 API
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: chatMessages,
          // 温度默认 0.8，在确定性和创造性之间取得平衡
          temperature: options?.temperature ?? 0.8,
          max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
          // 若要求 JSON 格式输出，设置 response_format
          ...(options?.responseFormat === 'json_object' ? { response_format: { type: 'json_object' } } : {}),
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: this.timeout,
        },
      );

      // 提取 AI 回复内容
      return response.data.choices[0].message.content || '';
    } catch (error: any) {
      // 按错误类型分类处理，返回友好的中文提示
      if (error.code === 'ECONNABORTED') {
        logger.error('DeepSeek API 请求超时');
        return 'AI 响应超时，请稍后重试';
      }
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          logger.error('DeepSeek API 密钥验证失败，降级为模拟回复');
          return this.getMockReply(messages);
        }
        if (status === 429) {
          logger.warn('DeepSeek API 请求过于频繁');
          return 'AI 请求过于频繁，请稍后重试';
        }
        logger.error(`DeepSeek API 返回错误 ${status}:`, error.response.data);
      } else {
        logger.error('DeepSeek API 网络错误:', error.message);
      }
      return 'AI 服务暂时不可用，请稍后再试';
    }
  }
}

/** DeepSeek 服务单例实例 */
export const deepseekService = new DeepseekService();
export default deepseekService;
