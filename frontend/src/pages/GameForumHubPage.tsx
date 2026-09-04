import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Card,
  Row,
  Col,
  Tag,
  Input,
  Button,
  Skeleton,
  Alert,
  Pagination,
  Empty,
  Avatar,
} from 'antd';
import {
  MessageOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { useGameForumStats } from '../api/hooks';
import SEO from '../components/SEO';
import type { Game } from '../api/types';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

const PAGE_SIZE = 24;

const GameForumHubPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('games');
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading, isError, refetch } = useGameForumStats({
    page: currentPage,
    limit: PAGE_SIZE,
    search: searchText || undefined,
  });

  const games = data?.games || [];
  const total = data?.total || 0;

  const lang = window.location.pathname.split('/')[1] || 'cn';

  const handleSearch = (value: string) => {
    setSearchText(value);
    setCurrentPage(1);
  };

  const handleRetry = () => refetch();

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

  return (
    <div className="bg-dark-900">
      <SEO
        title="游戏论坛广场 | GGHubs"
        description="浏览所有游戏的官方论坛，参与游戏讨论与交流"
        keywords="游戏论坛, 游戏讨论, 官方论坛, 玩家社区, GGHubs"
      />

      <div className="py-2">
        {/* 头部区域 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <MessageOutlined className="text-4xl text-blue-400" />
            <Title level={1} className="!mb-0 !text-gray-100">
              游戏论坛广场
            </Title>
          </div>
          <Paragraph className="text-lg text-gray-400 max-w-3xl mx-auto mb-6">
            选择一个游戏，查看其专属官方论坛，与其他玩家一起讨论交流
          </Paragraph>

          {/* 搜索框 */}
          <div className="max-w-xl mx-auto">
            <Search
              placeholder="搜索游戏名称..."
              size="large"
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
              onSearch={handleSearch}
              enterButton="搜索"
              allowClear
            />
          </div>
        </div>

        {/* 错误状态 */}
        {isError && (
          <Alert
            message="加载失败"
            description="无法加载游戏论坛列表，请稍后重试。"
            type="error"
            showIcon
            className="mb-6"
            action={<Button onClick={handleRetry} icon={<ReloadOutlined />}>重试</Button>}
          />
        )}

        {/* 加载状态 */}
        {isLoading ? (
          <Row gutter={[20, 20]}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Col key={i} xs={24} sm={12} md={8} lg={6}>
                <Card className="bg-dark-800 border-dark-700">
                  <Skeleton active avatar paragraph={{ rows: 3 }} />
                </Card>
              </Col>
            ))}
          </Row>
        ) : games.length === 0 ? (
          /* 空状态 */
          <div className="text-center py-20">
            <Empty
              image={<MessageOutlined className="text-6xl text-gray-600" />}
              description={
                <div>
                  <Title level={4} className="text-gray-400">
                    {searchText ? `没有找到"${searchText}"相关的游戏论坛` : '暂没有游戏论坛活动'}
                  </Title>
                  <Text type="secondary">
                    {searchText ? '请尝试其他关键词搜索' : '游戏发布后可以在社区中创建讨论帖'}
                  </Text>
                </div>
              }
            />
          </div>
        ) : (
          <>
            {/* 统计信息 */}
            <div className="mb-6 flex items-center justify-between">
              <Text type="secondary" className="text-base">
                共 <span className="text-blue-400 font-bold">{total}</span> 个游戏有论坛活动
              </Text>
            </div>

            {/* 游戏论坛卡片网格 */}
            <Row gutter={[20, 20]}>
              {games.map((game: Game) => (
                <Col key={game.id} xs={24} sm={12} md={8} lg={6}>
                  <Card
                    className="h-full bg-dark-800 border-dark-700 hover:shadow-xl hover:border-blue-500/50 transition-all duration-300 cursor-pointer group"
                    onClick={() => navigate(`/${lang}/games/${game.slug || game.id}/forum`)}
                  >
                    {/* 游戏封面 */}
                    <div className="relative mb-4 overflow-hidden rounded-lg">
                      <div className="aspect-[16/9] bg-dark-700 flex items-center justify-center overflow-hidden">
                        {game.imageUrl ? (
                          <img
                            src={game.imageUrl}
                            alt={game.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <TrophyOutlined className="text-5xl text-gray-600" />
                        )}
                      </div>
                      {/* 帖子数量角标 */}
                      <div className="absolute top-2 right-2 bg-blue-500/90 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm">
                        <MessageOutlined className="text-[10px]" />
                        {game.forumPostCount || 0}
                      </div>
                    </div>

                    {/* 游戏信息 */}
                    <div className="min-h-[100px]">
                      <Title level={5} className="!mb-2 !text-gray-100 truncate group-hover:text-blue-400 transition-colors">
                        {game.title}
                      </Title>

                      {/* 类型标签 */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {(game.genres || []).slice(0, 2).map((genre, idx) => (
                          <Tag key={idx} color="blue" className="text-[11px] leading-none px-1.5 py-0.5">
                            {t(`genreNames.${genre}`, { defaultValue: genre })}
                          </Tag>
                        ))}
                        {(game.genres?.length || 0) > 2 && (
                          <Tag className="text-[11px] leading-none px-1.5 py-0.5">
                            +{game.genres!.length - 2}
                          </Tag>
                        )}
                      </div>

                      {/* 最新帖子信息 */}
                      {game.latestPostTitle && (
                        <div className="text-gray-400 text-xs mt-auto">
                          <div className="flex items-center gap-1 mb-1">
                            <FireOutlined className="text-blue-400" />
                            <span className="truncate flex-1">{game.latestPostTitle}</span>
                          </div>
                          {game.latestForumPostDate && (
                            <div className="flex items-center gap-1 text-gray-500">
                              <ClockCircleOutlined />
                              <span>{formatDate(game.latestForumPostDate)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* 分页 */}
            {total > PAGE_SIZE && (
              <div className="flex justify-center mt-8">
                <Pagination
                  current={currentPage}
                  pageSize={PAGE_SIZE}
                  total={total}
                  onChange={(page) => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  showSizeChanger={false}
                  showTotal={(t) => `共 ${t} 个游戏论坛`}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GameForumHubPage;
