/**
 * ChatAssistant - AI 聊天助手组件
 *
 * 提供智能游戏对话功能：
 * - 预设快捷问题
 * - 模拟 AI 回复（基于关键词匹配的规则引擎）
 * - 支持多种游戏话题（RPG、独立游戏、开放世界等）
 * - 消息列表自动滚动
 */
import { useState, useRef, useEffect } from 'react';
import { Input, Button, Typography, Tag, Avatar, Space } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined, CustomerServiceOutlined } from '@ant-design/icons';

const { Text } = Typography;

/** 单条消息的数据结构 */
interface Message {
  role: 'user' | 'assistant';  // 消息发送者：用户或 AI
  content: string;             // 消息内容
}

/** 预设快捷问题列表 */
const presetQuestions = [
  '推荐几款好玩的 RPG',
  '最近有什么新游戏',
  '有什么适合新手的游戏',
  '推荐一些独立游戏',
  '有哪些必玩的开放世界游戏',
  '适合联机的游戏推荐',
];

/**
 * 模拟 AI 回复函数
 * 基于关键词匹配的简单规则引擎，根据用户输入返回不同的预设回复模板
 * @param message - 用户输入的消息
 * @returns AI 回复文本（Markdown 格式）
 */
const mockReply = (message: string): string => {
  const q = message.toLowerCase();
  if (q.includes('rpg') || q.includes('角色扮演')) {
    return '推荐几款优秀的 RPG 游戏：\n\n1. **博德之门3** (9.6分) - 深度角色扮演体验，选择驱动剧情\n2. **艾尔登法环** (9.8分) - 开放世界动作RPG巅峰之作\n3. **最终幻想7 重生** (9.2分) - 经典重制的全新篇章\n4. **黑神话：悟空** (9.5分) - 国产神话动作RPG\n\n您对哪种类型更感兴趣？🎮';
  }
  if (q.includes('新游戏') || q.includes('最近') || q.includes('近期')) {
    return '近期值得关注的新游戏：\n\n🔥 **2024年热门新作**\n• 黑神话：悟空 (8月20日) - 国产3A大作\n• 最终幻想7 重生 (2月29日) - PS5独占\n• 幻兽帕鲁 (1月19日) - 现象级爆款\n\n📅 **即将发售**\n• 空洞骑士：丝之歌 - 发售日待定\n• 黑神话：悟空DLC - 开发中\n\n想了解哪款游戏的更多信息？😊';
  }
  if (q.includes('新手') || q.includes('入门') || q.includes('简单')) {
    return '适合新手的游戏推荐：\n\n🎮 **轻松入门**\n1. **原神** - 免费开放世界，上手友好\n2. **星露谷物语** - 轻松休闲的农场模拟\n3. **塞尔达传说：旷野之息** - 探索自由的冒险\n\n💡 **新手建议**\n• 从简单难度开始\n• 多看游戏内教程\n• 不要怕失败，多尝试\n\n您想了解哪款游戏的入门技巧？🌟';
  }
  if (q.includes('独立') || q.includes('indie')) {
    return '优秀的独立游戏推荐：\n\n🎨 **必玩独立佳作**\n1. **黑帝斯** (9.3分) - 肉鸽动作精品\n2. **空洞骑士** (9.4分) - 类银河城巅峰\n3. **星露谷物语** (9.1分) - 农场模拟经典\n4. **蔚蓝** (9.2分) - 硬核平台跳跃\n5. **死亡细胞** (9.0分) - 动作肉鸽爽游\n\n这些游戏性价比都很高，您玩过哪些？🎪';
  }
  if (q.includes('开放世界') || q.includes('沙盒') || q.includes('自由')) {
    return '必玩的开放世界游戏：\n\n🌍 **开放世界神作**\n1. **艾尔登法环** (9.8分) - 黑暗奇幻开放世界\n2. **赛博朋克2077** (8.6分) - 未来都市开放世界\n3. **塞尔达传说：旷野之息** (9.7分) - 开放世界标杆\n4. **巫师3** (9.5分) - 剧情驱动开放世界\n5. **荒野大镖客2** (9.7分) - 西部开放世界\n\n每款都能玩上百小时！⏰';
  }
  if (q.includes('联机') || q.includes('多人') || q.includes('合作') || q.includes('一起')) {
    return '适合联机的游戏推荐：\n\n👥 **联机游戏精选**\n1. **幻兽帕鲁** - 多人合作生存建造\n2. **原神** - 多人合作探索\n3. **怪物猎人：世界** - 四人共斗狩猎\n4. **永劫无间** - 多人竞技动作\n5. **Among Us** - 派对推理游戏\n\n想和朋友们一起玩吗？🎉';
  }
  if (q.includes('免费') || q.includes('f2p')) {
    return '免费游戏推荐：\n\n💰 **免费畅玩**\n1. **原神** - 开放世界RPG\n2. **英雄联盟** - MOBA经典\n3. **DOTA 2** - 硬核MOBA\n4. **Apex 英雄** - 大逃杀射击\n5. **Warframe** - 太空动作射击\n6. **命运2** - FPS-MMO混搭\n\n这些游戏不花钱也能体验大量内容！🎁';
  }
  if (q.includes('你好') || q.includes('嗨') || q.includes('hello') || q.includes('hi')) {
    return '你好！👋 我是 GameHub AI 助手，可以帮你：\n\n• 推荐游戏（告诉我你喜欢的类型）\n• 介绍新游戏\n• 提供游戏攻略建议\n• 回答游戏相关问题\n\n有什么可以帮助你的吗？😊';
  }
  return `关于"${message}"，我为您找到以下信息：\n\n` +
    `📊 **相关推荐**\n` +
    `根据您的查询，建议关注以下游戏类型：\n` +
    `• 动作冒险类游戏\n` +
    `• 角色扮演类游戏\n` +
    `• 策略模拟类游戏\n\n` +
    `💡 **建议**\n` +
    `您可以尝试在搜索框中搜索具体游戏名称，或告诉我更多偏好（如平台、价格等），我可以给出更精准的推荐！\n\n` +
    `也可以试试这些快捷问题：\n` +
    `• "推荐几款好玩的 RPG"\n` +
    `• "最近有什么新游戏"`;
};

