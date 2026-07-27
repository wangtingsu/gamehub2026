import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Typography, Input, Tag, Card, Rate, Pagination } from 'antd';
import { SearchOutlined, PlayCircleOutlined, UserOutlined } from '@ant-design/icons';
import SEO from '../components/SEO';
import type { OnlineGame } from '../api/types';

const { Title, Paragraph, Text } = Typography;

const onlineGames: OnlineGame[] = [
  { id: 'snake', name: '贪吃蛇', description: '经典贪吃蛇游戏，控制蛇吃食物不断成长', category: '休闲', icon: '🐍', color: 'from-green-500 to-emerald-600', component: 'SnakeGame', players: 2341, rating: 4.5, instructions: '方向键控制蛇的移动方向，吃到食物增长身体，撞墙或撞到自己游戏结束' },
  { id: 'tetris', name: '俄罗斯方块', description: '经典俄罗斯方块，消除方块挑战高分', category: '益智', icon: '🧱', color: 'from-blue-500 to-cyan-600', component: 'TetrisGame', players: 3892, rating: 4.8, instructions: '方向键←→移动，↑旋转，↓加速下落，空格直接落底' },
  { id: 'brick-breaker', name: '打砖块', description: '控制挡板反弹小球，击碎所有砖块', category: '动作', icon: '🧱', color: 'from-orange-500 to-red-600', component: 'BrickBreakerGame', players: 1876, rating: 4.3, instructions: '移动鼠标控制挡板，反弹小球击碎所有砖块即可过关' },
  { id: 'gobang', name: '五子棋', description: '与AI对战的五子棋，黑子先行五子连珠', category: '策略', icon: '⚫', color: 'from-purple-500 to-indigo-600', component: 'GobangGame', players: 4567, rating: 4.7, instructions: '点击棋盘交叉点落子，黑子先手，横竖斜任意方向五子连珠即可获胜' },
  { id: 'minesweeper', name: '扫雷', description: '经典扫雷游戏，揭开所有安全格子避开地雷', category: '益智', icon: '💣', color: 'from-gray-600 to-gray-800', component: 'MinesweeperGame', players: 2987, rating: 4.4, instructions: '左键翻开格子，右键标记地雷，数字表示周围地雷数量' },
  { id: 'game2048', name: '2048', description: '滑动合并数字方块，挑战2048', category: '益智', icon: '🔢', color: 'from-amber-500 to-yellow-600', component: 'Game2048', players: 5432, rating: 4.9, instructions: '方向键或滑动操作，合并相同数字达到2048' },
  { id: 'memory', name: '记忆翻牌', description: '翻牌配对游戏，考验你的记忆力', category: '休闲', icon: '🃏', color: 'from-pink-500 to-rose-600', component: 'MemoryGame', players: 1567, rating: 4.2, instructions: '点击卡片翻面，找到相同图案的卡片配对' },
  { id: 'pong', name: '乒乓球', description: '经典乒乓球游戏，与AI对战', category: '动作', icon: '🏓', color: 'from-teal-500 to-green-600', component: 'PongGame', players: 3210, rating: 4.6, instructions: '移动鼠标控制球拍，先得5分获胜' },
  { id: 'tank-battle', name: '坦克大战', description: '经典坦克对战，消灭敌军保护基地', category: '动作', icon: '🎮', color: 'from-green-700 to-yellow-600', component: 'TankBattle', players: 1876, rating: 4.7, instructions: '方向键/WASD移动，空格/Enter射击，消灭所有敌军坦克，保护己方基地' },
  { id: 'magic-trampoline', name: '魔力蹦蹦床', description: '弹跳收集星星，躲避障碍冲向高空', category: '休闲', icon: '☀️', color: 'from-pink-500 to-purple-600', component: 'MagicTrampoline', players: 1234, rating: 4.5, instructions: '方向键左右移动，收集金色星星，躲避红色尖刺，跳得越高分数越高' },
  { id: 'space-shooter', name: '飞机大战', description: '驾驶星际战机，消灭外星入侵者', category: '动作', icon: '✈️', color: 'from-cyan-500 to-blue-700', component: 'SpaceShooter', players: 3456, rating: 4.8, instructions: '方向键移动，自动开火射击敌人，收集道具增强火力，躲避敌机攻击' },
  { id: 'whack-a-mole', name: '打地鼠', description: '快速敲击地鼠，考验你的反应速度', category: '休闲', icon: '🔨', color: 'from-yellow-700 to-green-700', component: 'WhackAMole', players: 2345, rating: 4.4, instructions: '点击冒出地鼠的洞敲打，30秒内尽可能多地打到地鼠' },
  { id: 'match-three', name: '消消乐', description: '交换宝石三消配对，挑战高分', category: '益智', icon: '💎', color: 'from-red-500 to-orange-500', component: 'MatchThree', players: 4567, rating: 4.9, instructions: '点击选中宝石，再点击相邻宝石交换，三个以上同色相连即可消除得分' },
  { id: 'speed-racer', name: '极速赛车', description: '在高速公路上躲避车辆，挑战极限速度', category: '动作', icon: '🏎️', color: 'from-red-600 to-orange-600', component: 'SpeedRacer', players: 2876, rating: 4.6, instructions: '左右方向键切换车道，躲避前方来车，速度越来越快' },
  { id: 'bubble-shooter', name: '泡泡龙', description: '瞄准射击彩色泡泡，消除全部过关', category: '益智', icon: '🫧', color: 'from-blue-400 to-purple-500', component: 'BubbleShooter', players: 1987, rating: 4.5, instructions: '鼠标移动瞄准，点击发射泡泡，三个以上同色相连即可消除' },
  { id: 'sliding-puzzle', name: '数字华容道', description: '滑动数字方块，恢复正确顺序', category: '益智', icon: '🔢', color: 'from-blue-600 to-indigo-600', component: 'SlidingPuzzle', players: 1654, rating: 4.3, instructions: '点击方块滑入空格，将数字按1-15顺序排列即可过关' },
  { id: 'jump-adventure', name: '跳一跳', description: '跳跃前进跨越平台，收集金币勇往直前', category: '动作', icon: '🦘', color: 'from-teal-400 to-green-500', component: 'JumpAdventure', players: 3120, rating: 4.7, instructions: '点击/空格跳跃，按住蓄力跳更远，落在平台上继续前进，掉入缝隙则游戏结束' },
  { id: 'archery-master', name: '射箭大师', description: '瞄准靶心射箭，挑战精准度极限', category: '休闲', icon: '🏹', color: 'from-amber-600 to-yellow-500', component: 'ArcheryMaster', players: 1432, rating: 4.4, instructions: '按住鼠标蓄力，松开射箭，注意风向影响，瞄准靶心获得高分' },
  { id: 'guandan', name: '掼蛋', description: '四人组队升级制扑克游戏，两副牌108张，从2打到A', category: '策略', icon: '🃏', color: 'from-red-600 to-orange-500', component: 'GuandanGame', players: 5680, rating: 4.8, instructions: '四人两两组队，按牌型出牌，先出完的队伍获胜。支持：单张、对子、三同张、三带二、顺子、钢板、夯、炸弹、同花顺、火箭' },
];

