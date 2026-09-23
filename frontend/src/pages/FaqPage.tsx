import { useParams } from 'react-router-dom';
import SEO from '../components/SEO';
import FaqAccordion from '../components/faq/FaqAccordion';
import faqContent from '../data/faq/content.json';
import faqPageZh from '../data/faq/faqpage-zh.json';
import faqPageEn from '../data/faq/faqpage-en.json';

/** 二游 FAQ 站点级落地页 URL（与部署说明一致，前缀由 SEO/路由自动补语言） */
const FAQ_PATH = '/faq/anime-gacha-games';

/**
 * 二游 FAQ 落地页（二次元抽卡手游常见问题解答）
 *
 * - 内容为静态站点级落地页（20 款热门二游 + 99 条问答），中英文双版本；
 * - 正文由部署包提供的 HTML 片段解析后，通过 FaqAccordion 以「分类分组 + 手风琴
 *   折叠」形式渲染（点击问题展开答案），配色沿用全局主题变量；
 * - FAQPage 结构化数据（99 条问答）通过 SEO 组件的 structuredData 注入 JSON-LD。
 */
export default function FaqPage() {
  const { lang } = useParams<{ lang: string }>();
  const isZh = lang === 'cn';
  const c = isZh ? faqContent.zh : faqContent.en;
  const faqPage = isZh ? faqPageZh : faqPageEn;

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <SEO
        title={c.title}
        description={c.description}
        url={`/${lang || 'cn'}${FAQ_PATH}`}
        canonical={FAQ_PATH}
        structuredData={faqPage}
      />
      <div className="max-w-4xl mx-auto">
        <FaqAccordion html={c.html} />
      </div>
    </div>
  );
}
