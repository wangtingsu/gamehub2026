/**
 * Comment Service 单元测试
 *
 * 测试范围：CommentService 的各公开方法
 * - createComment       创建评论（验证 SQL 参数和返回值）
 * - getCommentsByParent 按父级获取评论列表
 * - getCommentById      获取单条评论（存在 / 不存在）
 * - updateComment       更新评论内容
 * - deleteComment       软删除评论（验证 UPDATE deleted_at）
 *
 * 所有数据库操作通过 jest.mock 隔离，不依赖真实数据库。
 */

import { execute, query } from '../../../src/db';

// ================================================================
// Mock 依赖
// ================================================================
jest.mock('../../../src/db', () => ({
  query: jest.fn(),
  execute: jest.fn(),
  transaction: jest.fn((cb: any) => cb()),
}));

jest.mock('../../../src/utils/logger');

// 类型化 mock 函数
const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedExecute = execute as jest.MockedFunction<typeof execute>;

/* ================================================================
 *  Comment Service 单元测试
 * ================================================================ */
describe('Comment Service 单元测试', () => {
  const mockUserId = '1';
  const mockCommentData = {
    content: '测试评论内容',
    parentType: 'review' as const,
    parentId: 'review-1',
  };
  const mockDbComment = {
    id: 'comment-1',
    content: '测试评论内容',
    author_id: mockUserId,
    parent_type: 'review',
    parent_id: 'review-1',
    likes: 0,
    is_edited: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    version: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* --------------------------------------------------------------
   *  createComment
   * -------------------------------------------------------------- */
  describe('createComment', () => {

    it('应该成功创建评论，并返回包含正确内容的评论对象', async () => {
      mockedExecute.mockResolvedValue({ changes: 1 } as any);
      mockedQuery.mockResolvedValue([mockDbComment] as any);

      const { createComment } = await import('../../../src/services/comment.service');
      const result = await createComment(mockUserId, mockCommentData);

      // 验证 INSERT 语句的 SQL 和参数
      expect(mockedExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO comments'),
        expect.arrayContaining([mockUserId, mockCommentData.content, mockCommentData.parentType, mockCommentData.parentId])
      );
      expect(result).toBeDefined();
      expect(result.content).toBe(mockCommentData.content);
    });
  });

  /* --------------------------------------------------------------
   *  getCommentsByParent
   * -------------------------------------------------------------- */
  describe('getCommentsByParent', () => {

    it('应该返回父级关联的评论列表', async () => {
      mockedQuery.mockResolvedValue([mockDbComment] as any);

      const { getCommentsByParent } = await import('../../../src/services/comment.service');
      const result = await getCommentsByParent('review', 'review-1', { page: 1, limit: 20 });

      expect(result.comments).toBeInstanceOf(Array);
    });
  });

  /* --------------------------------------------------------------
   *  getCommentById
   * -------------------------------------------------------------- */
  describe('getCommentById', () => {

    it('应该返回评论详情', async () => {
      mockedQuery.mockResolvedValue([mockDbComment] as any);

      const { getCommentById } = await import('../../../src/services/comment.service');
      const result = await getCommentById('comment-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('comment-1');
    });

    it('评论不存在时应抛出包含"不存在"的错误', async () => {
      mockedQuery.mockResolvedValue([] as any);

      const { getCommentById } = await import('../../../src/services/comment.service');
      await expect(getCommentById('nonexistent')).rejects.toThrow('不存在');
    });
  });

  /* --------------------------------------------------------------
   *  updateComment
   * -------------------------------------------------------------- */
  describe('updateComment', () => {

    it('应该成功更新评论内容', async () => {
      mockedQuery.mockResolvedValue([mockDbComment] as any);
      mockedExecute.mockResolvedValue({ changes: 1 } as any);

      const { updateComment } = await import('../../../src/services/comment.service');
      const result = await updateComment('comment-1', '更新后的内容');

      expect(result).toBeDefined();
    });
  });

  /* --------------------------------------------------------------
   *  deleteComment（软删除）
   * -------------------------------------------------------------- */
  describe('deleteComment', () => {

    it('应该成功软删除评论（设置 deleted_at 时间戳）', async () => {
      mockedQuery.mockResolvedValue([mockDbComment] as any);
      mockedExecute.mockResolvedValue({ changes: 1 } as any);

      const { deleteComment } = await import('../../../src/services/comment.service');
      const result = await deleteComment('comment-1');

      // 验证执行了软删除 SQL
      expect(mockedExecute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE comments SET deleted_at'),
        expect.arrayContaining([expect.any(String), 'comment-1'])
      );
    });
  });
});
