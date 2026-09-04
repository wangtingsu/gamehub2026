/**
 * RelatedContent.tsx - 相关内容推荐列表组件
 *
 * 在详情页底部展示与当前内容相关的推荐项目
 * 支持混合类型（游戏、评测、新闻），点击后导航到对应详情页
 */
import React from 'react';
import { List, Tag, Rate, Spin, Empty } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { RecommendationItem } from '../../api/types';

/** RelatedContent 组件的 props */
interface RelatedContentProps {
  /** 相关内容区域的标题，默认为"相关内容" */
  title?: string;
  /** 推荐项目列表 */
  items: RecommendationItem[];
  /** 是否正在加载 */
  loading?: boolean;
}

/**
 * RelatedContent - 相关内容推荐
 * - 支持游戏、评测、新闻三种内容类型的混排推荐
 * - 加载态显示 Spin 加载动画
 * - 空数据态显示"暂无相关内容"
 * - 点击项目根据内容类型导航到不同详情页
 * - 展示缩略图、标题、评分和推荐理由标签
 */
const RelatedContent: React.FC<RelatedContentProps> = ({
  title = 'Related Content',
  items,
  loading,
}) => {
  const navigate = useNavigate();

  // 加载中状态
  if (loading) {
    return (
      <div className="py-8 text-center">
        <Spin />
      </div>
    );
  }

  // 空数据状态
  if (!items.length) {
    return (
      <div className="py-4">
        <h3 className="font-semibold mb-3">{title}</h3>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No related content" />
      </div>
    );
  }

  /** 根据内容类型导航到对应详情页（保留语言前缀，避免丢失 /cn/ 等） */
  const handleClick = (item: RecommendationItem) => {
    const lang = window.location.pathname.split('/')[1] || 'cn';
    if (item.type === 'game') navigate(`/${lang}/games/${item.slug || item.id}`);
    else if (item.type === 'review') navigate(`/${lang}/reviews/${item.id}`);
    else if (item.type === 'news') navigate(`/${lang}/news/${item.id}`);
  };

  return (
    <div>
      {/* 标题栏 */}
      <h3 className="font-semibold mb-3 flex items-center justify-between">
        <span>{title}</span>
        <a className="text-xs text-primary-500 cursor-pointer">
          More <RightOutlined />
        </a>
      </h3>
      {/* 推荐列表 */}
      <List
        size="small"
        dataSource={items}
        renderItem={(item) => (
          <List.Item
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-2"
            onClick={() => handleClick(item)}
          >
            <div className="flex items-center space-x-3 w-full">
              {/* 缩略图 */}
              <div className="w-10 h-10 rounded bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
                {item.coverImageUrl ? (
                  <img src={item.coverImageUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" onError={(e) => { const el = e.target as HTMLImageElement; el.onerror = null; el.style.display = 'none'; el.parentElement!.classList.add('text-lg'); el.parentElement!.textContent = '🎮'; }} />
                ) : (
                  <span className="text-lg opacity-40">🎮</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                {/* 标题 */}
                <div className="text-sm font-medium truncate">{item.title}</div>
                {/* 评分 + 推荐理由标签 */}
                <div className="flex items-center space-x-2 mt-0.5">
                  {item.rating && (
                    <Rate disabled value={Number(item.rating) / 2} allowHalf className="text-xs" />
                  )}
                  <Tag color="default" className="text-xs">{item.reason}</Tag>
                </div>
              </div>
            </div>
          </List.Item>
        )}
      />
    </div>
  );
};

export default RelatedContent;
