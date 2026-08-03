import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Button, Avatar, Skeleton, Alert, Pagination, Tag, Modal, Input, message } from 'antd';
import { ArrowLeftOutlined, MessageOutlined, UserOutlined, CalendarOutlined, LikeOutlined, StarFilled, PlusOutlined, PictureOutlined, LoadingOutlined } from '@ant-design/icons';
import { useGame, useGamePosts, useGames } from '../api/hooks';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import BlogRenderContent from '../components/blog/BlogRenderContent';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;
const PAGE_SIZE = 10;

const GameForumPage = () => {
  const { id, lang } = useParams<{ id: string; lang: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const currentLang = lang || 'cn';
  const [currentPage, setCurrentPage] = useState(1);
  const [followed, setFollowed] = useState<any[]>([]);
  const [isFollowed, setIsFollowed] = useState(false);
  const [postModal, setPostModal] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: game, isLoading: gameLoading, isError: gameError } = useGame(id || '');
  const { data: posts = [], isLoading: postsLoading, isError: postsError, refetch } = useGamePosts(id || '');
  const { data: allGames = [] } = useGames({ limit: 20 });
  const relatedGames = (allGames || []).filter((g: any) => String(g.id) !== id).slice(0, 6);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { setFollowed([]); return; }
    fetch('/api/v1/community/followed', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setFollowed(d.data || []); setIsFollowed((d.data || []).some((f: any) => f.forum_id === id)); }).catch(() => {});
  }, [id, isAuthenticated]);

  const follow = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) { navigate(`/${currentLang}/login`); return; }
    await fetch('/api/v1/community/follow', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ forumType: 'game', forumId: id, forumName: game?.title || '' }),
    });
    setIsFollowed(true);
  };

  const unfollow = async () => {
    await fetch(`/api/v1/community/follow/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } });
    setIsFollowed(false);
  };

  const handlePost = async () => {
    if (!postTitle.trim() || !postContent.trim()) { message.warning('请填写标题和内容'); return; }
    const token = localStorage.getItem('accessToken');
    if (!token) { navigate(`/${currentLang}/login`); return; }
    setPosting(true);
    try {
      await fetch('/api/v1/community/posts', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: postTitle, content: postContent, category: '讨论', gameId: Number(id) }),
      });
      message.success('发帖成功');
      setPostModal(false); setPostTitle(''); setPostContent('');
      setTimeout(() => window.location.reload(), 500);
    } catch { message.error('发帖失败'); }
    finally { setPosting(false); }
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    const fd = new FormData(); fd.append('file', file);
    const token = localStorage.getItem('accessToken') || '';
    try {
      const res = await fetch('/api/v1/upload/image', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const d = await res.json();
      const url = d?.data?.file?.url || d?.data?.url;
      if (url) { setPostContent(prev => prev + `\n![图片](${url})\n`); message.success('图片已插入'); }
      else message.error('上传失败');
    } catch { message.error('上传失败'); }
    finally { setUploading(false); }
  };

  const paginated = posts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return d || ''; }
  };

  const loading = gameLoading || postsLoading;
  const isError = gameError || postsError;

  const Sidebar = ({ children }: { children: React.ReactNode }) => (
    <div className="flex gap-6">
      <div className="w-64 flex-shrink-0 hidden lg:block">
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-3 sticky top-4">
          <Text className="!text-white !text-sm !font-semibold block mb-3">我的关注</Text>
          <div className="max-h-[350px] overflow-y-auto space-y-2 space-scroll">
            {followed.length === 0 && <Text className="!text-gray-500 !text-xs">暂无关注的论坛</Text>}
            {followed.slice(0, 20).map((f: any) => {
              const game = allGames.find((g: any) => String(g.id) === f.forum_id);
              return (
              <div key={f.forum_id} onClick={() => navigate(`/${currentLang}/games/${f.forum_id}/forum`)}
                className={`cursor-pointer rounded-lg overflow-hidden border transition-all ${f.forum_id === id ? 'border-blue-500 bg-blue-500/10' : 'border-dark-600 hover:border-blue-500/50'}`}>
                <div className="h-14 bg-dark-700 overflow-hidden">
                  {(game?.imageUrl || game?.coverImageUrl) ? <img src={game.imageUrl || game.coverImageUrl} alt="" className="w-full h-full object-cover" /> :
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-lg">{f.forum_name?.[0]}</div>}
                </div>
                <div className="px-1.5 py-1 bg-dark-800"><div className="text-white text-[10px] truncate">{f.forum_name}</div></div>
              </div>
            )})}
          </div>
          <div className="mt-4 pt-3 border-t border-dark-700">
            <Text className="!text-white !text-xs !font-semibold block mb-2">相关游戏</Text>
            <div className="space-y-2">
              {relatedGames.map((g: any) => (
                <div key={g.id} onClick={() => navigate(`/${currentLang}/games/${g.id}/forum`)}
                  className="cursor-pointer rounded-lg overflow-hidden border border-dark-600 hover:border-blue-500/50 transition-all">
                  <div className="h-14 bg-dark-700 overflow-hidden">
                    {(g.imageUrl || g.coverImageUrl) ? <img src={g.imageUrl || g.coverImageUrl} alt={g.title} className="w-full h-full object-cover" /> :
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

  if (loading) return <div className="min-h-screen bg-dark-900"><div className="py-6"><Sidebar><Skeleton active paragraph={{ rows: 8 }} /></Sidebar></div></div>;
  if (isError || !game) return <div className="min-h-screen bg-dark-900"><div className="py-6"><Sidebar><Alert message="加载失败" type="error" showIcon /></Sidebar></div></div>;

  return (
    <div className="min-h-screen bg-dark-900">
      <SEO title={`${game.title} 论坛 | GameHub`} description={`参与 ${game.title} 讨论交流`} />
      <div className="py-6">
        <Button type="text" className="!text-gray-400 hover:!text-white mb-4" icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/${currentLang}/community`)}>返回社区</Button>
        <Sidebar>
          {/* Game Banner */}
          <div className="mb-6">
            {game.coverImageUrl && <div className="h-48 overflow-hidden rounded-xl mb-4"><img src={game.coverImageUrl} alt={game.title} className="w-full h-full object-cover" /></div>}
            <div className="flex items-start justify-between mb-2">
              <div>
                <Title level={2} className="!text-white !mb-1">{game.title} 论坛</Title>
                <div className="flex flex-wrap gap-1 mb-2">{(game.genres || []).map((g: string) => <Tag key={g} className="text-xs bg-dark-700 border-0 text-gray-300">{g}</Tag>)}</div>
              </div>
              <Button type={isFollowed ? 'default' : 'primary'} icon={<StarFilled />} onClick={isFollowed ? unfollow : follow}
                className={isFollowed ? '!bg-dark-700 !text-yellow-400 !border-dark-600' : ''}>{isFollowed ? '已关注' : '关注'}</Button>
            </div>
            <Paragraph className="!text-gray-400 !text-sm mb-3">{game.description || `${game.title} 官方社区论坛`}</Paragraph>
            <div className="text-xs text-gray-500 bg-dark-800/50 rounded-lg px-3 py-2 border border-dark-700">📢 社区公告：欢迎来到{game.title}论坛，请友善交流，遵守社区规范。</div>
          </div>

          {/* Posts */}
          <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <Title level={4} className="!text-white !mb-0">讨论 ({posts.length})</Title>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { if (!isAuthenticated) { navigate(`/${currentLang}/login`); return; } setPostModal(true); }}>发帖</Button>
            </div>
            {postsError ? <Alert message="加载失败" type="error" showIcon /> :
             paginated.length === 0 ? <div className="text-center py-16 text-gray-500">还没有帖子，来发第一个吧 ✍️</div> :
              <div>
                {paginated.map((post: any) => (
                  <div key={post.id} className="py-4 border-b border-dark-700 last:border-b-0 rounded-xl px-3 -mx-3 hover:bg-dark-750 hover:border-dark-600 transition-all duration-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar size={32} icon={<UserOutlined />} className="flex-shrink-0" />
                      <div>
                        <span className="text-white text-sm font-medium">{post.author || '匿名'}</span>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{formatDate(post.publishDate)}</span>
                          <span className="cursor-pointer hover:text-blue-400" onClick={() => navigate(`/${currentLang}/community/posts/${post.id}`)}>
                            <MessageOutlined className="mr-1" />{post.comments || 0}
                          </span>
                          <span><LikeOutlined className="mr-1" style={{fontSize:10}} />{post.likes || 0}</span>
                        </div>
                      </div>
                      {post.isPinned && <Tag color="orange" className="text-[10px] leading-none ml-auto">置顶</Tag>}
                    </div>
                    {post.title && <Title level={5} className="!text-white !mb-2">{post.title}</Title>}
                    <div onClick={() => navigate(`/${currentLang}/community/posts/${post.id}`)} className="cursor-pointer">
                      <BlogRenderContent content={post.content} />
                    </div>
                  </div>
                ))}
              </div>
            }
            {posts.length > PAGE_SIZE && <div className="flex justify-center mt-6"><Pagination current={currentPage} pageSize={PAGE_SIZE} total={posts.length} onChange={setCurrentPage} showSizeChanger={false} /></div>}
          </div>
        </Sidebar>
      </div>

      {/* Post Modal */}
      <Modal title="发布新帖" open={postModal} onCancel={() => setPostModal(false)} onOk={handlePost} confirmLoading={posting} okText="发布" cancelText="取消" width={500}>
        <div className="space-y-4 mt-4">
          <Input placeholder="帖子标题" value={postTitle} onChange={e => setPostTitle(e.target.value)} size="large" maxLength={100} />
          <TextArea placeholder="说点什么...支持 Markdown" value={postContent} onChange={e => setPostContent(e.target.value)} rows={6} maxLength={5000} showCount />
          <div className="flex items-center gap-2 mt-2">
            <Button icon={uploading ? <LoadingOutlined /> : <PictureOutlined />} onClick={() => {
              const input = document.createElement('input');
              input.type = 'file'; input.accept = 'image/*';
              input.onchange = (e: any) => { const f = e.target?.files?.[0]; if (f) uploadImage(f); };
              input.click();
            }} loading={uploading}>上传图片</Button>
            <Text className="!text-gray-500 !text-xs">或直接粘贴图片 URL: ![](url)</Text>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GameForumPage;
