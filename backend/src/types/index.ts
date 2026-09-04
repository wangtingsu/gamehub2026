/**
 * 核心类型定义模块
 *
 * 定义应用全局使用的 TypeScript 类型、接口、枚举和常量。
 * 覆盖以下领域：
 * - 用户体系：用户信息、认证、社交登录、双因素认证、营销偏好
 * - 游戏体系：游戏信息、创建/更新输入
 * - 内容体系：新闻、评测、社区帖子、评论
 * - 互动体系：点赞、关注、收藏、通知、私信
 * - 成就体系：平台成就、用户成就、经验值、积分、等级
 * - 权限体系：角色层级、权限矩阵
 * - 通用类型：API 响应、分页、搜索、错误、文件上传
 *
 * @module types/index
 */

// 用户相关类型

/** 用户实体，包含所有用户属性 */
export interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  role: 'super_admin' | 'admin' | 'user';
  language?: string; // 用户偏好的语言代码，如 'en', 'zh-CN'
  emailVerified: boolean;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;

  // 等级与登录时长
  level: number;
  totalLoginTime: number; // 累计登录时长（分钟）
  totalXp: number; // 累计经验值
  totalPoints: number; // 累计积分

  // 手机注册
  phone?: string;
  phoneVerified?: boolean;

  // 评论冻结
  commentFrozen: boolean;
  frozenUntil?: Date;

  // 社交登录字段
  googleId?: string;
  githubId?: string;
  facebookId?: string;
  twitterId?: string;

  // 双因素认证
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  twoFactorBackupCodes?: string[];
  twoFactorLastUsed?: Date;

  // 营销偏好
  marketingOptIn: boolean;
  newsletterSubscription: boolean;
  emailPreferences: {
    promotional: boolean;
    transactional: boolean;
    newsletter: boolean;
    system: boolean;
  };

  // 用户设置
  notificationSettings: {
    email: boolean;
    push: boolean;
    inApp: boolean;
    frequency: 'immediate' | 'daily' | 'weekly';
  };
  privacySettings: {
    profileVisibility: 'public' | 'friends' | 'private';
    showEmail: boolean;
    showLastLogin: boolean;
    showOnlineStatus: boolean;
  };

  // 软删除支持
  deletedAt?: Date;

  // 审计字段
  createdBy?: string;
  updatedBy?: string;

  // 乐观锁版本
  version?: number;
}

/** 新闻通讯订阅实体 */
export interface NewsletterSubscription {
  id: string;
  userId: string;
  email: string;
  subscriptionType: 'newsletter' | 'promotional' | 'all';
  isActive: boolean;
  subscribedAt: Date;
  unsubscribedAt?: Date;
  preferences: {
    categories?: string[];
    frequency?: 'daily' | 'weekly' | 'monthly';
    format?: 'html' | 'text';
  };
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  version?: number;
}

/** 新闻通讯订阅创建输入 */
export interface NewsletterSubscriptionCreateInput {
  userId: string;
  email: string;
  subscriptionType?: 'newsletter' | 'promotional' | 'all';
  preferences?: {
    categories?: string[];
    frequency?: 'daily' | 'weekly' | 'monthly';
    format?: 'html' | 'text';
  };
}

/** 新闻通讯订阅更新输入 */
export interface NewsletterSubscriptionUpdateInput {
  isActive?: boolean;
  subscriptionType?: 'newsletter' | 'promotional' | 'all';
  preferences?: {
    categories?: string[];
    frequency?: 'daily' | 'weekly' | 'monthly';
    format?: 'html' | 'text';
  };
  unsubscribedAt?: Date;
  userId?: string;
}

