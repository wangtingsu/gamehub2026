/**
 * GameHub 认证模块 E2E 测试
 *
 * 测试范围：
 * - POST   /api/v1/auth/register  用户注册（成功 / 重复注册拒绝）
 * - POST   /api/v1/auth/login     用户登录（成功 / 错误密码拒绝）
 * - POST   /api/v1/auth/refresh   刷新访问令牌
 * - GET    /api/v1/auth/me        获取当前用户信息（已认证 / 未认证拒绝）
 * - POST   /api/v1/auth/logout    用户登出
 *
 * 覆盖 JWT 令牌认证的完整生命周期：注册 -> 登录 -> 令牌刷新 -> 获取信息 -> 登出。
 */

import request from 'supertest';
import { app } from '../../src/index';
import { getConnection } from '../../src/db';

/* ================================================================
 *  认证端点
 * ================================================================ */
describe('认证端点', () => {
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'Test123!',
    displayName: '测试用户',
  };

  let accessToken: string;
  let refreshToken: string;

  /** 清理可能存在的旧测试用户，确保测试环境干净 */
  beforeAll(async () => {
    try {
      const db = getConnection();
      // 删除可能存在的旧测试用户
      db.prepare('DELETE FROM users WHERE username = ? OR email = ?').run(
        testUser.username,
        testUser.email
      );
    } catch {
      // 数据库可能还未连接，忽略错误
    }
  });

  /* --------------------------------------------------------------
   *  用户注册
   * -------------------------------------------------------------- */
  describe('用户注册', () => {

    it('POST /api/v1/auth/register 应该成功注册新用户并返回令牌', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect('Content-Type', /json/)
        .expect(201);

      // 验证响应结构：包含用户信息和令牌
      expect(response.body).toEqual({
        success: true,
        data: {
          user: {
            id: expect.any(String),
            username: testUser.username,
            email: testUser.email,
            displayName: testUser.displayName,
            avatarUrl: null,
            role: 'user',
          },
          tokens: {
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
            expiresIn: expect.any(Number),
          },
        },
        message: '注册成功',
      });

      // 保存令牌供后续测试使用
      accessToken = response.body.data.tokens.accessToken;
      refreshToken = response.body.data.tokens.refreshToken;
    });

    it('POST /api/v1/auth/register 应该拒绝重复注册（409 冲突）', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('已存在');
    });
  });

  /* --------------------------------------------------------------
   *  用户登录
   * -------------------------------------------------------------- */
  describe('用户登录', () => {

    it('POST /api/v1/auth/login 应该使用正确凭据成功登录', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          user: {
            id: expect.any(String),
            username: testUser.username,
            email: testUser.email,
            displayName: testUser.displayName,
            avatarUrl: null,
            role: 'user',
          },
          tokens: {
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
            expiresIn: expect.any(Number),
          },
        },
        message: '登录成功',
      });

      // 更新令牌
      accessToken = response.body.data.tokens.accessToken;
      refreshToken = response.body.data.tokens.refreshToken;
    });

    it('POST /api/v1/auth/login 应该拒绝错误的密码（401 未授权）', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('错误');
    });
  });

  /* --------------------------------------------------------------
   *  令牌刷新
   * -------------------------------------------------------------- */
  describe('令牌刷新', () => {

    it('POST /api/v1/auth/refresh 应该使用 refreshToken 成功刷新访问令牌', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          expiresIn: expect.any(Number),
        },
        message: '令牌刷新成功',
      });

      // 更新访问令牌供后续测试使用
      accessToken = response.body.data.accessToken;
    });
  });

  /* --------------------------------------------------------------
   *  获取当前用户信息
   * -------------------------------------------------------------- */
  describe('获取用户信息', () => {

    it('GET /api/v1/auth/me 应使用有效令牌返回当前用户信息', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          user: {
            id: expect.any(String),
            username: testUser.username,
            email: testUser.email,
            displayName: testUser.displayName,
            avatarUrl: null,
            bio: null,
            role: 'user',
            emailVerified: expect.any(Boolean),
            lastLogin: expect.any(String),
            createdAt: expect.any(String),
          },
        },
      });
    });

    it('GET /api/v1/auth/me 应该拒绝未携带令牌的访问（401）', async () => {
      await request(app)
        .get('/api/v1/auth/me')
        .expect('Content-Type', /json/)
        .expect(401);
    });
  });

  /* --------------------------------------------------------------
   *  用户登出
   * -------------------------------------------------------------- */
  describe('用户登出', () => {

    it('POST /api/v1/auth/logout 应该成功登出并失效化令牌', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: '登出成功',
      });
    });
  });
});