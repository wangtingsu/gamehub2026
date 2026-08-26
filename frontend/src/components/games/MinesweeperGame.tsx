/**
 * 扫雷 (Minesweeper) 游戏组件
 *
 * 玩法概述：
 * - 经典扫雷游戏，9x9 网格，共 10 颗地雷
 * - 左键点击翻开格子，右键点击标记/取消标记地雷
 * - 首次点击必定安全（不会踩到地雷）
 * - 翻开所有非地雷格子即为获胜
 * - 格子上数字表示周围 8 格中的地雷数量
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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

/** 游戏网格的行数 */
const ROWS = 9;
/** 游戏网格的列数 */
const COLS = 9;
/** 地雷总数 */
const MINES = 10;

/** 单个单元格的数据结构 */
interface Cell {
  /** 是否为地雷 */
  mine: boolean;
  /** 是否已翻开 */
  revealed: boolean;
  /** 是否已被标记为地雷 */
  flagged: boolean;
  /** 周围 8 格中的地雷数量 */
  adjacent: number;
}

/**
 * 创建并初始化游戏棋盘
 * 1. 生成空白网格
 * 2. 随机放置指定数量的地雷
 * 3. 计算每个非地雷格子周围的雷数
 *
 * @returns {Cell[][]} 初始化后的棋盘二维数组
 */
const createBoard = (): Cell[][] => {
  // 创建空棋盘，所有单元格初始化为未翻开、未标记、非地雷状态
  const board: Cell[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 }))
  );

  // 随机放置地雷，直到放满指定数量
  let placed = 0;
  while (placed < MINES) {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    if (!board[r][c].mine) { board[r][c].mine = true; placed++; }
  }

  // 遍历所有非地雷格子，计算其周围 8 格中的地雷数量
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c].mine) continue; // 地雷格跳过
      let count = 0;
      // 检查周围 8 个方向
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue; // 跳过自身
          const nr = r + dr, nc = c + dc;
          // 边界检查，如果是地雷则计数 +1
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc].mine) count++;
        }
      }
      board[r][c].adjacent = count;
    }
  }
  return board;
};

/**
 * 数字颜色映射表
 * 索引 0 为占位（空字符串），索引 1-8 分别对应 1-8 的不同颜色
 */
const NUM_COLORS = ['', 'text-blue-400', 'text-green-400', 'text-red-400', 'text-purple-400', 'text-yellow-400', 'text-cyan-400', 'text-gray-400', 'text-gray-500'];

/**
 * 扫雷游戏主组件
 *
 * @param props.onScoreChange - 分数变化回调
 * @param props.onGameOver - 游戏结束回调
 * @param props.onGameStart - 游戏开始回调
 * @returns 扫雷游戏界面
 */
