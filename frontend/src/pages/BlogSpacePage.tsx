import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Typography, Skeleton, Alert, Empty, Tag, Button, Avatar, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeftOutlined, EyeOutlined, LikeOutlined, MessageOutlined,
  RightOutlined, CalendarOutlined, UserOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import apiService from '../api';
import SEO from '../components/SEO';
import BlogRenderContent from '../components/blog/BlogRenderContent';

const { Title, Text, Paragraph } = Typography;

const BlogSpacePage = () => {
  const { slug, lang } = useParams<{ slug: string; lang: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const currentLang = lang || 'cn';
  const CATEGORIES = [
    { key: 'blog', label: t('blog.space.tabLabels.blog', '博客'), icon: '📝', color: '#3b82f6' },
    { key: 'guide', label: t('blog.space.tabLabels.guide', '攻略'), icon: '📖', color: '#8b5cf6' },
    { key: 'review', label: t('blog.space.tabLabels.review', '评测'), icon: '⭐', color: '#10b981' },
  ];

  const [space, setSpace] = useState<any>(null);
  const [activeArticle, setActiveArticle] = useState<any>(null); // 当前展示的文章
  const [articleLoading, setArticleLoading] = useState(false);
  const [relatedSpaces, setRelatedSpaces] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rightHeight, setRightHeight] = useState<number>(0);
  const [searchText, setSearchText] = useState('');
  const leftRef = useRef<HTMLDivElement>(null);

  // 加载文章完整内容
  const loadArticle = useCallback(async (articleId: string) => {
    setArticleLoading(true);
    try {
      const detail = await apiService.getBlogPost(articleId);
      setActiveArticle(detail);
    } catch { /* ignore */ }
    finally { setArticleLoading(false); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError(null); setSearchText('');
      try {
        const [detail, spaces] = await Promise.all([
          apiService.getSpaceDetail(slug || ''),
          apiService.getBlogSpaces(),
        ]);
        if (cancelled) return;
        if (!detail) { setError(t('blog.space.notFound', '空间不存在')); setLoading(false); return; }
        setSpace(detail);
        const related = (spaces || []).filter((s: any) => s.slug !== slug);
        setRelatedSpaces(related);

        // 加载默认热门文章 + 各分类文章
        if (detail.id) {
          const pop = await apiService.getSpacePopularArticle(detail.id);
          if (!cancelled && pop) {
            setActiveArticle(pop);
            loadArticle(pop.id);
          }

          const catResults: Record<string, any[]> = {};
          const popId = pop?.id;
          await Promise.all(CATEGORIES.map(async (cat) => {
            const res = await apiService.getSpaceArticlesByCategory(detail.id, cat.key, { limit: 6 });
            let list = res.articles || [];
            if (popId) list = list.filter((a: any) => a.id !== popId);
            if (!cancelled) catResults[cat.key] = list.slice(0, 5);
          }));
          if (!cancelled) setCategoryData(catResults);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || t('blog.space.loadFailed', '加载失败'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [slug]);

  // 同步右侧高度到左侧
  useEffect(() => {
    if (!leftRef.current) return;
    const obs = new ResizeObserver(() => {
      if (leftRef.current) setRightHeight(leftRef.current.offsetHeight);
    });
    obs.observe(leftRef.current);
    return () => obs.disconnect();
  }, [activeArticle, articleLoading]);

  const handleArticleClick = async (article: any) => {
    setActiveArticle(article);
    loadArticle(article.id);
    // 重新拉取分类列表（排除当前选中文章）
    if (space?.id) {
      const catResults: Record<string, any[]> = {};
      await Promise.all(CATEGORIES.map(async (cat) => {
        const res = await apiService.getSpaceArticlesByCategory(space.id, cat.key, { limit: 6 });
        catResults[cat.key] = (res.articles || []).filter((a: any) => a.id !== article.id).slice(0, 5);
      }));
      setCategoryData(catResults);
    }
    document.getElementById('article-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch { return d || ''; };
  };

  // ---- 分类横向列表 ----
  const renderCategorySection = (cat: typeof CATEGORIES[0]) => {
    const articles = (categoryData[cat.key] || [])
      .filter((a: any) => a.id !== activeArticle?.id)
      .filter((a: any) => !searchText || a.title?.toLowerCase().includes(searchText.toLowerCase()));
    const hasContent = !loading && articles.length > 0;
    const isEmpty = !loading && articles.length === 0;

    return (
      <div key={cat.key} className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Title level={3} className="!text-white !mb-0 !text-lg">
            <span className="mr-2">{cat.icon}</span>{cat.label}
            {space?.typeCounts?.[cat.key] ? <Text className="!text-gray-500 !text-sm ml-2">({space.typeCounts[cat.key]})</Text> : null}
          </Title>
          {(hasContent || loading) && (
            <Link to={`/${currentLang}/blog/space/${slug}/category/${cat.key}`}
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
              查看全部 <RightOutlined />
            </Link>
          )}
        </div>
        {loading ? (
          <div className="grid grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i}><Skeleton active paragraph={{ rows: 3 }} /></div>
            ))}
          </div>
        ) : isEmpty ? (
          <Empty description={t('blog.space.noArticles', '暂无文章')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div className="grid grid-cols-5 gap-4">
            {articles.map((article: any) => {
              const isActive = activeArticle?.id === article.id;
              return (
                <div
                  key={article.id}
                  onClick={() => handleArticleClick(article)}
                  className={`rounded-xl p-4 cursor-pointer transition-all hover:-translate-y-1 border-2 ${
                    isActive
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-dark-700 bg-dark-800 hover:border-blue-500/50'
                  }`}
                >
                  {(article.coverImageUrl || article.coverImage) && (
                    <div className="w-full h-28 rounded-lg overflow-hidden mb-2">
                      <img src={article.coverImageUrl || article.coverImage} alt={article.title}
                        className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  )}
                  <h4 className="text-white font-semibold text-sm line-clamp-2 mb-2 hover:text-blue-400">{article.title}</h4>
                  <p className="text-gray-400 text-xs line-clamp-2 mb-3">{article.excerpt || ''}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span><EyeOutlined className="mr-1" />{article.views || 0}</span>
                    <span><LikeOutlined className="mr-1" />{article.likes || 0}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ====== 渲染 ======
  return (
    <div className="min-h-screen bg-dark-900">
      <SEO title={`${space?.name || slug} | GameHub 博客空间`} description={space?.description || ''} canonical={`/${currentLang}/blog/space/${slug}`} />

      <div className="py-6">
        <Button type="text" className="!text-gray-400 hover:!text-white !pl-0 mb-4" icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/${currentLang}/blog`)}>返回博客首页</Button>

        <div className="mb-6">
          <Title level={1} className="!text-white !mb-2">{space?.name || slug}</Title>
          {space?.description && <Paragraph className="!text-gray-400">{space.description}</Paragraph>}
          {space?.totalArticles !== undefined && (
            <Text className="!text-gray-500">共 {space.totalArticles} 篇文章</Text>
          )}
        </div>

        {/* 搜索框 */}
        <div className="mb-6">
          <Input
            size="large"
            placeholder={t('blog.space.searchPlaceholder', '搜索文章标题...')}
            prefix={<SearchOutlined className="text-gray-400" />}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            allowClear
            className="max-w-md"
          />
        </div>

        {error && (
          <Alert type="error" message={t('blog.space.loadFailed', '加载失败')} description={error} showIcon className="mb-6"
            action={<Button onClick={() => window.location.reload()}>{t('blog.space.retry', '重试')}</Button>} />
        )}

        {/* 文章内容 + 相关空间（等高） */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8 lg:items-start">
          {/* 左：完整文章内容 */}
          <div ref={leftRef} className="lg:w-3/4 bg-dark-800 border border-dark-700 rounded-xl p-6" id="article-content">
            {loading || articleLoading ? (
              <Skeleton active avatar paragraph={{ rows: 8 }} />
            ) : !activeArticle ? (
              <Empty description={t('blog.space.noArticles', '暂无文章')} />
            ) : (
              <>
                {/* 文章元信息 */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <Tag color="blue">{activeArticle.postType === 'review' ? t('blog.space.tabLabels.review', '评测') : activeArticle.postType === 'guide' ? t('blog.space.tabLabels.guide', '攻略') : t('blog.space.tabLabels.blog', '博客')}</Tag>
                  {activeArticle.category && <Tag>{activeArticle.category}</Tag>}
                  {activeArticle.rating != null && <Tag color="gold">⭐ {activeArticle.rating}</Tag>}
                </div>
                <Title level={2} className="!text-white !mb-4">{activeArticle.title}</Title>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-6 pb-6 border-b border-dark-700">
                  <div className="flex items-center gap-2">
                    <Avatar size="small" icon={<UserOutlined />} className="bg-blue-600" />
                    <Text className="!text-gray-300">{activeArticle.authorName || activeArticle.author}</Text>
                  </div>
                  <span><CalendarOutlined /> {formatDate(activeArticle.publishedAt || activeArticle.publishDate)}</span>
                  <span><ClockCircleOutlined /> {activeArticle.readingTime || Math.max(1, Math.ceil((activeArticle.content?.length || 0) / 500))} 分钟阅读</span>
                </div>
                <div className="flex items-center gap-4 px-4 py-3 bg-dark-750 rounded-lg mb-6">
                  <span><EyeOutlined className="text-blue-400 mr-1" />{activeArticle.views || 0} 浏览</span>
                  <span><LikeOutlined className="text-red-400 mr-1" />{activeArticle.likes || 0} 赞</span>
                  <span><MessageOutlined className="text-green-400 mr-1" />{activeArticle.comments || 0} 评论</span>
                </div>
                {/* 封面图 */}
                {(activeArticle.coverImageUrl || activeArticle.coverImage) && (
                  <div className="mb-6 rounded-xl overflow-hidden">
                    <img src={activeArticle.coverImageUrl || activeArticle.coverImage} alt={activeArticle.title}
                      className="w-full max-h-96 object-cover" />
                  </div>
                )}
                {/* 完整文章内容 */}
                <article className="blog-content">
                  <BlogRenderContent content={activeArticle.content} />
                </article>
                {/* 标签 */}
                {activeArticle.tags && activeArticle.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-dark-700">
                    {activeArticle.tags.map((tag: string) => <Tag key={tag} className="bg-dark-700 text-gray-300 border-0">{tag}</Tag>)}
                  </div>
                )}
              </>
            )}
          </div>
          {/* 右：相关空间 */}
          <div className="lg:w-1/4 bg-dark-800 border border-dark-700 rounded-xl p-4 flex flex-col overflow-hidden space-scroll self-stretch"
            style={{ maxHeight: rightHeight || undefined }}>
            <Title level={3} className="!text-white !mb-4 !text-lg flex-shrink-0">🎮 探索更多空间</Title>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} active paragraph={{ rows: 1 }} />)}
              </div>
            ) : relatedSpaces.length === 0 ? (
              <Empty description={t('blog.space.noOtherSpaces', '暂无其他空间')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto space-scroll pr-1">
                {relatedSpaces.map((s: any) => (
                  <div key={s.id} onClick={() => navigate(`/${currentLang}/blog/space/${s.slug}`)}
                    className="cursor-pointer rounded-lg overflow-hidden border border-dark-600 hover:border-blue-500/50 transition-all hover:-translate-y-0.5">
                    {s.coverImageUrl ? (
                      <div className="bg-dark-700">
                        <img src={s.coverImageUrl} alt={s.name} className="w-full object-cover" loading="lazy" style={{ aspectRatio: '16/9' }} />
                      </div>
                    ) : (
                      <div className="h-20 bg-dark-700 flex items-center justify-center">
                        <span className="text-gray-500 text-2xl font-bold">{s.name?.charAt(0)}</span>
                      </div>
                    )}
                    <div className="px-3 py-2 bg-dark-800">
                      <div className="text-white text-sm font-medium truncate">{s.name}</div>
                      <div className="text-gray-500 text-xs mt-0.5 line-clamp-2">{s.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 分类区域 */}
        {CATEGORIES.map(renderCategorySection)}
      </div>
    </div>
  );
};

export default BlogSpacePage;
