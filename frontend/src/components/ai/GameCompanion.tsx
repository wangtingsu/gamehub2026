/**
 * GameCompanion - AI 命理师（游戏角色推荐）组件
 *
 * 通过性格测试问卷推荐最适合用户的游戏角色和玩法：
 * - 三步流程：输入游戏名称 -> 四道性格测试题 -> 获取推荐结果
 * - 基于 API 的真实推荐（useGameCompanionRecommend）
 * - 支持多种游戏的匹配数据
 * - 动画过渡效果（framer-motion AnimatePresence）
 */
import { useState } from 'react';
import { Card, Button, Typography, Row, Col, Progress, Tag, Input, Divider, Spin } from 'antd';
import { ThunderboltOutlined, ReloadOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useGameCompanionRecommend } from '../../api/hooks';

const { Title, Text, Paragraph } = Typography;

/** 性格测试问题列表：每个问题包含 4 个选项（选项 value 用于提交给后端） */
const QUESTIONS = [
  { options: [
    { value: 'combat', icon: '⚔️' },
    { value: 'strategy', icon: '🧠' },
    { value: 'explore', icon: '🗺️' },
    { value: 'social', icon: '🤝' },
  ]},
  { options: [
    { value: 'action', icon: '💥' },
    { value: 'rpg', icon: '👥' },
    { value: 'simulation', icon: '🏗️' },
    { value: 'puzzle', icon: '🧩' },
  ]},
  { options: [
    { value: 'leader', icon: '👑' },
    { value: 'damage', icon: '🔥' },
    { value: 'support', icon: '💚' },
    { value: 'solo', icon: '🐺' },
  ]},
  { options: [
    { value: 'easy', icon: '🌿' },
    { value: 'medium', icon: '⚡' },
    { value: 'hard', icon: '💀' },
    { value: 'expert', icon: '🔥' },
  ]},
];

const PRESET_GAME_KEYS = ['g0', 'g1', 'g2', 'g3', 'g4', 'g5'];

/**
 * GameCompanion 主组件
 * 分三步进行：开始界面(输入游戏名称) -> 测试问卷(4道题) -> 推荐结果展示
 */
