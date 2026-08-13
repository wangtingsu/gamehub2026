import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, Row, Col, Tag, Typography } from 'antd';
import {
  RobotOutlined,
  BulbOutlined,
  AimOutlined,
  CommentOutlined,
} from '@ant-design/icons';
import SEO from '../components/SEO';

const { Title, Paragraph } = Typography;

const aiFeatures = [
  {
    key: 'npc',
    icon: <RobotOutlined className="text-3xl text-purple-400" />,
  },
  {
    key: 'companion',
    icon: <CommentOutlined className="text-3xl text-pink-400" />,
  },
  {
    key: 'procedural',
    icon: <AimOutlined className="text-3xl text-cyan-400" />,
  },
  {
    key: 'assistant',
    icon: <BulbOutlined className="text-3xl text-amber-400" />,
  },
];

const aiGames = [
  {
    title: 'AI Gaming',
    desc: ' aiGame.games.0.desc',
    tags: ['#AI-NPC', '#OpenWorld'],
  },
  {
    title: 'AI Gaming',
    desc: ' aiGame.games.1.desc',
    tags: ['#AI-Companion', '#RPG'],
  },
  {
    title: 'AI Gaming',
    desc: ' aiGame.games.2.desc',
    tags: ['#Procedural', '#Sandbox'],
  },
  {
    title: 'AI Gaming',
    desc: ' aiGame.games.3.desc',
    tags: ['#AI-Story', '#Narrative'],
  },
];

export default function AIGamingPage() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');

  const structuredData = [
    {
      '@type': 'CollectionPage',
      name: isEn ? 'AI in Gaming 2026 - AI-Powered Games and NPCs' : '2026年AI游戏 - AI驱动游戏与智能NPC',
      description: isEn
        ? 'Explore how artificial intelligence is transforming gaming. AI NPCs, procedural worlds, intelligent companions, and more at GameHub.'
        : '探索人工智能如何改变游戏世界。AI NPC、程序生成世界、智能伴侣，尽在GameHub。',
    },
    {
      '@type': 'FAQPage',
      'mainEntity': [0, 1, 2, 3].map(idx => ({
        '@type': 'Question',
        'name': t(`aiGame.faq.q${idx}`),
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': t(`aiGame.faq.a${idx}`),
        },
      })),
    },
  ];

  return (
    <div className=" py-2 px-4 sm:px-6 lg:px-8">
      <SEO
        title={t('seo.aiGaming.title')}
        description={t('seo.aiGaming.description')}
        keywords={t('seo.aiGaming.keywords')}
        url={isEn ? '/en/ai-gaming' : '/cn/ai-gaming'}
        canonical="/ai-gaming"
        structuredData={structuredData}
      />

      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 mb-6 shadow-lg shadow-purple-500/20">
          <RobotOutlined className="text-4xl text-white" />
        </div>
        <Title level={1} className="!text-white !text-4xl md:!text-5xl !mb-4">
          {t('aiGame.hero.title')}
        </Title>
        <Paragraph className="text-gray-400 text-lg max-w-2xl mx-auto">
          {t('aiGame.hero.subtitle')}
        </Paragraph>
      </div>

      {/* AI Features */}
      <section className="mb-14">
        <Title level={2} className="!text-white !text-2xl !mb-6">{t('aiGame.features.title')}</Title>
        <Row gutter={[16, 16]}>
          {aiFeatures.map((f) => (
            <Col xs={12} sm={6} key={f.key}>
              <Card className="h-full bg-dark-800 border-dark-700 hover:border-purple-500/50 transition-all">
                <div className="text-center">
                  <div className="mb-3 flex justify-center">{f.icon}</div>
                  <h3 className="text-white font-semibold">{t(`aiGame.features.${f.key}.title`)}</h3>
                  <p className="text-gray-400 text-sm mt-2">{t(`aiGame.features.${f.key}.desc`)}</p>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      {/* GameHub AI Tools */}
      <section className="mb-14 p-6 bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-2xl border border-purple-800/30">
        <Title level={2} className="!text-white !text-2xl !mb-4">{t('aiGame.tools.title')}</Title>
        <Paragraph className="text-gray-300 mb-6">{t('aiGame.tools.desc')}</Paragraph>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Link to="/ai/portrait">
              <Card className="bg-dark-800/80 border-dark-700 hover:border-purple-500/50 transition-all text-center">
                <div className="text-3xl mb-2">🎨</div>
                <h3 className="text-white font-semibold">{t('aiGame.tools.portrait')}</h3>
              </Card>
            </Link>
          </Col>
          <Col xs={24} sm={8}>
            <Link to="/ai/soul">
              <Card className="bg-dark-800/80 border-dark-700 hover:border-purple-500/50 transition-all text-center">
                <div className="text-3xl mb-2">💬</div>
                <h3 className="text-white font-semibold">{t('aiGame.tools.soul')}</h3>
              </Card>
            </Link>
          </Col>
          <Col xs={24} sm={8}>
            <Link to="/ai/npc">
              <Card className="bg-dark-800/80 border-dark-700 hover:border-purple-500/50 transition-all text-center">
                <div className="text-3xl mb-2">🤖</div>
                <h3 className="text-white font-semibold">{t('aiGame.tools.npc')}</h3>
              </Card>
            </Link>
          </Col>
        </Row>
      </section>

      {/* AI Games Collection */}
      <section className="mb-14">
        <Title level={2} className="!text-white !text-2xl !mb-6">{t('aiGame.games.title')}</Title>
        <Row gutter={[16, 16]}>
          {aiGames.map((game, idx) => (
            <Col xs={24} sm={12} lg={6} key={idx}>
              <Card className="h-full bg-dark-800 border-dark-700 hover:border-primary-500/50 transition-all">
                <div className="flex flex-wrap gap-1 mb-2">
                  {game.tags.map((tag) => <Tag key={tag} color="purple">{tag}</Tag>)}
                </div>
                <p className="text-gray-400 text-sm">{t(game.desc)}</p>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      {/* Future of AI Gaming */}
      <section className="mb-14 p-6 bg-dark-800/50 rounded-2xl border border-dark-700">
        <Title level={2} className="!text-white !text-2xl !mb-4">{t('aiGame.future.title')}</Title>
        <Paragraph className="text-gray-300 leading-relaxed">{t('aiGame.future.content')}</Paragraph>
      </section>

      {/* FAQ */}
      <section className="mb-14">
        <Title level={2} className="!text-white !text-2xl !mb-6">{t('aiGame.faq.title')}</Title>
        <div className="space-y-4">
          {[0, 1, 2, 3].map((idx) => (
            <details key={idx} className="bg-dark-800 border border-dark-700 rounded-xl p-4 group cursor-pointer">
              <summary className="text-white font-medium group-open:text-purple-400 transition-colors">
                {t(`aiGame.faq.q${idx}`)}
              </summary>
              <p className="text-gray-400 mt-3 text-sm leading-relaxed">{t(`aiGame.faq.a${idx}`)}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-2">
        <Title level={3} className="!text-white !mb-3">{t('aiGame.cta.title')}</Title>
        <Paragraph className="text-gray-400 mb-6">{t('aiGame.cta.subtitle')}</Paragraph>
        <Link
          to="/ai"
          className="inline-block bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold px-8 py-3 rounded-full hover:from-purple-600 hover:to-blue-600 transition-all shadow-lg shadow-purple-500/20"
        >
          {t('aiGame.cta.button')} →
        </Link>
      </section>
    </div>
  );
}
