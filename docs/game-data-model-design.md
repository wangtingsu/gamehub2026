# 统一游戏数据模型设计

## 概述

本文档描述了GameHub的统一游戏数据模型设计，支持多平台标识、游戏库管理、时间追踪、成就系统和跨平台进度管理。

## 设计目标

1. **统一游戏数据模型**：扩展现有Game模型，支持详细的多平台信息
2. **多平台标识**：支持PC、主机、移动等平台的详细标识
3. **游戏库管理**：用户个人游戏库的导入、同步和管理
4. **游戏时间追踪**：记录用户在游戏上的时间投入
5. **成就展示**：集成游戏成就系统
6. **跨平台进度管理**：支持同一游戏在不同平台的进度同步

## 1. 统一游戏数据模型

### 1.1 扩展Game接口

```typescript
// 平台类型枚举
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
  releaseDate?: Date;
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
export interface Game {
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
```

### 1.2 游戏创建和更新接口

```typescript
export interface GameCreateInput {
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

export interface GameUpdateInput {
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
```

## 2. 用户游戏库数据模型

### 2.1 用户游戏库条目

```typescript
// 游戏库状态
export enum LibraryStatus {
  WISHLIST = 'wishlist',      // 愿望单
  OWNED = 'owned',            // 已拥有
  PLAYING = 'playing',        // 正在玩
  COMPLETED = 'completed',    // 已完成
  ABANDONED = 'abandoned',    // 已放弃
  ON_HOLD = 'on_hold'         // 暂停中
}

// 游戏平台拥有状态
export interface PlatformOwnership {
  platformType: PlatformType;
  platformName: string;
  owned: boolean;
  purchaseDate?: Date;
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
```

### 2.2 游戏时间追踪

```typescript
// 游戏会话记录
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

// 游戏时间统计
export interface GameTimeStats {
  totalTime: number; // 总游戏时间（秒）
  lastTwoWeeksTime: number; // 最近两周游戏时间
  averageSessionLength: number; // 平均会话长度
  sessionsCount: number; // 总会话数
  lastPlayed: Date; // 最后游玩时间
  platformBreakdown: Record<PlatformType, number>; // 各平台游戏时间
}
```

### 2.3 成就系统

```typescript
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
  
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
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

// 成就统计
export interface AchievementStats {
  totalAchievements: number;
  unlockedAchievements: number;
  completionPercentage: number;
  totalPoints: number;
  earnedPoints: number;
  rareAchievements: number; // 稀有成就数量（解锁率<10%）
  lastUnlocked?: Date;
}
```

### 2.4 跨平台游戏进度

```typescript
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
```

## 3. 社区功能强化

### 3.1 游戏组/社区

```typescript
// 游戏组类型
export enum GroupType {
  CLAN = 'clan',           // 战队/部落
  GUILD = 'guild',         // 公会
  COMMUNITY = 'community', // 社区
  TEAM = 'team',           // 队伍
  CLUB = 'club'            // 俱乐部
}

// 游戏组隐私设置
export enum GroupPrivacy {
  PUBLIC = 'public',       // 公开，任何人都可以加入
  PRIVATE = 'private',     // 私有，需要邀请
  RESTRICTED = 'restricted' // 限制，需要申请
}

// 游戏组成员角色
export enum GroupMemberRole {
  OWNER = 'owner',         // 所有者
  ADMIN = 'admin',         // 管理员
  MODERATOR = 'moderator', // 版主
  MEMBER = 'member',       // 成员
  APPLICANT = 'applicant'  // 申请者
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
  createdAt: Date;
  updatedAt: Date;
  
  // 软删除
  deletedAt?: Date;
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
```

### 3.2 实时聊天和组队

```typescript
// 聊天频道类型
export enum ChatChannelType {
  GROUP = 'group',         // 群组聊天
  DIRECT = 'direct',       // 私聊
  GAME = 'game',          // 游戏内聊天
  VOICE = 'voice'         // 语音频道
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
  
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
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
  expiresAt: Date;
  
  // 邀请消息
  message?: string;
  
  createdAt: Date;
  updatedAt: Date;
  version?: number;
}
```

### 3.3 用户生成内容

