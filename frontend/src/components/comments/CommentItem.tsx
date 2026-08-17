/**
 * CommentItem.tsx - 单条评论组件
 *
 * 渲染单条评论及其子评论（回复），支持嵌套层级展示
 * 提供点赞（需登录）、回复、编辑、删除等操作功能
 * 点赞与用户绑定，支持 toggle
 * 回复默认显示 5 条（按点赞降序，相同按时间降序），点击"查看更多"加载 5 条
 */
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useDeleteComment, useLikeComment, useCommentReplies } from '../../api/hooks/comments';
import { Avatar, Button, Popconfirm, message, Tooltip } from 'antd';
import {
  LikeOutlined, LikeFilled, MessageOutlined,
  DeleteOutlined, UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import CommentForm from './CommentForm';
import LevelBadge from '../LevelBadge';

dayjs.extend(relativeTime);
dayjs.locale('en');

interface CommentItemProps {
  comment: any;
  parentType: 'review' | 'news' | 'community_post' | 'guide' | 'blog';
  parentId: string;
  allowReplies?: boolean;
  onReplyAdded?: () => void;
  onDelete?: () => void;
  level?: number;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment, parentType, parentId, allowReplies = true,
  onReplyAdded, onDelete, level = 0,
}) => {
  const { user } = useAuth();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [liked, setLiked] = useState(comment.liked || false);
  const [likesCount, setLikesCount] = useState(comment.likes || 0);
  const deleteCommentMutation = useDeleteComment();
  const likeCommentMutation = useLikeComment();

  // 顶层级评论：获取子回复
  const [replyLimit, setReplyLimit] = useState(5);
  const { data: repliesData } = useCommentReplies(comment.id, 1, 100);
  const allReplies = repliesData?.replies || [];
  // 按时间正序排列（早的在上面）
  const sortedReplies = [...allReplies].sort((a: any, b: any) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const visibleReplies = sortedReplies.slice(0, replyLimit);
  const hasMore = replyLimit < sortedReplies.length;

  const userId = user?.id != null ? String(user.id) : '';
  const authorId = comment.authorId != null ? String(comment.authorId) : '';
  const isAuthor = !!user && userId === authorId;
  const canEdit = isAuthor || user?.role === 'super_admin' || user?.role === 'admin';
  const canDelete = canEdit;
  const maxLevel = 3;

  const handleLike = async () => {
    if (!user) { message.info('Please sign in to like'); return; }
    try {
      await likeCommentMutation.mutateAsync(comment.id);
      setLiked(!liked);
      setLikesCount(liked ? Math.max(0, likesCount - 1) : likesCount + 1);
    } catch { message.error('Failed to like'); }
  };

  const handleDelete = async () => {
    try {
      await deleteCommentMutation.mutateAsync(comment.id);
      message.success('Deleted');
      onDelete?.();
    } catch { message.error('Failed to delete'); }
  };

  const handleReplyAdded = () => {
    setShowReplyForm(false);
    onReplyAdded?.();
  };

  const renderAuthorInfo = () => (
    <div className="flex items-center space-x-5">
      <Avatar src={comment.author?.avatarUrl} icon={!comment.author?.avatarUrl && <UserOutlined />} size="small" />
      <div className="flex flex-col">
        <div className="flex items-center gap-5">
          <span className="font-medium text-sm">{comment.author?.displayName || comment.author?.username || 'Anonymous'}</span>
          {comment.author?.level && <LevelBadge level={comment.author.level} size="small" showIcon={false} />}
        </div>
        <span className="text-xs text-[var(--c-text5)]">
          {dayjs(comment.createdAt).fromNow()}
          {comment.isEdited && <span className="ml-5 text-gray-400">(edited)</span>}
        </span>
      </div>
    </div>
  );

  const renderActions = () => (
    <div className="flex items-center space-x-4 mt-5">
      <Tooltip title={liked ? 'Unlike' : 'Like'}>
        <Button type="text" size="small"
          icon={liked ? <LikeFilled /> : <LikeOutlined />}
          className={liked ? 'text-blue-500' : ''}
          onClick={handleLike}>
          {likesCount > 0 && <span className="ml-1">{likesCount}</span>}
        </Button>
      </Tooltip>
      {allowReplies && level < maxLevel && (
        <Tooltip title="Reply">
          <Button type="text" size="small" icon={<MessageOutlined />} onClick={() => setShowReplyForm(!showReplyForm)}>Reply</Button>
        </Tooltip>
      )}
      {canDelete && (
        <Popconfirm title="Delete this comment?" onConfirm={handleDelete} okText="Delete" cancelText="Cancel">
          <Button type="text" size="small" danger icon={<DeleteOutlined />}>Delete</Button>
        </Popconfirm>
      )}
    </div>
  );

  return (
    <div className={`comment-item ${level > 0 ? 'ml-8 border-l-5 pl-4' : ''}`} style={level > 0 ? { borderLeftColor: 'var(--c-border)' } : undefined}>
      <div className="rounded-lg p-4 shadow-sm" style={{ backgroundColor: 'var(--c-card)', color: 'var(--c-text)' }}>
        <div className="flex justify-between">
          {renderAuthorInfo()}
          {level === 0 && comment.replyCount > 0 && (
            <div className="text-sm text-[var(--c-text5)]">{comment.replyCount} replies</div>
          )}
        </div>
        <div className="mt-5">
          <p className="whitespace-pre-wrap" style={{ color: 'var(--c-text)' }}>
            {level > 0 && (
              <span className="text-blue-500 text-xs block mb-1">Reply to @{comment.parentAuthorName || comment.parentAuthor?.username || 'comment'}</span>
            )}
            {comment.content}
          </p>
        </div>
        {renderActions()}

        {showReplyForm && (
          <div className="mt-4">
            <CommentForm parentType={parentType} parentId={parentId} parentCommentId={comment.id}
              onSuccess={handleReplyAdded} onCancel={() => setShowReplyForm(false)} autoFocus />
          </div>
        )}

        {/* 子回复（最多嵌套5层） */}
        {level <= 1 && visibleReplies.length > 0 && (
          <div className="mt-4 space-y-5 border-t pt-5" style={{ borderTopColor: 'var(--c-border)' }}>
            {visibleReplies.map((reply: any) => (
              <CommentItem key={reply.id} comment={reply} parentType={parentType} parentId={parentId}
                allowReplies={allowReplies} onReplyAdded={onReplyAdded} onDelete={onDelete} level={level + 1} />
            ))}
            {hasMore && (
              <Button type="link" size="small" onClick={() => setReplyLimit(replyLimit + 5)}>
                View more replies ({sortedReplies.length - replyLimit} more)
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentItem;
