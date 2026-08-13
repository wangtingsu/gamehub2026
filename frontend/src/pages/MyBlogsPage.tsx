import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Typography, Button, Table, Tag, Space, Modal, message,
  Alert, Empty, Spin, Tooltip, Tabs,
} from 'antd';
import {
  ArrowLeftOutlined, EditOutlined, DeleteOutlined,
  PlusOutlined, EyeOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import { useMyBlogPosts, useDeleteBlogPost } from '../api/hooks';
import SEO from '../components/SEO';
import type { BlogArticle } from '../api/types';

const { Title, Text } = Typography;

const statusTabs = [
  { key: 'all', label: '全部' },
  { key: 'approved', label: '已发表' },
  { key: 'pending', label: '审核中' },
  { key: 'draft', label: '未完成' },
];

const reviewStatusMap: Record<string, { color: string; text: string }> = {
  draft: { color: 'default', text: '草稿' },
  pending: { color: 'orange', text: '待审核' },
  approved: { color: 'green', text: '已通过' },
  rejected: { color: 'red', text: '已拒绝' },
};

const MyBlogsPage = () => {
  const { lang } = useParams<{ lang: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'all';
  const [statusFilter, setStatusFilter] = useState<string>(
    statusTabs.some(t => t.key === initialTab) ? initialTab : 'all'
  );
  const { data: posts = [], isLoading } = useMyBlogPosts({ status: statusFilter } as any);
  const deleteBlogPost = useDeleteBlogPost();
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这篇文章吗？',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        setDeleting(id);
        try {
          await deleteBlogPost.mutateAsync(id);
          message.success('文章已删除');
        } catch {
          message.error('删除失败');
        } finally {
          setDeleting(null);
        }
      },
    });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: BlogArticle) => (
        <div className="flex items-center gap-2">
          <span className="text-gray-200 font-medium truncate max-w-xs">{title}</span>
          {record.reviewStatus === 'pending' && (
            <Tag color="orange" className="flex-shrink-0">待审核</Tag>
          )}
        </div>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (cat: string) => <Tag className="bg-dark-700 text-gray-300 border-0">{cat}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'reviewStatus',
      key: 'reviewStatus',
      width: 100,
      render: (status: string) => {
        const s = reviewStatusMap[status] || { color: 'default', text: status };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: '审核意见',
      dataIndex: 'reviewComment',
      key: 'reviewComment',
      width: 150,
      ellipsis: true,
      render: (comment: string) => comment || '-',
    },
    {
      title: '浏览量',
      dataIndex: 'views',
      key: 'views',
      width: 80,
      render: (views: number) => (
        <span className="text-gray-400 text-sm">{views}</span>
      ),
    },
    {
      title: '发布时间',
      dataIndex: 'publishDate',
      key: 'publishDate',
      width: 160,
      render: (date: string) => (
        <span className="text-gray-400 text-sm">
          <ClockCircleOutlined className="mr-1" />
          {formatDate(date)}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: any, record: BlogArticle) => (
        <Space>
          <Tooltip title="预览">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              className="!text-gray-400 hover:!text-blue-400"
              onClick={() => navigate(`/${lang || 'cn'}/blog/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              className="!text-gray-400 hover:!text-yellow-400"
              onClick={() => navigate(`/${lang || 'cn'}/blog/edit/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              loading={deleting === record.id}
              className="!text-gray-400 hover:!text-red-400"
              onClick={() => handleDelete(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="bg-dark-900">
      <SEO title="我的文章 | GameHub 博客" description="管理您发布的 GameHub 博客文章" keywords="我的文章, 博客管理, GameHub博客, 文章列表, 原创文章" />

      <div className="py-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              type="text"
              className="!text-gray-400 hover:!text-white"
              onClick={() => navigate(`/${lang || 'cn'}/blog`)}
            >
              <ArrowLeftOutlined />
            </Button>
            <Title level={3} className="!text-white !mb-0">我的文章</Title>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="!bg-blue-600"
            onClick={() => navigate(`/${lang || 'cn'}/blog/new`)}
          >
            写文章
          </Button>
        </div>

        {/* Status Tabs */}
        <div className="mb-6">
          <Tabs
            activeKey={statusFilter}
            onChange={setStatusFilter}
            items={statusTabs.map(tab => ({ key: tab.key, label: tab.label }))}
            className="[&_.ant-tabs-tab]:!text-gray-400 [&_.ant-tabs-tab-active]:!text-white [&_.ant-tabs-ink-bar]:!bg-blue-500"
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-16">
            <Spin size="large" />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-dark-800 rounded-xl p-16">
            <Empty
              description={
                <div className="text-gray-400">
                  <p className="mb-4">
                    {statusFilter === 'all' && '还没有写过文章'}
                    {statusFilter === 'approved' && '暂无已发表的文章'}
                    {statusFilter === 'pending' && '暂无审核中的文章'}
                    {statusFilter === 'draft' && '暂无未完成的草稿'}
                  </p>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    className="!bg-blue-600"
                    onClick={() => navigate(`/${lang || 'cn'}/blog/new`)}
                  >
                    写文章
                  </Button>
                </div>
              }
            />
          </div>
        ) : (
          <div className="bg-dark-800 rounded-xl overflow-hidden">
            <Table
              dataSource={posts}
              columns={columns}
              rowKey="id"
              pagination={false}
              className="blog-table"
              locale={{ emptyText: '暂无文章' }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBlogsPage;
