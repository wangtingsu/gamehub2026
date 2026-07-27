import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Button, Tag, Rate, Spin, Empty, Typography } from 'antd';
import {
  RightOutlined,
  RocketOutlined,
  UserOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import LazyLoadImageComponent from 'react-lazy-load-image-component';
const { LazyLoadImage } = LazyLoadImageComponent as any;
import SEO from '../components/SEO';
import RecommendedGames from '../components/recommendations/RecommendedGames';
import { usePersonalizedRecommendations, useGames, useTrendingContent } from '../api/hooks';
import type { Game } from '../api/types';

const { Title } = Typography;

// 备用推荐数据（API 不可用时展示，使用真实游戏 slug 以支持点击跳转）
const fallbackRecommendations = [
  { id: 'elden-ring', type: 'game' as const, title: '艾尔登法环', rating: 4.8, reason: '热门推荐', score: 95, likes: 1500 },
  { id: 'cyberpunk-2077', type: 'game' as const, title: '赛博朋克2077', rating: 4.5, reason: '玩家最爱', score: 88, likes: 980 },
  { id: 'baldurs-gate-3', type: 'game' as const, title: '博德之门3', rating: 4.9, reason: '经典必玩', score: 92, likes: 1300 },
  { id: 'stardew-valley', type: 'game' as const, title: '星露谷物语', rating: 4.9, reason: '好评如潮', score: 96, likes: 2000 },
  { id: 'hollow-knight', type: 'game' as const, title: '空洞骑士', rating: 4.7, reason: '魂系经典', score: 85, likes: 1100 },
];

const fallbackTopUpGames: Game[] = [
  { id: 'elden-ring', title: '艾尔登法环', description: '', releaseDate: '', developer: '', publisher: '', genres: ['动作角色扮演', '开放世界'], platforms: ['PC', 'PlayStation'], rating: 4.8, price: 398, discount: 10, imageUrl: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=400&auto=format&fit=crop', screenshots: [] },
  { id: 'cyberpunk-2077', title: '赛博朋克2077', description: '', releaseDate: '', developer: '', publisher: '', genres: ['动作角色扮演', '开放世界'], platforms: ['PC', 'PlayStation'], rating: 4.5, price: 298, discount: 30, imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop', screenshots: [] },
  { id: 'baldurs-gate-3', title: '博德之门3', description: '', releaseDate: '', developer: '', publisher: '', genres: ['角色扮演', '策略'], platforms: ['PC'], rating: 4.9, price: 349, discount: 10, imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&auto=format&fit=crop', screenshots: [] },
  { id: 'stardew-valley', title: '星露谷物语', description: '', releaseDate: '', developer: '', publisher: '', genres: ['模拟', '休闲'], platforms: ['PC', 'Nintendo Switch'], rating: 4.8, price: 48, discount: 0, imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop', screenshots: [] },
  { id: 'hollow-knight', title: '空洞骑士', description: '', releaseDate: '', developer: '', publisher: '', genres: ['动作', '冒险'], platforms: ['PC', 'Nintendo Switch'], rating: 4.7, price: 68, discount: 0, imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&auto=format&fit=crop', screenshots: [] },
];

const fallbackIndieGames: Game[] = [
  { id: 'hollow-knight', title: '空洞骑士', description: '', releaseDate: '', developer: '', publisher: '', genres: ['动作', '独立', '冒险'], platforms: ['PC', 'Nintendo Switch'], rating: 4.7, price: 68, discount: 0, imageUrl: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=400&auto=format&fit=crop', screenshots: [] },
  { id: 'stardew-valley', title: '星露谷物语', description: '', releaseDate: '', developer: '', publisher: '', genres: ['模拟', '独立'], platforms: ['PC', 'Nintendo Switch'], rating: 4.8, price: 48, discount: 0, imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop', screenshots: [] },
];

const GameLibraryPage = () => {
  const navigate = useNavigate();

  const { data: recommendations, isLoading: recLoading, isError: recError } = usePersonalizedRecommendations(8);
  const { data: allGames = [], isLoading: gamesLoading, isError: gamesError } = useGames();

  // 推荐游戏：优先用 API 数据，失败则用备用数据
  const displayRecommendations = (!recError && recommendations && recommendations.length > 0)
    ? recommendations
    : fallbackRecommendations;

  // 直充游戏：优先使用 displayZone 字段，没有则按价格筛选（向后兼容）
  const topUpGames = useMemo(() => {
    if (!gamesError && allGames.length > 0) {
      const zoneGames = allGames.filter((game: Game) => game.displayZone === 'top-up');
      if (zoneGames.length > 0) {
        return zoneGames.sort((a: Game, b: Game) => b.rating - a.rating).slice(0, 10);
      }
      return allGames
        .filter((game: Game) => game.price > 0)
        .sort((a: Game, b: Game) => b.rating - a.rating)
        .slice(0, 10);
    }
    return fallbackTopUpGames;
  }, [allGames, gamesError]);

  // 独立游戏：优先使用 displayZone 字段，没有则按类型筛选（向后兼容）
  const indieGames = useMemo(() => {
    if (!gamesError && allGames.length > 0) {
      const zoneGames = allGames.filter((game: Game) => game.displayZone === 'indie');
      if (zoneGames.length > 0) return zoneGames.sort((a: Game, b: Game) => b.rating - a.rating).slice(0, 10);
      const indie = allGames.filter((game: Game) =>
        game.genres.some(g => g.toLowerCase().includes('indie'))
      );
      if (indie.length > 0) return indie.slice(0, 10);
      return [...allGames].sort((a: Game, b: Game) => b.rating - a.rating).slice(0, 8);
    }
    return fallbackIndieGames;
  }, [allGames, gamesError]);

  const formatPrice = (price: number) => `¥${price}`;

  const renderGameCard = (game: Game, index: number) => (
    <motion.div
      key={game.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="flex-shrink-0 w-[160px] sm:w-[200px] md:w-[220px]"
    >
      <Card
        hoverable
        className="h-full"
        cover={
          <div className="relative h-32 overflow-hidden">
            <LazyLoadImage
              src={game.imageUrl}
              alt={game.title}
              className="w-full h-full object-cover"
              effect="blur"
              threshold={100}
            />
            {game.discount && game.discount > 0 && (
              <div className="absolute top-2 right-2 bg-red-500 text-white font-bold px-2 py-0.5 rounded-full text-xs">
                -{game.discount}%
              </div>
            )}
          </div>
        }
        onClick={() => navigate(`/games/${game.id}`)}
      >
        <div className="mb-2">
          <div className="text-sm font-semibold truncate mb-1">{game.title}</div>
          <div className="flex items-center gap-1">
            <Rate disabled value={game.rating / 2} allowHalf className="text-xs" />
            <span className="text-xs text-gray-500">{Number(game.rating).toFixed(1)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mb-2">
          {game.genres.slice(0, 2).map(genre => (
            <Tag key={genre} className="text-xs leading-none" color="blue">{genre}</Tag>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-red-500">
            {game.discount && game.discount > 0
              ? formatPrice(Math.round(game.price * (1 - game.discount / 100)))
              : formatPrice(game.price)
            }
          </span>
          {game.discount && game.discount > 0 && (
            <span className="text-xs text-gray-400 line-through">{formatPrice(game.price)}</span>
          )}
        </div>
      </Card>
    </motion.div>
  );

  const renderHorizontalSection = (
    title: string,
    icon: React.ReactNode,
    games: Game[],
    loading: boolean,
    linkTo: string,
  ) => (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <Title level={3} className="!mb-0">{title}</Title>
        </div>
        <Button type="link" onClick={() => navigate(linkTo)}>
          查看更多 <RightOutlined />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Spin size="large" />
        </div>
      ) : (
        <div className="overflow-x-auto pb-4 -mx-4 px-4">
          <div className="flex gap-5" style={{ minWidth: 'min-content' }}>
            {games.map((game, index) => renderGameCard(game, index))}
          </div>
        </div>
      )}
    </section>
  );

  return (
    <div className="game-library-page">
      <SEO
        title="游戏库 | GGHubs"
        description="探索推荐游戏、热门直充游戏和精选独立游戏"
        keywords="游戏库, 推荐游戏, 直充游戏, 独立游戏, GGHubs"
      />

      <div className=" py-8">
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold gradient-text mb-2">游戏库</h1>
              <p className="text-gray-600 text-lg">
                发现精彩游戏世界，找到属于你的冒险
              </p>
            </div>
            <Button
              type="primary"
              icon={<UserOutlined />}
              size="large"
              onClick={() => navigate('/library/mine')}
            >
              我的游戏库
            </Button>
          </div>
        </motion.div>

        {/* 板块1: 推荐游戏 */}
        <section className="mb-12">
          <RecommendedGames
            title="推荐游戏"
            recommendations={displayRecommendations}
            loading={recLoading && !recError}
          />
        </section>

        {/* 板块2: 直充游戏 */}
        {renderHorizontalSection(
          '直充游戏',
          <DollarOutlined className="text-green-500" />,
          topUpGames,
          gamesLoading && !gamesError,
          '/games',
        )}

        {/* 板块3: 独立游戏 */}
        {renderHorizontalSection(
          '独立游戏',
          <RocketOutlined className="text-purple-500" />,
          indieGames,
          gamesLoading && !gamesError,
          '/games',
        )}
      </div>
    </div>
  );
};

export default GameLibraryPage;