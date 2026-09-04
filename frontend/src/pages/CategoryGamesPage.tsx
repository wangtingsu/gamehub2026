import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Row, Col, Input, Select, Slider, Button, Rate, Tag, Spin, Empty, Alert, Typography } from 'antd';
import { SearchOutlined, FilterOutlined, DollarOutlined, RocketOutlined, ThunderboltOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useGames } from '../api/hooks';
import { useDebounce } from '../hooks/useDebounce';
import SEO from '../components/SEO';
import SEOBreadcrumb from '../components/SEOBreadcrumb';
import type { Game } from '../api/types';
import 'react-lazy-load-image-component/src/effects/blur.css';

const { Title } = Typography;
const { Search } = Input;
const { Option } = Select;

const CATEGORY_CONFIG: Record<string, { title: string; icon: React.ReactNode; description: string; seoTitle: string; seoDesc: string; seoKeywords: string }> = {
  recommended: {
    title: '推荐游戏',
    icon: <ThunderboltOutlined className="text-yellow-500" />,
    description: '为您精选的优质游戏推荐',
    seoTitle: '推荐游戏 | GGHubs',
    seoDesc: '浏览GGHubs为您推荐的热门游戏',
    seoKeywords: '推荐游戏, 热门游戏, 游戏推荐, GGHubs推荐',
  },
  'top-up': {
    title: '直充游戏',
    icon: <DollarOutlined className="text-green-500" />,
    description: '支持直接购买的数字版游戏',
    seoTitle: '直充游戏 | GGHubs',
    seoDesc: '浏览GGHubs支持直充的数字版游戏',
    seoKeywords: '直充游戏, 数字版游戏, 游戏购买, 游戏商城',
  },
  indie: {
    title: '独立游戏',
    icon: <RocketOutlined className="text-purple-500" />,
    description: '发现独具匠心的独立游戏佳作',
    seoTitle: '独立游戏 | GGHubs',
    seoDesc: '浏览GGHubs精选的独立游戏',
    seoKeywords: '独立游戏, 小众游戏, 独立佳作, GGHubs独立游戏',
  },
};

