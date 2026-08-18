/**
 * 射箭大师 (Archery Master)
 *
 * 玩法概述：
 * - 玩家控制弓箭，通过按住鼠标/触摸/空格键蓄力，松开后射箭
 * - 靶心会在垂直和水平方向移动，同时受风力影响
 * - 按环数计分（10/20/30/50分），连续命中可触发连击加成（最高3倍）
 * - 命中靶心可获得额外箭矢奖励
 * - 共10支箭（可额外获得最多5支奖励箭），用完即结束
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button, Typography } from 'antd';

const { Title, Text } = Typography;

interface GameProps {
  /** 得分变化回调，通知父组件当前分数 */
  onScoreChange?: (score: number) => void;
  /** 游戏结束回调，传递最终得分 */
  onGameOver?: (finalScore: number) => void;
  /** 游戏开始回调 */
  onGameStart?: () => void;
}

/* ============ 游戏常量配置 ============ */

/** 画布宽度 */
const CW = 450;
/** 画布高度 */
const CH = 350;
/** 弓箭手的 X 坐标（左侧固定） */
const BOW_X = 50;
/** 弓箭手的 Y 坐标（画布垂直居中） */
const BOW_Y = CH / 2;
/** 靶子基准 X 坐标（右侧区域） */
const TARGET_X_BASE = CW - 90;
/** 各环的半径，从外到内 */
const TARGET_RINGS = [75, 50, 30, 12];
/** 各环对应的得分，从外到内 */
const RING_SCORES = [10, 20, 30, 50];
/** 各环的颜色 */
const RING_COLORS = ['#ffffff', '#e94560', '#ffffff', '#e94560'];
/** 重力加速度，影响箭矢下落 */
const GRAVITY = 0.15;
/** 蓄力速度（每帧增加量） */
const POWER_RATE = 0.002;
/** 初始箭矢总数 */
const MAX_ARROWS = 10;
/** 可额外获得的最大奖励箭矢数 */
const MAX_BONUS_ARROWS = 5;
/** 奖励消息显示时长（毫秒） */
const BONUS_ARROW_DISPLAY_TIME = 1500;

/**
 * 生成靶子的随机垂直位置
 * @returns 在画布中间区域的随机 Y 坐标
 */
function randomTargetY(): number {
  return 80 + Math.random() * (CH - 160);
}

/**
 * 根据射击次数生成随机风力
 * 射击越多，风力波动范围越大
 * @param shotCount 已射击次数
 * @returns 风力值（可为正或负，代表风向）
 */
function randomWind(shotCount: number): number {
  const windRange = 1 + shotCount * 0.15;
  return (Math.random() - 0.5) * 2 * windRange;
}

/** 钉在靶上的箭矢数据结构 */
interface StuckArrow {
  x: number;
  y: number;
  score: number;
}

/**
 * 射箭大师主组件
 * 使用 Canvas 实现 2D 弓箭射击游戏，包含蓄力、风向、连击等机制
 */
