/**
 * GuandanGame - 掼蛋主游戏组件
 *
 * 掼蛋是一种流行的中国扑克游戏，通常由4名玩家参与（2对2组队）。
 * 游戏使用一副54张的扑克牌（含大小王），玩家需要按特定牌型出牌，
 * 包括单张、对子、三同张、三连带、钢板、顺子、同花顺等。
 * 率先出完手牌的玩家所在队伍获胜，并根据名次计算升级。
 *
 * 本组件实现了完整的掼蛋游戏：
 * - 玩家与3个AI对手对战（2对2组队模式）
 * - 支持选牌、出牌、不出、提示、整理手牌
 * - Canvas 渲染牌桌、手牌和交互按钮
 * - AI 自动出牌决策
 * - 升级系统（根据出完顺序计算升级等级）
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Suit, Rank, Player, PlayedCards, GameStateData, setGameLevel } from '../../utils/guandan/types';
import { createDeck, shuffleDeck, dealCards, sortHand, removeCards, groupByRank } from '../../utils/guandan/cards';
import { identifyPattern, getSuggestion, getLeadSuggestion } from '../../utils/guandan/patterns';
import { isValidPlay, checkAllOut, calculateLevelUp, getNextLevel, nextActivePlayer, getLevelName, createInitialState } from '../../utils/guandan/rules';
import { aiChoosePlay, aiLeadPlay } from '../../utils/guandan/ai';
import {
  TABLE_W, TABLE_H, CARD_W, CARD_H, CENTER_Y,
  drawTable, drawHand, drawOpponentCards, drawPlayedCards,
  drawButton, drawMessage, drawGameInfo, drawResult, ButtonRect,
} from '../../utils/guandan/renderer';

interface GameProps {
  onScoreChange?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onGameStart?: () => void;
}

/**
 * 计算手牌布局参数
 * 根据手牌数量动态计算牌与牌之间的间距和起始绘制位置，
 * 确保手牌在桌面上居中且不重叠。
 * @param cardCount 手牌数量
 * @returns 包含间距(gap)、起始X坐标(startX)和Y坐标(cardY)的布局参数
 */
function calcHandLayout(cardCount: number) {
  const maxGap = 36;
  const minGap = 16;
  const availableW = TABLE_W - 20;
  const gap = cardCount > 1
    ? Math.max(minGap, Math.min(maxGap, (availableW - CARD_W) / (cardCount - 1)))
    : 0;
  const totalW = Math.max(cardCount - 1, 1) * gap + CARD_W;
  const startX = Math.max(0, (TABLE_W - totalW) / 2);
  return { gap, startX, cardY: TABLE_H - 100 };
}

/**
 * 智能整理手牌
 * 按照掼蛋策略优先级对手牌进行排序：同花顺 > 钢板(连续三同张) > 对子 > 单张。
 * 优先将能组成大牌型的牌放在一起，便于玩家快速识别和出牌。
 * @param hand 原始手牌数组
 * @returns 按优先级排序后的新手牌数组
 */
