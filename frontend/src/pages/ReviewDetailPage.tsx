import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Card, Row, Col, Tag, Button, Avatar, Rate, Divider, List, Input, Skeleton, Alert } from 'antd';
import { CalendarOutlined, LikeOutlined, MessageOutlined, ShareAltOutlined, UserOutlined } from '@ant-design/icons';
import { useReview, useGame, useGameReviews, useReviews } from '../api/hooks';
import CommentList from '../components/comments/CommentList';
import SEO from '../components/SEO';
import SEOBreadcrumb from '../components/SEOBreadcrumb';

const { Title, Paragraph, Text } = Typography;

const ReviewDetailPage = () => {
  const { id, lang: paramLang } = useParams<{ id: string; lang?: string }>();
  const navigate = useNavigate();
  const lang = paramLang || 'cn';
  const { data: review, isLoading: reviewLoading, error: reviewError } = useReview(id || '');
  const { data: game, isLoading: gameLoading } = useGame(review?.gameId || '');
  const { data: gameReviews } = useGameReviews(review?.gameId || '');
  const { data: allReviews } = useReviews({ limit: 50 });

  // 加载状态
  if (reviewLoading || gameLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  // 错误处理
  if (reviewError || !review) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert
          message="加载失败"
          description={reviewError instanceof Error ? reviewError.message : (reviewError || '评测不存在')}
          type="error"
          showIcon
          action={
            <Button type="primary" onClick={() => {
              const lang = window.location.pathname.split('/')[1] || 'cn';
              navigate(`/${lang}/community`);
            }}>
              返回社区
            </Button>
          }
        />
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return '#52c41a';
    if (rating >= 4) return '#1890ff';
    if (rating >= 3) return '#faad14';
    return '#ff4d4f';
  };

  // 获取子维度评分列表
  const getScoreDimensions = (): { label: string; key: string; score: number }[] => {
    if (review.scores && typeof review.scores === 'object') {
      const labelMap: Record<string, string> = {
        gameplay: '游戏性',
        graphics: '画面表现',
        story: '剧情叙事',
        audio: '音效音乐',
        replayability: '重复可玩性',
      };
      return Object.entries(review.scores).map(([key, score]) => ({
        label: labelMap[key] || key,
        key,
        score: typeof score === 'number' ? score : parseFloat(score),
      }));
    }
    // 从综合评分推导默认子维度
    return [
      { label: '游戏性', key: 'gameplay', score: Math.min(5, review.rating + 0.2) },
      { label: '画面表现', key: 'graphics', score: Math.min(5, review.rating + 0.3) },
      { label: '剧情叙事', key: 'story', score: Math.min(5, review.rating - 0.1) },
      { label: '音效音乐', key: 'audio', score: Math.min(5, review.rating + 0.1) },
      { label: '重复可玩性', key: 'replayability', score: Math.min(5, review.rating - 0.3) },
    ];
  };

  const scoreDimensions = getScoreDimensions();

  // 获取评测章节内容
  const getReviewSections = () => {
    if (review.sections && typeof review.sections === 'object') {
      return review.sections;
    }
    return null;
  };

  const reviewSections = getReviewSections();

  // 结构化数据 for Review
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Review',
    'headline': review.title,
    'description': review.content?.substring(0, 160),
    'author': {
      '@type': 'Person',
      'name': review.author
    },
    'datePublished': review.publishDate,
    'reviewRating': {
      '@type': 'Rating',
      'ratingValue': review.rating,
      'bestRating': 5,
      'worstRating': 1
    },
    'itemReviewed': {
      '@type': 'VideoGame',
      'name': review.gameTitle,
      'url': `${window.location.origin}/games/${review.gameId}`
    },
    'publisher': {
      '@type': 'Organization',
      'name': 'GameHub'
    }
  };

  return (
    <>
      <SEO
        title={review.title}
        description={review.content?.substring(0, 160)}
        keywords={[review.title, review.gameTitle].concat(review.tags || []).concat(['游戏评测', '游戏评价', '游戏推荐']).filter(Boolean).join(', ')}
        type="article"
        publishedTime={review.publishDate}
        author={review.author}
        section={review.gameTitle}
        tags={review.tags}
        canonical={`/reviews/${review.id}`}
        structuredData={structuredData}
      />
      <SEOBreadcrumb items={[
        { name: '首页', url: `/${lang}` },
        { name: '社区', url: `/${lang}/community` },
        { name: review.title, url: `/${lang}/community/reviews/${review.id}` },
      ]} />
      <article>
      <div className="min-h-screen bg-dark-900">
      {/* 头部区域 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div>
              <Title level={1} className="text-white mb-4">{review.title}</Title>
              <div className="flex items-center space-x-4">
                <Tag color="blue" className="text-lg px-4 py-1">{review.gameTitle}</Tag>
                <div className="flex items-center">
                  <span 
                    className="text-3xl font-bold mr-2"
                    style={{ color: getRatingColor(review.rating) }}
                  >
                    {Number(review.rating).toFixed(1)}
                  </span>
                  <Rate
                    allowHalf
                    defaultValue={review.rating}
                    disabled
                    style={{ fontSize: 20 }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <Button type="primary" size="large" icon={<LikeOutlined />}>
                点赞 ({review.likes.toLocaleString()})
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Row gutter={[32, 32]}>
          {/* 左侧内容区域 */}
          <Col xs={24} lg={16}>
            {/* 评测内容 */}
            <Card className="mb-8 bg-dark-800 border-dark-700">
              <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <Avatar 
                      size={48}
                      icon={<UserOutlined />}
                      style={{ backgroundColor: '#1890ff' }}
                    />
                    <div>
                      <div className="font-bold text-lg">{review.author}</div>
                      <div className="text-gray-400 flex items-center">
                        <CalendarOutlined className="mr-1" />
                        {formatDate(review.publishDate)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Button icon={<ShareAltOutlined />}>分享</Button>
                    <Button icon={<MessageOutlined />}>评论 ({review.comments})</Button>
                  </div>
                </div>

                <div className="prose max-w-none">
                  <Paragraph className="text-lg leading-relaxed mb-6">
                    {review.content}
                  </Paragraph>

                  <Divider />

                  {reviewSections ? (
                    Object.entries(reviewSections).map(([key, value]) => {
                      const sectionTitles: Record<string, string> = {
                        pros: '优点',
                        cons: '缺点',
                        verdict: '总结',
                        gameplay_analysis: '玩法分析',
                        story_analysis: '剧情分析',
                        technical: '技术表现',
                      };
                      const title = sectionTitles[key] || key;
                      return (
                        <div key={key} className="mb-6">
                          <Title level={4} className="mb-3">{title}</Title>
                          {Array.isArray(value) ? (
                            <ul>
                              {(value as string[]).map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          ) : (
                            <Paragraph>{value as string}</Paragraph>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <>
                      <Title level={3} className="mb-4">详细评测</Title>
                      <Paragraph className="mb-6">
                        《{review.gameTitle}》作为{(review.tags || []).join('、')}类型的代表作，在多个方面都展现出了极高的水准。
                      </Paragraph>
                    </>
                  )}
                </div>

                <div className="mt-8 pt-8 border-t border-dark-700">
                  <div className="flex flex-wrap gap-2">
                    {(review.tags || []).map((tag, index) => (
                      <Tag key={index} color="geekblue" className="text-lg px-4 py-1">
                        {tag}
                      </Tag>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* 评论区域 */}
            <Card className="mb-8 bg-dark-800 border-dark-700">
              <CommentList parentType="review" parentId={id || ''} />
            </Card>
          </Col>

          {/* 右侧侧边栏 */}
          <Col xs={24} lg={8}>
            {/* 游戏信息 */}
            <Card title="游戏信息" className="mb-8 bg-dark-800 border-dark-700">
              {game && (
              <>
              <div className="text-center mb-6">
                <img
                  alt={game.title}
                  src={game.imageUrl}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                  width="340"
                  height="192"
                  loading="lazy"
                />
                <Title level={4} className="mb-2">{game.title}</Title>
                <Paragraph className="text-gray-400 mb-4">{game.description}</Paragraph>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <Text strong>开发商</Text>
                  <Text>{game.developer}</Text>
                </div>
                <div className="flex justify-between">
                  <Text strong>发行商</Text>
                  <Text>{game.publisher}</Text>
                </div>
                <div className="flex justify-between">
                  <Text strong>发行日期</Text>
                  <Text>{game.releaseDate}</Text>
                </div>
                <div className="flex justify-between">
                  <Text strong>游戏类型</Text>
                  <div className="text-right">
                    {(game.genres || []).map(genre => (
                      <div key={genre}>{genre}</div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between">
                  <Text strong>支持平台</Text>
                  <div className="text-right">
                    {(game.platforms || []).map(platform => (
                      <div key={platform}>{platform}</div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <Button type="primary" block size="large">
                  查看游戏详情
                </Button>
              </div>
              </>
              )}
            </Card>

            {/* 评分详情 */}
            <Card title="评分详情" className="mb-8 bg-dark-800 border-dark-700">
              <div className="text-center mb-6">
                <div 
                  className="text-5xl font-bold mb-2"
                  style={{ color: getRatingColor(review.rating) }}
                >
                  {Number(review.rating).toFixed(1)}
                </div>
                <div className="text-gray-400 mb-4">综合评分</div>
                <Rate
                  allowHalf
                  defaultValue={review.rating}
                  disabled
                  style={{ fontSize: 24 }}
                  className="mb-6"
                />
              </div>

              <div className="space-y-4">
                {scoreDimensions.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <Text>{item.label}</Text>
                    <div className="flex items-center">
                      <Rate
                        allowHalf
                        defaultValue={item.score}
                        disabled
                        style={{ fontSize: 14 }}
                        className="mr-2"
                      />
                      <Text strong style={{ color: getRatingColor(item.score) }}>
                        {Number(item.score).toFixed(1)}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* 相关评测 */}
            <Card title="相关评测" className="bg-dark-800 border-dark-700">
              <List
                dataSource={gameReviews?.filter(r => r.id !== review.id).slice(0, 3) || []}
                renderItem={(item) => (
                  <List.Item className="!px-0 !py-3 border-b border-dark-700 last:border-b-0">
                    <div className="w-full">
                      <div className="font-medium mb-1 hover:text-blue-600 cursor-pointer">
                        {item.title}
                      </div>
                      <div className="flex items-center justify-between text-gray-400 text-sm">
                        <span>{item.author}</span>
                        <span className="font-bold" style={{ color: getRatingColor(item.rating) }}>
                          {Number(item.rating).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>

        {/* 评测者其他作品 */}
        <Card title="评测者其他作品" className="mt-12 bg-dark-800 border-dark-700">
          <Row gutter={[24, 24]}>
            {allReviews
              ?.filter(r => r.author === review.author && r.id !== review.id)
              .slice(0, 3)
              .map(item => (
                <Col xs={24} sm={12} lg={8} key={item.id}>
                  <Card
                    className="h-full bg-dark-800 border-dark-700 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => {
                      const lang = window.location.pathname.split('/')[1] || 'cn';
                      navigate(`/${lang}/community/reviews/${item.id}`);
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <Tag color="blue">{item.gameTitle}</Tag>
                      <div className="font-bold" style={{ color: getRatingColor(item.rating) }}>
                        {Number(item.rating).toFixed(1)}
                      </div>
                    </div>
                    <Title level={5} className="mb-2" ellipsis={{ rows: 2 }}>
                      {item.title}
                    </Title>
                    <div className="text-gray-400 text-sm">
                      {formatDate(item.publishDate)}
                    </div>
                  </Card>
                </Col>
              ))}
          </Row>
        </Card>
      </div>
    </div>
    </article>
    </>
  );
};

export default ReviewDetailPage;