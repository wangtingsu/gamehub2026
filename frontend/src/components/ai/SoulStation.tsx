/**
 * SoulStation - AI 心灵驿站组件
 *
 * 提供一个情感倾诉和游戏话题交流的聊天空间：
 * - 心情选择标签（开心、生气、难过等）
 * - 游戏选择（从 API 获取游戏列表）
 * - 话题快捷入口（吐槽坑队友、抽卡沉船等）
 * - 实时聊天（调用后端 AI API）
 * - 动画消息列表（framer-motion AnimatePresence）
 */
import { useState, useRef, useEffect } from 'react';
import { Card, Button, Input, Tag, Typography, Avatar, Spin, Select, Space } from 'antd';
import { SendOutlined, HeartOutlined, BulbOutlined, LoadingOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSoulstationChat, useGames } from '../../api/hooks';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../api';

const { Title, Text } = Typography;
const { TextArea } = Input;

/** 话题快捷入口列表 */
const TOPICS = [
  { icon: '😤', key: 't0' },
  { icon: '😭', key: 't1' },
  { icon: '🤯', key: 't2' },
  { icon: '😂', key: 't3' },
  { icon: '💔', key: 't4' },
  { icon: '🎉', key: 't5' },
  { icon: '🤔', key: 't6' },
  { icon: '💡', key: 't7' },
];

const MOODS = [
  { emoji: '😊', key: 'happy', color: '#52c41a' },
  { emoji: '😤', key: 'angry', color: '#ff4d4f' },
  { emoji: '😭', key: 'sad', color: '#1677ff' },
  { emoji: '😌', key: 'calm', color: '#722ed1' },
  { emoji: '🤩', key: 'excited', color: '#fa8c16' },
  { emoji: '😴', key: 'tired', color: '#13c2c2' },
];

interface Message {
  role: 'user' | 'ai';
  content: string;
  timestamp: number;
}

/**
 * SoulStation 主组件
 * 管理心情选择、游戏选择、消息列表和 AI 对话
 */
