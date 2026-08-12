import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Typography, Card, Tag, Skeleton } from 'antd';
import { EyeOutlined, LikeOutlined, MessageOutlined, CalendarOutlined, FireOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import apiService from '../api';
import SEO from '../components/SEO';

const { Title, Paragraph, Text } = Typography;

const BlogPage = () => {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang || 'cn';
  const { t } = useTranslation();
  const [spaces, setSpaces] = useState<any[]>([]);
  const [featured, setFeatured] = useState<any[]>([]);
  const [latest, setLatest] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [sp, posts] = await Promise.all([
          apiService.getBlogSpaces(),
          apiService.getBlogPosts({ limit: 20, postType: 'blog' }),
        ]);
        setSpaces(sp || []);
        const articles = Array.isArray(posts) ? posts : [];
        // 精选：按综合热度排序
        setFeatured([...articles].sort((a, b) => (b.views + b.likes*2) - (a.views + a.likes*2)).slice(0, 4));
        // 最新：按时间排序
        setLatest([...articles].sort((a, b) => new Date(b.publishedAt || b.publishDate || 0).getTime() - new Date(a.publishedAt || a.publishDate || 0).getTime()).slice(0, 6));
      } catch { }
      setLoading(false);
    };
    load();
  }, []);

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }); } catch { return ''; }
  };

  const ArticleCard = ({ article }: { article: any }) => (
    <Link to={`/${currentLang}/blog/${article.id}`} className="block no-underline group">
      <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all hover:-translate-y-1">
        {article.coverImageUrl && (
          <div className="h-32 overflow-hidden">
            <img src={article.coverImageUrl} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
          </div>
        )}
        <div className="p-3">
          <Tag color="blue" className="text-[10px] mb-1">{article.category || '博客'}</Tag>
          <h4 className="text-white text-sm font-medium line-clamp-2 group-hover:text-blue-400 mb-2">{article.title}</h4>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span><EyeOutlined className="mr-1" />{article.views || 0}</span>
            <span><LikeOutlined className="mr-1" />{article.likes || 0}</span>
            <span><MessageOutlined className="mr-1" />{article.comments || 0}</span>
          </div>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-dark-900">
      <SEO title={t('blog.title', 'GameHub 博客空间')} description={t('blog.subtitle', '游戏专区博客')} canonical={`/${currentLang}/blog`} />

      <div className="py-6 max-w-7xl mx-auto px-4">
        <Title level={1} className="!text-white !mb-2">{t('blog.title', '博客空间')}</Title>
        <Paragraph className="!text-gray-400 !mb-8">{t('blog.subtitle', '游戏专区博客，发现你感兴趣的游戏文章')}</Paragraph>

        {/* 精选文章 */}
        {!loading && featured.length > 0 && (
          <section className="mb-10">
            <Title level={2} className="!text-white !text-xl !mb-4"><FireOutlined className="mr-2 text-orange-400" />精选文章</Title>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featured.map(a => <ArticleCard key={a.id} article={a} />)}
            </div>
          </section>
        )}

        {/* 博客空间卡片 */}
        {spaces.length > 0 && (
          <section className="mb-10">
            <Title level={2} className="!text-white !text-xl !mb-4">游戏专区</Title>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {spaces.map(s => (
                <div key={s.id} onClick={() => navigate(`/${currentLang}/blog/space/${s.slug}`)}
                  className="rounded-xl overflow-hidden cursor-pointer border-2 border-dark-600 hover:border-gray-500 transition-all hover:-translate-y-1">
                  {s.coverImageUrl ? (
                    <div className="h-40 bg-dark-700">
                      <img src={s.coverImageUrl} alt={s.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ) : (
                    <div className="h-40 bg-gradient-to-br from-dark-700 to-dark-600 flex items-center justify-center">
                      <span className="text-gray-300 text-xl font-bold">{s.name}</span>
                    </div>
                  )}
                  <div className="px-4 py-3 bg-dark-800">
                    <h3 className="text-white text-base font-bold mb-1">{s.name}</h3>
                    <p className="text-sm text-gray-400 line-clamp-1">{s.description || '游戏专区'}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 最新文章 */}
        {!loading && latest.length > 0 && (
          <section>
            <Title level={2} className="!text-white !text-xl !mb-4"><ClockCircleOutlined className="mr-2 text-blue-400" />最新文章</Title>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {latest.map(a => <ArticleCard key={a.id} article={a} />)}
            </div>
          </section>
        )}

        {loading && <div className="space-y-4">{[1,2,3].map(i=><Skeleton key={i} active paragraph={{rows:2}}/>)}</div>}
      </div>
    </div>
  );
};

export default BlogPage;
