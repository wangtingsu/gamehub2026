import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, Row, Col, Tag, Typography } from 'antd';
import {
  HeartOutlined,
  FireOutlined,
  StarOutlined,
  CloudOutlined,
  CoffeeOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import SEO from '../components/SEO';

const { Title, Paragraph } = Typography;

const cozyGameCategories = [
  {
    key: 'farming',
    icon: <HeartOutlined className="text-3xl text-pink-400" />,
    games: ['Stardew Valley', 'Story of Seasons', 'Fields of Mistria', 'Coral Island'],
  },
  {
    key: 'lifeSim',
    icon: <HomeOutlined className="text-3xl text-blue-400" />,
    games: ['Animal Crossing', 'The Sims 4', 'Paralives', 'My Time at Sandrock'],
  },
  {
    key: 'relaxing',
    icon: <CloudOutlined className="text-3xl text-sky-400" />,
    games: ['Spiritfarer', 'Unpacking', 'Dorfromantik', 'Tiny Glade'],
  },
  {
    key: 'building',
    icon: <CoffeeOutlined className="text-3xl text-amber-400" />,
    games: ['Palia', 'Hozy', 'Minecraft (Peaceful)', 'Terraria'],
  },
];

const popularCozyGames = [
  {
    title: 'Stardew Valley',
    desc: ' cozyGame.desc.stardew',
    tags: ['#Farming', '#RPG', '#Indie'],
    rating: 4.9,
  },
  {
    title: 'Animal Crossing: New Horizons',
    desc: ' cozyGame.desc.animalCrossing',
    tags: ['#LifeSim', '#Nintendo', '#Multiplayer'],
    rating: 4.8,
  },
  {
    title: 'Palia',
    desc: ' cozyGame.desc.palia',
    tags: ['#MMO', '#Cozy', '#FreeToPlay'],
    rating: 4.5,
  },
  {
    title: 'Spiritfarer',
    desc: ' cozyGame.desc.spiritfarer',
    tags: ['#Management', '#StoryDriven', '#Indie'],
    rating: 4.9,
  },
  {
    title: 'Hozy',
    desc: ' cozyGame.desc.hozy',
    tags: ['#Restoration', '#Relaxing', '#Indie'],
    rating: 4.6,
  },
  {
    title: 'Unpacking',
    desc: ' cozyGame.desc.unpacking',
    tags: ['#Puzzle', '#Narrative', '#Indie'],
    rating: 4.7,
  },
];

const faqItems = [
  { q: ' cozyGame.faq.q1', a: ' cozyGame.faq.a1' },
  { q: ' cozyGame.faq.q2', a: ' cozyGame.faq.a2' },
  { q: ' cozyGame.faq.q3', a: ' cozyGame.faq.a3' },
  { q: ' cozyGame.faq.q4', a: ' cozyGame.faq.a4' },
];

export default function CozyGamesPage() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');

  const structuredData = [
    {
      '@type': 'CollectionPage',
      name: isEn ? 'Best Cozy Games 2026 - Relaxing Games Collection' : '2026年最佳治愈游戏推荐 - 放松解压游戏合集',
      description: isEn
        ? 'Discover the best cozy games for relaxation and stress relief. Our curated collection of calming games includes farming sims, life sims, and peaceful builders.'
        : '发现最受欢迎的治愈系游戏，放松解压、舒缓心情。精选农场模拟、生活模拟、休闲建造类游戏推荐。',
      about: {
        '@type': 'Thing',
        name: 'Cozy Games',
      },
    },
    {
      '@type': 'FAQPage',
      'mainEntity': faqItems.map(item => ({
        '@type': 'Question',
        'name': t(item.q),
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': t(item.a),
        },
      })),
    },
  ];

  return (
    <div className=" py-8 px-4 sm:px-6 lg:px-8">
      <SEO
        title={t('seo.cozyGames.title')}
        description={t('seo.cozyGames.description')}
        keywords={t('seo.cozyGames.keywords')}
        url={isEn ? '/en/cozy-games' : '/cn/cozy-games'}
        canonical="/cozy-games"
        structuredData={structuredData}
      />

      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 mb-6 shadow-lg shadow-pink-500/20">
          <HeartOutlined className="text-4xl text-white" />
        </div>
        <Title level={1} className="!text-white !text-4xl md:!text-5xl !mb-4">
          {t('cozyGame.hero.title')}
        </Title>
        <Paragraph className="text-gray-400 text-lg max-w-2xl mx-auto">
          {t('cozyGame.hero.subtitle')}
        </Paragraph>
      </div>

      {/* Trending Badge */}
      <div className="flex justify-center mb-10">
        <Tag icon={<FireOutlined />} color="volcano" className="px-4 py-1 text-sm rounded-full">
          {t('cozyGame.trendingBadge')}
        </Tag>
      </div>

      {/* Categories */}
      <section className="mb-14">
        <Title level={2} className="!text-white !text-2xl !mb-6">{t('cozyGame.categories.title')}</Title>
        <Row gutter={[16, 16]}>
          {cozyGameCategories.map((cat) => (
            <Col xs={12} sm={6} key={cat.key}>
              <Card className="h-full bg-dark-800 border-dark-700 hover:border-pink-500/50 transition-all">
                <div className="text-center">
                  <div className="mb-3 flex justify-center">{cat.icon}</div>
                  <h3 className="text-white font-semibold mb-2">{t(`cozyGame.categories.${cat.key}`)}</h3>
                  <ul className="text-gray-400 text-sm space-y-1">
                    {cat.games.map((g) => <li key={g}>{g}</li>)}
                  </ul>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      {/* Popular Cozy Games */}
      <section className="mb-14">
        <Title level={2} className="!text-white !text-2xl !mb-6">{t('cozyGame.popular.title')}</Title>
        <Row gutter={[16, 16]}>
          {popularCozyGames.map((game) => (
            <Col xs={24} sm={12} lg={8} key={game.title}>
              <Card className="h-full bg-dark-800 border-dark-700 hover:border-primary-500/50 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-white font-semibold text-lg">{game.title}</h3>
                  <span className="flex items-center text-yellow-400 text-sm">
                    <StarOutlined className="mr-1" /> {game.rating}
                  </span>
                </div>
                <p className="text-gray-400 text-sm mb-3">{t(game.desc)}</p>
                <div className="flex flex-wrap gap-1">
                  {game.tags.map((tag) => (
                    <Tag key={tag} color="pink" className="text-xs">{tag}</Tag>
                  ))}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
        <div className="text-center mt-6">
          <Link to="/games" className="text-primary-400 hover:text-primary-300 underline underline-offset-2">
            {t('cozyGame.popular.viewAll')} →
          </Link>
        </div>
      </section>

      {/* Why Cozy Games Matter */}
      <section className="mb-14 p-6 bg-dark-800/50 rounded-2xl border border-dark-700">
        <Title level={2} className="!text-white !text-2xl !mb-4">{t('cozyGame.why.title')}</Title>
        <Paragraph className="text-gray-300 leading-relaxed">
          {t('cozyGame.why.content')}
        </Paragraph>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {['stress', 'creative', 'community', 'accessibility'].map((k) => (
            <div key={k} className="text-center p-3">
              <div className="text-2xl font-bold text-primary-400 mb-1">{t(`cozyGame.why.stats.${k}.value`)}</div>
              <div className="text-gray-400 text-sm">{t(`cozyGame.why.stats.${k}.label`)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-14">
        <Title level={2} className="!text-white !text-2xl !mb-6">{t('cozyGame.faq.title')}</Title>
        <div className="space-y-4">
          {faqItems.map((item, idx) => (
            <details key={idx} className="bg-dark-800 border border-dark-700 rounded-xl p-4 group cursor-pointer">
              <summary className="text-white font-medium group-open:text-primary-400 transition-colors">
                {t(item.q)}
              </summary>
              <p className="text-gray-400 mt-3 text-sm leading-relaxed">{t(item.a)}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-8">
        <Title level={3} className="!text-white !mb-3">{t('cozyGame.cta.title')}</Title>
        <Paragraph className="text-gray-400 mb-6">{t('cozyGame.cta.subtitle')}</Paragraph>
        <Link
          to="/games?tag=cozy"
          className="inline-block bg-gradient-to-r from-pink-500 to-orange-500 text-white font-semibold px-8 py-3 rounded-full hover:from-pink-600 hover:to-orange-600 transition-all shadow-lg shadow-pink-500/20"
        >
          {t('cozyGame.cta.button')} →
        </Link>
      </section>
    </div>
  );
}
