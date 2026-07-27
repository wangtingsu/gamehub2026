/**
 * 内存数据库模块
 *
 * 提供一个基于 JavaScript Map 的内存数据库实现，用于开发环境和测试场景。
 * 该模块实现了与 SQLite / PostgreSQL 相同的接口（connectDatabase、query、execute 等），
 * 可在无需外部数据库依赖时快速启动应用。
 *
 * 包含内置的示例数据（用户、游戏），方便开发阶段的功能验证。
 *
 * @module db/memory
 */

import config from '../config';
import logger from '../utils/logger';

/**
 * 用户数据结构
 *
 * @interface User
 * @property {number} id - 用户唯一标识
 * @property {string} username - 用户名，全局唯一
 * @property {string} email - 邮箱地址，全局唯一
 * @property {string} password_hash - bcrypt 密码哈希值
 * @property {string} [display_name] - 用户显示名称
 * @property {string} [avatar_url] - 用户头像 URL
 * @property {string} [bio] - 用户个人简介
 * @property {string} role - 用户角色（admin / user / moderator）
 * @property {boolean} email_verified - 邮箱是否已验证
 * @property {boolean} is_active - 账户是否激活
 * @property {string} [last_login] - 最后登录时间（ISO 格式）
 * @property {string} created_at - 创建时间（ISO 格式）
 * @property {string} updated_at - 最后更新时间（ISO 格式）
 */
interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  role: string;
  email_verified: boolean;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 游戏数据结构
 *
 * @interface Game
 * @property {number} id - 游戏唯一标识
 * @property {string} title - 游戏标题
 * @property {string} slug - URL 友好别名，全局唯一
 * @property {string} [description] - 游戏描述
 * @property {string} [release_date] - 发布日期
 * @property {string} [developer] - 开发商
 * @property {string} [publisher] - 发行商
 * @property {string} [genres] - 游戏类型（逗号分隔）
 * @property {string} [platforms] - 支持平台（逗号分隔）
 * @property {number} [rating] - 评分（0-5）
 * @property {number} [price] - 价格
 * @property {number} [discount] - 折扣百分比
 * @property {string} [cover_image_url] - 封面图片 URL
 * @property {string} [screenshots] - 截图 URL 列表（逗号分隔）
 * @property {number} [steam_app_id] - Steam App ID
 * @property {number} [rawg_id] - RAWG API ID
 * @property {boolean} is_featured - 是否为推荐游戏
 * @property {string} created_at - 创建时间（ISO 格式）
 * @property {string} updated_at - 最后更新时间（ISO 格式）
 */
interface Game {
  id: number;
  title: string;
  slug: string;
  description?: string;
  release_date?: string;
  developer?: string;
  publisher?: string;
  genres?: string;
  platforms?: string;
  rating?: number;
  price?: number;
  discount?: number;
  cover_image_url?: string;
  screenshots?: string;
  steam_app_id?: number;
  rawg_id?: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 评论/评测数据结构
 *
 * @interface Review
 * @property {number} id - 评论唯一标识
 * @property {number} user_id - 评论作者的用户 ID
 * @property {number} game_id - 评论目标游戏 ID
 * @property {number} rating - 评分
 * @property {string} content - 评论内容
 * @property {number} likes - 点赞数
 * @property {boolean} is_helpful - 是否被标记为有帮助
 * @property {string} created_at - 创建时间（ISO 格式）
 * @property {string} updated_at - 最后更新时间（ISO 格式）
 */
interface Review {
  id: number;
  user_id: number;
  game_id: number;
  rating: number;
  content: string;
  likes: number;
  is_helpful: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 收藏数据结构
 *
 * @interface Favorite
 * @property {number} id - 收藏记录唯一标识
 * @property {number} user_id - 用户 ID
 * @property {number} game_id - 被收藏的游戏 ID
 * @property {string} created_at - 收藏时间（ISO 格式）
 */
interface Favorite {
  id: number;
  user_id: number;
  game_id: number;
  created_at: string;
}

/**
 * 内存数据库类
 *
 * 基于 JavaScript Map 数据结构实现的内存数据库。
 * 提供与持久化数据库相同的 CRUD 接口，但数据仅存在于进程内存中，
 * 进程重启后数据丢失。主要用于开发调试和测试场景。
 *
 * @class MemoryDatabase
 */
class MemoryDatabase {
  /** 用户数据存储 Map（key: 用户 ID） */
  private users: Map<number, User> = new Map();
  /** 游戏数据存储 Map（key: 游戏 ID） */
  private games: Map<number, Game> = new Map();
  /** 评论数据存储 Map（key: 评论 ID） */
  private reviews: Map<number, Review> = new Map();
  /** 收藏数据存储 Map（key: 收藏 ID） */
  private favorites: Map<number, Favorite> = new Map();