/** 营销活动实体 */
export interface MarketingCampaign {
  id: string;
  name: string;
  description?: string;
  campaignType: 'newsletter' | 'promotion' | 'announcement' | 'onboarding';
  targetAudience: {
    userSegments?: string[];
    userIds?: string[];
    filters?: Record<string, any>;
  };
  content: {
    subject: string;
    body: string;
    templateId?: string;
    variables?: Record<string, any>;
  };
  schedule: {
    sendAt: Date;
    timezone: string;
    recurrence?: 'once' | 'daily' | 'weekly' | 'monthly';
  };
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled' | 'failed';
  stats: {
    totalRecipients: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
    complaints: number;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  version?: number;
}

/** 营销活动创建输入 */
export interface MarketingCampaignCreateInput {
  name: string;
  description?: string;
  campaignType: 'newsletter' | 'promotion' | 'announcement' | 'onboarding';
  targetAudience: {
    userSegments?: string[];
    userIds?: string[];
    filters?: Record<string, any>;
  };
  content: {
    subject: string;
    body: string;
    templateId?: string;
    variables?: Record<string, any>;
  };
  schedule: {
    sendAt: Date;
    timezone: string;
    recurrence?: 'once' | 'daily' | 'weekly' | 'monthly';
  };
  createdBy?: string;
}

/** 营销活动更新输入 */
export interface MarketingCampaignUpdateInput {
  name?: string;
  description?: string;
  campaignType?: 'newsletter' | 'promotion' | 'announcement' | 'onboarding';
  targetAudience?: {
    userSegments?: string[];
    userIds?: string[];
    filters?: Record<string, any>;
  };
  content?: {
    subject?: string;
    body?: string;
    templateId?: string;
    variables?: Record<string, any>;
  };
  schedule?: {
    sendAt?: Date;
    timezone?: string;
    recurrence?: 'once' | 'daily' | 'weekly' | 'monthly';
  };
  status?: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled' | 'failed';
  stats?: {
    totalRecipients?: number;
    sent?: number;
    delivered?: number;
    opened?: number;
    clicked?: number;
    bounced?: number;
    unsubscribed?: number;
    complaints?: number;
  };
}

/** 邮件模板实体 */
export interface EmailTemplate {
  id: string;
  name: string;
  description?: string;
  templateType: 'verification' | 'welcome' | 'password_reset' | 'newsletter' | 'promotional' | 'notification';
  subject: string;
  body: string;
  variables: string[];
  isActive: boolean;
  version: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  updatedBy?: string;
}

/** 邮件模板创建输入 */
export interface EmailTemplateCreateInput {
  name: string;
  description?: string;
  templateType: 'verification' | 'welcome' | 'password_reset' | 'newsletter' | 'promotional' | 'notification';
  subject: string;
  body: string;
  variables?: string[];
}

/** 邮件模板更新输入 */
export interface EmailTemplateUpdateInput {
  name?: string;
  description?: string;
  templateType?: 'verification' | 'welcome' | 'password_reset' | 'newsletter' | 'promotional' | 'notification';
  subject?: string;
  body?: string;
  variables?: string[];
  isActive?: boolean;
  version?: string;
}

/** 用户创建输入 */
export interface UserCreateInput {
  username: string;
  email?: string;
  phone?: string;
  password: string;
  displayName?: string;
  language?: string;
  role?: string; // 用户偏好的语言代码，如 'en', 'zh-CN'

  // 社交登录字段（可选）
  googleId?: string;
  githubId?: string;
  facebookId?: string;
  twitterId?: string;

  // 营销偏好（可选，有默认值）
  marketingOptIn?: boolean;
  newsletterSubscription?: boolean;
  emailPreferences?: {
    promotional?: boolean;
    transactional?: boolean;
    newsletter?: boolean;
    system?: boolean;
  };

  // 用户设置（可选，有默认值）
  notificationSettings?: {
    email?: boolean;
    push?: boolean;
    inApp?: boolean;
    frequency?: 'immediate' | 'daily' | 'weekly';
  };
  privacySettings?: {
    profileVisibility?: 'public' | 'friends' | 'private';
    showEmail?: boolean;
    showLastLogin?: boolean;
    showOnlineStatus?: boolean;
  };
}

/** 用户更新输入 */
export interface UserUpdateInput {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  language?: string; // 用户偏好的语言代码，如 'en', 'zh-CN'

  // 等级与登录时长（管理员操作）
  level?: number;
  totalLoginTime?: number;
  totalXp?: number;
  totalPoints?: number;

  // 手机字段
  phone?: string;
  phoneVerified?: boolean;

  // 评论冻结
  commentFrozen?: boolean;
  frozenUntil?: Date;

  // 社交登录字段
  googleId?: string;
  githubId?: string;
  facebookId?: string;
  twitterId?: string;

