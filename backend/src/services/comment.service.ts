/**
 * 评论服务
 *
 * 提供评论的增删改查功能，支持：
 * - 按父级对象（评测/文章/社区帖子）获取评论列表
 * - 基于用户等级的权重排序
 * - 评论回复管理
 * - 关键词搜索
 * - 点赞操作
 * - 评论统计
 */

import config from '../config';
import logger from '../utils/logger';
import { query, execute, transaction } from '../db';
import {
  Comment,
  CommentCreateInput,
  PaginationParams,
  SearchParams
} from '../types';
import { NotFoundError, ConflictError } from '../middlewares/error.middleware';
import xpService from './xp.service';

/**
 * 将数据库行映射为 Comment 对象
 *
 * 处理字段类型转换，包括 ID 转为字符串、日期解析、
 * 软删除和乐观锁字段映射。
 *
 * @param dbComment 数据库查询结果行
 * @returns 格式化后的 Comment 对象
 */
const mapCommentFromDb = (dbComment: any): Comment => ({
  id: dbComment.id.toString(),
  content: dbComment.content,
  authorId: dbComment.author_id.toString(),
  parentType: dbComment.parent_type as 'review' | 'news' | 'community_post',
  parentId: dbComment.parent_id.toString(),
  likes: dbComment.likes,
  isEdited: Boolean(dbComment.is_edited),
  createdAt: new Date(dbComment.created_at),
  updatedAt: new Date(dbComment.updated_at),
  parentCommentId: dbComment.parent_comment_id ? dbComment.parent_comment_id.toString() : undefined,
  replyCount: dbComment.reply_count ? Number(dbComment.reply_count) : 0,
  // 软删除、乐观锁和审计字段
  deletedAt: dbComment.deleted_at ? new Date(dbComment.deleted_at) : undefined,
  version: dbComment.version ? Number(dbComment.version) : 1,
  createdBy: dbComment.created_by || undefined,
  updatedBy: dbComment.updated_by || undefined,
});

/**
 * 将驼峰命名(camelCase)转换为下划线命名(snake_case)
 *
 * @param str 驼峰命名字符串
 * @returns 下划线命名字符串
 */
const camelToSnakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

/**
 * 获取指定父级对象的评论列表（分页 + 权重排序）
 *
 * 按用户等级计算评论权重（1 + (等级 - 1) * 0.5），
 * 权重高和发布时间新的评论优先展示。
 * 仅返回顶级评论（parent_comment_id IS NULL），回复通过单独接口获取。
 *
 * @param parentType 父级类型：review（评测）、news（文章）、community_post（社区帖子）
 * @param parentId 父级对象 ID
 * @param pagination 分页参数（page, limit），可选
 * @returns 分页后的评论列表、总数和分页信息
 */
