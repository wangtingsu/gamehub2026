/**
 * API 类型定义模块
 *
 * 定义整个应用与后端交互所用到的所有 TypeScript 类型、接口和枚举。
 * 涵盖以下模块：
 * - 通用响应格式（ApiResponse、分页、错误等）
 * - 用户认证（登录、注册、OAuth、2FA）
 * - 游戏、新闻、博客、评测、攻略指南
 * - 评论、社区帖子、收藏、关注、点赞
 * - 游戏库、个人评分
 * - 内容审核、邮件模板、文件上传
 * - 数据分析、用户画像、发现/推荐系统
 * - 游戏化（经验/积分）、成就、私信、排行榜
 *
 * @module api/types
 */

import type { AxiosRequestConfig } from 'axios';

/**
 * API 统一响应基础类型
 * 所有后端 API 接口均返回此格式
 *
 * @typeParam T - data 字段的实际数据类型
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
  details?: Array<{ field: string; message: string }>;
}

/**
 * 分页查询参数
 * 用于列表类 API 请求的分页控制
 */
export interface PaginationParams {
  /** 当前页码（从 1 开始） */
  page?: number;
  /** 每页返回条数 */
  limit?: number;
  /** 搜索关键词 */
  search?: string;
  /** 其他扩展筛选参数 */
  [key: string]: unknown;
}

/**
 * 分页响应结构
 * 后端分页接口统一返回的元信息格式
 */
export interface PaginationResponse {
  /** 当前页码 */
  page: number;
  /** 每页条数 */
  limit: number;
  /** 总记录数 */
  total: number;
  /** 总页数 */
  pages: number;
  /** 是否有下一页 */
  hasNext: boolean;
  /** 是否有上一页 */
  hasPrev: boolean;
}

// ==================== 认证相关类型 ====================

/**
 * 邮箱密码登录请求参数
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * 邮箱注册请求参数
 */
export interface RegisterRequest {
  /** 用户名 */
  username: string;
  /** 邮箱地址 */
  email: string;
  /** 密码 */
  password: string;
  /** 显示名称（可选，默认与用户名相同） */
  displayName?: string;
  /** 头像 URL（可选） */
  avatarUrl?: string;
}

/**
 * 手机号登录请求参数
 */
export interface LoginByPhoneRequest {
  /** 手机号 */
  phone: string;
  /** 短信验证码 */
  code: string;
}

/**
 * 手机号注册请求参数
 */
export interface RegisterByPhoneRequest {
  /** 用户名 */
  username: string;
  /** 手机号 */
  phone: string;
  /** 短信验证码 */
  code: string;
  /** 密码 */
  password: string;
  /** 显示名称 */
  displayName?: string;
}

/**
 * 发送短信验证码请求参数
 */
export interface SendSmsCodeRequest {
  /** 手机号 */
  phone: string;
  /** 验证码用途类型（登录/注册/绑定/解绑） */
  type: 'login' | 'register' | 'bind' | 'unbind';
}

/**
 * OAuth 第三方登录提供商信息
 */
export interface OAuthProvider {
  /** 提供商标识（如 google、github） */
  provider: string;
  /** 提供商显示名称 */
  name: string;
  /** 是否启用 */
  enabled: boolean;
  /** 图标 URL */
  icon?: string;
}

/**
 * OAuth 提供商列表响应
 */
export interface OAuthProvidersResponse {
  providers: OAuthProvider[];
}

/**
 * 认证令牌（Token）信息
 */
export interface AuthTokens {
  /** 访问令牌 */
  accessToken: string;
  /** 刷新令牌 */
  refreshToken: string;
  /** 过期时间（秒） */
  expiresIn: number;
}

/**
 * 用户实体
 * 包含用户的完整信息，包括等级、经验值、积分和冻结状态等
 */
/**
 * 用户实体
 * 包含用户的完整信息，包括等级、经验值、积分和冻结状态等
 */
