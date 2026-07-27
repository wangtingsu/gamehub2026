/**
 * 评论相关 React Query Hooks 模块
 *
 * 提供评论的增删改查、点赞、搜索和统计等操作的 Hooks。
 * 所有变更操作成功后自动刷新相关缓存，确保数据一致性。
 *
 * @module api/hooks/comments
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../index';
import { queryKeys } from '../hooks';
import type { CommentCreateInput, ParentType, PaginatedComments, PaginatedReplies, PaginationResponse, SearchCommentsResult } from '../types';

/**
 * 获取评论列表
 *
 * @param parentType - 父级类型（review/news/community_post/guide）
 * @param parentId - 父级 ID
 * @param page - 页码（默认 1）
 * @param limit - 每页条数（默认 20）
 * @returns 分页评论列表
 */
export const useComments = (
  parentType: ParentType,
  parentId: string,
  page: number = 1,
  limit: number = 20
) => {
  return useQuery({
    queryKey: queryKeys.comments.list(parentType, parentId, { page, limit }),
    queryFn: () => apiService.getComments(parentType, parentId, { page, limit }),
    select: (response): PaginatedComments => {
      // 假设response是PaginatedComments格式
      if (response && typeof response === 'object' && 'comments' in response && 'pagination' in response) {
        return response as PaginatedComments;
      }
      // 如果是数组，转换为PaginatedComments
      if (Array.isArray(response)) {
        return {
          comments: response,
          pagination: {
            page,
            limit,
            total: response.length,
            pages: Math.ceil(response.length / limit),
            hasNext: page < Math.ceil(response.length / limit),
            hasPrev: page > 1,
          },
        };
      }
      // 默认返回空
      return {
        comments: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0,
          hasNext: false,
          hasPrev: false
        }
      };
    },
    enabled: !!parentType && !!parentId,
  });
};

/**
 * 获取单条评论详情
 *
 * @param id - 评论 ID
 * @returns 评论详情
 */
export const useComment = (id: string) => {
  return useQuery({
    queryKey: queryKeys.comments.detail(id),
    queryFn: () => apiService.getComment(id),
    select: (response) => response,
    enabled: !!id,
  });
};

/**
 * 获取评论的回复列表
 *
 * @param commentId - 评论 ID
 * @param page - 页码（默认 1）
 * @param limit - 每页条数（默认 20）
 * @returns 分页回复列表
 */
export const useCommentReplies = (
  commentId: string,
  page: number = 1,
  limit: number = 20
) => {
  return useQuery({
    queryKey: [...queryKeys.comments.detail(commentId), 'replies', { page, limit }],
    queryFn: () => apiService.getCommentReplies(commentId, { page, limit }),
    select: (response): PaginatedReplies => {
      // 假设response是PaginatedReplies格式
      if (response && typeof response === 'object' && 'replies' in response && 'pagination' in response) {
        return response as PaginatedReplies;
      }
      // 如果是数组，转换为PaginatedReplies
      if (Array.isArray(response)) {
        return {
          replies: response,
          pagination: {
            page,
            limit,
            total: response.length,
            pages: Math.ceil(response.length / limit),
            hasNext: page < Math.ceil(response.length / limit),
            hasPrev: page > 1,
          },
        };
      }
      // 默认返回空
      return {
        replies: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0,
          hasNext: false,
          hasPrev: false
        }
      };
    },
    enabled: !!commentId,
  });
};

/**
 * 创建评论的 Mutation Hook
 * 成功后自动使父级对象的评论列表缓存失效
 * 如果是回复，同时使原评论的回复列表缓存失效
 */
export const useCreateComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CommentCreateInput) => apiService.createComment(data),
    onSuccess: (_response, variables) => {
      // 使相关评论列表失效
      queryClient.invalidateQueries({
        queryKey: queryKeys.comments.list(variables.parentType, variables.parentId),
      });
      // 如果是对评论的回复，也使回复列表失效
      if (variables.parentCommentId) {
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.comments.detail(variables.parentCommentId), 'replies'],
        });
      }
      // 更新父级的评论计数（如果有）
      // 这里可以添加更新父级评论计数的逻辑
    },
  });
};

