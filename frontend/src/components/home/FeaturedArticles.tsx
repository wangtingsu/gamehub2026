/**
 * FeaturedArticles - 精选文章组件
 *
 * 展示编辑精选的攻略/评测/新闻文章。
 * 按热度（views + likes）和时间自动排序。
 * 使用横排网格 + 滚动触发动画。
 */
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Tag, Typography, Skeleton, Button } from 'antd';
import { StarOutlined, EyeOutlined, ArrowRightOutlined, ReadOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNews, useBlogPosts, useGuides } from '../../api/hooks';

const { Title, Paragraph } = Typography;

const FeaturedArticles = () => {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang || 'cn';
  const { t } = useTranslation('home');

  const { data: newsData, isLoading: newsLoading } = useNews({ page: 1, limit: 4 });
  const { data: blogData, isLoading: blogLoading } = useBlogPosts({ page: 1, limit: 4 });
  const { data: guideData, isLoading: guideLoading } = useGuides({ page: 1, limit: 4 });

  const isLoading = newsLoading && blogLoading && guideLoading;

  // 合并并按热度排序（views + likes）
  const articles = useMemo(() => {
    const merged: any[] = [];

    if (newsData) {
      (Array.isArray(newsData) ? newsData : []).forEach((item: any) => {
        merged.push({
          id: `news-${item.id}`,
          title: item.title,
          excerpt: item.summary || item.excerpt || '',
          category: item.category || t('article.news', '新闻'),
          type: 'news',
          views: item.views || 0,
          likes: item.likes || 0,
          date: item.publishDate || item.createdAt || '',
          link: `/${currentLang}/news/${item.id}`,
        });
      });
    }

    if (blogData) {
      (Array.isArray(blogData) ? blogData : []).forEach((item: any) => {
        merged.push({
          id: `blog-${item.id}`,
          title: item.title,
          excerpt: item.excerpt || item.summary || '',
          category: item.category || t('article.blog', '博客'),
          type: 'blog',
          views: item.views || 0,
          likes: item.likes || 0,
          date: item.publishDate || item.createdAt || '',
          link: `/${currentLang}/blog/${item.id}`,
        });
      });
    }

    if (guideData) {
      (Array.isArray(guideData) ? guideData : []).forEach((item: any) => {
        merged.push({
          id: `guide-${item.id}`,
          title: item.title,
          excerpt: item.summary || item.excerpt || '',
          category: t('article.guide', '攻略'),
          type: 'guide',
          views: item.views || 0,
          likes: item.likes || 0,
          date: item.createdAt || '',
          link: `/${currentLang}/guides/${item.id}`,
        });
      });
    }

    // 按热度排序：likes * 2 + views
    return merged.sort((a, b) => (b.likes * 2 + b.views) - (a.likes * 2 + a.views)).slice(0, 6);
  }, [newsData, blogData, guideData]);

  return (
    <section className="mb-12">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={2} className="flex items-center gap-2 !text-white !mb-1">
            <ReadOutlined className="text-blue-400" />
            {t('featuredArticles', '精选文章')}
          </Title>
          <Paragraph className="text-gray-400 !mb-0">
            {t('featuredArticlesDesc', '编辑精选的攻略、评测与资讯')}
          </Paragraph>
        </div>
        <Button type="link" onClick={() => navigate(`/${currentLang}/news`)}>
          {t('viewAll', '查看全部')} <ArrowRightOutlined />
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><Skeleton active paragraph={{ rows: 3 }} /></Card>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{t('noFeaturedArticles', '暂无精选文章')}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {articles.map((article: any, index: number) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              whileHover={{ y: -6 }}
            >
              <Card
                hoverable
                className="h-full cursor-pointer border-dark-700 bg-dark-800/80 hover:bg-dark-750 transition-colors"
                onClick={() => navigate(article.link)}
              >
                <div className="mb-3 flex items-center gap-2">
                  <Tag color={article.type === 'news' ? 'blue' : article.type === 'guide' ? 'green' : 'purple'}>
                    {article.category}
                  </Tag>
                </div>
                <Title level={4} className="!mb-2 !text-white line-clamp-2 !text-base">
                  {article.title}
                </Title>
                <Paragraph className="text-gray-400 text-sm mb-3 line-clamp-2">
                  {article.excerpt}
                </Paragraph>
                <div className="flex items-center gap-4 text-gray-500 text-xs">
                  <span className="flex items-center gap-1">
                    <EyeOutlined /> {article.views || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <StarOutlined /> {article.likes || 0}
                  </span>
                  <span className="ml-auto">{typeof article.date === 'string' ? article.date.slice(0, 10) : ''}</span>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
};

export default FeaturedArticles;
