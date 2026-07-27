import { useState, useMemo, useEffect } from 'react';
import { Typography, Card, Row, Col, Tag, Button, Input, Avatar, Tabs, List, Pagination, Spin, Alert, message } from 'antd';
import { SearchOutlined, CalendarOutlined, LikeOutlined, MessageOutlined, FireOutlined, UserOutlined, PlusOutlined, StarOutlined, EditOutlined, ReloadOutlined, TrophyOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useCommunityPosts, useReviews } from '../api/hooks';
import type { CommunityPost, Review } from '../api/types';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';

const { Title, Paragraph, Text } = Typography;
const { Search } = Input;

const CommunityPage = () => {
  const { isAdmin } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('feed');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Use React Query hooks instead of raw useEffect + apiService
  const {
    data: posts = [],
    isLoading: postsLoading,
    isError: postsError,
    refetch: refetchPosts,
  } = useCommunityPosts();
  const {
    data: reviews = [],
    isLoading: reviewsLoading,
    isError: reviewsError,
    refetch: refetchReviews,
  } = useReviews();

  const loading = postsLoading || reviewsLoading;
  const error = postsError || reviewsError ? '获取社区数据失败' : null;

  // Build feed — memoized
  const feedItems = useMemo(() => [
    ...posts.map(p => ({ ...p, _type: 'post' as const })),
    ...reviews.map(r => ({ ...r, _type: 'review' as const })),
  ].sort((a, b) => {
    const dateA = new Date(a.publishDate || a.createdAt || 0).getTime();
    const dateB = new Date(b.publishDate || b.createdAt || 0).getTime();
    return dateB - dateA;
  }), [posts, reviews]);

  // Search filter
  const filterBySearch = (items: any[], fields: string[]) => {
    if (!searchText) return items;
    return items.filter(item =>
      fields.some(f =>
        String(item[f] || '').toLowerCase().includes(searchText.toLowerCase())
      )
    );
  };

  const filteredPosts = filterBySearch(posts, ['title', 'content']);
  const filteredReviews = filterBySearch(reviews, ['title', 'content', 'gameTitle']);
  const filteredFeed = filterBySearch(feedItems, ['title', 'content', 'gameTitle']);

  const paginate = (items: any[]) => items.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset page on tab switch
  useEffect(() => { setCurrentPage(1); }, [activeTab]);

  const currentItems = activeTab === 'feed' ? filteredFeed
    : activeTab === 'posts' ? filteredPosts
    : filteredReviews;

  const paginatedItems = paginate(currentItems);

  // Hot posts/reviews — memoized
  const hotPosts = useMemo(() =>
    [...posts].sort((a, b) => b.likes - a.likes).slice(0, 3),
  [posts]);
  const hotReviews = useMemo(() =>
    [...reviews].sort((a, b) => b.likes - a.likes).slice(0, 3),
  [reviews]);

  const categories = ['all', ...new Set(posts.map(p => p.category))];

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const handleSearch = (value: string) => setSearchText(value);
  const handleResetFilters = () => { setSearchText(''); setActiveTab('feed'); };
  const handleRetry = () => { refetchPosts(); refetchReviews(); };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'green';
    if (rating >= 4.0) return 'blue';
    if (rating >= 3.0) return 'orange';
    return 'red';
  };

  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://www.gghubs.com';
  const communityStructuredData = [
    {
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': '首页', 'item': siteUrl },
        { '@type': 'ListItem', 'position': 2, 'name': '社区', 'item': `${siteUrl}/community` },
      ],
    },
    {
      '@type': 'DiscussionForumPosting',
      'name': 'GGHubs 游戏社区',
      'description': 'GGHubs官方游戏社区 - 与全球游戏爱好者交流心得、发表评测、分享经验',
      'mainEntityOfPage': `${siteUrl}/community`,
    },
  ];

  return (
    <div className="min-h-screen bg-dark-900">
      <SEO
        title={t('seo.communityTitle', '官方社区 | GameHub')}
        description={t('seo.communityDescription', '与全球游戏爱好者交流心得、发表评测、分享经验')}
        keywords={t('seo.communityKeywords', '游戏社区, 玩家交流, 游戏讨论, 游戏评测, 游戏论坛, 官方社区')}
        structuredData={communityStructuredData}
      />

      {/* 主要内容 */}
      <div className="py-12">
        <div className="text-center mb-8">
          <Title level={1} className="!text-gray-100 mb-4">官方社区</Title>
          <Paragraph className="text-lg text-gray-400 max-w-3xl mx-auto mb-6">
            与全球游戏爱好者交流心得、发表评测、分享经验
          </Paragraph>
          <div className="max-w-2xl mx-auto">
            <Search
              placeholder="搜索帖子、评测..."
              size="large"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={handleSearch}
              enterButton={<Button type="primary" icon={<SearchOutlined />}>搜索</Button>}
            />
          </div>
        </div>
        {error && (
          <Alert
            title="数据加载失败"
            description={error}
            type="error"
            showIcon
            closable
            className="mb-6"
            action={
              <Button size="small" icon={<ReloadOutlined />} onClick={handleRetry}>
                重试
              </Button>
            }
          />
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Spin size="large" />
          </div>
        ) : (
          <Row gutter={[32, 32]}>
            {/* 左侧内容 */}
            <Col xs={24} lg={16}>
              {/* Tab 导航 */}
              <Card className="mb-8">
                <Tabs activeKey={activeTab} onChange={setActiveTab}
                  items={[
                    {
                      key: 'feed',
                      label: (
                        <span className="flex items-center gap-1">
                          <FireOutlined /> 综合动态
                          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded ml-1">{feedItems.length}</span>
                        </span>
                      ),
                    },
                    {
                      key: 'posts',
                      label: (
                        <span className="flex items-center gap-1">
                          <MessageOutlined /> 帖子
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded ml-1">{posts.length}</span>
                        </span>
                      ),
                    },
                    {
                      key: 'reviews',
                      label: (
                        <span className="flex items-center gap-1">
                          <EditOutlined /> 评测
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded ml-1">{reviews.length}</span>
                        </span>
                      ),
                    },
                  ]}
                />
              </Card>

              {/* 内容列表 */}
              {paginatedItems.length > 0 ? (
                <>
                  <div className="space-y-6">
                    {paginatedItems.map((item: any) => (
                      <Card
                        key={`${item._type || 'post'}-${item.id}`}
                        className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                        onClick={() => {
                          if (item._type === 'review') {
                            navigate(`/${window.location.pathname.split('/')[1]}/community/reviews/${item.id}`);
                          } else {
                            navigate(`/${window.location.pathname.split('/')[1]}/community/posts/${item.id}`);
                          }
                        }}
                      >
                        <div className="mb-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {item._type === 'review' && (
                                <Tag icon={<StarOutlined />} color="gold">评测</Tag>
                              )}
                              <Title level={4} className="mb-0 hover:text-blue-600 transition-colors">
                                {item.title}
                              </Title>
                            </div>
                            {item._type !== 'review' && (
                              <Tag color="blue">{item.category}</Tag>
                            )}
                          </div>

                          {item.gameTitle && (
                            <div className="mb-3">
                              <Tag icon={<TrophyOutlined />} color="purple">
                                游戏: {item.gameTitle}
                              </Tag>
                            </div>
                          )}

                          {item._type === 'review' && item.scores && (
                            <div className="flex items-center gap-3 mb-3">
                              <Tag color={getRatingColor(item.rating)}>
                                评分: {Number(item.rating).toFixed(1)}
                              </Tag>
                              {item.gameTitle && (
                                <Text type="secondary" className="text-sm">
                                  游戏: {item.gameTitle}
                                </Text>
                              )}
                            </div>
                          )}

                          <Paragraph className="text-gray-300 mb-4" ellipsis={{ rows: 3 }}>
                            {item.content || (item as any).excerpt}
                          </Paragraph>
                        </div>

                        <div className="flex flex-wrap items-center justify-between text-gray-400 text-sm pt-4 border-t border-dark-700">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              <Avatar size="small" icon={<UserOutlined />}
                                style={{ backgroundColor: '#1890ff' }} className="mr-2" />
                              <span className="font-semibold">{item.author || item.authorId || '匿名'}</span>
                            </div>
                            <span className="flex items-center">
                              <CalendarOutlined className="mr-1" />
                              {formatDate(item.publishDate || item.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-6">
                            <span className="flex items-center">
                              <LikeOutlined className="mr-1" />
                              {item.likes || 0}
                            </span>
                            <span className="flex items-center">
                              <MessageOutlined className="mr-1" />
                              {item.comments || 0}
                            </span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  <div className="mt-12 flex justify-center">
                    <Pagination
                      current={currentPage}
                      pageSize={pageSize}
                      total={currentItems.length}
                      onChange={setCurrentPage}
                      showSizeChanger={false}
                      showTotal={(total) => `共 ${total} 条内容`}
                    />
                  </div>
                </>
              ) : (
                <Card className="text-center py-16">
                  <Title level={2} className="text-gray-500 mb-4">未找到相关内容</Title>
                  <Paragraph className="text-gray-400 mb-8">
                    尝试调整搜索关键词或切换分类
                  </Paragraph>
                  <Button type="primary" size="large" onClick={handleResetFilters}>
                    重置筛选条件
                  </Button>
                </Card>
              )}
            </Col>

            {/* 右侧边栏 */}
            <Col xs={24} lg={8}>
              {/* 发布入口 */}
              <Card className="mb-8 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-dark-700">
                <div className="text-center">
                  <Title level={4} className="mb-4 !text-gray-100">分享你的游戏故事</Title>
                  <Paragraph className="text-gray-400 mb-6">
                    发表评测或帖子，与社区玩家交流
                  </Paragraph>
                  <div className="flex flex-col gap-3">
                    {isAdmin && (
                      <Button type="primary" size="large" icon={<EditOutlined />}
                        onClick={() => {
                          const lang = window.location.pathname.split('/')[1] || 'cn';
                          navigate(`/${lang}/community/reviews/new`);
                        }}>
                        写评测
                      </Button>
                    )}
                    {isAdmin && (
                      <Button size="large" icon={<PlusOutlined />}
                        onClick={() => {
                          const lang = window.location.pathname.split('/')[1] || 'cn';
                          navigate(`/${lang}/community/posts/new`);
                        }}>
                        发帖子
                      </Button>
                    )}
                  </div>
                </div>
              </Card>

              {/* 热门帖子 */}
              {hotPosts.length > 0 && (
                <Card title="🔥 热门帖子" className="mb-8">
                  <List
                    dataSource={hotPosts}
                    renderItem={(post, index) => (
                      <List.Item className="!px-0 !py-3 border-b border-dark-700 last:border-b-0"
                        onClick={() => {
                          const lang = window.location.pathname.split('/')[1] || 'cn';
                          navigate(`/${lang}/community/posts/${post.id}`);
                        }}
                        style={{ cursor: 'pointer' }}>
                        <div className="w-full">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400 text-sm">#{index + 1}</span>
                            <div className="flex items-center">
                              <FireOutlined className="text-red-500 mr-1" />
                              <span className="font-semibold">{post.likes}</span>
                            </div>
                          </div>
                          <div className="font-medium mb-1 hover:text-blue-600">{post.title}</div>
                          <div className="flex items-center justify-between text-gray-400 text-sm">
                            <span>{post.author}</span>
                            <span>{formatDate(post.publishDate)}</span>
                          </div>
                        </div>
                      </List.Item>
                    )}
                  />
                </Card>
              )}

              {/* 热门评测 */}
              {hotReviews.length > 0 && (
                <Card title="⭐ 热门评测" className="mb-8">
                  <List
                    dataSource={hotReviews}
                    renderItem={(review, index) => (
                      <List.Item className="!px-0 !py-3 border-b border-dark-700 last:border-b-0"
                        onClick={() => {
                          const lang = window.location.pathname.split('/')[1] || 'cn';
                          navigate(`/${lang}/community/reviews/${review.id}`);
                        }}
                        style={{ cursor: 'pointer' }}>
                        <div className="w-full">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400 text-sm">#{index + 1}</span>
                            <Tag color={getRatingColor(review.rating)}>{Number(review.rating).toFixed(1)}</Tag>
                          </div>
                          <div className="font-medium mb-1 hover:text-blue-600">{review.title}</div>
                          <div className="text-gray-400 text-sm truncate">{review.gameTitle}</div>
                        </div>
                      </List.Item>
                    )}
                  />
                </Card>
              )}

              {/* 社区统计 */}
              <Card title="社区统计" className="mb-8">
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <div className="text-center p-3 bg-blue-900/30 rounded-lg border border-blue-800/50">
                      <div className="text-2xl font-bold text-blue-400">{posts.length + reviews.length}</div>
                      <div className="text-gray-400 text-sm">总内容数</div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div className="text-center p-3 bg-purple-900/30 rounded-lg border border-purple-800/50">
                      <div className="text-2xl font-bold text-purple-400">{posts.length}</div>
                      <div className="text-gray-400 text-sm">帖子</div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div className="text-center p-3 bg-green-900/30 rounded-lg border border-green-800/50">
                      <div className="text-2xl font-bold text-green-400">{reviews.length}</div>
                      <div className="text-gray-400 text-sm">评测</div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div className="text-center p-3 bg-orange-900/30 rounded-lg border border-orange-800/50">
                      <div className="text-2xl font-bold text-orange-400">
                        {posts.reduce((s, p) => s + (p.comments || 0), 0) + reviews.reduce((s, r) => s + (r.comments || 0), 0)}
                      </div>
                      <div className="text-gray-600 text-sm">总评论</div>
                    </div>
                  </Col>
                </Row>
              </Card>

              {/* 社区规则 */}
              <Card title="社区规则">
                <List size="small"
                  dataSource={[
                    '尊重他人，文明交流',
                    '禁止发布广告和垃圾信息',
                    '遵守法律法规，不传播违法内容',
                    '鼓励原创，转载需注明出处',
                    '评测需客观公正，谢绝水军',
                  ]}
                  renderItem={(rule, index) => (
                    <List.Item className="!px-0 !py-2">
                      <span className="text-gray-300">{index + 1}. {rule}</span>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        )}
      </div>
    </div>
  );
};

export default CommunityPage;
