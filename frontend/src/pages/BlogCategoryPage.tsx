import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Typography, Pagination, Spin, Alert, Empty, Tag, Button } from 'antd';
import { ArrowLeftOutlined, CalendarOutlined, EyeOutlined, LikeOutlined, MessageOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import apiService from '../api';
import SEO from '../components/SEO';

const { Title, Text } = Typography;

const BlogCategoryPage = () => {
  const { slug, postType, lang } = useParams<{ slug: string; postType: string; lang: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const currentLang = lang || 'cn';

  const LABELS: Record<string, { label: string; icon: string; color: string }> = {
    blog: { label: t('blog.space.tabLabels.blog', '博客'), icon: '📝', color: '#3b82f6' },
    guide: { label: t('blog.space.tabLabels.guide', '攻略'), icon: '📖', color: '#8b5cf6' },
    review: { label: t('blog.space.tabLabels.review', '评测'), icon: '⭐', color: '#10b981' },
  };
  const cat = LABELS[postType || 'blog'] || LABELS.blog;

  const [space, setSpace] = useState<any>(null);
  const [articles, setArticles] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 12;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const detail = await apiService.getSpaceDetail(slug || '');
        if (cancelled) return;
        if (!detail) { setError(t('blog.space.notFound', '空间不存在')); setLoading(false); return; }
        setSpace(detail);

        const res = await apiService.getSpaceArticlesByCategory(detail.id, postType || 'blog', { page, limit: pageSize });
        if (!cancelled) {
          setArticles(res.articles || []);
          setTotal(res.total || 0);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || t('blog.space.loadFailed', '加载失败'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [slug, postType, page]);

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch { return d || ''; }
  };

  return (
    <div className="bg-dark-900">
      <SEO title={`${cat.label} | ${space?.name || slug} | GameHub`} canonical={`/${currentLang}/blog/space/${slug}/category/${postType}`} />

      <div className="py-2">
        <Button type="text" className="!text-gray-400 hover:!text-white !pl-0 mb-4" icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/${currentLang}/blog/space/${slug}`)}>返回 {space?.name || slug}</Button>

        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">{cat.icon}</span>
          <Title level={1} className="!text-white !mb-0">{cat.label}</Title>
          {space?.typeCounts?.[postType || 'blog'] && (
            <Text className="!text-gray-500">共 {space.typeCounts[postType || 'blog']} 篇</Text>
          )}
        </div>

        {error && (
          <Alert type="error" message={t('blog.space.loadFailed', '加载失败')} description={error} showIcon className="mb-6"
            action={<Button onClick={() => window.location.reload()}>重试</Button>} />
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Spin size="large" /></div>
        ) : articles.length === 0 ? (
          <Empty description={t('blog.space.noArticles', '暂无文章')} />
        ) : (
          <div className="bg-dark-800 rounded-lg border border-dark-700 divide-y divide-dark-700">
            {articles.map((article: any) => (
              <Link to={`/${currentLang}/blog/${article.id}`} key={article.id} className="block no-underline">
                <div className="flex items-start gap-4 px-5 py-4 hover:bg-dark-750 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Tag color={cat.color} className="text-xs m-0">{cat.label}</Tag>
                      {article.rating != null && <Tag color="gold" className="text-xs m-0">{article.rating} 分</Tag>}
                    </div>
                    <h2 className="text-base font-semibold !text-gray-100 group-hover:!text-blue-400 line-clamp-1 mb-1">{article.title}</h2>
                    <p className="text-sm text-gray-400 line-clamp-2 mb-2">{article.excerpt}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="text-gray-400">{article.authorName || article.author}</span>
                      <span><CalendarOutlined className="mr-1" />{formatDate(article.publishedAt || article.publishDate)}</span>
                      <span><EyeOutlined className="mr-1" />{article.views || 0}</span>
                      <span><LikeOutlined className="mr-1" />{article.likes || 0}</span>
                      <span><MessageOutlined className="mr-1" />{article.comments || 0}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {total > pageSize && (
          <div className="flex justify-center mt-8">
            <Pagination current={page} pageSize={pageSize} total={total}
              onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              showQuickJumper showTotal={t => `共 ${t} 篇`} />
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogCategoryPage;
