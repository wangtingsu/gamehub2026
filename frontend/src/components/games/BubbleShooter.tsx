/**
 * 泡泡龙 (Bubble Shooter)
 *
 * 玩法概述：
 * - 玩家从底部发射彩色泡泡到顶部网格中
 * - 3 个及以上同色泡泡相连时会被消除，并触发上方无支撑泡泡掉落
 * - 每次发射后，顶部会逐渐向下推压一行新泡泡
 * - 泡泡达到警戒线则游戏结束
 * - 支持鼠标瞄准、点击/空格发射
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

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
const CW = 350;
/** 画布高度 */
const CH = 500;
/** 泡泡半径 */
const BUBBLE_R = 16;
/** 网格列数 */
const COLS = 8;
/** 网格总行数 */
const TOTAL_ROWS = 15;
/** 列间距 */
const H_SPACING = 34;
/** 行间距 */
const V_SPACING = 28;
/** 网格区域距顶部距离 */
const GRID_TOP = 40;
/** 网格区域距左边界距离（居中计算） */
const GRID_LEFT = (CW - COLS * H_SPACING) / 2 + BUBBLE_R;
/** 发射器 X 坐标（底部中央） */
const SHOOTER_X = CW / 2;
/** 发射器 Y 坐标（底部） */
const SHOOTER_Y = CH - 30;
/** 泡泡发射速度 */
const SHOT_SPEED = 10;
/** 最大发射角度（弧度），限制左右各约 80 度 */
const MAX_ANGLE = 1.396;
/** 初始生成的行数 */
const INITIAL_ROWS = 5;
/** 游戏结束警戒行（泡泡到达此行的行索引时触发结束） */
const GAME_OVER_ROW = 12;

/** 可用泡泡颜色列表 */
const COLORS = ['#ff4444', '#4488ff', '#44cc44', '#ffdd44', '#cc44cc', '#ff8844'];

/**
 * 根据行列号计算泡泡在画布上的像素坐标
 * 奇数行会有水平偏移，形成蜂窝状排列
 * @param row 行号
 * @param col 列号
 * @returns 画布像素坐标 {x, y}
 */
function getBubblePos(row: number, col: number) {
  return {
    x: GRID_LEFT + col * H_SPACING + (row % 2 === 1 ? H_SPACING / 2 : 0),
    y: GRID_TOP + row * V_SPACING,
  };
}

/**
 * 获取指定泡泡的六个邻居方向（蜂窝网格的邻接关系）
 * 偶数行和奇数行的邻居偏移不同，形成六边形布局
 * @param row 行号
 * @param col 列号
 * @returns 邻居坐标数组 [行, 列]
 */
function getNeighbors(row: number, col: number): [number, number][] {
  const result: [number, number][] = [];
  if (row % 2 === 0) {
    // 偶数行：左上、右上、左、右、左下、右下
    if (row > 0) { result.push([row - 1, col - 1], [row - 1, col]); }
    if (col > 0) { result.push([row, col - 1]); }
    if (col < COLS - 1) { result.push([row, col + 1]); }
    if (row < TOTAL_ROWS - 1) { result.push([row + 1, col - 1], [row + 1, col]); }
  } else {
    // 奇数行：左、右、上、上右、下、下右
    if (row > 0) { result.push([row - 1, col], [row - 1, col + 1]); }
    if (col > 0) { result.push([row, col - 1]); }
    if (col < COLS - 1) { result.push([row, col + 1]); }
    if (row < TOTAL_ROWS - 1) { result.push([row + 1, col], [row + 1, col + 1]); }
  }
  return result.filter(([r, c]) => r >= 0 && r < TOTAL_ROWS && c >= 0 && c < COLS);
}

/**
 * 创建初始泡泡网格
 * 前 INITIAL_ROWS 行随机填充颜色，其余为 null（空）
 * @returns 二维网格数组，每个元素为颜色字符串或 null
 */
