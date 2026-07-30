import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography, Card, Row, Col, Tag, Button, Avatar, Divider,
  List, Space, Skeleton, Alert, Input, message,
} from 'antd';
import {
  CalendarOutlined, EyeOutlined, LikeOutlined, LikeFilled,
  ShareAltOutlined, MessageOutlined, UserOutlined,
  SendOutlined, ArrowLeftOutlined,
} from '@ant-design/icons';
import { apiService } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { NewsArticle } from '../api/types';
import CommentList from '../components/comments/CommentList';
import SEO from '../components/SEO';
import SEOBreadcrumb from '../components/SEOBreadcrumb';

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

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setIsLoading(true);
        setError(null);
        if (!id) throw new Error('新闻ID不存在');
        const articleData = await apiService.getNewsArticle(id);
        setArticle(articleData);
      } catch (err) {
        console.error('获取新闻详情失败:', err);
        setError((err as any)?.response?.data?.message || (err as Error)?.message || '获取新闻详情失败');
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

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const handleLike = async () => {
    if (!article || !id) return;
    if (!isAuthenticated) { message.info('请先登录后再点赞'); return; }
    try {
      const { likes, liked: newLiked } = await apiService.likeNewsArticle(id);
      setLiked(newLiked);
      setArticle({ ...article, likes });
    } catch {
      message.error('点赞失败');
    }
  };

  if (isLoading) return <NewsDetailSkeleton />;

  if (error || !article) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert message="加载失败" description={error || '新闻不存在'} type="error" showIcon
          action={<Button type="primary" onClick={() => navigate(`/${lang}/news`)}>返回新闻列表</Button>} />
      </div>
    );
  }

  return (
    <>
      <SEO title={article.title} description={article.summary}
        keywords={[article.title, article.category].concat(article.tags || []).concat(['游戏新闻', '游戏资讯', '行业动态']).join(', ')}
        image={article.imageUrl} type="article" publishedTime={article.publishDate} modifiedTime={article.publishDate}
        author={article.author} section={article.category} tags={article.tags} canonical={`/news/${article.id}`} />
      <SEOBreadcrumb items={[{ name: '首页', url: `/${lang}` }, { name: '新闻', url: `/${lang}/news` }, { name: article.title, url: `/${lang}/news/${article.id}` }]} />
      <article>
        <div className="min-h-screen bg-dark-900">
          <div className="bg-dark-800 border-b border-dark-700">
            <div className="py-4">
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/${lang}/news`)} className="mb-4">返回新闻列表</Button>
            </div>
          </div>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                    <Button type="text" icon={<ShareAltOutlined />} className="text-gray-500">分享</Button>
                  </Space>
                </div>
                <Title level={1} className="mb-6">{article.title}</Title>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center">
                    <Avatar size={48} icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} className="mr-4" />
                    <div><div className="font-bold text-lg">{article.author}</div><Text type="secondary">资深游戏记者</Text></div>
                  </div>
                </div>
                <img alt={article.title} src={article.imageUrl} className="w-full h-96 object-cover rounded-lg mb-8" loading="lazy" />
                <div className="prose max-w-none">
                  <Paragraph className="text-lg leading-relaxed mb-6 text-gray-300">{article.summary}</Paragraph>
                  <Divider />
                  <div className="text-xl leading-relaxed text-gray-200">
                    {article.content.split('\n').map((p, i) => <Paragraph key={i} className="mb-6">{p}</Paragraph>)}
                  </div>
                </div>
                <div className="mt-8 pt-8 border-t border-dark-700">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {article.tags.map((tag, i) => <Tag key={i} color="geekblue" className="text-lg px-4 py-1">{tag}</Tag>)}
                  </div>
                </div>
              </div>
            </Card>
            <Row gutter={[32, 32]}>
              <Col xs={24} lg={16}>
                <Card className="mb-8 bg-dark-800 border-dark-700"><CommentList parentType="news" parentId={id || ''} /></Card>
              </Col>
              <Col xs={24} lg={8}>
                <Card title="作者信息" className="mb-8 bg-dark-800 border-dark-700">
                  <div className="text-center">
                    <Avatar size={80} icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} className="mb-4" />
                    <Title level={4} className="mb-2">{article.author}</Title>
                    <Text type="secondary" className="mb-4 block">资深游戏记者</Text>
                    <Paragraph className="text-gray-400 text-sm">专注于游戏行业新闻报道，拥有10年游戏媒体从业经验。</Paragraph>
                  </div>
                </Card>
                <Card title="相关新闻" className="bg-dark-800 border-dark-700">
                  <List dataSource={relatedNews} renderItem={(item) => (
                    <List.Item className="!px-0 !py-3 border-b border-dark-700 last:border-b-0 cursor-pointer hover:bg-dark-700" onClick={() => navigate(`/news/${item.id}`)}>
                      <div className="w-full">
                        <div className="font-medium mb-1 hover:text-blue-600">{item.title}</div>
                        <div className="flex items-center justify-between text-gray-500 text-sm"><span>{formatDate(item.publishDate)}</span><span><EyeOutlined className="mr-1" />{item.views.toLocaleString()}</span></div>
                      </div>
                    </List.Item>
                  )} />
                </Card>
                <Card title="热门标签" className="mt-8 bg-dark-800 border-dark-700">
                  <div className="flex flex-wrap gap-2">
                    {['游戏新闻', '行业动态', '新作发布', 'DLC', '特卖', '更新', '评测', '攻略'].map((tag, i) => (
                      <Tag key={i} color={i % 3 === 0 ? 'blue' : i % 3 === 1 ? 'green' : 'purple'}>{tag}</Tag>
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
  <div className="min-h-screen bg-dark-900">
    <div className="bg-dark-800 border-b border-dark-700"><div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4"><Skeleton.Button active size="small" /></div></div>
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