export interface User {
  /** 用户 ID */
  id: string;
  /** 用户名（唯一） */
  username: string;
  /** 邮箱地址 */
  email: string;
  /** 用户显示名称 */
  displayName: string;
  /** 头像 URL */
  avatarUrl?: string;
  /** 用户角色（超级管理员/管理员/普通用户） */
  role: 'super_admin' | 'admin' | 'user';
  /** 邮箱是否已验证 */
  emailVerified: boolean;
  /** 账号是否激活 */
  isActive: boolean;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;

  // ===== 等级与登录时长 =====
  /** 用户等级 */
  level: number;
  /** 累计登录时长（秒） */
  totalLoginTime: number;
  /** 累计获得经验值 */
  totalXp: number;
  /** 累计获得积分 */
  totalPoints: number;

  // ===== 手机信息 =====
  /** 用户手机号 */
  phone?: string;

  // ===== 评论冻结状态 =====
  /** 是否被禁止评论 */
  commentFrozen: boolean;
  /** 评论冻结截止时间 */
  frozenUntil?: string;
}

/**
 * 认证响应数据
 * 登录/注册成功后返回的用户信息和令牌
 */
export interface AuthResponseData {
  /** 用户信息 */
  user: User;
  /** 认证令牌 */
  tokens: AuthTokens;
}

// ==================== 游戏相关类型 ====================

/**
 * 游戏实体
 */
export interface Game {
  /** 游戏 ID */
  id: string;
  /** 游戏标题 */
  title: string;
  /** 游戏描述 */
  description: string;
  /** 发布日期 */
  releaseDate: string;
  /** 开发商 */
  developer: string;
  /** 发行商 */
  publisher: string;
  /** 游戏类型（如 动作、角色扮演、策略） */
  genres: string[];
  /** 支持平台（如 pc、playstation、xbox） */
  platforms: string[];
  /** 平均评分 */
  rating: number;
  /** 价格 */
  price: number;
  /** 折扣百分比 */
  discount?: number;
  /** 封面图片 URL */
  imageUrl: string;
  /** 游戏截图列表 */
  screenshots: string[];
  /** 展示区域（推荐/热门/独立） */
  displayZone?: 'recommended' | 'top-up' | 'indie';
  /** 使用状态（active/archived） */
  status?: string;
  /** 论坛统计：帖子数（仅论坛广场接口返回） */
  forumPostCount?: number;
  /** 论坛统计：最新帖子时间 */
  latestForumPostDate?: string;
  /** 论坛统计：最新帖子标题 */
  latestPostTitle?: string;
}

// 扩展游戏类型（向后兼容）
export type {
  ExtendedGame,
  PlatformInfo,
  GameMedia,
  GameMetadata,
  PlatformOwnership,
  UserGameLibrary,
  GameSession,
  GameTimeStats,
  GameAchievement,
  UserAchievement,
  AchievementStats,
  GameSave,
  CrossPlatformSync,
  GameGroup,
  GroupMember,
  ChatMessage,
  GameParty,
  PartyInvite,
  UserGeneratedContent,
  GameLibraryResponse,
  GameSessionsResponse,
  AchievementsResponse,
  GameGroupsResponse,
  UserContentResponse,
  AddToLibraryRequest,
  UpdateLibraryRequest,
  RecordSessionRequest,
  CreateGameGroupRequest,
  CreateContentRequest
} from './game-types';

// 枚举类型需要运行时值，所以不能使用 export type
export {
  PlatformType,
  LibraryStatus,
  GroupType,
  GroupPrivacy,
  GroupMemberRole,
  ChatChannelType,
  ContentType
} from './game-types';

// 收藏相关类型
export interface Favorite {
  id: string;
  userId: string;
  gameId: string;
  createdAt: string;
}

export interface FavoriteStatus {
  gameId: string;
  isFavorited: boolean;
}

export interface FavoriteStats {
  totalFavorites: number;
  topFavoritedGames: Array<{ gameId: string; count: number }>;
  averageFavoritesPerUser: number;
}

// 新闻相关类型
export interface NewsArticleTranslation {
  title?: string;
  content?: string;
  excerpt?: string;
}

