import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Typography,
  Card,
  Row,
  Col,
  Tag,
  Button,
  Rate,
  Divider,
  List,
  Space,
  Tabs,
  Descriptions,
  Statistic,
  Carousel,
  Skeleton,
  Alert,
  Avatar,
} from 'antd';
import {
  CalendarOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  HeartOutlined,
  HeartFilled,
  ShareAltOutlined,
  PlayCircleOutlined,
  TrophyOutlined,
  StarOutlined,
  TeamOutlined,
  GlobalOutlined,
  EditOutlined,
  MessageOutlined,
  PlusOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { apiService } from '../api';
import { useGame, useGameReviews, useGamePosts } from '../api/hooks';
import { useRelatedContent, useUsersAlsoLiked } from '../api/hooks';
import { Game, Review } from '../api/types';
import { useAuth } from '../contexts/AuthContext';
import RelatedContent from '../components/recommendations/RelatedContent';
import { message } from 'antd';
import SEO from '../components/SEO';
import SEOBreadcrumb from '../components/SEOBreadcrumb';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;

const GameDetailPage = () => {
  const { id, lang: paramLang } = useParams<{ id: string; lang?: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const lang = paramLang || 'cn';
  const { t } = useTranslation();
  const { data: game, isLoading, isError, error: gameError } = useGame(id || '');
  const { data: reviews = [], isLoading: reviewsLoading } = useGameReviews(id || '');
  const { data: forumPosts = [], isLoading: forumLoading } = useGamePosts(id || '');
  const { data: relatedGames } = useRelatedContent('game', id || '', 5);
  const { data: alsoLiked } = useUsersAlsoLiked(id || '', 5);
  const [activeTab, setActiveTab] = useState('overview');
  const [isFavorited, setIsFavorited] = useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);


  // 检查收藏状态
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!isAuthenticated || !id) {
        setIsFavorited(false);
        return;
      }

      try {
        setIsFavoriteLoading(true);
        const status = await apiService.checkFavorite(id);
        setIsFavorited(status.isFavorited);
      } catch (err) {
        console.error('检查收藏状态失败:', err);
        // 失败时默认为未收藏
        setIsFavorited(false);
      } finally {
        setIsFavoriteLoading(false);
      }
    };

    checkFavoriteStatus();
  }, [id, isAuthenticated]);


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 9) return '#52c41a';
    if (rating >= 8) return '#1890ff';
    if (rating >= 7) return '#faad14';
    return '#ff4d4f';
  };

  const calculateDiscountPrice = () => {
    if (!game) return 0;
    if (game.discount) {
      return game.price * (1 - game.discount / 100);
    }
    return game.price;
  };

  const handleAddToCart = () => {
    if (!game) return;
    // 使用本地存储保存购物车
    try {
      const cartStr = localStorage.getItem('gamehub_cart');
      const cart = cartStr ? JSON.parse(cartStr) : [];
      if (!cart.includes(game.id)) {
        cart.push(game.id);
        localStorage.setItem('gamehub_cart', JSON.stringify(cart));
        message.success(t('cart.added', '《{{title}}》已添加到购物车', { title: game.title }));
      } else {
        message.info(t('cart.alreadyInCart', '《{{title}}》已在购物车中', { title: game.title }));
      }
    } catch (error) {
      message.error(t('cart.addFailed', '添加到购物车失败'));
    }
  };

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      message.warning(t('favorites.loginRequired', '请先登录后再收藏游戏'));
      navigate(`/${lang}/login`);
      return;
    }

    if (!game) return;

    try {
      setIsFavoriteLoading(true);
      if (isFavorited) {
        await apiService.removeFavorite(game.id);
        setIsFavorited(false);
        message.success(t('favorites.removed', '已取消收藏'));
      } else {
        await apiService.addFavorite(game.id);
        setIsFavorited(true);
        message.success(t('favorites.added', '收藏成功'));
      }
    } catch (err) {
      message.error(t('common.operationFailed', '操作失败，请稍后重试'));
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  if (isLoading) {
    return <GameDetailSkeleton />;
  }

  if (gameError || !game) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert
          title="加载失败"
          description={gameError?.message || String(gameError) || '游戏不存在'}
          type="error"
          showIcon
          action={
            <Button type="primary" onClick={() => navigate(`/${lang}/games`)}>
              返回游戏列表
            </Button>
          }
        />
      </div>
    );
  }

  const discountPrice = calculateDiscountPrice();
  const formattedPrice = Number(discountPrice).toFixed(2);
  const originalPrice = Number(game.price).toFixed(2);

  // 结构化数据 for VideoGame
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    'name': game.title,
    'description': game.description,
    'image': game.imageUrl,
    'url': `${window.location.origin}/games/${game.id}`,
    'genre': game.genres,
    'gamePlatform': game.platforms,
    'applicationCategory': 'Game',
    'operatingSystem': game.platforms,
    'author': {
      '@type': 'Organization',
      'name': game.developer
    },
    'publisher': {
      '@type': 'Organization',
      'name': game.publisher
    },
    'datePublished': game.releaseDate,
    'aggregateRating': {
      '@type': 'AggregateRating',
      'ratingValue': game.rating,
      'ratingCount': (game as any).reviewCount || 0,
      'bestRating': 5,
      'worstRating': 1
    },
    'offers': {
      '@type': 'Offer',
      'price': discountPrice,
      'priceCurrency': 'USD',
      'availability': 'https://schema.org/InStock',
      'seller': {
        '@type': 'Organization',
        'name': game.publisher
      }
    }
  };

  return (
    <>
      <SEO
        title={game.title}
        description={game.description?.substring(0, 160)}
        keywords={[game.title, ...(game.genres || [])].concat(['游戏详情', '游戏介绍', '游戏信息']).join(', ')}
        image={game.imageUrl}
        type="website"
        canonical={`/games/${game.id}`}
        structuredData={structuredData}
      />
      <SEOBreadcrumb items={[
        { name: '首页', url: `/${lang || 'cn'}` },
        { name: '游戏库', url: `/${lang || 'cn'}/games` },
        { name: game.title, url: `/${lang || 'cn'}/games/${game.id}` },
      ]} />
      <article>
      <div className="min-h-screen bg-dark-900">
      {/* 头部区域 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* 游戏封面 */}
            <div className="w-full md:w-56 flex-shrink-0">
              <img alt={game.title} src={game.imageUrl} className="w-full h-36 md:h-48 object-cover rounded-xl shadow-2xl" loading="lazy" />
            </div>
            {/* 游戏信息 */}
            <div className="flex-1">
              <Title level={1} className="!text-white !mb-3">{game.title}</Title>
              <div className="flex flex-wrap items-center gap-4 mb-3">
                <span className="text-3xl font-bold" style={{ color: getRatingColor(game.rating) }}>{Number(game.rating).toFixed(1)}</span>
                <Rate allowHalf defaultValue={game.rating / 2} disabled style={{ fontSize: 18 }} />
                <div className="flex flex-wrap gap-1">
                  {(game.genres || []).slice(0,3).map((g: string, i: number) => (
                    <Tag key={i} color="blue" className="bg-white/20 border-0">{g}</Tag>
                  ))}
                </div>
              </div>
              <p className="text-white/70 text-sm line-clamp-2 mb-4">{game.description}</p>
              <div className="flex items-center gap-4 flex-wrap">
                {game.discount ? <><span className="text-sm line-through opacity-70">¥{game.price}</span><Tag color="red">-{game.discount}%</Tag></> : null}
                <span className="text-3xl font-bold">¥{game.discount ? Math.round(game.price * (1 - game.discount / 100)) : game.price}</span>
                <Button type="primary" size="large" icon={<ShoppingCartOutlined />}>加入购物车</Button>
                <Button size="large" icon={isFavorited ? <HeartFilled /> : <HeartOutlined />}
                    onClick={handleToggleFavorite}
                    loading={isFavoriteLoading}
                    type={isFavorited ? 'primary' : 'default'}
                    danger={isFavorited}
                  >
                    {isFavorited ? '已收藏' : '收藏'}
                  </Button>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* 主要内容 */}
      <div className="py-8">
        <Row gutter={[32, 32]}>
          {/* 左侧内容区域 */}
          <Col xs={24} lg={16}>
            {/* 游戏截图轮播 */}
            <Card className="mb-8 bg-dark-800 border-dark-700">
              <Carousel autoplay>
                {(game.screenshots || []).map((screenshot, index) => (
                  <div key={index} className="h-96">
                    <img
                      src={screenshot}
                      alt={`${game.title} 截图 ${index + 1}`}
                      className="w-full h-full object-cover"
                      width="700"
                      height="384"
                      loading="lazy"
                    />
                  </div>
                ))}
              </Carousel>
            </Card>

            {/* 游戏详情选项卡 */}
            <Card className="mb-8 bg-dark-800 border-dark-700">
              <Tabs activeKey={activeTab} onChange={setActiveTab}>
                <TabPane tab="游戏概述" key="overview">
                  <div className="prose max-w-none">
                    <Paragraph className="text-lg leading-relaxed mb-6">
                      {game.description}
                    </Paragraph>

                    <Divider />

                    <Title level={3} className="mb-4 !text-white">游戏特色</Title>
                    <Row gutter={[16, 16]}>
                      <Col xs={24} sm={12}>
                        <div className="p-4 bg-dark-800 rounded-lg border border-dark-700">
                          <TrophyOutlined className="text-2xl text-blue-500 mb-2" />
                          <Title level={5} className="mb-2 !text-white">获奖无数</Title>
                          <Text className="text-gray-300">
                            荣获多个年度游戏奖项，包括TGA年度游戏大奖。
                          </Text>
                        </div>
                      </Col>
                      <Col xs={24} sm={12}>
                        <div className="p-4 bg-dark-800 rounded-lg border border-dark-700">
                          <PlayCircleOutlined className="text-2xl text-green-500 mb-2" />
                          <Title level={5} className="mb-2 !text-white">沉浸体验</Title>
                          <Text className="text-gray-300">
                            精美的画面和出色的音效带来身临其境的游戏体验。
                          </Text>
                        </div>
                      </Col>
                      <Col xs={24} sm={12}>
                        <div className="p-4 bg-dark-800 rounded-lg border border-dark-700">
                          <TeamOutlined className="text-2xl text-purple-500 mb-2" />
                          <Title level={5} className="mb-2 !text-white">多人游戏</Title>
                          <Text className="text-gray-300">
                            支持多人合作和PvP模式，与朋友一起享受游戏乐趣。
                          </Text>
                        </div>
                      </Col>
                      <Col xs={24} sm={12}>
                        <div className="p-4 bg-dark-800 rounded-lg border border-dark-700">
                          <StarOutlined className="text-2xl text-yellow-500 mb-2" />
                          <Title level={5} className="mb-2 !text-white">持续更新</Title>
                          <Text className="text-gray-300">
                            定期推出免费更新和DLC，保持游戏新鲜感。
                          </Text>
                        </div>
                      </Col>
                    </Row>
                  </div>
                </TabPane>

                <TabPane tab="系统需求" key="requirements">
                  <Descriptions column={1} bordered size="middle">
                    <Descriptions.Item label="操作系统">
                      Windows 10 64-bit
                    </Descriptions.Item>
                    <Descriptions.Item label="处理器">
                      Intel Core i5-8400 / AMD Ryzen 5 2600
                    </Descriptions.Item>
                    <Descriptions.Item label="内存">
                      12 GB RAM
                    </Descriptions.Item>
                    <Descriptions.Item label="显卡">
                      NVIDIA GeForce GTX 1060 6GB / AMD Radeon RX 580 8GB
                    </Descriptions.Item>
                    <Descriptions.Item label="DirectX">
                      版本 12
                    </Descriptions.Item>
                    <Descriptions.Item label="存储空间">
                      需要 80 GB 可用空间
                    </Descriptions.Item>
                  </Descriptions>
                </TabPane>

                <TabPane tab="评测" key="reviews">
                  {reviewsLoading ? (
                    <div className="text-center py-12">
                      <Skeleton active paragraph={{ rows: 4 }} />
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="text-center py-12">
                      <Title level={4} className="text-gray-400 mb-4">
                        暂无评测数据
                      </Title>
                      <Text type="secondary">
                        成为第一个为这款游戏撰写评测的玩家！
                      </Text>
                      <div className="mt-6">
                        <Button type="primary" size="large">
                          撰写评测
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="reviews-list">
                      <div className="flex items-center justify-between mb-6">
                        <Title level={4} className="!text-white">玩家评测 ({reviews.length})</Title>
                        <Button type="primary" icon={<EditOutlined />}>
                          撰写评测
                        </Button>
                      </div>
                      <List
                        itemLayout="vertical"
                        dataSource={reviews}
                        renderItem={(review) => (
                          <List.Item
                            key={review.id}
                            className="border-b border-dark-700 last:border-b-0 py-6"
                            actions={[
                              <span key="likes">👍 {review.likes}</span>,
                              <span key="comments">💬 {review.comments}</span>,
                              <span key="date">{formatDate(review.publishDate)}</span>,
                            ]}
                          >
                            <List.Item.Meta
                              avatar={
                                <div className="flex items-center">
                                  <div className="w-10 h-10 bg-dark-700 rounded-full flex items-center justify-center mr-3">
                                    <span className="font-bold text-gray-400">
                                      {(review.author || '?').charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-200">{review.author}</div>
                                    <div className="flex items-center">
                                      <Rate
                                        allowHalf
                                        defaultValue={review.rating / 2}
                                        disabled
                                        style={{ fontSize: 14 }}
                                        className="mr-2"
                                      />
                                      <span className="font-bold" style={{ color: getRatingColor(review.rating) }}>
                                        {Number(review.rating).toFixed(1)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              }
                              title={<a href={`/reviews/${review.id}`}>{review.title}</a>}
                              description={
                                <div>
                                  <Paragraph ellipsis={{ rows: 3, expandable: true, symbol: '更多' }} className="text-gray-300 mb-0">
                                    {review.content}
                                  </Paragraph>
                                  <div className="mt-2">
                                    {(review.tags || []).map((tag, index) => (
                                      <Tag key={index} color="blue" className="mr-2">
                                        {tag}
                                      </Tag>
                                    ))}
                                  </div>
                                </div>
                              }
                            />
                          </List.Item>
                        )}
                      />
                    </div>
                  )}
                </TabPane>

                <TabPane tab="论坛" key="forum">
                  {forumLoading ? (
                    <div className="text-center py-12">
                      <Skeleton active paragraph={{ rows: 4 }} />
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <Title level={4} className="!text-white">
                          游戏论坛 ({forumPosts.length})
                        </Title>
                        <div className="flex gap-2">
                          <Button
                            icon={<MessageOutlined />}
                            onClick={() => {
                              const langPath = window.location.pathname.split('/')[1];
                              navigate(`/${langPath}/games/${id}/forum`);
                            }}
                          >
                            浏览全部
                          </Button>
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => {
                              const langPath = window.location.pathname.split('/')[1];
                              navigate(`/${langPath}/community/posts/new?gameId=${id}`);
                            }}
                          >
                            发帖
                          </Button>
                        </div>
                      </div>
                      {forumPosts.length === 0 ? (
                        <div className="text-center py-12">
                          <MessageOutlined className="text-5xl text-gray-600 mb-4" />
                          <Title level={4} className="text-gray-400 mb-2">
                            暂无论坛帖子
                          </Title>
                          <Text type="secondary">
                            成为第一个为本游戏发帖的玩家！
                          </Text>
                        </div>
                      ) : (
                        <List
                          itemLayout="vertical"
                          dataSource={forumPosts.slice(0, 5)}
                          renderItem={(post) => {
                            const langPath = window.location.pathname.split('/')[1];
                            return (
                            <List.Item
                              key={post.id}
                              className="border-b border-dark-700 last:border-b-0 py-4 cursor-pointer hover:bg-dark-700/30 transition-colors"
                              onClick={() => navigate(`/${langPath}/community/posts/${post.id}`)}
                              actions={[
                                <span key="likes">👍 {post.likes}</span>,
                                <span key="comments">💬 {post.comments}</span>,
                                <span key="date">{formatDate(post.publishDate)}</span>,
                              ]}
                            >
                              <List.Item.Meta
                                avatar={
                                  <Avatar icon={<UserOutlined />}
                                    style={{ backgroundColor: '#1890ff' }} />
                                }
                                title={
                                  <span className="text-white hover:text-blue-400 transition-colors">
                                    {post.title}
                                  </span>
                                }
                                description={
                                  <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <span>{post.author || '匿名'}</span>
                                    {post.category && <Tag color="blue">{post.category}</Tag>}
                                  </div>
                                }
                              />
                            </List.Item>
                          );
                        }}
                      />
                      )}
                    </div>
                  )}
                </TabPane>
              </Tabs>
            </Card>
          {/* 相关推荐 */}
          <div className="mt-6">
            <Row gutter={[16,16]}>
              <Col xs={24} md={12}>
                <Card className="bg-dark-800 border-dark-700 h-full">
                  <RelatedContent title="类似游戏" items={relatedGames || []} />
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card className="bg-dark-800 border-dark-700 h-full">
                  <RelatedContent title="用户也喜欢" items={alsoLiked || []} />
                </Card>
              </Col>
            </Row>
          </div>
          </Col>

          {/* 右侧侧边栏 */}
          <Col xs={24} lg={8}>
            {/* 游戏信息卡片 */}
            <Card className="mb-6 bg-dark-800 border-dark-700" title={<span className="text-white text-base">游戏信息</span>}>
              <Descriptions column={1} size="small" colon={false}>
                <Descriptions.Item label={<span className="text-gray-400">开发商</span>}>
                  <span className="text-gray-200">{game.developer}</span>
                </Descriptions.Item>
                <Descriptions.Item label={<span className="text-gray-400">发行商</span>}>
                  <span className="text-gray-200">{game.publisher}</span>
                </Descriptions.Item>
                <Descriptions.Item label={<span className="text-gray-400">发行日期</span>}>
                  <CalendarOutlined className="mr-1" /><span className="text-gray-200">{formatDate(game.releaseDate)}</span>
                </Descriptions.Item>
                <Descriptions.Item label={<span className="text-gray-400">平台</span>}>
                  <div className="flex flex-wrap gap-1">
                    {(game.platforms || []).slice(0,4).map((p, i) => <Tag key={i} className="text-xs bg-dark-700 border-0 text-gray-300">{p}</Tag>)}
                  </div>
                </Descriptions.Item>
                <Descriptions.Item label={<span className="text-gray-400">类型</span>}>
                  <div className="flex flex-wrap gap-1">
                    {(game.genres || []).slice(0,4).map((g, i) => <Tag key={i} color="blue" className="text-xs">{g}</Tag>)}
                  </div>
                </Descriptions.Item>
              </Descriptions>
              <Divider className="!my-3 !border-dark-700" />
              <Button type="primary" block icon={<ShareAltOutlined />} size="small">分享游戏</Button>
            </Card>

            {/* 评分统计 */}
            <Card className="mb-8 bg-dark-800 border-dark-700">
              <div className="text-center mb-6">
                <div
                  className="text-5xl font-bold mb-2"
                  style={{ color: getRatingColor(game.rating) }}
                >
                  {Number(game.rating).toFixed(1)}
                </div>
                <div className="text-gray-400 mb-4">综合评分</div>
  <Rate
                  allowHalf
                  defaultValue={game.rating / 2}
                  disabled
                  style={{ fontSize: 24 }}
                  className="mb-6"
                />
                <Text type="secondary">基于 1,234 个玩家评测</Text>
              </div>

              <div className="space-y-3">
                {[
                  { label: '游戏性', score: game.rating - 0.1 },
                  { label: '画面表现', score: game.rating + 0.1 },
                  { label: '剧情叙事', score: game.rating - 0.2 },
                  { label: '音效音乐', score: game.rating + 0.2 },
                  { label: '性价比', score: game.rating - 0.3 },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <Text className="text-gray-300">{item.label}</Text>
                    <div className="flex items-center">
                      <Rate
                        allowHalf
                        defaultValue={item.score / 2}
                        disabled
                        style={{ fontSize: 14 }}
                        className="mr-2"
                      />
                      <Text strong style={{ color: getRatingColor(item.score) }}>
                        {Number(item.score).toFixed(1)}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

          </Col>
        </Row>
      </div>
    </div>
    </article>
    </>
  );
};

// 骨架屏组件
const GameDetailSkeleton = () => (
  <div className="min-h-screen bg-dark-900">
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Skeleton.Input active size="large" style={{ width: 300, height: 40 }} />
        <Skeleton active paragraph={{ rows: 1 }} className="mt-4" />
      </div>
    </div>

    <div className="py-8">
      <Row gutter={[32, 32]}>
        <Col xs={24} lg={16}>
          <Card className="mb-8 bg-dark-800 border-dark-700">
            <Skeleton.Image active style={{ width: '100%', height: 400 }} />
          </Card>
          <Card className="mb-8 bg-dark-800 border-dark-700">
            <Skeleton active paragraph={{ rows: 8 }} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card className="mb-8 bg-dark-800 border-dark-700">
            <Skeleton active paragraph={{ rows: 6 }} />
          </Card>
          <Card className="mb-8 bg-dark-800 border-dark-700">
            <Skeleton active paragraph={{ rows: 4 }} />
          </Card>
        </Col>
      </Row>
    </div>
  </div>
);

export default GameDetailPage;