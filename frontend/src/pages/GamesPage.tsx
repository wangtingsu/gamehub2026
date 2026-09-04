import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Card, Row, Col, Input, Select, Slider, Button, Rate, Tag, Spin, Empty, Alert, Typography } from 'antd';
import { SearchOutlined, FilterOutlined, DollarOutlined, RocketOutlined, RightOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import LazyLoadImageComponent from 'react-lazy-load-image-component';
const { LazyLoadImage } = LazyLoadImageComponent as any;
import { useGames, usePersonalizedRecommendations } from '../api/hooks';
import { useDebounce } from '../hooks/useDebounce';
import SEO from '../components/SEO';
import RecommendedGames from '../components/recommendations/RecommendedGames';
import type { Game } from '../api/types';
import './GamesPage.css';
import 'react-lazy-load-image-component/src/effects/blur.css';

const { Title } = Typography;

// 备用推荐数据（API 不可用时展示，使用真实游戏 slug 以支持点击跳转）
const fallbackRecommendations = [
  { id: 'elden-ring', type: 'game' as const, title: 'Elden Ring', rating: 4.8, reason: 'Trending', score: 95, likes: 1500 },
  { id: 'cyberpunk-2077', type: 'game' as const, title: 'Cyberpunk 2077', rating: 4.5, reason: 'Player Favorite', score: 88, likes: 980 },
  { id: 'baldurs-gate-3', type: 'game' as const, title: "Baldur's Gate 3", rating: 4.9, reason: 'Classic Must-Play', score: 92, likes: 1300 },
  { id: 'stardew-valley', type: 'game' as const, title: 'Stardew Valley', rating: 4.9, reason: 'Overwhelmingly Positive', score: 96, likes: 2000 },
  { id: 'hollow-knight', type: 'game' as const, title: 'Hollow Knight', rating: 4.7, reason: 'Souls Classic', score: 85, likes: 1100 },
];

const fallbackTopUpGames: Game[] = [
  { id: 'elden-ring', title: 'Elden Ring', description: '', releaseDate: '', developer: '', publisher: '', genres: ['Action RPG', 'Open World'], platforms: ['PC', 'PlayStation'], rating: 4.8, price: 398, discount: 10, imageUrl: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=400&auto=format&fit=crop', screenshots: [] },
  { id: 'cyberpunk-2077', title: 'Cyberpunk 2077', description: '', releaseDate: '', developer: '', publisher: '', genres: ['Action RPG', 'Open World'], platforms: ['PC', 'PlayStation'], rating: 4.5, price: 298, discount: 30, imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop', screenshots: [] },
  { id: 'baldurs-gate-3', title: "Baldur's Gate 3", description: '', releaseDate: '', developer: '', publisher: '', genres: ['RPG', 'Strategy'], platforms: ['PC'], rating: 4.9, price: 349, discount: 10, imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&auto=format&fit=crop', screenshots: [] },
  { id: 'stardew-valley', title: 'Stardew Valley', description: '', releaseDate: '', developer: '', publisher: '', genres: ['Simulation', 'Casual'], platforms: ['PC', 'Nintendo Switch'], rating: 4.8, price: 48, discount: 0, imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop', screenshots: [] },
  { id: 'hollow-knight', title: 'Hollow Knight', description: '', releaseDate: '', developer: '', publisher: '', genres: ['Action', 'Adventure'], platforms: ['PC', 'Nintendo Switch'], rating: 4.7, price: 68, discount: 0, imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&auto=format&fit=crop', screenshots: [] },
];

const fallbackIndieGames: Game[] = [
  { id: 'hollow-knight', title: 'Hollow Knight', description: '', releaseDate: '', developer: '', publisher: '', genres: ['Action', 'Indie', 'Adventure'], platforms: ['PC', 'Nintendo Switch'], rating: 4.7, price: 68, discount: 0, imageUrl: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=400&auto=format&fit=crop', screenshots: [] },
  { id: 'stardew-valley', title: 'Stardew Valley', description: '', releaseDate: '', developer: '', publisher: '', genres: ['Simulation', 'Indie'], platforms: ['PC', 'Nintendo Switch'], rating: 4.8, price: 48, discount: 0, imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop', screenshots: [] },
];

const { Search } = Input;
const { Option } = Select;


// Filter options
const genreOptions = ['All', 'RPG', 'Action', 'Adventure', 'Strategy', 'Simulation', 'FPS', 'Sci-Fi', 'Fantasy', 'Indie'];
const platformOptions = ['All', 'PC', 'PS4', 'PS5', 'Xbox One', 'Xbox Series X', 'Nintendo Switch'];

const GamesPage = () => {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang || 'cn';
  const { data: games = [], isLoading, isError, error: queryError } = useGames();
  const { t } = useTranslation('games');
  const [searchText, setSearchText] = useState('');
  const debouncedSearchText = useDebounce(searchText, 300);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedPlatform, setSelectedPlatform] = useState('All');
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [ratingFilter, setRatingFilter] = useState(0);

  // 推荐板块 hooks
  const { data: recommendations, isLoading: recLoading, isError: recError } = usePersonalizedRecommendations(8);
  const displayRecommendations = (!recError && recommendations && recommendations.length > 0)
    ? recommendations
    : fallbackRecommendations;

  // 直充游戏：优先使用 displayZone 字段，没有则按价格筛选（向后兼容）
  const topUpGames = useMemo(() => {
    if (!isError && games.length > 0) {
      const zoneGames = games.filter((game: Game) => game.displayZone === 'top-up');
      if (zoneGames.length > 0) {
        return zoneGames.sort((a: Game, b: Game) => b.rating - a.rating).slice(0, 10);
      }
      return games
        .filter((game: Game) => game.price > 0)
        .sort((a: Game, b: Game) => b.rating - a.rating)
        .slice(0, 10);
    }
    return fallbackTopUpGames;
  }, [games, isError]);

  // 独立游戏：优先使用 displayZone 字段，没有则按类型筛选（向后兼容）
  const indieGames = useMemo(() => {
    if (!isError && games.length > 0) {
      const zoneGames = games.filter((game: Game) => game.displayZone === 'indie');
      if (zoneGames.length > 0) return zoneGames.sort((a: Game, b: Game) => b.rating - a.rating).slice(0, 10);
      const indie = games.filter((game: Game) =>
        game.genres.some(g => g.toLowerCase().includes('indie'))
      );
      if (indie.length > 0) return indie.slice(0, 10);
      return [...games].sort((a: Game, b: Game) => b.rating - a.rating).slice(0, 8);
    }
    return fallbackIndieGames;
  }, [games, isError]);

  // 虚拟化相关
  const containerRef = useRef<HTMLDivElement>(null);
  const firstCardRef = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(4);
  const [rowHeight, setRowHeight] = useState(480); // 每行预估高度（将根据实际卡片高度调整）
  const [firstCardEl, setFirstCardEl] = useState<HTMLDivElement | null>(null);
  const columnCountRef = useRef(columnCount); // 用于防抖函数中获取当前列数

  // 同步columnCount到ref
  useEffect(() => {
    columnCountRef.current = columnCount;
  }, [columnCount]);

  // 缓存和防抖
  const heightCacheRef = useRef<Map<number, number>>(new Map()); // 列数 -> 卡片高度缓存
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 清理防抖定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // 响应式列数计算 - 使用 ResizeObserver 监听容器宽度变化
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateColumnCount = (width: number) => {
      if (width < 640) {
        setColumnCount(1);
      } else if (width < 768) {
        setColumnCount(2);
      } else if (width < 1024) {
        setColumnCount(3);
      } else {
        setColumnCount(4);
      }
    };

    // 初始计算基于容器宽度
    updateColumnCount(container.clientWidth);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        updateColumnCount(width);
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // 防抖更新行高函数
  const setRowHeightDebounced = useCallback((newHeight: number) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setRowHeight(newHeight);
      // 更新缓存，使用当前列数
      heightCacheRef.current.set(columnCountRef.current, newHeight);
    }, 100); // 100ms防抖延迟
  }, []);

  // 列数变化时，尝试从缓存恢复行高
  useEffect(() => {
    const cachedHeight = heightCacheRef.current.get(columnCount);
    if (cachedHeight && cachedHeight !== rowHeight) {
      setRowHeight(cachedHeight);
    }
  }, [columnCount, rowHeight]);

  // 动态调整行高 - 使用 ResizeObserver 监听第一个卡片高度变化
  useEffect(() => {
    if (!firstCardEl) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        // 添加一些边距，因为卡片之间可能有间距
        const newRowHeight = height + 24; // 假设行间距为24px
        setRowHeightDebounced(newRowHeight);
      }
    });

    resizeObserver.observe(firstCardEl);

    return () => {
      resizeObserver.disconnect();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [firstCardEl, setRowHeightDebounced]);

  // 应用筛选 - 使用useMemo优化性能
  const filteredGames = useMemo(() => {
    let result = [...games];

    // 搜索筛选（使用防抖）
    if (debouncedSearchText) {
      result = result.filter(game =>
        game.title.toLowerCase().includes(debouncedSearchText.toLowerCase()) ||
        game.description.toLowerCase().includes(debouncedSearchText.toLowerCase())
      );
    }

    // 类型筛选
    if (selectedGenre !== 'All') {
      result = result.filter(game => game.genres.includes(selectedGenre));
    }

    // 平台筛选
    if (selectedPlatform !== 'All') {
      result = result.filter(game => game.platforms.includes(selectedPlatform));
    }

    // 价格筛选
    result = result.filter(game => game.price >= priceRange[0] && game.price <= priceRange[1]);

    // 评分筛选
    if (ratingFilter > 0) {
      result = result.filter(game => game.rating >= ratingFilter);
    }

    return result;
  }, [games, debouncedSearchText, selectedGenre, selectedPlatform, priceRange, ratingFilter]);

  // 计算行数
  const rowCount = Math.ceil(filteredGames.length / columnCount);

  // 优化虚拟化器配置
  const estimateSize = useCallback(() => rowHeight, [rowHeight]);
  const getScrollElement = useCallback(() => containerRef.current, []);

  // 行虚拟化器
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement,
    estimateSize,
    overscan: 5,
  });

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const handleViewGame = (id: string | number, slug?: string) => {
    navigate(`/${currentLang}/games/${slug || id}`);
  };

  const handleResetFilters = () => {
    setSearchText('');
    setSelectedGenre('All');
    setSelectedPlatform('All');
    setPriceRange([0, 500]);
    setRatingFilter(0);
  };

  const formatPrice = (price: number) => {
    return `¥${price}`;
  };

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

  const renderGameCard = (game: Game, index: number) => (
    <motion.div
      key={game.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card
        hoverable
        className="h-full"
        cover={
          <Link to={`/${currentLang}/games/${game.slug || game.id}`} className="block relative h-32 overflow-hidden">
            <LazyLoadImage
              src={game.imageUrl}
              srcSet={`${game.imageUrl}&w=200 200w, ${game.imageUrl}&w=400 400w`}
              sizes="(max-width: 640px) 200px, 400px"
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
          </Link>
        }
      >
        <div className="mb-2">
          <Link to={`/${currentLang}/games/${game.slug || game.id}`} className="text-sm font-semibold truncate mb-1 block hover:text-blue-400">{game.title}</Link>
          <div className="flex items-center gap-1">
            <Rate disabled value={game.rating / 2} allowHalf className="text-xs" />
            <span className="text-xs text-gray-500">{Number(game.rating).toFixed(1)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mb-2">
          {game.genres.slice(0, 2).map(genre => (
            <Tag key={genre} className="text-xs leading-none" color="blue">{t(`genreNames.${genre}`, { defaultValue: genre })}</Tag>
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
    sectionTitle: string,
    icon: React.ReactNode,
    games: Game[],
    loading: boolean,
    categoryPath: string,
  ) => {
    if (loading) {
      return (
        <section className="mb-10">
          <Title level={2} className="!mb-6 !text-white">{sectionTitle}</Title>
          <div className="flex justify-center items-center py-2">
            <Spin size="large" />
          </div>
        </section>
      );
    }
    return (
      <section className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{icon}</span>
            <Title level={2} className="!mb-0 !text-white">{sectionTitle}</Title>
          </div>
          <Button type="link" className="!text-white" onClick={() => navigate(`/${currentLang}/games/category/${categoryPath}`)}>
            View More <RightOutlined />
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-5">
          {games.slice(0, 10).map((game, index) => renderGameCard(game, index))}
        </div>
      </section>
    );
  };

  const renderTopUpSection = () => renderHorizontalSection(t('sections.topUp', 'Top-Up Games'), <DollarOutlined className="text-green-500" />, topUpGames, isLoading, 'top-up');
  const renderIndieSection = () => renderHorizontalSection(t('sections.indie', 'Indie Games'), <RocketOutlined className="text-purple-500" />, indieGames, isLoading, 'indie');

  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://www.gghubs.com';
  const structuredData = [
    {
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': `${siteUrl}` },
        { '@type': 'ListItem', 'position': 2, 'name': 'Games', 'item': `${siteUrl}/games` },
      ],
    },
    {
      '@type': 'CollectionPage',
      'name': 'Game Library - GameHub',
      'description': 'Browse our extensive game library with filters by genre, platform, price, and rating.',
    },
  ];

  return (
    <div className="bg-dark-900 min-h-screen">
      <SEO
        title={t('seo.gamesTitle', 'Games | GameHub')}
        description={t('seo.gamesDescription', 'Browse our extensive game library.')}
        keywords={t('seo.gamesKeywords', 'games, game list, popular games, new games, game library')}
        structuredData={structuredData}
      />

      {/* 主要内容 */}
      <div className="py-2">
        {/* 搜索和筛选 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold !text-gray-100 mb-4">{t('title')}</h1>
          <p className="text-gray-400 max-w-3xl mb-6">{t('subtitle')}</p>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} md={16}>
              <Search
                placeholder="Search games..."
                size="large"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onSearch={handleSearch}
                enterButton={<Button type="primary" icon={<SearchOutlined />}>Search</Button>}
              />
            </Col>
            <Col xs={24} md={8}>
              <Select
                size="large"
                style={{ width: '100%' }}
                value={selectedGenre}
                onChange={setSelectedGenre}
                placeholder="Select genre"
              >
                {genreOptions.map(genre => (
                  <Option key={genre} value={genre}>{genre}</Option>
                ))}
              </Select>
            </Col>
          </Row>
        </div>

      {/* 板块1: 推荐游戏 */}
      <section className="mb-10">
        <RecommendedGames
          title={t('sections.recommended', 'Recommended Games')}
          recommendations={displayRecommendations}
          loading={recLoading && !recError}
          variant="grid"
        />
      </section>

      {/* 板块2: 直充游戏 */}
      {renderTopUpSection()}

      {/* 板块3: 独立游戏 */}
      {renderIndieSection()}

      {/* 错误提示 */}
      {isError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <Alert
            title="Error"
            description={queryError?.message || 'Failed to load game data'}
            type="error"
            showIcon
            closable
          />
        </motion.div>
      )}

      {/* 筛选工具栏 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-dark-800 p-6 rounded-xl shadow-sm mb-8 border border-dark-700"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          {/* 搜索框 */}
          <div className="flex-1">
            <Search
              placeholder={t('searchPlaceholder')}
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              onSearch={handleSearch}
              onChange={(e) => setSearchText(e.target.value)}
              value={searchText}
            />
          </div>

          {/* 筛选按钮组 */}
          <div className="flex flex-wrap gap-3">
            <Select
              value={selectedGenre}
              onChange={setSelectedGenre}
              size="large"
              style={{ width: 120 }}
              placeholder={t('filters.genre')}
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
              placeholder={t('filters.platform')}
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
              {t('filters.reset')}
            </Button>
          </div>
        </div>

        {/* 高级筛选 */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-300 font-medium">{t('filters.priceRange')}</span>
              <span className="text-gray-100 font-semibold">
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
              <span className="text-gray-300 font-medium">{t('filters.minRating')}</span>
              <span className="text-gray-100 font-semibold">
                {ratingFilter > 0 ? `${ratingFilter}+ stars` : 'No limit'}
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
          <Spin size="large" description="Loading games..." />
        </div>
      ) : filteredGames.length === 0 ? (
        <Empty
          description={t('noResults.title')}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" onClick={handleResetFilters}>
            {t('noResults.resetButton')}
          </Button>
        </Empty>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* 虚拟化滚动容器 */}
          <div
            ref={containerRef}
            className="virtual-grid-container"
            style={{
              height: '600px',
              overflow: 'auto',
              position: 'relative',
            }}
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const rowIndex = virtualRow.index;
                const startIndex = rowIndex * columnCount;
                const endIndex = Math.min(startIndex + columnCount, filteredGames.length);
                const rowGames = filteredGames.slice(startIndex, endIndex);

                return (
                  <div
                    key={virtualRow.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div
                      className="grid gap-6"
                      style={{
                        gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                        height: '100%',
                      }}
                    >
                      {rowGames.map((game) => (
                          <motion.div
                            key={game.id}
                            ref={(el) => {
                              if (startIndex === 0 && rowGames.indexOf(game) === 0) {
                                firstCardRef.current = el;
                                setFirstCardEl(el);
                              }
                            }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: (rowIndex * columnCount + rowGames.indexOf(game)) * 0.05 }}
                            whileHover={{ y: -5 }}
                          >
                          <Card
                            hoverable
                            className="game-card h-full"
                            cover={
                              <Link to={`/${currentLang}/games/${game.slug || game.id}`} className="block relative">
                                <LazyLoadImage
                                  alt={game.title}
                                  src={game.imageUrl}
                                  srcSet={`${game.imageUrl}&w=200 200w, ${game.imageUrl}&w=400 400w, ${game.imageUrl}&w=800 800w`}
                                  sizes="(max-width: 640px) 200px, (max-width: 1024px) 400px, 800px"
                                  className="w-full h-48 object-cover"
                                  effect="blur"
                                  placeholderSrc="/placeholder.svg"
                                  threshold={100}
                                  visibleByDefault={false}
                                />
                                {(game.rating > 4.5) && (
                                  <div className="absolute top-3 left-3">
                                    <Tag color="red" className="font-semibold">
                                      {t('gameCard.featured')}
                                    </Tag>
                                  </div>
                                )}
                                {game.discount && (
                                  <div className="absolute top-3 right-3">
                                    <Tag color="green" className="font-bold">
                                      -{game.discount}%
                                    </Tag>
                                  </div>
                                )}
                              </Link>
                            }
                          >
                            <div className="flex flex-col h-full">
                              <div className="flex-1">
                                <Link to={`/${currentLang}/games/${game.slug || game.id}`}>
                                  <h2 className="text-lg font-bold !text-gray-100 mb-2 line-clamp-1 hover:text-blue-400">
                                    {game.title}
                                  </h2>
                                </Link>

                                <div className="flex items-center mb-3">
                                  <Rate
                                    disabled
                                    allowHalf
                                    value={game.rating}
                                    className="text-sm mr-2"
                                  />
                                  <span className="text-gray-400 text-sm">
                                    {Number(game.rating).toFixed(1)}
                                  </span>
                                </div>

                                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                                  {game.description}
                                </p>

                                <div className="mb-4">
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {game.genres.slice(0, 2).map(genre => (
                                      <Tag key={genre} color="blue" className="text-xs">
                                        {t(`genreNames.${genre}`, { defaultValue: genre })}
                                      </Tag>
                                    ))}
                                    {game.genres.length > 2 && (
                                      <Tag className="text-xs">+{game.genres.length - 2}</Tag>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {game.platforms.map(platform => (
                                      <Tag key={platform} color="purple" className="text-xs">
                                        {platform}
                                      </Tag>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-auto pt-4 border-t border-dark-700">
                                <div className="flex justify-between items-center">
                                  <div className="text-lg font-bold">
                                    {calculateDiscountedPrice(game.price, game.discount)}
                                  </div>
                                  <Link to={`/${currentLang}/games/${game.slug || game.id}`}>
                                    <Button type="primary" size="middle">
                                      {t('gameCard.viewDetails')}
                                    </Button>
                                  </Link>
                                </div>
                                <div className="text-gray-500 text-xs mt-2">
                                  {t('gameCard.released')} {game.releaseDate}
                                </div>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
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
          {t('stats.showing', { count: filteredGames.length })} ({t('stats.total', { total: games.length })})
        </motion.div>
      )}
      </div>{/* end max-w-7xl content */}
    </div>
  );
};

export default GamesPage;