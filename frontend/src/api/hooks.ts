/**
 * React Query Hooks 模块
 *
 * 提供基于 @tanstack/react-query 的声明式数据获取和管理 Hooks。
 * 统一封装了所有 API 调用的查询（useQuery）和变更（useMutation）逻辑，
 * 包含缓存管理、自动刷新、乐观更新等特性。
 *
 * 使用 queryKeys 工厂函数确保查询键的一致性和层级管理，
 * 每个数据域（games、news、reviews 等）都有独立的键空间。
 *
 * @module api/hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from './index';
import i18n from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import type { PaginationParams, ReviewCreateRequest, ReviewUpdateRequest, SearchFilters, NotificationQueryParams, Review, LibraryStatus, PlatformOwnership, PlatformType, AboutAllData, AdvancedSearchFilters, GamificationStats, XpTransaction, PointTransaction, PlatformAchievement, UserPlatformAchievement, Conversation, Message, UserLeaderboardEntry, Guide, GuideCreateInput, GuideUpdateInput, BlogCreateInput, BlogUpdateInput } from './types';

/**
 * React Query 查询键工厂函数
 *
 * 按数据域（games、news、reviews 等）组织查询键，
 * 确保每个查询有唯一且结构化的键值，
 * 便于缓存管理、失效和乐观更新。
 */
export const queryKeys = {
  games: {
    all: ['games'] as const,
    lists: () => [...queryKeys.games.all, 'list'] as const,
    list: (params?: PaginationParams) => [...queryKeys.games.lists(), params] as const,
    details: () => [...queryKeys.games.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.games.details(), id] as const,
  },
  news: {
    all: ['news'] as const,
    lists: () => [...queryKeys.news.all, 'list'] as const,
    list: (params?: PaginationParams) => [...queryKeys.news.lists(), params] as const,
    details: () => [...queryKeys.news.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.news.details(), id] as const,
  },
  blog: {
    all: ['blog'] as const,
    lists: () => [...queryKeys.blog.all, 'list'] as const,
    list: (params?: PaginationParams) => [...queryKeys.blog.lists(), params] as const,
    details: () => [...queryKeys.blog.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.blog.details(), id] as const,
  },
  reviews: {
    all: ['reviews'] as const,
    lists: () => [...queryKeys.reviews.all, 'list'] as const,
    list: (params?: PaginationParams) => [...queryKeys.reviews.lists(), params] as const,
    details: () => [...queryKeys.reviews.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.reviews.details(), id] as const,
  },
  guides: {
    all: ['guides'] as const,
    lists: () => [...queryKeys.guides.all, 'list'] as const,
    list: (params?: PaginationParams) => [...queryKeys.guides.lists(), params] as const,
    details: () => [...queryKeys.guides.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.guides.details(), id] as const,
  },
  community: {
    all: ['community'] as const,
    lists: () => [...queryKeys.community.all, 'list'] as const,
    list: (params?: PaginationParams) => [...queryKeys.community.lists(), params] as const,
    gamePosts: (gameId: string, params?: PaginationParams) =>
      [...queryKeys.community.all, 'gamePosts', gameId, params] as const,
  },
  comments: {
    all: ['comments'] as const,
    lists: () => [...queryKeys.comments.all, 'list'] as const,
    list: (parentType: string, parentId: string, params?: PaginationParams) =>
      [...queryKeys.comments.lists(), parentType, parentId, params] as const,
    details: () => [...queryKeys.comments.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.comments.details(), id] as const,
  },
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (params?: PaginationParams) => [...queryKeys.users.lists(), params] as const,
  },
  search: {
    all: ['search'] as const,
    results: (query: string, filters?: any, params?: PaginationParams) =>
      [...queryKeys.search.all, 'results', query, filters, params] as const,
    suggestions: (query: string) => [...queryKeys.search.all, 'suggestions', query] as const,
    popular: () => [...queryKeys.search.all, 'popular'] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    lists: (params?: any) => [...queryKeys.notifications.all, 'list', params] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unreadCount'] as const,
  },
  about: {
    all: ['about'] as const,
    data: () => [...queryKeys.about.all, 'data'] as const,
  },
  auth: {
    all: ['auth'] as const,
    currentUser: () => [...queryKeys.auth.all, 'currentUser'] as const,
  },
  library: {
    all: ['library'] as const,
    lists: () => [...queryKeys.library.all, 'list'] as const,
    list: (params?: any) => [...queryKeys.library.lists(), params] as const,
    stats: () => [...queryKeys.library.all, 'stats'] as const,
    details: () => [...queryKeys.library.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.library.details(), id] as const,
    batchStatus: (gameIds: string[]) => [...queryKeys.library.all, 'batchStatus', ...gameIds] as const,
  },
  gamification: {
    all: ['gamification'] as const,
    stats: () => [...queryKeys.gamification.all, 'stats'] as const,
    xpHistory: (params?: PaginationParams) => [...queryKeys.gamification.all, 'xpHistory', params] as const,
    pointHistory: (params?: PaginationParams) => [...queryKeys.gamification.all, 'pointHistory', params] as const,
  },
  achievements: {
    all: ['achievements'] as const,
    list: () => [...queryKeys.achievements.all, 'list'] as const,
    userList: (userId?: string) => [...queryKeys.achievements.all, 'userList', userId] as const,
    stats: () => [...queryKeys.achievements.all, 'stats'] as const,
  },
  messages: {
    all: ['messages'] as const,
    conversations: (params?: PaginationParams) => [...queryKeys.messages.all, 'conversations', params] as const,
    conversation: (id: string) => [...queryKeys.messages.all, 'conversation', id] as const,
    unreadCount: () => [...queryKeys.messages.all, 'unreadCount'] as const,
  },
  follow: {
    all: ['follow'] as const,
    followers: (userId: string, params?: PaginationParams) => [...queryKeys.follow.all, 'followers', userId, params] as const,
    following: (userId: string, params?: PaginationParams) => [...queryKeys.follow.all, 'following', userId, params] as const,
    status: (userId: string) => [...queryKeys.follow.all, 'status', userId] as const,
    stats: (userId?: string) => [...queryKeys.follow.all, 'stats', userId] as const,
    mutual: (userId: string) => [...queryKeys.follow.all, 'mutual', userId] as const,
  },
  userLeaderboard: {
    all: ['userLeaderboard'] as const,
    list: (type: string, limit?: number, page?: number) => [...queryKeys.userLeaderboard.all, type, limit, page] as const,
  },
} as const;

