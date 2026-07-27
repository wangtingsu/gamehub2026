/**
 * Meshy API 类型定义模块
 *
 * 定义与 Meshy 3D 模型生成服务交互所需的 TypeScript 类型。
 * 包含任务状态枚举、模型文件 URL 结构、任务响应和提交请求/响应的接口。
 *
 * Meshy 是一个 AI 驱动的 3D 内容生成平台，支持从图片生成 3D 模型。
 *
 * @module types/meshy.types
 */

/** Meshy 任务状态枚举 */
export enum MeshyTaskStatus {
  /** 任务排队等待处理 */
  PENDING = 'pending',
  /** 任务正在处理中 */
  PROCESSING = 'processing',
  /** 任务成功完成 */
  SUCCEEDED = 'succeeded',
  /** 任务处理失败 */
  FAILED = 'failed',
}

/** Meshy 模型文件 URL 集合 */
export interface MeshyModelUrls {
  /** GLB 格式模型文件 */
  glb?: string;
  /** FBX 格式模型文件 */
  fbx?: string;
  /** OBJ 格式模型文件 */
  obj?: string;
  /** MTL 材质文件（与 OBJ 配套） */
  mtl?: string;
  /** USDZ 格式模型文件（适用于 AR） */
  usdz?: string;
  /** 缩略图 URL */
  thumbnail?: string;
}

/** Meshy 任务查询响应 */
export interface MeshyTaskResponse {
  /** 任务唯一标识 */
  id: string;
  /** 当前任务状态 */
  status: MeshyTaskStatus;
  /** 生成完成后的模型文件 URL 集合 */
  model_urls?: MeshyModelUrls;
  /** 任务处理进度百分比（0-100） */
  progress?: number;
  /** 任务失败时的错误信息 */
  error_message?: string;
  /** 任务创建时间 */
  created_at: string;
  /** 任务最后更新时间 */
  updated_at: string;
}

/** Meshy 任务提交请求参数 */
export interface MeshySubmitRequest {
  /** 输入图片的 URL（用于从图片生成 3D 模型） */
  image_url: string;
}

/** Meshy 任务提交响应 */
export interface MeshySubmitResponse {
  /** 创建的任务唯一标识，可用于后续查询任务状态 */
  id: string;
}