const SoulStation: React.FC = () => {
  const { t } = useTranslation();

  /* ====== 对话状态 ====== */
  const [selectedGame, setSelectedGame] = useState<string | null>(null); // 用户选择的游戏
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: t('aiAssistant.soul.welcome'), timestamp: Date.now() },
  ]);
  const [input, setInput] = useState('');        // 当前输入文本
  const [mood, setMood] = useState<string | null>(null); // 用户当前心情
  const { mutateAsync: chat, isPending } = useSoulstationChat();
  const { data: games = [] } = useGames({ limit: 50 }); // 游戏列表
  const { isAuthenticated } = useAuth();

  // 历史记录
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  useEffect(() => {
    if (isAuthenticated) {
      apiService.getAiHistory('chat').then(d => setHistoryList(d || [])).catch(() => {});
    } else {
      setHistoryList([]);
      setHistoryId(null);
      setMessages([{ role: 'ai', content: t('aiAssistant.soul.welcome'), timestamp: Date.now() }]);
    }
  }, [isAuthenticated]);

  const saveHistory = async (msgs: Message[]) => {
    if (!isAuthenticated || msgs.length <= 1 || !historyId) return;
    const firstUserMsg = msgs.find(m => m.role === 'user');
    const title = firstUserMsg?.content?.slice(0, 20) || t('aiAssistant.soul.newConversation');
    try {
      // 直接 UPDATE 当前记录
      const token = localStorage.getItem('accessToken');
      await fetch(`/api/v1/ai/history/${historyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, content: msgs }),
      });
    } catch {}
  };

  const loadHistory = async (id: string) => {
    try {
      const detail = await apiService.getAiHistoryDetail(id);
      if (detail?.content) {
        setMessages(detail.content);
        setHistoryId(id);
      }
    } catch {}
  };

  const newChat = async () => {
    const defaultMsg = { role: 'ai' as const, content: t('aiAssistant.soul.welcome'), timestamp: Date.now() };
    setMessages([defaultMsg]);
    if (isAuthenticated) {
      try {
        const r = await apiService.saveAiHistory({ type: 'chat', title: t('aiAssistant.soul.newConversation'), content: [defaultMsg] });
        setHistoryId(r.id);
        const list = await apiService.getAiHistory('chat');
        setHistoryList(list || []);
      } catch {}
    }
  };

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  /**
   * 新消息时自动滚动到底部
   */
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  /**
   * 调用 AI API 获取回复并添加到消息列表
   * 如果用户选择了游戏，将游戏上下文传递给 API
   * @param conversationMessages - 当前对话历史消息
   */
  const addAiReply = async (conversationMessages: Message[]) => {
    try {
      const gameContext = selectedGame
        ? t('aiAssistant.soul.gameContext', { game: selectedGame })
        : '';
      const apiMessages = [
        ...(gameContext ? [{ role: 'system' as const, content: gameContext }] : []),
        ...conversationMessages.map(m => ({
          role: m.role === 'ai' ? 'assistant' as const : 'user' as const,
          content: m.content,
        })),
      ];
      const res = await chat(apiMessages);
      setMessages(prev => {
        const updated: Message[] = [...prev, { role: 'ai', content: res.reply, timestamp: Date.now() }];
        saveHistory(updated);
        return updated;
      });
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: t('aiAssistant.soul.error'), timestamp: Date.now() }]);
    }
  };

  /**
   * 点击话题快捷入口
   * 自动发送话题消息并获取 AI 回复
   * @param topic - 话题名称
   */
  const handleTopicClick = (topic: string) => {
    const userMsg: Message = { role: 'user', content: t('aiAssistant.soul.topicPrompt', { topic }), timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    addAiReply(newMessages);
  };

  /**
   * 发送用户输入的消息
   * 获取 AI 回复后追加到消息列表
   */
  const handleSend = () => {
    if (!input.trim() || isPending) return;
    const userMsg: Message = { role: 'user', content: input, timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    addAiReply(newMessages);
  };

  return (
    <div className="space-y-6 ai-soul-page">
      <div className="text-center mb-4">
        <Title level={4} className="!mb-2 !text-white" style={{ fontSize: '2.25rem' }}>💭 {t('aiAssistant.soul.title')}</Title>
        <Text className="text-gray-300" style={{ fontSize: '1.5rem' }}>{t('aiAssistant.soul.subtitle')}</Text>
      </div>

      {/* 心情选择 */}
      <Card size="small" className="mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Text className="mr-2 text-sm" style={{ color: 'var(--c-text)' }}>{t('aiAssistant.soul.moodLabel')}</Text>
          {MOODS.map((m) => (
            <Tag
              key={m.key}
              color={mood === m.key ? m.color : undefined}
              className={`cursor-pointer px-3 py-1 text-sm ${mood === m.key ? '' : 'border'}`}
              onClick={() => setMood(mood === m.key ? null : m.key)}
            >
              {m.emoji} {t(`aiAssistant.soul.moods.${m.key}`)}
            </Tag>
          ))}
        </div>
      </Card>

      {/* 游戏选择 */}
      <Card size="small" className="mb-4">
        <Space align="center" wrap>
          <PlayCircleOutlined className="text-lg" style={{ color: 'var(--c-text)' }} />
          <Text className="text-sm" style={{ color: 'var(--c-text)' }}>{t('aiAssistant.soul.gameLabel')}</Text>
          <Select
            showSearch
            allowClear
            placeholder={t('aiAssistant.soul.gamePlaceholder')}
            value={selectedGame}
            onChange={(val) => setSelectedGame(val)}
            onClear={() => setSelectedGame(null)}
            style={{ minWidth: 200 }}
            filterOption={(input, option) =>
              (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={[
              ...(games || []).map((g: any) => ({
                value: g.title || g.name,
                label: g.title || g.name,
              })),
            ]}
          />
          {selectedGame && (
            <Button size="small" type="text" onClick={() => setSelectedGame(null)}>
              {t('aiAssistant.soul.clear')}
            </Button>
          )}
        </Space>
      </Card>

      {/* 话题快速入口 */}
      <div className="flex flex-wrap gap-2">
        {TOPICS.map((topic) => (
          <motion.div key={topic.key} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button size="small" onClick={() => handleTopicClick(t(`aiAssistant.soul.topics.${topic.key}`))} disabled={isPending}>
              {topic.icon} {t(`aiAssistant.soul.topics.${topic.key}`)}
            </Button>
          </motion.div>
        ))}
      </div>

      {/* 聊天区域：侧边栏 + 聊天 */}
      <div className="flex gap-3" style={{ height: 'calc(100vh - 450px)', minHeight: '400px' }}>
        {isAuthenticated && (
          <div className="w-56 flex-shrink-0 border border-dark-600 rounded-lg flex flex-col bg-dark-800/50">
            <div className="p-2 border-b border-dark-600">
              <Button block size="small" type="primary" onClick={newChat}>{t('aiAssistant.soul.newChat')}</Button>
            </div>
            <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
              {historyList.map((h: any) => (
                <div key={h.id}
                  onClick={() => loadHistory(h.id)}
                  className={`group px-2 py-1.5 rounded cursor-pointer text-xs transition-colors relative
                    ${historyId === h.id ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:bg-dark-700 hover:text-gray-200'}`}
                >
                  <div className="truncate pr-3">{h.title?.slice(0, 12) || t('aiAssistant.soul.newConversation')}</div>
                  <button className="absolute right-1 top-0.5 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100"
                    onClick={async (e) => { e.stopPropagation(); await apiService.deleteAiHistory(h.id); setHistoryList(prev => prev.filter(x => x.id !== h.id)); if (historyId === h.id) setHistoryId(null); }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <Card className="!bg-dark-800 border-dark-700 flex-1" bodyStyle={{ padding: '12px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="flex-1 overflow-y-auto space-y-3 px-2" ref={messagesContainerRef}>
          <AnimatePresence>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <Avatar
                  size={32}
                  className={msg.role === 'ai' ? 'bg-purple-500' : 'bg-blue-500'}
                  icon={msg.role === 'ai' ? <BulbOutlined /> : <HeartOutlined />}
                />
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-500 text-white rounded-tr-sm'
                      : 'bg-white text-gray-800 rounded-tl-sm shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}
            {isPending && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2"
              >
                <Avatar size={32} className="bg-purple-500" icon={<BulbOutlined />} />
                <div className="bg-white text-gray-800 rounded-xl rounded-tl-sm shadow-sm px-3 py-2 text-sm">
                  <Spin indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />} /> {t('aiAssistant.soul.typing')}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex gap-2 mt-3">
          <TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('aiAssistant.soul.inputPlaceholder')}
            autoSize={{ minRows: 1, maxRows: 3 }}
            onPressEnter={(e) => { if (!e.shiftKey) { e.preventDefault(); handleSend(); } }}
            className="flex-1"
            disabled={isPending}
          />
          <Button type="primary" icon={<SendOutlined />} onClick={handleSend} className="self-end" loading={isPending}>
            {t('aiAssistant.soul.send')}
          </Button>
        </div>
      </Card>
      </div>
    </div>
  );
};

export default SoulStation;
