/**
 * Mock API 客户端模块
 *
 * 提供模拟的 API 接口实现，在开发或测试环境下替代真实后端服务。
 * 使用本地 Mock 数据模拟游戏的增删改查、用户认证、新闻资讯、
 * 游戏评测、社区帖子和管理后台等功能的响应。
 *
 * 所有接口都会添加模拟网络延迟（默认 300ms），模拟真实 API 调用体验。
 *
 * @module api/mockClient
 */

import type { ApiResponse, PaginationResponse, LoginRequest, RegisterRequest, PaginationParams } from './types';
import {
  mockGames,
  mockNews,
  mockReviews,
  mockCommunityPosts,
  mockUsers,
  mockAdminStats,
} from '../data/mockData';

/**
 * 模拟网络延迟
 *
 * @param ms - 延迟毫秒数
 * @returns 延迟结束后的 Promise
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 构造模拟 API 响应
 *
 * @param data - 响应数据
 * @param success - 是否成功（默认 true）
 * @param message - 响应消息（默认 "成功"）
 * @returns 符合 ApiResponse 格式的响应对象
 */
const mockResponse = <T>(data: T, success = true, message = '成功'): ApiResponse<T> => ({
  success,
  data,
  message,
});

/**
 * 模拟分页处理：将数组按页切割，返回分页后的数据和分页信息
 *
 * @param items - 原始数据数组
 * @param page - 当前页码（默认 1）
 * @param limit - 每页条数（默认 20）
 * @returns 分页结果，包含当前页数据和分页元信息
 */
const paginate = <T>(items: T[], page: number = 1, limit: number = 20): { items: T[]; pagination: PaginationResponse } => {
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedItems = items.slice(start, end);

  return {
    items: paginatedItems,
    pagination: {
      page,
      limit,
      total: items.length,
      pages: Math.ceil(items.length / limit),
      hasNext: end < items.length,
      hasPrev: start > 0,
    },
  };
};

/**
 * Mock API 客户端类
 *
 * 模拟后端 API 的所有接口，返回预先定义的 Mock 数据。
 * 支持分页、搜索、筛选等参数的模拟处理。
 * 适用于前端开发阶段，无需依赖真实后端服务即可进行开发和调试。
 */
class MockApiClient {
  /** 模拟网络延迟时间（毫秒） */
  private delayTime: number;

  /**
   * 创建 Mock API 客户端
   *
   * @param _useMock - 是否使用 Mock（保留参数，保持 API 兼容性）
   * @param delayTime - 模拟延迟毫秒数（默认 300）
   */
  constructor(_useMock = true, delayTime = 300) {
    // useMock parameter kept for API compatibility
    this.delayTime = delayTime;
  }

  /**
   * 模拟请求延迟
   *
   * @param data - 要返回的数据
   * @returns 延迟后返回的数据
   */
  private async simulateRequest<T>(data: T): Promise<T> {
    await delay(this.delayTime);
    return data;
  }

  // ==================== 认证相关接口 ====================

