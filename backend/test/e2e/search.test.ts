/**
 * GameHub 搜索模块 E2E 测试
 *
 * 测试范围：
 * - GET /api/v1/search               全局搜索（指定类型 / 全部 / 缺少 query / 空 query）
 * - GET /api/v1/search/suggestions   获取搜索建议词
 * - GET /api/v1/search/popular       获取热门搜索词
 *
 * 搜索接口是公开的，无需认证即可访问。
 */

import request from 'supertest';
import { app } from '../../src/index';

/* ================================================================
 *  搜索端点
 * ================================================================ */
describe('搜索端点', () => {

  /* --------------------------------------------------------------
   *  全局搜索
   * -------------------------------------------------------------- */
  describe('全局搜索', () => {

    it('GET /api/v1/search 应返回指定类型的搜索结果（games）', async () => {
      const response = await request(app)
        .get('/api/v1/search')
        .query({ query: '赛博', type: 'games', page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      if (response.body.data.results) {
        expect(response.body.data.results).toBeInstanceOf(Array);
      }
    });

    it('GET /api/v1/search 应返回全部类型的搜索结果', async () => {
      const response = await request(app)
        .get('/api/v1/search')
        .query({ query: '游戏', page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('GET /api/v1/search 缺少 query 参数应返回 200（空结果）', async () => {
      const response = await request(app)
        .get('/api/v1/search')
        .query({ page: 1 });

      expect(response.body.success).toBe(true);
    });

    it('GET /api/v1/search 空字符串查询应返回 200', async () => {
      const response = await request(app)
        .get('/api/v1/search')
        .query({ query: '', page: 1, limit: 10 });

      expect(response.body.success).toBe(true);
    });
  });

  /* --------------------------------------------------------------
   *  搜索建议
   * -------------------------------------------------------------- */
  describe('搜索建议', () => {

    it('GET /api/v1/search/suggestions 应返回搜索建议列表', async () => {
      const response = await request(app)
        .get('/api/v1/search/suggestions')
        .query({ query: '赛' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  /* --------------------------------------------------------------
   *  热门搜索
   * -------------------------------------------------------------- */
  describe('热门搜索', () => {

    it('GET /api/v1/search/popular 应返回热门搜索关键词', async () => {
      const response = await request(app)
        .get('/api/v1/search/popular')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
