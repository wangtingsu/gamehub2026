/**
 * CommentList.tsx - 评论列表组件
 *
 * 整合评论表单和评论列表，提供完整的评论功能
 * 支持分页加载、加载态、错误态、空数据态等状态展示
 */
import React, { useState } from 'react';
import { useComments } from '../../api/hooks/comments';
import CommentItem from './CommentItem';
import CommentForm from './CommentForm';
import { Pagination, Spin, Alert, Empty } from 'antd';

/** CommentList 组件的 props */
interface CommentListProps {
  /** 所属父内容类型 */
  parentType: 'review' | 'news' | 'community_post' | 'guide' | 'blog';
  /** 所属父内容的 ID */
  parentId: string;
  /** 是否显示评论表单（顶部创建新评论） */
  showForm?: boolean;
  /** 是否允许回复 */
  allowReplies?: boolean;
  /** 每页显示的评论数量 */
  pageSize?: number;
}

/**
 * CommentList - 评论列表
 * - 从 API 获取评论数据，支持分页
 * - 顶部可显示评论提交表单
 * - 空数据时显示"暂无评论"
 * - 加载中显示 Spin 加载动画
 * - 加载失败时显示 Alert 错误提示
 * - 评论编辑、回复、删除后自动刷新列表
 */
const CommentList: React.FC<CommentListProps> = ({
  parentType,
  parentId,
  showForm = true,
  allowReplies = true,
  pageSize = 20,
}) => {
  const [page, setPage] = useState(1);
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useComments(parentType, parentId, page, pageSize);

  /** 分页切换 */
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  /** 评论添加/编辑/删除后刷新列表 */
  const handleCommentAdded = () => {
    refetch();
  };

  // 加载中状态
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spin size="large" />
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <Alert
        message="Failed to load comments"
        description={error instanceof Error ? error.message : 'Unknown error'}
        type="error"
        showIcon
        className="mb-4"
      />
    );
  }

  // 解构数据，设置默认值避免 undefined 错误
  const { comments, pagination } = data || { comments: [], pagination: { total: 0, page: 1, limit: pageSize } };

  return (
    <div className="comment-list space-y-6">
      {/* 顶部评论表单 */}
      {showForm && (
        <div className="mb-6">
          <CommentForm
            parentType={parentType}
            parentId={parentId}
            onSuccess={handleCommentAdded}
            showCancel={false}
          />
        </div>
      )}

      {/* 评论列表主体 */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <Empty
            description="No comments yet"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          comments.map((comment: any) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              parentType={parentType}
              parentId={parentId}
              allowReplies={allowReplies}
              onReplyAdded={handleCommentAdded}
              onDelete={handleCommentAdded}
            />
          ))
        )}
      </div>

      {/* 分页器：当评论总数大于每页大小时显示 */}
      {pagination.total > pageSize && (
        <div className="flex justify-center mt-6">
          <Pagination
            current={page}
            total={pagination.total}
            pageSize={pageSize}
            onChange={handlePageChange}
            showSizeChanger={false}
            showQuickJumper
            showTotal={(total) => `${total} comments`}
          />
        </div>
      )}
    </div>
  );
};

export default CommentList;