// ==================== 游戏相关 Hooks ====================

/**
 * 获取游戏列表
 *
 * @param params - 分页参数
 * @returns 游戏列表数据
 */
export const useGames = (params?: PaginationParams) => {
  return useQuery({
    queryKey: queryKeys.games.list(params),
    queryFn: () => apiService.getGames(params),
    // 选择器：提取游戏列表数据
    select: (response) => {
      // API返回格式可能是 { data: { games: [], pagination: {...} } } 或 { games: [], pagination: {...} }
      return response || [];
    },
  });
};

/**
 * 获取单个游戏详情
 *
 * @param id - 游戏 ID
 * @returns 游戏详情数据
 */
export const useGame = (id: string) => {
  return useQuery({
    queryKey: queryKeys.games.detail(id),
    queryFn: () => apiService.getGame(id),
    select: (response) => response,
    enabled: !!id, // 只有当id存在时才执行查询
  });
};

// ==================== 新闻相关 Hooks ====================

/**
 * 获取新闻列表
 *
 * @param params - 分页参数
 * @returns 新闻文章列表，retry=1, staleTime=30s
 */
export const useNews = (params?: PaginationParams) => {
  const lang = i18n.language;
  return useQuery({
    queryKey: queryKeys.news.list({ ...params, lang }),
    queryFn: () => apiService.getNews({ ...params, lang }),
    select: (response) => response || [],
    retry: 1,
    staleTime: 30000,
  });
};

/**
 * 获取单篇新闻文章
 *
 * @param id - 新闻 ID
 * @returns 新闻文章详情
 */
export const useNewsArticle = (id: string) => {
  const lang = i18n.language;
  return useQuery({
    queryKey: [...queryKeys.news.details(), id, lang],
    queryFn: () => apiService.getNewsArticle(id, lang),
    select: (response) => response,
    enabled: !!id,
  });
};

export const usePinNews = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiService.pinNewsArticle(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.news.lists() }); qc.invalidateQueries({ queryKey: queryKeys.news.details() }); },
  });
};

export const useUnpinNews = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiService.unpinNewsArticle(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.news.lists() }); qc.invalidateQueries({ queryKey: queryKeys.news.details() }); },
  });
};

// ==================== 博客相关 Hooks ====================

/**
 * 获取博客文章列表
 *
 * @param params - 分页参数
 * @returns 博客文章列表
 */
export const useBlogPosts = (params?: PaginationParams) => {
  return useQuery({
    queryKey: queryKeys.blog.list(params),
    queryFn: () => apiService.getBlogPosts(params),
    select: (response) => response || [],
  });
};

/**
 * 获取单篇博客文章
 *
 * @param id - 博客文章 ID
 * @returns 博客文章详情
 */
export const useBlogPost = (id: string) => {
  return useQuery({
    queryKey: queryKeys.blog.detail(id),
    queryFn: () => apiService.getBlogPost(id),
    select: (response) => response,
    enabled: !!id,
  });
};

// ==================== 博客 CRUD Hooks ====================

/**
 * 创建博客文章的 Mutation Hook
 * 成功后自动使博客列表缓存失效
 */
export const useCreateBlogPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BlogCreateInput) => apiService.createBlogPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blog.lists() });
    },
  });
};

/**
 * 更新博客文章的 Mutation Hook
 * 成功后使该文章详情和列表缓存失效
 */
export const useUpdateBlogPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: BlogUpdateInput }) =>
      apiService.updateBlogPost(id, data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blog.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.blog.lists() });
    },
  });
};

/**
 * 删除博客文章的 Mutation Hook
 * 成功后使博客列表缓存失效
 */
export const useDeleteBlogPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiService.deleteBlogPost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blog.lists() });
    },
  });
};

/**
 * 获取当前用户的博客文章列表
 *
 * @param params - 分页参数
 * @returns 当前用户的博客文章列表
 */
export const useMyBlogPosts = (params?: PaginationParams) => {
  return useQuery({
    queryKey: [...queryKeys.blog.lists(), 'my', params],
    queryFn: () => apiService.getMyBlogPosts(params),
    select: (response) => response || [],
  });
};

// ==================== 评测相关 Hooks ====================

/**
 * 获取评测列表
 *
 * @param params - 分页参数
 * @returns 评测列表
 */
export const useReviews = (params?: PaginationParams) => {
  return useQuery({
    queryKey: queryKeys.reviews.list(params),
    queryFn: () => apiService.getReviews(params),
    select: (response) => response || [],
  });
};

