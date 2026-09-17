/**
 * Markdown → 规范 HTML 转换服务
 *
 * 后台保存文章时，把 markdown 正文转成规范 HTML 片段存库（content_html 列），
 * 页面直接显示 HTML（不再走前端 markdown 实时渲染）。产物格式与参考网页一致：
 *   - 顶部平铺目录：<nav class="toc"><ul><li class="toc-h2">…</li><li class="toc-h3">…</li></ul></nav>
 *   - h1/h2/h3 标题带 id 锚点（h1 为文章标题，不进入目录；目录只含 h2/h3）
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

/** 解码 HTML 实体，用于目录里的标题纯文本 */
const ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'",
};
const decodeEntities = (s: string): string =>
  s.replace(/&(amp|lt|gt|quot|#39|apos);/g, (m, k) => ENTITIES['&' + k + ';']);

/**
 * 从渲染后的 HTML 正文中提取 h2/h3 标题，拼出平铺目录。
 * 标题 id 直接取自渲染结果，因此目录锚点与正文标题 id 一一对应（永不漂移）。
 */
function buildToc(body: string): string {
  const re = /<h([23])\b[^>]*\bid="([^"]*)"[^>]*>([\s\S]*?)<\/h\1>/g;
  const items: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const text = decodeEntities(m[3].replace(/<[^>]+>/g, '')).trim();
    items.push(`  <li class="toc-h${m[1]}"><a href="#${m[2]}">${text}</a></li>`);
  }
  if (!items.length) return '';
  return `<nav class="toc">\n<ul>\n${items.join('\n')}\n</ul>\n</nav>`;
}

/**
 * 将 markdown 正文转换为「目录 + 正文」的规范 HTML 片段。
 * 空内容返回空串，避免目录里出现空标题。
 *
 * @param content - markdown 正文
 * @returns 规范 HTML 片段（含目录），无内容时返回 ''
 */
export function markdownToHtml(content: string): string {
  if (!content || !content.trim()) return '';

  // 每次渲染用独立的 slugger 与实例，保证标题 id 在重复标题下仍唯一（-1/-2 后缀）且无跨请求状态污染
  const slugger = new GithubSlugger();
  const md = new MarkdownIt({ html: false, linkify: true })
    .use(markdownItAnchor, { slugify: (s: string) => slugger.slug(s), tabIndex: false })
    .use(markdownItImplicitFigures, { figcaption: true });

  const body = md.render(content).trim();
  const toc = buildToc(body);
  return toc ? `${toc}\n${body}` : body;
}