  // 双因素认证
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  twoFactorBackupCodes?: string[];
  twoFactorLastUsed?: Date;

  // 营销偏好
  marketingOptIn?: boolean;
  newsletterSubscription?: boolean;
  emailPreferences?: {
    promotional?: boolean;
    transactional?: boolean;
    newsletter?: boolean;
    system?: boolean;
  };

  // 用户设置
  notificationSettings?: {
    email?: boolean;
    push?: boolean;
    inApp?: boolean;
    frequency?: 'immediate' | 'daily' | 'weekly';
  };
  privacySettings?: {
    profileVisibility?: 'public' | 'friends' | 'private';
    showEmail?: boolean;
    showLastLogin?: boolean;
    showOnlineStatus?: boolean;
  };

  // 状态字段
  isActive?: boolean;
  lastLogin?: Date;
  emailVerified?: boolean;

  // 软删除字段
  deletedAt?: Date;

  // 乐观锁版本
  version?: number;
}

/** 登录凭证 */
export interface LoginCredentials {
  email?: string;
  phone?: string;
  password: string;
}

/** 认证令牌 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// 游戏相关类型

/** 游戏实体 */
export interface Game {
  id: string;
  title: string;
  slug: string;
  description?: string;
  releaseDate?: Date;
  developer?: string;
  publisher?: string;
  genres: string[];
  platforms: string[];
  rating?: number;
  price?: number;
  discount?: number;
  coverImageUrl?: string;
  screenshots: string[];
  steamAppId?: number;
  rawgId?: number;
  isFeatured: boolean;
  displayZone?: 'recommended' | 'top-up' | 'indie';
  status?: string;
  createdAt: Date;
  updatedAt: Date;
  // 营销字段
  promotionalTag?: string;
  featuredUntil?: Date;
  discountEndDate?: Date;
  views: number;
  wishlistCount: number;
  purchaseCount: number;
  metaTitle?: string;
  metaDescription?: string;
  // 软删除、乐观锁和审计字段
  deletedAt?: Date;
  version?: number;
  createdBy?: string;
  updatedBy?: string;
}

/** 游戏创建输入 */
export interface GameCreateInput {
  title: string;
  slug?: string;
  description?: string;
  releaseDate?: Date;
  developer?: string;
  publisher?: string;
  genres: string[];
  platforms: string[];
  price?: number;
  coverImageUrl?: string;
  displayZone?: 'recommended' | 'top-up' | 'indie';
  // 营销字段（可选）
  promotionalTag?: string;
  featuredUntil?: Date;
  discountEndDate?: Date;
  metaTitle?: string;
  metaDescription?: string;
}

/** 游戏更新输入 */
export interface GameUpdateInput {
  title?: string;
  description?: string;
  rating?: number;
  price?: number;
  discount?: number;
  isFeatured?: boolean;
  status?: string;
  displayZone?: 'recommended' | 'top-up' | 'indie' | null;
  // 营销字段
  promotionalTag?: string;
  featuredUntil?: Date;
  discountEndDate?: Date;
  views?: number;
  wishlistCount?: number;
  purchaseCount?: number;
  metaTitle?: string;
  metaDescription?: string;
  // 软删除字段
  deletedAt?: Date;
  version?: number;
}

// 新闻相关类型

/** 新闻单语言翻译内容（对应 news 表的 title_xx / content_xx / excerpt_xx 列） */
export interface NewsTranslation {
  title?: string;
  content?: string;
  excerpt?: string;
}

/** 新闻多语言翻译集合，键为数据库列后缀（en/ja/ko/es/fr；中文「zh」对应基础列，不在此集合内） */
export type NewsTranslations = Partial<Record<'en' | 'ja' | 'ko' | 'es' | 'fr', NewsTranslation>>;

/** 内容多语言翻译集合（通用，供攻略/评测复用；键为数据库列后缀 en/ja/ko/es/fr） */
export type ContentTranslations = Partial<Record<'en' | 'ja' | 'ko' | 'es' | 'fr', NewsTranslation>>;

/** 新闻实体 */
export interface News {
  id: string;
  title: string;
  slug: string;
  /** 主标题：用于生成 URL slug 后缀（替代原先的英文标题作为 slug 来源） */
  maintitle?: string;
  content: string;
  excerpt?: string;
  coverImageUrl?: string;
  authorId: string;
  authorName?: string | null;
  authorDisplayName?: string | null;
  category: string;
  tags: string[];
  isPublished: boolean;
  isPinned: boolean;
  publishedAt?: Date;
  views: number;
  likes: number;
  comments: number;
  gameName?: string;
  createdAt: Date;
  updatedAt: Date;

