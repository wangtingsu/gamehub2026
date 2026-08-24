/**
 * GameNPC - AI 游戏百科组件
 *
 * 游戏攻略搜索与展示：
 * - 未搜索：仅展示默认热门攻略（真实攻略数据，无假数据）
 * - 搜索后：展示攻略 / 视频（B站真实搜索结果）/ 二创（AI 生成）三个标签页
 *
 * 搜索时调用后端 API，未搜索时展示默认热门攻略
 */
import { useState, useMemo } from 'react';
import { Card, Input, Tabs, Tag, Typography, Row, Col, Empty, Button, Spin, Modal } from 'antd';
import { PlayCircleOutlined, FileTextOutlined, HeartOutlined, RightOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useGameNpcSearch, useGuides } from '../../api/hooks';

const { Title, Text } = Typography;

/** 难度 → 颜色（兼容中文/英文难度值） */
const difficultyColor = (d?: string) => {
  if (d === '简单' || d === 'easy') return 'green';
  if (d === '中等' || d === 'medium' || d === '普通') return 'orange';
  if (d === '困难' || d === 'hard') return 'red';
  return 'purple';
};

/**
 * GameNPC 主组件
 * 管理搜索、标签页切换、视频播放跳转和攻略详情弹窗
 */
const GameNPC: React.FC = () => {
  const { t } = useTranslation();

  /* ====== 搜索状态 ====== */
  const [searchText, setSearchText] = useState('');       // 搜索输入文本
  const [hasSearched, setHasSearched] = useState(false);   // 是否已执行过搜索
  const [readingGuide, setReadingGuide] = useState<any>(null);  // 正在查看的攻略详情
  const { mutateAsync: search, isPending, data: result, reset } = useGameNpcSearch();

  /* ====== 默认数据 hooks（未搜索时展示） ====== */
  const { data: defaultGuides = [], isLoading: guidesLoading } = useGuides({ limit: 6 });

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
  const videos = hasSearched ? (result?.videos || []) : [];
  const fanart = hasSearched ? (result?.fanart || []) : [];
  const isLoadingDefault = !hasSearched && guidesLoading;
  const searching = hasSearched && isPending;

  // 视频按平台分组
  const groupedVideos = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    videos.forEach((v: any) => {
      const p = v.platform || t('aiAssistant.npc.other');
      if (!grouped[p]) grouped[p] = [];
      grouped[p].push(v);
    });
    return Object.entries(grouped);
  }, [videos, t]);

  /* ====== 攻略列表渲染 ====== */
  const renderGuides = (list: any[]) => {
    if (isLoadingDefault || searching) {
      return <div className="flex justify-center py-12"><Spin size="large" /></div>;
    }
    if (list.length === 0) {
      return <Empty description={hasSearched ? t('aiAssistant.npc.noGuidesFound') : t('aiAssistant.npc.noGuides')} />;
    }
    return (
      <Row gutter={[16, 16]}>
        {list.map((item: any, idx: number) => (
          <Col xs={24} sm={12} lg={8} key={idx}>
            <motion.div whileHover={{ y: -4 }}>
              <Card hoverable size="small" className="h-full cursor-pointer bg-dark-800 border-dark-700" onClick={() => setReadingGuide(item)}>
                <div className="flex items-start gap-3">
                  <div className="text-3xl">📄</div>
                  <div className="flex-1 min-w-0">
                    <Text className="font-medium block truncate">{item.title}</Text>
                    <div className="flex items-center gap-2 mt-1">
                      {item.difficulty && <Tag color={difficultyColor(item.difficulty)}>{item.difficulty}</Tag>}
                      {item.views != null && (
                        <Text type="secondary" className="text-xs text-gray-400">{item.views}w {t('aiAssistant.npc.viewsUnit')}</Text>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>
    );
  };

  /* ====== 视频列表渲染（搜索结果的真实 B站视频） ====== */
  const renderVideos = () => {
    if (searching) {
      return <div className="flex justify-center py-12"><Spin size="large" /></div>;
    }
    if (videos.length === 0) {
      return <Empty description={t('aiAssistant.npc.noVideosFound')} />;
    }
    return (
      <div className="space-y-6">
        {groupedVideos.map(([platform, items]: [string, any[]]) => (
          <div key={platform}>
            <div className="flex items-center gap-2 mb-3">
              <Tag color={platform === 'B站' ? 'pink' : platform === '抖音' ? 'cyan' : platform === '腾讯视频' ? 'blue' : platform === 'YouTube' ? 'red' : 'purple'} className="text-sm px-3 py-0.5">{platform}</Tag>
              <Text type="secondary" className="text-sm">{items.length} {t('aiAssistant.npc.videosUnit')}</Text>
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
                        {item.views != null && <span>{item.views}w {t('aiAssistant.npc.playsUnit')}</span>}
                      </div>
                    </Card>
                  </motion.div>
                </Col>
              ))}
            </Row>
          </div>
        ))}
      </div>
    );
  };

  /* ====== 二创列表渲染（AI 生成） ====== */
  const renderFanart = () => {
    if (searching) {
      return <div className="flex justify-center py-12"><Spin size="large" /></div>;
    }
    if (fanart.length === 0) {
      return <Empty description={t('aiAssistant.npc.noFanartFound')} />;
    }
    return (
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
                      {item.type && <Tag color="pink">{item.type}</Tag>}
                      <Text type="secondary" className="text-xs text-gray-400">{item.author}</Text>
                    </div>
                    {item.likes != null && (
                      <Text className="text-xs flex items-center gap-1 mt-1 text-gray-400">❤️ {Number(item.likes).toLocaleString()}</Text>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>
    );
  };

  return (
    <div className="space-y-5 ai-npc-page">
      <div className="text-center mb-4">
        <Title level={4} className="!mb-2 !text-white" style={{ fontSize: '3rem' }}>🤖 {t('aiAssistant.npc.title')}</Title>
        <Text className="text-gray-300" style={{ fontSize: '1.8rem' }}>{t('aiAssistant.npc.subtitle')}</Text>
      </div>

      {/* 搜索 */}
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Input.Search
          placeholder={t('aiAssistant.npc.searchPlaceholder')}
          size="large"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onSearch={handleSearch}
          loading={isPending}
          enterButton={t('aiAssistant.npc.searchButton')}
        />
      </div>

      {/* 内容区：未搜索仅攻略；搜索后展示攻略/视频/二创标签页 */}
      {!hasSearched ? (
        renderGuides(guides)
      ) : (
        <Tabs
          defaultActiveKey="guides"
          size="middle"
          className="ai-npc-tabs"
          items={[
            {
              key: 'guides',
              label: <span><FileTextOutlined /> {t('aiAssistant.npc.tabGuides')} ({guides.length})</span>,
              children: renderGuides(guides),
            },
            {
              key: 'videos',
              label: <span><PlayCircleOutlined /> {t('aiAssistant.npc.tabVideos')} ({videos.length})</span>,
              children: renderVideos(),
            },
            {
              key: 'fanart',
              label: <span><HeartOutlined /> {t('aiAssistant.npc.tabFanart')} ({fanart.length})</span>,
              children: renderFanart(),
            },
          ]}
        />
      )}

      {/* 攻略详情弹窗 */}
      <Modal
        title={readingGuide?.title || t('aiAssistant.npc.guideDetail')}
        open={!!readingGuide}
        onCancel={() => setReadingGuide(null)}
        footer={readingGuide?.url ? (
          <a href={readingGuide.url} target="_blank" rel="noopener noreferrer">
            <Button type="primary" icon={<RightOutlined />}>{t('aiAssistant.npc.viewOriginal')}</Button>
          </a>
        ) : null}
        width={640}
        destroyOnClose
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {readingGuide?.difficulty && <Tag color={difficultyColor(readingGuide.difficulty)}>{readingGuide.difficulty}</Tag>}
            {readingGuide?.views != null && (
              <Text className="text-gray-400">{readingGuide.views}w {t('aiAssistant.npc.viewsUnit')}</Text>
            )}
          </div>
          <p className="text-gray-300 leading-relaxed">{readingGuide?.description || readingGuide?.summary || t('aiAssistant.npc.noDescription')}</p>
        </div>
      </Modal>
    </div>
  );
};

export default GameNPC;
