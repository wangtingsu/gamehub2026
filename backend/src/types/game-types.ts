/**
 * 游戏扩展类型定义模块
 *
 * 定义游戏平台、媒体、元数据、游戏库、游戏时间追踪、成就系统、
 * 跨平台同步、社区功能、用户生成内容等扩展类型的 TypeScript 接口。
 *
 * 包含从基础 Game 类型扩展的 ExtendedGame，以及游戏库管理、
 * 游戏会话记录、多平台存档同步等高级功能类型。
 *
 * @module types/game-types
 */

// ========== 平台类型 ==========

/** 游戏平台类型枚举 */
export enum PlatformType {
  PC = 'pc',
  PLAYSTATION = 'playstation',
  XBOX = 'xbox',
  NINTENDO = 'nintendo',
  MOBILE = 'mobile',
  VR = 'vr',
  CLOUD = 'cloud'
}

/** 平台详细信息 */
export interface PlatformInfo {
  type: PlatformType;
  name: string; // 如 "PC", "PlayStation 5", "Xbox Series X"
  storeIds?: {
    steam?: string;
    epic?: string;
    gog?: string;
    playstation?: string;
    xbox?: string;
    nintendo?: string;
    mobile?: {
      ios?: string;
      android?: string;
    };
  };
  releaseDate?: Date;
  exclusive?: boolean;
  systemRequirements?: {
    minimum?: string;
    recommended?: string;
  };
}

/** 游戏媒体资源 */
export interface GameMedia {
  coverImage: string;
  screenshots: string[];
  trailers?: string[];
  artwork?: string[];
}

/** 游戏元数据 */
export interface GameMetadata {
  esrbRating?: string; // 年龄分级
  pegiRating?: string;
  languages?: string[]; // 支持的语言
  subtitles?: string[];
  developerWebsite?: string;
  publisherWebsite?: string;
  officialWebsite?: string;
  supportWebsite?: string;
}

/** 扩展的 Game 接口 */
export interface ExtendedGame {
  // 基础信息
  id: string;
  title: string;
  slug: string;
  description?: string;
  shortDescription?: string;

  // 发布信息
  releaseDate?: Date;
  developer?: string;
  developerId?: string; // 关联开发者ID
  publisher?: string;
  publisherId?: string; // 关联发行商ID

  // 分类信息
  genres: string[];
  tags: string[];
  themes?: string[]; // 主题，如 "科幻", "奇幻", "恐怖"
  modes?: string[]; // 游戏模式，如 "单人", "多人", "合作"

  // 平台信息
  platforms: PlatformInfo[];
  crossPlatformPlay?: boolean; // 是否支持跨平台联机
  crossPlatformSave?: boolean; // 是否支持跨平台存档

  // 评分和价格
  rating?: number; // 平均评分
  ratingCount?: number; // 评分数量
  price?: number;
  discount?: number;
  discountEndDate?: Date;

  // 媒体资源
  media: GameMedia;

  // 元数据
  metadata?: GameMetadata;

  // 外部ID（用于API集成）
  externalIds: {
    steamAppId?: number;
    rawgId?: number;
    igdbId?: number;
    metacriticId?: string;
    opencriticId?: string;
  };

  // 营销和展示
  isFeatured: boolean;
  featuredUntil?: Date;
  promotionalTag?: string;
  views: number;
  wishlistCount: number;
  purchaseCount: number;

  // SEO优化
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];

  // 时间戳
  createdAt: Date;
  updatedAt: Date;

  // 软删除和审计
  deletedAt?: Date;
  version?: number;
  createdBy?: string;
  updatedBy?: string;
}

/** 扩展游戏创建输入 */
export interface ExtendedGameCreateInput {
  title: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  releaseDate?: Date;
  developer?: string;
  publisher?: string;
  genres: string[];
  tags?: string[];
  themes?: string[];
  modes?: string[];
  platforms: PlatformInfo[];
  crossPlatformPlay?: boolean;
  crossPlatformSave?: boolean;
  price?: number;
  media: GameMedia;
  metadata?: GameMetadata;
  externalIds?: {
    steamAppId?: number;
    rawgId?: number;
    igdbId?: number;
    metacriticId?: string;
    opencriticId?: string;
  };
  promotionalTag?: string;
  featuredUntil?: Date;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
}

