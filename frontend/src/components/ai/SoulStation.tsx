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
import { useSoulstationChat, useGames } from '../../api/hooks';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../api';

const { Title, Text } = Typography;
const { TextArea } = Input;

/** 话题快捷入口列表 */
const TOPICS = [
  { icon: '😤', label: '吐槽坑队友' },
  { icon: '😭', label: '抽卡沉船' },
  { icon: '🤯', label: 'BOSS太难' },
  { icon: '😂', label: '搞笑瞬间' },
  { icon: '💔', label: '被虐哭了' },
  { icon: '🎉', label: '终于通关' },
  { icon: '🤔', label: '剧情讨论' },
  { icon: '💡', label: '游戏建议' },
];

const MOODS = [
  { emoji: '😊', label: '开心', color: '#52c41a' },
  { emoji: '😤', label: '生气', color: '#ff4d4f' },
  { emoji: '😭', label: '难过', color: '#1677ff' },
  { emoji: '😌', label: '平静', color: '#722ed1' },
  { emoji: '🤩', label: '兴奋', color: '#fa8c16' },
  { emoji: '😴', label: '累了', color: '#13c2c2' },
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
  /* ====== 对话状态 ====== */
  const [selectedGame, setSelectedGame] = useState<string | null>(null); // 用户选择的游戏
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: '嗨！我是你的游戏心灵驿站 🌟 今天打游戏遇到了什么开心或槽心的事？都可以跟我聊聊~', timestamp: Date.now() },
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
      setMessages([{ role: 'ai', content: '嗨！我是你的游戏心灵驿站 🌟 今天打游戏遇到了什么开心或槽心的事？都可以跟我聊聊~', timestamp: Date.now() }]);
    }
  }, [isAuthenticated]);

  const saveHistory = async (msgs: Message[]) => {
    if (!isAuthenticated || msgs.length <= 1 || !historyId) return;
    const firstUserMsg = msgs.find(m => m.role === 'user');
    const title = firstUserMsg?.content?.slice(0, 20) || '新对话';
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
    const defaultMsg = { role: 'ai' as const, content: '嗨！我是你的游戏心灵驿站 🌟 今天打游戏遇到了什么开心或槽心的事？都可以跟我聊聊~', timestamp: Date.now() };
    setMessages([defaultMsg]);
    if (isAuthenticated) {
      try {
        const r = await apiService.saveAiHistory({ type: 'chat', title: '新对话', content: [defaultMsg] });
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
        ? `(当前正在讨论游戏《${selectedGame}》，请围绕此游戏回应)`
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
      setMessages(prev => [...prev, { role: 'ai', content: '抱歉，AI 暂时无法回复，请稍后再试 🙏', timestamp: Date.now() }]);
    }
  };

  /**
   * 点击话题快捷入口
   * 自动发送话题消息并获取 AI 回复
   * @param topic - 话题中文名称
   */
  const handleTopicClick = (topic: string) => {
    const userMsg: Message = { role: 'user', content: `来聊聊「${topic}」吧！`, timestamp: Date.now() };
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
        <Title level={4} className="!mb-2 !text-white" style={{ fontSize: '2.25rem' }}>💭 心灵驿站</Title>
        <Text className="text-gray-300" style={{ fontSize: '1.5rem' }}>这里没有对错，只有倾听。聊聊你的游戏故事吧</Text>
      </div>

      {/* 心情选择 */}
      <Card size="small" className="mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Text className="mr-2 text-sm" style={{ color: 'var(--c-text)' }}>今天心情：</Text>
          {MOODS.map((m) => (
            <Tag
              key={m.label}
              color={mood === m.label ? m.color : undefined}
              className={`cursor-pointer px-3 py-1 text-sm ${mood === m.label ? '' : 'border'}`}
              onClick={() => setMood(mood === m.label ? null : m.label)}
            >
              {m.emoji} {m.label}
            </Tag>
          ))}
        </div>
      </Card>

      {/* 游戏选择 */}
      <Card size="small" className="mb-4">
        <Space align="center" wrap>
          <PlayCircleOutlined className="text-lg" style={{ color: 'var(--c-text)' }} />
          <Text className="text-sm" style={{ color: 'var(--c-text)' }}>正在玩的游戏：</Text>
          <Select
            showSearch
            allowClear
            placeholder="选择或搜索游戏..."
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
              清除
            </Button>
          )}
        </Space>
      </Card>

      {/* 话题快速入口 */}
      <div className="flex flex-wrap gap-2">
        {TOPICS.map((topic) => (
          <motion.div key={topic.label} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button size="small" onClick={() => handleTopicClick(topic.label)} disabled={isPending}>
              {topic.icon} {topic.label}
            </Button>
          </motion.div>
        ))}
      </div>

      {/* 聊天区域：侧边栏 + 聊天 */}
      <div className="flex gap-3" style={{ height: 'calc(100vh - 450px)', minHeight: '400px' }}>
        {isAuthenticated && (
          <div className="w-56 flex-shrink-0 border border-dark-600 rounded-lg flex flex-col bg-dark-800/50">
            <div className="p-2 border-b border-dark-600">
              <Button block size="small" type="primary" onClick={newChat}>+ 新对话</Button>
            </div>
            <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
              {historyList.map((h: any) => (
                <div key={h.id}
                  onClick={() => loadHistory(h.id)}
                  className={`group px-2 py-1.5 rounded cursor-pointer text-xs transition-colors relative
                    ${historyId === h.id ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:bg-dark-700 hover:text-gray-200'}`}
                >
                  <div className="truncate pr-3">{h.title?.slice(0, 12) || '新对话'}</div>
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
                  <Spin indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />} /> AI 正在输入...
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex gap-2 mt-3">
          <TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="说说你的想法..."
            autoSize={{ minRows: 1, maxRows: 3 }}
            onPressEnter={(e) => { if (!e.shiftKey) { e.preventDefault(); handleSend(); } }}
            className="flex-1"
            disabled={isPending}
          />
          <Button type="primary" icon={<SendOutlined />} onClick={handleSend} className="self-end" loading={isPending}>
            发送
          </Button>
        </div>
      </Card>
      </div>
    </div>
  );
};

export default SoulStation;
