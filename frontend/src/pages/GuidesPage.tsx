import { useState, useEffect, useMemo } from 'react';
import { Typography, Card, Row, Col, Tag, Button, Input, Pagination, Spin, Alert, message } from 'antd';
import { SearchOutlined, ClockCircleOutlined, EyeOutlined, LikeOutlined, BookOutlined } from '@ant-design/icons';
import { useGuides } from '../api/hooks';
import type { Guide, GuideDifficulty } from '../api/types';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const { Title, Paragraph, Text } = Typography;
const { Search } = Input;

const difficultyConfig: Record<GuideDifficulty, { color: string; label: string }> = {
  easy: { color: 'green', label: '简单' },
  medium: { color: 'blue', label: '中等' },
  hard: { color: 'orange', label: '困难' },
  expert: { color: 'red', label: '专家' },
};

const GuidesPage = () => {
  const { data: guides = [], isLoading, isError, error: queryError } = useGuides();
  const [searchText, setSearchText] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<GuideDifficulty | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const filteredGuides = useMemo(() => {
    let result = [...guides];
    if (searchText) {
      result = result.filter(guide =>
        guide.title.toLowerCase().includes(searchText.toLowerCase()) ||
        guide.content.toLowerCase().includes(searchText.toLowerCase()) ||
        guide.gameTitle?.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    if (selectedDifficulty !== null) {
      result = result.filter(guide => guide.difficulty === selectedDifficulty);
    }
    return result;
  }, [guides, searchText, selectedDifficulty]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, selectedDifficulty]);

  const paginatedGuides = filteredGuides.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const allDifficulties: GuideDifficulty[] = ['easy', 'medium', 'hard', 'expert'];

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://www.gghubs.com';
  const guidesStructuredData = [
    {
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': '首页', 'item': siteUrl },
        { '@type': 'ListItem', 'position': 2, 'name': '攻略', 'item': `${siteUrl}/guides` },
      ],
    },
    {
      '@type': 'CollectionPage',
      'name': '游戏攻略大全 - GGHubs',
      'description': 'GGHubs游戏攻略指南 - 包含热门游戏的新手入门、进阶技巧、收集攻略等',
    },
    {
      '@type': 'HowTo',
      'name': '如何使用GGHubs游戏攻略',
      'description': '浏览、搜索和收藏游戏攻略的步骤说明',
      'step': [
        { '@type': 'HowToStep', 'position': 1, 'text': '在搜索框中输入游戏名称或关键词搜索攻略' },
        { '@type': 'HowToStep', 'position': 2, 'text': '使用难度筛选（简单/中等/困难/专家）过滤攻略' },
        { '@type': 'HowToStep', 'position': 3, 'text': '点击攻略卡片查看完整攻略内容' },
        { '@type': 'HowToStep', 'position': 4, 'text': '按照攻略中的分步指引完成游戏任务' },
      ],
    },
  ];

  return (
    <>
      <SEO
        title="游戏攻略 | GGHubs"
        description="GGHubs 游戏攻略指南 - 包含热门游戏的新手入门、进阶技巧、收集攻略等"
        keywords="游戏攻略, 攻略指南, 游戏教程, 游戏技巧"
        structuredData={guidesStructuredData}
      />
      <div className="bg-dark-900">
        {/* 头部区域 */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-2">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <Title level={1} className="text-white mb-4">游戏攻略</Title>
              <Paragraph className="text-emerald-100 text-lg mb-8">
                发现最新游戏攻略、技巧和指南
              </Paragraph>
              <Search
                placeholder="搜索攻略..."
                allowClear
                enterButton={<><SearchOutlined /> 搜索</>}
                size="large"
                onSearch={handleSearch}
                onChange={(e) => handleSearch(e.target.value)}
                className="max-w-2xl mx-auto"
              />
            </div>
          </div>
        </div>

        <div className="py-2">
          {/* 难度筛选 */}
          <div className="flex flex-wrap items-center gap-2 mb-8">
            <Text className="text-gray-400 mr-2">难度筛选：</Text>
            <Tag
              className={`cursor-pointer px-4 py-1 text-sm rounded-full ${
                selectedDifficulty === null ? 'bg-emerald-500 text-white' : ''
              }`}
              onClick={() => setSelectedDifficulty(null)}
            >
              全部
            </Tag>
            {allDifficulties.map(d => (
              <Tag
                key={d}
                color={selectedDifficulty === d ? difficultyConfig[d].color : undefined}
                className={`cursor-pointer px-4 py-1 text-sm rounded-full ${
                  selectedDifficulty === d ? '' : 'border border-dark-700 bg-dark-800 text-gray-400 hover:border-emerald-400'
                }`}
                onClick={() => setSelectedDifficulty(d === selectedDifficulty ? null : d)}
              >
                {difficultyConfig[d].label}
              </Tag>
            ))}
          </div>

          {/* 加载态 */}
          {isLoading && (
            <div className="flex justify-center py-20">
              <Spin size="large" tip="加载攻略中..." />
            </div>
          )}

          {/* 错误态 */}
          {isError && (
            <Alert
              message="加载失败"
              description={queryError instanceof Error ? queryError.message : '获取攻略列表失败'}
              type="error"
              showIcon
              className="mb-6"
            />
          )}

          {/* 空态 */}
          {!isLoading && !isError && filteredGuides.length === 0 && (
            <div className="text-center py-20">
              <BookOutlined className="text-6xl text-gray-300 mb-4" />
              <Title level={4} className="text-gray-500">暂无攻略</Title>
              <Paragraph className="text-gray-400">还没有相关攻略内容，敬请期待</Paragraph>
            </div>
          )}

          {/* 攻略列表 */}
          {!isLoading && !isError && (
            <>
              <Row gutter={[24, 24]}>
                {paginatedGuides.map((guide) => (
                  <Col xs={24} sm={12} lg={6} key={guide.id}>
                    <Link to={`/guides/${guide.id}`}>
                      <Card
                        className="h-full hover:shadow-lg transition-shadow cursor-pointer bg-dark-800 border-dark-700"
                        cover={
                          <div className="h-40 bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                            <BookOutlined className="text-5xl text-white/80" />
                          </div>
                        }
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Tag color={difficultyConfig[guide.difficulty]?.color || 'blue'}>
                            {difficultyConfig[guide.difficulty]?.label || guide.difficulty}
                          </Tag>
                          {guide.estimatedMinutes && (
                            <span className="text-gray-400 text-sm flex items-center">
                              <ClockCircleOutlined className="mr-1" />
                              {guide.estimatedMinutes}分钟
                            </span>
                          )}
                        </div>
                        <Title level={5} className="mb-1" ellipsis={{ rows: 2 }}>
                          {guide.title}
                        </Title>
                        {guide.gameTitle && (
                          <Text type="secondary" className="text-sm block mb-2">
                            {guide.gameTitle}
                          </Text>
                        )}
                        {guide.summary && (
                          <Paragraph className="text-gray-500 text-sm mb-3" ellipsis={{ rows: 2 }}>
                            {guide.summary}
                          </Paragraph>
                        )}
                        <div className="flex items-center justify-between text-gray-400 text-sm">
                          <span>
                            <EyeOutlined className="mr-1" />
                            {guide.views?.toLocaleString() || 0}
                          </span>
                          <span>
                            <LikeOutlined className="mr-1" />
                            {guide.likes?.toLocaleString() || 0}
                          </span>
                          <span>{formatDate(guide.createdAt || '')}</span>
                        </div>
                      </Card>
                    </Link>
                  </Col>
                ))}
              </Row>

              {/* 分页 */}
              {filteredGuides.length > pageSize && (
                <div className="mt-12 flex justify-center">
                  <Pagination
                    current={currentPage}
                    pageSize={pageSize}
                    total={filteredGuides.length}
                    onChange={setCurrentPage}
                    showSizeChanger={false}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default GuidesPage;