/** 扩展游戏更新输入 */
export interface ExtendedGameUpdateInput {
  title?: string;
  description?: string;
  shortDescription?: string;
  rating?: number;
  ratingCount?: number;
  price?: number;
  discount?: number;
  discountEndDate?: Date;
  isFeatured?: boolean;
  promotionalTag?: string;
  featuredUntil?: Date;
  views?: number;
  wishlistCount?: number;
  purchaseCount?: number;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  deletedAt?: Date;
  version?: number;
}

// ========== 游戏库相关类型 ==========

/** 游戏库状态枚举 */
export enum LibraryStatus {
  WISHLIST = 'wishlist',      // 愿望单
  OWNED = 'owned',            // 已拥有
  PLAYING = 'playing',        // 正在玩
  COMPLETED = 'completed',    // 已完成
  ABANDONED = 'abandoned',    // 已放弃
  ON_HOLD = 'on_hold'         // 暂停中
}

/** 游戏平台拥有状态 */
export interface PlatformOwnership {
  platformType: PlatformType;
  platformName: string;
  owned: boolean;
  purchaseDate?: Date;
  purchasePrice?: number;
  store?: string; // 购买平台，如 "Steam", "PlayStation Store"
  storeTransactionId?: string;
}

/** 用户游戏库条目 */
export interface UserGameLibrary {
  id: string;
  userId: string;
  gameId: string;
  gameTitle: string; // 冗余字段，便于查询
  gameSlug: string;  // 冗余字段，便于查询

  // 状态管理
  status: LibraryStatus;
  addedAt: Date;
  lastPlayedAt?: Date;
  statusUpdatedAt: Date;

  // 平台拥有情况
  platforms: PlatformOwnership[];
  primaryPlatform?: PlatformType; // 主要游玩的平台

  // 个人评分和笔记
  personalRating?: number; // 1-5星
  personalNotes?: string;
  tags?: string[]; // 用户自定义标签

  // 时间戳
  createdAt: Date;
  updatedAt: Date;

  // 软删除
  deletedAt?: Date;
  version?: number;
}

/** 用户游戏库创建输入 */
export interface UserGameLibraryCreateInput {
  userId: string;
  gameId: string;
  gameTitle?: string; // 冗余字段，便于查询
  gameSlug?: string;  // 冗余字段，便于查询
  status: LibraryStatus;
  platforms: PlatformOwnership[];
  personalRating?: number;
  personalNotes?: string;
  tags?: string[];
  primaryPlatform?: PlatformType;
}

/** 用户游戏库更新输入 */
export interface UserGameLibraryUpdateInput {
  status?: LibraryStatus;
  platforms?: PlatformOwnership[];
  personalRating?: number;
  personalNotes?: string;
  tags?: string[];
  primaryPlatform?: PlatformType;
  lastPlayedAt?: Date;
  deletedAt?: Date;
  version?: number;
}

// ========== 游戏时间追踪 ==========

/** 游戏会话记录 */
export interface GameSession {
  id: string;
  userId: string;
  gameId: string;
  platformType: PlatformType;
  platformName: string;

  // 会话时间
  startTime: Date;
  endTime?: Date;
  duration?: number; // 秒数，计算得出

  // 会话信息
  sessionType?: 'singleplayer' | 'multiplayer' | 'coop';
  players?: string[]; // 一起游玩的用户ID
  notes?: string;

  // 自动追踪数据
  autoTracked: boolean; // 是否自动追踪
  source?: 'manual' | 'steam' | 'playstation' | 'xbox' | 'nintendo';

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  version?: number;
}

/** 游戏会话创建输入 */
export interface GameSessionCreateInput {
  userId: string;
  gameId: string;
  platformType: PlatformType;
  platformName: string;
  startTime: Date;
  endTime?: Date;
  sessionType?: 'singleplayer' | 'multiplayer' | 'coop';
  players?: string[];
  notes?: string;
  autoTracked?: boolean;
  source?: 'manual' | 'steam' | 'playstation' | 'xbox' | 'nintendo';
}

/** 游戏会话更新输入 */
export interface GameSessionUpdateInput {
  endTime?: Date;
  duration?: number;
  sessionType?: 'singleplayer' | 'multiplayer' | 'coop';
  players?: string[];
  notes?: string;
  deletedAt?: Date;
  version?: number;
}

