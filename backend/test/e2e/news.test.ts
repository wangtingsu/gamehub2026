/**
 * GameHub 新闻模块 E2E 测试
 *
 * 测试范围：
 * - GET    /api/v1/news               获取新闻列表（分页 / 分类筛选 / 搜索）
 * - GET    /api/v1/news/search        搜索新闻
 * - POST   /api/v1/news               创建新闻（管理员可 / 未认证拒绝 / 普通用户拒绝）
 * - GET    /api/v1/news/:id           获取新闻详情（存在 / 不存在返回 404）
 * - PUT    /api/v1/news/:id           更新新闻（管理员可 / 普通用户拒绝）
 * - DELETE /api/v1/news/:id           删除新闻（管理员可 / 普通用户拒绝）
 * - POST   /api/v1/news/:id/like      点赞新闻（已认证可 / 未认证拒绝）
 * - GET    /api/v1/news/:id/comments  获取新闻评论列表
 *
 * 覆盖新闻资源的完整 CRUD 操作以及权限控制。
 */

import request from 'supertest';
import { app } from '../../src/index';
import {
  getAdminToken,
  getUserToken,
  getAuthHeaders,
  createTestNews,
} from '../helpers/testHelpers';

/* ================================================================
 *  新闻端点
 * ================================================================ */
