import { Typography, Card, Row, Col } from 'antd';
import { MailOutlined, PhoneOutlined, EnvironmentOutlined, CustomerServiceOutlined, TeamOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';

const { Title, Paragraph } = Typography;

const ContactPage = () => {
  const { t } = useTranslation();

  const contactInfo = [
    {
      icon: <MailOutlined />,
      label: t('pages.contact.emailLabel'),
      value: 'contact@gamehub.com',
    },
    {
      icon: <PhoneOutlined />,
      label: t('pages.contact.phoneLabel'),
      value: '+86 400-888-0000',
    },
    {
      icon: <EnvironmentOutlined />,
      label: t('pages.contact.addressLabel'),
      value: t('pages.contact.addressValue'),
    },
  ];

  const serviceCards = [
    {
      icon: <CustomerServiceOutlined />,
      title: t('pages.contact.customerServiceTitle'),
      description: t('pages.contact.customerServiceDescription'),
    },
    {
      icon: <TeamOutlined />,
      title: t('pages.contact.cooperationTitle'),
      description: t('pages.contact.cooperationDescription'),
    },
  ];

  return (
    <div className="bg-dark-900">
      <SEO
        title={t('pages.contact.title')}
        description={t('pages.contact.heroDescription')}
        keywords="联系我们, 客服中心, 商务合作, GGHubs联系方式, 客户服务"
      />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="text-center">
          <Title level={1} className="text-white mb-6">{t('pages.contact.heroTitle')}</Title>
          <Paragraph className="text-xl max-w-3xl mx-auto text-white/90">
            {t('pages.contact.heroDescription')}
          </Paragraph>
        </div>
      </div>

      <div className="py-2">
        {/* Service Cards */}
        <Row gutter={[32, 32]} className="mb-16">
          {serviceCards.map((item, index) => (
            <Col xs={24} md={12} key={index}>
              <Card className="text-center h-full bg-dark-800 border-dark-700 hover:shadow-lg transition-shadow duration-300">
                <div className="text-4xl text-blue-600 mb-4">{item.icon}</div>
                <Title level={3}>{item.title}</Title>
                <Paragraph className="text-gray-400">{item.description}</Paragraph>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Contact Info */}
        <Card title={t('pages.contact.title')} className="text-center bg-dark-800 border-dark-700">
          <Row gutter={[16, 16]}>
            {contactInfo.map((item, index) => (
              <Col xs={24} sm={8} key={index}>
                <div className="p-4">
                  <div className="text-3xl text-blue-600 mb-3">{item.icon}</div>
                  <div className="text-lg font-semibold text-gray-300 mb-2">{item.label}</div>
                  <div className="text-gray-400">{item.value}</div>
                </div>
              </Col>
            ))}
          </Row>
        </Card>
      </div>
    </div>
  );
};

export default ContactPage;
