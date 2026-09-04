/**
 * API 服务层 - 统一数据访问接口
 *
 * 定义整个应用的 API 服务接口标准（BaseApiService 抽象类）
 * 及两个实现：
 * - RealApiService：连接真实后端服务器（Axios + 自动路由）
 * - MockApiService：使用本地 Mock 数据，用于开发和测试
 *
 * 根据环境配置自动选择使用真实 API 或 Mock API。
 * 覆盖所有业务模块：游戏、新闻、博客、评测、社区、用户认证、
 * 评论、搜索、通知、游戏库、关于页面、文件上传、邮件管理、
 * 关注/点赞、数据分析、用户画像、游戏化经验/积分、成就、
 * 私信、排行榜、AI 助手、图片转 3D、3D 打印等。
 *
 * @module api/index
 */

import apiClient, { adminApiClient } from './client';
import mockApiClient from './mockClient';
import i18n from '../i18n';
import type { ApiConfig, Game, NewsArticle, BlogArticle, Review, CommunityPost, User, PaginationParams, AuthResponseData, LoginRequest, RegisterRequest, LoginByPhoneRequest, RegisterByPhoneRequest, SendSmsCodeRequest, OAuthProvidersResponse, Favorite, FavoriteStatus, FavoriteStats, ReviewCreateRequest, ReviewUpdateRequest, Comment, CommentCreateInput, CommentStats, CommentLikeResponse, ParentType, SearchFilters, SearchResult, SearchSuggestion, NotificationQueryParams, Notification, UserGameLibrary, PlatformOwnership, AboutAllData, UploadConfig, UploadedFileInfo, UploadImageInfo, UploadDocumentInfo, EmailTemplate, EmailQueueStatus, EmailSendResult, EmailBulkSummary, FollowStatus, FollowStats, FollowUser, LikeStatus, LikeStats, LikeEntry, LikeTargetType, NewsCategory, NewsCategoryCreateInput, NewsCategoryUpdateInput, ReviewTemplate, ReviewTemplateCreateInput, ReviewTemplateUpdateInput, Guide, GuideCreateInput, GuideUpdateInput, GuideDifficulty, BlogCreateInput, BlogUpdateInput, TrendPoint } from './types';
import { LibraryStatus, PlatformType } from './types';
import type { UserGrowthPoint, GamePopularityItem, ContentEngagement, Distributions, ActiveUserData, ActiveUserDataPoint, DashboardStats, DashboardTrendPoint, AuditLogStat, UserTag, UserSegment, SegmentMember, BehaviorProfile, BehaviorDistributions, PeakHourData, AdvancedSearchFilters, RecommendationItem, LeaderboardEntry, SearchTrend, SearchTrendData, GameTrendData, DistributionData, CommunitySummary, XpTransaction, PointTransaction, GamificationStats, PlatformAchievement, UserPlatformAchievement, Conversation, Message, UserLeaderboardEntry, ImageTo3dTask } from './types';

/**
 * API 服务基类（抽象类）
 *
 * 定义所有业务模块的 API 接口标准。
 * 所有方法返回 Promise，子类（RealApiService / MockApiService）必须实现每个方法。
 * 覆盖整个应用的完整数据访问需求，包括：
 *
 * - 内容管理：游戏 CRUD、新闻 CRUD、博客 CRUD、评测 CRUD
 * - 社区功能：帖子管理、评论管理、攻略指南
 * - 用户系统：注册登录（邮箱/手机/OAuth）、密码重置、用户管理
 * - 互动功能：收藏、关注、点赞、私信
 * - 个性化：游戏库、成就、排行榜、
 * - 管理后台：用户管理、数据统计、用户画像、部署管理、备份恢复
 * - AI 功能：AI 对话、NPC 搜索、角色生成、图片转 3D
 * - 基础设施：文件上传、邮件管理、内容审核
 */
abstract class BaseApiService {
  abstract getGames(params?: PaginationParams): Promise<Game[]>;
  abstract getGame(id: string): Promise<Game>;
  abstract createGame(data: Record<string, unknown>): Promise<Game>;
  abstract updateGame(id: string, data: Record<string, unknown>): Promise<Game>;
  abstract deleteGame(id: string): Promise<void>;
  abstract getNews(params?: PaginationParams & { lang?: string }): Promise<NewsArticle[]>;
  abstract getNewsArticle(id: string, lang?: string): Promise<NewsArticle>;
  abstract createNewsArticle(data: Record<string, unknown>): Promise<NewsArticle>;
  abstract updateNewsArticle(id: string, data: Record<string, unknown>): Promise<NewsArticle>;
  abstract deleteNewsArticle(id: string): Promise<void>;
  abstract likeNewsArticle(id: string): Promise<{ likes: number; liked: boolean }>;
  abstract pinNewsArticle(id: string): Promise<NewsArticle>;
  abstract unpinNewsArticle(id: string): Promise<NewsArticle>;
  abstract getBlogPosts(params?: PaginationParams): Promise<BlogArticle[]>;
  abstract getBlogPost(id: string): Promise<BlogArticle>;
  abstract createBlogPost(data: BlogCreateInput): Promise<BlogArticle>;
  abstract updateBlogPost(id: string, data: BlogUpdateInput): Promise<BlogArticle>;
  abstract deleteBlogPost(id: string): Promise<void>;
  abstract getMyBlogPosts(params?: PaginationParams): Promise<BlogArticle[]>;
  abstract getBlogSpaces(): Promise<any[]>;
  abstract createBlogSpace(data: any): Promise<any>;
  abstract updateBlogSpace(id: string, data: any): Promise<any>;
  abstract deleteBlogSpace(id: string): Promise<void>;
  abstract getReviews(params?: PaginationParams): Promise<Review[]>;
  abstract getReview(id: string): Promise<Review>;
  abstract getCommunityPosts(params?: PaginationParams): Promise<CommunityPost[]>;
  abstract getCommunityPost(id: string): Promise<CommunityPost>;
  abstract getGamePosts(gameId: string, params?: PaginationParams): Promise<CommunityPost[]>;
  abstract getGameForumStats(params?: { page?: number; limit?: number; search?: string }): Promise<{ games: Game[]; total: number; page: number; limit: number }>;
  abstract followForum(forumType: string, forumId: string, forumName: string): Promise<void>;
  abstract unfollowForum(forumId: string): Promise<void>;
  abstract getFollowedForums(): Promise<any[]>;
  abstract createCommunityPost(data: Record<string, unknown>): Promise<CommunityPost>;
  abstract updateCommunityPost(id: string, data: Record<string, unknown>): Promise<CommunityPost>;
  abstract deleteCommunityPost(id: string): Promise<void>;
  abstract login(data: LoginRequest): Promise<AuthResponseData>;
  abstract register(data: RegisterRequest): Promise<AuthResponseData>;
  abstract loginByPhone(data: LoginByPhoneRequest): Promise<AuthResponseData>;
  abstract registerByPhone(data: RegisterByPhoneRequest): Promise<AuthResponseData>;
  abstract sendSmsCode(data: SendSmsCodeRequest): Promise<void>;
  abstract getOAuthProviders(): Promise<OAuthProvidersResponse>;
  abstract getOAuthUrl(provider: string): Promise<string>;
  abstract logout(): Promise<void>;
  abstract getCurrentUser(): Promise<User>;
  abstract getUsers(params?: PaginationParams): Promise<User[]>;
  abstract getAdminStats(): Promise<unknown>;
  abstract getAdminUsers(params?: PaginationParams): Promise<{ users: User[]; pagination: any }>;
  abstract getAdminUser(id: string): Promise<User>;
  abstract createAdminUser(data: Record<string, unknown>): Promise<User>;
  abstract updateAdminUser(id: string, data: Record<string, unknown>): Promise<User>;
  abstract deleteAdminUser(id: string): Promise<void>;
  abstract batchDeleteAdminUsers(ids: string[]): Promise<void>;
  abstract changeUserRole(id: string, role: string): Promise<User>;
  abstract freezeUserComment(id: string, frozen: boolean, until?: string): Promise<User>;
  abstract getAuditLogs(params?: Record<string, unknown>): Promise<{ logs: any[]; total: number }>;
  abstract getLoginLogs(params?: Record<string, unknown>): Promise<{ logs: any[]; total: number }>;
  abstract getSystemConfigs(): Promise<any[]>;
  abstract updateSystemConfig(key: string, value: string, description?: string): Promise<void>;
  abstract batchUpdateSystemConfig(configs: Record<string, string>): Promise<void>;

  // ==================== 部署管理 ====================
  abstract getDeployments(params?: Record<string, unknown>): Promise<{ deployments: any[]; pagination: any }>;
  abstract createDeployment(data: { version: string; description?: string; branch?: string; commit_hash?: string }): Promise<any>;
  abstract getDeployment(id: string): Promise<any>;
  abstract updateDeploymentStatus(id: string, status: string, log?: string): Promise<void>;
  abstract rollbackDeployment(id: string): Promise<any>;
  abstract deleteDeployment(id: string): Promise<void>;

  // ==================== 备份恢复 ====================
  abstract getBackups(params?: Record<string, unknown>): Promise<{ backups: any[]; pagination: any }>;
  abstract createBackup(description?: string): Promise<any>;
  abstract restoreBackup(id: string): Promise<any>;
  abstract deleteBackup(id: string): Promise<void>;

  // ==================== 新闻分类管理 ====================
  abstract getNewsCategories(): Promise<NewsCategory[]>;
  abstract createNewsCategory(data: NewsCategoryCreateInput): Promise<NewsCategory>;
  abstract updateNewsCategory(id: string, data: NewsCategoryUpdateInput): Promise<NewsCategory>;
  abstract deleteNewsCategory(id: string): Promise<void>;

  // ==================== 评测模板管理 ====================
  abstract getReviewTemplates(): Promise<ReviewTemplate[]>;
  abstract createReviewTemplate(data: ReviewTemplateCreateInput): Promise<ReviewTemplate>;
  abstract updateReviewTemplate(id: string, data: ReviewTemplateUpdateInput): Promise<ReviewTemplate>;
  abstract deleteReviewTemplate(id: string): Promise<void>;

  // ==================== 内容审核 ====================
  abstract getReviewQueue(params?: { page?: number; limit?: number; type?: string; status?: string }): Promise<{ items: import('./types').ReviewQueueItem[]; pagination: { page: number; limit: number; total: number } }>;
  abstract getReviewStats(): Promise<import('./types').ReviewStats[]>;
  abstract approveContent(type: string, id: string): Promise<void>;
  abstract rejectContent(type: string, id: string, comment: string): Promise<void>;

  abstract healthCheck(): Promise<{ status: string }>;
  abstract forgotPassword(email: string): Promise<void>;
  abstract resetPassword(resetToken: string, newPassword: string): Promise<void>;

  // ==================== 收藏相关方法 ====================
  abstract addFavorite(gameId: string): Promise<Favorite>;
  abstract removeFavorite(gameId: string): Promise<void>;
  abstract checkFavorite(gameId: string): Promise<FavoriteStatus>;
  abstract batchCheckFavorite(gameIds: string[]): Promise<Record<string, boolean>>;
  abstract getUserFavorites(params?: PaginationParams): Promise<Favorite[]>;
  abstract getFavoriteStats(): Promise<FavoriteStats>;
  abstract getGameFavoriteCount(gameId: string): Promise<number>;

  // ==================== 评测相关方法 ====================
  abstract createReview(data: ReviewCreateRequest): Promise<Review>;
  abstract updateReview(id: string, data: ReviewUpdateRequest): Promise<Review>;
  abstract deleteReview(id: string): Promise<void>;
  abstract getGameReviews(gameId: string, params?: PaginationParams): Promise<Review[]>;
  abstract likeReview(id: string): Promise<Review>;

  // ==================== 攻略指南相关方法 ====================
  abstract getGuides(params?: PaginationParams): Promise<Guide[]>;
  abstract getGuide(id: string): Promise<Guide>;
  abstract getGameGuides(gameId: string, params?: PaginationParams): Promise<Guide[]>;
  abstract createGuide(data: GuideCreateInput): Promise<Guide>;
  abstract updateGuide(id: string, data: GuideUpdateInput): Promise<Guide>;
  abstract deleteGuide(id: string): Promise<void>;
  abstract likeGuide(id: string): Promise<Guide>;

  // ==================== 评论相关方法 ====================
  abstract getComments(parentType: string, parentId: string, params?: PaginationParams): Promise<Comment[]>;
  abstract getComment(id: string): Promise<Comment>;
  abstract getCommentReplies(commentId: string, params?: PaginationParams): Promise<Comment[]>;
  abstract createComment(data: CommentCreateInput): Promise<Comment>;
  abstract updateComment(commentId: string, content: string): Promise<Comment>;
  abstract deleteComment(commentId: string): Promise<void>;
  abstract likeComment(commentId: string): Promise<CommentLikeResponse>;
  abstract searchComments(query: string, filters?: any, params?: PaginationParams): Promise<Comment[]>;
  abstract getCommentStats(parentType?: string, parentId?: string): Promise<CommentStats>;

  // ==================== 搜索相关方法 ====================
  abstract search(query: string, filters?: SearchFilters, params?: PaginationParams): Promise<SearchResult>;
  abstract getSearchSuggestions(query: string, limit?: number): Promise<SearchSuggestion[]>;
  abstract getPopularSearches(limit?: number): Promise<string[]>;

  // ==================== 通知相关方法 ====================
  abstract getNotifications(params?: NotificationQueryParams): Promise<Notification[]>;
  abstract getUnreadCount(): Promise<number>;
  abstract markAsRead(notificationId: string): Promise<void>;
  abstract markAllAsRead(): Promise<void>;

  // ==================== 管理员通知管理 ====================
  abstract getNotificationStats(): Promise<{ total: number; unread: number; byType: Record<string, number> }>;
  abstract deleteNotification(id: string): Promise<void>;
  abstract deleteAllNotifications(): Promise<void>;
  abstract sendSystemNotification(data: {
    title: string;
    message: string;
    type?: string;
    targetUrl?: string;
  }): Promise<void>;
  abstract sendMarketingNotification(data: {
    title: string;
    message: string;
    targetUserIds?: string[];
    targetUrl?: string;
    scheduledAt?: string;
  }): Promise<void>;

  // ==================== 游戏库相关方法 ====================
  abstract getUserGameLibrary(params?: {
    status?: LibraryStatus;
    platform?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
    search?: string;
  }): Promise<{ games: UserGameLibrary[]; pagination: any }>;
  abstract getLibraryStats(): Promise<{
    totalGames: number;
    byStatus: Record<string, number>;
    byPlatform: Record<string, number>;
    totalPlayTime: number;
    averageRating?: number;
  }>;
  abstract addGameToLibrary(data: {
    gameId: string;
    status: LibraryStatus;
    platforms: PlatformOwnership[];
    personalRating?: number;
    personalNotes?: string;
    tags?: string[];
    primaryPlatform?: PlatformType;
  }): Promise<UserGameLibrary>;
  abstract updateGameLibraryEntry(libraryId: string, data: {
    status?: LibraryStatus;
    platforms?: PlatformOwnership[];
    personalRating?: number;
    personalNotes?: string;
    tags?: string[];
    primaryPlatform?: PlatformType;
  }): Promise<UserGameLibrary>;
  abstract removeGameFromLibrary(libraryId: string): Promise<void>;
  abstract searchUserLibrary(query: string, options?: {
    status?: LibraryStatus;
    platform?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ games: UserGameLibrary[]; total: number }>;
  abstract getLibraryEntryDetails(libraryId: string): Promise<{
    libraryEntry: UserGameLibrary;
    gameDetails: Game;
  }>;
  abstract updateLastPlayed(gameId: string): Promise<void>;
  abstract importExternalLibrary(externalData: Array<{
    gameId: string;
    gameTitle: string;
    gameSlug: string;
    status: LibraryStatus;
    platforms: PlatformOwnership[];
    purchaseDate?: Date;
  }>): Promise<number>;
  abstract getBatchLibraryStatus(gameIds: string[]): Promise<Record<string, boolean>>;

  // ==================== 关于页面相关方法 ====================
  abstract getAboutData(): Promise<AboutAllData>;
  abstract updateAboutSection(key: string, data: { title?: string; description?: string | null; imageUrl?: string | null }): Promise<void>;
  abstract updateAboutValue(id: number, data: { icon?: string; title?: string; description?: string | null }): Promise<void>;
  abstract updateAboutTeamMember(id: number, data: { name?: string; role?: string; avatarUrl?: string | null; description?: string | null }): Promise<void>;
  abstract updateAboutTimeline(id: number, data: { year?: string; title?: string | null; description?: string | null }): Promise<void>;
  abstract updateAboutContact(id: number, data: { label?: string; value?: string }): Promise<void>;

  // ==================== 文件上传方法 ====================
  abstract getUploadConfig(): Promise<{ config: UploadConfig; features: string[] }>;
  abstract getUploadedFiles(params?: { page?: number; limit?: number }): Promise<{ files: UploadedFileInfo[]; pagination: { page: number; limit: number; total: number } }>;
  abstract uploadFile(file: File): Promise<UploadedFileInfo>;
  abstract uploadImage(file: File): Promise<UploadImageInfo>;
  abstract uploadDocument(file: File): Promise<UploadDocumentInfo>;
  abstract getFileInfo(filename: string): Promise<UploadedFileInfo>;
  abstract deleteFile(filename: string): Promise<void>;

  // ==================== 邮件管理方法 ====================
  abstract getEmailTemplates(params?: PaginationParams): Promise<{ templates: EmailTemplate[]; pagination: any }>;
  abstract getEmailTemplate(id: string): Promise<EmailTemplate>;
  abstract createEmailTemplate(data: Record<string, unknown>): Promise<EmailTemplate>;
  abstract updateEmailTemplate(id: string, data: Record<string, unknown>): Promise<EmailTemplate>;
  abstract deleteEmailTemplate(id: string): Promise<void>;
  abstract duplicateEmailTemplate(id: string, newName: string): Promise<EmailTemplate>;
  abstract renderEmailTemplate(id: string, variables?: Record<string, string>): Promise<{ rendered: string; variables: Record<string, string> }>;
  abstract sendTestEmail(to: string, templateType: string, variables?: Record<string, string>): Promise<EmailSendResult>;
  abstract sendBulkEmail(data: { recipients: string[]; templateType: string; templateName?: string; variables?: Record<string, string> }): Promise<{ results: EmailSendResult[]; summary: EmailBulkSummary }>;
  abstract getEmailQueueStatus(): Promise<EmailQueueStatus>;
  abstract clearEmailQueue(): Promise<void>;

  // ==================== 关注相关方法 ====================
  abstract followUser(userId: string): Promise<void>;
  abstract unfollowUser(userId: string): Promise<void>;
  abstract getFollowers(userId: string, params?: PaginationParams): Promise<{ followers: FollowUser[]; pagination: any }>;
  abstract getFollowing(userId: string, params?: PaginationParams): Promise<{ following: FollowUser[]; pagination: any }>;
  abstract getFollowStatus(userId: string): Promise<FollowStatus>;
  abstract getFollowStats(userId?: string): Promise<FollowStats>;
  abstract getMutualFollows(userId: string): Promise<{ mutualFollows: FollowUser[]; count: number }>;

  // ==================== 点赞相关方法 ====================
  abstract addLike(targetType: LikeTargetType, targetId: string): Promise<void>;
  abstract removeLike(targetType: LikeTargetType, targetId: string): Promise<void>;
  abstract getLikeStatus(targetType: LikeTargetType, targetId: string): Promise<LikeStatus>;
  abstract getTargetLikes(targetType: LikeTargetType, targetId: string, params?: PaginationParams): Promise<{ likes: LikeEntry[]; pagination: any }>;
  abstract getUserLikes(params?: PaginationParams): Promise<{ likes: LikeEntry[]; pagination: any }>;
  abstract getLikeStats(targetType?: string, targetId?: string): Promise<LikeStats>;

  // ==================== 邮箱验证 ====================
  abstract verifyEmail(token: string): Promise<void>;
  abstract checkVerificationToken(token: string): Promise<{ valid: boolean }>;
  abstract resendVerificationEmail(email: string): Promise<void>;
  abstract checkEmail(email: string): Promise<{ available: boolean }>;

  // ==================== 数据分析方法 ====================
  abstract getUserGrowthTrend(period?: string, days?: number): Promise<UserGrowthPoint[]>;
  abstract getGamePopularity(sortBy?: string, limit?: number): Promise<GamePopularityItem[]>;
  abstract getContentEngagement(days?: number): Promise<ContentEngagement>;
  abstract getDistributions(): Promise<Distributions>;
  abstract getActiveUsers(days?: number): Promise<ActiveUserData>;
  abstract getDashboardStats(): Promise<DashboardStats>;
  abstract getAuditLogStats(days?: number): Promise<AuditLogStat[]>;

  // ==================== 发现/推荐方法 ====================
  abstract advancedSearch(query: string, filters?: AdvancedSearchFilters, params?: PaginationParams): Promise<SearchResult>;
  abstract getPersonalizedRecommendations(limit?: number): Promise<RecommendationItem[]>;
  abstract getRelatedContent(contentType: string, id: string, limit?: number): Promise<RecommendationItem[]>;
  abstract getTrendingContent(limit?: number): Promise<RecommendationItem[]>;
  abstract getUsersAlsoLiked(gameId: string, limit?: number): Promise<RecommendationItem[]>;
  abstract getLeaderboard(type: string, limit?: number): Promise<{ type: string; entries: LeaderboardEntry[] }>;
  abstract getSearchTrendData(days?: number): Promise<SearchTrendData[]>;
  abstract getSearchTrends(topN?: number, days?: number): Promise<SearchTrend[]>;
  abstract getGameTrends(days?: number, limit?: number): Promise<GameTrendData[]>;
  abstract getDiscoveryDistributions(): Promise<DistributionData>;
  abstract getCommunitySummary(): Promise<CommunitySummary>;

  // ==================== 用户画像方法 ====================
  abstract getProfilingTags(): Promise<UserTag[]>;
  abstract createProfilingTag(name: string, color?: string, description?: string): Promise<UserTag>;
  abstract deleteProfilingTag(id: number): Promise<void>;
  abstract assignTagToUser(userId: string, tagId: number): Promise<void>;
  abstract removeTagFromUser(userId: string, tagId: number): Promise<void>;
  abstract getUserTags(userId: string): Promise<UserTag[]>;
  abstract getSegments(): Promise<UserSegment[]>;
  abstract createSegment(data: { name: string; description?: string; criteria?: any; isDynamic?: boolean }): Promise<UserSegment>;
  abstract updateSegment(id: number, data: { name?: string; description?: string; criteria?: any; isDynamic?: boolean }): Promise<UserSegment>;
  abstract deleteSegment(id: number): Promise<void>;
  abstract getSegmentMembers(segmentId: number, page?: number, limit?: number): Promise<{ members: SegmentMember[]; total: number }>;
  abstract addMemberToSegment(segmentId: number, userId: string): Promise<void>;
  abstract removeMemberFromSegment(segmentId: number, userId: string): Promise<void>;
  abstract evaluateDynamicSegment(segmentId: number): Promise<{ affected: number }>;
  abstract getBehaviorProfile(userId: string): Promise<BehaviorProfile>;
  abstract getBehaviorDistributions(): Promise<BehaviorDistributions>;
  abstract getPeakLoginHours(days?: number): Promise<PeakHourData[]>;

  // ==================== 游戏化（经验/积分）====================
  abstract getGamificationStats(): Promise<GamificationStats>;
  abstract getXpHistory(params?: PaginationParams): Promise<{ items: XpTransaction[]; pagination: any }>;
  abstract getPointHistory(params?: PaginationParams): Promise<{ items: PointTransaction[]; pagination: any }>;

  // ==================== 成就系统 ====================
  abstract getPlatformAchievements(userId?: string): Promise<PlatformAchievement[]>;
  abstract getUserAchievements(userId?: string): Promise<UserPlatformAchievement[]>;
  abstract getAchievementStats(): Promise<{ unlocked: number; total: number; recentUnlocks: UserPlatformAchievement[] }>;

  // ==================== 私信系统 ====================
  abstract getConversations(params?: PaginationParams): Promise<{ items: Conversation[]; pagination: any; unreadTotal: number }>;
  abstract getConversation(id: string, params?: PaginationParams): Promise<{ conversation: Conversation; messages: Message[] }>;
  abstract sendMessage(conversationId: string, content: string, replyToId?: string): Promise<Message>;
  abstract createConversation(participantId: string, subject?: string): Promise<Conversation>;
  abstract markConversationRead(conversationId: string): Promise<void>;
  abstract getMessageUnreadCount(): Promise<number>;
  abstract deleteMessage(conversationId: string, messageId: string): Promise<void>;
  abstract clearConversation(conversationId: string): Promise<void>;

  // ==================== 用户排行榜 ====================
  abstract getUserLeaderboard(type: string, limit?: number, page?: number): Promise<{ items: UserLeaderboardEntry[]; pagination: any }>;

  // ==================== AI 助手 ====================
  abstract soulstationChat(messages: Array<{ role: string; content: string }>): Promise<{ reply: string }>;
  abstract gameNpcSearch(params: { query: string }): Promise<{ guides: any[]; videos: any[]; fanart: any[] }>;
  abstract gameCompanionRecommend(params: { gameName: string; answers: string[] }): Promise<{ recommendations: any[]; matchedGame: string | null }>;
  abstract generateCharacterPortrait(params: Record<string, any>): Promise<{ description: string }>;
  // ==================== AI 图片转 3D ====================
  abstract submitImageTo3d(imageUrl: string): Promise<{ taskId: string }>;
  abstract getImageTo3dTask(taskId: string): Promise<ImageTo3dTask>;

  // ==================== 3D 打印 ====================
  abstract submitPrintOrder(data: {
    modelData: string;
    size?: number;
    material?: string;
    color?: string;
    quantity?: number;
  }): Promise<{ orderId: string; status: string; createdAt: string }>;
  abstract getPrintOrder(id: string): Promise<{
    id: string;
    size: number;
    material: string;
    color: string;
    quantity: number;
    status: string;
    createdAt: string;
  }>;

  // ==================== AI 历史记录 ====================
  abstract getAiHistory(type?: string): Promise<any[]>;
  abstract getAiHistoryDetail(id: string): Promise<any>;
  abstract saveAiHistory(data: { type: string; title: string; content: any }): Promise<any>;
  abstract deleteAiHistory(id: string): Promise<void>;

  // ==================== 博客空间内容 ====================
  abstract getSpaceContent(spaceId: string, params?: any): Promise<any>;
  abstract getSpaceDetail(slug: string): Promise<any>;
  abstract getSpacePopularArticle(spaceId: string): Promise<any>;
  abstract getSpaceArticlesByCategory(spaceId: string, postType: string, params?: any): Promise<{ articles: any[]; total: number }>;

  // ==================== Banner 和推荐内容 ====================
  abstract getBanners(position?: string): Promise<any[]>;
  abstract getFeaturedContent(type?: string): Promise<any[]>;

  // ==================== 兑换码系统 ====================
  abstract getRedeemCodes(): Promise<any[]>;
  abstract getRedeemCodeDetail(code: string): Promise<any>;
  abstract redeemCode(code: string): Promise<{ code: string; title: string; reward_type: string; reward_value: string }>;
  abstract getMyRedeemHistory(): Promise<any[]>;
}

/**
 * 真实 API 服务实现
 *
 * 使用 Axios 客户端连接真实后端服务器。
 * 特性：
 * - 智能路由：根据 URL 前缀自动区分公共 API 和管理 API
 *   （/admin/ 前缀路由到管理服务器，其他路由到公共服务器）
 * - 数据标准化：将后端字段名映射为前端所需格式
 * - URL 安全编码：对查询参数中的非 ASCII 字符进行编码
 *
 * @extends BaseApiService
 */
class RealApiService extends BaseApiService {
  private _publicClient: typeof apiClient;
  private _adminClient: typeof adminApiClient;