describe('新闻端点', () => {
  let adminToken: string;
  let userToken: string;
  let testNewsId: string;

  /** 在所有测试前获取管理员和普通用户的令牌 */
  beforeAll(async () => {
    adminToken = await getAdminToken();
    userToken = await getUserToken('user1');
  });

  /* --------------------------------------------------------------
   *  新闻列表（列出 / 筛选 / 搜索）
   * -------------------------------------------------------------- */
  describe('新闻列表', () => {

    it('GET /api/v1/news 应该返回分页的新闻列表', async () => {
      const response = await request(app)
        .get('/api/v1/news')
        .query({ page: 1, limit: 5 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          news: expect.any(Array),
          pagination: {
            page: expect.any(Number),
            limit: expect.any(Number),
            total: expect.any(Number),
            totalPages: expect.any(Number),
            hasNext: expect.any(Boolean),
            hasPrev: expect.any(Boolean),
          },
        },
        message: '新闻列表获取成功',
      });
    });

    it('GET /api/v1/news 应该支持按分类筛选', async () => {
      const response = await request(app)
        .get('/api/v1/news')
        .query({ page: 1, limit: 5, category: '公告' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('GET /api/v1/news 应该支持按关键词搜索', async () => {
      const response = await request(app)
        .get('/api/v1/news')
        .query({ page: 1, limit: 5, query: '测试' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  /* --------------------------------------------------------------
   *  新闻搜索
   * -------------------------------------------------------------- */
  describe('新闻搜索', () => {

    it('GET /api/v1/news/search 应该返回搜索结果', async () => {
      const response = await request(app)
        .get('/api/v1/news/search')
        .query({ query: '测试', page: 1, limit: 5 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.news).toBeInstanceOf(Array);
    });
  });

  /* --------------------------------------------------------------
   *  新闻创建
   * -------------------------------------------------------------- */
  describe('新闻创建', () => {

    it('POST /api/v1/news 应该允许管理员创建新闻', async () => {
      const newsData = {
        title: '测试新闻标题',
        content: '测试新闻内容，这是一段较长的测试内容。',
        category: '公告',
        tags: ['测试', '新闻'],
      };

      const response = await request(app)
        .post('/api/v1/news')
        .set(getAuthHeaders(adminToken))
        .send(newsData)
        .expect('Content-Type', /json/)
        .expect(201);

      // 验证新闻对象的所有字段
      expect(response.body).toEqual({
        success: true,
        data: {
          news: {
            id: expect.any(String),
            title: newsData.title,
            content: newsData.content,
            category: newsData.category,
            author: {
              id: expect.any(String),
              username: expect.any(String),
              displayName: expect.any(String),
              avatarUrl: expect.any(String),
            },
            likes: 0,
            commentsCount: 0,
            views: 0,
            tags: newsData.tags,
            isPublished: true,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          },
        },
        message: '新闻创建成功',
      });

      testNewsId = response.body.data.news.id;
    });

    it('POST /api/v1/news 应该拒绝未认证用户（401）', async () => {
      const newsData = {
        title: '未认证新闻',
        content: '未认证用户尝试创建新闻',
        category: '公告',
      };

      await request(app)
        .post('/api/v1/news')
        .send(newsData)
        .expect('Content-Type', /json/)
        .expect(401);
    });

    it('POST /api/v1/news 应该拒绝非管理员用户（403）', async () => {
      const newsData = {
        title: '普通用户新闻',
        content: '普通用户尝试创建新闻',
        category: '公告',
      };

      const response = await request(app)
        .post('/api/v1/news')
        .set(getAuthHeaders(userToken))
        .send(newsData)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('权限');
    });
  });

  /* --------------------------------------------------------------
   *  新闻详情
   * -------------------------------------------------------------- */
  describe('新闻详情', () => {

    it('GET /api/v1/news/:id 应该返回新闻的完整详情', async () => {
      if (!testNewsId) {
        const news = await createTestNews(adminToken);
        testNewsId = news.id;
      }

      const response = await request(app)
        .get(`/api/v1/news/${testNewsId}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testNewsId);
    });

    it('GET /api/v1/news/:id 新闻不存在时应该返回 404', async () => {
      await request(app)
        .get('/api/v1/news/nonexistent-id')
        .expect('Content-Type', /json/)
        .expect(404);
    });
  });

  /* --------------------------------------------------------------
   *  新闻更新
   * -------------------------------------------------------------- */
  describe('新闻更新', () => {

    it('PUT /api/v1/news/:id 应该允许管理员更新新闻', async () => {
      const news = await createTestNews(adminToken);
      const newsId = news.id;

      const updateData = {
        title: '更新后的新闻标题',
        content: '更新后的新闻内容',
        category: '更新',
      };

      const response = await request(app)
        .put(`/api/v1/news/${newsId}`)
        .set(getAuthHeaders(adminToken))
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
    });

    it('PUT /api/v1/news/:id 应该拒绝非管理员用户（403）', async () => {
      const news = await createTestNews(adminToken);
      const newsId = news.id;

      const updateData = {
        title: '未授权更新',
        content: '普通用户尝试更新新闻',
      };

      const response = await request(app)
        .put(`/api/v1/news/${newsId}`)
        .set(getAuthHeaders(userToken))
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  /* --------------------------------------------------------------
   *  新闻删除
   * -------------------------------------------------------------- */
  describe('新闻删除', () => {

    it('DELETE /api/v1/news/:id 应该允许管理员删除新闻', async () => {
      const news = await createTestNews(adminToken);
      const newsId = news.id;

      const response = await request(app)
        .delete(`/api/v1/news/${newsId}`)
        .set(getAuthHeaders(adminToken))
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('删除成功');
    });

    it('DELETE /api/v1/news/:id 应该拒绝非管理员用户（403）', async () => {
      const news = await createTestNews(adminToken);
      const newsId = news.id;

      const response = await request(app)
        .delete(`/api/v1/news/${newsId}`)
        .set(getAuthHeaders(userToken))
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  /* --------------------------------------------------------------
   *  新闻点赞
   * -------------------------------------------------------------- */
  describe('新闻点赞', () => {

    it('POST /api/v1/news/:id/like 应该允许已认证用户点赞新闻', async () => {
      const news = await createTestNews(adminToken);
      const newsId = news.id;

      const response = await request(app)
        .post(`/api/v1/news/${newsId}/like`)
        .set(getAuthHeaders(userToken))
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.likes).toBeGreaterThanOrEqual(1);
    });

    it('POST /api/v1/news/:id/like 应该拒绝未认证用户（401）', async () => {
      const news = await createTestNews(adminToken);
      const newsId = news.id;

      await request(app)
        .post(`/api/v1/news/${newsId}/like`)
        .expect('Content-Type', /json/)
        .expect(401);
    });
  });

  /* --------------------------------------------------------------
   *  新闻评论列表
   * -------------------------------------------------------------- */
  describe('新闻评论', () => {

    it('GET /api/v1/news/:id/comments 应该获取新闻的评论列表', async () => {
      const news = await createTestNews(adminToken);
      const newsId = news.id;

      const response = await request(app)
        .get(`/api/v1/news/${newsId}/comments`)
        .query({ page: 1, limit: 5 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.comments).toBeInstanceOf(Array);
    });
  });
});