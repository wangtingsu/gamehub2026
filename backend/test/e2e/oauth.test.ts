/**
 * GameHub OAuth 第三方登录 E2E 测试
 *
 * 测试范围：
 * - GET  /api/v1/auth/oauth/providers         获取已启用的 OAuth 提供商列表
 * - GET  /api/v1/auth/oauth/url/:provider      获取指定提供商的授权 URL
 * - GET  /api/v1/auth/oauth/:provider          发起 OAuth 认证（重定向到第三方）
 * - GET  /api/v1/auth/oauth/:provider/callback OAuth 回调处理（错误场景）
 * - GET  /api/v1/auth/oauth/google/callback    Google OAuth 回调处理（错误场景）
 *
 * 注意：由于 OAuth 流程依赖第三方服务的真实授权，本测试仅覆盖
 * 可独立验证的路由层行为（参数校验、提供商检测、重定向状态码等）。
 * 完整的 OAuth 回调成功路径需要在集成测试环境中通过 mock 验证。
 */

import request from 'supertest';
import { app } from '../../src/index';

/* ================================================================
 *  OAuth 第三方登录端点
 * ================================================================ */
describe('OAuth 第三方登录端点', () => {

  /* --------------------------------------------------------------
   *  获取 OAuth 提供商列表
   * -------------------------------------------------------------- */
  describe('GET /api/v1/auth/oauth/providers', () => {

    it('应该返回已启用的 OAuth 提供商列表', async () => {
      const response = await request(app)
        .get('/api/v1/auth/oauth/providers')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('providers');
      expect(Array.isArray(response.body.data.providers)).toBe(true);

      // 验证每个 provider 对象的结构
      for (const p of response.body.data.providers) {
        expect(p).toMatchObject({
          provider: expect.any(String),
          name: expect.any(String),
          icon: expect.any(String),
        });
        // 确保不会返回敏感的 clientId/clientSecret
        expect(p).not.toHaveProperty('clientId');
        expect(p).not.toHaveProperty('clientSecret');
      }
    });

    it('启用了 GITHUB_CLIENT_ID 时应该包含 GitHub 提供商', async () => {
      // GitHub 配置在 .env 中已设置 GITHUB_CLIENT_ID，应该出现在列表中
      const response = await request(app)
        .get('/api/v1/auth/oauth/providers')
        .expect(200);

      const providers = response.body.data.providers;
      const githubProvider = providers.find(
        (p: any) => p.provider === 'github'
      );

      if (process.env.GITHUB_CLIENT_ID) {
        expect(githubProvider).toBeDefined();
        expect(githubProvider.name).toBe('GitHub');
        expect(githubProvider.icon).toBe('github');
      }
    });

    it('未设置凭据的提供商不应该出现在列表中', async () => {
      const response = await request(app)
        .get('/api/v1/auth/oauth/providers')
        .expect(200);

      const providers: Array<{ provider: string }> = response.body.data.providers;

      // Facebook 未配置凭据，不应出现
      const facebookProvider = providers.find(p => p.provider === 'facebook');
      expect(facebookProvider).toBeUndefined();
    });
  });

  /* --------------------------------------------------------------
   *  获取 OAuth 授权 URL
   * -------------------------------------------------------------- */
  describe('GET /api/v1/auth/oauth/url/:provider', () => {

    it('应该为已启用的提供商返回授权 URL', async () => {
      const response = await request(app)
        .get('/api/v1/auth/oauth/url/github')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('url');
      expect(response.body.data.url).toContain('/api/v1/auth/oauth/github');
    });

    it('应该为不支持的提供商返回 400 错误', async () => {
      const response = await request(app)
        .get('/api/v1/auth/oauth/url/unknown_provider')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('不支持的 OAuth 提供商');
    });

    it('应该为未启用的提供商返回 400 错误', async () => {
      // Facebook 未配置凭据，enabled 应为 false
      const response = await request(app)
        .get('/api/v1/auth/oauth/url/facebook')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  /* --------------------------------------------------------------
   *  发起 OAuth 认证（重定向到第三方）
   * -------------------------------------------------------------- */
  describe('GET /api/v1/auth/oauth/:provider', () => {

    it('应该为已启用的 GitHub 提供商返回 302 重定向', async () => {
      const response = await request(app)
        .get('/api/v1/auth/oauth/github')
        // 不跟随重定向，检查重定向响应
        .redirects(0);

      // Passport 应该返回 302 重定向到 GitHub
      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('github.com');
      expect(response.headers.location).toContain('login/oauth/authorize');
    });

    it('应该为已启用的 Google 提供商返回 302 重定向', async () => {
      if (!process.env.GOOGLE_CLIENT_ID) {
        return; // 跳过：Google 未配置
      }

      const response = await request(app)
        .get('/api/v1/auth/oauth/google')
        .redirects(0);

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('accounts.google.com');
    });

    it('应该为不支持的提供商返回 400 错误', async () => {
      const response = await request(app)
        .get('/api/v1/auth/oauth/invalid_provider')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('不支持的 OAuth 提供商');
    });

    it('应该为未启用的提供商返回 400 错误', async () => {
      const response = await request(app)
        .get('/api/v1/auth/oauth/facebook')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  /* --------------------------------------------------------------
   *  OAuth 回调处理 —— 错误场景
   * -------------------------------------------------------------- */
  describe('GET /api/v1/auth/oauth/:provider/callback —— 错误场景', () => {

    it('缺少 code 参数时 Passport 会将其视为新授权请求并重定向到 GitHub', async () => {
      const response = await request(app)
        .get('/api/v1/auth/oauth/github/callback')
        // 不跟随重定向，检查 Location 头部
        .redirects(0);

      // 无 code 参数时，passport-github2 会将其视为新的授权请求，
      // 重定向到 GitHub 的 OAuth 授权页面
      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('github.com');
      expect(response.headers.location).toContain('authorize');
    });

    it('缺乏有效 code 但携带 error 参数时应该重定向到前端', async () => {
      // 模拟 GitHub 返回的错误（如用户拒绝授权）
      const response = await request(app)
        .get('/api/v1/auth/oauth/github/callback?error=access_denied&error_description=User+denied')
        .redirects(0);

      // access_denied 时 Passport 会调用 done(err) 导致重定向到前端
      expect(response.status).toBe(302);
    });

    it('Google 回调被通用路由拒绝时应重定向到前端', async () => {
      const response = await request(app)
        .get('/api/v1/auth/oauth/google/callback')
        .redirects(0);

      // Google 有专用路由 /oauth/google/callback，
      // 但若以通用路由形式访问，会被拒绝
      // 通用回调路由中 provider=google 会重定向
      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('oauth_error=');
    });

    it('未启用的提供商回调应该重定向到前端并报错', async () => {
      const response = await request(app)
        .get('/api/v1/auth/oauth/facebook/callback')
        .redirects(0);

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('oauth_error=provider_disabled');
    });

    it('不存在的提供商回调应该重定向到前端并报错', async () => {
      const response = await request(app)
        .get('/api/v1/auth/oauth/nonexistent/callback')
        .redirects(0);

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('oauth_error=provider_disabled');
    });
  });

  /* --------------------------------------------------------------
   *  Google OAuth 回调 —— 错误场景
   * -------------------------------------------------------------- */
  describe('GET /api/v1/auth/oauth/google/callback —— 错误场景', () => {

    it('缺少 code 参数时应该重定向到前端登录页', async () => {
      const response = await request(app)
        .get('/api/v1/auth/oauth/google/callback')
        .redirects(0);

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('/login');
      expect(response.headers.location).toContain('oauth_error=no_code');
    });

    it('传入无效 code 时应该重定向到前端（token 交换失败）', async () => {
      const response = await request(app)
        .get('/api/v1/auth/oauth/google/callback?code=invalid_test_code')
        .redirects(0);

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('/login');
      // Google 会返回 token 交换失败
      expect(response.headers.location).toContain('oauth_error=');
    });
  });

  /* --------------------------------------------------------------
   *  OAuth 提供商列表信息完整性
   * -------------------------------------------------------------- */
  describe('OAuth 提供商配置完整性', () => {

    it('GitHub 提供商应包含正确的名称和图标', async () => {
      const response = await request(app)
        .get('/api/v1/auth/oauth/providers')
        .expect(200);

      const providers = response.body.data.providers;
      const github = providers.find((p: any) => p.provider === 'github');

      if (github) {
        expect(github.name).toBe('GitHub');
        expect(github.icon).toBe('github');
      }
    });

    it('Google 提供商应包含正确的名称和图标', async () => {
      const response = await request(app)
        .get('/api/v1/auth/oauth/providers')
        .expect(200);

      const providers = response.body.data.providers;
      const google = providers.find((p: any) => p.provider === 'google');

      if (google) {
        expect(google.name).toBe('Google');
        expect(google.icon).toBe('google');
      }
    });

    it('每个提供商不应返回超过必要信息的字段', async () => {
      const response = await request(app)
        .get('/api/v1/auth/oauth/providers')
        .expect(200);

      const allowedKeys = ['provider', 'name', 'icon'];
      for (const p of response.body.data.providers) {
        const keys = Object.keys(p);
        for (const key of keys) {
          expect(allowedKeys).toContain(key);
        }
      }
    });
  });
});
