import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Typography, Input, Spin, Alert, Empty, Pagination, Tag, Button } from 'antd';
import { SearchOutlined, ArrowLeftOutlined, CalendarOutlined, EyeOutlined, LikeOutlined, StarOutlined, EditOutlined } from '@ant-design/icons';
import { useBlogPosts } from '../api/hooks';
import apiService from '../api';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';

const { Title } = Typography;

const BlogSpacePage = () => {
  const { slug, lang } = useParams<{ slug: string; lang: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [spaces, setSpaces] = useState<any[]>([]);
  const space = spaces.find(s => s.slug === slug);
  const spaceId = space?.id;
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<any>(null);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    if (!spaceId) return;
    setIsLoading(true); setIsError(false);
    apiService.getSpaceContent(spaceId, { postType: typeFilter !== 'all' ? typeFilter : undefined })
      .then((res: any) => { setPosts(res.articles || []); setIsLoading(false); })
      .catch((e: any) => { setError(e); setIsError(true); setIsLoading(false); });
  }, [spaceId, typeFilter]);

  useEffect(() => {
    import('../api').then(m => m.default.getBlogSpaces().then(d => setSpaces(d||[])));
  }, []);

  const filteredPosts = useMemo(() => {
    let r = [...posts];
    if (searchText) { const q = searchText.toLowerCase(); r = r.filter(p => p.title?.toLowerCase().includes(q) || (p.excerpt || '').toLowerCase().includes(q)); }
    return r;
  }, [posts, searchText]);

  const paginatedPosts = filteredPosts.slice((currentPage-1)*pageSize, currentPage*pageSize);
  const formatDate = (d: string) => { try { return new Date(d).toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric'}); } catch { return d; } };

  return (
    <div className="min-h-screen bg-dark-900">
      <SEO title={`${space?.name || slug} 博客 | GameHub`} description={`${space?.name || slug} 相关博客文章`} canonical={`/${lang||'cn'}/blog/space/${slug}`} />

      <div className="py-6">
        <Button type="text" className="!text-gray-400 hover:!text-white !pl-0 mb-4" icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/${lang||'cn'}/blog`)}>返回博客首页</Button>

        <div className="flex items-center justify-between mb-2">
          <Title level={1} className="!text-gray-100">{space?.name || slug}</Title>
        </div>
        <p className="text-gray-400 mb-4">{space?.description || ''}</p>

        <div className="mb-6">
          <Input size="large" placeholder="搜索文章..." prefix={<SearchOutlined />}
            value={searchText} onChange={e => setSearchText(e.target.value)} allowClear />
          <div className="flex gap-2 mt-3">
            {[
              { key: 'all', label: '全部' },
              { key: 'blog', label: '博客' },
              { key: 'guide', label: '攻略' },
              { key: 'review', label: '评测' },
            ].map(item => {
              const isActive = typeFilter === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => { setTypeFilter(item.key); setCurrentPage(1); }}
                  className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-200
                    ${isActive
                      ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30 hover:bg-blue-400'
                      : 'bg-dark-700 text-gray-400 hover:text-white hover:bg-blue-500/20 hover:border-blue-500/50 border border-dark-600'
                    }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {isLoading && <div className="flex justify-center py-20"><Spin size="large" /></div>}
        {isError && <Alert type="error" message="加载失败" description={(error as any)?.message} showIcon className="mb-4" />}

        {!isLoading && !isError && filteredPosts.length > 0 && (
          <>
            <div className="bg-dark-800 rounded-lg border border-dark-700 divide-y divide-dark-700">
              {paginatedPosts.map(post => (
                <Link to={`/${lang||'cn'}/blog/${post.id}`} key={post.id} className="block no-underline">
                  <div className="flex items-start gap-4 px-5 py-4 hover:bg-dark-750 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        {post.postType === 'review' ? (
                          <><Tag color="green" className="text-xs m-0">评测</Tag>
                          {post.rating != null && <Tag color="gold" className="text-xs m-0">{post.rating} 分</Tag>}</>
                        ) : post.postType === 'guide' ? (
                          <Tag color="purple" className="text-xs m-0">攻略</Tag>
                        ) : (
                          <Tag color="blue" className="text-xs m-0">{post.category || '博客'}</Tag>
                        )}
                        {post.featured && <Tag color="orange" className="text-xs m-0">精选</Tag>}
                      </div>
                      <h2 className="text-base font-semibold !text-gray-100 group-hover:!text-blue-400 line-clamp-1 mb-1">{post.title}</h2>
                      <p className="text-sm text-gray-400 line-clamp-2 mb-2">{post.excerpt}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="text-gray-400">{post.author}</span>
                        <span><CalendarOutlined className="mr-1" />{formatDate(post.publishDate)}</span>
                        <span><EyeOutlined className="mr-1" />{post.views.toLocaleString()} 浏览</span>
                        <span><LikeOutlined className="mr-1" />{post.likes.toLocaleString()} 赞</span>
                        <span><StarOutlined className="mr-1" />{(post as any).favorites || 0} 收藏</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {filteredPosts.length > pageSize && (
              <div className="flex justify-center mt-8">
                <Pagination current={currentPage} pageSize={pageSize} total={filteredPosts.length}
                  onChange={setCurrentPage} showQuickJumper showTotal={t => `共 ${t} 篇`} />
              </div>
            )}
          </>
        )}

        {!isLoading && !isError && filteredPosts.length === 0 && (
          <Empty description="该空间暂无博客文章" />
        )}
      </div>
    </div>
  );
};

export default BlogSpacePage;
