/**
 * JumpAdventure - 跳跃冒险游戏组件
 *
 * 一款横向卷轴跳跃冒险游戏。玩家控制一个方块角色，
 * 在不断生成的平台上跳跃前进，收集金币并尽量跳得更远。
 * 随着分数增加，游戏速度逐渐提升，难度递增。
 *
 * 玩法机制：
 * - 点击/空格起跳，按住蓄力可跳得更远
 * - 角色在平台上连续跳跃前进，游戏自动向右滚动
 * - 收集金币增加分数
 * - 踩到碎裂平台会短暂停留后碎裂掉落
 * - 移动平台会左右摆动，增加判断难度
 * - 掉落出屏幕底部即游戏结束
 *
 * 所有游戏逻辑在 Canvas 上渲染，不需要外部资源。
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

interface GameProps {
  onScoreChange?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onGameStart?: () => void;
}

// ===================== 游戏常量 =====================

/** 画布宽度 */
const CW = 400;
/** 画布高度 */
const CH = 300;
/** 地面（平台）Y坐标 */
const GROUND_Y = CH - 40;
/** 角色固定的X位置（屏幕X，不是世界X） */
const CHAR_X = 80;
/** 角色宽度 */
const CHAR_W = 20;
/** 角色高度 */
const CHAR_H = 28;
/** 基础滚动速度 */
const BASE_SPEED = 2;
/** 重力加速度（向下为正） */
const GRAVITY = 0.45;
/** 基础跳跃速度（负值代表向上） */
const BASE_JUMP = -9;
/** 蓄力最大跳跃速度 */
const MAX_JUMP = -15;
/** 蓄力最大持续时间（毫秒） */
const HOLD_MAX = 500;
/** 平台最大宽度 */
const MAX_PLATFORM_W = 160;
/** 平台最小间距 */
const MIN_GAP = 50;
/** 金币半径 */
const COIN_R = 7;
/** 平台高度 */
const PLATFORM_H = 14;

/** 平台类型：普通 | 移动 | 碎裂 */
type PlatformType = 'normal' | 'moving' | 'crumbling';

/** 平台数据结构 */
interface Platform {
  wx: number;                  // 平台在世界坐标系中的X位置
  ww: number;                  // 平台宽度
  platformType: PlatformType;  // 平台类型
  initialWx: number;           // 初始X位置（移动平台回归用）
  lastGap: number;             // 与前一个平台的间距（用于决定金币价值）
  crumbleTimer: number | null; // 碎裂倒计时（非null表示正在碎裂）
  dx: number;                  // 本帧的X偏移量（移动平台带动角色）
}

/** 金币数据结构 */
interface CoinObj {
  wx: number;       // 世界X坐标
  wy: number;       // 世界Y坐标
  collected: boolean; // 是否已被收集
  value: number;    // 金币价值（普通5，远距15）
}

/**
 * 随机决定新平台的类型
 * 15% 概率移动平台，10% 概率碎裂平台，其余为普通平台
 */
function determinePlatformType(): PlatformType {
  const rand = Math.random();
  if (rand < 0.15) return 'moving';
  if (rand < 0.25) return 'crumbling';
  return 'normal';
}

/**
 * 生成一个新平台
 * 根据分数动态调整平台宽度和间距：分数越高，平台越窄、间隙越大。
 * @param lastX 前一个平台的结束X坐标
 * @param score 当前分数（影响难度）
 * @returns 新平台对象
 */
function generatePlatform(lastX: number, score: number): Platform {
  // 分数越高，平台越窄（最小40px）
  const minPlatformW = Math.max(40, 70 - score * 0.02);
  // 分数越高，间距越大（最大250px）
  const maxGap = Math.min(250, 160 + score * 0.05);
  const gap = MIN_GAP + Math.random() * (maxGap - MIN_GAP);
  const ww = minPlatformW + Math.random() * (MAX_PLATFORM_W - minPlatformW);
  const wx = lastX + gap;
  const pType = determinePlatformType();
  return {
    wx,
    ww,
    platformType: pType,
    initialWx: pType === 'moving' ? wx : wx,
    lastGap: gap,
    crumbleTimer: null,
    dx: 0,
  };
}

/**
 * 在指定平台附近生成一个金币
 * 若平台间距较大（>120），金币价值更高（奖励冒险跳跃）。
 * @param platform 所在平台
 * @returns 金币对象
 */
function generateCoin(platform: Platform): CoinObj {
  const value = platform.lastGap > 120 ? 15 : 5;
  return {
    wx: platform.wx + Math.random() * platform.ww, // 在平台上方随机位置
    wy: GROUND_Y - 30 - Math.random() * 20,
    collected: false,
    value,
  };
}

