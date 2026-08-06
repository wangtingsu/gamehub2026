// 掼蛋核心类型定义

/** 花色 */
export enum Suit {
  Spade = 'S',   // ♠
  Heart = 'H',   // ♥
  Club = 'C',    // ♣
  Diamond = 'D', // ♦
  SmallJoker = 'j',  // 小王
  BigJoker = 'J',    // 大王
}

/** 牌面值（2最小→A最大，王小，王大） */
export enum Rank {
  R2 = 2, R3, R4, R5, R6, R7, R8, R9, R10,
  J, Q, K, A,
  SmallJoker = 99,
  BigJoker = 100,
}

/** 单张牌 */
export interface Card {
  suit: Suit;
  rank: Rank;
  id: number; // 唯一标识（0-107）
}

/** 牌型枚举 */
export enum Pattern {
  Single = 'single',           // 单张
  Pair = 'pair',               // 对子
  Triple = 'triple',           // 三同张
  TripleWithPair = 'triple_with_pair', // 三带二
  Straight = 'straight',       // 顺子（5张）
  TriplePair = 'triple_pair',  // 钢板（2个连续三同张）
  TripleTriple = 'triple_triple', // 夯（2个三同张）
  Bomb = 'bomb',               // 炸弹（4~8张同值）
  StraightFlush = 'straight_flush', // 同花顺（5张同花色顺子）
  Rocket = 'rocket',           // 火箭（4张王）
}

/** 已出的牌（含牌型和比较信息） */
export interface PlayedCards {
  pattern: Pattern;
  mainRank: number;   // 主牌值（用于比较）
  length: number;     // 张数
  cards: Card[];
}

/** 玩家信息 */
export interface Player {
  id: number;           // 0-3
  hand: Card[];         // 手牌
  team: number;         // 0 或 1（0队：0,2；1队：1,3）
  isHuman: boolean;     // 是否人类玩家
  playedOut: boolean;   // 是否已出完
}

/** 完整游戏状态 */
export interface GameStateData {
  players: Player[];
  currentPlayer: number;     // 当前出牌玩家索引（0-3）
  lastPlay: PlayedCards | null;  // 上一轮出的牌
  lastPlayBy: number | null;     // 上一轮出牌的玩家
  passCount: number;             // 连续过牌计数
  level: number;                 // 当前打几（2-14=A）
  levelSuit: Suit | null;        // 当前级牌的花色（配牌用）
  turnNumber: number;            // 轮次编号
  phase: 'bet' | 'play' | 'end';
  completedRank: number[];       // 玩家出完顺序
  message: string;
}

/** AI 提示/建议返回 */
export interface AIHint {
  cards: Card[];
  description: string;
}

// 花色符号显示
export const SUIT_SYMBOLS: Record<string, string> = {
  S: '♠', H: '♥', C: '♣', D: '♦',
};

// 牌面值显示
export const RANK_NAMES: Record<number, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A',
  99: '小', 100: '大',
};

// 是否为红色花色
export function isRedSuit(suit: Suit): boolean {
  return suit === Suit.Heart || suit === Suit.Diamond;
}

// 是否为王
export function isJoker(rank: Rank): boolean {
  return rank === Rank.SmallJoker || rank === Rank.BigJoker;
}

/** isJokerRank 别名 — 接受 number 类型参数 */
export function isJokerRank(r: number): boolean {
  return r === Rank.SmallJoker || r === Rank.BigJoker;
}

/** 计算等级牌的有效排名（打几时该rank排在A之后） */
export function effectiveRank(rank: Rank, level: number): number {
  if (rank === Rank.BigJoker) return 101;
  if (rank === Rank.SmallJoker) return 100;
  if (rank === level) return 15; // 等级牌最高(>A=14)
  if (rank === Rank.R2) return 2;
  return rank; // R3=3...A=14
}

/** 根据等级判断是否为等级牌 */
export function isLevelRank(rank: Rank, level: number): boolean {
  return rank === level;
}

// 增加辅助函数
/** 游戏当前等级（全局，用于牌值比较） */
export let GAME_LEVEL = 2;
export function setGameLevel(level: number) { GAME_LEVEL = level; }

export function getRankDisplay(rank: Rank): string {
  return RANK_NAMES[rank] || String(rank);
}

export function getSuitDisplay(suit: Suit): string {
  if (suit === Suit.SmallJoker) return '小';
  if (suit === Suit.BigJoker) return '大';
  return SUIT_SYMBOLS[suit] || suit;
}
