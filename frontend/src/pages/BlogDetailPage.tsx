import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Typography, Tag, Button, Avatar, Skeleton, Alert, message } from 'antd';
import {
  CalendarOutlined, EyeOutlined, LikeOutlined, LikeFilled, StarOutlined, StarFilled,
  ArrowLeftOutlined, ClockCircleOutlined, UserOutlined, LogoutOutlined,
} from '@ant-design/icons';
import { useBlogPost } from '../api/hooks';
import CommentList from '../components/comments/CommentList';
import SEO from '../components/SEO';
import SEOBreadcrumb from '../components/SEOBreadcrumb';
import BlogRenderContent from '../components/blog/BlogRenderContent';

const { Title, Paragraph, Text } = Typography;

const getToken = () => localStorage.getItem('accessToken') || '';

const BlogDetailPage = () => {
  const { id, lang } = useParams<{ id: string; lang: string }>();
  const navigate = useNavigate();
  const { data: post, isLoading, isError, error } = useBlogPost(id || '');
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [stats, setStats] = useState({ likes: 0, favorites: 0 });

  // 加载点赞/收藏状态
  useEffect(() => {
    if (!id || !getToken()) return;
    fetch(`/api/v1/blogs/${id}/status`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json()).then(d => {
        if (d.success) { setLiked(d.data.liked); setFavorited(d.data.favorited); setStats({ likes: d.data.likes, favorites: d.data.favorites }); }
      });
  }, [id]);

  const toggle = async (type: 'like'|'favorite') => {
    if (!id || !getToken()) { navigate(`/${lang || 'cn'}/login`); return; }
    const isLike = type === 'like';
    const prevLiked = liked, prevFav = favorited;
    if (isLike) { setLiked(!prevLiked); setStats(s => ({ ...s, likes: s.likes + (prevLiked ? -1 : 1) })); }
    else { setFavorited(!prevFav); setStats(s => ({ ...s, favorites: s.favorites + (prevFav ? -1 : 1) })); }
    try {
      const res = await fetch(`/api/v1/blogs/${id}/${type}`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
      const d = await res.json();
      if (d.success) { /* sync with server if needed */ }
    } catch {
      if (isLike) { setLiked(prevLiked); setStats(s => ({ ...s, likes: s.likes + (prevLiked ? 1 : -1) })); }
      else { setFavorited(prevFav); setStats(s => ({ ...s, favorites: s.favorites + (prevFav ? 1 : -1) })); }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-900 py-12">
        <div className="max-w-4xl mx-auto px-4"><Skeleton active avatar paragraph={{ rows: 6 }} /></div>
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="min-h-screen bg-dark-900 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <Alert type="error" message="加载失败" description={(error as any)?.message || '博客文章不存在'} showIcon className="mb-4" />
          <Button onClick={() => navigate(`/${lang || 'cn'}/blog`)}><ArrowLeftOutlined /> 返回博客列表</Button>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try { return new Date(dateStr).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch { return dateStr; }
  };

  const coverUrl = (post as any).coverImageUrl || post.coverImage;
  const spaceName = (post as any).spaceName;
  const spaceSlug = (post as any).spaceSlug;

  return (
    <div className="min-h-screen bg-dark-900">
      <SEO type="article"
        title={`${post.title} | GameHub 博客`}
        description={post.excerpt}
        image={coverUrl}
        keywords={`${post.title}, ${post.category}, ${(post.tags || []).join(', ')}, GameHub博客`}
        publishedTime={post.publishDate} author={post.author}
        section={post.category} tags={post.tags} canonical={`/blog/${post.id}`}
      />
      <SEOBreadcrumb items={[
        { name: '首页', url: `/${lang || 'cn'}` },
        { name: '博客', url: `/${lang || 'cn'}/blog` },
        ...(spaceName ? [{ name: spaceName, url: `/${lang || 'cn'}/blog/space/${spaceSlug}` }] : []),
        { name: post.title, url: `/${lang || 'cn'}/blog/${post.id}` },
      ]} />

      <div className="py-8">
        <Button type="text" className="!text-gray-400 hover:!text-white mb-6 !pl-0" icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/${lang || 'cn'}/blog`)}>返回博客列表</Button>

        <header className="mb-8">
          <div className="flex flex-wrap gap-2 mb-4">
            <Tag color="blue">{post.category}</Tag>
            {spaceName && (
              <Link to={`/${lang || 'cn'}/blog/space/${spaceSlug}`}>
                <Tag color="green">🎮 {spaceName}</Tag>
              </Link>
            )}
            {post.featured && <Tag color="orange">精选</Tag>}
          </div>

          <Title level={1} className="!text-white !text-3xl sm:!text-4xl mb-4">{post.title}</Title>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-4">
            <div className="flex items-center gap-2">
              <Avatar size="small" icon={<UserOutlined />} className="bg-blue-600" />
              <Text className="!text-gray-300">{post.author}</Text>
            </div>
            <span><CalendarOutlined /> {formatDate(post.publishDate)}</span>
            <span><ClockCircleOutlined /> {post.readingTime} 分钟阅读</span>
          </div>

          <div className="flex items-center gap-4 px-4 py-3 bg-dark-800 rounded-lg border border-dark-700 mb-4">
            <div className="flex items-center gap-2"><EyeOutlined className="text-blue-400" /><span className="text-gray-200 font-semibold">{post.views.toLocaleString()}</span><span className="text-gray-500 text-xs">浏览</span></div>
            <Button type="text" icon={liked ? <LikeFilled /> : <LikeOutlined />}
              className={liked ? '!text-red-400' : '!text-gray-400'}
              onClick={() => toggle('like')}>
              <span className="font-semibold">{stats.likes.toLocaleString()}</span> <span className="text-xs">点赞</span>
            </Button>
            <Button type="text" icon={favorited ? <StarFilled /> : <StarOutlined />}
              className={favorited ? '!text-yellow-400' : '!text-gray-400'}
              onClick={() => toggle('favorite')}>
              <span className="font-semibold">{stats.favorites.toLocaleString()}</span> <span className="text-xs">收藏</span>
            </Button>
          </div>
        </header>

        {coverUrl && (
          <div className="mb-8 rounded-xl overflow-hidden">
            <img src={coverUrl} alt={post.title} className="w-full h-auto object-cover" />
          </div>
        )}

        <article className="mb-8">
          <BlogRenderContent content={post.content} />
        </article>

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8 pb-8 border-b border-dark-700">
            {post.tags.map(tag => <Tag key={tag} className="bg-dark-700 text-gray-300 border-0">{tag}</Tag>)}
          </div>
        )}

        <div className="mt-8">
          <Title level={2} className="!text-white !text-lg mb-4">评论</Title>
          <CommentList parentType="blog" parentId={post.id} />
        </div>
      </div>
    </div>
  );
};

export default BlogDetailPage;