  // 多语言翻译内容
  translations?: NewsTranslations;

  // 审核字段
  reviewStatus?: ReviewStatus;
  reviewComment?: string;
  reviewedBy?: string;
  reviewedAt?: Date;

  // 软删除、乐观锁和审计字段
  deletedAt?: Date;
  version?: number;
  createdBy?: string;
  updatedBy?: string;
}

/** 新闻创建输入 */
export interface NewsCreateInput {
  title: string;
  content: string;
  excerpt?: string;
  coverImageUrl?: string;
  category: string;
  tags?: string[];
  slug?: string;
  /** 主标题：用于生成 URL slug 后缀（必填，替代英文标题作为 slug 来源） */
  maintitle?: string;
  status?: ReviewStatus;
  isPinned?: boolean;
  gameName?: string;
  translations?: NewsTranslations;
}

/** 新闻更新输入 */
export interface NewsUpdateInput {
  title?: string;
  content?: string;
  excerpt?: string;
  coverImageUrl?: string;
  category?: string;
  tags?: string[];
  isPublished?: boolean;
  isPinned?: boolean;
  gameName?: string;
  /** 主标题：用于生成 URL slug 后缀 */
  maintitle?: string;
  translations?: NewsTranslations;
  reviewStatus?: ReviewStatus;
  reviewComment?: string;
}

// 评测相关类型

/** 评测分数（五维评分） */
export interface ReviewScores {
  gameplay: number;
  graphics: number;
  story: number;
  audio: number;
  replayability: number;
}

/** 评测实体 */
export interface Review {
  id: string;
  title: string;
  /** 主标题：用于生成 URL slug 后缀 */
  maintitle?: string;
  content: string;
  rating: number;
  scores?: ReviewScores;
  templateId?: string;
  sections?: Record<string, string[] | string>;
  gameId: string;
  authorId: string;
  tags: string[];
  likes: number;
  comments: number;
  isFeatured: boolean;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;

  // 审核字段
  reviewStatus?: ReviewStatus;
  reviewComment?: string;
  reviewedBy?: string;
  reviewedAt?: Date;

  // 软删除、乐观锁和审计字段
  deletedAt?: Date;
  version?: number;
  createdBy?: string;
  updatedBy?: string;

  // 多语言翻译内容
  translations?: ContentTranslations;
}

/** 评测创建输入 */
export interface ReviewCreateInput {
  title: string;
  /** 主标题：用于生成 URL slug 后缀 */
  maintitle?: string;
  content: string;
  rating: number;
  scores?: ReviewScores;
  templateId?: string;
  sections?: Record<string, string[] | string>;
  gameId: string;
  tags?: string[];
  reviewStatus?: ReviewStatus;
  translations?: ContentTranslations;
}

/** 评测更新输入 */
export interface ReviewUpdateInput {
  title?: string;
  maintitle?: string;
  content?: string;
  rating?: number;
  scores?: ReviewScores;
  templateId?: string;
  sections?: Record<string, string[] | string>;
  tags?: string[];
  reviewStatus?: ReviewStatus;
  reviewComment?: string;
  translations?: ContentTranslations;
}

// 社区帖子相关类型

/** 社区帖子实体 */
export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  author?: string;
  publishDate?: string;
  category: string;
  tags: string[];
  likes: number;
  comments: number;
  isPinned: boolean;
  isLocked: boolean;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;

  // 游戏关联
  gameId?: string;
  gameTitle?: string;

  // 审核字段
  reviewStatus?: ReviewStatus;
  reviewComment?: string;
  reviewedBy?: string;
  reviewedAt?: Date;

  // 软删除、乐观锁和审计字段
  deletedAt?: Date;
  version?: number;
  createdBy?: string;
  updatedBy?: string;
}

