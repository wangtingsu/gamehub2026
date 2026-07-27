/**
 * MatchThree - 三消游戏组件（消消乐）
 *
 * 经典的"三消"益智游戏，在一个8x8的网格上进行。
 * 玩家可以交换相邻的两个宝石，形成三个或以上同色宝石的直线即可消除得分。
 *
 * 玩法机制：
 * - 点击选中一个宝石，再点击相邻（上下左右）的宝石进行交换
 * - 交换后若能形成3个或以上同色连线则消除，否则自动换回
 * - 消除后上方宝石掉落填补空缺，可能产生连锁消除（Combo）
 * - 关卡制：每关有目标分数和步数限制，达标后进入下一关
 * - 难度递增：等级越高，使用的颜色越多、步数越少
 * - 无有效移动时自动重新洗牌
 *
 * 游戏特性：
 * - 动态难度：第1-2关使用4色，3-5关使用5色，6关以上使用6色
 * - Combo 倍率：连锁消除的分数逐次倍增
 * - 交换动画和掉落动画
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button, Typography } from 'antd';

const { Title, Text } = Typography;

interface GameProps {
  onScoreChange?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onGameStart?: () => void;
}

// ===================== 游戏常量 =====================

/** 棋盘列数 */
const COLS = 8;
/** 棋盘行数 */
const ROWS = 8;
/** 每格像素大小 */
const CELL_SIZE = 56;
/** 画布宽度 */
const CANVAS_W = COLS * CELL_SIZE;
/** 画布高度 */
const CANVAS_H = ROWS * CELL_SIZE;
/** 所有可用宝石颜色 */
const ALL_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22'];
/** 颜色对应的中文名称（调试/显示用） */
const GEM_NAMES = ['红', '蓝', '绿', '黄', '紫', '橙'];
/** 最少消除数量（3个连线） */
const MATCH_MIN = 3;

/** 单个宝石的数据结构 */
interface Gem {
  type: number;  // 颜色类型索引（-1表示空格）
  row: number;   // 行
  col: number;   // 列
}

/** 下落动画中的宝石 */
interface AnimatedGem {
  fromRow: number;   // 起始行
  toRow: number;     // 目标行
  col: number;       // 所在列
  type: number;      // 颜色类型
  progress: number;  // 动画进度（0~1）
}

/** 交换动画 */
interface SwapAnim {
  r1: number;     // 第一个宝石的行
  c1: number;     // 第一个宝石的列
  r2: number;     // 第二个宝石的行
  c2: number;     // 第二个宝石的列
  progress: number; // 动画进度（0~1）
}

