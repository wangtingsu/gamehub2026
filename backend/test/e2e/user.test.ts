/**
 * GameHub 用户管理模块 E2E 测试（管理员视角）
 *
 * 测试范围：
 * - GET    /api/v1/users         获取用户列表（管理员可访问 / 普通用户被拒绝）
 * - GET    /api/v1/users/:id     获取用户详情（存在 / 不存在返回 404）
 * - PUT    /api/v1/users/:id     管理员更新用户信息（角色变更 / 验证逻辑）
 * - DELETE /api/v1/users/:id     管理员删除用户（删除后查询验证 404）
 *
 * 前置条件：使用管理员账户（admin@gamehub.com）执行认证。
 */

import request from 'supertest';
import { app } from '../../src/index';

/* ================================================================
 *  用户管理端点（管理员）
 * ================================================================ */
describe('用户管理端点（管理员）', () => {
  let adminToken: string;
  let testUserId: string;

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
   *  获取用户列表
   * -------------------------------------------------------------- */
  describe('获取用户列表', () => {

    it('GET /api/v1/users 应该返回用户列表（仅管理员可访问）', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 })
        .expect('Content-Type', /json/)
        .expect(200);

      // 验证分页结构
      expect(response.body).toEqual({
        success: true,
        data: {
          users: expect.any(Array),
          pagination: {
            page: expect.any(Number),
            limit: expect.any(Number),
            total: expect.any(Number),
            pages: expect.any(Number),
            hasNext: expect.any(Boolean),
            hasPrev: expect.any(Boolean),
          },
        },
        message: '用户列表获取成功',
      });

      // 记录第一个用户 ID 供后续测试使用
      if (response.body.data.users.length > 0) {
        testUserId = response.body.data.users[0].id;
      }
    });

    it('GET /api/v1/users 应该拒绝普通用户访问（403 禁止）', async () => {
      // 先注册一个普通用户
      const userResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'testuser2',
          email: 'testuser2@example.com',
          password: 'Test123!',
          displayName: '测试用户2',
        });

      const userToken = userResponse.body.data.tokens.accessToken;

      // 使用普通用户令牌请求用户列表
      await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(403);
    });
  });

  /* --------------------------------------------------------------
   *  获取用户详情
   * -------------------------------------------------------------- */
  describe('获取用户详情', () => {

    it('GET /api/v1/users/:id 应该返回用户的完整详情', async () => {
      if (!testUserId) {
        console.warn('没有找到测试用户，跳过详情测试');
        return;
      }

      const response = await request(app)
        .get(`/api/v1/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.any(Object),
        message: '用户详情获取成功',
      });

      // 验证用户对象包含所有必需字段
      expect(response.body.data).toEqual({
        id: expect.any(String),
        username: expect.any(String),
        email: expect.any(String),
        displayName: expect.any(String),
        avatarUrl: expect.anything(),
        bio: expect.anything(),
        role: expect.any(String),
        emailVerified: expect.any(Boolean),
        isActive: expect.any(Boolean),
        lastLogin: expect.anything(),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('GET /api/v1/users/:id 当用户不存在时应该返回 404', async () => {
      const response = await request(app)
        .get('/api/v1/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('不存在');
    });
  });

  /* --------------------------------------------------------------
   *  管理员更新用户
   * -------------------------------------------------------------- */
  describe('更新用户信息（管理员）', () => {

    it('PUT /api/v1/users/:id 应该更新用户的显示名称和角色', async () => {
      if (!testUserId) {
        console.warn('没有找到测试用户，跳过更新测试');
        return;
      }

      const updateData = {
        displayName: '更新后的显示名称',
        role: 'moderator',
        status: 'active',
      };

      const response = await request(app)
        .put(`/api/v1/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.any(Object),
        message: '用户信息更新成功',
      });

      // 验证更新内容已生效
      expect(response.body.data.displayName).toBe(updateData.displayName);
      expect(response.body.data.role).toBe(updateData.role);
    });

    it('PUT /api/v1/users/:id 应该验证角色字段的有效性', async () => {
      if (!testUserId) {
        console.warn('没有找到测试用户，跳过验证测试');
        return;
      }

      const invalidUpdateData = {
        role: 'invalid_role', // 无效的角色值
      };

      const response = await request(app)
        .put(`/api/v1/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidUpdateData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('角色');
    });
  });

  /* --------------------------------------------------------------
   *  管理员删除用户
   * -------------------------------------------------------------- */
  describe('删除用户（管理员）', () => {
    let userToDeleteId: string;

    /** 创建一个专用的测试用户供删除测试使用 */
    beforeAll(async () => {
      const userResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'tobedeleted',
          email: 'delete@example.com',
          password: 'Test123!',
          displayName: '待删除用户',
        });

      userToDeleteId = userResponse.body.data.user.id;
    });

    it('DELETE /api/v1/users/:id 应该删除用户', async () => {
      if (!userToDeleteId) {
        console.warn('没有创建待删除用户，跳过删除测试');
        return;
      }

      const response = await request(app)
        .delete(`/api/v1/users/${userToDeleteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: '用户删除成功',
      });

      // 验证用户已删除：再次查询应返回 404
      await request(app)
        .get(`/api/v1/users/${userToDeleteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/)
        .expect(404);
    });
  });
});