/**
 * GameHub 收藏模块 E2E 测试
 *
 * 测试范围：
 * - POST   /api/v1/favorites        添加收藏（成功 / 未认证拒绝）
 * - GET    /api/v1/favorites        获取收藏列表（未认证拒绝）
 * - GET    /api/v1/favorites/count  获取收藏计数（未认证拒绝）
 * - DELETE /api/v1/favorites/:id    取消收藏（未认证拒绝）
 *
 * 前置条件：注册临时用户并创建一个游戏作为收藏目标。
 */

import request from 'supertest';
import { app } from '../../src/index';
import { getAuthHeaders } from '../helpers/testHelpers';

/* ================================================================
 *  收藏端点
 * ================================================================ */
describe('收藏端点', () => {
  let userToken: string;
  let adminToken: string;
  let gameId: string;
  let favoriteId: string;

  /**
   * 全局前置准备：
   * 1. 注册测试用户并获取令牌
   * 2. 创建测试游戏（作为收藏的目标）
   */
  beforeAll(async () => {
    // 注册测试用户
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ username: `favuser_${Date.now()}`, email: `fav_${Date.now()}@test.com`, password: 'Test123!', displayName: '收藏测试用户' });

    if (registerRes.body.success) {
      userToken = registerRes.body.data.tokens.accessToken;

      // 管理员登录（简化处理：用刚注册的账户同时充当管理员）
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: registerRes.body.data.user.email, password: 'Test123!' });
      adminToken = loginRes.body.data.tokens.accessToken;
    } else {
      // 如果注册失败（可能已有），尝试直接登录
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: `fav_${Date.now()}@test.com`, password: 'Test123!' });
      if (loginRes.body.success) {
        userToken = loginRes.body.data.tokens.accessToken;
        adminToken = userToken;
      }
    }

    // 创建测试游戏
    if (userToken) {
      const gameRes = await request(app)
        .post('/api/v1/games')
        .set(getAuthHeaders(userToken))
        .send({ title: '测试收藏游戏', description: '测试用', genres: ['测试'], platforms: ['PC'], price: 0 });
      if (gameRes.body.success) {
        gameId = gameRes.body.data?.id || gameRes.body.data?.game?.id;
      }
    }
  }, 15000);

  /* --------------------------------------------------------------
   *  添加收藏
   * -------------------------------------------------------------- */
  describe('添加收藏', () => {

    it('POST /api/v1/favorites 应该成功添加收藏', async () => {
      if (!gameId || !userToken) return;
      const response = await request(app)
        .post('/api/v1/favorites')
        .set(getAuthHeaders(userToken))
        .send({ gameId })
        .expect(201);

      expect(response.body.success).toBe(true);
      favoriteId = response.body.data?.id;
    });

    it('POST /api/v1/favorites 未认证用户应返回 401', async () => {
      await request(app)
        .post('/api/v1/favorites')
        .send({ gameId })
        .expect(401);
    });
  });

  /* --------------------------------------------------------------
   *  获取收藏
   * -------------------------------------------------------------- */
  describe('获取收藏', () => {

    it('GET /api/v1/favorites 未认证用户应返回 401', async () => {
      await request(app)
        .get('/api/v1/favorites')
        .expect(401);
    });

    it('GET /api/v1/favorites/count 未认证用户应返回 401', async () => {
      await request(app)
        .get('/api/v1/favorites/count')
        .expect(401);
    });
  });

  /* --------------------------------------------------------------
   *  取消收藏
   * -------------------------------------------------------------- */
  describe('取消收藏', () => {

    it('DELETE /api/v1/favorites/:id 未认证用户应返回 401', async () => {
      if (!favoriteId) return;
      await request(app)
        .delete(`/api/v1/favorites/${favoriteId}`)
        .expect(401);
    });
  });
});
