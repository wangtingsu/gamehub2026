// 掼蛋 Canvas 渲染器

import { Card, Suit, Player, PlayedCards } from './types';
import { sortHand } from './cards';
import { isRedSuit, getRankDisplay, getSuitDisplay } from './types';

// 布局常量
export const CARD_W = 50;
export const CARD_H = 70;
export const CARD_GAP = 36;       // 手牌间距
export const OPPONENT_CARD_W = 30; // 对手牌背宽度
export const OPPONENT_GAP = 4;
export const TABLE_W = 800;
export const TABLE_H = 600;
export const CENTER_Y = 280;

// 颜色
const COLORS = {
  bg: '#1a6b3c',
  bgGrad: '#2d8a4e',
  cardBg: '#fff',
  cardBorder: '#333',
  cardBack: '#1a3a6b',
  cardBackPattern: '#2a5a9b',
  red: '#cc0000',
  black: '#1a1a1a',
  gold: '#ffd700',
  selected: '#ffeb3b',
  btnBg: '#4a90d9',
  btnHover: '#5ba0e9',
  btnText: '#fff',
  textLight: '#eee',
  textDark: '#333',
  msgBg: 'rgba(0,0,0,0.7)',
  shadow: 'rgba(0,0,0,0.3)',
  highlight: '#ff6b35',
  team0: '#4fc3f7',
  team1: '#ff8a65',
};

// 按钮区域（供点击检测用）
export interface ButtonRect {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

/** 绘制桌面背景 */
export function drawTable(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // 绿色桌面渐变
  const grad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w * 0.6);
  grad.addColorStop(0, COLORS.bgGrad);
  grad.addColorStop(1, COLORS.bg);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 中间装饰椭圆
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(w / 2, CENTER_Y, 180, 100, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(w / 2, CENTER_Y, 140, 70, 0, 0, Math.PI * 2);
  ctx.stroke();
}

/** 绘制一张卡牌 */
export function drawCard(
  ctx: CanvasRenderingContext2D,
  card: Card,
  x: number,
  y: number,
  faceUp: boolean,
  selected: boolean = false,
  highlight: boolean = false,
) {
  const w = CARD_W;
  const h = CARD_H;

  if (selected) {
    y -= 12; // 选中的牌上移
  }

  if (highlight) {
    ctx.shadowColor = COLORS.highlight;
    ctx.shadowBlur = 12;
  }

  // 牌背景
  ctx.shadowColor = COLORS.shadow;
  ctx.shadowBlur = selected ? 8 : 4;

  if (!faceUp) {
    // 牌背
    ctx.fillStyle = COLORS.cardBack;
    roundRect(ctx, x, y, w, h, 5);
    ctx.fill();
    ctx.shadowBlur = 0;
    // 花纹
    ctx.fillStyle = COLORS.cardBackPattern;
    roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 3);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // 中心菱形
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y + 15);
    ctx.lineTo(x + w - 15, y + h / 2);
    ctx.lineTo(x + w / 2, y + h - 15);
    ctx.lineTo(x + 15, y + h / 2);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.stroke();
    return;
  }

  // 牌面
  ctx.fillStyle = COLORS.cardBg;
  roundRect(ctx, x, y, w, h, 5);
  ctx.fill();
  ctx.shadowBlur = 0;

  // 边框
  ctx.strokeStyle = selected ? COLORS.selected : COLORS.cardBorder;
  ctx.lineWidth = selected ? 2.5 : 1;
  roundRect(ctx, x, y, w, h, 5);
  ctx.stroke();

  // 花色和点数
  const isRed = card.suit === Suit.Heart || card.suit === Suit.Diamond;
  const isJoker = card.rank >= 99;
  const color = isRed ? COLORS.red : COLORS.black;
  ctx.fillStyle = color;

  // 左上角点数
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  const rankStr = getRankDisplay(card.rank);
  ctx.fillText(rankStr, x + 12, y + 18);

  // 花色符号
  ctx.font = '12px Arial';
  if (!isJoker) {
    ctx.fillText(getSuitDisplay(card.suit), x + 12, y + 32);
  }

  // 中心大花色
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (card.rank >= 99) {
    // 王
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 28px Arial';
    ctx.fillText('★', x + w / 2, y + h / 2);
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = color;
    ctx.fillText(rankStr, x + w / 2, y + h / 2 + 14);
  } else {
    ctx.fillStyle = color;
    ctx.fillText(getSuitDisplay(card.suit), x + w / 2, y + h / 2 - 2);
    // 右下角小点数
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(rankStr, x + w - 5, y + h - 5);
    ctx.fillText(getSuitDisplay(card.suit), x + w - 5, y + h - 14);
  }

  ctx.textBaseline = 'alphabetic';
  ctx.shadowBlur = 0;
}

/** 绘制手牌 */
export function drawHand(
  ctx: CanvasRenderingContext2D,
  cards: Card[],
  selectedIndices: Set<number>,
  x: number,
  y: number,
) {
  const sorted = sortHand(cards);
  const maxGap = 36;
  const minGap = 18;
  const availableW = TABLE_W - 20; // 左右留白
  const gap = sorted.length > 1
    ? Math.max(minGap, Math.min(maxGap, (availableW - CARD_W) / (sorted.length - 1)))
    : 0;
  const totalW = Math.max(sorted.length - 1, 1) * gap + CARD_W;
  const startX = Math.max(x, (TABLE_W - totalW) / 2);

  for (let i = 0; i < sorted.length; i++) {
    const cardX = startX + i * gap;
    drawCard(ctx, sorted[i], cardX, y, true, selectedIndices.has(i));
  }
}