/**
 * 获取单个评测详情
 *
 * @param id - 评测 ID
 * @returns 评测详情
 */
export const useReview = (id: string) => {
  return useQuery({
    queryKey: queryKeys.reviews.detail(id),
    queryFn: () => apiService.getReview(id),
    select: (response) => response,
    enabled: !!id,
  });
};

/**
 * 获取指定游戏的评测列表
 *
 * @param gameId - 游戏 ID
 * @param params - 分页参数
 * @returns 该游戏的评测列表
 */
export const useGameReviews = (gameId: string, params?: PaginationParams) => {
  return useQuery({
    queryKey: [...queryKeys.reviews.lists(), { gameId, ...params }],
    queryFn: () => apiService.getGameReviews(gameId, params),
    select: (response) => response || [],
    enabled: !!gameId,
  });
};

// ==================== 社区相关 Hooks ====================

/**
 * 获取社区帖子列表
 *
 * @param params - 分页参数
 * @returns 社区帖子列表
 */
export const useCommunityPosts = (params?: PaginationParams) => {
  return useQuery({
    queryKey: queryKeys.community.list(params),
    queryFn: () => apiService.getCommunityPosts(params),
    select: (response) => response || [],
  });
};

/**
 * 获取单个社区帖子详情
 *
 * @param id - 帖子 ID
 * @returns 帖子详情
 */
export const useCommunityPost = (id: string) => {
  return useQuery({
    queryKey: ['community', 'detail', id],
    queryFn: () => apiService.getCommunityPost(id),
    enabled: !!id,
  });
};

/**
 * 获取指定游戏的论坛帖子列表
 *
 * @param gameId - 游戏 ID
 * @param params - 分页参数
 * @returns 该游戏的论坛帖子列表
 */
export const useGamePosts = (gameId: string, params?: PaginationParams) => {
  return useQuery({
    queryKey: queryKeys.community.gamePosts(gameId, params),
    queryFn: () => apiService.getGamePosts(gameId, params),
    select: (response) => response || [],
    enabled: !!gameId,
  });
};

/**
 * 获取游戏论坛统计数据
 *
 * @param params - 查询参数（分页、搜索）
 * @returns 论坛统计信息及各游戏发帖数据
 */
export const useGameForumStats = (params?: { page?: number; limit?: number; search?: string }) => {
  return useQuery({
    queryKey: ['community', 'gameForumStats', params],
    queryFn: () => apiService.getGameForumStats(params),
    select: (response) => response || { games: [], total: 0, page: 1, limit: 20 },
  });
};

// ==================== 用户相关 Hooks ====================

/**
 * 获取用户列表
 *
 * @param params - 分页参数
 * @returns 用户列表
 */
export const useUsers = (params?: PaginationParams) => {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => apiService.getUsers(params),
    select: (response) => response || [],
  });
};

// ==================== 评测 Mutation Hooks ====================

/**
 * 创建评测的 Mutation Hook
 * 成功后使评测列表和对应游戏评测列表缓存失效
 */
export const useCreateReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ReviewCreateRequest) => apiService.createReview(data),
    onSuccess: (_response, variables) => {
      // Invalidate reviews list and game-specific reviews
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.lists() });
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.reviews.lists(), { gameId: variables.gameId }]
      });
    },
  });
};

/**
 * 更新评测的 Mutation Hook
 * 成功后使该评测详情和列表缓存失效
 */
export const useUpdateReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReviewUpdateRequest }) =>
      apiService.updateReview(id, data),
    onSuccess: (_response, variables) => {
      // Invalidate specific review and lists
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.lists() });
    },
  });
};

/**
 * 删除评测的 Mutation Hook
 * 成功后移除该评测缓存并使列表失效
 */
export const useDeleteReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiService.deleteReview(id),
    onSuccess: (_response, id) => {
      // Remove specific review from cache
      queryClient.removeQueries({ queryKey: queryKeys.reviews.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.lists() });
    },
  });
};

/**
 * 点赞/取消点赞评测的 Mutation Hook
 * 成功后乐观更新该评测的点赞数缓存，并刷新列表
 */
export const useLikeReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiService.likeReview(id),
    onSuccess: (response, id) => {
      // Update specific review cache optimistically
      queryClient.setQueryData(queryKeys.reviews.detail(id), (old: Review | undefined) =>
        old ? { ...old, likes: response.likes } : undefined
      );
      // Invalidate lists to reflect like count changes
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.lists() });
    },
  });
};

// ==================== 攻略指南 Hooks ====================
/**
 * 获取攻略指南列表
 *
 * @param params - 分页参数
 * @returns 攻略指南列表
 */
export const useGuides = (params?: PaginationParams) => {
  return useQuery({
    queryKey: queryKeys.guides.list(params),
    queryFn: () => apiService.getGuides(params),
    select: (response) => response || [],
  });
};

/**
 * 获取单个攻略指南详情
 *
 * @param id - 指南 ID
 * @returns 攻略指南详情
 */
export const useGuide = (id: string) => {
  return useQuery({
    queryKey: queryKeys.guides.detail(id),
    queryFn: () => apiService.getGuide(id),
    select: (response) => response,
    enabled: !!id,
  });
};

/**
 * 获取指定游戏的攻略指南列表
 *
 * @param gameId - 游戏 ID
 * @param params - 分页参数
 * @returns 该游戏的攻略指南列表
 */
