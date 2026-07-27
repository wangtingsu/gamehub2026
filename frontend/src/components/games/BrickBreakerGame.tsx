/**
 * 打砖块 (Brick Breaker)
 *
 * 玩法概述：
 * - 玩家控制底部挡板左右移动，反弹小球击碎顶部砖块
 * - 每击碎一个砖块得 10 分，全部击碎则过关
 * - 小球落到底部则游戏结束
 * - 支持鼠标移动、触摸滑动和虚拟方向键控制
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import VirtualGamepad from './VirtualGamepad';
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
const W = 480;
/** 画布高度 */
const H = 400;
/** 挡板宽度 */
const PADDLE_W = 80;
/** 挡板高度 */
const PADDLE_H = 12;
/** 小球半径 */
const BALL_R = 6;
/** 砖块行数 */
const BRICK_ROWS = 5;
/** 砖块列数 */
const BRICK_COLS = 8;
/** 砖块宽度 */
const BRICK_W = 50;
/** 砖块高度 */
const BRICK_H = 18;
/** 砖块间距 */
const BRICK_GAP = 6;
/** 砖块区域距顶部距离 */
const BRICK_TOP = 40;

/**
 * 打砖块主组件
 * 使用 Canvas 实现经典打砖块游戏，包含碰撞检测、得分和过关机制
 */
