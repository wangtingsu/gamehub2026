/**
 * MemoryGame - 记忆翻牌游戏组件
 *
 * 经典的记忆配对游戏。桌面上有16张卡牌（8对动物表情符号），
 * 每次可以翻开两张，若图案相同则配对成功留在桌面，否则翻回背面。
 * 目标是使用尽可能少的步数找到所有配对的卡牌。
 *
 * 玩法机制：
 * - 点击卡牌将其翻开，每次最多翻开两张
 * - 两张图案相同则配对成功（保持翻面状态）
 * - 两张图案不同则0.6秒后自动翻回背面
 * - 游戏过程中锁定操作防止快速点击导致的逻辑错误
 * - 所有卡牌配对完成后即获胜
 * - 统计步数（每翻开两张算一步）
 *
 * 使用 Ant Design 组件进行UI布局，纯CSS过渡实现翻转动画。
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button, Typography } from 'antd';

const { Title, Text } = Typography;

interface GameProps {
  onScoreChange?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onGameStart?: () => void;
}

/** 所有可用的动物表情符号（共8种，每种出现两次组成8对） */
const EMOJIS = ['🐶', '🐱', '🐼', '🐸', '🦊', '🐯', '🐰', '🐨'];

/** 单张卡牌的数据结构 */
interface Card {
  id: number;         // 唯一标识
  emoji: string;      // 表情符号（配对依据）
  flipped: boolean;   // 是否已翻开
  matched: boolean;   // 是否已配对成功
}

/**
 * 创建并随机打乱16张卡牌
 * 将8种表情符号各复制一次得到16张牌，使用 Fisher-Yates 洗牌算法打乱顺序。
 * @returns 打乱后的卡牌数组
 */
const createCards = (): Card[] => {
  const pairs = [...EMOJIS, ...EMOJIS]; // 每种表情出现两次
  // Fisher-Yates 洗牌
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs.map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
};

const MemoryGame: React.FC<GameProps> = ({ onScoreChange, onGameOver, onGameStart }) => {
  /** 卡牌列表（16张） */
  const [cards, setCards] = useState<Card[]>(createCards);
  /** 当前翻开的卡牌ID列表（最多2个） */
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  /** 已配对的卡牌数量（每对2张，全部配对时=16） */
  const [matched, setMatched] = useState(0);
  /** 步数计数（每翻开两张算一步） */
  const [moves, setMoves] = useState(0);
  /** 游戏阶段：idle(待开始) | playing(游戏中) | won(已获胜) */
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'won'>('idle');
  /** 操作锁定：翻开两张后等待配对判定时禁止继续点击 */
  const [locked, setLocked] = useState(false);
  /** 配对判定定时器引用（用于组件卸载时清理） */
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /** 组件卸载时清理定时器，防止内存泄漏 */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  /**
   * 卡牌点击事件处理
   * 翻开一张卡牌，当两张被翻开时：
   * - 锁定操作防止进一步点击
   * - 0.6秒后对比两张卡牌的图案：
   *   - 相同：标记为已配对（保持翻开状态）
   *   - 不同：翻回背面
   * - 全部配对完成后触发游戏胜利
   * @param id 被点击卡牌的ID
   */
  const handleClick = useCallback((id: number) => {
    if (locked || gameState !== 'playing') return;
    const card = cards.find(c => c.id === id);
    if (!card || card.flipped || card.matched) return;

    // 翻开选中的卡牌
    const newCards = cards.map(c => c.id === id ? { ...c, flipped: true } : c);
    setCards(newCards);
    const newFlipped = [...flippedIds, id];
    setFlippedIds(newFlipped);

    if (newFlipped.length === 2) {
      // 两张牌已翻开，锁定操作并开始配对判定
      setLocked(true);
      setMoves(m => m + 1); // 增加步数
      const [first, second] = newFlipped.map(fid => newCards.find(c => c.id === fid)!);

      // 0.6秒延迟后进行配对判定（让玩家有时间看清图案）
      timeoutRef.current = setTimeout(() => {
        if (first.emoji === second.emoji) {
          // 配对成功：标记为已配对，保持翻开状态
          const matchedCards = cards.map(c =>
            c.id === first.id || c.id === second.id ? { ...c, matched: true, flipped: true } : c
          );
          setCards(matchedCards);
          const newMatched = matched + 2;
          setMatched(newMatched);
          onScoreChange?.(newMatched * 10);
          // 检查是否所有卡牌都已配对
          if (newMatched === cards.length) {
            setGameState('won');
            onGameOver?.(moves + 1); // +1因为moves尚未更新
          }
        } else {
          // 配对失败：翻回背面
          setCards(cards.map(c =>
            c.id === first.id || c.id === second.id ? { ...c, flipped: false } : c
          ));
        }
        setFlippedIds([]);
        setLocked(false);
      }, 600);
    }
  }, [cards, flippedIds, locked, gameState, matched, onScoreChange, onGameOver, moves]);

  /**
   * 开始新游戏
   * 重新洗牌创建卡牌，重置所有游戏状态。
   */
  const startGame = useCallback(() => {
    setCards(createCards());
    setFlippedIds([]);
    setMatched(0);
    setMoves(0);
    setLocked(false);
    setGameState('playing');
    onGameStart?.();
  }, []);

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-between w-full max-w-[350px] mb-3">
        <Title level={4} className="!text-white !mb-0">记忆翻牌</Title>
        <div className="flex items-center gap-3">
          <Text className="!text-gray-400">步数: {moves}</Text>
          <Text className="!text-gray-400">{matched / 2}/{EMOJIS.length}</Text>
        </div>
      </div>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(4, 75px)` }}
      >
        {cards.map(card => (
          <div
            key={card.id}
            onClick={() => handleClick(card.id)}
            className={`
              w-[75px] h-[75px] flex items-center justify-center text-3xl rounded-xl cursor-pointer select-none
              transition-all duration-300 transform
              ${card.flipped || card.matched
                ? 'bg-dark-600 text-white scale-100'
                : 'bg-gradient-to-br from-blue-600 to-purple-600 text-transparent scale-100 hover:scale-105'
              }
              ${card.matched ? 'opacity-60' : ''}
            `}
          >
            {card.flipped || card.matched ? card.emoji : '?'}
          </div>
        ))}
      </div>
      {gameState === 'idle' && (
        <Button type="primary" className="mt-4" onClick={startGame}>开始游戏</Button>
      )}
      {gameState === 'won' && (
        <div className="mt-4 text-center">
          <Text className="!text-green-400 !block mb-2">恭喜! 你用了 {moves} 步完成!</Text>
          <Button type="primary" onClick={startGame}>再来一局</Button>
        </div>
      )}
      {gameState === 'playing' && (
        <Text className="!text-gray-500 !text-xs mt-2">点击卡片翻面，找到所有配对</Text>
      )}
    </div>
  );
};

export default MemoryGame;