/** 游戏时间统计 */
export interface GameTimeStats {
  totalTime: number; // 总游戏时间（秒）
  lastTwoWeeksTime: number; // 最近两周游戏时间
  averageSessionLength: number; // 平均会话长度
  sessionsCount: number; // 总会话数
  lastPlayed: Date; // 最后游玩时间
  platformBreakdown: Record<PlatformType, number>; // 各平台游戏时间
}

// ========== 成就系统 ==========

/** 游戏成就定义 */
export interface GameAchievement {
  id: string;
  gameId: string;
  externalId?: string; // 平台成就ID，如Steam成就ID

  // 成就信息
  name: string;
  description: string;
  iconUrl?: string;
  hidden: boolean; // 是否隐藏成就

  // 成就详情
  points: number; // 成就点数
  rarity?: number; // 稀有度百分比
  category?: string; // 分类，如 "故事", "挑战", "收集"

  // 解锁条件
  unlockCondition?: string;
  unlockPercentage?: number; // 全球解锁百分比

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  version?: number;
}

/** 游戏成就创建输入 */
export interface GameAchievementCreateInput {
  gameId: string;
  externalId?: string;
  name: string;
  description: string;
  iconUrl?: string;
  hidden?: boolean;
  points: number;
  rarity?: number;
  category?: string;
  unlockCondition?: string;
  unlockPercentage?: number;
}

/** 游戏成就更新输入 */
export interface GameAchievementUpdateInput {
  name?: string;
  description?: string;
  iconUrl?: string;
  hidden?: boolean;
  points?: number;
  rarity?: number;
  category?: string;
  unlockCondition?: string;
  unlockPercentage?: number;
  deletedAt?: Date;
  version?: number;
}

/** 用户成就解锁记录 */
export interface UserAchievement {
  id: string;
  userId: string;
  gameId: string;
  achievementId: string;

  // 解锁信息
  unlocked: boolean;
  unlockedAt?: Date;
  unlockPlatform?: PlatformType;

  // 进度追踪（用于进度型成就）
  progress?: number; // 当前进度
  target?: number; // 目标值
  progressUpdatedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  version?: number;
}

/** 用户成就创建输入 */
export interface UserAchievementCreateInput {
  userId: string;
  gameId: string;
  achievementId: string;
  unlocked: boolean;
  unlockedAt?: Date;
  unlockPlatform?: PlatformType;
  progress?: number;
  target?: number;
  progressUpdatedAt?: Date;
}

/** 用户成就更新输入 */
export interface UserAchievementUpdateInput {
  unlocked?: boolean;
  unlockedAt?: Date;
  unlockPlatform?: PlatformType;
  progress?: number;
  target?: number;
  progressUpdatedAt?: Date;
  deletedAt?: Date;
  version?: number;
}

/** 成就统计 */
export interface AchievementStats {
  totalAchievements: number;
  unlockedAchievements: number;
  completionPercentage: number;
  totalPoints: number;
  earnedPoints: number;
  rareAchievements: number; // 稀有成就数量（解锁率<10%）
  lastUnlocked?: Date;
}

// ========== 跨平台游戏进度 ==========

/** 游戏存档/进度记录 */
export interface GameSave {
  id: string;
  userId: string;
  gameId: string;

  // 进度信息
  platformType: PlatformType;
  platformName: string;
  saveName: string;
  saveDescription?: string;

  // 进度数据
  progressPercentage?: number; // 游戏进度百分比
  playTime: number; // 该存档的游戏时间（秒）
  lastSaved: Date;

  // 存档内容（加密存储）
  saveData?: string; // JSON字符串，加密存储
  saveDataHash?: string; // 用于校验

  // 元数据
  isAutoSave: boolean;
  isCloudSave: boolean;
  isManualSave: boolean;

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  version?: number;
}

/** 游戏存档创建输入 */
export interface GameSaveCreateInput {
  userId: string;
  gameId: string;
  platformType: PlatformType;
  platformName: string;
  saveName: string;
  saveDescription?: string;
  progressPercentage?: number;
  playTime: number;
  saveData?: string;
  saveDataHash?: string;
  isAutoSave?: boolean;
  isCloudSave?: boolean;
  isManualSave?: boolean;
}