export const getCommentsByParent = async (
  parentType: string,
  parentId: string,
  pagination: PaginationParams = {}
): Promise<{ comments: Comment[]; total: number; page: number; limit: number }> => {
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;

  // 查询评论总数
  const countSql = `SELECT COUNT(*) as total FROM comments WHERE parent_type = ? AND parent_id = ?`;
  const countResult = await query(countSql, [parentType, parentId]);
  const total = parseInt(countResult[0]?.total || 0);

  // 权重排序：按用户等级计算权重（等级越高权重越大），同权重按创建时间倒序
  const dataSql = `
    SELECT c.*, u.username, u.display_name, u.avatar_url, u.level,
           (1 + (COALESCE(u.level, 1) - 1) * 0.5) as comment_weight,
           (SELECT COUNT(*) FROM comments AS sub WHERE sub.parent_comment_id = c.id) as reply_count
    FROM comments c
    LEFT JOIN users u ON c.author_id = u.id
    WHERE c.parent_type = ? AND c.parent_id = ? AND c.parent_comment_id IS NULL
    ORDER BY comment_weight DESC, c.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const result = await query(dataSql, [parentType, parentId, limit, offset]);

  const comments = result.map((row: any) => ({
    ...mapCommentFromDb(row),
    author: {
      id: row.author_id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      level: row.level,
    },
    weight: row.comment_weight,
  }));

  logger.debug(`获取评论列表成功，父级: ${parentType}/${parentId}，第${page}页，每页${limit}条，共${total}条`);

  return {
    comments,
    total,
    page,
    limit,
  };
};

/**
 * 获取指定评论的回复列表（分页）
 *
 * @param commentId 父评论 ID
 * @param pagination 分页参数（page, limit），可选
 * @returns 分页后的回复列表、总数和分页信息
 */
export const getCommentReplies = async (
  commentId: string,
  pagination: PaginationParams = {}
): Promise<{ replies: Comment[]; total: number; page: number; limit: number }> => {
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;

  // 查询回复总数
  const countSql = `SELECT COUNT(*) as total FROM comments WHERE parent_comment_id = ?`;
  const countResult = await query(countSql, [commentId]);
  const total = parseInt(countResult[0]?.total || 0);

  // 按创建时间升序排列（回复按时间线展示）
  const dataSql = `
    SELECT c.*, u.username, u.display_name, u.avatar_url,
           pu.username as parent_username, pu.display_name as parent_display_name
    FROM comments c
    LEFT JOIN users u ON c.author_id = u.id
    LEFT JOIN comments pc ON c.parent_comment_id = pc.id
    LEFT JOIN users pu ON pc.author_id = pu.id
    WHERE c.parent_comment_id = ?
    ORDER BY c.created_at ASC
    LIMIT ? OFFSET ?
  `;
  const result = await query(dataSql, [commentId, limit, offset]);

  const replies = result.map((row: any) => ({
    ...mapCommentFromDb(row),
    author: {
      id: row.author_id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
    },
    parentAuthorName: row.parent_display_name || row.parent_username || null,
  }));

  logger.debug(`获取评论回复成功，评论ID: ${commentId}，第${page}页，每页${limit}条，共${total}条`);

  return {
    replies,
    total,
    page,
    limit,
  };
};

/**
 * 搜索评论（分页 + 筛选）
 *
 * 支持按关键词搜索评论内容，并可附加父类型、父 ID、作者 ID 等筛选条件。
 *
 * @param searchParams 搜索参数，包含关键词、页码、每页条数和筛选条件
 * @returns 分页后的评论列表、总数和搜索关键词
 */
export const searchComments = async (
  searchParams: SearchParams
): Promise<{ comments: Comment[]; total: number; page: number; limit: number; query?: string }> => {
  const { query: searchQuery = '', page = 1, limit = 20, filters = {} } = searchParams;
  const offset = (page - 1) * limit;

  let whereClause = '';
  const queryParams: any[] = [];

  const conditions: string[] = [];

  // 全文搜索：匹配评论内容
  if (searchQuery) {
    conditions.push(`(c.content LIKE ?)`);
    queryParams.push(`%${searchQuery}%`);
  }

  // 按父类型筛选
  if (filters.parentType) {
    conditions.push(`c.parent_type = ?`);
    queryParams.push(filters.parentType);
  }

  // 按父 ID 筛选
  if (filters.parentId) {
    conditions.push(`c.parent_id = ?`);
    queryParams.push(filters.parentId);
  }

  // 按作者 ID 筛选
  if (filters.authorId) {
    conditions.push(`c.author_id = ?`);
    queryParams.push(filters.authorId);
  }

  if (conditions.length > 0) {
    whereClause = `WHERE ${conditions.join(' AND ')}`;
  }

  // 查询总数
  const countSql = `
    SELECT COUNT(*) as total
    FROM comments c
    ${whereClause}
  `;
  const countResult = await query(countSql, queryParams);
  const total = parseInt(countResult[0]?.total || 0);

  // 查询分页数据，按创建时间倒序排列
  const dataSql = `
    SELECT c.*, u.username, u.display_name, u.avatar_url
    FROM comments c
    LEFT JOIN users u ON c.author_id = u.id
    ${whereClause}
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const dataParams = [...queryParams, limit, offset];
  const result = await query(dataSql, dataParams);

  const comments = result.map((row: any) => ({
    ...mapCommentFromDb(row),
    author: {
      id: row.author_id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
    },
  }));

  logger.debug(`搜索评论成功，关键词: "${searchQuery}"，找到${total}条结果`);

  return {
    comments,
    total,
    page,
    limit,
    query: searchQuery,
  };
};