export type NewsArticleTranslations = Partial<
  Record<'en' | 'ja' | 'ko' | 'es' | 'fr', NewsArticleTranslation>
>;

export interface NewsArticle {
  id: string;
  slug?: string;
  title: string;
  summary: string;
  content: string;
  author: string;
  publishDate: string;
  category: string;
  tags: string[];
  imageUrl: string;
  views: number;
  likes: number;
  isPinned?: boolean;
  reviewStatus?: ReviewStatusType;
  reviewComment?: string;
  translations?: NewsArticleTranslations;
}

// 博客相关类型
export interface BlogArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  authorId?: string;
  authorAvatar?: string;
  authorBio?: string;
  publishDate: string;
  category: string;
  tags: string[];
  coverImage: string;
  readingTime: number;
  views: number;
  likes: number;
  featured: boolean;
  reviewStatus?: ReviewStatusType;
  reviewComment?: string;
  postType?: 'blog' | 'review' | 'guide';
  rating?: number;
  gameId?: string;
}

// 博客创建输入
export interface BlogCreateInput {
  title: string;
  content: string;
  excerpt?: string;
  coverImageUrl?: string;
  category: string;
  tags?: string[];
  status?: ReviewStatusType;
}

// 博客更新输入
export interface BlogUpdateInput {
  title?: string;
  content?: string;
  excerpt?: string;
  category?: string;
  tags?: string[];
  coverImageUrl?: string;
  reviewStatus?: ReviewStatusType;
}

// ==================== 评测相关类型 ====================

/**
 * 游戏评测实体
 */
export interface Review {
  /** 评测 ID */
  id: string;
  /** 关联游戏 ID */
  gameId: string;
  /** 游戏标题（冗余字段） */
  gameTitle: string;
  /** 评测标题 */
  title: string;
  /** 评测正文内容 */
  content: string;
  /** 作者用户名 */
  author: string;
  /** 作者 ID */
  authorId?: string;
  /** 评分 */
  rating: number;
  /** 发布日期 */
  publishDate: string;
  /** 点赞数 */
  likes: number;
  /** 评论数 */
  comments: number;
  /** 标签列表 */
  tags: string[];
  /** 是否精选 */
  isFeatured?: boolean;
  /** 分项评分（如 画面: 9, 剧情: 8） */
  scores?: Record<string, number>;
  /** 评测模板 ID */
  templateId?: string;
  /** 模板分段内容 */
  sections?: Record<string, string[] | string>;
  /** 创建时间 */
  createdAt?: string;
  /** 更新时间 */
  updatedAt?: string;
  /** 删除时间（软删除） */
  deletedAt?: string;
  /** 版本号 */
  version?: number;
  /** 创建者 */
  createdBy?: string;
  /** 最后更新者 */
  updatedBy?: string;
  /** 审核状态 */
  reviewStatus?: ReviewStatusType;
  /** 审核意见 */
  reviewComment?: string;
}

// 评测相关扩展类型
export interface ReviewCreateRequest {
  gameId: string;
  title: string;
  content: string;
  rating: number;
  tags?: string[];
  scores?: Record<string, number>;
  templateId?: string;
  sections?: Record<string, string[] | string>;
}

export interface ReviewUpdateRequest {
  title?: string;
  content?: string;
  rating?: number;
  tags?: string[];
  scores?: Record<string, number>;
  templateId?: string;
  sections?: Record<string, string[] | string>;
}