/** 游戏存档更新输入 */
export interface GameSaveUpdateInput {
  saveName?: string;
  saveDescription?: string;
  progressPercentage?: number;
  playTime?: number;
  lastSaved?: Date;
  saveData?: string;
  saveDataHash?: string;
  isAutoSave?: boolean;
  isCloudSave?: boolean;
  isManualSave?: boolean;
  deletedAt?: Date;
  version?: number;
}

/** 跨平台进度同步配置 */
export interface CrossPlatformSync {
  id: string;
  userId: string;
  gameId: string;

  // 同步配置
  enabled: boolean;
  autoSync: boolean; // 是否自动同步
  syncFrequency: 'manual' | 'daily' | 'weekly' | 'on_change';

  // 同步的平台
  sourcePlatform: PlatformType;
  targetPlatforms: PlatformType[];

  // 同步状态
  lastSyncAt?: Date;
  lastSyncStatus?: 'success' | 'failed' | 'partial';
  lastSyncError?: string;

  // 同步统计
  totalSyncs: number;
  successfulSyncs: number;

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  version?: number;
}

/** 跨平台同步创建输入 */
export interface CrossPlatformSyncCreateInput {
  userId: string;
  gameId: string;
  enabled: boolean;
  autoSync?: boolean;
  syncFrequency?: 'manual' | 'daily' | 'weekly' | 'on_change';
  sourcePlatform: PlatformType;
  targetPlatforms: PlatformType[];
}

/** 跨平台同步更新输入 */
export interface CrossPlatformSyncUpdateInput {
  enabled?: boolean;
  autoSync?: boolean;
  syncFrequency?: 'manual' | 'daily' | 'weekly' | 'on_change';
  sourcePlatform?: PlatformType;
  targetPlatforms?: PlatformType[];
  lastSyncAt?: Date;
  lastSyncStatus?: 'success' | 'failed' | 'partial';
  lastSyncError?: string;
  totalSyncs?: number;
  successfulSyncs?: number;
  deletedAt?: Date;
  version?: number;
}

// ========== 社区功能类型 ==========

/** 游戏组类型枚举 */
export enum GroupType {
  CLAN = 'clan',           // 战队/部落
  GUILD = 'guild',         // 公会
  COMMUNITY = 'community', // 社区
  TEAM = 'team',           // 队伍
  CLUB = 'club'            // 俱乐部
}

/** 游戏组隐私设置枚举 */
export enum GroupPrivacy {
  PUBLIC = 'public',       // 公开，任何人都可以加入
  PRIVATE = 'private',     // 私有，需要邀请
  RESTRICTED = 'restricted' // 限制，需要申请
}

/** 游戏组成员角色枚举 */
export enum GroupMemberRole {
  OWNER = 'owner',         // 所有者
  ADMIN = 'admin',         // 管理员
  MODERATOR = 'moderator', // 版主
  MEMBER = 'member',       // 成员
  APPLICANT = 'applicant'  // 申请者
}

/** 游戏组实体 */
export interface GameGroup {
  id: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;

  // 组信息
  type: GroupType;
  privacy: GroupPrivacy;
  gameId?: string; // 关联的游戏（可选）
  gameTitle?: string; // 冗余字段

  // 媒体
  avatarUrl?: string;
  bannerUrl?: string;

  // 统计
  memberCount: number;
  postCount: number;
  eventCount: number;

  // 设置
  settings: {
    allowMemberPosts: boolean;
    requireApproval: boolean;
    maxMembers?: number;
    language?: string;
    region?: string;
  };

  // 标签和分类
  tags: string[];
  categories: string[];

  // 时间戳
  createdAt: Date;
  updatedAt: Date;

  // 软删除
  deletedAt?: Date;
  version?: number;
  createdBy: string;
  updatedBy?: string;
}

/** 游戏组创建输入 */
export interface GameGroupCreateInput {
  name: string;
  description?: string;
  shortDescription?: string;
  type: GroupType;
  privacy: GroupPrivacy;
  gameId?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  settings?: {
    allowMemberPosts?: boolean;
    requireApproval?: boolean;
    maxMembers?: number;
    language?: string;
    region?: string;
  };
  tags?: string[];
  categories?: string[];
  createdBy: string;
}

