/**
 * 乒乓球 (Pong) 游戏组件
 *
 * 玩法概述：
 * - 经典乒乓球游戏，玩家控制左侧球拍，AI 控制右侧球拍
 * - 使用 Canvas 渲染，支持鼠标移动、触摸滑动和方向键控制
 * - 先获得 5 分者获胜
 * - AI 对手带有随机扰动，使游戏更有挑战性
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import VirtualGamepad from './VirtualGamepad';
import { Button, Typography } from 'antd';

const { Title, Text } = Typography;

/** 游戏组件的属性接口 */
interface GameProps {
  /** 分数变化时的回调函数 */
  onScoreChange?: (score: number) => void;
  /** 游戏结束时的回调函数，传入最终分数 */
  onGameOver?: (finalScore: number) => void;
  /** 游戏开始时的回调函数 */
  onGameStart?: () => void;
}

/** 画布宽度（像素） */
const W = 560;
/** 画布高度（像素） */
const H = 380;
/** 球拍宽度（像素） */
const PADDLE_W = 10;
/** 球拍高度（像素） */
const PADDLE_H = 70;
/** 球体半径（像素） */
const BALL_R = 6;
/** 赢得比赛所需分数 */
const WIN_SCORE = 5;

/**
 * 乒乓球游戏主组件
 *
 * @param props.onScoreChange - 分数变化回调
 * @param props.onGameOver - 游戏结束回调
 * @param props.onGameStart - 游戏开始回调
 * @returns 乒乓球游戏界面
 */
