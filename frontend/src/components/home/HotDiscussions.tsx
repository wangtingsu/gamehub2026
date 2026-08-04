/**
 * HotDiscussions - 热门讨论组件
 *
 * 展示社区热门讨论帖子，按回复数和热度自动排序。
 * 每个卡片显示帖子标题、内容摘要、回复数、作者信息。
 */
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Tag, Typography, Skeleton, Button, Avatar } from 'antd';
import { FireOutlined, MessageOutlined, ArrowRightOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useCommunityPosts } from '../../api/hooks';

const { Title, Paragraph } = Typography;

const HotDiscussions = () => {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang || 'cn';
  const { t } = useTranslation('home');

  const { data: posts, isLoading } = useCommunityPosts({ page: 1, limit: 6 });

  // 按热度排序（回复数 + 点赞数）
  const hotPosts = Array.isArray(posts)
    ? [...posts]
        .sort((a: any, b: any) => {
          const aHeat = (a.replyCount || a.commentCount || 0) + (a.likes || 0);
          const bHeat = (b.replyCount || b.commentCount || 0) + (b.likes || 0);
          return bHeat - aHeat;
        })
        .slice(0, 6)
    : [];

  return (
    <section className="mb-12">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={2} className="flex items-center gap-2 !text-white !mb-1">
            <TeamOutlined className="text-orange-400" />
            {t('home.hotDiscussions', '热门讨论')}
          </Title>
          <Paragraph className="text-gray-400 !mb-0">
            {t('home.hotDiscussionsDesc', '社区中最活跃的话题讨论')}
          </Paragraph>
        </div>
        <Button type="link" onClick={() => navigate(`/${currentLang}/community-forum`)}>
          {t('home.viewAll', '查看全部')} <ArrowRightOutlined />
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><Skeleton active paragraph={{ rows: 2 }} /></Card>
          ))}
        </div>
      ) : hotPosts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">暂无热门讨论</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {hotPosts.map((post: any, index: number) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              whileHover={{ y: -4 }}
            >
              <Card
                hoverable
                className="h-full cursor-pointer border-dark-700 bg-dark-800/80 hover:bg-dark-750"
                onClick={() => navigate(`/${currentLang}/community/posts/${post.id}`)}
              >
                <div className="flex items-start gap-3">
                  <Avatar
                    src={post.authorAvatar}
                    icon={<UserOutlined />}
                    className="flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <Title level={5} className="!mb-2 !text-white line-clamp-1 !text-sm">
                      {post.title}
                    </Title>
                    <Paragraph className="text-gray-400 text-xs mb-3 line-clamp-2">
                      {post.content || post.excerpt || post.summary || ''}
                    </Paragraph>
                    <div className="flex items-center gap-4 text-gray-500 text-xs">
                      <span className="flex items-center gap-1">
                        <FireOutlined className="text-orange-400" />
                        {post.likes || 0} 热度
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageOutlined />
                        {post.replyCount || post.commentCount || 0} 回复
                      </span>
                      <span className="text-gray-600 truncate ml-auto">
                        {post.authorName || post.author || '匿名'}
                      </span>
                    </div>
                    {post.category && (
                      <div className="mt-2">
                        <Tag color="orange" className="text-xs">{post.category}</Tag>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
};

export default HotDiscussions;
