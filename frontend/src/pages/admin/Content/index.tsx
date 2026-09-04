import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tabs, Table, Button, Space, Input, Modal, Form, Select, Tag, message, Popconfirm, Switch, Rate, Spin, Upload, Image } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { UploadOutlined, PlusOutlined } from '@ant-design/icons';
import type { UploadFile, RcFile } from 'antd/es/upload/interface';
import {
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import ActionButtons from '../components/ActionButtons';
import BlogEditor from '../../../components/blog/BlogEditor';
import BlogRenderContent from '../../../components/blog/BlogRenderContent';
import { apiService } from '../../../api';
import type { NewsArticle, Review, CommunityPost, NewsCategory, ReviewTemplate, Guide } from '../../../api/types';
import SEO from '../../../components/SEO';

const { Search } = Input;
const { Option } = Select;
const { TabPane } = Tabs;
const { TextArea } = Input;

// 新闻翻译语言（不含中文——中文对应基础列 title/excerpt/content）
const NEWS_TRANSLATION_LANGS = [
  { key: 'en', label: 'English' },
  { key: 'ja', label: '日本語' },
  { key: 'ko', label: '한국어' },
  { key: 'es', label: 'Español' },
  { key: 'fr', label: 'Français' },
] as const;

type ContentType = 'news' | 'blogs' | 'guides' | 'reviews' | 'community' | 'blogspaces' | 'categories' | 'templates';

interface ContentStats {
  total: number;
  published: number;
  pending: number;
  today: number;
}

interface EditingContent {
  type: ContentType;
  data: NewsArticle | Review | CommunityPost | Guide;
}

interface CurrentContent {
  data: NewsArticle[] | Review[] | CommunityPost[] | Guide[];
  setData: React.Dispatch<React.SetStateAction<NewsArticle[]>> |
           React.Dispatch<React.SetStateAction<Review[]>> |
           React.Dispatch<React.SetStateAction<CommunityPost[]>>;
  type: ContentType;
}

// 封面图片上传组件（支持点击 / 拖拽 / 粘贴上传，带大图预览+删除+URL输入）
const CoverImageUpload: React.FC<{ value?: string; onChange?: (url: string) => void }> = ({ value, onChange }) => {
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);

  const handleUpload = async (file: RcFile | File) => {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/v1/upload/image', {
        method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd,
      });
      const d = await res.json();
      if (d.success && d.data?.file?.url) { onChange?.(d.data.file.url); message.success('上传成功'); }
      else { message.error(d.error || d.message || '上传失败'); }
    } catch (e: any) { message.error('上传失败: ' + (e.message || '网络错误')); }
    finally { setUploading(false); }
  };

  // 统一处理拖拽 / 粘贴得到的文件（仅接受图片）
  const uploadFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) { message.warning('请选择图片文件'); return; }
    handleUpload(file);
  };

  // ==================== 拖拽上传 ====================
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer?.types?.includes('Files')) setIsDragOver(true);
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) { dragCounter.current = 0; setIsDragOver(false); }
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragOver(false); dragCounter.current = 0;
    uploadFiles(e.dataTransfer?.files);
  };

  // ==================== 粘贴上传 ====================
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) handleUpload(file);
        return;
      }
    }
  };

  const dragProps = {
    tabIndex: 0,
    onDragEnter: handleDragEnter,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
    onPaste: handlePaste,
    style: { outline: 'none' },
  };

  if (value) {
    return (
      <div {...dragProps} className="space-y-3">
        <div className="relative inline-block group">
          <Image src={value} width={240} height={150} style={{ objectFit: 'cover', borderRadius: 8, border: isDragOver ? '3px dashed #1890ff' : '3px solid transparent' }} preview={{ mask: '点击查看大图' }} />
          <button
            type="button"
            onClick={() => onChange?.('')}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
            title="删除封面图"
          >✕</button>
        </div>
        <div className="flex gap-2 items-center">
          <Input value={value} onChange={e => onChange?.(e.target.value)} placeholder="图片 URL" className="flex-1" size="small" />
          <Upload accept="image/*" showUploadList={false}
            beforeUpload={(f) => { handleUpload(f as RcFile); return false; }}>
            <Button size="small" icon={<UploadOutlined />} loading={uploading}>替换</Button>
          </Upload>
          <Button size="small" danger onClick={() => onChange?.('')}>删除</Button>
        </div>
        <p className="text-xs text-gray-500">支持拖拽图片到此处，或点击本区域后 Ctrl+V 粘贴截图</p>
      </div>
    );
  }

  return (
    <div {...dragProps} className="flex items-start gap-3">
      <Upload accept="image/*" showUploadList={false}
        beforeUpload={(f) => { handleUpload(f as RcFile); return false; }}>
        <div
          className={`flex flex-col items-center justify-center w-[200px] h-[120px] border-2 border-dashed rounded-lg cursor-pointer ${isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-500 hover:border-blue-400'}`}
        >
          {uploading ? <Spin /> : <PlusOutlined className="text-2xl text-gray-400" />}
          <span className="text-sm text-gray-400 mt-2">{uploading ? '上传中...' : '点击 / 拖拽上传封面图'}</span>
        </div>
      </Upload>
      <div className="flex-1">
        <Input value={value || ''} onChange={e => onChange?.(e.target.value)} placeholder="或直接粘贴在线图片 URL" allowClear />
        <p className="text-xs text-gray-500 mt-1">支持 jpg/png/webp，最大 50MB；也可拖拽图片或 Ctrl+V 粘贴截图</p>
      </div>
    </div>
  );
};