export const useGameGuides = (gameId: string, params?: PaginationParams) => {
  return useQuery({
    queryKey: [...queryKeys.guides.lists(), { gameId, ...params }],
    queryFn: () => apiService.getGameGuides(gameId, params),
    select: (response) => response || [],
    enabled: !!gameId,
  });
};

/**
 * 创建攻略指南的 Mutation Hook
 * 成功后使指南列表和对应游戏指南列表缓存失效
 */
export const useCreateGuide = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GuideCreateInput) => apiService.createGuide(data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guides.lists() });
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.guides.lists(), { gameId: variables.gameId }]
      });
    },
  });
};

/**
 * 更新攻略指南的 Mutation Hook
 * 成功后使该指南详情和列表缓存失效
 */
export const useUpdateGuide = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: GuideUpdateInput }) =>
      apiService.updateGuide(id, data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guides.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.guides.lists() });
    },
  });
};

/**
 * 删除攻略指南的 Mutation Hook
 * 成功后使指南列表缓存失效
 */
export const useDeleteGuide = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiService.deleteGuide(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guides.lists() });
    },
  });
};

/**
 * 点赞/取消点赞攻略指南的 Mutation Hook
 * 成功后乐观更新指南详情缓存，刷新列表
 */
export const useLikeGuide = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiService.likeGuide(id),
    onSuccess: (response, id) => {
      queryClient.setQueryData(queryKeys.guides.detail(id), (old: Guide | undefined) =>
        old ? { ...old, likes: response.likes } : undefined
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.guides.lists() });
    },
  });
};

// ==================== 管理后台 Hooks ====================

/**
 * 获取管理后台总览统计数据
 *
 * @returns 后台统计信息（用户数、游戏数等）
 */
export const useAdminStats = () => {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => apiService.getAdminStats(),
    select: (response) => response,
  });
};

// ==================== 健康检查 Hook ====================

/**
 * 健康检查 Hook
 * 每次调用都获取最新状态（无缓存）
 *
 * @returns 服务器健康状态
 */
export const useHealthCheck = () => {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => apiService.healthCheck(),
    // 健康检查不需要缓存，每次都要获取最新状态
    staleTime: 0,
    gcTime: 0,
  });
};

// ==================== 搜索相关 Hooks ====================

/**
 * 通用搜索 Hook
 * 至少输入 2 个字符才发起搜索，搜索结果缓存 1 分钟
 *
 * @param query - 搜索关键词
 * @param filters - 搜索筛选条件
 * @param params - 分页参数
 * @returns 搜索结果
 */
export const useSearch = (query: string, filters?: SearchFilters, params?: PaginationParams) => {
  return useQuery({
    queryKey: queryKeys.search.results(query, filters, params),
    queryFn: () => apiService.search(query, filters, params),
    enabled: !!query && query.length >= 2, // 至少2个字符才搜索
    staleTime: 1000 * 60, // 1分钟缓存
  });
};

/**
 * 搜索建议 Hook
 * 至少输入 2 个字符才获取建议，结果缓存 5 分钟
 *
 * @param query - 搜索关键词
 * @returns 搜索建议列表
 */
export const useSearchSuggestions = (query: string) => {
  return useQuery({
    queryKey: queryKeys.search.suggestions(query),
    queryFn: () => apiService.getSearchSuggestions(query),
    select: (response) => response || [],
    enabled: !!query && query.length >= 2, // 至少2个字符才获取建议
    staleTime: 1000 * 60 * 5, // 5分钟缓存
  });
};

/**
 * 热门搜索 Hook
 * 获取全局热门搜索词，结果缓存 30 分钟
 *
 * @returns 热门搜索词列表
 */
export const usePopularSearches = () => {
  return useQuery({
    queryKey: queryKeys.search.popular(),
    queryFn: () => apiService.getPopularSearches(),
    select: (response) => response || [],
    staleTime: 1000 * 60 * 30, // 30分钟缓存
  });
};

// ==================== 通知相关 Hooks ====================

/**
 * 获取通知列表
 *
 * @param params - 通知查询参数（可筛选类型、未读等）
 * @returns 通知列表
 */
export const useNotifications = (params?: NotificationQueryParams) => {
  return useQuery({
    queryKey: queryKeys.notifications.lists(params),
    queryFn: () => apiService.getNotifications(params),
    select: (response) => response || [],
  });
};

/**
 * 获取未读通知数量 Hook
 * 每 30 秒轮询检查新通知，缓存 15 秒
 *
 * @returns 未读通知数
 */
export const useUnreadCount = () => {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => apiService.getUnreadCount(),
    select: (response) => response || 0,
    refetchInterval: 1000 * 30, // 30秒轮询检查新通知
    staleTime: 1000 * 15, // 15秒缓存
  });
};

/**
 * 标记单条通知为已读的 Mutation Hook
 * 成功后乐观减少未读计数
 */
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => apiService.markAsRead(notificationId),
    onSuccess: (_, _notificationId) => {
      // 乐观更新：减少未读计数
      queryClient.setQueryData(queryKeys.notifications.unreadCount(), (old: number) => Math.max(0, (old || 0) - 1));
      // 使通知列表失效
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.lists() });
    },
  });
};

/**
 * 标记所有通知为已读的 Mutation Hook
 * 成功后乐观将未读计数设为 0，刷新通知列表
 */
export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiService.markAllAsRead(),
    onSuccess: () => {
      // 乐观更新：将未读计数设为0
      queryClient.setQueryData(queryKeys.notifications.unreadCount(), 0);
      // 使通知列表失效
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.lists() });
    },
  });
};