const JumpAdventure: React.FC<GameProps> = ({ onScoreChange, onGameOver, onGameStart }) => {
  const { t } = useTranslation('games');
  // Canvas 引用
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /** 玩家分数（用于UI显示） */
  const [score, setScore] = useState(0);
  /** 游戏阶段：idle(待开始) | playing(游戏中) | over(已结束) */
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle');

  /** 游戏核心状态（使用Ref避免频繁重渲染） */
  const gameRef = useRef({
    scrollX: 0,                     // 世界滚动偏移量
    platforms: [] as Platform[],    // 所有平台
    coins: [] as CoinObj[],         // 所有金币
    cy: GROUND_Y,                   // 角色Y坐标
    vy: 0,                          // 角色垂直速度
    speed: BASE_SPEED,              // 当前滚动速度
    score: 0,                       // 当前分数
    onGround: true,                 // 是否站在地面上
    jumpHoldStart: null as number | null,  // 蓄力开始时间戳
  });

  /** 游戏状态独立Ref（供动画循环中同步读取） */
  const stateRef = useRef<'idle' | 'playing' | 'over'>('idle');
  /** requestAnimationFrame动画ID */
  const animRef = useRef(0);

  /**
   * 绘制游戏画面
   * 使用 Canvas 2D API 渲染背景、平台、金币和角色。
   * 根据平台类型（普通/移动/碎裂）使用不同颜色区分。
   * 碎裂平台会随倒计时显示逐渐增多的裂纹。
   */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const g = gameRef.current;

    // 绘制渐变星空背景
    const gradient = ctx.createLinearGradient(0, 0, 0, CH);
    gradient.addColorStop(0, '#0f0c29');
    gradient.addColorStop(0.5, '#302b63');
    gradient.addColorStop(1, '#24243e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CW, CH);

    // 绘制所有可见平台（剔除屏幕外的平台以优化性能）
    for (const p of g.platforms) {
      const sx = p.wx - g.scrollX; // 世界坐标转屏幕坐标
      if (sx + p.ww < -10 || sx > CW + 10) continue;

      ctx.shadowBlur = 8;
      // 不同平台类型使用不同的颜色
      if (p.platformType === 'moving') {
        ctx.shadowColor = '#aa44ff';
        ctx.fillStyle = '#aa44ff';
      } else if (p.platformType === 'crumbling') {
        ctx.shadowColor = '#e94560';
        ctx.fillStyle = '#e94560';
      } else {
        ctx.shadowColor = '#6c5ce7';
        ctx.fillStyle = '#6c5ce7';
      }

      ctx.beginPath();
      ctx.roundRect(sx, GROUND_Y, p.ww, PLATFORM_H, 4);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 平台顶部高光
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.roundRect(sx, GROUND_Y, p.ww, 4, 2);
      ctx.fill();

      // 碎裂平台的裂纹效果（倒计时越久，裂纹越多）
      if (p.platformType === 'crumbling' && p.crumbleTimer !== null) {
        const crackProgress = p.crumbleTimer / 30;
        const crackCount = Math.floor(crackProgress * 5);
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < crackCount; i++) {
          const cx = sx + (p.ww / (crackCount + 1)) * (i + 1);
          ctx.beginPath();
          ctx.moveTo(cx, GROUND_Y + 2);
          ctx.lineTo(cx + 3, GROUND_Y + PLATFORM_H - 2);
          ctx.lineTo(cx - 2, GROUND_Y + PLATFORM_H - 4);
          ctx.stroke();
        }
      }
    }

    // 绘制所有可见金币
    for (const coin of g.coins) {
      if (coin.collected) continue;
      const sx = coin.wx - g.scrollX;
      if (sx < -10 || sx > CW + 10) continue;
      // 金色发光圆形
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(sx, coin.wy, COIN_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // 高光点
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.arc(sx - 2, coin.wy - 2, COIN_R * 0.35, 0, Math.PI * 2);
      ctx.fill();
      // 美元符号
      ctx.fillStyle = '#b8860b';
      ctx.font = 'bold 9px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', sx, coin.wy);
    }

    // 绘制角色（固定X位置，Y随跳跃变化）
    const cx = CHAR_X;
    const cy = g.cy;
    ctx.shadowColor = '#4ecca3';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#4ecca3';
    ctx.beginPath();
    ctx.roundRect(cx - CHAR_W / 2, cy - CHAR_H, CHAR_W, CHAR_H, 6);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 角色顶部高光
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.roundRect(cx - CHAR_W / 2, cy - CHAR_H, CHAR_W, 6, 4);
    ctx.fill();

    // 眼睛
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx - 3, cy - CHAR_H + 10, 2.5, 0, Math.PI * 2);
    ctx.arc(cx + 3, cy - CHAR_H + 10, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 分数显示
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(t('gameUI.distanceLabel', { value: Math.floor(g.score) }), CW / 2, 8);
  }, [t]);

  /**
   * 更新游戏逻辑（每帧调用）
   * 处理：滚动推进、重力/跳跃物理、平台碰撞检测、
   * 移动平台更新、碎裂平台倒计时、金币收集、平台生成与回收。
   * @param timestamp requestAnimationFrame的时间戳，用于计算移动平台位置
   */
  const update = useCallback((timestamp: number) => {
    const g = gameRef.current;
    // 1. 世界滚动推进（游戏自动向右移动）
    g.scrollX += g.speed;
    g.score = Math.floor(g.scrollX / 5);
    setScore(g.score);
    onScoreChange?.(g.score);

    // 根据分数动态调整移动速度（三个难度等级）
    if (g.score > 1000) g.speed = 6.5;
    else if (g.score > 500) g.speed = 5;
    else if (g.score > 200) g.speed = 3.5;
    else g.speed = 2;

    // 2. 重力模拟
    g.vy += GRAVITY;    // 加速度累积
    g.cy += g.vy;        // 更新位置

    const charWorldX = g.scrollX + CHAR_X; // 角色的世界X坐标

    // 3. 更新移动平台位置（正弦摆动）
    for (const p of g.platforms) {
      if (p.platformType === 'moving') {
        const prevWx = p.wx;
        p.wx = p.initialWx + Math.sin(timestamp * 0.003) * 30;
        p.dx = p.wx - prevWx; // 记录移动量，用于带动角色
      } else {
        p.dx = 0;
      }
    }

    // 4. 平台碰撞检测：判断角色是否站在某个平台上
    let onPlatform = false;
    let platformDx = 0;
    for (const p of g.platforms) {
      if (charWorldX >= p.wx && charWorldX <= p.wx + p.ww) {
        onPlatform = true;
        if (g.cy >= GROUND_Y) {
          // 角色落在平台上
          g.cy = GROUND_Y;
          g.vy = 0;
          g.onGround = true;

          if (p.platformType === 'moving') {
            platformDx = p.dx || 0; // 移动平台带动角色
          }

          if (p.platformType === 'crumbling' && p.crumbleTimer === null) {
            p.crumbleTimer = 0; // 开始碎裂倒计时
          }
        }
        break;
      }
    }

    if (!onPlatform) {
      g.onGround = false; // 在空中
    }

    // 移动平台的水平带动
    if (platformDx !== 0) {
      g.scrollX += platformDx;
    }

    // 5. 碎裂平台处理：倒计时增加，超过30帧后移除
    g.platforms = g.platforms.filter(p => {
      if (p.platformType === 'crumbling' && p.crumbleTimer !== null) {
        p.crumbleTimer++;
        return p.crumbleTimer < 30; // 30帧后移除
      }
      return true;
    });

    // 6. 掉落检测：角色超出屏幕底部则游戏结束
    if (g.cy > CH + 50) {
      stateRef.current = 'over';
      setGameState('over');
      onGameOver?.(g.score);
      return;
    }

    // 7. 生成新的平台和金币：当最后一个平台即将离开视野时
    const lastPlatform = g.platforms[g.platforms.length - 1];
    const viewEnd = g.scrollX + CW + 300;
    if (!lastPlatform || lastPlatform.wx + lastPlatform.ww < viewEnd) {
      const startX = lastPlatform ? lastPlatform.wx + lastPlatform.ww : 0;
      const newPlat = generatePlatform(startX, g.score);
      g.platforms.push(newPlat);
      if (Math.random() < 0.6) {
        g.coins.push(generateCoin(newPlat));
      }
    }

    // 8. 回收远离视野的平台和金币（释放内存）
    g.platforms = g.platforms.filter(p => p.wx + p.ww > g.scrollX - 200);
    g.coins = g.coins.filter(c => c.wx > g.scrollX - 200 && !c.collected);

    // 9. 金币收集检测：角色经过即可收集
    for (const coin of g.coins) {
      if (coin.collected) continue;
      const sx = coin.wx - g.scrollX;
      if (Math.abs(sx - CHAR_X) < 20 && Math.abs(coin.wy - g.cy + CHAR_H / 2) < 25) {
        coin.collected = true;
        g.score += coin.value;
        setScore(g.score);
        onScoreChange?.(g.score);
      }
    }
  }, [onScoreChange, onGameOver]);

  /**
   * 游戏主循环
   * 每帧调用 update() 更新逻辑、draw() 渲染画面。
   * 使用 requestAnimationFrame 驱动，实现60fps平滑动画。
   * 游戏结束后停止循环（仅绘制最后一帧）。
   */
  const gameLoop = useCallback((timestamp: number) => {
    if (stateRef.current === 'over') {
      draw();
      return;
    }
    update(timestamp);
    draw();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [update, draw]);

  /**
   * 跳跃操作
   * 当角色在地面上时，施加向上的初速度并记录蓄力开始时间。
   * @param timestamp 触发跳跃的时间戳（用于计算蓄力时长）
   */
  const jump = useCallback((timestamp: number) => {
    const g = gameRef.current;
    if (stateRef.current !== 'playing') return;
    if (g.onGround) {
      g.vy = BASE_JUMP;    // 初始跳跃速度
      g.onGround = false;
      g.jumpHoldStart = timestamp; // 开始计时蓄力
    }
  }, []);

  /**
   * 释放跳跃（蓄力结束）
   * 根据按住时间计算额外的跳跃速度：按住越久跳得越高。
   * 最多蓄力500ms（HOLD_MAX），最大跳跃速度为 MAX_JUMP。
   */
  const releaseJump = useCallback(() => {
    const g = gameRef.current;
    if (g.jumpHoldStart !== null && g.vy < 0) {
      const elapsed = performance.now() - g.jumpHoldStart;
      const t = Math.min(elapsed / HOLD_MAX, 1); // 蓄力进度（0~1）
      const chargedVy = BASE_JUMP + t * (MAX_JUMP - BASE_JUMP);
      if (chargedVy < g.vy) {
        g.vy = chargedVy; // 使用更大的（更负的）速度
      }
    }
    g.jumpHoldStart = null;
  }, []);

  /** 键盘按下事件：空格/上箭头触发跳跃 */
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      jump(performance.now());
    }
  }, [jump]);

  /** 键盘释放事件：释放跳跃蓄力 */
  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      releaseJump();
    }
  }, [releaseJump]);

  /** 鼠标按下触发跳跃 */
  const handleMouseDown = useCallback((e: MouseEvent) => {
    e.preventDefault();
    jump(performance.now());
  }, [jump]);

  /** 鼠标释放结束蓄力 */
  const handleMouseUp = useCallback(() => {
    releaseJump();
  }, [releaseJump]);

  /** 触摸开始触发跳跃 */
  const handleTouchStart = useCallback((e: TouchEvent) => {
    e.preventDefault();
    jump(performance.now());
  }, [jump]);

  /** 触摸结束释放蓄力 */
  const handleTouchEnd = useCallback(() => {
    releaseJump();
  }, [releaseJump]);

  /**
   * 开始新游戏
   * 初始化游戏状态：创建初始平台和金币，重置角色位置和物理参数，
   * 启动游戏主循环。
   */
  const startGame = useCallback(() => {
    const firstPlat: Platform = {
      wx: 0,
      ww: 300,
      platformType: 'normal',
      initialWx: 0,
      lastGap: 0,
      crumbleTimer: null,
      dx: 0,
    };
    const g = gameRef.current;
    g.scrollX = 0;
    g.platforms = [firstPlat, generatePlatform(300, 0)];
    g.coins = [generateCoin(firstPlat)];
    g.cy = GROUND_Y;  // 角色站在地面上
    g.vy = 0;         // 初始速度为零
    g.speed = BASE_SPEED;
    g.score = 0;
    g.onGround = true;
    g.jumpHoldStart = null;
    stateRef.current = 'playing';
    setScore(0);
    setGameState('playing');
    onGameStart?.();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop, onGameStart]);

  /** 待机状态时绘制静态画面 */
  useEffect(() => {
    if (gameState === 'idle') draw();
  }, [gameState, draw]);

  /** 初始渲染画布 */
  useEffect(() => {
    draw();
  }, [draw]);

  /**
   * 注册全局操作事件
   * 支持键盘、鼠标、触摸三种交互方式，兼容PC和移动设备。
   * 组件卸载时自动清理所有事件监听和动画循环。
   */
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      cancelAnimationFrame(animRef.current);
    };
  }, [handleKeyDown, handleKeyUp, handleMouseDown, handleMouseUp, handleTouchStart, handleTouchEnd]);

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-between w-full max-w-[400px] mb-3">
        <Title level={4} className="!text-white !mb-0">{t('onlineGames.games.jump-adventure.name')}</Title>
        <Text className="!text-gray-400">{t('gameUI.distanceLabel', { value: score })}</Text>
      </div>
      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        className="rounded-lg border border-dark-600"
      />
      {gameState === 'idle' && (
        <Button type="primary" className="mt-4" onClick={startGame}>{t('gameUI.startGame')}</Button>
      )}
      {gameState === 'over' && (
        <div className="mt-4 text-center">
          <Text className="!text-red-400 !block mb-2">{t('gameUI.gameOverDistance', { score })}</Text>
          <Button type="primary" onClick={startGame}>{t('gameUI.restart')}</Button>
        </div>
      )}
      {gameState === 'playing' && (
        <Text className="!text-gray-500 !text-xs mt-2">{t('gameUI.hints.jumpAdventure')}</Text>
      )}
    </div>
  );
};

export default JumpAdventure;
