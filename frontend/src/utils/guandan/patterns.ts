// 掼蛋牌型识别与比较

import { Card, Rank, Suit, Pattern, PlayedCards, effectiveRank, GAME_LEVEL } from './types';
import { groupByRank, groupBySuit, sortHand } from './cards';

/** 识别牌型，返回 null 表示无效牌型 */
export function identifyPattern(cards: Card[]): PlayedCards | null {
  const n = cards.length;
  if (n === 0) return null;

  const sorted = sortHand(cards);
  const ranks = sorted.map(c => c.rank);
  const uniqueRanks = [...new Set(ranks)];
  const rankGroups = groupByRank(sorted);
  const groupSizes = [...rankGroups.values()].map(g => g.length).sort((a, b) => b - a);

  // 火箭：4张王
  if (n === 4 && ranks.every(r => r === Rank.SmallJoker || r === Rank.BigJoker)) {
    const hasBoth = ranks.includes(Rank.SmallJoker) && ranks.includes(Rank.BigJoker);
    if (hasBoth) {
      return { pattern: Pattern.Rocket, mainRank: Rank.BigJoker, length: 4, cards: sorted };
    }
  }

  // 炸弹：4~8张同rank
  if (n >= 4 && uniqueRanks.length === 1) {
    return { pattern: Pattern.Bomb, mainRank: ranks[0], length: n, cards: sorted };
  }

  // 单张
  if (n === 1) {
    return { pattern: Pattern.Single, mainRank: ranks[0], length: 1, cards: sorted };
  }

  // 对子
  if (n === 2 && uniqueRanks.length === 1) {
    return { pattern: Pattern.Pair, mainRank: ranks[0], length: 2, cards: sorted };
  }

  // 三同张
  if (n === 3 && uniqueRanks.length === 1) {
    return { pattern: Pattern.Triple, mainRank: ranks[0], length: 3, cards: sorted };
  }

  // 三带二：三同张 + 一对
  if (n === 5 && groupSizes.length === 2 && groupSizes[0] === 3 && groupSizes[1] === 2) {
    const tripleRank = [...rankGroups.entries()].find(([_, g]) => g.length === 3)![0];
    return { pattern: Pattern.TripleWithPair, mainRank: tripleRank, length: 5, cards: sorted };
  }

  // 顺子：5张连续rank（3→A，不含2和王）
  if (n === 5) {
    const sortedRanks = [...new Set(ranks)].sort((a, b) => a - b);
    if (sortedRanks.length === 5 && !ranks.some(r => r <= Rank.R2 || isJokerRank(r))) {
      if (isConsecutive(sortedRanks)) {
        // 检查同花顺（5张同花色）
        const suitGroups = groupBySuit(sorted);
        for (const [, group] of suitGroups) {
          if (group.length === 5) {
            return { pattern: Pattern.StraightFlush, mainRank: sortedRanks[4], length: 5, cards: sorted };
          }
        }
        return { pattern: Pattern.Straight, mainRank: sortedRanks[4], length: 5, cards: sorted };
      }
    }
  }

  // 钢板：2个连续的三同张（6张）
  if (n === 6 && groupSizes.length === 2 && groupSizes.every(s => s === 3)) {
    const tripleRanks = [...rankGroups.keys()].sort((a, b) => a - b);
    if (tripleRanks.length === 2 && tripleRanks[1] - tripleRanks[0] === 1) {
      if (!tripleRanks.some(r => isJokerRank(r) || r <= Rank.R2)) {
        return { pattern: Pattern.TriplePair, mainRank: tripleRanks[1], length: 6, cards: sorted };
      }
    }
  }

  // 夯：2个三同张（6张，不要求连续）
  if (n === 6 && groupSizes.length === 2 && groupSizes.every(s => s === 3)) {
    const tripleRanks = [...rankGroups.keys()].sort((a, b) => a - b);
    return { pattern: Pattern.TripleTriple, mainRank: tripleRanks[1], length: 6, cards: sorted };
  }

  return null;
}

function isJokerRank(r: number): boolean {
  return r === Rank.SmallJoker || r === Rank.BigJoker;
}

/** 判断rank数组是否连续 */
export function isConsecutive(ranks: number[]): boolean {
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] - ranks[i - 1] !== 1) return false;
  }
  return true;
}

/**
 * 判断 current 是否能压过 last
 * 同花顺 vs 炸弹的比较规则：
 * - 同花顺 > 5张及以下的炸弹
 * - 6张及以上炸弹 > 同花顺
 */
