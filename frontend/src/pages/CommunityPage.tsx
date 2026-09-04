import { useState, useMemo, useEffect } from 'react';
import { Typography, Tag, Button, Input, Avatar, Tabs, Pagination, Spin, Alert, Empty } from 'antd';
import { SearchOutlined, CalendarOutlined, LikeOutlined, MessageOutlined, FireOutlined, UserOutlined, StarFilled, DownOutlined, UpOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useCommunityPosts, useReviews, useGames } from '../api/hooks';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import apiService from '../api';

const { Title, Paragraph, Text } = Typography;
const { Search } = Input;

const CommunityPage = () => {
  const { isAuthenticated } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('feed');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [followed, setFollowed] = useState<any[]>([]);
  const { t } = useTranslation();
  const { t: tg } = useTranslation('games');
  const navigate = useNavigate();
  const pageSize = 8;

  const { data: posts = [], isLoading: postsLoading, isError: postsError } = useCommunityPosts();
  const { data: reviews = [], isLoading: reviewsLoading, isError: reviewsError } = useReviews();
  const { data: games = [] } = useGames({ limit: 50 });

  const lang = window.location.pathname.split('/')[1] || 'cn';
  const loading = postsLoading || reviewsLoading;
  const error = postsError || reviewsError ? '加载失败' : null;

  // Load followed forums
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { setFollowed([]); return; }
    fetch('/api/v1/community/followed', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setFollowed(d.data || [])).catch(() => {});
  }, [isAuthenticated]);

  const follow = async (game: any) => {
    const token = localStorage.getItem('accessToken');
    if (!token) { navigate(`/${lang}/login`); return; }
    await fetch('/api/v1/community/follow', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ forumType: 'game', forumId: String(game.id), forumName: game.title }),
    });
    setFollowed(prev => [...prev.filter(f => f.forum_id !== String(game.id)), { forum_id: String(game.id), forum_name: game.title }]);
  };

  const unfollow = async (forumId: string) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    await fetch(`/api/v1/community/follow/${forumId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setFollowed(prev => prev.filter(f => f.forum_id !== forumId));
  };

  const isFollowed = (forumId: string) => followed.some(f => f.forum_id === forumId);

  // Build feed
  const feedItems = useMemo(() => [
    ...posts.map((p: any) => ({ ...p, _type: 'post' })),
    ...reviews.map((r: any) => ({ ...r, _type: 'review' })),
  ].sort((a: any, b: any) => new Date(b.publishDate || b.createdAt || 0).getTime() - new Date(a.publishDate || a.createdAt || 0).getTime()), [posts, reviews]);

  const filteredFeed = useMemo(() => {
    if (!searchText) return feedItems;
    return feedItems.filter(item => ['title', 'content', 'gameTitle'].some(f => String(item[f] || '').toLowerCase().includes(searchText.toLowerCase())));
  }, [feedItems, searchText]);

  const currentItems = activeTab === 'feed' ? filteredFeed
    : activeTab === 'posts' ? posts.filter((p: any) => !searchText || (p.title || '').toLowerCase().includes(searchText.toLowerCase()))
    : reviews.filter((r: any) => !searchText || (r.title || '').toLowerCase().includes(searchText.toLowerCase()));

  const paginated = currentItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => { setCurrentPage(1); }, [activeTab]);

  const formatDate = (d: string) => { try { return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return d || ''; } };

  // Game card in left sidebar
  const renderFollowedGame = (game: any) => (
    <div key={game.id} className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-dark-700 cursor-pointer group"
      onClick={() => navigate(`/${lang}/games/${game.slug || game.id}/forum`)}>
      <Avatar shape="square" size={32} src={game.imageUrl || game.coverImageUrl} className="flex-shrink-0">{game.title?.[0]}</Avatar>
      <div className="flex-1 min-w-0">
        <div className="text-white text-xs truncate">{game.title}</div>
        <div className="text-gray-500 text-[10px]">{(game.genres || []).slice(0, 2).map((g: string) => tg(`genreNames.${g}`, { defaultValue: g })).join(' / ')}</div>
      </div>
      <button className="text-gray-600 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={e => { e.stopPropagation(); unfollow(String(game.id)); }}>✕</button>
    </div>
  );

  // Accordion post card
  const renderPostCard = (item: any, idx: number) => {
    const isExpanded = expandedId === `${item._type}-${item.id}`;
    const toggle = () => setExpandedId(isExpanded ? null : `${item._type}-${item.id}`);
    return (
      <div key={`${item._type}-${item.id}`} className="border-b border-dark-700 pb-3 mb-3 last:mb-0 last:border-b-0">
        <div className="flex items-start gap-3 cursor-pointer hover:bg-dark-750 rounded-lg px-2 py-2 transition-colors" onClick={toggle}>
          <Avatar size={36} icon={<UserOutlined />} className="flex-shrink-0 mt-1" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Text className="!text-white !text-sm font-medium line-clamp-1">{item.title}</Text>
              {item._type === 'review' && <Tag color="purple" className="text-[10px] leading-none">评测</Tag>}
              {item._type === 'post' && <Tag color="blue" className="text-[10px] leading-none">帖子</Tag>}
              {item.gameTitle && <Tag className="text-[10px] leading-none">{item.gameTitle}</Tag>}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{item.authorName || item.author || item.username}</span>
              <span><CalendarOutlined className="mr-1" />{formatDate(item.publishDate || item.createdAt)}</span>
              <span><LikeOutlined className="mr-1" />{item.likes || 0}</span>
              <span><MessageOutlined className="mr-1" />{item.comments || 0}</span>
            </div>
          </div>
          <span className="text-gray-500 text-xs mt-2">{isExpanded ? <UpOutlined /> : <DownOutlined />}</span>
        </div>
        {isExpanded && (
          <div className="mt-3 px-2 pl-14">
            <Paragraph className="!text-gray-300 !text-sm whitespace-pre-wrap leading-relaxed">{item.content}</Paragraph>
            {item.tags && (
              <div className="flex flex-wrap gap-1 mt-2">
                {(Array.isArray(item.tags) ? item.tags : []).map((tag: string) => <Tag key={tag} className="text-xs bg-dark-700 border-0 text-gray-400">{tag}</Tag>)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-dark-900">
      <SEO title="社区论坛 | GameHub" description="玩家社区讨论" />
      <div className="py-6">
        <div className="flex items-center justify-between mb-4">
          <Title level={1} className="!text-white !mb-0 !text-2xl">社区论坛</Title>
          <Search placeholder="搜索..." prefix={<SearchOutlined />} value={searchText} onChange={e => setSearchText(e.target.value)} allowClear className="max-w-xs" />
        </div>

        <div className="flex gap-6">
          {/* Left: Followed Games */}
          <div className="w-52 flex-shrink-0 hidden lg:block">
            <div className="bg-dark-800 border border-dark-700 rounded-xl p-3 sticky top-4">
              <div className="flex items-center justify-between mb-3">
                <Text className="!text-white !text-sm !font-semibold">🎮 热门游戏</Text>
              </div>
              <div className="max-h-[400px] overflow-y-auto space-y-1 space-scroll">
                {(games || []).slice(0, 15).map((game: any) => (
                  <div key={game.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-dark-700 group">
                    <Avatar shape="square" size={28} src={game.imageUrl || game.coverImageUrl} className="flex-shrink-0">{game.title?.[0]}</Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs truncate cursor-pointer" onClick={() => navigate(`/${lang}/games/${game.slug || game.id}/forum`)}>{game.title}</div>
                    </div>
                    <button className="text-xs cursor-pointer"
                      style={{ color: isFollowed(String(game.id)) ? '#ef4444' : '#6b7280' }}
                      onClick={() => isFollowed(String(game.id)) ? unfollow(String(game.id)) : follow(game)}>
                      {isFollowed(String(game.id)) ? <StarFilled /> : <StarFilled className="opacity-30" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Post list */}
          <div className="flex-1 min-w-0">
            <Tabs activeKey={activeTab} onChange={k => { setActiveTab(k); setExpandedId(null); }}
              items={[
                { key: 'feed', label: '精选' },
                { key: 'posts', label: '帖子' },
                { key: 'reviews', label: '评测' },
              ]} />

            {error && <Alert type="error" message={error} showIcon className="mb-4" />}
            {loading && <div className="flex justify-center py-20"><Spin size="large" /></div>}

            {!loading && !error && paginated.length === 0 && (
              <Empty description="暂无内容" />
            )}

            {!loading && !error && paginated.length > 0 && (
              <div className="bg-dark-800 border border-dark-700 rounded-xl p-4">
                {paginated.map((item: any, idx: number) => renderPostCard(item, idx))}
              </div>
            )}

            {currentItems.length > pageSize && (
              <div className="flex justify-center mt-6">
                <Pagination current={currentPage} pageSize={pageSize} total={currentItems.length}
                  onChange={setCurrentPage} showTotal={t => `共 ${t} 条`} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityPage;
