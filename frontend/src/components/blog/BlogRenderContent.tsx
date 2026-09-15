import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MDEditor from '@uiw/react-md-editor';

interface BlogRenderContentProps {
  content: string;
}

/**
 * 博客/新闻正文渲染组件
 * 使用 @uiw/react-md-editor 的 Markdown 渲染器，配色通过 CSS 变量跟随全局主题
 * （[data-theme] 上的 --c-text / --c-text2 / --c-card / --c-bg / --c-border 等），
 * 保证正文在深色与浅色背景下都有良好的对比度与可读性。
 */
const BlogRenderContent: React.FC<BlogRenderContentProps> = ({ content }) => {
  const { t } = useTranslation();
  // data-color-mode 跟随全局主题（SSR 端 document 不存在，回退 dark）
  const [colorMode, setColorMode] = useState<'light' | 'dark'>(() =>
    typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light'
      ? 'light'
      : 'dark'
  );

  useEffect(() => {
    const apply = () =>
      setColorMode(
        document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
      );
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  if (!content) return <p className="text-gray-400">{t('blog.noContent', 'No content yet')}</p>;

  return (
    <div data-color-mode={colorMode} className="blog-markdown-body">
      <style>{`
        .blog-markdown-body { color: var(--c-text); font-size: 17px; }
        .blog-markdown-body .wmde-markdown { background: transparent !important; color: var(--c-text); font-size: 17px; line-height: 1.9; }
        .blog-markdown-body h1, .blog-markdown-body h2, .blog-markdown-body h3,
        .blog-markdown-body h4, .blog-markdown-body h5, .blog-markdown-body h6 {
          color: var(--c-text) !important; border-bottom: none; font-weight: 700; scroll-margin-top: 90px;
        }
        .blog-markdown-body h1 { font-size: 1.7rem; margin: 2rem 0 1rem; }
        .blog-markdown-body h2 { font-size: 1.45rem; font-weight: 700; margin: 2.2rem 0 1rem; padding-left: 0.85rem; border-left: 4px solid var(--c-focus); border-bottom: none !important; }
        .blog-markdown-body h3 { font-size: 1.22rem; font-weight: 600; margin: 1.8rem 0 0.8rem; }
        .blog-markdown-body h4, .blog-markdown-body h5, .blog-markdown-body h6 { margin: 1.5rem 0 0.6rem; }
        .blog-markdown-body p { color: var(--c-text) !important; line-height: 1.9; margin: 1.05rem 0; }
        .blog-markdown-body strong { color: var(--c-text); font-weight: 700; }
        .blog-markdown-body em { color: var(--c-text2); }
        .blog-markdown-body a { color: var(--c-focus) !important; text-decoration: none; border-bottom: 1px solid rgba(59,130,246,0.35); }
        .blog-markdown-body a:hover { color: var(--c-focus) !important; border-bottom-color: var(--c-focus); }
        .blog-markdown-body img { max-width: 100%; border-radius: 14px; margin: 1.4rem 0; box-shadow: 0 10px 30px rgba(0,0,0,0.4); display: block; }
        .blog-markdown-body blockquote { border-left: 4px solid var(--c-focus); background: var(--c-card); padding: 1rem 1.3rem; border-radius: 0 14px 14px 0; margin: 1.4rem 0; color: var(--c-text); }
        .blog-markdown-body blockquote p { color: var(--c-text); margin: 0; }
        .blog-markdown-body code { background: var(--c-hover); color: var(--c-focus); padding: 0.18rem 0.45rem; border-radius: 6px; font-size: 0.9em; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
        .blog-markdown-body pre { background: var(--c-bg) !important; border: 1px solid var(--c-border); border-radius: 12px; padding: 1rem 1.2rem; overflow-x: auto; margin: 1.4rem 0; }
        .blog-markdown-body pre code { background: transparent !important; color: var(--c-text); padding: 0; font-size: 0.9em; }
        .blog-markdown-body table { border-collapse: collapse; width: 100%; margin: 1.4rem 0; display: table; }
        .blog-markdown-body th, .blog-markdown-body td { border: 1px solid var(--c-border) !important; padding: 0.6rem 0.9rem; }
        .blog-markdown-body th { background: var(--c-hover) !important; color: var(--c-text); font-weight: 600; }
        .blog-markdown-body td { color: var(--c-text); }
        .blog-markdown-body ul, .blog-markdown-body ol { color: var(--c-text); padding-left: 1.6rem; }
        .blog-markdown-body li { margin: 0.4rem 0; }
        .blog-markdown-body li::marker { color: var(--c-focus); }
        .blog-markdown-body hr { border-color: var(--c-border); margin: 2rem 0; }
        .blog-markdown-body del { color: var(--c-text2); }
      `}</style>
      <MDEditor.Markdown
        source={content}
        style={{ backgroundColor: 'transparent', color: 'var(--c-text)', fontSize: 17, lineHeight: 1.9 }}
      />
    </div>
  );
};

export default BlogRenderContent;