/**
 * 获取评论详情
 *
 * @param id 评论 ID
 * @returns 包含作者信息的评论详情
 * @throws {NotFoundError} 评论不存在时抛出
 */
export const getCommentById = async (id: string): Promise<any> => {
  const result = await query(
    `SELECT c.*, u.username, u.display_name, u.avatar_url
     FROM comments c
     LEFT JOIN users u ON c.author_id = u.id
     WHERE c.id = ?`,
    [id]
  );

  if (result.length === 0) {
    throw new NotFoundError(`评论ID ${id} 不存在`);
  }

  const row = result[0];
  const comment = mapCommentFromDb(row);

  // 增强的返回对象，包含作者信息
  const enhancedComment = {
    ...comment,
    author: {
      id: row.author_id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
    },
  };

  logger.debug(`获取评论详情成功: ID ${id}`);

  return enhancedComment;
};

/**
 * 创建评论
 *
 * 在事务中操作：验证父级对象和父评论（若为回复）是否存在，
 * 创建评论记录后发放 XP 奖励。
 *
 * @param authorId 作者 ID
 * @param commentData 评论创建数据
 * @returns 创建完成的评论对象
 * @throws {NotFoundError} 父级对象或父评论不存在时抛出
 */
export const createComment = async (authorId: string, commentData: CommentCreateInput): Promise<Comment> => {
  return await transaction(async () => {
    // 根据父类型选择对应的验证查询语句
    let parentExistsSql = '';

    switch (commentData.parentType) {
      case 'review':
        parentExistsSql = 'SELECT id FROM reviews WHERE id = ?';
        break;
      case 'news':
        parentExistsSql = 'SELECT id FROM news WHERE id = ?';
        break;
      case 'community_post':
        parentExistsSql = 'SELECT id FROM community_posts WHERE id = ?';
        break;
    }

    // 验证父级对象是否存在
    const parentExists = await query(parentExistsSql, [commentData.parentId]);

    if (parentExists.length === 0) {
      throw new NotFoundError(`父级${commentData.parentType} ID ${commentData.parentId} 不存在`);
    }

    // 若是对已有评论的回复，验证父评论是否存在
    if (commentData.parentCommentId) {
      const parentCommentExists = await query(
        'SELECT id FROM comments WHERE id = ?',
        [commentData.parentCommentId]
      );

      if (parentCommentExists.length === 0) {
        throw new NotFoundError(`父评论ID ${commentData.parentCommentId} 不存在`);
      }

      // 递增父评论的回复计数
      await execute(
        'UPDATE comments SET reply_count = COALESCE(reply_count, 0) + 1 WHERE id = ?',
        [commentData.parentCommentId]
      );
    }

    // 插入评论记录
    const result = await execute(
      `INSERT INTO comments (
        content, author_id, parent_type, parent_id, parent_comment_id,
        likes, is_edited, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        commentData.content,
        authorId,
        commentData.parentType,
        commentData.parentId,
        commentData.parentCommentId || null,
        0, // 初始点赞数为 0
        0, // 初始未编辑状态
        new Date().toISOString(),
        new Date().toISOString(),
      ]
    );

    // 查询刚插入的评论记录
    const inserted = await query(
      'SELECT * FROM comments WHERE id = ?',
      [result.lastInsertRowid]
    );

    const comment = mapCommentFromDb(inserted[0]);
    logger.info(`评论创建成功: ID ${comment.id}`);

    // 异步发放创建评论的 XP 奖励
    xpService.addXp(authorId, 'create_comment', 'comment', comment.id).catch(err => logger.error('XP 发放失败:', err));

    return comment;
  });
};

/**
 * 更新评论内容
 *
 * 更新后标记 is_edited 为 true，记录编辑时间。
 *
 * @param id 评论 ID
 * @param content 更新后的评论内容
 * @returns 更新完成的评论对象
 * @throws {NotFoundError} 评论不存在时抛出
 */
export const updateComment = async (
  id: string,
  content: string
): Promise<Comment> => {
  const now = new Date().toISOString();
  const updateResult = await execute(
    `UPDATE comments
     SET content = ?, is_edited = true, updated_at = ?
     WHERE id = ?`,
    [content, now, id]
  );

  // changes === 0 表示没有匹配的记录
  if (updateResult.changes === 0) {
    throw new NotFoundError(`评论ID ${id} 不存在`);
  }

  const comment = await getCommentById(id);
  logger.info(`评论更新成功: ID ${id}`);

  return comment;
};

/**
 * 软删除评论
 *
 * 设置 deleted_at 字段而非物理删除，保留历史数据。
 *
 * @param id 评论 ID
 * @throws {NotFoundError} 评论不存在时抛出
 */
export const deleteComment = async (id: string): Promise<void> => {
  const now = new Date().toISOString();
  const result = await execute(
    'UPDATE comments SET deleted_at = ? WHERE id = ?',
    [now, id]
  );

  if (result.changes === 0) {
    throw new NotFoundError(`评论ID ${id} 不存在`);
  }

  logger.info(`评论删除成功: ID ${id}`);
};

/**
 * 点赞评论
 *
 * 将评论的点赞数加 1 并返回当前点赞数。
 *
 * @param id 评论 ID
 * @returns 当前点赞数
 * @throws {NotFoundError} 评论不存在时抛出
 */
export const likeComment = async (id: string, userId: string): Promise<{ likes: number; liked: boolean }> => {
  const existing = await query(
    'SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?',
    [id, userId]
  );

  if (existing.length > 0) {
    await execute('DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?', [id, userId]);
    await execute('UPDATE comments SET likes = MAX(0, likes - 1) WHERE id = ?', [id]);
  } else {
    await execute('INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)', [id, userId]);
    await execute('UPDATE comments SET likes = likes + 1 WHERE id = ?', [id]);
  }

  const result = await query('SELECT likes FROM comments WHERE id = ?', [id]);
  if (result.length === 0) throw new NotFoundError(`评论ID ${id} 不存在`);

  return { likes: result[0].likes, liked: existing.length === 0 };
};

/**
 * 获取评论统计信息
 *
 * 支持三种粒度的统计：
 * - 指定父类型 + 父 ID：获取特定对象的评论数
 * - 仅指定父类型：获取该类对象的总评论数
 * - 不指定参数：获取全平台评论总数及按类型的分布
 *
 * @param parentType 父级类型（可选）
 * @param parentId 父级对象 ID（可选）
 * @returns 评论总数和按类型的分布统计
 */
export const getCommentStats = async (parentType?: string, parentId?: string): Promise<{
  total: number;
  byParentType: Record<string, number>;
}> => {
  try {
    if (parentType && parentId) {
      // 获取特定父级对象的评论数
      const result = await query(
        `SELECT COUNT(*) as count FROM comments WHERE parent_type = ? AND parent_id = ?`,
        [parentType, parentId]
      );
      return {
        total: Number(result[0]?.count || 0),
        byParentType: { [parentType]: Number(result[0]?.count || 0) },
      };
    } else if (parentType) {
      // 获取特定类型的评论总数
      const result = await query(
        `SELECT COUNT(*) as count FROM comments WHERE parent_type = ?`,
        [parentType]
      );
      return {
        total: Number(result[0]?.count || 0),
        byParentType: { [parentType]: Number(result[0]?.count || 0) },
      };
    } else {
      // 获取全平台评论统计
      const totalResult = await query(`SELECT COUNT(*) as count FROM comments`);
      const total = Number(totalResult[0]?.count || 0);

      // 按父级类型分组统计
      const typeResult = await query(`
        SELECT parent_type, COUNT(*) as count
        FROM comments
        GROUP BY parent_type
      `);
      const byParentType: Record<string, number> = {};
      typeResult.forEach((row: any) => {
        byParentType[row.parent_type] = Number(row.count);
      });

      return {
        total,
        byParentType,
      };
    }
  } catch (error) {
    logger.error('获取评论统计信息失败:', error);
    throw error;
  }
};

export default {
  getCommentsByParent,
  getCommentReplies,
  searchComments,
  getCommentById,
  createComment,
  updateComment,
  deleteComment,
  likeComment,
  getCommentStats,
};
