/**
 * 2048 数字合成游戏
 *
 * 玩法概述：
 * - 在 4x4 网格中滑动合并相同数字的方块
 * - 每次滑动后随机生成一个新方块（2 或 4）
 * - 合并两个相同数字得到它们的和，并获得相应分数
 * - 目标：合成 2048 方块
 * - 当网格被填满且无法继续合并时，游戏结束
 * - 支持方向键、触摸滑动和虚拟方向键操作
 */

import { useState, useCallback, useEffect, useRef } from 'react';
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

/** 网格大小（4x4） */
const SIZE = 4;

/** 各数字方块对应的 Tailwind 颜色样式类 */
const TILE_COLORS: Record<number, string> = {
  2: 'bg-amber-100 text-amber-900', 4: 'bg-amber-200 text-amber-900',
  8: 'bg-orange-400 text-white', 16: 'bg-orange-500 text-white',
  32: 'bg-red-500 text-white', 64: 'bg-red-600 text-white',
  128: 'bg-yellow-300 text-yellow-900', 256: 'bg-yellow-400 text-yellow-900',
  512: 'bg-yellow-500 text-white', 1024: 'bg-yellow-600 text-white',
  2048: 'bg-yellow-700 text-white',
};

/** 方块数据结构 */
interface Tile {
  value: number;      // 方块数值
  row: number;        // 所在行
  col: number;        // 所在列
  mergedFrom?: boolean; // 是否刚由合并产生（用于动画）
}

/** 创建新方块 */
const newTile = (row: number, col: number, value = 2): Tile => ({ value, row, col });

/**
 * 在随机空格位置生成一个新方块
 * 90% 概率生成 2，10% 概率生成 4
 * @param grid 当前网格
 * @returns 更新后的网格（新数组）
 */
const addRandomTile = (grid: (Tile | null)[][]): (Tile | null)[][] => {
  const empty: { r: number; c: number }[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!grid[r][c]) empty.push({ r, c });
    }
  }
  if (empty.length === 0) return grid;
  // 随机选择一个空格
  const { r, c } = empty[Math.floor(Math.random() * empty.length)];
  // 深拷贝网格并重置 mergedFrom 标记
  const newGrid = grid.map(row => row.map(tile => tile ? { ...tile, mergedFrom: false } : null));
  newGrid[r][c] = newTile(r, c, Math.random() < 0.9 ? 2 : 4) as any;
  return newGrid;
};

/** 深拷贝网格，重置 mergedFrom 标记 */
const cloneGrid = (grid: (Tile | null)[][]) =>
  grid.map(row => row.map(tile => tile ? { ...tile, mergedFrom: false } : null));

/**
 * 滑动并合并一行
 * 核心算法：先去掉 null，然后从左到右合并相邻相同数字，再补回 null
 * @param line 一行数字数组（含 null）
 * @returns 合并结果、新增分数、是否发生移动
 */
const slideLine = (line: (number | null)[]): { result: (number | null)[]; score: number; moved: boolean } => {
  // 去掉空值，只保留数字
  const filtered = line.filter(v => v !== null) as number[];
  const result: (number | null)[] = [];
  let score = 0;
  let i = 0;
  // 遍历：相邻相同则合并，否则保留原值
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      result.push(filtered[i] * 2); // 合并为两倍
      score += filtered[i] * 2;     // 累加分数
      i += 2;                       // 跳过被合并的第二个数
    } else {
      result.push(filtered[i]);
      i++;
    }
  }
  // 右侧补 null 填满到 SIZE
  while (result.length < SIZE) result.push(null);
  // 检查是否发生了实际移动
  const moved = line.some((v, i) => v !== result[i]);
  return { result, score, moved };
};

/**
 * 矩阵转置（行变列，列变行）
 * 用于将上下滑动转换为左右滑动处理
 */
const transpose = <T,>(grid: T[][]): T[][] =>
  grid[0].map((_, i) => grid.map(row => row[i]));

/** 反转每一行（用于将右移转换为左移） */
const reverseRows = <T,>(grid: T[][]): T[][] =>
  grid.map(row => [...row].reverse());

