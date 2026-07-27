/**
 * 发现页和搜索相关类型定义模块
 *
 * 定义搜索（v2）、推荐、排行榜、趋势、社区统计等发现页功能相关的
 * TypeScript 接口和类型。用于驱动游戏平台的智能推荐和内容发现功能。
 *
 * @module types/discovery-types
 */

/** 搜索参数 v2（扩展自基础搜索，支持更多筛选维度） */
export interface SearchParamsV2 {
  query?: string;
  page?: number;
  limit?: number;
  types?: string[];
  genres?: string[];
  platforms?: string[];
  dateFrom?: string;
  dateTo?: string;
  ratingMin?: number;
  ratingMax?: number;
  tags?: string[];
  sortBy?: 'relevance' | 'date' | 'rating' | 'popularity';
}

/** 搜索结果 v2（含高亮片段） */
export interface SearchResultV2 {
  id: string;
  type: 'game' | 'review' | 'news' | 'community_post' | 'user';
  title: string;
  description?: string;
  content?: string;
  excerpt?: string;
  coverImageUrl?: string;
  avatarUrl?: string;
  rating?: number | string;
  reviewCount?: number;
  author?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  gameTitle?: string;
  likes?: number;
  comments?: number;
  category?: string;
  views?: number;
  createdAt?: string;
  publishedAt?: string;
  // 高亮片段（匹配关键词在内容中的位置）
  highlight?: {
    title?: string;
    description?: string;
    content?: string;
  };
}

/** 推荐条目 */
export interface RecommendationItem {
  id: string;
  type: 'game' | 'review' | 'news' | 'community_post';
  title: string;
  coverImageUrl?: string;
  rating?: number;
  reason: string;  // 推荐理由，如 "同类型游戏"、"热门推荐"
  score: number;   // 推荐分数（排序用）
  likes?: number;
  comments?: number;
  publishedAt?: string;
}

/** 排行榜条目 */
export interface LeaderboardEntry {
  rank: number;
  id: string;
  title: string;
  coverImageUrl?: string;
  score: number;
  reviewCount?: number;
  rating?: number;
  likes?: number;
  comments?: number;
  views?: number;
  genre?: string;
  platform?: string;
  trend?: 'up' | 'down' | 'stable';  // 排名趋势
}

/** 趋势数据点 */
export interface TrendPoint {
  date: string;
  value: number;
  label?: string;
}

/** 搜索趋势 */
export interface SearchTrend {
  keyword: string;
  count: number;
  trend: TrendPoint[];
}

/** 分布统计条目 */
export interface DistributionItem {
  name: string;
  count: number;
  percentage: number;
}

/** 社区统计摘要 */
export interface CommunitySummary {
  totalUsers: number;
  totalGames: number;
  totalReviews: number;
  totalPosts: number;
  totalComments: number;
  newUsersToday: number;
  newReviewsToday: number;
  newPostsToday: number;
  activeUsers: number;
}

/** 发现页整体统计数据 */
export interface DiscoveryStats {
  distributions: {
    platforms: DistributionItem[];
    genres: DistributionItem[];
  };
  community: CommunitySummary;
}

/** 搜索日志 */
export interface SearchLog {
  id?: string;
  query: string;
  resultCount: number;
  userId?: string;
  ipAddress?: string;
  filters?: string;
  createdAt?: Date;
}