  /**
   * 模拟用户注册
   *
   * @param data - 注册请求参数
   * @returns 包含用户信息和认证令牌的响应
   */
  async register(data: RegisterRequest) {
    return this.simulateRequest(mockResponse({
      user: {
        id: 'mock-user-id',
        username: data.username,
        email: data.email,
        displayName: data.displayName || data.username,
        avatarUrl: data.avatarUrl || '',
        role: 'user' as const,
        emailVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      tokens: {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600,
      },
    }));
  }

  /**
   * 模拟用户登录
   * 支持普通用户和管理员两种角色（admin@gamehub.com / admin123 为管理员）
   *
   * @param data - 登录请求参数（邮箱和密码）
   * @returns 包含用户信息和认证令牌的响应
   */
  async login(data: LoginRequest) {
    // 模拟管理员账号
    const adminEmail = 'admin@gamehub.com';
    const adminPassword = 'admin123';
    const isAdmin = data.email === adminEmail && data.password === adminPassword;

    return this.simulateRequest(mockResponse({
      user: {
        id: isAdmin ? '1' : 'mock-user-id',
        username: isAdmin ? 'admin_user' : 'testuser',
        email: data.email,
        displayName: isAdmin ? 'Admin User' : '测试用户',
        avatarUrl: 'https://example.com/avatar.jpg',
        role: isAdmin ? 'admin' as const : 'user' as const,
        emailVerified: true,
        isActive: true,
        level: isAdmin ? 10 : 1,
        totalLoginTime: isAdmin ? 5000 : 100,
        commentFrozen: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: new Date().toISOString(),
      },
      tokens: {
        accessToken: isAdmin ? 'mock-admin-token' : 'mock-access-token',
        refreshToken: isAdmin ? 'mock-admin-refresh-token' : 'mock-refresh-token',
        expiresIn: 3600,
      },
    }));
  }

  /**
   * 模拟用户登出
   *
   * @returns 空成功响应
   */
  async logout() {
    return this.simulateRequest(mockResponse(null));
  }

  /**
   * 模拟获取当前登录用户信息
   *
   * @returns 当前用户的对象
   */
  async getCurrentUser() {
    return this.simulateRequest(mockResponse({
      user: {
        id: 'mock-user-id',
        username: 'testuser',
        email: 'test@example.com',
        displayName: '测试用户',
        avatarUrl: 'https://example.com/avatar.jpg',
        role: 'user' as const,
        emailVerified: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: new Date().toISOString(),
      },
    }));
  }

  // ==================== 游戏相关接口 ====================

  /**
   * 模拟获取游戏列表（支持搜索、筛选和分页）
   *
   * @param params - 分页和筛选参数（page, limit, search, genre, platform）
   * @returns 游戏列表和分页信息
   */
  async getGames(params?: PaginationParams) {
    const { page = 1, limit = 20, search, genre, platform } = params || {};

    // 筛选逻辑
    let filteredGames = [...mockGames];

    if (search) {
      const searchLower = search.toLowerCase();
      filteredGames = filteredGames.filter(game =>
        game.title.toLowerCase().includes(searchLower) ||
        game.description.toLowerCase().includes(searchLower)
      );
    }

    if (genre) {
      filteredGames = filteredGames.filter(game =>
        game.genres.includes(genre as string)
      );
    }

    if (platform) {
      filteredGames = filteredGames.filter(game =>
        game.platforms.includes(platform as string)
      );
    }

    const { items, pagination } = paginate(filteredGames, page, limit);

    return this.simulateRequest(mockResponse({
      games: items,
      pagination,
    }));
  }

  /**
   * 模拟获取单个游戏详情
   *
   * @param id - 游戏 ID
   * @returns 游戏详情对象
   * @throws 当游戏不存在时抛出错误
   */
  async getGame(id: string) {
    const game = mockGames.find(g => g.id === parseInt(id, 10));
    if (!game) {
      throw new Error('游戏不存在');
    }
    return this.simulateRequest(mockResponse({ game }));
  }

  // ==================== 新闻相关接口 ====================

  /**
   * 模拟获取新闻列表（支持搜索、筛选和分页）
   *
   * @param params - 分页和筛选参数（page, limit, search, category）
   * @returns 新闻列表和分页信息
   */
  async getNews(params?: PaginationParams) {
    const { page = 1, limit = 20, search, category } = params || {};

    let filteredNews = [...mockNews];

    if (search) {
      const searchLower = search.toLowerCase();
      filteredNews = filteredNews.filter(news =>
        news.title.toLowerCase().includes(searchLower) ||
        news.summary.toLowerCase().includes(searchLower)
      );
    }

    if (category) {
      filteredNews = filteredNews.filter(news => news.category === category);
    }

    const { items, pagination } = paginate(filteredNews, page, limit);

    return this.simulateRequest(mockResponse({
      news: items,
      pagination,
    }));
  }

  /**
   * 模拟获取单篇新闻文章
   *
   * @param id - 新闻 ID
   * @returns 新闻文章详情
   * @throws 当文章不存在时抛出错误
   */
  async getNewsArticle(id: string) {
    const article = mockNews.find(n => n.id === parseInt(id, 10));
    if (!article) {
      throw new Error('新闻不存在');
    }
    return this.simulateRequest(mockResponse({ article }));
  }

  // ==================== 评测相关接口 ====================

  /**
   * 模拟获取评测列表（支持搜索、按游戏筛选和分页）
   *
   * @param params - 分页和筛选参数（page, limit, search, gameId）
   * @returns 评测列表和分页信息
   */
  async getReviews(params?: PaginationParams) {
    const { page = 1, limit = 20, search, gameId } = params || {};

    let filteredReviews = [...mockReviews];

    if (search) {
      const searchLower = search.toLowerCase();
      filteredReviews = filteredReviews.filter(review =>
        review.title.toLowerCase().includes(searchLower) ||
        review.content.toLowerCase().includes(searchLower)
      );
    }

    if (gameId) {
      filteredReviews = filteredReviews.filter(review => review.gameId === parseInt(gameId as string, 10));
    }

    const { items, pagination } = paginate(filteredReviews, page, limit);

    return this.simulateRequest(mockResponse({
      reviews: items,
      pagination,
    }));
  }

  /**
   * 模拟获取单个评测详情
   *
   * @param id - 评测 ID
   * @returns 评测详情
   * @throws 当评测不存在时抛出错误
   */
  async getReview(id: string) {
    const review = mockReviews.find(r => r.id === parseInt(id, 10));
    if (!review) {
      throw new Error('评测不存在');
    }
    return this.simulateRequest(mockResponse({ review }));
  }

  // ==================== 社区相关接口 ====================

  /**
   * 模拟获取社区帖子列表（支持搜索、筛选和分页）
   *
   * @param params - 分页和筛选参数（page, limit, search, category）
   * @returns 社区帖子列表和分页信息
   */
  async getCommunityPosts(params?: PaginationParams) {
    const { page = 1, limit = 20, search, category } = params || {};

    let filteredPosts = [...mockCommunityPosts];

    if (search) {
      const searchLower = search.toLowerCase();
      filteredPosts = filteredPosts.filter(post =>
        post.title.toLowerCase().includes(searchLower) ||
        post.content.toLowerCase().includes(searchLower)
      );
    }

    if (category) {
      filteredPosts = filteredPosts.filter(post => post.category === category);
    }

    const { items, pagination } = paginate(filteredPosts, page, limit);

    return this.simulateRequest(mockResponse({
      posts: items,
      pagination,
    }));
  }

  // ==================== 管理后台相关接口 ====================

  /**
   * 模拟获取用户列表（支持搜索和分页）
   *
   * @param params - 分页和搜索参数（page, limit, search）
   * @returns 用户列表和分页信息
   */
  async getUsers(params?: PaginationParams) {
    const { page = 1, limit = 20, search } = params || {};

    let filteredUsers = [...mockUsers];

    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = filteredUsers.filter(user =>
        user.username.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchLower)
      );
    }

    const { items, pagination } = paginate(filteredUsers, page, limit);

    return this.simulateRequest(mockResponse({
      users: items,
      pagination,
    }));
  }

  /**
   * 模拟获取管理后台统计信息
   *
   * @returns 后台总览统计数据
   */
  async getAdminStats() {
    return this.simulateRequest(mockResponse(mockAdminStats));
  }

  /**
   * 模拟健康检查接口
   *
   * @returns 服务器健康状态信息（含运行时间、环境等）
   */
  async healthCheck() {
    return this.simulateRequest(mockResponse({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime ? process.uptime() : 12345.67,
      environment: 'development',
    }));
  }
}

/** Mock API 客户端单例实例 */
export const mockApiClient = new MockApiClient();

/** 导出默认单例 */
export default mockApiClient;