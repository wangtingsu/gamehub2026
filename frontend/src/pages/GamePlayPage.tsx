import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Button, Card, Tag, Rate, Skeleton } from 'antd';
import { ArrowLeftOutlined, UserOutlined } from '@ant-design/icons';
import { useMemo, lazy, Suspense, useState, useEffect } from 'react';
import SEO from '../components/SEO';

const { Title, Paragraph, Text } = Typography;

const gameRegistry: Record<string, { name: string; description: string; category: string; icon: string; color: string; instructions: string; players: number; rating: number; component: React.LazyExoticComponent<React.ComponentType<any>> }> = {
  snake: {
    name: 'Snake', description: 'Classic Snake — eat food to grow your snake', category: 'Casual', icon: '🐍', color: 'from-green-500 to-emerald-600',
    instructions: 'Use the arrow keys to steer, eat food to grow, and avoid hitting the walls or yourself', players: 2341, rating: 4.5,
    component: lazy(() => import('../components/games/SnakeGame')),
  },
  tetris: {
    name: 'Tetris', description: 'Classic Tetris — clear lines to chase the high score', category: 'Puzzle', icon: '🧱', color: 'from-blue-500 to-cyan-600',
    instructions: '← → move, ↑ rotate, ↓ speed up, Space to drop', players: 3892, rating: 4.8,
    component: lazy(() => import('../components/games/TetrisGame')),
  },
  'brick-breaker': {
    name: 'Brick Breaker', description: 'Control the paddle and bounce the ball to break every brick', category: 'Action', icon: '🧱', color: 'from-orange-500 to-red-600',
    instructions: 'Move the mouse to control the paddle and break all the bricks to clear the level', players: 1876, rating: 4.3,
    component: lazy(() => import('../components/games/BrickBreakerGame')),
  },
  gobang: {
    name: 'Gomoku', description: 'Play Gomoku against the AI — black moves first, connect five', category: 'Strategy', icon: '⚫', color: 'from-purple-500 to-indigo-600',
    instructions: 'Click an intersection to place your stone; line up five in a row horizontally, vertically, or diagonally to win', players: 4567, rating: 4.7,
    component: lazy(() => import('../components/games/GobangGame')),
  },
  minesweeper: {
    name: 'Minesweeper', description: 'Classic Minesweeper — reveal safe cells and avoid the mines', category: 'Puzzle', icon: '💣', color: 'from-gray-600 to-gray-800',
    instructions: 'Left-click to reveal a cell, right-click to flag a mine; the number shows nearby mines', players: 2987, rating: 4.4,
    component: lazy(() => import('../components/games/MinesweeperGame')),
  },
  game2048: {
    name: '2048', description: 'Slide and merge number tiles to reach 2048', category: 'Puzzle', icon: '🔢', color: 'from-amber-500 to-yellow-600',
    instructions: 'Use arrow keys or swipe to merge matching numbers until you reach 2048', players: 5432, rating: 4.9,
    component: lazy(() => import('../components/games/Game2048')),
  },
  memory: {
    name: 'Memory Match', description: 'A card-matching game that tests your memory', category: 'Casual', icon: '🃏', color: 'from-pink-500 to-rose-600',
    instructions: 'Flip cards and find matching pairs', players: 1567, rating: 4.2,
    component: lazy(() => import('../components/games/MemoryGame')),
  },
  pong: {
    name: 'Pong', description: 'Classic Pong against the AI', category: 'Action', icon: '🏓', color: 'from-teal-500 to-green-600',
    instructions: 'Move the mouse to control the paddle; first to 5 points wins', players: 3210, rating: 4.6,
    component: lazy(() => import('../components/games/PongGame')),
  },
  'tank-battle': {
    name: 'Tank Battle', description: 'Classic tank battle — destroy the enemy and protect your base', category: 'Action', icon: '🎮', color: 'from-green-700 to-yellow-600',
    instructions: 'Arrow keys/WASD to move, Space/Enter to shoot; destroy all enemy tanks while protecting your base', players: 1876, rating: 4.7,
    component: lazy(() => import('../components/games/TankBattle')),
  },
  'magic-trampoline': {
    name: 'Magic Trampoline', description: 'Bounce and collect stars while dodging spikes', category: 'Casual', icon: '☀️', color: 'from-pink-500 to-purple-600',
    instructions: 'Use ← → to move, collect golden stars, dodge red spikes — the higher you bounce, the better the score', players: 1234, rating: 4.5,
    component: lazy(() => import('../components/games/MagicTrampoline')),
  },
  'space-shooter': {
    name: 'Space Shooter', description: 'Pilot a starfighter and repel the alien invasion', category: 'Action', icon: '✈️', color: 'from-cyan-500 to-blue-700',
    instructions: 'Arrow keys to move; you auto-fire, collect power-ups, and dodge enemy attacks', players: 3456, rating: 4.8,
    component: lazy(() => import('../components/games/SpaceShooter')),
  },
  'whack-a-mole': {
    name: 'Whack-a-Mole', description: 'Whack moles as fast as you can to test your reflexes', category: 'Casual', icon: '🔨', color: 'from-yellow-700 to-green-700',
    instructions: 'Tap the moles when they pop up; hit as many as you can in 30 seconds', players: 2345, rating: 4.4,
    component: lazy(() => import('../components/games/WhackAMole')),
  },
  'match-three': {
    name: 'Match-3', description: 'Swap gems and match three to chase a high score', category: 'Puzzle', icon: '💎', color: 'from-red-500 to-orange-500',
    instructions: 'Select a gem, then tap an adjacent gem to swap; match 3+ of the same color to clear and score', players: 4567, rating: 4.9,
    component: lazy(() => import('../components/games/MatchThree')),
  },
  'speed-racer': {
    name: 'Speed Racer', description: 'Dodge traffic on the highway and push for top speed', category: 'Action', icon: '🏎️', color: 'from-red-600 to-orange-600',
    instructions: '← → to switch lanes and dodge oncoming cars; it gets faster and faster', players: 2876, rating: 4.6,
    component: lazy(() => import('../components/games/SpeedRacer')),
  },
  'bubble-shooter': {
    name: 'Bubble Shooter', description: 'Aim and shoot bubbles to clear the board', category: 'Puzzle', icon: '🫧', color: 'from-blue-400 to-purple-500',
    instructions: 'Move the mouse to aim, click to shoot; match 3+ of the same color to pop them', players: 1987, rating: 4.5,
    component: lazy(() => import('../components/games/BubbleShooter')),
  },
  'sliding-puzzle': {
    name: 'Sliding Puzzle', description: 'Slide the tiles to restore the correct order', category: 'Puzzle', icon: '🔢', color: 'from-blue-600 to-indigo-600',
    instructions: 'Tap a tile to slide it into the empty space and arrange the numbers 1–15 in order', players: 1654, rating: 4.3,
    component: lazy(() => import('../components/games/SlidingPuzzle')),
  },
  'jump-adventure': {
    name: 'Jump Adventure', description: 'Leap across platforms and collect coins', category: 'Action', icon: '🦘', color: 'from-teal-400 to-green-500',
    instructions: 'Click/Space to jump, hold to charge for a longer jump, land on platforms to keep going, and avoid the gaps', players: 3120, rating: 4.7,
    component: lazy(() => import('../components/games/JumpAdventure')),
  },
  'archery-master': {
    name: 'Archery Master', description: 'Aim for the bullseye and test your precision', category: 'Casual', icon: '🏹', color: 'from-amber-600 to-yellow-500',
    instructions: 'Hold to draw, release to shoot; watch the wind and aim for the bullseye', players: 1432, rating: 4.4,
    component: lazy(() => import('../components/games/ArcheryMaster')),
  },
  'guandan': {
    name: 'Guandan', description: 'Four-player team card game with two decks (108 cards), from 2 to A', category: 'Strategy', icon: '🃏', color: 'from-red-600 to-orange-500',
    instructions: 'Play in teams of two, meld by card type, first team to empty their hand wins. Supports singles, pairs, triples, triples-with-pair, straights, steel plates, bundles, bombs, straight flushes, and rockets', players: 5680, rating: 4.8,
    component: lazy(() => import('../components/games/GuandanGame')),
  },
};

