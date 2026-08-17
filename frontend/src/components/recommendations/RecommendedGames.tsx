/**
 * RecommendedGames.tsx - 游戏推荐列表组件
 *
 * 为用户展示个性化推荐游戏列表，支持横向滚动和网格两种布局模式
 * 包含加载态（骨架屏）、空数据态、推荐理由标签和评分显示
 */
import { Card, Tag, Rate, Typography } from 'antd';
import { RightOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import type { RecommendationItem } from '../../api/types';

const { Title } = Typography;

/** RecommendedGames 组件的 props */
interface RecommendedGamesProps {
  /** 推荐区域标题，默认为"为你推荐" */
  title?: string;
  /** 推荐游戏列表数据 */
  recommendations: RecommendationItem[];
  /** 是否正在加载 */
  loading?: boolean;
  /** 展示形式：horizontal（横向滚动）| grid（网格布局） */
  variant?: 'horizontal' | 'grid';
}

/**
 * RecommendedGames - 游戏推荐
 * - 支持横向滚动（horizontal）和网格（grid）两种布局，默认为横向滚动
 * - 网格布局最多展示 10 个游戏
 * - 加载态显示骨架屏的 Card 占位
 * - 空数据时返回 null 不渲染
 * - 点击游戏卡片跳转到游戏详情页
 * - 点击"查看更多"跳转到推荐游戏分类页
 */
const RecommendedGames: React.FC<RecommendedGamesProps> = ({
  title = 'Recommended for You',
  recommendations,
  loading,
  variant = 'horizontal',
}) => {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();

  // 加载态：显示骨架屏
  if (loading) {
    return (
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <ThunderboltOutlined className="text-yellow-500 text-2xl" />
          <Title level={2} className="!mb-0 !text-white">{title}</Title>
        </div>
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
  if (!recommendations.length) return null;

  // 网格布局限制最多展示 10 个
  const displayItems = variant === 'grid' ? recommendations.slice(0, 10) : recommendations;

  return (
    <section className="mb-8">
      {/* 标题栏 + "查看更多"链接 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ThunderboltOutlined className="text-yellow-500 text-2xl" />
          <Title level={2} className="!mb-0 !text-white">{title}</Title>
        </div>
        <a
          className="text-sm text-white hover:text-gray-300 flex items-center cursor-pointer"
          onClick={() => navigate(`/${lang || 'cn'}/games/category/recommended`)}
        >
          View More <RightOutlined />
        </a>
      </div>

      {variant === 'grid' ? (
        // 网格布局
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-5">
          {displayItems.map((item) => (
            <Card
              key={`${item.type}-${item.id}`}
              hoverable
              className="h-full"
              cover={
                <div className="h-48 bg-gradient-to-br from-primary-100 to-secondary-100 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center overflow-hidden">
                  {item.coverImageUrl ? (
                    <img
                      src={item.coverImageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { const el = e.target as HTMLImageElement; el.onerror = null; el.style.display = 'none'; el.parentElement!.classList.add('text-3xl'); el.parentElement!.textContent = '🎮'; }}
                    />
                  ) : (
                    <span className="text-3xl opacity-30">🎮</span>
                  )}
                </div>
              }
              onClick={() => navigate(`/${lang || 'cn'}/games/${item.id}`)}
            >
              <Card.Meta
                title={
                  <div className="text-sm font-medium truncate">{item.title}</div>
                }
                description={
                  <div>
                    {/* 评分显示：将 10 分制转换为 5 星制 */}
                    {item.rating && (
                      <Rate disabled value={Number(item.rating) / 2} allowHalf className="text-xs" />
                    )}
                    <div className="mt-1">
                      <Tag color="blue" className="text-xs">{item.reason}</Tag>
                    </div>
                  </div>
                }
              />
            </Card>
          ))}
        </div>
      ) : (
        // 横向滚动布局：手机一张卡片略窄于屏幕，平板+多张
        <div className="flex gap-4 overflow-x-auto pb-4 pr-4" style={{ touchAction: 'pan-y pan-x' }}>
          {displayItems.map((item) => (
            <Card
              key={`${item.type}-${item.id}`}
              hoverable
              className="flex-shrink-0 w-[calc(100vw-64px)] sm:w-[260px] md:w-[280px]"
              cover={
                <div className="h-48 bg-gradient-to-br from-primary-100 to-secondary-100 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center overflow-hidden">
                  {item.coverImageUrl ? (
                    <img
                      src={item.coverImageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { const el = e.target as HTMLImageElement; el.onerror = null; el.style.display = 'none'; el.parentElement!.classList.add('text-3xl'); el.parentElement!.textContent = '🎮'; }}
                    />
                  ) : (
                    <span className="text-3xl opacity-30">🎮</span>
                  )}
                </div>
              }
              onClick={() => navigate(`/${lang || 'cn'}/games/${item.id}`)}
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
                    <div className="mt-1">
                      <Tag color="blue" className="text-xs">{item.reason}</Tag>
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

export default RecommendedGames;