const MinesweeperGame: React.FC<GameProps> = ({ onScoreChange, onGameOver, onGameStart }) => {
  const { t } = useTranslation('games');
  /** 游戏棋盘状态，存储所有单元格的数据 */
  const [board, setBoard] = useState<Cell[][]>(createBoard);
  /** 游戏状态：idle-未开始，playing-进行中，won-获胜，lost-失败 */
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');
  /** 是否为首次点击（用于确保首次点击安全） */
  const firstClick = useRef(true);
  /** 当前标记的地雷数量（基于 flagged 状态计算） */
  const flagCount = useMemo(() => board.reduce((sum, row) => sum + row.filter(c => c.flagged).length, 0), [board]);

  /** 非地雷格子的总数（即需要翻开才能获胜的格子数） */
  const totalSafe = ROWS * COLS - MINES;

  /**
   * 递归翻开格子（深度优先搜索）
   * 如果翻开的格子周围雷数为 0，则自动翻开其周围所有格子
   * 这是扫雷游戏的核心算法——洪水填充（Flood Fill）
   *
   * @param b - 当前棋盘状态（会被直接修改）
   * @param r - 行索引
   * @param c - 列索引
   * @returns 更新后的棋盘
   */
  const reveal = useCallback((b: Cell[][], r: number, c: number): Cell[][] => {
    // 边界检查、重复翻开检查、已标记检查
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS || b[r][c].revealed || b[r][c].flagged) return b;
    b[r][c].revealed = true; // 标记为已翻开
    // 如果当前格子周围雷数为 0 且不是地雷，则递归翻开周围所有格子
    if (b[r][c].adjacent === 0 && !b[r][c].mine) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue; // 跳过自身
          reveal(b, r + dr, c + dc); // 递归处理相邻格子
        }
      }
    }
    return b;
  }, []);

  /**
   * 统计当前棋盘上已翻开的格子数量
   *
   * @param b - 棋盘状态
   * @returns 已翻开的格子数
   */
  const countRevealed = useCallback((b: Cell[][]) => {
    return b.reduce((sum, row) => sum + row.filter(c => c.revealed).length, 0);
  }, []);

  /**
   * 处理左键点击格子事件
   * - 首次点击确保安全（如果点击到地雷则重新生成棋盘）
   * - 点击到地雷则游戏失败，显示所有地雷位置
   * - 翻开所有非地雷格子则游戏获胜
   *
   * @param r - 点击格子的行索引
   * @param c - 点击格子的列索引
   */
  const handleClick = useCallback((r: number, c: number) => {
    // 游戏已结束则忽略点击
    if (gameState === 'won' || gameState === 'lost') return;

    // 首次点击的特殊处理：确保点击到的位置不是地雷
    if (firstClick.current) {
      firstClick.current = false;
      let b = board.map(row => row.map(cell => ({ ...cell }))); // 深拷贝棋盘
      // 如果首次点击位置恰巧是地雷，则重新创建棋盘直到该位置安全
      if (b[r][c].mine) {
        b = createBoard();
        while (b[r][c].mine) b = createBoard();
      }
      reveal(b, r, c); // 递归翻开格子
      setBoard(b);
      setGameState('playing'); // 游戏进入进行中状态
      onGameStart?.();
      onScoreChange?.(0);
      return;
    }

    const cell = board[r][c];
    // 已翻开或已标记的格子不可点击
    if (cell.revealed || cell.flagged) return;

    let b = board.map(row => row.map(c => ({ ...c }))); // 深拷贝棋盘
    // 踩中地雷：游戏结束
    if (cell.mine) {
      // 翻开设有地雷的所有格子，向玩家展示所有地雷位置
      for (let i = 0; i < ROWS; i++) {
        for (let j = 0; j < COLS; j++) {
          if (b[i][j].mine) b[i][j].revealed = true;
        }
      }
      setBoard(b);
      setGameState('lost'); // 游戏失败
      onGameOver?.(0);
      return;
    }

    // 翻开安全格子
    reveal(b, r, c);
    const rc = countRevealed(b);
    setBoard(b);

    // 如果已翻开的格子数达到安全格子总数，则玩家获胜
    if (rc >= totalSafe) {
      setGameState('won'); // 游戏获胜
      onScoreChange?.(100);
      onGameOver?.(100);
    }
  }, [board, gameState, reveal, countRevealed, onScoreChange, onGameOver, totalSafe]);

  /**
   * 处理右键点击格子事件（标记/取消标记地雷）
   * 在游戏进行中且格子未翻开时才能标记
   *
   * @param e - 鼠标事件对象（用于阻止默认右键菜单）
   * @param r - 点击格子的行索引
   * @param c - 点击格子的列索引
   */
  const handleRightClick = useCallback((e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault(); // 阻止浏览器默认右键菜单
    if (gameState !== 'playing' || board[r][c].revealed) return;
    const b = board.map(row => row.map(cell => ({ ...cell }))); // 深拷贝棋盘
    b[r][c].flagged = !b[r][c].flagged; // 切换标记状态
    setBoard(b);
  }, [board, gameState]);

  /**
   * 重新开始游戏
   * 重置首次点击标记、生成新棋盘、重置游戏状态
   */
  const restart = useCallback(() => {
    firstClick.current = true;
    setBoard(createBoard());
    setGameState('idle');
  }, []);

  /** 剩余未标记的地雷数量（用于显示） */
  const remaining = MINES - flagCount;

  return (
    <div className="flex flex-col items-center">
      {/* 顶部信息栏：游戏标题、剩余雷数、标记数 */}
      <div className="flex items-center justify-between w-full max-w-[350px] mb-3">
        <Title level={4} className="!text-white !mb-0">{t('onlineGames.games.minesweeper.name')}</Title>
        <div className="flex items-center gap-4">
          <Text className="!text-gray-400">💣 {remaining}</Text>
          <Text className="!text-gray-400">🚩 {flagCount}</Text>
        </div>
      </div>
      {/* 游戏棋盘网格 */}
      <div
        className="grid gap-px bg-dark-600 rounded-lg p-1"
        style={{ gridTemplateColumns: `repeat(${COLS}, 34px)` }}
      >
        {board.map((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              onClick={() => handleClick(r, c)}
              onContextMenu={e => handleRightClick(e, r, c)}
              className={`
                w-[34px] h-[34px] flex items-center justify-center text-sm font-bold rounded cursor-pointer select-none
                ${cell.revealed
                  ? cell.mine
                    ? 'bg-red-600 text-white'     // 踩中地雷时红色高亮
                    : 'bg-dark-800 text-gray-200'  // 已翻开的正常格子
                  : 'bg-dark-700 hover:bg-dark-600 text-gray-300'  // 未翻开的格子
                }
              `}
            >
              {/* 已翻开且是地雷 -> 显示炸弹图标 */}
              {cell.revealed && cell.mine && '💣'}
              {/* 已翻开且非地雷且周围有雷 -> 显示数字 */}
              {cell.revealed && !cell.mine && cell.adjacent > 0 && (
                <span className={NUM_COLORS[cell.adjacent]}>{cell.adjacent}</span>
              )}
              {/* 未翻开但已被标记 -> 显示旗帜图标 */}
              {!cell.revealed && cell.flagged && '🚩'}
            </div>
          ))
        )}
      </div>
      {/* 底部：游戏结果提示和重新开始按钮 */}
      <div className="mt-4 flex gap-3">
        {(gameState === 'won' || gameState === 'lost') && (
          <Text className={gameState === 'won' ? '!text-green-400' : '!text-red-400'}>
            {gameState === 'won' ? t('gameUI.youWin') : t('gameUI.hitAMine')}
          </Text>
        )}
        <Button type="primary" onClick={restart}>{t('gameUI.restart')}</Button>
      </div>
      {/* 操作说明 */}
      <Text className="!text-gray-500 !text-xs mt-2">{t('gameUI.hints.minesweeper')}</Text>
    </div>
  );
};

export default MinesweeperGame;
