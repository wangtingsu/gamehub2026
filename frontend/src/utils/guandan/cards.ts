// 掼蛋牌组管理：创建、洗牌、发牌

import { Card, Suit, Rank } from './types';

/** 创建两副标准54张扑克牌（108张） */
export function createDeck(): Card[] {
  const cards: Card[] = [];
  let id = 0;

  // 两副牌
  for (let deck = 0; deck < 2; deck++) {
    // 4种花色 × 13张（2→A）
    for (const suit of [Suit.Spade, Suit.Heart, Suit.Club, Suit.Diamond]) {
      for (let rank = Rank.R2; rank <= Rank.A; rank++) {
        cards.push({ suit, rank, id: id++ });
      }
    }
    // 小王 + 大王
    cards.push({ suit: Suit.SmallJoker, rank: Rank.SmallJoker, id: id++ });
    cards.push({ suit: Suit.BigJoker, rank: Rank.BigJoker, id: id++ });
  }

  return cards;
}

/** Fisher-Yates 洗牌 */
export function shuffleDeck(deck: Card[]): Card[] {
  const cards = [...deck];
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

/** 发牌：4家各27张 */
export function dealCards(deck: Card[]): [Card[], Card[], Card[], Card[]] {
  return [
    deck.slice(0, 27),
    deck.slice(27, 54),
    deck.slice(54, 81),
    deck.slice(81, 108),
  ];
}

/** 按 rank 升序排序手牌 */
export function sortHand(hand: Card[]): Card[] {
  return [...hand].sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.suit.localeCompare(b.suit);
  });
}

/** 按花色分组（用于同花顺检测） */
export function groupBySuit(cards: Card[]): Map<string, Card[]> {
  const groups = new Map<string, Card[]>();
  for (const c of cards) {
    const key = c.suit;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }
  return groups;
}

/** 按 rank 分组 */
export function groupByRank(cards: Card[]): Map<number, Card[]> {
  const groups = new Map<number, Card[]>();
  for (const c of cards) {
    const key = c.rank;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }
  return groups;
}

/** 从手牌中移除指定牌 */
export function removeCards(hand: Card[], toRemove: Card[]): Card[] {
  const removeIds = new Set(toRemove.map(c => c.id));
  return hand.filter(c => !removeIds.has(c.id));
}

/** 将手牌转换为可读字符串（调试用） */
export function handToString(hand: Card[]): string {
  return sortHand(hand).map(c => {
    const suitSymbol: Record<string, string> = { S: '♠', H: '♥', C: '♣', D: '♦', J: '' };
    const rankName: Record<number, string> = {
      2: '2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'10',
      11:'J',12:'Q',13:'K',14:'A',99:'SJ',100:'BJ',
    };
    return suitSymbol[c.suit] + rankName[c.rank];
  }).join(' ');
}
