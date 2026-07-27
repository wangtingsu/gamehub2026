/**
 * GameHub 后端 E2E 测试辅助工具
 *
 * 本文件提供 E2E 测试中复用的工具函数和测试数据定义，包括：
 * - 预定义的测试用户（管理员、普通用户、版主）
 * - 预定义的测试数据模板（游戏、新闻、评测、社区帖子）
 * - 自动登录/注册的令牌获取函数（getAdminToken / getUserToken）
 * - 测试数据创建函数（createTestGame / createTestNews / createTestReview / createTestCommunityPost）
 * - 通用辅助函数（getAuthHeaders / cleanupTestData / wait）
 */

import request from 'supertest';
import { app } from '../../src/index';

/**
 * 预定义的测试用户列表
 *
 * 这些账户用于 E2E 测试中的不同角色场景：
 * - admin:     管理员，拥有系统管理权限
 * - user1:     普通用户，用于常规操作测试
 * - user2:     另一个普通用户，用于权限隔离测试（如非作者无法修改他人帖子）
 * - moderator: 版主，拥有部分管理权限
 */
export const testUsers = {
  admin: {
    email: 'admin@gamehub.com',
    password: 'Admin123!',
  },
  user1: {
    email: 'user1@example.com',
    password: 'User123!',
  },
  user2: {
    email: 'user2@example.com',
    password: 'User123!',
  },
  moderator: {
    email: 'moderator@gamehub.com',
    password: 'Moderator123!',
  },
};

/**
 * 预定义的测试数据模板
 *
 * 各模块测试时可直接使用或扩展这些模板数据：
 * - communityPost: 社区帖子创建参数
 * - news:          新闻文章创建参数（需要管理员权限）
 * - review:        游戏评测创建参数（需要关联 gameId）
 * - game:          游戏基本信息（供管理员创建游戏使用）
 */
export const testData = {
  communityPost: {
    title: '测试社区帖子标题',
    content: '测试社区帖子内容，这是一段较长的测试内容。',
    tags: ['测试', '社区'],
  },
  news: {
    title: '测试新闻标题',
    content: '测试新闻内容，这是一段较长的测试内容。',
    category: '公告',
    tags: ['测试', '新闻'],
  },
  review: {
    title: '测试评测标题',
    content: '测试评测内容，这是一段较长的测试内容。',
    rating: 4.5,
    gameId: 'test-game-id', // 占位符，调用方应在测试中替换为实际的 gameId
    tags: ['测试', '评测'],
  },
  game: {
    title: '测试游戏',
    description: '测试游戏描述',
    platform: 'PC',
    genre: '动作',
    releaseDate: '2024-01-01',
  },
};

/**
 * 尝试登录并返回访问令牌（accessToken）
 *
 * 内部函数，策略为先登录，若用户不存在则先注册再登录。
 * 这种"自动注册"策略使得 E2E 测试可以在无需预先填充种子数据的环境下独立运行。
 *
 * @param user        用户凭据（email + password）
 * @param displayName 可选的显示名称，注册时使用
 * @returns 访问令牌字符串，失败时返回空字符串
 */
const loginOrRegister = async (user: { email: string; password: string }, displayName?: string): Promise<string> => {
  // 第一步：尝试直接登录
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send(user);

  if (loginRes.status === 200 && loginRes.body?.data?.tokens?.accessToken) {
    return loginRes.body.data.tokens.accessToken;
  }

  // 第二步：登录失败（用户可能不存在），先注册
  const username = user.email.split('@')[0];
  const registerRes = await request(app)
    .post('/api/v1/auth/register')
    .send({
      username,
      email: user.email,
      password: user.password,
      displayName: displayName || username,
    });

  // 第三步：注册成功后再次登录
  if (registerRes.status === 201) {
    const loginAfterRegister = await request(app)
      .post('/api/v1/auth/login')
      .send(user);

    return loginAfterRegister.body?.data?.tokens?.accessToken || '';
  }

  // 第四步：注册失败（如用户已存在但有其他原因），再尝试一次登录
  const retryLogin = await request(app)
    .post('/api/v1/auth/login')
    .send(user);

  return retryLogin.body?.data?.tokens?.accessToken || '';
};

/**
 * 获取管理员令牌
 *
 * 自动执行登录或注册流程，确保返回有效的管理员访问令牌。
 * 适用于需要管理员权限的测试场景（如创建游戏、管理用户等）。
 */
