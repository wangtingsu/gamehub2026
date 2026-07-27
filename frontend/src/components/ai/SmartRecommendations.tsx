/**
 * SmartRecommendations - AI 游戏智能推荐组件
 *
 * 基于关键词匹配的智能游戏推荐：
 * - 输入游戏类型或关键词（如"动作RPG"、"开放世界"）
 * - 按流派关键词匹配评分排序
 * - 推荐结果展示封面、评分、价格、平台信息
 * - 热门标签快速筛选
 */
import { useState, useMemo } from 'react';
import { Input, Card, Row, Col, Tag, Rate, Typography, Empty, Spin, Button } from 'antd';
import { ThunderboltOutlined, ReloadOutlined } from '@ant-design/icons';
import type { Game } from '../../api/types';

const { Text, Paragraph } = Typography;

/** 模拟推荐游戏数据列表 */
const mockGames: Game[] = [
  { id: '1', title: '黑神话：悟空', description: '一款以中国神话为背景的动作角色扮演游戏。玩家将扮演一位"天命人"，探寻昔日传奇英雄的真相。', releaseDate: '2024-08-20', developer: '游戏科学', publisher: '游戏科学', genres: ['动作', '角色扮演', '神话'], platforms: ['PC', 'PS5'], rating: 9.5, price: 268, imageUrl: 'https://picsum.photos/seed/wukong/400/300', screenshots: [] },
  { id: '2', title: '艾尔登法环', description: '广阔的世界充满未知与危险，探索黑暗奇幻的开放世界，挑战强大的敌人。', releaseDate: '2022-02-25', developer: 'FromSoftware', publisher: 'Bandai Namco', genres: ['动作', '角色扮演', '开放世界'], platforms: ['PC', 'PS5', 'Xbox'], rating: 9.8, price: 298, imageUrl: 'https://picsum.photos/seed/elden/400/300', screenshots: [] },
  { id: '3', title: '赛博朋克2077', description: '在夜之城的开放世界中，扮演一名雇佣兵，在这个被科技与黑暗笼罩的未来都市中寻找自己的道路。', releaseDate: '2020-12-10', developer: 'CD Projekt Red', publisher: 'CD Projekt', genres: ['动作', '角色扮演', '科幻', '开放世界'], platforms: ['PC', 'PS5', 'Xbox'], rating: 8.6, price: 299, imageUrl: 'https://picsum.photos/seed/cyber/400/300', screenshots: [] },
  { id: '4', title: '原神', description: '在提瓦特大陆上探索七种元素交织的开放世界，发掘未知的奥秘。', releaseDate: '2020-09-28', developer: '米哈游', publisher: '米哈游', genres: ['动作', '角色扮演', '开放世界', '奇幻'], platforms: ['PC', 'PS5', 'Mobile'], rating: 8.7, price: 0, imageUrl: 'https://picsum.photos/seed/genshin/400/300', screenshots: [] },
  { id: '5', title: '博德之门3', description: '基于龙与地下城规则的史诗级角色扮演游戏，你的选择将改变一切。', releaseDate: '2023-08-03', developer: 'Larian Studios', publisher: 'Larian Studios', genres: ['角色扮演', '策略', '奇幻'], platforms: ['PC', 'PS5'], rating: 9.6, price: 298, imageUrl: 'https://picsum.photos/seed/bg3/400/300', screenshots: [] },
  { id: '6', title: '最终幻想7 重生', description: '克劳德与伙伴们穿越星球，展开一场关于命运与希望的冒险之旅。', releaseDate: '2024-02-29', developer: 'Square Enix', publisher: 'Square Enix', genres: ['动作', '角色扮演', '奇幻'], platforms: ['PS5'], rating: 9.2, price: 468, imageUrl: 'https://picsum.photos/seed/ff7/400/300', screenshots: [] },
  { id: '7', title: '幻兽帕鲁', description: '在广阔的世界中收集和培育名为"帕鲁"的神奇生物，建设你的基地。', releaseDate: '2024-01-19', developer: 'Pocketpair', publisher: 'Pocketpair', genres: ['动作', '冒险', '收集', '建造'], platforms: ['PC', 'Xbox'], rating: 8.5, price: 108, imageUrl: 'https://picsum.photos/seed/palworld/400/300', screenshots: [] },
  { id: '8', title: '战神：诸神黄昏', description: '奎托斯和阿特柔斯面对诸神黄昏的降临，展开一段震撼人心的北欧神话之旅。', releaseDate: '2022-11-09', developer: 'Santa Monica Studio', publisher: 'Sony', genres: ['动作', '冒险', '神话'], platforms: ['PS5', 'PS4'], rating: 9.4, price: 398, imageUrl: 'https://picsum.photos/seed/gow/400/300', screenshots: [] },
  { id: '9', title: '星露谷物语', description: '继承爷爷的农场，在鹈鹕镇开始新的田园生活。耕种、采矿、钓鱼、交友，一切尽在你掌握。', releaseDate: '2016-02-27', developer: 'ConcernedApe', publisher: 'ConcernedApe', genres: ['模拟', '休闲', '独立'], platforms: ['PC', 'Switch', 'Mobile'], rating: 9.3, price: 48, imageUrl: 'https://picsum.photos/seed/stardew/400/300', screenshots: [] },
  { id: '10', title: '空洞骑士', description: '探索衰亡的昆虫王国，揭开古老的秘密。精美的手绘风格，极具挑战性的动作冒险。', releaseDate: '2017-02-24', developer: 'Team Cherry', publisher: 'Team Cherry', genres: ['动作', '冒险', '独立', '类银河城'], platforms: ['PC', 'Switch', 'PS4'], rating: 9.4, price: 68, imageUrl: 'https://picsum.photos/seed/hollow/400/300', screenshots: [] },
];

