import { useState, useEffect, useMemo } from 'react';
import { Typography, Card, Row, Col, Tag, Button, Input, Rate, Pagination, Avatar, Spin, Alert, message } from 'antd';
import { SearchOutlined, CalendarOutlined, LikeOutlined, MessageOutlined, FireOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useReviews } from '../api/hooks';
import type { Review } from '../api/types';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const { Title, Paragraph } = Typography;
const { Search } = Input;

const ReviewsPage = () => {
  const { isAdmin } = useAuth();
  const { data: reviews = [], isLoading, isError, error: queryError } = useReviews();
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;


  // 筛选后的评测列表
  const filteredReviews = useMemo(() => {
    let result = [...reviews];
    // 搜索筛选
    if (searchText) {
      result = result.filter(review =>
        review.title.toLowerCase().includes(searchText.toLowerCase()) ||
        review.content.toLowerCase().includes(searchText.toLowerCase()) ||
        review.gameTitle.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    // 标签筛选
    if (selectedTag !== null) {
      result = result.filter(review => (review.tags || []).includes(selectedTag));
    }
    return result;
  }, [reviews, searchText, selectedTag]);

  // 当筛选条件变化时重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, selectedTag]);

  // 分页数据
  const paginatedReviews = filteredReviews.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // 获取所有标签
  const allTags = Array.from(new Set(reviews.flatMap(review => review.tags || [])));

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRatingColor = (rating: number = 0) => {
    if (rating >= 4.5) return '#52c41a'; // 优秀
    if (rating >= 4) return '#1890ff'; // 良好
    if (rating >= 3) return '#faad14'; // 一般
    return '#ff4d4f'; // 较差
  };

  // 获取子维度评分列表
  const getScoreDimensions = (review: Review) => {
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
        score: typeof score === 'number' ? score : parseFloat(score),
      }));
    }
    // fallback
    return [
      { label: '游戏性', score: Math.min(5, (review.rating ?? 0) + 0.2) },
      { label: '画面表现', score: Math.min(5, (review.rating ?? 0) + 0.3) },
      { label: '剧情叙事', score: Math.min(5, (review.rating ?? 0) - 0.1) },
      { label: '音效音乐', score: Math.min(5, (review.rating ?? 0) + 0.1) },
    ];
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const handleResetFilters = () => {
    setSearchText('');
    setSelectedTag(null);
  };

  return (
    <div className="bg-dark-900">
      <SEO
        title={t('seo.reviewsTitle', '游戏评测 | GameHub')}
        description={t('seo.reviewsDescription', '专业、客观、深度的游戏评测')}
        keywords={t('seo.reviewsKeywords', '游戏评测, 游戏评价, 游戏推荐, 游戏评分, 客观评测, 游戏点评')}
      />
      {/* 头部区域 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Title level={1} className="text-white text-center mb-6">游戏评测</Title>
          <Paragraph className="text-xl text-center max-w-3xl mx-auto mb-8">
            专业、客观、深度的游戏评测，帮助您做出更好的游戏选择
          </Paragraph>

          {/* 搜索 */}
          <div className="max-w-2xl mx-auto">
            <Search
              placeholder="搜索游戏评测..."
              size="large"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={handleSearch}
              enterButton={<Button type="primary" icon={<SearchOutlined />}>搜索</Button>}
            />
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        {/* 错误提示 */}
        {queryError && (
          <Alert
            title="错误"
            description={queryError?.message || String(queryError) || '获取评测数据失败'}
            type="error"
            showIcon
            closable
            className="mb-6"
          />
        )}

        {/* 加载状态 */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Spin size="large" description="加载评测中..." />
          </div>
        ) : (
          <>
            {/* 热门标签 */}
            <div className="mb-12">
              <Title level={2} className="mb-6">热门标签</Title>
              <div className="flex flex-wrap gap-3">
                <Tag
                  color={selectedTag === null ? 'blue' : 'default'}
                  className="cursor-pointer text-lg px-4 py-2"
                  onClick={() => setSelectedTag(null)}
                >
                  全部评测
                </Tag>
                {allTags.map(tag => (
                  <Tag
                    key={tag}
                    color={selectedTag === tag ? 'blue' : 'default'}
                    className="cursor-pointer text-lg px-4 py-2"
                    onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                  >
                    {tag}
                  </Tag>
                ))}
              </div>
            </div>

            {/* 评测列表 */}
            {paginatedReviews.length > 0 ? (
              <>
                <Row gutter={[32, 32]}>
                  {paginatedReviews.map((review: Review) => (
                    <Col xs={24} key={review.id}>
                      <Card
                        className="bg-dark-800 border-dark-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                        extra={
                          <Link to={`/reviews/${review.id}`}>
                            <Button type="primary">阅读全文</Button>
                          </Link>
                        }
                      >
                        <Row gutter={[24, 24]}>
                          <Col xs={24} lg={16}>
                            <div className="mb-4">
                              <div className="flex items-center justify-between mb-3">
                                <Title level={2} className="mb-0 hover:text-blue-600 transition-colors cursor-pointer">
                                  {review.title}
                                </Title>
                                <div className="flex items-center">
                                  <span
                                    className="text-2xl font-bold mr-2"
                                    style={{ color: getRatingColor(review.rating ?? 0) }}
                                  >
                                    {(review.rating ?? 0).toFixed(1)}
                                  </span>
                                  <Rate
                                    allowHalf
                                    defaultValue={review.rating ?? 0}
                                    disabled
                                    style={{ fontSize: 16 }}
                                  />
                                </div>
                              </div>

                              <div className="mb-4">
                                <Tag color="blue" className="font-semibold">
                                  {review.gameTitle}
                                </Tag>
                              </div>

                              <Paragraph className="text-gray-300 mb-6" ellipsis={{ rows: 3 }}>
                                {review.content}
                              </Paragraph>

                              <div className="flex flex-wrap gap-2 mb-6">
                                {(review.tags || []).map((tag, index) => (
                                  <Tag
                                    key={index}
                                    color="geekblue"
                                    className="cursor-pointer hover:bg-blue-100"
                                    onClick={() => setSelectedTag(tag)}
                                  >
                                    {tag}
                                  </Tag>
                                ))}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between text-gray-400">
                              <div className="flex items-center space-x-6">
                                <div className="flex items-center">
                                  <Avatar
                                    size="small"
                                    style={{ backgroundColor: '#1890ff' }}
                                    className="mr-2"
                                  >
                                    {(review.author || '?').charAt(0)}
                                  </Avatar>
                                  <span className="font-semibold">{review.author || '未知'}</span>
                                </div>
                                <span className="flex items-center">
                                  <CalendarOutlined className="mr-1" />
                                  {formatDate(review.publishDate)}
                                </span>
                              </div>
                              <div className="flex items-center space-x-6">
                                <span className="flex items-center">
                                  <LikeOutlined className="mr-1" />
                                  {review.likes.toLocaleString()}
                                </span>
                                <span className="flex items-center">
                                  <MessageOutlined className="mr-1" />
                                  {review.comments}
                                </span>
                              </div>
                            </div>
                          </Col>
                          <Col xs={24} lg={8}>
                            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 h-full">
                              <div className="text-center">
                                <div className="text-5xl font-bold mb-2" style={{ color: getRatingColor(review.rating ?? 0) }}>
                                  {(review.rating ?? 0).toFixed(1)}
                                </div>
                                <div className="text-gray-400 mb-4">综合评分</div>
                                <Rate
                                  allowHalf
                                  defaultValue={review.rating ?? 0}
                                  disabled
                                  style={{ fontSize: 20 }}
                                  className="mb-6"
                                />

                                <div className="space-y-3">
                                  {getScoreDimensions(review).map((dim, i) => (
                                    <div key={i} className="flex justify-between">
                                      <span className="text-gray-400">{dim.label}</span>
                                      <span className="font-semibold">{Number(dim.score).toFixed(1)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </Col>
                        </Row>
                      </Card>
                    </Col>
                  ))}
                </Row>

                {/* 分页 */}
                <div className="mt-12 flex justify-center">
                  <Pagination
                    current={currentPage}
                    pageSize={pageSize}
                    total={filteredReviews.length}
                    onChange={setCurrentPage}
                    showSizeChanger={false}
                    showQuickJumper
                    showTotal={(total) => `共 ${total} 条评测`}
                  />
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <Title level={2} className="text-gray-400 mb-4">未找到相关评测</Title>
                <Paragraph className="text-gray-400 mb-8">
                  尝试调整搜索关键词或选择其他标签
                </Paragraph>
                <Button
                  type="primary"
                  size="large"
                  onClick={handleResetFilters}
                >
                  重置筛选条件
                </Button>
              </div>
            )}

            {/* 热门评测 */}
            <Card title="热门评测" className="mt-12 bg-dark-800 border-dark-700">
              <Row gutter={[16, 16]}>
                {reviews
                  .sort((a, b) => b.likes - a.likes)
                  .slice(0, 4)
                  .map(review => (
                    <Col xs={24} sm={12} lg={6} key={review.id}>
                      <Card
                        className="h-full bg-dark-800 border-dark-700 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => window.location.href = `/reviews/${review.id}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <Tag color="blue">{review.gameTitle}</Tag>
                          <div className="flex items-center">
                            <FireOutlined className="text-red-500 mr-1" />
                            <span className="font-semibold">{review.likes}</span>
                          </div>
                        </div>
                        <Title level={5} className="mb-2" ellipsis={{ rows: 2 }}>
                          {review.title}
                        </Title>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">{review.author}</span>
                          <span className="font-bold" style={{ color: getRatingColor(review.rating ?? 0) }}>
                            {(review.rating ?? 0).toFixed(1)}
                          </span>
                        </div>
                      </Card>
                    </Col>
                  ))}
              </Row>
            </Card>

            {/* 提交评测（仅管理员） */}
            {isAdmin && (
            <Card className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 border-0">
              <div className="text-center">
                <Title level={2} className="mb-4">分享你的游戏体验</Title>
                <Paragraph className="text-gray-400 mb-6 max-w-2xl mx-auto">
                  写下你对游戏的独特见解，帮助其他玩家做出更好的选择。优质评测将获得平台推荐和奖励。
                </Paragraph>
                <Link to="/submit-review">
                  <Button type="primary" size="large" icon={<FireOutlined />}>
                    立即提交评测
                  </Button>
                </Link>
              </div>
            </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReviewsPage;