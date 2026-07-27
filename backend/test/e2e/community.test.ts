/**
 * GameHub 社区模块 E2E 测试
 *
 * 测试范围（完整覆盖帖子 CRUD + 管理操作）：
 * - GET    /api/v1/community/posts            获取帖子列表（分页 / 分类筛选 / 置顶筛选）
 * - GET    /api/v1/community/posts/search     搜索帖子（正常 / 空结果）
 * - POST   /api/v1/community/posts            创建帖子（成功 / 未认证拒绝 / 字段验证）
 * - GET    /api/v1/community/posts/:id        获取帖子详情（存在 / 不存在返回 404）
 * - PUT    /api/v1/community/posts/:id        更新帖子（作者可 / 管理员可 / 非作者拒绝 / 锁定帖拒绝）
 * - DELETE /api/v1/community/posts/:id        删除帖子（作者可 / 管理员可 / 非作者拒绝）
 * - POST   /api/v1/community/posts/:id/like  点赞帖子（成功 / 未认证拒绝）
 * - POST   /api/v1/community/posts/:id/pin   置顶帖子（管理员和版主可 / 普通用户拒绝）
 * - POST   /api/v1/community/posts/:id/lock  锁定/解锁帖子（管理员可 / 普通用户拒绝）
 * - GET    /api/v1/community/posts/:id/comments  获取帖子评论列表
 *
 * 社区模块是系统中功能最复杂的模块之一，涉及多角色权限控制。
 */

import request from 'supertest';
import { app } from '../../src/index';
import {
  getAdminToken,
  getUserToken,
  getAuthHeaders,
  createTestCommunityPost,
  createTestGame,
} from '../helpers/testHelpers';

/* ================================================================
 *  社区端点
 * ================================================================ */
