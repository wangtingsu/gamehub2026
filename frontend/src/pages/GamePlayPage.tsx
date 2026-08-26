import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Button, Card, Tag, Rate, Skeleton } from 'antd';
import { ArrowLeftOutlined, UserOutlined } from '@ant-design/icons';
import { useMemo, lazy, Suspense, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';

const { Title, Paragraph, Text } = Typography;

/** 在线小游戏元数据（可翻译字段 name/description/instructions/category 见 games.json 的 onlineGames.*） */
const gameRegistry: Record<string, { category: string; icon: string; color: string; players: number; rating: number; component: React.LazyExoticComponent<React.ComponentType<any>> }> = {
  snake: { category: 'casual', icon: '🐍', color: 'from-green-500 to-emerald-600', players: 2341, rating: 4.5, component: lazy(() => import('../components/games/SnakeGame')) },
  tetris: { category: 'puzzle', icon: '🧱', color: 'from-blue-500 to-cyan-600', players: 3892, rating: 4.8, component: lazy(() => import('../components/games/TetrisGame')) },
  'brick-breaker': { category: 'action', icon: '🧱', color: 'from-orange-500 to-red-600', players: 1876, rating: 4.3, component: lazy(() => import('../components/games/BrickBreakerGame')) },
  gobang: { category: 'strategy', icon: '⚫', color: 'from-purple-500 to-indigo-600', players: 4567, rating: 4.7, component: lazy(() => import('../components/games/GobangGame')) },
  minesweeper: { category: 'puzzle', icon: '💣', color: 'from-gray-600 to-gray-800', players: 2987, rating: 4.4, component: lazy(() => import('../components/games/MinesweeperGame')) },
  game2048: { category: 'puzzle', icon: '🔢', color: 'from-amber-500 to-yellow-600', players: 5432, rating: 4.9, component: lazy(() => import('../components/games/Game2048')) },
  memory: { category: 'casual', icon: '🃏', color: 'from-pink-500 to-rose-600', players: 1567, rating: 4.2, component: lazy(() => import('../components/games/MemoryGame')) },
  pong: { category: 'action', icon: '🏓', color: 'from-teal-500 to-green-600', players: 3210, rating: 4.6, component: lazy(() => import('../components/games/PongGame')) },
  'tank-battle': { category: 'action', icon: '🎮', color: 'from-green-700 to-yellow-600', players: 1876, rating: 4.7, component: lazy(() => import('../components/games/TankBattle')) },
  'magic-trampoline': { category: 'casual', icon: '☀️', color: 'from-pink-500 to-purple-600', players: 1234, rating: 4.5, component: lazy(() => import('../components/games/MagicTrampoline')) },
  'space-shooter': { category: 'action', icon: '✈️', color: 'from-cyan-500 to-blue-700', players: 3456, rating: 4.8, component: lazy(() => import('../components/games/SpaceShooter')) },
  'whack-a-mole': { category: 'casual', icon: '🔨', color: 'from-yellow-700 to-green-700', players: 2345, rating: 4.4, component: lazy(() => import('../components/games/WhackAMole')) },
  'match-three': { category: 'puzzle', icon: '💎', color: 'from-red-500 to-orange-500', players: 4567, rating: 4.9, component: lazy(() => import('../components/games/MatchThree')) },
  'speed-racer': { category: 'action', icon: '🏎️', color: 'from-red-600 to-orange-600', players: 2876, rating: 4.6, component: lazy(() => import('../components/games/SpeedRacer')) },
  'bubble-shooter': { category: 'puzzle', icon: '🫧', color: 'from-blue-400 to-purple-500', players: 1987, rating: 4.5, component: lazy(() => import('../components/games/BubbleShooter')) },
  'sliding-puzzle': { category: 'puzzle', icon: '🔢', color: 'from-blue-600 to-indigo-600', players: 1654, rating: 4.3, component: lazy(() => import('../components/games/SlidingPuzzle')) },
  'jump-adventure': { category: 'action', icon: '🦘', color: 'from-teal-400 to-green-500', players: 3120, rating: 4.7, component: lazy(() => import('../components/games/JumpAdventure')) },
  'archery-master': { category: 'casual', icon: '🏹', color: 'from-amber-600 to-yellow-500', players: 1432, rating: 4.4, component: lazy(() => import('../components/games/ArcheryMaster')) },
  guandan: { category: 'strategy', icon: '🃏', color: 'from-red-600 to-orange-500', players: 5680, rating: 4.8, component: lazy(() => import('../components/games/GuandanGame')) },
};

const GamePlayPage = () => {
  const { gameId, lang } = useParams<{ gameId: string; lang: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('games');
  const [gameStarted, setGameStarted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const game = gameId ? gameRegistry[gameId] : undefined;

  // 本地化的名称/描述/分类/玩法说明
  const name = gameId ? t(`onlineGames.games.${gameId}.name`) : '';
  const description = gameId ? t(`onlineGames.games.${gameId}.description`) : '';
  const instructions = gameId ? t(`onlineGames.games.${gameId}.instructions`) : '';
  const category = game ? t(`onlineGames.categories.${game.category}`) : '';

  const GameComponent = game?.component;

  const otherGames = useMemo(() => {
    return Object.entries(gameRegistry)
      .filter(([id]) => id !== gameId)
      .slice(0, 4);
  }, [gameId]);

  // Structured data: VideoGame + HowTo + BreadcrumbList
  const structuredData = useMemo(() => {
    if (!game || !gameId) return [];
    const siteUrl = import.meta.env.VITE_SITE_URL || 'https://www.gghubs.com';
    const steps = instructions
      .split(/[，,。.;；]/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map((text, i) => ({
        '@type': 'HowToStep',
        'position': i + 1,
        'text': text,
      }));
    return [
      {
        '@type': 'VideoGame',
        'name': name,
        'description': description,
        'genre': category,
        'applicationCategory': 'Game',
        'offers': {
          '@type': 'Offer',
          'price': '0',
          'priceCurrency': 'USD',
          'availability': 'https://schema.org/InStock',
        },
        'aggregateRating': {
          '@type': 'AggregateRating',
          'ratingValue': game.rating,
          'bestRating': 5,
          'ratingCount': game.players,
        },
      },
      {
        '@type': 'HowTo',
        'name': t('onlineGames.play.howToName', { name }),
        'description': description,
        'step': steps,
      },
      {
        '@type': 'BreadcrumbList',
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': t('onlineGames.breadcrumbHome'), 'item': siteUrl },
          { '@type': 'ListItem', 'position': 2, 'name': t('onlineGames.title'), 'item': `${siteUrl}/${lang || 'cn'}/library/online` },
          { '@type': 'ListItem', 'position': 3, 'name': name },
        ],
      },
    ];
  }, [game, gameId, name, description, category, instructions, t, lang]);

  if (!game) {
    return (
      <div className="bg-dark-900 py-2">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="text-6xl mb-4 opacity-30">🎮</div>
          <Title level={2} className="!text-gray-400">{t('onlineGames.play.gameNotFound')}</Title>
          <Button type="primary" onClick={() => navigate(`/${lang || 'cn'}/library/online`)}>
            <ArrowLeftOutlined /> {t('onlineGames.play.backToGames')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-900">
      <SEO
        title={t('onlineGames.play.seoTitle', { name })}
        description={description}
        keywords={t('onlineGames.play.seoKeywords', { name, category })}
        structuredData={structuredData}
      />

      <div className="py-2">
        {/* Back */}
        <Button
          type="text"
          className="!text-gray-400 hover:!text-white mb-6 !flex !items-center !gap-1 !pl-0"
          onClick={() => navigate(`/${lang || 'cn'}/library/online`)}
        >
          <ArrowLeftOutlined /> {t('onlineGames.play.backToGames')}
        </Button>

        {/* Game Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center text-3xl`}>
            {game.icon}
          </div>
          <div className="flex-1">
            <Title level={1} className="!text-white !text-2xl !mb-1">{name}</Title>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
              <Tag color="default" className="bg-dark-700 text-gray-300 border-0">{category}</Tag>
              <span><UserOutlined /> {t('onlineGames.play.players', { num: game.players.toLocaleString() })}</span>
              <Rate disabled value={game.rating / 2} allowHalf className="text-xs" />
            </div>
          </div>
        </div>

        {/* Game Area */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-6 mb-6 flex justify-center">
          {GameComponent && (
            <Suspense fallback={
              <div className="py-16">
                <Skeleton active />
              </div>
            }>
              <GameComponent
                onGameStart={() => setGameStarted(true)}
                onGameOver={() => setGameStarted(false)}
              />
            </Suspense>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-6 mb-8">
          <Title level={2} className="!text-white !text-lg !mb-3">{t('onlineGames.play.howToPlay')}</Title>
          <Paragraph className="!text-gray-400">{instructions}</Paragraph>
        </div>

        {/* Other Games */}
        <div>
          <Title level={2} className="!text-white !text-lg !mb-4">{t('onlineGames.play.moreGames')}</Title>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {otherGames.map(([id, g]) => (
              <Card
                key={id}
                hoverable
                size="small"
                className="bg-dark-800 border-dark-700 text-center cursor-pointer"
                onClick={() => navigate(`/${lang || 'cn'}/library/play/${id}`)}
              >
                <div className={`w-12 h-12 mx-auto mb-2 rounded-lg bg-gradient-to-br ${g.color} flex items-center justify-center text-2xl`}>
                  {g.icon}
                </div>
                <Text className="!text-white !text-sm block">{t(`onlineGames.games.${id}.name`)}</Text>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamePlayPage;