  constructor(config?: Partial<ApiConfig>) {
    super();
    if (config) {
      apiClient.updateConfig(config);
    }
    this._publicClient = apiClient;
    this._adminClient = adminApiClient;
  }

  /**
   * 智能路由客户端：
   * - URL 以 /admin/ 开头 → 使用管理服务器（端口 3002）
   * - 其他 → 使用公共服务器（端口 3001）
   * 不再依赖当前页面路径，避免管理员页面请求公共 API 路由到错误服务器
   */
  private get client(): typeof apiClient {
    if (typeof window === 'undefined') return this._publicClient;

    const self = this;
    return new Proxy(this._publicClient, {
      get(target, prop: string | symbol) {
        // 避免被误识别为 Promise/thenable
        if (prop === 'then' || prop === Symbol.toPrimitive) return undefined;

        const method = (target as any)[prop];
        if (typeof method !== 'function') return Reflect.get(target, prop);

        return (...args: any[]) => {
          // 支持 string URL（get/post/put/delete）和 config 对象（request）
          const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
          if (url.startsWith('/admin/')) {
            const adminMethod = (self._adminClient as any)[prop];
            return adminMethod.apply(self._adminClient, args);
          }
          return method.apply(target, args);
        };
      },
    }) as typeof apiClient;
  }

  // 标准化评测数据：将后端字段名映射为前端字段名
  private normalizeReview(item: any): Review {
    // 处理 author：可能是字符串、对象或通过 authorName/authorDisplayName 字段
    let author: string;
    if (typeof item.author === 'string') {
      author = item.author;
    } else if (item.author?.username) {
      author = item.author.displayName || item.author.username;
    } else {
      author = item.authorName || item.authorDisplayName || '';
    }

    // 处理 gameTitle：可能是直接字段或嵌套在 game 对象中
    const gameTitle = item.gameTitle || item.game?.title || '';

    return {
      id: item.id,
      gameId: item.gameId,
      gameTitle,
      title: item.title,
      content: item.content,
      author,
      authorId: item.authorId || item.author?.id?.toString() || item.author_id?.toString(),
      rating: item.rating,
      publishDate: item.publishDate || item.publishedAt || '',
      likes: item.likes || 0,
      comments: item.comments || 0,
      tags: Array.isArray(item.tags) ? item.tags : [],
      isFeatured: Boolean(item.isFeatured ?? item.is_featured),
      scores: item.scores || undefined,
      templateId: item.templateId || undefined,
      sections: item.sections || undefined,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      reviewStatus: item.reviewStatus || item.review_status,
    };
  }

  /** 对URL查询参数中的非ASCII字符进行编码，避免中文导致图片加载失败 */
  private safeEncodeUrl(url: string): string {
    try {
      const qi = url.indexOf('?');
      if (qi === -1) return url;
      const base = url.slice(0, qi);
      const query = url.slice(qi + 1);
      const encoded = query.split('&').map(pair => {
        const eq = pair.indexOf('=');
        if (eq === -1) return encodeURIComponent(pair);
        const key = pair.slice(0, eq);
        const val = pair.slice(eq + 1);
        return `${encodeURIComponent(decodeURIComponent(key))}=${encodeURIComponent(decodeURIComponent(val))}`;
      }).join('&');
      return `${base}?${encoded}`;
    } catch { return url; }
  }

  private normalizeGame(game: any): Game {
    return {
      ...game,
      id: String(game.id),
      imageUrl: game.imageUrl || game.coverImageUrl || '',
      releaseDate: game.releaseDate ? String(game.releaseDate).split('T')[0] : '',
      coverImageUrl: game.coverImageUrl ? this.safeEncodeUrl(game.coverImageUrl) : '',
    };
  }

  async getGames(params?: PaginationParams) {
    const response = await this.client.get<{ games: Game[]; pagination: any }>('/games', params);
    return (response.games || []).map((game: any) => this.normalizeGame(game));
  }

  async getGame(id: string) {
    const game = await this.client.get<any>(`/games/${id}`);
    return this.normalizeGame(game);
  }

  async createGame(data: Record<string, unknown>): Promise<Game> {
    const gameData = { ...data };
    // 前端使用 imageUrl，后端使用 coverImageUrl
    if (gameData.imageUrl && !gameData.coverImageUrl) {
      gameData.coverImageUrl = gameData.imageUrl;
      delete gameData.imageUrl;
    }
    return this.client.post<Game>('/games', gameData);
  }

  async updateGame(id: string, data: Record<string, unknown>): Promise<Game> {
    const gameData = { ...data };
    if (gameData.imageUrl && !gameData.coverImageUrl) {
      gameData.coverImageUrl = gameData.imageUrl;
      delete gameData.imageUrl;
    }
    return this.client.put<Game>(`/games/${id}`, gameData);
  }

  async deleteGame(id: string): Promise<void> {
    await this.client.delete(`/games/${id}`);
  }

  async getNews(params?: PaginationParams & { lang?: string }) {
    const lang = params?.lang || i18n.language;
    const response = await this.client.get<{ news: any[]; pagination: any }>('/news', { ...params, lang });
    return (response.news || []).map((item: any) => ({
      id: item.id,
      slug: item.slug || '',
      title: item.title,
      summary: item.excerpt || item.summary || '',
      content: item.content || '',
      author: item.authorName || item.authorDisplayName || item.author || String(item.authorId || ''),
      publishDate: item.publishedAt ? String(item.publishedAt) : item.publishDate ? String(item.publishDate) : '',
      category: item.category || '',
      tags: Array.isArray(item.tags) ? item.tags : [],
      imageUrl: item.coverImageUrl || item.imageUrl || '',
      views: item.views || 0,
      likes: item.likes || 0,
      isPinned: Boolean(item.isPinned ?? item.is_pinned),
      reviewStatus: item.reviewStatus || item.review_status || 'pending',
      translations: item.translations,
    }));
  }

  async getNewsArticle(id: string, lang?: string) {
    const response = await this.client.get<any>(`/news/${id}`, { lang: lang || i18n.language });
    const item = response;
    return {
      id: item.id,
      slug: item.slug || '',
      title: item.title,
      summary: item.excerpt || item.summary || '',
      content: item.content || '',
      author: item.authorName || item.authorDisplayName || item.author || String(item.authorId || ''),
      publishDate: item.publishedAt ? String(item.publishedAt) : item.publishDate ? String(item.publishDate) : '',
      category: item.category || '',
      tags: Array.isArray(item.tags) ? item.tags : [],
      imageUrl: item.coverImageUrl || item.imageUrl || '',
      views: item.views || 0,
      likes: item.likes || 0,
      isPinned: Boolean(item.isPinned ?? item.is_pinned),
      translations: item.translations,
    } as NewsArticle;
  }

  async createNewsArticle(data: Record<string, unknown>): Promise<NewsArticle> {
    return this.client.post<NewsArticle>('/news', data);
  }

  async updateNewsArticle(id: string, data: Record<string, unknown>): Promise<NewsArticle> {
    return this.client.put<NewsArticle>(`/news/${id}`, data);
  }

  async deleteNewsArticle(id: string): Promise<void> {
    await this.client.delete(`/news/${id}`);
  }

  async likeNewsArticle(id: string): Promise<{ likes: number; liked: boolean }> {
    const r = await this.client.post<any>(`/news/${id}/like`);
    return { likes: r.likes, liked: r.liked };
  }

  async pinNewsArticle(id: string): Promise<NewsArticle> {
    const r = await this.client.post<any>(`/news/${id}/pin`);
    return r.data || r;
  }

  async unpinNewsArticle(id: string): Promise<NewsArticle> {
    const r = await this.client.post<any>(`/news/${id}/unpin`);
    return r.data || r;
  }

  async getBlogPosts(params?: PaginationParams) {
    try {
      const res = await this.client.get<any>('/blogs', params);
      const list = res.articles || res.blogs || [];
      return list.map((item: any) => ({
        id: item.id, title: item.title, slug: item.slug || item.id,
        excerpt: item.excerpt || '', content: item.content || '',
        author: item.authorName || item.author || '',
        publishDate: item.publishedAt || item.publishDate || item.createdAt,
        category: item.category || '博客', tags: item.tags || [],
        coverImage: item.coverImageUrl || '',
        readingTime: Math.max(1, Math.ceil((item.content?.length || 0) / 500)),
        views: item.views || 0, likes: item.likes || 0, featured: false,
        spaceId: item.spaceId, spaceName: item.spaceName, spaceSlug: item.spaceSlug,
      postType: item.postType || 'blog', rating: item.rating || null, gameId: item.gameId || null, reviewStatus: item.reviewStatus || item.review_status,
      } as any));
    } catch { return []; }
  }

  async getSpaceContent(spaceId: string, params?: any) { return this.client.get<any>(`/blogs/space/${spaceId}/content`, params); }
  async getSpaceDetail(slug: string) { return this.client.get<any>('/blogs/space/detail', { slug }); }
  async getSpacePopularArticle(spaceId: string) { return this.client.get<any>(`/blogs/space/${spaceId}/popular`); }
  async getSpaceArticlesByCategory(spaceId: string, postType: string, params?: any) {
    return this.client.get<{ articles: any[]; total: number }>(`/blogs/space/${spaceId}/category/${postType}`, params);
  }
  async getBlogSpaces() { return this.client.get<any[]>('/blog-spaces'); }
  async createBlogSpace(data: any) { return this.client.post<any>('/blog-spaces', data); }
  async updateBlogSpace(id: string, data: any) { return this.client.put<any>(`/blog-spaces/${id}`, data); }
  async deleteBlogSpace(id: string) { await this.client.delete(`/blog-spaces/${id}`); }

  async getBlogPost(id: string): Promise<BlogArticle> {
    const response = await this.client.get<any>(`/blogs/${id}`);
    const item = response;
    return {
      id: item.id,
      title: item.title,
      slug: item.slug || item.id,
      excerpt: item.excerpt || item.summary || '',
      content: item.content || '',
      author: item.authorName || item.author || '',
      authorAvatar: item.authorAvatar || '',
      authorBio: item.authorBio || '',
      publishDate: item.publishedAt || item.publishDate || item.createdAt,
      category: item.category || '博客',
      tags: item.tags || [],
      coverImage: item.coverImageUrl || item.imageUrl || '',
      readingTime: Math.max(1, Math.ceil((item.content?.length || 0) / 500)),
      views: item.views || 0,
      likes: item.likes || 0,
      featured: item.isFeatured || false,
      spaceId: item.spaceId,
      spaceName: item.spaceName,
      spaceSlug: item.spaceSlug,
      postType: item.postType || 'blog', rating: item.rating || null, gameId: item.gameId || null, reviewStatus: item.reviewStatus || item.review_status,
    } as any;
  }

  // ==================== Blog User Methods ====================
  async createBlogPost(data: BlogCreateInput): Promise<BlogArticle> {
    const response = await this.client.post<any>('/blogs', data);
    const item = response.data || response;
    return {
      id: item.id,
      title: item.title,
      slug: item.slug || item.id,
      excerpt: item.excerpt || '',
      content: item.content || '',
      author: item.authorName || item.author || '',
      authorId: item.authorId || '',
      publishDate: item.publishedAt || item.createdAt,
      category: item.category || '博客',
      tags: item.tags || [],
      coverImage: item.coverImageUrl || '',
      readingTime: Math.max(1, Math.ceil((item.content?.length || 0) / 500)),
      views: item.views || 0,
      likes: item.likes || 0,
      featured: false,
      reviewStatus: item.reviewStatus || 'pending',
    };
  }

  async updateBlogPost(id: string, data: BlogUpdateInput): Promise<BlogArticle> {
    const response = await this.client.put<any>(`/blogs/${id}`, data);
    const item = response.data || response;
    return this.normalizeBlogArticle(item);
  }

  async deleteBlogPost(id: string): Promise<void> {
    await this.client.delete(`/blogs/${id}`);
  }

  async getMyBlogPosts(params?: PaginationParams): Promise<BlogArticle[]> {
    try {
      const response = await this.client.get<{ news: any[]; pagination: any }>('/news/my', params);
      return (response.news || []).map((item: any) => this.normalizeBlogArticle(item));
    } catch {
      return [];
    }
  }

  private normalizeBlogArticle(item: any): BlogArticle {
    return {
      id: item.id,
      title: item.title,
      slug: item.slug || item.id,
      excerpt: item.excerpt || '',
      content: item.content || '',
      author: item.authorName || item.authorDisplayName || item.author || '',
      authorId: item.authorId || '',
      authorAvatar: item.authorAvatar || '',
      authorBio: item.authorBio || '',
      publishDate: item.publishedAt || item.publishDate || item.createdAt,
      category: item.category || '博客',
      tags: item.tags || [],
      coverImage: item.coverImageUrl || item.coverImage || '',
      readingTime: Math.max(1, Math.ceil((item.content?.length || 0) / 500)),
      views: item.views || 0,
      likes: item.likes || 0,
      featured: item.isFeatured || false,
      reviewStatus: item.reviewStatus || 'pending',
      reviewComment: item.reviewComment || '',
    };
  }

  async getReviews(params?: PaginationParams) {
    const response = await this.client.get<{ reviews: Review[]; pagination: any }>('/community/reviews', params);
    return (response.reviews || []).map(r => this.normalizeReview(r));
  }

  async getReview(id: string) {
    const response = await this.client.get<any>(`/community/reviews/${id}`);
    return this.normalizeReview(response);
  }

  async getCommunityPosts(params?: PaginationParams) {
    const response = await this.client.get<{ data: { posts: CommunityPost[]; pagination: any } }>('/community/posts', params);
    const data: any = response.data || response;
    return (data.posts || []).map((p: any) => this.normalizeCommunityPost(p));
  }

  private normalizeCommunityPost(post: any): CommunityPost {
    return {
      id: post.id,
      title: post.title,
      content: post.content,
      author: post.author?.displayName || post.author?.username || post.authorName || post.author || '',
      authorId: post.authorId || post.author?.id,
      authorAvatar: post.author?.avatarUrl || post.authorAvatar,
      publishDate: post.publishDate || post.createdAt || '',
      likes: post.likes || 0,
      comments: post.comments || 0,
      tags: Array.isArray(post.tags) ? post.tags : [],
      category: post.category || '',
      isPinned: post.isPinned || false,
      isLocked: post.isLocked || false,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      gameId: post.gameId || post.game_id,
      gameTitle: post.gameTitle || post.game_title,
      reviewStatus: post.reviewStatus || post.review_status,
    };
  }

  async getCommunityPost(id: string) {
    const response = await this.client.get<any>(`/community/posts/${id}`);
    const post = response.data || response;
    return this.normalizeCommunityPost(post);
  }

  async getGamePosts(gameId: string, params?: PaginationParams): Promise<CommunityPost[]> {
    const response = await this.client.get<{ data: { posts: CommunityPost[]; pagination: any } }>(`/games/${gameId}/posts`, params);
    const data: any = response.data || response;
    return (data.posts || []).map((p: any) => this.normalizeCommunityPost(p));
  }

  async getGameForumStats(params?: { page?: number; limit?: number; search?: string }): Promise<{ games: Game[]; total: number; page: number; limit: number }> {
    const response = await this.client.get<{ data: { games: Game[]; pagination: any } }>('/games/forum-stats', params);
    const data: any = response.data || response;
    return {
      games: (data.games || []).map((g: any) => this.normalizeGame(g)),
      total: data.pagination?.total || 0,
      page: data.pagination?.page || 1,
      limit: data.pagination?.limit || 20,
    };
  }

  async createCommunityPost(data: Record<string, unknown>): Promise<CommunityPost> {
    return this.client.post<CommunityPost>('/community/posts', data);
  }

  async updateCommunityPost(id: string, data: Record<string, unknown>): Promise<CommunityPost> {
    return this.client.put<CommunityPost>(`/community/posts/${id}`, data);
  }

  async deleteCommunityPost(id: string): Promise<void> {
    await this.client.delete(`/community/posts/${id}`);
  }

  async login(data: LoginRequest) {
    return this.client.post<AuthResponseData>('/auth/login', data);
  }

  async register(data: RegisterRequest) {
    return this.client.post<AuthResponseData>('/auth/register', data);
  }

  async loginByPhone(data: LoginByPhoneRequest) {
    return this.client.post<AuthResponseData>('/auth/login/phone', data);
  }

  async registerByPhone(data: RegisterByPhoneRequest) {
    return this.client.post<AuthResponseData>('/auth/register/phone', data);
  }

  async sendSmsCode(data: SendSmsCodeRequest) {
    await this.client.post<void>('/auth/sms/send-code', data);
  }

  async getOAuthProviders() {
    return this.client.get<OAuthProvidersResponse>('/auth/oauth/providers');
  }

  async getOAuthUrl(provider: string) {
    return this.client.get<string>(`/auth/oauth/url/${provider}`);
  }

  async logout() {
    return this.client.post<void>('/auth/logout');
  }

  async getCurrentUser() {
    const response = await this.client.get<{ user: User }>('/auth/me');
    return response.user;
  }

  async getUsers(params?: PaginationParams) {
    const response = await this.client.get<{ users: User[]; pagination: any }>('/users', params);
    return response.users;
  }

  async getAdminStats() {
    return this.client.get<unknown>('/admin/dashboard/stats');
  }

  async getAdminUsers(params?: PaginationParams) {
    return this.client.get<{ users: User[]; pagination: any }>('/admin/users', params as Record<string, unknown>);
  }

  async getAdminUser(id: string) {
    return this.client.get<User>(`/admin/users/${id}`);
  }

  async createAdminUser(data: Record<string, unknown>) {
    return this.client.post<User>('/admin/users', data);
  }

  async updateAdminUser(id: string, data: Record<string, unknown>) {
    return this.client.put<User>(`/admin/users/${id}`, data);
  }

  async deleteAdminUser(id: string) {
    await this.client.delete(`/admin/users/${id}`);
  }

  async batchDeleteAdminUsers(ids: string[]) {
    await this.client.post('/admin/users/batch/delete', { userIds: ids });
  }

  async changeUserRole(id: string, role: string) {
    return this.client.put<User>(`/admin/users/${id}/role`, { role });
  }

  async freezeUserComment(id: string, frozen: boolean, until?: string) {
    return this.client.put<User>(`/admin/users/${id}/freeze-comment`, { frozen, until });
  }

  async getAuditLogs(params?: Record<string, unknown>) {
    return this.client.get<{ logs: any[]; total: number }>('/admin/audit-logs', params);
  }

  async getLoginLogs(params?: Record<string, unknown>) {
    return this.client.get<{ logs: any[]; total: number }>('/admin/login-logs', params);
  }

  async getSystemConfigs() {
    return this.client.get<any[]>('/admin/settings');
  }

  async updateSystemConfig(key: string, value: string, description?: string) {
    await this.client.put(`/admin/settings/${key}`, { value, description });
  }

  async batchUpdateSystemConfig(configs: Record<string, string>) {
    await this.client.put('/admin/settings', { configs });
  }

  // ==================== 新闻分类管理 ====================