const GameCompanion: React.FC = () => {
  const { t } = useTranslation();

  /* ====== 流程状态 ====== */
  const [step, setStep] = useState<'start' | 'quiz' | 'result'>('start'); // 当前步骤
  const [gameName, setGameName] = useState('');        // 用户输入的游戏名称
  const [currentQ, setCurrentQ] = useState(0);         // 当前问题索引
  const [answers, setAnswers] = useState<string[]>([]); // 用户答案数组
  const { mutateAsync: recommend, isPending, data: result, reset: resetResult } = useGameCompanionRecommend();

  /**
   * 开始测试：进入问卷阶段
   * 需先输入游戏名称
   */
  const handleStart = () => {
    if (!gameName.trim()) return;
    setStep('quiz');
  };

  /**
   * 回答问题
   * 自动跳转下一题，答完最后一道题后调用 API 获取推荐结果
   * @param value - 选中的选项值
   */
  const handleAnswer = (value: string) => {
    const newAnswers = [...answers, value];
    setAnswers(newAnswers);
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      // 最后一道题已回答，调用后端 API 获取推荐
      setStep('result');
      recommend({ gameName: gameName.trim(), answers: newAnswers });
    }
  };

  /** 重新开始测试，重置所有状态 */
  const handleRestart = () => {
    setStep('start');
    setCurrentQ(0);
    setAnswers([]);
    setGameName('');
    resetResult();
  };

  const results = result?.recommendations || [];
  const matchedGame = result?.matchedGame || null;

  return (
    <div className="space-y-6 ai-companion-page">
      <div className="text-center mb-4">
        <Title level={4} className="!mb-2 !text-white" style={{ fontSize: '3rem' }}>🎮 {t('aiAssistant.companion.title')}</Title>
        <Text className="text-gray-300" style={{ fontSize: '1.8rem' }}>{t('aiAssistant.companion.subtitle')}</Text>
      </div>

      <AnimatePresence mode="wait">
        {step === 'start' && (
          <motion.div key="start" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="text-center bg-gradient-to-b from-blue-900/20 to-purple-900/20 border-dark-700">
              <div className="text-6xl mb-4">🧙</div>
              <Title level={3} className="!text-gray-100">{t('aiAssistant.companion.startTitle')}</Title>
              <Paragraph className="text-gray-300 max-w-lg mx-auto">
                {t('aiAssistant.companion.startDesc')}
              </Paragraph>

              <div className="max-w-md mx-auto mb-6">
                <Input
                  size="large"
                  placeholder={t('aiAssistant.companion.gamePlaceholder')}
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  prefix={<PlayCircleOutlined />}
                  className="mb-2"
                />
                <div className="flex flex-wrap gap-1 justify-center mt-2">
                  {PRESET_GAME_KEYS.map(k => {
                    const g = t(`aiAssistant.companion.presetGames.${k}`);
                    return (
                      <Tag
                        key={k}
                        className="cursor-pointer hover:scale-105 transition-transform"
                        color={gameName === g ? 'blue' : 'default'}
                        onClick={() => setGameName(g)}
                      >
                        {g}
                      </Tag>
                    );
                  })}
                  <Tag className="text-gray-400">{t('aiAssistant.companion.more')}</Tag>
                </div>
              </div>

              <Button
                type="primary"
                size="large"
                icon={<ThunderboltOutlined />}
                onClick={handleStart}
                disabled={!gameName.trim()}
                className="!bg-primary-700 !border-primary-700 hover:!bg-primary-800"
              >
                {t('aiAssistant.companion.start')}
              </Button>
              {!gameName.trim() && <Text className="block mt-2 text-sm text-gray-400">{t('aiAssistant.companion.enterGameFirst')}</Text>}
            </Card>
          </motion.div>
        )}

        {step === 'quiz' && (
          <motion.div key="quiz" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            <Card className="mb-4 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-dark-700">
              <div className="flex items-center gap-2">
                <PlayCircleOutlined className="text-lg text-white" />
                <Text strong className="text-white">{t('aiAssistant.companion.currentGame', { game: gameName })}</Text>
              </div>
            </Card>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <Text className="text-gray-400">{t('aiAssistant.companion.question', { current: currentQ + 1, total: QUESTIONS.length })}</Text>
                <Text className="text-gray-400">{Math.round(((currentQ + 1) / QUESTIONS.length) * 100)}%</Text>
              </div>
              <Progress percent={Math.round(((currentQ + 1) / QUESTIONS.length) * 100)} showInfo={false} strokeColor="#722ed1" />
            </div>

            <Card className="bg-dark-800 border-dark-700">
              <Title level={4} className="text-center mb-6 !text-white">{t(`aiAssistant.companion.questions.q${currentQ}.question`)}</Title>
              <Row gutter={[16, 16]}>
                {QUESTIONS[currentQ].options.map((opt) => (
                  <Col xs={12} key={opt.value}>
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                      <Card
                        hoverable
                        className="text-center cursor-pointer bg-dark-800 border-dark-700"
                        onClick={() => handleAnswer(opt.value)}
                      >
                        <div className="text-3xl mb-2">{opt.icon}</div>
                        <Text strong className="text-white">{t(`aiAssistant.companion.questions.q${currentQ}.options.${opt.value}`)}</Text>
                      </Card>
                    </motion.div>
                  </Col>
                ))}
              </Row>
            </Card>
          </motion.div>
        )}

        {step === 'result' && (
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {isPending ? (
              <Card className="text-center py-16 bg-dark-800 border-dark-700">
                <Spin size="large" />
                <div className="mt-4">
                  <Text className="text-lg text-gray-300">{t('aiAssistant.companion.generating')}</Text>
                </div>
              </Card>
            ) : (
              <>
                <Card className="bg-gradient-to-b from-green-900/20 to-blue-900/20 border-dark-700 text-center mb-4">
                  <div className="text-5xl mb-3">🎉</div>
                  <Title level={3} className="!text-white">
                    {matchedGame
                      ? t('aiAssistant.companion.matchedTitle', { game: matchedGame })
                      : t('aiAssistant.companion.completedTitle')}
                  </Title>
                  {matchedGame && (
                    <Paragraph className="text-gray-300 mb-0">
                      {t('aiAssistant.companion.basedOn', { game: matchedGame })}
                    </Paragraph>
                  )}
                  {!matchedGame && gameName && (
                    <Paragraph className="text-gray-300 mb-0">
                      {t('aiAssistant.companion.notCollected', { game: gameName })}
                    </Paragraph>
                  )}
                </Card>

                <Row gutter={[16, 16]}>
                  {results.map((r: any, idx: number) => (
                    <Col xs={24} sm={12} key={idx}>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.2 }}
                      >
                        <Card className="h-full hover:shadow-lg transition-shadow bg-dark-800 border-dark-700">
                          <div className="text-center mb-3">
                            <div className="text-5xl mb-2">{['🛡️', '⚔️', '🔮', '🗡️', '💚', '🏹'][idx] || '🎮'}</div>
                            <Title level={3} className="!mb-1 !text-white">{r.name}</Title>
                            <Tag color="purple">{r.role}</Tag>
                          </div>
                          <Paragraph className="text-gray-300 text-center">{r.description}</Paragraph>
                          <div className="mb-3">
                            <Text className="text-white">{t('aiAssistant.companion.matchRate')}</Text>
                            <Progress percent={r.matchScore} strokeColor="#722ed1" size="small" />
                          </div>
                          <Divider className="my-3 border-dark-600" />
                          <div>
                            <Text className="font-medium block mb-1 text-white">{t('aiAssistant.companion.playStyle')}</Text>
                            <Paragraph className="text-gray-400 mb-0">{r.playStyle}</Paragraph>
                          </div>
                        </Card>
                      </motion.div>
                    </Col>
                  ))}
                </Row>
              </>
            )}

            <div className="text-center mt-6">
              <Button icon={<ReloadOutlined />} onClick={handleRestart}>{t('aiAssistant.companion.restart')}</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GameCompanion;
