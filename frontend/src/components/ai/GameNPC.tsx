/**
 * GameNPC - AI 游戏百科组件
 *
 * 一站式游戏内容搜索平台，包含三个标签页：
 * - 攻略：游戏攻略文章，支持难度标签和详情查看
 * - 视频：游戏相关视频，支持封面预览和播放
 * - 二创：玩家创作内容展示
 *
 * 搜索时调用后端 API，未搜索时展示默认热门内容
 */
import { useState, useMemo } from 'react';
import { Card, Input, Tabs, Tag, Typography, Row, Col, Empty, Button, Spin, Modal } from 'antd';
import { SearchOutlined, PlayCircleOutlined, FileTextOutlined, HeartOutlined, RightOutlined, LoadingOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useGameNpcSearch, useGuides, useTrendingContent } from '../../api/hooks';

const { Title, Text } = Typography;

/**
 * GameNPC 主组件
 * 管理搜索、标签页切换、视频播放弹窗和攻略详情弹窗
 */
const GameNPC: React.FC = () => {
  /* ====== 搜索状态 ====== */
  const [searchText, setSearchText] = useState('');       // 搜索输入文本
  const [hasSearched, setHasSearched] = useState(false);   // 是否已执行过搜索
  const [readingGuide, setReadingGuide] = useState<any>(null);  // 正在查看的攻略详情
  const { mutateAsync: search, isPending, data: result, reset } = useGameNpcSearch();

  /* ====== 默认数据 hooks（未搜索时展示） ====== */
  const { data: defaultGuides = [], isLoading: guidesLoading } = useGuides({ limit: 6 });
  const { data: trendingData = [], isLoading: trendingLoading } = useTrendingContent(12);

  /**
   * 将 trending 热门内容映射为视频格式
   * 取前 6 条数据，添加随机时长和播放量
   */
  const defaultVideos = useMemo(() => {
    return trendingData.slice(0, 6).map((item) => ({
      title: item.title,
      author: '热门推荐',
      views: Math.floor((item.likes || 0) / 10),
      duration: `${Math.floor(Math.random() * 15) + 3}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
      coverImageUrl: item.coverImageUrl,
      url: '',
    }));
  }, [trendingData]);

  /**
   * 将 trending 内容映射为二创格式
   * 取第 6-12 条数据，随机分配创作类型（插画、同人、Cosplay、手办）
   */
  const defaultFanart = useMemo(() => {
    const types = ['插画', '同人', 'Cosplay', '手办'];
    return trendingData.slice(6, 12).map((item) => ({
      title: item.title,
      author: '玩家创作',
      type: types[Math.floor(Math.random() * types.length)],
      likes: item.likes || Math.floor(Math.random() * 500) + 100,
    }));
  }, [trendingData]);

  const handleSearch = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      reset();
      setHasSearched(false);
      return;
    }
    setHasSearched(true);
    search(trimmed);
  };

  // 根据搜索状态决定显示数据
  const guides = hasSearched ? (result?.guides || []) : defaultGuides;
  const videos = hasSearched ? (result?.videos || []) : defaultVideos;
  const fanart = hasSearched ? (result?.fanart || []) : defaultFanart;
  const isLoadingDefault = !hasSearched && (guidesLoading || trendingLoading);

  // 视频按平台分组
  const groupedVideos = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    videos.forEach((v: any) => {
      const p = v.platform || '其他';
      if (!grouped[p]) grouped[p] = [];
      grouped[p].push(v);
    });
    return Object.entries(grouped);
  }, [videos]);

  return (
    <div className="space-y-5 ai-npc-page">
      <div className="text-center mb-4">
        <Title level={4} className="!mb-2 !text-white" style={{ fontSize: '3rem' }}>🤖 AI 游戏百科</Title>
        <Text className="text-gray-300" style={{ fontSize: '1.8rem' }}>你的游戏百科全书 — 攻略查询、精彩视频、玩家二创，一站式搞定</Text>
      </div>

      {/* 搜索 */}
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Input.Search
          placeholder="搜索游戏攻略、视频或二创..."
          size="large"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onSearch={handleSearch}
          loading={isPending}
          enterButton="搜索"
        />
      </div>

      {/* 分类内容 - 始终显示标签页，未搜索时展示默认数据 */}
      <Tabs
        defaultActiveKey="guides"
        size="middle"
        className="ai-npc-tabs"
        items={[
          {
            key: 'guides',
            label: <span><FileTextOutlined /> 攻略 ({guides.length})</span>,
            children: isLoadingDefault ? (
              <div className="flex justify-center py-12"><Spin size="large" /></div>
            ) : guides.length === 0 ? (
              <Empty description={hasSearched ? '未找到相关攻略' : '暂无攻略数据'} />
            ) : (
              <Row gutter={[16, 16]}>
                {guides.map((item: any, idx: number) => (
                  <Col xs={24} sm={12} lg={8} key={idx}>
                    <motion.div whileHover={{ y: -4 }}>
                      <Card hoverable size="small" className="h-full cursor-pointer bg-dark-800 border-dark-700" onClick={() => setReadingGuide(item)}>
                        <div className="flex items-start gap-3">
                          <div className="text-3xl">📄</div>
                          <div className="flex-1 min-w-0">
                            <Text className="font-medium block truncate">{item.title}</Text>
                            <div className="flex items-center gap-2 mt-1">
                              <Tag color={item.difficulty === '简单' ? 'green' : item.difficulty === '中等' ? 'orange' : item.difficulty === '困难' ? 'red' : 'purple'}>{item.difficulty}</Tag>
                              <Text type="secondary" className="text-xs text-gray-400">{item.views}w 浏览</Text>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  </Col>
                ))}
              </Row>
            ),
          },
          {
            key: 'videos',
            label: <span><PlayCircleOutlined /> 视频 ({videos.length})</span>,
            children: isLoadingDefault ? (
              <div className="flex justify-center py-12"><Spin size="large" /></div>
            ) : videos.length === 0 ? (
              <Empty description={hasSearched ? '未找到相关视频' : '暂无视频数据'} />
            ) : (
              <div className="space-y-6">
                {groupedVideos.map(([platform, items]: [string, any[]]) => (
                  <div key={platform}>
                    <div className="flex items-center gap-2 mb-3">
                      <Tag color={platform==='B站'?'pink':platform==='抖音'?'cyan':platform==='腾讯视频'?'blue':platform==='YouTube'?'red':'purple'} className="text-sm px-3 py-0.5">{platform}</Tag>
                      <Text type="secondary" className="text-sm">{items.length} 个视频</Text>
                    </div>
                    <Row gutter={[16, 16]}>
                      {items.map((item: any, idx: number) => (
                  <Col xs={24} sm={12} lg={8} key={idx}>
                    <motion.div whileHover={{ y: -3 }}>
                      <Card hoverable size="small" className="bg-dark-800 border-dark-700 overflow-hidden"
                        onClick={() => item.url ? window.open(item.url, "_blank", "noopener,noreferrer") : null}
                        cover={
                          <div className="h-40 bg-dark-700 relative overflow-hidden group cursor-pointer">
                            {item.coverImageUrl ? (
                              <img src={item.coverImageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                            ) : <div className="w-full h-full flex items-center justify-center text-4xl">🎬</div>}
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 flex items-center justify-center transition-all">
                              <PlayCircleOutlined className="text-5xl text-white/80 group-hover:text-white group-hover:scale-110 transition-all" />
                            </div>
                            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                              {item.duration || "--"}
                              {item.platform && <Tag color={item.platform === "B站" ? "pink" : "blue"} className="ml-1" style={{ fontSize: 10 }}>{item.platform}</Tag>}
                            </div>
                          </div>
                        }
                      >
                        <div className="text-sm font-medium text-gray-200 line-clamp-2 mb-2" title={item.title}>{item.title}</div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="truncate mr-2">{item.author}</span>
                          <span>{item.views}w 播放</span>
                        </div>
                      </Card>
                    </motion.div>
                  </Col>
                ))}
              </Row>
                  </div>
                ))}
              </div>
            ),
          },
          {
            key: 'fanart',
            label: <span><HeartOutlined /> 二创 ({fanart.length})</span>,
            children: isLoadingDefault ? (
              <div className="flex justify-center py-12"><Spin size="large" /></div>
            ) : fanart.length === 0 ? (
              <Empty description={hasSearched ? '未找到相关二创' : '暂无二创数据'} />
            ) : (
              <Row gutter={[16, 16]}>
                {fanart.map((item: any, idx: number) => (
                  <Col xs={24} sm={12} lg={8} key={idx}>
                    <motion.div whileHover={{ y: -4 }}>
                      <Card hoverable size="small" className="bg-dark-800 border-dark-700">
                        <div className="flex items-start gap-3">
                            <div className="text-3xl">🎨</div>
                            <div className="flex-1 min-w-0">
                              <Text className="font-medium block truncate">{item.title}</Text>
                              <div className="flex items-center gap-2 mt-1">
                                <Tag color="pink">{item.type}</Tag>
                                <Text type="secondary" className="text-xs text-gray-400">{item.author}</Text>
                              </div>
                              <Text className="text-xs flex items-center gap-1 mt-1 text-gray-400">
                                ❤️ {item.likes.toLocaleString()}
                              </Text>
                            </div>
                          </div>
                      </Card>
                    </motion.div>
                  </Col>
                ))}
              </Row>
            ),
          },
        ]}
      />


      {/* 攻略详情弹窗 */}
      <Modal
        title={readingGuide?.title || '攻略详情'}
        open={!!readingGuide}
        onCancel={() => setReadingGuide(null)}
        footer={readingGuide?.url ? (
          <a href={readingGuide.url} target="_blank" rel="noopener noreferrer">
            <Button type="primary" icon={<RightOutlined />}>查看原文</Button>
          </a>
        ) : null}
        width={640}
        destroyOnClose
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Tag color={readingGuide?.difficulty === '简单' ? 'green' : readingGuide?.difficulty === '中等' ? 'orange' : readingGuide?.difficulty === '困难' ? 'red' : 'purple'}>
              {readingGuide?.difficulty || '通用'}
            </Tag>
            <Text className="text-gray-400">{readingGuide?.views}w 浏览</Text>
          </div>
          <p className="text-gray-300 leading-relaxed">{readingGuide?.description || '暂无详细描述'}</p>
        </div>
      </Modal>
    </div>
  );
};

export default GameNPC;