```typescript
// 内容类型
export enum ContentType {
  GUIDE = 'guide',         // 攻略
  MOD = 'mod',            // 模组
  BUILD = 'build',        // 配装/构筑
  REVIEW = 'review',      // 评测
  NEWS = 'news',          // 新闻
  VIDEO = 'video',        // 视频
  SCREENSHOT = 'screenshot' // 截图
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

// 模组特定信息
export interface ModContent extends UserGeneratedContent {
  type: ContentType.MOD;
  metadata: {
    gameVersion: string;
    platform: PlatformType;
    modVersion: string;
    dependencies?: string[]; // 依赖的其他模组
    compatibility: string[]; // 兼容的游戏版本
    installationInstructions: string;
    changelog?: string;
  };
}

// 攻略特定信息
export interface GuideContent extends UserGeneratedContent {
  type: ContentType.GUIDE;
  metadata: {
    gameVersion: string;
    platform: PlatformType;
    difficulty: 'easy' | 'medium' | 'hard' | 'expert';
    estimatedTime: number;
    prerequisites: string[];
    sections: Array<{
      title: string;
      content: string;
      images?: string[];
    }>;
  };
}
```

## 4. 数据库迁移计划

### 4.1 新增表结构

1. **games_platforms** - 游戏平台详细信息
2. **user_game_library** - 用户游戏库
3. **game_sessions** - 游戏会话记录
4. **game_achievements** - 游戏成就
5. **user_achievements** - 用户成就解锁
6. **game_saves** - 游戏存档
7. **cross_platform_syncs** - 跨平台同步配置
8. **game_groups** - 游戏组/社区
9. **group_members** - 组成员
10. **chat_channels** - 聊天频道
11. **chat_messages** - 聊天消息
12. **game_parties** - 游戏组队
13. **party_invites** - 组队邀请
14. **user_generated_content** - 用户生成内容

### 4.2 现有表修改

1. **games表** - 添加新字段，迁移平台数据
2. **favorites表** - 保持不变，作为收藏功能

## 5. API设计

### 5.1 游戏库API
- `GET /api/v1/library` - 获取用户游戏库
- `POST /api/v1/library` - 添加游戏到库
- `PUT /api/v1/library/:id` - 更新库条目状态
- `GET /api/v1/library/stats` - 获取游戏库统计
- `POST /api/v1/library/import` - 导入外部游戏库

### 5.2 游戏时间API
- `POST /api/v1/sessions` - 记录游戏会话
- `GET /api/v1/sessions/stats` - 获取游戏时间统计
- `GET /api/v1/sessions/recent` - 获取最近游戏会话

### 5.3 成就API
- `GET /api/v1/games/:id/achievements` - 获取游戏成就
- `GET /api/v1/users/:id/achievements` - 获取用户成就
- `POST /api/v1/achievements/sync` - 同步平台成就

### 5.4 社区API
- `GET /api/v1/groups` - 获取游戏组
- `POST /api/v1/groups` - 创建游戏组
- `GET /api/v1/groups/:id/members` - 获取组成员
- `POST /api/v1/groups/:id/join` - 加入游戏组

### 5.5 聊天API
- `GET /api/v1/chat/channels` - 获取聊天频道
- `POST /api/v1/chat/messages` - 发送消息
- `GET /api/v1/chat/messages/:channelId` - 获取消息历史

### 5.6 用户生成内容API
- `GET /api/v1/content` - 获取内容列表
- `POST /api/v1/content` - 创建内容
- `GET /api/v1/content/:id` - 获取内容详情
- `PUT /api/v1/content/:id` - 更新内容

## 6. 实施优先级

### 阶段1：基础游戏库（高优先级）
1. 扩展Game模型，支持多平台标识
2. 实现用户游戏库管理
3. 基础游戏时间追踪

### 阶段2：成就和进度（中优先级）
1. 成就系统
2. 跨平台进度管理
3. 游戏存档管理

### 阶段3：社区功能（中优先级）
1. 游戏组/社区创建和管理
2. 用户生成内容系统

### 阶段4：实时功能（低优先级）
1. 实时聊天
2. 游戏组队系统
3. 语音聊天集成

## 7. 技术考虑

### 7.1 性能优化
- 游戏时间统计使用物化视图或定期计算
- 聊天消息使用分页和延迟加载
- 用户生成内容使用CDN存储媒体文件

### 7.2 安全性
- 游戏存档数据加密存储
- 聊天内容审核和过滤
- 用户生成内容审核流程

### 7.3 可扩展性
- 支持多种游戏平台API集成（Steam、PlayStation、Xbox等）
- 模块化设计，便于添加新功能
- WebSocket支持实时通信

---

**文档版本**: 1.0  
**最后更新**: 2026-04-22  
**负责人**: 系统架构团队