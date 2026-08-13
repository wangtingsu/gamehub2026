import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Card, Row, Col, Tag, Button, Avatar, Steps, Skeleton, Alert, Divider } from 'antd';
import { CalendarOutlined, LikeOutlined, EyeOutlined, BookOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import { useGuide } from '../api/hooks';
import CommentList from '../components/comments/CommentList';
import SEO from '../components/SEO';
import SEOBreadcrumb from '../components/SEOBreadcrumb';
import type { GuideDifficulty } from '../api/types';

const { Title, Paragraph, Text } = Typography;

const difficultyConfig: Record<GuideDifficulty, { color: string; label: string }> = {
  easy: { color: 'green', label: '简单' },
  medium: { color: 'blue', label: '中等' },
  hard: { color: 'orange', label: '困难' },
  expert: { color: 'red', label: '专家' },
};

const GuideDetailPage = () => {
  const { id, lang: paramLang } = useParams<{ id: string; lang?: string }>();
  const navigate = useNavigate();
  const lang = paramLang || 'cn';
  const { data: guide, isLoading, error } = useGuide(id || '');
  const [currentStep, setCurrentStep] = useState(0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="flex items-center justify-center p-4">
        <Alert
          message="加载失败"
          description={error instanceof Error ? error.message : '攻略不存在'}
          type="error"
          showIcon
          action={
            <Button type="primary" onClick={() => window.location.href = '/guides'}>
              返回攻略列表
            </Button>
          }
        />
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const steps = Array.isArray(guide.steps) ? guide.steps : [];
  const currentStepData = steps[currentStep];

  // HowTo 结构化数据
  const guideStructuredData = steps.length > 0 ? [
    {
      '@type': 'HowTo',
      'name': guide.title,
      'description': guide.summary || guide.content?.substring(0, 160) || '',
      'totalTime': guide.estimatedMinutes ? `PT${guide.estimatedMinutes}M` : undefined,
      ...(guide.gameTitle ? { 'about': { '@type': 'VideoGame', 'name': guide.gameTitle } } : {}),
      'step': steps.map((step: any, i: number) => ({
        '@type': 'HowToStep',
        'position': i + 1,
        'text': typeof step === 'string' ? step : step.title || step.content || '',
      })),
    },
  ] : undefined;

  return (
    <>
      <SEO
        title={guide.title}
        description={guide.summary || guide.content?.substring(0, 160)}
        keywords={[guide.title, guide.gameTitle || ''].concat(guide.tags || []).concat(['游戏攻略', '攻略指南']).filter(Boolean).join(', ')}
        type="article"
        author={guide.author}
        publishedTime={guide.createdAt}
        section={guide.gameTitle}
        tags={guide.tags}
        canonical={`/guides/${guide.id}`}
        structuredData={guideStructuredData}
      />
      <SEOBreadcrumb items={[
        { name: '首页', url: `/${lang}` },
        { name: '攻略', url: `/${lang}/guides` },
        { name: guide.title, url: `/${lang}/guides/${guide.id}` },
      ]} />
      <div className="bg-dark-900">
        {/* 头部区域 */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-2">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
              <div>
                <Title level={1} className="text-white mb-4">{guide.title}</Title>
                <div className="flex items-center space-x-4 flex-wrap gap-y-2">
                  {guide.gameTitle && <Tag color="cyan" className="text-lg px-4 py-1">{guide.gameTitle}</Tag>}
                  <Tag color={difficultyConfig[guide.difficulty]?.color || 'blue'} className="text-lg px-4 py-1">
                    {difficultyConfig[guide.difficulty]?.label || guide.difficulty}
                  </Tag>
                  {guide.estimatedMinutes && (
                    <span className="flex items-center text-emerald-100">
                      <ClockCircleOutlined className="mr-1" />
                      约 {guide.estimatedMinutes} 分钟
                    </span>
                  )}
                  <span className="flex items-center text-emerald-100">
                    <BookOutlined className="mr-1" />
                    {steps.length} 个步骤
                  </span>
                </div>
              </div>
              <div className="mt-4 md:mt-0">
                <Button type="primary" size="large" icon={<LikeOutlined />} ghost>
                  点赞 ({guide.likes?.toLocaleString() || 0})
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 主要内容 */}
        <div className="py-2">
          <Row gutter={[32, 32]}>
            {/* 左侧内容区域 */}
            <Col xs={24} lg={16}>
              {/* 作者和元信息 */}
              <Card className="mb-8 bg-dark-800 border-dark-700">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <Avatar
                      size={48}
                      icon={<UserOutlined />}
                      style={{ backgroundColor: '#10b981' }}
                    />
                    <div>
                      <div className="font-bold text-lg">{guide.authorDisplayName || guide.author}</div>
                      <div className="text-gray-500 flex items-center">
                        <CalendarOutlined className="mr-1" />
                        {formatDate(guide.createdAt || '')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-gray-500">
                    <span><EyeOutlined className="mr-1" />{guide.views?.toLocaleString() || 0} 次浏览</span>
                  </div>
                </div>

                {/* 简介 */}
                {guide.summary && (
                  <>
                    <Divider />
                    <Paragraph className="text-lg leading-relaxed">{guide.summary}</Paragraph>
                  </>
                )}

                {/* 步骤导航 */}
                {steps.length > 0 && (
                  <>
                    <Divider />
                    <Title level={3} className="mb-4">攻略步骤</Title>
                    <Steps
                      current={currentStep}
                      onChange={setCurrentStep}
                      direction="horizontal"
                      className="mb-8"
                      items={steps.map((step, index) => ({
                        title: step.title || `步骤 ${index + 1}`,
                      }))}
                    />

                    {/* 当前步骤内容 */}
                    {currentStepData && (
                      <Card className="bg-dark-800 border-dark-700">
                        <Title level={4} className="mb-4">
                          步骤 {currentStep + 1}：{currentStepData.title}
                        </Title>
                        <Paragraph className="text-base leading-relaxed whitespace-pre-line">
                          {currentStepData.content}
                        </Paragraph>
                        {currentStepData.imageUrl && (
                          <img
                            src={currentStepData.imageUrl}
                            alt={currentStepData.title}
                            className="w-full rounded-lg mt-4"
                            loading="lazy"
                          />
                        )}
                        {currentStepData.videoUrl && (
                          <div className="mt-4 aspect-video">
                            <video
                              src={currentStepData.videoUrl}
                              controls
                              className="w-full rounded-lg"
                            />
                          </div>
                        )}
                      </Card>
                    )}

                    {/* 步骤导航按钮 */}
                    <div className="flex justify-between mt-6">
                      <Button
                        disabled={currentStep === 0}
                        onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                      >
                        上一步
                      </Button>
                      <Text className="text-gray-500">
                        {currentStep + 1} / {steps.length}
                      </Text>
                      <Button
                        type="primary"
                        disabled={currentStep === steps.length - 1}
                        onClick={() => setCurrentStep(prev => Math.min(steps.length - 1, prev + 1))}
                      >
                        下一步
                      </Button>
                    </div>
                  </>
                )}

                {/* 全文内容（当没有步骤时显示） */}
                {steps.length === 0 && (
                  <>
                    <Divider />
                    <Paragraph className="text-base leading-relaxed whitespace-pre-line">
                      {guide.content}
                    </Paragraph>
                  </>
                )}

                {/* 标签 */}
                <div className="mt-8 pt-8 border-t border-dark-700">
                  <div className="flex flex-wrap gap-2">
                    {(guide.tags || []).map((tag, index) => (
                      <Tag key={index} color="green" className="text-lg px-4 py-1">{tag}</Tag>
                    ))}
                  </div>
                </div>
              </Card>

              {/* 评论区域 */}
              <Card className="mb-8 bg-dark-800 border-dark-700">
                <CommentList parentType="guide" parentId={id || ''} />
              </Card>
            </Col>

            {/* 右侧侧边栏 */}
            <Col xs={24} lg={8}>
              {/* 攻略信息 */}
              <Card title="攻略信息" className="mb-8 bg-dark-800 border-dark-700">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <Text strong>难度</Text>
                    <Tag color={difficultyConfig[guide.difficulty]?.color || 'blue'}>
                      {difficultyConfig[guide.difficulty]?.label || guide.difficulty}
                    </Tag>
                  </div>
                  {guide.estimatedMinutes && (
                    <div className="flex justify-between">
                      <Text strong>预计时长</Text>
                      <Text>{guide.estimatedMinutes} 分钟</Text>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <Text strong>步骤数</Text>
                    <Text>{steps.length} 步</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text strong>浏览</Text>
                    <Text>{guide.views?.toLocaleString() || 0}</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text strong>点赞</Text>
                    <Text>{guide.likes?.toLocaleString() || 0}</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text strong>发布时间</Text>
                    <Text>{formatDate(guide.createdAt || '')}</Text>
                  </div>
                </div>
              </Card>

              {/* 游戏信息 */}
              {guide.gameTitle && (
                <Card title="游戏信息" className="mb-8 bg-dark-800 border-dark-700">
                  <div className="text-center mb-4">
                    <div className="w-full h-40 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg flex items-center justify-center mb-4">
                      <BookOutlined className="text-4xl text-white/80" />
                    </div>
                    <Title level={4} className="mb-2">{guide.gameTitle}</Title>
                  </div>
                  <Button type="primary" block size="large">
                    查看游戏详情
                  </Button>
                </Card>
              )}

              {/* 作者信息 */}
              {guide.author && (
                <Card title="作者" className="mb-8 bg-dark-800 border-dark-700">
                  <div className="flex items-center space-x-3">
                    <Avatar
                      size={48}
                      icon={<UserOutlined />}
                      style={{ backgroundColor: '#10b981' }}
                    />
                    <Text strong className="text-lg">{guide.authorDisplayName || guide.author}</Text>
                  </div>
                </Card>
              )}
            </Col>
          </Row>
        </div>
      </div>
    </>
  );
};

export default GuideDetailPage;
