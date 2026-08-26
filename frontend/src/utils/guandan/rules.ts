// 掼蛋游戏规则：出牌校验、回合控制、升级

import { Card, Pattern, Player, PlayedCards, GameStateData } from './types';
import { identifyPattern, canBeat } from './patterns';
import { sortHand, removeCards } from './cards';
import i18n from '../../i18n';

export const LEVEL_ORDER = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; // 2→A

/** 校验出牌是否合法 */
export function isValidPlay(
  hand: Card[],
  cards: Card[],
  lastPlay: PlayedCards | null,
  lastPlayBy: number | null,
  currentPlayerIdx: number,
): { valid: boolean; played?: PlayedCards; reason?: string } {
  if (cards.length === 0) {
    return { valid: false, reason: i18n.t('games:gameUI.guandan.reasonSelectCards') };
  }

  // 选中的牌必须在手牌中
  const handIds = new Set(hand.map(c => c.id));
  for (const c of cards) {
    if (!handIds.has(c.id)) {
      return { valid: false, reason: i18n.t('games:gameUI.guandan.reasonNotInHand') };
    }
  }

  const played = identifyPattern(cards);
  if (!played) {
    return { valid: false, reason: i18n.t('games:gameUI.guandan.reasonInvalidCombo') };
  }

  // 如果是首出（没有需要压的牌）
  if (!lastPlay || lastPlayBy === currentPlayerIdx) {
    return { valid: true, played };
  }

  // 需要压牌
  if (!canBeat(played, lastPlay)) {
    return { valid: false, reason: i18n.t('games:gameUI.guandan.reasonCannotBeat') };
  }

  return { valid: true, played };
}

/** 检查是否有人出完 */
export function checkRoundEnd(players: Player[]): number | null {
  for (const p of players) {
    if (p.hand.length === 0) {
      return p.id;
    }
  }
  return null;
}

/** 一轮结束：检查是否所有人都出完了（头游、二游、三游、末游） */
export function checkAllOut(players: Player[]): boolean {
  return players.every(p => p.playedOut);
}

/** 计算升级级数 */
export function calculateLevelUp(
  completedRank: number[],
): number {
  // completedRank: 出完顺序 [first, second, third, last]
  // 0,2 一队；1,3 一队
  const first = completedRank[0];
  const second = completedRank[1];
  const firstTeam = first % 2;
  const secondTeam = second % 2;

  if (firstTeam === secondTeam) {
    // 同一队包揽头游和二游：升3级
    return 3;
  }

  // 头游和末游是同一队：升2级
  const last = completedRank[3];
  if (first % 2 === last % 2) {
    return 2;
  }

  // 头游和对家末游：升1级
  return 1;
}

/** 创建初始游戏状态 */
export function createInitialState(): GameStateData {
  return {
    players: [],
    currentPlayer: 0,
    lastPlay: null,
    lastPlayBy: null,
    passCount: 0,
    level: 2,
    levelSuit: null,
    turnNumber: 0,
    phase: 'bet',
    completedRank: [],
    message: 'Click "Start Game" to deal',
  };
}

/** 获取升级后的级别 */
export function getNextLevel(currentLevel: number, steps: number): number {
  const idx = LEVEL_ORDER.indexOf(currentLevel);
  if (idx === -1) return currentLevel;
  const newIdx = Math.min(idx + steps, LEVEL_ORDER.length - 1);
  return LEVEL_ORDER[newIdx];
}

/** 找到下一个未出完的玩家 */
export function nextActivePlayer(players: Player[], currentIdx: number): number {
  for (let i = 1; i <= 4; i++) {
    const idx = (currentIdx + i) % 4;
    if (!players[idx].playedOut) return idx;
  }
  return currentIdx;
}

/** 一局结束后的级别名称 */
export function getLevelName(level: number): string {
  const names: Record<number, string> = {
    2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
    11: 'J', 12: 'Q', 13: 'K', 14: 'A',
  };
  return names[level] || String(level);
}
