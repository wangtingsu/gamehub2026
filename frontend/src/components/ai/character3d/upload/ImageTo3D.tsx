/**
 * ImageTo3D - AI 图转 3D 模型组件
 *
 * 将上传的 2D 图片通过 AI 服务转换为 3D GLB 模型：
 * 1. 用户选择图片并预览
 * 2. 上传图片到服务器
 * 3. 提交图转 3D 任务
 * 4. 轮询任务状态直至完成
 * 5. 模型就绪后回调父组件
 */
import React, { useState, useCallback } from 'react';
import { Upload, Button, Progress, Card, Typography, message, Space } from 'antd';
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import apiClient from '../../../../api/client';

const { Text } = Typography;

/** ImageTo3D 组件的属性接口 */
interface ImageTo3DProps {
  onModelReady: (modelUrl: string, taskId: string) => void; // 模型生成完成回调
  disabled?: boolean;                                          // 是否禁用
}

/** 任务状态枚举 */
type TaskStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';

/**
 * ImageTo3D 主组件
 * 处理图片上传、3D 生成任务提交、轮询和结果回调的完整流程
 */
const ImageTo3D: React.FC<ImageTo3DProps> = ({ onModelReady, disabled }) => {
  /* ====== 状态 ====== */
  const [status, setStatus] = useState<TaskStatus>('idle');     // 当前任务状态
  const [progress, setProgress] = useState(0);                   // 任务进度（0-100）
  const [taskId, setTaskId] = useState<string | null>(null);     // 当前任务 ID
  const [fileList, setFileList] = useState<UploadFile[]>([]);    // 上传的文件列表
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // 图片预览 URL

  /**
   * 提交图转 3D 任务
   * 流程：上传图片 -> 提交任务 -> 轮询状态 -> 完成回调
   */
  const handleSubmit = useCallback(async () => {
    if (fileList.length === 0) {
      message.warning('请先上传一张图片');
      return;
    }

    const file = fileList[0];
    if (!file.originFileObj) return;

    setStatus('uploading');
    setProgress(0);

    try {
      // Upload image to server using apiClient (auto-injects auth token)
      const formData = new FormData();
      formData.append('file', file.originFileObj);

      const uploadResult: any = await apiClient.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const imageUrl = uploadResult?.file?.url || uploadResult?.file?.path;
      if (!imageUrl) {
        throw new Error('图片上传返回的 URL 为空');
      }

      // Submit image-to-3D task
      setStatus('processing');
      const taskResult: any = await apiClient.post('/ai/image-to-3d', { imageUrl });

      const tid: string = taskResult.taskId;
      setTaskId(tid);

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max (5s interval)

      const poll = async () => {
        attempts++;
        try {
          const statusResult: any = await apiClient.get(`/ai/image-to-3d/${tid}`);

          const taskStatus = statusResult.status;
          setProgress(statusResult.progress || 0);

          if (taskStatus === 'succeeded') {
            const modelUrls = statusResult.modelUrls;
            const glbUrl = modelUrls?.glb;
            if (glbUrl) {
              setStatus('completed');
              setProgress(100);
              onModelReady(glbUrl, tid);
              message.success('3D 模型生成完成！');
            } else {
              throw new Error('模型 URL 未找到');
            }
          } else if (taskStatus === 'failed') {
            throw new Error(statusResult.errorMessage || '模型生成失败');
          } else if (attempts < maxAttempts) {
            setTimeout(poll, 3000);
          } else {
            throw new Error('处理超时，请稍后重试');
          }
        } catch (err) {
          // Retry on transient errors (network, server 5xx)
          if (attempts < maxAttempts) {
            setTimeout(poll, 3000);
          } else {
            setStatus('failed');
            message.error('轮询超时，请稍后重试');
          }
        }
      };

      poll();
    } catch (err: any) {
      setStatus('failed');
      message.error(err.message || '3D 生成失败');
    }
  }, [fileList, onModelReady]);

  /** 重置所有状态为初始值（回到选择图片阶段） */
  const handleReset = () => {
    setStatus('idle');
    setProgress(0);
    setTaskId(null);
    setFileList([]);
    setPreviewUrl(null);
  };

  return (
    <Card size="small" title="图片转 3D 模型" className="mb-3">
      <div className="space-y-3">
        {/* Upload area */}
        {status === 'idle' && (
          <Upload
            accept="image/jpeg,image/png,image/webp"
            maxCount={1}
            fileList={fileList}
            beforeUpload={(file) => {
              setFileList([file as UploadFile]);
              setPreviewUrl(URL.createObjectURL(file));
              return false;
            }}
            onRemove={handleReset}
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />} disabled={disabled}>
              选择图片
            </Button>
          </Upload>
        )}

        {/* Preview thumbnail */}
        {previewUrl && status === 'idle' && (
          <div className="relative inline-block">
            <img
              src={previewUrl}
              alt="预览"
              className="w-24 h-24 object-cover rounded border"
            />
            <Button
              size="small"
              type="text"
              danger
              icon={<DeleteOutlined />}
              className="absolute -top-2 -right-2"
              onClick={handleReset}
            />
          </div>
        )}

        {/* Progress */}
        {status === 'processing' && (
          <div className="space-y-2">
            <Progress
              percent={progress || undefined}
              status="active"
              strokeColor="#4a90d9"
              size="small"
            />
            <Text type="secondary" className="text-xs">
              正在生成 3D 模型，通常需要 1-5 分钟...
            </Text>
          </div>
        )}

        {/* Completion */}
        {status === 'completed' && (
          <div className="space-y-2">
            <Progress percent={100} status="success" size="small" />
            <Text type="success" className="text-xs">3D 模型已就绪</Text>
          </div>
        )}

        {/* Error */}
        {status === 'failed' && (
          <div className="space-y-2">
            <Text type="danger" className="text-xs">生成失败，请重试</Text>
          </div>
        )}

        {/* Action buttons */}
        <Space size={8}>
          {status === 'idle' && previewUrl && (
            <Button
              size="small"
              type="primary"
              onClick={handleSubmit}
              disabled={disabled}
            >
              生成 3D 模型
            </Button>
          )}
          {(status === 'completed' || status === 'failed') && (
            <Button size="small" onClick={handleReset}>
              重新开始
            </Button>
          )}
        </Space>
      </div>
    </Card>
  );
};

export default ImageTo3D;
