import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Typography, Input, Select, Button, message, Alert, Skeleton, Space } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, SendOutlined } from '@ant-design/icons';
import { useBlogPost, useUpdateBlogPost } from '../api/hooks';
import BlogEditor from '../components/blog/BlogEditor';
import SEO from '../components/SEO';

const { Title, Text } = Typography;

const blogCategories = [
  { value: '公司动态', label: '公司动态' },
  { value: '技术分享', label: '技术分享' },
  { value: '社区故事', label: '社区故事' },
  { value: '开发故事', label: '开发故事' },
  { value: '游戏文化', label: '游戏文化' },
];

const BlogEditPage = () => {
  const { id, lang } = useParams<{ id: string; lang: string }>();
  const navigate = useNavigate();
  const { data: post, isLoading, isError } = useBlogPost(id || '');
  const updateBlogPost = useUpdateBlogPost();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('技术分享');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (post) {
      setTitle(post.title || '');
      setCategory(post.category || '技术分享');
      setContent(post.content || '');
      setExcerpt(post.excerpt || '');
      setCoverImageUrl(post.coverImage || '');
      setTagsText((post.tags || []).join(', '));
    }
  }, [post]);

  const buildData = () => ({
    title: title.trim(),
    content: content.trim(),
    excerpt: excerpt.trim() || title.trim(),
    category,
    tags: tagsText.split(/[,，]/).map(t => t.trim()).filter(Boolean),
    coverImageUrl: coverImageUrl || undefined,
  });

  const handleSave = async () => {
    if (!title.trim()) {
      message.error('请输入文章标题');
      return;
    }
    if (!content.trim()) {
      message.error('请输入文章内容');
      return;
    }

    setSubmitting(true);
    try {
      await updateBlogPost.mutateAsync({
        id: id!,
        data: buildData(),
      });
      message.success('文章已保存！');
      navigate(`/${lang || 'cn'}/blog/my`);
    } catch (err: any) {
      message.error(err?.message || '保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResubmit = async () => {
    if (!title.trim()) {
      message.error('请输入文章标题');
      return;
    }
    if (!content.trim()) {
      message.error('请输入文章内容');
      return;
    }

    setSubmitting(true);
    try {
      await updateBlogPost.mutateAsync({
        id: id!,
        data: {
          ...buildData(),
          reviewStatus: 'pending',
        },
      });
      message.success('已重新提交审核！');
      navigate(`/${lang || 'cn'}/blog/my?tab=pending`);
    } catch (err: any) {
      message.error(err?.message || '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-900 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <Skeleton active className="!text-gray-400" />
        </div>
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="min-h-screen bg-dark-900 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <Alert type="error" message="文章不存在或无权编辑" showIcon />
        </div>
      </div>
    );
  }

  const isDraftOrRejected = post.reviewStatus === 'draft' || post.reviewStatus === 'rejected';

  return (
    <div className="min-h-screen bg-dark-900">
      <SEO title={`编辑文章 | GameHub 博客`} description="编辑 GameHub 博客文章内容" keywords="编辑文章, 修改博客, GameHub博客, 编辑博客, 博客管理" />

      <div className="py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              type="text"
              className="!text-gray-400 hover:!text-white"
              onClick={() => navigate(`/${lang || 'cn'}/blog/my`)}
            >
              <ArrowLeftOutlined />
            </Button>
            <Title level={3} className="!text-white !mb-0">编辑文章</Title>
          </div>
          <Space>
            <Button
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={submitting}
              size="large"
            >
              保存修改
            </Button>
            {isDraftOrRejected && (
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleResubmit}
                loading={submitting}
                className="!bg-blue-600"
                size="large"
              >
                {post.reviewStatus === 'rejected' ? '重新提交审核' : '提交审核'}
              </Button>
            )}
          </Space>
        </div>

        {isDraftOrRejected && (
          <Alert
            message={
              post.reviewStatus === 'rejected'
                ? `文章未通过审核：${post.reviewComment || '内容不符合规范'}。修改后可重新提交审核。`
                : '当前为草稿状态，完善内容后可以提交审核。'
            }
            type={post.reviewStatus === 'rejected' ? 'warning' : 'info'}
            showIcon
            className={`mb-6 ${
              post.reviewStatus === 'rejected'
                ? '!bg-red-900/30 !border-red-800 !text-red-200'
                : '!bg-blue-900/30 !border-blue-800 !text-blue-200'
            }`}
          />
        )}

        {post.reviewStatus === 'approved' && (
          <Alert
            message="编辑已发布的文章，修改将直接更新。"
            type="info"
            showIcon
            className="mb-6 !bg-yellow-900/30 !border-yellow-800 !text-yellow-200"
          />
        )}

        <div className="space-y-5">
          <div>
            <Text className="!text-gray-300 !block !mb-1 !font-medium">文章标题 *</Text>
            <Input
              size="large"
              placeholder="请输入文章标题"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={100}
              showCount
              className="!bg-dark-800 !text-gray-200 !border-dark-600"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Text className="!text-gray-300 !block !mb-1 !font-medium">分类 *</Text>
              <Select
                value={category}
                onChange={setCategory}
                options={blogCategories}
                className="!w-full"
                size="large"
                popupClassName="!bg-dark-800"
              />
            </div>
            <div>
              <Text className="!text-gray-300 !block !mb-1 !font-medium">封面图链接</Text>
              <Input
                size="large"
                placeholder="可选，输入图片URL"
                value={coverImageUrl}
                onChange={e => setCoverImageUrl(e.target.value)}
                className="!bg-dark-800 !text-gray-200 !border-dark-600"
              />
            </div>
          </div>

          <div>
            <Text className="!text-gray-300 !block !mb-1 !font-medium">标签</Text>
            <Input size="large" placeholder="用逗号分隔" value={tagsText}
              onChange={e => setTagsText(e.target.value)}
              className="!bg-dark-800 !text-gray-200 !border-dark-600" />
          </div>

          <div>
            <Text className="!text-gray-300 !block !mb-1 !font-medium">摘要</Text>
            <Input.TextArea
              rows={2}
              placeholder="文章摘要"
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
              maxLength={200}
              showCount
              className="!bg-dark-800 !text-gray-200 !border-dark-600"
            />
          </div>

          <div>
            <Text className="!text-gray-300 !block !mb-1 !font-medium">文章内容 *</Text>
            <BlogEditor
              value={content}
              onChange={setContent}
              placeholder="编辑你的博客内容..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogEditPage;
