import { Typography, Divider } from 'antd';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';

const { Title, Paragraph } = Typography;

interface LegalPageProps {
  pageKey: 'privacy' | 'terms' | 'cookies' | 'codeOfConduct';
}

const LegalPage = ({ pageKey }: LegalPageProps) => {
  const { t } = useTranslation();
  const basePath = `pages.legal.${pageKey}`;
  const sections = t(`${basePath}.sections`, { returnObjects: true }) as Array<{ title: string; content: string }>;

  return (
    <div className="min-h-screen bg-dark-900">
      <SEO title={t(`${basePath}.title`)} description={t(`${basePath}.title`)} keywords="隐私政策, 使用条款, Cookie政策, 行为准则, 法律条款, GameHub法律" />

      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Title level={1} className="text-white mb-4">{t(`${basePath}.title`)}</Title>
          <Paragraph className="text-white/80 text-lg">{t(`${basePath}.lastUpdated`)}</Paragraph>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-dark-800 border border-dark-700 rounded-lg shadow-sm p-8">
          {sections?.map((section, index) => (
            <div key={index}>
              <Title level={2} className="text-gray-800">{section.title}</Title>
              <Paragraph className="text-gray-400 leading-relaxed">{section.content}</Paragraph>
              {index < sections.length - 1 && <Divider />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LegalPage;
