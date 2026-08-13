import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Pagination, Tabs, Spin, Empty, Input, Select, Button } from 'antd';
import { SearchOutlined, FilterOutlined, SortAscendingOutlined, FilterFilled } from '@ant-design/icons';
import { useSearch, useAdvancedSearch } from '../api/hooks';
import SearchResultItem from '../components/SearchResultItem';
import { SearchFilters, AdvancedSearchFilters as AdvancedFiltersType } from '../api/types';
import AdvancedSearchFiltersComponent from '../components/search/AdvancedSearchFilters';
import SearchHighlighter from '../components/search/SearchHighlighter';
import SEO from '../components/SEO';
import SEOBreadcrumb from '../components/SEOBreadcrumb';

const { TabPane } = Tabs;
const { Option } = Select;

const SearchResultsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const initialQuery = searchParams.get('q') || '';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const initialType = searchParams.get('type') || 'all';

  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(initialPage);
  const [activeTab, setActiveTab] = useState(initialType);
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'rating' | 'popularity'>('relevance');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFiltersType>({});

  // 判断是否使用高级筛选
  const hasAdvancedFilters = Object.values(advancedFilters).some(
    v => v !== undefined && v !== null && v !== '' && (Array.isArray(v) ? v.length > 0 : true)
  );

  // 使用搜索hook（根据是否有高级筛选选择不同搜索方式）
  const { data: searchResult, isLoading, error } = hasAdvancedFilters
    ? useAdvancedSearch(query, advancedFilters, { page, limit: 20 })
    : useSearch(
        query,
        { ...filters, types: activeTab === 'all' ? undefined : [activeTab] },
        { page, limit: 20 }
      );

  // 当URL参数变化时更新状态
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const newQuery = params.get('q') || '';
    const newPage = parseInt(params.get('page') || '1', 10);
    const newType = params.get('type') || 'all';

    setQuery(newQuery);
    setPage(newPage);
    setActiveTab(newType);
  }, [location.search]);

  // 处理搜索
  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    const params = new URLSearchParams();
    params.set('q', searchQuery);
    if (activeTab !== 'all') params.set('type', activeTab);
    if (page > 1) params.set('page', page.toString());

    navigate(`/search?${params.toString()}`);
  };

  // 处理分页变化
  const handlePageChange = (newPage: number) => {
    setPage(newPage);

    const params = new URLSearchParams(location.search);
    params.set('page', newPage.toString());
    navigate(`/search?${params.toString()}`, { replace: true });
  };

  // 处理标签页变化
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setPage(1);

    const params = new URLSearchParams(location.search);
    params.set('type', key);
    params.set('page', '1');
    navigate(`/search?${params.toString()}`);
  };

  // 处理排序变化
  const handleSortChange = (value: 'relevance' | 'date') => {
    setSortBy(value);
    // 这里可以根据排序值更新搜索结果
    // 目前后端可能不支持排序，所以暂时只是UI变化
  };

  // 获取结果统计
  const getResultStats = () => {
    if (!searchResult) return { total: 0, byType: {} };

    return {
      total: searchResult.pagination?.total || 0,
      byType: searchResult.byType || {}
    };
  };

  // 翻译类型名称
  const getTypeName = (type: string) => {
    const typeMap: Record<string, string> = {
      all: '全部',
      game: '游戏',
      review: '评测',
      news: '新闻',
      community_post: '社区帖子',
      user: '用户',
    };
    return typeMap[type] || type;
  };

  const lang = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] || 'cn' : 'cn';
  const resultStats = getResultStats();

  return (
    <div className=" py-2">
      <SEO
        title={query ? `${query} - 搜索 | GameHub` : '搜索 | GameHub'}
        description={`搜索"${query || ''}"的游戏、评测、新闻结果`}
        keywords="游戏搜索, 游戏查找, 游戏发现, GameHub搜索, 游戏内容搜索"
        canonical={`/${lang}/search`}
        noindex
      />
      <SEOBreadcrumb items={[
        { name: '首页', url: `/${lang}` },
        { name: '搜索', url: `/${lang}/search` },
      ]} />
      {/* 搜索框 */}
      <div className="mb-8">
        <div className="max-w-2xl mx-auto">
          <Input.Search
            placeholder="搜索游戏、评测、新闻、用户..."
            size="large"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onSearch={handleSearch}
            enterButton={<SearchOutlined />}
          />
        </div>
      </div>

      {/* 结果统计和筛选器 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          {isLoading ? (
            <div className="flex items-center">
              <Spin size="small" className="mr-2" />
              <span className="text-gray-600 dark:text-gray-400">搜索中...</span>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold">
                {query ? `"${query}" 的搜索结果` : '搜索'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                找到 {resultStats.total} 个结果
              </p>
            </>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <Select
            value={sortBy}
            onChange={handleSortChange}
            suffixIcon={<SortAscendingOutlined />}
            className="w-32"
          >
            <Option value="relevance">按相关性</Option>
            <Option value="date">按时间</Option>
          </Select>

          <Button
            icon={<FilterOutlined />}
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            type={showAdvancedFilters ? 'primary' : 'default'}
          >
            筛选
          </Button>
        </div>
      </div>

      {/* 高级筛选面板 */}
      <AdvancedSearchFiltersComponent
        visible={showAdvancedFilters}
        filters={advancedFilters}
        onChange={setAdvancedFilters}
        onReset={() => {
          setAdvancedFilters({});
          setShowAdvancedFilters(false);
        }}
      />

      {/* 类型标签页 */}
      <div className="mb-6">
        <Tabs activeKey={activeTab} onChange={handleTabChange}>
          <TabPane tab="全部" key="all" />
          <TabPane tab="游戏" key="game" />
          <TabPane tab="评测" key="review" />
          <TabPane tab="新闻" key="news" />
          <TabPane tab="社区帖子" key="community_post" />
          <TabPane tab="用户" key="user" />
        </Tabs>
      </div>

      {/* 搜索结果 */}
      <div className="mb-8">
        {isLoading ? (
          <div className="flex justify-center py-2">
            <Spin size="large" />
          </div>
        ) : error ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <p className="text-lg">搜索出错</p>
                <p className="text-gray-600 dark:text-gray-400">{error.message}</p>
              </div>
            }
            className="py-2"
          />
        ) : searchResult?.results && searchResult.results.length > 0 ? (
          <div className="space-y-4">
            {searchResult.results.map((item) => (
              <SearchResultItem key={`${item.type}-${item.id}`} item={item} query={query} />
            ))}
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <p className="text-lg">未找到相关结果</p>
                <p className="text-gray-600 dark:text-gray-400">尝试使用其他关键词或筛选条件</p>
              </div>
            }
            className="py-2"
          />
        )}
      </div>

      {/* 分页 */}
      {searchResult?.results && searchResult.results.length > 0 && (
        <div className="flex justify-center">
          <Pagination
            current={page}
            total={resultStats.total}
            pageSize={20}
            onChange={handlePageChange}
            showSizeChanger={false}
            showQuickJumper
            showTotal={(total, range) => `${range[0]}-${range[1]} 条，共 ${total} 条`}
          />
        </div>
      )}
    </div>
  );
};

export default SearchResultsPage;