const Content: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // 从 URL 路径解析当前 tab
  const getActiveTabFromPath = (): ContentType => {
    const path = location.pathname;
    if (path.endsWith('/blogs')) return 'blogs';
    if (path.endsWith('/guides')) return 'guides';
    if (path.endsWith('/reviews')) return 'reviews';
    if (path.endsWith('/community')) return 'community';
    if (path.endsWith('/blogspaces')) return 'blogspaces';
    return 'news';
  };

  const [activeTab, setActiveTab] = useState<ContentType>(getActiveTabFromPath());
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingContent, setEditingContent] = useState<EditingContent | null>(null);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<NewsCategory | null>(null);
  const [categoryForm] = Form.useForm();
  const [templates, setTemplates] = useState<ReviewTemplate[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReviewTemplate | null>(null);
  const [templateForm] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [editingSpaceId, setEditingSpaceId] = useState<string>('');
  const [spaceForm] = Form.useForm();
  const [spaceModalVisible, setSpaceModalVisible] = useState(false);

  // 路径变化时同步 tab 状态
  useEffect(() => {
    setActiveTab(getActiveTabFromPath());
  }, [location.pathname]);

  // 切换 tab 时同步更新 URL
  const handleTabChange = (key: string) => {
    const tab = key as ContentType;
    const basePath = location.pathname.replace(/\/content(\/.*)?$/, '/content');
    if (tab === 'news') navigate(`${basePath}`, { replace: true });
    else navigate(`${basePath}/${tab}`, { replace: true });
  };

  // 内容数据状态
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [blogs, setBlogs] = useState<any[]>([]);
  const [blogSpaces, setBlogSpaces] = useState<any[]>([]);

  // 加载博客空间列表
  useEffect(() => { apiService.getBlogSpaces().then(d => setBlogSpaces(d||[])).catch(()=>{}); }, []);

  // 加载数据
  useEffect(() => {
    fetchContent();
  }, [activeTab]);

  // 加载分类列表（所有页面都需要）
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await apiService.getNewsCategories();
        setCategories(data);
      } catch {
        // 分类加载失败不影响主功能
      }
    };
    fetchCategories();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      switch (activeTab) {
        case 'news': {
          // 管理后台始终按主语言（中文基础列）拉取，避免 i18n.language 为 en 时
          // 把标题/正文本地化成英文，导致「简体中文」编辑页被回填成英文。
          const data = await apiService.getNews({ limit: 200, lang: 'zh-CN' });
          // 过滤掉博客分类的文章
          setNews(data.filter((item: any) => {
            const cat = String(item.category || '');
            return !cat.startsWith('博客') && !cat.toLowerCase().includes('blog');
          }));
          break;
        }
        case 'blogs': {
          const data = await apiService.getBlogPosts({ limit: 200 });
          setBlogs(Array.isArray(data) ? data : []);
          break;
        }
        case 'guides': {
          const data = await apiService.getGuides({ limit: 200 });
          setGuides(data);
          break;
        }
        case 'reviews': {
          const data = await apiService.getReviews({ limit: 200 });
          setReviews(data);
          break;
        }
        case 'community': {
          const data = await apiService.getCommunityPosts({ limit: 200 });
          setCommunityPosts(data);
          break;
        }
      }
    } catch (err) {
      console.error(`获取${activeTab}内容失败:`, err);
      message.error('获取内容失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取当前活动的内容数据
  const getCurrentContent = () => {
    switch (activeTab) {
      case 'news':
        return {
          data: news,
          setData: setNews,
          type: 'news' as const,
        };
      case 'reviews':
        return {
          data: reviews,
          setData: setReviews,
          type: 'reviews' as const,
        };
      case 'community':
        return {
          data: communityPosts,
          setData: setCommunityPosts,
          type: 'community' as const,
        };
      case 'categories':
        return undefined;
      case 'templates':
        return undefined;
      case 'guides':
        return undefined;
    }
  };

  // 内容统计
  const contentStats: Record<string, ContentStats> = {
    news: {
      total: news.length,
      published: news.filter(n => (n as any).reviewStatus === 'approved').length,
      pending: news.filter(n => (n as any).reviewStatus === 'pending' || !(n as any).reviewStatus).length,
      today: news.filter(n => new Date(n.publishDate).toDateString() === new Date().toDateString()).length,
    },
    reviews: {
      total: reviews.length,
      published: reviews.filter(r => (r as any).reviewStatus === 'approved').length,
      pending: reviews.filter(r => (r as any).reviewStatus === 'pending' || !(r as any).reviewStatus).length,
      today: reviews.filter(r => new Date(r.publishDate).toDateString() === new Date().toDateString()).length,
    },
    community: {
      total: communityPosts.length,
      published: communityPosts.filter(p => (p as any).reviewStatus === 'approved').length,
      pending: communityPosts.filter(p => (p as any).reviewStatus === 'pending' || !(p as any).reviewStatus).length,
      today: communityPosts.filter(p => new Date(p.publishDate).toDateString() === new Date().toDateString()).length,
    },
    blogs: {
      total: blogs.length,
      published: blogs.filter(b => (b as any).reviewStatus === 'approved').length,
      pending: blogs.filter(b => (b as any).reviewStatus === 'pending' || !(b as any).reviewStatus).length,
      today: blogs.filter(b => new Date(b.publishDate).toDateString() === new Date().toDateString()).length,
    },
    guides: {
      total: guides.length,
      published: guides.filter(g => g.reviewStatus === 'approved').length,
      pending: guides.filter(g => g.reviewStatus === 'pending' || !g.reviewStatus).length,
      today: guides.filter(g => g.createdAt && new Date(g.createdAt).toDateString() === new Date().toDateString()).length,
    },
  };

  // 新闻表格列定义
  const newsColumns: ColumnsType<NewsArticle> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <span className="font-medium">{text}</span>,
    },
    {
      title: 'Author',
      dataIndex: 'author',
      key: 'author',
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => <Tag color="blue">{category}</Tag>,
    },
    {
      title: 'Publish Date',
      dataIndex: 'publishDate',
      key: 'publishDate',
    },
    {
      title: 'Views',
      dataIndex: 'views',
      key: 'views',
      render: (views: number) => (
        <div className="flex items-center">
          <EyeOutlined className="text-gray-500 mr-1" />
          <span>{views.toLocaleString()}</span>
        </div>
      ),
      sorter: (a, b) => a.views - b.views,
    },
    {
      title: 'Likes',
      dataIndex: 'likes',
      key: 'likes',
      sorter: (a, b) => a.likes - b.likes,
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        <div className="flex items-center">
          <Switch
            checkedChildren="Published"
            unCheckedChildren="Draft"
            defaultChecked={record.views > 0}
            size="small"
          />
        </div>
      ),
    },
    {
      title: '审核',
      key: 'reviewStatus',
      width: 150,
      render: (_, record: any) => (
        <Space size="small">
          {record.reviewStatus ? (
            <Tag color={record.reviewStatus === 'approved' ? 'success' : record.reviewStatus === 'rejected' ? 'error' : 'warning'}>
              {record.reviewStatus === 'approved' ? '已通过' : record.reviewStatus === 'rejected' ? '已拒绝' : '待审核'}
            </Tag>
          ) : (
            <Tag color="success">已通过</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => handleViewContent(record, 'news')}
            className="text-blue-500 hover:text-blue-700"
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEditContent(record, 'news')}
            className="text-green-500 hover:text-green-700"
          />
          <Popconfirm
            title="Delete News"
            description="Are you sure you want to delete this news article?"
            onConfirm={() => handleDeleteContent(record.id, 'news')}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="text"
              icon={<DeleteOutlined />}
              size="small"
              danger
              className="hover:text-red-700"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 评测表格列定义
  const reviewColumns: ColumnsType<Review> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <span className="font-medium">{text}</span>,
    },
    {
      title: 'Game',
      dataIndex: 'gameTitle',
      key: 'gameTitle',
    },
    {
      title: 'Author',
      dataIndex: 'author',
      key: 'author',
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating: number) => (
        <div className="flex items-center">
          <Rate allowHalf defaultValue={rating} disabled className="text-yellow-500 text-sm" />
          <span className="ml-2 font-medium">{rating.toFixed(1)}</span>
        </div>
      ),
      sorter: (a, b) => a.rating - b.rating,
    },
    {
      title: 'Likes',
      dataIndex: 'likes',
      key: 'likes',
      sorter: (a, b) => a.likes - b.likes,
    },
    {
      title: 'Comments',
      dataIndex: 'comments',
      key: 'comments',
      sorter: (a, b) => a.comments - b.comments,
    },
    {
      title: 'Publish Date',
      dataIndex: 'publishDate',
      key: 'publishDate',
    },
    {
      title: '审核',
      key: 'reviewStatus',
      width: 150,
      render: (_, record: any) => (
        <Tag color={record.reviewStatus === 'approved' ? 'success' : record.reviewStatus === 'rejected' ? 'error' : 'warning'}>
          {record.reviewStatus === 'approved' ? '已通过' : record.reviewStatus === 'rejected' ? '已拒绝' : '待审核'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => handleViewContent(record, 'reviews')}
            className="text-blue-500 hover:text-blue-700"
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEditContent(record, 'reviews')}
            className="text-green-500 hover:text-green-700"
          />
          <Popconfirm
            title="Delete Review"
            description="Are you sure you want to delete this review?"
            onConfirm={() => handleDeleteContent(record.id, 'reviews')}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="text"
              icon={<DeleteOutlined />}
              size="small"
              danger
              className="hover:text-red-700"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 社区帖子表格列定义
  const communityColumns: ColumnsType<CommunityPost> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <span className="font-medium">{text}</span>,
    },
    {
      title: 'Author',
      dataIndex: 'author',
      key: 'author',
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => <span className="text-gray-600">{category || '-'}</span>,
    },
    {
      title: 'Likes',
      dataIndex: 'likes',
      key: 'likes',
      sorter: (a, b) => a.likes - b.likes,
    },
    {
      title: 'Comments',
      dataIndex: 'comments',
      key: 'comments',
      sorter: (a, b) => a.comments - b.comments,
    },
    {
      title: 'Publish Date',
      dataIndex: 'publishDate',
      key: 'publishDate',
    },
    {
      title: 'Status',
      key: 'status',
      render: () => (
        <div className="flex items-center space-x-2">
          <Switch
            checkedChildren={<CheckOutlined />}
            unCheckedChildren={<CloseOutlined />}
            defaultChecked={true}
            size="small"
          />
          <Tag color="green">Approved</Tag>
        </div>
      ),
    },
    {
      title: '审核',
      key: 'reviewStatus',
      width: 150,
      render: (_, record: any) => (
        <Tag color={record.reviewStatus === 'approved' ? 'success' : record.reviewStatus === 'rejected' ? 'error' : 'warning'}>
          {record.reviewStatus === 'approved' ? '已通过' : record.reviewStatus === 'rejected' ? '已拒绝' : '待审核'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => handleViewContent(record, 'community')}
            className="text-blue-500 hover:text-blue-700"
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEditContent(record, 'community')}
            className="text-green-500 hover:text-green-700"
          />
          <Popconfirm
            title="Delete Post"
            description="Are you sure you want to delete this community post?"
            onConfirm={() => handleDeleteContent(record.id, 'community')}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="text"
              icon={<DeleteOutlined />}
              size="small"
              danger
              className="hover:text-red-700"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 搜索功能
  const handleSearch = (value: string) => {
    setSearchText(value);
    // 实际应用中这里应该过滤数据
  };

  // 查看内容
  const handleViewContent = (content: NewsArticle | Review | CommunityPost | Guide, type: ContentType) => {
    let title = '';
    let contentText = '';
    let extra = null;

    switch (type) {
      case 'news':
        title = content.title;
        contentText = content.content;
        break;
      case 'reviews':
        title = `${(content as Review).gameTitle} - ${content.title}`;
        contentText = content.content;
        break;
      case 'community':
        title = content.title;
        contentText = content.content;
        break;
      case 'guides':
        const guide = content as Guide;
        title = guide.title;
        contentText = guide.content;
        extra = (
          <div className="space-y-2">
            <p><strong>游戏：</strong>{guide.gameTitle || '-'}</p>
            <p><strong>难度：</strong>{guide.difficulty}</p>
            <p><strong>预计时间：</strong>{guide.estimatedMinutes || '-'} 分钟</p>
            {guide.steps?.length > 0 && (
              <div>
                <strong>步骤数：</strong>{guide.steps.length}
                <ol className="list-decimal ml-4 mt-1">
                  {guide.steps.slice(0, 5).map((s, i) => (
                    <li key={i} className="text-sm">{s.title}</li>
                  ))}
                  {guide.steps.length > 5 && <li className="text-sm text-gray-400">...还有 {guide.steps.length - 5} 步</li>}
                </ol>
              </div>
            )}
          </div>
        );
        break;
    }

    Modal.info({
      title,
      width: type === 'news' ? 720 : 600,
      content: (
        <div className="space-y-4">
          {extra}
          {type === 'news' ? (
            <div className="bg-slate-900 rounded-lg p-4 max-h-[60vh] overflow-y-auto">
              <BlogRenderContent content={contentText} />
            </div>
          ) : (
            <div className="text-gray-700 whitespace-pre-line">{contentText}</div>
          )}
        </div>
      ),
    });
  };

  // 编辑内容
  const handleEditContent = (content: NewsArticle | Review | Guide | CommunityPost, type: ContentType) => {
    setEditingContent({ type, data: content });
    const formValues: any = {
      ...content,
      tags: Array.isArray(content.tags) ? content.tags.join(',') : content.tags,
      // 前端类型用 imageUrl，表单字段用 coverImageUrl，做映射
      coverImageUrl: (content as any).coverImageUrl || (content as any).imageUrl || '',
    };
    // 处理 Guide 特有的 difficulty 字段
    if (type === 'guides') {
      formValues.difficulty = (content as Guide).difficulty || 'medium';
      formValues.estimatedMinutes = (content as Guide).estimatedMinutes;
    }
    // 新闻：表单字段用 excerpt（对应后端 excerpt 列），回填时从 summary 映射
    if (type === 'news') {
      formValues.excerpt = (content as NewsArticle).summary || (content as any).excerpt || '';
    }
    form.setFieldsValue(formValues);
    setIsModalVisible(true);
  };

  // 删除内容
  const handleDeleteContent = async (id: string | number, type: ContentType) => {
    try {
      const idStr = String(id);
      switch (type) {
        case 'news':
          await apiService.deleteNewsArticle(idStr);
          setNews(prev => prev.filter(item => String(item.id) !== idStr));
          break;
        case 'reviews':
          await apiService.deleteReview(idStr);
          setReviews(prev => prev.filter(item => String(item.id) !== idStr));
          break;
        case 'guides':
          await apiService.deleteGuide(idStr);
          setGuides(prev => prev.filter(item => String(item.id) !== idStr));
          break;
        case 'community':
          await apiService.deleteCommunityPost(idStr);
          setCommunityPosts(prev => prev.filter(item => String(item.id) !== idStr));
          break;
        case 'blogs':
          await apiService.deleteBlogPost(idStr);
          setBlogs(prev => prev.filter(item => String(item.id) !== idStr));
          break;
      }
      message.success(`${type} deleted successfully`);
    } catch (err) {
      console.error(`删除${type}失败:`, err);
      message.error(`Failed to delete ${type}`);
    }
  };

  // 分类管理：添加
  const handleAddCategory = () => {
    setEditingCategory(null);
    categoryForm.resetFields();
    setIsCategoryModalVisible(true);
  };

  // 分类管理：编辑
  const handleEditCategory = (category: NewsCategory) => {
    setEditingCategory(category);
    categoryForm.setFieldsValue({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      sortOrder: category.sortOrder,
    });
    setIsCategoryModalVisible(true);
  };

  // 分类管理：删除
  const handleDeleteCategory = async (id: string) => {
    try {
      await apiService.deleteNewsCategory(id);
      message.success('分类删除成功');
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('删除分类失败:', err);
      message.error('删除分类失败');
    }
  };

  // 分类管理：保存
  const handleCategorySubmit = async (values: Record<string, unknown>) => {
    try {
      if (editingCategory) {
        await apiService.updateNewsCategory(editingCategory.id, values);
        message.success('分类更新成功');
      } else {
        await apiService.createNewsCategory(values as any);
        message.success('分类创建成功');
      }
      setIsCategoryModalVisible(false);
      const data = await apiService.getNewsCategories();
      setCategories(data);
    } catch (err) {
      console.error('保存分类失败:', err);
      message.error('保存分类失败');
    }
  };

  // 模板管理：添加
  const handleAddTemplate = () => {
    setEditingTemplate(null);
    templateForm.resetFields();
    setIsTemplateModalVisible(true);
  };

  // 模板管理：编辑
  const handleEditTemplate = (template: ReviewTemplate) => {
    setEditingTemplate(template);
    templateForm.setFieldsValue({
      name: template.name,
      description: template.description || '',
      sections: typeof template.sections === 'string' ? template.sections : JSON.stringify(template.sections, null, 2),
      defaultScores: template.defaultScores ? (typeof template.defaultScores === 'string' ? template.defaultScores : JSON.stringify(template.defaultScores, null, 2)) : '',
      scoreDimensions: template.scoreDimensions ? (typeof template.scoreDimensions === 'string' ? template.scoreDimensions : JSON.stringify(template.scoreDimensions, null, 2)) : '',
      sortOrder: template.sortOrder,
    });
    setIsTemplateModalVisible(true);
  };

  // 模板管理：删除
  const handleDeleteTemplate = async (id: string) => {
    try {
      await apiService.deleteReviewTemplate(id);
      message.success('模板删除成功');
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('删除模板失败:', err);
      message.error('删除模板失败');
    }
  };

  // 模板管理：保存
  const handleTemplateSubmit = async (values: Record<string, unknown>) => {
    try {
      const data: any = {
        name: values.name,
        description: values.description || undefined,
        sections: values.sections,
        defaultScores: values.defaultScores || undefined,
        scoreDimensions: values.scoreDimensions || undefined,
        sortOrder: values.sortOrder ? Number(values.sortOrder) : 0,
      };

      if (editingTemplate) {
        await apiService.updateReviewTemplate(editingTemplate.id, data);
        message.success('模板更新成功');
      } else {
        await apiService.createReviewTemplate(data);
        message.success('模板创建成功');
      }
      setIsTemplateModalVisible(false);
      const result = await apiService.getReviewTemplates();
      setTemplates(result);
    } catch (err) {
      console.error('保存模板失败:', err);
      message.error('保存模板失败');
    }
  };

  // 添加新内容
  const handleAddContent = () => {
    // 创建默认内容数据
    const defaultContent = {
      id: 0,
      title: '',
      content: '',
      author: '',
      publishDate: new Date().toISOString().split('T')[0],
      tags: [],
      likes: 0,
    };

    let data: NewsArticle | Review | CommunityPost;

    switch (activeTab) {
      case 'news':
        data = {
          ...defaultContent,
          summary: '',
          category: '',
          imageUrl: '',
          views: 0,
        } as unknown as NewsArticle;
        break;
      case 'reviews':
        data = {
          ...defaultContent,
          gameId: 0,
          gameTitle: '',
          rating: 0,
          comments: 0,
        } as unknown as Review;
        break;
      case 'community':
        data = {
          ...defaultContent,
          comments: 0,
          category: '',
        } as unknown as CommunityPost;
        break;
      case 'blogs':
        data = {
          ...defaultContent,
          summary: '',
          category: '博客',
          imageUrl: '',
          views: 0,
        } as unknown as NewsArticle;
        break;
    }

    setEditingContent({ type: activeTab, data });
    form.resetFields();
    setIsModalVisible(true);
  };

  // 处理表单提交
  const handleSubmit = async (values: Record<string, unknown>) => {
    const { type } = editingContent || { type: activeTab };
    const editingContentData = editingContent?.data;

    const contentData = {
      ...values,
      tags: values.tags ? String(values.tags).split(',').map((t: string) => t.trim()) : [],
    };

    try {
      if (editingContentData?.id) {
        // 更新内容
        switch (type) {
          case 'news':
            await apiService.updateNewsArticle(String(editingContentData.id), contentData);
            break;
          case 'reviews':
            await apiService.updateReview(String(editingContentData.id), contentData);
            break;
          case 'community':
            await apiService.updateCommunityPost(String(editingContentData.id), contentData);
            break;
          case 'blogs':
            await apiService.updateBlogPost(String(editingContentData.id), contentData);
            break;
        }
        message.success('Content updated successfully');
      } else {
        // 创建内容
        switch (type) {
          case 'news':
            await apiService.createNewsArticle(contentData);
            break;
          case 'reviews':
            await apiService.createReview(contentData as any);
            break;
          case 'community':
            await apiService.createCommunityPost(contentData);
            break;
          case 'blogs':
            await apiService.createBlogPost(contentData as any);
            break;
        }
        message.success('Content created successfully');
      }
      setIsModalVisible(false);
      await fetchContent();
    } catch (err) {
      console.error('保存内容失败:', err);
      message.error((err as any)?.message || 'Failed to save content');
    }
  };

  // 获取当前表格列
  const getCurrentColumns = () => {
    switch (activeTab) {
      case 'news':
        return newsColumns as any[];
      case 'reviews':
        return reviewColumns as any[];
      case 'community':
        return communityColumns as any[];
    }
  };

  // 获取当前数据
  const getCurrentTableData = () => {
    const current = getCurrentContent();
    if (!current) return [];
    return current.data as any[];
  };

  return (
    <div className="content-page">
      <SEO title="内容管理 | GameHub" description="管理新闻、评测、社区帖子等内容" keywords="内容管理, 新闻管理, 评测管理, 社区管理, 内容审核" noindex />
      <h1 className="text-2xl font-bold mb-6">Content Management</h1>

      {/* 内容统计 */}
      {activeTab !== 'blogspaces' && (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {Object.entries(contentStats).map(([type, stats]) => (
          <div
            key={type}
            className={`bg-white p-4 rounded-lg border ${
              activeTab === type ? 'border-primary-300 shadow-sm' : 'border-gray-200'
            } cursor-pointer hover:border-primary-200 transition-colors`}
            onClick={() => {
              const tab = type as ContentType;
              const basePath = location.pathname.replace(/\/content(\/.*)?$/, '/content');
              navigate(`${basePath}/${tab === 'news' ? '' : tab}`, { replace: true });
            }}
          >
            <div className="text-sm text-gray-500 mb-1 capitalize">{type}</div>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.published} published • {stats.today} today
            </div>
          </div>
        ))}
      </div>
      )}

      {/* 操作栏 */}
      {activeTab !== 'blogspaces' && (
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex-1">
          <Search
            placeholder={`Search ${activeTab}...`}
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            onSearch={handleSearch}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full sm:w-auto"
            style={{ maxWidth: 400 }}
          />
        </div>
        <ActionButtons
          onAdd={handleAddContent}
          onRefresh={fetchContent}
          showAdd={true}
        />
      </div>
      )}

      {/* 内容标签页 */}
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        type="card"
        className="content-tabs"
      >
        <TabPane tab="新闻" key="news">
          <Table
            columns={getCurrentColumns()}
            dataSource={getCurrentTableData()}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Total ${total} articles`,
            }}
            className="shadow-sm border-gray-200"
          />
        </TabPane><TabPane tab="博客" key="blogs">
          <Table dataSource={blogs} rowKey="id" loading={loading}
            pagination={{ pageSize: 10, showTotal: t => `共 ${t} 篇` }}
            columns={[
              { title: '标题', dataIndex: 'title', key: 'title', width: 200, ellipsis: true,
                render: (t: string) => <span className="font-medium">{t}</span> },
              { title: '空间', dataIndex: 'spaceName', key: 'spaceName', width: 120,
                render: (v: string) => v || '-' },
              { title: '作者', dataIndex: 'author', key: 'author', width: 100 },
              { title: '浏览', dataIndex: 'views', key: 'views', width: 70 },
              { title: '点赞', dataIndex: 'likes', key: 'likes', width: 70 },
              { title: '收藏', dataIndex: 'favorites', key: 'favorites', width: 70,
                render: (v: number) => v || 0 },
              { title: '日期', dataIndex: 'publishDate', key: 'publishDate', width: 120,
                render: (d: string) => d ? new Date(d).toLocaleDateString('zh-CN') : '-' },
              { title: '操作', key: 'actions', width: 180,
                render: (_: any, record: any) => (
                  <Space>
                    <Button type="text" icon={<EyeOutlined />} size="small" className="text-blue-500"
                      onClick={() => window.open(`/blog/${record.id}`, '_blank')} />
                    <Button type="text" icon={<EditOutlined />} size="small" className="text-green-500"
                      onClick={() => handleEditContent(record, 'blogs')} />
                    <Popconfirm title="确定删除？" onConfirm={() => handleDeleteContent(record.id, 'blogs')} okText="是" cancelText="否">
                      <Button type="text" icon={<DeleteOutlined />} size="small" danger />
                    </Popconfirm>
                  </Space>
                ),
              },
            ]} />
        </TabPane><TabPane tab="攻略" key="guides">
          <div className="mb-4 flex justify-between items-center">
            <div>
              <span className="text-base font-medium">Guides</span>
              <span className="ml-2 text-sm text-gray-500">({guides.length} guides)</span>
            </div>
          </div>
          <Table
            dataSource={guides}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            className="shadow-sm border-gray-200"
            columns={[
              {
                title: 'Title',
                dataIndex: 'title',
                key: 'title',
                render: (text: string) => <span className="font-medium">{text}</span>,
              },
              {
                title: 'Game',
                dataIndex: 'gameTitle',
                key: 'gameTitle',
              },
              {
                title: 'Author',
                dataIndex: 'author',
                key: 'author',
              },
              {
                title: 'Difficulty',
                dataIndex: 'difficulty',
                key: 'difficulty',
                render: (diff: string) => {
                  const colors: Record<string, string> = { easy: 'green', medium: 'blue', hard: 'orange', expert: 'red' };
                  const labels: Record<string, string> = { easy: '简单', medium: '中等', hard: '困难', expert: '专家' };
                  return <Tag color={colors[diff] || 'blue'}>{labels[diff] || diff}</Tag>;
                },
              },
              {
                title: 'Likes',
                dataIndex: 'likes',
                key: 'likes',
                sorter: (a: any, b: any) => a.likes - b.likes,
              },
              {
                title: 'Views',
                dataIndex: 'views',
                key: 'views',
                sorter: (a: any, b: any) => a.views - b.views,
              },
              {
                title: '审核',
                key: 'reviewStatus',
                width: 150,
                render: (_: unknown, record: any) => (
                  <Tag color={record.reviewStatus === 'approved' ? 'success' : record.reviewStatus === 'rejected' ? 'error' : 'warning'}>
                    {record.reviewStatus === 'approved' ? '已通过' : record.reviewStatus === 'rejected' ? '已拒绝' : '待审核'}
                  </Tag>
                ),
              },
              {
                title: 'Actions',
                key: 'actions',
                width: 200,
                render: (_: unknown, record: Guide) => (
                  <Space size="small">
                    <Button
                      type="text"
                      icon={<EyeOutlined />}
                      size="small"
                      onClick={() => handleViewContent(record, 'guides')}
                      className="text-blue-500 hover:text-blue-700"
                    />
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      size="small"
                      onClick={() => handleEditContent(record, 'guides')}
                      className="text-green-500 hover:text-green-700"
                    />
                    <Popconfirm
                      title="Delete Guide"
                      description={`Are you sure you want to delete "${record.title}"?`}
                      onConfirm={async () => {
                        try {
                          await apiService.deleteBlogPost(record.id);
                          message.success('攻略删除成功');
                          setGuides(prev => prev.filter(g => g.id !== record.id));
                        } catch {
                          message.error('删除攻略失败');
                        }
                      }}
                      okText="Yes"
                      cancelText="No"
                    >
                      <Button type="text" icon={<DeleteOutlined />} size="small" danger />
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
          />
        </TabPane><TabPane tab="评测" key="reviews">
          <Table
            columns={getCurrentColumns()}
            dataSource={getCurrentTableData()}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Total ${total} reviews`,
            }}
            className="shadow-sm border-gray-200"
          />
        </TabPane><TabPane tab="论坛" key="community">
          <Table
            columns={getCurrentColumns()}
            dataSource={getCurrentTableData()}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Total ${total} posts`,
            }}
            className="shadow-sm border-gray-200"
          />
        </TabPane><TabPane tab="博客空间" key="blogspaces">
          <div className="mb-4 flex justify-between items-center">
            <span className="text-base font-medium">博客空间管理 ({blogSpaces.length})</span>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingSpaceId(''); spaceForm.resetFields(); setSpaceModalVisible(true); }}>新建空间</Button>
          </div>
          <Table dataSource={blogSpaces} rowKey="id" pagination={false}
            columns={[
              { title: '名称', dataIndex: 'name', key: 'name' },
              { title: 'Slug', dataIndex: 'slug', key: 'slug' },
              { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
              { title: '排序', dataIndex: 'sortOrder', key: 'sortOrder', width: 80 },
              { title: '状态', dataIndex: 'isActive', key: 'isActive', width: 80, render: (v: boolean) => v ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag> },
              { title: '操作', key: 'action', width: 160, render: (_: any, record: any) => (
                <Space>
                  <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingSpaceId(record.id); spaceForm.setFieldsValue(record); setSpaceModalVisible(true); }}>编辑</Button>
                  <Popconfirm title="确定删除？" onConfirm={async () => { await apiService.deleteBlogSpace(record.id); setBlogSpaces(prev => prev.filter(s => s.id !== record.id)); message.success('已删除'); }}>
                    <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
                  </Popconfirm>
                </Space>
              )},
            ]} />
        </TabPane>
      </Tabs>

      {/* 添加/编辑内容模态框 */}
      <Modal
        title={editingContent?.data.id ? `Edit ${activeTab.slice(0, -1)}` : `Add New ${activeTab.slice(0, -1)}`}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={activeTab === 'blogs' || activeTab === 'news' ? 1100 : 600}
        getContainer={false}
        destroyOnHidden
        styles={{ body: { overflow: 'visible', maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            category: activeTab === 'news' ? '游戏新闻' : activeTab === 'community' ? '攻略讨论' : '',
          }}
        >
          {activeTab === 'news' && (
            <>
              <Tabs defaultActiveKey="zh">
                <TabPane tab="简体中文（默认）" key="zh">
                  <Form.Item
                    label="标题"
                    name="title"
                    rules={[{ required: true, message: 'Please enter title' }]}
                  >
                    <Input placeholder="Enter news title" />
                  </Form.Item>
                  <Form.Item label="摘要" name="excerpt">
                    <TextArea rows={2} placeholder="Enter news summary (optional)" />
                  </Form.Item>
                  <Form.Item
                    label="正文"
                    name="content"
                    rules={[{ required: true, message: 'Please enter content' }]}
                  >
                    <BlogEditor />
                  </Form.Item>
                </TabPane>
                {NEWS_TRANSLATION_LANGS.map(({ key, label }) => (
                  <TabPane tab={label} key={key}>
                    <Form.Item
                      label="标题"
                      name={['translations', key, 'title']}
                    >
                      <Input placeholder={`${label} title`} />
                    </Form.Item>
                    <Form.Item label="摘要" name={['translations', key, 'excerpt']}>
                      <TextArea rows={2} placeholder={`${label} summary`} />
                    </Form.Item>
                    <Form.Item label="正文" name={['translations', key, 'content']}>
                      <BlogEditor />
                    </Form.Item>
                  </TabPane>
                ))}
              </Tabs>

              <Form.Item
                label="主标题 / Main Title（URL 后缀）"
                name="maintitle"
                rules={[{ required: true, message: 'Please enter main title' }]}
                tooltip="用于生成新闻链接的后缀（slug），例如 /news/your-main-title"
              >
                <Input placeholder="Enter main title (used for URL slug)" />
              </Form.Item>

              <Form.Item
                label="Author"
                name="author"
                rules={[{ required: true, message: 'Please enter author' }]}
              >
                <Input placeholder="Enter author name" />
              </Form.Item>

              <Form.Item
                label="Category"
                name="category"
                rules={[{ required: true, message: 'Please select category' }]}
              >
                <Select placeholder="Select category">
                  {categories.filter(c => c.isActive).map(cat => (
                    <Option key={cat.id} value={cat.name}>{cat.name}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                label="配图"
                name="coverImageUrl"
                tooltip="详情页显示的配图，可上传或粘贴URL"
              >
                <CoverImageUpload />
              </Form.Item>

              <Form.Item
                label="置顶"
                name="isPinned"
                valuePropName="checked"
                tooltip="置顶新闻将始终排在列表最前面"
              >
                <Switch checkedChildren="已置顶" unCheckedChildren="未置顶" />
              </Form.Item>
            </>
          )}


          {activeTab === 'reviews' && (
            <>
              <Form.Item
                label="Review Title"
                name="title"
                rules={[{ required: true, message: 'Please enter review title' }]}
              >
                <Input placeholder="Enter review title" />
              </Form.Item>

              <Form.Item
                label="Game Title"
                name="gameTitle"
                rules={[{ required: true, message: 'Please enter game title' }]}
              >
                <Input placeholder="Enter game title" />
              </Form.Item>

              <Form.Item
                label="Author"
                name="author"
                rules={[{ required: true, message: 'Please enter author' }]}
              >
                <Input placeholder="Enter author name" />
              </Form.Item>

              <Form.Item
                label="Rating"
                name="rating"
                rules={[{ required: true, message: 'Please enter rating' }]}
              >
                <Input type="number" min={0} max={5} step={0.1} placeholder="0.0 - 5.0" />
              </Form.Item>

              <Form.Item label="所属空间" name="spaceId">
                <Select placeholder="选择博客空间（可选）" allowClear>
                  {blogSpaces.filter(s => s.isActive).map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                </Select>
              </Form.Item>
            </>
          )}

          {activeTab === 'community' && (
            <>
              <Form.Item
                label="Post Title"
                name="title"
                rules={[{ required: true, message: 'Please enter post title' }]}
              >
                <Input placeholder="Enter post title" />
              </Form.Item>

              <Form.Item
                label="Author"
                name="author"
                rules={[{ required: true, message: 'Please enter author' }]}
              >
                <Input placeholder="Enter author name" />
              </Form.Item>

              <Form.Item
                label="Category"
                name="category"
                rules={[{ required: true, message: 'Please select category' }]}
              >
                <Select placeholder="Select category">
                  <Option value="攻略讨论">攻略讨论</Option>
                  <Option value="组队招募">组队招募</Option>
                  <Option value="游戏分享">游戏分享</Option>
                  <Option value="技术问题">技术问题</Option>
                  <Option value="意见建议">意见建议</Option>
                </Select>
              </Form.Item>
            </>
          )}

          {activeTab === 'guides' && (
            <>
              <Form.Item
                label="Guide Title"
                name="title"
                rules={[{ required: true, message: 'Please enter guide title' }]}
              >
                <Input placeholder="Enter guide title" />
              </Form.Item>

              <Form.Item
                label="Game Title"
                name="gameTitle"
                rules={[{ required: true, message: 'Please enter game title' }]}
              >
                <Input placeholder="Enter game title" />
              </Form.Item>

              <Form.Item
                label="Author"
                name="author"
                rules={[{ required: true, message: 'Please enter author' }]}
              >
                <Input placeholder="Enter author name" />
              </Form.Item>

              <Form.Item
                label="Difficulty"
                name="difficulty"
                rules={[{ required: true, message: 'Please select difficulty' }]}
              >
                <Select placeholder="Select difficulty">
                  <Option value="easy">简单</Option>
                  <Option value="medium">中等</Option>
                  <Option value="hard">困难</Option>
                  <Option value="expert">专家</Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="Estimated Minutes"
                name="estimatedMinutes"
              >
                <Input type="number" min={0} placeholder="e.g. 30" />
              </Form.Item>

              <Form.Item label="所属空间" name="spaceId">
                <Select placeholder="选择博客空间（可选）" allowClear>
                  {blogSpaces.filter(s => s.isActive).map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                </Select>
              </Form.Item>
            </>
          )}

          {activeTab === 'blogs' && (
            <>
              <Tabs defaultActiveKey="zh">
                <TabPane tab="简体中文（默认）" key="zh">
                  <Form.Item
                    label="标题"
                    name="title"
                    rules={[{ required: true, message: '请输入标题' }]}
                  >
                    <Input placeholder="博客标题" />
                  </Form.Item>
                  <Form.Item label="摘要" name="excerpt">
                    <TextArea rows={2} placeholder="博客摘要（可选）" />
                  </Form.Item>
                  <Form.Item
                    label="正文"
                    name="content"
                    rules={[{ required: true, message: '请输入正文' }]}
                  >
                    <BlogEditor />
                  </Form.Item>
                </TabPane>
                {NEWS_TRANSLATION_LANGS.map(({ key, label }) => (
                  <TabPane tab={label} key={key}>
                    <Form.Item label="标题" name={['translations', key, 'title']}>
                      <Input placeholder={`${label} title`} />
                    </Form.Item>
                    <Form.Item label="摘要" name={['translations', key, 'excerpt']}>
                      <TextArea rows={2} placeholder={`${label} summary`} />
                    </Form.Item>
                    <Form.Item label="正文" name={['translations', key, 'content']}>
                      <BlogEditor />
                    </Form.Item>
                  </TabPane>
                ))}
              </Tabs>

              <Form.Item
                label="主标题 / Main Title（URL 后缀）"
                name="maintitle"
                rules={[{ required: true, message: '请输入主标题' }]}
                tooltip="用于生成博客链接的后缀（slug），例如 /blog/your-main-title"
              >
                <Input placeholder="Enter main title (used for URL slug)" />
              </Form.Item>

              <Form.Item label="作者" name="author" rules={[{ required: true, message: '请输入作者' }]}>
                <Input placeholder="作者名" />
              </Form.Item>
              <Form.Item label="所属空间" name="spaceId" rules={[{ required: true, message: '请选择空间' }]}>
                <Select placeholder="选择博客空间">
                  {blogSpaces.filter(s => s.isActive).map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                </Select>
              </Form.Item>
              <Form.Item label="分类" name="category" initialValue="博客">
                <Select>
                  <Option value="博客">博客</Option>
                  <Option value="博客/技术">博客/技术</Option>
                  <Option value="博客/游戏">博客/游戏</Option>
                  <Option value="博客/杂谈">博客/杂谈</Option>
                </Select>
              </Form.Item>
            </>
          )}

          {activeTab !== 'news' && activeTab !== 'blogs' && (
            <Form.Item
              label="Content"
              name="content"
              rules={[{ required: true, message: 'Please enter content' }]}
            >
              <TextArea rows={6} placeholder="Enter content..." />
            </Form.Item>
          )}


          <Form.Item className="mb-0">
            <div className="flex justify-end space-x-2">
              <Button onClick={() => setIsModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingContent?.data.id ? 'Update' : 'Add'}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* 分类管理模态框 */}
      <Modal
        title={editingCategory ? 'Edit Category' : 'Add Category'}
        open={isCategoryModalVisible}
        onCancel={() => setIsCategoryModalVisible(false)}
        footer={null}
        width={500}
        destroyOnClose
      >
        <Form
          form={categoryForm}
          layout="vertical"
          onFinish={handleCategorySubmit}
        >
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Please enter category name' }]}
          >
            <Input placeholder="e.g. 行业动态" />
          </Form.Item>

          <Form.Item
            label="Slug"
            name="slug"
            rules={[{ required: true, message: 'Please enter category slug' }]}
          >
            <Input placeholder="e.g. industry" />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
          >
            <Input.TextArea rows={2} placeholder="Category description (optional)" />
          </Form.Item>

          <Form.Item
            label="Sort Order"
            name="sortOrder"
            rules={[{ type: 'number', min: 0, message: 'Must be >= 0' }]}
          >
            <Input type="number" min={0} placeholder="0" />
          </Form.Item>

          <Form.Item className="mb-0">
            <div className="flex justify-end space-x-2">
              <Button onClick={() => setIsCategoryModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingCategory ? 'Update' : 'Create'}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* 博客空间编辑模态框 */}
      <Modal title={editingSpaceId ? '编辑空间' : '添加空间'} open={spaceModalVisible}
        onCancel={() => setSpaceModalVisible(false)} footer={null} width={500}>
        <Form form={spaceForm} layout="vertical" onFinish={async (v: any) => {
          try {
            if (editingSpaceId) await apiService.updateBlogSpace(editingSpaceId, v);
            else await apiService.createBlogSpace(v);
            message.success('保存成功'); setSpaceModalVisible(false);
            setBlogSpaces(await apiService.getBlogSpaces() || []);
          } catch { message.error('保存失败'); }
        }}>
          <Form.Item label="名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="封面图片" name="coverImageUrl"><CoverImageUpload /></Form.Item>
          <Form.Item label="简介" name="description"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item label="排序" name="sortOrder"><Input type="number" /></Form.Item>
          <Form.Item label="状态" name="isActive" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>{editingSpaceId ? '更新' : '创建'}</Button>
        </Form>
      </Modal>

      {/* 评测模板模态框 */}
      <Modal
        title={editingTemplate ? 'Edit Template' : 'Add Template'}
        open={isTemplateModalVisible}
        onCancel={() => setIsTemplateModalVisible(false)}
        footer={null}
        width={700}
        destroyOnClose
      >
        <Form
          form={templateForm}
          layout="vertical"
          onFinish={handleTemplateSubmit}
        >
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Please enter template name' }]}
          >
            <Input placeholder="e.g. 标准评测模板" />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
          >
            <Input.TextArea rows={2} placeholder="Template description (optional)" />
          </Form.Item>

          <Form.Item
            label="Sections (JSON)"
            name="sections"
            rules={[{ required: true, message: 'Please enter sections config' }]}
            extra='JSON array of section objects, e.g. [{"key":"pros","title":"优点","type":"list"}]'
          >
            <Input.TextArea rows={4} placeholder='[{"key":"pros","title":"优点","type":"list"}]' />
          </Form.Item>

          <Form.Item
            label="Default Scores (JSON, optional)"
            name="defaultScores"
            extra='JSON object, e.g. {"gameplay":3.5,"graphics":3.5}'
          >
            <Input.TextArea rows={3} placeholder='{"gameplay":3.5,"graphics":3.5}' />
          </Form.Item>

          <Form.Item
            label="Score Dimensions (JSON, optional)"
            name="scoreDimensions"
            extra='JSON array, e.g. [{"key":"gameplay","label":"游戏性"}]'
          >
            <Input.TextArea rows={3} placeholder='[{"key":"gameplay","label":"游戏性"}]' />
          </Form.Item>

          <Form.Item
            label="Sort Order"
            name="sortOrder"
            rules={[{ type: 'number', min: 0, message: 'Must be >= 0' }]}
          >
            <Input type="number" min={0} placeholder="0" />
          </Form.Item>

          <Form.Item className="mb-0">
            <div className="flex justify-end space-x-2">
              <Button onClick={() => setIsTemplateModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingTemplate ? 'Update' : 'Create'}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* 快捷入口 */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">内容管理</h3>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">前往审核队列统一处理待审核内容</p>
            </div>
            <Button type="primary" onClick={() => navigate('/admin/review-queue')}>
              审核队列
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        .content-page :global(.ant-table-thead > tr > th) {
          background-color: #fafafa;
          font-weight: 600;
        }
        .content-page :global(.ant-table-tbody > tr:hover > td) {
          background-color: #fafafa !important;
        }
        .content-page :global(.content-tabs .ant-tabs-nav) {
          margin-bottom: 16px;
        }
        .content-page :global(.content-tabs .ant-tabs-tab) {
          padding: 12px 24px;
        }
      `}</style>
    </div>
  );
};

export default Content;