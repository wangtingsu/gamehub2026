import { Helmet } from 'react-helmet-async';

/**
 * 面包屑导航中的单个路径项接口
 *
 * @property name - 该层级页面的显示名称（如 "游戏库"、"动作游戏"）
 * @property url - 该层级页面的 URL 路径（可以是绝对路径或以 / 开头的相对路径）
 */
interface BreadcrumbItem {
  name: string;
  url: string;
}

/**
 * SEOBreadcrumb 组件的属性接口
 *
 * @property items - 面包屑路径项数组，按导航层级从根到当前页排列
 */
interface SEOBreadcrumbProps {
  items: BreadcrumbItem[];
}

/**
 * SEOBreadcrumb — 面包屑导航结构化数据组件
 *
 * 该组件不渲染任何可见的 UI 元素，而是通过 react-helmet-async 在页面 <head> 中
 * 注入 JSON-LD 格式的面包屑导航结构化数据（BreadcrumbList），帮助搜索引擎
 * 理解页面的层级结构和用户在网站中的当前位置。
 *
 * 生成的 Schema.org 数据结构：
 * ```json
 * {
 *   "@context": "https://schema.org",
 *   "@type": "BreadcrumbList",
 *   "itemListElement": [
 *     { "@type": "ListItem", "position": 1, "name": "主页", "item": "https://.../cn/" },
 *     { "@type": "ListItem", "position": 2, "name": "游戏库", "item": "https://.../cn/games" },
 *     { "@type": "ListItem", "position": 3, "name": "当前页面", "item": "https://.../cn/games/xxx" }
 *   ]
 * }
 * ```
 *
 * 使用方式：
 * ```tsx
 * <SEOBreadcrumb
 *   items={[
 *     { name: "主页", url: "/cn/" },
 *     { name: "游戏库", url: "/cn/games" },
 *     { name: "当前游戏名", url: "/cn/games/123" },
 *   ]}
 * />
 * ```
 *
 * @param props - 组件属性，items 为面包屑路径项数组
 * @returns 通过 Helmet 在 <head> 中注入的 JSON-LD 结构化数据 script 标签
 */
export default function SEOBreadcrumb({ items }: SEOBreadcrumbProps) {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://www.gghubs.com';

  /**
   * 构建 BreadcrumbList 结构化数据对象
   *
   * 为每个面包屑项分配 position（从 1 开始递增），
   * 并确保 URL 为完整绝对路径（相对路径自动拼接 siteUrl）。
   */
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': items.map((item, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'name': item.name,
      'item': item.url.startsWith('http') ? item.url : `${siteUrl}${item.url}`,
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
}