/** 绘制对手牌背 */
export function drawOpponentCards(
  ctx: CanvasRenderingContext2D,
  count: number,
  x: number,
  y: number,
  label: string,
  isActive: boolean,
) {
  // 标签
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = isActive ? COLORS.highlight : COLORS.textLight;
  ctx.fillText(label, x + 40, y - 8);

  // 牌背堆叠
  const maxVisible = Math.min(count, 8);
  for (let i = 0; i < maxVisible; i++) {
    drawCard(ctx, { suit: Suit.Spade, rank: 2, id: -1 }, x + i * 2, y, false);
  }
  // 数量
  ctx.font = 'bold 16px Arial';
  ctx.fillStyle = isActive ? COLORS.highlight : COLORS.textLight;
  ctx.fillText(`×${count}`, x + maxVisible * 2 + 30, y + 35);
}

/** 绘制桌面上的牌（对方出的牌） */
export function drawPlayedCards(
  ctx: CanvasRenderingContext2D,
  cards: Card[],
  label: string,
) {
  if (cards.length === 0) return;

  const totalW = cards.length * (CARD_W + 2) - 2;
  const startX = (TABLE_W - totalW) / 2;
  const y = CENTER_Y - CARD_H / 2 - 15;

  // 标签
  ctx.font = '13px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.textLight;
  ctx.fillText(label, TABLE_W / 2, y - 15);

  for (let i = 0; i < cards.length; i++) {
    drawCard(ctx, cards[i], startX + i * (CARD_W + 2), y, true, false, true);
  }
}

/** 绘制按钮 */
export function drawButton(
  ctx: CanvasRenderingContext2D,
  btn: ButtonRect,
  isHover: boolean = false,
) {
  ctx.shadowColor = COLORS.shadow;
  ctx.shadowBlur = 4;
  ctx.fillStyle = isHover ? COLORS.btnHover : COLORS.btnBg;
  roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = COLORS.btnText;
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
  ctx.textBaseline = 'alphabetic';
}

/** 绘制消息 */
export function drawMessage(ctx: CanvasRenderingContext2D, text: string) {
  ctx.fillStyle = COLORS.msgBg;
  const tw = ctx.measureText(text).width + 40;
  roundRect(ctx, (TABLE_W - tw) / 2, 15, tw, 36, 8);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, TABLE_W / 2, 33);
  ctx.textBaseline = 'alphabetic';
}

/** 绘制回合信息（Level + 玩家状态） */
export function drawGameInfo(
  ctx: CanvasRenderingContext2D,
  level: number,
  levelName: string,
  players: Player[],
  currentPlayer: number,
) {
  // 级别
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.gold;
  ctx.fillText(`打 ${levelName}`, 15, 30);

  // 玩家状态
  const labels = ['你', '电脑 1', '电脑 2', '电脑 3'];
  ctx.font = '12px Arial';
  ctx.textAlign = 'right';
  for (let i = 0; i < 4; i++) {
    const p = players[i];
    const color = p.playedOut ? '#666' : (i === currentPlayer ? COLORS.highlight : COLORS.textLight);
    ctx.fillStyle = color;
    const status = p.playedOut ? '✓ 出完' : `${p.hand.length}张`;
    ctx.fillText(`${labels[i]}: ${status}`, TABLE_W - 15, 18 + i * 16);
  }
}

/** 绘制结果弹窗 */
export function drawResult(
  ctx: CanvasRenderingContext2D,
  completedRank: number[],
  levelUp: number,
  newLevel: string,
) {
  // 半透明背景
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, TABLE_W, TABLE_H);

  // 弹窗
  const mw = 300, mh = 200;
  const mx = (TABLE_W - mw) / 2, my = (TABLE_H - mh) / 2;
  ctx.fillStyle = '#1a1a2e';
  roundRect(ctx, mx, my, mw, mh, 12);
  ctx.fill();
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2;
  roundRect(ctx, mx, my, mw, mh, 12);
  ctx.stroke();

  // 标题
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 22px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('本局结束', TABLE_W / 2, my + 45);

  // 出完顺序
  const labels = ['头游', '二游', '三游', '末游'];
  ctx.fillStyle = COLORS.textLight;
  ctx.font = '15px Arial';
  const orderStr = completedRank.map((pid, i) => {
    const name = pid === 0 ? '你' : (pid === 2 ? '对家' : (pid % 2 === 0 ? '队友' : '对手'));
    return `${labels[i]}: ${name}(${pid + 1})`;
  }).join('  ');
  ctx.fillText(completedRank.map((pid, idx) => `${labels[idx]}(${pid + 1})`).join(' → '), TABLE_W / 2, my + 80);

  // 升级
  ctx.fillStyle = levelUp > 0 ? '#4caf50' : '#999';
  ctx.font = 'bold 18px Arial';
  ctx.fillText(`升 ${levelUp} 级 → 打 ${newLevel}`, TABLE_W / 2, my + 120);

  // 提示
  ctx.fillStyle = '#aaa';
  ctx.font = '14px Arial';
  ctx.fillText('点击「下一局」继续', TABLE_W / 2, my + 165);
}

// 工具：圆角矩形
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + h - r);
  ctx.quadraticCurveTo(x, y + h, x + r, y + h);
  ctx.closePath();
}
