import MDEditor from '@uiw/react-md-editor';

// Ant Design Form.Item 会传入 value 和 onChange
interface BlogEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  height?: number;
}

const BlogEditor: React.FC<BlogEditorProps> = ({ value = '', onChange, height = 400 }) => {
  return (
    <div data-color-mode="light">
      <MDEditor
        value={value}
        onChange={(v) => onChange?.(v || '')}
        height={height}
        preview="live"
        visibleDragbar={false}
        textareaProps={{ placeholder: '使用 Markdown 编写，支持拖拽/粘贴上传图片...' }}
      />
      <div style={{ padding: '8px 12px', background: 'var(--c-card)', borderRadius: '0 0 6px 6px', border: '1px solid var(--c-border)', borderTop: 'none', fontSize: 13, color: 'var(--c-text2)' }}>
        <strong style={{ color: 'var(--c-text)' }}>快捷操作：</strong>
        选中文字后点击工具栏按钮即可自动添加格式。
        <span style={{ marginLeft: 16 }}>📷 <strong style={{ color: 'var(--c-text)' }}>图片：</strong>拖拽 / 粘贴 / 点击 📷 按钮上传</span>
        <span style={{ marginLeft: 16 }}>👁 <strong style={{ color: 'var(--c-text)' }}>预览：</strong>点击工具栏眼睛图标</span>
      </div>
    </div>
  );
};

export default BlogEditor;