  async getNewsCategories(): Promise<NewsCategory[]> {
    return this.client.get<NewsCategory[]>('/news/categories/list');
  }

  async createNewsCategory(data: NewsCategoryCreateInput): Promise<NewsCategory> {
    return this.client.post<NewsCategory>('/admin/categories', data);
  }

  async updateNewsCategory(id: string, data: NewsCategoryUpdateInput): Promise<NewsCategory> {
    return this.client.put<NewsCategory>(`/admin/categories/${id}`, data);
  }

  async deleteNewsCategory(id: string): Promise<void> {
    await this.client.delete(`/admin/categories/${id}`);
  }

  // ==================== 评测模板管理 ====================

  async getReviewTemplates(): Promise<ReviewTemplate[]> {
    return this.client.get<ReviewTemplate[]>('/admin/review-templates');
  }

  async createReviewTemplate(data: ReviewTemplateCreateInput): Promise<ReviewTemplate> {
    return this.client.post<ReviewTemplate>('/admin/review-templates', data);
  }

  async updateReviewTemplate(id: string, data: ReviewTemplateUpdateInput): Promise<ReviewTemplate> {
    return this.client.put<ReviewTemplate>(`/admin/review-templates/${id}`, data);
  }

  async deleteReviewTemplate(id: string): Promise<void> {
    await this.client.delete(`/admin/review-templates/${id}`);
  }

  // ==================== 内容审核 ====================
  async getReviewQueue(params?: { page?: number; limit?: number; type?: string; status?: string }) {
    return this.client.get<{ items: import('./types').ReviewQueueItem[]; pagination: { page: number; limit: number; total: number } }>('/admin/review/queue', params);
  }

  async getReviewStats() {
    return this.client.get<import('./types').ReviewStats[]>('/admin/review/stats');
  }

  async approveContent(type: string, id: string): Promise<void> {
    await this.client.put(`/admin/review/${type}/${id}/approve`, {});
  }

  async rejectContent(type: string, id: string, comment: string): Promise<void> {
    await this.client.put(`/admin/review/${type}/${id}/reject`, { comment });
  }

  async healthCheck() {
    return this.client.get<{ status: string }>('/health');
  }

  // ==================== 部署管理 ====================

  async getDeployments(params?: Record<string, unknown>) {
    return this.client.get<{ deployments: any[]; pagination: any }>('/admin/deployments', params);
  }

  async createDeployment(data: { version: string; description?: string; branch?: string; commit_hash?: string }) {
    return this.client.post<any>('/admin/deployments', data);
  }

  async getDeployment(id: string) {
    return this.client.get<any>(`/admin/deployments/${id}`);
  }

  async updateDeploymentStatus(id: string, status: string, log?: string) {
    await this.client.put(`/admin/deployments/${id}/status`, { status, log });
  }

  async rollbackDeployment(id: string) {
    return this.client.post<any>(`/admin/deployments/${id}/rollback`, {});
  }

  async deleteDeployment(id: string) {
    await this.client.delete(`/admin/deployments/${id}`);
  }

  // ==================== 备份恢复 ====================

  async getBackups(params?: Record<string, unknown>) {
    return this.client.get<{ backups: any[]; pagination: any }>('/admin/backups', params);
  }

  async createBackup(description?: string) {
    return this.client.post<any>('/admin/backups', { description });
  }

  async restoreBackup(id: string) {
    return this.client.post<any>(`/admin/backups/${id}/restore`, {});
  }

  async deleteBackup(id: string) {
    await this.client.delete(`/admin/backups/${id}`);
  }

  // ==================== 密码重置相关方法 ====================

  async forgotPassword(email: string): Promise<void> {
    await this.client.post('/auth/forgot-password', { email });
  }

  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    await this.client.post('/auth/reset-password', { resetToken, newPassword });
  }

  // 收藏相关方法实现
  async addFavorite(gameId: string): Promise<Favorite> {
    return this.client.post<Favorite>('/favorites', { gameId });
  }

  async removeFavorite(gameId: string): Promise<void> {
    return this.client.delete(`/favorites/${gameId}`);
  }

  async checkFavorite(gameId: string): Promise<FavoriteStatus> {
    return this.client.get<FavoriteStatus>(`/favorites/check/${gameId}`);
  }

  async batchCheckFavorite(gameIds: string[]): Promise<Record<string, boolean>> {
    const response = await this.client.post<{ statusMap: Record<string, boolean> }>('/favorites/batch-check', { gameIds });
    return response.statusMap;
  }

  async getUserFavorites(params?: PaginationParams): Promise<Favorite[]> {
    return this.client.get<Favorite[]>('/favorites', params);
  }

  async getFavoriteStats(): Promise<FavoriteStats> {
    const response = await this.client.get<{ stats: FavoriteStats }>('/favorites/stats');
    return response.stats;
  }

  async getGameFavoriteCount(gameId: string): Promise<number> {
    const response = await this.client.get<{ count: number }>(`/favorites/count/${gameId}`);
    return response.count;
  }

  // 评测相关方法实现
  async createReview(data: ReviewCreateRequest): Promise<Review> {
    return this.client.post<Review>('/community/reviews', data);
  }

  async updateReview(id: string, data: ReviewUpdateRequest): Promise<Review> {
    return this.client.put<Review>(`/community/reviews/${id}`, data);
  }

  async deleteReview(id: string): Promise<void> {
    return this.client.delete(`/community/reviews/${id}`);
  }

  async getGameReviews(gameId: string, params?: PaginationParams): Promise<Review[]> {
    const response = await this.client.get<{ reviews: any[]; pagination: any }>(`/games/${gameId}/reviews`, params);
    return (response.reviews || []).map(r => this.normalizeReview(r));
  }

  async likeReview(id: string): Promise<Review> {
    await this.client.post(`/community/reviews/${id}/like`);
    return this.getReview(id);
  }

  // ==================== 攻略指南 ====================

  private normalizeGuide(item: any): Guide {
    return {
      id: item.id,
      gameId: item.gameId,
      gameTitle: item.gameTitle || item.game?.title || '',
      gameSlug: item.gameSlug || item.game?.slug,
      title: item.title,
      content: item.content,
      summary: item.summary,
      difficulty: item.difficulty || 'medium',
      author: item.author || item.authorName || item.authorDisplayName || '',
      authorId: item.authorId,
      authorDisplayName: item.authorDisplayName,
      authorAvatar: item.authorAvatar,
      coverImageUrl: item.coverImageUrl,
      tags: Array.isArray(item.tags) ? item.tags : (typeof item.tags === 'string' ? JSON.parse(item.tags) : []),
      steps: Array.isArray(item.steps) ? item.steps : (typeof item.steps === 'string' ? JSON.parse(item.steps) : []),
      isFeatured: Boolean(item.isFeatured ?? item.is_featured),
      isPublished: item.isPublished !== false,
      likes: item.likes || 0,
      views: item.views || 0,
      estimatedMinutes: item.estimatedMinutes,
      createdAt: item.createdAt || item.created_at,
      updatedAt: item.updatedAt || item.updated_at,
      comments: item.comments || 0,
      reviewStatus: item.reviewStatus || item.review_status,
    };
  }

  async getGuides(params?: PaginationParams): Promise<Guide[]> {
    const response = await this.client.get<{ guides: Guide[]; pagination: any }>('/guides', params);
    return (response.guides || []).map(g => this.normalizeGuide(g));
  }

  async getGuide(id: string): Promise<Guide> {
    const response = await this.client.get<any>(`/guides/${id}`);
    return this.normalizeGuide(response);
  }

  async getGameGuides(gameId: string, params?: PaginationParams): Promise<Guide[]> {
    const response = await this.client.get<any[]>(`/guides/game/${gameId}`, params);
    return (Array.isArray(response) ? response : []).map(g => this.normalizeGuide(g));
  }

  async createGuide(data: GuideCreateInput): Promise<Guide> {
    return this.client.post<Guide>('/guides', data);
  }

  async updateGuide(id: string, data: GuideUpdateInput): Promise<Guide> {
    return this.client.put<Guide>(`/guides/${id}`, data);
  }

  async deleteGuide(id: string): Promise<void> {
    await this.client.delete(`/guides/${id}`);
  }

  async likeGuide(id: string): Promise<Guide> {
    await this.client.post(`/guides/${id}/like`);
    return this.getGuide(id);
  }

  // 评论相关方法实现
  async getComments(parentType: string, parentId: string, params?: PaginationParams): Promise<Comment[]> {
    return this.client.get<Comment[]>('/comments', { parentType, parentId, ...params });
  }

  async getComment(id: string): Promise<Comment> {
    return this.client.get<Comment>(`/comments/${id}`);
  }

  async getCommentReplies(commentId: string, params?: PaginationParams): Promise<Comment[]> {
    return this.client.get<Comment[]>(`/comments/${commentId}/replies`, params);
  }

  async createComment(data: CommentCreateInput): Promise<Comment> {
    return this.client.post<Comment>('/comments', data);
  }

  async updateComment(commentId: string, content: string): Promise<Comment> {
    return this.client.put<Comment>(`/comments/${commentId}`, { content });
  }

  async deleteComment(commentId: string): Promise<void> {
    await this.client.delete(`/comments/${commentId}`);
  }

  async likeComment(commentId: string): Promise<CommentLikeResponse> {
    return this.client.post<CommentLikeResponse>(`/comments/${commentId}/like`);
  }

  async searchComments(query: string, filters?: any, params?: PaginationParams): Promise<Comment[]> {
    return this.client.get<Comment[]>('/comments/search', { query, ...filters, ...params });
  }

  async getCommentStats(parentType?: string, parentId?: string): Promise<CommentStats> {
    return this.client.get<CommentStats>('/comments/stats', { parentType, parentId });
  }

  // 搜索相关方法实现
  async search(query: string, filters?: SearchFilters, params?: PaginationParams): Promise<SearchResult> {
    return this.client.get<SearchResult>('/search', { query, ...filters, ...params });
  }

  async getSearchSuggestions(query: string, limit?: number): Promise<SearchSuggestion[]> {
    const response = await this.client.get<{ suggestions: SearchSuggestion[] }>('/search/suggestions', { query, limit });
    return response.suggestions;
  }

  async getPopularSearches(limit?: number): Promise<string[]> {
    const response = await this.client.get<{ popularSearches: string[] }>('/search/popular', { limit });
    return response.popularSearches;
  }

  // ==================== Discovery / Recommendation methods (Real) ====================

  async advancedSearch(query: string, filters?: AdvancedSearchFilters, params?: PaginationParams): Promise<SearchResult> {
    return this.client.get<SearchResult>('/search', {
      query,
      ...filters,
      ...params,
    });
  }

  async getPersonalizedRecommendations(limit: number = 10): Promise<RecommendationItem[]> {
    const response = await this.client.get<{ recommendations: RecommendationItem[] }>('/discovery/recommendations/personalized', { limit });
    return response.recommendations;
  }

  async getRelatedContent(contentType: string, id: string, limit: number = 8): Promise<RecommendationItem[]> {
    const response = await this.client.get<{ recommendations: RecommendationItem[] }>(`/discovery/recommendations/related/${contentType}/${id}`, { limit });
    return response.recommendations;
  }

  async getTrendingContent(limit: number = 10): Promise<RecommendationItem[]> {
    const response = await this.client.get<{ recommendations: RecommendationItem[] }>('/discovery/recommendations/trending', { limit });
    return response.recommendations;
  }

  async getUsersAlsoLiked(gameId: string, limit: number = 8): Promise<RecommendationItem[]> {
    const response = await this.client.get<{ recommendations: RecommendationItem[] }>(`/discovery/recommendations/also-liked/${gameId}`, { limit });
    return response.recommendations;
  }

  async getLeaderboard(type: string, limit: number = 20): Promise<{ type: string; entries: LeaderboardEntry[] }> {
    return this.client.get<{ type: string; entries: LeaderboardEntry[] }>(`/discovery/leaderboard/${type}`, { limit });
  }

  async getSearchTrendData(days: number = 30): Promise<SearchTrendData[]> {
    const response = await this.client.get<{ trends: SearchTrendData[] }>('/discovery/trends/search', { days });
    return response.trends;
  }

  async getSearchTrends(topN: number = 20, days: number = 30): Promise<SearchTrend[]> {
    const response = await this.client.get<{ trends: SearchTrend[] }>('/search/trends', { topN, days });
    return response.trends;
  }

  async getGameTrends(days: number = 30, limit: number = 10): Promise<GameTrendData[]> {
    const response = await this.client.get<{ trends: GameTrendData[] }>('/discovery/trends/games', { days, limit });
    return response.trends;
  }

  async getDiscoveryDistributions(): Promise<DistributionData> {
    return this.client.get<DistributionData>('/discovery/stats/distributions');
  }

  async getCommunitySummary(): Promise<CommunitySummary> {
    return this.client.get<CommunitySummary>('/discovery/stats/community');
  }

  // 通知相关方法实现
  async getNotifications(params?: NotificationQueryParams): Promise<Notification[]> {
    const response = await this.client.get<{ notifications: Notification[] }>('/notifications', params);
    return response.notifications;
  }

  async getUnreadCount(): Promise<number> {
    const response = await this.client.get<{ count: number }>('/notifications/unread-count');
    return response.count;
  }

  async markAsRead(notificationId: string): Promise<void> {
    await this.client.put(`/notifications/${notificationId}/read`);
  }

  async markAllAsRead(): Promise<void> {
    await this.client.put('/notifications/read-all');
  }

  // ==================== 管理员通知管理 ====================
  async getNotificationStats(): Promise<{ total: number; unread: number; byType: Record<string, number> }> {
    return this.client.get('/notifications/stats');
  }

  async deleteNotification(id: string): Promise<void> {
    await this.client.delete(`/notifications/${id}`);
  }

  async deleteAllNotifications(): Promise<void> {
    await this.client.delete('/notifications');
  }

  async sendSystemNotification(data: {
    title: string;
    message: string;
    type?: string;
    targetUrl?: string;
  }): Promise<void> {
    await this.client.post('/notifications/system', data);
  }

  async sendMarketingNotification(data: {
    title: string;
    message: string;
    targetUserIds?: string[];
    targetUrl?: string;
    scheduledAt?: string;
  }): Promise<void> {
    await this.client.post('/notifications/marketing', data);
  }

  // 游戏库相关方法实现
  async getUserGameLibrary(params?: {
    status?: LibraryStatus;
    platform?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
    search?: string;
  }): Promise<{ games: UserGameLibrary[]; pagination: any }> {
    return this.client.get<{ games: UserGameLibrary[]; pagination: any }>('/library', params);
  }

  async getLibraryStats(): Promise<{
    totalGames: number;
    byStatus: Record<string, number>;
    byPlatform: Record<string, number>;
    totalPlayTime: number;
    averageRating?: number;
  }> {
    return this.client.get<any>('/library/stats');
  }

  async addGameToLibrary(data: {
    gameId: string;
    status: LibraryStatus;
    platforms: PlatformOwnership[];
    personalRating?: number;
    personalNotes?: string;
    tags?: string[];
    primaryPlatform?: string;
  }): Promise<UserGameLibrary> {
    const response = await this.client.post<{ libraryEntry: UserGameLibrary }>('/library', data);
    return response.libraryEntry;
  }

  async updateGameLibraryEntry(libraryId: string, data: {
    status?: LibraryStatus;
    platforms?: PlatformOwnership[];
    personalRating?: number;
    personalNotes?: string;
    tags?: string[];
    primaryPlatform?: string;
  }): Promise<UserGameLibrary> {
    const response = await this.client.put<{ libraryEntry: UserGameLibrary }>(`/library/${libraryId}`, data);
    return response.libraryEntry;
  }

  async removeGameFromLibrary(libraryId: string): Promise<void> {
    await this.client.delete(`/library/${libraryId}`);
  }

  async searchUserLibrary(query: string, options?: {
    status?: LibraryStatus;
    platform?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ games: UserGameLibrary[]; total: number }> {
    const params = { search: query, ...options };
    return this.client.get<{ games: UserGameLibrary[]; total: number }>('/library', params);
  }

  async getLibraryEntryDetails(libraryId: string): Promise<{
    libraryEntry: UserGameLibrary;
    gameDetails: Game;
  }> {
    return this.client.get<any>(`/library/${libraryId}/details`);
  }

  async updateLastPlayed(gameId: string): Promise<void> {
    await this.client.post(`/library/${gameId}/last-played`);
  }

  async importExternalLibrary(externalData: Array<{
    gameId: string;
    gameTitle: string;
    gameSlug: string;
    status: LibraryStatus;
    platforms: PlatformOwnership[];
    purchaseDate?: Date;
  }>): Promise<number> {
    const response = await this.client.post<{ importedCount: number }>('/library/import', { externalData });
    return response.importedCount;
  }

  async getBatchLibraryStatus(gameIds: string[]): Promise<Record<string, boolean>> {
    return this.client.get<any>('/library/batch-status', { gameIds: gameIds.join(',') });
  }

  // 关于页面相关方法
  async getAboutData(): Promise<AboutAllData> {
    return this.client.get<AboutAllData>('/about');
  }

  async updateAboutSection(key: string, data: { title?: string; description?: string | null; imageUrl?: string | null }): Promise<void> {
    await this.client.put(`/about/sections/${key}`, data);
  }

  async updateAboutValue(id: number, data: { icon?: string; title?: string; description?: string | null }): Promise<void> {
    await this.client.put(`/about/values/${id}`, data);
  }

  async updateAboutTeamMember(id: number, data: { name?: string; role?: string; avatarUrl?: string | null; description?: string | null }): Promise<void> {
    await this.client.put(`/about/team/${id}`, data);
  }

  async updateAboutTimeline(id: number, data: { year?: string; title?: string | null; description?: string | null }): Promise<void> {
    await this.client.put(`/about/timeline/${id}`, data);
  }

  async updateAboutContact(id: number, data: { label?: string; value?: string }): Promise<void> {
    await this.client.put(`/about/contacts/${id}`, data);
  }

  // ==================== 文件上传方法 ====================
  async getUploadedFiles(params?: { page?: number; limit?: number }): Promise<{ files: UploadedFileInfo[]; pagination: { page: number; limit: number; total: number } }> {
    const result = await this.client.get<any>('/upload/files', params);
    return { files: result.files || [], pagination: result.pagination || { page: 1, limit: 20, total: 0 } };
  }

  async getUploadConfig(): Promise<{ config: UploadConfig; features: string[] }> {
    const raw = await this.client.get<any>('/upload/config');
    // 后端返回扁平结构，转换为前端UploadConfig所需的嵌套结构
    const c = raw.config || raw;
    const config: UploadConfig = {
      maxSize: c.maxSize || 20971520,
      allowedTypes: c.allowedTypes || [],
      image: c.image || {
        maxWidth: c.maxWidth || 1920,
        maxHeight: c.maxHeight || 1080,
        quality: c.quality || 80,
      },
      cdn: c.cdn || {
        enabled: c.cdnEnabled || false,
        baseUrl: c.cdnBaseUrl || '',
        provider: c.provider || '',
      },
      validation: c.validation || {
        checkMimeType: c.checkMimeType ?? true,
        checkFileSize: c.checkFileSize ?? true,
        virusScan: c.virusScan ?? false,
      },
    };
    return { config, features: raw.features || [] };
  }

  async uploadFile(file: File): Promise<UploadedFileInfo> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await this.client.request<{ file: UploadedFileInfo }>({ method: 'POST', url: '/upload/single', data: formData });
    return response.file;
  }

