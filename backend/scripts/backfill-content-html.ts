/**
 * 存量正文回填脚本：把已有的 content / content_xx 转成 content_html / content_html_xx。
 *
 * 用途：markdown → 规范 HTML 能力上线后，一次性为历史文章生成 HTML 版本，
 * 使详情页无需回退 markdown 渲染即可直接显示目录 + 标题锚点 + 配图。
 *
 * 用法: npx tsx scripts/backfill-content-html.ts
 */
import { connectDatabase, query, execute } from '../src/db';
import { markdownToHtml } from '../src/services/markdown.service';

const SUFFIXES = ['en', 'ja', 'ko', 'es', 'fr'] as const;

async function backfillTable(table: 'blog_articles' | 'news'): Promise<number> {
  const transCols = SUFFIXES.map((s) => `content_${s}`).join(', ');
  const rows = (await query(`SELECT id, content, ${transCols} FROM ${table}`)) as any[];
  let updated = 0;

  for (const row of rows) {
    const sets: string[] = [];
    const vals: any[] = [];
    if (row.content) {
      sets.push('content_html = ?');
      vals.push(markdownToHtml(row.content));
    }
    for (const s of SUFFIXES) {
      const c = row[`content_${s}`];
      if (c) {
        sets.push(`content_html_${s} = ?`);
        vals.push(markdownToHtml(c));
      }
    }
    if (sets.length) {
      await execute(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = ?`, [...vals, row.id]);
      updated++;
    }
  }
  return updated;
}

async function main() {
  await connectDatabase();
  const blogCount = await backfillTable('blog_articles');
  const newsCount = await backfillTable('news');
  console.log(`✅ 回填完成：blog_articles ${blogCount} 篇，news ${newsCount} 篇`);
  process.exit(0);
}

main().catch((e) => {
  console.error('回填失败:', e);
  process.exit(1);
});