const GamePlayPage = () => {
  const { gameId, lang } = useParams<{ gameId: string; lang: string }>();
  const navigate = useNavigate();
  const [gameStarted, setGameStarted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const game = gameId ? gameRegistry[gameId] : undefined;

  const GameComponent = game?.component;

  const otherGames = useMemo(() => {
    return Object.entries(gameRegistry)
      .filter(([id]) => id !== gameId)
      .slice(0, 4);
  }, [gameId]);

  // Structured data: VideoGame + HowTo + BreadcrumbList
  const structuredData = useMemo(() => {
    if (!game) return [];
    const siteUrl = import.meta.env.VITE_SITE_URL || 'https://www.gghubs.com';
    const steps = game.instructions
      .split(/[，,。.]/)
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
        'name': game.name,
        'description': game.description,
        'genre': game.category,
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
        'name': `How to play ${game.name}`,
        'description': game.description,
        'step': steps,
      },
      {
        '@type': 'BreadcrumbList',
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': siteUrl },
          { '@type': 'ListItem', 'position': 2, 'name': 'Online Games', 'item': `${siteUrl}/library/online` },
          { '@type': 'ListItem', 'position': 3, 'name': game.name },
        ],
      },
    ];
  }, [game]);

  if (!game) {
    return (
      <div className="bg-dark-900 py-2">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="text-6xl mb-4 opacity-30">🎮</div>
          <Title level={2} className="!text-gray-400">Game not found</Title>
          <Button type="primary" onClick={() => navigate(`/${lang || 'cn'}/library/online`)}>
            <ArrowLeftOutlined /> Back to Games
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-900">
      <SEO
        title={`${game.name} | GameHub Online Games`}
        description={game.description}
        keywords={`${game.name}, ${game.category}, online games, mini games, GameHub online games, browser games`}
        structuredData={structuredData}
      />

      <div className="py-2">
        {/* Back */}
        <Button
          type="text"
          className="!text-gray-400 hover:!text-white mb-6 !flex !items-center !gap-1 !pl-0"
          onClick={() => navigate(`/${lang || 'cn'}/library/online`)}
        >
          <ArrowLeftOutlined /> Back to Games
        </Button>

        {/* Game Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center text-3xl`}>
            {game.icon}
          </div>
          <div className="flex-1">
            <Title level={1} className="!text-white !text-2xl !mb-1">{game.name}</Title>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
              <Tag color="default" className="bg-dark-700 text-gray-300 border-0">{game.category}</Tag>
              <span><UserOutlined /> {game.players.toLocaleString()} players</span>
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
          <Title level={2} className="!text-white !text-lg !mb-3">How to Play</Title>
          <Paragraph className="!text-gray-400">{game.instructions}</Paragraph>
        </div>

        {/* Other Games */}
        <div>
          <Title level={2} className="!text-white !text-lg !mb-4">More Games</Title>
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
                <Text className="!text-white !text-sm block">{g.name}</Text>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamePlayPage;
