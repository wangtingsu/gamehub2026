/**
 * CommentItem.tsx - 单条评论组件
 *
 * 渲染单条评论及其子评论（回复），支持嵌套层级展示
 * 提供点赞（需登录）、回复、编辑、删除等操作功能
 * 点赞与用户绑定，支持 toggle
 * 回复默认显示 3 条（按点赞降序，相同按时间降序），点击"查看更多"加载 3 条
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
import 'dayjs/locale/zh-cn';
import CommentForm from './CommentForm';
import LevelBadge from '../LevelBadge';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

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
  const [replyLimit, setReplyLimit] = useState(3);
  const { data: repliesData } = useCommentReplies(comment.id, 1, 100);
  const allReplies = repliesData?.replies || [];
  // 按点赞降序，相同点赞按时间降序
  const sortedReplies = [...allReplies].sort((a: any, b: any) => {
    if (b.likes !== a.likes) return b.likes - a.likes;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const visibleReplies = sortedReplies.slice(0, replyLimit);
  const hasMore = replyLimit < sortedReplies.length;

  const userId = user?.id != null ? String(user.id) : '';
  const authorId = comment.authorId != null ? String(comment.authorId) : '';
  const isAuthor = !!user && userId === authorId;
  const canEdit = isAuthor || user?.role === 'super_admin' || user?.role === 'admin';
  const canDelete = canEdit;
  const maxLevel = 3;

  const handleLike = async () => {
    if (!user) { message.info('请先登录后再点赞'); return; }
    try {
      await likeCommentMutation.mutateAsync(comment.id);
      setLiked(!liked);
      setLikesCount(liked ? Math.max(0, likesCount - 1) : likesCount + 1);
    } catch { message.error('点赞失败'); }
  };

  const handleDelete = async () => {
    try {
      await deleteCommentMutation.mutateAsync(comment.id);
      message.success('删除成功');
      onDelete?.();
    } catch { message.error('删除失败'); }
  };

  const handleReplyAdded = () => {
    setShowReplyForm(false);
    onReplyAdded?.();
  };

  const renderAuthorInfo = () => (
    <div className="flex items-center space-x-2">
      <Avatar src={comment.author?.avatarUrl} icon={!comment.author?.avatarUrl && <UserOutlined />} size="small" />
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{comment.author?.displayName || comment.author?.username || '匿名用户'}</span>
          {comment.author?.level && <LevelBadge level={comment.author.level} size="small" showIcon={false} />}
        </div>
        <span className="text-xs text-gray-500">
          {dayjs(comment.createdAt).fromNow()}
          {comment.isEdited && <span className="ml-2 text-gray-400">(已编辑)</span>}
        </span>
      </div>
    </div>
  );

  const renderActions = () => (
    <div className="flex items-center space-x-4 mt-2">
      <Tooltip title={liked ? '取消点赞' : '点赞'}>
        <Button type="text" size="small"
          icon={liked ? <LikeFilled /> : <LikeOutlined />}
          className={liked ? 'text-blue-500' : ''}
          onClick={handleLike}>
          {likesCount > 0 && <span className="ml-1">{likesCount}</span>}
        </Button>
      </Tooltip>
      {allowReplies && level < maxLevel && (
        <Tooltip title="回复">
          <Button type="text" size="small" icon={<MessageOutlined />} onClick={() => setShowReplyForm(!showReplyForm)}>回复</Button>
        </Tooltip>
      )}
      {canDelete && (
        <Popconfirm title="确定要删除这条评论吗？" onConfirm={handleDelete} okText="确定" cancelText="取消">
          <Button type="text" size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      )}
    </div>
  );

  return (
    <div className={`comment-item ${level > 0 ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''}`}>
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex justify-between">
          {renderAuthorInfo()}
          {level === 0 && comment.replyCount > 0 && (
            <div className="text-sm text-gray-500">共 {comment.replyCount} 条回复</div>
          )}
        </div>
        <div className="mt-3">
          <p className="text-gray-800 whitespace-pre-wrap">{comment.content}</p>
        </div>
        {renderActions()}

        {showReplyForm && (
          <div className="mt-4">
            <CommentForm parentType={parentType} parentId={parentId} parentCommentId={comment.id}
              onSuccess={handleReplyAdded} onCancel={() => setShowReplyForm(false)} autoFocus />
          </div>
        )}

        {/* 子回复（最多嵌套2层） */}
        {level <= 1 && visibleReplies.length > 0 && (
          <div className="mt-4 space-y-3 border-t border-gray-100 pt-3">
            {visibleReplies.map((reply: any) => (
              <CommentItem key={reply.id} comment={reply} parentType={parentType} parentId={parentId}
                allowReplies={allowReplies} onReplyAdded={onReplyAdded} onDelete={onDelete} level={level + 1} />
            ))}
            {hasMore && (
              <Button type="link" size="small" onClick={() => setReplyLimit(replyLimit + 3)}>
                查看更多回复 ({sortedReplies.length - replyLimit} 条)
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentItem;