/** 关键词 -> 游戏流派映射规则 */
const keywords: Record<string, string[]> = {
  '动作': ['动作', 'act', '战', '打斗', '格斗'],
  '角色扮演': ['角色扮演', 'rpg', '扮演', '角色', '养成'],
  '开放世界': ['开放世界', '自由', '沙盒', 'open world', 'sandbox'],
  '奇幻': ['奇幻', '魔法', 'fantasy'],
  '科幻': ['科幻', '赛博朋克', '未来', 'sci-fi', 'cyber'],
  '神话': ['神话', '神', '中国风'],
  '冒险': ['冒险', '探索', 'adventure'],
  '策略': ['策略', '战略', 'strategy'],
  '休闲': ['休闲', '轻松', '休闲娱乐', '放松'],
  '独立': ['独立', 'indie', '独立游戏'],
};

/**
 * 根据查询关键词获取推荐游戏列表
 * 先按流派关键词匹配进行评分排序，若未匹配到任何流派则按文本模糊匹配
 * @param query - 用户输入的关键词
 * @returns 排序后的推荐游戏列表（最多 4 个）
 */
const getRecommendations = (query: string): Game[] => {
  if (!query.trim()) return mockGames.slice(0, 4);
  const q = query.toLowerCase();
  const matchedGenres = Object.entries(keywords)
    .filter(([, words]) => words.some(w => q.includes(w)))
    .map(([genre]) => genre);
  if (matchedGenres.length === 0) {
    return mockGames.filter(g =>
      g.title.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q) ||
      g.genres.some(gg => gg.toLowerCase().includes(q))
    ).slice(0, 4);
  }
  const scored = mockGames.map(g => {
    let score = 0;
    matchedGenres.forEach(genre => {
      if (g.genres.some(gg => gg.toLowerCase().includes(genre.toLowerCase()))) score++;
    });
    return { game: g, score };
  });
  return scored.sort((a, b) => b.score - a.score).filter(s => s.score > 0).slice(0, 4).map(s => s.game);
};

/**
 * SmartRecommendations 主组件
 * 提供关键词搜索、热门标签筛选和推荐结果展示
 */
