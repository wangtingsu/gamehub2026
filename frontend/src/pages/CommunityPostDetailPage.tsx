import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Tag, Button, Skeleton, Alert, Avatar, Divider, Space } from 'antd';
import { ArrowLeftOutlined, LikeOutlined, CalendarOutlined, UserOutlined, LockOutlined, PushpinOutlined, MessageOutlined, StarFilled } from '@ant-design/icons';
import { useCommunityPost, useGames } from '../api/hooks';
import BlogRenderContent from '../components/blog/BlogRenderContent';
import { useAuth } from '../contexts/AuthContext';
import CommentList from '../components/comments/CommentList';
import SEO from '../components/SEO';
import SEOBreadcrumb from '../components/SEOBreadcrumb';

const { Title, Paragraph, Text } = Typography;

const CommunityPostDetailPage = () => {
  const { id, lang } = useParams<{ id: string; lang: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const currentLang = lang || 'cn';
  const { data: post, isLoading, error } = useCommunityPost(id || '');
  const [followed, setFollowed] = useState<any[]>([]);
  const { data: allGames = [] } = useGames({ limit: 20 });
  const relatedGames = (allGames || []).slice(0, 6);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { setFollowed([]); return; }
    fetch('/api/v1/community/followed', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setFollowed(d.data || [])).catch(() => {});
  }, [isAuthenticated]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const Sidebar = ({ children }: { children: React.ReactNode }) => (
    <div className="flex gap-6">
      <div className="w-64 flex-shrink-0 hidden lg:block">
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-3 sticky top-4">
          <Text className="!text-white !text-sm !font-semibold block mb-3">My Followed</Text>
          <div className="max-h-[350px] overflow-y-auto space-y-2 space-scroll">
            {followed.length === 0 && <Text className="!text-gray-500 !text-xs">No followed forums</Text>}
            {followed.map((f: any) => {
              const game = allGames.find((g: any) => String(g.id) === f.forum_id);
              return (
              <div key={f.forum_id} onClick={() => navigate(`/${currentLang}/games/${game?.slug || f.forum_id}/forum`)}
                className="cursor-pointer rounded-lg overflow-hidden border border-dark-600 hover:border-blue-500/50 transition-all">
                <div className="h-14 bg-dark-700 overflow-hidden">
                  {((game as any)?.imageUrl || (game as any)?.coverImageUrl) ? <img src={(game as any).imageUrl || (game as any).coverImageUrl} alt="" className="w-full h-full object-cover" /> :
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-lg">{f.forum_name?.[0]}</div>}
                </div>
                <div className="px-1.5 py-1 bg-dark-800"><div className="text-white text-[10px] truncate">{f.forum_name}</div></div>
              </div>
            )})}
          </div>
          <div className="mt-4 pt-3 border-t border-dark-700">
            <Text className="!text-white !text-xs !font-semibold block mb-2">Related Games</Text>
            <div className="space-y-2">
              {relatedGames.map((g: any) => (
                <div key={g.id} onClick={() => navigate(`/${currentLang}/games/${g.slug || g.id}/forum`)}
                  className="cursor-pointer rounded-lg overflow-hidden border border-dark-600 hover:border-blue-500/50 transition-all">
                  <div className="h-14 bg-dark-700 overflow-hidden">
                    {(g.imageUrl || (g as any).coverImageUrl) ? <img src={g.imageUrl || (g as any).coverImageUrl} alt={g.title} className="w-full h-full object-cover" /> :
                      <div className="w-full h-full flex items-center justify-center text-gray-500 text-lg">{g.title?.[0]}</div>}
                  </div>
                  <div className="px-1.5 py-1 bg-dark-800"><div className="text-white text-[10px] truncate">{g.title}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );

  if (isLoading) return <div className="bg-dark-900"><div className="py-6"><Sidebar><Skeleton active avatar paragraph={{ rows: 8 }} /></Sidebar></div></div>;

  if (error || !post) return (
    <div className="bg-dark-900"><div className="py-6"><Sidebar>
      <Alert message="Failed to load" description={error instanceof Error ? error.message : 'Post not found'} type="error" showIcon
        action={<Button type="primary" onClick={() => navigate(-1)}>Back</Button>} />
    </Sidebar></div></div>
  );

  return (
    <>
      <SEO title={`${post.title} - Community`} description={post.content?.substring(0, 160) || ''}
        keywords={post.tags?.join(', ')} type="article" author={post.author} publishedTime={post.createdAt} tags={post.tags} />
      <SEOBreadcrumb items={[
        { name: 'Home', url: `/${currentLang}` },
        { name: 'Community', url: `/${currentLang}/community` },
        { name: post.title, url: `/${currentLang}/community/posts/${post.id}` },
      ]} />
      <div className="bg-dark-900">
        <div className="py-6">
          <Button type="text" icon={<ArrowLeftOutlined />} className="!text-gray-400 hover:!text-white mb-6" onClick={() => navigate(-1)}>Back</Button>
          <Sidebar>
            <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-3 mb-4 flex-wrap">
                {post.isPinned && <Tag icon={<PushpinOutlined />} color="blue">Pinned</Tag>}
                {post.isLocked && <Tag icon={<LockOutlined />} color="orange">Locked</Tag>}
              </div>
              <Title level={1} className="!text-white !mb-4">{post.title}</Title>
              <div className="flex items-center gap-4 mb-6 text-gray-400 flex-wrap">
                <Space><Avatar size="small" icon={<UserOutlined />} src={post.authorAvatar} /><Text className="!text-gray-300">{post.author}</Text></Space>
                <Space><CalendarOutlined /><Text className="!text-gray-400 text-sm">{formatDate(post.publishDate)}</Text></Space>
                <Space><LikeOutlined /><Text className="!text-gray-400 text-sm">{post.likes}</Text></Space>
              </div>
              <Divider className="!border-dark-700" />
              <BlogRenderContent content={post.content} />
            </div>
            <div className="mt-6">
              <Title level={3} className="!text-white !mb-4 !text-lg">Comments ({post.comments || 0})</Title>
              {isAuthenticated ? (
                <CommentList parentType="community_post" parentId={post.id} />
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Please sign in to view comments
                </div>
              )}
            </div>
          </Sidebar>
        </div>
      </div>
    </>
  );
};

export default CommunityPostDetailPage;
