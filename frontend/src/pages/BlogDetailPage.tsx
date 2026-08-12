import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Typography, Tag, Button, Avatar, Skeleton, Alert, Space, Divider } from 'antd';
import { CalendarOutlined, EyeOutlined, LikeOutlined, LikeFilled, StarOutlined, StarFilled, ArrowLeftOutlined, ClockCircleOutlined, UserOutlined, MessageOutlined } from '@ant-design/icons';
import { useBlogPost } from '../api/hooks';
import CommentList from '../components/comments/CommentList';
import SEO from '../components/SEO';
import SEOBreadcrumb from '../components/SEOBreadcrumb';
import BlogRenderContent from '../components/blog/BlogRenderContent';

const { Title, Text } = Typography;

const getToken = () => localStorage.getItem('accessToken') || '';

const BlogDetailPage = () => {
  const { id, lang } = useParams<{ id: string; lang: string }>();
  const navigate = useNavigate();
  const { data: post, isLoading, isError, error } = useBlogPost(id || '');
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [stats, setStats] = useState({ likes: 0, favorites: 0 });

  useEffect(() => {
    if (!id || !getToken()) return;
    fetch(`/api/v1/blogs/${id}/status`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json()).then(d => {
        if (d.success) { setLiked(d.data.liked); setFavorited(d.data.favorited); setStats({ likes: d.data.likes, favorites: d.data.favorites }); }
      });
  }, [id]);

  const toggle = async (type: 'like'|'favorite') => {
    if (!id || !getToken()) { navigate(`/${lang || 'cn'}/login`); return; }
    const prevL = liked, prevF = favorited;
    if (type === 'like') { setLiked(!prevL); setStats(s => ({ ...s, likes: s.likes + (prevL ? -1 : 1) })); }
    else { setFavorited(!prevF); setStats(s => ({ ...s, favorites: s.favorites + (prevF ? -1 : 1) })); }
    try {
      await fetch(`/api/v1/blogs/${id}/${type}`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    } catch {
      if (type === 'like') { setLiked(prevL); setStats(s => ({ ...s, likes: s.likes + (prevL ? 1 : -1) })); }
      else { setFavorited(prevF); setStats(s => ({ ...s, favorites: s.favorites + (prevF ? 1 : -1) })); }
    }
  };

  if (isLoading) return <div className="min-h-screen bg-dark-900 py-16"><div className="max-w-4xl mx-auto px-4"><Skeleton active paragraph={{rows:10}}/></div></div>;
  if (isError || !post) return (
    <div className="min-h-screen bg-dark-900 py-16">
      <div className="max-w-4xl mx-auto px-4">
        <Alert type="error" message="加载失败" description={(error as any)?.message || '文章不存在'} showIcon />
        <Button className="mt-4" onClick={() => navigate(`/${lang||'cn'}/blog`)}><ArrowLeftOutlined /> 返回博客</Button>
      </div>
    </div>
  );

  const fmt = (d: string) => { try { return new Date(d).toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric'}); } catch { return d||''; } };
  const coverUrl = (post as any).coverImageUrl || post.coverImage;
  const spaceName = (post as any).spaceName;
  const spaceSlug = (post as any).spaceSlug;
  const currentLang = lang || 'cn';

  return (
    <div className="min-h-screen bg-dark-900">
      <SEO type="article" title={`${post.title} | GameHub 博客`} description={post.excerpt} image={coverUrl} publishedTime={post.publishDate} author={post.author} section={post.category} canonical={`/blog/${post.id}`} />
      <SEOBreadcrumb items={[
        { name: '首页', url: `/${currentLang}` },
        { name: '博客', url: `/${currentLang}/blog` },
        ...(spaceName ? [{ name: spaceName, url: `/${currentLang}/blog/space/${spaceSlug}` }] : []),
        { name: post.title, url: `/${currentLang}/blog/${post.id}` },
      ]} />

      <div className="py-8 max-w-4xl mx-auto px-4">
        {/* 返回链接 */}
        <Button type="text" className="!text-gray-400 hover:!text-white !pl-0 mb-4" icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/${currentLang}/blog`)}>返回博客列表</Button>

        {/* 分类标签 */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Tag color="blue" className="!text-xs">{post.category || '博客'}</Tag>
          {(post as any).postType === 'review' && <Tag color="green" className="!text-xs">评测</Tag>}
          {(post as any).postType === 'guide' && <Tag color="purple" className="!text-xs">攻略</Tag>}
          {spaceName && (
            <Link to={`/${currentLang}/blog/space/${spaceSlug}`}>
              <Tag color="cyan" className="!text-xs">🎮 {spaceName}</Tag>
            </Link>
          )}
        </div>

        {/* 标题 */}
        <Title level={1} className="!text-white !text-2xl md:!text-3xl !mb-4 !leading-relaxed">{post.title}</Title>

        {/* 作者 + 日期 */}
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-dark-700">
          <Avatar size={36} icon={<UserOutlined />} className="bg-blue-600 flex-shrink-0" />
          <div>
            <div className="text-gray-200 text-sm font-medium">{post.author || '匿名'}</div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span><CalendarOutlined className="mr-1" />{fmt(post.publishDate)}</span>
              <span><ClockCircleOutlined className="mr-1" />{post.readingTime || Math.max(1, Math.ceil((post.content?.length||0)/500))} 分钟阅读</span>
              <span><EyeOutlined className="mr-1" />{post.views||0} 阅读</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button type="text" size="small" icon={liked ? <LikeFilled className="text-red-400" /> : <LikeOutlined />} onClick={()=>toggle('like')} className={liked?'!text-red-400':'!text-gray-400'}>{stats.likes||0}</Button>
            <Button type="text" size="small" icon={favorited ? <StarFilled className="text-yellow-400" /> : <StarOutlined />} onClick={()=>toggle('favorite')} className={favorited?'!text-yellow-400':'!text-gray-400'}>{stats.favorites||0}</Button>
          </div>
        </div>

        {/* 封面图 */}
        {coverUrl && (
          <div className="mb-8 rounded-xl overflow-hidden">
            <img src={coverUrl} alt={post.title} className="w-full h-auto max-h-96 object-cover" />
          </div>
        )}

        {/* 文章内容 */}
        <article className="mb-10">
          <BlogRenderContent content={post.content} />
        </article>

        {/* 标签 */}
        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8 pb-8 border-b border-dark-700">
            {post.tags.map((t: string) => <Tag key={t} className="bg-dark-700 text-gray-300 border-0">{t}</Tag>)}
          </div>
        )}

        {/* 评论 */}
        <div>
          <Title level={3} className="!text-white !text-lg !mb-4"><MessageOutlined className="mr-2" />评论</Title>
          <CommentList parentType="blog" parentId={post.id} />
        </div>
      </div>
    </div>
  );
};

export default BlogDetailPage;
