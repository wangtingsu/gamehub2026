/**
 * TetrisGame.tsx - 俄罗斯方块游戏组件
 *
 * 游戏玩法概述：
 * 经典俄罗斯方块玩法。七种不同形状（I、O、T、L、J、S、Z）的方块从上方落下，
 * 玩家通过移动和旋转方块使其在底部填满水平行。
 * 填满一行即可消除并获得分数，消除行数越多单次得分越高（1行100，2行300，3行500，4行800）。
 * 游戏结束条件：方块堆叠到顶部且新方块无法放置。
 * 支持键盘（方向键移动/旋转、空格直接落下）、触摸滑动和虚拟手柄操控。
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import VirtualGamepad from './VirtualGamepad';
import { Button, Typography } from 'antd';

const { Title, Text } = Typography;

/** 游戏组件对外属性接口 */
interface GameProps {
  onScoreChange?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onGameStart?: () => void;
}

// ==================== 游戏常量配置 ====================
const COLS = 10;        // 游戏区域列数
const ROWS = 20;        // 游戏区域行数
const BLOCK = 28;       // 每个方块的大小（像素）

/**
 * 七种标准俄罗斯方块的形状定义（二维矩阵）
 * 索引顺序：I, O, T, L, J, S, Z
 */
const SHAPES: number[][][] = [
  [[1,1,1,1]],                                          // I 型（长条）
  [[1,1],[1,1]],                                        // O 型（方形）
  [[0,1,0],[1,1,1]],                                    // T 型
  [[1,0,0],[1,1,1]],                                    // L 型
  [[0,0,1],[1,1,1]],                                    // J 型
  [[1,1,0],[0,1,1]],                                    // S 型（Z 字）
  [[0,1,1],[1,1,0]],                                    // Z 型（反 Z 字）
];

/** 每种方块对应的颜色（按形状索引） */
const COLORS = ['#00f0f0', '#f0f000', '#a000f0', '#f0a000', '#0000f0', '#00f000', '#f00000'];

/**
 * TetrisGame 俄罗斯方块游戏主组件
 * 使用 Canvas 渲染，实现完整的俄罗斯方块核心逻辑
 */
