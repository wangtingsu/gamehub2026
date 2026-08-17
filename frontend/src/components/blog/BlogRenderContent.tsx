import { useTranslation } from 'react-i18next';
import MDEditor from '@uiw/react-md-editor';

interface BlogRenderContentProps {
  content: string;
}

/**
 * 博客正文渲染组件
 * 使用 @uiw/react-md-editor 的 Markdown 渲染器，并针对深色主题
 * 覆盖了完整的排版样式（标题/段落/图片/引用/代码/表格等），
 * 保证正文在暗色背景下有良好的对比度与可读性。
 */
const BlogRenderContent: React.FC<BlogRenderContentProps> = ({ content }) => {
  const { t } = useTranslation();
  if (!content) return <p className="text-gray-400">{t('blog.noContent', 'No content yet')}</p>;

  return (
    <div data-color-mode="dark" className="blog-markdown-body">
      <style>{`
        .blog-markdown-body { color: #cbd5e1; font-size: 17px; }
        .blog-markdown-body .wmde-markdown { background: transparent !important; color: #cbd5e1; font-size: 17px; line-height: 1.9; }
        .blog-markdown-body h1, .blog-markdown-body h2, .blog-markdown-body h3,
        .blog-markdown-body h4, .blog-markdown-body h5, .blog-markdown-body h6 {
          color: #f1f5f9 !important; border-bottom: none; font-weight: 700; scroll-margin-top: 90px;
        }
        .blog-markdown-body h1 { font-size: 1.7rem; margin: 2rem 0 1rem; }
        .blog-markdown-body h2 { font-size: 1.45rem; font-weight: 700; margin: 2.2rem 0 1rem; padding-left: 0.85rem; border-left: 4px solid #38bdf8; border-bottom: none !important; }
        .blog-markdown-body h3 { font-size: 1.22rem; font-weight: 600; margin: 1.8rem 0 0.8rem; }
        .blog-markdown-body h4, .blog-markdown-body h5, .blog-markdown-body h6 { margin: 1.5rem 0 0.6rem; }
        .blog-markdown-body p { color: #cbd5e1 !important; line-height: 1.9; margin: 1.05rem 0; }
        .blog-markdown-body strong { color: #f8fafc; font-weight: 700; }
        .blog-markdown-body em { color: #e2e8f0; }
        .blog-markdown-body a { color: #38bdf8 !important; text-decoration: none; border-bottom: 1px solid rgba(56,189,248,0.35); }
        .blog-markdown-body a:hover { color: #7dd3fc !important; border-bottom-color: #7dd3fc; }
        .blog-markdown-body img { max-width: 100%; border-radius: 14px; margin: 1.4rem 0; box-shadow: 0 10px 30px rgba(0,0,0,0.4); display: block; }
        .blog-markdown-body blockquote { border-left: 4px solid #38bdf8; background: #1e293b; padding: 1rem 1.3rem; border-radius: 0 14px 14px 0; margin: 1.4rem 0; color: #e2e8f0; }
        .blog-markdown-body blockquote p { color: #cbd5e1; margin: 0; }
        .blog-markdown-body code { background: #1e293b; color: #7dd3fc; padding: 0.18rem 0.45rem; border-radius: 6px; font-size: 0.9em; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
        .blog-markdown-body pre { background: #0f172a !important; border: 1px solid #334155; border-radius: 12px; padding: 1rem 1.2rem; overflow-x: auto; margin: 1.4rem 0; }
        .blog-markdown-body pre code { background: transparent !important; color: #e2e8f0; padding: 0; font-size: 0.9em; }
        .blog-markdown-body table { border-collapse: collapse; width: 100%; margin: 1.4rem 0; display: table; }
        .blog-markdown-body th, .blog-markdown-body td { border: 1px solid #334155 !important; padding: 0.6rem 0.9rem; }
        .blog-markdown-body th { background: #1e293b !important; color: #f1f5f9; font-weight: 600; }
        .blog-markdown-body td { color: #cbd5e1; }
        .blog-markdown-body ul, .blog-markdown-body ol { color: #cbd5e1; padding-left: 1.6rem; }
        .blog-markdown-body li { margin: 0.4rem 0; }
        .blog-markdown-body li::marker { color: #38bdf8; }
        .blog-markdown-body hr { border-color: #334155; margin: 2rem 0; }
        .blog-markdown-body del { color: #64748b; }
      `}</style>
      <MDEditor.Markdown
        source={content}
        style={{ backgroundColor: 'transparent', color: '#cbd5e1', fontSize: 17, lineHeight: 1.9 }}
      />
    </div>
  );
};

export default BlogRenderContent;
