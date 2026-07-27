import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, Row, Col, Tag, Typography } from 'antd';
import {
  PlayCircleOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import SEO from '../components/SEO';

const { Title, Paragraph } = Typography;

const freeGameCategories = [
  {
    key: 'action',
    icon: <ThunderboltOutlined className="text-3xl text-red-400" />,
    games: [' freeGame.categories.action.games.0', ' freeGame.categories.action.games.1', ' freeGame.categories.action.games.2'],
  },
  {
    key: 'strategy',
    icon: <TrophyOutlined className="text-3xl text-yellow-400" />,
    games: [' freeGame.categories.strategy.games.0', ' freeGame.categories.strategy.games.1', ' freeGame.categories.strategy.games.2'],
  },
  {
    key: 'multiplayer',
    icon: <TeamOutlined className="text-3xl text-green-400" />,
    games: [' freeGame.categories.multiplayer.games.0', ' freeGame.categories.multiplayer.games.1', ' freeGame.categories.multiplayer.games.2'],
  },
  {
    key: 'casual',
    icon: <PlayCircleOutlined className="text-3xl text-sky-400" />,
    games: [' freeGame.categories.casual.games.0', ' freeGame.categories.casual.games.1', ' freeGame.categories.casual.games.2'],
  },
];

const topFreeGames = [
  { title: ' freeGame.top.0.title', desc: ' freeGame.top.0.desc', tags: ['#BR', '#FreeToPlay'], players: '500M+' },
  { title: ' freeGame.top.1.title', desc: ' freeGame.top.1.desc', tags: ['#MOBA', '#Competitive'], players: '200M+' },
  { title: ' freeGame.top.2.title', desc: ' freeGame.top.2.desc', tags: ['#OpenWorld', '#Action'], players: '100M+' },
  { title: ' freeGame.top.3.title', desc: ' freeGame.top.3.desc', tags: ['#CardGame', '#Strategy'], players: '150M+' },
  { title: ' freeGame.top.4.title', desc: ' freeGame.top.4.desc', tags: ['#Racing', '#Casual'], players: '1B+' },
  { title: ' freeGame.top.5.title', desc: ' freeGame.top.5.desc', tags: ['#MMO', '#RPG'], players: '80M+' },
];

export default function FreeGamesPage() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');

  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://www.gghubs.com';

  const structuredData = [
    {
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': '首页', 'item': siteUrl },
        { '@type': 'ListItem', 'position': 2, 'name': isEn ? 'Free Games' : '免费游戏', 'item': `${siteUrl}${isEn ? '/en' : '/cn'}/free-games` },
      ],
    },
    {
      '@type': 'CollectionPage',
      'name': isEn ? 'Free Online Games - Best Free Games 2026' : '免费在线游戏 - 2026年最佳免费游戏推荐',
      'description': isEn
        ? 'Play the best free online games at GGHubs. No download required. Browse our collection of free action, strategy, multiplayer and casual games.'
        : '在GGHubs畅玩最佳免费在线游戏，无需下载。浏览我们的免费动作、策略、多人和休闲游戏合集。',
    },
    {
      '@type': 'FAQPage',
      'mainEntity': [0, 1, 2, 3].map(idx => ({
        '@type': 'Question',
        'name': t(`freeGame.faq.q${idx}`),
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': t(`freeGame.faq.a${idx}`),
        },
      })),
    },
  ];

  return (
    <div className=" py-8 px-4 sm:px-6 lg:px-8">
      <SEO
        title={t('seo.freeGames.title')}
        description={t('seo.freeGames.description')}
        keywords={t('seo.freeGames.keywords')}
        url={isEn ? '/en/free-games' : '/cn/free-games'}
        canonical="/free-games"
        structuredData={structuredData}
      />

      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-400 mb-6 shadow-lg shadow-green-500/20">
          <PlayCircleOutlined className="text-4xl text-white" />
        </div>
        <Title level={1} className="!text-white !text-4xl md:!text-5xl !mb-4">
          {t('freeGame.hero.title')}
        </Title>
        <Paragraph className="text-gray-400 text-lg max-w-2xl mx-auto">
          {t('freeGame.hero.subtitle')}
        </Paragraph>
      </div>

      {/* Categories */}
      <section className="mb-14">
        <Title level={2} className="!text-white !text-2xl !mb-6">{t('freeGame.categories.title')}</Title>
        <Row gutter={[16, 16]}>
          {freeGameCategories.map((cat) => (
            <Col xs={12} sm={6} key={cat.key}>
              <Link to={`/library/online?category=${cat.key}`} className="block h-full">
                <Card className="h-full bg-dark-800 border-dark-700 hover:border-green-500/50 transition-all">
                  <div className="text-center">
                    <div className="mb-3 flex justify-center">{cat.icon}</div>
                    <h3 className="text-white font-semibold mb-2">{t(`freeGame.categories.${cat.key}.name`)}</h3>
                    <ul className="text-gray-400 text-sm space-y-1">
                      {cat.games.map((g: string, i: number) => <li key={i}>{t(g)}</li>)}
                    </ul>
                  </div>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>
      </section>

      {/* Top Free Games */}
      <section className="mb-14">
        <Title level={2} className="!text-white !text-2xl !mb-6">{t('freeGame.top.title')}</Title>
        <Row gutter={[16, 16]}>
          {topFreeGames.map((game, idx) => (
            <Col xs={24} sm={12} lg={8} key={idx}>
              <Card className="h-full bg-dark-800 border-dark-700 hover:border-primary-500/50 transition-all">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-white font-semibold">{t(game.title)}</h3>
                  <Tag color="green" className="shrink-0">{game.players}</Tag>
                </div>
                <p className="text-gray-400 text-sm mb-3">{t(game.desc)}</p>
                <div className="flex flex-wrap gap-1">
                  {game.tags.map((tag) => (
                    <Tag key={tag} color="blue" className="text-xs">{tag}</Tag>
                  ))}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      {/* Why Free Games */}
      <section className="mb-14 p-6 bg-dark-800/50 rounded-2xl border border-dark-700">
        <Title level={2} className="!text-white !text-2xl !mb-4">{t('freeGame.why.title')}</Title>
        <Paragraph className="text-gray-300 leading-relaxed">{t('freeGame.why.content')}</Paragraph>
        <Row gutter={[16, 16]} className="mt-6">
          {['noCost', 'noDownload', 'crossPlatform', 'social'].map((k) => (
            <Col xs={12} sm={6} key={k}>
              <div className="text-center p-3 bg-dark-800 rounded-xl">
                <div className="text-white font-semibold mb-1">{t(`freeGame.why.points.${k}.title`)}</div>
                <div className="text-gray-400 text-sm">{t(`freeGame.why.points.${k}.desc`)}</div>
              </div>
            </Col>
          ))}
        </Row>
      </section>

      {/* FAQ */}
      <section className="mb-14">
        <Title level={2} className="!text-white !text-2xl !mb-6">{t('freeGame.faq.title')}</Title>
        <div className="space-y-4">
          {[0, 1, 2, 3].map((idx) => (
            <details key={idx} className="bg-dark-800 border border-dark-700 rounded-xl p-4 group cursor-pointer">
              <summary className="text-white font-medium group-open:text-green-400 transition-colors">
                {t(`freeGame.faq.q${idx}`)}
              </summary>
              <p className="text-gray-400 mt-3 text-sm leading-relaxed">{t(`freeGame.faq.a${idx}`)}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-8">
        <Title level={3} className="!text-white !mb-3">{t('freeGame.cta.title')}</Title>
        <Paragraph className="text-gray-400 mb-6">{t('freeGame.cta.subtitle')}</Paragraph>
        <Link
          to="/library/online"
          className="inline-block bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold px-8 py-3 rounded-full hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg shadow-green-500/20"
        >
          {t('freeGame.cta.button')} →
        </Link>
      </section>
    </div>
  );
}
