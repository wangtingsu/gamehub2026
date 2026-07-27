/**
 * GameHub 游戏模块 E2E 测试
 *
 * 测试范围：
 * - GET    /api/v1/games         获取游戏列表（分页 / 搜索 / 类型和平台过滤）
 * - GET    /api/v1/games/:id     获取游戏详情（存在 / 不存在返回 404）
 * - POST   /api/v1/games         管理员创建游戏
 * - PUT    /api/v1/games/:id     管理员更新游戏
 * - DELETE /api/v1/games/:id     管理员删除游戏
 *
 * 覆盖了游戏资源的 CRUD 操作和公共查询接口。
 */

import request from 'supertest';
import { app } from '../../src/index';

/* ================================================================
 *  游戏端点
 * ================================================================ */
describe('游戏端点', () => {
  let adminToken: string;

  /** 在所有测试前，用管理员账户登录获取令牌 */
  beforeAll(async () => {
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@gamehub.com',
        password: 'Admin123!',
      });

    adminToken = loginResponse.body.data.tokens.accessToken;
  });

  /* --------------------------------------------------------------
   *  获取游戏列表
   * -------------------------------------------------------------- */
  describe('获取游戏列表', () => {

    it('GET /api/v1/games 应该返回分页的游戏列表', async () => {
      const response = await request(app)
        .get('/api/v1/games')
        .query({ page: 1, limit: 5 })
        .expect('Content-Type', /json/)
        .expect(200);

      // 验证分页结构和游戏对象字段
      expect(response.body).toEqual({
        success: true,
        data: {
          games: expect.any(Array),
          pagination: {
            page: expect.any(Number),
            limit: expect.any(Number),
            total: expect.any(Number),
            pages: expect.any(Number),
            hasNext: expect.any(Boolean),
            hasPrev: expect.any(Boolean),
          },
        },
        message: '游戏列表获取成功',
      });

      // 如果列表非空，验证单个游戏对象的结构完整性
      if (response.body.data.games.length > 0) {
        const game = response.body.data.games[0];
        expect(game).toEqual({
          id: expect.any(String),
          title: expect.any(String),
          slug: expect.any(String),
          description: expect.any(String),
          releaseDate: expect.any(String),
          developer: expect.any(String),
          publisher: expect.any(String),
          genres: expect.any(Array),
          platforms: expect.any(Array),
          rating: expect.any(Number),
          price: expect.any(Number),
          discount: expect.any(Number),
          coverImageUrl: expect.any(String),
          screenshots: expect.any(Array),
          steamAppId: expect.any(Number),
          rawgId: expect.any(Number),
          isFeatured: expect.any(Boolean),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });
      }
    });

    it('GET /api/v1/games 应该支持搜索关键词过滤', async () => {
      const response = await request(app)
        .get('/api/v1/games')
        .query({ search: '赛博', page: 1, limit: 5 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.games).toBeInstanceOf(Array);
    });

    it('GET /api/v1/games 应该支持按类型和平台联合过滤', async () => {
      const response = await request(app)
        .get('/api/v1/games')
        .query({ genre: '角色扮演', platform: 'PC', page: 1, limit: 5 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  /* --------------------------------------------------------------
   *  获取游戏详情
   * -------------------------------------------------------------- */
  describe('获取游戏详情', () => {
    let gameId: string;

    /** 先获取一个可用的游戏 ID */
    beforeAll(async () => {
      const listResponse = await request(app)
        .get('/api/v1/games')
        .query({ limit: 1 });

      if (listResponse.body.data.games.length > 0) {
        gameId = listResponse.body.data.games[0].id;
      }
    });

    it('GET /api/v1/games/:id 应该返回游戏详情对象', async () => {
      if (!gameId) {
        console.warn('没有找到游戏数据，跳过详情测试');
        return;
      }

      const response = await request(app)
        .get(`/api/v1/games/${gameId}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.any(Object),
        message: '游戏详情获取成功',
      });
    });

    it('GET /api/v1/games/:id 当游戏不存在时应该返回 404', async () => {
      const response = await request(app)
        .get('/api/v1/games/nonexistent-id')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('不存在');
    });
  });

  /* --------------------------------------------------------------
   *  管理员游戏管理（创建 / 更新 / 删除）
   * -------------------------------------------------------------- */
  describe('管理员游戏管理', () => {
    let testGameId: string;

    it('POST /api/v1/games 应该允许管理员创建新游戏', async () => {
      const newGame = {
        title: '测试游戏',
        description: '这是一个测试游戏',
        genres: ['测试', '模拟'],
        platforms: ['PC'],
        price: 99.0,
      };

      const response = await request(app)
        .post('/api/v1/games')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newGame)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: expect.any(Object),
        message: '游戏创建成功',
      });

      testGameId = response.body.data.id;
    });

    it('PUT /api/v1/games/:id 应该允许管理员更新游戏信息', async () => {
      if (!testGameId) {
        console.warn('没有创建测试游戏，跳过更新测试');
        return;
      }

      const updateData = {
        title: '更新后的测试游戏',
        description: '更新描述',
        rating: 4.5,
      };

      const response = await request(app)
        .put(`/api/v1/games/${testGameId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.any(Object),
        message: '游戏更新成功',
      });
    });

    it('DELETE /api/v1/games/:id 应该允许管理员删除游戏', async () => {
      if (!testGameId) {
        console.warn('没有创建测试游戏，跳过删除测试');
        return;
      }

      const response = await request(app)
        .delete(`/api/v1/games/${testGameId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: '游戏删除成功',
      });
    });
  });
});