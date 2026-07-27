/**
 * GuideSearch - AI 攻略查询组件
 *
 * 提供游戏攻略搜索和浏览功能：
 * - 关键词搜索（游戏名称、攻略标题等）
 * - 热门游戏标签快速筛选
 * - 攻略详情展开（可折叠步骤列表）
 * - 使用本地模拟数据（mockGuides）
 */
import { useState, useMemo } from 'react';
import { Input, Card, Tag, Typography, Empty, Spin, Rate, Divider, Collapse } from 'antd';
import { FileSearchOutlined, BookOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons';

const { Text, Title, Paragraph } = Typography;

/** 模拟攻略数据：包含各类热门游戏的攻略信息 */
const mockGuides = [
  {
    id: '1',
    gameTitle: '艾尔登法环',
    title: '新手入门攻略 - 开局必做的10件事',
    summary: '从创建角色到击败第一个Boss，全面解析游戏初期的关键要点和实用技巧。',
    category: '新手入门',
    author: '游戏大师',
    difficulty: '新手',
    steps: [
      '选择流浪骑士或武士作为初始职业，属性均衡更适合新手',
      '开局跟随引导之光的指引，前往风暴关卡',
      '在关卡前方赐福点休息，触发梅琳娜剧情获得灵马',
      '探索宁姆格福区域，收集黄金种子和圣杯露滴',
      '击败大树守卫获得黄金戟，前期强力武器',
    ],
    rating: 4.8,
    views: 25800,
    createdAt: '2024-03-15',
  },
  {
    id: '2',
    gameTitle: '赛博朋克2077',
    title: '全结局触发条件指南',
    summary: '详细说明所有结局的触发方式、关键选择节点及达成条件。',
    category: '进阶攻略',
    author: '夜之城探秘者',
    difficulty: '中等',
    steps: [
      '在"审判"任务中选择与帕南合作进入荒坂塔',
      '完成罗格和阿德卡多支线任务解锁不同路线',
      '与荒坂华子合作将触发公司结局',
      '强尼的信任度影响隐藏结局的解锁',
      '选择留在赛博空间或返回身体决定最终结局',
    ],
    rating: 4.6,
    views: 18200,
    createdAt: '2024-02-20',
  },
  {
    id: '3',
    gameTitle: '博德之门3',
    title: '最强Build构建 - 圣骑士路线',
    summary: '详尽的圣骑士Build指南，包括种族选择、属性分配、专长推荐和装备搭配。',
    category: 'Build指南',
    author: 'Build大师',
    difficulty: '中等',
    steps: [
      '推荐选择人类或半精灵种族，获得额外技能熟练',
      '主属性力量17、魅力16，体质14保证生存',
      '一级选择"至圣斩"作为战斗风格',
      '三级选择"奉献之誓"子职业',
      '四级专长选择"凶蛮打击"提升输出',
    ],
    rating: 4.9,
    views: 32100,
    createdAt: '2024-04-01',
  },
  {
    id: '4',
    gameTitle: '黑神话：悟空',
    title: '全BOSS打法攻略合集',
    summary: '包含所有主线和隐藏Boss的详细打法、弱点和逃课技巧。',
    category: 'Boss攻略',
    author: '花果山老猴',
    difficulty: '困难',
    steps: [
      '第一章幽魂：保持距离，等它冲撞后侧面攻击',
      '第二章虎先锋：注意它的连招节奏，不要贪刀',
      '第三章黄眉怪：利用定身术打断它的法术施放',
      '第四章百眼魔君：提前准备破眼道具，弱点是眼睛',
      '最终Boss：分三个阶段，注意躲避全屏AOE技能',
    ],
    rating: 4.7,
    views: 41500,
    createdAt: '2024-08-25',
  },
  {
    id: '5',
    gameTitle: '原神',
    title: '纳塔地区全探索攻略',
    summary: '纳塔地区所有宝箱、神瞳、世界任务的位置和获取方法一览。',
    category: '探索攻略',
    author: '提瓦特游记',
    difficulty: '简单',
    steps: [
      '优先完成纳塔主线任务解锁所有传送锚点',
      '使用纳塔共鸣石寻找散落的神瞳',
      '按照区域分块探索，每完成一块再进入下一块',
      '注意纳塔特有的龙伙伴机制，可到达隐藏区域',
      '收集全部神瞳后获得满级神像奖励',
    ],
    rating: 4.5,
    views: 22300,
    createdAt: '2025-01-10',
  },
  {
    id: '6',
    gameTitle: '巫师3：狂猎',
    title: '全流派装备收集与搭配',
    summary: '熊派、猫派、狮鹫派等各大流派套装的位置、属性和最佳搭配方案。',
    category: '装备指南',
    author: '猎魔人日志',
    difficulty: '中等',
    steps: [
      '熊派重甲：护甲最高，适合正面硬刚玩法',
      '猫派轻甲：暴击伤害加成，适合敏捷流派',
      '狮鹫派中甲：法印强度加成，适合法印流派',
      '狼派中甲：均衡属性，适合混合流派',
      '各派系套装图纸分别在相应区域/?的宝箱中',
    ],
    rating: 4.8,
    views: 19600,
    createdAt: '2024-11-05',
  },
];

/**
 * GuideSearch 主组件
 * 提供攻略列表过滤、搜索和详情展开功能
 */
const GuideSearch: React.FC = () => {
  const [query, setQuery] = useState('');          // 搜索关键词
  const [searching, setSearching] = useState(false); // 是否正在搜索

  /**
   * 根据搜索关键词过滤攻略列表
   * 匹配字段：游戏名称、攻略标题、摘要、分类
   */
  const filteredGuides = useMemo(() => {
    if (!query.trim()) return mockGuides;
    const q = query.toLowerCase();
    return mockGuides.filter(g =>
      g.gameTitle.toLowerCase().includes(q) ||
      g.title.toLowerCase().includes(q) ||
      g.summary.toLowerCase().includes(q) ||
      g.category.toLowerCase().includes(q)
    );
  }, [query]);

  /**
   * 执行搜索
   * 设置搜索关键词，短暂延迟后关闭加载状态
   * @param value - 搜索关键词
   */
  const handleSearch = (value: string) => {
    setSearching(true);
    setQuery(value);
    setTimeout(() => setSearching(false), 300);
  };

  return (
    <div className="p-2">
      <div className="flex items-center gap-2 mb-4">
        <FileSearchOutlined className="text-blue-500 text-lg" />
        <span className="font-medium text-gray-700">AI 攻略查询</span>
        <Tag color="blue" className="ml-auto">海量游戏攻略</Tag>
      </div>

      <Input.Search
        placeholder="搜索游戏攻略（如：艾尔登法环、原神、博德之门3）..."
        size="middle"
        onSearch={handleSearch}
        onChange={(e) => setQuery(e.target.value)}
        value={query}
        enterButton="搜索"
        className="mb-4"
      />

      <div className="flex flex-wrap gap-1.5 mb-4">
        {['艾尔登法环', '原神', '博德之门3', '黑神话：悟空', '赛博朋克2077', '巫师3'].map(game => (
          <Tag
            key={game}
            color="geekblue"
            className="cursor-pointer hover:opacity-80"
            onClick={() => handleSearch(game)}
          >
            {game}
          </Tag>
        ))}
      </div>

      {searching ? (
        <div className="flex justify-center py-8">
          <Spin tip="AI 正在搜索攻略..." />
        </div>
      ) : filteredGuides.length > 0 ? (
        <div className="space-y-3">
          {filteredGuides.map(guide => (
            <Card
              key={guide.id}
              size="small"
              className="hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex flex-col md:flex-row md:items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Text strong className="text-base">{guide.title}</Text>
                    <Tag color="purple" className="text-xs flex-shrink-0">{guide.gameTitle}</Tag>
                  </div>
                  <Paragraph className="text-sm text-gray-500 mb-2" ellipsis={{ rows: 2 }}>
                    {guide.summary}
                  </Paragraph>
                  <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <BookOutlined />{guide.category}
                    </span>
                    <span className="flex items-center gap-1">
                      <UserOutlined />{guide.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <ClockCircleOutlined />{guide.createdAt}
                    </span>
                    <span className="flex items-center gap-1">
                      <Rate disabled value={guide.rating / 2} size="small" className="text-xs" />
                      {guide.rating}
                    </span>
                    <Tag color={guide.difficulty === '新手' ? 'green' : guide.difficulty === '中等' ? 'orange' : 'red'} className="text-xs">
                      {guide.difficulty}
                    </Tag>
                  </div>
                  <Divider className="my-2" />
                  <Collapse
                    ghost
                    size="small"
                    items={[{
                      key: 'steps',
                      label: <Text className="text-xs text-blue-500">查看攻略步骤</Text>,
                      children: (
                        <ol className="list-decimal list-inside space-y-1">
                          {guide.steps.map((step, i) => (
                            <li key={i} className="text-sm text-gray-600">{step}</li>
                          ))}
                        </ol>
                      ),
                    }]}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Empty description="未找到相关攻略" image={Empty.PRESENTED_IMAGE_SIMPLE} className="py-8" />
      )}

      {!query.trim() && (
        <div className="text-xs text-gray-400 mt-3 text-center">
          输入游戏名称搜索攻略，或点击上方热门游戏标签快速查询
        </div>
      )}
    </div>
  );
};

export default GuideSearch;
