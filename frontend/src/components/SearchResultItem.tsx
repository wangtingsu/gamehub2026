import { Card, Tag, Rate, Avatar } from 'antd';
import { Link, useParams } from 'react-router-dom';
import {
  VideoCameraOutlined,
  FileTextOutlined,
  ReadOutlined,
  MessageOutlined,
  UserOutlined
} from '@ant-design/icons';
import { SearchResultItem as SearchResultItemType } from '../api/types';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import SearchHighlighter from './search/SearchHighlighter';

/**
 * SearchResultItem 组件的属性接口
 *
 * @property item - 搜索结果项数据，包含标题、类型、描述、评分、作者等字段
 * @property query - 当前搜索关键词（可选），用于高亮匹配文本
 */
interface SearchResultItemProps {
  item: SearchResultItemType;
  query?: string;
}

/**
 * SearchResultItem — 搜索结果单项卡片组件，根据搜索结果类型渲染不同的卡片布局
 *
 * 支持的搜索结果类型：
 * - game：游戏卡片（展示封面图、标题、评分、评测数、点赞数、评论数）
 * - user：用户卡片（展示头像、用户名、个人简介、加入时间）
 * - review / news / community_post：内容卡片（展示标题、分类标签、作者信息、内容摘要、互动数据）
 * - 未知类型：显示通用降级卡片
 *
 * 功能特点：
 * - 使用 SearchHighlighter 组件高亮与搜索词匹配的文本片段
 * - 使用 Ant Design 的 Card、Tag、Rate、Avatar 等组件构建统一视觉风格
 * - 日期使用 date-fns 格式化为中文相对时间（如"3天前"）
 * - 所有卡片支持 hover 效果
 *
 * @param props - 组件属性，详见 SearchResultItemProps 接口
 * @returns 根据搜索结果类型返回对应的卡片 JSX 元素
 */
