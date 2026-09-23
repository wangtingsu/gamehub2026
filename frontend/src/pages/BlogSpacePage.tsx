import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Typography, Skeleton, Alert, Empty, Tag, Avatar, Input, Pagination } from 'antd';
import { SearchOutlined, EyeOutlined, LikeOutlined, CalendarOutlined, UserOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import apiService from '../api';
import { useDebounce } from '../hooks/useDebounce';
import SEO from '../components/SEO';
import SEOBreadcrumb from '../components/SEOBreadcrumb';

const { Title } = Typography;

const PAGE_SIZE = 10;

const TYPE_TAG_COLOR: Record<string, string> = {
  blog: 'blue',
  guide: 'purple',
  review: 'green',
};

const BlogSpacePage = () => {
  const { slug, lang } = useParams<{ slug: string; lang: string }>();
  const { t } = useTranslation();
  const currentLang = lang || 'cn';

  const [space, setSpace] = useState<any>(null);
  const [featured, setFeatured] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [postType, setPostType] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedSearchText = useDebounce(searchText, 300);

  // 加载空间详情 + 精选（最新 4 篇）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const detail = await apiService.getSpaceDetail(slug || '');
        if (cancelled) return;
        if (!detail) { setError(t('blog.space.notFound', '空间不存在')); setLoading(false); return; }
        setSpace(detail);
        if (detail.id) {
          const res = await apiService.getSpaceContent(detail.id, { limit: 4 });
          if (!cancelled) setFeatured(res?.articles || []);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || t('blog.space.loadFailed', '加载失败'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  // 加载列表（分页 / 分类 / 搜索）
  useEffect(() => {
    if (!space?.id) return;
    let cancelled = false;
    setListLoading(true);
    apiService.getSpaceContent(space.id, {
      page,
      limit: PAGE_SIZE,
      postType: postType === 'all' ? undefined : postType,
      search: debouncedSearchText.trim() || undefined,
    }).then((res: any) => {
      if (!cancelled) { setArticles(res?.articles || []); setTotal(res?.total || 0); }
    }).catch(() => {
      if (!cancelled) { setArticles([]); setTotal(0); }
    }).finally(() => {
      if (!cancelled) setListLoading(false);
    });
    return () => { cancelled = true; };
  }, [space?.id, page, postType, debouncedSearchText]);

  // 切换分类/搜索时回到第一页
  useEffect(() => { setPage(1); }, [postType, debouncedSearchText]);

  const fmt = (d: string) => {
    try { return new Date(d).toLocaleDateString(currentLang === 'cn' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch { return d || ''; }
  };

  const typeLabel = (type: string) =>
    type === 'review' ? t('blog.space.tabLabels.review', '评测')
      : type === 'guide' ? t('blog.space.tabLabels.guide', '攻略')
      : t('blog.space.tabLabels.blog', '博客');

  const tabs = [
    { key: 'all', label: t('blog.space.all', '全部') },
    { key: 'blog', label: t('blog.space.tabLabels.blog', '博客') },
    { key: 'guide', label: t('blog.space.tabLabels.guide', '攻略') },
    { key: 'review', label: t('blog.space.tabLabels.review', '评测') },
  ];

  const mainFeatured = featured[0];
  const sideFeatured = featured.slice(1, 4);

  if (loading) {
    return <div className="bg-dark-900 pb-2"><div className="max-w-[1600px] mx-auto px-4 py-16"><Skeleton active paragraph={{ rows: 10 }} /></div></div>;
  }

  if (error && !space) {
    return (
      <div className="bg-dark-900 pb-2"><div className="max-w-[1600px] mx-auto px-4 py-16">
        <Alert type="error" message={t('blog.space.loadFailed', '加载失败')} description={error} showIcon
          action={<Link to={`/${currentLang}/blog`}>{t('blog.space.retry', '返回博客')}</Link>} />
      </div></div>
    );
  }

  return (
    <div className="bg-dark-900 pb-2">
      <SEO title={`${space?.name || slug} | GameHub ${t('blog.title', '博客空间')}`} description={space?.description || ''} canonical={`/${currentLang}/blog/space/${slug}`} />
      <SEOBreadcrumb items={[
        { name: t('breadcrumb.home', '首页'), url: `/${currentLang}` },
        { name: t('breadcrumb.blog', '博客'), url: `/${currentLang}/blog` },
        { name: space?.name || slug, url: `/${currentLang}/blog/space/${slug}` },
      ]} />

      {/* ====== Hero ====== */}
      <div className="relative w-full overflow-hidden min-h-[280px]">
        {space?.coverImageUrl ? (
          <img src={space.coverImageUrl} alt={space?.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-dark-800 via-dark-900 to-primary-900/40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/70 to-dark-900/30" />
        <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 py-16 md:py-20 flex flex-col items-center text-center">
          <h1 className="text-white text-3xl sm:text-4xl md:text-5xl font-bold mb-4" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>{space?.name || slug}</h1>
          {space?.description && <p className="text-gray-200 max-w-2xl mb-8">{space.description}</p>}
          <div className="w-full max-w-md">
            <Input
              size="large"
              prefix={<SearchOutlined className="text-gray-400" />}
              placeholder={t('blog.space.searchPlaceholder', '搜索文章标题...')}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              allowClear
              className="bg-white/95 rounded-lg"
            />
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-8">
        {/* 可见面包屑 */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to={`/${currentLang}`} className="hover:text-white">{t('breadcrumb.home', '首页')}</Link>
          <span>/</span>
          <Link to={`/${currentLang}/blog`} className="hover:text-white">{t('breadcrumb.blog', '博客')}</Link>
          <span>/</span>
          <span className="text-white">{space?.name || slug}</span>
        </div>

        {/* ====== 精选区（1 主 + 3 侧） ====== */}
        {mainFeatured && (
          <section className="mb-10">
            <Title level={2} className="!text-white !text-xl !mb-6">{t('blog.space.featured', '精选')}</Title>
            <div className="flex flex-col lg:flex-row gap-4">
              {/* 主卡 */}
              <Link to={`/${currentLang}/blog/${mainFeatured.slug || mainFeatured.id}`} className={`${sideFeatured.length ? 'lg:w-1/2' : 'lg:w-full'} no-underline group block`}>
                <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all h-full">
                  <div className="h-72 overflow-hidden relative">
                    {mainFeatured.coverImageUrl ? (
                      <img src={mainFeatured.coverImageUrl} alt={mainFeatured.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center text-6xl">📰</div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 to-transparent p-4 flex items-end justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar size={28} icon={<UserOutlined />} className="bg-blue-600" />
                        <span className="text-white text-sm">{mainFeatured.authorDisplayName || mainFeatured.authorName || t('blog.anonymous', '匿名')}</span>
                      </div>
                      <Tag color={TYPE_TAG_COLOR[mainFeatured.blogArticleType] || 'blue'}>{typeLabel(mainFeatured.blogArticleType)}</Tag>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-white text-lg font-semibold group-hover:text-blue-400 transition-colors line-clamp-2 mb-2">{mainFeatured.title}</h3>
                    <p className="text-gray-400 text-sm line-clamp-2 mb-3">{mainFeatured.excerpt || ''}</p>
                    <div className="text-xs text-gray-500">{t('blog.space.lastUpdated', '更新时间')} {fmt(mainFeatured.publishDate || mainFeatured.createdAt)}</div>
                  </div>
                </div>
              </Link>

              {/* 侧卡 x3 */}
              {sideFeatured.length > 0 && (
              <div className="lg:w-1/2 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
                {sideFeatured.map((a: any) => (
                  <Link key={a.id} to={`/${currentLang}/blog/${a.slug || a.id}`} className="no-underline group block">
                    <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all hover:-translate-y-0.5 h-full flex sm:flex-col">
                      <div className="w-32 sm:w-full h-full sm:h-32 flex-shrink-0 bg-dark-700 overflow-hidden">
                        {a.coverImageUrl ? <img src={a.coverImageUrl} alt={a.title || 'Blog article'} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-2xl">📄</div>}
                      </div>
                      <div className="flex-1 p-3 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Avatar size={18} icon={<UserOutlined />} className="bg-blue-600" />
                          <span className="text-gray-400 text-xs truncate">{a.authorDisplayName || a.authorName || t('blog.anonymous', '匿名')}</span>
                        </div>
                        <h4 className="text-white text-sm font-medium line-clamp-2 group-hover:text-blue-400">{a.title}</h4>
                        <div className="text-gray-600 text-xs mt-1">{t('blog.space.lastUpdated', '更新时间')} {fmt(a.publishDate || a.createdAt)}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              )}
            </div>
          </section>
        )}

        {/* ====== 分类 Tab ====== */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setPostType(tab.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${postType === tab.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-dark-800 text-gray-300 border-dark-700 hover:border-blue-500/50'}`}
            >
              {tab.label}
              {tab.key !== 'all' && space?.typeCounts?.[tab.key] !== undefined && (
                <span className="ml-1.5 text-xs opacity-70">({space.typeCounts[tab.key]})</span>
              )}
            </button>
          ))}
        </div>

        {/* ====== 文章列表 ====== */}
        {listLoading ? (
          <div className="space-y-3">
            <Skeleton active paragraph={{ rows: 3 }} />
            <Skeleton active paragraph={{ rows: 3 }} />
          </div>
        ) : articles.length === 0 ? (
          <Empty description={debouncedSearchText.trim() ? t('blog.space.searchEmpty', '未找到相关文章') : t('blog.space.noArticles', '暂无文章')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div className="space-y-3 mb-8">
            {articles.map((a: any) => (
              <Link key={a.id} to={`/${currentLang}/blog/${a.slug || a.id}`} className="no-underline group block">
                <div className="bg-dark-800 border border-dark-700 rounded-xl p-4 hover:border-blue-500/50 transition-all flex gap-4 items-center">
                  <div className="w-24 h-16 sm:w-32 sm:h-20 flex-shrink-0 rounded-lg overflow-hidden bg-dark-700">
                    {a.coverImageUrl ? (
                      <img src={a.coverImageUrl} alt={a.title || 'Blog article'} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">📄</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Tag color={TYPE_TAG_COLOR[a.blogArticleType] || 'blue'} className="text-[10px]">{typeLabel(a.blogArticleType)}</Tag>
                      <span className="text-gray-500 text-xs flex items-center gap-1"><UserOutlined />{a.authorDisplayName || a.authorName || t('blog.anonymous', '匿名')}</span>
                    </div>
                    <h3 className="text-white text-base font-medium line-clamp-1 group-hover:text-blue-400 mb-1">{a.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span className="flex items-center gap-1"><EyeOutlined />{a.views || 0}</span>
                      <span className="flex items-center gap-1"><LikeOutlined />{a.likes || 0}</span>
                      <span className="flex items-center gap-1"><CalendarOutlined />{fmt(a.publishDate || a.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* ====== 分页 ====== */}
        {total > PAGE_SIZE && (
          <div className="flex justify-center pb-10">
            <Pagination current={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} showSizeChanger={false} />
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogSpacePage;
