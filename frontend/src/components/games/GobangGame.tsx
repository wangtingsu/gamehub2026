/**
 * 五子棋 (Gobang / Gomoku)
 *
 * 玩法概述：
 * - 玩家执黑子先手，AI 执白子后手，在 15x15 棋盘上对弈
 * - 先在横、竖、斜任一方向上连成五子的一方获胜
 * - AI 使用基于棋型评分的启发式算法，评估每个候选位置的攻防价值
 * - AI 优先级：直接获胜 > 堵对手活四/冲四 > 自己造活四 > 综合攻防评分
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button, Typography } from 'antd';

const { Title, Text } = Typography;

interface GameProps {
  /** 得分变化回调 */
  onScoreChange?: (score: number) => void;
  /** 游戏结束回调（1=玩家或AI获胜，0=平局） */
  onGameOver?: (finalScore: number) => void;
  /** 游戏开始回调 */
  onGameStart?: () => void;
}

/* ============ 游戏常量配置 ============ */

/** 棋盘大小（15x15 标准五子棋盘） */
const S = 15;
/** 每格像素大小 */
const CELL = 32;
/** 棋盘边距 */
const PADDING = 24;

/**
 * 五子棋主组件
 * 玩家 vs AI，使用 Canvas 绘制棋盘和棋子，AI 使用启发式评分算法
 */
