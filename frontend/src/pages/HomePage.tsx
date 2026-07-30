import { Card, Row, Col, Button, Typography, Skeleton } from 'antd';
import { ArrowRightOutlined, FireOutlined, StarOutlined, RocketOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import LazyLoadImageComponent from 'react-lazy-load-image-component';
const { LazyLoadImage } = LazyLoadImageComponent as any;
import SEO from '../components/SEO';
import RecommendedGames from '../components/recommendations/RecommendedGames';
import TrendingCarousel from '../components/recommendations/TrendingCarousel';
import SEOBreadcrumb from '../components/SEOBreadcrumb';
import { useTrendingContent, usePersonalizedRecommendations, useGames, useNews } from '../api/hooks';
import { useAuth } from '../contexts/AuthContext';

const { Title, Paragraph, Text } = Typography;

const HomePage = () => {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang || 'cn';
  const { t } = useTranslation('home');
  const { user } = useAuth();

  const { data: trendingItems, isLoading: trendingLoading } = useTrendingContent(5);
  const { data: personalizedItems, isLoading: personalizedLoading } = usePersonalizedRecommendations(6);
  const { data: gamesData, isLoading: gamesLoading } = useGames({ page: 1, limit: 10 });
  const { data: newsData, isLoading: newsLoading } = useNews({ page: 1, limit: 5 });

  // 从 API 获取真实游戏数据，适配 Game 类型到展示所需字段
  const featuredGames = Array.isArray(gamesData) ? gamesData.map((game: any) => ({
    id: game.id,
    title: game.title,
    genre: (game.genres || []).join(', '),
    rating: game.rating || 0,
    price: game.price || 0,
    discount: game.discount || 0,
    image: game.imageUrl || '/og-image.png',
    platforms: game.platforms || [],
  })) : [];

  // 从 API 获取真实新闻数据
  const newsItems = Array.isArray(newsData) ? newsData.map((news: any) => ({
    id: news.id,
    title: news.title,
    excerpt: news.summary || '',
    date: news.publishDate || news.createdAt || '',
    category: news.category || 'News',
  })) : [];

  return (
    <div className="home-page bg-dark-900">
      {/* SEO 配置 */}
      <SEO
        title={i18n.language?.startsWith("en") ? "GameHub - Game Reviews & Recommendations | Find Your Next Favorite Game" : "GameHub - 专业游戏推荐与评测平台 | 发现你的下一款最爱游戏"}
        description={i18n.language?.startsWith("en") ? "GameHub is a professional game recommendation and review community platform. Discover game reviews, trending recommendations, in-depth guides, and join gaming discussions." : "GameHub（好游聚）是专业的游戏推荐与评测社区平台，提供最新游戏评测、热门游戏推荐、深度游戏攻略和玩家社区讨论。"}
        keywords={i18n.language?.startsWith("en") ? "game reviews, game recommendations, gaming community, game guides, GameHub, PC games" : "游戏推荐, 游戏评测, 游戏攻略, 游戏社区, GameHub, 好游聚, PC游戏"}
        structuredData={[
          {
            '@type': 'FAQPage',
            'mainEntity': [
              {
                '@type': 'Question',
                'name': i18n.language?.startsWith('en') ? 'What is GameHub?' : 'GameHub（好游聚）是什么？',
                'acceptedAnswer': {
                  '@type': 'Answer',
                  'text': i18n.language?.startsWith('en')
                    ? 'GGHubs is a comprehensive gaming community platform for discovering game reviews, recommendations, guides, and connecting with millions of gamers worldwide. It features AI-powered game recommendations, real-time gaming news, community forums, and playable HTML5 games.'
                    : 'GGHubs（好游聚）是一个综合性游戏社区平台，提供游戏评测、游戏推荐、游戏攻略、玩家社区讨论等功能。平台特色包括AI智能游戏推荐、实时游戏资讯、互动论坛以及在线小游戏。',
                },
              },
              {
                '@type': 'Question',
                'name': i18n.language?.startsWith('en') ? 'Is GameHub free?' : 'GameHub是免费的吗？',
                'acceptedAnswer': {
                  '@type': 'Answer',
                  'text': i18n.language?.startsWith('en')
                    ? 'Yes, GGHubs is completely free to use. You can browse games, read reviews, join community discussions, and play online games without any charge.'
                    : '是的，GGHubs完全免费使用。您可以免费浏览游戏库、阅读评测、参与社区讨论和玩在线小游戏。',
                },
              },
              {
                '@type': 'Question',
                'name': i18n.language?.startsWith('en') ? 'What games can I find on GameHub?' : '在GameHub上可以找到哪些游戏？',
                'acceptedAnswer': {
                  '@type': 'Answer',
                  'text': i18n.language?.startsWith('en')
                    ? 'GGHubs covers thousands of games across PC, PlayStation, Xbox, Nintendo Switch, and mobile platforms. You can find game reviews, compare ratings, read strategy guides, and discover new titles through personalized recommendations.'
                    : 'GGHubs涵盖PC、PlayStation、Xbox、Nintendo Switch和手机平台的数千款游戏。您可以查看游戏评测、对比评分、阅读攻略，并通过个性化推荐发现新游戏。',
                },
              },
              {
                '@type': 'Question',
                'name': i18n.language?.startsWith('en') ? 'Does GameHub have online games to play?' : 'GameHub有在线游戏可以玩吗？',
                'acceptedAnswer': {
                  '@type': 'Answer',
                  'text': i18n.language?.startsWith('en')
                    ? 'Yes! GGHubs offers free HTML5 games including Snake, Tetris, 2048, Minesweeper, Gobang, Pong, Bubble Shooter, and many more. All games run directly in your browser with no downloads needed.'
                    : '是的！GGHubs提供免费的HTML5在线小游戏，包括贪吃蛇、俄罗斯方块、2048、扫雷、五子棋、乒乓球、泡泡龙等。所有游戏在浏览器中即点即玩，无需下载。',
                },
              },
              {
                '@type': 'Question',
                'name': i18n.language?.startsWith('en') ? 'How do I join the GameHub community?' : '如何加入GameHub社区？',
                'acceptedAnswer': {
                  '@type': 'Answer',
                  'text': i18n.language?.startsWith('en')
                    ? 'You can join GGHubs by registering a free account. Once registered, you can write game reviews, participate in forum discussions, earn achievement badges, and connect with other gamers.'
                    : '注册免费账号即可加入GGHubs社区。注册后可以撰写游戏评测、参与论坛讨论、获得成就徽章并与其他玩家交流。',
                },
              },
            ],
          },
        ]}
      />
      {/* 页面主标题（仅 SEO 可见） */}
      <h1 className="sr-only">{i18n.language?.startsWith("en") ? "GameHub - Game Reviews & Recommendations, Find Your Next Favorite Game" : "GameHub - 发现游戏推荐与游戏评测，找到你的下一款最爱游戏"}</h1>
      {/* BreadcrumbList 结构化数据 */}
      <SEOBreadcrumb items={[
        { name: "Home", url: "/" },
      ]} />
      {/* 平台介绍文案（SEO 可见） */}
      <section className="sr-only" aria-label={i18n.language?.startsWith("en") ? "Platform Introduction" : "平台介绍"}>
        {i18n.language?.startsWith("en") ? (
          <>
            <p>GGHubs is a comprehensive gaming community platform focused on game recommendations and reviews. We help every player discover their next favorite game.</p>
            <p>Read professional game reviews covering PC, PlayStation, Xbox, Nintendo Switch, and more. Each review includes detailed ratings and gameplay analysis.</p>
            <p>Our recommendation system uses smart algorithms and community feedback to personalize game suggestions just for you.</p>
            <p>The GGHubs community brings together millions of passionate gamers worldwide.</p>
            <p>Features include: personalized recommendations, multi-dimensional reviews, real-time news, community forums, achievements, and AI assistant.</p>
            <p>Join GGHubs and start your game discovery journey.</p>
          </>
        ) : (
          <>
            <p>GGHubs（好游聚）是一个专注于游戏推荐与游戏评测的综合性游戏社区平台。</p>
            <p>你可以查看由资深玩家撰写的专业游戏评测，涵盖各大平台的游戏作品。</p>
            <p>我们的游戏推荐系统基于智能算法和玩家社区的真实反馈，为你个性化推荐最适合的游戏。</p>
            <p>GGHubs社区汇聚了数百万热爱游戏的玩家。</p>
            <p>平台特色包括：个性化游戏推荐引擎、多维度游戏评测系统、实时游戏资讯更新、互动社区论坛、成就徽章系统、AI智能助手等。</p>
            <p>加入GGHubs（好游聚），开启你的游戏发现之旅。</p>
          </>
        )}
      </section>

      {/* Platform summary — AI-visible direct answer for GEO */}
      <section className=" mb-6" aria-label="Platform Introduction">
        <div className="bg-gradient-to-r from-dark-800 to-dark-750 border border-dark-700 rounded-2xl p-6 md:p-8">
          <h2 className="sr-only">About GGHubs</h2>
          {i18n.language?.startsWith("en") ? (
            <p className="text-gray-300 text-base leading-relaxed">
              GGHubs is a comprehensive gaming community platform — discover game reviews, recommendations, guides, and connect with millions of gamers worldwide. Browse thousands of games across PC, PlayStation, Xbox, Nintendo Switch, and mobile platforms. Read professional reviews with detailed ratings, get personalized game recommendations powered by smart algorithms and community feedback, and join forum discussions to share strategies and tips. GGHubs also features an AI assistant for game recommendations, real-time gaming news, achievement badges, and a community-driven content ecosystem. Start your game discovery journey at GGHubs today.
            </p>
          ) : (
            <p className="text-gray-300 text-base leading-relaxed">
              GGHubs（好游聚）是一个综合性游戏社区平台 — 在这里发现游戏评测、推荐、攻略，并与全球数百万玩家交流互动。浏览涵盖 PC、PlayStation、Xbox、Nintendo Switch 和手机平台的海量游戏库，阅读资深玩家撰写的专业游戏评测，获取基于智能算法和社区真实反馈的个性化游戏推荐，参与论坛讨论分享游戏策略和技巧。GGHubs 还提供 AI 智能游戏推荐助手、实时游戏资讯、成就徽章系统以及社区驱动的内容生态。立即加入 GGHubs，开启你的游戏发现之旅。
            </p>
          )}
        </div>
      </section>

      {/* Featured Games */}
      <section className="mb-16">
        <div className=" px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <Title level={2} className="flex items-center gap-2 !text-white">
                <FireOutlined className="text-orange-500" />
                {t('home.featuredGames', 'Featured Games')}
              </Title>
              <Paragraph className="text-gray-400">
                {t('home.featuredGamesDesc', 'Handpicked selection of must-play titles')}
              </Paragraph>
            </div>
            <Button type="link" onClick={() => navigate(`/${currentLang}/games`)}>
              {t('home.viewAll', 'View All')} <ArrowRightOutlined />
            </Button>
          </div>

          {gamesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="h-full">
                  <Skeleton active paragraph={{ rows: 4 }} />
                </Card>
              ))}
            </div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-6">
              {featuredGames.slice(0, 10).map((game: any, index: number) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  whileHover={{ y: -8 }}
                >
                  <a
                    href={`/${currentLang}/games/${game.id}`}
                    onClick={(e) => { e.preventDefault(); navigate(`/${currentLang}/games/${game.id}`); }}
                    className="block h-full no-underline"
                  >
                  <Card
                    hoverable
                    className="h-full"
                    cover={
                      <div className="relative h-48 overflow-hidden">
                        <LazyLoadImage
                          src={game.image}
                          alt={game.title}
                          className="w-full h-full object-cover"
                          effect="blur"
                          threshold={100}
                        />
                        {game.discount > 0 && (
                          <div className="absolute top-3 right-3 bg-green-500 text-white font-bold px-3 py-1 rounded-full">
                            -{game.discount}%
                          </div>
                        )}
                      </div>
                    }
                  >
                    <div className="flex justify-between items-start mb-2">
                      <Title level={4} className="mb-1 truncate flex-1 min-w-0">{game.title}</Title>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        <StarOutlined className="text-yellow-500" />
                        <Text strong>{game.rating}</Text>
                      </div>
                    </div>
                    <Paragraph className="text-gray-400 text-sm mb-3 truncate">{game.genre}</Paragraph>
                    <div className="flex justify-between items-center">
                      <div className="flex-shrink-0">
                        <Text className="text-lg font-bold">
                          ¥{game.discount > 0 ? Math.round(game.price * (1 - game.discount / 100)) : game.price}
                        </Text>
                        {game.discount > 0 && (
                          <Text delete className="text-gray-400 ml-2">¥{game.price}</Text>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0 ml-2">
                        {(game.platforms || []).map((platform: string) => (
                          <span key={platform} className="px-2 py-1 bg-dark-700 text-gray-300 text-xs rounded whitespace-nowrap">
                            {platform}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Card>
                  </a>
                </motion.div>
              ))}
            </div>
          )}
          </div>
        </section>

      {/* 新闻与更新 — 真实数据 */}
      <section className="mb-16">
        <div className=" px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <Title level={2} className="flex items-center gap-2 !text-white">
                <RocketOutlined className="text-blue-500" />
                {t('home.latestNews', 'Latest News & Updates')}
              </Title>
              <Paragraph className="text-gray-400">
                {t('home.latestNewsDesc', 'Stay informed with the latest gaming industry news')}
              </Paragraph>
            </div>
            <Button type="link" onClick={() => navigate(`/${currentLang}/news`)}>
              {t('home.viewAll', 'View All')} <ArrowRightOutlined />
            </Button>
          </div>

          {newsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="h-full">
                  <Skeleton active paragraph={{ rows: 4 }} />
                </Card>
              ))}
            </div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-6">
              {newsItems.length > 0 ? (
                newsItems.slice(0, 10).map((news: any, index: number) => (
                  <motion.div
                    key={news.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <Card
                      hoverable
                      className="h-full"
                      onClick={() => navigate(`/news/${news.id}`)}
                    >
                      <div className="mb-4">
                        <span className="inline-block px-3 py-1 bg-blue-900/50 text-blue-300 text-sm font-medium rounded-full">
                          {news.category}
                        </span>
                      </div>
                      <Title level={4} className="mb-3 truncate">{news.title}</Title>
                      <Paragraph className="text-gray-400 mb-4 truncate">
                        {news.excerpt}
                      </Paragraph>
                      <div className="flex justify-between items-center text-gray-500 text-sm">
                        <span className="whitespace-nowrap">{news.date}</span>
                        <Button type="link" size="small" className="flex-shrink-0">
                          Read More
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-5 text-center py-12 text-gray-400">
                  暂无新闻数据
                </div>
              )}
            </div>
          )}
          </div>
        </section>

      {/* 热门趋势推荐 */}
      <section className="mb-16">
        <div className=" px-4 sm:px-6 lg:px-8">
          <TrendingCarousel
            title="热门趋势"
            items={trendingItems || []}
            loading={trendingLoading}
            variant="grid"
          />
        </div>
      </section>

      {/* 社区宣传 */}
      <section className="mb-16">
        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-2xl border border-dark-700">
          <div className=" py-8">
            <Row align="middle" gutter={[48, 24]}>
              <Col xs={24} lg={12}>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <Title level={2} className="mb-4 !text-white">
                    {t('home.joinCommunity', 'Join Our Gaming Community')}
                  </Title>
                  <Paragraph className="text-lg text-gray-300 mb-6">
                    {t('home.communityDesc', 'Connect with thousands of gamers worldwide. Share reviews, discuss strategies, participate in events, and make new friends who share your passion for gaming.')}
                  </Paragraph>
                  <div className="flex flex-wrap gap-4">
                    <Button type="primary" size="large" onClick={() => navigate(`/${currentLang}/community-forum`)}>
                      {t('home.exploreCommunity', 'Explore Community')}
                    </Button>
                    <Button size="large" onClick={() => navigate(`/${currentLang}/register`)}>
                      {t('home.signUpFree', 'Sign Up Free')}
                    </Button>
                  </div>
                </motion.div>
              </Col>
              <Col xs={24} lg={12}>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="bg-dark-800 p-6 rounded-xl shadow-lg border border-dark-700"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-purple-900/30 rounded-lg border border-purple-800/50">
                      <div className="text-3xl font-bold text-purple-400 mb-2">10K+</div>
                      <div className="text-gray-400">Active Members</div>
                    </div>
                    <div className="text-center p-4 bg-blue-900/30 rounded-lg border border-blue-800/50">
                      <div className="text-3xl font-bold text-blue-400 mb-2">5K+</div>
                      <div className="text-gray-400">Game Reviews</div>
                    </div>
                    <div className="text-center p-4 bg-green-900/30 rounded-lg border border-green-800/50">
                      <div className="text-3xl font-bold text-green-400 mb-2">500+</div>
                      <div className="text-gray-400">Monthly Events</div>
                    </div>
                    <div className="text-center p-4 bg-orange-900/30 rounded-lg border border-orange-800/50">
                      <div className="text-3xl font-bold text-orange-400 mb-2">100+</div>
                      <div className="text-gray-400">Game Discussions</div>
                    </div>
                  </div>
                </motion.div>
              </Col>
            </Row>
          </div>
        </div>
      </section>

      {/* 个性化推荐（登录用户） */}
      {user && (
        <section className="mb-16">
          <div className=" px-4 sm:px-6 lg:px-8">
            <RecommendedGames
              title="为你推荐"
              recommendations={personalizedItems || []}
              loading={personalizedLoading}
              variant="grid"
            />
          </div>
        </section>
      )}
    </div>
  );
};

export default HomePage;