const categories = ['全部', '休闲', '益智', '动作', '策略'];

const OnlineGamesPage = () => {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang || 'cn';
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://www.gghubs.com';

  // 在线游戏 FAQ 结构化数据
  const structuredData = [
    {
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': '首页', 'item': 'https://www.gghubs.com' },
        { '@type': 'ListItem', 'position': 2, 'name': '在线游戏', 'item': `${siteUrl}/${currentLang}/library/online` },
      ],
    },
    {
      '@type': 'ItemList',
      'name': '免费在线小游戏合集',
      'description': 'GameHub提供20+款免费在线小游戏',
      'itemListElement': onlineGames.map((game, index) => ({
        '@type': 'ListItem',
        'position': index + 1,
        'item': {
          '@type': 'VideoGame',
          'name': game.name,
          'description': game.description,
          'genre': game.category,
          'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'USD' },
          'url': `${siteUrl}/${currentLang}/library/play/${game.id}`,
        },
      })),
    },
    {
      '@type': 'FAQPage',
      'mainEntity': [
        {
          '@type': 'Question',
          'name': '这些在线游戏需要下载吗？',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': '完全不需要！所有游戏都在浏览器中直接运行，点击即可开始游玩，无需任何下载或安装。',
          },
        },
        {
          '@type': 'Question',
          'name': '在线游戏是免费的吗？',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': '是的，GameHub上的所有在线小游戏完全免费，无需付费即可畅玩全部游戏。',
          },
        },
        {
          '@type': 'Question',
          'name': '可以在手机上玩这些游戏吗？',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': '可以！所有游戏都针对电脑和手机浏览器进行了适配优化，随时随地即可开始游戏。',
          },
        },
        {
          '@type': 'Question',
          'name': '需要注册账号才能玩吗？',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': '不需要注册，所有游戏无需登录即可直接游玩。注册账号后可以保存游戏进度和参与社区讨论。',
          },
        },
      ],
    },
  ];

  const filteredGames = useMemo(() => {
    let result = [...onlineGames];
    if (searchText) {
      const q = searchText.toLowerCase();
      result = result.filter(g => g.name.includes(q) || g.description.includes(q));
    }
    if (selectedCategory !== '全部') {
      result = result.filter(g => g.category === selectedCategory);
    }
    return result;
  }, [searchText, selectedCategory]);

  const paginatedGames = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredGames.slice(start, start + pageSize);
  }, [filteredGames, currentPage]);

  return (
    <div className="min-h-screen bg-dark-900">
      <SEO
        title="免费在线小游戏 - 即点即玩无需下载 | GameHub"
        description="GameHub 提供20+款免费在线小游戏，包括贪吃蛇、俄罗斯方块、2048、五子棋、扫雷等经典游戏。无需下载，在浏览器中即点即玩，支持电脑和手机。"
        keywords="在线游戏, 免费小游戏, 网页游戏, 贪吃蛇, 俄罗斯方块, 2048, 五子棋, 扫雷, HTML5游戏, 浏览器游戏, 即点即玩, 无需下载"
        structuredData={structuredData}
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-12">
        <div className="">
          <div className="text-center">
            <Title level={1} className="!text-white mb-4">在线游戏</Title>
            <Paragraph className="!text-indigo-100 !text-lg mb-8">无需下载，即点即玩</Paragraph>
            <div className="max-w-xl mx-auto">
              <Input
                size="large"
                placeholder="搜索游戏..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={e => { setSearchText(e.target.value); setCurrentPage(1); }}
                className="rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="py-8">
        {/* Category */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map(cat => (
            <Tag
              key={cat}
              className={`
                cursor-pointer px-4 py-1.5 rounded-full text-sm border-0 m-0
                ${selectedCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-dark-700 text-gray-300 hover:bg-dark-600'}
              `}
              onClick={() => { setSelectedCategory(cat); setCurrentPage(1); }}
            >
              {cat}
            </Tag>
          ))}
        </div>

        {/* Game Grid */}
        {paginatedGames.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {paginatedGames.map(game => (
              <Card
                key={game.id}
                hoverable
                className="bg-dark-800 border-dark-700 overflow-hidden group"
                onClick={() => navigate(`/${lang || 'cn'}/library/play/${game.id}`)}
              >
                {/* Icon Area */}
                <div className={`h-40 bg-gradient-to-br ${game.color} flex items-center justify-center -mx-6 -mt-6 mb-4 relative overflow-hidden`}>
                  <span className="text-6xl transition-transform duration-300 group-hover:scale-110">{game.icon}</span>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <PlayCircleOutlined className="text-4xl text-white opacity-0 group-hover:opacity-80 transition-opacity" />
                  </div>
                </div>

                <div className="mb-2">
                  <Tag color="default" className="bg-dark-700 text-gray-300 border-0">{game.category}</Tag>
                </div>

                <Title level={3} className="!text-white !text-base !mb-1">{game.name}</Title>
                <Paragraph className="!text-gray-400 !text-sm !mb-3 line-clamp-2">{game.description}</Paragraph>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-gray-500 text-xs">
                    <UserOutlined />
                    <span>{game.players.toLocaleString()}</span>
                  </div>
                  <Rate disabled value={game.rating / 2} allowHalf className="text-xs" />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4 opacity-30">🎮</div>
            <Title level={3} className="!text-gray-400">没有找到匹配的游戏</Title>
            <Paragraph className="!text-gray-500">试试其他关键词或分类</Paragraph>
          </div>
        )}

        {/* Pagination */}
        {filteredGames.length > pageSize && (
          <div className="flex justify-center mt-8">
            <Pagination
              current={currentPage}
              total={filteredGames.length}
              pageSize={pageSize}
              onChange={setCurrentPage}
              className="[&_.ant-pagination-item]:!bg-dark-700 [&_.ant-pagination-item]:!border-dark-600 [&_.ant-pagination-item-active]:!border-indigo-500 [&_.ant-pagination-item-active]:!bg-indigo-600"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default OnlineGamesPage;