/**
 * 左移：对每一行执行 slideLine
 */
const moveLeft = (grid: (Tile | null)[][]) => {
  let totalScore = 0;
  let moved = false;
  const newGrid = grid.map(row => {
    const vals = row.map(t => t?.value ?? null);
    const { result, score } = slideLine(vals);
    totalScore += score;
    if (result.some((v, i) => v !== vals[i])) moved = true;
    return result.map((v, i) => (v !== null ? { ...newTile(row[i]?.row ?? 0, row[i]?.col ?? 0, v), mergedFrom: false } : null));
  });
  return { grid: newGrid, score: totalScore, moved };
};

/**
 * 右移：反转行 -> 左移 -> 再反转回来
 */
const moveRight = (grid: (Tile | null)[][]) => {
  const reversed = reverseRows(grid);
  const { grid: movedGrid, score, moved } = moveLeft(reversed);
  return { grid: reverseRows(movedGrid), score, moved };
};

/**
 * 上移：转置 -> 左移 -> 再转置回来
 */
const moveUp = (grid: (Tile | null)[][]) => {
  const transposed = transpose(grid);
  const { grid: movedGrid, score, moved } = moveLeft(transposed);
  return { grid: transpose(movedGrid), score, moved };
};

/**
 * 下移：转置 -> 右移 -> 再转置回来
 */
const moveDown = (grid: (Tile | null)[][]) => {
  const transposed = transpose(grid);
  const { grid: movedGrid, score, moved } = moveRight(transposed);
  return { grid: transpose(movedGrid), score, moved };
};

/**
 * 检查网格是否还有可移动的空间
 * 条件：存在空格，或存在相邻的相同数字方块
 * @param grid 当前网格
 * @returns true=还可以移动，false=已死局
 */
const canMove = (grid: (Tile | null)[][]): boolean => {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!grid[r][c]) return true;              // 有空格
      if (c + 1 < SIZE && grid[r][c]!.value === grid[r][c + 1]!.value) return true; // 左右可合并
      if (r + 1 < SIZE && grid[r][c]!.value === grid[r + 1][c]!.value) return true; // 上下可合并
    }
  }
  return false;
};

/** 创建初始网格（生成两个随机方块） */
const createInitialGrid = () => {
  let g = Array.from({ length: SIZE }, () => Array<(Tile | null)>(SIZE).fill(null));
  g = addRandomTile(g);
  g = addRandomTile(g);
  return g;
};

/**
 * 2048 主组件
 * 使用 React state 管理网格数据，通过 ref 同步最新状态到事件回调
 */
