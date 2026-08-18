/**
 * 数字华容道 (Sliding Puzzle) 游戏组件
 *
 * 玩法概述：
 * - 经典滑块拼图游戏，将打乱的数字按顺序排列即为胜利
 * - 支持 3x3（简单）、4x4（普通）、5x5（困难）三种难度
 * - 点击数字方块将其滑动到空白位置，或使用方向键操作
 * - 按步数评定星级（3星最优），并记录完成时间
 * - 使用 Canvas 绘制精美方块效果
 */

import { useEffect, useRef, useState, useCallback } from 'react';
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
const CW = 360;
/** 画布高度（像素） */
const CH = 400;
/** 棋盘内边距（像素） */
const BOARD_PADDING = 16;

/**
 * 检查拼图是否已完成
 * 判断标准：所有编号按顺序排列（1,2,3,...,n-1,0），最后一位为空白（0）
 *
 * @param tiles - 拼图数字数组
 * @returns 是否已完成
 */
function isSolved(tiles: number[]): boolean {
  // 检查前 n-1 个数字是否依次为 1,2,3,...
  for (let i = 0; i < tiles.length - 1; i++) {
    if (tiles[i] !== i + 1) return false;
  }
  // 检查最后一位是否为空白（0）
  return tiles[tiles.length - 1] === 0;
}

/**
 * 查找空白格（值为 0）在数组中的索引
 *
 * @param tiles - 拼图数字数组
 * @returns 空白格的索引
 */
function findEmpty(tiles: number[]): number {
  return tiles.indexOf(0);
}

/**
 * 获取指定索引在 NxN 棋盘中的相邻格子索引列表
 * 相邻定义为上、下、左、右四个方向
 *
 * @param index - 当前格子的索引
 * @param size - 棋盘大小（N）
 * @returns 相邻格子的索引数组
 */
function getAdjacentIndices(index: number, size: number): number[] {
  const row = Math.floor(index / size);
  const col = index % size;
  const result: number[] = [];
  if (row > 0) result.push(index - size);         // 上方格子
  if (row < size - 1) result.push(index + size);   // 下方格子
  if (col > 0) result.push(index - 1);             // 左侧格子
  if (col < size - 1) result.push(index + 1);      // 右侧格子
  return result;
}

/**
 * 从已解状态出发，通过随机移动来生成可解的打乱拼图
 * 这保证了生成的拼图一定是有解的（因为从已解状态反向操作）
 *
 * @param size - 棋盘大小（N）
 * @param moves - 随机移动次数
 * @returns 打乱后的拼图数字数组
 */
function shuffleFromSolved(size: number, moves: number): number[] {
  // 生成已解状态：[1,2,3,...,n-1,0]，最后一位是空白
  const tiles = Array.from({ length: size * size }, (_, i) => (i + 1) % (size * size));
  let emptyIdx = size * size - 1; // 空白起始在最右下角
  // 反复随机移动空白格以打乱拼图
  for (let i = 0; i < moves; i++) {
    const neighbors = getAdjacentIndices(emptyIdx, size);
    const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
    [tiles[emptyIdx], tiles[pick]] = [tiles[pick], tiles[emptyIdx]]; // 交换空白格和相邻数字
    emptyIdx = pick; // 更新空白格位置
  }
  return tiles;
}

/**
 * 根据完成步数和难度评定星级
 * 3x3：15步内 3星，25步内 2星，其余 1星
 * 4x4：50步内 3星，80步内 2星，其余 1星
 * 5x5：120步内 3星，200步内 2星，其余 1星
 *
 * @param moves - 完成步数
 * @param size - 棋盘大小（N）
 * @returns 星级评定结果，包含星星数量和展示文字
 */
function getStarRating(moves: number, size: number): { stars: number; text: string } {
  let stars: number;
  if (size === 3) {
    if (moves <= 15) stars = 3;
    else if (moves <= 25) stars = 2;
    else stars = 1;
  } else if (size === 4) {
    if (moves <= 50) stars = 3;
    else if (moves <= 80) stars = 2;
    else stars = 1;
  } else {
    if (moves <= 120) stars = 3;
    else if (moves <= 200) stars = 2;
    else stars = 1;
  }
  const starStr = '⭐'.repeat(stars);
  return { stars, text: starStr };
}

/** 可选的棋盘大小 */
type SizeOption = 3 | 4 | 5;

/**
 * 数字华容道游戏主组件
 *
 * @param props.onScoreChange - 分数变化回调
 * @param props.onGameOver - 游戏结束回调
 * @param props.onGameStart - 游戏开始回调
 * @returns 数字华容道游戏界面
 */
