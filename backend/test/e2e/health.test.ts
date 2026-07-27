/**
 * GameHub 健康检查 E2E 测试
 *
 * 测试范围：
 * - GET /health    返回服务健康状态（status / timestamp / uptime / environment）
 * - GET /          返回 API 基本信息（版本号、可用端点列表等）
 *
 * 这些是最基础的连通性测试，确保服务正常启动并能响应请求。
 */

import request from 'supertest';
import { app } from '../../src/index';

/* ================================================================
 *  健康检查端点
 * ================================================================ */
describe('健康检查端点', () => {

  /* --------------------------------------------------------------
   *  GET /health
   * -------------------------------------------------------------- */
  it('GET /health 应该返回健康状态', async () => {
    const response = await request(app)
      .get('/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toEqual({
      status: 'healthy',
      timestamp: expect.any(String),
      uptime: expect.any(Number),
      environment: expect.any(String),
    });
  });

  /* --------------------------------------------------------------
   *  GET /
   * -------------------------------------------------------------- */
  it('GET / 应该返回API信息', async () => {
    const response = await request(app)
      .get('/')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      message: 'GameHub API 服务运行中',
      version: '1.0.0',
      timestamp: expect.any(String),
      endpoints: expect.any(Object),
      documentation: null,
    });
  });
});