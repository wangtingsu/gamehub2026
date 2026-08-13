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
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-dark-900">
      <SEO
        title={t('community.seoTitle', '社区论坛 | GameHub')}
        description={t('community.seoDesc', 'GameHub 社区论坛 — 按游戏浏览讨论帖、评测和攻略')}
        keywords={t('community.seoKeywords', '社区论坛,游戏讨论,游戏评测,游戏攻略,GameHub')}
      />

      <div className="py-2">
        {/* 头部 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 mb-6 shadow-lg shadow-blue-500/20">
            <TeamOutlined className="text-4xl text-white" />
          </div>
          <Title level={1} className="!mb-2 !text-gray-100">{t('community.title', '社区论坛')}</Title>
          <Paragraph className="text-lg text-gray-400 max-w-2xl mx-auto mb-6">
            {t('community.subtitle', '按游戏浏览讨论帖、评测和攻略，与玩家一起交流分享')}
          </Paragraph>

          <div className="max-w-xl mx-auto">
            <Search
              placeholder={t('community.searchPlaceholder', '搜索游戏名称...')}
              size="large"
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
              onSearch={(v) => setSearchText(v)}
              enterButton="搜索"
              allowClear
            />
          </div>
        </div>

        {/* 错误 */}
        {isError && (
          <Alert
            message="加载失败" description="无法加载社区论坛列表，请稍后重试。"
            type="error" showIcon className="mb-6"
            action={<Button onClick={handleRetry} icon={<ReloadOutlined />}>重试</Button>}
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
                    {searchText ? `没有找到"${searchText}"相关的游戏` : '暂没有社区论坛活动'}
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
            <div className="mb-6 flex items-center justify-between">
              <Text type="secondary" className="text-base">
                共 <span className="text-blue-400 font-bold">{total}</span> 个游戏社区
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
                      <span className="flex items-center gap-1"><MessageOutlined /> {game.forumPostCount || 0} 帖</span>
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
                  showSizeChanger={false} showTotal={(t) => `共 ${t} 个游戏社区`} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CommunityForumHubPage;
