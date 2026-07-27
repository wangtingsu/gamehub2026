/**
 * CommentForm.tsx - 评论表单组件
 *
 * 支持新建评论和编辑已有评论两种模式
 * 包含用户登录校验、内容为空校验、Ctrl+Enter 快捷键提交等功能
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCreateComment, useUpdateComment } from '../../api/hooks/comments';
import { Button, Input, message, Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';

const { TextArea } = Input;

/** CommentForm 组件的 props */
interface CommentFormProps {
  /** 所属父内容类型：评测、新闻、社区帖子、攻略 */
  parentType: 'review' | 'news' | 'community_post' | 'guide' | 'blog';
  /** 所属父内容的 ID */
  parentId: string;
  /** 父评论 ID（用于回复场景，标识回复的目标评论） */
  parentCommentId?: string;
  /** 初始内容（编辑模式时传入已有内容） */
  initialContent?: string;
  /** 评论 ID（编辑模式时传入，用于标识待编辑的评论） */
  commentId?: string;
  /** 提交成功后的回调 */
  onSuccess?: () => void;
  /** 取消操作的回调 */
  onCancel?: () => void;
  /** 是否显示取消按钮 */
  showCancel?: boolean;
  /** 是否自动聚焦 */
  autoFocus?: boolean;
  /** 输入框占位文本 */
  placeholder?: string;
}

/**
 * CommentForm - 评论表单
 * - 未登录且非编辑模式时，展示登录提示
 * - 编辑模式下（传入 commentId），提交时调用更新接口
 * - 新建模式下，提交时调用创建接口，支持指定 parentCommentId 实现回复
 * - 支持 Ctrl + Enter 快捷键快速提交
 */
const CommentForm: React.FC<CommentFormProps> = ({
  parentType,
  parentId,
  parentCommentId,
  initialContent = '',
  commentId,
  onSuccess,
  onCancel,
  showCancel = true,
  autoFocus = false,
  placeholder = '发表你的评论...',
}) => {
  const { user } = useAuth();
  const [content, setContent] = useState(initialContent);
  const [submitting, setSubmitting] = useState(false);

  const createCommentMutation = useCreateComment();
  const updateCommentMutation = useUpdateComment();

  // 通过是否传入 commentId 判断当前是否为编辑模式
  const isEditMode = !!commentId;

  // 当 initialContent 变化时同步更新内容状态（用于编辑模式切换）
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  /** 提交评论：校验内容非空和登录状态，调用创建或更新接口 */
  const handleSubmit = async () => {
    if (!content.trim()) {
      message.warning('评论内容不能为空');
      return;
    }

    if (!user) {
      message.warning('请先登录');
      return;
    }

    setSubmitting(true);

    try {
      if (isEditMode) {
        // 编辑模式：调用更新接口
        await updateCommentMutation.mutateAsync({
          commentId: commentId!,
          content: content.trim(),
        });
        message.success('评论更新成功');
      } else {
        // 新建模式：调用创建接口
        await createCommentMutation.mutateAsync({
          parentType,
          parentId,
          parentCommentId,
          content: content.trim(),
        });
        message.success('评论发表成功');
      }

      setContent('');
      onSuccess?.();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  /** 取消编辑/回复，恢复初始内容 */
  const handleCancel = () => {
    setContent(initialContent);
    onCancel?.();
  };

  /** 键盘事件处理：Ctrl + Enter 快捷提交 */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
      handleSubmit();
    }
  };

  // 未登录且非编辑模式时，展示登录提示
  if (!user && !isEditMode) {
    return (
      <div className="comment-form-login-prompt p-4 bg-gray-50 rounded-lg text-center">
        <p className="text-gray-600 mb-2">登录后即可发表评论</p>
        <Button type="primary" href="/login">
          立即登录
        </Button>
      </div>
    );
  }

  return (
    <div className="comment-form space-y-3">
      <div className="flex space-x-3">
        {/* 用户头像 */}
        <Avatar
          src={user?.avatarUrl}
          icon={!user?.avatarUrl && <UserOutlined />}
          size="default"
        />
        <div className="flex-1">
          {/* 评论内容输入框 */}
          <TextArea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoSize={{ minRows: 3, maxRows: 6 }}
            autoFocus={autoFocus}
            disabled={submitting}
            className="w-full"
          />

          {/* 底部操作栏：提示文案 + 取消/提交按钮 */}
          <div className="flex justify-between items-center mt-3">
            <div className="text-sm text-gray-500">
              支持 Markdown 语法，Ctrl + Enter 快速提交
            </div>

            <div className="space-x-2">
              {showCancel && onCancel && (
                <Button onClick={handleCancel} disabled={submitting}>
                  取消
                </Button>
              )}
              <Button
                type="primary"
                onClick={handleSubmit}
                loading={submitting}
                disabled={!content.trim()}
              >
                {isEditMode ? '更新评论' : '发表评论'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentForm;