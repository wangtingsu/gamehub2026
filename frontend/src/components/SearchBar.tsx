import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Input, Dropdown, Spin, Empty, Button, Tooltip } from 'antd';
import { SearchOutlined, CloseOutlined, FireOutlined, HistoryOutlined, RobotOutlined } from '@ant-design/icons';
import { useSearchSuggestions, usePopularSearches } from '../api/hooks';
import { SearchSuggestion } from '../api/types';

const { Search } = Input;

/**
 * SearchBar 组件的属性接口
 *
 * @property compact - 是否启用紧凑模式，为 true 时搜索框宽度缩小（用于导航栏等空间有限的场景）
 * @property autoFocus - 是否在挂载时自动聚焦搜索输入框
 * @property onSearch - 自定义搜索回调函数。非必填，若不传则默认导航到 /search 页面
 */
interface SearchBarProps {
  compact?: boolean;
  autoFocus?: boolean;
  onSearch?: (query: string) => void;
}

/**
 * SearchBar — 全局搜索栏组件，支持搜索建议、搜索历史、热门搜索和 AI 助手入口
 *
 * 核心功能：
 * 1. 搜索输入与建议：输入时调用后端 API 获取搜索建议（游戏、用户、评测、新闻等），以带类型图标的列表展示
 * 2. 搜索历史：自动保存最近 10 条搜索记录到 localStorage，支持点击快速搜索
 * 3. 热门搜索：展示从后端获取的全局热门搜索词，点击可直接搜索
 * 4. 防抖优化：输入框值变化时使用 300ms 防抖，减少不必要的 API 请求
 * 5. 外部点击关闭：点击下拉菜单外部区域时自动关闭建议面板
 * 6. AI 助手入口：侧边附带 AI 助手按钮，点击可导航到 AI 对话页面（按 /:lang/ai）
 *
 * @param props - 组件属性，详见 SearchBarProps 接口
 * @returns 包含搜索输入框、搜索建议下拉菜单和 AI 助手按钮的 React 元素
 */