// 评测模板类型
export interface ReviewTemplate {
  id: string;
  name: string;
  description?: string;
  sections: string;
  defaultScores?: string;
  scoreDimensions?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewTemplateCreateInput {
  name: string;
  description?: string;
  sections: string;
  defaultScores?: string;
  scoreDimensions?: string;
  sortOrder?: number;
}

export interface ReviewTemplateUpdateInput {
  name?: string;
  description?: string;
  sections?: string;
  defaultScores?: string;
  scoreDimensions?: string;
  sortOrder?: number;
  isActive?: boolean;
}

// 攻略指南相关类型
export type GuideDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface GuideStep {
  title: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
}

export interface Guide {
  id: string;
  gameId: string;
  gameTitle?: string;
  gameSlug?: string;
  title: string;
  content: string;
  summary?: string;
  difficulty: GuideDifficulty;
  author: string;
  authorId?: string;
  authorDisplayName?: string;
  authorAvatar?: string;
  coverImageUrl?: string;
  tags: string[];
  steps: GuideStep[];
  isFeatured?: boolean;
  isPublished?: boolean;
  likes: number;
  views: number;
  estimatedMinutes?: number;
  createdAt?: string;
  updatedAt?: string;
  comments?: number;
  reviewStatus?: ReviewStatusType;
  reviewComment?: string;
}

export interface GuideCreateInput {
  gameId: string;
  title: string;
  content: string;
  summary?: string;
  difficulty?: GuideDifficulty;
  coverImageUrl?: string;
  tags?: string[];
  steps?: GuideStep[];
  estimatedMinutes?: number;
}

export interface GuideUpdateInput {
  title?: string;
  content?: string;
  summary?: string;
  difficulty?: GuideDifficulty;
  coverImageUrl?: string;
  tags?: string[];
  steps?: GuideStep[];
  isFeatured?: boolean;
  isPublished?: boolean;
  estimatedMinutes?: number;
}

// ==================== 评论相关类型 ====================

/**
 * 父级内容类型
 * 标识评论所属的上层内容类型
 */
export type ParentType = 'review' | 'news' | 'community_post' | 'guide' | 'blog';

/**
 * 评论实体
 */
export interface Comment {
  /** 评论 ID */
  id: string;
  /** 评论内容 */
  content: string;
  /** 作者 ID */
  authorId: string;
  /** 作者信息（嵌套对象，包含用户名、显示名、头像） */
  author?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  /** 所属父级内容类型 */
  parentType: ParentType;
  /** 所属父级内容 ID */
  parentId: string;
  /** 点赞数 */
  likes: number;
  /** 是否已被编辑 */
  isEdited: boolean;
  /** 创建时间（ISO 日期字符串） */
  createdAt: string;
  /** 更新时间（ISO 日期字符串） */
  updatedAt: string;
  /** 父评论 ID（如果是回复评论） */
  parentCommentId?: string;
  /** 回复数 */
  replyCount?: number;
  /** 删除时间 */
  deletedAt?: string;
  /** 版本号 */
  version?: number;
  /** 创建者 */
  createdBy?: string;
  /** 最后更新者 */
  updatedBy?: string;
  /** 回复列表（嵌套，便于 UI 展示） */
  replies?: Comment[];
}

export interface CommentCreateInput {
  content: string;
  parentType: ParentType;
  parentId: string;
  parentCommentId?: string;
}

export interface CommentUpdateRequest {
  content: string;
}

export interface CommentStats {
  totalComments: number;
  totalLikes: number;
  averageLikesPerComment: number;
  mostActiveAuthors: Array<{ userId: string; commentCount: number }>;
}

export interface CommentLikeResponse {
  commentId: string;
  likes: number;
  liked: boolean;
}

export interface PaginatedComments {
  comments: Comment[];
  pagination: PaginationResponse;
}

export interface PaginatedReplies {
  replies: Comment[];
  pagination: PaginationResponse;
}

export interface SearchCommentsResult extends PaginatedComments {
  query?: string;
}

// 社区帖子类型
export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  author: string;
  authorId?: string;
  authorAvatar?: string;
  publishDate: string;
  likes: number;
  comments: number;
  tags: string[];
  category: string;
  isPinned?: boolean;
  isLocked?: boolean;
  createdAt?: string;
  updatedAt?: string;
  gameId?: string;
  gameTitle?: string;
  reviewStatus?: ReviewStatusType;
  reviewComment?: string;
}

// 3D 生成任务状态
export interface ImageTo3dTask {
  taskId: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  progress: number;
  modelUrls?: {
    glb?: string;
    fbx?: string;
    obj?: string;
    usdz?: string;
    thumbnail?: string;
  } | null;
  errorMessage?: string | null;
}