function createGrid(): (string | null)[][] {
  const grid: (string | null)[][] = [];
  for (let r = 0; r < TOTAL_ROWS; r++) {
    const row: (string | null)[] = [];
    for (let c = 0; c < COLS; c++) {
      row.push(r < INITIAL_ROWS ? COLORS[Math.floor(Math.random() * COLORS.length)] : null);
    }
    grid.push(row);
  }
  return grid;
}

/**
 * 生成一行新的泡泡（用于推压阶段）
 * @param activeColors 当前可用的颜色列表
 * @returns 一行泡泡颜色数组
 */
function addNewRow(activeColors: string[]): (string | null)[] {
  const row: (string | null)[] = [];
  for (let c = 0; c < COLS; c++) {
    row.push(activeColors[Math.floor(Math.random() * activeColors.length)]);
  }
  return row;
}

/**
 * 使用 BFS（广度优先搜索）查找与指定泡泡相连的相同颜色群组
 * 从 [row, col] 开始，搜索所有颜色相同的连通泡泡
 * @param grid 游戏网格
 * @param row 起始行
 * @param col 起始列
 * @param color 目标颜色
 * @returns 相连的同色泡泡坐标列表
 */
function findConnectedGroup(grid: (string | null)[][], row: number, col: number, color: string): [number, number][] {
  const visited = new Set<string>();
  const group: [number, number][] = [];
  const queue: [number, number][] = [[row, col]];
  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    visited.add(key);
    if (grid[r][c] !== color) continue;
    group.push([r, c]);
    for (const [nr, nc] of getNeighbors(r, c)) {
      if (!visited.has(`${nr},${nc}`)) queue.push([nr, nc]);
    }
  }
  return group;
}

/**
 * 查找所有失去顶部支撑的泡泡（悬空泡泡）
 * 从第一行开始 BFS，标记所有与顶部相连的泡泡，
 * 未被标记的即为悬空泡泡，需要掉落
 * @param grid 游戏网格
 * @returns 悬空泡泡坐标列表
 */
function findUnsupported(grid: (string | null)[][]): [number, number][] {
  const visited = new Set<string>();
  const queue: [number, number][] = [];
  // 从第一行所有非空格开始 BFS
  for (let c = 0; c < COLS; c++) {
    if (grid[0][c] !== null) queue.push([0, c]);
  }
  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    visited.add(key);
    if (grid[r][c] === null) continue;
    for (const [nr, nc] of getNeighbors(r, c)) {
      if (!visited.has(`${nr},${nc}`) && grid[nr][nc] !== null) queue.push([nr, nc]);
    }
  }
  // 所有不在 visited 中的非空格子即为悬空
  const unsupported: [number, number][] = [];
  for (let r = 0; r < TOTAL_ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] !== null && !visited.has(`${r},${c}`)) unsupported.push([r, c]);
    }
  }
  return unsupported;
}

/**
 * 获取最底部有泡泡的行号
 * @param grid 游戏网格
 * @returns 行索引（-1 表示全空）
 */
function getLowestOccupiedRow(grid: (string | null)[][]): number {
  for (let r = TOTAL_ROWS - 1; r >= 0; r--) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] !== null) return r;
    }
  }
  return -1;
}

/**
 * 在画布上绘制单个泡泡
 * 包含发光阴影和高光效果，使泡泡看起来立体
 * @param ctx Canvas 2D 上下文
 * @param x 中心 X 坐标
 * @param y 中心 Y 坐标
 * @param color 泡泡颜色
 */