const ArcheryMaster: React.FC<GameProps> = ({ onScoreChange, onGameOver, onGameStart }) => {
  /** Canvas 引用 */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** 当前得分 */
  const [score, setScore] = useState(0);
  /** 剩余箭矢数量 */
  const [arrowsLeft, setArrowsLeft] = useState(MAX_ARROWS);
  /** 游戏状态：空闲 / 进行中 / 结束 */
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle');
  /** 奖励提示信息（文字及消失时间） */
  const bonusMessageRef = useRef<{ text: string; endTime: number } | null>(null);

  /** 游戏核心数据引用（通过 ref 避免闭包陷阱，保证每帧读取最新值） */
  const gameRef = useRef({
    targetY: randomTargetY(),           // 靶子当前 Y 坐标
    targetX: TARGET_X_BASE,             // 靶子当前 X 坐标
    targetSpeed: 0.8,                   // 靶子移动速度
    targetDir: 1,                       // 靶子垂直移动方向（1=向下，-1=向上）
    wind: randomWind(0),                // 当前风力值
    windChanging: false,                // 风力是否在变化
    power: 0,                           // 当前蓄力进度（0~1）
    charging: false,                    // 是否正在蓄力
    arrowsLeft: MAX_ARROWS,             // 剩余箭矢数
    bonusArrows: 0,                     // 已获得的奖励箭矢数
    score: 0,                           // 游戏内部分数
    shotCount: 0,                       // 射击次数
    streak: 0,                          // 连续命中次数
    /** 飞行中的箭矢数据（位置和速度） */
    arrow: null as { x: number; y: number; vx: number; vy: number } | null,
    /** 已钉在靶上的箭矢列表 */
    stuckArrows: [] as StuckArrow[],
  });
  /** 游戏状态的 Ref 版本，用于在动画循环中读取 */
  const stateRef = useRef<'idle' | 'playing' | 'over'>('idle');
  /** requestAnimationFrame 的 ID，用于清理 */
  const animRef = useRef(0);

  /**
   * 计算箭矢命中靶子的环数得分
   * 根据箭矢与靶心的距离判断命中哪一个环
   * @param arrowY 箭矢 Y 坐标
   * @param arrowX 箭矢 X 坐标
   * @returns 命中得分（0 表示脱靶）
   */
  const getHitScore = useCallback((arrowY: number, arrowX: number): number => {
    const g = gameRef.current;
    const dist = Math.hypot(arrowX - g.targetX, arrowY - g.targetY);
    // 从内到外依次检查，距离越近分数越高
    for (let i = TARGET_RINGS.length - 1; i >= 0; i--) {
      if (dist <= TARGET_RINGS[i]) return RING_SCORES[i];
    }
    return 0; // 未击中任何环
  }, []);

  /**
   * 根据连击次数计算分数倍率
   * @param streak 当前连击数
   * @returns 分数倍率（1x / 1.5x / 2x / 3x）
   */
  const getStreakMultiplier = useCallback((streak: number): number => {
    if (streak >= 3) return 3;
    if (streak === 2) return 2;
    if (streak === 1) return 1.5;
    return 1;
  }, []);

  /**
   * 渲染游戏画面
   * 绘制背景、弓箭、蓄力条、风向指示、靶子、飞行箭矢和已钉箭矢
   */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const g = gameRef.current;

    // 绘制深色背景
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CW, CH);

    // 绘制星空背景装饰（随机小点）
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * CW, Math.random() * CH, 0.5 + Math.random(), 0, Math.PI * 2);
      ctx.fill();
    }

    /**
     * 绘制弓的形态（根据蓄力程度改变弓弦的拉伸）
     * @param x 弓的中心 X 坐标
     * @param y 弓的中心 Y 坐标
     * @param pull 拉弓程度（0~1）
     */
    const drawBow = (x: number, y: number, pull: number) => {
      // 弓臂（圆弧）
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, 30, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();

      // 弓弦（随蓄力值增加而向右拉伸）
      ctx.strokeStyle = '#654321';
      ctx.lineWidth = 1.5;
      const stringPull = pull * 12;
      ctx.beginPath();
      ctx.moveTo(x - 30 * Math.cos(-Math.PI * 0.4), y + 30 * Math.sin(-Math.PI * 0.4));
      ctx.lineTo(x + stringPull, y);
      ctx.lineTo(x - 30 * Math.cos(Math.PI * 0.4), y + 30 * Math.sin(Math.PI * 0.4));
      ctx.stroke();
    };

    drawBow(BOW_X, BOW_Y, g.power);

    // 弓身竖杆
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(BOW_X - 2, BOW_Y - 20, 4, 40);

    // 蓄力进度条（仅在蓄力时显示）
    if (g.charging) {
      const barX = 10;
      const barY = CH - 30;
      const barW = 80;
      const barH = 12;
      // 进度条背景
      ctx.fillStyle = '#16213e';
      ctx.beginPath();
      ctx.roundRect(barX - 2, barY - 2, barW + 4, barH + 4, 4);
      ctx.fill();
      // 渐变色填充（绿->黄->红）
      const fillW = barW * g.power;
      const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      grad.addColorStop(0, '#4ecca3');
      grad.addColorStop(0.5, '#ffd700');
      grad.addColorStop(1, '#e94560');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(barX, barY, fillW, barH, 3);
      ctx.fill();
      // "力度"标签
      ctx.fillStyle = '#aaa';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('Power', barX + barW / 2, barY - 3);
    }

    // 风向指示器（右上角，用箭头符号表示方向）
    const windArrow = g.wind > 0.1 ? '→' : g.wind < -0.1 ? '←' : '·';
    ctx.fillStyle = g.wind > 0 ? '#e94560' : '#4ecca3';
    ctx.font = '14px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('Wind: ' + windArrow + ' ' + Math.abs(g.wind).toFixed(2), CW - 10, 10);

    // 绘制风向小箭头图形（画布顶部中央）
    if (Math.abs(g.wind) > 0.1) {
      const arrowLen = Math.min(40, Math.abs(g.wind) * 15);
      const arrowBaseX = CW / 2 - (g.wind > 0 ? arrowLen : 0);
      ctx.strokeStyle = g.wind > 0 ? '#e94560' : '#4ecca3';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(arrowBaseX, 30);
      ctx.lineTo(arrowBaseX + arrowLen, 30);
      ctx.stroke();
      ctx.beginPath();
      const tipDir = g.wind > 0 ? 1 : -1;
      ctx.moveTo(arrowBaseX + arrowLen, 30);
      ctx.lineTo(arrowBaseX + arrowLen - tipDir * 8, 26);
      ctx.lineTo(arrowBaseX + arrowLen - tipDir * 8, 34);
      ctx.closePath();
      ctx.fill();
    }

    // 连击倍率显示（左上角）
    if (g.streak > 0) {
      const multiplier = getStreakMultiplier(g.streak);
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 13px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Combo x' + multiplier.toFixed(1), 10, 10);
    }

    // 剩余箭矢数（左下角）
    ctx.fillStyle = '#aaa';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Arrows left: ' + g.arrowsLeft, 10, CH - 40);

    // 奖励提示消息（中间偏上，定时消失）
    if (bonusMessageRef.current && Date.now() < bonusMessageRef.current.endTime) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(bonusMessageRef.current.text, CW / 2, CH / 2 - 40);
    }

    // === 绘制靶子 ===
    const tx = g.targetX;
    const ty = g.targetY;
    ctx.shadowColor = '#e94560';
    ctx.shadowBlur = 12;
    for (let i = 0; i < TARGET_RINGS.length; i++) {
      ctx.fillStyle = RING_COLORS[i];
      ctx.beginPath();
      ctx.arc(tx, ty, TARGET_RINGS[i], 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // 环数标签
    ctx.fillStyle = '#ffffffee';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('50', tx, ty);
    ctx.font = '9px Arial';
    ctx.fillStyle = '#ffffee';
    ctx.fillText('30', tx, ty - 22);
    ctx.fillText('20', tx, ty - 42);
    ctx.fillText('10', tx, ty - 62);

    // === 绘制飞行中的箭矢 ===
    if (g.arrow) {
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 6;
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(g.arrow.x, g.arrow.y);
      // 根据速度方向计算箭杆角度
      const angle = Math.atan2(g.arrow.vy, g.arrow.vx);
      ctx.lineTo(g.arrow.x - Math.cos(angle) * 20, g.arrow.y - Math.sin(angle) * 20);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 箭头（三角形）
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(g.arrow.x, g.arrow.y);
      ctx.lineTo(g.arrow.x - 5, g.arrow.y - 4);
      ctx.lineTo(g.arrow.x - 5, g.arrow.y + 4);
      ctx.closePath();
      ctx.fill();
    }

    // === 绘制已钉在靶上的箭矢 ===
    for (const sa of g.stuckArrows) {
      ctx.strokeStyle = '#cc8800';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sa.x, sa.y);
      ctx.lineTo(sa.x - 15, sa.y - 5);
      ctx.stroke();

      // 显示该箭得分
      ctx.fillStyle = sa.score > 0 ? '#4ecca3' : '#e94560';
      ctx.font = '9px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('+' + sa.score, sa.x, sa.y - 8);
    }

    // 靶子支撑杆
    ctx.fillStyle = '#654321';
    ctx.fillRect(tx - 3, ty + TARGET_RINGS[0], 6, CH - ty - TARGET_RINGS[0]);
  }, [getStreakMultiplier]);

  /**
   * 发射箭矢
   * 根据当前蓄力值计算初速度，创建箭矢对象并扣除箭矢数
   */
  const shoot = useCallback(() => {
    const g = gameRef.current;
    if (g.arrow) return; // 已有飞行中的箭，不能重复发射
    // 速度 = 基础速度 + 蓄力加成
    const speed = 4 + g.power * 8;
    // 创建箭矢，向右上方射出（vx 正向，vy 负向）
    g.arrow = {
      x: BOW_X + 20,
      y: BOW_Y,
      vx: speed * 0.9,
      vy: -speed * 0.3,
    };
    g.charging = false;
    g.arrowsLeft--;
    setArrowsLeft(g.arrowsLeft);
  }, []);

  /**
   * 每帧更新游戏状态
   * - 靶子水平正弦摆动 + 垂直匀速往返移动
   * - 蓄力进度递增
   * - 箭矢飞行（受重力和风力影响）
   * - 碰撞检测（命中/脱靶）
   * - 连击、奖励箭矢、游戏结束判断
   */
  const update = useCallback(() => {
    const g = gameRef.current;

    const now = Date.now();

    // === 靶子移动逻辑 ===
    // 水平方向：正弦摆动，随射击次数增加摆动幅度
    g.targetX = TARGET_X_BASE + Math.sin(now * 0.002 * g.targetSpeed) * (30 + g.shotCount * 3);
    // 垂直方向：在上下边界间匀速往返
    g.targetY += g.targetSpeed * g.targetDir;
    if (g.targetY < 80) { g.targetY = 80; g.targetDir = 1; }
    if (g.targetY > CH - 80) { g.targetY = CH - 80; g.targetDir = -1; }

    // 蓄力进度增加（限制最大值 1）
    if (g.charging) {
      g.power = Math.min(1, g.power + POWER_RATE);
    }

    // === 箭矢飞行逻辑 ===
    if (g.arrow) {
      // 风向随机微变
      if (g.windChanging) {
        g.wind += (Math.random() - 0.5) * 0.02;
      }

      // 物理模拟：重力使 vy 增加（下落），风力影响 vx（水平偏移）
      g.arrow.vy += GRAVITY;
      g.arrow.vx += g.wind * 0.03;
      g.arrow.x += g.arrow.vx;
      g.arrow.y += g.arrow.vy;

      // === 命中检测（箭矢到达靶子水平位置） ===
      if (g.arrow.x >= g.targetX - 5) {
        // 计算命中环数和加成后的最终得分
        const hitScore = getHitScore(g.arrow.y, g.arrow.x);
        const multiplier = getStreakMultiplier(g.streak);
        const finalScore = Math.round(hitScore * multiplier);
        g.score += finalScore;
        setScore(g.score);
        onScoreChange?.(g.score);
        // 记录钉在靶上的箭
        g.stuckArrows.push({ x: g.targetX, y: g.arrow.y, score: finalScore });
        g.arrow = null;
        g.shotCount++;

        // 连击计数：命中则递增，脱靶则重置
        if (hitScore > 0) {
          g.streak++;
        } else {
          g.streak = 0;
        }

        // 命中靶心（50分）且奖励箭未达上限时，奖励一支额外箭矢
        if (hitScore >= 50 && g.bonusArrows < MAX_BONUS_ARROWS) {
          g.arrowsLeft++;
          g.bonusArrows++;
          setArrowsLeft(g.arrowsLeft);
          bonusMessageRef.current = { text: 'Bonus arrow!', endTime: Date.now() + BONUS_ARROW_DISPLAY_TIME };
        }

        // 重置风向，加快靶子速度
        g.wind = randomWind(g.shotCount);
        g.windChanging = true;
        g.targetSpeed += 0.15;
        g.power = 0;

        // 箭矢用完则游戏结束
        if (g.arrowsLeft <= 0) {
          stateRef.current = 'over';
          setGameState('over');
          onGameOver?.(g.score);
        }
        return;
      }

      // === 脱靶检测（箭矢飞出画布边界） ===
      if (g.arrow.x > CW + 50 || g.arrow.y > CH + 50) {
        g.arrow = null;
        g.shotCount++;
        g.streak = 0;           // 脱靶清零连击
        g.wind = randomWind(g.shotCount);
        g.windChanging = true;
        g.power = 0;
        g.stuckArrows.push({ x: g.targetX, y: g.arrow?.y ?? CH, score: 0 });

        if (g.arrowsLeft <= 0) {
          stateRef.current = 'over';
          setGameState('over');
          onGameOver?.(g.score);
        }
      }
    }
  }, [onScoreChange, onGameOver, getHitScore, getStreakMultiplier]);

  /**
   * 游戏主循环
   * 使用 requestAnimationFrame 驱动，循环执行 update 和 draw
   */
  const gameLoop = useCallback(() => {
    if (stateRef.current === 'over') {
      draw(); // 游戏结束仍然绘制最后一帧
      return;
    }
    update(); // 更新逻辑
    draw();   // 渲染画面
    animRef.current = requestAnimationFrame(gameLoop); // 请求下一帧
  }, [update, draw]);

  /** 开始蓄力（按住） */
  const startCharge = useCallback(() => {
    const g = gameRef.current;
    if (g.arrow || stateRef.current !== 'playing') return;
    g.charging = true;
    g.power = 0; // 重置蓄力
  }, []);

  /** 结束蓄力（松开），触发射箭 */
  const endCharge = useCallback(() => {
    const g = gameRef.current;
    if (!g.charging) return;
    shoot();
  }, [shoot]);

  /** 鼠标按下事件处理 */
  const handleMouseDown = useCallback((e: MouseEvent) => {
    e.preventDefault();
    startCharge();
  }, [startCharge]);

  /** 鼠标松开事件处理 */
  const handleMouseUp = useCallback(() => {
    endCharge();
  }, [endCharge]);

  /** 触摸开始事件处理 */
  const handleTouchStart = useCallback((e: TouchEvent) => {
    e.preventDefault();
    startCharge();
  }, [startCharge]);

  /** 触摸结束事件处理 */
  const handleTouchEnd = useCallback(() => {
    endCharge();
  }, [endCharge]);

  /** 键盘按下事件处理（空格键蓄力） */
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault();
      startCharge();
    }
  }, [startCharge]);

  /** 键盘松开事件处理（空格键射箭） */
  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault();
      endCharge();
    }
  }, [endCharge]);

  /**
   * 开始新游戏（或重新开始）
   * 重置所有游戏状态变量，清空箭矢列表，启动游戏主循环
   */
  const startGame = useCallback(() => {
    const g = gameRef.current;
    // 重置靶子位置和速度
    g.targetY = randomTargetY();
    g.targetX = TARGET_X_BASE;
    g.targetSpeed = 0.8;
    g.targetDir = 1;
    // 重置风向、蓄力和箭矢
    g.wind = randomWind(0);
    g.windChanging = true;
    g.power = 0;
    g.charging = false;
    g.arrowsLeft = MAX_ARROWS;
    g.bonusArrows = 0;
    g.shotCount = 0;
    g.streak = 0;
    g.score = 0;
    g.arrow = null;
    g.stuckArrows = [];
    bonusMessageRef.current = null;
    // 切换到进行中状态
    stateRef.current = 'playing';
    setScore(0);
    setArrowsLeft(MAX_ARROWS);
    setGameState('playing');
    onGameStart?.();
    // 启动游戏循环
    animRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop, onGameStart]);

  /** useEffect：空闲状态下绘制初始画面 */
  useEffect(() => {
    if (gameState === 'idle') draw();
  }, [gameState, draw]);

  /** useEffect：每次 draw 函数变化时重新渲染 */
  useEffect(() => {
    draw();
  }, [draw]);

  /**
   * useEffect：注册全局事件监听（鼠标、触摸、键盘）
   * 组件卸载时自动清理事件和动画帧
   */
  useEffect(() => {
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animRef.current);
    };
  }, [handleMouseDown, handleMouseUp, handleTouchStart, handleTouchEnd, handleKeyDown, handleKeyUp]);

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-between w-full max-w-[450px] mb-3">
        <Title level={4} className="!text-white !mb-0">Archery Master</Title>
        <div className="flex items-center gap-4">
          <Text className="!text-gray-400">Score: {score}</Text>
          <Text className="!text-gray-400">Arrows: {arrowsLeft}/{MAX_ARROWS + MAX_BONUS_ARROWS}</Text>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        className="rounded-lg border border-dark-600"
      />
      {gameState === 'idle' && (
        <Button type="primary" className="mt-4" onClick={startGame}>Start Game</Button>
      )}
      {gameState === 'over' && (
        <div className="mt-4 text-center">
          <Text className="!text-green-400 !block mb-2">Game Over! Score: {score}</Text>
          <Button type="primary" onClick={startGame}>Play Again</Button>
        </div>
      )}
      {gameState === 'playing' && (
        <Text className="!text-gray-500 !text-xs mt-2">Hold to charge, release to shoot (Mouse/Touch/Space)</Text>
      )}
    </div>
  );
};

export default ArcheryMaster;
