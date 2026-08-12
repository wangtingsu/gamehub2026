import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Typography, Tag, Button, Avatar, Skeleton, Alert, Space, Divider } from 'antd';
import { CalendarOutlined, EyeOutlined, LikeOutlined, LikeFilled, StarOutlined, StarFilled, ArrowLeftOutlined, ClockCircleOutlined, UserOutlined, MessageOutlined } from '@ant-design/icons';
import { useBlogPost } from '../api/hooks';
import CommentList from '../components/comments/CommentList';
import SEO from '../components/SEO';
import SEOBreadcrumb from '../components/SEOBreadcrumb';
import BlogRenderContent from '../components/blog/BlogRenderContent';
import apiService from '../api';

const { Title, Text } = Typography;

const getToken = () => localStorage.getItem('accessToken') || '';

/** 从 Markdown 内容中提取标题作为目录 */
const extractHeadings = (content: string) => {
  const headings: { level: number; text: string; id: string }[] = [];
  const regex = /^(#{1,3})\s+(.+)$/gm;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = text.toLowerCase().replace(/[^a-z0-9一-龥]+/g, '-').replace(/(^-|-$)/g, '');
    headings.push({ level, text, id });
  }
  return headings;
};

const BlogDetailPage = () => {
  const { id, lang } = useParams<{ id: string; lang: string }>();
  const navigate = useNavigate();
  const currentLang = lang || 'cn';
  const { data: post, isLoading, isError, error } = useBlogPost(id || '');
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [stats, setStats] = useState({ likes: 0, favorites: 0 });
  const [toggling, setToggling] = useState<'like'|'favorite'|null>(null);
  const [related, setRelated] = useState<any[]>([]);

  useEffect(() => {
    if (!id || !getToken()) return;
    fetch(`/api/v1/blogs/${id}/status`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json()).then(d => {
        if (d.success) { setLiked(d.data.liked); setFavorited(d.data.favorited); setStats({ likes: d.data.likes, favorites: d.data.favorites }); }
      });
  }, [id]);

  // 获取相关文章
  useEffect(() => {
    if (!post) return;
    apiService.getBlogPosts({ limit: 6 }).then(data => {
      const list = Array.isArray(data) ? data.filter((a: any) => a.id !== post.id).slice(0, 6) : [];
      setRelated(list);
    }).catch(() => {});
  }, [post]);

  const headings = useMemo(() => post?.content ? extractHeadings(post.content) : [], [post]);

  const toggle = async (type: 'like'|'favorite') => {
    if (!id || !getToken()) { navigate(`/${currentLang}/login`); return; }
    if (toggling) return;
    setToggling(type);
    try {
      const res = await fetch(`/api/v1/blogs/${id}/${type}`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
      const d = await res.json();
      if (d.success && d.data) {
        setLiked(d.data.liked);
        setFavorited(d.data.favorited);
        setStats({ likes: d.data.likes || 0, favorites: d.data.favorites || 0 });
      }
    } catch { /* ignore */ }
    setToggling(null);
  };

  if (isLoading) return <div className="min-h-screen bg-dark-900 py-16"><div className="max-w-5xl mx-auto px-4"><Skeleton active paragraph={{rows:10}}/></div></div>;
  if (isError || !post) return (
    <div className="min-h-screen bg-dark-900 py-16">
      <div className="max-w-5xl mx-auto px-4">
        <Alert type="error" message="加载失败" description={(error as any)?.message || '文章不存在'} showIcon />
        <Button className="mt-4" onClick={() => navigate(`/${currentLang}/blog`)}><ArrowLeftOutlined /> 返回博客</Button>
      </div>
    </div>
  );

  const fmt = (d: string) => { try { return new Date(d).toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric'}); } catch { return d||''; } };
  const coverUrl = (post as any).coverImageUrl || post.coverImage;
  const spaceName = (post as any).spaceName;
  const spaceSlug = (post as any).spaceSlug;

  return (
    <div className="min-h-screen bg-dark-900">
      <SEO type="article" title={`${post.title} | GameHub 博客`} description={post.excerpt} image={coverUrl} publishedTime={post.publishDate} author={post.author} section={post.category} canonical={`/blog/${post.id}`} />
      <SEOBreadcrumb items={[
        { name: '首页', url: `/${currentLang}` },
        { name: '博客', url: `/${currentLang}/blog` },
        ...(spaceName ? [{ name: spaceName, url: `/${currentLang}/blog/space/${spaceSlug}` }] : []),
        { name: post.title, url: `/${currentLang}/blog/${post.id}` },
      ]} />

      <div className="py-8 max-w-[1600px] mx-auto px-1 sm:px-2">
        <div className="flex gap-6">
          {/* ====== 左侧：目录 (TOC) ====== */}
          <aside className="w-36 flex-shrink-0 hidden xl:block">
            <div className="sticky top-4 max-h-[calc(100vh-40px)] overflow-y-auto space-scroll pt-2">
              <Text className="!text-gray-500 !text-[10px] !font-bold !uppercase !tracking-widest block mb-4 pl-2">目录</Text>
              {headings.length === 0 ? (
                <Text className="!text-gray-600 !text-xs pl-2">暂无目录</Text>
              ) : (
                <nav className="space-y-0 border-l border-dark-700/30">
                  {headings.map((h, i) => (
                    <a key={i} href={`#${h.id}`}
                      className={`block text-xs py-1.5 transition-all duration-200 border-l-2 -ml-px ${
                        h.level === 2
                          ? 'pl-3 text-gray-400 hover:text-blue-400 hover:border-blue-400 border-transparent'
                          : 'pl-6 text-gray-500 hover:text-blue-400 hover:border-blue-400 border-transparent'
                      }`}
                      onClick={(e) => { e.preventDefault(); const el = document.getElementById(h.id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
                      <span className="line-clamp-1">{h.text}</span>
                    </a>
                  ))}
                </nav>
              )}
            </div>
          </aside>

          {/* ====== 中间：文章内容 ====== */}
          <div className="flex-1 min-w-0">
            <Button type="text" className="!text-gray-400 hover:!text-white !pl-0 mb-4" icon={<ArrowLeftOutlined />}
              onClick={() => navigate(`/${currentLang}/blog`)}>返回博客列表</Button>

            <div className="flex flex-wrap gap-2 mb-4">
              <Tag color="blue" className="!text-xs">{post.category || '博客'}</Tag>
              {(post as any).postType === 'review' && <Tag color="green" className="!text-xs">评测</Tag>}
              {(post as any).postType === 'guide' && <Tag color="purple" className="!text-xs">攻略</Tag>}
              {spaceName && <Link to={`/${currentLang}/blog/space/${spaceSlug}`}><Tag color="cyan" className="!text-xs">🎮 {spaceName}</Tag></Link>}
            </div>

            <Title level={1} className="!text-white !text-2xl md:!text-3xl !mb-4 !leading-relaxed">{post.title}</Title>

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
                <Button type="text" size="small" loading={toggling==='like'} icon={liked ? <LikeFilled className="text-red-400" /> : <LikeOutlined />} onClick={()=>toggle('like')} className={liked?'!text-red-400':'!text-gray-400'}>{stats.likes||0}</Button>
                <Button type="text" size="small" loading={toggling==='favorite'} icon={favorited ? <StarFilled className="text-yellow-400" /> : <StarOutlined />} onClick={()=>toggle('favorite')} className={favorited?'!text-yellow-400':'!text-gray-400'}>{stats.favorites||0}</Button>
              </div>
            </div>

            {coverUrl && (
              <div className="mb-8 rounded-xl overflow-hidden">
                <img src={coverUrl} alt={post.title} className="w-full h-auto max-h-96 object-cover" />
              </div>
            )}

            <article className="mb-10">
              <BlogRenderContent content={post.content} />
            </article>

            {post.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8 pb-8 border-b border-dark-700">
                {post.tags.map((t: string) => <Tag key={t} className="bg-dark-700 text-gray-300 border-0">{t}</Tag>)}
              </div>
            )}

            <div>
              <Title level={3} className="!text-white !text-lg !mb-4"><MessageOutlined className="mr-2" />评论</Title>
              <CommentList parentType="blog" parentId={post.id} />
            </div>
          </div>

          {/* ====== 右侧：相关推荐 ====== */}
          <aside className="w-72 flex-shrink-0 hidden lg:block">
            <div className="sticky top-4 max-h-[calc(100vh-40px)] overflow-y-auto space-scroll pt-2">
              <Text className="!text-gray-500 !text-[10px] !font-bold !uppercase !tracking-widest block mb-4">相关推荐</Text>
              {related.length === 0 ? (
                <Text className="!text-gray-600 !text-xs">暂无推荐</Text>
              ) : (
                <div className="space-y-4">
                  {related.map((a: any) => (
                    <Link key={a.id} to={`/${currentLang}/blog/${a.id}`} className="block no-underline group">
                      <div className="rounded-xl overflow-hidden border border-dark-700/50 hover:border-blue-500/50 transition-all hover:-translate-y-0.5">
                        <div className="h-32 bg-dark-800 overflow-hidden">
                          {(a.coverImageUrl || a.coverImage) ? (
                            <img src={a.coverImageUrl || a.coverImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                          ) : <div className="w-full h-full flex items-center justify-center text-3xl">📄</div>}
                        </div>
                        <div className="p-3 bg-dark-800/50">
                          <div className="text-white text-sm font-medium line-clamp-2 group-hover:text-blue-400 mb-1">{a.title}</div>
                          <div className="text-gray-500 text-[11px] flex items-center gap-2">
                            <EyeOutlined />{a.views||0}
                            <span className="ml-auto">{fmt(a.publishDate||a.publishedAt)}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default BlogDetailPage;