const TetrisGame: React.FC<GameProps> = ({ onScoreChange, onGameOver, onGameStart }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /** 当前得分 */
  const [score, setScore] = useState(0);
  /** 游戏状态 */
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle');

  /** 游戏核心数据引用（所有可变状态集中管理） */
  const gameRef = useRef({
    board: Array.from({ length: ROWS }, () => Array(COLS).fill(0)), // 游戏面板，0为空，>0为已填充（值为颜色索引+1）
    piece: { shapeIdx: 0, x: 3, y: 0, shape: SHAPES[0] },         // 当前活动方块
    score: 0,                                                       // 实时分数
    running: false,                                                 // 游戏是否运行中
  });

  /** 动画帧 ID */
  const animRef = useRef(0);
  /** 上次下落时间戳 */
  const lastTickRef = useRef(0);
  /** 方块自动下落间隔（毫秒） */
  const tickInterval = 800;

  /**
   * 绘制一帧游戏画面
   * 绘制顺序：背景 → 网格线 → 已固定的方块 → 当前活动方块
   */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const g = gameRef.current;

    // 深色背景
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制网格辅助线
    ctx.strokeStyle = '#16213e';
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * BLOCK, 0);
      ctx.lineTo(c * BLOCK, ROWS * BLOCK);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * BLOCK);
      ctx.lineTo(COLS * BLOCK, r * BLOCK);
      ctx.stroke();
    }

    // 绘制已固定的方块（面板数据）
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (g.board[r][c]) {
          ctx.fillStyle = COLORS[g.board[r][c] - 1];
          ctx.shadowColor = COLORS[g.board[r][c] - 1];
          ctx.shadowBlur = 4;
          ctx.fillRect(c * BLOCK + 1, r * BLOCK + 1, BLOCK - 2, BLOCK - 2);
          ctx.shadowBlur = 0;
        }
      }
    }

    // 绘制当前活动的方块（带发光效果）
    const { shape, x, y } = g.piece;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[0].length; c++) {
        if (shape[r][c]) {
          ctx.fillStyle = COLORS[g.piece.shapeIdx];
          ctx.shadowColor = COLORS[g.piece.shapeIdx];
          ctx.shadowBlur = 6;
          ctx.fillRect((x + c) * BLOCK + 1, (y + r) * BLOCK + 1, BLOCK - 2, BLOCK - 2);
          ctx.shadowBlur = 0;
        }
      }
    }
  }, []);

  /**
   * 碰撞检测：检测指定形状在指定位置是否会与面板/边界发生碰撞
   * @param board 游戏面板数据
   * @param shape 方块的形状矩阵
   * @param px 尝试放置的 X 坐标
   * @param py 尝试放置的 Y 坐标
   * @returns true 表示发生碰撞（不可放置）
   */
  const collide = useCallback((board: number[][], shape: number[][], px: number, py: number) => {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[0].length; c++) {
        if (shape[r][c]) {
          const nx = px + c, ny = py + r;
          // 超出左右/底部边界，或与已固定的方块重叠
          if (nx < 0 || nx >= COLS || ny >= ROWS || (ny >= 0 && board[ny][nx])) return true;
        }
      }
    }
    return false;
  }, []);

  /**
   * 将当前方块固定到面板中，然后生成下一个方块
   * 处理：合并方块 → 消除满行 → 计分 → 生成新方块 → 检测游戏结束
   */
  const mergeAndSpawn = useCallback((g: typeof gameRef.current) => {
    const { shape, x, y, shapeIdx } = g.piece;
    // 将方块数据写入面板
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[0].length; c++) {
        if (shape[r][c]) {
          const ny = y + r;
          if (ny < 0) { g.running = false; return; } // 方块超出顶部，游戏结束
          g.board[ny][x + c] = shapeIdx + 1; // 存储颜色索引（+1 因为面板0表示空）
        }
      }
    }

    // 消除满行（从底部向上检测）
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (g.board[r].every(v => v !== 0)) {
        g.board.splice(r, 1);       // 移除该行
        g.board.unshift(Array(COLS).fill(0)); // 在顶部插入空行
        cleared++;
        r++; // 重新检查当前行（因为下一行移上来了）
      }
    }
    // 计分：消除行数越多，单行分值越高
    if (cleared) {
      const points = [0, 100, 300, 500, 800][cleared] || 0;
      g.score += points;
      setScore(g.score);
      onScoreChange?.(g.score);
    }

    // 生成下一个方块
    const idx = Math.floor(Math.random() * SHAPES.length);
    g.piece = { shapeIdx: idx, x: 3, y: 0, shape: SHAPES[idx] };
    // 如果新方块立即碰撞，游戏结束
    if (collide(g.board, SHAPES[idx], 3, 0)) {
      g.running = false;
      setGameState('over');
      onGameOver?.(g.score);
    }
  }, [collide, onScoreChange, onGameOver]);

  /**
   * 游戏主循环（由 requestAnimationFrame 驱动）
   * 按固定间隔（tickInterval）执行方块下落
   */
  const gameLoop = useCallback((timestamp: number) => {
    const g = gameRef.current;
    if (!g.running) return;
    animRef.current = requestAnimationFrame(gameLoop);
    // 时间控制：未到下落间隔则只渲染
    if (timestamp - lastTickRef.current < tickInterval) { draw(); return; }
    lastTickRef.current = timestamp;

    // 尝试向下移动，如果碰撞则固定到面板
    const { shape, x, y } = g.piece;
    if (!collide(g.board, shape, x, y + 1)) {
      g.piece.y++;
    } else {
      mergeAndSpawn(g);
    }
    draw();
  }, [draw, collide, mergeAndSpawn]);

  /**
   * 开始新游戏：重置面板和分数，启动游戏循环
   */
  const startGame = useCallback(() => {
    gameRef.current = {
      board: Array.from({ length: ROWS }, () => Array(COLS).fill(0)),
      piece: { shapeIdx: 0, x: 3, y: 0, shape: SHAPES[0] },
      score: 0,
      running: true,
    };
    setScore(0);
    setGameState('playing');
    onGameStart?.();
    lastTickRef.current = 0;
    animRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  /**
   * 键盘控制：方向键移动/旋转，空格键直接落下
   * 旋转算法：矩阵顺时针旋转 90 度
   */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (!g.running) return;
      e.preventDefault();
      const { shape, x, y, shapeIdx } = g.piece;
      // 左移
      if (e.key === 'ArrowLeft' && !collide(g.board, shape, x - 1, y)) g.piece.x--;
      // 右移
      if (e.key === 'ArrowRight' && !collide(g.board, shape, x + 1, y)) g.piece.x++;
      // 加速下落
      if (e.key === 'ArrowDown' && !collide(g.board, shape, x, y + 1)) g.piece.y++;
      // 旋转（矩阵转置后每行反转 = 顺时针旋转90度）
      if (e.key === 'ArrowUp') {
        const rotated = shape[0].map((_, i) => shape.map(row => row[i]).reverse());
        if (!collide(g.board, rotated, x, y)) {
          g.piece.shape = rotated;
        }
      }
      // 直接落下（硬降）
      if (e.key === ' ') {
        while (!collide(g.board, g.piece.shape, g.piece.x, g.piece.y + 1)) g.piece.y++;
        mergeAndSpawn(g);
      }
      draw();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
    };
  }, [collide, mergeAndSpawn, draw]);

  // ==================== 触摸/滑动支持 ====================
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  /** 左移操作 */
  const actLeft = useCallback(() => {
    const g = gameRef.current;
    if (!g.running) return;
    if (!collide(g.board, g.piece.shape, g.piece.x - 1, g.piece.y)) g.piece.x--;
    draw();
  }, [collide, draw]);

  /** 右移操作 */
  const actRight = useCallback(() => {
    const g = gameRef.current;
    if (!g.running) return;
    if (!collide(g.board, g.piece.shape, g.piece.x + 1, g.piece.y)) g.piece.x++;
    draw();
  }, [collide, draw]);

  /** 旋转操作 */
  const actRotate = useCallback(() => {
    const g = gameRef.current;
    if (!g.running) return;
    const { shape, x, y } = g.piece;
    const rotated = shape[0].map((_, i) => shape.map(row => row[i]).reverse());
    if (!collide(g.board, rotated, x, y)) g.piece.shape = rotated;
    draw();
  }, [collide, draw]);

  /** 下移操作 */
  const actDown = useCallback(() => {
    const g = gameRef.current;
    if (!g.running) return;
    if (!collide(g.board, g.piece.shape, g.piece.x, g.piece.y + 1)) g.piece.y++;
    draw();
  }, [collide, draw]);

  /** 直接落下操作（硬降） */
  const actDrop = useCallback(() => {
    const g = gameRef.current;
    if (!g.running) return;
    while (!collide(g.board, g.piece.shape, g.piece.x, g.piece.y + 1)) g.piece.y++;
    mergeAndSpawn(g);
    draw();
  }, [collide, mergeAndSpawn, draw]);

  /**
   * 触摸滑动事件
   * 水平滑动 → 左右移动；垂直滑动 → 上滑旋转/下滑硬降
   */
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
      const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
      touchStartRef.current = null;
      const minSwipe = 20;
      if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;
      // 水平滑动：左右移动
      if (Math.abs(dx) > Math.abs(dy)) {
        dx > 0 ? actRight() : actLeft();
      } else {
        // 垂直滑动：上滑旋转，下滑硬降
        dy > 0 ? actDrop() : actRotate();
      }
    };
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [actLeft, actRight, actRotate, actDrop]);

  /** 空闲状态时绘制初始画面 */
  useEffect(() => {
    if (gameState === 'idle') draw();
  }, [gameState, draw]);

  /** 初始化画布尺寸 */
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = COLS * BLOCK;
      canvasRef.current.height = ROWS * BLOCK;
    }
    draw();
  }, [draw]);

  return (
    <div className="flex flex-col items-center">
      {/* 游戏标题栏 */}
      <div className="flex items-center justify-between w-full max-w-[280px] mb-3">
        <Title level={4} className="!text-white !mb-0">俄罗斯方块</Title>
        <Text className="!text-gray-400">得分: {score}</Text>
      </div>
      {/* 游戏画布 */}
      <canvas ref={canvasRef} className="rounded-lg border border-dark-600" />
      {/* 空闲/结束状态按钮 */}
      {gameState === 'idle' && (
        <Button type="primary" className="mt-4" onClick={startGame}>开始游戏</Button>
      )}
      {gameState === 'over' && (
        <div className="mt-4 text-center">
          <Text className="!text-red-400 !block mb-2">游戏结束! 得分: {score}</Text>
          <Button type="primary" onClick={startGame}>重新开始</Button>
        </div>
      )}
      {/* 游戏中：操作提示和虚拟手柄 */}
      {gameState === 'playing' && (
        <div className="mt-2 text-center w-full">
          <Text className="!text-gray-500 !text-xs block">← → 移动 | ↑ 旋转 | ↓ 加速 | 空格 直接落下</Text>
          <VirtualGamepad
            directions={{
              up: actRotate,
              down: actDown,
              left: actLeft,
              right: actRight,
            }}
            actions={[
              { label: '⏬ 落下', action: actDrop },
            ]}
          />
        </div>
      )}
    </div>
  );
};

export default TetrisGame;
