import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Button, Card, Tag, Rate, Skeleton } from 'antd';
import { ArrowLeftOutlined, UserOutlined } from '@ant-design/icons';
import { useMemo, lazy, Suspense, useState, useEffect } from 'react';
import SEO from '../components/SEO';

const { Title, Paragraph, Text } = Typography;

const gameRegistry: Record<string, { name: string; description: string; category: string; icon: string; color: string; instructions: string; players: number; rating: number; component: React.LazyExoticComponent<React.ComponentType<any>> }> = {
  snake: {
    name: '贪吃蛇', description: '经典贪吃蛇游戏，控制蛇吃食物不断成长', category: '休闲', icon: '🐍', color: 'from-green-500 to-emerald-600',
    instructions: '方向键控制蛇的移动方向，吃到食物增长身体，撞墙或撞到自己游戏结束', players: 2341, rating: 4.5,
    component: lazy(() => import('../components/games/SnakeGame')),
  },
  tetris: {
    name: '俄罗斯方块', description: '经典俄罗斯方块，消除方块挑战高分', category: '益智', icon: '🧱', color: 'from-blue-500 to-cyan-600',
    instructions: '方向键←→移动，↑旋转，↓加速下落，空格直接落底', players: 3892, rating: 4.8,
    component: lazy(() => import('../components/games/TetrisGame')),
  },
  'brick-breaker': {
    name: '打砖块', description: '控制挡板反弹小球，击碎所有砖块', category: '动作', icon: '🧱', color: 'from-orange-500 to-red-600',
    instructions: '移动鼠标控制挡板，反弹小球击碎所有砖块即可过关', players: 1876, rating: 4.3,
    component: lazy(() => import('../components/games/BrickBreakerGame')),
  },
  gobang: {
    name: '五子棋', description: '与AI对战的五子棋，黑子先行五子连珠', category: '策略', icon: '⚫', color: 'from-purple-500 to-indigo-600',
    instructions: '点击棋盘交叉点落子，黑子先手，横竖斜任意方向五子连珠即可获胜', players: 4567, rating: 4.7,
    component: lazy(() => import('../components/games/GobangGame')),
  },
  minesweeper: {
    name: '扫雷', description: '经典扫雷游戏，揭开所有安全格子避开地雷', category: '益智', icon: '💣', color: 'from-gray-600 to-gray-800',
    instructions: '左键翻开格子，右键标记地雷，数字表示周围地雷数量', players: 2987, rating: 4.4,
    component: lazy(() => import('../components/games/MinesweeperGame')),
  },
  game2048: {
    name: '2048', description: '滑动合并数字方块，挑战2048', category: '益智', icon: '🔢', color: 'from-amber-500 to-yellow-600',
    instructions: '方向键或滑动操作，合并相同数字达到2048', players: 5432, rating: 4.9,
    component: lazy(() => import('../components/games/Game2048')),
  },
  memory: {
    name: '记忆翻牌', description: '翻牌配对游戏，考验你的记忆力', category: '休闲', icon: '🃏', color: 'from-pink-500 to-rose-600',
    instructions: '点击卡片翻面，找到相同图案的卡片配对', players: 1567, rating: 4.2,
    component: lazy(() => import('../components/games/MemoryGame')),
  },
  pong: {
    name: '乒乓球', description: '经典乒乓球游戏，与AI对战', category: '动作', icon: '🏓', color: 'from-teal-500 to-green-600',
    instructions: '移动鼠标控制球拍，先得5分获胜', players: 3210, rating: 4.6,
    component: lazy(() => import('../components/games/PongGame')),
  },
  'tank-battle': {
    name: '坦克大战', description: '经典坦克对战，消灭敌军保护基地', category: '动作', icon: '🎮', color: 'from-green-700 to-yellow-600',
    instructions: '方向键/WASD移动，空格/Enter射击，消灭所有敌军坦克，保护己方基地', players: 1876, rating: 4.7,
    component: lazy(() => import('../components/games/TankBattle')),
  },
  'magic-trampoline': {
    name: '魔力蹦蹦床', description: '弹跳收集星星，躲避障碍冲向高空', category: '休闲', icon: '☀️', color: 'from-pink-500 to-purple-600',
    instructions: '方向键左右移动，收集金色星星，躲避红色尖刺，跳得越高分数越高', players: 1234, rating: 4.5,
    component: lazy(() => import('../components/games/MagicTrampoline')),
  },
  'space-shooter': {
    name: '飞机大战', description: '驾驶星际战机，消灭外星入侵者', category: '动作', icon: '✈️', color: 'from-cyan-500 to-blue-700',
    instructions: '方向键移动，自动开火射击敌人，收集道具增强火力，躲避敌机攻击', players: 3456, rating: 4.8,
    component: lazy(() => import('../components/games/SpaceShooter')),
  },
  'whack-a-mole': {
    name: '打地鼠', description: '快速敲击地鼠，考验你的反应速度', category: '休闲', icon: '🔨', color: 'from-yellow-700 to-green-700',
    instructions: '点击冒出地鼠的洞敲打，30秒内尽可能多地打到地鼠', players: 2345, rating: 4.4,
    component: lazy(() => import('../components/games/WhackAMole')),
  },
  'match-three': {
    name: '消消乐', description: '交换宝石三消配对，挑战高分', category: '益智', icon: '💎', color: 'from-red-500 to-orange-500',
    instructions: '点击选中宝石，再点击相邻宝石交换，三个以上同色相连即可消除得分', players: 4567, rating: 4.9,
    component: lazy(() => import('../components/games/MatchThree')),
  },
  'speed-racer': {
    name: '极速赛车', description: '在高速公路上躲避车辆，挑战极限速度', category: '动作', icon: '🏎️', color: 'from-red-600 to-orange-600',
    instructions: '左右方向键切换车道，躲避前方来车，速度越来越快', players: 2876, rating: 4.6,
    component: lazy(() => import('../components/games/SpeedRacer')),
  },
  'bubble-shooter': {
    name: '泡泡龙', description: '瞄准射击彩色泡泡，消除全部过关', category: '益智', icon: '🫧', color: 'from-blue-400 to-purple-500',
    instructions: '鼠标移动瞄准，点击发射泡泡，三个以上同色相连即可消除', players: 1987, rating: 4.5,
    component: lazy(() => import('../components/games/BubbleShooter')),
  },
  'sliding-puzzle': {
    name: '数字华容道', description: '滑动数字方块，恢复正确顺序', category: '益智', icon: '🔢', color: 'from-blue-600 to-indigo-600',
    instructions: '点击方块滑入空格，将数字按1-15顺序排列即可过关', players: 1654, rating: 4.3,
    component: lazy(() => import('../components/games/SlidingPuzzle')),
  },
  'jump-adventure': {
    name: '跳一跳', description: '跳跃前进跨越平台，收集金币勇往直前', category: '动作', icon: '🦘', color: 'from-teal-400 to-green-500',
    instructions: '点击/空格跳跃，按住蓄力跳更远，落在平台上继续前进，掉入缝隙则游戏结束', players: 3120, rating: 4.7,
    component: lazy(() => import('../components/games/JumpAdventure')),
  },
  'archery-master': {
    name: '射箭大师', description: '瞄准靶心射箭，挑战精准度极限', category: '休闲', icon: '🏹', color: 'from-amber-600 to-yellow-500',
    instructions: '按住鼠标蓄力，松开射箭，注意风向影响，瞄准靶心获得高分', players: 1432, rating: 4.4,
    component: lazy(() => import('../components/games/ArcheryMaster')),
  },
  'guandan': {
    name: '掼蛋', description: '四人组队升级制扑克游戏，两副牌108张，从2打到A', category: '策略', icon: '🃏', color: 'from-red-600 to-orange-500',
    instructions: '四人两两组队，按牌型出牌，先出完的队伍获胜。支持：单张、对子、三同张、三带二、顺子、钢板、夯、炸弹、同花顺、火箭', players: 5680, rating: 4.8,
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

  // 结构化数据：VideoGame + HowTo + BreadcrumbList
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
      <div className="min-h-screen bg-dark-900 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="text-6xl mb-4 opacity-30">🎮</div>
          <Title level={2} className="!text-gray-400">游戏不存在</Title>
          <Button type="primary" onClick={() => navigate(`/${lang || 'cn'}/library/online`)}>
            <ArrowLeftOutlined /> 返回游戏列表
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <SEO
        title={`${game.name} | GameHub 在线游戏`}
        description={game.description}
        keywords={`${game.name}, ${game.category}, 在线游戏, 小游戏, GameHub在线游戏, 网页游戏`}
        structuredData={structuredData}
      />

      <div className="py-8">
        {/* Back */}
        <Button
          type="text"
          className="!text-gray-400 hover:!text-white mb-6 !flex !items-center !gap-1 !pl-0"
          onClick={() => navigate(`/${lang || 'cn'}/library/online`)}
        >
          <ArrowLeftOutlined /> 返回游戏列表
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
              <span><UserOutlined /> {game.players.toLocaleString()} 人在玩</span>
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
          <Title level={2} className="!text-white !text-lg !mb-3">游戏说明</Title>
          <Paragraph className="!text-gray-400">{game.instructions}</Paragraph>
        </div>

        {/* Other Games */}
        <div>
          <Title level={2} className="!text-white !text-lg !mb-4">其他游戏</Title>
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
