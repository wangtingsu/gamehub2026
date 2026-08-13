import { Typography, Card, Row, Col } from 'antd';
import { TeamOutlined, RocketOutlined, HeartOutlined, TrophyOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';

const { Title, Paragraph } = Typography;

const CareersPage = () => {
  const { t } = useTranslation();

  const values = [
    { icon: <TeamOutlined />, key: 'value1' },
    { icon: <RocketOutlined />, key: 'value2' },
    { icon: <HeartOutlined />, key: 'value3' },
    { icon: <TrophyOutlined />, key: 'value4' },
  ];

  return (
    <div className="bg-dark-900">
      <SEO
        title={t('pages.careers.title')}
        description={t('pages.careers.heroDescription')}
        keywords="加入我们, GameHub招聘, 游戏社区, 工作机会, 技术岗位"
      />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="text-center">
          <Title level={1} className="text-white mb-6">{t('pages.careers.heroTitle')}</Title>
          <Paragraph className="text-xl max-w-3xl mx-auto text-white/90">
            {t('pages.careers.heroDescription')}
          </Paragraph>
        </div>
      </div>

      <div className="py-2">
        {/* Why Join Us */}
        <div className="mb-16">
          <Card variant="borderless" className="bg-dark-800 border border-dark-700">
            <Title level={2} className="text-center mb-6">{t('pages.careers.whyJoinTitle')}</Title>
            <Paragraph className="text-lg text-gray-300 text-center max-w-4xl mx-auto">
              {t('pages.careers.whyJoinDescription')}
            </Paragraph>
          </Card>
        </div>

        {/* Values */}
        <div className="mb-16">
          <Title level={2} className="text-center mb-12">{t('pages.careers.valuesTitle')}</Title>
          <Row gutter={[24, 24]}>
            {values.map((value, index) => (
              <Col xs={24} sm={12} lg={6} key={index}>
                <Card className="text-center h-full bg-dark-800 border-dark-700 hover:shadow-lg transition-shadow duration-300">
                  <div className="text-4xl text-blue-600 mb-4">{value.icon}</div>
                  <Paragraph className="text-gray-400">{t(`pages.careers.${value.key}`)}</Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        {/* Openings */}
        <div className="text-center">
          <Card variant="borderless" className="bg-dark-800 border border-dark-700">
            <Title level={3} className="mb-4">{t('pages.careers.openingsTitle')}</Title>
            <Paragraph className="text-gray-400 text-lg">
              {t('pages.careers.noOpenings')}
            </Paragraph>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CareersPage;
