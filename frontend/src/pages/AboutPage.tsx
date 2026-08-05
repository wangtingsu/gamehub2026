import { Typography, Card, Row, Col, Avatar, List, Spin, Button } from 'antd';
import {
  TeamOutlined, RocketOutlined, HeartOutlined, TrophyOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';
import { useAboutData } from '../api/hooks';
import type { AboutValue } from '../api/types';

const { Title, Paragraph } = Typography;

const iconMap: Record<string, React.ReactNode> = {
  TeamOutlined: <TeamOutlined />,
  RocketOutlined: <RocketOutlined />,
  HeartOutlined: <HeartOutlined />,
  TrophyOutlined: <TrophyOutlined />,
};

const getIcon = (iconName: string) => iconMap[iconName] || <TeamOutlined />;

const AboutPage = () => {
  const { t } = useTranslation();
  const { data: aboutData, isLoading, error, refetch: refetchAbout } = useAboutData();

  // 安全的默认值：API 数据可能为 null 或部分字段缺失
  const safeData = {
    hero: aboutData?.hero || null,
    mission: aboutData?.mission || null,
    vision: aboutData?.vision || null,
    values: aboutData?.values || [],
    teamMembers: aboutData?.teamMembers || [],
    timeline: aboutData?.timeline || [],
    contacts: aboutData?.contacts || [],
  };
  const { hero, mission, vision, values, timeline, contacts } = safeData;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-900 flex justify-center items-center">
        <Spin size="large" />
      </div>
    );
  }

  // 即使 API 不可用，也显示含默认内容的页面
  const showFallback = error || !aboutData;

  return (
    <div className="min-h-screen bg-dark-900">
      <SEO
        title={t('about.seoTitle', '关于 GameHub')}
        description={t('about.seoDescription', 'GameHub 是一个专注于游戏爱好者的社区平台')}
        keywords={t('about.seoKeywords', 'GameHub, 关于我们, 游戏社区')}
      />
      {showFallback && (
        <div className="bg-yellow-900/30 border-b border-yellow-700/50 text-yellow-200 text-center py-3 text-sm">
          {t('about.fallbackNotice', '⚠ 部分内容未加载，以下为默认展示信息。')}
          <Button type="link" size="small" icon={<ReloadOutlined />} onClick={() => refetchAbout()} className="!text-yellow-300 ml-2">
            {t('about.reload', '重新加载')}
          </Button>
        </div>
      )}
      {/* 主要内容 */}
      <div className="py-12">
        <Title level={1} className="text-center mb-4 !text-gray-100">{hero?.title || t('about.title', '关于 GameHub')}</Title>
        <Paragraph className="text-lg text-center max-w-3xl mx-auto text-gray-400 mb-12">
          {hero?.description || t('about.description', 'GameHub 是一个专注于游戏爱好者的社区平台')}
        </Paragraph>
        {/* 使命愿景 */}
        <Row gutter={[32, 32]} className="mb-16">
          <Col xs={24} lg={12}>
            <Card title={mission?.title || t('about.mission', '我们的使命')} bordered={false} className="h-full">
              <Paragraph className="text-lg text-gray-300">
                {mission?.description || t('about.missionDesc', '连接每一位游戏爱好者')}
              </Paragraph>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title={vision?.title || t('about.vision', '我们的愿景')} bordered={false} className="h-full">
              <Paragraph className="text-lg text-gray-300">
                {vision?.description || t('about.visionDesc', '成为全球最受信赖的游戏社区平台')}
              </Paragraph>
            </Card>
          </Col>
        </Row>

        {/* 核心价值 */}
        {values.length > 0 && (
          <div className="mb-16">
            <Title level={2} className="text-center mb-12">{t('about.coreValues', '核心价值')}</Title>
            <Row gutter={[24, 24]}>
              {values.map((value: AboutValue, index: number) => (
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
        {timeline.length > 0 && (
          <Card title={t('about.timeline', '发展历程')} className="mb-16">
            <List
              itemLayout="horizontal"
              dataSource={timeline}
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
          <Card title={t('about.contactUs', '联系我们')} className="text-center">
            <Paragraph className="text-lg mb-6">
              {t('about.contactDesc', '如果您有任何问题、建议或合作意向，欢迎通过以下方式联系我们：')}
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

        {/* API 不可用时显示默认联系方式 */}
        {showFallback && contacts.length === 0 && (
          <Card title={t('about.contactUs', '联系我们')} className="text-center">
            <Paragraph className="text-lg mb-6">
              {t('about.contactDesc', '如果您有任何问题、建议或合作意向，欢迎通过以下方式联系我们：')}
            </Paragraph>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <div className="p-4">
                  <div className="text-2xl font-bold text-blue-600 mb-2">{t('about.email', '电子邮件')}</div>
                  <div className="text-gray-300">support@gghubs.com</div>
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div className="p-4">
                  <div className="text-2xl font-bold text-blue-600 mb-2">{t('about.community', '社区')}</div>
                  <div className="text-gray-300">{t('about.joinDiscord', '加入我们的 Discord 社区')}</div>
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div className="p-4">
                  <div className="text-2xl font-bold text-blue-600 mb-2">{t('about.business', '商务合作')}</div>
                  <div className="text-gray-300">partner@gghubs.com</div>
                </div>
              </Col>
            </Row>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AboutPage;