const SearchResultItem: React.FC<SearchResultItemProps> = ({ item, query }) => {
  const { lang } = useParams<{ lang: string }>();
  const langPrefix = lang || 'cn';

  /**
   * 根据搜索结果类型获取对应的图标、颜色主题、中文标签和路由路径
   *
   * 类型对照表：
   * - game -> 蓝色、VideoCameraOutlined 图标、路由 /games/:id
   * - review -> 绿色、FileTextOutlined 图标、路由 /reviews/:id
   * - news -> 紫色、ReadOutlined 图标、路由 /news/:id
   * - community_post -> 橙色、MessageOutlined 图标、路由 /community/:id
   * - user -> 粉色、UserOutlined 图标、路由 /users/:id
   *
   * @returns 包含 icon（图标 JSX）、color（Tailwind 颜色类名）、label（中文标签）、route（路由路径）的对象
   */
  const getTypeInfo = () => {
    switch (item.type) {
      case 'game':
        return {
          icon: <VideoCameraOutlined style={{ fontSize: '20px' }} />,
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
          label: '游戏',
          route: `/${langPrefix}/games/${item.id}`,
        };
      case 'review':
        return {
          icon: <FileTextOutlined style={{ fontSize: '20px' }} />,
          color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
          label: '评测',
          route: `/${langPrefix}/reviews/${item.id}`,
        };
      case 'news':
        return {
          icon: <ReadOutlined style={{ fontSize: '20px' }} />,
          color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
          label: '新闻',
          route: `/${langPrefix}/news/${item.id}`,
        };
      case 'community_post':
        return {
          icon: <MessageOutlined style={{ fontSize: '20px' }} />,
          color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
          label: '帖子',
          route: `/${langPrefix}/community/${item.id}`,
        };
      case 'user':
        return {
          icon: <UserOutlined style={{ fontSize: '20px' }} />,
          color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
          label: '用户',
          route: `/${langPrefix}/users/${item.id}`,
        };
      default:
        return {
          icon: null,
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
          label: item.type,
          route: '#',
        };
    }
  };

  const typeInfo = getTypeInfo();
  const date = item.createdAt || item.publishedAt;
  /** 使用 date-fns 格式化为中文相对时间（如"3 天前"、"刚刚"） */
  const formattedDate = date ? formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: zhCN
  }) : null;

  /**
   * 渲染游戏搜索结果的卡片布局
   *
   * 展示内容：
   * - 左侧：游戏封面图（160x192px），加载失败时隐藏
   * - 右侧：游戏标题（可点击跳转）、类型标签、评分（星级+数字）、发布日期
   * - 描述文本（最多 2 行），搜索关键词高亮
   * - 元数据：评测数、点赞数、评论数
   *
   * @returns 游戏卡片 JSX 元素
   */
  const renderGameCard = () => (
    <Card hoverable className="h-full">
      <div className="flex flex-col md:flex-row gap-4">
        {/* 封面图片 */}
        {item.coverImageUrl && (
          <div className="flex-shrink-0">
            <img
              src={item.coverImageUrl}
              alt={item.title}
              className="w-32 h-48 object-cover rounded-lg"
              onError={(e) => { const el = e.target as HTMLImageElement; el.onerror = null; el.style.display = 'none'; }}
            />
          </div>
        )}

        <div className="flex-1">
          {/* 标题和类型 */}
          <div className="flex items-start justify-between mb-2">
            <div>
              <Link to={typeInfo.route}>
                <h3 className="text-xl font-bold hover:text-primary-600 transition-colors">
                  {item.title}
                </h3>
              </Link>
              <div className="flex items-center gap-2 mt-1">
                <Tag className={typeInfo.color}>
                  <div className="flex items-center gap-1">
                    {typeInfo.icon}
                    <span>{typeInfo.label}</span>
                  </div>
                </Tag>
                {item.rating && (
                  <div className="flex items-center gap-1">
                    <Rate disabled defaultValue={typeof item.rating === 'string' ? parseFloat(item.rating) : item.rating} allowHalf className="text-sm" />
                    <span className="text-sm font-medium">{item.rating}</span>
                  </div>
                )}
              </div>
            </div>

            {formattedDate && (
              <span className="text-sm text-gray-500">{formattedDate}</span>
            )}
          </div>

          {/* 描述 */}
          {item.description && (
            <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
              <SearchHighlighter text={item.description} keyword={query} />
            </p>
          )}

          {/* 元数据 */}
          <div className="flex flex-wrap gap-4 text-sm">
            {item.reviewCount !== undefined && (
              <div className="flex items-center gap-1">
                <span className="font-medium">{item.reviewCount}</span>
                <span className="text-gray-500">条评测</span>
              </div>
            )}
            {item.likes !== undefined && (
              <div className="flex items-center gap-1">
                <span className="font-medium">{item.likes}</span>
                <span className="text-gray-500">点赞</span>
              </div>
            )}
            {item.comments !== undefined && (
              <div className="flex items-center gap-1">
                <span className="font-medium">{item.comments}</span>
                <span className="text-gray-500">评论</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );

  /**
   * 渲染评测/新闻/帖子等通用内容卡片的布局
   *
   * 展示内容：
   * - 标题（可点击跳转）、类型标签、关联游戏标签、分类标签
   * - 作者头像、显示名和用户名
   * - 内容摘要（最多 2 行），搜索关键词高亮
   * - 元数据：评分、点赞数、评论数、浏览数
   *
   * @returns 通用内容卡片 JSX 元素
   */
  const renderContentCard = () => (
    <Card hoverable className="h-full">
      <div className="flex flex-col gap-3">
        {/* 标题和类型 */}
        <div className="flex items-start justify-between">
          <div>
            <Link to={typeInfo.route}>
              <h3 className="text-lg font-bold hover:text-primary-600 transition-colors">
                {item.title}
              </h3>
            </Link>
            <div className="flex items-center gap-2 mt-1">
              <Tag className={typeInfo.color}>
                <div className="flex items-center gap-1">
                  {typeInfo.icon}
                  <span>{typeInfo.label}</span>
                </div>
              </Tag>
              {item.gameTitle && (
                <Tag className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300">
                  游戏：{item.gameTitle}
                </Tag>
              )}
              {item.category && (
                <Tag>{item.category}</Tag>
              )}
            </div>
          </div>

          {formattedDate && (
            <span className="text-sm text-gray-500">{formattedDate}</span>
          )}
        </div>

        {/* 作者信息 */}
        {item.author && (
          <div className="flex items-center gap-2">
            <Avatar
              size="small"
              src={item.author.avatarUrl}
              className="bg-gradient-to-r from-primary-500 to-secondary-500"
            >
              {item.author.displayName?.charAt(0) || item.author.username?.charAt(0)}
            </Avatar>
            <div>
              <div className="text-sm font-medium">{item.author.displayName || item.author.username}</div>
              {item.author.username && item.author.username !== item.author.displayName && (
                <div className="text-xs text-gray-500">@{item.author.username}</div>
              )}
            </div>
          </div>
        )}

        {/* 内容摘要 */}
        {(item.content || item.excerpt) && (
          <p className="text-gray-600 dark:text-gray-400 line-clamp-2">
            <SearchHighlighter text={item.content || item.excerpt} keyword={query} />
          </p>
        )}

        {/* 元数据 */}
        <div className="flex flex-wrap gap-4 text-sm">
          {item.rating !== undefined && (
            <div className="flex items-center gap-1">
              <Rate disabled defaultValue={typeof item.rating === 'string' ? parseFloat(item.rating) : item.rating} allowHalf className="text-sm" />
              <span className="font-medium">{item.rating}</span>
            </div>
          )}
          {item.likes !== undefined && (
            <div className="flex items-center gap-1">
              <span className="font-medium">{item.likes}</span>
              <span className="text-gray-500">点赞</span>
            </div>
          )}
          {item.comments !== undefined && (
            <div className="flex items-center gap-1">
              <span className="font-medium">{item.comments}</span>
              <span className="text-gray-500">评论</span>
            </div>
          )}
          {item.views !== undefined && (
            <div className="flex items-center gap-1">
              <span className="font-medium">{item.views}</span>
              <span className="text-gray-500">浏览</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  /**
   * 渲染用户搜索结果的卡片布局
   *
   * 展示内容：
   * - 左侧：用户头像（64px）
   * - 右侧：用户名（可点击跳转）、用户简介描述（最多 1 行）
   * - 用户详情内容（最多 2 行），搜索关键词高亮
   * - 加入平台时间
   *
   * @returns 用户卡片 JSX 元素
   */
  const renderUserCard = () => (
    <Card hoverable className="h-full">
      <div className="flex items-center gap-4">
        {/* 头像 */}
        <Avatar
          size={64}
          src={item.avatarUrl}
          className="bg-gradient-to-r from-primary-500 to-secondary-500 flex-shrink-0"
        >
          {item.title?.charAt(0)}
        </Avatar>

        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <Link to={typeInfo.route}>
                <h3 className="text-lg font-bold hover:text-primary-600 transition-colors">
                  {item.title}
                </h3>
              </Link>
              {item.description && (
                <p className="text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
                  <SearchHighlighter text={item.description} keyword={query} />
                </p>
              )}
            </div>

            <Tag className={typeInfo.color}>
              <div className="flex items-center gap-1">
                {typeInfo.icon}
                <span>{typeInfo.label}</span>
              </div>
            </Tag>
          </div>

          {/* 用户简介 */}
          {item.content && (
            <p className="text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
              <SearchHighlighter text={item.content} keyword={query} />
            </p>
          )}

          {/* 加入时间 */}
          {formattedDate && (
            <div className="text-sm text-gray-500 mt-2">
              加入于 {formattedDate}
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  // 根据类型渲染不同的卡片
  switch (item.type) {
    case 'game':
      return renderGameCard();
    case 'user':
      return renderUserCard();
    case 'review':
    case 'news':
    case 'community_post':
      return renderContentCard();
    default:
      return (
        <Card hoverable>
          <div className="p-4">
            <h3 className="font-bold">{item.title}</h3>
            <p className="text-gray-600 dark:text-gray-400">未知类型: {item.type}</p>
          </div>
        </Card>
      );
  }
};

export default SearchResultItem;