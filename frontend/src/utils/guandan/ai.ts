// 掼蛋 AI 策略：基于规则+评分的出牌决策

import { Card, PlayedCards, Pattern, Player, Rank } from './types';
import { groupByRank, sortHand, handToString } from './cards';
import { getCardsBeating, getLeadSuggestion } from './patterns';
import { isJokerRank } from './types';
import { nextActivePlayer } from './rules';

interface AIContext {
  hand: Card[];
  lastPlay: PlayedCards | null;
  lastPlayBy: number | null;
  currentPlayerIdx: number;
  players: Player[];
  completedCount: number;
}

/**
 * AI 选择出牌
 * @returns 要出的牌数组，或 [] 表示不出
 */
export function aiChoosePlay(ctx: AIContext): Card[] {
  const { hand, lastPlay, lastPlayBy, currentPlayerIdx, players } = ctx;
  const sorted = sortHand(hand);
  const rankGroups = groupByRank(sorted);

  // 没有要压的牌（自由出牌）
  if (!lastPlay || lastPlayBy === currentPlayerIdx) {
    return aiLeadPlay(sorted, rankGroups, players, currentPlayerIdx);
  }

  // 需要压牌
  // 如果是队友出的牌，尽量不出
  const isPartner = (lastPlayBy !== null) && (lastPlayBy % 2 === currentPlayerIdx % 2);
  if (isPartner) {
    // 队友出的牌，而且我方还有其他人能接就过
    // 除非队友出的牌很小，或者我们快赢了
    const playedCount = players.filter(p => p.playedOut).length;
    if (playedCount < 2) {
      // 检查是否有其他队友还没出完
      const otherTeamMemberAlive = players.some(
        (p, i) => i !== currentPlayerIdx && i % 2 === currentPlayerIdx % 2 && !p.playedOut
      );
      if (otherTeamMemberAlive) {
        return []; // 让队友继续
      }
    }
  }

  // 找能压的牌
  const beating = getCardsBeating(hand, lastPlay);
  if (beating.length === 0) return []; // 压不了

  // 如果手牌很少（即将出完），直接压
  if (hand.length <= 3) {
    return beating[0];
  }

  // 如果有炸弹，保留炸弹
  const nonBombBeating = beating.filter(b => {
    const p = identifyPatternSimple(b);
    return p !== Pattern.Bomb && p !== Pattern.Rocket && p !== Pattern.StraightFlush;
  });

  // 有大牌炸弹时也考虑
  const bombBeating = beating.filter(b => {
    const p = identifyPatternSimple(b);
    return p === Pattern.Bomb || p === Pattern.Rocket || p === Pattern.StraightFlush;
  });

  // 如果有非炸弹能压，用最小的
  if (nonBombBeating.length > 0) {
    // 用最小的
    return nonBombBeating[0];
  }

  // 只有炸弹能压
  // 如果我方形势不利（队友已出完或快出完），用最小炸弹
  const partnerOut = players.some(
    (p, i) => i !== currentPlayerIdx && i % 2 === currentPlayerIdx % 2 && p.playedOut
  );
  const opponentCloseToWin = players.some(
    (p, i) => i % 2 !== currentPlayerIdx % 2 && p.hand.length <= 3 && !p.playedOut
  );
  const playedCount = players.filter(p => p.playedOut).length;

  // 已经有人出完了，保留炸弹意义不大
  if (playedCount >= 1 || partnerOut || opponentCloseToWin) {
    // 用最小炸弹
    const sortedBombs = bombBeating.sort((a, b) => a.length - b.length || a[0].rank - b[0].rank);
    return sortedBombs[0];
  }

  // 否则不出，保留炸弹
  return [];
}

/** 自由出牌策略 */
function aiLeadPlay(
  sorted: Card[],
  rankGroups: Map<number, Card[]>,
  players: Player[],
  myIdx: number,
): Card[] {
  // 手牌很少时清理手牌
  if (sorted.length <= 3) {
    // 出最小的非Joker单张
    const nonJoker = sorted.filter(c => !isJokerRank(c.rank));
    if (nonJoker.length > 0) return [nonJoker[0]];
    return [sorted[0]];
  }

  if (sorted.length <= 5) {
    // 尝试出对子
    for (const [, group] of rankGroups) {
      if (group.length >= 2 && !isJokerRank(group[0].rank)) {
        return group.slice(0, 2);
      }
    }
    // 出单张
    const nonJoker = sorted.filter(c => !isJokerRank(c.rank));
    if (nonJoker.length > 0) return [nonJoker[0]];
    return [sorted[0]];
  }

  // 普通情况：从小牌开始出
  // 策略：出最小的单张或对子
  const nonJokerRanks = [...rankGroups.entries()]
    .filter(([r, g]) => !isJokerRank(r) && r <= 14)
    .sort((a, b) => a[0] - b[0]);

  // 优先出对子（如果有很多对子）
  const pairs = nonJokerRanks.filter(([_, g]) => g.length === 2);
  const singles = nonJokerRanks.filter(([_, g]) => g.length === 1);
  const triples = nonJokerRanks.filter(([_, g]) => g.length === 3);

  // 如果有3张的单牌很多，先出单张
  if (singles.length >= 2 && pairs.length <= 2) {
    return [sorted.find(c => c.rank === singles[0][0])!];
  }

  // 优先出对子
  if (pairs.length > 0) {
    return rankGroups.get(pairs[0][0])!.slice(0, 2);
  }

  // 出最小单张
  if (singles.length > 0) {
    return [sorted.find(c => c.rank === singles[0][0])!];
  }

  // 出三同张
  if (triples.length > 0) {
    return rankGroups.get(triples[0][0])!.slice(0, 3);
  }

  // 出最小非王
  const nonJoker = sorted.filter(c => !isJokerRank(c.rank));
  if (nonJoker.length > 0) return [nonJoker[0]];
  return [sorted[0]];
}

/** 简单识别牌型（用于AI内部） */
function identifyPatternSimple(cards: Card[]): Pattern | null {
  const n = cards.length;
  if (n === 0) return null;
  const ranks = cards.map(c => c.rank);
  const uniqueRanks = [...new Set(ranks)];
  const isAllJoker = ranks.every(r => isJokerRank(r));

  if (isAllJoker && n === 4) return Pattern.Rocket;
  if (n >= 4 && uniqueRanks.length === 1) return Pattern.Bomb;

  // 检查同花顺
  if (n === 5) {
    const suits = [...new Set(cards.map(c => c.suit))];
    if (suits.length === 1) {
      const sortedRanks = uniqueRanks.sort((a, b) => a - b);
      if (sortedRanks.length === 5 && sortedRanks[4] - sortedRanks[0] === 4) {
        return Pattern.StraightFlush;
      }
    }
  }

  if (n === 1) return Pattern.Single;
  if (n === 2 && uniqueRanks.length === 1) return Pattern.Pair;
  if (n === 3 && uniqueRanks.length === 1) return Pattern.Triple;

  return null;
}

/** 判断是否是炸弹（含同花顺、火箭） */
export function isBomb(cards: Card[]): boolean {
  const p = identifyPatternSimple(cards);
  return p === Pattern.Bomb || p === Pattern.Rocket || p === Pattern.StraightFlush;
}
