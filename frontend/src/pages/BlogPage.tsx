import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, Card, Tag, Skeleton, Empty } from 'antd';
import { EyeOutlined, LikeOutlined, MessageOutlined, CalendarOutlined, FireOutlined, ClockCircleOutlined, RightOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import apiService from '../api';
import SEO from '../components/SEO';

const { Title, Paragraph, Text } = Typography;

const BlogPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const lang = window.location.pathname.split('/')[1] || 'cn';
  const [spaces, setSpaces] = useState<any[]>([]);
  const [spaceArticles, setSpaceArticles] = useState<Record<string, any[]>>({});
  const [featured, setFeatured] = useState<any[]>([]);
  const [latest, setLatest] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const sp = await apiService.getBlogSpaces();
        const active = (sp || []).filter((s: any) => s.isActive !== false).slice(0, 6);
        setSpaces(active);

        // 每个空间取 4 篇文章
        const saMap: Record<string, any[]> = {};
        await Promise.all(active.map(async (s: any) => {
          try {
            const data = await apiService.getBlogPosts({ spaceId: s.id, limit: 4, postType: 'blog' });
            saMap[s.id] = Array.isArray(data) ? data : [];
          } catch { saMap[s.id] = []; }
        }));
        setSpaceArticles(saMap);

        // 精选 + 最新
        const all = await apiService.getBlogPosts({ limit: 30 });
        const articles = Array.isArray(all) ? all : [];
        setFeatured([...articles].sort((a, b) => (b.views + b.likes*2) - (a.views + a.likes*2)).slice(0, 4));
        setLatest([...articles].sort((a, b) => new Date(b.publishedAt||b.publishDate||0).getTime() - new Date(a.publishedAt||a.publishDate||0).getTime()).slice(0, 10));
      } catch { }
      setLoading(false);
    };
    load();
  }, []);

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }); } catch { return ''; }
  };

  // 文章卡片（带封面图，用于精选和最新）
  const ArticleCard = ({ article }: { article: any }) => (
    <Link to={`/${lang}/blog/${article.id}`} className="block no-underline group">
      <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all hover:-translate-y-1 h-full">
        <div className="h-36 overflow-hidden">
          {article.coverImageUrl ? (
            <img src={article.coverImageUrl} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
          ) : (
            <div className="w-full h-full bg-dark-700 flex items-center justify-center text-gray-500 text-4xl">📄</div>
          )}
        </div>
        <div className="p-3">
          <div className="flex items-center gap-1 mb-1">
            {article.postType === 'review' ? <Tag color="green" className="text-[10px]">评测</Tag>
              : article.postType === 'guide' ? <Tag color="purple" className="text-[10px]">攻略</Tag>
              : <Tag color="blue" className="text-[10px]">博客</Tag>}
            {article.category && <span className="text-gray-500 text-[10px]">{article.category}</span>}
          </div>
          <h4 className="text-white text-sm font-medium line-clamp-2 group-hover:text-blue-400 mb-2">{article.title}</h4>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span><EyeOutlined className="mr-1" />{article.views || 0}</span>
            <span><LikeOutlined className="mr-1" />{article.likes || 0}</span>
          </div>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-dark-900">
      <SEO title={t('blog.title', 'GameHub 博客空间')} description={t('blog.subtitle', '游戏专区博客')} canonical={`/${lang}/blog`} />

      <div className="py-6 max-w-7xl mx-auto px-4">
        <Title level={1} className="!text-white !mb-2">{t('blog.title', '博客空间')}</Title>
        <Paragraph className="!text-gray-400 !mb-8">{t('blog.subtitle', '游戏专区博客，发现你感兴趣的游戏文章')}</Paragraph>

        {/* 1. 精选文章 */}
        {!loading && featured.length > 0 && (
          <section className="mb-10">
            <Title level={2} className="!text-white !text-xl !mb-4"><FireOutlined className="mr-2 text-orange-400" />精选文章</Title>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featured.map(a => <ArticleCard key={a.id} article={a} />)}
            </div>
          </section>
        )}

        {/* 2. 博客空间 + 各自4篇文章 */}
        {!loading && spaces.length > 0 && (
          <section className="mb-10">
            <Title level={2} className="!text-white !text-xl !mb-4">游戏专区</Title>
            {spaces.map(s => (
              <div key={s.id} className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {s.coverImageUrl ? (
                      <img src={s.coverImageUrl} alt={s.name} className="w-6 h-6 rounded object-cover" />
                    ) : <span className="text-lg">{'🎮'}</span>}
                    <Title level={3} className="!text-white !text-lg !mb-0">{s.name}</Title>
                    <Text className="!text-gray-500 !text-xs">{s.description}</Text>
                  </div>
                  <Link to={`/${lang}/blog/space/${s.slug}`} className="text-blue-400 text-sm hover:text-blue-300 flex items-center gap-1">
                    更多 <RightOutlined />
                  </Link>
                </div>
                {spaceArticles[s.id]?.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {spaceArticles[s.id].map((a: any) => (
                      <Link key={a.id} to={`/${lang}/blog/${a.id}`} className="block no-underline group">
                        <div className="bg-dark-800 border border-dark-700 rounded-lg p-3 hover:border-blue-500/50 transition-all hover:-translate-y-0.5">
                          <h5 className="text-white text-sm font-medium line-clamp-2 group-hover:text-blue-400 mb-2">{a.title}</h5>
                          <p className="text-gray-500 text-xs line-clamp-2 mb-2">{a.excerpt || ''}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-600">
                            <span><EyeOutlined className="mr-1" />{a.views||0}</span>
                            <span><LikeOutlined className="mr-1" />{a.likes||0}</span>
                            <span className="ml-auto"><CalendarOutlined className="mr-1" />{formatDate(a.publishedAt||a.publishDate)}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Empty description="暂无文章" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </div>
            ))}
          </section>
        )}

        {/* 3. 最新文章（2列，每篇有封面图） */}
        {!loading && latest.length > 0 && (
          <section>
            <Title level={2} className="!text-white !text-xl !mb-4"><ClockCircleOutlined className="mr-2 text-blue-400" />最新文章</Title>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {latest.map(a => (
                <Link key={a.id} to={`/${lang}/blog/${a.id}`} className="block no-underline group">
                  <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all hover:-translate-y-1 flex h-36">
                    <div className="w-40 flex-shrink-0 overflow-hidden">
                      {a.coverImageUrl ? (
                        <img src={a.coverImageUrl} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-dark-700 flex items-center justify-center text-4xl">📄</div>
                      )}
                    </div>
                    <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
                      <div className="flex items-center gap-1 mb-1">
                        {a.postType === 'review' ? <Tag color="green" className="text-[10px]">评测</Tag>
                          : a.postType === 'guide' ? <Tag color="purple" className="text-[10px]">攻略</Tag>
                          : <Tag color="blue" className="text-[10px]">博客</Tag>}
                        <span className="text-gray-500 text-[10px] truncate">{a.spaceName || a.category || ''}</span>
                      </div>
                      <h4 className="text-white text-base font-medium line-clamp-2 group-hover:text-blue-400 mb-1">{a.title}</h4>
                      <p className="text-gray-500 text-xs line-clamp-1 mb-2">{a.excerpt || ''}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <span><EyeOutlined className="mr-1" />{a.views||0}</span>
                        <span><LikeOutlined className="mr-1" />{a.likes||0}</span>
                        <span><MessageOutlined className="mr-1" />{a.comments||0}</span>
                        <span className="ml-auto"><CalendarOutlined className="mr-1" />{formatDate(a.publishedAt||a.publishDate)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {loading && <div className="space-y-4">{[1,2,3].map(i=><Skeleton key={i} active paragraph={{rows:3}}/>)}</div>}
      </div>
    </div>
  );
};

export default BlogPage;
