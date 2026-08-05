import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Typography, Input, Button } from 'antd';
import { SearchOutlined, EditOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';

const { Title } = Typography;

const BlogPage = () => {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang || 'cn';
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const [spaces, setSpaces] = useState<any[]>([]);

  useEffect(() => { import('../api').then(m => m.default.getBlogSpaces().then(d => setSpaces(d||[]))); }, []);

  return (
    <div className="min-h-screen bg-dark-900">
      <SEO title={t('blog.title', 'GameHub 博客空间')} description={t('blog.subtitle', '游戏专区博客')} canonical={`/${currentLang}/blog`} />

      <div className="px-8 py-2">
        <div className="flex items-center justify-between mb-2">
          <Title level={1} className="!text-gray-100">{t('blog.title', '博客空间')}</Title>
        </div>
        <p className="text-gray-400 mb-4">{t('blog.subtitle', '游戏专区博客，发现你感兴趣的游戏文章')}</p>

        {/* 空间卡片 */}
        {spaces.length > 0 && (
          <div className="mb-8">
            <Title level={2} className="!text-gray-100 !text-lg mb-4">{t('blog.gameSection', '游戏专区')}</Title>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {spaces.map(s => (
                <div key={s.id} onClick={() => navigate(`/${currentLang}/blog/space/${s.slug}`)}
                  className="rounded-xl overflow-hidden cursor-pointer border-2 border-dark-600 hover:border-gray-500 transition-all hover:-translate-y-1">
                  {s.coverImageUrl ? (
                    <div className="h-48 bg-dark-700">
                      <img src={s.coverImageUrl} alt={s.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ) : (
                    <div className="h-48 bg-gradient-to-br from-dark-700 to-dark-600 flex items-center justify-center">
                      <span className="text-gray-300 text-xl font-bold">{s.name}</span>
                    </div>
                  )}
                  <div className="px-5 py-4 bg-dark-800">
                    <h3 className="text-white text-lg font-bold mb-1">{s.name}</h3>
                    <p className="text-sm text-gray-400 line-clamp-2">{s.description || t('blog.gameSection', '游戏专区')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogPage;
