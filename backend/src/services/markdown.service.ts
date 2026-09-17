/**
 * Markdown → 规范 HTML 转换服务
 *
 * 后台保存文章时，把 markdown 正文转成规范 HTML 片段存库（content_html 列），
 * 页面直接显示 HTML（不再走前端 markdown 实时渲染）。产物格式：
 *   - h1/h2/h3 标题带 id 锚点
 *   - 独立图片包成 <figure><img …><figcaption>alt</figcaption></figure>
 *   - 表格、段落、列表、代码块等
 *
 * 安全：MarkdownIt 以 html:false 构建，源码里的原始 HTML 一律转义（防 XSS），
 * 因此无需再单独 sanitize。
 */
import MarkdownIt from 'markdown-it';
import markdownItImplicitFigures from 'markdown-it-implicit-figures';
import GithubSlugger from 'github-slugger';
// markdown-it-anchor 的 types 使用 `export default`，在 Node16+CJS 编译下会触发 TS1479（ESM/CJS 判定冲突），
// 其运行时产物实为 CommonJS（module.exports = anchor 函数），故直接用 require 获取函数本体。
const markdownItAnchor = require('markdown-it-anchor');

/**
 * 将 markdown 正文转换为规范 HTML 片段（标题锚点 + 配图）。
 * 空内容返回空串。
 *
 * @param content - markdown 正文
 * @returns 规范 HTML 片段，无内容时返回 ''
 */
export function markdownToHtml(content: string): string {
  if (!content || !content.trim()) return '';

  // 每次渲染用独立的 slugger 与实例，保证标题 id 在重复标题下仍唯一（-1/-2 后缀）且无跨请求状态污染
  const slugger = new GithubSlugger();
  const md = new MarkdownIt({ html: false, linkify: true })
    .use(markdownItAnchor, { slugify: (s: string) => slugger.slug(s), tabIndex: false })
    .use(markdownItImplicitFigures, { figcaption: true });

  return md.render(content).trim();
}
