/**
 * GameHub 点赞模块 E2E 测试
 *
 * 测试范围：
 * - POST /api/v1/like 添加点赞（缺少参数返回 400 / 未认证返回 401）
 *
 * 前置条件：注册临时用户并创建游戏和评测作为点赞目标。
 */

import request from 'supertest';
import { app } from '../../src/index';
import { getAuthHeaders } from '../helpers/testHelpers';

/* ================================================================
 *  点赞端点
 * ================================================================ */
describe('点赞端点', () => {
  let userToken: string;
  let reviewId: string;

  /**
   * 全局前置准备：
   * 1. 注册测试用户
   * 2. 创建测试游戏
   * 3. 创建测试评测（供点赞使用）
   */
  beforeAll(async () => {
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ username: `likeuser_${Date.now()}`, email: `like_${Date.now()}@test.com`, password: 'Test123!', displayName: '点赞测试用户' });

    if (registerRes.body.success) {
      userToken = registerRes.body.data.tokens.accessToken;

      const gameRes = await request(app)
        .post('/api/v1/games')
        .set(getAuthHeaders(userToken))
        .send({ title: '点赞测试游戏', description: '测试用', genres: ['测试'], platforms: ['PC'], price: 0 });

      const gameId = gameRes.body.data?.id || gameRes.body.data?.game?.id;

      if (gameId) {
        const reviewRes = await request(app)
          .post('/api/v1/reviews')
          .set(getAuthHeaders(userToken))
          .send({ title: '点赞测试评测', content: '测试内容', rating: 5, gameId });
        reviewId = reviewRes.body.data?.id || reviewRes.body.data?.review?.id;
      }
    }
  }, 15000);

  /* --------------------------------------------------------------
   *  添加点赞
   * -------------------------------------------------------------- */
  describe('添加点赞', () => {

    it('POST /api/v1/like 缺少 targetType / targetId 参数应返回 400', async () => {
      await request(app)
        .post('/api/v1/like')
        .set(getAuthHeaders(userToken))
        .send({}) // 空请求体
        .expect(400);
    });

    it('POST /api/v1/like 未认证用户应返回 401', async () => {
      await request(app)
        .post('/api/v1/like')
        .send({ targetType: 'review', targetId: reviewId || '1' })
        .expect(401);
    });
  });
});