const BrickBreakerGame: React.FC<GameProps> = ({ onScoreChange, onGameOver, onGameStart }) => {
  /** Canvas 引用 */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** 当前得分 */
  const [score, setScore] = useState(0);
  /** 游戏状态：空闲 / 进行中 / 失败 / 胜利 */
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over' | 'win'>('idle');

  /** 游戏核心数据引用（使用 ref 避免闭包陷阱） */
  const gameRef = useRef({
    px: W / 2 - PADDLE_W / 2,   // 挡板 X 坐标（左边缘）
    bx: W / 2,                   // 小球 X 坐标（中心）
    by: H - 30,                  // 小球 Y 坐标（中心）
    bdx: 3,                      // 小球水平速度
    bdy: -3,                     // 小球垂直速度（负值向上）
    score: 0,                    // 游戏内部分数
    running: false,              // 游戏是否运行中
    /** 砖块二维数组，每块包含位置、存活状态和颜色 */
    bricks: Array.from({ length: BRICK_ROWS }, (_, r) =>
      Array.from({ length: BRICK_COLS }, (_, c) => ({
        x: (W - (BRICK_COLS * (BRICK_W + BRICK_GAP) - BRICK_GAP)) / 2 + c * (BRICK_W + BRICK_GAP),
        y: BRICK_TOP + r * (BRICK_H + BRICK_GAP),
        alive: true,
        color: `hsl(${r * 30 + 200}, 80%, 50%)`, // 每行不同色相
      }))
    ),
  });
  /** requestAnimationFrame ID，用于清理 */
  const animRef = useRef(0);

  /**
   * 渲染游戏画面
   * 绘制背景、砖块、挡板和小球
   */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const g = gameRef.current;

    // 深色背景
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    // 绘制砖块（仅绘制存活中的砖块）
    for (const row of g.bricks) {
      for (const b of row) {
        if (!b.alive) continue;
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, BRICK_W, BRICK_H, 3);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // 绘制挡板（底部绿色圆弧矩形）
    ctx.fillStyle = '#4ecca3';
    ctx.shadowColor = '#4ecca3';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(g.px, H - PADDLE_H - 5, PADDLE_W, PADDLE_H, 6);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 绘制小球（红色发光小球）
    ctx.fillStyle = '#e94560';
    ctx.shadowColor = '#e94560';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(g.bx, g.by, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }, []);

  /**
   * 每帧更新游戏状态
   * - 移动小球位置
   * - 墙壁反弹检测
   * - 挡板碰撞检测
   * - 砖块碰撞检测
   * - 游戏结束/过关判断
   */
  const update = useCallback(() => {
    const g = gameRef.current;
    if (!g.running) return;

    // 更新小球位置
    g.bx += g.bdx;
    g.by += g.bdy;

    // 墙壁反弹（左右墙和天花板）
    if (g.bx - BALL_R <= 0 || g.bx + BALL_R >= W) g.bdx = -g.bdx;
    if (g.by - BALL_R <= 0) g.bdy = -g.bdy;

    // 小球落底 = 游戏结束
    if (g.by + BALL_R >= H) {
      g.running = false;
      setGameState('over');
      onGameOver?.(g.score);
      return;
    }

    // 挡板碰撞检测（小球与挡板矩形相交）
    if (g.by + BALL_R >= H - PADDLE_H - 5 && g.by - BALL_R <= H - 5 &&
        g.bx >= g.px && g.bx <= g.px + PADDLE_W) {
      g.bdy = -g.bdy;                     // 垂直方向反弹
      g.by = H - PADDLE_H - 5 - BALL_R;   // 修正位置防止卡入挡板
    }

    // 砖块碰撞检测（遍历所有砖块）
    for (const row of g.bricks) {
      for (const b of row) {
        if (!b.alive) continue; // 已消失的砖块跳过
        // AABB 碰撞检测：小球矩形与砖块矩形相交
        if (g.bx + BALL_R > b.x && g.bx - BALL_R < b.x + BRICK_W &&
            g.by + BALL_R > b.y && g.by - BALL_R < b.y + BRICK_H) {
          b.alive = false;       // 击碎砖块
          g.bdy = -g.bdy;        // 垂直方向反弹
          g.score += 10;         // 每块 10 分
          setScore(g.score);
          onScoreChange?.(g.score);

          // 检查是否所有砖块都被击碎（过关条件）
          if (g.bricks.every(row => row.every(b => !b.alive))) {
            g.running = false;
            setGameState('win');
            onGameOver?.(g.score);
          }
          return; // 每帧只处理一次碰撞
        }
      }
    }
  }, [onScoreChange, onGameOver]);

  /**
   * 游戏主循环
   * 使用 requestAnimationFrame 驱动，循环执行 update 和 draw
   */
  const gameLoop = useCallback(() => {
    const g = gameRef.current;
    if (!g.running) return;
    update();
    draw();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [update, draw]);

  /**
   * 开始新游戏（或重新开始）
   * 重置挡板、小球和砖块位置，启动游戏循环
   */
  const startGame = useCallback(() => {
    gameRef.current = {
      px: W / 2 - PADDLE_W / 2,
      bx: W / 2,
      by: H - 30,
      bdx: 3,
      bdy: -3,
      score: 0,
      running: true,
      bricks: Array.from({ length: BRICK_ROWS }, (_, r) =>
        Array.from({ length: BRICK_COLS }, (_, c) => ({
          x: (W - (BRICK_COLS * (BRICK_W + BRICK_GAP) - BRICK_GAP)) / 2 + c * (BRICK_W + BRICK_GAP),
          y: BRICK_TOP + r * (BRICK_H + BRICK_GAP),
          alive: true,
          color: `hsl(${r * 30 + 200}, 80%, 50%)`,
        }))
      ),
    };
    setScore(0);
    setGameState('playing');
    onGameStart?.();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  /**
   * useEffect：注册鼠标移动和触摸事件控制挡板
   * 鼠标/触摸位置映射到挡板中心，并限制在画布范围内
   */
  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      if (gameRef.current.running && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        let x = e.clientX - rect.left - PADDLE_W / 2;
        x = Math.max(0, Math.min(W - PADDLE_W, x)); // 限制在左右边界内
        gameRef.current.px = x;
      }
    };
    const handleTouch = (e: TouchEvent) => {
      if (gameRef.current.running && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        let x = e.touches[0].clientX - rect.left - PADDLE_W / 2;
        x = Math.max(0, Math.min(W - PADDLE_W, x));
        gameRef.current.px = x;
      }
    };
    window.addEventListener('mousemove', handleMouse);
    window.addEventListener('touchmove', handleTouch, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouse);
      window.removeEventListener('touchmove', handleTouch);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  /**
   * 虚拟方向键：挡板左移
   * 每次调用向左移动 20px，限制不超出左边界
   */
  const movePaddleLeft = useCallback(() => {
    const g = gameRef.current;
    if (!g.running) return;
    g.px = Math.max(0, g.px - 20);
  }, []);

  /**
   * 虚拟方向键：挡板右移
   * 每次调用向右移动 20px，限制不超出右边界
   */
  const movePaddleRight = useCallback(() => {
    const g = gameRef.current;
    if (!g.running) return;
    g.px = Math.min(W - PADDLE_W, g.px + 20);
  }, []);

  /** useEffect：空闲状态下绘制初始画面 */
  useEffect(() => { if (gameState === 'idle') draw(); }, [gameState, draw]);
  /** useEffect：每次 draw 函数变化时重新渲染 */
  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-between w-full max-w-[480px] mb-3">
        <Title level={4} className="!text-white !mb-0">打砖块</Title>
        <Text className="!text-gray-400">得分: {score}</Text>
      </div>
      <canvas ref={canvasRef} width={W} height={H} className="rounded-lg border border-dark-600" />
      {gameState === 'idle' && <Button type="primary" className="mt-4" onClick={startGame}>开始游戏</Button>}
      {gameState === 'over' && (
        <div className="mt-4 text-center">
          <Text className="!text-red-400 !block mb-2">游戏结束! 得分: {score}</Text>
          <Button type="primary" onClick={startGame}>重新开始</Button>
        </div>
      )}
      {gameState === 'win' && (
        <div className="mt-4 text-center">
          <Text className="!text-green-400 !block mb-2">恭喜过关! 得分: {score}</Text>
          <Button type="primary" onClick={startGame}>再玩一次</Button>
        </div>
      )}
      {gameState === 'playing' && (
        <>
          <Text className="!text-gray-500 !text-xs mt-2">移动鼠标/手指滑动/方向键控制挡板</Text>
          <VirtualGamepad
            directions={{
              left: movePaddleLeft,
              right: movePaddleRight,
            }}
          />
        </>
      )}
    </div>
  );
};

export default BrickBreakerGame;
