import { useTranslation } from 'react-i18next';
import MDEditor from '@uiw/react-md-editor';

interface BlogRenderContentProps {
  content: string;
}

const BlogRenderContent: React.FC<BlogRenderContentProps> = ({ content }) => {
  const { t } = useTranslation();
  if (!content) return <p className="text-gray-400">{t('blog.noContent', '暂无内容')}</p>;

  // 始终用 Markdown 渲染，它能同时处理 Markdown 和 HTML 混合内容
  return (
    <div data-color-mode="light" className="blog-markdown-body">
      <style>{`
        .blog-markdown-body img { max-width: 100%; border-radius: 12px; margin: 12px 0; }
        .blog-markdown-body pre { border-radius: 8px; }
        .blog-markdown-body code { font-size: 15px; }
        .blog-markdown-body h1, .blog-markdown-body h2, .blog-markdown-body h3 { margin-top: 1.5em; margin-bottom: 0.5em; color: var(--c-text); }
        .blog-markdown-body p { line-height: 1.9; color: var(--c-text); }
        .blog-markdown-body blockquote { border-left-color: var(--c-focus); }
        .blog-markdown-body a { color: var(--c-focus); }
        .blog-markdown-body table { border-collapse: collapse; }
        .blog-markdown-body th, .blog-markdown-body td { border: 1px solid var(--c-border); padding: 8px 12px; }
        .blog-markdown-body th { background: var(--c-card); }
      `}</style>
      <MDEditor.Markdown
        source={content}
        style={{ backgroundColor: 'transparent', color: 'var(--c-text)', fontSize: 18, lineHeight: 1.9 }}
      />
    </div>
  );
};

export default BlogRenderContent;