// ==================== 游戏库相关 Hooks ====================

/**
 * 获取用户游戏库列表
 *
 * @param params - 查询参数（状态、平台、分页、排序、搜索）
 * @returns 游戏库条目列表
 */
export const useUserGameLibrary = (params?: {
  status?: LibraryStatus;
  platform?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
  search?: string;
}) => {
  return useQuery({
    queryKey: queryKeys.library.list(params),
    queryFn: () => apiService.getUserGameLibrary(params),
    select: (response) => response,
  });
};

/**
 * 获取游戏库统计信息
 *
 * @returns 各状态/平台的游戏数量和总游戏时间
 */
export const useLibraryStats = () => {
  return useQuery({
    queryKey: queryKeys.library.stats(),
    queryFn: () => apiService.getLibraryStats(),
    select: (response) => response,
  });
};

/**
 * 添加游戏到游戏库的 Mutation Hook
 * 成功后使游戏库列表和统计缓存失效
 */
export const useAddGameToLibrary = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      gameId: string;
      status: LibraryStatus;
      platforms: PlatformOwnership[];
      personalRating?: number;
      personalNotes?: string;
      tags?: string[];
      primaryPlatform?: PlatformType;
    }) => apiService.addGameToLibrary(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.library.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.library.stats() });
    },
  });
};

export const useUpdateGameLibraryEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ libraryId, data }: {
      libraryId: string;
      data: {
        status?: LibraryStatus;
        platforms?: PlatformOwnership[];
        personalRating?: number;
        personalNotes?: string;
        tags?: string[];
        primaryPlatform?: PlatformType;
      };
    }) => apiService.updateGameLibraryEntry(libraryId, data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.library.detail(variables.libraryId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.library.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.library.stats() });
    },
  });
};

export const useRemoveGameFromLibrary = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (libraryId: string) => apiService.removeGameFromLibrary(libraryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.library.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.library.stats() });
    },
  });
};

export const useLibraryEntryDetails = (libraryId: string) => {
  return useQuery({
    queryKey: queryKeys.library.detail(libraryId),
    queryFn: () => apiService.getLibraryEntryDetails(libraryId),
    select: (response) => response,
    enabled: !!libraryId,
  });
};

export const useUpdateLastPlayed = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (gameId: string) => apiService.updateLastPlayed(gameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.library.lists() });
    },
  });
};

export const useBatchLibraryStatus = (gameIds: string[]) => {
  return useQuery({
    queryKey: queryKeys.library.batchStatus(gameIds),
    queryFn: () => apiService.getBatchLibraryStatus(gameIds),
    enabled: gameIds.length > 0,
  });
};

// ==================== 关于页面相关 Hooks ====================

/**
 * 获取关于页面数据
 *
 * @returns 关于页面所有模块数据（团队、历程、联系等），缓存 5 分钟
 */
export const useAboutData = () => {
  return useQuery({
    queryKey: queryKeys.about.data(),
    queryFn: () => apiService.getAboutData(),
    staleTime: 5 * 60 * 1000, // 5分钟内认为数据新鲜
  });
};

export const useUpdateAboutSection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, data }: { key: string; data: { title?: string; description?: string | null; imageUrl?: string | null } }) =>
      apiService.updateAboutSection(key, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.about.data() });
    },
  });
};

export const useUpdateAboutValue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { icon?: string; title?: string; description?: string | null } }) =>
      apiService.updateAboutValue(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.about.data() });
    },
  });
};

export const useUpdateAboutTeamMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; role?: string; avatarUrl?: string | null; description?: string | null } }) =>
      apiService.updateAboutTeamMember(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.about.data() });
    },
  });
};

export const useUpdateAboutTimeline = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { year?: string; title?: string | null; description?: string | null } }) =>
      apiService.updateAboutTimeline(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.about.data() });
    },
  });
};

export const useUpdateAboutContact = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { label?: string; value?: string } }) =>
      apiService.updateAboutContact(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.about.data() });
    },
  });
};

// ==================== 数据分析 Hooks ====================

/**
 * 获取用户增长趋势数据
 *
 * @param period - 统计周期（daily/weekly/monthly，默认 daily）
 * @param days - 统计天数（默认 30）
 * @returns 用户增长趋势点列表
 */