/** 游戏组更新输入 */
export interface GameGroupUpdateInput {
  name?: string;
  description?: string;
  shortDescription?: string;
  type?: GroupType;
  privacy?: GroupPrivacy;
  avatarUrl?: string;
  bannerUrl?: string;
  settings?: {
    allowMemberPosts?: boolean;
    requireApproval?: boolean;
    maxMembers?: number;
    language?: string;
    region?: string;
  };
  tags?: string[];
  categories?: string[];
  memberCount?: number;
  postCount?: number;
  eventCount?: number;
  deletedAt?: Date;
  version?: number;
  updatedBy?: string;
}

/** 游戏组成员 */
export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;

  // 成员信息
  role: GroupMemberRole;
  joinedAt: Date;
  invitedBy?: string;

  // 成员数据
  postCount: number;
  lastActiveAt?: Date;
  isMuted: boolean;
  muteExpiresAt?: Date;

  // 自定义信息
  customTitle?: string;
  notes?: string; // 管理员备注

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  version?: number;
}

/** 游戏组成员创建输入 */
export interface GroupMemberCreateInput {
  groupId: string;
  userId: string;
  role: GroupMemberRole;
  invitedBy?: string;
  customTitle?: string;
  notes?: string;
}

/** 游戏组成员更新输入 */
export interface GroupMemberUpdateInput {
  role?: GroupMemberRole;
  postCount?: number;
  lastActiveAt?: Date;
  isMuted?: boolean;
  muteExpiresAt?: Date;
  customTitle?: string;
  notes?: string;
  deletedAt?: Date;
  version?: number;
}

// ========== 聊天和组队类型 ==========

/** 聊天频道类型枚举 */
export enum ChatChannelType {
  GROUP = 'group',         // 群组聊天
  DIRECT = 'direct',       // 私聊
  GAME = 'game',          // 游戏内聊天
  VOICE = 'voice'         // 语音频道
}

/** 聊天消息实体 */
export interface ChatMessage {
  id: string;
  channelId: string;
  channelType: ChatChannelType;

  // 发送者信息
  senderId: string;
  senderName: string;
  senderAvatar?: string;

  // 消息内容
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  metadata?: Record<string, any>;

  // 消息状态
  edited: boolean;
  editedAt?: Date;
  deleted: boolean;
  deletedAt?: Date;

  // 已读状态
  readBy: string[]; // 已读用户ID列表

  // 回复
  replyToId?: string;

  createdAt: Date;
  updatedAt: Date;
  version?: number;
}

/** 聊天消息创建输入 */
export interface ChatMessageCreateInput {
  channelId: string;
  channelType: ChatChannelType;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  metadata?: Record<string, any>;
  replyToId?: string;
}

/** 聊天消息更新输入 */
export interface ChatMessageUpdateInput {
  content?: string;
  edited?: boolean;
  editedAt?: Date;
  deleted?: boolean;
  deletedAt?: Date;
  readBy?: string[];
  version?: number;
}

/** 游戏组队 */
export interface GameParty {
  id: string;
  gameId: string;
  name?: string;

  // 队伍信息
  leaderId: string;
  memberIds: string[];
  maxSize: number;

  // 队伍状态
  status: 'forming' | 'ready' | 'in_game' | 'finished';
  gameMode?: string;
  platform?: PlatformType;

  // 语音聊天
  voiceChannelId?: string;

  // 匹配信息
  lookingForMore: boolean;
  requiredRoles?: string[]; // 需要的角色，如 "tank", "healer", "dps"

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  version?: number;
}

/** 游戏组队创建输入 */
export interface GamePartyCreateInput {
  gameId: string;
  name?: string;
  leaderId: string;
  memberIds?: string[];
  maxSize: number;
  status?: 'forming' | 'ready' | 'in_game' | 'finished';
  gameMode?: string;
  platform?: PlatformType;
  voiceChannelId?: string;
  lookingForMore?: boolean;
  requiredRoles?: string[];
}

/** 游戏组队更新输入 */
export interface GamePartyUpdateInput {
  name?: string;
  leaderId?: string;
  memberIds?: string[];
  maxSize?: number;
  status?: 'forming' | 'ready' | 'in_game' | 'finished';
  gameMode?: string;
  platform?: PlatformType;
  voiceChannelId?: string;
  lookingForMore?: boolean;
  requiredRoles?: string[];
  deletedAt?: Date;
  version?: number;
}

/** 组队邀请 */
export interface PartyInvite {
  id: string;
  partyId: string;
  inviterId: string;
  inviteeId: string;

