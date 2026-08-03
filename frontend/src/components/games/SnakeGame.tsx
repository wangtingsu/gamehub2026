/**
 * 贪吃蛇 (Snake) 游戏组件
 *
 * 玩法概述：
 * - 经典贪吃蛇游戏，在 20x20 网格上控制蛇移动
 * - 吃食物增长身体并增加 10 分
 * - 撞墙或撞到自己身体则游戏结束
 * - 蛇头带有眼睛装饰，身体颜色渐变
 * - 支持键盘方向键、触摸滑动和虚拟方向键控制
 * - 使用 requestAnimationFrame 驱动游戏循环，间隔 300ms 更新
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

/** 网格尺寸（行数和列数） */
const GRID_SIZE = 20;
/** 每个格子的像素大小 */
const CELL_SIZE = 20;
/** 游戏更新间隔（毫秒） */
const TICK_INTERVAL = 300;

/** 方向类型 */
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

/** 坐标位置接口 */
interface Position {
  x: number;
  y: number;
}

/**
 * 贪吃蛇游戏主组件
 *
 * @param props.onScoreChange - 分数变化回调
 * @param props.onGameOver - 游戏结束回调
 * @param props.onGameStart - 游戏开始回调
 * @returns 贪吃蛇游戏界面
 */
const SnakeGame: React.FC<GameProps> = ({ onScoreChange, onGameOver, onGameStart }) => {
  /** Canvas 元素的引用 */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** 当前分数 */
  const [score, setScore] = useState(0);
  /** 游戏状态：idle-未开始，playing-进行中，over-已结束 */
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle');
  /**
   * 游戏核心数据（使用 ref 存储以避免闭包陈旧值问题）
   * 包含蛇身坐标数组、食物坐标、当前方向和待生效方向、分数
   */
  const gameRef = useRef({
    snake: [{ x: 10, y: 10 }],       // 蛇身坐标数组，索引 0 为蛇头
    food: { x: 15, y: 10 },           // 食物坐标
    direction: 'RIGHT' as Direction,   // 当前移动方向
    nextDirection: 'RIGHT' as Direction, // 下次移动将要应用的方向
    score: 0,                          // 当前分数
  });
  /** requestAnimationFrame ID，用于取消动画循环 */
  const animRef = useRef<number>(0);
  /** 上一次游戏更新的时间戳 */
  const lastTickRef = useRef(0);

  /**
   * 生成新的食物位置
   * 确保食物不会出现在蛇身所在的格子上
   *
   * @param snake - 当前蛇身坐标数组
   * @returns 新的食物坐标
   */
  const spawnFood = useCallback((snake: Position[]): Position => {
    // 将蛇身坐标存入 Set 以便快速查重
    const occupied = new Set(snake.map(s => `${s.x},${s.y}`));
    let pos: Position;
    // 随机生成位置，直到不在蛇身上
    do {
      pos = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (occupied.has(`${pos.x},${pos.y}`));
    return pos;
  }, []);

  /**
   * 绘制游戏画面
   * 包括背景网格、食物（红色发光圆点）和蛇身（头部绿色，身体渐变）
   * 蛇头根据方向绘制眼睛，增强视觉效果
   */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { snake, food } = gameRef.current;

    // 清空画布并填充深色背景
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制网格线（深色细线）
    ctx.strokeStyle = '#16213e';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(canvas.width, i * CELL_SIZE);
      ctx.stroke();
    }

    // 绘制食物：红色圆形，带发光效果
    ctx.fillStyle = '#e94560';
    ctx.shadowColor = '#e94560';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(food.x * CELL_SIZE + CELL_SIZE / 2, food.y * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 绘制蛇身：头部为绿色，身体部分透明度从头部到尾部递减（渐变效果）
    snake.forEach((seg, i) => {
      const ratio = 1 - i / snake.length; // 根据身体位置计算不透明度
      ctx.fillStyle = i === 0 ? '#4ecca3' : `rgba(78, 204, 163, ${0.3 + ratio * 0.5})`;
      ctx.shadowColor = i === 0 ? '#4ecca3' : 'transparent';
      ctx.shadowBlur = i === 0 ? 6 : 0; // 只有蛇头有发光效果
      ctx.fillRect(seg.x * CELL_SIZE + 1, seg.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    });
    ctx.shadowBlur = 0;

    // 绘制蛇头的眼睛（白色小圆点），根据移动方向调整眼睛位置
    if (snake.length > 0) {
      ctx.fillStyle = '#fff';
      const head = snake[0];
      const dir = gameRef.current.direction;
      // 根据方向计算两只眼睛的位置
      let ex1 = head.x * CELL_SIZE + 5, ey1 = head.y * CELL_SIZE + 5;   // 左上（默认朝上）
      let ex2 = head.x * CELL_SIZE + 13, ey2 = head.y * CELL_SIZE + 5;  // 右上
      if (dir === 'DOWN') { ex1 = head.x * CELL_SIZE + 5; ey1 = head.y * CELL_SIZE + 13; ex2 = head.x * CELL_SIZE + 13; ey2 = head.y * CELL_SIZE + 13; }
      if (dir === 'LEFT') { ex1 = head.x * CELL_SIZE + 5; ey1 = head.y * CELL_SIZE + 5; ex2 = head.x * CELL_SIZE + 5; ey2 = head.y * CELL_SIZE + 13; }
      if (dir === 'RIGHT') { ex1 = head.x * CELL_SIZE + 13; ey1 = head.y * CELL_SIZE + 5; ex2 = head.x * CELL_SIZE + 13; ey2 = head.y * CELL_SIZE + 13; }
      ctx.beginPath();
      ctx.arc(ex1, ey1, 2, 0, Math.PI * 2);
      ctx.arc(ex2, ey2, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  /**
   * 游戏主循环（使用 requestAnimationFrame）
   * 按固定间隔（300ms）更新游戏逻辑，其余帧仅重绘画面
   * 更新逻辑：应用方向 -> 计算新蛇头 -> 碰撞检测 -> 移动蛇身 -> 吃食物判断
   *
   * @param timestamp - requestAnimationFrame 提供的高精度时间戳
   */
  const gameLoop = useCallback((timestamp: number) => {
    // score = -1 是游戏结束的标记，停止循环
    if (gameRef.current.score === -1) return;
    animRef.current = requestAnimationFrame(gameLoop);

    // 时间间隔控制：如果距离上次更新未达 TICK_INTERVAL，只绘制不更新逻辑
    if (timestamp - lastTickRef.current < TICK_INTERVAL) {
      draw();
      return;
    }
    lastTickRef.current = timestamp;

    const g = gameRef.current;
    // 将待生效方向应用为当前方向
    g.direction = g.nextDirection;

    // 根据方向计算新蛇头的位置
    const head = { ...g.snake[0] };
    switch (g.direction) {
      case 'UP': head.y -= 1; break;
      case 'DOWN': head.y += 1; break;
      case 'LEFT': head.x -= 1; break;
      case 'RIGHT': head.x += 1; break;
    }

    // 墙壁碰撞检测：蛇头超出网格边界则游戏结束
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      g.score = -1; // 标记游戏结束
      setGameState('over');
      onGameOver?.(g.score);
      return;
    }

    // 自身碰撞检测：蛇头碰到身体任意一节则游戏结束
    if (g.snake.some(s => s.x === head.x && s.y === head.y)) {
      g.score = -1;
      setGameState('over');
      onGameOver?.(g.score);
      return;
    }

    // 将新蛇头插入到蛇身数组头部
    g.snake.unshift(head);

    // 吃食物检测：蛇头与食物坐标重合
    if (head.x === g.food.x && head.y === g.food.y) {
      g.score += 10;   // 每吃一个食物加 10 分
      setScore(g.score);
      onScoreChange?.(g.score);
      g.food = spawnFood(g.snake); // 生成新食物
    } else {
      g.snake.pop(); // 没吃到食物则移除尾部，保持蛇身长度不变
    }

    draw(); // 重新绘制画面
  }, [draw, onScoreChange, onGameOver, spawnFood]);

  /**
   * 开始/重新开始游戏
   * 初始化蛇身（3节）、食物位置、方向和分数，启动游戏循环
   */
  const startGame = useCallback(() => {
    gameRef.current = {
      snake: [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }], // 初始蛇身（3节，向右）
      food: { x: 15, y: 10 },  // 初始食物位置
      direction: 'RIGHT',
      nextDirection: 'RIGHT',
      score: 0,
    };
    setScore(0);
    setGameState('playing');
    onGameStart?.();
    lastTickRef.current = 0; // 重置时间戳
    animRef.current = requestAnimationFrame(gameLoop); // 启动游戏循环
  }, [gameLoop, onGameStart]);

  /**
   * 键盘方向键事件监听
   * 使用 nextDirection 机制防止在单次 tick 内多次改变方向
   * 禁止直接反向（例如向右时不能立即向左，防止撞到自己）
   */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameRef.current.score === -1) return;
      const g = gameRef.current;
      const opposite: Record<string, string> = { 'UP': 'DOWN', 'DOWN': 'UP', 'LEFT': 'RIGHT', 'RIGHT': 'LEFT' };
      const keyMap: Record<string, Direction> = { 'ArrowUp': 'UP', 'ArrowDown': 'DOWN', 'ArrowLeft': 'LEFT', 'ArrowRight': 'RIGHT' };
      const dir = keyMap[e.key];
      if (dir && opposite[dir] !== g.direction) {
        e.preventDefault();
        g.nextDirection = dir;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  /** 触摸滑动的起始位置记录 */
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  /**
   * 改变蛇的移动方向
   * 同样使用禁止反向逻辑
   *
   * @param dir - 目标方向
   */
  const changeDirection = useCallback((dir: Direction) => {
    const g = gameRef.current;
    if (g.score === -1) return;
    const opposite: Record<string, string> = { 'UP': 'DOWN', 'DOWN': 'UP', 'LEFT': 'RIGHT', 'RIGHT': 'LEFT' };
    if (opposite[dir] !== g.direction) {
      g.nextDirection = dir;
    }
  }, []);

  /**
   * 触摸滑动事件监听（移动端支持）
   * 通过记录 touchstart 和 touchend 的坐标差来判断滑动方向
   * 滑动距离需超过 20 像素才触发，优先判断水平还是垂直滑动
   */
  useEffect(() => {
    /** 记录触摸起始位置 */
    const handleTouchStart = (e: TouchEvent) => {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    /** 计算触摸结束时的滑动偏移并确定方向 */
    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
      const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
      touchStartRef.current = null;
      // 最小滑动距离阈值（防止误触）
      const minSwipe = 20;
      if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;
      // 判断滑动方向：水平位移大则左右，垂直位移大则上下
      if (Math.abs(dx) > Math.abs(dy)) {
        changeDirection(dx > 0 ? 'RIGHT' : 'LEFT');
      } else {
        changeDirection(dy > 0 ? 'DOWN' : 'UP');
      }
    };
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [changeDirection]);

  // 空闲状态时绘制静态画面（显示蛇和食物）
  useEffect(() => {
    if (gameState === 'idle') {
      draw();
    }
  }, [gameState, draw]);

  // 初始化画布尺寸并绘制
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = GRID_SIZE * CELL_SIZE;
      canvasRef.current.height = GRID_SIZE * CELL_SIZE;
    }
    draw();
  }, [draw]);

  return (
    <div className="flex flex-col items-center">
      {/* 顶部信息栏：游戏标题和当前得分 */}
      <div className="flex items-center justify-between w-full max-w-[400px] mb-3">
        <Title level={4} className="!text-white !mb-0">贪吃蛇</Title>
        <Text className="!text-gray-400">得分: {score}</Text>
      </div>
      {/* 游戏画布 */}
      <canvas
        ref={canvasRef}
        className="rounded-lg border border-dark-600 w-full max-w-[400px]"
        width={GRID_SIZE * CELL_SIZE}
        height={GRID_SIZE * CELL_SIZE}
      />
      {/* 空闲状态：显示开始按钮 */}
      {gameState === 'idle' && (
        <Button type="primary" className="mt-4" onClick={startGame}>开始游戏</Button>
      )}
      {/* 游戏结束：显示最终得分和重新开始按钮 */}
      {gameState === 'over' && (
        <div className="mt-4 text-center">
          <Text className="!text-red-400 !block mb-2">游戏结束! 得分: {score}</Text>
          <Button type="primary" onClick={startGame}>重新开始</Button>
        </div>
      )}
      {/* 游戏进行中：显示操作提示和虚拟方向键（移动端适用） */}
      {gameState === 'playing' && (
        <>
          <Text className="!text-gray-500 !text-xs mt-2">方向键 / 滑动 / 虚拟方向键控制移动</Text>
          <VirtualGamepad
            directions={{
              up: () => changeDirection('UP'),
              down: () => changeDirection('DOWN'),
              left: () => changeDirection('LEFT'),
              right: () => changeDirection('RIGHT'),
            }}
          />
        </>
      )}
    </div>
  );
};

export default SnakeGame;