const Game2048: React.FC<GameProps> = ({ onScoreChange, onGameOver, onGameStart }) => {
  /** 4x4 网格数据 */
  const [grid, setGrid] = useState<(Tile | null)[][]>(createInitialGrid);
  /** 当前分数 */
  const [score, setScore] = useState(0);
  /** 游戏状态：进行中 / 胜利 / 失败 */
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'won' | 'lost'>('playing');
  /** 历史最高分（从 localStorage 读取） */
  const [bestScore, setBestScore] = useState(() => parseInt(localStorage.getItem('game2048_best') || '0'));

  /** 以下 ref 用于在事件闭包中获取最新状态值，避免闭包陷阱 */
  const gridRef = useRef(grid);
  const gameStateRef = useRef(gameState);
  const scoreRef = useRef(score);
  const bestScoreRef = useRef(bestScore);

  /** 同步 ref 到最新状态 */
  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { bestScoreRef.current = bestScore; }, [bestScore]);

  /**
   * 执行一步滑动操作
   * @param dir 滑动方向
   */
  const move = useCallback((dir: 'left' | 'right' | 'up' | 'down') => {
    if (gameStateRef.current === 'lost' || gameStateRef.current === 'won') return;

    // 根据方向选择对应的移动函数
    const fn = { left: moveLeft, right: moveRight, up: moveUp, down: moveDown }[dir];
    const { grid: movedGrid, score: addScore, moved } = fn(cloneGrid(gridRef.current));
    if (!moved) return; // 没有实际移动则跳过

    // 移动后在随机空格生成新方块
    let newGrid = addRandomTile(movedGrid);
    const newScore = scoreRef.current + addScore;
    setScore(newScore);
    setGrid(newGrid);
    onScoreChange?.(newScore);

    // 胜利检测：存在 2048 或以上数值的方块
    if (newGrid.some(row => row.some(t => t && t.value >= 2048))) {
      setGameState('won');
      return;
    }
    // 失败检测：无可移动空间
    if (!canMove(newGrid)) {
      setGameState('lost');
      onGameOver?.(newScore);
    }
  }, [onScoreChange, onGameOver]);

  /**
   * useEffect：注册键盘方向键事件
   * 方向键映射到对应的滑动操作
   */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const map: Record<string, 'left' | 'right' | 'up' | 'down'> = {
        ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
      };
      if (map[e.key]) {
        e.preventDefault();
        move(map[e.key]);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [move]);

  /**
   * useEffect：支持触摸滑动操作
   * 记录触摸起始位置，根据滑动方向判断移动方向（最小滑动距离 30px）
   */
  useEffect(() => {
    let startX = 0, startY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      const absDx = Math.abs(dx), absDy = Math.abs(dy);
      if (Math.max(absDx, absDy) < 30) return; // 滑动距离太短，忽略
      // 判断是水平还是垂直滑动，然后确定方向
      if (absDx > absDy) move(dx > 0 ? 'right' : 'left');
      else move(dy > 0 ? 'down' : 'up');
    };
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [move]);

  /**
   * 重新开始游戏
   * 如果当前分数高于最高分，则更新最高分记录到 localStorage
   */
  const restart = useCallback(() => {
    if (scoreRef.current > bestScoreRef.current) {
      localStorage.setItem('game2048_best', String(scoreRef.current));
      setBestScore(scoreRef.current);
    }
    setGrid(createInitialGrid());
    setScore(0);
    setGameState('playing');
    onGameStart?.();
  }, []);

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-between w-full max-w-[350px] mb-3">
        <Title level={4} className="!text-white !mb-0">2048</Title>
        <div className="flex items-center gap-3">
          <div className="text-center">
            <Text className="!text-gray-500 !text-xs block">Score</Text>
            <Text className="!text-white !font-bold">{score}</Text>
          </div>
          <div className="text-center">
            <Text className="!text-gray-500 !text-xs block">Best</Text>
            <Text className="!text-amber-400 !font-bold">{bestScore}</Text>
          </div>
        </div>
      </div>
      <div
        className="grid gap-2 bg-dark-600 rounded-lg p-3"
        style={{ gridTemplateColumns: `repeat(${SIZE}, 72px)` }}
      >
        {grid.map((row, r) =>
          row.map((tile, c) => (
            <div
              key={`${r}-${c}`}
              className={`
                w-[72px] h-[72px] flex items-center justify-center text-2xl font-bold rounded-lg transition-all
                ${tile
                  ? TILE_COLORS[tile.value] || 'bg-gray-700 text-white'
                  : 'bg-dark-800'
                }
              `}
            >
              {tile?.value || ''}
            </div>
          ))
        )}
      </div>
      {gameState === 'won' && (
        <div className="mt-4 text-center">
          <Text className="!text-green-400 !block mb-2">You reached 2048!</Text>
          <Button onClick={restart}>Continue</Button>
        </div>
      )}
      {gameState === 'lost' && (
        <div className="mt-4 text-center">
          <Text className="!text-red-400 !block mb-2">Game over! Score: {score}</Text>
          <Button type="primary" onClick={restart}>Restart</Button>
        </div>
      )}
      {(gameState === 'playing') && (
        <div className="mt-4">
          <Button onClick={restart}>Restart</Button>
        </div>
      )}
      {gameState === 'playing' && (
        <VirtualGamepad
          directions={{
            up: () => move('up'),
            down: () => move('down'),
            left: () => move('left'),
            right: () => move('right'),
          }}
        />
      )}
      <Text className="!text-gray-500 !text-xs mt-2">Arrow keys / Swipe / Virtual D-pad</Text>
    </div>
  );
};

export default Game2048;