  /** 用户 ID 自增计数器 */
  private userIdCounter = 1;
  /** 游戏 ID 自增计数器 */
  private gameIdCounter = 1;
  /** 评论 ID 自增计数器 */
  private reviewIdCounter = 1;
  /** 收藏 ID 自增计数器 */
  private favoriteIdCounter = 1;

  /**
   * 创建 MemoryDatabase 实例并初始化示例数据
   *
   * @constructor
   */
  constructor() {
    this.initializeSampleData();
  }

  /**
   * 初始化示例数据
   *
   * 向内存数据库中添加预置的示例用户和游戏数据，
   * 方便开发阶段进行功能测试和界面展示。
   *
   * @private
   */
  private initializeSampleData(): void {
    /** 添加示例用户 */
    this.users.set(1, {
      id: 1,
      username: 'admin',
      email: 'admin@gamehub.com',
      password_hash: '$2a$12$K9q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q',
      display_name: '管理员',
      role: 'admin',
      email_verified: true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    this.users.set(2, {
      id: 2,
      username: 'testuser',
      email: 'test@gamehub.com',
      password_hash: '$2a$12$K9q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q8q',
      display_name: '测试用户',
      role: 'user',
      email_verified: true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    /** 添加示例游戏 */
    this.games.set(1, {
      id: 1,
      title: '赛博朋克 2077',
      slug: 'cyberpunk-2077',
      description: '一款开放世界动作冒险RPG游戏，故事发生在夜之城，一个痴迷于力量、魅力和身体改造的未来大都市。',
      release_date: '2020-12-10',
      developer: 'CD Projekt Red',
      publisher: 'CD Projekt',
      genres: 'RPG,动作,开放世界',
      platforms: 'PC,PlayStation,Xbox',
      rating: 4.5,
      price: 299,
      discount: 20,
      cover_image_url: 'https://example.com/cyberpunk.jpg',
      screenshots: 'https://example.com/s1.jpg,https://example.com/s2.jpg',
      steam_app_id: 1091500,
      rawg_id: 41494,
      is_featured: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    this.games.set(2, {
      id: 2,
      title: '艾尔登法环',
      slug: 'elden-ring',
      description: '一款由FromSoftware开发、万代南梦宫娱乐发行的动作角色扮演游戏。',
      release_date: '2022-02-25',
      developer: 'FromSoftware',
      publisher: 'Bandai Namco',
      genres: '动作,RPG,冒险',
      platforms: 'PC,PlayStation,Xbox',
      rating: 4.8,
      price: 398,
      discount: 10,
      cover_image_url: 'https://example.com/elden-ring.jpg',
      screenshots: 'https://example.com/e1.jpg,https://example.com/e2.jpg',
      steam_app_id: 1245620,
      rawg_id: 326243,
      is_featured: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    logger.info('内存数据库初始化完成，包含示例数据');
  }

  /**
   * 创建新用户
   *
   * @param {Omit<User, 'id' | 'created_at' | 'updated_at'>} user - 不包含自动生成字段的用户数据
   * @returns {Promise<User>} 创建完成的用户对象（包含生成的 id 和时间戳）
   */
  async createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date().toISOString();
    const newUser: User = {
      ...user,
      id,
      created_at: now,
      updated_at: now,
    };
    this.users.set(id, newUser);
    return newUser;
  }

  /**
   * 根据用户 ID 获取用户
   *
   * @param {number} id - 用户 ID
   * @returns {Promise<User | undefined>} 用户对象，未找到返回 undefined
   */
  async getUserById(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  /**
   * 根据用户名获取用户
   *
   * @param {string} username - 用户名
   * @returns {Promise<User | undefined>} 用户对象，未找到返回 undefined
   */
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  /**
   * 根据邮箱获取用户
   *
   * @param {string} email - 邮箱地址
   * @returns {Promise<User | undefined>} 用户对象，未找到返回 undefined
   */
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  /**
   * 更新用户信息
   *
   * @param {number} id - 要更新的用户 ID
   * @param {Partial<User>} updates - 需要更新的字段
   * @returns {Promise<User | undefined>} 更新后的用户对象，用户不存在返回 undefined
   */
  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = {
      ...user,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  /**
   * 创建新游戏
   *
   * @param {Omit<Game, 'id' | 'created_at' | 'updated_at'>} game - 不包含自动生成字段的游戏数据
   * @returns {Promise<Game>} 创建完成的游戏对象
   */
  async createGame(game: Omit<Game, 'id' | 'created_at' | 'updated_at'>): Promise<Game> {
    const id = this.gameIdCounter++;
    const now = new Date().toISOString();
    const newGame: Game = {
      ...game,
      id,
      created_at: now,
      updated_at: now,
    };
    this.games.set(id, newGame);
    return newGame;
  }

  /**
   * 根据 ID 获取游戏
   *
   * @param {number} id - 游戏 ID
   * @returns {Promise<Game | undefined>} 游戏对象，未找到返回 undefined
   */
  async getGameById(id: number): Promise<Game | undefined> {
    return this.games.get(id);
  }

  /**
   * 根据别名获取游戏
   *
   * @param {string} slug - URL 友好别名
   * @returns {Promise<Game | undefined>} 游戏对象，未找到返回 undefined
   */
  async getGameBySlug(slug: string): Promise<Game | undefined> {
    return Array.from(this.games.values()).find(game => game.slug === slug);
  }

  /**
   * 获取所有游戏列表
   *
   * @returns {Promise<Game[]>} 所有游戏的数组
   */
  async getAllGames(): Promise<Game[]> {
    return Array.from(this.games.values());
  }

  /**
   * 获取所有推荐游戏
   *
   * @returns {Promise<Game[]>} 被标记为推荐（is_featured）的游戏数组
   */
  async getFeaturedGames(): Promise<Game[]> {
    return Array.from(this.games.values()).filter(game => game.is_featured);
  }

  /**
   * 更新游戏信息
   *
   * @param {number} id - 要更新的游戏 ID
   * @param {Partial<Game>} updates - 需要更新的字段
   * @returns {Promise<Game | undefined>} 更新后的游戏对象，不存在返回 undefined
   */
  async updateGame(id: number, updates: Partial<Game>): Promise<Game | undefined> {
    const game = this.games.get(id);
    if (!game) return undefined;

    const updatedGame = {
      ...game,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.games.set(id, updatedGame);
    return updatedGame;
  }

  /**
   * 删除游戏
   *
   * @param {number} id - 要删除的游戏 ID
   * @returns {Promise<boolean>} 删除成功返回 true，游戏不存在返回 false
   */
  async deleteGame(id: number): Promise<boolean> {
    return this.games.delete(id);
  }

  /**
   * 创建新评论
   *
   * @param {Omit<Review, 'id' | 'created_at' | 'updated_at'>} review - 不包含自动生成字段的评论数据
   * @returns {Promise<Review>} 创建完成的评论对象
   */
  async createReview(review: Omit<Review, 'id' | 'created_at' | 'updated_at'>): Promise<Review> {
    const id = this.reviewIdCounter++;
    const now = new Date().toISOString();
    const newReview: Review = {
      ...review,
      id,
      created_at: now,
      updated_at: now,
    };
    this.reviews.set(id, newReview);
    return newReview;
  }

  /**
   * 获取指定游戏的所有评论
   *
   * @param {number} gameId - 游戏 ID
   * @returns {Promise<Review[]>} 该游戏的所有评论数组
   */
  async getReviewsByGameId(gameId: number): Promise<Review[]> {
    return Array.from(this.reviews.values()).filter(review => review.game_id === gameId);
  }

  /**
   * 获取指定用户的所有评论
   *
   * @param {number} userId - 用户 ID
   * @returns {Promise<Review[]>} 该用户的所有评论数组
   */
  async getReviewsByUserId(userId: number): Promise<Review[]> {
    return Array.from(this.reviews.values()).filter(review => review.user_id === userId);
  }

  /**
   * 添加收藏
   *
   * @param {number} userId - 用户 ID
   * @param {number} gameId - 游戏 ID
   * @returns {Promise<Favorite>} 创建的收藏记录
   */
  async addFavorite(userId: number, gameId: number): Promise<Favorite> {
    const id = this.favoriteIdCounter++;
    const now = new Date().toISOString();
    const favorite: Favorite = {
      id,
      user_id: userId,
      game_id: gameId,
      created_at: now,
    };
    this.favorites.set(id, favorite);
    return favorite;
  }

  /**
   * 取消收藏
   *
   * @param {number} userId - 用户 ID
   * @param {number} gameId - 游戏 ID
   * @returns {Promise<boolean>} 取消成功返回 true，收藏不存在返回 false
   */
  async removeFavorite(userId: number, gameId: number): Promise<boolean> {
    const favorite = Array.from(this.favorites.values()).find(
      f => f.user_id === userId && f.game_id === gameId
    );
    if (favorite) {
      return this.favorites.delete(favorite.id);
    }
    return false;
  }

  /**
   * 获取用户收藏的所有游戏
   *
   * @param {number} userId - 用户 ID
   * @returns {Promise<Game[]>} 该用户收藏的游戏对象数组
   */
  async getUserFavorites(userId: number): Promise<Game[]> {
    const favoriteGameIds = Array.from(this.favorites.values())
      .filter(f => f.user_id === userId)
      .map(f => f.game_id);

    return Array.from(this.games.values()).filter(game =>
      favoriteGameIds.includes(game.id)
    );
  }

  /**
   * 检查用户是否已收藏某游戏
   *
   * @param {number} userId - 用户 ID
   * @param {number} gameId - 游戏 ID
   * @returns {Promise<boolean>} 已收藏返回 true，否则返回 false
   */
  async isGameFavorited(userId: number, gameId: number): Promise<boolean> {
    return Array.from(this.favorites.values()).some(
      f => f.user_id === userId && f.game_id === gameId
    );
  }

  /**
   * 通用查询方法（模拟 SQL 查询）
   *
   * 因内存数据库不支持真实 SQL，本方法仅记录查询日志并返回空数组。
   * 保留此接口以保持与 SQLite / PostgreSQL 模块的签名一致性。
   *
   * @typeparam T - 查询结果类型
   * @param {string} sql - SQL 查询语句（仅记录用）
   * @param {any[]} [params=[]] - 查询参数（仅记录用）
   * @returns {Promise<T[]>} 始终返回空数组
   */
  async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    logger.debug('内存数据库查询:', { sql, params });
    return [];
  }

  /**
   * 通用执行方法（模拟 SQL 执行）
   *
   * 因内存数据库不支持真实 SQL，本方法仅记录执行日志并返回模拟结果。
   * 保留此接口以保持与 SQLite / PostgreSQL 模块的签名一致性。
   *
   * @param {string} sql - SQL 语句（仅记录用）
   * @param {any[]} [params=[]] - 执行参数（仅记录用）
   * @returns {Promise<{ changes: number; lastInsertRowid: number }>} 模拟执行结果
   */
  async execute(sql: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid: number }> {
    logger.debug('内存数据库执行:', { sql, params });
    return {
      changes: 1,
      lastInsertRowid: 1,
    };
  }
}

/** 创建内存数据库单例实例 */
const memoryDb = new MemoryDatabase();

/**
 * 连接内存数据库（始终成功）
 *
 * @returns {Promise<void>} 连接完成后 resolve
 */
export const connectDatabase = async (): Promise<void> => {
  logger.info('内存数据库连接成功');
};

/**
 * 获取内存数据库连接实例
 *
 * @returns {MemoryDatabase} MemoryDatabase 单例实例
 */
export const getConnection = () => memoryDb;

/**
 * 执行内存数据库查询
 *
 * @typeparam T - 查询结果类型
 * @param {string} sql - SQL 查询语句
 * @param {any[]} [params=[]] - 查询参数
 * @returns {Promise<T[]>} 查询结果数组
 */
export const query = async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
  return memoryDb.query<T>(sql, params);
};

/**
 * 执行内存数据库写入操作
 *
 * @param {string} sql - SQL 语句
 * @param {any[]} [params=[]] - 执行参数
 * @returns {Promise<{ changes: number; lastInsertRowid: number }>} 执行结果
 */
export const execute = async (sql: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid: number }> => {
  return memoryDb.execute(sql, params);
};

/**
 * 在内存数据库中执行事务
 *
 * 内存数据库中的事务通过 try/catch 简单模拟，
 * 回调成功则返回结果，失败则记录错误并抛出。
 *
 * @typeparam T - 回调函数的返回类型
 * @param {() => Promise<T>} callback - 事务回调函数
 * @returns {Promise<T>} 回调函数的返回值
 */
export const transaction = async <T>(callback: () => Promise<T>): Promise<T> => {
  try {
    return await callback();
  } catch (error) {
    logger.error('内存数据库事务失败:', error);
    throw error;
  }
};

/**
 * 内存数据库健康检查（始终正常）
 *
 * @returns {Promise<boolean>} 始终返回 true
 */
export const checkHealth = async (): Promise<boolean> => {
  return true;
};

/**
 * 关闭内存数据库连接
 *
 * @returns {Promise<void>} 关闭完成后 resolve
 */
export const closeDatabase = async (): Promise<void> => {
  logger.info('内存数据库连接已关闭');
};

/**
 * 运行内存数据库迁移（无需实际操作）
 *
 * @returns {Promise<void>} 迁移完成后 resolve
 */
export const runMigrations = async (): Promise<void> => {
  logger.info('内存数据库迁移完成（无需实际迁移）');
};

/** 导出具体操作方法（直接暴露 MemoryDatabase 实例） */
export const db = memoryDb;

/**
 * 内存数据库模块默认导出
 *
 * 聚合所有数据库操作方法和 db 实例为默认导出对象。
 */
export default {
  connectDatabase,
  getConnection,
  query,
  execute,
  transaction,
  checkHealth,
  closeDatabase,
  runMigrations,
  db,
};