function smartSortCards(hand: Card[]): Card[] {
  // 按 rank 分组（如所有A、所有K等）
  const rankGroups = groupByRank(hand);
  const sorted = sortHand(hand);

  // 检测同花顺（5张同花色连续rank）
  const suitGroups = new Map<string, Card[]>();
  for (const c of sorted) {
    if (c.rank >= 99) continue; // 跳过大小王（rank>=99的特殊牌）
    const key = c.suit;
    if (!suitGroups.has(key)) suitGroups.set(key, []);
    suitGroups.get(key)!.push(c);
  }

  const used = new Set<number>(); // 记录已被分配到结果中的牌ID
  const result: Card[] = [];

  // 1. 找同花顺 — 同一花色中连续5张rank
  for (const [, sgroup] of suitGroups) {
    if (sgroup.length < 5) continue;
    // 提取该花色所有去重rank，升序排列
    const srank = [...new Set(sgroup.map(c => c.rank))].sort((a, b) => a - b);
    // 从高位向低位检测连续5张（倒序遍历以优先保留大牌）
    for (let i = srank.length - 5; i >= 0; i--) {
      if (used.size >= hand.length) break;
      const seq = srank.slice(i, i + 5);
      // 首尾rank差4即为连续（如 9,10,J,Q,K 差为4）
      if (seq[4] - seq[0] === 4) {
        const cards = seq.map(r => hand.find(c => c.rank === r && c.suit === sgroup[0].suit && !used.has(c.id))!).filter(Boolean);
        if (cards.length === 5) {
          result.push(...cards);
          cards.forEach(c => used.add(c.id));
        }
      }
    }
  }

  // 2. 找钢板（连续三同张，如 333444）
  const tripleRanks = [...rankGroups.entries()]
    .filter(([r, g]) => g.length >= 3 && r <= 14) // 至少有3张且不是大小王
    .map(([r]) => r)
    .sort((a, b) => b - a); // 从大到小排列

  for (let i = 0; i < tripleRanks.length - 1; i++) {
    const r1 = tripleRanks[i];
    const r2 = tripleRanks[i + 1];
    if (r1 - r2 === 1) { // 两组成连续rank
      const cards1 = rankGroups.get(r1)!.filter(c => !used.has(c.id)).slice(0, 3);
      const cards2 = rankGroups.get(r2)!.filter(c => !used.has(c.id)).slice(0, 3);
      if (cards1.length === 3 && cards2.length === 3) {
        result.push(...cards1, ...cards2);
        cards1.forEach(c => used.add(c.id));
        cards2.forEach(c => used.add(c.id));
        i++; // 跳过下一组（已被使用）
      }
    }
  }

  // 3. 对子 — 将剩余牌中成对的提取出来
  for (const [, group] of rankGroups) {
    const remaining = group.filter(c => !used.has(c.id));
    if (remaining.length >= 2) {
      result.push(remaining[0], remaining[1]);
      used.add(remaining[0].id);
      used.add(remaining[1].id);
    }
  }

  // 4. 单张 — 剩余未分配的牌（从大到小排序）
  const remaining = hand.filter(c => !used.has(c.id));
  result.push(...remaining.sort((a, b) => b.rank - a.rank));

  return result;
}

