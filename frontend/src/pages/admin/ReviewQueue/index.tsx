import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Space, Card, Row, Col, Modal, Input, message, Tabs, Statistic, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckOutlined,
  CloseOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useReviewQueue, useReviewStats, useApproveContent, useRejectContent } from '../../../api/hooks';
import type { ReviewQueueItem, ReviewStatusType, ReviewStats } from '../../../api/types';
import SEO from '../../../components/SEO';

const { TextArea } = Input;

const typeLabels: Record<string, string> = {
  news: '新闻',
  blog: '博客',
  guide: '攻略',
  review: '测评',
  community: '论坛',
};

const typeColors: Record<string, string> = {
  news: 'blue',
  blog: 'geekblue',
  guide: 'orange',
  review: 'purple',
  community: 'cyan',
};

const statusLabels: Record<ReviewStatusType, string> = {
  draft: '草稿',
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
};

const statusColors: Record<ReviewStatusType, string> = {
  draft: 'default',
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};

const ReviewQueue: React.FC = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<ReviewQueueItem | null>(null);
  const [rejectComment, setRejectComment] = useState('');

  const { data: queueData, isLoading: queueLoading, refetch: refetchQueue } = useReviewQueue({
    page,
    limit: pageSize,
    type: typeFilter,
    status: statusFilter,
  });

  const { data: statsData, refetch: refetchStats } = useReviewStats();
  const approveMutation = useApproveContent();
  const rejectMutation = useRejectContent();

  const items = queueData?.items || [];
  const total = queueData?.pagination?.total || 0;
  const stats: ReviewStats[] = statsData || [];

  // 每次进入审核队列页面时自动刷新数据
  useEffect(() => {
    refetchQueue();
    refetchStats();
  }, []);

  const handleApprove = async (record: ReviewQueueItem) => {
    try {
      await approveMutation.mutateAsync({ type: record.type, id: record.id });
      message.success(`${typeLabels[record.type] || record.type} 已审核通过`);
      refetchQueue();
      refetchStats();
    } catch (error: any) {
      message.error(error?.message || '审核操作失败');
    }
  };

  const handleReject = (record: ReviewQueueItem) => {
    setRejectTarget(record);
    setRejectComment('');
    setRejectModalVisible(true);
  };

  const confirmReject = async () => {
    if (!rejectTarget || !rejectComment.trim()) {
      message.warning('请填写拒绝原因');
      return;
    }
    try {
      await rejectMutation.mutateAsync({
        type: rejectTarget.type,
        id: rejectTarget.id,
        comment: rejectComment,
      });
      message.success(`${typeLabels[rejectTarget.type] || rejectTarget.type} 已拒绝`);
      setRejectModalVisible(false);
      setRejectTarget(null);
      refetchQueue();
      refetchStats();
    } catch (error: any) {
      message.error(error?.message || '拒绝操作失败');
    }
  };

  const handleRefresh = () => {
    refetchQueue();
    refetchStats();
  };

  const columns: ColumnsType<ReviewQueueItem> = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) => (
        <Tag color={typeColors[type] || 'default'}>
          {typeLabels[type] || type}
        </Tag>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string, record: ReviewQueueItem) => (
        <Tooltip title={record.content}>
          <span>{title}</span>
        </Tooltip>
      ),
    },
    {
      title: '作者',
      dataIndex: 'authorName',
      key: 'authorName',
      width: 120,
      render: (name: string | null) => name || '-',
    },
    {
      title: '提交时间',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      width: 170,
      render: (date: string) => {
        if (!date) return '-';
        return new Date(date).toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
      },
    },
    {
      title: '状态',
      dataIndex: 'reviewStatus',
      key: 'reviewStatus',
      width: 90,
      render: (status: ReviewStatusType) => (
        <Tag color={statusColors[status] || 'default'}>
          {statusLabels[status] || status}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: any, record: ReviewQueueItem) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<CheckOutlined />}
            onClick={() => handleApprove(record)}
            loading={approveMutation.isPending}
          >
            通过
          </Button>
          <Button
            danger
            size="small"
            icon={<CloseOutlined />}
            onClick={() => handleReject(record)}
            loading={rejectMutation.isPending}
          >
            拒绝
          </Button>
        </Space>
      ),
    },
  ];

  const pendingStats = stats.filter(s => s.pending > 0);
  const totalPending = stats.reduce((sum, s) => sum + s.pending, 0);

  return (
    <>
      <SEO title="审核队列 - 管理后台" description="审核用户提交的内容，包括新闻、评测、社区帖子和攻略" keywords="审核队列, 内容审核, 管理后台, 用户内容, GameHub审核" noindex />
      <div style={{ padding: 24 }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <h2 style={{ margin: 0 }}>审核队列</h2>
          </Col>
          <Col>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
              刷新
            </Button>
          </Col>
        </Row>

        {/* Stats Cards */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={4}>
            <Card size="small">
              <Statistic
                title="待审核总数"
                value={totalPending}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          {pendingStats.map(stat => (
            <Col span={4} key={stat.type}>
              <Card size="small">
                <Statistic
                  title={typeLabels[stat.type] || stat.type}
                  value={stat.pending}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
          ))}
        </Row>

        {/* Filter Tabs */}
        <Tabs
          activeKey={typeFilter || 'all'}
          onChange={(key) => {
            setTypeFilter(key === 'all' ? undefined : key);
            setPage(1);
          }}
          items={[
            { key: 'all', label: `全部 (${totalPending})` },
            ...stats.map(s => ({
              key: s.type,
              label: `${typeLabels[s.type] || s.type} (${s.pending})`,
            })),
          ]}
        />

        {/* Queue Table */}
        <Table
          columns={columns}
          dataSource={items}
          rowKey={(record) => `${record.type}-${record.id}`}
          loading={queueLoading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          locale={{
            emptyText: statusFilter === 'pending'
              ? '暂无待审核内容'
              : statusFilter === 'approved'
                ? '暂无已通过内容'
                : '暂无已拒绝内容',
          }}
        />
      </div>

      {/* Reject Modal */}
      <Modal
        title="拒绝原因"
        open={rejectModalVisible}
        onOk={confirmReject}
        onCancel={() => setRejectModalVisible(false)}
        okText="确认拒绝"
        cancelText="取消"
        okButtonProps={{ danger: true, loading: rejectMutation.isPending }}
      >
        <p>
          拒绝内容：
          <Tag color={typeColors[rejectTarget?.type || '']}>
            {typeLabels[rejectTarget?.type || '']}
          </Tag>
          {rejectTarget?.title}
        </p>
        <TextArea
          rows={4}
          placeholder="请填写拒绝原因（必填）"
          value={rejectComment}
          onChange={(e) => setRejectComment(e.target.value)}
        />
      </Modal>
    </>
  );
};

export default ReviewQueue;