const PongGame: React.FC<GameProps> = ({ onScoreChange, onGameOver, onGameStart }) => {
  /** Canvas 元素的引用 */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** 当前得分（玩家得分 * 10） */
  const [score, setScore] = useState(0);
  /** 游戏状态：idle-未开始，playing-进行中，over-已结束 */
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle');
  /**
   * 游戏核心数据（使用 ref 存储以避免闭包陈旧值问题）
   * 包含球拍位置、球的位置和速度、双方得分、运行标志
   */
  const gameRef = useRef({
    playerY: H / 2 - PADDLE_H / 2,   // 玩家球拍 Y 坐标（居中）
    aiY: H / 2 - PADDLE_H / 2,       // AI 球拍 Y 坐标（居中）
    bx: W / 2,                        // 球的 X 坐标（居中）
    by: H / 2,                        // 球的 Y 坐标（居中）
    bdx: 4,                           // 球的水平速度
    bdy: 3,                           // 球的垂直速度
    playerScore: 0,                   // 玩家得分
    aiScore: 0,                       // AI 得分
    running: false,                   // 游戏是否运行中
  });
  /** requestAnimationFrame 的 ID，用于取消动画循环 */
  const animRef = useRef(0);

  /**
   * 绘制游戏画面
   * 包括背景、中分线、双方分数、两侧球拍和球
   * 球拍和球带有发光效果（shadowBlur）
   */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const g = gameRef.current;

    // 绘制深色背景
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    // 绘制中分虚线
    ctx.strokeStyle = '#16213e';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // 绘制双方得分（灰色大字）
    ctx.fillStyle = '#333';
    ctx.font = '48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(g.playerScore), W / 2 - 60, 50);
    ctx.fillText(String(g.aiScore), W / 2 + 60, 50);

    // 绘制玩家球拍（绿色，带发光效果）
    ctx.fillStyle = '#4ecca3';
    ctx.shadowColor = '#4ecca3';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(10, g.playerY, PADDLE_W, PADDLE_H, 4);
    ctx.fill();

    // 绘制 AI 球拍（红色，带发光效果）
    ctx.fillStyle = '#e94560';
    ctx.shadowColor = '#e94560';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(W - 10 - PADDLE_W, g.aiY, PADDLE_W, PADDLE_H, 4);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 绘制球（白色，带发光效果）
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(g.bx, g.by, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }, []);

  /**
   * 更新游戏状态（每帧调用）
   * 处理球的移动、碰撞检测、得分判定和 AI 移动逻辑
   */
  const update = useCallback(() => {
    const g = gameRef.current;
    if (!g.running) return;

    // 更新球的位置
    g.bx += g.bdx;
    g.by += g.bdy;

    // 上下边界反弹：球碰到顶部或底部时反转垂直速度
    if (g.by - BALL_R <= 0 || g.by + BALL_R >= H) g.bdy = -g.bdy;

    /**
     * 玩家球拍碰撞检测
     * 条件：球拍位于左侧区域，且球的 X 位置进入球拍范围，且 Y 位置在球拍范围内
     * 碰撞后球向右反弹
     */
    if (g.bx - BALL_R <= 10 + PADDLE_W &&
        g.bx - BALL_R >= 10 &&
        g.by >= g.playerY && g.by <= g.playerY + PADDLE_H) {
      g.bdx = Math.abs(g.bdx); // 确保向右运动
      g.bx = 10 + PADDLE_W + BALL_R; // 修正球的位置，防止卡在球拍内
    }

    /**
     * AI 球拍碰撞检测
     * 条件：球拍位于右侧区域，且球的 X 位置进入球拍范围，且 Y 位置在球拍范围内
     * 碰撞后球向左反弹
     */
    if (g.bx + BALL_R >= W - 10 - PADDLE_W &&
        g.bx + BALL_R <= W - 10 &&
        g.by >= g.aiY && g.by <= g.aiY + PADDLE_H) {
      g.bdx = -Math.abs(g.bdx); // 确保向左运动
      g.bx = W - 10 - PADDLE_W - BALL_R; // 修正球的位置
    }

    /**
     * 得分判定
     * 球超出左边界 -> AI 得分
     * 球超出右边界 -> 玩家得分
     */
    if (g.bx < 0) {
      g.aiScore++;
      // AI 达到获胜分数则游戏结束
      if (g.aiScore >= WIN_SCORE) {
        g.running = false;
        setGameState('over');
        onGameOver?.(g.playerScore);
        return;
      }
      resetBall(g); // 重置球到中央
    }
    if (g.bx > W) {
      g.playerScore++;
      const newScore = g.playerScore * 10; // 每得一分 10 分
      setScore(newScore);
      onScoreChange?.(newScore);
      // 玩家达到获胜分数则游戏结束
      if (g.playerScore >= WIN_SCORE) {
        g.running = false;
        setGameState('over');
        onGameOver?.(newScore);
        return;
      }
      resetBall(g); // 重置球到中央
    }

    /**
     * AI 球拍移动逻辑
     * 有意设计为不完美移动：
     * - 追踪球的位置，但加入随机偏移（±20 像素），使 AI 有一定失误率
     * - 球向 AI 方向移动（bdx > 0）时 AI 反应更快（速度 2.5）
     * - 球远离 AI 方向（bdx < 0）时 AI 移动较慢（速度 1）
     * - 只有偏差大于 5 像素时才移动，避免抖动
     */
    const target = g.by - PADDLE_H / 2 + (Math.random() - 0.5) * 40;
    const diff = target - g.aiY;
    const aiSpeed = g.bdx > 0 ? 2.5 : 1;
    if (Math.abs(diff) > 5) {
      g.aiY += Math.sign(diff) * Math.min(Math.abs(diff), aiSpeed);
    }
    // 限制 AI 球拍不超出上下边界
    g.aiY = Math.max(0, Math.min(H - PADDLE_H, g.aiY));
  }, [onScoreChange, onGameOver]);

  /**
   * 重置球到场地中央并赋予随机初始速度
   *
   * @param g - 游戏数据对象（会被直接修改）
   */
  const resetBall = (g: typeof gameRef.current) => {
    g.bx = W / 2;                              // 水平居中
    g.by = 60 + Math.random() * (H - 120);     // 垂直随机位置（避开边缘）
    g.bdx = (Math.random() > 0.5 ? 1 : -1) * 4; // 随机向左或向右
    g.bdy = (Math.random() > 0.5 ? 1 : -1) * 3; // 随机向上或向下
  };

  /**
   * 游戏主循环（使用 requestAnimationFrame）
   * 每帧执行：更新物理状态 -> 重新绘制画面
   */
  const gameLoop = useCallback(() => {
    const g = gameRef.current;
    if (!g.running) return;
    update();  // 更新游戏逻辑
    draw();    // 重绘画布
    animRef.current = requestAnimationFrame(gameLoop); // 请求下一帧
  }, [update, draw]);

  /**
   * 开始/重新开始游戏
   * 重置所有游戏数据，启动游戏循环
   */
  const startGame = useCallback(() => {
    gameRef.current = {
      playerY: H / 2 - PADDLE_H / 2,
      aiY: H / 2 - PADDLE_H / 2,
      bx: W / 2,
      by: H / 2,
      bdx: 4,
      bdy: 3,
      playerScore: 0,
      aiScore: 0,
      running: true,
    };
    setScore(0);
    setGameState('playing');
    onGameStart?.();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  /**
   * 注册鼠标和触摸事件监听器
   * 鼠标移动和手指滑动都可以控制玩家球拍位置
   * 计算鼠标/触摸位置相对于画布顶部的偏移作为球拍 Y 坐标
   */
  useEffect(() => {
    /** 鼠标移动事件处理：将鼠标 Y 坐标映射到球拍位置 */
    const handleMouse = (e: MouseEvent) => {
      if (gameRef.current.running && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const y = e.clientY - rect.top - PADDLE_H / 2;
        // 限制球拍不超出上下边界
        gameRef.current.playerY = Math.max(0, Math.min(H - PADDLE_H, y));
      }
    };
    /** 触摸滑动事件处理：将触摸点 Y 坐标映射到球拍位置 */
    const handleTouch = (e: TouchEvent) => {
      if (gameRef.current.running && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const y = e.touches[0].clientY - rect.top - PADDLE_H / 2;
        gameRef.current.playerY = Math.max(0, Math.min(H - PADDLE_H, y));
      }
    };
    window.addEventListener('mousemove', handleMouse);
    window.addEventListener('touchmove', handleTouch, { passive: true });
    // 组件卸载时清理事件监听和动画循环
    return () => {
      window.removeEventListener('mousemove', handleMouse);
      window.removeEventListener('touchmove', handleTouch);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  /**
   * 虚拟方向键：球拍上移
   * 每次移动 20 像素，不超出上边界
   */
  const movePaddleUp = useCallback(() => {
    const g = gameRef.current;
    if (!g.running) return;
    g.playerY = Math.max(0, g.playerY - 20);
  }, []);

  /**
   * 虚拟方向键：球拍下移
   * 每次移动 20 像素，不超出下边界
   */
  const movePaddleDown = useCallback(() => {
    const g = gameRef.current;
    if (!g.running) return;
    g.playerY = Math.min(H - PADDLE_H, g.playerY + 20);
  }, []);

  // 游戏初始空闲状态时绘制静态画面（显示场地）
  useEffect(() => { if (gameState === 'idle') draw(); }, [gameState, draw]);
  // 游戏结束时绘制最终画面
  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="flex flex-col items-center">
      {/* 顶部信息栏：游戏标题和当前得分 */}
      <div className="flex items-center justify-between w-full max-w-[560px] mb-3">
        <Title level={4} className="!text-white !mb-0">Pong</Title>
        <Text className="!text-gray-400">Score: {score}</Text>
      </div>
      {/* 游戏画布 */}
      <canvas ref={canvasRef} width={W} height={H} className="rounded-lg border border-dark-600" />
      {/* 空闲状态：显示开始按钮 */}
      {gameState === 'idle' && <Button type="primary" className="mt-4" onClick={startGame}>Start Game</Button>}
      {/* 游戏结束：显示双方比分、胜负结果和重新开始按钮 */}
      {gameState === 'over' && (
        <div className="mt-4 text-center">
          <Text className="!text-gray-400 !block mb-2">
            You: {gameRef.current.playerScore} | AI: {gameRef.current.aiScore}
          </Text>
          <Text className={`!block mb-2 ${gameRef.current.playerScore >= WIN_SCORE ? '!text-green-400' : '!text-red-400'}`}>
            {gameRef.current.playerScore >= WIN_SCORE ? 'You Win!' : 'AI Wins!'}
          </Text>
          <Button type="primary" onClick={startGame}>Restart</Button>
        </div>
      )}
      {/* 游戏进行中：显示操作提示和虚拟方向键（移动端适用） */}
      {gameState === 'playing' && (
        <>
          <Text className="!text-gray-500 !text-xs mt-2">Move mouse / swipe / arrow keys to control paddle, first to 5 wins</Text>
          <VirtualGamepad
            directions={{
              up: movePaddleUp,
              down: movePaddleDown,
            }}
          />
        </>
      )}
    </div>
  );
};

export default PongGame;