const GobangGame: React.FC<GameProps> = ({ onScoreChange, onGameOver, onGameStart }) => {
  /** Canvas 引用 */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** 游戏状态：空闲 / 进行中 / 结束 */
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle');
  /** 获胜者 */
  const [winner, setWinner] = useState<'player' | 'ai' | null>(null);
  /** 棋盘数据（0=空，1=黑子/玩家，2=白子/AI） */
  const boardRef = useRef<number[][]>(Array.from({ length: S }, () => Array(S).fill(0)));
  /** 当前轮到谁（1=玩家，2=AI） */
  const turnRef = useRef<1 | 2>(1);
  /** AI 是否正在思考中 */
  const aiThinking = useRef(false);

  /**
   * 渲染棋盘画面
   * 绘制木色背景、网格线、星位点和棋子（带径向渐变阴影效果）
   */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const board = boardRef.current;
    const size = PADDING * 2 + (S - 1) * CELL;

    // 木色棋盘背景
    ctx.fillStyle = '#c8a96e';
    ctx.fillRect(0, 0, size, size);

    // 绘制网格线（15x15）
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < S; i++) {
      const p = PADDING + i * CELL;
      ctx.beginPath(); ctx.moveTo(PADDING, p); ctx.lineTo(PADDING + (S - 1) * CELL, p); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p, PADDING); ctx.lineTo(p, PADDING + (S - 1) * CELL); ctx.stroke();
    }

    // 绘制星位（标准五子棋盘上的 9 个星位点）
    const stars = [[3,3],[3,7],[3,11],[7,3],[7,7],[7,11],[11,3],[11,7],[11,11]];
    ctx.fillStyle = '#8b6914';
    for (const [r, c] of stars) {
      ctx.beginPath();
      ctx.arc(PADDING + c * CELL, PADDING + r * CELL, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 绘制棋子（黑子/白子，带径向渐变模拟立体感）
    for (let r = 0; r < S; r++) {
      for (let c = 0; c < S; c++) {
        if (!board[r][c]) continue;
        const x = PADDING + c * CELL, y = PADDING + r * CELL;
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.arc(x, y, CELL / 2 - 2, 0, Math.PI * 2);
        // 径向渐变：左上高光，右下暗部
        const grad = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, CELL / 2);
        if (board[r][c] === 1) {
          // 黑子
          grad.addColorStop(0, '#555');
          grad.addColorStop(1, '#111');
        } else {
          // 白子
          grad.addColorStop(0, '#fff');
          grad.addColorStop(1, '#ccc');
        }
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }, []);

  /**
   * 检测五子连珠（胜负判定）
   * 从落子位置向四个方向（横、竖、正斜、反斜）延伸检查
   * @param b 棋盘数据
   * @param row 落子行
   * @param col 落子列
   * @param player 当前玩家（1=黑子，2=白子）
   * @returns 是否五子连珠
   */
  const checkWin = useCallback((b: number[][], row: number, col: number, player: number): boolean => {
    // 四个检测方向：水平、垂直、正对角线、反对角线
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    for (const [dr, dc] of dirs) {
      let count = 1;
      // 正方向延伸
      for (let d = 1; d < 5; d++) {
        const nr = row + dr * d, nc = col + dc * d;
        if (nr < 0 || nr >= S || nc < 0 || nc >= S || b[nr][nc] !== player) break;
        count++;
      }
      // 负方向延伸
      for (let d = 1; d < 5; d++) {
        const nr = row - dr * d, nc = col - dc * d;
        if (nr < 0 || nr >= S || nc < 0 || nc >= S || b[nr][nc] !== player) break;
        count++;
      }
      if (count >= 5) return true;
    }
    return false;
  }, []);

  /**
   * 评估在 [r,c] 落子对指定玩家的价值
   * 分析四个方向上的棋型，根据连子数和开放端数量给出评分
   * 评分等级：五连 > 活四 > 冲四/活三 > 眠三/活二 > 眠二 > 活一
   * @param board 棋盘数据
   * @param r 行号
   * @param c 列号
   * @param player 玩家编号
   * @returns 综合评分值
   */
  const evaluatePosition = useCallback((board: number[][], r: number, c: number, player: number): number => {
    const dirs: [number, number][] = [[1,0],[0,1],[1,1],[1,-1]];
    let totalScore = 0;

    for (const [dr, dc] of dirs) {
      let count = 1;
      let openEnds = 0; // 开放端数量（0/1/2）

      // === 正方向延伸统计 ===
      let i = 1;
      while (r + dr * i >= 0 && r + dr * i < S && c + dc * i >= 0 && c + dc * i < S && board[r + dr * i][c + dc * i] === player) i++;
      count += i - 1;
      // 检测正方向末端是否是空格（开放端）
      if (r + dr * i >= 0 && r + dr * i < S && c + dc * i >= 0 && c + dc * i < S && board[r + dr * i][c + dc * i] === 0) openEnds++;

      // === 负方向延伸统计 ===
      i = 1;
      while (r - dr * i >= 0 && r - dr * i < S && c - dc * i >= 0 && c - dc * i < S && board[r - dr * i][c - dc * i] === player) i++;
      count += i - 1;
      if (r - dr * i >= 0 && r - dr * i < S && c - dc * i >= 0 && c - dc * i < S && board[r - dr * i][c - dc * i] === 0) openEnds++;

      // === 根据棋型给分 ===
      // 分数设计原则：高一等级约 10 倍差距，确保 AI 优先选择更优棋型
      if (count >= 5) totalScore += 10_000_000;         // 已连成五子/以上
      else if (count === 4) {
        if (openEnds === 2) totalScore += 500_000;      // 活四（两端开放，必赢）
        else if (openEnds === 1) totalScore += 50_000;   // 冲四（一端被封）
      } else if (count === 3) {
        if (openEnds === 2) totalScore += 50_000;        // 活三（可发展为活四）
        else if (openEnds === 1) totalScore += 5_000;    // 眠三
      } else if (count === 2) {
        if (openEnds === 2) totalScore += 5_000;         // 活二
        else if (openEnds === 1) totalScore += 500;
      } else if (count === 1) {
        if (openEnds === 2) totalScore += 500;
        else if (openEnds === 1) totalScore += 50;
      }
    }
    return totalScore;
  }, []);

  /**
   * 生成 AI 候选落子位置
   * 只考虑已有棋子周围 2 格范围内的空格（缩小搜索空间）
   * 棋盘为空时默认走天元（7,7）
   * @param board 棋盘数据
   * @returns 候选位置数组 [行, 列]
   */
  const getCandidates = useCallback((board: number[][]): [number, number][] => {
    const candidates: [number, number][] = [];
    const visited = Array.from({ length: S }, () => Array(S).fill(false));

    // 如果棋盘为空，走天元
    if (board.every(row => row.every(c => c === 0))) {
      return [[7, 7]];
    }

    // 遍历所有有棋子的位置，取其周围 2x2 范围
    for (let r = 0; r < S; r++) {
      for (let c = 0; c < S; c++) {
        if (board[r][c] === 0) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr < 0 || nr >= S || nc < 0 || nc >= S) continue;
            if (board[nr][nc] !== 0 || visited[nr][nc]) continue;
            visited[nr][nc] = true;
            candidates.push([nr, nc]);
          }
        }
      }
    }
    return candidates;
  }, []);

  /**
   * AI 落子决策
   * 遍历所有候选位置，分别计算进攻分和防守分，
   * 按优先级（直接获胜 > 堵对手 > 自己的攻势 > 综合评分）选择最佳位置
   */
  const aiMove = useCallback(() => {
    const board = boardRef.current;
    const candidates = getCandidates(board);

    if (candidates.length === 0) {
      aiThinking.current = false;
      draw();
      return;
    }

    let bestScore = -Infinity;
    let bestR = -1, bestC = -1;

    for (const [r, c] of candidates) {
      // 进攻分：AI 自己（白子）落在此处的棋型价值
      const attackScore = evaluatePosition(board, r, c, 2);
      // 防守分：假设对手（黑子）落在此处的棋型价值（需要堵的紧急程度）
      const defendScore = evaluatePosition(board, r, c, 1);

      // 按优先级排序：AI能赢 > 堵对手活四/冲四 > 自己造势 > 综合评分
      let score: number;
      if (attackScore >= 10_000_000) {
        score = 100_000_000 + attackScore; // 最高优先级：直接获胜
      } else if (defendScore >= 10_000_000) {
        score = 90_000_000 + defendScore;   // 次高：必须堵死对手五连
      } else if (attackScore >= 500_000) {
        score = 80_000_000 + attackScore;   // AI 自己形成活四或冲四
      } else if (defendScore >= 500_000) {
        score = 70_000_000 + defendScore;   // 堵对手活四
      } else {
        score = attackScore * 1.1 + defendScore; // 常规情况：进攻略重于防守
      }

      if (score > bestScore) {
        bestScore = score;
        bestR = r;
        bestC = c;
      }
    }

    if (bestR >= 0) {
      // AI 落子
      board[bestR][bestC] = 2;
      // 检查 AI 是否获胜
      if (checkWin(board, bestR, bestC, 2)) {
        setWinner('ai');
        setGameState('over');
        onGameOver?.(1);
      } else if (board.every(row => row.every(c => c !== 0))) {
        // 棋盘已满，平局
        setGameState('over');
        onGameOver?.(0);
      }
      turnRef.current = 1; // 切换到玩家回合
    }
    aiThinking.current = false;
    draw();
  }, [checkWin, draw, onGameOver, evaluatePosition, getCandidates]);

  /**
   * 玩家点击棋盘事件
   * 验证合法性后落子，检测胜负，然后触发 AI 走棋（延迟 200ms 模拟思考）
   */
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing' || turnRef.current !== 1 || aiThinking.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // 将像素坐标转换为棋盘行列（四舍五入取最近的交叉点）
    const col = Math.round((x - PADDING) / CELL);
    const row = Math.round((y - PADDING) / CELL);
    if (row < 0 || row >= S || col < 0 || col >= S) return;
    const board = boardRef.current;
    if (board[row][col] !== 0) return; // 位置已被占用

    // 玩家落黑子
    board[row][col] = 1;
    draw();

    // 检测玩家是否获胜
    if (checkWin(board, row, col, 1)) {
      setWinner('player');
      setGameState('over');
      onGameOver?.(1);
      return;
    }
    // 检测平局
    if (board.every(row => row.every(c => c !== 0))) {
      setGameState('over');
      onGameOver?.(0);
      return;
    }

    // 切换到 AI 回合
    turnRef.current = 2;
    aiThinking.current = true;
    setTimeout(aiMove, 200); // 延迟 200ms 让玩家感知到 AI 思考
  }, [gameState, draw, checkWin, aiMove, onGameOver]);

  /**
   * 开始新游戏（或重新开始）
   * 清空棋盘，重置回合和状态
   */
  const startGame = useCallback(() => {
    boardRef.current = Array.from({ length: S }, () => Array(S).fill(0));
    turnRef.current = 1;
    aiThinking.current = false;
    setWinner(null);
    setGameState('playing');
    onGameStart?.();
    draw();
  }, [draw]);

  /**
   * useEffect：初始化 Canvas 尺寸并绘制棋盘
   * 根据常量计算画布实际像素大小
   */
  useEffect(() => {
    if (canvasRef.current) {
      const size = PADDING * 2 + (S - 1) * CELL;
      canvasRef.current.width = size;
      canvasRef.current.height = size;
    }
    draw();
  }, [draw]);

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-between w-full max-w-[480px] mb-3">
        <Title level={4} className="!text-white !mb-0">五子棋</Title>
        <Text className="!text-gray-400">你先手（黑子）</Text>
      </div>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onTouchEnd={(e) => {
          e.preventDefault();
          const touch = e.changedTouches[0];
          if (!touch) return;
          const fake = { clientX: touch.clientX, clientY: touch.clientY } as React.MouseEvent<HTMLCanvasElement>;
          handleClick(fake);
        }}
        className="rounded-lg cursor-pointer border border-dark-600"
        style={{ cursor: gameState === 'playing' ? 'pointer' : 'default' }}
      />
      {gameState === 'idle' && <Button type="primary" className="mt-4" onClick={startGame}>开始游戏</Button>}
      {gameState === 'over' && (
        <div className="mt-4 text-center">
          <Text className={`!block mb-2 ${winner === 'player' ? '!text-green-400' : '!text-red-400'}`}>
            {winner === 'player' ? '你赢了!' : winner === 'ai' ? 'AI 赢了!' : '平局!'}
          </Text>
          <Button type="primary" onClick={startGame}>重新开始</Button>
        </div>
      )}
      {gameState === 'playing' && (
        aiThinking.current
          ? <Text className="!text-yellow-400 !text-xs mt-2">🤔 AI 思考中...</Text>
          : <Text className="!text-gray-500 !text-xs mt-2">轮到你了，点击棋盘落子（黑子先手）</Text>
      )}
    </div>
  );
};

export default GobangGame;