const SlidingPuzzle: React.FC<GameProps> = ({ onScoreChange, onGameOver, onGameStart }) => {
  /** Canvas 元素的引用 */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** 当前步数 */
  const [moves, setMoves] = useState(0);
  /** 游戏状态：idle-未开始，playing-进行中，over-已结束 */
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle');
  /** 已用时间（秒） */
  const [elapsedTime, setElapsedTime] = useState(0);
  /** 当前棋盘大小 */
  const [size, setSize] = useState<SizeOption>(4);
  /** 完成后的星级评论文本 */
  const [starText, setStarText] = useState('');
  /**
   * 游戏核心数据（使用 ref 存储以避免闭包陈旧值问题）
   * 包含拼图数据、步数、棋盘大小、计时和完成状态
   */
  const gameRef = useRef({
    tiles: Array.from({ length: 16 }, (_, i) => i), // 拼图数字数组
    moves: 0,                                        // 当前步数
    size: 4 as SizeOption,                           // 棋盘大小
    startTime: 0,                                    // 游戏开始时间戳
    elapsed: 0,                                      // 已用时间（毫秒）
    solved: false,                                   // 是否已解出
  });
  /** 游戏状态的 ref 版本，用于在事件回调中安全读取最新状态 */
  const stateRef = useRef<'idle' | 'playing' | 'over'>('idle');
  /** requestAnimationFrame ID，用于取消动画 */
  const animRef = useRef(0);
  /** 计时器 requestAnimationFrame ID */
  const timerRef = useRef(0);

  /**
   * 计算棋盘布局参数
   * 根据棋盘大小动态计算格子尺寸，使其适应画布宽度
   *
   * @param s - 棋盘大小
   * @returns 包含格子尺寸、画布尺寸和棋盘偏移的布局信息
   */
  const getLayout = useCallback((s: number) => {
    const TILE_SIZE = Math.min(80, Math.floor(320 / s)); // 每个格子的像素尺寸
    const CANVAS_SIZE = TILE_SIZE * s + (s + 1) * 2;     // 棋盘总尺寸（含间距）
    const boardLeft = (CW - CANVAS_SIZE) / 2;             // 棋盘左偏移（居中）
    const boardTop = 70;                                   // 棋盘上偏移
    return { TILE_SIZE, CANVAS_SIZE, boardLeft, boardTop };
  }, []);

  /**
   * 绘制游戏画面
   * 绘制背景、棋盘边框、数字方块（蓝色带阴影发光效果）
   * 空白格显示为深色背景
   */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { tiles, size: currentSize } = gameRef.current;
    const { TILE_SIZE, CANVAS_SIZE, boardLeft, boardTop } = getLayout(currentSize);

    // 绘制画布背景
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CW, CH);

    // 绘制棋盘深色背景框
    ctx.fillStyle = '#16213e';
    ctx.beginPath();
    ctx.roundRect(boardLeft - 4, boardTop - 4, CANVAS_SIZE + 8, CANVAS_SIZE + 8, 8);
    ctx.fill();

    // 遍历所有格子并绘制
    for (let i = 0; i < tiles.length; i++) {
      const value = tiles[i];
      const row = Math.floor(i / currentSize);
      const col = i % currentSize;
      const x = boardLeft + col * TILE_SIZE + 2;   // 格子的绘制 X 坐标
      const y = boardTop + row * TILE_SIZE + 2;     // 格子的绘制 Y 坐标
      const tileSize = TILE_SIZE - 4;               // 格子尺寸（留出间距）

      if (value === 0) {
        // 空白格：绘制为深色方块
        ctx.fillStyle = '#0f0f23';
        ctx.beginPath();
        ctx.roundRect(x, y, tileSize, tileSize, 4);
        ctx.fill();
        continue;
      }

      // 数字方块：蓝色背景带发光效果
      ctx.shadowColor = '#4a90d9';
      ctx.shadowBlur = 6;
      ctx.fillStyle = '#4a90d9';
      ctx.beginPath();
      ctx.roundRect(x, y, tileSize, tileSize, 6);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 方块顶部的高光效果（模拟反光）
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.roundRect(x, y, tileSize, 4, 4);
      ctx.fill();

      // 绘制数字文字
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(14, TILE_SIZE * 0.3)}px "Microsoft YaHei", Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(value), x + tileSize / 2, y + tileSize / 2);
    }
  }, [getLayout]);

  /**
   * 计时器更新函数（每帧调用）
   * 计算游戏开始以来的经过时间并更新显示
   */
  const updateTimer = useCallback(() => {
    const g = gameRef.current;
    if (stateRef.current !== 'playing' || g.solved) return;
    const elapsed = performance.now() - g.startTime;
    setElapsedTime(Math.floor(elapsed / 1000));
    timerRef.current = requestAnimationFrame(updateTimer);
  }, []);

  /**
   * 处理方块移动的核心逻辑
   * 检查移动是否合法（目标方块必须与空白格相邻），
   * 执行交换操作，更新步数，检测是否完成
   *
   * @param index - 点击的方块索引
   */
  const handleMove = useCallback((index: number) => {
    if (stateRef.current !== 'playing') return;
    const g = gameRef.current;
    const emptyIdx = findEmpty(g.tiles);
    // 检查点击的方块是否与空白格相邻
    if (!getAdjacentIndices(emptyIdx, g.size).includes(index)) return;

    // 交换点击方块与空白格
    g.tiles[emptyIdx] = g.tiles[index];
    g.tiles[index] = 0;
    g.moves++; // 步数加 1
    setMoves(g.moves);
    onScoreChange?.(g.moves);

    // 检测拼图是否已完成
    if (isSolved(g.tiles)) {
      g.solved = true;
      stateRef.current = 'over';
      setGameState('over');
      const { text } = getStarRating(g.moves, g.size);
      setStarText(text);
      // 计算最终用时
      const elapsed = performance.now() - g.startTime;
      setElapsedTime(Math.floor(elapsed / 1000));
      onGameOver?.(g.moves);
    }
    draw(); // 重新绘制画面
  }, [draw, onScoreChange, onGameOver]);

  /**
   * 鼠标点击事件处理
   * 将鼠标坐标映射到棋盘格子，然后触发移动操作
   *
   * @param e - 鼠标事件
   */
  const handleClick = useCallback((e: MouseEvent) => {
    if (stateRef.current !== 'playing') return;
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;  // 鼠标相对于画布的 X 坐标
    const my = e.clientY - rect.top;   // 鼠标相对于画布的 Y 坐标

    const g = gameRef.current;
    const { TILE_SIZE, CANVAS_SIZE, boardLeft, boardTop } = getLayout(g.size);
    // 检查是否点击在棋盘范围内
    if (mx < boardLeft || mx > boardLeft + CANVAS_SIZE || my < boardTop || my > boardTop + CANVAS_SIZE) return;

    // 计算点击的格子行列索引
    const col = Math.floor((mx - boardLeft) / TILE_SIZE);
    const row = Math.floor((my - boardTop) / TILE_SIZE);
    const index = row * g.size + col;

    handleMove(index);
  }, [getLayout, handleMove]);

  /**
   * 触摸事件处理（移动端支持）
   * 与鼠标点击类似，将触摸点坐标映射到棋盘格子
   *
   * @param e - 触摸事件
   */
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (stateRef.current !== 'playing') return;
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.changedTouches[0].clientX - rect.left;
    const my = e.changedTouches[0].clientY - rect.top;

    const g = gameRef.current;
    const { TILE_SIZE, CANVAS_SIZE, boardLeft, boardTop } = getLayout(g.size);
    if (mx < boardLeft || mx > boardLeft + CANVAS_SIZE || my < boardTop || my > boardTop + CANVAS_SIZE) return;

    const col = Math.floor((mx - boardLeft) / TILE_SIZE);
    const row = Math.floor((my - boardTop) / TILE_SIZE);
    const index = row * g.size + col;

    handleMove(index);
  }, [getLayout, handleMove]);

  /**
   * 键盘事件处理
   * 方向键操作：将空白格附近的方块推入空白格
   * 上键 = 将空白格下方的方块上移（等效于空白格下移）
   * 下键 = 将空白格上方的方块下移
   * 左键 = 将空白格右侧的方块左移
   * 右键 = 将空白格左侧的方块右移
   *
   * @param e - 键盘事件
   */
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (stateRef.current !== 'playing') return;
    const g = gameRef.current;
    const emptyIdx = findEmpty(g.tiles);
    let targetIdx = -1;
    // 根据方向键计算要移动的方块索引（空白格对面的方块）
    switch (e.key) {
      case 'ArrowUp': targetIdx = emptyIdx + g.size; break;    // 移动空白格下方的方块
      case 'ArrowDown': targetIdx = emptyIdx - g.size; break;   // 移动空白格上方的方块
      case 'ArrowLeft': targetIdx = emptyIdx + 1; break;        // 移动空白格右侧的方块
      case 'ArrowRight': targetIdx = emptyIdx - 1; break;       // 移动空白格左侧的方块
    }
    // 边界检查
    if (targetIdx < 0 || targetIdx >= g.size * g.size) return;
    // 曼哈顿距离检查：确保目标格子与空白格相邻（距离为 1）
    if (Math.abs(Math.floor(targetIdx / g.size) - Math.floor(emptyIdx / g.size)) +
        Math.abs((targetIdx % g.size) - (emptyIdx % g.size)) !== 1) return;

    e.preventDefault(); // 阻止页面滚动
    handleMove(targetIdx);
  }, [handleMove]);

  /**
   * 根据难度获取对应的打乱步数
   * 3x3 -> 10 步，4x4 -> 30 步，5x5 -> 80 步
   *
   * @param s - 棋盘大小
   * @returns 打乱步数
   */
  const getShuffleCount = useCallback((s: SizeOption): number => {
    if (s === 3) return 10;
    if (s === 4) return 30;
    return 80; // 5x5
  }, []);

  /**
   * 开始/重新开始游戏
   * 初始化拼图（从已解状态打乱）、重置步数和计时、启动计时器
   *
   * @param s - 选择的棋盘大小
   */
  const startGame = useCallback((s: SizeOption) => {
    const shuffleMoves = getShuffleCount(s);
    gameRef.current = {
      tiles: shuffleFromSolved(s, shuffleMoves), // 生成可解的打乱拼图
      moves: 0,
      size: s,
      startTime: performance.now(), // 记录开始时间戳
      elapsed: 0,
      solved: false,
    };
    setSize(s);
    stateRef.current = 'playing';
    setMoves(0);
    setElapsedTime(0);
    setStarText('');
    setGameState('playing');
    onGameStart?.();
    draw(); // 绘制初始画面
    timerRef.current = requestAnimationFrame(updateTimer); // 启动计时器
  }, [draw, onGameStart, getShuffleCount, updateTimer]);

  /**
   * 空闲状态绘制和组件卸载清理
   * 空闲时绘制静态棋盘展示，卸载时取消动画和计时器
   */
  useEffect(() => {
    if (gameState === 'idle') draw();
    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
      }
    };
  }, [gameState, draw]);

  // 游戏状态变化时重新绘制
  useEffect(() => {
    draw();
  }, [draw]);

  /**
   * 注册全局事件监听器
   * 支持鼠标点击、触摸操作和键盘方向键
   * 组件卸载时移除事件监听并清理计时器
   */
  useEffect(() => {
    window.addEventListener('click', handleClick);
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
      }
    };
  }, [handleClick, handleTouchEnd, handleKeyDown]);

  /**
   * 将秒数格式化为可读的时间文字
   *
   * @param seconds - 秒数
   * @returns 格式化的时间字符串，如 "1分30秒" 或 "45秒"
   */
  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  /** 当前难度的中文标签 */
  const sizeLabel = size === 3 ? '3×3 Easy' : size === 4 ? '4×4 Normal' : '5×5 Hard';

  return (
    <div className="flex flex-col items-center">
      {/* 顶部信息栏：游戏标题、计时和步数 */}
      <div className="flex items-center justify-between w-full max-w-[360px] mb-3">
        <Title level={4} className="!text-white !mb-0">Sliding Puzzle</Title>
        <div className="flex gap-3">
          {gameState === 'playing' && (
            <Text className="!text-gray-400">Time: {formatTime(elapsedTime)}</Text>
          )}
          <Text className="!text-gray-400">Moves: {moves}</Text>
        </div>
      </div>
      {/* 游戏进行中：显示当前难度标签 */}
      {gameState === 'playing' && (
        <div className="w-full max-w-[360px] text-center mb-1">
          <Text className="!text-gray-400">{sizeLabel}</Text>
        </div>
      )}
      {/* 游戏画布 */}
      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        className="rounded-lg border border-dark-600"
      />
      {/* 空闲状态：显示难度选择按钮 */}
      {gameState === 'idle' && (
        <div className="mt-4 flex gap-3">
          <Button type="default" onClick={() => startGame(3)}>3×3 Easy</Button>
          <Button type="primary" onClick={() => startGame(4)}>4×4 Normal</Button>
          <Button type="dashed" onClick={() => startGame(5)}>5×5 Hard</Button>
        </div>
      )}
      {/* 游戏结束：显示星级评定、完成信息和重新开始按钮 */}
      {gameState === 'over' && (
        <div className="mt-4 text-center">
          <Text className="!text-green-400 !block mb-1">You Win!</Text>
          <Text className="!text-yellow-400 !text-lg !block mb-1">{starText}</Text>
          <Text className="!text-gray-300 !block mb-2">
            {sizeLabel} · Time {formatTime(elapsedTime)} · {moves} moves
          </Text>
          <Button type="primary" onClick={() => startGame(4)}>Play Again</Button>
        </div>
      )}
      {/* 游戏进行中：操作提示 */}
      {gameState === 'playing' && (
        <Text className="!text-gray-500 !text-xs mt-2">Click a tile to move / Use arrow keys</Text>
      )}
    </div>
  );
};

export default SlidingPuzzle;