  async uploadImage(file: File): Promise<UploadImageInfo> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await this.client.request<{ file: UploadImageInfo }>({ method: 'POST', url: '/upload/image', data: formData });
    return response.file;
  }

  async uploadDocument(file: File): Promise<UploadDocumentInfo> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await this.client.request<{ file: UploadDocumentInfo }>({ method: 'POST', url: '/upload/document', data: formData });
    return response.file;
  }

  async getFileInfo(filename: string): Promise<UploadedFileInfo> {
    const response = await this.client.get<{ file: UploadedFileInfo }>(`/upload/files/${filename}`);
    return response.file;
  }

  async deleteFile(filename: string): Promise<void> {
    await this.client.delete(`/upload/files/${filename}`);
  }

  // ==================== 邮件管理方法 ====================
  async getEmailTemplates(params?: PaginationParams): Promise<{ templates: EmailTemplate[]; pagination: any }> {
    return this.client.get<{ templates: EmailTemplate[]; pagination: any }>('/email/templates', params);
  }

  async getEmailTemplate(id: string): Promise<EmailTemplate> {
    const response = await this.client.get<{ template: EmailTemplate }>(`/email/templates/${id}`);
    return response.template;
  }

  async createEmailTemplate(data: Record<string, unknown>): Promise<EmailTemplate> {
    const response = await this.client.post<{ template: EmailTemplate }>('/email/templates', data);
    return response.template;
  }

  async updateEmailTemplate(id: string, data: Record<string, unknown>): Promise<EmailTemplate> {
    const response = await this.client.put<{ template: EmailTemplate }>(`/email/templates/${id}`, data);
    return response.template;
  }

  async deleteEmailTemplate(id: string): Promise<void> {
    await this.client.delete(`/email/templates/${id}`);
  }

  async duplicateEmailTemplate(id: string, newName: string): Promise<EmailTemplate> {
    const response = await this.client.post<{ template: EmailTemplate }>(`/email/templates/${id}/duplicate`, { newName });
    return response.template;
  }

  async renderEmailTemplate(id: string, variables?: Record<string, string>): Promise<{ rendered: string; variables: Record<string, string> }> {
    return this.client.post<{ rendered: string; variables: Record<string, string> }>(`/email/templates/${id}/render`, { variables });
  }

  async sendTestEmail(to: string, templateType: string, variables?: Record<string, string>): Promise<EmailSendResult> {
    const response = await this.client.post<{ result: EmailSendResult }>('/email/send/test', { to, templateType, variables });
    return response.result;
  }

  async sendBulkEmail(data: { recipients: string[]; templateType: string; templateName?: string; variables?: Record<string, string> }): Promise<{ results: EmailSendResult[]; summary: EmailBulkSummary }> {
    return this.client.post<{ results: EmailSendResult[]; summary: EmailBulkSummary }>('/email/send/bulk', data);
  }

  async getEmailQueueStatus(): Promise<EmailQueueStatus> {
    const response = await this.client.get<{ queue: EmailQueueStatus }>('/email/queue');
    return response.queue;
  }

  async clearEmailQueue(): Promise<void> {
    await this.client.delete('/email/queue');
  }

  // ==================== 关注相关方法 ====================
  async followUser(userId: string): Promise<void> {
    await this.client.post(`/follow/${userId}`);
  }

  async unfollowUser(userId: string): Promise<void> {
    await this.client.delete(`/follow/${userId}`);
  }

  async getFollowers(userId: string, params?: PaginationParams): Promise<{ followers: FollowUser[]; pagination: any }> {
    return this.client.get<{ followers: FollowUser[]; pagination: any }>('/follow/followers', { userId, ...params });
  }

  async getFollowing(userId: string, params?: PaginationParams): Promise<{ following: FollowUser[]; pagination: any }> {
    return this.client.get<{ following: FollowUser[]; pagination: any }>('/follow/following', { userId, ...params });
  }

  async getFollowStatus(userId: string): Promise<FollowStatus> {
    return this.client.get<FollowStatus>(`/follow/status/${userId}`);
  }

  async getFollowStats(userId?: string): Promise<FollowStats> {
    return this.client.get<FollowStats>('/follow/stats', { userId });
  }

  async getMutualFollows(userId: string): Promise<{ mutualFollows: FollowUser[]; count: number }> {
    return this.client.get<{ mutualFollows: FollowUser[]; count: number }>(`/follow/mutual/${userId}`);
  }

  // ==================== 点赞相关方法 ====================
  async addLike(targetType: LikeTargetType, targetId: string): Promise<void> {
    await this.client.post('/like', { targetType, targetId });
  }

  async removeLike(targetType: LikeTargetType, targetId: string): Promise<void> {
    await this.client.request<void>({ method: 'DELETE', url: '/like', data: { targetType, targetId } });
  }

  async getLikeStatus(targetType: LikeTargetType, targetId: string): Promise<LikeStatus> {
    return this.client.get<LikeStatus>('/like/status', { targetType, targetId });
  }

  async getTargetLikes(targetType: LikeTargetType, targetId: string, params?: PaginationParams): Promise<{ likes: LikeEntry[]; pagination: any }> {
    return this.client.get<{ likes: LikeEntry[]; pagination: any }>('/like/target', { targetType, targetId, ...params });
  }

  async getUserLikes(params?: PaginationParams): Promise<{ likes: LikeEntry[]; pagination: any }> {
    return this.client.get<{ likes: LikeEntry[]; pagination: any }>('/like/user', params);
  }

  async getLikeStats(targetType?: string, targetId?: string): Promise<LikeStats> {
    return this.client.get<LikeStats>('/like/stats', { targetType, targetId });
  }

  // ==================== 邮箱验证 ====================
  async verifyEmail(token: string): Promise<void> {
    await this.client.post('/auth/verify-email', { token });
  }

  async checkVerificationToken(token: string): Promise<{ valid: boolean }> {
    return this.client.get<{ valid: boolean }>(`/auth/verify-email/${token}`);
  }

  async resendVerificationEmail(email: string): Promise<void> {
    await this.client.post('/auth/resend-verification', { email });
  }

  async checkEmail(email: string): Promise<{ available: boolean }> {
    return this.client.get<{ available: boolean }>('/auth/check-email', { email });
  }

  // ==================== 数据分析方法 ====================
  async getUserGrowthTrend(period: string = 'daily', days: number = 30): Promise<UserGrowthPoint[]> {
    return this.client.get<UserGrowthPoint[]>('/admin/analytics/user-growth', { period, days });
  }

  async getGamePopularity(sortBy: string = 'rating', limit: number = 10): Promise<GamePopularityItem[]> {
    return this.client.get<GamePopularityItem[]>('/admin/analytics/game-popularity', { sortBy, limit });
  }

  async getContentEngagement(days: number = 30): Promise<ContentEngagement> {
    return this.client.get<ContentEngagement>('/admin/analytics/content-engagement', { days });
  }

  async getDistributions(): Promise<Distributions> {
    return this.client.get<Distributions>('/admin/analytics/distributions');
  }

  async getActiveUsers(days: number = 30): Promise<ActiveUserData> {
    return this.client.get<ActiveUserData>('/admin/analytics/active-users', { days });
  }

  async getDashboardStats(): Promise<DashboardStats> {
    return this.client.get<DashboardStats>('/admin/analytics/dashboard');
  }

  async getAuditLogStats(days: number = 30): Promise<AuditLogStat[]> {
    return this.client.get<AuditLogStat[]>('/admin/analytics/audit-log-stats', { days });
  }

  // ==================== 用户画像方法 ====================
  async getProfilingTags(): Promise<UserTag[]> {
    return this.client.get<UserTag[]>('/admin/profiling/tags');
  }

  async createProfilingTag(name: string, color?: string, description?: string): Promise<UserTag> {
    return this.client.post<UserTag>('/admin/profiling/tags', { name, color, description });
  }

  async deleteProfilingTag(id: number): Promise<void> {
    await this.client.delete(`/admin/profiling/tags/${id}`);
  }

  async assignTagToUser(userId: string, tagId: number): Promise<void> {
    await this.client.post('/admin/profiling/tags/assign', { userId, tagId });
  }

  async removeTagFromUser(userId: string, tagId: number): Promise<void> {
    await this.client.request<void>({ method: 'DELETE', url: '/admin/profiling/tags/assign', data: { userId, tagId } });
  }

  async getUserTags(userId: string): Promise<UserTag[]> {
    return this.client.get<UserTag[]>(`/admin/profiling/user-tags/${userId}`);
  }

  async getSegments(): Promise<UserSegment[]> {
    return this.client.get<UserSegment[]>('/admin/profiling/segments');
  }

  async createSegment(data: { name: string; description?: string; criteria?: any; isDynamic?: boolean }): Promise<UserSegment> {
    return this.client.post<UserSegment>('/admin/profiling/segments', data);
  }

  async updateSegment(id: number, data: { name?: string; description?: string; criteria?: any; isDynamic?: boolean }): Promise<UserSegment> {
    return this.client.put<UserSegment>(`/admin/profiling/segments/${id}`, data);
  }

  async deleteSegment(id: number): Promise<void> {
    await this.client.delete(`/admin/profiling/segments/${id}`);
  }

  async getSegmentMembers(segmentId: number, page: number = 1, limit: number = 20): Promise<{ members: SegmentMember[]; total: number }> {
    return this.client.get<{ members: SegmentMember[]; total: number }>(`/admin/profiling/segments/${segmentId}/members`, { page, limit });
  }

  async addMemberToSegment(segmentId: number, userId: string): Promise<void> {
    await this.client.post(`/admin/profiling/segments/${segmentId}/members`, { userId });
  }

  async removeMemberFromSegment(segmentId: number, userId: string): Promise<void> {
    await this.client.request<void>({ method: 'DELETE', url: `/admin/profiling/segments/${segmentId}/members`, data: { userId } });
  }

  async evaluateDynamicSegment(segmentId: number): Promise<{ affected: number }> {
    return this.client.post<{ affected: number }>(`/admin/profiling/segments/${segmentId}/evaluate`, {});
  }

  async getBehaviorProfile(userId: string): Promise<BehaviorProfile> {
    return this.client.get<BehaviorProfile>(`/admin/profiling/behavior/${userId}`);
  }

  async getBehaviorDistributions(): Promise<BehaviorDistributions> {
    return this.client.get<BehaviorDistributions>('/admin/profiling/behavior/distributions');
  }

  async getPeakLoginHours(days: number = 30): Promise<PeakHourData[]> {
    return this.client.get<PeakHourData[]>('/admin/profiling/behavior/peak-hours', { days });
  }

  // ==================== 游戏化（经验/积分）====================
  async getGamificationStats(): Promise<GamificationStats> {
    return this.client.get<GamificationStats>('/gamification/stats');
  }

  async getXpHistory(params?: PaginationParams): Promise<{ items: XpTransaction[]; pagination: any }> {
    return this.client.get<{ items: XpTransaction[]; pagination: any }>('/gamification/xp/history', params);
  }

  async getPointHistory(params?: PaginationParams): Promise<{ items: PointTransaction[]; pagination: any }> {
    return this.client.get<{ items: PointTransaction[]; pagination: any }>('/gamification/points/history', params);
  }

  // ==================== 成就系统 ====================
  async getPlatformAchievements(userId?: string): Promise<PlatformAchievement[]> {
    return this.client.get<PlatformAchievement[]>('/achievements');
  }

  async getUserAchievements(userId?: string): Promise<UserPlatformAchievement[]> {
    if (userId) {
      return this.client.get<UserPlatformAchievement[]>(`/achievements/user/${userId}`);
    }
    return this.client.get<UserPlatformAchievement[]>('/achievements/user/me');
  }

  async getAchievementStats(): Promise<{ unlocked: number; total: number; recentUnlocks: UserPlatformAchievement[] }> {
    return this.client.get<{ unlocked: number; total: number; recentUnlocks: UserPlatformAchievement[] }>('/achievements/stats');
  }

  // ==================== 私信系统 ====================
  async getConversations(params?: PaginationParams): Promise<{ items: Conversation[]; pagination: any; unreadTotal: number }> {
    return this.client.get<{ items: Conversation[]; pagination: any; unreadTotal: number }>('/messages/conversations', params);
  }

  async getConversation(id: string, params?: PaginationParams): Promise<{ conversation: Conversation; messages: Message[] }> {
    return this.client.get<{ conversation: Conversation; messages: Message[] }>(`/messages/conversations/${id}`, params);
  }

  async sendMessage(conversationId: string, content: string, replyToId?: string): Promise<Message> {
    return this.client.post<Message>(`/messages/conversations/${conversationId}/messages`, { content, replyToId });
  }

  async createConversation(participantId: string, subject?: string): Promise<Conversation> {
    return this.client.post<Conversation>('/messages/conversations', { participantId, subject });
  }

  async markConversationRead(conversationId: string): Promise<void> {
    await this.client.post(`/messages/conversations/${conversationId}/read`, {});
  }

  async getMessageUnreadCount(): Promise<number> {
    const response = await this.client.get<{ count: number }>('/messages/unread-count');
    return response.count;
  }

  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    await this.client.delete(`/messages/conversations/${conversationId}/messages/${messageId}`);
  }

  async clearConversation(conversationId: string): Promise<void> {
    await this.client.delete(`/messages/conversations/${conversationId}/clear`);
  }

  // ==================== 用户排行榜 ====================
  async getUserLeaderboard(type: string, limit: number = 20, page: number = 1): Promise<{ items: UserLeaderboardEntry[]; pagination: any }> {
    return this.client.get<{ items: UserLeaderboardEntry[]; pagination: any }>(`/gamification/leaderboard/${type}`, { limit, page });
  }

  // ==================== AI 助手 ====================
  async soulstationChat(messages: Array<{ role: string; content: string }>): Promise<{ reply: string }> {
    return this.client.post<{ reply: string }>('/ai/chat', { messages });
  }

  async gameNpcSearch(params: { query: string }): Promise<{ guides: any[]; videos: any[]; fanart: any[] }> {
    return this.client.post<{ guides: any[]; videos: any[]; fanart: any[] }>('/ai/generate', { module: 'npc', params });
  }

  async gameCompanionRecommend(params: { gameName: string; answers: string[] }): Promise<{ recommendations: any[]; matchedGame: string | null }> {
    return this.client.post<{ recommendations: any[]; matchedGame: string | null }>('/ai/generate', { module: 'companion', params });
  }

  async generateCharacterPortrait(params: Record<string, any>): Promise<{ description: string }> {
    return this.client.post<{ description: string }>('/ai/generate', { module: 'portrait', params });
  }


  // ==================== AI 历史记录 ====================
  async getAiHistory(type?: string) { return this.client.get<any[]>('/ai/history', type ? { type } : {}); }
  async getAiHistoryDetail(id: string) { return this.client.get<any>(`/ai/history/${id}`); }
  async saveAiHistory(data: { type: string; title: string; content: any }) { return this.client.post<any>('/ai/history', data); }
  async deleteAiHistory(id: string) { await this.client.delete(`/ai/history/${id}`); }

  // ==================== AI 图片转 3D ====================
  async submitImageTo3d(imageUrl: string): Promise<{ taskId: string }> {
    return this.client.post<{ taskId: string }>('/ai/image-to-3d', { imageUrl });
  }

  async getImageTo3dTask(taskId: string): Promise<ImageTo3dTask> {
    const response = await this.client.get<any>(`/ai/image-to-3d/${taskId}`);
    const data = response.data || response;
    return {
      taskId: data.taskId,
      status: data.status,
      progress: data.progress || 0,
      modelUrls: data.modelUrls || null,
      errorMessage: data.errorMessage || null,
    };
  }

  // ==================== 3D 打印 ====================
  async submitPrintOrder(data: {
    modelData: string;
    size?: number;
    material?: string;
    color?: string;
    quantity?: number;
  }): Promise<{ orderId: string; status: string; createdAt: string }> {
    return this.client.post<{ orderId: string; status: string; createdAt: string }>('/print/order', data);
  }

  async getPrintOrder(id: string): Promise<{
    id: string;
    size: number;
    material: string;
    color: string;
    quantity: number;
    status: string;
    createdAt: string;
  }> {
    return this.client.get<any>(`/print/order/${id}`);
  }

  // ==================== Banner 和推荐内容 ====================
  async getBanners(position?: string): Promise<any[]> {
    const params: any = {};
    if (position) params.position = position;
    const response = await this.client.get<any>('/recommend/banners', params);
    return response?.data || response || [];
  }

  async getFeaturedContent(type?: string): Promise<any[]> {
    const params: any = {};
    if (type) params.type = type;
    const response = await this.client.get<any>('/recommend/featured', params);
    return response?.data || response || [];
  }

  // ==================== 兑换码系统 ====================
  async getRedeemCodes(): Promise<any[]> {
    const response = await this.client.get<any>('/redeem/codes');
    return response?.data || response || [];
  }

  async getRedeemCodeDetail(code: string): Promise<any> {
    const response = await this.client.get<any>(`/redeem/codes/${encodeURIComponent(code)}`);
    return response?.data || response;
  }

  async redeemCode(code: string): Promise<{ code: string; title: string; reward_type: string; reward_value: string }> {
    const response = await this.client.post<any>('/redeem/redeem', { code });
    return response?.data || response;
  }

  async getMyRedeemHistory(): Promise<any[]> {
    const response = await this.client.get<any>('/redeem/my');
    return response?.data || response || [];
  }
}

/**
 * Mock API 服务实现
 *
 * 使用本地 Mock 数据模拟后端 API 响应，适用于开发和测试。
 * 内部的 MockApiClient 提供了完整的模拟数据集，
 * 包括游戏、新闻、评测、社区帖子、用户等。
 *
 * @extends BaseApiService
 */
class MockApiService extends BaseApiService {
  private mockClient: any;

  constructor() {
    super();
    this.mockClient = mockApiClient;
  }

  private async delay(ms = 300): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 转换mock游戏数据为API类型
  private convertMockGame(mockGame: any): Game {
    return {
      ...mockGame,
      id: mockGame.id.toString(),
    };
  }

  // 转换mock新闻数据为API类型
  private convertMockNews(mockNews: any): NewsArticle {
    return {
      ...mockNews,
      id: mockNews.id.toString(),
    };
  }

  // 转换mock评测数据为API类型
  private convertMockReview(mockReview: any): Review {
    return {
      ...mockReview,
      id: mockReview.id.toString(),
      gameId: mockReview.gameId.toString(),
    };
  }

  // 转换mock社区帖子数据为API类型
  private convertMockCommunityPost(mockPost: any): CommunityPost {
    return {
      ...mockPost,
      id: mockPost.id.toString(),
    };
  }

  // 转换mock用户数据为API类型
  private convertMockUser(mockUser: any): User {
    return {
      ...mockUser,
      id: mockUser.id.toString(),
    };
  }

  async getGames(params?: PaginationParams) {
    const response = await this.mockClient.getGames(params);
    const mockGames = response.data?.games || [];
    return mockGames.map(game => this.convertMockGame(game));
  }

  async getGame(id: string) {
    const response = await this.mockClient.getGame(id);
    if (!response.data?.game) {
      throw new Error('游戏不存在');
    }
    return this.convertMockGame(response.data.game);
  }

  async createGame(data: Record<string, unknown>): Promise<Game> {
    console.log('Mock: 创建游戏', data);
    return { id: 'mock-game-id', ...data } as unknown as Game;
  }

  async updateGame(id: string, data: Record<string, unknown>): Promise<Game> {
    console.log('Mock: 更新游戏', id, data);
    return { id, ...data } as unknown as Game;
  }

  async deleteGame(id: string): Promise<void> {
    console.log('Mock: 删除游戏', id);
  }

  async getNews(params?: PaginationParams & { lang?: string }) {
    const response = await this.mockClient.getNews(params);
    const mockNews = response.data?.news || [];
    return mockNews.map(news => this.convertMockNews(news));
  }

  async getNewsArticle(id: string, lang?: string) {
    const response = await this.mockClient.getNewsArticle(id);
    if (!response.data?.article) {
      throw new Error('新闻不存在');
    }
    return this.convertMockNews(response.data.article);
  }

  async createNewsArticle(data: Record<string, unknown>): Promise<NewsArticle> {
    console.log('Mock: 创建新闻', data);
    return { id: 'mock-news-id', ...data } as unknown as NewsArticle;
  }

  async updateNewsArticle(id: string, data: Record<string, unknown>): Promise<NewsArticle> {
    console.log('Mock: 更新新闻', id, data);
    return { id, ...data } as unknown as NewsArticle;
  }

  async deleteNewsArticle(id: string): Promise<void> {
    console.log('Mock: 删除新闻', id);
  }

  async likeNewsArticle(id: string): Promise<{ likes: number; liked: boolean }> {
    console.log(`Mock: 点赞新闻 ${id}`);
    return { likes: 1, liked: true };
  }

  async getReviews(params?: PaginationParams) {
    const response = await this.mockClient.getReviews(params);
    const mockReviews = response.data?.reviews || [];
    return mockReviews.map(review => this.convertMockReview(review));
  }

  async getReview(id: string) {
    const response = await this.mockClient.getReview(id);
    if (!response.data?.review) {
      throw new Error('评测不存在');
    }
    return this.convertMockReview(response.data.review);
  }

  async getCommunityPosts(params?: PaginationParams) {
    const response = await this.mockClient.getCommunityPosts(params);
    const mockPosts = response.data?.posts || [];
    return mockPosts.map(post => this.convertMockCommunityPost(post));
  }

  async getGamePosts(gameId: string, params?: PaginationParams): Promise<CommunityPost[]> {
    console.log('Mock: 获取游戏论坛帖子', gameId, params);
    const response = await this.mockClient.getCommunityPosts(params);
    const mockPosts = response.data?.posts || [];
    return mockPosts.slice(0, 10).map((post: any, i: number) => ({
      ...this.convertMockCommunityPost(post),
      gameId,
      gameTitle: `Mock Game ${gameId}`,
    }));
  }

  async getGameForumStats(params?: { page?: number; limit?: number; search?: string }): Promise<{ games: Game[]; total: number; page: number; limit: number }> {
    console.log('Mock: 获取游戏论坛统计', params);
    const response = await this.mockClient.getGames({ page: params?.page || 1, limit: params?.limit || 20 });
    const mockGames = response.data?.games || [];
    const filtered = params?.search
      ? mockGames.filter((g: any) => g.title.includes(params.search!))
      : mockGames;
    return {
      games: filtered.map((g: any) => ({
        ...this.convertMockGame(g),
        forumPostCount: Math.floor(Math.random() * 30) + 1,
        latestForumPostDate: new Date().toISOString(),
        latestPostTitle: '最新讨论帖',
      })),
      total: filtered.length,
      page: params?.page || 1,
      limit: params?.limit || 20,
    };
  }

  async getCommunityPost(id: string): Promise<CommunityPost> {
    await this.delay();
    return {
      id,
      title: 'Mock 社区帖子详情',
      content: '这是一个模拟的社区帖子详情内容，用于演示帖子详情页面的布局和功能。',
      author: 'Mock用户',
      authorId: 'mock-user-id',
      authorAvatar: '',
      publishDate: new Date().toISOString(),
      likes: 42,
      comments: 7,
      tags: ['mock', 'test'],
      category: '讨论',
      createdAt: new Date().toISOString(),
    };
  }

  async createCommunityPost(data: Record<string, unknown>): Promise<CommunityPost> {
    console.log('Mock: 创建社区帖子', data);
    return { id: 'mock-post-id', ...data } as unknown as CommunityPost;
  }

  async updateCommunityPost(id: string, data: Record<string, unknown>): Promise<CommunityPost> {
    console.log('Mock: 更新社区帖子', id, data);
    return { id, ...data } as unknown as CommunityPost;
  }

  async deleteCommunityPost(id: string): Promise<void> {
    console.log('Mock: 删除社区帖子', id);
  }

  async login(data: LoginRequest) {
    const response = await this.mockClient.login(data);
    if (!response.data) {
      throw new Error('登录失败');
    }
    // 转换用户ID
    return {
      user: this.convertMockUser(response.data.user),
      tokens: response.data.tokens,
    };
  }

  async register(data: RegisterRequest) {
    const response = await this.mockClient.register(data);
    if (!response.data) {
      throw new Error('注册失败');
    }
    // 转换用户ID
    return {
      user: this.convertMockUser(response.data.user),
      tokens: response.data.tokens,
    };
  }

  async logout() {
    await this.mockClient.logout();
    // 返回void
  }

  async loginByPhone(data: LoginByPhoneRequest) {
    console.log('Mock: 手机号登录', data);
    const response = await this.mockClient.login({ email: 'user@mock.com', password: 'mock' });
    if (!response.data) throw new Error('登录失败');
    return {
      user: this.convertMockUser(response.data.user),
      tokens: response.data.tokens,
    };
  }

  async registerByPhone(data: RegisterByPhoneRequest) {
    console.log('Mock: 手机号注册', data);
    const response = await this.mockClient.register({
      username: data.username,
      email: `${data.phone}@mock.com`,
      password: data.password,
    });
    if (!response.data) throw new Error('注册失败');
    return {
      user: this.convertMockUser(response.data.user),
      tokens: response.data.tokens,
    };
  }

  async sendSmsCode(data: SendSmsCodeRequest) {
    console.log('Mock: 发送短信验证码', data);
  }

  async getOAuthProviders() {
    return { providers: [] };
  }

  async getOAuthUrl(provider: string) {
    return '';
  }

  async getCurrentUser() {
    const response = await this.mockClient.getCurrentUser();
    if (!response.data?.user) {
      throw new Error('获取用户信息失败');
    }
    return this.convertMockUser(response.data.user);
  }

  async getUsers(params?: PaginationParams) {
    const response = await this.mockClient.getUsers(params);
    const mockUsers = response.data?.users || [];
    return mockUsers.map(user => this.convertMockUser(user));
  }

  async getAdminStats() {
    return this.mockClient.getAdminStats();
  }

  async getAdminUsers(params?: PaginationParams) {
    const response = await this.mockClient.getUsers(params);
    const mockUsers = (response.data?.users || []).map((u: any) => this.convertMockUser(u));
    return { users: mockUsers, pagination: response.data?.pagination || { total: mockUsers.length, page: 1, limit: 20 } };
  }

  async getAdminUser(id: string) {
    const users = await this.getAdminUsers();
    const user = users.users.find(u => u.id === id);
    if (!user) throw new Error('用户不存在');
    return user;
  }

  async createAdminUser(data: Record<string, unknown>) {
    console.log('Mock: 创建用户', data);
    return { id: 'mock-new-id', ...data } as unknown as User;
  }

  async updateAdminUser(id: string, data: Record<string, unknown>) {
    console.log('Mock: 更新用户', id, data);
    return { id, ...data } as unknown as User;
  }

  async deleteAdminUser(id: string) {
    console.log('Mock: 删除用户', id);
  }

  async batchDeleteAdminUsers(ids: string[]) {
    console.log('Mock: 批量删除用户', ids);
  }

  async changeUserRole(id: string, role: string) {
    console.log('Mock: 变更角色', id, role);
    return { id, role } as unknown as User;
  }

  async freezeUserComment(id: string, frozen: boolean, until?: string) {
    console.log('Mock: 冻结评论', id, frozen, until);
    return { id, commentFrozen: frozen } as unknown as User;
  }

  async getAuditLogs(params?: Record<string, unknown>) {
    return { logs: [], total: 0 };
  }

