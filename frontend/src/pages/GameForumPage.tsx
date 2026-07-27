import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography,
  Card,
  Button,
  Avatar,
  List,
  Skeleton,
  Alert,
  Pagination,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  MessageOutlined,
  UserOutlined,
  CalendarOutlined,
  LikeOutlined,
  PlusOutlined,
  ReloadOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { useGame, useGamePosts } from '../api/hooks';
import SEO from '../components/SEO';

const { Title, Text } = Typography;

const PAGE_SIZE = 10;

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

const GameForumPage = () => {
  const { id, lang } = useParams<{ id: string; lang: string }>();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);

  const { data: game, isLoading: gameLoading, isError: gameError } = useGame(id || '');
  const { data: posts = [], isLoading: postsLoading, isError: postsError, refetch } = useGamePosts(id || '');

  const loading = gameLoading || postsLoading;
  const isError = gameError || postsError;

  const paginatedPosts = posts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleRetry = () => {
    refetch();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900">
        <div className="py-8 -mx-4">
          <Skeleton active paragraph={{ rows: 1 }} className="mb-6" />
          <Card className="bg-dark-800 border-dark-700">
            <Skeleton active paragraph={{ rows: 6 }} />
          </Card>
        </div>
      </div>
    );
  }

  if (isError || !game) {
    return (
      <div className="min-h-screen bg-dark-900">
        <div className="py-8 -mx-4">
          <Alert
            message="加载失败"
            description="无法加载游戏论坛信息，请稍后重试。"
            type="error"
            showIcon
            action={<Button onClick={handleRetry} icon={<ReloadOutlined />}>重试</Button>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <SEO
        title={`${game.title} 论坛 | GGHubs`}
        description={`在 GGHubs 上参与 ${game.title} 的讨论与交流`}
        keywords={`${game.title}, 游戏论坛, 游戏讨论, GGHubs`}
      />
      <div className="py-8 -mx-4">
        {/* 返回按钮 */}
        <Button
          type="text"
          className="mb-4 text-gray-400 hover:text-white"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/${lang || window.location.pathname.split('/')[1]}/games/${id}`)}
        >
          返回游戏详情
        </Button>

        {/* 游戏信息头部 */}
        <Card className="mb-6 bg-dark-800 border-dark-700">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-dark-700">
              {game.imageUrl ? (
                <img src={game.imageUrl} alt={game.title} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <TrophyOutlined className="text-3xl text-gray-500" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <Title level={3} className="!mb-1 !text-white truncate">
                {game.title} 论坛
              </Title>
              <Text type="secondary">
                共 {posts.length} 个讨论
              </Text>
            </div>
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => navigate(`/${lang || window.location.pathname.split('/')[1]}/community/posts/new?gameId=${id}`)}
            >
              发帖
            </Button>
          </div>
        </Card>

        {/* 帖子列表 */}
        <Card className="bg-dark-800 border-dark-700">
          <div className="flex items-center justify-between mb-6">
            <Title level={4} className="!mb-0 !text-white">
              全部讨论
            </Title>
            <Text type="secondary">{posts.length} 个帖子</Text>
          </div>

          {postsError ? (
            <Alert
              message="加载帖子失败"
              type="error"
              showIcon
              action={<Button onClick={handleRetry} icon={<ReloadOutlined />}>重试</Button>}
            />
          ) : paginatedPosts.length === 0 ? (
            <div className="text-center py-16">
              <MessageOutlined className="text-6xl text-gray-600 mb-4" />
              <Title level={4} className="text-gray-400 mb-2">
                暂无游戏讨论
              </Title>
              <Text type="secondary" className="block mb-6">
                成为第一个为该游戏发帖的玩家！
              </Text>
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                onClick={() => navigate(`/${lang || window.location.pathname.split('/')[1]}/community/posts/new?gameId=${id}`)}
              >
                发帖
              </Button>
            </div>
          ) : (
            <>
              <List
                itemLayout="vertical"
                dataSource={paginatedPosts}
                renderItem={(post) => (
                  <Card
                    className="mb-4 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 cursor-pointer bg-dark-750 border-dark-600"
                    onClick={() => navigate(`/${lang || window.location.pathname.split('/')[1]}/community/posts/${post.id}`)}
                  >
                    <div className="mb-3">
                      <div className="flex items-start justify-between mb-2">
                        <Title level={5} className="!mb-0 hover:text-blue-400 transition-colors">
                          {post.title}
                        </Title>
                      </div>
                      <Typography.Paragraph className="text-gray-400" ellipsis={{ rows: 2 }}>
                        {post.content}
                      </Typography.Paragraph>
                    </div>

                    <div className="flex items-center justify-between text-gray-400 text-sm pt-3 border-t border-dark-600">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <Avatar size="small" icon={<UserOutlined />}
                            style={{ backgroundColor: '#1890ff' }} className="mr-2" />
                          <span>{post.author || '匿名'}</span>
                        </div>
                        <span className="flex items-center">
                          <CalendarOutlined className="mr-1" />
                          {formatDate(post.publishDate)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center">
                          <LikeOutlined className="mr-1" />
                          {post.likes || 0}
                        </span>
                        <span className="flex items-center">
                          <MessageOutlined className="mr-1" />
                          {post.comments || 0}
                        </span>
                      </div>
                    </div>
                  </Card>
                )}
              />
              {posts.length > PAGE_SIZE && (
                <div className="flex justify-center mt-6">
                  <Pagination
                    current={currentPage}
                    pageSize={PAGE_SIZE}
                    total={posts.length}
                    onChange={setCurrentPage}
                    showSizeChanger={false}
                  />
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default GameForumPage;
