/**
 * HotGameRecommendations - 热门游戏推荐组件
 *
 * 展示当前最热门的游戏，基于社区讨论热度和评分排序。
 * 支持 loading 骨架屏、空数据态、hover 效果。
 */
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Tag, Rate, Typography, Skeleton, Button } from 'antd';
import { FireOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useTrendingContent } from '../../api/hooks';

const { Title, Paragraph } = Typography;

const HotGameRecommendations = () => {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang || 'cn';
  const { t } = useTranslation('home');

  const { data: trendingItems, isLoading } = useTrendingContent(10);

  const games = Array.isArray(trendingItems) ? trendingItems.slice(0, 10) : [];

  return (
    <section className="mb-12">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={2} className="flex items-center gap-2 !text-white !mb-1">
            <FireOutlined className="text-red-500" />
            {t('hotGames', '热门游戏推荐')}
          </Title>
          <Paragraph className="text-gray-400 !mb-0">
            {t('hotGamesDesc', '当前社区最热门的游戏，看看大家都在玩什么')}
          </Paragraph>
        </div>
        <Button type="link" onClick={() => navigate(`/${currentLang}/games/category/trending`)}>
          {t('viewAll', '查看全部')} <ArrowRightOutlined />
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Card key={i}><Skeleton active paragraph={{ rows: 2 }} /></Card>
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{t('noHotGames', '暂无热门游戏')}</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {games.map((item: any, index: number) => (
            <motion.div
              key={item.id || index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ y: -6 }}
            >
              <Card
                hoverable
                className="h-full cursor-pointer border-dark-700 bg-dark-800/80 hover:bg-dark-750 overflow-hidden"
                onClick={() => navigate(`/${currentLang}/games/${item.id}`)}
                cover={
                  <div className="h-36 overflow-hidden relative">
                    {item.coverImageUrl ? (
                      <img
                        src={item.coverImageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-dark-600 to-dark-700 flex items-center justify-center">
                        <span className="text-3xl opacity-30">🎮</span>
                      </div>
                    )}
                    {/* 排名角标 */}
                    <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-orange-400 flex items-center justify-center text-white text-xs font-bold shadow-md">
                      {index + 1}
                    </div>
                    {index < 3 && (
                      <Tag color="red" className="absolute top-2 right-2 text-[10px] leading-none px-1 border-0">
                        HOT
                      </Tag>
                    )}
                  </div>
                }
              >
                <div className="text-sm font-semibold text-white truncate mb-1">{item.title}</div>
                {item.rating && (
                  <div className="flex items-center gap-1">
                    <Rate disabled value={Number(item.rating) / 2} allowHalf className="text-xs" />
                    <span className="text-xs text-gray-400">{Number(item.rating).toFixed(1)}</span>
                  </div>
                )}
                {item.reason && (
                  <Tag color="orange" className="text-xs mt-2">{item.reason}</Tag>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
};

export default HotGameRecommendations;
