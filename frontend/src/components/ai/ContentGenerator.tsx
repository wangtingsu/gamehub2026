/**
 * ContentGenerator - AI 内容生成组件
 *
 * 提供四种 AI 内容生成功能：
 * - 游戏评测：根据游戏名称生成评测报告
 * - 游戏描述：生成游戏简介文案
 * - 标签建议：基于关键词推荐标签
 * - 攻略简介：生成新手入门攻略
 */
import { useState } from 'react';
import { Input, Select, Button, Card, Tag, Typography, message, Space } from 'antd';
import { CopyOutlined, ThunderboltOutlined, FileTextOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

/** 生成内容类型枚举 */
type GenerateType = 'review' | 'description' | 'tags' | 'guide';

/** 内容类型选项列表 */
const TYPE_OPTIONS: { value: GenerateType; label: string }[] = [
  { value: 'review', label: '游戏评测' },
  { value: 'description', label: '游戏描述' },
  { value: 'tags', label: '标签建议' },
  { value: 'guide', label: '攻略简介' },
];

/**
 * 模拟 AI 内容生成函数
 * 根据类型和主题返回预设模板内容
 * @param type - 生成内容类型
 * @param topic - 主题/关键词
 * @returns 生成的文本内容
 */
const generateContent = (type: GenerateType, topic: string): string => {
  if (!topic.trim()) return '请输入主题或关键词。';
  const templates: Record<GenerateType, (t: string) => string> = {
    review: (t) =>
      `【AI 评测】${t}\n\n` +
      `🎮 画面表现：${t} 的画面制作精良，采用了先进的渲染技术，场景细节丰富，光影效果出色。整体美术风格统一，给人留下深刻印象。\n\n` +
      `🎯 玩法机制：游戏的核心玩法设计巧妙，上手简单但深度十足。操作反馈流畅，战斗系统富有挑战性，能够带给玩家持续的新鲜感。\n\n` +
      `📖 剧情故事：故事情节引人入胜，角色塑造饱满。剧情的推进节奏把控得当，让玩家有强烈的代入感。\n\n` +
      `🏆 总评：${t} 是一款值得游玩的优秀作品，推荐给所有热爱游戏的玩家。\n评分：8.5/10`,

    description: (t) =>
      `《${t}》是一款令人期待的游戏作品。在这个充满奇幻与冒险的世界里，玩家将扮演独特的角色，展开一段难忘的旅程。\n\n` +
      `游戏融合了动作、角色扮演和策略元素，为玩家提供了丰富多样的游戏体验。精美的画面、动人的音乐以及深度的剧情将带领玩家沉浸在游戏的世界中。\n\n` +
      `主要特色：\n` +
      `• 精美的视觉效果和艺术风格\n` +
      `• 深度而富有挑战性的游戏玩法\n` +
      `• 引人入胜的故事情节\n` +
      `• 丰富的角色定制系统\n` +
      `• 多人合作与竞技模式`,

    tags: (t) =>
      `基于 "${t}" 的推荐标签：\n\n` +
      `#${t.replace(/\s+/g, '')} ` +
      `#游戏推荐 ` +
      `#热门游戏 ` +
      `#${t.includes('RPG') || t.includes('角色扮演') ? '角色扮演' : '动作游戏'} ` +
      `#单机游戏 ` +
      `#Steam ` +
      `#游戏评测 ` +
      `#游戏攻略` +
      (t.includes('开放世界') ? ' #开放世界 #沙盒游戏' : '') +
      (t.includes('联机') || t.includes('多人') ? ' #联机游戏 #多人合作' : '') +
      (t.includes('独立') || t.includes('Indie') ? ' #独立游戏' : ''),

    guide: (t) =>
      `【AI 攻略】${t} 新手入门指南\n\n` +
      `一、基础入门\n` +
      `1. 创建角色时建议选择平衡型职业，适合新手熟悉游戏机制。\n` +
      `2. 完成新手教程后，优先推进主线任务至第3章，解锁核心玩法系统。\n` +
      `3. 注意收集地图上的资源点，这些对后续发展至关重要。\n\n` +
      `二、进阶技巧\n` +
      `1. 合理分配技能点数，建议优先升级被动技能提升生存能力。\n` +
      `2. 装备选择上，前期以属性加成为主，后期注重套装效果。\n` +
      `3. 探索隐藏区域可获得稀有道具和装备，建议使用地图标记功能。\n\n` +
      `三、Boss 战策略\n` +
      `1. 观察 Boss 的攻击模式，找到攻击间隙进行反击。\n` +
      `2. 准备充足的回复道具，合理使用场景中的掩体。\n` +
      `3. 推荐等级达到 ${Math.floor(Math.random() * 20 + 30)} 级以上再挑战最终 Boss。`,
  };
  return templates[type](topic);
};

/**
 * ContentGenerator 主组件
 * 提供内容类型选择、主题输入、生成和复制功能
 */
const ContentGenerator: React.FC = () => {
  const [type, setType] = useState<GenerateType>('review');  // 当前选中的内容类型
  const [topic, setTopic] = useState('');                     // 输入的主题/关键词
  const [result, setResult] = useState('');                   // 生成的结果文本
  const [generating, setGenerating] = useState(false);        // 是否正在生成

  /**
   * 触发 AI 内容生成
   * 验证输入后调用模拟生成函数，设置结果状态
   */
  const handleGenerate = () => {
    if (!topic.trim()) {
      message.warning('请输入主题或关键词');
      return;
    }
    setGenerating(true);
    setTimeout(() => {
      setResult(generateContent(type, topic));
      setGenerating(false);
    }, 500);
  };

  /**
   * 复制生成结果到剪贴板
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      message.success('已复制到剪贴板');
    } catch {
      message.error('复制失败，请手动选择复制');
    }
  };

  return (
    <div className="p-2">
      <div className="flex items-center gap-2 mb-4">
        <ThunderboltOutlined className="text-yellow-500 text-lg" />
        <span className="font-medium text-gray-700">AI 内容生成</span>
        <Tag color="gold" className="ml-auto">智能创作助手</Tag>
      </div>

      <Space direction="vertical" className="w-full" size="middle">
        <div className="flex gap-3">
          <Select
            value={type}
            onChange={setType}
            options={TYPE_OPTIONS}
            className="w-32"
            size="middle"
          />
          <Input
            placeholder="输入主题或游戏名称..."
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onPressEnter={handleGenerate}
            className="flex-1"
            size="middle"
            prefix={<FileTextOutlined className="text-gray-400" />}
          />
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={handleGenerate}
            loading={generating}
          >
            生成
          </Button>
        </div>

        {result && (
          <Card
            size="small"
            className="bg-gray-50"
            extra={
              <Button size="small" icon={<CopyOutlined />} onClick={handleCopy}>
                复制
              </Button>
            }
            title={
              <div className="flex items-center gap-2">
                <Tag color="blue">生成结果</Tag>
                <Text type="secondary" className="text-xs">类型: {TYPE_OPTIONS.find(o => o.value === type)?.label}</Text>
              </div>
            }
          >
            <Paragraph className="whitespace-pre-wrap text-sm mb-0" style={{ whiteSpace: 'pre-wrap' }}>
              {result}
            </Paragraph>
          </Card>
        )}

        {!result && (
          <div className="text-center py-8 text-gray-400">
            <ThunderboltOutlined className="text-4xl mb-2 block" />
            <Text type="secondary">输入主题并点击"生成"，AI 将为您自动创作内容</Text>
          </div>
        )}

        <div className="text-xs text-gray-400 text-center">
          支持生成类型：游戏评测、游戏描述、标签建议、攻略简介
        </div>
      </Space>
    </div>
  );
};

export default ContentGenerator;