export const useUserGrowth = (period: string = 'daily', days: number = 30) => {
  return useQuery({
    queryKey: ['admin', 'analytics', 'userGrowth', period, days],
    queryFn: () => apiService.getUserGrowthTrend(period, days),
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * 获取游戏热度排名
 *
 * @param sortBy - 排序依据（rating/popularity，默认 rating）
 * @param limit - 返回数量（默认 10）
 * @returns 游戏热度排行列表
 */
export const useGamePopularity = (sortBy: string = 'rating', limit: number = 10) => {
  return useQuery({
    queryKey: ['admin', 'analytics', 'gamePopularity', sortBy, limit],
    queryFn: () => apiService.getGamePopularity(sortBy, limit),
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * 获取内容参与度分析
 *
 * @param days - 统计天数（默认 30）
 * @returns 内容参与度数据（浏览量、评论量等）
 */
export const useContentEngagement = (days: number = 30) => {
  return useQuery({
    queryKey: ['admin', 'analytics', 'contentEngagement', days],
    queryFn: () => apiService.getContentEngagement(days),
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * 获取平台和类型的分布数据
 *
 * @returns 平台分布和类型分布统计
 */
export const useDistributions = () => {
  return useQuery({
    queryKey: ['admin', 'analytics', 'distributions'],
    queryFn: () => apiService.getDistributions(),
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * 获取活跃用户数据
 *
 * @param days - 统计天数（默认 30）
 * @returns 活跃用户趋势数据
 */
export const useActiveUsers = (days: number = 30) => {
  return useQuery({
    queryKey: ['admin', 'analytics', 'activeUsers', days],
    queryFn: () => apiService.getActiveUsers(days),
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * 获取管理后台仪表盘统计数据
 *
 * @returns 仪表盘总览数据
 */
export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['admin', 'analytics', 'dashboard'],
    queryFn: () => apiService.getDashboardStats(),
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * 获取审计日志统计
 *
 * @param days - 统计天数（默认 30）
 * @returns 各操作类型的审计日志统计
 */
export const useAuditLogStats = (days: number = 30) => {
  return useQuery({
    queryKey: ['admin', 'analytics', 'auditLogStats', days],
    queryFn: () => apiService.getAuditLogStats(days),
    staleTime: 5 * 60 * 1000,
  });
};

// ==================== 用户画像 Hooks ====================

export const useProfilingTags = () => {
  return useQuery({
    queryKey: ['admin', 'profiling', 'tags'],
    queryFn: () => apiService.getProfilingTags(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateProfilingTag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, color, description }: { name: string; color?: string; description?: string }) =>
      apiService.createProfilingTag(name, color, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'profiling', 'tags'] });
    },
  });
};

export const useDeleteProfilingTag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiService.deleteProfilingTag(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'profiling', 'tags'] });
    },
  });
};

export const useAssignTagToUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, tagId }: { userId: string; tagId: number }) =>
      apiService.assignTagToUser(userId, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'profiling', 'userTags'] });
    },
  });
};

export const useRemoveTagFromUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, tagId }: { userId: string; tagId: number }) =>
      apiService.removeTagFromUser(userId, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'profiling', 'userTags'] });
    },
  });
};

export const useUserTags = (userId: string) => {
  return useQuery({
    queryKey: ['admin', 'profiling', 'userTags', userId],
    queryFn: () => apiService.getUserTags(userId),
    enabled: !!userId,
  });
};

export const useSegments = () => {
  return useQuery({
    queryKey: ['admin', 'profiling', 'segments'],
    queryFn: () => apiService.getSegments(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateSegment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; criteria?: any; isDynamic?: boolean }) =>
      apiService.createSegment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'profiling', 'segments'] });
    },
  });
};

export const useUpdateSegment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; description?: string; criteria?: any; isDynamic?: boolean } }) =>
      apiService.updateSegment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'profiling', 'segments'] });
    },
  });
};

export const useDeleteSegment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiService.deleteSegment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'profiling', 'segments'] });
    },
  });
};

export const useSegmentMembers = (segmentId: number, page?: number, limit?: number) => {
  return useQuery({
    queryKey: ['admin', 'profiling', 'segmentMembers', segmentId, page, limit],
    queryFn: () => apiService.getSegmentMembers(segmentId, page, limit),
    enabled: !!segmentId,
  });
};

export const useAddMemberToSegment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ segmentId, userId }: { segmentId: number; userId: string }) =>
      apiService.addMemberToSegment(segmentId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'profiling', 'segmentMembers', variables.segmentId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'profiling', 'segments'] });
    },
  });
};

export const useRemoveMemberFromSegment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ segmentId, userId }: { segmentId: number; userId: string }) =>
      apiService.removeMemberFromSegment(segmentId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'profiling', 'segmentMembers', variables.segmentId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'profiling', 'segments'] });
    },
  });
};

export const useEvaluateDynamicSegment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (segmentId: number) => apiService.evaluateDynamicSegment(segmentId),
    onSuccess: (_, segmentId) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'profiling', 'segmentMembers', segmentId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'profiling', 'segments'] });
    },
  });
};

export const useBehaviorProfile = (userId: string) => {
  return useQuery({
    queryKey: ['admin', 'profiling', 'behavior', userId],
    queryFn: () => apiService.getBehaviorProfile(userId),
    enabled: !!userId,
  });
};

export const useBehaviorDistributions = () => {
  return useQuery({
    queryKey: ['admin', 'profiling', 'behaviorDistributions'],
    queryFn: () => apiService.getBehaviorDistributions(),
    staleTime: 10 * 60 * 1000,
  });
};

export const usePeakLoginHours = (days: number = 30) => {
  return useQuery({
    queryKey: ['admin', 'profiling', 'peakHours', days],
    queryFn: () => apiService.getPeakLoginHours(days),
    staleTime: 10 * 60 * 1000,
  });
};

// ==================== 发现/推荐系统 Hooks ====================

export const useAdvancedSearch = (query: string, filters?: AdvancedSearchFilters, params?: PaginationParams) => {
  return useQuery({
    queryKey: ['search', 'advanced', query, filters, params],
    queryFn: () => apiService.advancedSearch(query, filters, params),
    enabled: !!query && query.length >= 2,
    staleTime: 1000 * 60,
  });
};

export const usePersonalizedRecommendations = (limit?: number) => {
  return useQuery({
    queryKey: ['discovery', 'recommendations', 'personalized', limit],
    queryFn: () => apiService.getPersonalizedRecommendations(limit),
    staleTime: 1000 * 60 * 5,
  });
};