  async getLoginLogs(params?: Record<string, unknown>) {
    return { logs: [], total: 0 };
  }

  async getSystemConfigs() {
    return [];
  }

  async updateSystemConfig(key: string, value: string, description?: string) {
    console.log('Mock: 更新配置', key, value);
  }

  async batchUpdateSystemConfig(configs: Record<string, string>) {
    console.log('Mock: 批量更新配置', configs);
  }

  // ==================== 新闻分类管理 (Mock) ====================

  async getNewsCategories(): Promise<NewsCategory[]> {
    return this.mockClient.get('/admin/categories') as Promise<NewsCategory[]>;
  }

  async createNewsCategory(data: NewsCategoryCreateInput): Promise<NewsCategory> {
    return this.mockClient.post('/admin/categories', data) as Promise<NewsCategory>;
  }

  async updateNewsCategory(id: string, data: NewsCategoryUpdateInput): Promise<NewsCategory> {
    return this.mockClient.put(`/admin/categories/${id}`, data) as Promise<NewsCategory>;
  }

  async deleteNewsCategory(id: string): Promise<void> {
    await this.mockClient.delete(`/admin/categories/${id}`);
  }

  // ==================== 评测模板管理 (Mock) ====================

  async getReviewTemplates(): Promise<ReviewTemplate[]> {
    return this.mockClient.get('/admin/review-templates') as Promise<ReviewTemplate[]>;
  }

  async createReviewTemplate(data: ReviewTemplateCreateInput): Promise<ReviewTemplate> {
    return this.mockClient.post('/admin/review-templates', data) as Promise<ReviewTemplate>;
  }

  async updateReviewTemplate(id: string, data: ReviewTemplateUpdateInput): Promise<ReviewTemplate> {
    return this.mockClient.put(`/admin/review-templates/${id}`, data) as Promise<ReviewTemplate>;
  }

  async deleteReviewTemplate(id: string): Promise<void> {
    await this.mockClient.delete(`/admin/review-templates/${id}`);
  }

  // ==================== 内容审核 ====================
  async getReviewQueue(params?: { page?: number; limit?: number; type?: string; status?: string }) {
    return { items: [], pagination: { page: 1, limit: 20, total: 0 } };
  }

  async getReviewStats() {
    return [];
  }

  async approveContent(type: string, id: string): Promise<void> {
    // mock no-op
  }

  async rejectContent(type: string, id: string, comment: string): Promise<void> {
    // mock no-op
  }

  async healthCheck() {
    const response = await this.mockClient.healthCheck();
    if (!response.data) {
      throw new Error('健康检查失败');
    }
    return { status: response.data.status };
  }

  // ==================== 部署管理 (Mock) ====================

  async getDeployments(params?: Record<string, unknown>) {
    console.log('Mock: getDeployments', params);
    return { deployments: [], pagination: { page: 1, limit: 20, total: 0, pages: 0, hasNext: false, hasPrev: false } };
  }

  async createDeployment(data: { version: string; description?: string; branch?: string; commit_hash?: string }) {
    console.log('Mock: createDeployment', data);
    return { id: Date.now(), ...data, status: 'success' };
  }

  async getDeployment(id: string) {
    console.log('Mock: getDeployment', id);
    return { id, version: '1.0.0', status: 'success' };
  }

  async updateDeploymentStatus(id: string, status: string, log?: string) {
    console.log('Mock: updateDeploymentStatus', id, status);
  }

  async rollbackDeployment(id: string) {
    console.log('Mock: rollbackDeployment', id);
    return { id: Date.now(), rollbackTo: id, status: 'deploying' };
  }

  async deleteDeployment(id: string) {
    console.log('Mock: deleteDeployment', id);
  }

  // ==================== 备份恢复 (Mock) ====================

  async getBackups(params?: Record<string, unknown>) {
    console.log('Mock: getBackups', params);
    return { backups: [], pagination: { page: 1, limit: 20, total: 0, pages: 0, hasNext: false, hasPrev: false } };
  }

  async createBackup(description?: string) {
    console.log('Mock: createBackup', description);
    return { id: Date.now(), filename: `mock-backup-${Date.now()}.db`, file_size: 1024, status: 'completed' };
  }

  async restoreBackup(id: string) {
    console.log('Mock: restoreBackup', id);
    return { success: true, message: '恢复成功（Mock）' };
  }

  async deleteBackup(id: string) {
    console.log('Mock: deleteBackup', id);
  }

