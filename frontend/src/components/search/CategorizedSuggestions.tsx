/**
 * CategorizedSuggestions.tsx - 分类建议列表组件
 *
 * 用于搜索下拉框中按分类展示搜索建议（如游戏、用户、评测、新闻等）
 * 每个分类分组显示对应的图标、标题和最多 3 条建议项
 */
import React from 'react';
import { List, Typography, Empty } from 'antd';
import { VideoCameraOutlined, UserOutlined, FileTextOutlined, ReadOutlined } from '@ant-design/icons';

const { Text } = Typography;

/** 单个建议分组的数据结构 */
interface SuggestionGroup {
  /** 分组类型标识（如 game、user、review、news） */
  type: string;
  /** 分组显示名称 */
  label: string;
  /** 分组图标 */
  icon: React.ReactNode;
  /** 该分组下的建议项列表 */
  items: Array<{
    id: string;
    title: string;
    subtitle?: string;
    image?: string;
  }>;
}

/** CategorizedSuggestions 组件的 props */
interface CategorizedSuggestionsProps {
  /** 分组建议数据 */
  groups: SuggestionGroup[];
  /** 是否正在加载 */
  loading?: boolean;
  /** 选中某条建议时的回调 */
  onSelect: (item: { type: string; id: string; title: string }) => void;
  /** 点击"查看更多"时的回调 */
  onViewAll: (type: string) => void;
}

/** 各类型的默认图标映射（当分组未提供自定义图标时使用） */
const TYPE_ICONS: Record<string, React.ReactNode> = {
  game: <VideoCameraOutlined className="text-blue-500" />,
  user: <UserOutlined className="text-pink-500" />,
  review: <FileTextOutlined className="text-green-500" />,
  news: <ReadOutlined className="text-purple-500" />,
};

/**
 * CategorizedSuggestions - 分类建议列表
 * - 按分类分组展示搜索建议，每个分组最多展示 3 条
 * - 每个分组尾部有"查看更多"按钮
 * - 支持加载态和空数据态展示
 * - 建议项可点击，触发 onSelect 回调
 */
const CategorizedSuggestions: React.FC<CategorizedSuggestionsProps> = ({
  groups,
  loading,
  onSelect,
  onViewAll,
}) => {
  // 加载中状态
  if (loading) {
    return (
      <div className="p-4 text-center text-gray-400">
        加载中...
      </div>
    );
  }

  // 过滤出有数据的有效分组
  const validGroups = groups.filter(g => g.items.length > 0);
  if (validGroups.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="无相关建议"
        className="py-4"
      />
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto">
      {validGroups.map((group) => (
        <div key={group.type} className="p-2">
          {/* 分组头部：图标 + 标签 + "查看更多"按钮 */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center text-sm font-medium text-gray-500">
              {group.icon || TYPE_ICONS[group.type]}
              <span className="ml-1.5">{group.label}</span>
            </div>
            <button
              className="text-xs text-primary-500 hover:text-primary-600"
              onClick={() => onViewAll(group.type)}
            >
              查看更多
            </button>
          </div>
          {/* 建议项列表：最多展示 3 条 */}
          <List
            size="small"
            dataSource={group.items.slice(0, 3)}
            renderItem={(item) => (
              <List.Item
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-2"
                onClick={() => onSelect({ type: group.type, id: item.id, title: item.title })}
              >
                <div className="flex items-center space-x-3 w-full">
                  {/* 建议项缩略图 */}
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-8 h-8 rounded object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <Text className="block truncate">{item.title}</Text>
                    {item.subtitle && (
                      <Text type="secondary" className="text-xs block truncate">
                        {item.subtitle}
                      </Text>
                    )}
                  </div>
                </div>
              </List.Item>
            )}
          />
        </div>
      ))}
    </div>
  );
};

export default CategorizedSuggestions;
