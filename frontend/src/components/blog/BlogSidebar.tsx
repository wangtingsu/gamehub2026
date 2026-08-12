/**
 * BlogSidebar - 博客空间侧边栏组件
 * 显示相关博客空间，可脱离 BlogSpacePage 复用
 *
 * 用法:
 *   <BlogSidebar spaces={spaces} currentSlug={slug} lang={currentLang} width="w-1/6" />
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Skeleton, Empty } from 'antd';

const { Title, Text } = Typography;

interface BlogSidebarProps {
  /** 所有博客空间列表 */
  spaces: any[];
  /** 当前空间的 slug（用于排除自身） */
  currentSlug?: string;
  /** 语言前缀 */
  lang?: string;
  /** 侧边栏宽度 Tailwind 类，默认 w-1/6 */
  width?: string;
  /** 标题，默认「探索更多空间」 */
  title?: string;
  /** 最大显示数量，默认全部 */
  maxItems?: number;
}

const BlogSidebar: React.FC<BlogSidebarProps> = ({
  spaces, currentSlug, lang = 'cn', width = 'w-1/6', title = '探索更多空间', maxItems,
}) => {
  const navigate = useNavigate();
  const related = (spaces || [])
    .filter((s: any) => s.slug !== currentSlug)
    .slice(0, maxItems);

  return (
    <div className={`${width} flex-shrink-0 hidden lg:block`}>
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-4 flex flex-col overflow-hidden space-scroll sticky top-4"
        style={{ maxHeight: 'calc(100vh - 100px)' }}>
        <Title level={3} className="!text-white !mb-4 !text-lg flex-shrink-0">{title}</Title>
        {!spaces.length ? (
          <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} active paragraph={{ rows: 1 }} />)}</div>
        ) : related.length === 0 ? (
          <Empty description="暂无其他空间" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {related.map((s: any) => (
              <div key={s.id} onClick={() => navigate(`/${lang}/blog/space/${s.slug}`)}
                className="cursor-pointer rounded-lg overflow-hidden border border-dark-600 hover:border-blue-500/50 transition-all hover:-translate-y-0.5">
                <div className="h-24 bg-dark-700 flex items-center justify-center overflow-hidden">
                  {s.coverImageUrl ? (
                    <img src={s.coverImageUrl} alt={s.name} className="w-full h-full object-cover" loading="lazy" style={{ aspectRatio: '16/9' }} />
                  ) : (
                    <span className="text-gray-500 text-2xl font-bold">{s.name?.charAt(0)}</span>
                  )}
                </div>
                <div className="px-3 py-2 bg-dark-800">
                  <div className="text-white text-sm font-medium truncate">{s.name}</div>
                  <div className="text-gray-500 text-xs mt-0.5 line-clamp-2">{s.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogSidebar;