/** 社区帖子创建输入 */
export interface CommunityPostCreateInput {
  title: string;
  content: string;
  category: string;
  tags?: string[];
  gameId?: string;
  reviewStatus?: ReviewStatus;
}

/** 社区帖子更新输入 */
export interface CommunityPostUpdateInput {
  title?: string;
  content?: string;
  category?: string;
  tags?: string[];
  reviewStatus?: ReviewStatus;
  reviewComment?: string;
}

// 评论相关类型

/** 评论实体 */
export interface Comment {
  id: string;
  content: string;
  authorId: string;
  parentType: 'review' | 'news' | 'community_post';
  parentId: string;
  likes: number;
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
  // 嵌套评论支持
  parentCommentId?: string;
  replyCount?: number;
  // 软删除、乐观锁和审计字段
  deletedAt?: Date;
  version?: number;
  createdBy?: string;
  updatedBy?: string;
}

/** 评论创建输入 */
export interface CommentCreateInput {
  content: string;
  parentType: 'review' | 'news' | 'community_post';
  parentId: string;
  parentCommentId?: string;
}

// API响应类型

/** 通用 API 响应格式 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** 分页参数 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** 搜索参数（继承分页参数） */
export interface SearchParams extends PaginationParams {
  query?: string;
  filters?: Record<string, any>;
}

// 错误类型

/** API 错误信息 */
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// 文件上传类型

/** 上传文件信息 */
export interface UploadedFile {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
  url: string;
}

// Socket事件类型

/** Socket 事件数据结构 */
export interface SocketEvent {
  type: string;
  data: any;
  timestamp: Date;
  userId?: string;
}

// 缓存键类型

/** 缓存键枚举 */
export enum CacheKeys {
  GAMES_LIST = 'games:list',
  GAME_DETAIL = 'game:detail:',
  NEWS_LIST = 'news:list',
  NEWS_DETAIL = 'news:detail:',
  REVIEWS_LIST = 'reviews:list',
  REVIEW_DETAIL = 'review:detail:',
  USER_PROFILE = 'user:profile:',
}

/** 运行环境类型 */
export type Environment = 'development' | 'testing' | 'staging' | 'production';

/** 审核状态类型 */
export type ReviewStatus = 'draft' | 'pending' | 'approved' | 'rejected';

/** 用户角色类型 */
export type UserRole = 'super_admin' | 'admin' | 'operator' | 'user';

/**
 * 角色层级映射（数字越大权限越高）
 * - user: 0
 * - admin: 1
 * - super_admin: 2
 */
export const RoleHierarchy: Record<UserRole, number> = {
  user: 0,
  operator: 1,
  admin: 2,
  super_admin: 3,
};

/** 权限定义 */
export interface Permission {
  resource: string;
  actions: string[];
}

/** 角色权限矩阵 */
export const RolePermissions: Record<UserRole, Permission[]> = {
  user: [
    { resource: 'profile', actions: ['read', 'update'] },
    { resource: 'games', actions: ['read'] },
    { resource: 'reviews', actions: ['read', 'create', 'update:own', 'delete:own'] },
    { resource: 'comments', actions: ['read', 'create', 'update:own', 'delete:own'] },
  ],
  operator: [
    { resource: 'profile', actions: ['read', 'update'] },
    { resource: 'content', actions: ['read', 'create', 'update', 'delete'] },
  ],
  admin: [
    { resource: 'profile', actions: ['read', 'update'] },
    { resource: 'users', actions: ['read'] },
    { resource: 'games', actions: ['read', 'create', 'update'] },
    { resource: 'reviews', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'comments', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'community_posts', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'monitoring', actions: ['read'] },
  ],
  super_admin: [
    { resource: '*', actions: ['*'] },
  ],
};

// 等级相关类型

/** 等级配置 */
export interface LevelConfig {
  level: number;
  requiredHours: number;
  weight: number;
  requiredXp?: number;
}

/** 经验值交易记录 */
export interface XpTransaction {
  id: string;
  userId: string;
  actionKey: string;
  xpAmount: number;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: string;
  createdAt: Date;
}