  // 邀请状态
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: Date;

  // 邀请消息
  message?: string;

  createdAt: Date;
  updatedAt: Date;
  version?: number;
}

/** 组队邀请创建输入 */
export interface PartyInviteCreateInput {
  partyId: string;
  inviterId: string;
  inviteeId: string;
  expiresAt: Date;
  message?: string;
}

/** 组队邀请更新输入 */
export interface PartyInviteUpdateInput {
  status?: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt?: Date;
  message?: string;
  version?: number;
}

// ========== 用户生成内容类型 ==========

/** 用户生成内容类型枚举 */
export enum ContentType {
  GUIDE = 'guide',         // 攻略
  MOD = 'mod',            // 模组
  BUILD = 'build',        // 配装/构筑
  REVIEW = 'review',      // 评测
  NEWS = 'news',          // 新闻
  VIDEO = 'video',        // 视频
  SCREENSHOT = 'screenshot' // 截图
}

/** 用户生成内容实体 */
export interface UserGeneratedContent {
  id: string;
  authorId: string;
  gameId: string;

  // 内容信息
  type: ContentType;
  title: string;
  slug: string;
  content: string; // Markdown格式
  excerpt?: string;

  // 媒体
  coverImage?: string;
  images?: string[];
  videos?: string[];
  attachments?: string[]; // 附件文件

  // 标签和分类
  tags: string[];
  category?: string;

  // 版本控制
  version: number;
  isLatest: boolean;
  previousVersionId?: string;

  // 状态
  status: 'draft' | 'published' | 'archived' | 'deleted';
  publishedAt?: Date;

  // 统计
  views: number;
  likes: number;
  comments: number;
  downloads?: number; // 对于模组等可下载内容

  // 元数据
  metadata?: {
    gameVersion?: string;
    platform?: PlatformType;
    difficulty?: string;
    estimatedTime?: number; // 预计阅读/完成时间（分钟）
    prerequisites?: string[];
  };

  // 审核
  moderated: boolean;
  moderatedAt?: Date;
  moderatorId?: string;
  moderationNotes?: string;

  // 时间戳
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

/** 用户生成内容创建输入 */
export interface UserGeneratedContentCreateInput {
  authorId: string;
  gameId: string;
  type: ContentType;
  title: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  images?: string[];
  videos?: string[];
  attachments?: string[];
  tags?: string[];
  category?: string;
  metadata?: {
    gameVersion?: string;
    platform?: PlatformType;
    difficulty?: string;
    estimatedTime?: number;
    prerequisites?: string[];
  };
}

/** 用户生成内容更新输入 */
export interface UserGeneratedContentUpdateInput {
  title?: string;
  content?: string;
  excerpt?: string;
  coverImage?: string;
  images?: string[];
  videos?: string[];
  attachments?: string[];
  tags?: string[];
  category?: string;
  version?: number;
  isLatest?: boolean;
  previousVersionId?: string;
  status?: 'draft' | 'published' | 'archived' | 'deleted';
  publishedAt?: Date;
  views?: number;
  likes?: number;
  comments?: number;
  downloads?: number;
  metadata?: {
    gameVersion?: string;
    platform?: PlatformType;
    difficulty?: string;
    estimatedTime?: number;
    prerequisites?: string[];
  };
  moderated?: boolean;
  moderatedAt?: Date;
  moderatorId?: string;
  moderationNotes?: string;
  deletedAt?: Date;
}

// ========== API响应类型 ==========

/** 游戏库列表响应 */
export interface GameLibraryResponse {
  games: UserGameLibrary[];
  total: number;
  page: number;
  limit: number;
}

/** 游戏会话列表响应（含统计） */
export interface GameSessionsResponse {
  sessions: GameSession[];
  stats: GameTimeStats;
  total: number;
  page: number;
  limit: number;
}

/** 成就数据响应 */
export interface AchievementsResponse {
  achievements: GameAchievement[];
  userAchievements: UserAchievement[];
  stats: AchievementStats;
}

/** 游戏组列表响应 */
export interface GameGroupsResponse {
  groups: GameGroup[];
  total: number;
  page: number;
  limit: number;
}

/** 用户内容列表响应 */
export interface UserContentResponse {
  content: UserGeneratedContent[];
  total: number;
  page: number;
  limit: number;
}
