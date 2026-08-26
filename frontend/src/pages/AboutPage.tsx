import { Typography, Card, Row, Col, List } from 'antd';
import {
  TeamOutlined, RocketOutlined, HeartOutlined, TrophyOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';

const { Title, Paragraph } = Typography;

const iconMap: Record<string, React.ReactNode> = {
  TeamOutlined: <TeamOutlined />,
  RocketOutlined: <RocketOutlined />,
  HeartOutlined: <HeartOutlined />,
  TrophyOutlined: <TrophyOutlined />,
};

const getIcon = (iconName: string) => iconMap[iconName] || <TeamOutlined />;

interface AboutValueItem {
  icon: string;
  title: string;
  description: string;
}

interface AboutTimelineItem {
  year: string;
  title: string;
  description: string;
}

interface AboutContactItem {
  label: string;
  value: string;
}

const AboutPage = () => {
  const { t } = useTranslation();

  // 内容完全来自前端 locale 文件（common.json 的 about 命名空间），随语言切换
  const values = t('about.values', { returnObjects: true }) as unknown as AboutValueItem[];
  const timelineItems = t('about.timelineItems', { returnObjects: true }) as unknown as AboutTimelineItem[];
  const contacts = t('about.contacts', { returnObjects: true }) as unknown as AboutContactItem[];

  return (
    <div className="bg-dark-900">
      <SEO
        title={t('about.seoTitle')}
        description={t('about.seoDescription')}
        keywords={t('about.seoKeywords')}
      />
      {/* 主要内容 */}
      <div className="py-2">
        <Title level={1} className="text-center mb-4 !text-gray-100">{t('about.title')}</Title>
        <Paragraph className="text-lg text-center max-w-3xl mx-auto text-gray-400 mb-12">
          {t('about.heroDescription')}
        </Paragraph>
        {/* 使命愿景 */}
        <Row gutter={[32, 32]} className="mb-16">
          <Col xs={24} lg={12}>
            <Card title={t('about.mission')} bordered={false} className="h-full">
              <Paragraph className="text-lg text-gray-300">
                {t('about.missionDescription')}
              </Paragraph>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title={t('about.vision')} bordered={false} className="h-full">
              <Paragraph className="text-lg text-gray-300">
                {t('about.visionDescription')}
              </Paragraph>
            </Card>
          </Col>
        </Row>

        {/* 核心价值 */}
        {values.length > 0 && (
          <div className="mb-16">
            <Title level={2} className="text-center mb-12">{t('about.coreValues')}</Title>
            <Row gutter={[24, 24]}>
              {values.map((value, index) => (
                <Col xs={24} sm={12} lg={6} key={index}>
                  <Card className="text-center h-full hover:shadow-lg transition-shadow duration-300">
                    <div className="text-4xl text-blue-600 mb-4">{getIcon(value.icon)}</div>
                    <Title level={4}>{value.title}</Title>
                    <Paragraph className="text-gray-300">{value.description}</Paragraph>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        )}

        {/* 发展历程 */}
        {timelineItems.length > 0 && (
          <Card title={t('about.timeline')} className="mb-16">
            <List
              itemLayout="horizontal"
              dataSource={timelineItems}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={<span className="text-lg font-semibold">{item.year}</span>}
                    description={<span className="text-gray-300">{item.description || item.title}</span>}
                  />
                </List.Item>
              )}
            />
          </Card>
        )}

        {/* 联系我们 */}
        {contacts.length > 0 && (
          <Card title={t('about.contactUs')} className="text-center">
            <Paragraph className="text-lg mb-6">
              {t('about.contactDesc')}
            </Paragraph>
            <Row gutter={[16, 16]}>
              {contacts.map((contact, index) => (
                <Col xs={24} sm={8} key={index}>
                  <div className="p-4">
                    <div className="text-2xl font-bold text-blue-600 mb-2">{contact.label}</div>
                    <div className="text-gray-300">{contact.value}</div>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AboutPage;