export const useRelatedContent = (contentType: string, id: string, limit?: number) => {
  return useQuery({
    queryKey: ['discovery', 'related', contentType, id, limit],
    queryFn: () => apiService.getRelatedContent(contentType, id, limit),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
};

export const useTrendingContent = (limit?: number) => {
  return useQuery({
    queryKey: ['discovery', 'trending', limit],
    queryFn: () => apiService.getTrendingContent(limit),
    staleTime: 1000 * 60 * 2,
  });
};

export const useUsersAlsoLiked = (gameId: string, limit?: number) => {
  return useQuery({
    queryKey: ['discovery', 'alsoLiked', gameId, limit],
    queryFn: () => apiService.getUsersAlsoLiked(gameId, limit),
    enabled: !!gameId,
    staleTime: 1000 * 60 * 5,
  });
};

export const useLeaderboard = (type: string, limit?: number) => {
  return useQuery({
    queryKey: ['discovery', 'leaderboard', type, limit],
    queryFn: () => apiService.getLeaderboard(type, limit),
    staleTime: 1000 * 60 * 2,
  });
};

export const useSearchTrendData = (days?: number) => {
  return useQuery({
    queryKey: ['discovery', 'searchTrends', days],
    queryFn: () => apiService.getSearchTrendData(days),
    staleTime: 1000 * 60 * 5,
  });
};

export const useSearchTrends = (topN?: number, days?: number) => {
  return useQuery({
    queryKey: ['discovery', 'searchTrends', 'keywords', topN, days],
    queryFn: () => apiService.getSearchTrends(topN, days),
    staleTime: 1000 * 60 * 5,
  });
};

export const useGameTrends = (days?: number, limit?: number) => {
  return useQuery({
    queryKey: ['discovery', 'gameTrends', days, limit],
    queryFn: () => apiService.getGameTrends(days, limit),
    staleTime: 1000 * 60 * 5,
  });
};

export const useDiscoveryDistributions = () => {
  return useQuery({
    queryKey: ['discovery', 'distributions'],
    queryFn: () => apiService.getDiscoveryDistributions(),
    staleTime: 1000 * 60 * 10,
  });
};

export const useCommunitySummary = () => {
  return useQuery({
    queryKey: ['discovery', 'communitySummary'],
    queryFn: () => apiService.getCommunitySummary(),
    staleTime: 1000 * 60 * 5,
  });
};

// ==================== 游戏化（经验/积分）Hooks ====================
export const useGamificationStats = () => {
  return useQuery({
    queryKey: queryKeys.gamification.stats(),
    queryFn: () => apiService.getGamificationStats(),
    staleTime: 1000 * 30,
  });
};

export const useXpHistory = (params?: PaginationParams) => {
  return useQuery({
    queryKey: queryKeys.gamification.xpHistory(params),
    queryFn: () => apiService.getXpHistory(params),
  });
};

export const usePointHistory = (params?: PaginationParams) => {
  return useQuery({
    queryKey: queryKeys.gamification.pointHistory(params),
    queryFn: () => apiService.getPointHistory(params),
  });
};

// ==================== 成就系统 Hooks ====================
export const usePlatformAchievements = (userId?: string) => {
  return useQuery({
    queryKey: queryKeys.achievements.list(),
    queryFn: () => apiService.getPlatformAchievements(userId),
    staleTime: 1000 * 60 * 5,
  });
};

export const useUserAchievements = (userId?: string) => {
  return useQuery({
    queryKey: queryKeys.achievements.userList(userId),
    queryFn: () => apiService.getUserAchievements(userId),
    staleTime: 1000 * 60 * 2,
  });
};

export const useAchievementStats = () => {
  return useQuery({
    queryKey: queryKeys.achievements.stats(),
    queryFn: () => apiService.getAchievementStats(),
    staleTime: 1000 * 30,
  });
};

// ==================== 私信系统 Hooks ====================
export const useConversations = (params?: PaginationParams) => {
  return useQuery({
    queryKey: queryKeys.messages.conversations(params),
    queryFn: () => apiService.getConversations(params),
    staleTime: 1000 * 30,
  });
};

export const useConversation = (id: string) => {
  return useQuery({
    queryKey: queryKeys.messages.conversation(id),
    queryFn: () => apiService.getConversation(id),
    enabled: !!id,
    staleTime: 1000 * 15,
    refetchInterval: 1000 * 15,
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, content, replyToId }: { conversationId: string; content: string; replyToId?: string }) =>
      apiService.sendMessage(conversationId, content, replyToId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversation(variables.conversationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversations() });
    },
  });
};

export const useCreateConversation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ participantId, subject }: { participantId: string; subject?: string }) =>
      apiService.createConversation(participantId, subject),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversations() });
    },
  });
};

export const useMarkConversationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => apiService.markConversationRead(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.unreadCount() });
    },
  });
};

export const useMessageUnreadCount = () => {
  return useQuery({
    queryKey: queryKeys.messages.unreadCount(),
    queryFn: () => apiService.getMessageUnreadCount(),
    refetchInterval: 1000 * 30,
    staleTime: 1000 * 15,
  });
};

export const useDeleteMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, messageId }: { conversationId: string; messageId: string }) =>
      apiService.deleteMessage(conversationId, messageId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversation(variables.conversationId) });
    },
  });
};

export const useClearConversation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) =>
      apiService.clearConversation(conversationId),
    onSuccess: (_data, conversationId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversation(conversationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversations() });
    },
  });
};

// ==================== 关注系统 Hooks ====================
export const useFollowUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => apiService.followUser(userId),
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.follow.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.follow.status(userId) });
    },
  });
};

