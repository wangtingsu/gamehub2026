/**
 * SearchHighlighter.tsx - 搜索结果关键词高亮组件
 *
 * 在搜索结果文本中高亮匹配的关键词
 * 支持多个关键词同时高亮，自动转义正则特殊字符
 * 可限制显示文本的最大长度
 */
import React from 'react';

/** SearchHighlighter 组件的 props */
interface SearchHighlighterProps {
  /** 要显示的文本内容 */
  text?: string;
  /** 搜索关键词（支持多个词，以空格分隔） */
  keyword?: string;
  /** 最大显示长度，超出部分截断并显示"..." */
  maxLength?: number;
}

/**
 * SearchHighlighter - 搜索关键词高亮
 * - 将文本按关键词分割后使用 <mark> 标签包裹匹配部分
 * - 多个关键词使用正则 OR 匹配，不区分大小写
 * - 超长文本自动截断
 */
const SearchHighlighter: React.FC<SearchHighlighterProps> = ({ text, keyword, maxLength = 200 }) => {
  if (!text) return <>{text}</>;

  // 如果超过最大长度则截断文本
  const displayText = maxLength && text.length > maxLength
    ? text.substring(0, maxLength) + '...'
    : text;

  if (!keyword || !keyword.trim()) {
    return <>{displayText}</>;
  }

  // 分割关键词为多个独立词
  const keywords = keyword.trim().split(/\s+/).filter(Boolean);
  if (keywords.length === 0) return <>{displayText}</>;

  // 合并所有关键词为正则表达式，转义特殊字符防止正则注入
  const escapedKeywords = keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`(${escapedKeywords.join('|')})`, 'gi');

  // 按匹配到的关键词分割文本
  const parts = displayText.split(pattern);

  return (
    <>
      {parts.map((part, index) =>
        keywords.some(k => part.toLowerCase() === k.toLowerCase()) ? (
          // 匹配到的关键词用黄色高亮标记包裹
          <mark key={index} className="bg-yellow-200 dark:bg-yellow-700 px-0.5 rounded">
            {part}
          </mark>
        ) : (
          // 未匹配部分正常渲染
          <React.Fragment key={index}>{part}</React.Fragment>
        )
      )}
    </>
  );
};

export default SearchHighlighter;
