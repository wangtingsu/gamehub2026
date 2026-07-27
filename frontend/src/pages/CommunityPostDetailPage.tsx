import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Card, Tag, Button, Skeleton, Alert, Avatar, Divider, Space, message } from 'antd';
import { ArrowLeftOutlined, LikeOutlined, CalendarOutlined, UserOutlined, LockOutlined, PushpinOutlined } from '@ant-design/icons';
import { useCommunityPost } from '../api/hooks';
import CommentList from '../components/comments/CommentList';
import SEO from '../components/SEO';
import SEOBreadcrumb from '../components/SEOBreadcrumb';

const { Title, Paragraph, Text } = Typography;

const CommunityPostDetailPage = () => {
  const { id, lang } = useParams<{ id: string; lang: string }>();
  const navigate = useNavigate();
  const { data: post, isLoading, error } = useCommunityPost(id || '');

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full">
          <Skeleton active avatar paragraph={{ rows: 8 }} />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert
          message="加载失败"
          description={error instanceof Error ? error.message : '帖子不存在'}
          type="error"
          showIcon
          action={
            <Button type="primary" onClick={() => navigate(`/${lang || 'cn'}/community`)}>
              返回社区
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <>
      <SEO
        title={`${post.title} - 社区`}
        description={post.content?.substring(0, 160) || ''}
        keywords={post.tags?.join(', ')}
        type="article"
        author={post.author}
        publishedTime={post.createdAt}
        tags={post.tags}
      />
      <SEOBreadcrumb items={[
        { name: '首页', url: `/${lang || 'cn'}` },
        { name: '社区', url: `/${lang || 'cn'}/community` },
        { name: post.title, url: `/${lang || 'cn'}/community/posts/${post.id}` },
      ]} />
      <div className="min-h-screen bg-dark-900">
        <div className="py-8 -mx-4">
          {/* 返回按钮 */}
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            className="!text-gray-400 hover:!text-white mb-6"
            onClick={() => navigate(`/${lang || 'cn'}/community`)}
          >
            返回社区
          </Button>

          {/* 帖子内容 */}
          <Card className="mb-6">
            <div className="flex items-start gap-3 mb-4 flex-wrap">
              {post.isPinned && (
                <Tag icon={<PushpinOutlined />} color="blue">置顶</Tag>
              )}
              {post.isLocked && (
                <Tag icon={<LockOutlined />} color="orange">已锁定</Tag>
              )}
            </div>

            <Title level={1} className="!text-gray-100 !mb-4">
              {post.title}
            </Title>

            <div className="flex items-center gap-4 mb-6 text-gray-400 flex-wrap">
              <Space>
                <Avatar size="small" icon={<UserOutlined />} src={post.authorAvatar} />
                <Text className="!text-gray-300">{post.author}</Text>
              </Space>
              <Space>
                <CalendarOutlined />
                <Text className="!text-gray-400 text-sm">{formatDate(post.publishDate)}</Text>
              </Space>
              <Space>
                <LikeOutlined />
                <Text className="!text-gray-400 text-sm">{post.likes}</Text>
              </Space>
            </div>

            <Divider className="!border-gray-700" />

            <Paragraph className="!text-gray-300 !text-base leading-relaxed whitespace-pre-wrap">
              {post.content}
            </Paragraph>
          </Card>

          {/* 评论区 */}
          <div className="mt-8">
            <Title level={4} className="!text-gray-100 !mb-4">
              评论 ({post.comments})
            </Title>
            <CommentList
              parentType="community_post"
              parentId={post.id}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default CommunityPostDetailPage;
