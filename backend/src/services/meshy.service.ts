/**
 * Meshy 3D 模型生成服务
 *
 * 提供与 Meshy API 的交互能力，支持将 2D 图片转换为 3D 模型。
 * 包含图片提交、任务状态查询等功能的封装。
 * 需要配置 MESHY_API_KEY 环境变量以启用该服务。
 */
import axios from 'axios';
import config from '../config';
import logger from '../utils/logger';

/**
 * 检查 Meshy 服务是否已启用
 *
 * 通过配置中的 meshy.enabled 字段判断服务是否开启。
 * 该功能依赖于外部 API 密钥配置，未开启时应在前端隐藏相关入口。
 *
 * @returns {boolean} 如果 Meshy 服务已启用返回 true，否则返回 false
 */
export const isMeshyEnabled = (): boolean => {
  return config.meshy.enabled;
};

/**
 * 提交图片转 3D 模型任务
 *
 * 将指定 URL 的图片发送到 Meshy API，启动图片到 3D 模型的转换流程。
 * 提交成功后返回任务 ID，用于后续轮询查询任务完成状态。
 *
 * @param imageUrl - 待转换的图片 URL 地址
 * @returns 包含 taskId 的对象，taskId 为 Meshy 平台的任务唯一标识
 * @throws 当 MESHY_API_KEY 未配置时抛出错误
 * @throws 当 API 请求失败时抛出包含错误详情的异常
 */
export const submitImageTo3D = async (imageUrl: string): Promise<{ taskId: string }> => {
  const { apiKey, baseUrl, timeout } = config.meshy;

  // 检查 API 密钥是否已配置，未配置则拒绝提交
  if (!apiKey) {
    throw new Error('MESHY_API_KEY 未配置');
  }

  try {
    logger.info(`Submitting image-to-3d task for: ${imageUrl}`);
    const response = await axios.post(
      `${baseUrl}/image-to-3d`,
      { image_url: imageUrl },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout,
      },
    );

    // 从响应中提取任务 ID
    const taskId: string = response.data.id;
    logger.info(`Image-to-3d task submitted: ${taskId}`);
    return { taskId };
  } catch (error: any) {
    // 区分 Axios 错误与其他异常，提取更精确的错误信息
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const detail = error.response?.data?.message || error.response?.data?.error || error.message;
      logger.error(`Meshy API submit error [${status}]: ${detail}`);
      throw new Error(`Meshy API 提交失败: ${detail}`);
    }
    logger.error(`Meshy submit unexpected error: ${error.message}`);
    throw error;
  }
};

/**
 * 查询 3D 模型生成任务状态
 *
 * 根据任务 ID 向 Meshy API 查询图片转 3D 任务的当前进度和结果。
 * 支持轮询调用直到任务完成（succeeded）或失败（failed）。
 *
 * @param taskId - 提交任务时返回的 Meshy 任务唯一标识
 * @returns 任务状态对象，包含：
 *   - id: 任务 ID
 *   - status: 当前状态（pending/processing/succeeded/failed）
 *   - progress: 处理进度百分比（可选）
 *   - model_urls: 各格式模型文件的下载链接（可选）
 *   - error_message: 失败时的错误信息（可选）
 *   - created_at: 任务创建时间
 *   - updated_at: 任务最后更新时间
 * @throws 当 MESHY_API_KEY 未配置时抛出错误
 * @throws 当 API 请求失败时抛出包含错误详情的异常
 */
export const queryTaskStatus = async (taskId: string): Promise<{
  id: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  progress?: number;
  model_urls?: { glb?: string; fbx?: string; obj?: string; mtl?: string; usdz?: string; thumbnail?: string };
  error_message?: string;
  created_at: string;
  updated_at: string;
}> => {
  const { apiKey, baseUrl, timeout } = config.meshy;

  // 检查 API 密钥是否已配置
  if (!apiKey) {
    throw new Error('MESHY_API_KEY 未配置');
  }

  try {
    const response = await axios.get(`${baseUrl}/image-to-3d/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      timeout,
    });

    // 映射响应数据到标准格式
    const data = response.data;
    return {
      id: data.id,
      status: data.status,
      progress: data.progress,
      model_urls: data.model_urls,
      error_message: data.error_message,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error: any) {
    // 区分 Axios 错误与其他异常
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const detail = error.response?.data?.message || error.response?.data?.error || error.message;
      logger.error(`Meshy API query error [${status}]: ${detail}`);
      throw new Error(`查询 3D 任务状态失败: ${detail}`);
    }
    logger.error(`Meshy query unexpected error: ${error.message}`);
    throw error;
  }
};
