/**
 * 游戏相关扩展类型定义模块
 *
 * 包含游戏平台、游戏库、游戏组、聊天、成就、存档、跨平台同步、
 * 用户生成内容等游戏相关的高级类型定义。
 *
 * 这些类型主要供游戏详情页、游戏库管理、社区互动等功能使用。
 *
 * @module api/game-types
 */

/**
 * 平台类型枚举
 * 定义所有支持的游戏平台
 */
export enum PlatformType {
  PC = 'pc',
  PLAYSTATION = 'playstation',
  XBOX = 'xbox',
  NINTENDO = 'nintendo',
  MOBILE = 'mobile',
  VR = 'vr',
  CLOUD = 'cloud'
}

// 平台详细信息
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
  releaseDate?: string;
  exclusive?: boolean;
  systemRequirements?: {
    minimum?: string;
    recommended?: string;
  };
}

// 游戏媒体资源
export interface GameMedia {
  coverImage: string;
  screenshots: string[];
  trailers?: string[];
  artwork?: string[];
}

// 游戏元数据
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

// 扩展的Game接口
export interface ExtendedGame {
  // 基础信息
  id: string;
  title: string;
  slug: string;
  description?: string;
  shortDescription?: string;

  // 发布信息
  releaseDate?: string;
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
  discountEndDate?: string;

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
  featuredUntil?: string;
  promotionalTag?: string;
  views: number;
  wishlistCount: number;
  purchaseCount: number;

  // SEO优化
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];

  // 时间戳
  createdAt: string;
  updatedAt: string;

  // 软删除和审计
  deletedAt?: string;
  version?: number;
  createdBy?: string;
  updatedBy?: string;
}

// 游戏库相关类型

/**
 * 游戏库状态枚举
 * 用户对游戏的拥有和游玩状态
 */
export enum LibraryStatus {
  /** 愿望单（尚未拥有，希望将来购买） */
  WISHLIST = 'wishlist',
  /** 已拥有（已购买或已入库） */
  OWNED = 'owned',
  /** 正在玩（当前正在游玩中） */
  PLAYING = 'playing',
  /** 已完成（已通关或已完结） */
  COMPLETED = 'completed',
  /** 已放弃（不再继续游玩） */
  ABANDONED = 'abandoned',
  /** 暂停中（暂时搁置，未来可能继续） */
  ON_HOLD = 'on_hold'
}

// 游戏平台拥有状态
export interface PlatformOwnership {
  platformType: PlatformType;
  platformName: string;
  owned: boolean;
  purchaseDate?: string;
  purchasePrice?: number;
  store?: string; // 购买平台，如 "Steam", "PlayStation Store"
  storeTransactionId?: string;
}

// 用户游戏库条目
export interface UserGameLibrary {
  id: string;
  userId: string;
  gameId: string;
  gameTitle: string; // 冗余字段，便于查询
  gameSlug: string;  // 冗余字段，便于查询

  // 状态管理
  status: LibraryStatus;
  addedAt: string;
  lastPlayedAt?: string;
  statusUpdatedAt: string;

  // 平台拥有情况
  platforms: PlatformOwnership[];
  primaryPlatform?: PlatformType; // 主要游玩的平台

  // 个人评分和笔记
  personalRating?: number; // 1-5星
  personalNotes?: string;
  tags?: string[]; // 用户自定义标签

  // 时间戳
  createdAt: string;
  updatedAt: string;

  // 软删除
  deletedAt?: string;
  version?: number;
}

// 游戏时间追踪

// 游戏会话记录
export interface GameSession {
  id: string;
  userId: string;
  gameId: string;
  platformType: PlatformType;
  platformName: string;

  // 会话时间
  startTime: string;
  endTime?: string;
  duration?: number; // 秒数，计算得出

  // 会话信息
  sessionType?: 'singleplayer' | 'multiplayer' | 'coop';
  players?: string[]; // 一起游玩的用户ID
  notes?: string;

  // 自动追踪数据
  autoTracked: boolean; // 是否自动追踪
  source?: 'manual' | 'steam' | 'playstation' | 'xbox' | 'nintendo';

  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  version?: number;
}

// 游戏时间统计
export interface GameTimeStats {
  totalTime: number; // 总游戏时间（秒）
  lastTwoWeeksTime: number; // 最近两周游戏时间
  averageSessionLength: number; // 平均会话长度
  sessionsCount: number; // 总会话数
  lastPlayed: string; // 最后游玩时间
  platformBreakdown: Record<PlatformType, number>; // 各平台游戏时间
}

// 成就系统

// 游戏成就
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

  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  version?: number;
}

// 用户成就解锁
export interface UserAchievement {
  id: string;
  userId: string;
  gameId: string;
  achievementId: string;

  // 解锁信息
  unlocked: boolean;
  unlockedAt?: string;
  unlockPlatform?: PlatformType;

  // 进度追踪（用于进度型成就）
  progress?: number; // 当前进度
  target?: number; // 目标值
  progressUpdatedAt?: string;

  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  version?: number;
}

// 成就统计
export interface AchievementStats {
  totalAchievements: number;
  unlockedAchievements: number;
  completionPercentage: number;
  totalPoints: number;
  earnedPoints: number;
  rareAchievements: number; // 稀有成就数量（解锁率<10%）
  lastUnlocked?: string;
}

// 跨平台游戏进度

// 游戏存档/进度
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
  lastSaved: string;

  // 存档内容（加密存储）
  saveData?: string; // JSON字符串，加密存储
  saveDataHash?: string; // 用于校验

  // 元数据
  isAutoSave: boolean;
  isCloudSave: boolean;
  isManualSave: boolean;

  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  version?: number;
}

