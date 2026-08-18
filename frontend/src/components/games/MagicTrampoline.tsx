/**
 * MagicTrampoline - 魔力蹦蹦床游戏组件
 *
 * 一款"接物类"弹跳收集游戏。主角在一张彩虹蹦床上不断弹跳，
 * 需要左右移动接住从上方落下的星星、月亮等道具，同时躲避尖刺障碍物。
 *
 * 玩法机制：
 * - 角色在蹦床上自动弹跳，弹跳速度随分数逐步加快
 * - 收集星星获得10分，收集月亮获得25分
 * - 收集盾牌道具可抵挡一次尖刺伤害
 * - 碰到尖刺则游戏结束（除非有护盾）
 * - 三种障碍物类型：普通尖刺、左右移动尖刺、中途加速尖刺
 * - 难度动态提升：随分数增加，障碍物比例和下落速度逐渐提高
 *
 * 本组件支持键盘（方向键/AD）和触摸滑动操控，
 * 并提供虚拟游戏手柄组件用于移动端。
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import VirtualGamepad from './VirtualGamepad';
import { Button, Typography } from 'antd';

const { Title, Text } = Typography;

interface GameProps {
  onScoreChange?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onGameStart?: () => void;
}

// ===================== 游戏常量 =====================

/** 画布宽度 */
const CANVAS_W = 300;
/** 画布高度 */
const CANVAS_H = 500;
/** 蹦床的Y坐标 */
const TRAMP_Y = 430;
/** 玩家角色尺寸 */
const PLAYER_SIZE = 16;
/** 星星尺寸 */
const STAR_SIZE = 10;
/** 障碍物尺寸 */
const OBSTACLE_SIZE = 12;

/** 可收集道具类型：星星 | 月亮 | 护盾 */
type CollectibleType = 'star' | 'moon' | 'shield';
/** 障碍物形态：尖刺 | 移动者 | 加速者 */
type ObstacleStyle = 'spike' | 'mover' | 'speeder';

/** 下落物体（道具或障碍物）的数据结构 */
interface FallingItem {
  x: number;                 // X坐标
  y: number;                 // Y坐标
  type: 'star' | 'obstacle'; // 类型：道具或障碍物
  subType?: CollectibleType;    // 道具子类型（仅type=star时有效）
  obstacleType?: ObstacleStyle; // 障碍物子类型（仅type=obstacle时有效）
  startY?: number;              // 初始Y坐标（用于speeder计算加速距离）
}

/**
 * 随机生成一个下落物体（道具或障碍物）
 * 根据当前的障碍物概率决定生成类型，并尽量使物体之间不重叠（间距>=30px）。
 * 障碍物子类型根据难度概率决定：高难度时可能出现移动者和加速者。
 * 道具子类型：90%星星、15%月亮、10%护盾。
 * @param existing 当前已在场景中的物体列表（用于碰撞避免）
 * @param obstacleRate 障碍物生成概率（0~1）
 * @param score 当前分数（影响障碍物类型分布）
 * @returns 新生成的物体对象
 */
function randomItem(existing: FallingItem[], obstacleRate: number, score: number): FallingItem {
  const isObstacle = Math.random() < obstacleRate;

  // 尝试生成不与其他物体重叠的X坐标（最多尝试20次）
  let x: number;
  let attempts = 0;
  do {
    x = 20 + Math.random() * (CANVAS_W - 40);
    attempts++;
  } while (attempts < 20 && existing.some(i => Math.abs(i.x - x) < 30));

  if (isObstacle) {
    // 根据障碍物概率决定子类型：概率越高，特殊类型越多
    let obstacleType: ObstacleStyle = 'spike';
    if (obstacleRate > 0.65) {
      const roll = Math.random();
      if (roll < 0.3) {
        obstacleType = 'mover';    // 30%概率为移动型
      } else if (roll < 0.5) {
        obstacleType = 'speeder';  // 20%概率为加速型
      }
    } else if (obstacleRate > 0.5) {
      if (Math.random() < 0.3) {
        obstacleType = 'mover';
      }
    }
    return { x, y: -20, type: 'obstacle', obstacleType, startY: -20 };
  }

  // 道具类型分布
  let subType: CollectibleType = 'star';
  const collectibleRoll = Math.random();
  if (collectibleRoll < 0.1) {
    subType = 'shield';  // 10% 护盾
  } else if (collectibleRoll < 0.25) {
    subType = 'moon';    // 15% 月亮
  }
  // 75% 星形（默认）

  return { x, y: -20, type: 'star', subType };
}