const SearchBar: React.FC<SearchBarProps> = ({ compact = false, autoFocus = false, onSearch }) => {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang || 'cn';
  const [query, setQuery] = useState('');
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 获取搜索建议和热门搜索
  const { data: suggestions = [], isLoading: suggestionsLoading } = useSearchSuggestions(query);
  const { data: popularSearches = [] } = usePopularSearches();

  /** 防抖定时器的引用，用于在防抖期间清除之前的定时器 */
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  /**
   * 防抖设置查询字符串
   *
   * 使用 300ms 防抖延迟，避免用户在快速输入时频繁触发后端搜索建议请求。
   *
   * @param value - 用户输入的搜索文本
   */
  const debouncedSetQuery = useCallback((value: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setQuery(value);
    }, 300);
  }, []);

  /**
   * 在组件挂载时从 localStorage 中加载搜索历史
   *
   * 搜索历史存储在 localStorage 的 'searchHistory' 键中，格式为 JSON 字符串数组。
   * 若解析失败（如数据被篡改），会打印错误但不影响页面正常使用。
   */
  useEffect(() => {
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Failed to parse search history:', error);
      }
    }
  }, []);

  /**
   * 将搜索词保存到搜索历史
   *
   * - 去重：如果历史中已有相同搜索词（忽略大小写），则将旧记录移除后再添加到最前面
   * - 数量限制：最多保存 10 条记录，超出部分自动截断
   * - 持久化：同时更新 React 状态和 localStorage
   *
   * @param searchQuery - 需要保存的搜索词
   */
  const saveToHistory = (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    const updatedHistory = [
      searchQuery,
      ...searchHistory.filter(item => item.toLowerCase() !== searchQuery.toLowerCase()),
    ].slice(0, 10); // 最多保存10条

    setSearchHistory(updatedHistory);
    localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
  };

  /**
   * 处理搜索提交
   *
   * 当用户按下回车或点击搜索按钮时调用：
   * - 保存搜索词到历史记录
   * - 关闭建议下拉菜单
   * - 如果传入了 onSearch 回调，则调用该回调；否则默认导航到 /search 页面，
   *   将搜索词作为 URL 查询参数 q 传递（已进行 URL 编码）
   *
   * @param searchQuery - 用户提交的搜索词
   */
  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    saveToHistory(searchQuery);
    setIsDropdownVisible(false);

    // 调用自定义搜索处理函数或导航到搜索结果页面
    if (onSearch) {
      onSearch(searchQuery);
    } else {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  /**
   * 处理输入框内容变化
   *
   * 使用防抖函数更新查询字符串，同时打开建议下拉菜单。
   *
   * @param e - 输入框变化事件对象
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    debouncedSetQuery(value);
    setIsDropdownVisible(true);
  };

  /**
   * 清除搜索框内容和关闭下拉菜单
   */
  const handleClearSearch = () => {
    setQuery('');
    setIsDropdownVisible(false);
  };

  /**
   * 监听文档的 pointerdown 事件，点击搜索组件外部区域时自动关闭下拉菜单
   *
   * 使用 pointerdown 而不是 click 以获得更好的触控设备支持。
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownVisible(false);
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  /**
   * 渲染单个搜索建议项
   *
   * 根据建议的类型（游戏、用户、评测、新闻、帖子）显示对应的图标和中文标签。
   *
   * @param suggestion - 搜索建议数据对象
   * @returns 搜索建议项的 JSX 元素
   */
  const renderSuggestionItem = (suggestion: SearchSuggestion) => {
    const icon = suggestion.type === 'game' ? '🎮' :
                 suggestion.type === 'user' ? '👤' :
                 suggestion.type === 'review' ? '📝' :
                 suggestion.type === 'news' ? '📰' : '💬';

    return (
      <div className="flex items-center space-x-3 p-2 hover:bg-gray-100 dark:hover:bg-dark-800 rounded cursor-pointer">
        <div className="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-dark-700 rounded">
          <span className="text-lg">{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{suggestion.title}</div>
          {suggestion.subtitle && (
            <div className="text-xs text-gray-500 truncate">{suggestion.subtitle}</div>
          )}
        </div>
        <div className="text-xs px-2 py-1 bg-gray-100 dark:bg-dark-700 rounded">
          {suggestion.type === 'game' ? '游戏' :
           suggestion.type === 'user' ? '用户' :
           suggestion.type === 'review' ? '评测' :
           suggestion.type === 'news' ? '新闻' : '帖子'}
        </div>
      </div>
    );
  };

  /**
   * 下拉菜单内容 — 包含搜索建议、搜索历史和热门搜索三个区域
   *
   * - 搜索建议区域：仅在用户输入内容后显示，基于后端返回的建议列表渲染。加载中显示 Spin，
   *   无结果时显示 Empty 占位
   * - 搜索历史区域：显示从 localStorage 加载的最近搜索记录，以标签形式展示，点击可快速搜索
   * - 热门搜索区域：显示后端返回的热门搜索词，以渐变背景标签形式展示，点击可快速搜索
   */
  const dropdownContent = (
    <div className="w-full max-h-96 overflow-y-auto">
      {/* 搜索建议 */}
      {query && (
        <div className="p-2">
          <div className="text-sm font-medium text-gray-500 mb-2">搜索建议</div>
          {suggestionsLoading ? (
            <div className="flex justify-center py-4">
              <Spin size="small" />
            </div>
          ) : suggestions.length > 0 ? (
            <div className="space-y-1">
              {suggestions.map((suggestion) => (
                <div
                  key={`${suggestion.type}-${suggestion.id}`}
                  onClick={() => {
                    setQuery(suggestion.title);
                    handleSearch(suggestion.title);
                  }}
                >
                  {renderSuggestionItem(suggestion)}
                </div>
              ))}
            </div>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="无相关建议"
              className="py-4"
            />
          )}
        </div>
      )}

      {/* 搜索历史 */}
      {searchHistory.length > 0 && (
        <div className="p-2 border-t border-gray-200 dark:border-dark-700">
          <div className="flex items-center text-sm font-medium text-gray-500 mb-2">
            <HistoryOutlined className="mr-2" />
            搜索历史
          </div>
          <div className="flex flex-wrap gap-2">
            {searchHistory.map((item, index) => (
              <div
                key={index}
                className="px-3 py-1 bg-gray-100 dark:bg-dark-700 rounded-full text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-dark-600"
                onClick={() => {
                  setQuery(item);
                  handleSearch(item);
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 热门搜索 */}
      {popularSearches.length > 0 && (
        <div className="p-2 border-t border-gray-200 dark:border-dark-700">
          <div className="flex items-center text-sm font-medium text-gray-500 mb-2">
            <FireOutlined className="mr-2" />
            热门搜索
          </div>
          <div className="flex flex-wrap gap-2">
            {popularSearches.map((item, index) => (
              <div
                key={index}
                className="px-3 py-1 bg-gradient-to-r from-primary-100 to-secondary-100 dark:from-primary-900 dark:to-secondary-900 rounded-full text-sm cursor-pointer hover:opacity-90"
                onClick={() => {
                  setQuery(item);
                  handleSearch(item);
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    /**
     * 渲染搜索栏 UI
     *
     * 整体结构：
     * - 外层包装 div（relative 定位 + ref 用于外部点击检测）
     * - Ant Design Dropdown 组件包裹搜索区域，弹出建议面板
     * - 搜索输入框（Search 组件）：支持 compact 模式调整宽度、自动聚焦、允许清空
     * - AI 助手按钮：点击导航到 AI 对话页面，同时阻止事件冒泡和关闭下拉菜单
     */
    <div className="relative" ref={dropdownRef}>
      <Dropdown
        popupRender={() => dropdownContent}
        open={isDropdownVisible}
        trigger={['click']}
        placement="bottomLeft"
        classNames={{ root: 'search-dropdown' }}
      >
        <div className="flex items-center gap-1" onClick={() => { if (!isDropdownVisible) setIsDropdownVisible(true); }}>
          <Search
            placeholder="搜索游戏、评测、新闻、用户..."
            value={query}
            onChange={handleInputChange}
            onSearch={handleSearch}
            onFocus={() => setIsDropdownVisible(true)}
            autoFocus={autoFocus}
            allowClear={{ clearIcon: <CloseOutlined /> }}
            className={compact ? 'w-44' : 'w-64 lg:w-80'}
            size="middle"
            prefix={<SearchOutlined className="text-gray-400" />}
            enterButton={!compact}
          />
          <Tooltip title="AI 助手">
            <Button
              type="default"
              size="large"
              icon={<RobotOutlined />}
              className="flex-shrink-0 min-h-[44px] min-w-[44px]"
              onClick={(e) => {
                e.stopPropagation();
                setIsDropdownVisible(false);
                navigate(`/${currentLang}/ai`);
              }}
            />
          </Tooltip>
        </div>
      </Dropdown>
    </div>
  );
};

export default SearchBar;