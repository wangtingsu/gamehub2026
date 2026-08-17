import { Outlet, useNavigate, useParams, useLocation } from 'react-router-dom';
import { Typography, Card, Row, Col } from 'antd';
import {
  CommentOutlined,
  BookOutlined,
  ThunderboltOutlined,
  RobotOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';

const { Title, Paragraph } = Typography;

const aiCapabilities = [
  {
    key: 'chat',
    icon: <CommentOutlined className="text-3xl" />,
    color: '#1677ff',
    gradient: 'from-blue-500 to-cyan-500',
    path: 'soul',
  },
  {
    key: 'guides',
    icon: <BookOutlined className="text-3xl" />,
    color: '#52c41a',
    gradient: 'from-green-500 to-emerald-500',
    path: 'npc',
  },
  {
    key: 'companion',
    icon: <ThunderboltOutlined className="text-3xl" />,
    color: '#fa8c16',
    gradient: 'from-orange-500 to-amber-500',
    path: 'companion',
  },
];

const AiAssistantPage: React.FC = () => {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang || 'cn';
  const location = useLocation();
  const { t } = useTranslation();

  // If there's a sub-route, render the Outlet (detail page)
  if (location.pathname.match(/\/ai\/(soul|npc|companion)/)) {
    return (
      <div className="bg-dark-900 py-6">
        <SEO title={t('aiAssistant.seo.title')} description={t('aiAssistant.seo.description')} keywords={t('aiAssistant.seo.keywords')} />
        <div className="px-8">
          <Outlet />
        </div>
      </div>
    );
  }

  // Hub page showing all capabilities
  return (
    <div className="bg-dark-900 py-2">
      <SEO title={t('aiAssistant.seo.title')} description={t('aiAssistant.seo.description')} keywords={t('aiAssistant.seo.keywords')} />

      <div className="px-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 mb-6 shadow-lg shadow-purple-500/20">
            <RobotOutlined className="text-4xl text-white" />
          </div>
          <Title level={1} className="!text-white !text-3xl md:!text-4xl !mb-3">{t('aiAssistant.hero.title')}</Title>
          <Paragraph className="text-gray-400 text-lg max-w-2xl mx-auto">
            {t('aiAssistant.hero.subtitle')}
          </Paragraph>
        </div>

        {/* Capability Cards */}
        <Row gutter={[20, 20]}>
          {aiCapabilities.map((cap) => (
            <Col xs={24} sm={12} lg={8} key={cap.key}>
              <Card
                hoverable
                className="h-full bg-dark-800 border-dark-700 transition-all cursor-pointer hover:border-gray-500 hover:-translate-y-1"
                onClick={() => {
                  if (cap.path) {
                    navigate(`/${currentLang}/ai/${cap.path}`);
                  }
                }}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${cap.gradient} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white">{cap.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white text-lg font-semibold">{t(`aiAssistant.capabilities.${cap.key}.title`)}</h3>
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed">{t(`aiAssistant.capabilities.${cap.key}.desc`)}</p>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Quick Tips */}
        <div className="mt-10 p-6 bg-dark-800 rounded-xl border border-dark-700">
          <div className="flex items-center gap-2 mb-3">
            <BulbOutlined className="text-yellow-500 text-lg" />
            <span className="text-white font-semibold">{t('aiAssistant.tips.title')}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400">
            <div>💬 <strong className="text-gray-300">{t('aiAssistant.tips.chat')}</strong>: {t('aiAssistant.tips.chatDesc')}</div>
            <div>📖 <strong className="text-gray-300">{t('aiAssistant.tips.guides')}</strong>: {t('aiAssistant.tips.guidesDesc')}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiAssistantPage;
