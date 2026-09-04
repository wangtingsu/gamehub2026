/**
 * TrendingCarousel.tsx - 热门趋势轮播组件
 *
 * 展示当前热门的游戏排行，带排名角标和 HOT 标签
 * 支持横向滚动和网格两种布局模式
 */
import React from 'react';
import { Card, Tag, Rate } from 'antd';
import { FireOutlined, RightOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import type { RecommendationItem } from '../../api/types';

/** TrendingCarousel 组件的 props */
interface TrendingCarouselProps {
  /** 区域标题，默认为"热门趋势" */
  title?: string;
  /** 热门游戏列表 */
  items: RecommendationItem[];
  /** 是否正在加载 */
  loading?: boolean;
  /** 展示形式：horizontal（横向滚动）| grid（网格布局） */
  variant?: 'horizontal' | 'grid';
}

/**
 * TrendingCarousel - 热门趋势
 * - 支持横向滚动和网格两种布局，网格最多展示 10 个，横向最多 8 个
 * - 按排名显示序号角标，前三名额外显示红色 HOT 标签
 * - 加载态显示骨架屏占位
 * - 空数据时返回 null 不渲染
 * - 点击卡片跳转到游戏详情页
 */
const TrendingCarousel: React.FC<TrendingCarouselProps> = ({
  title = '热门趋势',
  items,
  loading,
  variant = 'horizontal',
}) => {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();

  // 加载态：显示骨架屏
  if (loading) {
    return (
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <FireOutlined className="mr-2 text-red-500" />
          {title}
        </h2>
        {variant === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} loading className="w-full" />
            ))}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 pr-4" style={{ touchAction: 'pan-y pan-x' }}>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} loading className="flex-shrink-0 w-[calc(100vw-64px)] sm:w-[260px] md:w-[280px]" />
            ))}
          </div>
        )}
      </section>
    );
  }

  // 空数据态：不渲染
  if (!items.length) return null;

  // 限制展示数量：网格最多 10 个，横向最多 8 个
  const displayItems = variant === 'grid' ? items.slice(0, 10) : items.slice(0, 8);

  return (
    <section className="mb-8">
      {/* 标题栏 + "查看更多"链接 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center">
          <FireOutlined className="mr-2 text-red-500" />
          {title}
        </h2>
        <a
          className="text-sm text-primary-500 hover:text-primary-600 flex items-center cursor-pointer"
          onClick={() => navigate(`/${lang || 'cn'}/games/category/trending`)}
        >
          查看更多 <RightOutlined />
        </a>
      </div>

      {variant === 'grid' ? (
        // 网格布局
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-5">
          {displayItems.map((item, index) => (
            <Card
              key={`${item.type}-${item.id}`}
              hoverable
              className="w-full"
              cover={
                <div className="h-48 bg-gradient-to-br from-orange-100 to-red-100 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center overflow-hidden relative">
                  {item.coverImageUrl ? (
                    <img
                      src={item.coverImageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { const el = e.target as HTMLImageElement; el.onerror = null; el.style.display = 'none'; el.parentElement!.classList.add('text-3xl'); el.parentElement!.textContent = '🔥'; }}
                    />
                  ) : (
                    <span className="text-3xl opacity-30">🔥</span>
                  )}
                  {/* 排名数字角标 */}
                  <div className="absolute top-1 left-1 w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-orange-400 flex items-center justify-center text-white text-xs font-bold shadow-md">
                    {index + 1}
                  </div>
                  {/* 前三名显示 HOT 标签 */}
                  {index < 3 && (
                    <div className="absolute top-1 right-1">
                      <Tag color="red" className="text-[10px] leading-none px-1 py-0 border-0">HOT</Tag>
                    </div>
                  )}
                </div>
              }
              onClick={() => navigate(`/${lang || 'cn'}/games/${item.slug || item.id}`)}
            >
              <Card.Meta
                title={
                  <div className="text-sm font-medium truncate">{item.title}</div>
                }
                description={
                  <div>
                    {item.rating && (
                      <Rate disabled value={Number(item.rating) / 2} allowHalf className="text-xs" />
                    )}
                    <div className="mt-1 flex items-center gap-1">
                      <Tag color="orange" className="text-xs">{item.reason}</Tag>
                      {item.likes && (
                        <span className="text-[10px] text-gray-400">{item.likes}热度</span>
                      )}
                    </div>
                  </div>
                }
              />
            </Card>
          ))}
        </div>
      ) : (
        // 横向滚动布局
        <div className="flex gap-4 overflow-x-auto pb-4 pr-4" style={{ touchAction: 'pan-y pan-x' }}>
          {displayItems.map((item, index) => (
            <Card
              key={`${item.type}-${item.id}`}
              hoverable
              className="flex-shrink-0 w-[calc(100vw-64px)] sm:w-[260px] md:w-[280px]"
              cover={
                <div className="h-48 bg-gradient-to-br from-orange-100 to-red-100 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center overflow-hidden relative">
                  {item.coverImageUrl ? (
                    <img
                      src={item.coverImageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { const el = e.target as HTMLImageElement; el.onerror = null; el.style.display = 'none'; el.parentElement!.classList.add('text-3xl'); el.parentElement!.textContent = '🔥'; }}
                    />
                  ) : (
                    <span className="text-3xl opacity-30">🔥</span>
                  )}
                  {/* 排名数字角标 */}
                  <div className="absolute top-1 left-1 w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-orange-400 flex items-center justify-center text-white text-xs font-bold shadow-md">
                    {index + 1}
                  </div>
                  {/* 前三名显示 HOT 标签 */}
                  {index < 3 && (
                    <div className="absolute top-1 right-1">
                      <Tag color="red" className="text-[10px] leading-none px-1 py-0 border-0">HOT</Tag>
                    </div>
                  )}
                </div>
              }
              onClick={() => navigate(`/${lang || 'cn'}/games/${item.slug || item.id}`)}
            >
              <Card.Meta
                title={
                  <div className="text-sm font-medium truncate">{item.title}</div>
                }
                description={
                  <div>
                    {item.rating && (
                      <Rate disabled value={Number(item.rating) / 2} allowHalf className="text-xs" />
                    )}
                    <div className="mt-1 flex items-center gap-1">
                      <Tag color="orange" className="text-xs">{item.reason}</Tag>
                      {item.likes && (
                        <span className="text-[10px] text-gray-400">{item.likes}热度</span>
                      )}
                    </div>
                  </div>
                }
              />
            </Card>
          ))}
        </div>
      )}
    </section>
  );
};

export default TrendingCarousel;