export function canBeat(current: PlayedCards, last: PlayedCards): boolean {
  // 火箭最大
  if (current.pattern === Pattern.Rocket) return true;
  if (last.pattern === Pattern.Rocket) return false;

  // 炸弹/同花顺 vs 非炸弹
  const currentIsBomb = current.pattern === Pattern.Bomb || current.pattern === Pattern.StraightFlush;
  const lastIsBomb = last.pattern === Pattern.Bomb || last.pattern === Pattern.StraightFlush;

  if (!currentIsBomb && !lastIsBomb) {
    // 普通牌：必须同类型且张数相同，比较主牌
    if (current.pattern !== last.pattern) return false;
    if (current.length !== last.length) return false;
    return current.mainRank > last.mainRank;
  }

  // 炸弹 vs 炸弹
  if (currentIsBomb && lastIsBomb) {
    // 同花顺 vs 同花顺：比较主牌
    if (current.pattern === Pattern.StraightFlush && last.pattern === Pattern.StraightFlush) {
      return current.mainRank > last.mainRank;
    }
    // 同花顺 vs 普通炸弹
    if (current.pattern === Pattern.StraightFlush) {
      return last.length <= 5; // 同花顺大于5张及以下的炸弹
    }
    if (last.pattern === Pattern.StraightFlush) {
      return current.length >= 6; // 6张及以上炸弹大于同花顺
    }
    // 普通炸弹 vs 普通炸弹：张数多的赢，张数相同比较effective rank
    if (current.length !== last.length) return current.length > last.length;
    return effectiveRank(current.mainRank, GAME_LEVEL) > effectiveRank(last.mainRank, GAME_LEVEL);
  }

  // 炸弹压非炸弹
  return currentIsBomb && !lastIsBomb;
}

/**
 * 找出 hand 中所有能压过 lastPlay 的牌组合
 * 返回按"最优"排序的列表（前几个是推荐的）
 */
export function getCardsBeating(hand: Card[], lastPlay: PlayedCards): Card[][] {
  const results: Card[][] = [];
  const sorted = sortHand(hand);
  const rankGroups = groupByRank(sorted);

  // 收集所有炸弹
  const bombs: Card[][] = [];
  const straightFlushes: Card[][] = [];
  for (const [, group] of rankGroups) {
    if (group.length >= 4) {
      bombs.push(group); // 4~8张同rank
    }
  }

  // 检测同花顺
  const suitGroups = groupBySuit(sorted);
  for (const [, sgroup] of suitGroups) {
    if (sgroup.length >= 5) {
      const sr = [...new Set(sgroup.map(c => c.rank))]
        .filter(r => !isJokerRank(r) && r > Rank.R2)
        .sort((a, b) => a - b);
      // 找连续5张的
      for (let i = 0; i <= sr.length - 5; i++) {
        const seq = sr.slice(i, i + 5);
        if (isConsecutive(seq)) {
          const matched = sgroup.filter(c => seq.includes(c.rank)).slice(0, 5);
          straightFlushes.push(matched);
        }
      }
    }
  }

  // 火箭
  const jokers = sorted.filter(c => isJokerRank(c.rank));
  if (jokers.length === 4) {
    results.push(jokers);
  }

  // 同花顺（按大小排）
  for (const sf of straightFlushes.sort((a, b) => a[a.length - 1].rank - b[b.length - 1].rank)) {
    const played = identifyPattern(sf)!;
    if (canBeat(played, lastPlay)) {
      results.push(sf);
    }
  }

  // 炸弹（按张数和rank排）
  for (const bomb of bombs.sort((a, b) => a.length - b.length || a[0].rank - b[0].rank)) {
    if (bomb.length >= 6) { // 6张及以上炸弹大于同花顺
      results.push(bomb);
    }
  }
  for (const bomb of bombs.sort((a, b) => a.length - b.length || a[0].rank - b[0].rank)) {
    if (bomb.length === 4 || bomb.length === 5) {
      const played = identifyPattern(bomb)!;
      if (canBeat(played, lastPlay)) {
        results.push(bomb);
      }
    }
  }

  // 如果是非炸弹，找同类型能压的
  if (lastPlay.pattern !== Pattern.Bomb &&
      lastPlay.pattern !== Pattern.StraightFlush &&
      lastPlay.pattern !== Pattern.Rocket) {
    const sameType = findSameTypeBeating(sorted, lastPlay);
    results.unshift(...sameType);
  }

  return results;
}