const fallbackTopUpGames: Game[] = [
  { id: 'fb-tu-1', title: '赛博朋克2077', description: '开放世界科幻角色扮演游戏', releaseDate: '2020-12-10', developer: 'CD Projekt Red', publisher: 'CD Projekt', genres: ['角色扮演', '科幻'], platforms: ['PC', 'PS5', 'Xbox Series X'], rating: 4.5, price: 298, discount: 20, imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop', screenshots: [] },
  { id: 'fb-tu-2', title: '艾尔登法环', description: '黑暗奇幻动作角色扮演游戏', releaseDate: '2022-02-25', developer: 'FromSoftware', publisher: 'Bandai Namco', genres: ['动作', '角色扮演'], platforms: ['PC', 'PS5', 'Xbox Series X'], rating: 4.8, price: 398, discount: 0, imageUrl: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=400&auto=format&fit=crop', screenshots: [] },
  { id: 'fb-tu-3', title: '巫师3：狂猎', description: '奇幻开放世界角色扮演游戏', releaseDate: '2015-05-19', developer: 'CD Projekt Red', publisher: 'CD Projekt', genres: ['角色扮演', '奇幻'], platforms: ['PC', 'PS5', 'Xbox Series X'], rating: 4.9, price: 149, discount: 30, imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&auto=format&fit=crop', screenshots: [] },
  { id: 'fb-tu-4', title: '博德之门3', description: '经典策略角色扮演游戏续作', releaseDate: '2023-08-03', developer: 'Larian Studios', publisher: 'Larian Studios', genres: ['策略', '角色扮演'], platforms: ['PC', 'PS5'], rating: 4.9, price: 349, discount: 10, imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&auto=format&fit=crop', screenshots: [] },
  { id: 'fb-tu-5', title: '黑暗之魂3', description: '硬核动作角色扮演游戏', releaseDate: '2016-04-12', developer: 'FromSoftware', publisher: 'Bandai Namco', genres: ['动作', '角色扮演'], platforms: ['PC', 'PS4', 'Xbox One'], rating: 4.7, price: 268, discount: 0, imageUrl: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=400&auto=format&fit=crop', screenshots: [] },
  { id: 'fb-tu-6', title: '只狼：影逝二度', description: '日本战国背景动作冒险游戏', releaseDate: '2019-03-22', developer: 'FromSoftware', publisher: 'Activision', genres: ['动作', '冒险'], platforms: ['PC', 'PS5', 'Xbox Series X'], rating: 4.6, price: 298, discount: 0, imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&auto=format&fit=crop', screenshots: [] },
  { id: 'fb-tu-7', title: '战神', description: '北欧神话动作冒险游戏', releaseDate: '2022-01-14', developer: 'Santa Monica Studio', publisher: 'Sony Interactive Entertainment', genres: ['动作', '冒险'], platforms: ['PC', 'PS5'], rating: 4.8, price: 398, discount: 15, imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop', screenshots: [] },
  { id: 'fb-tu-8', title: '荒野大镖客2', description: '西部开放世界动作冒险游戏', releaseDate: '2019-12-06', developer: 'Rockstar Games', publisher: 'Rockstar Games', genres: ['动作', '冒险', '西部'], platforms: ['PC', 'PS5', 'Xbox Series X'], rating: 4.8, price: 249, discount: 25, imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&auto=format&fit=crop', screenshots: [] },
  { id: 'fb-tu-9', title: '最后生还者', description: '末世生存动作冒险游戏', releaseDate: '2023-03-28', developer: 'Naughty Dog', publisher: 'Sony Interactive Entertainment', genres: ['动作', '冒险'], platforms: ['PC', 'PS5'], rating: 4.7, price: 379, discount: 10, imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop', screenshots: [] },
  { id: 'fb-tu-10', title: '霍格沃茨之遗', description: '开放世界魔法动作角色扮演游戏', releaseDate: '2023-02-10', developer: 'Avalanche Software', publisher: 'Warner Bros.', genres: ['动作', '角色扮演'], platforms: ['PC', 'PS5', 'Xbox Series X'], rating: 4.6, price: 298, discount: 0, imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&auto=format&fit=crop', screenshots: [] },
];

const fallbackIndieGames: Game[] = [
  { id: 'fb-in-1', title: '空洞骑士', description: '精美的类银河战士恶魔城动作游戏', releaseDate: '2017-02-24', developer: 'Team Cherry', publisher: 'Team Cherry', genres: ['动作', '独立', '冒险'], platforms: ['PC', 'Nintendo Switch'], rating: 4.7, price: 68, discount: 0, imageUrl: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=400&auto=format&fit=crop', screenshots: [] },
  { id: 'fb-in-2', title: '星露谷物语', description: '宁静的农场经营模拟游戏', releaseDate: '2016-02-27', developer: 'ConcernedApe', publisher: 'ConcernedApe', genres: ['模拟', '独立'], platforms: ['PC', 'Nintendo Switch', 'PS4'], rating: 4.8, price: 48, discount: 0, imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop', screenshots: [] },
  { id: 'fb-in-3', title: '死亡细胞', description: 'Roguelite动作平台游戏', releaseDate: '2018-08-07', developer: 'Motion Twin', publisher: 'Motion Twin', genres: ['动作', '独立'], platforms: ['PC', 'Nintendo Switch', 'PS4'], rating: 4.6, price: 80, discount: 20, imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&auto=format&fit=crop', screenshots: [] },
  { id: 'fb-in-4', title: '哈迪斯', description: '高自由度动作Roguelike游戏', releaseDate: '2020-09-17', developer: 'Supergiant Games', publisher: 'Supergiant Games', genres: ['动作', '独立', '角色扮演'], platforms: ['PC', 'Nintendo Switch', 'PS5'], rating: 4.9, price: 88, discount: 0, imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&auto=format&fit=crop', screenshots: [] },
  { id: 'fb-in-5', title: '蔚蓝', description: '像素风硬核平台跳跃游戏', releaseDate: '2018-01-25', developer: 'Maddy Makes Games', publisher: 'Maddy Makes Games', genres: ['动作', '独立'], platforms: ['PC', 'Nintendo Switch', 'PS4'], rating: 4.7, price: 68, discount: 0, imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop', screenshots: [] },
  { id: 'fb-in-6', title: '泰拉瑞亚', description: '沙盒冒险生存游戏', releaseDate: '2011-05-16', developer: 'Re-Logic', publisher: 'Re-Logic', genres: ['冒险', '独立', '沙盒'], platforms: ['PC', 'Nintendo Switch', 'PS4'], rating: 4.8, price: 36, discount: 0, imageUrl: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=400&auto=format&fit=crop', screenshots: [] },
  { id: 'fb-in-7', title: '传说之下', description: '独特的角色扮演游戏体验', releaseDate: '2015-09-15', developer: 'tobyfox', publisher: 'tobyfox', genres: ['角色扮演', '独立'], platforms: ['PC', 'Nintendo Switch', 'PS4'], rating: 4.9, price: 48, discount: 0, imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&auto=format&fit=crop', screenshots: [] },
  { id: 'fb-in-8', title: '茶杯头', description: '1930年代卡通风格动作游戏', releaseDate: '2017-09-29', developer: 'Studio MDHR', publisher: 'Studio MDHR', genres: ['动作', '独立'], platforms: ['PC', 'Nintendo Switch', 'PS4'], rating: 4.6, price: 78, discount: 0, imageUrl: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=400&auto=format&fit=crop', screenshots: [] },
  { id: 'fb-in-9', title: '吸血鬼幸存者', description: '时间生存Roguelite游戏', releaseDate: '2022-10-20', developer: 'poncle', publisher: 'poncle', genres: ['动作', '独立'], platforms: ['PC', 'Nintendo Switch', 'PS5'], rating: 4.8, price: 28, discount: 0, imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop', screenshots: [] },
  { id: 'fb-in-10', title: '潜水员戴夫', description: '海洋冒险与寿司店经营', releaseDate: '2023-06-28', developer: 'MINTROCKET', publisher: 'MINTROCKET', genres: ['冒险', '独立', '模拟'], platforms: ['PC', 'Nintendo Switch'], rating: 4.7, price: 88, discount: 0, imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&auto=format&fit=crop', screenshots: [] },
];

// 筛选选项
const genreOptions = ['全部', 'RPG', '动作', '冒险', '策略', '科幻', '奇幻', '魂类', '魔法'];
const platformOptions = ['全部', 'PC', 'PS4', 'PS5', 'Xbox One', 'Xbox Series X', 'Nintendo Switch'];

const CategoryGamesPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('games');
  const { lang, category } = useParams<{ lang: string; category: string }>();
  const { data: games = [], isLoading, isError } = useGames();
  const [searchText, setSearchText] = useState('');
  const debouncedSearchText = useDebounce(searchText, 300);
  const [selectedGenre, setSelectedGenre] = useState('全部');
  const [selectedPlatform, setSelectedPlatform] = useState('全部');
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [ratingFilter, setRatingFilter] = useState(0);

  const config = CATEGORY_CONFIG[category || ''] || CATEGORY_CONFIG.recommended;

  // 根据分类获取游戏列表
  const displayGames = useMemo(() => {
    if (category === 'top-up') {
      if (!isError && games.length > 0) {
        const zoneGames = games.filter((game: Game) => game.displayZone === 'top-up');
        if (zoneGames.length > 0) return zoneGames.sort((a: Game, b: Game) => b.rating - a.rating);
        return games
          .filter((game: Game) => game.price > 0)
          .sort((a: Game, b: Game) => b.rating - a.rating);
      }
      return fallbackTopUpGames;
    }
    if (category === 'indie') {
      if (!isError && games.length > 0) {
        const zoneGames = games.filter((game: Game) => game.displayZone === 'indie');
        if (zoneGames.length > 0) return zoneGames.sort((a: Game, b: Game) => b.rating - a.rating);
        const indie = games.filter((game: Game) =>
          game.genres.some(g => g.toLowerCase().includes('indie'))
        );
        if (indie.length > 0) return indie;
        return [...games].sort((a: Game, b: Game) => b.rating - a.rating);
      }
      return fallbackIndieGames;
    }
    // recommended: 优先使用 displayZone 字段
    if (!isError && games.length > 0) {
      const zoneGames = games.filter((game: Game) => game.displayZone === 'recommended');
      if (zoneGames.length > 0) return zoneGames.sort((a: Game, b: Game) => b.rating - a.rating);
      return [...games].sort((a: Game, b: Game) => b.rating - a.rating);
    }
    return [];
  }, [games, isError, category]);

  // 应用筛选
  const filteredGames = useMemo(() => {
    let result = [...displayGames];

    if (debouncedSearchText) {
      result = result.filter(game =>
        game.title.toLowerCase().includes(debouncedSearchText.toLowerCase()) ||
        game.description.toLowerCase().includes(debouncedSearchText.toLowerCase())
      );
    }

    if (selectedGenre !== '全部') {
      result = result.filter(game => game.genres.includes(selectedGenre));
    }

    if (selectedPlatform !== '全部') {
      result = result.filter(game => game.platforms.includes(selectedPlatform));
    }

    result = result.filter(game => game.price >= priceRange[0] && game.price <= priceRange[1]);

    if (ratingFilter > 0) {
      result = result.filter(game => game.rating >= ratingFilter);
    }

    return result;
  }, [displayGames, debouncedSearchText, selectedGenre, selectedPlatform, priceRange, ratingFilter]);

  const handleResetFilters = () => {
    setSearchText('');
    setSelectedGenre('全部');
    setSelectedPlatform('全部');
    setPriceRange([0, 500]);
    setRatingFilter(0);
  };

  const formatPrice = (price: number) => `¥${price}`;

  const calculateDiscountedPrice = (price: number, discount?: number) => {
    if (!discount) return formatPrice(price);
    const discounted = price * (1 - discount / 100);
    return (
      <div className="flex items-center gap-2">
        <span className="text-red-500 font-bold">{formatPrice(Math.round(discounted))}</span>
        <span className="line-through text-gray-400 text-sm">{formatPrice(price)}</span>
      </div>
    );
  };

  return (
    <div className="bg-dark-900 min-h-screen">
      <SEO
        title={config.seoTitle}
        description={config.seoDesc}
        keywords={config.seoKeywords}
        canonical={`/${lang}/games/category/${category}`}
      />
      <SEOBreadcrumb items={[
        { name: 'Home', url: '/' },
        { name: 'Games', url: `/${lang}/games` },
        { name: config.title, url: `/${lang}/games/category/${category}` },
      ]} />

      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Button
              type="text"
              className="text-white/80 hover:text-white mb-4 !p-0"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(`/${lang}/games`)}
            >
              返回游戏列表
            </Button>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{config.icon}</span>
              <h1 className="text-4xl font-bold text-white">{config.title}</h1>
            </div>
            <p className="text-xl text-white/90 max-w-3xl">{config.description}</p>
          </motion.div>

          {/* 搜索和筛选 */}
          <div className="max-w-4xl mt-8">
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} md={16}>
                <Search
                  placeholder="搜索游戏..."
                  size="large"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onSearch={(value) => setSearchText(value)}
                  enterButton={<Button type="primary" icon={<SearchOutlined />}>搜索</Button>}
                />
              </Col>
              <Col xs={24} md={8}>
                <Select
                  size="large"
                  style={{ width: '100%' }}
                  value={selectedGenre}
                  onChange={setSelectedGenre}
                  placeholder="选择类型"
                >
                  {genreOptions.map(genre => (
                    <Option key={genre} value={genre}>{genre}</Option>
                  ))}
                </Select>
              </Col>
            </Row>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="py-2">
        {/* 筛选工具栏 */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-dark-800 border border-dark-700 p-6 rounded-xl shadow-sm mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Search
                placeholder="搜索游戏..."
                allowClear
                enterButton={<SearchOutlined />}
                size="large"
                onSearch={(value) => setSearchText(value)}
                onChange={(e) => setSearchText(e.target.value)}
                value={searchText}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Select
                value={selectedGenre}
                onChange={setSelectedGenre}
                size="large"
                style={{ width: 120 }}
                placeholder="选择类型"
              >
                {genreOptions.map(genre => (
                  <Option key={genre} value={genre}>{genre}</Option>
                ))}
              </Select>

              <Select
                value={selectedPlatform}
                onChange={setSelectedPlatform}
                size="large"
                style={{ width: 140 }}
                placeholder="选择平台"
              >
                {platformOptions.map(platform => (
                  <Option key={platform} value={platform}>{platform}</Option>
                ))}
              </Select>

              <Button
                type="default"
                icon={<FilterOutlined />}
                size="large"
                onClick={handleResetFilters}
              >
                重置筛选
              </Button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-300 font-medium">价格区间</span>
                <span className="text-gray-900 font-semibold">
                  ¥{priceRange[0]} - ¥{priceRange[1]}
                </span>
              </div>
              <Slider
                range
                min={0}
                max={500}
                step={10}
                value={priceRange}
                onChange={setPriceRange}
                tooltip={{ formatter: (value) => `¥${value}` }}
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-300 font-medium">最低评分</span>
                <span className="text-gray-900 font-semibold">
                  {ratingFilter > 0 ? `${ratingFilter}+ 星` : '不限'}
                </span>
              </div>
              <Rate
                allowHalf
                value={ratingFilter}
                onChange={setRatingFilter}
                className="text-2xl"
              />
            </div>
          </div>
        </motion.div>

        {/* 游戏列表 */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Spin size="large" />
          </div>
        ) : filteredGames.length === 0 ? (
          <Empty description="没有找到匹配的游戏">
            <Button type="primary" onClick={handleResetFilters}>重置筛选</Button>
          </Empty>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredGames.map((game, index) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={{ y: -5 }}
                >
                  <Card
                    hoverable
                    className="game-card h-full bg-dark-800 border-dark-700"
                    cover={
                      <div className="relative h-40 overflow-hidden">
                        <img
                          alt={game.title}
                          src={game.imageUrl}
                          className="w-full h-full object-cover"
                        />
                        {game.discount && game.discount > 0 && (
                          <div className="absolute top-3 right-3">
                            <Tag color="green" className="font-bold">-{game.discount}%</Tag>
                          </div>
                        )}
                      </div>
                    }
                    onClick={() => navigate(`/${lang}/games/${game.slug || game.id}`)}
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex-1">
                        <h2 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">{game.title}</h2>
                        <div className="flex items-center mb-3">
                          <Rate disabled allowHalf value={game.rating} className="text-sm mr-2" />
                          <span className="text-gray-400 text-sm">{Number(game.rating).toFixed(1)}</span>
                        </div>
                        <p className="text-gray-400 text-sm mb-4 line-clamp-2">{game.description}</p>
                        <div className="mb-4">
                          <div className="flex flex-wrap gap-1 mb-2">
                            {game.genres.slice(0, 2).map(genre => (
                              <Tag key={genre} color="blue" className="text-xs">{t(`genreNames.${genre}`, { defaultValue: genre })}</Tag>
                            ))}
                            {game.genres.length > 2 && (
                              <Tag className="text-xs">+{game.genres.length - 2}</Tag>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-auto pt-4 border-t border-dark-700">
                        <div className="flex justify-between items-center">
                          <div className="text-lg font-bold">{calculateDiscountedPrice(game.price, game.discount)}</div>
                          <Button type="primary" size="middle" onClick={() => navigate(`/${lang}/games/${game.slug || game.id}`)}>
                            查看详情
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 统计信息 */}
        {!isLoading && filteredGames.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 text-center text-gray-400"
          >
            显示 {filteredGames.length} 款游戏 (共 {displayGames.length} 款)
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CategoryGamesPage;
