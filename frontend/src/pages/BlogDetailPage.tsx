import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Typography, Tag, Button, Avatar, Skeleton, Alert, Tooltip } from 'antd';
import { CalendarOutlined, EyeOutlined, LikeOutlined, LikeFilled, StarOutlined, StarFilled, ArrowLeftOutlined, ClockCircleOutlined, UserOutlined, MessageOutlined, TwitterOutlined, FacebookFilled, LinkedinFilled, RedditOutlined, LinkOutlined, CheckOutlined, ThunderboltOutlined, TagOutlined } from '@ant-design/icons';
import { useBlogPost } from '../api/hooks';
import CommentList from '../components/comments/CommentList';
import SEO from '../components/SEO';
import SEOBreadcrumb from '../components/SEOBreadcrumb';
import BlogRenderContent from '../components/blog/BlogRenderContent';
import apiService from '../api';

const { Text } = Typography;

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
  const [progress, setProgress] = useState(0);
  const [activeId, setActiveId] = useState('');
  const [copied, setCopied] = useState(false);
  const articleRef = useRef<HTMLElement | null>(null);

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

  // 阅读进度条
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 给正文标题补 id（与目录一致），并实现目录滚动高亮
  useEffect(() => {
    if (headings.length === 0) return;
    const container = articleRef.current;
    if (container) {
      const hs = container.querySelectorAll('h1,h2,h3');
      headings.forEach((h, i) => { if (hs[i]) hs[i].id = h.id; });
    }
    const ids = headings.map(h => h.id);
    const onScroll = () => {
      let current = '';
      for (const hid of ids) {
        const el = document.getElementById(hid);
        if (el && el.getBoundingClientRect().top <= 120) current = hid;
      }
      setActiveId(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [headings]);

  const toggle = async (type: 'like'|'favorite') => {
    if (!id || !getToken()) { navigate(`/${currentLang}/login`); return; }
    if (toggling) return;
    setToggling(type);
    // 乐观更新：先改UI
    if (type === 'like') {
      setLiked(!liked);
      setStats(s => ({ ...s, likes: Math.max(0, s.likes + (liked ? -1 : 1)) }));
    } else {
      setFavorited(!favorited);
      setStats(s => ({ ...s, favorites: Math.max(0, s.favorites + (favorited ? -1 : 1)) }));
    }
    try {
      await fetch(`/api/v1/blogs/${id}/${type}`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    } catch {
      // 失败回滚
      if (type === 'like') {
        setLiked(liked);
        setStats(s => ({ ...s, likes: Math.max(0, s.likes + (liked ? 1 : -1)) }));
      } else {
        setFavorited(favorited);
        setStats(s => ({ ...s, favorites: Math.max(0, s.favorites + (favorited ? 1 : -1)) }));
      }
    }
    setToggling(null);
  };

  if (isLoading) return <div className="bg-dark-900 pb-2 py-16"><div className="max-w-5xl mx-auto px-4"><Skeleton active paragraph={{rows:10}}/></div></div>;
  if (isError || !post) return (
    <div className="bg-dark-900 pb-2 py-16">
      <div className="max-w-5xl mx-auto px-4">
        <Alert type="error" message="Failed to load" description={(error as any)?.message || 'Article not found'} showIcon />
        <Button className="mt-4" onClick={() => navigate(`/${currentLang}/blog`)}><ArrowLeftOutlined /> Back to Blog</Button>
      </div>
    </div>
  );

  const fmt = (d: string) => { try { return new Date(d).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}); } catch { return d||''; } };
  const coverUrl = (post as any).coverImageUrl || post.coverImage;
  const spaceName = (post as any).spaceName;
  const spaceSlug = (post as any).spaceSlug;
  const readingTime = post.readingTime || Math.max(1, Math.ceil((post.content?.length||0)/500));

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = post.title || '';
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };

  const shareButtons = (
    <div className="flex items-center gap-1.5">
      {[
        { label: 'X', icon: <TwitterOutlined />, bg: '#000000', href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}` },
        { label: 'Facebook', icon: <FacebookFilled />, bg: '#1877f2', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}` },
        { label: 'Reddit', icon: <RedditOutlined />, bg: '#ff4500', href: `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}` },
        { label: 'LinkedIn', icon: <LinkedinFilled />, bg: '#0a66c2', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}` },
      ].map(s => (
        <Tooltip key={s.label} title={`Share on ${s.label}`}>
          <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`Share on ${s.label}`}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm shadow-sm transition-all duration-200 hover:scale-110 hover:shadow-lg"
            style={{ backgroundColor: s.bg }}>
            {s.icon}
          </a>
        </Tooltip>
      ))}
      <Tooltip title={copied ? 'Copied!' : 'Copy link'}>
        <button onClick={copyLink} aria-label="Copy link"
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm transition-all duration-200 hover:scale-110 hover:shadow-lg ${copied ? 'bg-green-500 text-white' : 'bg-white/10 text-white'}`}>
          {copied ? <CheckOutlined /> : <LinkOutlined />}
        </button>
      </Tooltip>
    </div>
  );

  const metaItems = [
    { icon: <CalendarOutlined />, label: 'Published', value: fmt(post.publishDate) },
    { icon: <TagOutlined />, label: 'Category', value: post.category || 'Blog' },
    { icon: <ClockCircleOutlined />, label: 'Read time', value: `${readingTime} min` },
    { icon: <EyeOutlined />, label: 'Views', value: `${post.views || 0}` },
  ];

  return (
    <div className="bg-dark-900 pb-2">
      {/* 阅读进度条 */}
      <div className="fixed top-0 left-0 right-0 z-[999] h-[3px] pointer-events-none">
        <div className="h-full bg-gradient-to-r from-primary-500 via-sky-400 to-secondary-500 transition-[width] duration-150 ease-out" style={{ width: `${progress}%` }} />
      </div>

      <SEO type="article" title={`${post.title} | GameHub Blog`} description={post.excerpt} image={coverUrl} publishedTime={post.publishDate} author={post.author} section={post.category} canonical={`/blog/${post.id}`} />
      <SEOBreadcrumb items={[
        { name: 'Home', url: `/${currentLang}` },
        { name: 'Blog', url: `/${currentLang}/blog` },
        ...(spaceName ? [{ name: spaceName, url: `/${currentLang}/blog/space/${spaceSlug}` }] : []),
        { name: post.title, url: `/${currentLang}/blog/${post.id}` },
      ]} />

      {/* ====== 全宽杂志式头图 ====== */}
      <div className="relative w-full h-[360px] sm:h-[440px] md:h-[540px] overflow-hidden">
        {coverUrl ? (
          <img src={coverUrl} alt={post.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-dark-800 via-dark-900 to-primary-900/40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/55 to-dark-900/5" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-dark-900/95 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pb-8 md:pb-12">
            <div className="flex flex-wrap gap-2 mb-4">
              <Tag color="blue" className="!text-xs !m-0">{post.category || 'Blog'}</Tag>
              {(post as any).postType === 'review' && <Tag color="green" className="!text-xs !m-0">Review</Tag>}
              {(post as any).postType === 'guide' && <Tag color="purple" className="!text-xs !m-0">Guide</Tag>}
              {spaceName && <Link to={`/${currentLang}/blog/space/${spaceSlug}`}><Tag color="cyan" className="!text-xs !m-0">🎮 {spaceName}</Tag></Link>}
            </div>

            <h1 className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-5 max-w-4xl drop-shadow-lg">{post.title}</h1>

            <div className="flex items-center gap-3 flex-wrap">
              <Avatar size={44} src={post.authorAvatar || undefined} icon={<UserOutlined />} className="bg-blue-600 flex-shrink-0 ring-2 ring-white/20" />
              <div>
                <div className="text-white font-medium text-sm drop-shadow">{post.author || 'Anonymous'}</div>
                <div className="flex items-center gap-3 text-xs text-gray-300">
                  <span><CalendarOutlined className="mr-1" />{fmt(post.publishDate)}</span>
                  <span><ClockCircleOutlined className="mr-1" />{readingTime} min read</span>
                  <span><EyeOutlined className="mr-1" />{post.views || 0} views</span>
                </div>
              </div>
              <div className="ml-auto">
                {shareButtons}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="py-6 max-w-[1600px] mx-auto px-1 sm:px-2">
        <div className="flex gap-6">
          {/* ====== 左侧：目录 (TOC) ====== */}
          <aside className="w-52 flex-shrink-0 hidden xl:block">
            <div className="sticky top-4 max-h-[calc(100vh-40px)] overflow-y-auto space-scroll pt-2">
              <Text className="!text-gray-500 !text-xs !font-bold !uppercase !tracking-widest block mb-4 pl-2">On this page</Text>
              {headings.length === 0 ? (
                <Text className="!text-gray-600 !text-xs pl-2">No headings</Text>
              ) : (
                <nav className="space-y-0 border-l border-dark-700/30">
                  {headings.map((h, i) => {
                    const active = activeId === h.id;
                    return (
                      <a key={i} href={`#${h.id}`}
                        className={`block text-base py-1.5 transition-all duration-200 border-l-2 -ml-px ${
                          h.level === 2 ? 'pl-3' : 'pl-6'
                        } ${
                          active
                            ? 'text-blue-400 border-blue-400 bg-blue-400/5'
                            : 'text-gray-400 border-transparent hover:text-blue-400 hover:border-blue-400'
                        }`}
                        onClick={(e) => { e.preventDefault(); const el = document.getElementById(h.id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
                        <span className="line-clamp-1">{h.text}</span>
                      </a>
                    );
                  })}
                </nav>
              )}
            </div>
          </aside>

          {/* ====== 中间：文章内容 ====== */}
          <div className="flex-1 min-w-0">
            <Button type="text" className="!text-gray-400 hover:!text-white !pl-0 mb-4" icon={<ArrowLeftOutlined />}
              onClick={() => navigate(`/${currentLang}/blog`)}>Back to Blog</Button>

            {/* 要点速览 */}
            <div className="mb-8 rounded-2xl border border-primary-500/30 bg-gradient-to-br from-primary-500/10 via-dark-800/40 to-secondary-500/5 p-5 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <ThunderboltOutlined className="text-primary-400 text-xl" />
                <span className="text-white font-semibold text-lg">At a Glance</span>
              </div>
              {post.excerpt ? (
                <p className="text-gray-300 text-sm leading-relaxed mb-4">{post.excerpt}</p>
              ) : null}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {metaItems.map((m, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl bg-dark-800/60 border border-dark-700/50 px-3 py-2.5">
                    <span className="text-primary-400 text-lg flex-shrink-0">{m.icon}</span>
                    <div className="min-w-0">
                      <div className="text-gray-500 text-[11px] uppercase tracking-wide">{m.label}</div>
                      <div className="text-white text-sm font-medium truncate">{m.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <article ref={articleRef} className="mb-10">
              <BlogRenderContent content={post.content} />
            </article>

            {/* 作者卡片 */}
            <div className="mb-8 rounded-2xl border border-dark-700/60 bg-dark-800/40 p-6 flex flex-col sm:flex-row gap-5 items-start">
              <Avatar size={64} src={post.authorAvatar || undefined} icon={<UserOutlined />} className="bg-blue-600 flex-shrink-0 shadow-lg shadow-blue-600/20" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="text-white font-semibold text-lg">{post.author || 'Anonymous'}</span>
                  <Tag color="blue" className="!text-xs !m-0">Author</Tag>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">{post.authorBio || 'Content creator at GameHub.'}</p>
              </div>
            </div>

            {post.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8 pb-2 border-b border-dark-700">
                {post.tags.map((t: string) => <Tag key={t} className="bg-dark-700 text-gray-300 border-0">{t}</Tag>)}
              </div>
            )}

            <div>
              <Text className="!text-white !text-lg !font-semibold block mb-4"><MessageOutlined className="mr-2" />Comments</Text>
              <CommentList parentType="blog" parentId={post.id} />
            </div>
          </div>

          {/* ====== 右侧：相关推荐 ====== */}
          <aside className="w-96 flex-shrink-0 hidden lg:block">
            <div className="sticky top-4 max-h-[calc(100vh-40px)] overflow-y-auto space-scroll pt-2">
              <Text className="!text-gray-500 !text-[10px] !font-bold !uppercase !tracking-widest block mb-4">Related articles</Text>
              {related.length === 0 ? (
                <Text className="!text-gray-600 !text-xs">No related articles</Text>
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
                          <div className="text-white text-base font-medium line-clamp-2 group-hover:text-blue-400 mb-1">{a.title}</div>
                          <div className="text-gray-500 text-xs flex items-center gap-2">
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