const MatchThree: React.FC<GameProps> = ({ onScoreChange, onGameOver, onGameStart }) => {
  // Canvas 引用
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /** 当前关卡得分 */
  const [score, setScore] = useState(0);
  /** 本局消除次数（用于UI显示） */
  const [matches, setMatches] = useState(0);
  /** 游戏阶段 */
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle');
  /** 当前关卡数 */
  const [level, setLevel] = useState(1);
  /** 剩余步数 */
  const [movesLeft, setMovesLeft] = useState(0);
  /** 本关目标分数 */
  const [targetScore, setTargetScore] = useState(0);
  /** 总得分（所有关卡累计） */
  const [totalScore, setTotalScore] = useState(0);
  /** 是否正在显示升级动画 */
  const [levelUp, setLevelUp] = useState(false);
  /** requestAnimationFrame 动画ID */
  const animRef = useRef<number>(0);
  /** 升级动画定时器ID */
  const levelUpTimerRef = useRef<number>(0);

  /** 游戏核心状态（使用Ref，避免频繁重渲染造成的性能问题） */
  const gameRef = useRef({
    board: [] as Gem[],                              // 棋盘数据
    selected: null as { row: number; col: number } | null, // 当前选中的宝石位置
    score: 0,                                         // 本关得分
    matchCount: 0,                                    // 消除计数器
    fallingGems: [] as AnimatedGem[],                 // 下落动画中的宝石
    swapAnim: null as SwapAnim | null,                // 交换动画
    processing: false,                                 // 是否正在处理交换（防止重复操作）
    combo: 0,                                         // 当前连锁消除次数
    shuffled: false,                                   // 是否正在洗牌
    level: 1,                                         // 当前关卡
    maxMoves: 15,                                      // 步数上限
    movesUsed: 0,                                      // 已使用步数
    targetScore: 100,                                  // 目标分数
    totalScore: 0,                                     // 累计总分
    active: true,                                      // 游戏是否活跃
  });

  /**
   * 获取关卡配置
   * 目标分数 = 关卡数 * 100，步数上限 = max(5, 16 - 关卡数)
   * @param lvl 关卡数
   * @returns 包含目标分数和步数上限的配置对象
   */
  const getLevelConfig = useCallback((lvl: number) => {
    return {
      targetScore: lvl * 100,
      maxMoves: Math.max(5, 16 - lvl),
    };
  }, []);

  /**
   * 根据关卡数获取可用颜色列表
   * 低关卡使用较少颜色降低难度，高关卡使用全部6色增加难度。
   * @param lvl 关卡数
   * @returns 颜色字符串数组
   */
  const getColorsForLevel = useCallback((lvl: number): string[] => {
    if (lvl <= 2) return ALL_COLORS.slice(0, 4);  // 第1-2关：4色
    if (lvl <= 5) return ALL_COLORS.slice(0, 5);  // 第3-5关：5色
    return ALL_COLORS;                               // 第6关及以上：6色
  }, []);

  /**
   * 创建初始棋盘
   * 逐行逐列生成随机宝石，确保初始状态下没有三个连线的匹配。
   * 生成时检查左侧两个和上方两个，避免出现预匹配。
   * @returns 新棋盘数组（一维，按行主序排列）
   */
  const createBoard = useCallback(() => {
    const colors = getColorsForLevel(gameRef.current.level || 1);
    const board: Gem[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        let type: number;
        do {
          type = Math.floor(Math.random() * colors.length);
        } while (
          // 避免水平方向已有3个连线
          (c >= 2 && board[r * COLS + (c - 1)].type === type && board[r * COLS + (c - 2)].type === type) ||
          // 避免垂直方向已有3个连线
          (r >= 2 && board[(r - 1) * COLS + c].type === type && board[(r - 2) * COLS + c].type === type)
        );
        board.push({ type, row: r, col: c });
      }
    }
    return board;
  }, [getColorsForLevel]);

  /**
   * 查找棋盘上所有三消匹配
   * 分别扫描水平和垂直方向，收集所有长度>=3的同色连续宝石索引。
   * @param board 当前棋盘
   * @returns 包含所有匹配宝石索引的Set集合
   */
  const findMatches = useCallback((board: Gem[]): Set<number> => {
    const matched = new Set<number>();

    // 水平方向扫描：从左到右遍历每一行
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= COLS - MATCH_MIN; c++) {
        const type = board[r * COLS + c].type;
        if (type < 0) continue;
        let count = 1;
        // 统计连续相同类型的宝石数量
        while (c + count < COLS && board[r * COLS + c + count].type === type) count++;
        if (count >= MATCH_MIN) {
          for (let i = 0; i < count; i++) {
            matched.add(r * COLS + c + i);
          }
        }
        c += count - 1; // 跳过已检查的连续段
      }
    }

    // 垂直方向扫描：从上到下遍历每一列
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r <= ROWS - MATCH_MIN; r++) {
        const type = board[r * COLS + c].type;
        if (type < 0) continue;
        let count = 1;
        while (r + count < ROWS && board[(r + count) * COLS + c].type === type) count++;
        if (count >= MATCH_MIN) {
          for (let i = 0; i < count; i++) {
            matched.add((r + i) * COLS + c);
          }
        }
        r += count - 1;
      }
    }

    return matched;
  }, []);

  /**
   * 检查棋盘上是否存在至少一个有效的交换操作
   * 遍历所有宝石，尝试与右侧或下方的宝石交换，
   * 若任一交换能形成三消则返回true（存在有效走法）。
   * @param board 当前棋盘
   * @returns 是否存在有效走法
   */
  const hasValidMoves = useCallback((board: Gem[]): boolean => {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        // 尝试与右侧交换
        if (c + 1 < COLS) {
          const newBoard = [...board];
          const idx1 = r * COLS + c;
          const idx2 = r * COLS + c + 1;
          const temp = { ...newBoard[idx1] };
          newBoard[idx1] = { ...newBoard[idx2], row: r, col: c };
          newBoard[idx2] = { ...temp, row: r, col: c + 1 };
          if (findMatches(newBoard).size > 0) return true;
        }
        // 尝试与下方交换
        if (r + 1 < ROWS) {
          const newBoard = [...board];
          const idx1 = r * COLS + c;
          const idx2 = (r + 1) * COLS + c;
          const temp = { ...newBoard[idx1] };
          newBoard[idx1] = { ...newBoard[idx2], row: r, col: c };
          newBoard[idx2] = { ...temp, row: r + 1, col: c };
          if (findMatches(newBoard).size > 0) return true;
        }
      }
    }
    return false;
  }, [findMatches]);

  /**
   * 设置关卡
   * 根据关卡数配置目标分数和步数上限，创建并处理新棋盘。
   * @param lvl 关卡数
   */
  const setupLevel = useCallback((lvl: number) => {
    const g = gameRef.current;
    const config = getLevelConfig(lvl);
    g.level = lvl;
    g.maxMoves = config.maxMoves;
    g.targetScore = config.targetScore;
    g.movesUsed = 0;
    setLevel(lvl);
    setMovesLeft(config.maxMoves);
    setTargetScore(config.targetScore);

    const board = createBoard();
    const processed = processBoardClean(board); // 消除初始匹配
    g.board = processed;
  }, [getLevelConfig, createBoard]);

  /**
   * 纯棋盘处理（不含React状态更新）
   * 递归消除匹配、让宝石下落、填补新宝石，确保棋盘无初始匹配。
   * 如果在处理后无有效走法，则重新生成棋盘。
   * 专门用于关卡初始化，避免在设置关卡时触发不必要的状态更新。
   * @param board 原始棋盘
   * @returns 处理后的稳定棋盘
   */
  const processBoardClean = useCallback((board: Gem[]): Gem[] => {
    let currentBoard = [...board];

    const process = (): Gem[] => {
      const matched = findMatches(currentBoard);
      if (matched.size === 0) return currentBoard;

      // 将匹配的宝石标记为空（type = -1）
      for (const idx of matched) {
        currentBoard[idx] = { ...currentBoard[idx], type: -1 };
      }

      // 让宝石下落：从底部向上逐列压缩
      for (let c = 0; c < COLS; c++) {
        let writeRow = ROWS - 1;
        // 将非空宝石向下移动填补空缺
        for (let r = ROWS - 1; r >= 0; r--) {
          if (currentBoard[r * COLS + c].type >= 0) {
            if (r !== writeRow) {
              currentBoard[writeRow * COLS + c] = {
                ...currentBoard[r * COLS + c],
                row: writeRow,
                col: c,
              };
              // 关键：复制后必须清空原位置
              currentBoard[r * COLS + c] = { ...currentBoard[r * COLS + c], type: -1 };
            }
            writeRow--;
          }
        }
        // 在顶部空位生成新宝石
        const colors = getColorsForLevel(gameRef.current.level || 1);
        for (let r = writeRow; r >= 0; r--) {
          currentBoard[r * COLS + c] = {
            type: Math.floor(Math.random() * colors.length),
            row: r,
            col: c,
          };
        }
      }

      // 递归处理可能因为下落产生的新匹配
      return process();
    };

    const result = process();

    // 如果没有任何有效走法，重新生成棋盘
    if (!hasValidMoves(result)) {
      return processBoardClean(createBoard());
    }

    return result;
  }, [findMatches, hasValidMoves, createBoard, getColorsForLevel]);

  /**
   * 处理棋盘消除流程（含React状态更新）
   * 递归消除匹配宝石 -> 让上方宝石下落 -> 顶部填充新宝石 -> 检查连锁消除。
   * 每轮消除累计Combo值，得分 = 消除数量 * 10 * Combo倍率。
   * 若处理后无有效走法则自动洗牌。
   * @param board 当前棋盘
   * @returns 处理后的稳定棋盘
   */
  const processBoard = useCallback((board: Gem[]): Gem[] => {
    let currentBoard = [...board];
    let comboCount = 0;

    const process = (): Gem[] => {
      const matched = findMatches(currentBoard);
      if (matched.size === 0) return currentBoard;

      comboCount++;
      // 得分 = 消除数量 * 10 * Combo倍率
      const points = matched.size * 10 * comboCount;
      gameRef.current.score += points;
      gameRef.current.totalScore += points;
      setScore(gameRef.current.score);
      setTotalScore(gameRef.current.totalScore);
      gameRef.current.matchCount += 1;
      setMatches(gameRef.current.matchCount);
      gameRef.current.combo = comboCount;
      onScoreChange?.(gameRef.current.totalScore);

      // 标记匹配的宝石为空
      for (const idx of matched) {
        currentBoard[idx] = { ...currentBoard[idx], type: -1 };
      }

      // 下落填充：逐列从底部向顶部压缩
      for (let c = 0; c < COLS; c++) {
        let writeRow = ROWS - 1;
        for (let r = ROWS - 1; r >= 0; r--) {
          if (currentBoard[r * COLS + c].type >= 0) {
            if (r !== writeRow) {
              currentBoard[writeRow * COLS + c] = {
                ...currentBoard[r * COLS + c],
                row: writeRow,
                col: c,
              };
              // 关键：移动后必须清空原位置
              currentBoard[r * COLS + c] = { ...currentBoard[r * COLS + c], type: -1 };
            }
            writeRow--;
          }
        }
        // 顶部空位生成新宝石
        const colors = getColorsForLevel(gameRef.current.level || 1);
        for (let r = writeRow; r >= 0; r--) {
          currentBoard[r * COLS + c] = {
            type: Math.floor(Math.random() * colors.length),
            row: r,
            col: c,
          };
        }
      }

      // 递归处理连锁消除
      return process();
    };

    const result = process();
    setMatches(gameRef.current.matchCount);

    // 无有效走法时自动洗牌
    if (!hasValidMoves(result)) {
      currentBoard = createBoard();
      gameRef.current.shuffled = true;
      setTimeout(() => { gameRef.current.shuffled = false; }, 1000);
      return currentBoard;
    }

    return result;
  }, [findMatches, hasValidMoves, createBoard, getColorsForLevel, onScoreChange]);

  /**
   * 检查关卡进度
   * 当步数耗尽时判断是否达标：达标则进入下一关（重置分数保留总分），
   * 未达标则游戏结束。
   */
  const checkLevelProgress = useCallback(() => {
    const g = gameRef.current;
    if (g.movesUsed >= g.maxMoves) {
      if (g.score >= g.targetScore) {
        // 过关：重置本关分数，显示升级动画，1.5秒后进入下一关
        const nextLevel = g.level + 1;
        g.score = 0;
        setScore(0);
        setLevelUp(true);
        setGameState('playing');
        levelUpTimerRef.current = window.setTimeout(() => {
          setLevelUp(false);
          setupLevel(nextLevel);
        }, 1500);
      } else {
        // 失败：游戏结束
        g.active = false;
        setGameState('over');
        onGameOver?.(g.totalScore);
      }
    }
  }, [setupLevel, onGameOver]);

  /**
   * 绘制游戏画面
   * 使用 Canvas 2D API 渲染棋盘网格、宝石（带渐变色和符号）、
   * 选中高亮、交换动画、下落动画、Combo提示和洗牌提示。
   */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { board, selected, fallingGems, swapAnim, combo, shuffled } = gameRef.current;

    // 深色背景
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // 棋盘格子（交错颜色形成棋盘格效果）
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#16213e' : '#1a1a3e';
        ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }

    // 选中宝石高亮（白色发光边框）
    if (selected) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 10;
      ctx.strokeRect(selected.col * CELL_SIZE + 2, selected.row * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      ctx.shadowBlur = 0;
    }

    /**
     * 绘制单个宝石
     * 使用圆角矩形+渐变色填充+顶部高光+形状符号的组合效果。
     * @param type 宝石颜色类型索引
     * @param cx 中心X坐标
     * @param cy 中心Y坐标
     * @param radius 宝石半径
     */
    const drawGem = (type: number, cx: number, cy: number, radius: number) => {
      if (type < 0) return;
      const colors = getColorsForLevel(gameRef.current.level || 1);
      const color = colors[type % colors.length];

      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;

      // 圆角矩形路径
      const halfR = radius * 0.3;
      const x = cx - radius;
      const y = cy - radius;
      const w = radius * 2;
      const h = radius * 2;

      ctx.beginPath();
      ctx.moveTo(x + halfR, y);
      ctx.lineTo(x + w - halfR, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + halfR);
      ctx.lineTo(x + w, y + h - halfR);
      ctx.quadraticCurveTo(x + w, y + h, x + w - halfR, y + h);
      ctx.lineTo(x + halfR, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - halfR);
      ctx.lineTo(x, y + halfR);
      ctx.quadraticCurveTo(x, y, x + halfR, y);
      ctx.closePath();

      // 渐变色填充
      const gradient = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, darkenColor(color, 0.3));
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.shadowBlur = 0;

      // 边框
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 顶部高光
      const hlGrad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy - radius * 0.3);
      hlGrad.addColorStop(0, 'rgba(255,255,255,0.35)');
      hlGrad.addColorStop(0.5, 'rgba(255,255,255,0.15)');
      hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hlGrad;
      ctx.fillRect(cx - radius + 2, cy - radius + 2, w - 4, h * 0.4);

      // 宝石形状符号（区分不同类型的视觉标记）
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = `bold ${Math.round(radius * 0.7)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const symbols = ['◆', '●', '■', '▲', '★', '♦'];
      ctx.fillText(symbols[type % symbols.length], cx, cy + 1);
      ctx.restore();
    };

    /** 颜色变暗辅助函数（用于创建渐变效果） */
    function darkenColor(hex: string, factor: number): string {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgb(${Math.round(r * (1 - factor))},${Math.round(g * (1 - factor))},${Math.round(b * (1 - factor))})`;
    }

    // 交换动画：两个宝石沿直线向对方位置移动
    if (swapAnim) {
      const { r1, c1, r2, c2, progress } = swapAnim;
      const gem1 = board[r1 * COLS + c1];
      const gem2 = board[r2 * COLS + c2];
      const p = progress;

      if (gem1 && gem1.type >= 0) {
        const x1 = c1 * CELL_SIZE + CELL_SIZE / 2 + (c2 - c1) * CELL_SIZE * p;
        const y1 = r1 * CELL_SIZE + CELL_SIZE / 2 + (r2 - r1) * CELL_SIZE * p;
        drawGem(gem1.type, x1, y1, CELL_SIZE / 2 - 4);
      }
      if (gem2 && gem2.type >= 0) {
        const x2 = c2 * CELL_SIZE + CELL_SIZE / 2 + (c1 - c2) * CELL_SIZE * p;
        const y2 = r2 * CELL_SIZE + CELL_SIZE / 2 + (r1 - r2) * CELL_SIZE * p;
        drawGem(gem2.type, x2, y2, CELL_SIZE / 2 - 4);
      }
    } else {
      // 普通绘制：遍历棋盘渲染所有非空宝石
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const gem = board[r * COLS + c];
          if (gem && gem.type >= 0) {
            const cx = c * CELL_SIZE + CELL_SIZE / 2;
            const cy = r * CELL_SIZE + CELL_SIZE / 2;
            drawGem(gem.type, cx, cy, CELL_SIZE / 2 - 4);
          }
        }
      }
    }

    // 下落动画中宝石的渲染
    for (const fg of fallingGems) {
      const cy = (fg.fromRow + (fg.toRow - fg.fromRow) * fg.progress) * CELL_SIZE + CELL_SIZE / 2;
      const cx = fg.col * CELL_SIZE + CELL_SIZE / 2;
      drawGem(fg.type, cx, cy, CELL_SIZE / 2 - 4);
    }

    // Combo 倍率提示（连锁消除>=2时显示）
    if (combo > 1) {
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#f1c40f';
      ctx.shadowBlur = 8;
      ctx.fillText(`Combo x${combo}!`, CANVAS_W / 2, 25);
      ctx.shadowBlur = 0;
    }

    // 洗牌提示（无有效走法时自动洗牌）
    if (shuffled) {
      ctx.fillStyle = '#e67e22';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('重新洗牌!', CANVAS_W / 2, CANVAS_H - 10);
    }
  }, [getColorsForLevel]);

  /**
   * 执行宝石交换
   * 使用 requestAnimationFrame 驱动交换动画。
   * 交换完成后检查是否能形成三消：
   * - 能：执行消除流程并检查关卡进度
   * - 不能：播放回退动画恢复原位
   * @param r1 第一个宝石的行
   * @param c1 第一个宝石的列
   * @param r2 第二个宝石的行
   * @param c2 第二个宝石的列
   */
  const swapGems = useCallback((r1: number, c1: number, r2: number, c2: number) => {
    const g = gameRef.current;
    if (g.processing) return; // 防止重复操作
    if (r1 < 0 || r1 >= ROWS || r2 < 0 || r2 >= ROWS || c1 < 0 || c1 >= COLS || c2 < 0 || c2 >= COLS) return;

    g.processing = true;
    // 计入步数
    g.movesUsed += 1;
    setMovesLeft(Math.max(0, g.maxMoves - g.movesUsed));

    const idx1 = r1 * COLS + c1;
    const idx2 = r2 * COLS + c2;

    // 棋盘数据交换操作
    const swapBoardData = () => {
      const temp = { ...g.board[idx1] };
      g.board[idx1] = { ...g.board[idx2], row: r1, col: c1 };
      g.board[idx2] = { ...temp, row: r2, col: c2 };
    };

    g.swapAnim = { r1, c1, r2, c2, progress: 0 };

    // 正向交换动画（渐进式移动）
    const animSwap = () => {
      if (!g.swapAnim) return;
      g.swapAnim.progress += 0.05;
      if (g.swapAnim.progress >= 1) {
        g.swapAnim.progress = 1;

        swapBoardData(); // 真正执行数据交换

        const matched = findMatches(g.board);
        if (matched.size > 0) {
          // 交换有效：执行消除
          g.swapAnim = null;
          g.board = processBoard(g.board);
          g.selected = null;
          g.combo = 0;
          g.processing = false;
          checkLevelProgress();
        } else {
          // 交换无效：恢复数据并播放回退动画
          swapBoardData();
          g.swapAnim = { r1, c1, r2, c2, progress: 1 };
          animSwapBack();
        }
      } else {
        requestAnimationFrame(animSwap);
      }
    };

    // 回退动画（交换无效时播放）
    const animSwapBack = () => {
      if (!g.swapAnim) return;
      g.swapAnim.progress -= 0.05;
      if (g.swapAnim.progress <= 0) {
        g.swapAnim = null;
        g.selected = null;
        g.combo = 0;
        g.processing = false;
      } else {
        requestAnimationFrame(animSwapBack);
      }
    };

    animSwap();
  }, [findMatches, processBoard, checkLevelProgress]);

  /**
   * Canvas 点击事件处理
   * 计算点击位置对应的棋盘坐标，进行选牌或交换操作。
   * 第一次点击选中宝石，第二次点击相邻宝石则触发交换，
   * 点击非相邻宝石则切换选中。
   */
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = gameRef.current;
    if (g.processing) return;
    if (g.movesUsed >= g.maxMoves) return;

    // 计算实际点击的棋盘坐标（考虑Canvas缩放）
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;

    if (g.selected === null) {
      // 首次点击：选中宝石
      g.selected = { row, col };
    } else {
      const sr = g.selected.row;
      const sc = g.selected.col;
      const dr = Math.abs(sr - row);
      const dc = Math.abs(sc - col);

      if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
        // 点击相邻宝石：触发交换
        swapGems(sr, sc, row, col);
      } else {
        // 点击非相邻宝石：重新选择
        g.selected = { row, col };
      }
    }
  }, [swapGems]);

  /**
   * 游戏主循环
   * 每帧重绘画布，使用 requestAnimationFrame 驱动。
   */
  const gameLoop = useCallback((_timestamp: number) => {
    draw();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [draw]);

  /**
   * 开始新游戏
   * 初始化第1关：创建棋盘、消除所有初始匹配、重置分数和步数。
   */
  const startGame = useCallback(() => {
    const config = getLevelConfig(1);
    const board = createBoard();
    const cleaned = processBoardClean(board);
    gameRef.current = {
      board: cleaned,
      selected: null,
      score: 0,
      matchCount: 0,
      fallingGems: [],
      swapAnim: null,
      processing: false,
      combo: 0,
      shuffled: false,
      level: 1,
      maxMoves: config.maxMoves,
      movesUsed: 0,
      targetScore: config.targetScore,
      totalScore: 0,
      active: true,
    };
    setScore(0);
    setMatches(0);
    setLevel(1);
    setMovesLeft(config.maxMoves);
    setTargetScore(config.targetScore);
    setTotalScore(0);
    setLevelUp(false);
    setGameState('playing');
    onGameStart?.();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop, onGameStart, getLevelConfig, createBoard, processBoardClean]);

  /** 待机状态绘制静态画面，组件卸载时清理升级定时器 */
  useEffect(() => {
    if (gameState === 'idle') {
      draw();
    }
    return () => {
      if (levelUpTimerRef.current) {
        clearTimeout(levelUpTimerRef.current);
      }
    };
  }, [gameState, draw]);

  /** 初始化Canvas尺寸并渲染初始画面 */
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = CANVAS_W;
      canvasRef.current.height = CANVAS_H;
    }
    draw();
  }, [draw]);

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-between w-full max-w-[420px] mb-3">
        <Title level={4} className="!text-white !mb-0">消消乐</Title>
        <div className="flex gap-3">
          {gameState === 'playing' && (
            <>
              <Text className="!text-yellow-400">第 {level} 关</Text>
              <Text className="!text-gray-400">目标: {targetScore}</Text>
            </>
          )}
          <Text className="!text-gray-400">得分: {score}</Text>
          <Text className="!text-gray-400">消除: {matches}</Text>
        </div>
      </div>
      {gameState === 'playing' && (
        <div className="w-full max-w-[420px] text-center mb-1">
          <Text className="!text-gray-400">剩余步数: {movesLeft}</Text>
        </div>
      )}
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="rounded-lg border border-dark-600 cursor-pointer"
          width={CANVAS_W}
          height={CANVAS_H}
          onClick={handleClick}
        />
        {/* Level up overlay */}
        {levelUp && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="text-center">
              <Text className="!text-yellow-400 !text-2xl !font-bold !block">
                Level {level} Clear! 🎉
              </Text>
              <Text className="!text-white !text-lg !block mt-2">
                总分: {totalScore}
              </Text>
            </div>
          </div>
        )}
      </div>
      {gameState === 'idle' && (
        <Button type="primary" className="mt-4" onClick={startGame}>开始游戏</Button>
      )}
      {gameState === 'over' && (
        <div className="mt-4 text-center">
          <Text className="!text-red-400 !block mb-2">
            游戏结束! 第 {level} 关, 得分: {totalScore}
          </Text>
          <Button type="primary" onClick={startGame}>重新开始</Button>
        </div>
      )}
      {gameState === 'playing' && !levelUp && (
        <Text className="!text-gray-500 !text-xs mt-2">点击选择宝石，再点击相邻宝石交换</Text>
      )}
    </div>
  );
};

export default MatchThree;
