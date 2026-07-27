/**
 * GameHub 评论模块 E2E 测试
 *
 * 测试范围：
 * - POST   /api/v1/comments     创建评论（缺少内容 / 未认证拒绝）
 * - GET    /api/v1/comments     获取评论列表（分页）
 * - GET    /api/v1/comments/:id 获取评论详情（不存在返回 404）
 * - PUT    /api/v1/comments/:id 更新评论（不存在返回 404）
 * - DELETE /api/v1/comments/:id 删除评论（未认证拒绝）
 *
 * 前置条件：注册临时用户并创建一个游戏和评测，作为评论的父级资源。
 */

import request from 'supertest';
import { app } from '../../src/index';
import { getAuthHeaders } from '../helpers/testHelpers';

/* ================================================================
 *  评论端点
 * ================================================================ */
describe('评论端点', () => {
  let userToken: string;
  let reviewId: string;
  let commentId: string;

  /**
   * 全局前置准备：
   * 1. 注册一个测试用户
   * 2. 创建一个测试游戏
   * 3. 创建一个测试评测（作为评论的目标）
   */
  beforeAll(async () => {
    // 注册测试用户（使用时间戳避免冲突）
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ username: `comuser_${Date.now()}`, email: `com_${Date.now()}@test.com`, password: 'Test123!', displayName: '评论测试用户' });

    if (registerRes.body.success) {
      userToken = registerRes.body.data.tokens.accessToken;

      // 创建测试游戏
      const gameRes = await request(app)
        .post('/api/v1/games')
        .set(getAuthHeaders(userToken))
        .send({ title: '评论测试游戏', description: '测试用', genres: ['测试'], platforms: ['PC'], price: 0 });

      const gameId = gameRes.body.data?.id || gameRes.body.data?.game?.id;

      if (gameId) {
        // 创建测试评测
        const reviewRes = await request(app)
          .post('/api/v1/reviews')
          .set(getAuthHeaders(userToken))
          .send({ title: '测试评测标题', content: '测试评测内容', rating: 5, gameId });
        reviewId = reviewRes.body.data?.id || reviewRes.body.data?.review?.id;
      }
    }
  }, 15000); // 注册 + 创建游戏 + 创建评测，设置较长的超时时间

  /* --------------------------------------------------------------
   *  创建评论
   * -------------------------------------------------------------- */
  describe('创建评论', () => {

    it('POST /api/v1/comments 缺少内容字段时应该返回 400', async () => {
      if (!reviewId) return;
      await request(app)
        .post('/api/v1/comments')
        .set(getAuthHeaders(userToken))
        .send({ parentType: 'review', parentId: reviewId }) // 缺少 content
        .expect(400);
    });

    it('POST /api/v1/comments 未认证用户应该返回 401', async () => {
      await request(app)
        .post('/api/v1/comments')
        .send({ content: '测试', parentType: 'review', parentId: '1' })
        .expect(401);
    });
  });

  /* --------------------------------------------------------------
   *  获取评论
   * -------------------------------------------------------------- */
  describe('获取评论', () => {

    it('GET /api/v1/comments 应该返回分页的评论列表', async () => {
      const response = await request(app)
        .get('/api/v1/comments')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('GET /api/v1/comments/:id 不存在的评论应该返回 404', async () => {
      const response = await request(app)
        .get('/api/v1/comments/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  /* --------------------------------------------------------------
   *  更新和删除评论
   * -------------------------------------------------------------- */
  describe('更新和删除评论', () => {

    it('PUT /api/v1/comments/:id 不存在的评论应该返回 404', async () => {
      const response = await request(app)
        .put('/api/v1/comments/nonexistent')
        .set(getAuthHeaders(userToken))
        .send({ content: '更新内容' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('DELETE /api/v1/comments/:id 未认证用户应该返回 401', async () => {
      await request(app)
        .delete('/api/v1/comments/nonexistent')
        .expect(401);
    });
  });
});
