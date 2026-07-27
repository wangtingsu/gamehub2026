import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Typography, Card, Form, Input, Select, Rate, Button, message, Alert } from 'antd';
import { ArrowLeftOutlined, StarOutlined } from '@ant-design/icons';
import { useGames, useCreateReview } from '../api/hooks';
import type { ReviewCreateRequest } from '../api/types';
import SEO from '../components/SEO';

const { Title } = Typography;
const { TextArea } = Input;

const ReviewNewPage = () => {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const { data: games = [] } = useGames();
  const createReview = useCreateReview();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: ReviewCreateRequest) => {
    setSubmitting(true);
    try {
      await createReview.mutateAsync(values);
      message.success('评测发布成功！');
      navigate(`/${lang}/community`);
    } catch (err: any) {
      message.error(err?.message || '评测发布失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900">
      <SEO title="写评测 | GameHub" description="发表游戏评测，分享您的游戏体验和观点" keywords="游戏评测, 写评测, 游戏评价, 游戏点评, 发表评测" />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Button
          type="text"
          className="mb-4"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
        >
          返回
        </Button>

        <Card className="bg-dark-800 border-dark-700">
          <div className="flex items-center gap-2 mb-6">
            <StarOutlined className="text-2xl text-yellow-500" />
            <Title level={3} className="!mb-0">写评测</Title>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            requiredMark="optional"
          >
            <Form.Item
              name="gameId"
              label="选择游戏"
              rules={[{ required: true, message: '请选择要评测的游戏' }]}
            >
              <Select
                showSearch
                size="large"
                placeholder="搜索并选择游戏"
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={games.map((g: any) => ({
                  value: g.id,
                  label: g.title,
                }))}
              />
            </Form.Item>

            <Form.Item
              name="title"
              label="评测标题"
              rules={[{ required: true, message: '请输入评测标题' }]}
            >
              <Input size="large" placeholder="给这篇评测起个标题" maxLength={100} />
            </Form.Item>

            <Form.Item
              name="rating"
              label="评分"
              rules={[{ required: true, message: '请给出评分' }]}
            >
              <Rate allowHalf />
            </Form.Item>

            <Form.Item
              name="content"
              label="评测内容"
              rules={[{ required: true, message: '请输入评测内容' }]}
            >
              <TextArea rows={8} placeholder="分享你对这款游戏的看法..." maxLength={10000} showCount />
            </Form.Item>

            <Form.Item
              name="tags"
              label="标签"
            >
              <Select
                mode="tags"
                size="large"
                placeholder="输入标签后按回车添加"
                tokenSeparators={[',']}
              />
            </Form.Item>

            <Form.Item className="!mb-0">
              <Button
                type="primary"
                size="large"
                htmlType="submit"
                loading={submitting}
                className="w-full"
              >
                发布评测
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default ReviewNewPage;