const SmartRecommendations: React.FC = () => {
  const [query, setQuery] = useState('');          // 搜索关键词
  const [searching, setSearching] = useState(false); // 是否正在搜索

  /** 根据当前查询关键词计算推荐结果 */
  const recommendations = useMemo(() => getRecommendations(query), [query]);

  /**
   * 执行搜索
   * @param value - 搜索关键词
   */
  const handleSearch = (value: string) => {
    setSearching(true);
    setQuery(value);
    setTimeout(() => setSearching(false), 300);
  };

  return (
    <div className="p-2">
      <div className="flex items-center gap-2 mb-4">
        <ThunderboltOutlined className="text-blue-500 text-lg" />
        <span className="font-medium text-gray-700">AI 游戏推荐</span>
        <Tag color="blue" className="ml-auto">智能分析偏好</Tag>
      </div>

      <Input.Search
        placeholder="输入你喜欢的游戏类型或关键词，如：动作RPG、开放世界..."
        size="middle"
        onSearch={handleSearch}
        enterButton="AI 推荐"
        className="mb-4"
      />

      <div className="flex flex-wrap gap-1.5 mb-4">
        {['动作RPG', '开放世界', '独立游戏', '休闲', '科幻', '神话'].map(tag => (
          <Tag
            key={tag}
            color="geekblue"
            className="cursor-pointer hover:opacity-80"
            onClick={() => handleSearch(tag)}
          >
            {tag}
          </Tag>
        ))}
      </div>

      {searching ? (
        <div className="flex justify-center py-8">
          <Spin tip="AI 正在分析您的偏好..." />
        </div>
      ) : recommendations.length > 0 ? (
        <>
          <Row gutter={[12, 12]}>
            {recommendations.map((game, index) => (
              <Col xs={24} sm={12} key={game.id}>
                <Card
                  size="small"
                  className="h-full hover:shadow-md transition-shadow cursor-pointer"
                  cover={
                    <div className="h-28 overflow-hidden relative">
                      <img src={game.imageUrl} alt={game.title} className="w-full h-full object-cover" loading="lazy" />
                      <div className="absolute top-1 right-1">
                        <Tag color="blue" className="text-xs">推荐 #{index + 1}</Tag>
                      </div>
                    </div>
                  }
                >
                  <div className="space-y-1">
                    <Text strong className="text-sm">{game.title}</Text>
                    <div className="flex items-center gap-1">
                      <Rate disabled value={Math.round(game.rating / 2)} size="small" />
                      <span className="text-xs text-gray-500">{Number(game.rating).toFixed(1)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {game.genres.slice(0, 3).map(genre => (
                        <Tag key={genre} color="blue" className="text-xs">{genre}</Tag>
                      ))}
                    </div>
                    <Paragraph className="text-xs text-gray-500 mb-0" ellipsis={{ rows: 2 }}>
                      {game.description}
                    </Paragraph>
                    <div className="flex items-center justify-between">
                      <Text className="text-xs text-green-600 font-semibold">
                        {game.price === 0 ? '免费' : `¥${game.price}`}
                      </Text>
                      <Text className="text-xs text-gray-400">{game.platforms.join(' / ')}</Text>
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
          {query.trim() && (
            <div className="text-center mt-3">
              <Button
                type="link"
                icon={<ReloadOutlined />}
                size="small"
                onClick={() => { setQuery(''); setSearching(false); }}
              >
                清除筛选，浏览全部推荐
              </Button>
            </div>
          )}
        </>
      ) : (
        <Empty description="未找到匹配的游戏推荐" image={Empty.PRESENTED_IMAGE_SIMPLE} className="py-8" />
      )}

      {!query.trim() && (
        <div className="text-xs text-gray-400 mt-2 text-center">
          输入关键词获取 AI 个性化推荐，例如：动作RPG、开放世界、独立游戏
        </div>
      )}
    </div>
  );
};

export default SmartRecommendations;