describe('社区端点', () => {
  let adminToken: string;
  let userToken: string;
  let moderatorToken: string;
  let testPostId: string;

  /**
   * 全局前置准备：
   * 1. 获取管理员、普通用户、版主的令牌
   * 2. 创建测试游戏（部分社区帖子可能关联游戏）
   */
  beforeAll(async () => {
    adminToken = await getAdminToken();
    userToken = await getUserToken('user1');
    moderatorToken = await getUserToken('moderator');

    try {
      await createTestGame(adminToken);
    } catch (error) {
      console.warn('测试游戏创建失败，可能已存在或不需要:', error instanceof Error ? error.message : String(error));
    }
  });

  /* --------------------------------------------------------------
   *  社区帖子列表
   * -------------------------------------------------------------- */
  describe('社区帖子列表', () => {

    it('GET /api/v1/community/posts 应该返回分页的帖子列表', async () => {
      const response = await request(app)
        .get('/api/v1/community/posts')
        .query({ page: 1, limit: 5 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          posts: expect.any(Array),
          pagination: {
            page: expect.any(Number),
            limit: expect.any(Number),
            total: expect.any(Number),
            totalPages: expect.any(Number),
            hasNext: expect.any(Boolean),
            hasPrev: expect.any(Boolean),
          },
        },
        message: '社区帖子列表获取成功',
      });

      // 验证帖子对象的字段结构
      if (response.body.data.posts.length > 0) {
        const post = response.body.data.posts[0];
        expect(post).toEqual({
          id: expect.any(String),
          title: expect.any(String),
          content: expect.any(String),
          category: expect.any(String),
          author: {
            id: expect.any(String),
            username: expect.any(String),
            displayName: expect.any(String),
            avatarUrl: expect.any(String),
          },
          likes: expect.any(Number),
          commentsCount: expect.any(Number),
          isPinned: expect.any(Boolean),
          isLocked: expect.any(Boolean),
          tags: expect.any(Array),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });
      }
    });

    it('GET /api/v1/community/posts 应该支持按分类筛选', async () => {
      const response = await request(app)
        .get('/api/v1/community/posts')
        .query({ page: 1, limit: 5, category: '讨论' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.posts).toBeInstanceOf(Array);
    });

    it('GET /api/v1/community/posts 应该支持仅显示置顶帖子', async () => {
      const response = await request(app)
        .get('/api/v1/community/posts')
        .query({ page: 1, limit: 5, pinned: 'true' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.posts).toBeInstanceOf(Array);
    });
  });

  /* --------------------------------------------------------------
   *  社区帖子搜索
   * -------------------------------------------------------------- */
  describe('社区帖子搜索', () => {

    it('GET /api/v1/community/posts/search 应该返回搜索到的帖子', async () => {
      const response = await request(app)
        .get('/api/v1/community/posts/search')
        .query({ query: '测试', page: 1, limit: 5 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          posts: expect.any(Array),
          query: '测试',
          category: undefined,
          pagination: {
            page: expect.any(Number),
            limit: expect.any(Number),
            total: expect.any(Number),
            totalPages: expect.any(Number),
            hasNext: expect.any(Boolean),
            hasPrev: expect.any(Boolean),
          },
        },
        message: '社区帖子搜索成功',
      });
    });

    it('GET /api/v1/community/posts/search 应该处理空搜索结果', async () => {
      const response = await request(app)
        .get('/api/v1/community/posts/search')
        .query({ query: '不可能的关键词12345', page: 1, limit: 5 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.posts).toEqual([]);
      expect(response.body.data.total).toBe(0);
    });
  });

  /* --------------------------------------------------------------
   *  社区帖子创建
   * -------------------------------------------------------------- */
  describe('社区帖子创建', () => {

    it('POST /api/v1/community/posts 应该允许认证用户创建帖子', async () => {
      const postData = {
        title: '测试社区帖子',
        content: '这是一段测试内容，用于验证社区帖子创建功能。',
        category: '讨论',
        tags: ['测试', '社区'],
      };

      const response = await request(app)
        .post('/api/v1/community/posts')
        .set(getAuthHeaders(userToken))
        .send(postData)
        .expect('Content-Type', /json/)
        .expect(201);

      // 验证新创建的帖子对象
      expect(response.body).toEqual({
        success: true,
        data: {
          post: {
            id: expect.any(String),
            title: postData.title,
            content: postData.content,
            category: postData.category,
            author: {
              id: expect.any(String),
              username: expect.any(String),
              displayName: expect.any(String),
              avatarUrl: expect.any(String),
            },
            likes: 0,
            commentsCount: 0,
            isPinned: false,
            isLocked: false,
            tags: postData.tags,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          },
        },
        message: '社区帖子创建成功',
      });

      testPostId = response.body.data.post.id;
    });

    it('POST /api/v1/community/posts 应该拒绝未认证用户（401）', async () => {
      const postData = {
        title: '测试未认证帖子',
        content: '未认证用户尝试创建帖子',
        category: '讨论',
      };

      await request(app)
        .post('/api/v1/community/posts')
        .send(postData)
        .expect('Content-Type', /json/)
        .expect(401);
    });

    it('POST /api/v1/community/posts 应该验证必填字段', async () => {
      const invalidData = {
        // 缺少 title 和 content
        category: '讨论',
      };

      const response = await request(app)
        .post('/api/v1/community/posts')
        .set(getAuthHeaders(userToken))
        .send(invalidData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('必填字段');
    });
  });

  /* --------------------------------------------------------------
   *  社区帖子详情
   * -------------------------------------------------------------- */
  describe('社区帖子详情', () => {

    it('GET /api/v1/community/posts/:id 应该返回帖子完整详情', async () => {
      if (!testPostId) {
        const post = await createTestCommunityPost(userToken);
        testPostId = post.id;
      }

      const response = await request(app)
        .get(`/api/v1/community/posts/${testPostId}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          id: testPostId,
          title: expect.any(String),
          content: expect.any(String),
          category: expect.any(String),
          author: {
            id: expect.any(String),
            username: expect.any(String),
            displayName: expect.any(String),
            avatarUrl: expect.any(String),
          },
          likes: expect.any(Number),
          commentsCount: expect.any(Number),
          isPinned: expect.any(Boolean),
          isLocked: expect.any(Boolean),
          tags: expect.any(Array),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        message: '社区帖子详情获取成功',
      });
    });

    it('GET /api/v1/community/posts/:id 帖子不存在时应该返回 404', async () => {
      await request(app)
        .get('/api/v1/community/posts/nonexistent-id')
        .expect('Content-Type', /json/)
        .expect(404);
    });
  });

  /* --------------------------------------------------------------
   *  社区帖子更新
   * -------------------------------------------------------------- */
  describe('社区帖子更新', () => {

    it('PUT /api/v1/community/posts/:id 应该允许作者更新自己的帖子', async () => {
      const post = await createTestCommunityPost(userToken);
      const postId = post.id;

      const updateData = {
        title: '更新后的标题',
        content: '更新后的内容',
        category: '问答',
        tags: ['更新', '测试'],
      };

      const response = await request(app)
        .put(`/api/v1/community/posts/${postId}`)
        .set(getAuthHeaders(userToken))
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          id: postId,
          title: updateData.title,
          content: updateData.content,
          category: updateData.category,
          author: {
            id: expect.any(String),
            username: expect.any(String),
            displayName: expect.any(String),
            avatarUrl: expect.any(String),
          },
          likes: expect.any(Number),
          commentsCount: expect.any(Number),
          isPinned: expect.any(Boolean),
          isLocked: expect.any(Boolean),
          tags: updateData.tags,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        message: '社区帖子更新成功',
      });
    });

    it('PUT /api/v1/community/posts/:id 应该允许管理员更新任何帖子', async () => {
      const post = await createTestCommunityPost(userToken);
      const postId = post.id;

      const updateData = {
        title: '管理员更新的标题',
        content: '管理员更新的内容',
      };

      const response = await request(app)
        .put(`/api/v1/community/posts/${postId}`)
        .set(getAuthHeaders(adminToken))
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
    });

    it('PUT /api/v1/community/posts/:id 应该拒绝非作者用户更新帖子（403）', async () => {
      const post = await createTestCommunityPost(userToken);
      const postId = post.id;

      const otherUserToken = await getUserToken('user2');
      const updateData = {
        title: '未授权更新',
        content: '未授权用户尝试更新',
      };

      const response = await request(app)
        .put(`/api/v1/community/posts/${postId}`)
        .set(getAuthHeaders(otherUserToken))
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('权限');
    });

    it('PUT /api/v1/community/posts/:id 应该拒绝更新已锁定的帖子（403）', async () => {
      const post = await createTestCommunityPost(userToken);
      const postId = post.id;

      // 管理员先锁定帖子
      await request(app)
        .post(`/api/v1/community/posts/${postId}/lock`)
        .set(getAuthHeaders(adminToken))
        .send({ isLocked: true })
        .expect(200);

      // 作者尝试更新已锁定的帖子
      const updateData = {
        title: '尝试更新已锁定帖子',
        content: '应该被拒绝',
      };

      const response = await request(app)
        .put(`/api/v1/community/posts/${postId}`)
        .set(getAuthHeaders(userToken))
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('锁定');
    });
  });

  /* --------------------------------------------------------------
   *  社区帖子删除
   * -------------------------------------------------------------- */
  describe('社区帖子删除', () => {

    it('DELETE /api/v1/community/posts/:id 应该允许作者删除自己的帖子', async () => {
      const post = await createTestCommunityPost(userToken);
      const postId = post.id;

      const response = await request(app)
        .delete(`/api/v1/community/posts/${postId}`)
        .set(getAuthHeaders(userToken))
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: '社区帖子删除成功',
      });

      // 验证帖子已删除
      await request(app)
        .get(`/api/v1/community/posts/${postId}`)
        .expect(404);
    });

    it('DELETE /api/v1/community/posts/:id 应该允许管理员删除任何帖子', async () => {
      const post = await createTestCommunityPost(userToken);
      const postId = post.id;

      const response = await request(app)
        .delete(`/api/v1/community/posts/${postId}`)
        .set(getAuthHeaders(adminToken))
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('DELETE /api/v1/community/posts/:id 应该拒绝非作者用户删除帖子（403）', async () => {
      const post = await createTestCommunityPost(userToken);
      const postId = post.id;

      const otherUserToken = await getUserToken('user2');

      const response = await request(app)
        .delete(`/api/v1/community/posts/${postId}`)
        .set(getAuthHeaders(otherUserToken))
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('权限');
    });
  });

  /* --------------------------------------------------------------
   *  社区帖子点赞
   * -------------------------------------------------------------- */
  describe('社区帖子点赞', () => {

    it('POST /api/v1/community/posts/:id/like 应该允许用户点赞帖子', async () => {
      const post = await createTestCommunityPost(userToken);
      const postId = post.id;

      const response = await request(app)
        .post(`/api/v1/community/posts/${postId}/like`)
        .set(getAuthHeaders(userToken))
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          postId,
          likes: expect.any(Number),
          liked: true,
        },
        message: '点赞成功',
      });

      expect(response.body.data.likes).toBeGreaterThanOrEqual(1);
    });

    it('POST /api/v1/community/posts/:id/like 应该拒绝未认证用户（401）', async () => {
      const post = await createTestCommunityPost(userToken);
      const postId = post.id;

      await request(app)
        .post(`/api/v1/community/posts/${postId}/like`)
        .expect('Content-Type', /json/)
        .expect(401);
    });
  });

  /* --------------------------------------------------------------
   *  社区帖子置顶
   * -------------------------------------------------------------- */
  describe('社区帖子置顶', () => {

    it('POST /api/v1/community/posts/:id/pin 应该允许管理员置顶帖子', async () => {
      const post = await createTestCommunityPost(userToken);
      const postId = post.id;

      const response = await request(app)
        .post(`/api/v1/community/posts/${postId}/pin`)
        .set(getAuthHeaders(adminToken))
        .send({ isPinned: true })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          id: postId,
          title: expect.any(String),
          content: expect.any(String),
          category: expect.any(String),
          author: {
            id: expect.any(String),
            username: expect.any(String),
            displayName: expect.any(String),
            avatarUrl: expect.any(String),
          },
          likes: expect.any(Number),
          commentsCount: expect.any(Number),
          isPinned: true,
          isLocked: expect.any(Boolean),
          tags: expect.any(Array),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        message: '帖子已置顶',
      });
    });

    it('POST /api/v1/community/posts/:id/pin 应该允许版主置顶帖子', async () => {
      const post = await createTestCommunityPost(userToken);
      const postId = post.id;

      const response = await request(app)
        .post(`/api/v1/community/posts/${postId}/pin`)
        .set(getAuthHeaders(moderatorToken))
        .send({ isPinned: true })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isPinned).toBe(true);
    });

    it('POST /api/v1/community/posts/:id/pin 应该拒绝普通用户置顶帖子（403）', async () => {
      const post = await createTestCommunityPost(userToken);
      const postId = post.id;

      const response = await request(app)
        .post(`/api/v1/community/posts/${postId}/pin`)
        .set(getAuthHeaders(userToken))
        .send({ isPinned: true })
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('权限');
    });
  });

  /* --------------------------------------------------------------
   *  社区帖子锁定
   * -------------------------------------------------------------- */
  describe('社区帖子锁定', () => {

    it('POST /api/v1/community/posts/:id/lock 应该允许管理员锁定帖子', async () => {
      const post = await createTestCommunityPost(userToken);
      const postId = post.id;

      const response = await request(app)
        .post(`/api/v1/community/posts/${postId}/lock`)
        .set(getAuthHeaders(adminToken))
        .send({ isLocked: true })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.data.isLocked).toBe(true);
      expect(response.body.message).toBe('帖子已锁定');
    });

    it('POST /api/v1/community/posts/:id/lock 应该允许管理员解锁帖子', async () => {
      const post = await createTestCommunityPost(userToken);
      const postId = post.id;

      // 先锁定
      await request(app)
        .post(`/api/v1/community/posts/${postId}/lock`)
        .set(getAuthHeaders(adminToken))
        .send({ isLocked: true })
        .expect(200);

      // 再解锁
      const response = await request(app)
        .post(`/api/v1/community/posts/${postId}/lock`)
        .set(getAuthHeaders(adminToken))
        .send({ isLocked: false })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.data.isLocked).toBe(false);
      expect(response.body.message).toBe('帖子已解锁');
    });

    it('POST /api/v1/community/posts/:id/lock 应该拒绝普通用户锁定帖子（403）', async () => {
      const post = await createTestCommunityPost(userToken);
      const postId = post.id;

      const response = await request(app)
        .post(`/api/v1/community/posts/${postId}/lock`)
        .set(getAuthHeaders(userToken))
        .send({ isLocked: true })
        .expect('Content-Type', /json/)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  /* --------------------------------------------------------------
   *  社区帖子评论列表
   * -------------------------------------------------------------- */
  describe('社区帖子评论', () => {
    let testPostIdForComments: string;

    beforeAll(async () => {
      const post = await createTestCommunityPost(userToken);
      testPostIdForComments = post.id;
    });

    it('GET /api/v1/community/posts/:id/comments 应该获取帖子的评论列表', async () => {
      const response = await request(app)
        .get(`/api/v1/community/posts/${testPostIdForComments}/comments`)
        .query({ page: 1, limit: 5 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          postId: testPostIdForComments,
          comments: expect.any(Array),
          pagination: {
            page: expect.any(Number),
            limit: expect.any(Number),
            total: expect.any(Number),
            totalPages: expect.any(Number),
            hasNext: expect.any(Boolean),
            hasPrev: expect.any(Boolean),
          },
        },
        message: '社区帖子评论获取成功',
      });
    });

    // 注意：评论的创建、更新、删除端点可能在通用评论路由中，也可能在社区路由中
    // 目前社区路由中未包含评论管理端点，相关测试留空
  });

  /* --------------------------------------------------------------
   *  评论管理（预留）
   * -------------------------------------------------------------- */
  describe('评论管理', () => {
    // 根据实际路由文件，评论的详细管理端点可能在社区路由中
    // 目前暂无具体实现，可根据后续路由补充
    it('GET /api/v1/community/comments/:id 应该获取评论详情（待实现）', async () => {
      console.log('评论详情测试 - 需要先创建评论');
    });
  });
});