/**
 * ChatAssistant 主组件
 * 管理聊天消息列表、输入框和快捷问答
 */
const ChatAssistant: React.FC = () => {
  /* ====== 聊天状态 ====== */
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '你好！我是 GameHub AI 助手，可以帮你推荐游戏、解答问题。有什么需要的吗？😊' },
  ]);
  const [input, setInput] = useState('');       // 当前输入文本
  const [loading, setLoading] = useState(false); // 是否正在等待 AI 回复
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /**
   * 新消息时自动滚动到底部
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * 发送消息
   * @param text - 用户输入的消息文本
   */
  const handleSend = (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    // 模拟 AI 回复延迟
    setTimeout(() => {
      const reply: Message = { role: 'assistant', content: mockReply(text.trim()) };
      setMessages(prev => [...prev, reply]);
      setLoading(false);
    }, 600);
  };

  return (
    <div className="p-2 flex flex-col" style={{ height: 380 }}>
      <div className="flex items-center gap-2 mb-3">
        <CustomerServiceOutlined className="text-blue-500 text-lg" />
        <span className="font-medium text-gray-700">AI 聊天助手</span>
        <Tag color="blue" className="ml-auto">智能对话</Tag>
      </div>

      {/* 预设快捷问题 */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {presetQuestions.slice(0, 4).map(q => (
          <Tag
            key={q}
            color="geekblue"
            className="cursor-pointer hover:opacity-80"
            onClick={() => handleSend(q)}
            style={{ cursor: 'pointer' }}
          >
            {q}
          </Tag>
        ))}
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto mb-3 space-y-3 px-1">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-2 max-w-xs lg:max-w-sm ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <Avatar
                size="small"
                icon={msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                className={msg.role === 'user' ? 'bg-blue-500' : 'bg-green-500'}
              />
              <div
                className={`px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-2">
              <Avatar size="small" icon={<RobotOutlined />} className="bg-green-500" />
              <div className="px-3 py-2 rounded-lg bg-gray-100 text-gray-500 text-sm">
                AI 正在思考...
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onPressEnter={() => handleSend(input)}
          placeholder="输入你的问题..."
          size="middle"
          prefix={<RobotOutlined className="text-gray-400" />}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={() => handleSend(input)}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default ChatAssistant;
