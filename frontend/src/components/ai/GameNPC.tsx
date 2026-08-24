/**
 * GameNPC - AI 游戏百科组件
 *
 * 游戏攻略搜索与展示：
 * - 攻略：游戏攻略文章，支持难度标签和详情查看
 *
 * 搜索时调用后端 API，未搜索时展示默认热门攻略
 */
import { useState } from 'react';
import { Card, Input, Tag, Typography, Row, Col, Empty, Button, Spin, Modal } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useGameNpcSearch, useGuides } from '../../api/hooks';

const { Title, Text } = Typography;

/**
 * GameNPC 主组件
 * 管理搜索和攻略详情弹窗
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
  const isLoadingDefault = !hasSearched && guidesLoading;

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

      {/* 攻略列表 */}
      {isLoadingDefault ? (
        <div className="flex justify-center py-12"><Spin size="large" /></div>
      ) : guides.length === 0 ? (
        <Empty description={hasSearched ? t('aiAssistant.npc.noGuidesFound') : t('aiAssistant.npc.noGuides')} />
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
                        <Text type="secondary" className="text-xs text-gray-400">{item.views}w {t('aiAssistant.npc.viewsUnit')}</Text>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </Col>
          ))}
        </Row>
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
            <Tag color={readingGuide?.difficulty === '简单' ? 'green' : readingGuide?.difficulty === '中等' ? 'orange' : readingGuide?.difficulty === '困难' ? 'red' : 'purple'}>
              {readingGuide?.difficulty || t('aiAssistant.npc.general')}
            </Tag>
            <Text className="text-gray-400">{readingGuide?.views}w {t('aiAssistant.npc.viewsUnit')}</Text>
          </div>
          <p className="text-gray-300 leading-relaxed">{readingGuide?.description || readingGuide?.summary || t('aiAssistant.npc.noDescription')}</p>
        </div>
      </Modal>
    </div>
  );
};

export default GameNPC;
