import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography, Card, Row, Col, Tag, Button, Divider,
  List, Space, Skeleton, Alert, Input, message,
} from 'antd';
import {
  CalendarOutlined, EyeOutlined, LikeOutlined, LikeFilled,
  ShareAltOutlined, MessageOutlined,
  SendOutlined, ArrowLeftOutlined,
} from '@ant-design/icons';
import { apiService } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { NewsArticle } from '../api/types';
import CommentList from '../components/comments/CommentList';
import SEO from '../components/SEO';
import SEOBreadcrumb from '../components/SEOBreadcrumb';
import BlogRenderContent from '../components/blog/BlogRenderContent';
import { useTranslation } from 'react-i18next';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const NewsDetailPage = () => {
  const { id, lang: paramLang } = useParams<{ id: string; lang?: string }>();
  const navigate = useNavigate();
  const lang = paramLang || 'cn';
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [relatedNews, setRelatedNews] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const { isAuthenticated } = useAuth();
  const { t, i18n } = useTranslation('news');

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setIsLoading(true);
        setError(null);
        if (!id) throw new Error(t('detail.idNotFound'));
        const articleData = await apiService.getNewsArticle(id);
        setArticle(articleData);
      } catch (err) {
        console.error('获取新闻详情失败:', err);
        setError((err as any)?.response?.data?.message || (err as Error)?.message || t('detail.fetchFailed'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchArticle();
  }, [id]);

  useEffect(() => {
    if (!article) return;
    (async () => {
      try {
        const news = await apiService.getNews({ limit: 4 });
        setRelatedNews(news.filter(n => n.id !== article.id).slice(0, 3));
      } catch { /* 静默失败 */ }
    })();
  }, [article]);

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString(i18n.language, {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const handleLike = async () => {
    if (!article || !id) return;
    if (!isAuthenticated) { message.info(t('detail.loginToLike')); return; }
    try {
      const { likes, liked: newLiked } = await apiService.likeNewsArticle(id);
      setLiked(newLiked);
      setArticle({ ...article, likes });
    } catch {
      message.error(t('detail.likeFailed'));
    }
  };

  if (isLoading) return <NewsDetailSkeleton />;

  if (error || !article) {
    return (
      <div className="flex items-center justify-center p-4">
        <Alert message={t('detail.loadFailed')} description={error || t('detail.notFound')} type="error" showIcon
          action={<Button type="primary" onClick={() => navigate(`/${lang}/news`)}>{t('detail.backToList')}</Button>} />
      </div>
    );
  }

  return (
    <>
      <SEO title={article.title} description={article.summary}
        keywords={[article.title, article.category].concat(article.tags || []).concat([t('detail.seoKeywords')]).join(', ')}
        image={article.imageUrl} type="article" publishedTime={article.publishDate} modifiedTime={article.publishDate}
        author={article.author} section={article.category} tags={article.tags} canonical={`/news/${article.id}`} />
      <SEOBreadcrumb items={[{ name: t('breadcrumb.home'), url: `/${lang}` }, { name: t('breadcrumb.news'), url: `/${lang}/news` }, { name: article.title, url: `/${lang}/news/${article.id}` }]} />
      <article>
        <div className="bg-dark-900">
          <div className="bg-dark-800 border-b border-dark-700">
            <div className="py-4">
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/${lang}/news`)} className="mb-4">{t('detail.backToList')}</Button>
            </div>
          </div>
          <div className="mx-auto py-2">
            <Row gutter={[32, 32]}>
              {/* 左侧：文章内容 + 评论 */}
              <Col xs={24} lg={16}>
                <Card className="mb-8 border-0 shadow-lg bg-dark-800">
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <Space>
                        <Tag color="blue" className="text-lg px-4 py-1">{article.category}</Tag>
                        <Text type="secondary"><CalendarOutlined className="mr-1" />{formatDate(article.publishDate)}</Text>
                      </Space>
                      <Space>
                        <Button type="text" icon={<EyeOutlined />} className="text-gray-500">{article.views.toLocaleString()}</Button>
                        <Button type="text" icon={liked ? <LikeFilled /> : <LikeOutlined />} className={liked ? 'text-blue-500' : 'text-gray-500'} onClick={handleLike}>{article.likes.toLocaleString()}</Button>
                        <Button type="text" icon={<ShareAltOutlined />} className="text-gray-500">{t('detail.share')}</Button>
                      </Space>
                    </div>
                    <Title level={1} className="mb-6">{article.title}</Title>
                    <div className="flex items-center justify-between mb-8">
                    </div>
                    <div className="flex justify-center mb-8"><img alt={article.title} src={article.imageUrl} className="max-w-4xl min-w-[500px] object-contain rounded-lg" loading="lazy" /></div>
                    <div className="prose max-w-none">
                      <Paragraph className="text-lg leading-relaxed mb-6 text-gray-300">{article.summary}</Paragraph>
                      <Divider />
                      <BlogRenderContent content={article.content} />
                    </div>
                    <div className="mt-8 pt-8 border-t border-dark-700">
                      <div className="flex flex-wrap gap-2 mb-4">
                        {article.tags.map((tag, i) => <Tag key={i} color="geekblue" className="text-lg px-4 py-1">{tag}</Tag>)}
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>
              {/* 右侧：相关新闻 + 作者 + 标签 */}
              <Col xs={24} lg={8}>
                <Card title={t('detail.relatedNews')} className="bg-dark-800 border-dark-700 mb-8">
                  <List dataSource={relatedNews} renderItem={(item) => (
                    <List.Item className="!px-3 !py-4 border-b border-dark-700 last:border-b-0 cursor-pointer hover:bg-dark-700 rounded-lg transition-all duration-200" onClick={() => navigate(`/${lang}/news/${item.id}`)}>
                      <div className="w-full">
                        <div className="font-medium mb-1 hover:text-blue-600">{item.title}</div>
                        <div className="flex items-center justify-between text-gray-500 text-sm"><span>{formatDate(item.publishDate)}</span><span><EyeOutlined className="mr-1" />{item.views.toLocaleString()}</span></div>
                      </div>
                    </List.Item>
                  )} />
                </Card>
                <Card title={t('detail.hotTags')} className="bg-dark-800 border-dark-700">
                  <div className="flex flex-wrap gap-2">
                    {['gameNews', 'industry', 'newRelease', 'dlc', 'sale', 'update', 'review', 'guide'].map((tagKey, i) => (
                      <Tag key={tagKey} color={i % 3 === 0 ? 'blue' : i % 3 === 1 ? 'green' : 'purple'}>{t(`detail.tags.${tagKey}`)}</Tag>
                    ))}
                  </div>
                </Card>
              </Col>
            </Row>
          </div>
        </div>
      </article>
    </>
  );
};

const NewsDetailSkeleton = () => (
  <div className="bg-dark-900">
    <div className="bg-dark-800 border-b border-dark-700"><div className="mx-auto py-4"><Skeleton.Button active size="small" /></div></div>
    <div className="mx-auto py-2">
      <Card className="mb-8 border-0 shadow-lg bg-dark-800">
        <Skeleton active paragraph={{ rows: 2 }} className="mb-6" />
        <Skeleton active avatar paragraph={{ rows: 1 }} className="mb-8" />
        <Skeleton.Image active style={{ width: '100%', height: 300 }} className="mb-8" />
        <Skeleton active paragraph={{ rows: 10 }} />
      </Card>
      <Row gutter={[32, 32]}>
        <Col xs={24} lg={16}><Card className="mb-8 bg-dark-800 border-dark-700"><Skeleton active paragraph={{ rows: 6 }} /></Card></Col>
        <Col xs={24} lg={8}>
          <Card className="mb-8 bg-dark-800 border-dark-700"><Skeleton active paragraph={{ rows: 4 }} /></Card>
          <Card className="bg-dark-800 border-dark-700"><Skeleton active paragraph={{ rows: 3 }} /></Card>
        </Col>
      </Row>
    </div>
  </div>
);

export default NewsDetailPage;