/**
 * 绘制五角星
 * 通过交替的外顶点和内顶点绘制五角星形路径。
 * @param cx 中心X
 * @param cy 中心Y
 * @param size 外圈半径
 */
function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const spikes = 5;
  const outerR = size;
  const innerR = size * 0.45;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR; // 交替外圈和内圈半径
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * 绘制新月（月牙）形状
 * 使用两个圆弧：外弧顺时针绘制，内弧逆时针绘制，通过路径方向差形成月牙镂空效果。
 * @param cx 中心X
 * @param cy 中心Y
 * @param size 外圈半径
 */
function drawCrescentMoon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.beginPath();
  ctx.arc(cx, cy, size, 0, Math.PI * 2);                  // 外圆（顺时针）
  // 内圆（逆时针），偏移到右上方形成月牙形状
  ctx.arc(cx + size * 0.35, cy - size * 0.1, size * 0.75, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.fill();
}

/**
 * 绘制盾牌图标
 * 通过多边形顶点绘制盾牌形状。
 * @param cx 中心X
 * @param cy 中心Y
 * @param size 盾牌尺寸
 */
function drawShieldIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx + size, cy - size * 0.5);
  ctx.lineTo(cx + size, cy + size * 0.3);
  ctx.lineTo(cx, cy + size);
  ctx.lineTo(cx - size, cy + size * 0.3);
  ctx.lineTo(cx - size, cy - size * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/**
 * 绘制尖刺（六芒星形）
 * 交替使用外顶点和内顶点绘制六角星，作为障碍物的视觉表现。
 * @param cx 中心X
 * @param cy 中心Y
 * @param size 外圈半径
 * @param color 尖刺颜色，不同子类型使用不同颜色
 */
function drawSpike(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string = '#e94560') {
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI * 2) / 6 - Math.PI / 2;
    const r = i % 2 === 0 ? size : size * 0.4; // 交替外圈和内圈
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
}