  async forgotPassword(email: string): Promise<void> {
    console.log(`Mock: 发送密码重置邮件 ${email}`);
    // 模拟成功，不实际发送邮件
  }

  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    console.log(`Mock: 重置密码 token=${resetToken}`);
    if (!resetToken || resetToken.length < 10) {
      throw new Error('无效的重置链接');
    }
  }

  // 收藏相关方法实现（Mock）
  async addFavorite(gameId: string): Promise<Favorite> {
    // 暂时返回一个模拟的Favorite对象
    return {
      id: 'mock-favorite-id',
      userId: 'mock-user-id',
      gameId,
      createdAt: new Date().toISOString(),
    };
  }

  async removeFavorite(gameId: string): Promise<void> {
    // Mock实现，什么也不做
    console.log(`Mock: 取消收藏游戏 ${gameId}`);
  }

  async checkFavorite(gameId: string): Promise<FavoriteStatus> {
    // 模拟返回未收藏状态
    return {
      gameId,
      isFavorited: false,
    };
  }

  async batchCheckFavorite(gameIds: string[]): Promise<Record<string, boolean>> {
    // 模拟返回所有游戏都未收藏
    const result: Record<string, boolean> = {};
    gameIds.forEach(gameId => {
      result[gameId] = false;
    });
    return result;
  }

  async getUserFavorites(params?: PaginationParams): Promise<Favorite[]> {
    // 返回空数组
    return [];
  }

  async getFavoriteStats(): Promise<FavoriteStats> {
    return {
      totalFavorites: 0,
      topFavoritedGames: [],
      averageFavoritesPerUser: 0,
    };
  }

  async getGameFavoriteCount(gameId: string): Promise<number> {
    return 0;
  }

  // 评测相关方法实现（Mock）
  async createReview(data: ReviewCreateRequest): Promise<Review> {
    console.log('Mock: 创建评测', data);
    return {
      id: 'mock-review-id',
      gameId: data.gameId,
      gameTitle: 'Mock Game',
      title: data.title,
      content: data.content,
      author: 'Mock User',
      rating: data.rating,
      publishDate: new Date().toISOString(),
      likes: 0,
      comments: 0,
      tags: data.tags || [],
    };
  }

  async updateReview(id: string, data: ReviewUpdateRequest): Promise<Review> {
    console.log(`Mock: 更新评测 ${id}`, data);
    return {
      id,
      gameId: 'mock-game-id',
      gameTitle: 'Mock Game',
      title: data.title || 'Updated Title',
      content: data.content || 'Updated Content',
      author: 'Mock User',
      rating: data.rating || 5,
      publishDate: new Date().toISOString(),
      likes: 0,
      comments: 0,
      tags: data.tags || [],
    };
  }

  async deleteReview(id: string): Promise<void> {
    console.log(`Mock: 删除评测 ${id}`);
  }

  async getGameReviews(gameId: string, params?: PaginationParams): Promise<Review[]> {
    // 返回一些模拟评测
    return [
      {
        id: 'review-1',
        gameId,
        gameTitle: 'Mock Game',
        title: 'Great Game!',
        content: 'This is a fantastic game with amazing graphics.',
        author: 'Player1',
        rating: 9.5,
        publishDate: '2026-04-15T10:00:00Z',
        likes: 25,
        comments: 3,
        tags: ['推荐', '画面精美'],
      },
      {
        id: 'review-2',
        gameId,
        gameTitle: 'Mock Game',
        title: 'Good but could be better',
        content: 'The gameplay is fun but needs more content updates.',
        author: 'Player2',
        rating: 7.0,
        publishDate: '2026-04-10T14:30:00Z',
        likes: 12,
        comments: 1,
        tags: ['建议', '内容不足'],
      },
    ];
  }

  async likeReview(id: string): Promise<Review> {
    console.log(`Mock: 点赞评测 ${id}`);
    return {
      id,
      gameId: 'mock-game-id',
      gameTitle: 'Mock Game',
      title: 'Mock Review',
      content: 'Mock content',
      author: 'Mock User',
      rating: 5,
      publishDate: new Date().toISOString(),
      likes: 1,
      comments: 0,
      tags: [],
    };
  }

  // ==================== 攻略指南（Mock） ====================

  private convertMockGuide(mockGuide: any): Guide {
    return {
      ...mockGuide,
      id: mockGuide.id.toString(),
      gameId: mockGuide.gameId.toString(),
    };
  }

  async getGuides(params?: PaginationParams): Promise<Guide[]> {
    console.log('Mock: 获取攻略列表', params);
    return [
      {
        id: 'guide-1',
        gameId: 'game-1',
        gameTitle: '艾尔登法环',
        title: '艾尔登法环 新手入门指南',
        content: '欢迎来到交界地...',
        summary: '从零开始的交界地冒险',
        difficulty: 'easy',
        author: '攻略大师',
        tags: ['新手', '入门'],
        steps: [
          { title: '创建角色', content: '选择你的初始职业和遗物...' },
          { title: '离开候王礼拜堂', content: '击败第一个BOSS「接肢贵族」...' },
        ],
        likes: 1200,
        views: 15000,
        estimatedMinutes: 45,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'guide-2',
        gameId: 'game-2',
        gameTitle: '赛博朋克2077',
        title: '全武器收集攻略',
        content: '本攻略涵盖所有传说级武器位置...',
        summary: '全武器位置与获取方式详解',
        difficulty: 'hard',
        author: '收集控',
        tags: ['收集', '武器'],
        steps: [
          { title: '近战武器', content: '传说级武士刀位置...' },
          { title: '远程武器', content: '各区域传说武器分布...' },
        ],
        likes: 890,
        views: 8200,
        estimatedMinutes: 60,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  async getGuide(id: string): Promise<Guide> {
    console.log(`Mock: 获取攻略详情 ${id}`);
    return {
      id,
      gameId: 'game-1',
      gameTitle: '艾尔登法环',
      title: '艾尔登法环 新手入门指南',
      content: '欢迎来到交界地...',
      summary: '从零开始的交界地冒险',
      difficulty: 'easy',
      author: '攻略大师',
      authorId: 'user-1',
      authorDisplayName: '攻略大师',
      tags: ['新手', '入门'],
      steps: [
        { title: '创建角色', content: '选择你的初始职业和遗物...' },
        { title: '离开候王礼拜堂', content: '击败第一个BOSS「接肢贵族」...' },
        { title: '到达圆桌厅堂', content: '与NPC对话获取关键信息...' },
      ],
      likes: 1200,
      views: 15000,
      estimatedMinutes: 45,
      createdAt: new Date().toISOString(),
    };
  }

  async getGameGuides(gameId: string, params?: PaginationParams): Promise<Guide[]> {
    console.log(`Mock: 获取游戏攻略列表 ${gameId}`, params);
    return this.getGuides(params);
  }

  async createGuide(data: GuideCreateInput): Promise<Guide> {
    console.log('Mock: 创建攻略', data);
    return {
      id: 'new-guide',
      gameId: data.gameId,
      title: data.title,
      content: data.content,
      summary: data.summary,
      difficulty: data.difficulty || 'medium',
      author: '当前用户',
      tags: data.tags || [],
      steps: data.steps || [],
      likes: 0,
      views: 0,
      estimatedMinutes: data.estimatedMinutes,
      createdAt: new Date().toISOString(),
    } as Guide;
  }

  async updateGuide(id: string, data: GuideUpdateInput): Promise<Guide> {
    console.log(`Mock: 更新攻略 ${id}`, data);
    return this.getGuide(id);
  }

  async deleteGuide(id: string): Promise<void> {
    console.log(`Mock: 删除攻略 ${id}`);
  }

  async likeGuide(id: string): Promise<Guide> {
    console.log(`Mock: 点赞攻略 ${id}`);
    return this.getGuide(id);
  }

  // 评论相关方法实现（Mock）
  async getComments(parentType: string, parentId: string, params?: PaginationParams): Promise<Comment[]> {
    console.log(`Mock: 获取评论列表 parentType=${parentType}, parentId=${parentId}`);
    return [
      {
        id: 'comment-1',
        content: '这是一个模拟评论',
        authorId: 'user-1',
        parentType: parentType as ParentType,
        parentId,
        likes: 5,
        isEdited: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        replyCount: 2,
        author: {
          id: 'user-1',
          username: 'mockuser',
          displayName: 'Mock User',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
      },
    ];
  }

  async getComment(id: string): Promise<Comment> {
    console.log(`Mock: 获取评论详情 ${id}`);
    return {
      id,
      content: '模拟评论内容',
      authorId: 'user-1',
      parentType: 'review',
      parentId: 'review-1',
      likes: 3,
      isEdited: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: {
        id: 'user-1',
        username: 'mockuser',
        displayName: 'Mock User',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
    };
  }

  async getCommentReplies(commentId: string, params?: PaginationParams): Promise<Comment[]> {
    console.log(`Mock: 获取评论回复 ${commentId}`);
    return [];
  }

  async createComment(data: CommentCreateInput): Promise<Comment> {
    console.log('Mock: 创建评论', data);
    return {
      id: 'mock-comment-id',
      content: data.content,
      authorId: 'mock-user-id',
      parentType: data.parentType,
      parentId: data.parentId,
      parentCommentId: data.parentCommentId,
      likes: 0,
      isEdited: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: {
        id: 'mock-user-id',
        username: 'mockuser',
        displayName: 'Mock User',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
    };
  }

  async updateComment(commentId: string, content: string): Promise<Comment> {
    console.log(`Mock: 更新评论 ${commentId}`, content);
    return {
      id: commentId,
      content,
      authorId: 'mock-user-id',
      parentType: 'review',
      parentId: 'review-1',
      likes: 0,
      isEdited: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: {
        id: 'mock-user-id',
        username: 'mockuser',
        displayName: 'Mock User',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
    };
  }

  async deleteComment(commentId: string): Promise<void> {
    console.log(`Mock: 删除评论 ${commentId}`);
  }

  async likeComment(commentId: string): Promise<CommentLikeResponse> {
    console.log(`Mock: 点赞评论 ${commentId}`);
    return {
      commentId,
      likes: 1,
      liked: true,
    };
  }

  async searchComments(query: string, filters?: any, params?: PaginationParams): Promise<Comment[]> {
    console.log(`Mock: 搜索评论 "${query}"`, filters);
    return [];
  }

  async getCommentStats(parentType?: string, parentId?: string): Promise<CommentStats> {
    console.log(`Mock: 获取评论统计 parentType=${parentType}, parentId=${parentId}`);
    return {
      totalComments: 0,
      totalLikes: 0,
      averageLikesPerComment: 0,
      mostActiveAuthors: [],
    };
  }

  // 搜索相关方法实现（Mock）
  async search(query: string, filters?: SearchFilters, params?: PaginationParams): Promise<SearchResult> {
    console.log(`Mock: 搜索 "${query}"`, filters, params);
    return {
      query,
      results: [
        {
          id: 'game-1',
          type: 'game',
          title: 'Mock Game',
          description: 'This is a mock game for testing search functionality.',
          coverImageUrl: 'https://example.com/game-cover.jpg',
          rating: 4.5,
          reviewCount: 100,
          createdAt: '2026-04-01T00:00:00Z',
        },
        {
          id: 'review-1',
          type: 'review',
          title: 'Great Mock Review',
          content: 'This game is fantastic! The graphics are amazing and gameplay is smooth.',
          author: {
            id: 'user-1',
            username: 'mockuser',
            displayName: 'Mock User',
            avatarUrl: 'https://example.com/avatar.jpg',
          },
          gameTitle: 'Mock Game',
          likes: 25,
          publishedAt: '2026-04-15T10:00:00Z',
        },
      ],
      byType: { game: 1, review: 1 },
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        pages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };
  }

  async getSearchSuggestions(query: string, limit: number = 5): Promise<SearchSuggestion[]> {
    console.log(`Mock: 获取搜索建议 "${query}"`);
    return [
      {
        type: 'game' as const,
        id: 'game-1',
        title: 'Mock Game',
        image: 'https://example.com/game-cover.jpg',
      },
      {
        type: 'user' as const,
        id: 'user-1',
        title: 'Mock User',
        image: 'https://example.com/avatar.jpg',
        subtitle: 'mockuser',
      },
      {
        type: 'review' as const,
        id: 'review-1',
        title: 'Mock Review',
        subtitle: 'Mock Game',
      },
    ].slice(0, limit);
  }

  async getPopularSearches(limit: number = 10): Promise<string[]> {
    console.log('Mock: 获取热门搜索');
    return ['RPG', '射击', '冒险', '多人游戏', '独立游戏', '2024年新游', '免费游戏', 'Steam特惠'].slice(0, limit);
  }

  // ==================== Discovery / Recommendation methods (Mock) ====================

  async advancedSearch(query: string, filters?: AdvancedSearchFilters, params?: PaginationParams): Promise<SearchResult> {
    console.log('Mock: 高级搜索', query, filters, params);
    return {
      query,
      results: [
        { id: 'game-1', type: 'game', title: 'Mock Game', description: '测试搜索功能', coverImageUrl: '', rating: 4.5, reviewCount: 100, createdAt: '2026-04-01' },
        { id: 'review-1', type: 'review', title: 'Mock Review', content: '测试评测内容', author: { id: 'user-1', username: 'mockuser', displayName: 'Mock User' }, gameTitle: 'Mock Game', likes: 25, publishedAt: '2026-04-15' },
      ],
      byType: { game: 1, review: 1 },
      pagination: { page: 1, limit: 20, total: 2, pages: 1, hasNext: false, hasPrev: false },
    };
  }

  async getPersonalizedRecommendations(limit: number = 10): Promise<RecommendationItem[]> {
    console.log('Mock: 获取个性化推荐');
    return ([
      { id: 'game-1', type: 'game' as const, title: 'Elden Ring', coverImageUrl: '', rating: 4.8, reason: '根据您的偏好推荐', score: 95, likes: 1200 },
      { id: 'game-2', type: 'game' as const, title: 'Cyberpunk 2077', coverImageUrl: '', rating: 4.5, reason: '同类型游戏', score: 88, likes: 980 },
      { id: 'game-3', type: 'game' as const, title: 'The Witcher 3', coverImageUrl: '', rating: 4.9, reason: '热门推荐', score: 92, likes: 1500 },
    ] as RecommendationItem[]).slice(0, limit);
  }

  async getRelatedContent(contentType: string, id: string, limit: number = 8): Promise<RecommendationItem[]> {
    console.log('Mock: 获取相关内容', contentType, id);
    return ([
      { id: 'game-4', type: 'game' as const, title: 'Baldur\'s Gate 3', coverImageUrl: '', rating: 4.9, reason: '同类型游戏', score: 90 },
      { id: 'game-5', type: 'game' as const, title: 'Divinity: Original Sin 2', coverImageUrl: '', rating: 4.7, reason: '用户也喜欢', score: 85 },
    ] as RecommendationItem[]).slice(0, limit);
  }

  async getTrendingContent(limit: number = 10): Promise<RecommendationItem[]> {
    console.log('Mock: 获取热门推荐');
    return ([
      { id: 'game-1', type: 'game' as const, title: 'Elden Ring', coverImageUrl: '', rating: 4.8, reason: '热门推荐', score: 98, likes: 1500 },
      { id: 'game-2', type: 'game' as const, title: 'Baldur\'s Gate 3', coverImageUrl: '', rating: 4.9, reason: '热门推荐', score: 95, likes: 1300 },
      { id: 'game-3', type: 'game' as const, title: 'Cyberpunk 2077', coverImageUrl: '', rating: 4.5, reason: '热门推荐', score: 88, likes: 1100 },
    ] as RecommendationItem[]).slice(0, limit);
  }

  async getUsersAlsoLiked(gameId: string, limit: number = 8): Promise<RecommendationItem[]> {
    console.log('Mock: 获取用户也喜欢', gameId);
    return ([
      { id: 'game-6', type: 'game' as const, title: 'Dark Souls III', coverImageUrl: '', rating: 4.7, reason: '3 位用户也喜欢', score: 3 },
      { id: 'game-7', type: 'game' as const, title: 'Sekiro', coverImageUrl: '', rating: 4.6, reason: '2 位用户也喜欢', score: 2 },
    ] as RecommendationItem[]).slice(0, limit);
  }

  async getLeaderboard(type: string, limit: number = 20): Promise<{ type: string; entries: LeaderboardEntry[] }> {
    console.log('Mock: 获取排行榜', type);
    const titles: Record<string, string[]> = {
      top_rated: ['Elden Ring', 'Baldur\'s Gate 3', 'The Witcher 3', 'God of War', 'Red Dead Redemption 2'],
      most_reviewed: ['Cyberpunk 2077', 'Elden Ring', 'The Witcher 3', 'Starfield', 'Diablo IV'],
      most_favorited: ['Elden Ring', 'Baldur\'s Gate 3', 'Zelda: TOTK', 'God of War', 'Hogwarts Legacy'],
      most_discussed: ['Elden Ring', 'Cyberpunk 2077', 'Starfield', 'Baldur\'s Gate 3', 'The Witcher 3'],
    };
    const items = titles[type] || titles.top_rated;
    return {
      type,
      entries: items.slice(0, limit).map((title, i) => ({
        rank: i + 1,
        id: String(i + 1),
        title,
        coverImageUrl: '',
        score: Math.round((5 - i * 0.3) * 10) / 10,
        reviewCount: Math.floor(Math.random() * 500) + 50,
        rating: (5 - i * 0.2).toFixed(1),
        trend: i < 2 ? 'up' : i > 3 ? 'down' : 'stable',
      })),
    };
  }

  async getSearchTrendData(days: number = 30): Promise<SearchTrendData[]> {
    console.log('Mock: 获取搜索趋势数据');
    const data: SearchTrendData[] = [];
    for (let i = days; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      data.push({
        date: d.toISOString().split('T')[0],
        totalSearches: Math.floor(Math.random() * 100) + 20,
        uniqueQueries: Math.floor(Math.random() * 30) + 5,
      });
    }
    return data;
  }

  async getSearchTrends(topN: number = 20, days: number = 30): Promise<SearchTrend[]> {
    console.log('Mock: 获取搜索热词趋势');
    const keywords = ['Elden Ring', 'Cyberpunk 2077', 'Baldur\'s Gate 3', 'RPG', '射击游戏', 'Steam 特惠'];
    return keywords.slice(0, topN).map((keyword) => {
      const trend: TrendPoint[] = [];
      for (let i = days; i >= 0; i -= 3) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        trend.push({ date: d.toISOString().split('T')[0], value: Math.floor(Math.random() * 20) + 1 });
      }
      return { keyword, count: Math.floor(Math.random() * 100) + 10, trend };
    });
  }

  async getGameTrends(days: number = 30, limit: number = 10): Promise<GameTrendData[]> {
    console.log('Mock: 获取游戏趋势');
    const games = ['Elden Ring', 'Baldur\'s Gate 3', 'Cyberpunk 2077'];
    return games.slice(0, limit).map((title, idx) => {
      const data: TrendPoint[] = [];
      for (let i = days; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        data.push({ date: d.toISOString().split('T')[0], value: Math.floor(Math.random() * 5) });
      }
      return { gameId: String(idx + 1), title, data };
    });
  }

  async getDiscoveryDistributions(): Promise<DistributionData> {
    console.log('Mock: 获取分布数据');
    return {
      platforms: [
        { name: 'PC', count: 120, percentage: 35.3 },
        { name: 'PS5', count: 85, percentage: 25.0 },
        { name: 'Xbox', count: 65, percentage: 19.1 },
        { name: 'Nintendo', count: 45, percentage: 13.2 },
        { name: 'Mobile', count: 25, percentage: 7.4 },
      ],
      genres: [
        { name: 'RPG', count: 80, percentage: 23.5 },
        { name: 'Action', count: 95, percentage: 27.9 },
        { name: 'Adventure', count: 60, percentage: 17.6 },
        { name: 'Strategy', count: 35, percentage: 10.3 },
        { name: 'Simulation', count: 40, percentage: 11.8 },
        { name: 'Sports', count: 30, percentage: 8.8 },
      ],
    };
  }

  async getCommunitySummary(): Promise<CommunitySummary> {
    console.log('Mock: 获取社区统计');
    return {
      totalUsers: 12458, totalGames: 342, totalReviews: 2890,
      totalPosts: 1240, totalComments: 5670,
      newUsersToday: 23, newReviewsToday: 8, newPostsToday: 5,
      activeUsers: 8920,
    };
  }

  // 通知相关方法实现（Mock）
  async getNotifications(params?: NotificationQueryParams): Promise<Notification[]> {
    console.log('Mock: 获取通知列表', params);
    return [
      {
        id: 'notification-1',
        userId: 'user-1',
        type: 'like',
        title: '新点赞',
        message: '用户 Mock User 点赞了您的评测',
        isRead: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'notification-2',
        userId: 'user-1',
        type: 'comment',
        title: '新评论',
        message: '用户 Another User 评论了您的帖子',
        isRead: true,
        readAt: new Date(Date.now() - 3600000).toISOString(),
        createdAt: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: 'notification-3',
        userId: 'user-1',
        type: 'system',
        title: '系统通知',
        message: '系统维护将于今晚进行',
        isRead: false,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
  }

  async getUnreadCount(): Promise<number> {
    console.log('Mock: 获取未读通知数量');
    return 2;
  }

  async markAsRead(notificationId: string): Promise<void> {
    console.log(`Mock: 标记通知为已读 ${notificationId}`);
  }

  async markAllAsRead(): Promise<void> {
    console.log('Mock: 标记所有通知为已读');
  }

  // ==================== Admin Notification Management (Mock) ====================
  async getNotificationStats(): Promise<{ total: number; unread: number; byType: Record<string, number> }> {
    console.log('Mock: 获取通知统计');
    return { total: 10, unread: 2, byType: { system: 5, review: 3, community: 2 } };
  }

  async deleteNotification(id: string): Promise<void> {
    console.log(`Mock: 删除通知 ${id}`);
  }

  async deleteAllNotifications(): Promise<void> {
    console.log('Mock: 删除所有通知');
  }

  async sendSystemNotification(data: { title: string; message: string; type?: string; targetUrl?: string }): Promise<void> {
    console.log('Mock: 发送系统通知', data);
  }

  async sendMarketingNotification(data: { title: string; message: string; targetUserIds?: string[]; targetUrl?: string; scheduledAt?: string }): Promise<void> {
    console.log('Mock: 发送营销通知', data);
  }

  // 游戏库相关方法实现（Mock）
  async getUserGameLibrary(params?: {
    status?: LibraryStatus;
    platform?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
    search?: string;
  }): Promise<{ games: UserGameLibrary[]; pagination: any }> {
    console.log('Mock: 获取用户游戏库', params);
    // 返回模拟数据
    const mockGames: UserGameLibrary[] = [
      {
        id: '1',
        userId: 'mock-user-id',
        gameId: '1',
        gameTitle: 'Cyberpunk 2077',
        gameSlug: 'cyberpunk-2077',
        status: LibraryStatus.PLAYING,
        addedAt: '2026-04-20T10:30:00Z',
        lastPlayedAt: '2026-04-22T15:45:00Z',
        statusUpdatedAt: '2026-04-20T10:30:00Z',
        platforms: [
          { platformType: PlatformType.PC, platformName: 'PC', owned: true, purchaseDate: '2026-04-15' },
          { platformType: PlatformType.PLAYSTATION, platformName: 'PS5', owned: false },
        ],
        personalRating: 4.5,
        personalNotes: '优秀的开放世界游戏，剧情深刻',
        tags: ['科幻', 'RPG', '开放世界'],
        primaryPlatform: PlatformType.PC,
        createdAt: '2026-04-20T10:30:00Z',
        updatedAt: '2026-04-22T15:45:00Z',
      },
      {
        id: '2',
        userId: 'mock-user-id',
        gameId: '2',
        gameTitle: 'The Legend of Zelda: Tears of the Kingdom',
        gameSlug: 'zelda-tears-of-the-kingdom',
        status: LibraryStatus.COMPLETED,
        addedAt: '2026-04-10T14:20:00Z',
        lastPlayedAt: '2026-04-18T20:15:00Z',
        statusUpdatedAt: '2026-04-18T20:15:00Z',
        platforms: [
          { platformType: PlatformType.NINTENDO, platformName: 'Nintendo Switch', owned: true, purchaseDate: '2026-04-05' },
        ],
        personalRating: 5,
        personalNotes: '史上最佳游戏之一，探索感无敌',
        tags: ['冒险', '动作', '解谜'],
        primaryPlatform: PlatformType.NINTENDO,
        createdAt: '2026-04-10T14:20:00Z',
        updatedAt: '2026-04-18T20:15:00Z',
      },
    ];

    // 应用筛选（简单模拟）
    let filteredGames = [...mockGames];
    if (params?.status) {
      filteredGames = filteredGames.filter(game => game.status === params.status);
    }
    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      filteredGames = filteredGames.filter(game =>
        game.gameTitle.toLowerCase().includes(searchLower) ||
        game.personalNotes?.toLowerCase().includes(searchLower)
      );
    }

    return {
      games: filteredGames,
      pagination: {
        page: params?.page || 1,
        limit: params?.limit || 20,
        total: filteredGames.length,
        pages: Math.ceil(filteredGames.length / (params?.limit || 20)),
      },
    };
  }

  async getLibraryStats(): Promise<{
    totalGames: number;
    byStatus: Record<string, number>;
    byPlatform: Record<string, number>;
    totalPlayTime: number;
    averageRating?: number;
  }> {
    console.log('Mock: 获取游戏库统计');
    return {
      totalGames: 2,
      byStatus: {
        playing: 1,
        completed: 1,
      },
      byPlatform: {
        pc: 1,
        playstation: 1,
        nintendo: 1,
      },
      totalPlayTime: 85600,
      averageRating: 4.75,
    };
  }

  async addGameToLibrary(data: {
    gameId: string;
    status: LibraryStatus;
    platforms: PlatformOwnership[];
    personalRating?: number;
    personalNotes?: string;
    tags?: string[];
    primaryPlatform?: PlatformType;
  }): Promise<UserGameLibrary> {
    console.log(`Mock: 添加游戏到库`, data);
    return {
      id: 'mock-library-id',
      userId: 'mock-user-id',
      gameId: data.gameId,
      gameTitle: 'Mock Game',
      gameSlug: 'mock-game',
      status: data.status,
      addedAt: new Date().toISOString(),
      lastPlayedAt: undefined,
      statusUpdatedAt: new Date().toISOString(),
      platforms: data.platforms,
      personalRating: data.personalRating,
      personalNotes: data.personalNotes,
      tags: data.tags || [],
      primaryPlatform: data.primaryPlatform,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async updateGameLibraryEntry(libraryId: string, data: {
    status?: LibraryStatus;
    platforms?: PlatformOwnership[];
    personalRating?: number;
    personalNotes?: string;
    tags?: string[];
    primaryPlatform?: PlatformType;
  }): Promise<UserGameLibrary> {
    console.log(`Mock: 更新游戏库条目 ${libraryId}`, data);
    return {
      id: libraryId,
      userId: 'mock-user-id',
      gameId: 'mock-game-id',
      gameTitle: 'Updated Mock Game',
      gameSlug: 'updated-mock-game',
      status: data.status || LibraryStatus.OWNED,
      addedAt: '2026-04-01T00:00:00Z',
      lastPlayedAt: undefined,
      statusUpdatedAt: new Date().toISOString(),
      platforms: data.platforms || [{ platformType: PlatformType.PC, platformName: 'PC', owned: true }],
      personalRating: data.personalRating,
      personalNotes: data.personalNotes,
      tags: data.tags || [],
      primaryPlatform: data.primaryPlatform,
      createdAt: '2026-04-01T00:00:00Z',
      updatedAt: new Date().toISOString(),
    };
  }

  async removeGameFromLibrary(libraryId: string): Promise<void> {
    console.log(`Mock: 从库中移除游戏 ${libraryId}`);
  }

  async searchUserLibrary(query: string, options?: {
    status?: LibraryStatus;
    platform?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ games: UserGameLibrary[]; total: number }> {
    console.log(`Mock: 搜索用户游戏库 "${query}"`, options);
    const mockGames = await this.getUserGameLibrary();
    const filteredGames = mockGames.games.filter(game =>
      game.gameTitle.toLowerCase().includes(query.toLowerCase()) ||
      game.personalNotes?.toLowerCase().includes(query.toLowerCase())
    );
    return {
      games: filteredGames.slice(options?.offset || 0, (options?.offset || 0) + (options?.limit || 20)),
      total: filteredGames.length,
    };
  }

  async getLibraryEntryDetails(libraryId: string): Promise<{
    libraryEntry: UserGameLibrary;
    gameDetails: Game;
  }> {
    console.log(`Mock: 获取游戏库条目详情 ${libraryId}`);
    const libraryEntry: UserGameLibrary = {
      id: libraryId,
      userId: 'mock-user-id',
      gameId: 'mock-game-id',
      gameTitle: 'Mock Game',
      gameSlug: 'mock-game',
      status: LibraryStatus.OWNED,
      addedAt: '2026-04-01T00:00:00Z',
      lastPlayedAt: undefined,
      statusUpdatedAt: '2026-04-01T00:00:00Z',
      platforms: [{ platformType: PlatformType.PC, platformName: 'PC', owned: true }],
      personalRating: 4.5,
      personalNotes: '这是一个模拟游戏',
      tags: ['模拟', '测试'],
      primaryPlatform: PlatformType.PC,
      createdAt: '2026-04-01T00:00:00Z',
      updatedAt: '2026-04-01T00:00:00Z',
    };

    const gameDetails: Game = {
      id: 'mock-game-id',
      title: 'Mock Game',
      description: '这是一个用于测试的模拟游戏',
      rating: 4.5,
      releaseDate: '2024-01-01',
      developer: 'Mock Dev',
      publisher: 'Mock Publisher',
      genres: ['模拟'],
      platforms: ['PC'],
      price: 59.99,
      imageUrl: 'https://example.com/game-cover.jpg',
      screenshots: [],
    };

    return { libraryEntry, gameDetails };
  }

  async updateLastPlayed(gameId: string): Promise<void> {
    console.log(`Mock: 更新最后游玩时间 ${gameId}`);
  }

  async importExternalLibrary(externalData: Array<{
    gameId: string;
    gameTitle: string;
    gameSlug: string;
    status: LibraryStatus;
    platforms: PlatformOwnership[];
    purchaseDate?: Date;
  }>): Promise<number> {
    console.log('Mock: 导入外部游戏库', externalData);
    return externalData.length;
  }

  async getBatchLibraryStatus(gameIds: string[]): Promise<Record<string, boolean>> {
    console.log('Mock: 批量获取游戏库状态', gameIds);
    const result: Record<string, boolean> = {};
    gameIds.forEach(gameId => {
      result[gameId] = Math.random() > 0.5; // 随机返回true/false
    });
    return result;
  }

  // 关于页面相关方法
  async getAboutData(): Promise<AboutAllData> {
    return {
      hero: { id: 1, sectionKey: 'hero', title: '关于 GameHub', description: 'GameHub 是一个专注于游戏爱好者的社区平台，致力于为玩家提供最好的游戏资讯、评测、交流和发现体验。', imageUrl: null, sortOrder: 1, isActive: 1, createdAt: '', updatedAt: '' },
      mission: { id: 2, sectionKey: 'mission', title: '我们的使命', description: '连接每一位游戏爱好者，打造最纯粹、最热情的游戏社区。让每一位玩家都能在这里找到属于自己的游戏世界。', imageUrl: null, sortOrder: 2, isActive: 1, createdAt: '', updatedAt: '' },
      vision: { id: 3, sectionKey: 'vision', title: '我们的愿景', description: '成为全球领先的游戏社区平台，推动游戏文化的发展，让游戏连接更多人，创造更多快乐。', imageUrl: null, sortOrder: 3, isActive: 1, createdAt: '', updatedAt: '' },
      values: [
        { id: 1, icon: 'TeamOutlined', title: '玩家至上', description: '一切以玩家体验为核心，不断优化产品和服务', sortOrder: 1, isActive: 1 },
        { id: 2, icon: 'RocketOutlined', title: '创新驱动', description: '持续探索新技术、新玩法，引领游戏社区创新', sortOrder: 2, isActive: 1 },
        { id: 3, icon: 'HeartOutlined', title: '热情社区', description: '营造友善、包容的社区氛围，让每位玩家找到归属感', sortOrder: 3, isActive: 1 },
        { id: 4, icon: 'TrophyOutlined', title: '追求卓越', description: '精益求精，为玩家提供最优质的内容和服务体验', sortOrder: 4, isActive: 1 },
      ],
      teamMembers: [
        { id: 1, name: '张明', role: '创始人 & CEO', avatarUrl: null, description: '资深游戏玩家，15年行业经验', sortOrder: 1, isActive: 1 },
        { id: 2, name: '李华', role: 'CTO', avatarUrl: null, description: '全栈工程师，技术架构专家', sortOrder: 2, isActive: 1 },
        { id: 3, name: '王芳', role: '产品总监', avatarUrl: null, description: '专注于用户体验设计', sortOrder: 3, isActive: 1 },
        { id: 4, name: '陈伟', role: '运营总监', avatarUrl: null, description: '社区运营与玩家生态建设', sortOrder: 4, isActive: 1 },
      ],
      timeline: [
        { id: 1, year: '2024 Q1', title: '项目启动', description: 'GameHub 项目正式立项，组建核心团队', sortOrder: 1, isActive: 1 },
        { id: 2, year: '2024 Q2', title: '原型开发', description: '完成产品原型设计与核心功能开发', sortOrder: 2, isActive: 1 },
        { id: 3, year: '2024 Q3', title: '内测上线', description: '开启封闭内测，邀请核心玩家参与测试', sortOrder: 3, isActive: 1 },
        { id: 4, year: '2024 Q4', title: '正式发布', description: 'GameHub 正式面向公众开放', sortOrder: 4, isActive: 1 },
      ],
      contacts: [
        { id: 1, label: '邮箱', value: 'contact@gamehub.com', sortOrder: 1, isActive: 1 },
        { id: 2, label: '地址', value: '北京市海淀区中关村科技园', sortOrder: 2, isActive: 1 },
        { id: 3, label: '商务合作', value: 'partner@gamehub.com', sortOrder: 3, isActive: 1 },
      ],
    };
  }

  async updateAboutSection(key: string, _data: any): Promise<void> {
    console.log('Mock: 更新关于板块', key);
  }
  async updateAboutValue(id: number, _data: any): Promise<void> {
    console.log('Mock: 更新核心价值', id);
  }
  async updateAboutTeamMember(id: number, _data: any): Promise<void> {
    console.log('Mock: 更新团队成员', id);
  }
  async updateAboutTimeline(id: number, _data: any): Promise<void> {
    console.log('Mock: 更新发展历程', id);
  }
  async updateAboutContact(id: number, _data: any): Promise<void> {
    console.log('Mock: 更新联系方式', id);
  }

  // ==================== Upload methods (Mock) ====================
  async getUploadedFiles(params?: { page?: number; limit?: number }): Promise<{ files: UploadedFileInfo[]; pagination: { page: number; limit: number; total: number } }> {
    const files: UploadedFileInfo[] = [
      { id: 'mock-1', filename: 'test-image.jpg', originalName: 'test-image.jpg', mimeType: 'image/jpeg', size: 102400, url: 'https://placehold.co/400x300', createdAt: new Date().toISOString(), path: '/uploads/image/test-image.jpg' },
      { id: 'mock-2', filename: 'doc.pdf', originalName: 'doc.pdf', mimeType: 'application/pdf', size: 204800, url: '/uploads/document/doc.pdf', createdAt: new Date().toISOString(), path: '/uploads/document/doc.pdf' },
    ];
    return { files, pagination: { page: params?.page || 1, limit: params?.limit || 20, total: files.length } };
  }

  async getUploadConfig(): Promise<{ config: UploadConfig; features: string[] }> {
    return {
      config: {
        maxSize: 10485760,
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
        image: { maxWidth: 1920, maxHeight: 1920, quality: 80 },
        cdn: { enabled: false, baseUrl: '', provider: 'local' },
        validation: { checkMimeType: true, checkFileSize: true, virusScan: false },
      },
      features: ['image', 'document'],
    };
  }

  async uploadFile(file: File): Promise<UploadedFileInfo> {
    console.log('Mock: 上传文件', file.name);
    return {
      id: 'mock-file-id',
      filename: file.name,
      originalName: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      path: `/uploads/${file.name}`,
      url: URL.createObjectURL(file),
      createdAt: new Date().toISOString(),
    };
  }

  async uploadImage(file: File): Promise<UploadImageInfo> {
    console.log('Mock: 上传图片', file.name);
    return {
      id: 'mock-image-id',
      filename: file.name,
      originalName: file.name,
      mimeType: file.type || 'image/png',
      size: file.size,
      path: `/uploads/${file.name}`,
      url: URL.createObjectURL(file),
      createdAt: new Date().toISOString(),
      width: 1920,
      height: 1080,
      format: 'png',
    };
  }

  async uploadDocument(file: File): Promise<UploadDocumentInfo> {
    console.log('Mock: 上传文档', file.name);
    return {
      id: 'mock-doc-id',
      filename: file.name,
      originalName: file.name,
      mimeType: file.type || 'application/pdf',
      size: file.size,
      path: `/uploads/${file.name}`,
      url: URL.createObjectURL(file),
      createdAt: new Date().toISOString(),
      pages: 5,
      format: 'pdf',
    };
  }

  async getFileInfo(filename: string): Promise<UploadedFileInfo> {
    console.log(`Mock: 获取文件信息 ${filename}`);
    return {
      id: 'mock-file-id',
      filename,
      originalName: filename,
      mimeType: 'image/png',
      size: 1024000,
      path: `/uploads/${filename}`,
      url: `https://example.com/uploads/${filename}`,
      createdAt: new Date().toISOString(),
    };
  }

  async deleteFile(filename: string): Promise<void> {
    console.log(`Mock: 删除文件 ${filename}`);
  }

  // ==================== Email management methods (Mock) ====================
  async getEmailTemplates(params?: PaginationParams): Promise<{ templates: EmailTemplate[]; pagination: any }> {
    console.log('Mock: 获取邮件模板列表', params);
    return {
      templates: [
        {
          id: 'template-1',
          name: '欢迎邮件',
          description: '新用户注册欢迎邮件',
          templateType: 'welcome',
          subject: '欢迎加入 GameHub！',
          body: '<h1>欢迎, {{username}}!</h1><p>感谢您注册 GameHub。</p>',
          variables: [
            { key: 'username', label: '用户名', required: true },
            { key: 'confirmLink', label: '验证链接', required: true },
          ],
          isActive: true,
          createdAt: '2026-04-01T00:00:00Z',
          updatedAt: '2026-04-01T00:00:00Z',
        },
        {
          id: 'template-2',
          name: '密码重置',
          description: '密码重置邮件',
          templateType: 'password_reset',
          subject: '重置您的密码',
          body: '<p>点击以下链接重置密码: {{resetLink}}</p>',
          variables: [
            { key: 'resetLink', label: '重置链接', required: true },
          ],
          isActive: true,
          createdAt: '2026-04-01T00:00:00Z',
          updatedAt: '2026-04-01T00:00:00Z',
        },
      ],
      pagination: { page: 1, limit: 20, total: 2, pages: 1, hasNext: false, hasPrev: false },
    };
  }

  async getEmailTemplate(id: string): Promise<EmailTemplate> {
    console.log(`Mock: 获取邮件模板 ${id}`);
    return {
      id,
      name: '欢迎邮件',
      description: '新用户注册欢迎邮件',
      templateType: 'welcome',
      subject: '欢迎加入 GameHub！',
      body: '<h1>欢迎, {{username}}!</h1><p>感谢您注册 GameHub。</p>',
      variables: [
        { key: 'username', label: '用户名', required: true },
        { key: 'confirmLink', label: '验证链接', required: true },
      ],
      isActive: true,
      createdAt: '2026-04-01T00:00:00Z',
      updatedAt: '2026-04-01T00:00:00Z',
    };
  }

  async createEmailTemplate(data: Record<string, unknown>): Promise<EmailTemplate> {
    console.log('Mock: 创建邮件模板', data);
    return { id: 'mock-template-id', ...data } as unknown as EmailTemplate;
  }

  async updateEmailTemplate(id: string, data: Record<string, unknown>): Promise<EmailTemplate> {
    console.log(`Mock: 更新邮件模板 ${id}`, data);
    return { id, ...data } as unknown as EmailTemplate;
  }

  async deleteEmailTemplate(id: string): Promise<void> {
    console.log(`Mock: 删除邮件模板 ${id}`);
  }

  async duplicateEmailTemplate(id: string, newName: string): Promise<EmailTemplate> {
    console.log(`Mock: 复制邮件模板 ${id} 为 ${newName}`);
    return {
      id: 'mock-duplicate-id',
      name: newName,
      description: '副本',
      templateType: 'welcome',
      subject: '欢迎加入 GameHub！',
      body: '<h1>欢迎!</h1>',
      variables: [],
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async renderEmailTemplate(id: string, variables?: Record<string, string>): Promise<{ rendered: string; variables: Record<string, string> }> {
    console.log(`Mock: 渲染邮件模板 ${id}`, variables);
    return {
      rendered: '<h1>Mock Rendered Email</h1>',
      variables: variables || {},
    };
  }

  async sendTestEmail(to: string, templateType: string, _variables?: Record<string, string>): Promise<EmailSendResult> {
    console.log(`Mock: 发送测试邮件到 ${to}, 类型: ${templateType}`);
    return { success: true, recipient: to };
  }

  async sendBulkEmail(data: { recipients: string[]; templateType: string; templateName?: string; variables?: Record<string, string> }): Promise<{ results: EmailSendResult[]; summary: EmailBulkSummary }> {
    console.log(`Mock: 批量发送邮件`, data);
    return {
      results: data.recipients.map(r => ({ success: true, recipient: r })),
      summary: { total: data.recipients.length, success: data.recipients.length, failed: 0 },
    };
  }

  async getEmailQueueStatus(): Promise<EmailQueueStatus> {
    console.log('Mock: 获取邮件队列状态');
    return { pending: 5, processing: 2, failed: 1, sent: 100, total: 108 };
  }

  async clearEmailQueue(): Promise<void> {
    console.log('Mock: 清除邮件队列');
  }

  // ==================== Follow methods (Mock) ====================
  async followUser(userId: string): Promise<void> {
    console.log(`Mock: 关注用户 ${userId}`);
  }

  async unfollowUser(userId: string): Promise<void> {
    console.log(`Mock: 取消关注用户 ${userId}`);
  }

  async getFollowers(userId: string, params?: PaginationParams): Promise<{ followers: FollowUser[]; pagination: any }> {
    console.log(`Mock: 获取粉丝列表 ${userId}`, params);
    return {
      followers: [
        { id: 'follower-1', username: 'fan1', displayName: '忠实粉丝1号', avatarUrl: undefined, followedAt: '2026-04-10T10:00:00Z' },
        { id: 'follower-2', username: 'fan2', displayName: '忠实粉丝2号', avatarUrl: undefined, followedAt: '2026-04-11T10:00:00Z' },
      ],
      pagination: { page: 1, limit: 20, total: 2, pages: 1, hasNext: false, hasPrev: false },
    };
  }

  async getFollowing(userId: string, params?: PaginationParams): Promise<{ following: FollowUser[]; pagination: any }> {
    console.log(`Mock: 获取关注列表 ${userId}`, params);
    return {
      following: [
        { id: 'following-1', username: 'dev1', displayName: '开发者小明', avatarUrl: undefined, followedAt: '2026-04-05T10:00:00Z' },
        { id: 'following-2', username: 'dev2', displayName: '游戏达人', avatarUrl: undefined, followedAt: '2026-04-06T10:00:00Z' },
      ],
      pagination: { page: 1, limit: 20, total: 2, pages: 1, hasNext: false, hasPrev: false },
    };
  }

  async getFollowStatus(userId: string): Promise<FollowStatus> {
    console.log(`Mock: 获取关注状态 ${userId}`);
    return { isFollowing: false };
  }

  async getFollowStats(userId?: string): Promise<FollowStats> {
    console.log(`Mock: 获取关注统计`, userId);
    return { followersCount: 42, followingCount: 18 };
  }

  async getMutualFollows(userId: string): Promise<{ mutualFollows: FollowUser[]; count: number }> {
    console.log(`Mock: 获取共同关注 ${userId}`);
    return {
      mutualFollows: [
        { id: 'mutual-1', username: 'common1', displayName: '共同好友1号', avatarUrl: undefined },
      ],
      count: 1,
    };
  }

  // ==================== Like methods (Mock) ====================
  async addLike(targetType: LikeTargetType, targetId: string): Promise<void> {
    console.log(`Mock: 点赞 targetType=${targetType}, targetId=${targetId}`);
  }

  async removeLike(targetType: LikeTargetType, targetId: string): Promise<void> {
    console.log(`Mock: 取消点赞 targetType=${targetType}, targetId=${targetId}`);
  }

  async getLikeStatus(targetType: LikeTargetType, targetId: string): Promise<LikeStatus> {
    console.log(`Mock: 获取点赞状态 targetType=${targetType}, targetId=${targetId}`);
    return { hasLiked: false };
  }

  async getTargetLikes(targetType: LikeTargetType, targetId: string, params?: PaginationParams): Promise<{ likes: LikeEntry[]; pagination: any }> {
    console.log(`Mock: 获取目标点赞列表 targetType=${targetType}, targetId=${targetId}`, params);
    return {
      likes: [
        {
          id: 'like-1',
          userId: 'user-1',
          targetType,
          targetId,
          createdAt: new Date().toISOString(),
          user: { id: 'user-1', username: 'mockuser', displayName: 'Mock User', avatarUrl: undefined },
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, pages: 1, hasNext: false, hasPrev: false },
    };
  }

  async getUserLikes(params?: PaginationParams): Promise<{ likes: LikeEntry[]; pagination: any }> {
    console.log('Mock: 获取用户点赞列表', params);
    return {
      likes: [
        {
          id: 'like-1',
          userId: 'mock-user-id',
          targetType: 'review',
          targetId: 'review-1',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'like-2',
          userId: 'mock-user-id',
          targetType: 'news',
          targetId: 'news-1',
          createdAt: new Date().toISOString(),
        },
      ],
      pagination: { page: 1, limit: 20, total: 2, pages: 1, hasNext: false, hasPrev: false },
    };
  }

  async getLikeStats(targetType?: string, targetId?: string): Promise<LikeStats> {
    console.log(`Mock: 获取点赞统计 targetType=${targetType}, targetId=${targetId}`);
    return { totalLikes: 128, targetType, targetId };
  }

  // ==================== Email verification (Mock) ====================
  async verifyEmail(token: string): Promise<void> {
    console.log(`Mock: 执行验证邮箱 token=${token}`);
    if (!token) throw new Error('验证令牌不能为空');
  }

  async checkVerificationToken(token: string): Promise<{ valid: boolean }> {
    console.log(`Mock: 检查令牌 token=${token}`);
    return { valid: !!token };
  }

  async resendVerificationEmail(email: string): Promise<void> {
    console.log(`Mock: 重新发送验证邮件 to ${email}`);
  }

  async checkEmail(_email: string): Promise<{ available: boolean }> {
    console.log(`Mock: 检查邮箱 ${_email}`);
    return { available: true };
  }

  // ==================== Analytics methods (Mock) ====================
  async getUserGrowthTrend(period: string = 'daily', days: number = 30): Promise<UserGrowthPoint[]> {
    console.log(`Mock: getUserGrowthTrend period=${period} days=${days}`);
    const data: UserGrowthPoint[] = [];
    let cumulative = 100;
    for (let i = days; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const newUsers = Math.floor(Math.random() * 10) + 1;
      cumulative += newUsers;
      data.push({ date: d.toISOString().split('T')[0], newUsers, cumulative });
    }
    return data;
  }

  async getGamePopularity(sortBy: string = 'rating', limit: number = 10): Promise<GamePopularityItem[]> {
    console.log(`Mock: getGamePopularity sortBy=${sortBy} limit=${limit}`);
    const titles = ['Cyberpunk 2077', 'Elden Ring', 'Baldur\'s Gate 3', 'The Witcher 3', 'Zelda: TOTK', 'Starfield', 'Red Dead Redemption 2', 'God of War', 'Hogwarts Legacy', 'Diablo IV'];
    return titles.slice(0, limit).map((title, i) => ({
      id: String(i + 1),
      title,
      rating: Math.round((4 + Math.random()) * 10) / 10,
      reviewCount: Math.floor(Math.random() * 500) + 50,
      avgScore: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
      price: Math.round(Math.random() * 60 * 10) / 10 + 9.99,
      discount: Math.random() > 0.5 ? Math.floor(Math.random() * 50) : 0,
      platforms: ['PC', 'PS5', 'Xbox'].slice(0, Math.floor(Math.random() * 3) + 1),
      genres: ['RPG', 'Action', 'Adventure'].slice(0, Math.floor(Math.random() * 3) + 1),
    }));
  }

  async getContentEngagement(days: number = 30): Promise<ContentEngagement> {
    console.log(`Mock: getContentEngagement days=${days}`);
    const daily: Array<{ date: string; type: string; count: number }> = [];
    for (let i = days; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      daily.push({ date: dateStr, type: 'reviews', count: Math.floor(Math.random() * 5) });
      daily.push({ date: dateStr, type: 'posts', count: Math.floor(Math.random() * 8) });
      daily.push({ date: dateStr, type: 'comments', count: Math.floor(Math.random() * 20) });
    }
    return {
      newsViews: Math.floor(Math.random() * 5000) + 1000,
      reviews: Math.floor(Math.random() * 100) + 20,
      posts: Math.floor(Math.random() * 200) + 30,
      comments: Math.floor(Math.random() * 500) + 50,
      daily,
    };
  }

  async getDistributions(): Promise<Distributions> {
    console.log('Mock: getDistributions');
    const platforms = [
      { name: 'PC', count: 120, percentage: 35.3 },
      { name: 'PS5', count: 85, percentage: 25.0 },
      { name: 'Xbox', count: 65, percentage: 19.1 },
      { name: 'Nintendo', count: 45, percentage: 13.2 },
      { name: 'Mobile', count: 25, percentage: 7.4 },
    ];
    const genres = [
      { name: 'RPG', count: 80, percentage: 23.5 },
      { name: 'Action', count: 95, percentage: 27.9 },
      { name: 'Adventure', count: 60, percentage: 17.6 },
      { name: 'Strategy', count: 35, percentage: 10.3 },
      { name: 'Simulation', count: 40, percentage: 11.8 },
      { name: 'Sports', count: 30, percentage: 8.8 },
    ];
    return { platforms, genres };
  }

  async getActiveUsers(days: number = 30): Promise<ActiveUserData> {
    console.log(`Mock: getActiveUsers days=${days}`);
    const daily: ActiveUserDataPoint[] = [];
    for (let i = days; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      daily.push({
        date: d.toISOString().split('T')[0],
        logins: Math.floor(Math.random() * 200) + 50,
        activeUsers: Math.floor(Math.random() * 80) + 20,
      });
    }
    return {
      totalLogins: daily.reduce((s, d) => s + d.logins, 0),
      activeUsers: Math.floor(Math.random() * 200) + 100,
      newUsers: Math.floor(Math.random() * 50) + 10,
      avgLoginsPerUser: 3.5,
      daily,
    };
  }

  async getDashboardStats(): Promise<DashboardStats> {
    console.log('Mock: getDashboardStats');
    const trends: DashboardTrendPoint[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      trends.push({ date: d.toISOString().split('T')[0], count: Math.floor(Math.random() * 20) + 5 });
    }
    return {
      users: { total: 12458, active: 8920, newToday: 23, growth: 12.5 },
      games: { total: 342, growth: 8.2 },
      news: { total: 156 },
      reviews: { total: 2890, newToday: 8, growth: 15.3 },
      community: { posts: 1240, comments: 5670 },
      trends: { users7d: trends },
    };
  }

  async getAuditLogStats(days: number = 30): Promise<AuditLogStat[]> {
    console.log(`Mock: getAuditLogStats days=${days}`);
    return [
      { action: 'create', count: 45 },
      { action: 'update', count: 120 },
      { action: 'delete', count: 12 },
      { action: 'login', count: 1560 },
      { action: 'role_change', count: 3 },
    ];
  }

  // ==================== Profiling methods (Mock) ====================
  async getProfilingTags(): Promise<UserTag[]> {
    console.log('Mock: getProfilingTags');
    return [
      { id: 1, name: '高活跃', color: '#52c41a', description: '登录频率高的活跃用户' },
      { id: 2, name: '内容创作者', color: '#1890ff', description: '发布过较多评测或帖子的用户' },
      { id: 3, name: '新用户', color: '#faad14', description: '注册时间不足30天的新用户' },
      { id: 4, name: '核心玩家', color: '#722ed1', description: '游戏库丰富、参与度高的用户' },
      { id: 5, name: '沉睡用户', color: '#d9d9d9', description: '超过30天未登录的潜在流失用户' },
      { id: 6, name: 'VIP', color: '#f5222d', description: '特殊贡献或付费用户' },
    ];
  }

  async createProfilingTag(name: string, color?: string, description?: string): Promise<UserTag> {
    console.log('Mock: createProfilingTag', name, color, description);
    return { id: Date.now(), name, color: color || '#1890ff', description };
  }

  async deleteProfilingTag(id: number): Promise<void> {
    console.log('Mock: deleteProfilingTag', id);
  }

  async assignTagToUser(userId: string, tagId: number): Promise<void> {
    console.log('Mock: assignTagToUser', userId, tagId);
  }

  async removeTagFromUser(userId: string, tagId: number): Promise<void> {
    console.log('Mock: removeTagFromUser', userId, tagId);
  }

  async getUserTags(userId: string): Promise<UserTag[]> {
    console.log('Mock: getUserTags', userId);
    return [];
  }

  async getSegments(): Promise<UserSegment[]> {
    console.log('Mock: getSegments');
    return [
      { id: 1, name: '活跃玩家', description: '最近30天登录超过10次的用户', criteria: '{}', isDynamic: 1, memberCount: 128, created_at: '2026-04-01', updated_at: '2026-04-01' },
      { id: 2, name: '内容贡献者', description: '发布过5篇以上评测或帖子的用户', criteria: '{}', isDynamic: 1, memberCount: 56, created_at: '2026-04-05', updated_at: '2026-04-05' },
    ];
  }

  async createSegment(data: { name: string; description?: string; criteria?: any; isDynamic?: boolean }): Promise<UserSegment> {
    console.log('Mock: createSegment', data);
    return { id: Date.now(), name: data.name, description: data.description, isDynamic: data.isDynamic ? 1 : 0, memberCount: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  }

  async updateSegment(id: number, data: any): Promise<UserSegment> {
    console.log('Mock: updateSegment', id, data);
    return { id, name: data.name || 'Updated', isDynamic: data.isDynamic ? 1 : 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  }

  async deleteSegment(id: number): Promise<void> {
    console.log('Mock: deleteSegment', id);
  }

  async getSegmentMembers(segmentId: number, page: number = 1, limit: number = 20): Promise<{ members: SegmentMember[]; total: number }> {
    console.log('Mock: getSegmentMembers', segmentId, page, limit);
    return { members: [], total: 0 };
  }

  async addMemberToSegment(segmentId: number, userId: string): Promise<void> {
    console.log('Mock: addMemberToSegment', segmentId, userId);
  }

  async removeMemberFromSegment(segmentId: number, userId: string): Promise<void> {
    console.log('Mock: removeMemberFromSegment', segmentId, userId);
  }

  async evaluateDynamicSegment(segmentId: number): Promise<{ affected: number }> {
    console.log('Mock: evaluateDynamicSegment', segmentId);
    return { affected: 15 };
  }

  async getBehaviorProfile(userId: string): Promise<BehaviorProfile> {
    console.log('Mock: getBehaviorProfile', userId);
    return {
      userId,
      username: 'mockuser',
      displayName: 'Mock User',
      totalLogins: 45,
      lastLogin: new Date().toISOString(),
      totalLoginTime: 360,
      avgSessionDuration: 35,
      logins30d: 12,
      loginFrequency: 'medium',
      peakHour: 20,
      reviewsCount: 5,
      commentsCount: 23,
      postsCount: 3,
      tags: [{ id: 1, name: '高活跃', color: '#52c41a' }],
    };
  }

  async getBehaviorDistributions(): Promise<BehaviorDistributions> {
    console.log('Mock: getBehaviorDistributions');
    return {
      loginFrequency: { high: 85, medium: 120, low: 200, inactive: 95 },
      levelDistribution: [
        { level: 1, count: 150 },
        { level: 2, count: 120 },
        { level: 3, count: 80 },
        { level: 4, count: 50 },
        { level: 5, count: 30 },
        { level: 6, count: 20 },
        { level: 7, count: 15 },
        { level: 8, count: 10 },
        { level: 9, count: 5 },
        { level: 10, count: 3 },
      ],
    };
  }

  async getPeakLoginHours(days: number = 30): Promise<PeakHourData[]> {
    console.log('Mock: getPeakLoginHours', days);
    const data: PeakHourData[] = [];
    for (let h = 0; h < 24; h++) {
      data.push({ hour: h, count: Math.floor(Math.random() * 80) + 5 });
    }
    return data;
  }

  // ==================== Mock: Gamification ====================
  async getGamificationStats(): Promise<GamificationStats> {
    console.log('Mock: getGamificationStats');
    return {
      totalXp: 1250,
      totalPoints: 350,
      xpToday: 20,
      xpThisWeek: 150,
      xpThisMonth: 650,
      currentLevel: 3,
      currentXp: 1250,
      nextLevelXp: 1500,
      progress: 0.83,
      totalLoginHours: 45,
    };
  }

  async getXpHistory(params?: PaginationParams): Promise<{ items: XpTransaction[]; pagination: any }> {
    console.log('Mock: getXpHistory', params);
    return {
      items: [
        { id: '1', userId: '1', actionKey: 'daily_login', xpAmount: 10, balanceAfter: 1250, createdAt: new Date().toISOString() },
        { id: '2', userId: '1', actionKey: 'create_review', xpAmount: 50, balanceAfter: 1240, referenceType: 'review', referenceId: '1', createdAt: new Date(Date.now() - 86400000).toISOString() },
      ],
      pagination: { page: 1, limit: 20, total: 2 },
    };
  }

  async getPointHistory(params?: PaginationParams): Promise<{ items: PointTransaction[]; pagination: any }> {
    console.log('Mock: getPointHistory', params);
    return {
      items: [
        { id: '1', userId: '1', actionKey: 'create_review', pointsAmount: 10, balanceAfter: 350, referenceType: 'review', referenceId: '1', createdAt: new Date().toISOString() },
      ],
      pagination: { page: 1, limit: 20, total: 1 },
    };
  }

  // ==================== Mock: Platform Achievements ====================
  async getPlatformAchievements(userId?: string): Promise<PlatformAchievement[]> {
    console.log('Mock: getPlatformAchievements', userId);
    return [
      { id: '1', key: 'first_review', name: '初次评测', description: '发表第一篇游戏评测', category: 'content', requirementType: 'review_count', requirementValue: 1, xpReward: 100, pointsReward: 50, isHidden: false, sortOrder: 1, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
      { id: '2', key: 'first_post', name: '初次发帖', description: '在社区发表第一个帖子', category: 'content', requirementType: 'post_count', requirementValue: 1, xpReward: 50, pointsReward: 20, isHidden: false, sortOrder: 2, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
      { id: '6', key: 'reach_level_5', name: '中级玩家', description: '达到等级5', category: 'growth', requirementType: 'level', requirementValue: 5, xpReward: 200, pointsReward: 100, isHidden: false, sortOrder: 6, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    ];
  }

  async getUserAchievements(userId?: string): Promise<UserPlatformAchievement[]> {
    console.log('Mock: getUserAchievements', userId);
    const achievements = await this.getPlatformAchievements();
    return [
      { id: '1', userId: userId || '1', achievementId: '1', achievement: achievements[0], unlockedAt: new Date().toISOString(), notified: true, createdAt: new Date().toISOString() },
      { id: '2', userId: userId || '1', achievementId: '2', achievement: achievements[1], unlockedAt: new Date().toISOString(), notified: true, createdAt: new Date().toISOString() },
    ];
  }

  async getAchievementStats(): Promise<{ unlocked: number; total: number; recentUnlocks: UserPlatformAchievement[] }> {
    console.log('Mock: getAchievementStats');
    const unlocks = await this.getUserAchievements();
    return { unlocked: 2, total: 11, recentUnlocks: unlocks };
  }

  // ==================== Mock: Private Messaging ====================
  async getConversations(params?: PaginationParams): Promise<{ items: Conversation[]; pagination: any; unreadTotal: number }> {
    console.log('Mock: getConversations', params);
    return {
      items: [
        { id: '1', type: 'direct', lastMessageAt: new Date().toISOString(), lastMessagePreview: '你好，最近在玩什么游戏？', participants: [{ id: '1', conversationId: '1', userId: '2', username: 'TestUser', displayName: '测试用户', avatarUrl: '', lastReadAt: new Date().toISOString(), isMuted: false, joinedAt: new Date().toISOString() }], unreadCount: 2, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ],
      unreadTotal: 2,
      pagination: { page: 1, limit: 20, total: 1 },
    };
  }

  async getConversation(id: string, params?: PaginationParams): Promise<{ conversation: Conversation; messages: Message[] }> {
    console.log('Mock: getConversation', id, params);
    return {
      conversation: { id, type: 'direct', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      messages: [
        { id: '1', conversationId: id, senderId: '2', content: '你好！', messageType: 'text', createdAt: new Date().toISOString() },
        { id: '2', conversationId: id, senderId: '1', content: '你好，最近在玩什么？', messageType: 'text', createdAt: new Date().toISOString() },
      ],
    };
  }

  async sendMessage(conversationId: string, content: string, replyToId?: string): Promise<Message> {
    console.log('Mock: sendMessage', conversationId, content, replyToId);
    return { id: Date.now().toString(), conversationId, senderId: '1', content, messageType: 'text', createdAt: new Date().toISOString() };
  }

  async createConversation(participantId: string, subject?: string): Promise<Conversation> {
    console.log('Mock: createConversation', participantId, subject);
    return { id: Date.now().toString(), type: 'direct', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  }

  async markConversationRead(conversationId: string): Promise<void> {
    console.log('Mock: markConversationRead', conversationId);
  }

  async getMessageUnreadCount(): Promise<number> {
    console.log('Mock: getMessageUnreadCount');
    return 2;
  }

  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    console.log('Mock: deleteMessage', conversationId, messageId);
  }

  async clearConversation(conversationId: string): Promise<void> {
    console.log('Mock: clearConversation', conversationId);
  }

  // ==================== Mock: User Leaderboard ====================
  async getUserLeaderboard(type: string, limit: number = 20, page: number = 1): Promise<{ items: UserLeaderboardEntry[]; pagination: any }> {
    console.log('Mock: getUserLeaderboard', type, limit, page);
    const items: UserLeaderboardEntry[] = [];
    for (let i = 0; i < Math.min(limit, 20); i++) {
      items.push({
        rank: page * limit - limit + i + 1,
        userId: `${i + 1}`,
        username: `User${i + 1}`,
        displayName: `用户${i + 1}`,
        level: Math.floor(Math.random() * 10) + 1,
        totalXp: Math.floor(Math.random() * 10000),
        totalPoints: Math.floor(Math.random() * 5000),
        achievementCount: Math.floor(Math.random() * 11),
      });
    }
    return { items, pagination: { page, limit, total: 100 } };
  }

  // ==================== AI Assistant (Mock) ====================
  async soulstationChat(messages: Array<{ role: string; content: string }>): Promise<{ reply: string }> {
    await this.delay();
    const replies = ['确实！很多玩家都有同感 😄', '继续说，我在听呢~', '这个经历太真实了！🤣'];
    return { reply: replies[Math.floor(Math.random() * replies.length)] };
  }

  async gameNpcSearch(params: { query: string }): Promise<{ guides: any[]; videos: any[]; fanart: any[] }> {
    await this.delay();
    return {
      guides: [{ title: `${params.query} 攻略大全`, difficulty: '中等', description: '全面攻略，包含所有关卡通关技巧和隐藏要素', views: 45, url: '' }],
      videos: [{ title: `${params.query} 实况解说`, author: '游戏达人', views: 128, duration: '15:30', url: 'https://www.bilibili.com/video/BV1GJ411x7', coverImageUrl: '' }],
      fanart: [{ title: `${params.query} 同人作品`, author: '画师A', type: '插画', likes: 2342 }],
    };
  }

  async gameCompanionRecommend(params: { gameName: string; answers: string[] }): Promise<{ recommendations: any[]; matchedGame: string | null }> {
    await this.delay();
    return {
      recommendations: [
        { name: '冒险家', role: '多面手', description: '你是一个热爱尝试的玩家', matchScore: 85, playStyle: '每个职业都试试' },
        { name: '探索者', role: '自由人', description: '享受游戏世界的每一个角落', matchScore: 80, playStyle: '不看攻略自己摸索' },
      ],
      matchedGame: params.gameName || null,
    };
  }

  async generateCharacterPortrait(params: Record<string, any>): Promise<{ description: string }> {
    await this.delay();
    return { description: `${params.name || '无名勇者'}是一位充满传奇色彩的角色...` };
  }

  // ==================== AI Image to 3D (Mock) ====================
  async submitImageTo3d(imageUrl: string): Promise<{ taskId: string }> {
    await this.delay(500);
    return { taskId: 'mock-task-' + Date.now() };
  }

  async getImageTo3dTask(taskId: string): Promise<ImageTo3dTask> {
    await this.delay(300);
    return {
      taskId,
      status: 'succeeded',
      progress: 100,
      modelUrls: {
        glb: '#',
        thumbnail: undefined,
      },
    };
  }

  // ==================== Blog (Mock) ====================

  async getBlogPosts(params?: PaginationParams): Promise<BlogArticle[]> {
    await this.delay();
    let posts = this.fallbackBlogPosts;
    if (params?.page && params?.limit) {
      const start = (params.page - 1) * params.limit;
      posts = posts.slice(start, start + params.limit);
    }
    return posts;
  }

  async getBlogPost(id: string): Promise<BlogArticle> {
    await this.delay();
    const posts = this.fallbackBlogPosts;
    const post = posts.find(p => p.id === id);
    if (!post) {
      throw new Error('博客文章不存在');
    }
    return post;
  }

  async createBlogPost(data: BlogCreateInput): Promise<BlogArticle> {
    console.log('Mock: 创建博客文章', data);
    return { id: 'mock-blog-new', ...data as any, author: 'Mock用户', createdAt: new Date().toISOString() };
  }

  async updateBlogPost(id: string, data: BlogUpdateInput): Promise<BlogArticle> {
    console.log('Mock: 更新博客文章', id, data);
    return { id, ...data as any, author: 'Mock用户', updatedAt: new Date().toISOString() };
  }

  async deleteBlogPost(id: string): Promise<void> {
    console.log('Mock: 删除博客文章', id);
  }

  async getMyBlogPosts(params?: PaginationParams): Promise<BlogArticle[]> {
    await this.delay();
    let posts = this.fallbackBlogPosts;
    if (params?.page && params?.limit) {
      const start = (params.page - 1) * params.limit;
      posts = posts.slice(start, start + params.limit);
    }
    return posts;
  }

  private get fallbackBlogPosts(): BlogArticle[] {
    return [
      {
        id: 'blog-1',
        title: 'GameHub 2026年产品路线图：打造更好的游戏社区',
        slug: 'gamehub-2026-roadmap',
        excerpt: '2026年对GameHub来说是充满机遇的一年。在这篇文章中，我们将分享今年的产品路线图，包括社区功能升级、推荐算法优化以及全新的社交系统。',
        content: `## 展望2026\n\n2026年对GameHub来说是充满机遇的一年。我们将继续致力于打造最好的游戏社区平台，让每一位玩家都能找到属于自己的游戏家园。\n\n## 社区功能升级\n\n今年我们计划对社区功能进行全面升级，包括：\n\n- **全新的论坛系统**：更快的加载速度，更好的帖子管理功能\n- **群组功能**：玩家可以创建自己的游戏群组，邀请好友加入讨论\n- **活动系统**：支持在线和线下活动的创建与管理\n\n## 推荐算法优化\n\n我们的推荐系统将在2026年迎来重大升级：\n\n1. 引入深度学习模型，更准确地理解玩家的游戏偏好\n2. 支持多模态推荐，不仅推荐游戏，还推荐相关的新闻、评测和社区内容\n3. 实时个性化，根据玩家近期行为动态调整推荐结果\n\n## 全新社交系统\n\n我们正在开发一套全新的社交系统，让玩家之间的互动更加丰富和有趣：\n\n- 好友系统升级，支持好友分组和动态订阅\n- 成就系统，记录和展示玩家的游戏里程碑\n- 玩家名片，展示个人游戏风格和偏好\n\n敬请期待！`,
        author: 'GameHub Team',
        authorAvatar: '',
        authorBio: 'GameHub 官方团队',
        publishDate: '2026-03-15T08:00:00Z',
        category: '公司动态',
        tags: ['产品路线图', '2026', '社区', '更新'],
        coverImage: '',
        readingTime: 8,
        views: 1523,
        likes: 89,
        featured: true,
      },
      {
        id: 'blog-2',
        title: '构建高性能游戏推荐系统的技术实践',
        slug: 'building-recommendation-system',
        excerpt: '深入探讨GameHub推荐系统的架构设计，从数据采集、特征工程到模型部署的完整技术栈分享。',
        content: `## 背景\n\nGameHub 的推荐系统每天需要处理数百万条用户行为数据，为数十万玩家提供个性化游戏推荐。本文将分享我们在构建这个系统过程中的技术选型和实践经验。\n\n## 系统架构\n\n我们的推荐系统采用分层架构：\n\n### 数据层\n- 使用 Apache Kafka 收集用户实时行为数据\n- 用 ClickHouse 存储分析型数据，支持快速聚合查询\n- Redis 缓存热数据，降低延迟\n\n### 特征工程\n- 用户特征：游戏偏好、活跃时段、社交关系\n- 游戏特征：类别、标签、评分、热度\n- 上下文特征：时间、设备、季节\n\n### 模型层\n- 协同过滤：基于用户的协同过滤和基于物品的协同过滤\n- 内容基推荐：利用游戏元数据计算相似度\n- 混合模型：加权融合多种算法结果\n\n## 挑战与解决方案\n\n**冷启动问题**：对于新用户和新游戏，我们采用基于规则的探索策略，结合热门排行和分类偏好进行推荐。\n\n**实时性要求**：通过流式计算框架实现秒级更新，用户行为发生后立即影响推荐结果。\n\n**计算性能**：使用向量化召回和近似最近邻搜索，将推荐延迟控制在 50ms 以内。`,
        author: '张三',
        authorAvatar: '',
        authorBio: 'GameHub 高级后端工程师',
        publishDate: '2026-03-10T10:30:00Z',
        category: '技术分享',
        tags: ['推荐系统', '架构', '后端', '机器学习'],
        coverImage: '',
        readingTime: 12,
        views: 892,
        likes: 67,
        featured: false,
      },
      {
        id: 'blog-3',
        title: '玩家社区2026第一季度活动回顾',
        slug: 'q1-2026-community-review',
        excerpt: '回顾2026年第一季度GameHub社区举办的各项活动，包括春节游戏大赛、新游评测挑战赛和社区创作者激励计划。',
        content: `## 第一季度活动概览\n\n2026年的第一季度，GameHub 社区举办了多场精彩活动，感谢每一位玩家的参与！\n\n### 春节游戏大赛 🏮\n\n春节期间，我们举办了"龙年新春游戏大赛"，吸引了超过5000名玩家参与。大赛设置了多个游戏项目的比赛，包括《英雄联盟》《原神》《崩坏：星穹铁道》等热门游戏。\n\n**获奖名单**：\n- 冠军：游戏哲学家（获得 ¥5000 游戏基金）\n- 亚军：极速玩家（获得 ¥2000 游戏基金）\n- 季军：休闲达人（获得 ¥1000 游戏基金）\n\n### 新游评测挑战赛 ✍️\n\n三月份，我们发起了"新游评测挑战赛"，鼓励玩家分享自己对新游戏的独到见解。活动期间共收到 327 篇高质量评测文章。\n\n### 社区创作者激励计划 🌟\n\n我们启动了社区创作者激励计划，为优质内容创作者提供流量扶持和现金奖励。目前已有 50+ 位创作者加入。`,
        author: '小红',
        authorAvatar: '',
        authorBio: 'GameHub 社区运营经理',
        publishDate: '2026-04-01T09:00:00Z',
        category: '社区故事',
        tags: ['社区活动', '季度回顾', '玩家', '大赛'],
        coverImage: '',
        readingTime: 6,
        views: 2105,
        likes: 156,
        featured: true,
      },
      {
        id: 'blog-4',
        title: '从零到一：GameHub 前端架构演进之路',
        slug: 'frontend-architecture-evolution',
        excerpt: 'GameHub 前端团队分享了从项目启动到现在的架构演进历程，包括技术选型、性能优化和工程化建设的经验教训。',
        content: `## 起点：快速原型阶段\n\nGameHub 前端最初采用 Create React App 搭建，配合 Redux 进行状态管理。这个阶段的目标是快速验证产品概念。\n\n### 技术栈\n- React 17 + CRA\n- Redux + Redux Thunk\n- React Router v5\n- Ant Design\n\n## 第一阶段：工程化建设\n\n随着项目规模扩大，我们逐步引入了以下工具和规范：\n\n- TypeScript：全面类型安全\n- ESLint + Prettier：代码规范\n- Husky + lint-staged：提交前检查\n- Vite：替换 CRA，构建速度提升 10 倍\n\n## 第二阶段：性能优化\n\n### 代码分割\n使用 React.lazy 和 Suspense 实现路由级代码分割，首屏加载时间减少 40%。\n\n### 状态管理重构\n从 Redux 迁移到 React Query + Context 组合，样板代码减少 60%。\n\n### 图片优化\n- 使用 WebP 格式\n- 懒加载\n- CDN 加速\n\n## 第三阶段：架构升级\n\n### 微前端探索\n为未来的多团队协作做准备，我们开始探索微前端架构方案。\n\n### 服务端渲染评估\n为了改善 SEO 和首屏性能，我们正在评估 Next.js 和 Astro 等 SSR 方案。`,
        author: '李四',
        authorAvatar: '',
        authorBio: 'GameHub 前端架构师',
        publishDate: '2026-02-20T14:00:00Z',
        category: '开发故事',
        tags: ['前端', '架构', 'React', 'TypeScript', '性能优化'],
        coverImage: '',
        readingTime: 15,
        views: 1876,
        likes: 234,
        featured: false,
      },
      {
        id: 'blog-5',
        title: '游戏本地化的艺术：如何做好多语言支持',
        slug: 'game-localization-best-practices',
        excerpt: '从技术实现和翻译策略两个维度，分享GameHub在支持六种语言过程中的经验与教训。',
        content: `## 为什么本地化很重要\n\nGameHub 支持六种语言：简体中文、繁体中文、英语、日语、韩语、俄语。好的本地化不仅仅是翻译，更是文化的适配。\n\n## 技术架构\n\n### i18next 集成\n\n我们选择 i18next 作为国际化框架，它提供了：\n- 命名空间管理（按功能模块拆分翻译文件）\n- 插值、复数、日期格式化\n- 语言检测和切换\n- React 集成（react-i18next）\n\n### 翻译文件管理\n\n- 每个语言一个 JSON 文件\n- 按页面/组件划分命名空间\n- CI 流程中自动检查缺失的翻译键\n\n## 翻译策略\n\n### 专业翻译 vs 社区翻译\n核心内容（UI、法律文档）由专业翻译完成，社区内容（评测、指南）由用户自行选择语言发布。\n\n### 文化适配\n- 日期格式：中文 YYYY-MM-DD，英文 MM/DD/YYYY\n- 颜色含义：红色在中国代表喜庆，在西方可能代表危险\n- 游戏术语：不同地区对同一游戏术语可能有不同叫法`,
        author: '王翻译',
        authorAvatar: '',
        authorBio: 'GameHub 本地化负责人',
        publishDate: '2026-02-10T11:00:00Z',
        category: '技术分享',
        tags: ['本地化', 'i18n', '国际化', '翻译'],
        coverImage: '',
        readingTime: 10,
        views: 756,
        likes: 45,
        featured: false,
      },
      {
        id: 'blog-6',
        title: '月度社区之星：专访评测达人「游戏哲学家」',
        slug: 'community-star-gaming-philosopher',
        excerpt: '本月我们采访了社区知名评测作者「游戏哲学家」，听他分享游戏评测的心得和作为一名游戏内容创作者的故事。',
        content: `## 本期嘉宾\n\n「游戏哲学家」，GameHub 社区知名评测作者，累计发表 47 篇游戏评测，总阅读量超过 50 万。\n\n### 采访实录\n\n**Q：先向大家介绍一下自己吧。**\n\n大家好，我是游戏哲学家，从小学开始玩游戏，到现在已经有二十多年游龄了。我特别喜欢深度体验一款游戏，然后把自己的感受写下来和大家分享。\n\n**Q：你是怎么开始写游戏评测的？**\n\n最开始只是在朋友圈分享，朋友说我写得不错，鼓励我发到网上。后来发现了 GameHub 社区，这里的玩家素质很高，评论区的讨论质量也很好，我就开始在这里稳定更新了。\n\n**Q：写评测有什么心得吗？**\n\n我觉得好的评测最重要的是真诚。不要为了流量说违心的话，也不要一味地吹捧或贬低。我会尽量从多个角度去分析一款游戏，包括玩法、剧情、美术、音乐、优化等方面，给读者一个全面的参考。\n\n**Q：对想开始写评测的玩家有什么建议？**\n\n开始写就好了！不要怕写得不好，每个人都有自己的视角和见解。可以先从短评开始，慢慢培养写作习惯。`,
        author: 'GameHub 编辑部',
        authorAvatar: '',
        authorBio: 'GameHub 官方编辑部',
        publishDate: '2026-03-25T16:00:00Z',
        category: '社区故事',
        tags: ['社区之星', '采访', '玩家故事', '评测'],
        coverImage: '',
        readingTime: 7,
        views: 1210,
        likes: 98,
        featured: false,
      },
      {
        id: 'blog-7',
        title: 'GameHub 团队扩张：我们正在寻找热爱游戏的人才',
        slug: 'gamehub-hiring-2026',
        excerpt: '随着业务的快速发展，GameHub 团队正在大规模扩张。我们诚邀热爱游戏的技术人才加入，一起打造更好的游戏社区。',
        content: `## 关于 GameHub\n\nGameHub 是一个快速成长的游戏社区平台，我们致力于为玩家提供游戏发现、评测交流、社区互动的一站式体验。\n\n## 开放职位\n\n### 前端开发工程师\n- 精通 React / TypeScript\n- 有大型 SPA 项目经验\n- 了解性能优化和工程化建设\n- 热爱游戏\n\n### 后端开发工程师\n- 精通 Node.js / TypeScript\n- 有 PostgreSQL 和 Redis 使用经验\n- 了解微服务架构\n- 热爱游戏\n\n### 产品经理\n- 有社区产品经验\n- 数据驱动决策\n- 了解游戏行业\n- 热爱游戏\n\n## 为什么加入我们\n\n- 有竞争力的薪资和期权\n- 远程办公支持\n- 游戏报销福利（每月可报销游戏购买费用）\n- 与一群热爱游戏的伙伴一起工作\n\n感兴趣的朋友请将简历发送至 hiring@gamehub.com，标题注明应聘职位。`,
        author: 'HR Team',
        authorAvatar: '',
        authorBio: 'GameHub 人力资源团队',
        publishDate: '2026-03-20T08:30:00Z',
        category: '公司动态',
        tags: ['招聘', '团队扩张', '技术岗位', '加入我们'],
        coverImage: '',
        readingTime: 5,
        views: 3456,
        likes: 267,
        featured: false,
      },
      {
        id: 'blog-8',
        title: '如何设计一个玩家喜欢的成就系统',
        slug: 'achievement-system-design',
        excerpt: '一个好的成就系统能极大提升玩家的游戏粘性和满足感。本文分享了设计成就系统的思路和最佳实践。',
        content: `## 成就系统的意义\n\n成就系统是现代游戏中不可或缺的一部分。它不仅能记录玩家的游戏历程，还能提供额外的目标和动力。\n\n## 设计原则\n\n### 1. 多样化的成就类型\n\n- **进度型成就**：到达一定等级、完成一定数量的任务\n- **挑战型成就**：击败某个高难度 Boss、完成限时挑战\n- **探索型成就**：发现隐藏区域、收集特定物品\n- **社交型成就**：结交一定数量的好友、参与社区活动\n\n### 2. 合理的难度曲线\n\n成就应该有难有易，让不同类型的玩家都能有所收获。\n- 简单成就：大部分玩家都能完成（参与奖）\n- 中等成就：需要一定的时间和技巧\n- 困难成就：只有核心玩家才能达成\n\n### 3. 有意义的奖励\n\n- 经验值和等级\n- 专属称号和头像框\n- 虚拟货币或道具\n- 实体奖励（线下活动、周边商品）\n\n### 4. 社交展示\n\n玩家应该能够向他人展示自己的成就，这会带来荣誉感和社交认同。\n\n## 我们的实践\n\n在 GameHub 平台上，我们设计了多层次的成就系统，包括游戏评测成就、社区互动成就、连续登录成就等，让玩家在使用平台的过程中不断发现惊喜。`,
        author: '赵六',
        authorAvatar: '',
        authorBio: 'GameHub 产品设计师',
        publishDate: '2026-01-28T13:00:00Z',
        category: '游戏文化',
        tags: ['成就系统', '游戏设计', '玩家体验', '产品设计'],
        coverImage: '',
        readingTime: 9,
        views: 934,
        likes: 78,
        featured: false,
      },
    ];
  }

  // ==================== 3D Print Stubs ====================

  async submitPrintOrder(data: { modelData: string; size?: number; material?: string; color?: string; quantity?: number }): Promise<{ orderId: string; status: string; createdAt: string }> {
    console.log('Mock: 提交打印订单', data);
    return { orderId: 'mock-order-id', status: 'pending', createdAt: new Date().toISOString() };
  }

  async getPrintOrder(id: string): Promise<{ id: string; size: number; material: string; color: string; quantity: number; status: string; createdAt: string }> {
    console.log('Mock: 获取打印订单', id);
    return { id, size: 10, material: 'PLA', color: 'white', quantity: 1, status: 'pending', createdAt: new Date().toISOString() };
  }

  // ==================== News Pin Stubs ====================

  async pinNewsArticle(id: string): Promise<NewsArticle> {
    console.log(`Mock: 置顶新闻 ${id}`);
    return { id, title: 'Pinned News', summary: '', content: '', author: '', publishDate: new Date().toISOString(), category: '', tags: [], imageUrl: '', views: 0, likes: 0 };
  }

  async unpinNewsArticle(id: string): Promise<NewsArticle> {
    console.log(`Mock: 取消置顶新闻 ${id}`);
    return { id, title: 'Unpinned News', summary: '', content: '', author: '', publishDate: new Date().toISOString(), category: '', tags: [], imageUrl: '', views: 0, likes: 0 };
  }

  // ==================== Blog Space Stubs ====================

  async getBlogSpaces(): Promise<any[]> {
    console.log('Mock: 获取博客空间列表');
    return [];
  }

  async createBlogSpace(data: any): Promise<any> {
    console.log('Mock: 创建博客空间', data);
    return { id: 'mock-space-id', ...data };
  }

  async updateBlogSpace(id: string, data: any): Promise<any> {
    console.log('Mock: 更新博客空间', id, data);
    return { id, ...data };
  }

  async deleteBlogSpace(id: string): Promise<void> {
    console.log('Mock: 删除博客空间', id);
  }

  async getSpaceContent(spaceId: string, params?: any): Promise<any> {
    console.log('Mock: 获取空间内容', spaceId, params);
    return { articles: [] };
  }

  async getSpaceDetail(slug: string): Promise<any> {
    console.log('Mock: 获取空间详情', slug);
    return { id: '1', name: 'Mock Space', slug, description: 'Mock space', totalArticles: 0, typeCounts: {} };
  }

  async getSpacePopularArticle(spaceId: string): Promise<any> {
    console.log('Mock: 获取热门文章', spaceId);
    return null;
  }

  async getSpaceArticlesByCategory(spaceId: string, postType: string, params?: any): Promise<{ articles: any[]; total: number }> {
    console.log('Mock: 获取分类文章', spaceId, postType, params);
    return { articles: [], total: 0 };
  }

  // ==================== AI History Stubs ====================

  async getAiHistory(type?: string): Promise<any[]> {
    console.log('Mock: 获取AI历史记录', type);
    return [];
  }

  async getAiHistoryDetail(id: string): Promise<any> {
    console.log('Mock: 获取AI历史详情', id);
    return { id, type: 'chat', title: 'Mock Chat', content: [] };
  }

  async saveAiHistory(data: { type: string; title: string; content: any }): Promise<any> {
    console.log('Mock: 保存AI历史', data);
    return { id: 'mock-history-id', ...data };
  }

  async deleteAiHistory(id: string): Promise<void> {
    console.log('Mock: 删除AI历史', id);
  }

  // ==================== Banner 和推荐内容 Mocks ====================
  async getBanners(position?: string): Promise<any[]> {
    console.log('Mock: 获取Banner', position);
    return [
      { id: 1, title: '🔥 热门游戏促销', subtitle: '限时折扣，低至3折', image_url: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=1200&auto=format&fit=crop', link_url: '/games/category/sale', position: 'home', sort_order: 0 },
      { id: 2, title: '🎮 新游推荐', subtitle: '本月最受期待的新游戏', image_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop', link_url: '/games/category/new', position: 'home', sort_order: 1 },
      { id: 3, title: '🏆 2026年度游戏评选', subtitle: '为你喜欢的游戏投票', image_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&auto=format&fit=crop', link_url: '/games/category/awards', position: 'home', sort_order: 2 },
    ];
  }

  async getFeaturedContent(type?: string): Promise<any[]> {
    console.log('Mock: 获取精选内容', type);
    return [];
  }

  // ==================== 兑换码系统 Mocks ====================
  async getRedeemCodes(): Promise<any[]> {
    console.log('Mock: 获取兑换码列表');
    return [
      { id: 1, code: 'WELCOME2026', title: '新用户欢迎礼包', description: '新用户注册即可兑换', game_name: '通用', reward_type: 'discount', reward_value: '满100减20', usage_limit: 0, used_count: 1234 },
      { id: 2, code: 'SUMMER50', title: '夏日狂欢', description: '夏日限定兑换码', game_name: '艾尔登法环', reward_type: 'discount', reward_value: '50元优惠券', usage_limit: 500, used_count: 320 },
      { id: 3, code: 'VIP2026', title: 'VIP会员专享', description: 'VIP玩家专属兑换码', game_name: '原神', reward_type: 'item', reward_value: '限定道具礼包', usage_limit: 100, used_count: 67 },
    ];
  }

  async getRedeemCodeDetail(code: string): Promise<any> {
    console.log('Mock: 获取兑换码详情', code);
    return { id: 1, code, title: '测试兑换码', reward_type: 'discount', reward_value: '8折优惠' };
  }

  async redeemCode(code: string): Promise<{ code: string; title: string; reward_type: string; reward_value: string }> {
    console.log('Mock: 兑换', code);
    return { code, title: '测试兑换码', reward_type: 'discount', reward_value: '8折优惠' };
  }

  async getMyRedeemHistory(): Promise<any[]> {
    console.log('Mock: 获取兑换历史');
    return [];
  }
}

/**
 * API 服务工厂类
 * 根据环境配置决定创建真实 API 服务还是 Mock API 服务
 */
class ApiServiceFactory {
  /**
   * 创建 API 服务实例
   *
   * @param useMock - 是否使用 Mock（不传时从环境变量 VITE_USE_MOCK 读取）
   * @param config - API 客户端配置
   * @returns BaseApiService 实例
   */
  static createService(useMock?: boolean, config?: Partial<ApiConfig>): BaseApiService {
    const shouldUseMock = useMock !== undefined ? useMock : import.meta.env.VITE_USE_MOCK === 'true';

    if (shouldUseMock) {
      console.log('📱 使用Mock API服务进行开发');
      return new MockApiService();
    } else {
      console.log('🚀 使用真实API服务');
      return new RealApiService(config);
    }
  }
}

/** API 服务单例实例（根据环境变量自动选择真实/Mock 实现） */
const useMock = import.meta.env.VITE_USE_MOCK === 'true';
const apiService = ApiServiceFactory.createService(useMock);

/**
 * 导出 API 服务实例、工厂类和各个实现类
 */
export { apiService, ApiServiceFactory, RealApiService, MockApiService, BaseApiService };
export default apiService;