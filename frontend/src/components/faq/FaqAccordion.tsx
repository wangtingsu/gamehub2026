import { useMemo } from 'react';

interface FaqQuestion {
  id?: string;
  q: string;
  /** 答案 <p> 的 innerHTML（含 <strong> 等行内标签） */
  a: string;
}

interface FaqGroup {
  id?: string;
  title: string;
  questions: FaqQuestion[];
}

interface ParsedFaq {
  title: string;
  /** 简介 <p> 的 innerHTML（结论前置段 + SEO 摘要段） */
  paragraphs: string[];
  groups: FaqGroup[];
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * 将 FAQ 落地页的规范 HTML 解析成结构化数据，供手风琴渲染。
 *
 * 源结构：<nav class="toc">目录</nav> + <h1>标题</h1> + 简介 <p> +
 * 重复的 <h2>分类 / <h3>问题 / <p>答案</p>（分类之间以 <p>---</p> 分隔）。
 *
 * 用正则而非 DOMParser：SSR 端（Node 无 DOM）也能运行，且该 HTML 由部署
 * 流水线固定生成、结构高度规则，正则可安全解析。
 */
function parseFaqHtml(html: string): ParsedFaq {
  const body = html.replace(/<nav[\s\S]*?<\/nav>/i, '');
  const re = /<(h1|h2|h3|p)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  const intro: ParsedFaq = { title: '', paragraphs: [], groups: [] };
  let curGroup: FaqGroup | null = null;
  let curQ: FaqQuestion | null = null;

  while ((m = re.exec(body)) !== null) {
    const tag = m[1].toLowerCase();
    const openTag = m[0].slice(0, m[0].indexOf('>'));
    const id = (/id="([^"]*)"/.exec(openTag) || [])[1];
    const inner = m[2];
    const text = stripTags(inner);

    if (tag === 'h1') {
      intro.title = text;
      continue;
    }
    if (tag === 'h2') {
      curGroup = { id, title: text, questions: [] };
      intro.groups.push(curGroup);
      curQ = null;
      continue;
    }
    if (tag === 'h3') {
      curQ = { id, q: text, a: '' };
      curGroup!.questions.push(curQ);
      continue;
    }
    if (tag === 'p') {
      if (text === '---') continue;
      if (curQ) curQ.a += inner;
      else if (!curGroup) intro.paragraphs.push(inner);
      continue;
    }
  }
  return intro;
}

/**
 * FAQ 手风琴组件：按分类（h2）分组，每个问题（h3）是可折叠条目，点击展开答案。
 *
 * - 用原生 <details name=...> 实现「手风琴」互斥展开（同一时间仅一条展开），
 *   SSR 下默认全部折叠、无需 JS，降级到不支持 name 的旧浏览器时退化为独立展开；
 * - 配色沿用全局主题变量（--c-text / --c-card / --c-border / --c-focus 等），
 *   与博客正文（BlogRenderContent）保持一致，深浅色均可用；
 * - 保留 h1/h2/h3 语义与锚点 id，方便站内跳转与搜索引擎理解结构。
 */
export default function FaqAccordion({ html }: { html: string }) {
  const faq = useMemo(() => parseFaqHtml(html), [html]);

  return (
    <div className="faq-accordion">
      <style>{`
        .faq-accordion { color: var(--c-text); }
        .faq-accordion .faq-intro h1 { font-size: 1.7rem; font-weight: 700; line-height: 1.4; margin: 1rem 0 1rem; scroll-margin-top: 90px; }
        .faq-accordion .faq-intro p { color: var(--c-text); line-height: 1.9; margin: 1.05rem 0; }
        .faq-accordion .faq-intro p strong { color: var(--c-text); font-weight: 700; }
        .faq-accordion .faq-group h2 { font-size: 1.4rem; font-weight: 700; margin: 2.2rem 0 1rem; padding-left: 0.85rem; border-left: 4px solid var(--c-focus); scroll-margin-top: 90px; }
        .faq-accordion .faq-item { background: var(--c-card); border: 1px solid var(--c-border); border-radius: 12px; margin: 0.6rem 0; overflow: hidden; }
        .faq-accordion .faq-item summary { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.9rem 1.1rem; cursor: pointer; list-style: none; user-select: none; }
        .faq-accordion .faq-item summary::-webkit-details-marker { display: none; }
        .faq-accordion .faq-item summary:hover { background: var(--c-hover); }
        .faq-accordion .faq-item summary h3 { margin: 0; font-size: 1.02rem; font-weight: 600; color: var(--c-text); line-height: 1.5; }
        .faq-accordion .faq-item .faq-chevron { flex: none; color: var(--c-text2); transition: transform 0.2s ease; }
        .faq-accordion .faq-item[open] .faq-chevron { transform: rotate(180deg); }
        .faq-accordion .faq-item[open] summary { border-bottom: 1px solid var(--c-border); }
        .faq-accordion .faq-item .faq-answer { padding: 1rem 1.1rem; color: var(--c-text); line-height: 1.9; font-size: 0.98rem; }
      `}</style>

      <div className="faq-intro">
        <h1>{faq.title}</h1>
        {faq.paragraphs.map((p, i) => (
          <p key={i} dangerouslySetInnerHTML={{ __html: p }} />
        ))}
      </div>

      {faq.groups.map((group) => (
        <section key={group.title} className="faq-group">
          <h2 id={group.id}>{group.title}</h2>
          {group.questions.map((qa) => (
            <details key={qa.id || qa.q} className="faq-item" name="faq-gacha">
              <summary>
                <h3 id={qa.id}>{qa.q}</h3>
                <svg
                  className="faq-chevron"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </summary>
              <div className="faq-answer" dangerouslySetInnerHTML={{ __html: qa.a }} />
            </details>
          ))}
        </section>
      ))}
    </div>
  );
}
