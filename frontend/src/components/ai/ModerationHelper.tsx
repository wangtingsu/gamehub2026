/**
 * ModerationHelper - AI 审核辅助组件
 *
 * 提供文本内容安全检测功能：
 * - 敏感词匹配检测
 * - 安全评分（0-100）
 * - 违规等级分类（安全/需注意/违规）
 * - 修改建议生成
 *
 * 用于帮助用户发布前检查帖子、评论、评测等内容的合规性
 */
import { useState } from 'react';
import { Input, Button, Card, Tag, Typography, Alert, Space, Divider, Progress } from 'antd';
import { SafetyOutlined, CheckCircleOutlined, WarningOutlined, CloseCircleOutlined, AuditOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

/** 安全等级枚举 */
type SafetyLevel = 'safe' | 'warning' | 'violation';

/** 文本分析结果的数据结构 */
interface AnalysisResult {
  level: SafetyLevel;       // 安全等级
  score: number;            // 安全评分
  reasons: string[];        // 分析理由
  suggestions: string[];    // 修改建议
  flaggedWords: string[];   // 检测到的敏感词
}

/** 敏感词库（模拟数据） */
const sensitiveWords = [
  '暴力', '血腥', '色情', '赌博', '毒品', '枪械', '仇恨', '歧视',
  '恐怖主义', '诈骗', '虚假广告', '人身攻击', '辱骂', '垃圾广告',
  '加微信', 'QQ群', '私聊', '代练', '刷分', '外挂', '私服',
];

/**
 * 分析文本内容的合规性
 * 基于敏感词库匹配，根据匹配数量判定安全等级和评分
 * @param text - 待分析的文本
 * @returns 分析结果
 */
const analyzeContent = (text: string): AnalysisResult => {
  if (!text.trim()) {
    return { level: 'safe', score: 100, reasons: [], suggestions: [], flaggedWords: [] };
  }

  const foundWords = sensitiveWords.filter(w => text.includes(w));
  const uniqueFound = [...new Set(foundWords)];

  if (uniqueFound.length === 0) {
    return {
      level: 'safe',
      score: 95 + Math.floor(Math.random() * 5),
      reasons: ['内容安全，未检测到违规信息'],
      suggestions: ['内容合规，可以正常发布'],
      flaggedWords: [],
    };
  }

  if (uniqueFound.length <= 2) {
    return {
      level: 'warning',
      score: Math.max(50, 80 - uniqueFound.length * 15),
      reasons: [`检测到 ${uniqueFound.length} 个敏感词`, '内容包含可能敏感的词汇'],
      suggestions: ['建议修改以下词汇', '删除或替换敏感内容后重新提交'],
      flaggedWords: uniqueFound,
    };
  }

  return {
    level: 'violation',
    score: Math.max(10, 40 - uniqueFound.length * 8),
    reasons: [`检测到 ${uniqueFound.length} 个违规词`, '内容包含明显违规信息', '建议大幅修改或重新编写'],
    suggestions: ['内容不符合社区规范', '请删除所有违规词汇', '重新编写合规内容后提交'],
    flaggedWords: uniqueFound,
  };
};

const levelConfig: Record<SafetyLevel, { color: string; icon: React.ReactNode; label: string }> = {
  safe: { color: 'green', icon: <CheckCircleOutlined />, label: '安全' },
  warning: { color: 'orange', icon: <WarningOutlined />, label: '需注意' },
  violation: { color: 'red', icon: <CloseCircleOutlined />, label: '违规' },
};

/**
 * ModerationHelper 主组件
 * 提供文本输入、内容分析和结果展示功能
 */
const ModerationHelper: React.FC = () => {
  const [text, setText] = useState('');                      // 待审核文本
  const [result, setResult] = useState<AnalysisResult | null>(null); // 分析结果
  const [analyzing, setAnalyzing] = useState(false);          // 是否正在分析

  /**
   * 执行内容分析
   * 调用 analyzeContent 函数并更新结果状态
   */
  const handleAnalyze = () => {
    if (!text.trim()) return;
    setAnalyzing(true);
    setTimeout(() => {
      setResult(analyzeContent(text));
      setAnalyzing(false);
    }, 400);
  };

  return (
    <div className="p-2">
      <div className="flex items-center gap-2 mb-4">
        <AuditOutlined className="text-purple-500 text-lg" />
        <span className="font-medium text-gray-700">AI 审核辅助</span>
        <Tag color="purple" className="ml-auto">内容安全检测</Tag>
      </div>

      <Space direction="vertical" className="w-full" size="middle">
        <div>
          <TextArea
            rows={4}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="输入需要审核的文本内容（帖子、评论、评测等）..."
            className="w-full"
          />
          <div className="flex justify-between items-center mt-2">
            <Text type="secondary" className="text-xs">{text.length} 字符</Text>
            <Button
              type="primary"
              icon={<SafetyOutlined />}
              onClick={handleAnalyze}
              loading={analyzing}
              disabled={!text.trim()}
            >
              开始审核
            </Button>
          </div>
        </div>

        {result && (
          <Card size="small" className={result.level === 'safe' ? 'bg-green-50' : result.level === 'warning' ? 'bg-orange-50' : 'bg-red-50'}>
            <Space direction="vertical" className="w-full" size="small">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag
                    icon={levelConfig[result.level].icon}
                    color={levelConfig[result.level].color}
                    className="text-sm px-3 py-1"
                  >
                    {levelConfig[result.level].label}
                  </Tag>
                  <Text strong>安全评分</Text>
                </div>
                <Text strong className={`text-${levelConfig[result.level].color}-600`}>
                  {result.score}分
                </Text>
              </div>

              <Progress
                percent={result.score}
                strokeColor={result.level === 'safe' ? '#52c41a' : result.level === 'warning' ? '#faad14' : '#ff4d4f'}
                size="small"
                showInfo={false}
              />

              {result.flaggedWords.length > 0 && (
                <div>
                  <Text className="text-sm font-medium">检测到敏感词汇：</Text>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {result.flaggedWords.map((word, idx) => (
                      <Tag key={idx} color="red">{word}</Tag>
                    ))}
                  </div>
                </div>
              )}

              <Divider className="my-1" />

              <div>
                <Text className="text-sm font-medium">分析详情：</Text>
                <ul className="text-sm text-gray-600 mt-1 mb-0 pl-4">
                  {result.reasons.map((r, idx) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </div>

              <div>
                <Text className="text-sm font-medium">修改建议：</Text>
                <ul className="text-sm text-gray-600 mt-1 mb-0 pl-4">
                  {result.suggestions.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
            </Space>
          </Card>
        )}

        {!result && (
          <div className="text-center py-6 text-gray-400">
            <SafetyOutlined className="text-3xl mb-2 block" />
            <Text type="secondary">AI 将分析文本中的违规内容并提供修改建议</Text>
          </div>
        )}

        <div className="text-xs text-gray-400 text-center">
          支持检测：敏感词、广告信息、人身攻击、违规内容等，仅供参考
        </div>
      </Space>
    </div>
  );
};

export default ModerationHelper;