const GuandanGame: React.FC<GameProps> = ({ onScoreChange, onGameOver, onGameStart }) => {
  const { t } = useTranslation('games');
  // Canvas 引用，用于直接操作画布绘制
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // requestAnimationFrame 动画帧 ID，用于清理循环
  const animRef = useRef<number>(0);
  // 游戏状态 Ref（不触发重渲染），包含所有玩家、手牌、出牌记录等
  const gRef = useRef<GameStateData>(createInitialState());

  // 游戏阶段：idle(待开始) | playing(进行中) | over(本局结束)
  const [gamePhase, setGamePhase] = useState<'idle' | 'playing' | 'over'>('idle');
  // 当前选中的手牌索引集合（玩家点击选取的牌）
  const [selected, setSelected] = useState<Set<number>>(new Set());
  // 游戏消息提示（显示在桌面中央）
  const [message, setMessage] = useState(t('gameUI.guandan.clickToDeal'));
  // 本局升级级数（结算时展示）
  const [levelUp, setLevelUp] = useState(0);
  // 升级后的下一等级名称
  const [nextLevel, setNextLevel] = useState('');
  // AI 玩家名字
  const aiNames = ['Alex', 'Bob', 'Carl'];
  // 鼠标悬停的按钮标签（用于高亮效果）
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
  // AI 是否正在思考（用于禁用玩家操作和显示等待提示）
  const [aiThinking, setAiThinking] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState(-1);
  const passTS = useRef<Record<number, number>>({});

  // 初始化等级
  useEffect(() => { setGameLevel(gRef.current.level); }, []);
  // 按钮区域数组，供点击/悬停检测使用
  const buttons = useRef<ButtonRect[]>([]);

  /** 同步 message 状态到 gRef，以便渲染函数能获取最新消息 */
  useEffect(() => { gRef.current.message = message; }, [message]);

  /**
   * 开始新游戏（或下一局）
   * 创建并洗牌一副新牌，平均分给4名玩家，初始化游戏状态。
   * 玩家0为人类玩家，其余为AI。玩家按索引奇偶分为两个队伍（0-2一队，1-3一队）。
   */
  const startGame = useCallback(() => {
    const g = gRef.current;
    const deck = shuffleDeck(createDeck()); // 创建并洗牌
    const hands = dealCards(deck);          // 发牌给4位玩家

    g.players = hands.map((hand, i) => ({
      id: i,
      hand: smartSortCards(hand), // 智能整理手牌
      team: i % 2,                // 0和2一队，1和3一队
      isHuman: i === 0,           // 仅玩家0是人类
      playedOut: false,
    }));

    // 重置游戏状态
    g.currentPlayer = 0;     // 从玩家0开始
    g.lastPlay = null;        // 上次出牌记录
    g.lastPlayBy = null;      // 上次出牌者
    g.passCount = 0;          // 连续过牌计数
    g.turnNumber = 0;         // 回合数
    g.phase = 'play';         // 游戏阶段
    g.completedRank = [];     // 出完顺序列表
    g.message = t('gameUI.guandan.yourTurn');  // 初始消息
    setGamePhase('playing');
    setSelected(new Set());
    setMessage(t('gameUI.guandan.yourTurn'));
    setLevelUp(0);
    setNextLevel('');
    setAiThinking(false);
    if (onGameStart) onGameStart();
  }, [onGameStart]);

  /**
   * 玩家点击"出牌"按钮
   * 验证选中的牌是否符合规则（牌型匹配、大小比较等），若有效则执行出牌。
   */
  const handlePlayCards = useCallback(() => {
    const g = gRef.current;
    if (g.players[0].playedOut || g.phase !== 'play') return;
    const sorted = sortHand(g.players[0].hand);
    const selCards = [...selected].map(i => sorted[i]); // 按选中索引获取牌
    const result = isValidPlay(g.players[0].hand, selCards, g.lastPlay, g.lastPlayBy, 0);
    if (!result.valid) { setMessage(result.reason || t('gameUI.guandan.invalidPlay')); return; }
    doPlayCards(0, selCards, result.played!);
  }, [selected]);

  /**
   * 玩家点击"不出"按钮
   * 跳过本回合。如果有上家出的牌且不是自己出的，可以选择不出。
   */
  const handlePass = useCallback(() => {
    const g = gRef.current;
    if (g.players[0].playedOut || g.phase !== 'play') return;
    if (!g.lastPlay || g.lastPlayBy === 0) { setMessage(t('gameUI.guandan.youMustPlay')); return; }
    setMessage(t('gameUI.pass'));
    passTS.current[0] = Date.now();
    g.passCount++;
    nextTurn();
  }, []);

  /**
   * 玩家点击"提示"按钮
   * 根据当前手牌和桌面上的牌型，智能推荐一组可以出的牌，
   * 并自动选中这些牌供玩家参考。
   */
  const handleHint = useCallback(() => {
    const g = gRef.current;
    if (g.players[0].playedOut || g.phase !== 'play') return;
    const sorted = sortHand(g.players[0].hand);
    // 自由出牌时使用领出提示，否则根据上家牌型给出提示
    const suggestion = (!g.lastPlay || g.lastPlayBy === 0)
      ? aiLeadPlay(sorted, groupByRank(sorted), g.players, 0) : getSuggestion(sorted, g.lastPlay);
    if (suggestion) {
      const indices = new Set<number>();
      for (const card of suggestion) {
        const idx = sorted.findIndex(c => c.id === card.id);
        if (idx >= 0) indices.add(idx);
      }
      setSelected(indices);
      setMessage(t('gameUI.guandan.hintCards', { num: suggestion.length }));
    } else setMessage(t('gameUI.guandan.noPlayableCards'));
  }, []);

  /**
   * 玩家点击"整理"按钮
   * 使用智能整理算法重新对手牌排序，清空当前选中状态。
   */
  const handleSort = useCallback(() => {
    const g = gRef.current;
    const p = g.players[0];
    if (p.playedOut) return;
    p.hand = smartSortCards(p.hand);
    setSelected(new Set());
    setMessage(t('gameUI.guandan.handSorted'));
  }, []);

  /**
   * 执行出牌操作
   * 从玩家手牌中移除已出的牌，更新桌面上最后一次出牌记录，
   * 如果玩家出完手牌则标记为"已出完"并检查是否全部出完。
   * @param playerIdx 出牌玩家的索引
   * @param cards 玩家选中的牌
   * @param played 经规则验证后的出牌对象（包含牌型和结构）
   */
  const doPlayCards = (playerIdx: number, cards: Card[], played: PlayedCards) => {
    const g = gRef.current;
    const player = g.players[playerIdx];
    player.hand = removeCards(player.hand, cards);
    g.lastPlay = played;    // 记录最后出牌，供后续玩家比较
    g.lastPlayBy = playerIdx;
    g.passCount = 0;         // 有人出牌后重置过牌计数
    g.turnNumber++;

    if (player.hand.length === 0) {
      // 该玩家出完了所有手牌
      player.playedOut = true;
      g.completedRank.push(player.id);  // 记录出完顺序
      setMessage(t('gameUI.guandan.playerFinished', { n: playerIdx + 1 }));
      if (checkAllOut(g.players)) { endRound(); return; }
    } else {
      setMessage(t('gameUI.guandan.playerPlayed', { n: playerIdx + 1, pattern: t('gameUI.guandan.patterns.' + played.pattern) }));
    }
    setSelected(new Set());
    nextTurn();
  };

  /**
   * 切换到下一家出牌
   * 查找下一个未出完的活跃玩家，连续过牌达到活跃玩家数-1时，
   * 当前出牌者获得自由出牌权（可出任意牌）。
   */
  const nextTurn = () => {
    const g = gRef.current;
    const next = nextActivePlayer(g.players, g.currentPlayer);
    g.currentPlayer = next;
    // 当除当前出牌者外所有人都过牌时，重置为自由出牌
    if (g.passCount >= activePlayerCount(g.players) - 1) {
      g.lastPlay = null; g.lastPlayBy = next; g.passCount = 0;
    }
    if (next === 0) {
      // 轮到玩家操作
      setMessage(!g.lastPlay ? t('gameUI.guandan.yourTurnFree') : t('gameUI.guandan.yourTurn'));
    } else {
      // 轮到AI，显示思考动画并延时调用AI决策
      setAiThinking(true);
      setMessage(t('gameUI.guandan.playerThinking', { n: next + 1 }));
      setTimeout(() => aiTurn(next), 2500);
    }
  };

  /**
   * AI玩家出牌决策
   * 根据当前局面（手牌、上家出的牌、已出完人数等）选择最优出牌策略。
   * 如果是自由出牌则使用领出提示，否则使用AI复杂决策。
   */
  const aiTurn = (playerIdx: number) => {
    const g = gRef.current;
    if (g.players[playerIdx].playedOut) { nextTurn(); return; }
    if (g.currentPlayer !== playerIdx) {
      setAiThinking(false);
      // 如果当前轮到另一个AI，重试；否则回到玩家
      if (g.phase === 'play') {
        if (g.currentPlayer !== 0) {
          setTimeout(() => aiTurn(g.currentPlayer), 2000);
        } else {
          setMessage(t('gameUI.guandan.yourTurn'));
        }
      }
      return;
    }
    if (g.phase !== 'play') { setAiThinking(false); return; }

    const isLead = !g.lastPlay || g.lastPlayBy === playerIdx;
    const chosen = isLead
      ? aiLeadPlay(sortHand(g.players[playerIdx].hand), groupByRank(sortHand(g.players[playerIdx].hand)), g.players, playerIdx)
      : aiChoosePlay({
          hand: g.players[playerIdx].hand,
          lastPlay: g.lastPlay,
          lastPlayBy: g.lastPlayBy,
          currentPlayerIdx: playerIdx,
          players: g.players,
          completedCount: g.completedRank.length,
        });

    if (chosen.length === 0) {
      // AI选择不出
      setMessage(t('gameUI.guandan.playerPassed', { n: playerIdx + 1 }));
      passTS.current[playerIdx] = Date.now();
      g.passCount++;
      setAiThinking(false);
      nextTurn();
      return;
    }
    const played = identifyPattern(chosen);
    if (played) doPlayCards(playerIdx, chosen, played);
    setAiThinking(false);
  };

  /**
   * 结束本局游戏
   * 根据玩家出完名次计算升级级数，更新等级并触发游戏结束回调。
   */
  const endRound = () => {
    const g = gRef.current;
    const steps = calculateLevelUp(g.completedRank);  // 计算升级级数
    const newLevel = getNextLevel(g.level, steps);    // 计算新等级
    setGameLevel(newLevel); // 同步等级到牌值系统
    setLevelUp(steps);
    setNextLevel(getLevelName(newLevel));
    setGamePhase('over');
    setMessage(t('gameUI.guandan.roundOverLevels', { steps, level: getLevelName(newLevel) }));
    if (onGameOver) onGameOver(steps);
    g.level = newLevel;
  };

  /** 计算当前游戏中的活跃玩家数（尚未出完的玩家数量） */
  const activePlayerCount = (players: Player[]) => players.filter(p => !p.playedOut).length;

  /**
   * 渲染整个游戏画面
   * 使用 Canvas 2D API 绘制牌桌、手牌、对手牌背、桌面中央出牌、
   * 按钮和游戏信息。每帧调用以保持画面实时更新。
   */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const g = gRef.current;
    ctx.clearRect(0, 0, TABLE_W, TABLE_H);  // 清空画布
    drawTable(ctx, TABLE_W, TABLE_H);       // 绘制牌桌背景

    // 游戏未开始时仅显示"开始游戏"按钮
    if (g.players.length === 0) {
      drawMessage(ctx, t('gameUI.guandan.clickToDeal'));
      buttons.current = [{ x: TABLE_W / 2 - 60, y: TABLE_H / 2 + 20, w: 120, h: 40, label: t('gameUI.startGame') }];
      for (const btn of buttons.current) drawButton(ctx, btn, hoveredBtn === btn.label);
      return;
    }

    // 绘制游戏信息（等级、玩家状态等）
    drawGameInfo(ctx, g.level, getLevelName(g.level), g.players, [t('gameUI.you'), ...aiNames], g.currentPlayer);

    // 绘制玩家0（自己）的手牌，选中状态高亮
    const p0 = g.players[0];
    if (!p0.playedOut) {
      drawHand(ctx, p0.hand, gamePhase === 'playing' && !aiThinking ? selected : new Set(), hoveredIdx, 0, TABLE_H - 100);
    } else {
      ctx.fillStyle = '#666';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(t('gameUI.guandan.youFinished'), TABLE_W / 2, TABLE_H - 70);
    }

    // 绘制3个对手的牌背及位置标识（左侧/对家/右侧）
    drawOpponentCards(ctx, g.players[1].hand.length, 10, CENTER_Y - 30, aiNames[0], g.currentPlayer === 1 && !g.players[1].playedOut);
    drawOpponentCards(ctx, g.players[2].hand.length, 320, 50, aiNames[1], g.currentPlayer === 2 && !g.players[2].playedOut);
    drawOpponentCards(ctx, g.players[3].hand.length, TABLE_W - 120, CENTER_Y - 30, aiNames[2], g.currentPlayer === 3 && !g.players[3].playedOut);
    // 不出指示
    const now = Date.now();
    const passPositions: [number, number, string][] = [[140, CENTER_Y - 15, t('gameUI.you')], [30, CENTER_Y + 25, aiNames[0]], [360, 65, aiNames[1]], [TABLE_W - 60, CENTER_Y + 25, aiNames[2]]];
    for (let i = 0; i < 4; i++) {
      const ts = passTS.current[i];
      if (ts && (now - ts) < 3000) {
        const alpha = (now - ts) < 2000 ? 1 : 1 - (now - ts - 2000) / 1000;
        ctx.fillStyle = 'rgba(255,100,100,' + alpha + ')';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(t('gameUI.pass'), passPositions[i][0], passPositions[i][1]);
      }
    }

    // 显示对手是否已出完的标记
    if (g.players[1].playedOut) { ctx.fillStyle = '#666'; ctx.font = '14px Arial'; ctx.fillText(t('gameUI.guandan.finished'), 60, CENTER_Y + 60); }
    if (g.players[2].playedOut) { ctx.fillStyle = '#666'; ctx.font = '14px Arial'; ctx.fillText(t('gameUI.guandan.finished'), 400, 80); }
    if (g.players[3].playedOut) { ctx.fillStyle = '#666'; ctx.font = '14px Arial'; ctx.fillText(t('gameUI.guandan.finished'), TABLE_W - 70, CENTER_Y + 60); }

    // 在桌面中央显示最近一次出的牌
    if (g.lastPlay && g.lastPlayBy !== null && !g.players[g.lastPlayBy].playedOut) {
      const label = g.lastPlayBy === 0 ? t('gameUI.you') : t('gameUI.playerLabel', { n: g.lastPlayBy + 1 });
      drawPlayedCards(ctx, g.lastPlay.cards, `${label}: ${t('gameUI.guandan.patterns.' + g.lastPlay.pattern)}`);
    }

    // 显示游戏消息提示
    if (message && gamePhase !== 'over') drawMessage(ctx, message);

    // 构建并绘制交互按钮
    buttons.current = [];

    if (gamePhase === 'playing' && !p0.playedOut && !aiThinking) {
      if (g.currentPlayer === 0) {
        buttons.current.push({ x: TABLE_W / 2 - 185, y: TABLE_H - 130, w: 60, h: 34, label: t('gameUI.sort') });
        buttons.current.push({ x: TABLE_W / 2 - 115, y: TABLE_H - 130, w: 60, h: 34, label: t('gameUI.hint') });
        if (g.lastPlay && g.lastPlayBy !== 0) {
          // 非自由出牌时显示"不出"和"出牌"两个按钮
          buttons.current.push({ x: TABLE_W / 2 - 45, y: TABLE_H - 130, w: 60, h: 34, label: t('gameUI.pass') });
          buttons.current.push({ x: TABLE_W / 2 + 25, y: TABLE_H - 130, w: 60, h: 34, label: t('gameUI.play') });
        } else {
          // 自由出牌时只显示"出牌"按钮
          buttons.current.push({ x: TABLE_W / 2 + 25, y: TABLE_H - 130, w: 60, h: 34, label: t('gameUI.play') });
        }
      }
    }

    if (gamePhase === 'over') {
      drawResult(ctx, g.completedRank, levelUp, nextLevel);
      buttons.current = [{ x: TABLE_W / 2 - 60, y: TABLE_H / 2 + 80, w: 120, h: 40, label: t('gameUI.nextRound') }];
    }
    if (gamePhase === 'idle') {
      buttons.current = [{ x: TABLE_W / 2 - 60, y: TABLE_H / 2 + 20, w: 120, h: 40, label: t('gameUI.startGame') }];
    }

    for (const btn of buttons.current) drawButton(ctx, btn, hoveredBtn === btn.label);
  }, [gamePhase, selected, message, levelUp, nextLevel, hoveredBtn, aiThinking, hoveredIdx, t]);

  /**
   * 注册 Canvas 原生事件（点击和鼠标移动）
   * 鼠标移动检测按钮悬停状态以实现高亮效果；
   * 点击事件检测按钮点击和手牌选择（通过坐标计算实现像素精确点击）。
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 鼠标移动：检测悬停在哪一个按钮上（实现hover高亮效果）
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = TABLE_W / rect.width;   // Canvas逻辑坐标与实际像素的X比例
      const scaleY = TABLE_H / rect.height;  // Canvas逻辑坐标与实际像素的Y比例
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;
      let found: string | null = null;
      for (const btn of buttons.current) {
        if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
          found = btn.label;
          break;
        }
      }
      setHoveredBtn(found);
      // 手牌hover检测
      const g2 = gRef.current;
      if (g2.players.length > 0 && g2.currentPlayer === 0) {
        const sorted = sortHand(g2.players[0].hand);
        const { gap, startX, cardY } = calcHandLayout(sorted.length);
        if (my > cardY - 5 && my < cardY + CARD_H + 15) {
          let hi = -1;
          for (let i = 0; i < sorted.length; i++) {
            const cx = startX + i * gap;
            const re = i < sorted.length - 1 ? Math.min(cx + CARD_W, startX + (i + 1) * gap) : cx + CARD_W;
            if (mx >= cx && mx <= re) { hi = i; break; }
          }
          setHoveredIdx(hi);
        } else { setHoveredIdx(-1); }
      }
    };

    // Canvas 点击事件：检测按钮或手牌区域
    const onCanvasClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = TABLE_W / rect.width;
      const scaleY = TABLE_H / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;
      const g = gRef.current;

      // 检测是否点击了某个按钮
      for (const btn of buttons.current) {
        if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
          if (btn.label === t('gameUI.startGame') || btn.label === t('gameUI.nextRound')) startGame();
          else if (btn.label === t('gameUI.play')) handlePlayCards();
          else if (btn.label === t('gameUI.pass')) handlePass();
          else if (btn.label === t('gameUI.hint')) handleHint();
          else if (btn.label === t('gameUI.sort')) handleSort();
          return;
        }
      }

      // 检测是否点击了手牌区域（用于选牌/取消选牌）
      if (g.players.length === 0) return;
      if (g.currentPlayer !== 0 || g.players[0].playedOut || g.phase !== 'play' || aiThinking) return;

      const sorted = sortHand(g.players[0].hand);
      const { gap, startX, cardY } = calcHandLayout(sorted.length);

      // 是否在手牌区域的范围内
      if (my < cardY - 5 || my > cardY + CARD_H + 15) return;

      // 逐张检测点击到了哪张牌（每张牌只响应其可见区域）
      for (let i = 0; i < sorted.length; i++) {
        const cx = startX + i * gap;
        const rightEdge = i < sorted.length - 1 ? Math.min(cx + CARD_W, startX + (i + 1) * gap) : cx + CARD_W;
        if (mx >= cx && mx <= rightEdge) {
          setSelected(prev => {
            const next = new Set(prev);
            if (next.has(i)) next.delete(i);   // 已选中则取消
            else next.add(i);                   // 未选中则选中
            return next;
          });
          return;
        }
      }
    };

    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('mousemove', onMouseMove);
    return () => {
      canvas.removeEventListener('click', onCanvasClick);
      canvas.removeEventListener('mousemove', onMouseMove);
    };
  }, [gamePhase, aiThinking, startGame, handlePlayCards, handlePass, handleHint, handleSort, t]);

  /**
   * 渲染循环
   * 使用 requestAnimationFrame 驱动每帧重绘，实现60fps的流畅动画效果。
   * 组件卸载时自动取消动画循环以避免内存泄漏。
   */
  useEffect(() => {
    const loop = () => { draw(); animRef.current = requestAnimationFrame(loop); };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <div className="flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={TABLE_W}
        height={TABLE_H}
        className="rounded-lg border border-dark-600 cursor-pointer"
        style={{ width: '100%', maxWidth: `${TABLE_W}px`, height: 'auto' }}
      />
      <div className="mt-2 text-sm text-gray-400">
        {gamePhase === 'idle' && t('gameUI.guandan.clickToStart')}
        {gamePhase === 'playing' && (aiThinking ? t('gameUI.guandan.aiThinking') : t('gameUI.guandan.clickCardsToPlay'))}
        {gamePhase === 'over' && t('gameUI.guandan.roundOverContinue')}
      </div>
    </div>
  );
};

export default GuandanGame;
