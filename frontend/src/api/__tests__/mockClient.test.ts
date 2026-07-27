/**
 * mockClient.test.ts - 模拟 API 客户端单元测试
 *
 * 测试 MockApiClient 的所有接口方法，验证返回模拟数据的正确性
 * 使用 jest.useFakeTimers 控制异步延迟（模拟 300ms 网络延迟）
 */
import { mockApiClient } from '../mockClient';
import { mockGames, mockNews, mockReviews, mockCommunityPosts, mockUsers } from '../../data/mockData';

/** 测试套件：MockApiClient */
describe('MockApiClient', () => {
  // 每个测试前启用假定时器，控制异步操作的延迟
  beforeEach(() => {
    jest.useFakeTimers();
  });

  // 每个测试后恢复真实定时器
  afterEach(() => {
    jest.useRealTimers();
  });

  /** 测试游戏相关接口 */
  describe('games', () => {
    it('应该返回模拟游戏列表', async () => {
      const promise = mockApiClient.getGames();
      jest.advanceTimersByTime(300);  // 模拟 300ms 网络延迟
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.data!.games).toHaveLength(mockGames.length);
      expect(result.data!.games[0].title).toBe(mockGames[0].title);
    });

    it('应该支持搜索过滤游戏', async () => {
      const promise = mockApiClient.getGames({ search: '赛博朋克' });
      jest.advanceTimersByTime(300);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.data!.games).toHaveLength(1);
      expect(result.data!.games[0].title).toContain('赛博朋克');
    });

    it('应该返回分页游戏数据', async () => {
      const promise = mockApiClient.getGames({ page: 1, limit: 2 });
      jest.advanceTimersByTime(300);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.data!.games).toHaveLength(2);
      expect(result.data!.pagination).toEqual({
        page: 1,
        limit: 2,
        total: mockGames.length,
        pages: Math.ceil(mockGames.length / 2),
        hasNext: true,
        hasPrev: false,
      });
    });

    it('应该通过 ID 返回游戏详情', async () => {
      const promise = mockApiClient.getGame('1');
      jest.advanceTimersByTime(300);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.data!.game.id).toBe(1);
      expect(result.data!.game.title).toBe(mockGames[0].title);
    });
  });

  /** 测试新闻相关接口 */
  describe('news', () => {
    it('应该返回模拟新闻列表', async () => {
      const promise = mockApiClient.getNews();
      jest.advanceTimersByTime(300);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.data!.news).toHaveLength(mockNews.length);
    });
  });

  /** 测试评测相关接口 */
  describe('reviews', () => {
    it('应该返回模拟评测列表', async () => {
      const promise = mockApiClient.getReviews();
      jest.advanceTimersByTime(300);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.data!.reviews).toHaveLength(mockReviews.length);
    });
  });

  /** 测试社区帖子相关接口 */
  describe('community posts', () => {
    it('应该返回模拟社区帖子列表', async () => {
      const promise = mockApiClient.getCommunityPosts();
      jest.advanceTimersByTime(300);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.data!.posts).toHaveLength(mockCommunityPosts.length);
    });
  });

  /** 测试认证相关接口 */
  describe('authentication', () => {
    it('应该成功登录', async () => {
      const loginData = { email: 'test@example.com', password: 'password123' };
      const promise = mockApiClient.login(loginData);
      jest.advanceTimersByTime(300);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.data!.user).toBeDefined();
      expect(result.data!.tokens).toBeDefined();
      expect(result.data!.user.email).toBe(loginData.email);
    });

    it('应该成功注册', async () => {
      const registerData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
      };
      const promise = mockApiClient.register(registerData);
      jest.advanceTimersByTime(300);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.data!.user.username).toBe(registerData.username);
      expect(result.data!.user.email).toBe(registerData.email);
    });

    it('应该成功登出', async () => {
      const promise = mockApiClient.logout();
      jest.advanceTimersByTime(300);
      const result = await promise;

      expect(result.success).toBe(true);
    });

    it('应该获取当前用户', async () => {
      const promise = mockApiClient.getCurrentUser();
      jest.advanceTimersByTime(300);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.data!.user).toBeDefined();
    });
  });

  /** 测试管理后台相关接口 */
  describe('admin', () => {
    it('应该返回用户列表', async () => {
      const promise = mockApiClient.getUsers();
      jest.advanceTimersByTime(300);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.data!.users).toHaveLength(mockUsers.length);
    });

    it('应该返回管理员统计数据', async () => {
      const promise = mockApiClient.getAdminStats();
      jest.advanceTimersByTime(300);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.objectContaining({
        totalUsers: expect.any(Number),
        activeUsers: expect.any(Number),
        newUsersToday: expect.any(Number),
      }));
    });
  });

  /** 测试健康检查接口 */
  describe('health check', () => {
    it('应该返回健康状态', async () => {
      const promise = mockApiClient.healthCheck();
      jest.advanceTimersByTime(300);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.data!.status).toBe('healthy');
    });
  });
});