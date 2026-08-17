import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Typography, Card, Tag, Button, Input, Select, Pagination, Spin, Alert } from 'antd';
import {
  SearchOutlined, CalendarOutlined, EyeOutlined, LikeOutlined,
  FireOutlined, ThunderboltOutlined, RiseOutlined,
  ArrowLeftOutlined, FileTextOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useNews } from '../api/hooks';
import { useDebounce } from '../hooks/useDebounce';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';
import SEOBreadcrumb from '../components/SEOBreadcrumb';
import type { NewsArticle } from '../api/types';

const { Title, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

const CATEGORY_ICONS: Record<string, { icon: React.ReactNode }> = {
  hot: { icon: <FireOutlined className="text-orange-500" /> },
  industry: { icon: <ThunderboltOutlined className="text-blue-500" /> },
  trend: { icon: <RiseOutlined className="text-green-500" /> },
};

const fallbackHotNews: NewsArticle[] = [
  { id: '101', title: '《赛博朋克2077》全新DLC公布', summary: 'CD Projekt Red宣布将为《赛博朋克2077》推出全新大型DLC。', content: '', author: '游戏前线', publishDate: '2026-04-05', category: '游戏新闻', tags: ['赛博朋克2077', 'DLC'], imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400', views: 12500, likes: 850 },
  { id: '102', title: 'Steam春季特卖即将开始', summary: 'Valve宣布Steam春季特卖将于4月15日开始。', content: '', author: 'Steam资讯', publishDate: '2026-04-01', category: '促销信息', tags: ['Steam', '特卖'], imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400', views: 15600, likes: 1100 },
  { id: '103', title: '《艾尔登法环》销量突破3000万', summary: 'FromSoftware宣布全球累计销量突破3000万份。', content: '', author: '游戏观察', publishDate: '2026-03-28', category: '游戏新闻', tags: ['艾尔登法环'], imageUrl: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=400', views: 18300, likes: 2100 },
  { id: '104', title: 'PS5 Pro正式公布', summary: '索尼正式公布PS5 Pro，支持8K游戏。', content: '', author: '硬件前线', publishDate: '2026-03-25', category: '游戏新闻', tags: ['PS5'], imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400', views: 22000, likes: 1800 },
  { id: '105', title: '《黑神话：悟空》发售日期确定', summary: '正式宣布将于2026年8月20日发售。', content: '', author: '游戏资讯', publishDate: '2026-03-20', category: '游戏新闻', tags: ['黑神话悟空'], imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400', views: 35000, likes: 3200 },
  { id: '106', title: '任天堂新主机开发中', summary: '任天堂正在开发下一代主机，预计2027年发布。', content: '', author: '业内爆料', publishDate: '2026-03-18', category: '行业动态', tags: ['任天堂'], imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400', views: 9800, likes: 720 },
  { id: '107', title: '《GTA6》开发进展顺利', summary: 'Rockstar确认预计2026年秋季发售。', content: '', author: '游戏资讯', publishDate: '2026-04-10', category: '游戏新闻', tags: ['GTA6'], imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400', views: 45000, likes: 5600 },
  { id: '108', title: '《原神》新区域即将开放', summary: '5.0版本将开放全新区域。', content: '', author: '米游社', publishDate: '2026-04-08', category: '游戏新闻', tags: ['原神'], imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400', views: 28900, likes: 2300 },
];

const fallbackIndustryNews: NewsArticle[] = [
  { id: '201', title: 'FromSoftware正在开发新IP', summary: '预计2027年发布。', content: '', author: '游戏观察', publishDate: '2026-04-03', category: '行业动态', tags: ['FromSoftware'], imageUrl: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=400', views: 8900, likes: 620 },
  { id: '202', title: '2026年游戏行业市场规模预测', summary: '预计突破2500亿美元。', content: '', author: '行业分析', publishDate: '2026-04-02', category: '行业动态', tags: ['市场分析'], imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400', views: 6700, likes: 450 },
  { id: '203', title: '虚幻引擎5.5版本发布', summary: '带来多项性能优化。', content: '', author: '技术前沿', publishDate: '2026-03-30', category: '行业动态', tags: ['虚幻引擎'], imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400', views: 11200, likes: 890 },
  { id: '204', title: '微软收购多家游戏工作室', summary: '扩充XGP游戏阵容。', content: '', author: '财经新闻', publishDate: '2026-03-26', category: '行业动态', tags: ['微软'], imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400', views: 14500, likes: 1100 },
  { id: '205', title: '云游戏市场快速增长', summary: '用户数同比增长45%。', content: '', author: '市场研究', publishDate: '2026-03-22', category: '行业动态', tags: ['云游戏'], imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400', views: 5400, likes: 380 },
  { id: '206', title: '国产游戏出海成绩亮眼', summary: '收入同比增长18%。', content: '', author: '游戏产业', publishDate: '2026-03-15', category: '行业动态', tags: ['国产游戏'], imageUrl: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=400', views: 8300, likes: 650 },
  { id: '207', title: '游戏引擎市场竞争加剧', summary: 'Unity和虚幻引擎竞争白热化。', content: '', author: '技术观察', publishDate: '2026-04-06', category: '行业动态', tags: ['Unity'], imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400', views: 7200, likes: 510 },
  { id: '208', title: '游戏分级制度新变化', summary: '多国更新分级制度。', content: '', author: '政策解读', publishDate: '2026-04-01', category: '行业动态', tags: ['政策'], imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400', views: 4800, likes: 350 },
];

const fallbackTrendData: NewsArticle[] = [
  { id: '301', title: 'AI技术在游戏开发中的应用', summary: '越来越多公司使用AI技术。', content: '', author: '技术观察', publishDate: '2026-04-06', category: '行业趋势', tags: ['AI'], imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400', views: 9200, likes: 780 },
  { id: '302', title: '跨平台联机成为主流', summary: '超过70%新游戏支持。', content: '', author: '行业分析', publishDate: '2026-04-04', category: '行业趋势', tags: ['跨平台'], imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400', views: 7800, likes: 620 },
  { id: '303', title: '订阅制游戏服务崛起', summary: '改变玩家消费习惯。', content: '', author: '商业模式', publishDate: '2026-04-02', category: '行业趋势', tags: ['订阅制'], imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400', views: 10500, likes: 850 },
  { id: '304', title: 'VR/AR游戏市场迎来新机遇', summary: '苹果Vision Pro带动生态。', content: '', author: '科技前沿', publishDate: '2026-03-28', category: '行业趋势', tags: ['VR'], imageUrl: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=400', views: 13500, likes: 1200 },
  { id: '305', title: '独立游戏开发工具日益完善', summary: '降低开发门槛。', content: '', author: '独立游戏', publishDate: '2026-03-24', category: '行业趋势', tags: ['独立游戏'], imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400', views: 6100, likes: 490 },
  { id: '306', title: '电竞产业规模持续扩大', summary: '收入预计突破20亿美元。', content: '', author: '电竞观察', publishDate: '2026-03-20', category: '行业趋势', tags: ['电竞'], imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400', views: 11400, likes: 930 },
  { id: '307', title: '区块链游戏2.0时代来临', summary: '注重玩法脱离投机标签。', content: '', author: '前沿观察', publishDate: '2026-04-05', category: '行业趋势', tags: ['区块链'], imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400', views: 4500, likes: 320 },
  { id: '308', title: '游戏社交化趋势明显', summary: '内置社交功能打造生态。', content: '', author: '社交观察', publishDate: '2026-03-30', category: '行业趋势', tags: ['社交'], imageUrl: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=400', views: 6800, likes: 540 },
];

const CategoryNewsPage = () => {
  const navigate = useNavigate();
  const { lang, category } = useParams<{ lang: string; category: string }>();
  const { data: news = [], isLoading, isError, error: queryError } = useNews();
  const { t, i18n } = useTranslation('news');
  const [searchText, setSearchText] = useState('');
  const debouncedSearchText = useDebounce(searchText, 300);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const isDynamicCategory = category && !CATEGORY_ICONS[category];

  const config = useMemo(() => {
    const iconCfg = category ? CATEGORY_ICONS[category] : undefined;
    if (category && iconCfg) {
      return {
        icon: iconCfg.icon,
        title: t(`categoryPage.${category}.title`),
        description: t(`categoryPage.${category}.description`),
        seoTitle: t(`categoryPage.${category}.seoTitle`),
        seoDesc: t(`categoryPage.${category}.seoDesc`),
        seoKeywords: t(`categoryPage.${category}.seoKeywords`),
      };
    }
    return {
      title: category || t('breadcrumb.news'), icon: <FileTextOutlined className="text-blue-500" />,
      description: t('categoryPage.dynamic.description', { category: category || '' }),
      seoTitle: t('categoryPage.dynamic.seoTitle', { category: category || t('breadcrumb.news') }),
      seoDesc: t('categoryPage.dynamic.seoDesc', { category: category || '' }),
      seoKeywords: t('categoryPage.dynamic.seoKeywords', { category: category || '' }),
    };
  }, [category, t]);

  useEffect(() => {
    if (isDynamicCategory && category) { setSelectedCategory(category); setCurrentPage(1); }
  }, [category, isDynamicCategory]);

  const displayNews = useMemo(() => {
    if (!isError && news.length > 0) {
      if (category === 'hot') return [...news].sort((a, b) => b.views - a.views);
      if (category === 'industry') { const f = news.filter(n => n.category.includes('行业')); return f.length > 0 ? f : news; }
      if (category === 'trend') return [...news].sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());
      return news;
    }
    if (category === 'hot') return fallbackHotNews;
    if (category === 'industry') return fallbackIndustryNews;
    if (category === 'trend') return fallbackTrendData;
    const allFallback = [...fallbackHotNews, ...fallbackIndustryNews, ...fallbackTrendData];
    return allFallback.filter(n => n.category === category);
  }, [news, isError, category]);

  const allCategories = ['all', ...new Set(news.map(n => n.category))];

  const filteredNews = useMemo(() => {
    let result = [...displayNews];
    if (debouncedSearchText) result = result.filter(n => n.title.toLowerCase().includes(debouncedSearchText.toLowerCase()) || n.summary.toLowerCase().includes(debouncedSearchText.toLowerCase()));
    if (selectedCategory !== 'all') result = result.filter(n => n.category === selectedCategory);
    return result;
  }, [displayNews, debouncedSearchText, selectedCategory]);

  const paginatedNews = useMemo(() => filteredNews.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filteredNews, currentPage, pageSize]);

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString(i18n.language, { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="bg-dark-900">
      <SEO title={config.seoTitle} description={config.seoDesc} keywords={config.seoKeywords} canonical={`/${lang}/news/category/${category}`} />
      <SEOBreadcrumb items={[{ name: t('breadcrumb.home'), url: '/' }, { name: t('breadcrumb.news'), url: `/${lang}/news` }, { name: category || t('breadcrumb.news'), url: `/${lang}/news/category/${category}` }]} />
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button type="text" className="text-white/80 hover:text-white mb-4 !p-0" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/${lang}/news`)}>{t('categoryPage.backToNews')}</Button>
          <div className="flex items-center gap-3 mb-4"><span className="text-3xl">{config.icon}</span><h1 className="text-4xl font-bold text-white">{config.title}</h1></div>
          <p className="text-xl text-white/90 max-w-3xl">{config.description}</p>
          <div className="max-w-4xl mt-8"><div className="flex gap-4">
            <Search placeholder={t('searchPlaceholder')} size="large" className="flex-1" value={searchText} onChange={(e) => setSearchText(e.target.value)} onSearch={(v) => setSearchText(v)} enterButton={t('searchButton')} />
            <Select size="large" style={{ width: 160 }} value={selectedCategory} onChange={(v) => { setSelectedCategory(v); setCurrentPage(1); }}>
              {allCategories.map(cat => <Option key={cat} value={cat}>{cat === 'all' ? t('allCategories') : cat}</Option>)}
            </Select>
          </div></div>
        </div>
      </div>
      <div className="py-2">
        {isError && <Alert title={t('categoryPage.errorTitle')} description={queryError?.message || t('categoryPage.errorDescription')} type="error" showIcon closable className="mb-6" />}
        {isLoading ? <div className="flex justify-center items-center h-64"><Spin size="large" /></div> :
          paginatedNews.length === 0 ? <div className="text-center py-16"><Title level={3} className="text-gray-400 mb-4">{t('noResults.title')}</Title><Paragraph className="text-gray-400 mb-8">{t('noResults.description')}</Paragraph><Button type="primary" size="large" onClick={() => { setSearchText(''); setSelectedCategory('all'); setCurrentPage(1); }}>{t('noResults.resetButton')}</Button></div> :
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {paginatedNews.map((item, index) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }}>
                  <Card hoverable className="bg-dark-800 border-dark-700 flex flex-col" style={{ height: '360px' }} cover={<div className="relative h-48 overflow-hidden"><img alt={item.title} src={item.imageUrl} className="w-full h-full object-cover" /><div className="absolute top-4 left-4"><Tag color="blue">{item.category}</Tag></div></div>}
                    onClick={() => { const fallbackIds = ['101','102','103','104','105','106','107','108','201','202','203','204','205','206','207','208','301','302','303','304','305','306','307','308']; if (!fallbackIds.includes(String(item.id))) navigate(`/${lang}/news/${item.id}`); }}>
                    <Title level={4} className="mb-3">{item.title}</Title>
                    <Paragraph className="text-gray-400 mb-4" ellipsis={{ rows: 3 }}>{item.summary}</Paragraph>
                    <div className="flex items-center justify-between text-gray-400 text-sm">
                      <div className="flex items-center gap-4"><span><CalendarOutlined className="mr-1" />{formatDate(item.publishDate)}</span><span><EyeOutlined className="mr-1" />{item.views.toLocaleString()}</span><span><LikeOutlined className="mr-1" />{item.likes}</span></div>
                      <span className="font-semibold">{item.author}</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-dark-700"><div className="flex flex-wrap gap-2">{item.tags.map((tag, i) => <Tag key={i} color="geekblue" className="text-xs">{tag}</Tag>)}</div></div>
                  </Card>
                </motion.div>
              ))}
            </div>
            <div className="mt-12 flex justify-center">
              <Pagination current={currentPage} pageSize={pageSize} total={filteredNews.length} onChange={setCurrentPage} showSizeChanger={false} showQuickJumper showTotal={(total) => t('pagination.total', { total })} />
            </div>
          </>
        }
      </div>
    </div>
  );
};

export default CategoryNewsPage;