function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  // 彩色发光效果
  ctx.shadowColor = color;
  ctx.shadowBlur = 4;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, BUBBLE_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // 高光（左上角白色反光）
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.arc(x - 4, y - 4, BUBBLE_R * 0.35, 0, Math.PI * 2);
  ctx.fill();
  // 小高光点
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.arc(x - 6, y - 6, BUBBLE_R * 0.2, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * 获取当前可用的颜色列表
 * 紧急模式下会减少可用颜色种类，降低游戏难度
 * @param count 需要的颜色数量
 * @returns 颜色列表
 */
function getActiveColors(count: number): string[] {
  if (count >= COLORS.length) return [...COLORS];
  return COLORS.slice(0, count);
}

/**
 * 泡泡龙主组件
 * 使用 Canvas 实现泡泡龙游戏，包含网格管理、消除检测、掉落动画和推压机制
 */
const BubbleShooter: React.FC<GameProps> = ({ onScoreChange, onGameOver, onGameStart }) => {
  const { t } = useTranslation('games');
  /** Canvas 引用 */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** 当前得分 */
  const [score, setScore] = useState(0);
  /** 游戏状态：空闲 / 进行中 / 结束 */
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle');

  /** 游戏核心数据引用（使用 ref 避免闭包陷阱） */
  const gameRef = useRef({
    grid: createGrid(),                                     // 泡泡网格（颜色字符串或 null）
    aimAngle: 0,                                            // 瞄准角度（弧度）
    shotBubble: null as { x: number; y: number; vx: number; vy: number; color: string } | null, // 飞行中的泡泡
    currentColor: COLORS[Math.floor(Math.random() * COLORS.length)], // 当前待发射的泡泡颜色
    score: 0,                                               // 游戏内部分数
    popping: [] as { row: number; col: number; timer: number }[],  // 正在消除动画中的泡泡
    falling: [] as { row: number; col: number; timer: number }[],  // 正在掉落动画中的泡泡
    shotsSincePush: 0,                                      // 距离上次推压的发射次数
    totalCleared: 0,                                        // 累计消除的泡泡总数
    emergency: false,                                       // 是否处于紧急模式（泡泡接近底线）
    activeColorCount: COLORS.length,                        // 当前可用的颜色种类数
  });
  /** 游戏状态的 Ref 版本，用于在动画循环中读取 */
  const stateRef = useRef<'idle' | 'playing' | 'over'>('idle');
  /** requestAnimationFrame ID，用于清理 */
  const animRef = useRef(0);

  /**
   * 根据累计消除数计算推压间隔
   * 消除越多，推压越快（间隔从 10 逐渐减少到最少 5）
   * @param totalCleared 累计消除的泡泡数
   * @returns 推压间隔（发射次数）
   */
  const getPushInterval = useCallback((totalCleared: number): number => {
    return Math.max(5, 10 - Math.floor(totalCleared / 20));
  }, []);

  /**
   * 从当前可用颜色中随机选取一种
   * @returns 颜色字符串
   */
  const getRandomColor = useCallback((): string => {
    const g = gameRef.current;
    const colors = getActiveColors(g.activeColorCount);
    return colors[Math.floor(Math.random() * colors.length)];
  }, []);

  /**
   * 更新紧急状态
   * 当泡泡最低行接近警戒线时，进入紧急模式并减少可用颜色种类（降低难度）
   */
  const updateEmergencyState = useCallback(() => {
    const g = gameRef.current;
    const lowestRow = getLowestOccupiedRow(g.grid);
    const shouldBeEmergency = lowestRow >= GAME_OVER_ROW - 3;
    if (shouldBeEmergency !== g.emergency) {
      g.emergency = shouldBeEmergency;
      if (shouldBeEmergency) {
        // 紧急模式：减少颜色种类，更容易匹配消除
        g.activeColorCount = Math.max(3, COLORS.length - 1);
      } else {
        g.activeColorCount = COLORS.length;
      }
    }
  }, []);

  /**
   * 将发射的泡泡放置到网格中最接近的空格
   * 然后检测同色泡泡连接（>=3 消除），并处理悬空泡泡掉落
   * 最后判断是否触发行推压
   * @param px 泡泡的 X 坐标
   * @param _py 泡泡的 Y 坐标
   * @param color 泡泡颜色
   */
  const placeBubble = useCallback((px: number, _py: number, color: string) => {
    const g = gameRef.current;
    // 找到距离发射位置最近的空格
    let bestDist = Infinity;
    let bestCell: { row: number; col: number } | null = null;
    for (let r = 0; r < TOTAL_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (g.grid[r][c] !== null) continue;
        const pos = getBubblePos(r, c);
        const dist = Math.hypot(pos.x - px, pos.y - _py);
        if (dist < bestDist) {
          bestDist = dist;
          bestCell = { row: r, col: c };
        }
      }
    }
    if (bestCell) {
      // 将泡泡放入网格
      g.grid[bestCell.row][bestCell.col] = color;

      // === 消除检测：BFS 查找同色连接群组 ===
      const connected = findConnectedGroup(g.grid, bestCell.row, bestCell.col, color);
      let clearedThisShot = 0;
      if (connected.length >= 3) {
        // 标记消除动画中的泡泡
        for (const [r, c] of connected) {
          g.popping.push({ row: r, col: c, timer: 0 });
          g.grid[r][c] = null;
        }
        clearedThisShot += connected.length;
        g.score += connected.length * 10; // 消除每个泡泡 10 分
        setScore(g.score);
        onScoreChange?.(g.score);

        // === 悬空检测：消除后查找失去支撑的泡泡 ===
        const unsupported = findUnsupported(g.grid);
        if (unsupported.length > 0) {
          for (const [r, c] of unsupported) {
            g.falling.push({ row: r, col: c, timer: 0 });
            g.grid[r][c] = null;
          }
          clearedThisShot += unsupported.length;
          g.score += unsupported.length * 15; // 掉落泡泡每个 15 分
          setScore(g.score);
          onScoreChange?.(g.score);
        }
      }

      if (clearedThisShot > 0) {
        g.totalCleared += clearedThisShot;
      }

      // 游戏结束检测：放置位置超过警戒行
      if (bestCell.row >= GAME_OVER_ROW) {
        stateRef.current = 'over';
        setGameState('over');
        onGameOver?.(g.score);
        return;
      }

      // === 行推压逻辑 ===
      g.shotsSincePush++;
      const pushInterval = getPushInterval(g.totalCleared);
      if (g.shotsSincePush >= pushInterval) {
        g.shotsSincePush = 0;
        // 在顶部插入新行，底部移除一行
        const activeColors = getActiveColors(g.activeColorCount);
        const newRow = addNewRow(activeColors);
        g.grid.unshift(newRow);
        g.grid.pop();

        // 推压后检测是否有泡泡越过警戒线
        for (let r = 0; r < TOTAL_ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (g.grid[r][c] !== null && r >= GAME_OVER_ROW) {
              stateRef.current = 'over';
              setGameState('over');
              onGameOver?.(g.score);
              return;
            }
          }
        }
      }
    } else {
      // 没有空格 = 网格已满，游戏结束
      stateRef.current = 'over';
      setGameState('over');
      onGameOver?.(g.score);
    }
  }, [onScoreChange, onGameOver, getPushInterval]);

  /**
   * 渲染游戏画面
   * 绘制网格泡泡、瞄准线、飞行泡泡、消除/掉落动画、警戒线和紧急警告
   */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const g = gameRef.current;

    // 深色背景
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CW, CH);

    // 紧急模式红色闪烁覆盖
    if (g.emergency && Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.fillStyle = 'rgba(233, 69, 96, 0.08)';
      ctx.fillRect(0, 0, CW, CH);
    }

    // 绘制网格中的泡泡（排除正在消除和掉落的）
    for (let r = 0; r < TOTAL_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const color = g.grid[r][c];
        if (!color) continue;
        if (g.popping.some(p => p.row === r && p.col === c)) continue;
        if (g.falling.some(f => f.row === r && f.col === c)) continue;
        const { x, y } = getBubblePos(r, c);

        // 紧急模式下，靠近警戒线的泡泡加红色发光
        if (g.emergency && r >= GAME_OVER_ROW - 3) {
          ctx.shadowColor = '#e94560';
          ctx.shadowBlur = 8;
        }
        drawBubble(ctx, x, y, color);
        ctx.shadowBlur = 0;
      }
    }

    // 瞄准虚线（从发射器沿瞄准方向延伸）
    if (!g.shotBubble && stateRef.current === 'playing') {
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(SHOOTER_X, SHOOTER_Y);
      const ex = SHOOTER_X + Math.sin(g.aimAngle) * CH;
      const ey = SHOOTER_Y - Math.cos(g.aimAngle) * CH;
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 飞行中的泡泡
    if (g.shotBubble) {
      drawBubble(ctx, g.shotBubble.x, g.shotBubble.y, g.shotBubble.color);
    }

    // 发射器处的下一个泡泡
    drawBubble(ctx, SHOOTER_X, SHOOTER_Y, g.currentColor);
    // 发射器下方指示色球
    ctx.fillStyle = g.currentColor;
    ctx.shadowColor = g.currentColor;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(SHOOTER_X, SHOOTER_Y + 18, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 绘制消除动画（白色扩散渐隐效果）
    for (const p of g.popping) {
      const { x, y } = getBubblePos(p.row, p.col);
      const progress = p.timer / 10;
      const alpha = 1 - progress;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, y, BUBBLE_R * (1 + progress * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // 绘制掉落动画（渐隐下落效果）
    for (const f of g.falling) {
      const { x, y } = getBubblePos(f.row, f.col);
      const progress = f.timer / 20;
      const alpha = 1 - progress;
      ctx.globalAlpha = alpha;
      const fc = g.grid[f.row]?.[f.col];
      if (fc) drawBubble(ctx, x, y + f.timer * 3, fc);
      ctx.globalAlpha = 1;
    }

    if (stateRef.current === 'playing') {
      // 警戒线（红色虚线）
      ctx.strokeStyle = 'rgba(233, 69, 96, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      const lineY = GRID_TOP + GAME_OVER_ROW * V_SPACING + BUBBLE_R;
      ctx.beginPath();
      ctx.moveTo(0, lineY);
      ctx.lineTo(CW, lineY);
      ctx.stroke();
      ctx.setLineDash([]);

      // 显示距离下次推压的剩余射击次数
      const pushInterval = getPushInterval(g.totalCleared);
      const remaining = pushInterval - g.shotsSincePush;
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(t('gameUI.shotsLeftLabel', { value: remaining }), 6, 3);
    }

    // 紧急模式闪烁警告文字
    if (g.emergency && Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.fillStyle = '#e94560';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(t('gameUI.warningBubbles'), CW / 2, GRID_TOP + GAME_OVER_ROW * V_SPACING + BUBBLE_R + 6);
    }
  }, [getPushInterval, t]);

  /**
   * 每帧更新游戏状态
   * - 更新紧急状态
   * - 飞行泡泡移动（墙壁反弹、网格碰撞检测）
   */
  const update = useCallback(() => {
    const g = gameRef.current;

    updateEmergencyState();

    if (!g.shotBubble) return;
    const sb = g.shotBubble;
    sb.x += sb.vx;
    sb.y += sb.vy;

    // 左右墙壁反弹
    if (sb.x - BUBBLE_R <= 0) { sb.x = BUBBLE_R; sb.vx = -sb.vx; }
    if (sb.x + BUBBLE_R >= CW) { sb.x = CW - BUBBLE_R; sb.vx = -sb.vx; }
    // 到达顶部边界，直接放置到最近空格
    if (sb.y - BUBBLE_R <= GRID_TOP) {
      placeBubble(sb.x, sb.y, sb.color);
      g.shotBubble = null;
      g.currentColor = getRandomColor();
      return;
    }

    // 与网格中泡泡的碰撞检测（距离小于 2 倍半径）
    for (let r = 0; r < TOTAL_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (g.grid[r][c] === null) continue;
        const { x, y } = getBubblePos(r, c);
        if (Math.hypot(sb.x - x, sb.y - y) < BUBBLE_R * 2) {
          placeBubble(sb.x, sb.y, sb.color);
          g.shotBubble = null;
          g.currentColor = getRandomColor();
          return;
        }
      }
    }
  }, [placeBubble, getRandomColor, updateEmergencyState]);

  /**
   * 游戏主循环
   * 使用 requestAnimationFrame 驱动，更新动画计时器后执行 update -> draw
   */
  const gameLoop = useCallback(() => {
    if (stateRef.current === 'over') {
      draw(); // 游戏结束仍绘制最后一帧
      return;
    }
    const g = gameRef.current;
    // 更新消除和掉落动画计时器（移除已完成的动画）
    g.popping = g.popping.filter(p => { p.timer++; return p.timer < 10; });
    g.falling = g.falling.filter(f => { f.timer++; return f.timer < 20; });
    update();
    draw();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [update, draw]);

  /** 发射当前颜色的泡泡 */
  const shoot = useCallback(() => {
    const g = gameRef.current;
    if (g.shotBubble || stateRef.current !== 'playing') return;
    // 根据瞄准角度计算速度分量
    g.shotBubble = {
      x: SHOOTER_X,
      y: SHOOTER_Y,
      vx: Math.sin(g.aimAngle) * SHOT_SPEED,
      vy: -Math.cos(g.aimAngle) * SHOT_SPEED,
      color: g.currentColor,
    };
  }, []);

  /** 鼠标移动：更新瞄准角度（限制在最大角度范围内） */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const dx = mx - SHOOTER_X;
    const dy = SHOOTER_Y - my;
    let angle = Math.atan2(dx, dy);
    angle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, angle));
    gameRef.current.aimAngle = angle;
  }, []);

  /** 鼠标点击：发射泡泡 */
  const handleClick = useCallback(() => {
    shoot();
  }, [shoot]);

  /** 触摸滑动：更新瞄准角度 */
  const handleTouch = useCallback((e: TouchEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.touches[0].clientX - rect.left;
    const my = e.touches[0].clientY - rect.top;
    const dx = mx - SHOOTER_X;
    const dy = SHOOTER_Y - my;
    let angle = Math.atan2(dx, dy);
    angle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, angle));
    gameRef.current.aimAngle = angle;
  }, []);

  /** 触摸结束：发射泡泡 */
  const handleTouchEnd = useCallback((_e: TouchEvent) => {
    shoot();
  }, [shoot]);

  /** 空格键按下：发射泡泡 */
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault();
      shoot();
    }
  }, [shoot]);

  /**
   * 开始新游戏（或重新开始）
   * 重置网格、分数和所有游戏状态变量，启动游戏循环
   */
  const startGame = useCallback(() => {
    const g = gameRef.current;
    g.grid = createGrid();
    g.aimAngle = 0;
    g.shotBubble = null;
    g.currentColor = getRandomColor();
    g.score = 0;
    g.popping = [];
    g.falling = [];
    g.shotsSincePush = 0;
    g.totalCleared = 0;
    g.emergency = false;
    g.activeColorCount = COLORS.length;
    stateRef.current = 'playing';
    setScore(0);
    setGameState('playing');
    onGameStart?.();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop, onGameStart, getRandomColor]);

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
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    window.addEventListener('touchmove', handleTouch, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('touchmove', handleTouch);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(animRef.current);
    };
  }, [handleMouseMove, handleClick, handleTouch, handleTouchEnd, handleKeyDown]);

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-between w-full max-w-[350px] mb-3">
        <Title level={4} className="!text-white !mb-0">{t('onlineGames.games.bubble-shooter.name')}</Title>
        <Text className="!text-gray-400">{t('gameUI.scoreLabel', { value: score })}</Text>
      </div>
      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        className="rounded-lg border border-dark-600"
      />
      {gameState === 'idle' && (
        <Button type="primary" className="mt-4" onClick={startGame}>{t('gameUI.startGame')}</Button>
      )}
      {gameState === 'over' && (
        <div className="mt-4 text-center">
          <Text className="!text-red-400 !block mb-2">{t('gameUI.gameOverScore', { score })}</Text>
          <Button type="primary" onClick={startGame}>{t('gameUI.restart')}</Button>
        </div>
      )}
      {gameState === 'playing' && (
        <Text className="!text-gray-500 !text-xs mt-2">{t('gameUI.hints.bubbleShooter')}</Text>
      )}
    </div>
  );
};

export default BubbleShooter;
