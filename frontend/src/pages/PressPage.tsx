import { Typography, Card, Row, Col } from 'antd';
import { FileTextOutlined, DownloadOutlined, MailOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';

const { Title, Paragraph } = Typography;

const PressPage = () => {
  const { t } = useTranslation();

  const sections = [
    {
      icon: <FileTextOutlined />,
      title: t('pages.press.latestNewsTitle'),
      description: t('pages.press.heroDescription'),
    },
    {
      icon: <DownloadOutlined />,
      title: t('pages.press.pressKitTitle'),
      description: t('pages.press.pressKitDescription'),
    },
    {
      icon: <MailOutlined />,
      title: t('pages.press.contactTitle'),
      description: t('pages.press.contactDescription'),
    },
  ];

  return (
    <div className="min-h-screen bg-dark-900">
      <SEO
        title={t('pages.press.title')}
        description={t('pages.press.heroDescription')}
        keywords="新闻中心, GameHub新闻, 媒体资源, 品牌资料, 游戏平台"
      />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="text-center">
          <Title level={1} className="text-white mb-6">{t('pages.press.heroTitle')}</Title>
          <Paragraph className="text-xl max-w-3xl mx-auto text-white/90">
            {t('pages.press.heroDescription')}
          </Paragraph>
        </div>
      </div>

      <div className="py-12">
        <Row gutter={[32, 32]}>
          {sections.map((section, index) => (
            <Col xs={24} md={8} key={index}>
              <Card className="text-center h-full bg-dark-800 border-dark-700 hover:shadow-lg transition-shadow duration-300">
                <div className="text-4xl text-blue-600 mb-4">{section.icon}</div>
                <Title level={3}>{section.title}</Title>
                <Paragraph className="text-gray-400">{section.description}</Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  );
};

export default PressPage;