export const getAdminToken = async (): Promise<string> => {
  return loginOrRegister(testUsers.admin, '管理员');
};

/**
 * 获取指定用户的令牌
 *
 * @param userKey 用户在 testUsers 对象中的键名，默认为 'user1'
 * @returns 用户的访问令牌
 */
export const getUserToken = async (userKey: keyof typeof testUsers = 'user1'): Promise<string> => {
  return loginOrRegister(testUsers[userKey]);
};

/**
 * 创建一个全新的测试用户并返回其信息和令牌
 *
 * 与 getUserToken 不同，此函数始终注册新用户，适用于需要独占用户身份的测试场景。
 *
 * @param userData 用户注册信息（用户名、邮箱、密码、显示名称）
 * @returns 包含用户对象和令牌的对象
 */
export const createTestUser = async (userData: {
  username: string;
  email: string;
  password: string;
  displayName: string;
}): Promise<{ user: any; tokens: { accessToken: string; refreshToken: string } }> => {
  const response = await request(app)
    .post('/api/v1/auth/register')
    .send(userData)
    .expect(201);

  return {
    user: response.body.data.user,
    tokens: response.body.data.tokens,
  };
};

/**
 * 获取 JWT 认证请求头
 *
 * 将访问令牌转换为 HTTP Authorization 头（Bearer 方案），
 * 用于在测试请求中传递身份认证信息。
 *
 * @param token JWT 访问令牌
 * @returns 包含 Authorization 字段的对象
 */
export const getAuthHeaders = (token: string): { Authorization: string } => ({
  Authorization: `Bearer ${token}`,
});

/**
 * 创建测试游戏（需要管理员权限）
 *
 * @param adminToken 管理员访问令牌
 * @param gameData   游戏数据，默认使用 testData.game 模板
 * @returns 创建后的游戏对象
 */
export const createTestGame = async (adminToken: string, gameData: any = testData.game) => {
  const response = await request(app)
    .post('/api/v1/games')
    .set(getAuthHeaders(adminToken))
    .send(gameData)
    .expect(201);

  return response.body.data.game;
};

/**
 * 创建测试新闻（需要管理员/编辑权限）
 *
 * @param adminToken 管理员访问令牌
 * @param newsData   新闻数据，默认使用 testData.news 模板
 * @returns 创建后的新闻对象
 */
export const createTestNews = async (adminToken: string, newsData: any = testData.news) => {
  const response = await request(app)
    .post('/api/v1/news')
    .set(getAuthHeaders(adminToken))
    .send(newsData)
    .expect(201);

  return response.body.data.news;
};

/**
 * 创建测试评测（需要用户认证）
 *
 * @param userToken 用户访问令牌
 * @param reviewData 评测数据，默认使用 testData.review 模板
 * @param gameId    可选，评测关联的游戏 ID（会覆盖 reviewData 中的 gameId）
 * @returns 创建后的评测对象
 */
export const createTestReview = async (
  userToken: string,
  reviewData: any = testData.review,
  gameId?: string
) => {
  const data = { ...reviewData };
  if (gameId) {
    data.gameId = gameId;
  }

  const response = await request(app)
    .post('/api/v1/reviews')
    .set(getAuthHeaders(userToken))
    .send(data)
    .expect(201);

  return response.body.data.review;
};

/**
 * 创建测试社区帖子（需要用户认证）
 *
 * @param userToken 用户访问令牌
 * @param postData  帖子数据，默认使用 testData.communityPost 模板
 * @returns 创建后的社区帖子对象
 */
export const createTestCommunityPost = async (
  userToken: string,
  postData: any = testData.communityPost
) => {
  const response = await request(app)
    .post('/api/v1/community/posts')
    .set(getAuthHeaders(userToken))
    .send(postData)
    .expect(201);

  return response.body.data.post;
};

/**
 * 清理测试数据
 *
 * 钩子函数，供测试在 afterAll / afterEach 中调用以清理产生的脏数据。
 * 由于 E2E 测试通常使用隔离的数据库，当前为简化实现，具体清理逻辑需根据实际数据库表结构补充。
 */
export const cleanupTestData = async (): Promise<void> => {
  console.log('测试数据清理函数 - 需要根据实际数据库实现');
};

/**
 * 等待指定的毫秒数
 *
 * 用于测试中需要等待异步操作完成或模拟延时的场景。
 *
 * @param ms 等待的毫秒数
 * @returns 等待结束后 resolve 的 Promise
 */
export const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};