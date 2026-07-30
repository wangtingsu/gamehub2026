import React, { useState, useRef, useCallback, useEffect } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { Button, Modal, Input, Space, message, Tooltip } from 'antd';
import { PictureOutlined, LinkOutlined, UploadOutlined, DragOutlined } from '@ant-design/icons';

/**
 * 上传图片到服务器，返回 URL
 */
async function uploadToServer(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append('file', file);
  const token = localStorage.getItem('adminToken');
  const res = await fetch('/api/v1/upload/image', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.data?.file?.url || null;
}

/**
 * 在文本中指定位置插入字符串
 */
function insertAtCursor(
  text: string,
  cursorPos: number,
  insertion: string
): { newText: string; newCursor: number } {
  const before = text.substring(0, cursorPos);
  const after = text.substring(cursorPos);
  const newText = before + insertion + after;
  const newCursor = cursorPos + insertion.length;
  return { newText, newCursor };
}

// Ant Design Form.Item 会传入 value 和 onChange
interface BlogEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  height?: number;
  placeholder?: string;
}

const BlogEditor: React.FC<BlogEditorProps> = ({ value = '', onChange, height = 400, placeholder }) => {
  const [uploading, setUploading] = useState(false);
  const [urlModalVisible, setUrlModalVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorWrapRef = useRef<HTMLDivElement>(null);

  /**
   * 获取编辑器 textarea 的当前光标位置
   */
  const getCursorPosition = useCallback((): number => {
    const textarea = editorWrapRef.current?.querySelector('textarea');
    if (textarea) {
      return textarea.selectionStart ?? value.length;
    }
    return value.length;
  }, [value]);

  /**
   * 设置编辑器 textarea 的光标位置
   */
  const setCursorPosition = useCallback((pos: number) => {
    const textarea = editorWrapRef.current?.querySelector('textarea');
    if (textarea) {
      textarea.focus();
      textarea.setSelectionRange(pos, pos);
    }
  }, []);

  /**
   * 上传文件并在光标处插入 Markdown 图片语法
   */
  const uploadAndInsert = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadToServer(file);
      if (!url) {
        message.error('图片上传失败');
        return;
      }
      const md = `![${file.name}](${url})`;
      const cursor = getCursorPosition();
      const { newText, newCursor } = insertAtCursor(value, cursor, `\n${md}\n`);
      onChange?.(newText);
      // 延迟设置光标，等 React 重新渲染
      setTimeout(() => setCursorPosition(newCursor), 0);
      message.success('图片已插入');
    } catch {
      message.error('图片上传失败');
    } finally {
      setUploading(false);
    }
  }, [value, onChange, getCursorPosition, setCursorPosition]);

  /**
   * 插入 URL 图片
   */
  const insertImageUrl = useCallback((url: string) => {
    if (!url.trim()) return;
    const md = `![](${url.trim()})`;
    const cursor = getCursorPosition();
    const { newText, newCursor } = insertAtCursor(value, cursor, `\n${md}\n`);
    onChange?.(newText);
    setTimeout(() => setCursorPosition(newCursor), 0);
    message.success('图片链接已插入');
  }, [value, onChange, getCursorPosition, setCursorPosition]);

  /**
   * 处理文件选择（点击上传按钮）
   */
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadAndInsert(files[0]);
    }
    // 重置 input 以允许重复选择同一文件
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [uploadAndInsert]);

  // ==================== 拖拽上传 ====================

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer?.types?.includes('Files')) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounter.current = 0;

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        if (files[i].type.startsWith('image/')) {
          uploadAndInsert(files[i]);
        }
      }
    }
  }, [uploadAndInsert]);

  // ==================== 粘贴上传 ====================

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        e.stopPropagation();
        const file = item.getAsFile();
        if (file) uploadAndInsert(file);
        return;
      }
    }
  }, [uploadAndInsert]);

  // 在编辑器容器上注册粘贴事件（捕获阶段，优先处理）
  useEffect(() => {
    const el = editorWrapRef.current;
    if (!el) return;
    el.addEventListener('paste', handlePaste, true);
    return () => el.removeEventListener('paste', handlePaste, true);
  }, [handlePaste]);

  // ==================== URL 插入模态框 ====================

  const handleUrlOk = () => {
    insertImageUrl(imageUrl);
    setImageUrl('');
    setUrlModalVisible(false);
  };

  return (
    <div ref={editorWrapRef} style={{ position: 'relative' }}>
      {/* 图片上传工具栏 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: 'var(--c-card, #fafafa)',
          borderRadius: '6px 6px 0 0',
          border: '1px solid var(--c-border, #e5e7eb)',
          borderBottom: 'none',
          fontSize: 13,
        }}
      >
        {/* 隐藏的文件选择器 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        <Tooltip title="选择本地图片上传">
          <Button
            size="small"
            icon={uploading ? undefined : <PictureOutlined />}
            loading={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            上传图片
          </Button>
        </Tooltip>

        <Tooltip title="粘贴在线图片链接">
          <Button
            size="small"
            icon={<LinkOutlined />}
            onClick={() => setUrlModalVisible(true)}
          >
            图片URL
          </Button>
        </Tooltip>

        <span style={{ color: 'var(--c-text2, #9ca3af)', marginLeft: 8, fontSize: 12 }}>
          <DragOutlined style={{ marginRight: 4 }} />
          拖拽图片到编辑器 或 Ctrl+V 粘贴截图
        </span>
      </div>

      {/* MDEditor */}
      <div data-color-mode="light" style={{ position: 'relative' }}>
        <MDEditor
          value={value}
          onChange={(v) => onChange?.(v || '')}
          height={height}
          preview="live"
          visibleDragbar={false}
          textareaProps={{
            placeholder: placeholder || '使用 Markdown 编写，支持拖拽/粘贴上传图片...',
          }}
        />

        {/* 拖拽覆盖层 */}
        {isDragOver && (
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(24, 144, 255, 0.08)',
              border: '3px dashed #1890ff',
              borderRadius: 4,
              pointerEvents: 'auto',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <UploadOutlined style={{ fontSize: 48, color: '#1890ff' }} />
              <p style={{ marginTop: 12, fontSize: 16, color: '#1890ff', fontWeight: 500 }}>
                释放以上传图片
              </p>
              <p style={{ fontSize: 13, color: '#666' }}>
                支持 JPG、PNG、GIF、WebP 格式
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 底部提示栏 */}
      <div
        style={{
          padding: '8px 12px',
          background: 'var(--c-card, #fafafa)',
          borderRadius: '0 0 6px 6px',
          border: '1px solid var(--c-border, #e5e7eb)',
          borderTop: 'none',
          fontSize: 13,
          color: 'var(--c-text2, #6b7280)',
        }}
      >
        <strong style={{ color: 'var(--c-text, #1f2937)' }}>快捷操作：</strong>
        选中文字后点击工具栏按钮即可自动添加格式。
        <span style={{ marginLeft: 16 }}>
          📷 <strong style={{ color: 'var(--c-text, #1f2937)' }}>图片：</strong>
          拖拽 / 粘贴 / 点击按钮上传
        </span>
        <span style={{ marginLeft: 16 }}>
          👁 <strong style={{ color: 'var(--c-text, #1f2937)' }}>预览：</strong>
          点击工具栏眼睛图标
        </span>
      </div>

      {/* 图片 URL 输入模态框 */}
      <Modal
        title="插入图片链接"
        open={urlModalVisible}
        onOk={handleUrlOk}
        onCancel={() => {
          setUrlModalVisible(false);
          setImageUrl('');
        }}
        okText="插入"
        cancelText="取消"
        width={520}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
              图片 URL
            </label>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.png"
              onPressEnter={handleUrlOk}
              autoFocus
            />
          </div>
          <p style={{ color: '#9ca3af', fontSize: 12, margin: 0 }}>
            粘贴在线图片的完整 URL 地址，支持 JPG、PNG、GIF、WebP 等格式
          </p>
        </Space>
      </Modal>
    </div>
  );
};

export default BlogEditor;
