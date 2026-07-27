import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Typography, Input, Select, Button, message, Alert, Space } from 'antd';
import { ArrowLeftOutlined, SendOutlined, SaveOutlined } from '@ant-design/icons';
import { useCreateBlogPost } from '../api/hooks';
import BlogEditor from '../components/blog/BlogEditor';
import SEO from '../components/SEO';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const blogCategories = [
  { value: '公司动态', label: '公司动态' },
  { value: '技术分享', label: '技术分享' },
  { value: '社区故事', label: '社区故事' },
  { value: '开发故事', label: '开发故事' },
  { value: '游戏文化', label: '游戏文化' },
];

const BlogNewPage = () => {
  const { lang } = useParams<{ lang: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const createBlogPost = useCreateBlogPost();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('技术分享');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const buildData = () => ({
    title: title.trim(),
    content: content.trim(),
    excerpt: excerpt.trim() || title.trim(),
    category,
    tags: tagsText.split(/[,，]/).map(t => t.trim()).filter(Boolean),
    coverImageUrl: coverImageUrl || undefined,
  });

  const handleSubmit = async () => {
    if (!title.trim()) {
      message.error('请输入文章标题');
      return;
    }
    if (!content.trim()) {
      message.error('请输入文章内容');
      return;
    }
    if (!category) {
      message.error('请选择文章分类');
      return;
    }

    setSubmitting(true);
    try {
      const result = await createBlogPost.mutateAsync(buildData());

      const blogResult = result as { reviewStatus?: string; reviewComment?: string };
      if (blogResult.reviewStatus === 'approved') {
        message.success('博客发布成功！');
      } else if (blogResult.reviewStatus === 'rejected') {
        message.warning(`内容未通过审核：${blogResult.reviewComment || '内容不符合规范'}`);
      } else {
        message.success('博客提交成功！等待管理员审核...');
      }
      navigate(`/${lang || 'cn'}/blog/my`);
    } catch (err: any) {
      message.error(err?.message || '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      message.error('请至少输入文章标题');
      return;
    }

    setSubmitting(true);
    try {
      await createBlogPost.mutateAsync({
        ...buildData(),
        status: 'draft',
      });
      message.success('草稿保存成功！');
      navigate(`/${lang || 'cn'}/blog/my?tab=draft`);
    } catch (err: any) {
      message.error(err?.message || '保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900">
      <SEO title="写文章 | GameHub 博客" description="在 GameHub 博客撰写新文章，分享游戏见解和心得" keywords="写文章, 发布博客, GameHub博客, 创建文章, 游戏博客" />

      <div className="py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              type="text"
              className="!text-gray-400 hover:!text-white"
              onClick={() => navigate(`/${lang || 'cn'}/blog`)}
            >
              <ArrowLeftOutlined />
            </Button>
            <Title level={3} className="!text-white !mb-0">写文章</Title>
          </div>
          <Space>
            <Button
              icon={<SaveOutlined />}
              onClick={handleSaveDraft}
              loading={submitting}
              size="large"
            >
              保存草稿
            </Button>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSubmit}
              loading={submitting}
              className="!bg-blue-600"
              size="large"
            >
              提交审核
            </Button>
          </Space>
        </div>

        {/* Notice */}
        <Alert
          message="提交后需管理员审核通过方可发布，请确保内容符合社区规范。也可以先保存草稿，完善后再提交。"
          type="info"
          showIcon
          className="mb-6 !bg-blue-900/30 !border-blue-800 !text-blue-200"
        />

        <div className="space-y-5">
          {/* Title */}
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

          {/* Category & Cover */}
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

          {/* Excerpt */}
          <div>
            <Text className="!text-gray-300 !block !mb-1 !font-medium">摘要</Text>
            <Input.TextArea
              rows={2}
              placeholder="文章摘要，不填则默认使用标题"
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
              maxLength={200}
              showCount
              className="!bg-dark-800 !text-gray-200 !border-dark-600"
            />
          </div>

          {/* Content */}
          <div>
            <Text className="!text-gray-300 !block !mb-1 !font-medium">文章内容 *</Text>
            <BlogEditor
              value={content}
              onChange={setContent}
              placeholder="开始撰写你的博客内容...&#10;&#10;你可以使用工具栏上的按钮插入图片、链接等格式。&#10;图片上传后会自动插入到光标位置。"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogNewPage;