// 跨平台进度同步
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
  lastSyncAt?: string;
  lastSyncStatus?: 'success' | 'failed' | 'partial';
  lastSyncError?: string;

  // 同步统计
  totalSyncs: number;
  successfulSyncs: number;

  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  version?: number;
}

// 社区功能类型

/**
 * 游戏组类型枚举
 * 定义社区中游戏组的分类
 */
export enum GroupType {
  /** 战队/部落 */
  CLAN = 'clan',
  /** 公会 */
  GUILD = 'guild',
  /** 社区 */
  COMMUNITY = 'community',
  /** 队伍 */
  TEAM = 'team',
  /** 俱乐部 */
  CLUB = 'club'
}

/**
 * 游戏组隐私设置枚举
 * 控制组的加入方式
 */
export enum GroupPrivacy {
  /** 公开，任何人都可以加入 */
  PUBLIC = 'public',
  /** 私有，需要邀请 */
  PRIVATE = 'private',
  /** 限制，需要申请 */
  RESTRICTED = 'restricted'
}

/**
 * 游戏组成员角色枚举
 * 定义组内成员的权限层级
 */
export enum GroupMemberRole {
  /** 所有者 */
  OWNER = 'owner',
  /** 管理员 */
  ADMIN = 'admin',
  /** 版主 */
  MODERATOR = 'moderator',
  /** 成员 */
  MEMBER = 'member',
  /** 申请者 */
  APPLICANT = 'applicant'
}

// 游戏组
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
  createdAt: string;
  updatedAt: string;

  // 软删除
  deletedAt?: string;
  version?: number;
  createdBy: string;
  updatedBy?: string;
}

// 游戏组成员
export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;

  // 成员信息
  role: GroupMemberRole;
  joinedAt: string;
  invitedBy?: string;

  // 成员数据
  postCount: number;
  lastActiveAt?: string;
  isMuted: boolean;
  muteExpiresAt?: string;

  // 自定义信息
  customTitle?: string;
  notes?: string; // 管理员备注

  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  version?: number;
}

// 聊天和组队类型

/**
 * 聊天频道类型枚举
 * 定义消息系统中的聊天频道分类
 */
export enum ChatChannelType {
  /** 群组聊天 */
  GROUP = 'group',
  /** 私聊 */
  DIRECT = 'direct',
  /** 游戏内聊天 */
  GAME = 'game',
  /** 语音频道 */
  VOICE = 'voice'
}

// 聊天消息
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
  editedAt?: string;
  deleted: boolean;
  deletedAt?: string;

  // 已读状态
  readBy: string[]; // 已读用户ID列表

  // 回复
  replyToId?: string;

  createdAt: string;
  updatedAt: string;
  version?: number;
}

// 游戏组队
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

  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  version?: number;
}

// 组队邀请
export interface PartyInvite {
  id: string;
  partyId: string;
  inviterId: string;
  inviteeId: string;

  // 邀请状态
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: string;

  // 邀请消息
  message?: string;

  createdAt: string;
  updatedAt: string;
  version?: number;
}

// 用户生成内容类型

/**
 * 用户生成内容类型枚举
 * 定义社区中用户可创建的内容种类
 */
export enum ContentType {
  /** 攻略 */
  GUIDE = 'guide',
  /** 模组 */
  MOD = 'mod',
  /** 配装/构筑 */
  BUILD = 'build',
  /** 评测 */
  REVIEW = 'review',
  /** 新闻 */
  NEWS = 'news',
  /** 视频 */
  VIDEO = 'video',
  /** 截图 */
  SCREENSHOT = 'screenshot'
}

// 用户生成内容
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
  publishedAt?: string;

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
  moderatedAt?: string;
  moderatorId?: string;
  moderationNotes?: string;

  // 时间戳
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

// API响应类型

export interface GameLibraryResponse {
  games: UserGameLibrary[];
  total: number;
  page: number;
  limit: number;
}

export interface GameSessionsResponse {
  sessions: GameSession[];
  stats: GameTimeStats;
  total: number;
  page: number;
  limit: number;
}

export interface AchievementsResponse {
  achievements: GameAchievement[];
  userAchievements: UserAchievement[];
  stats: AchievementStats;
}

export interface GameGroupsResponse {
  groups: GameGroup[];
  total: number;
  page: number;
  limit: number;
}

export interface UserContentResponse {
  content: UserGeneratedContent[];
  total: number;
  page: number;
  limit: number;
}

// API请求类型

export interface AddToLibraryRequest {
  gameId: string;
  status: LibraryStatus;
  platforms: PlatformOwnership[];
  personalRating?: number;
  personalNotes?: string;
  tags?: string[];
}

export interface UpdateLibraryRequest {
  status?: LibraryStatus;
  platforms?: PlatformOwnership[];
  personalRating?: number;
  personalNotes?: string;
  tags?: string[];
  primaryPlatform?: PlatformType;
}

export interface RecordSessionRequest {
  gameId: string;
  platformType: PlatformType;
  platformName: string;
  startTime: string;
  endTime?: string;
  sessionType?: 'singleplayer' | 'multiplayer' | 'coop';
  players?: string[];
  notes?: string;
}

export interface CreateGameGroupRequest {
  name: string;
  description?: string;
  type: GroupType;
  privacy: GroupPrivacy;
  gameId?: string;
  tags?: string[];
  categories?: string[];
  settings?: {
    allowMemberPosts?: boolean;
    requireApproval?: boolean;
    maxMembers?: number;
    language?: string;
    region?: string;
  };
}

export interface CreateContentRequest {
  gameId: string;
  type: ContentType;
  title: string;
  content: string;
  excerpt?: string;
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