// API配置
export interface ApiConfig {
  baseURL: string;
  timeout: number;
  useMock: boolean;
  isAdmin?: boolean;
}

/**
 * API 错误类型
 * 统一封装后端返回的错误信息，包含 HTTP 状态码、业务错误码和详细错误字段
 *
 * @extends Error
 */
export class ApiError extends Error {
  /** HTTP 状态码 */
  public status: number;
  /** 业务错误码（如 UNKNOWN_ERROR、NETWORK_ERROR 等） */
  public code: string;
  /** 详细错误字段列表（用于表单校验错误提示） */
  public details?: Array<{ field: string; message: string }>;

  /**
   * 创建 API 错误实例
   *
   * @param status - HTTP 状态码
   * @param code - 业务错误码
   * @param message - 错误描述信息
   * @param details - 详细错误字段列表（可选）
   */
  constructor(
    status: number,
    code: string,
    message: string,
    details?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * 扩展的 Axios 请求配置
 * 在 AxiosRequestConfig 基础上添加请求开始时间记录字段，用于性能监控
 */
export interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  metadata?: {
    /** 请求开始的时间戳 */
    startTime?: number;
  };
}

// 新闻分类类型
export interface NewsCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NewsCategoryCreateInput {
  name: string;
  slug?: string;
  description?: string;
  sortOrder?: number;
}

export interface NewsCategoryUpdateInput {
  name?: string;
  slug?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

// 搜索相关类型
export interface SearchFilters {
  types?: string[];
  startDate?: string;
  endDate?: string;
  [key: string]: unknown;
}

export interface SearchResultItem {
  id: string;
  type: 'game' | 'review' | 'news' | 'community_post' | 'user';
  title: string;
  slug?: string;
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
  rank?: number;
  createdAt?: string;
  publishedAt?: string;
}

export interface SearchResult {
  query?: string;
  results: SearchResultItem[];
  byType: Record<string, number>;
  pagination: PaginationResponse;
}

export interface SearchSuggestion {
  type: 'game' | 'user' | 'review' | 'news' | 'community_post';
  id: string;
  title: string;
  image?: string;
  subtitle?: string;
}

// 通知相关类型
export type NotificationType = 'like' | 'comment' | 'follow' | 'mention' | 'system' | 'marketing' | 'new_message' | 'achievement_unlocked' | 'level_up';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  deletedAt?: string;
  version?: number;
}

export interface NotificationQueryParams extends PaginationParams {
  unreadOnly?: boolean;
  type?: NotificationType;
  startDate?: string;
  endDate?: string;
}

// ===== About page types =====
export interface AboutSection {
  id: number;
  sectionKey: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

export interface AboutValue {
  id: number;
  icon: string;
  title: string;
  description: string | null;
  sortOrder: number;
  isActive: number;
}

export interface AboutTeamMember {
  id: number;
  name: string;
  role: string;
  avatarUrl: string | null;
  description: string | null;
  sortOrder: number;
  isActive: number;
}

export interface AboutTimeline {
  id: number;
  year: string;
  title: string | null;
  description: string | null;
  sortOrder: number;
  isActive: number;
}

export interface AboutContact {
  id: number;
  label: string;
  value: string;
  sortOrder: number;
  isActive: number;
}

export interface AboutAllData {
  hero: AboutSection | null;
  mission: AboutSection | null;
  vision: AboutSection | null;
  values: AboutValue[];
  teamMembers: AboutTeamMember[];
  timeline: AboutTimeline[];
  contacts: AboutContact[];
}

// ==================== 文件上传类型 ====================

export interface UploadConfig {
  maxSize: number;
  allowedTypes: string[];
  image: {
    maxWidth: number;
    maxHeight: number;
    quality: number;
  };
  cdn: {
    enabled: boolean;
    baseUrl: string;
    provider: string;
  };
  validation: {
    checkMimeType: boolean;
    checkFileSize: boolean;
    virusScan: boolean;
  };
}

export interface UploadedFileInfo {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  createdAt: string;
}

export interface UploadImageInfo extends UploadedFileInfo {
  width: number;
  height: number;
  format: string;
}

export interface UploadDocumentInfo extends UploadedFileInfo {
  pages?: number;
  format: string;
}

// ==================== 邮件系统类型 ====================

export interface EmailTemplateVariable {
  key: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
}

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  templateType: string;
  subject: string;
  body: string;
  variables: EmailTemplateVariable[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmailQueueStatus {
  pending: number;
  processing: number;
  failed: number;
  sent: number;
  total: number;
}

export interface EmailSendResult {
  success: boolean;
  recipient: string;
  error?: string;
}

export interface EmailBulkSummary {
  total: number;
  success: number;
  failed: number;
}

// ==================== 关注系统类型 ====================

export interface FollowStatus {
  isFollowing: boolean;
}

export interface FollowStats {
  followersCount: number;
  followingCount: number;
}

export interface FollowUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  followedAt?: string;
}

// ==================== 统一点赞系统类型 ====================

export type LikeTargetType = 'review' | 'news' | 'community_post' | 'comment' | 'game' | 'guide';

export interface LikeStatus {
  hasLiked: boolean;
}

export interface LikeStats {
  totalLikes: number;
  targetType?: string;
  targetId?: string;
}

export interface LikeEntry {
  id: string;
  userId: string;
  targetType: LikeTargetType;
  targetId: string;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

// ==================== 数据分析类型 ====================

export interface UserGrowthPoint {
  date: string;
  newUsers: number;
  cumulative: number;
}

export interface GamePopularityItem {
  id: string;
  title: string;
  rating: number;
  reviewCount: number;
  avgScore: number;
  price: number;
  discount: number;
  platforms: string[];
  genres: string[];
  coverImageUrl?: string;
}

export interface ContentEngagement {
  newsViews: number;
  reviews: number;
  posts: number;
  comments: number;
  daily: Array<{ date: string; type: string; count: number }>;
}

export interface DistributionItem {
  name: string;
  count: number;
  percentage: number;
}

export interface Distributions {
  platforms: DistributionItem[];
  genres: DistributionItem[];
}

export interface ActiveUserDataPoint {
  date: string;
  logins: number;
  activeUsers: number;
}

export interface ActiveUserData {
  totalLogins: number;
  activeUsers: number;
  newUsers: number;
  avgLoginsPerUser: number;
  daily: ActiveUserDataPoint[];
}

export interface DashboardTrendPoint {
  date: string;
  count: number;
}

export interface DashboardStats {
  users: {
    total: number;
    active: number;
    newToday: number;
    growth: number;
  };
  games: {
    total: number;
    growth: number;
  };
  news: {
    total: number;
  };
  reviews: {
    total: number;
    newToday: number;
    growth: number;
  };
  community: {
    posts: number;
    comments: number;
  };
  trends: {
    users7d: DashboardTrendPoint[];
  };
}

export interface AuditLogStat {
  action: string;
  count: number;
}

// ==================== 用户画像类型 ====================

export interface UserTag {
  id: number;
  name: string;
  color: string;
  description?: string;
}

export interface UserSegment {
  id: number;
  name: string;
  description?: string;
  criteria?: string;
  isDynamic: number;
  memberCount?: number;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface SegmentMember {
  id: number;
  segment_id: number;
  user_id: string;
  added_by?: number;
  added_at: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  email: string;
  role: string;
  level: number;
  last_login?: string;
  is_active: number;
}

export interface BehaviorProfile {
  userId: string;
  username: string;
  displayName?: string;
  totalLogins: number;
  lastLogin?: string;
  totalLoginTime: number;
  avgSessionDuration: number;
  logins30d: number;
  loginFrequency: 'high' | 'medium' | 'low' | 'inactive';
  peakHour: number;
  reviewsCount: number;
  commentsCount: number;
  postsCount: number;
  tags: UserTag[];
}

export interface LoginFrequencyDistribution {
  high: number;
  medium: number;
  low: number;
  inactive: number;
}

export interface LevelDistributionItem {
  level: number;
  count: number;
}

export interface PeakHourData {
  hour: number;
  count: number;
}

export interface BehaviorDistributions {
  loginFrequency: LoginFrequencyDistribution;
  levelDistribution: LevelDistributionItem[];
}

// ==================== 发现/推荐系统类型 ====================

export interface AdvancedSearchFilters {
  genres?: string[];
  platforms?: string[];
  dateFrom?: string;
  dateTo?: string;
  ratingMin?: number;
  ratingMax?: number;
  tags?: string[];
  sortBy?: 'relevance' | 'date' | 'rating' | 'popularity';
}

export interface RecommendationItem {
  id: string;
  type: 'game' | 'review' | 'news' | 'community_post';
  title: string;
  coverImageUrl?: string;
  rating?: number | string;
  reason: string;
  score: number;
  likes?: number;
  comments?: number;
  publishedAt?: string;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  title: string;
  coverImageUrl?: string;
  score: number;
  reviewCount?: number;
  rating?: number | string;
  likes?: number;
  comments?: number;
  views?: number;
  genre?: string;
  platform?: string;
  trend?: 'up' | 'down' | 'stable';
}

export interface TrendPoint {
  date: string;
  value: number;
  label?: string;
}

export interface SearchTrend {
  keyword: string;
  count: number;
  trend: TrendPoint[];
}

export interface SearchTrendData {
  date: string;
  totalSearches: number;
  uniqueQueries: number;
}

export interface GameTrendData {
  gameId: string;
  title: string;
  coverImageUrl?: string;
  data: TrendPoint[];
}

export interface DistributionItem {
  name: string;
  count: number;
  percentage: number;
}

export interface DistributionData {
  platforms: DistributionItem[];
  genres: DistributionItem[];
}

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

// ===== Gamification / XP & Points =====
export interface XpTransaction {
  id: string;
  userId: string;
  actionKey: string;
  xpAmount: number;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: string;
  createdAt: string;
}

export interface PointTransaction {
  id: string;
  userId: string;
  actionKey: string;
  pointsAmount: number;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: string;
  description?: string;
  createdAt: string;
}

export interface GamificationStats {
  totalXp: number;
  totalPoints: number;
  xpToday: number;
  xpThisWeek: number;
  xpThisMonth: number;
  currentLevel: number;
  currentXp: number;
  nextLevelXp: number;
  progress: number;
  totalLoginHours: number;
}

// ===== Platform Achievements =====
export interface PlatformAchievement {
  id: string;
  key: string;
  name: string;
  description: string;
  iconUrl?: string;
  category: 'social' | 'content' | 'growth' | 'milestone';
  requirementType: string;
  requirementValue: number;
  xpReward: number;
  pointsReward: number;
  isHidden: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserPlatformAchievement {
  id: string;
  userId: string;
  achievementId: string;
  achievement?: PlatformAchievement;
  unlockedAt: string;
  notified: boolean;
  createdAt: string;
}

// ===== Private Messaging =====
export interface Conversation {
  id: string;
  subject?: string;
  type: 'direct' | 'group';
  lastMessageAt?: string;
  lastMessagePreview?: string;
  participants?: ConversationParticipant[];
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  lastReadAt: string;
  isMuted: boolean;
  joinedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'image' | 'system';
  replyToId?: string;
  createdAt: string;
}

// ===== User Leaderboard =====
export interface UserLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  level: number;
  totalXp: number;
  totalPoints: number;
  achievementCount: number;
}

export interface OnlineGame {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  component: string;
  players: number;
  rating: number;
  instructions: string;
}

// ===== Content Publishing Review =====
export type ReviewStatusType = 'draft' | 'pending' | 'approved' | 'rejected';

export interface ReviewQueueItem {
  id: string;
  type: 'news' | 'review' | 'community' | 'guide';
  title: string;
  content: string;
  authorId: string;
  authorName: string | null;
  reviewStatus: ReviewStatusType;
  reviewComment?: string | null;
  createdAt: string;
  submittedAt: string;
}

export interface ReviewStats {
  type: string;
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}