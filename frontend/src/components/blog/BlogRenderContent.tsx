import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MDEditor from '@uiw/react-md-editor';

interface BlogRenderContentProps {
  content: string;
  /** 后端已转换好的规范 HTML（含目录 + 标题锚点 + 配图）；有值时直接渲染，不再走前端 markdown */
  contentHtml?: string;
}

/**
 * 博客/新闻正文渲染组件
 * - 优先：后端下发的 contentHtml（规范 HTML，含目录/标题锚点/配图），用 dangerouslySetInnerHTML 渲染；
 * - 回退：@uiw/react-md-editor 的 Markdown 渲染（兼容存量未回填的旧数据）。
 * 配色通过 CSS 变量跟随全局主题（[data-theme] 上的 --c-text / --c-text2 / --c-card / --c-bg / --c-border 等），
 * 保证正文在深色与浅色背景下都有良好的对比度与可读性。
 */
const BlogRenderContent: React.FC<BlogRenderContentProps> = ({ content, contentHtml }) => {
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

  const hasHtml = !!contentHtml && contentHtml.trim().length > 0;

  if (!hasHtml && !content) return <p className="text-gray-400">{t('blog.noContent', 'No content yet')}</p>;

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

        /* 规范 HTML 正文（contentHtml）——目录 + 标题锚点 + 配图 */
        .blog-html-body { color: var(--c-text); font-size: 17px; line-height: 1.9; }
        .blog-html-body nav.toc { background: var(--c-card); border: 1px solid var(--c-border); border-radius: 14px; padding: 1rem 1.4rem; margin: 1rem 0 2rem; }
        .blog-html-body nav.toc ul { list-style: none; padding-left: 0; margin: 0; }
        .blog-html-body nav.toc li { margin: 0.35rem 0; }
        .blog-html-body nav.toc li.toc-h2 { font-weight: 600; }
        .blog-html-body nav.toc li.toc-h3 { padding-left: 1.4rem; font-size: 0.95em; color: var(--c-text2); }
        .blog-html-body nav.toc a { color: var(--c-text); text-decoration: none; border-bottom: none; }
        .blog-html-body nav.toc a:hover { color: var(--c-focus); }
        .blog-html-body h1, .blog-html-body h2, .blog-html-body h3,
        .blog-html-body h4, .blog-html-body h5, .blog-html-body h6 {
          color: var(--c-text); border-bottom: none; font-weight: 700; scroll-margin-top: 90px;
        }
        .blog-html-body h1 { font-size: 1.7rem; margin: 2rem 0 1rem; }
        .blog-html-body h2 { font-size: 1.45rem; font-weight: 700; margin: 2.2rem 0 1rem; padding-left: 0.85rem; border-left: 4px solid var(--c-focus); }
        .blog-html-body h3 { font-size: 1.22rem; font-weight: 600; margin: 1.8rem 0 0.8rem; }
        .blog-html-body h4, .blog-html-body h5, .blog-html-body h6 { margin: 1.5rem 0 0.6rem; }
        .blog-html-body p { color: var(--c-text); line-height: 1.9; margin: 1.05rem 0; }
        .blog-html-body strong { color: var(--c-text); font-weight: 700; }
        .blog-html-body em { color: var(--c-text2); }
        .blog-html-body a { color: var(--c-focus); text-decoration: none; border-bottom: 1px solid rgba(59,130,246,0.35); }
        .blog-html-body a:hover { color: var(--c-focus); border-bottom-color: var(--c-focus); }
        .blog-html-body figure { margin: 1.4rem 0; text-align: center; }
        .blog-html-body figure img { max-width: 100%; border-radius: 14px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); display: block; margin: 0 auto; }
        .blog-html-body figcaption { color: var(--c-text2); font-size: 0.88em; margin-top: 0.6rem; }
        .blog-html-body img { max-width: 100%; border-radius: 14px; margin: 1.4rem 0; box-shadow: 0 10px 30px rgba(0,0,0,0.4); display: block; }
        .blog-html-body blockquote { border-left: 4px solid var(--c-focus); background: var(--c-card); padding: 1rem 1.3rem; border-radius: 0 14px 14px 0; margin: 1.4rem 0; color: var(--c-text); }
        .blog-html-body blockquote p { color: var(--c-text); margin: 0; }
        .blog-html-body code { background: var(--c-hover); color: var(--c-focus); padding: 0.18rem 0.45rem; border-radius: 6px; font-size: 0.9em; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
        .blog-html-body pre { background: var(--c-bg); border: 1px solid var(--c-border); border-radius: 12px; padding: 1rem 1.2rem; overflow-x: auto; margin: 1.4rem 0; }
        .blog-html-body pre code { background: transparent; color: var(--c-text); padding: 0; font-size: 0.9em; }
        .blog-html-body table { border-collapse: collapse; width: 100%; margin: 1.4rem 0; display: table; }
        .blog-html-body th, .blog-html-body td { border: 1px solid var(--c-border); padding: 0.6rem 0.9rem; }
        .blog-html-body th { background: var(--c-hover); color: var(--c-text); font-weight: 600; }
        .blog-html-body td { color: var(--c-text); }
        .blog-html-body ul, .blog-html-body ol { color: var(--c-text); padding-left: 1.6rem; }
        .blog-html-body li { margin: 0.4rem 0; }
        .blog-html-body li::marker { color: var(--c-focus); }
        .blog-html-body hr { border-color: var(--c-border); margin: 2rem 0; }
        .blog-html-body del { color: var(--c-text2); }
      `}</style>
      {hasHtml ? (
        <div className="blog-html-body" dangerouslySetInnerHTML={{ __html: contentHtml! }} />
      ) : (
        <MDEditor.Markdown
          source={content}
          style={{ backgroundColor: 'transparent', color: 'var(--c-text)', fontSize: 17, lineHeight: 1.9 }}
        />
      )}
    </div>
  );
};

export default BlogRenderContent;