/** 找同类型能压的牌（非炸弹） */
function findSameTypeBeating(hand: Card[], lastPlay: PlayedCards): Card[][] {
  const results: Card[][] = [];
  const rankGroups = groupByRank(hand);

  switch (lastPlay.pattern) {
    case Pattern.Single: {
      for (const [, group] of rankGroups) {
        if (group[0].rank > lastPlay.mainRank && !isJokerRank(group[0].rank)) {
          results.push([group[0]]);
        }
      }
      break;
    }
    case Pattern.Pair: {
      for (const [, group] of rankGroups) {
        if (group.length >= 2 && group[0].rank > lastPlay.mainRank) {
          results.push(group.slice(0, 2));
        }
      }
      break;
    }
    case Pattern.Triple: {
      for (const [, group] of rankGroups) {
        if (group.length >= 3 && group[0].rank > lastPlay.mainRank) {
          results.push(group.slice(0, 3));
        }
      }
      break;
    }
    case Pattern.TripleWithPair: {
      for (const [r, group] of rankGroups) {
        if (group.length >= 3 && r > lastPlay.mainRank) {
          // 找一对做配牌
          const pair = findPair(hand, r);
          if (pair) {
            results.push([...group.slice(0, 3), ...pair]);
          }
        }
      }
      break;
    }
    case Pattern.Straight: {
      results.push(...findStraights(hand, lastPlay.mainRank));
      break;
    }
    case Pattern.TriplePair: {
      results.push(...findTriplePairs(hand, lastPlay.mainRank));
      break;
    }
    case Pattern.TripleTriple: {
      results.push(...findTripleTriples(hand, lastPlay.mainRank));
      break;
    }
  }

  return results;
}

/** 找一对（排除 excludeRank） */
function findPair(hand: Card[], excludeRank?: number): Card[] | null {
  const rankGroups = groupByRank(hand);
  for (const [r, group] of rankGroups) {
    if (r !== excludeRank && group.length >= 2) {
      return group.slice(0, 2);
    }
  }
  return null;
}

/** 找顺子（大于指定最大牌） */
function findStraights(hand: Card[], minMaxRank: number): Card[][] {
  const results: Card[][] = [];
  const sorted = sortHand(hand);
  const uniqueRanks = [...new Set(sorted.map(c => c.rank))]
    .filter(r => r > Rank.R2 && r <= Rank.A)
    .sort((a, b) => a - b);

  for (let i = 0; i <= uniqueRanks.length - 5; i++) {
    const seq = uniqueRanks.slice(i, i + 5);
    if (isConsecutive(seq) && seq[4] > minMaxRank) {
      const cards = seq.map(r => sorted.find(c => c.rank === r)!).filter(Boolean);
      if (cards.length === 5) {
        results.push(cards);
      }
    }
  }
  return results;
}

/** 找钢板（连续三同张，大于指定最大rank） */
function findTriplePairs(hand: Card[], minMaxRank: number): Card[][] {
  const results: Card[][] = [];
  const rankGroups = groupByRank(hand);
  const tripleRanks = [...rankGroups.entries()]
    .filter(([_, g]) => g.length >= 3)
    .map(([r]) => r)
    .filter(r => r > Rank.R2 && r <= Rank.A)
    .sort((a, b) => a - b);

  for (let i = 0; i < tripleRanks.length - 1; i++) {
    if (tripleRanks[i + 1] - tripleRanks[i] === 1 && tripleRanks[i + 1] > minMaxRank) {
      results.push([
        ...rankGroups.get(tripleRanks[i])!.slice(0, 3),
        ...rankGroups.get(tripleRanks[i + 1])!.slice(0, 3),
      ]);
    }
  }
  return results;
}

/** 找夯（两个三同张，大于指定最大rank） */
function findTripleTriples(hand: Card[], minMaxRank: number): Card[][] {
  const results: Card[][] = [];
  const rankGroups = groupByRank(hand);
  const tripleRanks = [...rankGroups.entries()]
    .filter(([_, g]) => g.length >= 3)
    .map(([r]) => r)
    .filter(r => r > minMaxRank)
    .sort((a, b) => a - b);

  for (let i = 0; i < tripleRanks.length; i++) {
    for (let j = i + 1; j < tripleRanks.length; j++) {
      results.push([
        ...rankGroups.get(tripleRanks[j])!.slice(0, 3),
        ...rankGroups.get(tripleRanks[i])!.slice(0, 3),
      ]);
    }
  }
  return results;
}

/** 推荐的能压的牌（最小能压的组合） */
export function getSuggestion(hand: Card[], lastPlay: PlayedCards): Card[] | null {
  const beating = getCardsBeating(hand, lastPlay);
  if (beating.length === 0) return null;
  // 取第一个（最小的）
  return beating[0];
}

/**
 * 首次出牌推荐（无需要压的牌时）
 * 优先出最小的单张/对子
 */
export function getLeadSuggestion(hand: Card[]): Card[] {
  const sorted = sortHand(hand);
  const rankGroups = groupByRank(sorted);

  // 优先出单张（最小非王）
  const nonJokerCards = sorted.filter(c => !isJokerRank(c.rank));
  if (nonJokerCards.length > 0) return [nonJokerCards[0]];

  // 只有王了
  return [sorted[0]];
}