/** 经验值交易创建输入 */
export interface XpTransactionCreateInput {
  userId: string;
  actionKey: string;
  xpAmount: number;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: string;
}

/** 积分交易记录 */
export interface PointTransaction {
  id: string;
  userId: string;
  actionKey: string;
  pointsAmount: number;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: string;
  description?: string;
  createdAt: Date;
}

/** 积分交易创建输入 */
export interface PointTransactionCreateInput {
  userId: string;
  actionKey: string;
  pointsAmount: number;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: string;
  description?: string;
}

// 平台成就

/** 平台成就定义 */
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
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  version?: number;
}

/** 平台成就创建输入 */
export interface PlatformAchievementCreateInput {
  key: string;
  name: string;
  description: string;
  iconUrl?: string;
  category: 'social' | 'content' | 'growth' | 'milestone';
  requirementType: string;
  requirementValue: number;
  xpReward?: number;
  pointsReward?: number;
  isHidden?: boolean;
  sortOrder?: number;
}

/** 用户成就解锁记录 */
export interface UserPlatformAchievement {
  id: string;
  userId: string;
  achievementId: string;
  achievement?: PlatformAchievement;
  unlockedAt: Date;
  notified: boolean;
  createdAt: Date;
}

// 会话（私信）

/** 对话实体 */
export interface Conversation {
  id: string;
  subject?: string;
  type: 'direct' | 'group';
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  participants?: ConversationParticipant[];
  unreadCount?: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  version?: number;
}

/** 对话创建输入 */
export interface ConversationCreateInput {
  subject?: string;
  type?: 'direct' | 'group';
}

/** 对话参与者 */
export interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
  lastReadAt: Date;
  isMuted: boolean;
  leftAt?: Date;
  joinedAt: Date;
  createdAt: Date;
}

// 消息

/** 消息实体 */
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'image' | 'system';
  replyToId?: string;
  createdAt: Date;
  deletedAt?: Date;
  version?: number;
}

/** 消息创建输入 */
export interface MessageCreateInput {
  conversationId: string;
  senderId: string;
  content: string;
  messageType?: 'text' | 'image' | 'system';
  replyToId?: string;
}

// 用户排行榜条目

/** 用户排行榜条目 */
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

// 审计日志类型

/** 审计日志 */
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
}

/** 审计日志创建输入 */
export interface AuditLogCreateInput {
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
}

// 登录日志类型

/** 登录日志 */
export interface LoginLog {
  id: string;
  userId: string;
  loginTime: Date;
  logoutTime?: Date;
  durationMinutes: number;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  failReason?: string;
  createdAt: Date;
}

// 系统配置类型

/** 系统配置项 */
export interface SystemConfig {
  id: string;
  configKey: string;
  configValue: string;
  description?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** 管理员监控范围 */
export interface AdminMonitoringScope {
  id: string;
  adminId: string;
  monitoredUserId?: string;
  scopeType: 'user' | 'department' | 'tag';
  scopeValue?: string;
  createdAt: Date;
}

/** 用户权限变更日志 */
export interface UserPermissionChange {
  id: string;
  targetUserId: string;
  changedBy: string;
  changeType: 'role_change' | 'level_change' | 'status_change' | 'freeze' | 'unfreeze';
  oldValue?: string;
  newValue?: string;
  createdAt: Date;
}

// 点赞相关类型

/** 点赞记录 */
export interface Like {
  id: string;
  userId: string;
  targetType: 'review' | 'news' | 'community_post' | 'comment' | 'game';
  targetId: string;
  createdAt: Date;
  deletedAt?: Date;
  version?: number;
}

/** 点赞创建输入 */
export interface LikeCreateInput {
  userId: string;
  targetType: 'review' | 'news' | 'community_post' | 'comment' | 'game';
  targetId: string;
}

/** 点赞更新输入 */
export interface LikeUpdateInput {
  deletedAt?: Date;
}

// 关注相关类型

/** 关注记录 */
export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
  deletedAt?: Date;
  version?: number;
}

/** 关注创建输入 */
export interface FollowCreateInput {
  followerId: string;
  followingId: string;
}

/** 关注更新输入 */
export interface FollowUpdateInput {
  deletedAt?: Date;
}

// 收藏相关类型

