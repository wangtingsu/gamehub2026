import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Typography, Tag, Button, Input, Select, Pagination, Spin, Alert, Empty } from 'antd';
import { PushpinOutlined, CalendarOutlined, EyeOutlined, LikeOutlined, RightOutlined, ReloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNews } from '../api/hooks';
import { useDebounce } from '../hooks/useDebounce';
import SEO from '../components/SEO';

const { Title } = Typography;
const { Search } = Input;
const { Option } = Select;

const NewsPage = () => {
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang || 'cn';
  const { t, i18n } = useTranslation('news');
  const { data: news = [], isLoading, isError, error: queryError, refetch: refetchNews } = useNews();
  const [searchText, setSearchText] = useState('');
  const debouncedSearchText = useDebounce(searchText, 300);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [apiCategories, setApiCategories] = useState<string[]>([]);
  const pageSize = 12;

  useEffect(() => {
    fetch('/api/v1/news/categories/list').then(r => r.json()).then(d => {
      if (d.success) setApiCategories((d.data || []).filter((c: any) => c.isActive).map((c: any) => c.name));
    }).catch(() => {});
  }, []);

  const categories = ['all', ...apiCategories];

  const filteredNews = useMemo(() => {
    let result = [...news];
    if (debouncedSearchText) {
      result = result.filter(n =>
        n.title.toLowerCase().includes(debouncedSearchText.toLowerCase()) ||
        n.summary.toLowerCase().includes(debouncedSearchText.toLowerCase())
      );
    }
    if (selectedCategory !== 'all') {
      result = result.filter(n => n.category === selectedCategory);
    }
    return result;
  }, [news, debouncedSearchText, selectedCategory]);

  const totalPages = Math.ceil(filteredNews.length / pageSize);
  const paginatedNews = useMemo(() =>
    filteredNews.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredNews, currentPage, pageSize]
  );

  const handleCategoryChange = (val: string) => { setSelectedCategory(val); setCurrentPage(1); };
  const handleSearch = (val: string) => { setSearchText(val); setCurrentPage(1); };

  const formatDate = (dateString: string) => {
    try { return new Date(dateString).toLocaleDateString(i18n.language, { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch { return dateString; }
  };

  return (
    <div className="bg-dark-900">
      <SEO title={t('seo.newsTitle', '游戏新闻 | GameHub')}
        description={t('seo.newsDescription', '最新游戏资讯')}
        canonical={`/${currentLang}/news`} />

      <div className="px-8 py-2">
        <Title level={1} className="!text-gray-100 mb-2">{t('title', '游戏新闻')}</Title>
        <p className="text-gray-400 mb-6">{t('subtitle', '最新游戏资讯')}</p>

        {/* 搜索和筛选 */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Search placeholder={t('searchPlaceholder', '搜索新闻...')} size="large"
            value={searchText} onChange={e => setSearchText(e.target.value)}
            onSearch={handleSearch} enterButton={t('searchButton')} className="flex-1" allowClear />
          <Select size="large" style={{ minWidth: 140 }} value={selectedCategory} onChange={handleCategoryChange}>
            <Option value="all">{t('allCategories', '全部分类')}</Option>
            {categories.filter(c => c !== 'all').map(cat => <Option key={cat} value={cat}>{cat}</Option>)}
          </Select>
        </div>

        {/* 加载 */}
        {isLoading && <div className="flex justify-center py-20"><Spin size="large" /></div>}

        {/* 错误 */}
        {isError && (
          <Alert title={t('noResults.title', '加载失败')} description={queryError?.message || ''}
            type="error" showIcon className="mb-4"
            action={<Button size="small" icon={<ReloadOutlined />} onClick={() => refetchNews()}>{t('retry')}</Button>} />
        )}

        {/* 新闻列表 */}
        {!isLoading && filteredNews.length > 0 && (
          <>
            <div className="bg-dark-800 rounded-lg border border-dark-700 divide-y divide-dark-700">
              {paginatedNews.map(item => (
                <Link to={`/${currentLang}/news/${item.id}`} key={item.id} className="block no-underline">
                  <div className="flex items-center gap-4 px-5 py-4 hover:bg-dark-750 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Tag color="blue" className="text-xs m-0">{item.category}</Tag>
                        {item.isPinned && <Tag color="gold" className="text-xs m-0" icon={<PushpinOutlined />}>{t('pinned')}</Tag>}
                      </div>
                      <h2 className="text-base font-semibold !text-gray-100 group-hover:!text-blue-400 line-clamp-1 mb-1">
                        {item.title}
                      </h2>
                      <p className="text-sm text-gray-400 line-clamp-2 mb-2">{item.summary}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span><CalendarOutlined className="mr-1" />{formatDate(item.publishDate)}</span>
                        <span><EyeOutlined className="mr-1" />{item.views.toLocaleString()}</span>
                        <span><LikeOutlined className="mr-1" />{item.likes.toLocaleString()}</span>
                      </div>
                    </div>
                    <RightOutlined className="text-gray-500 group-hover:text-blue-400 text-sm flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <Pagination current={currentPage} pageSize={pageSize} total={filteredNews.length}
                  onChange={setCurrentPage} showSizeChanger={false} showQuickJumper
                  showTotal={total => t('pagination.total', '共 {{total}} 条新闻', { total })} />
              </div>
            )}
          </>
        )}

        {/* 空状态 */}
        {!isLoading && filteredNews.length === 0 && !isError && (
          <Empty description={t('noResults.title', '未找到相关新闻')}>
            <Button type="primary" onClick={() => { setSearchText(''); setSelectedCategory('all'); }}>
              {t('noResults.resetButton', '重置筛选')}
            </Button>
          </Empty>
        )}
      </div>
    </div>
  );
};

export default NewsPage;