export const useUnfollowUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => apiService.unfollowUser(userId),
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.follow.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.follow.status(userId) });
    },
  });
};

export const useFollowers = (userId: string, params?: PaginationParams) => {
  return useQuery({
    queryKey: queryKeys.follow.followers(userId, params),
    queryFn: () => apiService.getFollowers(userId, params),
    enabled: !!userId,
    staleTime: 1000 * 30,
  });
};

export const useFollowing = (userId: string, params?: PaginationParams) => {
  return useQuery({
    queryKey: queryKeys.follow.following(userId, params),
    queryFn: () => apiService.getFollowing(userId, params),
    enabled: !!userId,
    staleTime: 1000 * 30,
  });
};

export const useFollowStatus = (userId: string) => {
  const { user } = useAuth();
  const currentUserId = user?.id;
  return useQuery({
    queryKey: queryKeys.follow.status(userId),
    queryFn: () => apiService.getFollowStatus(userId),
    enabled: !!userId && !!currentUserId && userId !== currentUserId,
    staleTime: 1000 * 30,
  });
};

export const useFollowStats = (userId?: string) => {
  return useQuery({
    queryKey: queryKeys.follow.stats(userId),
    queryFn: () => apiService.getFollowStats(userId),
    staleTime: 1000 * 60,
  });
};

export const useMutualFollows = (userId: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.follow.mutual(userId),
    queryFn: () => apiService.getMutualFollows(userId),
    enabled: !!userId && !!user?.id && userId !== user.id,
    staleTime: 1000 * 60,
  });
};

// ==================== 用户排行榜 Hooks ====================
export const useUserLeaderboard = (type: string, limit?: number, page?: number) => {
  return useQuery({
    queryKey: queryKeys.userLeaderboard.list(type, limit, page),
    queryFn: () => apiService.getUserLeaderboard(type, limit, page),
    staleTime: 1000 * 60 * 2,
  });
};

// ==================== AI 模块 Hooks ====================
export const useSoulstationChat = () => {
  return useMutation({
    mutationFn: (messages: Array<{ role: string; content: string }>) =>
      apiService.soulstationChat(messages),
  });
};

export const useGameNpcSearch = () => {
  return useMutation({
    mutationFn: (query: string) => apiService.gameNpcSearch({ query }),
  });
};

export const useGameCompanionRecommend = () => {
  return useMutation({
    mutationFn: (params: { gameName: string; answers: string[] }) =>
      apiService.gameCompanionRecommend(params),
  });
};

export const useGenerateCharacterPortrait = () => {
  return useMutation({
    mutationFn: (params: Record<string, any>) =>
      apiService.generateCharacterPortrait(params),
  });
};

// ==================== AI 图片转 3D Hooks ====================
export const useImageTo3d = () => {
  return useMutation({
    mutationFn: (imageUrl: string) =>
      apiService.submitImageTo3d(imageUrl),
  });
};

export const useImageTo3dTask = (taskId: string | null) => {
  return useQuery({
    queryKey: ['ai', 'image-to-3d', taskId],
    queryFn: () => apiService.getImageTo3dTask(taskId!),
    enabled: !!taskId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === 'succeeded' || data?.status === 'failed') return false;
      return 3000;
    },
  });
};

// ==================== 内容审核 Hooks ====================
export const queryKeysReview = {
  all: ['admin', 'review'] as const,
  queue: (params?: { page?: number; limit?: number; type?: string; status?: string }) =>
    [...queryKeysReview.all, 'queue', params] as const,
  stats: () => [...queryKeysReview.all, 'stats'] as const,
};

export const useReviewQueue = (params?: { page?: number; limit?: number; type?: string; status?: string }) => {
  return useQuery({
    queryKey: queryKeysReview.queue(params),
    queryFn: () => apiService.getReviewQueue(params),
  });
};

export const useReviewStats = () => {
  return useQuery({
    queryKey: queryKeysReview.stats(),
    queryFn: () => apiService.getReviewStats(),
  });
};

export const useApproveContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id }: { type: string; id: string }) =>
      apiService.approveContent(type, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'review'] });
    },
  });
};

export const useRejectContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id, comment }: { type: string; id: string; comment: string }) =>
      apiService.rejectContent(type, id, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'review'] });
    },
  });
};

// ==================== Banner 和推荐内容 Hooks ====================

export const useBanners = (position?: string) => {
  return useQuery({
    queryKey: ['banners', position],
    queryFn: () => apiService.getBanners(position),
    staleTime: 1000 * 60 * 5,
  });
};

export const useFeaturedContent = (type?: string) => {
  return useQuery({
    queryKey: ['featured', type],
    queryFn: () => apiService.getFeaturedContent(type),
    staleTime: 1000 * 60 * 5,
  });
};

// ==================== 兑换码 Hooks ====================

export const useRedeemCodes = () => {
  return useQuery({
    queryKey: ['redeem', 'codes'],
    queryFn: () => apiService.getRedeemCodes(),
    staleTime: 1000 * 60 * 2,
  });
};

export const useRedeemCode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => apiService.redeemCode(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redeem', 'codes'] });
      queryClient.invalidateQueries({ queryKey: ['redeem', 'my'] });
    },
  });
};

export const useMyRedeemHistory = () => {
  return useQuery({
    queryKey: ['redeem', 'my'],
    queryFn: () => apiService.getMyRedeemHistory(),
    staleTime: 1000 * 30,
  });
};