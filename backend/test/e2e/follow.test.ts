/**
 * GameHub 关注模块 E2E 测试
 *
 * 测试范围：
 * - POST   /api/v1/follow/:userId        关注用户（未认证拒绝）
 * - GET    /api/v1/follow/:userId/followers  获取粉丝列表
 * - GET    /api/v1/follow/:userId/following  获取关注列表
 *
 * 前置条件：注册两个测试用户（一个作为关注者，一个作为被关注者）。
 */

import request from 'supertest';
import { app } from '../../src/index';
import { getAuthHeaders } from '../helpers/testHelpers';

/* ================================================================
 *  关注端点
 * ================================================================ */
describe('关注端点', () => {
  let userToken: string;
  let targetUserToken: string;
  let targetUserId: string;

  /**
   * 全局前置准备：
   * 注册两个测试用户，分别作为关注者和被关注者
   */
  beforeAll(async () => {
    // 注册关注者
    const register1 = await request(app)
      .post('/api/v1/auth/register')
      .send({ username: `folluser1_${Date.now()}`, email: `foll1_${Date.now()}@test.com`, password: 'Test123!', displayName: '关注测试用户1' });
    if (register1.body.success) {
      userToken = register1.body.data.tokens.accessToken;
    }

    // 注册被关注者
    const register2 = await request(app)
      .post('/api/v1/auth/register')
      .send({ username: `folluser2_${Date.now()}`, email: `foll2_${Date.now()}@test.com`, password: 'Test123!', displayName: '关注测试用户2' });
    if (register2.body.success) {
      targetUserToken = register2.body.data.tokens.accessToken;
      targetUserId = register2.body.data.user.id;
    }
  }, 15000);

  /* --------------------------------------------------------------
   *  关注用户
   * -------------------------------------------------------------- */
  describe('关注用户', () => {

    it('POST /api/v1/follow/:userId 未认证用户应返回 401', async () => {
      if (!targetUserId) return;
      await request(app)
        .post(`/api/v1/follow/${targetUserId}`)
        .expect(401);
    });
  });

  /* --------------------------------------------------------------
   *  粉丝和关注列表
   * -------------------------------------------------------------- */
  describe('粉丝和关注列表', () => {

    it('GET /api/v1/follow/:userId/followers 应该返回粉丝列表', async () => {
      if (!targetUserId) return;
      const response = await request(app)
        .get(`/api/v1/follow/${targetUserId}/followers`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('GET /api/v1/follow/:userId/following 应该返回关注列表', async () => {
      if (!targetUserId) return;
      const response = await request(app)
        .get(`/api/v1/follow/${targetUserId}/following`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
