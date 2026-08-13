import { Typography, Card, Form, Input, Select, Button, message, Tag } from 'antd';
import { ArrowLeftOutlined, MessageOutlined, TrophyOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import apiService from '../api';
import { useGame } from '../api/hooks';
import SEO from '../components/SEO';

const { Title } = Typography;
const { TextArea } = Input;

const POST_CATEGORIES = [
  { value: 'general', label: '综合讨论' },
  { value: 'gaming', label: '游戏讨论' },
  { value: 'tech', label: '技术交流' },
  { value: 'off-topic', label: '闲聊水区' },
  { value: 'guide', label: '攻略分享' },
  { value: 'fan-art', label: '同人创作' },
];

const PostNewPage = () => {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const [searchParams] = useSearchParams();
  const gameIdParam = searchParams.get('gameId');
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: game } = useGame(gameIdParam || '');

  const createPost = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiService.createCommunityPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      if (gameIdParam) {
        queryClient.invalidateQueries({ queryKey: ['community', 'gamePosts', gameIdParam] });
      }
    },
  });

  const handleSubmit = async (values: any) => {
    try {
      const payload: Record<string, unknown> = {
        title: values.title,
        content: values.content,
        category: values.category,
        tags: values.tags || [],
      };
      if (gameIdParam) {
        payload.gameId = gameIdParam;
      }
      await createPost.mutateAsync(payload);
      message.success('帖子发布成功！');
      if (gameIdParam) {
        navigate(`/${lang}/games/${gameIdParam}/forum`);
      } else {
        navigate(`/${lang}/community`);
      }
    } catch (err: any) {
      message.error(err?.message || '帖子发布失败');
    }
  };

  return (
    <div className="bg-dark-900">
      <SEO title="发帖子 | GameHub" description="在 GameHub 社区发布新帖子，与游戏玩家交流讨论" keywords="发帖子, 社区发帖, 游戏讨论, 新帖, GameHub社区" />
      <div className="max-w-3xl mx-auto px-4 py-2">
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
            <MessageOutlined className="text-2xl text-blue-500" />
            <Title level={3} className="!mb-0">发帖子</Title>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            requiredMark="optional"
          >
            <Form.Item
              name="category"
              label="分类"
              rules={[{ required: true, message: '请选择帖子分类' }]}
            >
              <Select
                size="large"
                placeholder="选择帖子分类"
                options={POST_CATEGORIES}
              />
            </Form.Item>

            {gameIdParam && (
              <Form.Item label="关联游戏">
                <Input
                  size="large"
                  value={game?.title || '加载中...'}
                  disabled
                  prefix={<TrophyOutlined className="text-yellow-500" />}
                />
              </Form.Item>
            )}

            <Form.Item
              name="title"
              label="标题"
              rules={[{ required: true, message: '请输入帖子标题' }]}
            >
              <Input size="large" placeholder="给帖子起个标题" maxLength={100} showCount />
            </Form.Item>

            <Form.Item
              name="content"
              label="内容"
              rules={[{ required: true, message: '请输入帖子内容' }]}
            >
              <TextArea rows={10} placeholder="写下你想分享的内容..." maxLength={50000} showCount />
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
              <div className="flex gap-3 justify-end">
                <Button size="large" onClick={() => navigate(-1)}>
                  取消
                </Button>
                <Button
                  type="primary"
                  size="large"
                  htmlType="submit"
                  loading={createPost.isPending}
                >
                  发布帖子
                </Button>
              </div>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default PostNewPage;