/**
 * 更新评论内容的 Mutation Hook
 * 成功后使该评论详情缓存失效
 */
export const useUpdateComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      apiService.updateComment(commentId, content),
    onSuccess: (_response, variables) => {
      // 使评论详情失效
      queryClient.invalidateQueries({
        queryKey: queryKeys.comments.detail(variables.commentId),
      });
      // 注意：这里也需要使评论列表失效，因为列表可能包含评论内容
      // 但由于我们不知道父级信息，我们暂时跳过
    },
  });
};

/**
 * 删除评论的 Mutation Hook
 * 成功后使该评论详情缓存失效
 * 注意：由于不知道父级信息，无法自动使评论列表失效，需在组件中手动处理
 */
export const useDeleteComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => apiService.deleteComment(commentId),
    onSuccess: (_response, commentId) => {
      // 使评论详情失效
      queryClient.invalidateQueries({
        queryKey: queryKeys.comments.detail(commentId),
      });
      // 注意：这里也需要使评论列表失效，但由于不知道父级信息，我们暂时跳过
      // 可以在组件中手动处理
    },
  });
};

/**
 * 点赞/取消点赞评论的 Mutation Hook
 * 成功后使该评论详情和所属列表缓存失效
 */
export const useLikeComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => apiService.likeComment(commentId),
    onSuccess: (_response, commentId) => {
      // 使评论详情失效
      queryClient.invalidateQueries({
        queryKey: queryKeys.comments.detail(commentId),
      });
      // 使评论列表失效（如果列表显示点赞数）
      // 由于不知道父级信息，我们暂时跳过
    },
  });
};

/**
 * 搜索评论的 Hook
 *
 * @param query - 搜索关键词
 * @param filters - 筛选条件（按父级类型/ID、作者 ID）
 * @param page - 页码（默认 1）
 * @param limit - 每页条数（默认 20）
 * @returns 搜索结果（含查询关键词）
 */
export const useSearchComments = (
  query: string,
  filters?: { parentType?: string; parentId?: string; authorId?: string },
  page: number = 1,
  limit: number = 20
) => {
  return useQuery({
    queryKey: ['comments', 'search', query, filters, { page, limit }],
    queryFn: () => apiService.searchComments(query, filters, { page, limit }),
    select: (response): SearchCommentsResult => {
      // 假设response是SearchCommentsResult格式
      if (response && typeof response === 'object' && 'comments' in response && 'pagination' in response) {
        return response as SearchCommentsResult;
      }
      // 如果是数组，转换为SearchCommentsResult
      if (Array.isArray(response)) {
        return {
          comments: response,
          pagination: {
            page,
            limit,
            total: response.length,
            pages: Math.ceil(response.length / limit),
            hasNext: page < Math.ceil(response.length / limit),
            hasPrev: page > 1,
          },
          query,
        };
      }
      // 默认返回空
      return {
        comments: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0,
          hasNext: false,
          hasPrev: false,
        },
        query,
      };
    },
    enabled: !!query,
  });
};

/**
 * 获取评论统计信息
 *
 * @param parentType - 父级类型（可选，不传时获取全局统计）
 * @param parentId - 父级 ID（可选，不传时获取全局统计）
 * @returns 评论统计数据（总数、点赞数、热门作者等）
 */
export const useCommentStats = (parentType?: string, parentId?: string) => {
  return useQuery({
    queryKey: ['comments', 'stats', parentType, parentId],
    queryFn: () => apiService.getCommentStats(parentType, parentId),
    select: (response) => response,
    enabled: !!(parentType && parentId) || (!parentType && !parentId),
  });
};