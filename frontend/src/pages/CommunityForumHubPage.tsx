import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Typography, Card, Row, Col, Tag, Input, Button, Skeleton, Alert,
  Pagination, Empty, Avatar, Statistic
} from 'antd';
import {
  MessageOutlined, TrophyOutlined, ClockCircleOutlined,
  ReloadOutlined, FireOutlined, TeamOutlined, StarOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useGameForumStats } from '../api/hooks';
import SEO from '../components/SEO';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

const PAGE_SIZE = 24;

const CommunityForumHubPage = () => {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const { t } = useTranslation();
  const currentLang = lang || 'cn';
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading, isError, refetch } = useGameForumStats({
    page: currentPage,
    limit: PAGE_SIZE,
    search: searchText || undefined,
  });

  const games = data?.games || [];
  const total = data?.total || 0;

  const handleRetry = () => refetch();

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-dark-900">
      <SEO
        title={t('community.seoTitle', 'Community Forum | GameHub')}
        description={t('community.seoDesc', 'GameHub Community Forum — browse discussions, reviews, and guides by game')}
        keywords={t('community.seoKeywords', 'community forum,game discussion,game review,game guide,GameHub')}
      />

      <div className="py-2">
        {/* 头部 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 mb-6 shadow-lg shadow-blue-500/20">
            <TeamOutlined className="text-4xl text-white" />
          </div>
          <Title level={1} className="!mb-2 !text-gray-100">{t('community.title', 'Community Forum')}</Title>
          <Paragraph className="text-lg text-gray-400 max-w-2xl mx-auto mb-6">
            {t('community.subtitle', 'Browse discussions, reviews, and guides by game, and share with fellow players')}
          </Paragraph>

          <div className="max-w-xl mx-auto">
            <Search
              placeholder={t('community.searchPlaceholder', 'Search game name...')}
              size="large"
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
              onSearch={(v) => setSearchText(v)}
              enterButton="Search"
              allowClear
            />
          </div>
        </div>

        {/* 错误 */}
        {isError && (
          <Alert
            message="Failed to load" description="Unable to load the community forum list. Please try again later."
            type="error" showIcon className="mb-6"
            action={<Button onClick={handleRetry} icon={<ReloadOutlined />}>Retry</Button>}
          />
        )}

        {/* 加载 */}
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
          <div className="text-center py-20">
            <Empty
              image={<MessageOutlined className="text-6xl text-gray-600" />}
              description={
                <div>
                  <Title level={4} className="text-gray-400">
                    {searchText ? `No games found for "${searchText}"` : 'No community forum activity yet'}
                  </Title>
                  <Text type="secondary">
                    {searchText ? 'Please try other keywords' : 'After a game is released you can create discussion posts in its community'}
                  </Text>
                </div>
              }
            />
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <Text type="secondary" className="text-base">
                Total <span className="text-blue-400 font-bold">{total}</span> game communities
              </Text>
            </div>

            <Row gutter={[20, 20]}>
              {games.map((game: any) => (
                <Col key={game.id} xs={24} sm={12} md={8} lg={6}>
                  <Card
                    className="h-full bg-dark-800 border-dark-700 hover:shadow-xl hover:border-blue-500/50 transition-all duration-300 cursor-pointer group"
                    onClick={() => navigate(`/${currentLang}/games/${game.id}/forum`)}
                  >
                    {/* 游戏封面 */}
                    <div className="relative mb-4 overflow-hidden rounded-lg">
                      <div className="aspect-[16/9] bg-dark-700 flex items-center justify-center overflow-hidden">
                        {game.imageUrl ? (
                          <img src={game.imageUrl} alt={game.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                        ) : (
                          <TrophyOutlined className="text-5xl text-gray-600" />
                        )}
                      </div>
                      {/* 帖子数量徽标 */}
                      <div className="absolute top-2 right-2 bg-blue-500/90 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm">
                        <MessageOutlined className="text-[10px]" />
                        {game.forumPostCount || 0}
                      </div>
                    </div>

                    {/* 游戏名 */}
                    <Title level={5} className="!mb-2 !text-gray-100 truncate group-hover:text-blue-400 transition-colors">
                      {game.title}
                    </Title>

                    {/* 标签 */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {(game.genres || []).slice(0, 2).map((genre: string, idx: number) => (
                        <Tag key={idx} color="blue" className="text-[11px] leading-none px-1.5 py-0.5">{genre}</Tag>
                      ))}
                    </div>

                    {/* 统计 */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                      <span className="flex items-center gap-1"><MessageOutlined /> {game.forumPostCount || 0} posts</span>
                    </div>

                    {/* 最新帖子 */}
                    {game.latestPostTitle && (
                      <div className="text-gray-400 text-xs mt-auto border-t border-dark-700 pt-2">
                        <div className="flex items-center gap-1 mb-1">
                          <FireOutlined className="text-blue-400 flex-shrink-0" />
                          <span className="truncate">{game.latestPostTitle}</span>
                        </div>
                        {game.latestForumPostDate && (
                          <div className="flex items-center gap-1 text-gray-500">
                            <ClockCircleOutlined />
                            <span>{formatDate(game.latestForumPostDate)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                </Col>
              ))}
            </Row>

            {total > PAGE_SIZE && (
              <div className="flex justify-center mt-8">
                <Pagination current={currentPage} pageSize={PAGE_SIZE} total={total}
                  onChange={(page) => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  showSizeChanger={false} showTotal={(t) => `Total ${t} game communities`} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CommunityForumHubPage;
