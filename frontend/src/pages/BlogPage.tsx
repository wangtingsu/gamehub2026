import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, Tag, Skeleton, Avatar } from 'antd';
import { EyeOutlined, LikeOutlined, CalendarOutlined, UserOutlined, RightOutlined } from '@ant-design/icons';
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
  const [picks, setPicks] = useState<any[]>([]);     // Editor's Picks (前4篇)
  const [latest, setLatest] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const sp = await apiService.getBlogSpaces();
        const active = (sp || []).filter((s: any) => s.isActive !== false).slice(0, 6);
        setSpaces(active);

        // 每个空间取4篇
        const saMap: Record<string, any[]> = {};
        await Promise.all(active.map(async (s: any) => {
          try { const d = await apiService.getBlogPosts({ spaceId: s.id, limit: 4 }); saMap[s.id] = Array.isArray(d) ? d : []; }
          catch { saMap[s.id] = []; }
        }));
        setSpaceArticles(saMap);

        const all = await apiService.getBlogPosts({ limit: 30 });
        const articles = Array.isArray(all) ? all : [];
        const sorted = [...articles].sort((a, b) => (b.views + b.likes*2) - (a.views + a.likes*2));
        setPicks(sorted.slice(0, 7));   // 1 main + 6 side
        setLatest([...articles].sort((a, b) => new Date(b.publishedAt||b.publishDate||0).getTime() - new Date(a.publishedAt||a.publishDate||0).getTime()).slice(0, 8));
      } catch { }
      setLoading(false);
    };
    load();
  }, []);

  const fmt = (d: string) => {
    try { return new Date(d).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }); } catch { return ''; }
  };

  if (loading) return <div className="min-h-screen bg-dark-900 py-16"><div className="max-w-7xl mx-auto px-4"><Skeleton active paragraph={{rows:8}}/></div></div>;

  const mainPick = picks[0];
  const sidePicks = picks.slice(1, 7);

  return (
    <div className="min-h-screen bg-dark-900">
      <SEO title={t('blog.title', 'GameHub Blog')} description={t('blog.subtitle', '游戏专区博客')} canonical={`/${lang}/blog`} />

      <div className="py-8 max-w-7xl mx-auto px-4">
        {/* 标题 */}
        <Title level={1} className="!text-white !text-2xl md:!text-3xl !mb-2">{t('blog.title', 'GameHub Blog – News, Guides & More')}</Title>
        <Paragraph className="!text-gray-400 !mb-10">游戏攻略、评测、资讯，尽在 GameHub 博客</Paragraph>

        {/* ====== Editor's Picks ====== */}
        {mainPick && (
          <section className="mb-12">
            <Title level={2} className="!text-white !text-xl !mb-6">Editor's Picks</Title>
            <div className="flex flex-col lg:flex-row gap-4">
              {/* 主推荐文章（大卡） */}
              <Link to={`/${lang}/blog/${mainPick.id}`} className="lg:w-1/2 no-underline group block">
                <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all h-full">
                  <div className="h-64 overflow-hidden relative">
                    {mainPick.coverImageUrl ? (
                      <img src={mainPick.coverImageUrl} alt={mainPick.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center text-6xl">📰</div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <Tag color="blue" className="mb-2">{mainPick.category || '博客'}</Tag>
                    </div>
                  </div>
                  <div className="p-5">
                    <Title level={3} className="!text-white !text-lg !mb-2 group-hover:!text-blue-400 transition-colors line-clamp-2">
                      {mainPick.title}
                    </Title>
                    <Paragraph className="!text-gray-400 !text-sm line-clamp-2 !mb-3">{mainPick.excerpt || ''}</Paragraph>
                    <div className="flex items-center gap-3">
                      <Avatar size={24} icon={<UserOutlined />} className="bg-blue-600" />
                      <span className="text-gray-400 text-xs">{mainPick.authorName || mainPick.author || '匿名'}</span>
                      <span className="text-gray-600 text-xs"><CalendarOutlined className="mr-1" />{fmt(mainPick.publishedAt||mainPick.publishDate)}</span>
                    </div>
                  </div>
                </div>
              </Link>

              {/* 侧边推荐文章（小卡 x6） */}
              <div className="lg:w-1/2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sidePicks.map(a => (
                  <Link key={a.id} to={`/${lang}/blog/${a.id}`} className="no-underline group block">
                    <div className="bg-dark-800 border border-dark-700 rounded-lg p-4 hover:border-blue-500/50 transition-all hover:-translate-y-0.5 h-full">
                      <Tag color="blue" className="text-[10px] mb-1">{a.category || '博客'}</Tag>
                      <h4 className="text-white text-sm font-medium line-clamp-2 group-hover:text-blue-400 mb-1">{a.title}</h4>
                      <p className="text-gray-500 text-xs line-clamp-1 mb-2">{a.excerpt || ''}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span>{a.authorName || a.author || '匿名'}</span>
                        <span className="ml-auto">{fmt(a.publishedAt||a.publishDate)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ====== Popular Gaming Hubs ====== */}
        {spaces.length > 0 && (
          <section className="mb-12">
            <Title level={2} className="!text-white !text-xl !mb-6">Popular Gaming Hubs</Title>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {spaces.map(s => (
                <div key={s.id} onClick={() => navigate(`/${lang}/blog/space/${s.slug}`)}
                  className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden cursor-pointer hover:border-blue-500/50 transition-all hover:-translate-y-1 text-center">
                  <div className="h-20 bg-dark-700 overflow-hidden">
                    {s.coverImageUrl ? (
                      <img src={s.coverImageUrl} alt={s.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">🎮</div>
                    )}
                  </div>
                  <div className="p-2">
                    <div className="text-white text-xs font-medium truncate">{s.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ====== 游戏专区文章 ====== */}
        {spaces.map(s => spaceArticles[s.id]?.length > 0 && (
          <section key={s.id} className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <Title level={2} className="!text-white !text-lg !mb-0">{s.name}</Title>
              <Link to={`/${lang}/blog/space/${s.slug}`} className="text-blue-400 text-sm hover:text-blue-300 flex items-center gap-1">
                更多 <RightOutlined />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {spaceArticles[s.id].map((a: any) => (
                <Link key={a.id} to={`/${lang}/blog/${a.id}`} className="no-underline group block">
                  <div className="bg-dark-800 border border-dark-700 rounded-lg p-3 hover:border-blue-500/50 transition-all h-full">
                    <h5 className="text-white text-sm font-medium line-clamp-2 group-hover:text-blue-400 mb-1">{a.title}</h5>
                    <p className="text-gray-500 text-xs line-clamp-2 mb-2">{a.excerpt || ''}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <EyeOutlined />{a.views||0}
                      <LikeOutlined className="ml-2" />{a.likes||0}
                      <span className="ml-auto">{fmt(a.publishedAt||a.publishDate)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* ====== Latest Updates ====== */}
        {latest.length > 0 && (
          <section>
            <Title level={2} className="!text-white !text-xl !mb-6">Latest Updates</Title>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {latest.map(a => (
                <Link key={a.id} to={`/${lang}/blog/${a.id}`} className="no-underline group block">
                  <div className="bg-dark-800 border border-dark-700 rounded-lg p-4 hover:border-blue-500/50 transition-all flex gap-4">
                    <div className="w-28 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-dark-700">
                      {a.coverImageUrl ? (
                        <img src={a.coverImageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">📄</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Tag color="blue" className="text-[10px] mb-1">{a.category || '博客'}</Tag>
                      <h4 className="text-white text-sm font-medium line-clamp-2 group-hover:text-blue-400 mb-1">{a.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span>{a.authorName || a.author || '匿名'}</span>
                        <span className="ml-auto">{fmt(a.publishedAt||a.publishDate)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default BlogPage;