/** 收藏记录 */
export interface Favorite {
  id: string;
  userId: string;
  gameId: string;
  createdAt: Date;
  deletedAt?: Date;
  version?: number;
}

/** 收藏创建输入 */
export interface FavoriteCreateInput {
  userId: string;
  gameId: string;
}

/** 收藏更新输入 */
export interface FavoriteUpdateInput {
  deletedAt?: Date;
}

// 通知相关类型

/** 通知实体 */
export interface Notification {
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'system' | 'marketing' | 'new_message' | 'achievement_unlocked' | 'level_up';
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  deletedAt?: Date;
  version?: number;
}

/** 通知创建输入 */
export interface NotificationCreateInput {
  userId: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'system' | 'marketing' | 'new_message' | 'achievement_unlocked' | 'level_up';
  title: string;
  message: string;
  data?: Record<string, any>;
}

/** 通知更新输入 */
export interface NotificationUpdateInput {
  isRead?: boolean;
  readAt?: Date;
  title?: string;
  message?: string;
  data?: Record<string, any>;
}

// 邮箱验证相关类型

/** 邮箱验证记录 */
export interface EmailVerification {
  id: string;
  userId: string;
  email: string;
  token: string;
  expiresAt: Date;
  verifiedAt?: Date;
  createdAt: Date;
  deletedAt?: Date;
  version?: number;
}

/** 邮箱验证创建输入 */
export interface EmailVerificationCreateInput {
  userId: string;
  email: string;
  token: string;
  expiresAt: Date;
}

/** 邮箱验证更新输入 */
export interface EmailVerificationUpdateInput {
  verifiedAt?: Date;
  expiresAt?: Date;
  deletedAt?: Date;
  version?: number;
}

// 密码重置相关类型

/** 密码重置记录 */
export interface PasswordReset {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
  deletedAt?: Date;
  version?: number;
}

/** 密码重置创建输入 */
export interface PasswordResetCreateInput {
  userId: string;
  token: string;
  expiresAt: Date;
}

/** 密码重置更新输入 */
export interface PasswordResetUpdateInput {
  usedAt?: Date;
  expiresAt?: Date;
  deletedAt?: Date;
  version?: number;
}

// 攻略指南相关类型

/** 攻略步骤 */
export interface GuideStep {
  title: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
}

/** 攻略难度等级 */
export type GuideDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

/** 攻略指南实体 */
export interface Guide {
  id: string;
  title: string;
  /** 主标题：用于生成 URL slug 后缀 */
  maintitle?: string;
  content: string;
  summary?: string;
  difficulty: GuideDifficulty;
  gameId: string;
  authorId: string;
  coverImageUrl?: string;
  tags: string[];
  steps: GuideStep[];
  isFeatured: boolean;
  isPublished: boolean;
  likes: number;
  views: number;
  estimatedMinutes?: number;
  createdAt: Date;
  updatedAt: Date;

  // 审核字段
  reviewStatus?: ReviewStatus;
  reviewComment?: string;
  reviewedBy?: string;
  reviewedAt?: Date;

  deletedAt?: Date;
  version?: number;

  // 多语言翻译内容
  translations?: ContentTranslations;
}

/** 攻略指南创建输入 */
export interface GuideCreateInput {
  title: string;
  /** 主标题：用于生成 URL slug 后缀 */
  maintitle?: string;
  content: string;
  summary?: string;
  difficulty?: GuideDifficulty;
  gameId: string;
  coverImageUrl?: string;
  tags?: string[];
  steps?: GuideStep[];
  estimatedMinutes?: number;
  reviewStatus?: ReviewStatus;
  translations?: ContentTranslations;
}

/** 攻略指南更新输入 */
export interface GuideUpdateInput {
  title?: string;
  maintitle?: string;
  content?: string;
  summary?: string;
  difficulty?: GuideDifficulty;
  coverImageUrl?: string;
  tags?: string[];
  steps?: GuideStep[];
  isFeatured?: boolean;
  isPublished?: boolean;
  estimatedMinutes?: number;
  reviewStatus?: ReviewStatus;
  reviewComment?: string;
  translations?: ContentTranslations;
}

// 导出游戏扩展类型
export * from './game-types';