const MagicTrampoline: React.FC<GameProps> = ({ onScoreChange, onGameOver, onGameStart }) => {
  // Canvas 引用
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /** 当前得分（用于UI显示） */
  const [score, setScore] = useState(0);
  /** 弹跳高度（用于UI显示） */
  const [height, setHeight] = useState(0);
  /** 游戏阶段：idle(待开始) | playing(游戏中) | over(已结束) */
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle');
  /** requestAnimationFrame 动画ID */
  const animRef = useRef<number>(0);
  /** 上次tick的时间戳（用于帧率控制） */
  const lastTickRef = useRef(0);

  /** 游戏核心状态（使用Ref避免频繁重渲染） */
  const gameRef = useRef({
    playerX: CANVAS_W / 2,       // 玩家X位置
    bouncePhase: 0,               // 弹跳相位（驱动正弦波弹跳动画）
    bounceSpeed: 0.04,            // 当前弹跳速度
    baseBounceSpeed: 0.04,        // 基础弹跳速度
    maxBounceHeight: 100,         // 最大弹跳高度
    items: [] as FallingItem[],   // 场景中所有下落物体
    score: 0,                     // 得分
    height: 0,                    // 高度
    scrollOffset: 0,              // 滚动偏移量（背景视差）
    itemSpawnTimer: 0,            // 道具生成倒计时
    dead: false,                  // 是否死亡
    shielded: false,              // 是否有护盾
    time: 0,                      // 全局计时器（驱动移动型障碍物动画）
  });

  /**
   * 绘制游戏画面
   * 使用 Canvas 2D API 渲染：
   * - 动态渐变天空背景（随滚动偏移变化颜色）
   * - 闪烁星星和飘动云朵（视差效果）
   * - 彩虹蹦床和草地
   * - 下落道具（星星/月亮/护盾）和障碍物（尖刺）
   * - 弹跳角色（含身体拉伸、手臂摆动动画）
   * - 护盾光圈特效
   */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const g = gameRef.current;
    const offset = g.scrollOffset;

    // 动态天空渐变背景（随滚动偏移缓慢变色）
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    const r1 = Math.floor(26 + 20 * Math.sin(offset * 0.005));
    const g1 = Math.floor(10 + 30 * Math.sin(offset * 0.007 + 1));
    const b1 = Math.floor(46 + 20 * Math.sin(offset * 0.003 + 2));
    grad.addColorStop(0, `rgb(${r1}, ${g1}, ${b1})`);
    grad.addColorStop(0.5, `rgb(${Math.floor(r1 * 0.6)}, ${Math.floor(g1 * 0.5)}, ${Math.floor(b1 * 0.8)})`);
    grad.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // 背景闪烁的小星星（视差慢速滚动）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    for (let i = 0; i < 30; i++) {
      const sx = (i * 47 + 13) % CANVAS_W;
      const sy = ((i * 31 + offset * 0.2) % (CANVAS_H + 50)) - 25;
      const ss = 1 + (i % 3);
      ctx.beginPath();
      ctx.arc(sx, sy, ss, 0, Math.PI * 2);
      ctx.fill();
    }

    // 飘动的云朵（视差效果）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let i = 0; i < 5; i++) {
      const cx = ((i * 97 + offset * 0.1) % (CANVAS_W + 80)) - 40;
      const cy = ((i * 73 + offset * 0.15) % (CANVAS_H * 0.6));
      ctx.beginPath();
      ctx.ellipse(cx, cy, 35, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + 20, cy - 5, 25, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx - 15, cy + 3, 20, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 草地和地面区域
    ctx.fillStyle = '#0d1f0d';
    ctx.fillRect(0, TRAMP_Y + 20, CANVAS_W, CANVAS_H - TRAMP_Y - 20);
    ctx.fillStyle = '#1a3a1a';
    for (let i = 0; i < CANVAS_W; i += 15) {
      ctx.fillRect(i, TRAMP_Y + 20, 8, 4);
    }

    // 彩虹蹦床（分段彩色矩形）
    const trampColors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#9b59b6'];
    const tw = 100;
    const segW = tw / trampColors.length;
    for (let i = 0; i < trampColors.length; i++) {
      ctx.fillStyle = trampColors[i];
      ctx.shadowColor = trampColors[i];
      ctx.shadowBlur = 5;
      ctx.fillRect(CANVAS_W / 2 - tw / 2 + i * segW, TRAMP_Y, segW, 6);
    }
    ctx.shadowBlur = 0;

    // 蹦床支撑腿
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(CANVAS_W / 2 - tw / 2 + 5, TRAMP_Y + 6);
    ctx.lineTo(CANVAS_W / 2 - tw / 2 - 5, TRAMP_Y + 25);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(CANVAS_W / 2 + tw / 2 - 5, TRAMP_Y + 6);
    ctx.lineTo(CANVAS_W / 2 + tw / 2 + 5, TRAMP_Y + 25);
    ctx.stroke();

    // 绘制所有下落物体（道具和障碍物）
    for (const item of g.items) {
      if (item.type === 'star') {
        // 道具类型分支：月亮(银白) / 护盾(绿) / 星星(金)
        if (item.subType === 'moon') {
          const moonGrad = ctx.createRadialGradient(item.x, item.y, 0, item.x, item.y, STAR_SIZE + 2);
          moonGrad.addColorStop(0, '#ffffff');
          moonGrad.addColorStop(1, '#c0c0c0');
          ctx.fillStyle = moonGrad;
          ctx.shadowColor = '#c0c0c0';
          ctx.shadowBlur = 10;
          drawCrescentMoon(ctx, item.x, item.y, STAR_SIZE);
        } else if (item.subType === 'shield') {
          ctx.fillStyle = '#4ade80';
          ctx.shadowColor = '#4ade80';
          ctx.shadowBlur = 15;
          ctx.strokeStyle = '#4ade80';
          ctx.lineWidth = 2;
          drawShieldIcon(ctx, item.x, item.y, STAR_SIZE);
        } else {
          ctx.fillStyle = '#ffd700';
          ctx.shadowColor = '#ffd700';
          ctx.shadowBlur = 10;
          drawStar(ctx, item.x, item.y, STAR_SIZE);
        }
      } else {
        // 障碍物类型分支：移动者(紫) / 加速者(橙) / 普通尖刺(红)
        if (item.obstacleType === 'mover') {
          drawSpike(ctx, item.x, item.y, OBSTACLE_SIZE, '#aa44ff');
        } else if (item.obstacleType === 'speeder') {
          drawSpike(ctx, item.x, item.y, OBSTACLE_SIZE, '#ff8c00');
        } else {
          drawSpike(ctx, item.x, item.y, OBSTACLE_SIZE, '#e94560');
        }
      }
    }
    ctx.shadowBlur = 0;

    // 角色弹跳位置计算（正弦波驱动）
    const bounceOffset = Math.abs(Math.sin(g.bouncePhase)) * g.maxBounceHeight;
    const charY = TRAMP_Y - bounceOffset;

    // 护盾特效：绿色光环围绕角色
    if (g.shielded) {
      ctx.strokeStyle = '#4ade80';
      ctx.shadowColor = '#4ade80';
      ctx.shadowBlur = 20;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(g.playerX, charY - 10, 22, 0, Math.PI * 2);
      ctx.stroke();
      // 内圈光晕
      ctx.fillStyle = 'rgba(74, 222, 128, 0.1)';
      ctx.beginPath();
      ctx.arc(g.playerX, charY - 10, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 角色在蹦床上的投影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(g.playerX, TRAMP_Y + 2, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 角色身体绘制
    ctx.fillStyle = '#4ecca3';
    ctx.shadowColor = '#4ecca3';
    ctx.shadowBlur = 8;
    // 身体（弹跳时拉伸）
    const stretch = 1 + 0.2 * Math.sin(g.bouncePhase);
    ctx.fillRect(g.playerX - 8, charY - 18, 16, 18 * stretch);
    // 头部（圆形）
    ctx.fillStyle = '#7fffd4';
    ctx.beginPath();
    ctx.arc(g.playerX, charY - 24, 10, 0, Math.PI * 2);
    ctx.fill();
    // 眼睛（白色底+黑色瞳孔）
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(g.playerX - 4, charY - 26, 3, 0, Math.PI * 2);
    ctx.arc(g.playerX + 4, charY - 26, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(g.playerX - 4, charY - 26, 1.5, 0, Math.PI * 2);
    ctx.arc(g.playerX + 4, charY - 26, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // 微笑
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(g.playerX, charY - 20, 5, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
    // 手臂（弹跳时摆动）
    ctx.strokeStyle = '#4ecca3';
    ctx.lineWidth = 4;
    const armAngle = Math.sin(g.bouncePhase * 2) * 0.3;
    ctx.beginPath();
    ctx.moveTo(g.playerX - 8, charY - 12);
    ctx.lineTo(g.playerX - 16, charY - 6 + armAngle * 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(g.playerX + 8, charY - 12);
    ctx.lineTo(g.playerX + 16, charY - 6 - armAngle * 5);
    ctx.stroke();

    ctx.shadowBlur = 0;
  }, []);

  /**
   * 游戏逻辑更新（每帧调用）
   * 处理：弹跳相位推进、背景滚动、道具生成与下落、
   * 碰撞检测（收集/受伤）、护盾逻辑、难度动态提升。
   * 不同障碍物有独特的运动模式：
   * - mover：水平正弦摆动
   * - speeder：下落100px后加速翻倍
   */
  const tick = useCallback(() => {
    const g = gameRef.current;
    if (g.dead) return;

    g.time += 1;

    // 弹跳相位推进（驱动角色上下弹跳和手臂摆动）
    g.bouncePhase += g.bounceSpeed;
    // 背景滚动偏移（视觉高度感）
    g.scrollOffset += 0.3 + g.score * 0.01;
    g.height = Math.floor(g.scrollOffset * 0.1);
    setHeight(g.height);

    // 弹跳速度随分数增加（越跳越快）
    g.bounceSpeed = g.baseBounceSpeed + g.score * 0.0003;

    // 道具生成逻辑：倒计时自动生成新物体
    g.itemSpawnTimer--;
    if (g.itemSpawnTimer <= 0) {
      // 生成间隔随分数减少（生成更快），最小15帧
      g.itemSpawnTimer = Math.max(15, 50 - g.score * 0.2);
      // 障碍物比例随分数增加，最高80%
      const obstacleRate = Math.min(0.8, 0.4 + g.score * 0.001);
      g.items.push(randomItem(g.items, obstacleRate, g.score));
    }

    // 根据分数等级计算下落速度倍率
    let speedMultiplier = 1;
    if (g.score < 50) {
      speedMultiplier = 1;
    } else if (g.score < 150) {
      speedMultiplier = 1.2;
    } else if (g.score < 300) {
      speedMultiplier = 1.5;
    } else {
      speedMultiplier = 2;
    }

    const baseFallSpeed = 1.5 + g.score * 0.01;
    const fallSpeed = baseFallSpeed * speedMultiplier;
    // 当前角色在屏幕上的Y位置（用于碰撞检测）
    const playerBounceOffset = Math.abs(Math.sin(g.bouncePhase)) * g.maxBounceHeight;
    const playerScreenY = TRAMP_Y - playerBounceOffset;

    // 倒序遍历所有下落物体（便于安全地删除）
    for (let i = g.items.length - 1; i >= 0; i--) {
      const item = g.items[i];
      item.y += fallSpeed;

      // 移动障碍物：水平正弦摆动
      if (item.type === 'obstacle' && item.obstacleType === 'mover') {
        item.x += Math.sin(g.time * 0.05) * 1.5;
        item.x = Math.max(10, Math.min(CANVAS_W - 10, item.x));
      }

      // 加速障碍物：下落超过100px后速度翻倍
      if (item.type === 'obstacle' && item.obstacleType === 'speeder' && item.startY !== undefined) {
        if (item.y - item.startY > 100) {
          item.y += fallSpeed; // 额外移动一次
        }
      }

      // 碰撞检测：判断物体是否与角色相交
      const dx = item.x - g.playerX;
      const dy = item.y - playerScreenY;
      const collDist = item.type === 'star' ? STAR_SIZE + PLAYER_SIZE : OBSTACLE_SIZE + PLAYER_SIZE;

      if (Math.abs(dx) < collDist && Math.abs(dy) < collDist + 8) {
        if (item.type === 'star') {
          // 收集到道具
          let points = 10;
          if (item.subType === 'moon') {
            points = 25;          // 月亮25分
          } else if (item.subType === 'shield') {
            g.shielded = true;    // 护盾：不增加分数，提供保护
            g.items.splice(i, 1);
            continue;
          }
          g.score += points;
          setScore(g.score);
          onScoreChange?.(g.score);
          g.items.splice(i, 1);
        } else {
          // 碰到障碍物
          if (g.shielded) {
            // 有护盾时抵消伤害，消耗护盾
            g.shielded = false;
            g.items.splice(i, 1);
          } else {
            // 无护盾：游戏结束
            g.dead = true;
            setGameState('over');
            onGameOver?.(g.score);
            return;
          }
        }
      } else if (item.y > CANVAS_H + 30) {
        // 物体掉出屏幕底部，移除
        g.items.splice(i, 1);
      }
    }
  }, [onScoreChange, onGameOver]);

  /**
   * 游戏主循环
   * 使用 requestAnimationFrame 驱动，限制 tick 更新频率为 ~60fps（每16ms一次），
   * draw 每帧都执行以保持画面流畅。游戏结束时停止循环。
   */
  const gameLoop = useCallback((timestamp: number) => {
    if (gameRef.current.dead) return;
    animRef.current = requestAnimationFrame(gameLoop);

    // 帧率控制：确保逻辑更新不超过60fps
    if (timestamp - lastTickRef.current < 16) {
      draw();
      return;
    }
    lastTickRef.current = timestamp;

    tick();  // 更新逻辑
    draw();  // 渲染画面
  }, [draw, tick]);

  /**
   * 开始新游戏
   * 重置所有游戏状态（位置、分数、弹跳参数、道具列表等），
   * 启动游戏主循环。
   */
  const startGame = useCallback(() => {
    gameRef.current = {
      playerX: CANVAS_W / 2,
      bouncePhase: 0,
      bounceSpeed: 0.04,
      baseBounceSpeed: 0.04,
      maxBounceHeight: 100,
      items: [],
      score: 0,
      height: 0,
      scrollOffset: 0,
      itemSpawnTimer: 30,  // 首波道具30帧后出现
      dead: false,
      shielded: false,
      time: 0,
    };
    setScore(0);
    setHeight(0);
    setGameState('playing');
    onGameStart?.();
    lastTickRef.current = 0;
    animRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop, onGameStart]);

  /**
   * 注册键盘事件（方向键/AD控制左右移动）
   */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (g.dead) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        g.playerX = Math.max(20, g.playerX - 5);   // 左移，限制边界
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        g.playerX = Math.min(CANVAS_W - 20, g.playerX + 5); // 右移
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // 触摸滑动控制
  const touchStartXRef = useRef<number | null>(null);

  /** 左移操作（供虚拟手柄和触摸滑动调用） */
  const moveLeft = useCallback(() => {
    const g = gameRef.current;
    if (g.dead) return;
    g.playerX = Math.max(20, g.playerX - 5);
  }, []);

  /** 右移操作（供虚拟手柄和触摸滑动调用） */
  const moveRight = useCallback(() => {
    const g = gameRef.current;
    if (g.dead) return;
    g.playerX = Math.min(CANVAS_W - 20, g.playerX + 5);
  }, []);

  /** 注册触摸事件：检测左右滑动 */
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartXRef.current = e.touches[0].clientX;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartXRef.current === null) return;
      const dx = e.changedTouches[0].clientX - touchStartXRef.current;
      touchStartXRef.current = null;
      const minSwipe = 15; // 最小滑动距离阈值
      if (Math.abs(dx) < minSwipe) return;
      if (dx > 0) moveRight(); // 向右滑动→右移
      else moveLeft();          // 向左滑动→左移
    };
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [moveLeft, moveRight]);

  /** 组件卸载时清理动画循环 */
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  /** 待机状态时绘制初始静态画面 */
  useEffect(() => {
    if (gameState === 'idle') {
      draw();
    }
  }, [gameState, draw]);

  /** 初始化Canvas尺寸并立即绘制 */
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = CANVAS_W;
      canvasRef.current.height = CANVAS_H;
    }
    draw();
  }, [draw]);

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-between w-full max-w-[400px] mb-3">
        <Title level={4} className="!text-white !mb-0">Magic Trampoline</Title>
        <div className="flex items-center gap-3">
          <Text className="!text-gray-400">Score: {score}</Text>
          <Text className="!text-blue-400">Height: {height}m</Text>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="rounded-lg border border-dark-600"
        width={CANVAS_W}
        height={CANVAS_H}
      />
      {gameState === 'idle' && (
        <Button type="primary" className="mt-4" onClick={startGame}>Start Game</Button>
      )}
      {gameState === 'over' && (
        <div className="mt-4 text-center">
          <Text className="!text-red-400 !block mb-2">Game Over! Score: {score} | Height: {height}m</Text>
          <Button type="primary" onClick={startGame}>Restart</Button>
        </div>
      )}
      {gameState === 'playing' && (
        <>
          <Text className="!text-gray-500 !text-xs mt-2">Arrow keys/AD to move, collect stars and avoid spikes | Swipe / virtual buttons</Text>
          <VirtualGamepad
            directions={{
              left: moveLeft,
              right: moveRight,
            }}
          />
        </>
      )}
    </div>
  );
};

export default MagicTrampoline;
