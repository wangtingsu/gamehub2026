/**
 * WhackAMole.tsx - 打地鼠游戏组件
 *
 * 游戏玩法概述：
 * 在 3x3 的网格洞口中随机出现地鼠，玩家需点击地鼠击打得分。
 * 游戏中包含三种地鼠类型：普通地鼠（10分）、金色地鼠（30分，出现时间减半）、炸弹地鼠（-10分）。
 * 游戏设有阶段难度系统（简单→中等→困难），随游戏时间推进地鼠出现更快、停留更短。
 * 连击系统：连续击中可获得 1.5x/2x/2.5x 倍率奖励。
 * 惩罚机制：连续 3 次未击中（Miss）将触发 5 秒冻结惩罚。
 * 游戏时长 30 秒，结束后显示最终得分。
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Button, Typography } from 'antd';

const { Title, Text } = Typography;

/** 游戏组件对外属性接口 */
interface GameProps {
  onScoreChange?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onGameStart?: () => void;
}

// ==================== 游戏常量配置 ====================
const CANVAS_W = 350;               // 画布宽度
const CANVAS_H = 400;               // 画布高度
const GRID_SIZE = 3;                // 网格行列数（3x3）
const HOLE_RADIUS = 38;             // 洞口半径
const HOLE_SPACING_X = 100;         // 洞口水平间距
const HOLE_SPACING_Y = 100;         // 洞口垂直间距
const GRID_OFFSET_X = (CANVAS_W - (GRID_SIZE - 1) * HOLE_SPACING_X) / 2; // 网格起始 X 偏移
const GRID_OFFSET_Y = 90;           // 网格起始 Y 偏移
const MOLE_RADIUS = 32;             // 地鼠绘制半径
const GAME_DURATION = 30;           // 游戏时长（秒）
const FREEZE_DURATION = 5000;       // 冻结惩罚时长（毫秒）
const MISS_THRESHOLD = 3;           // 连续 Miss 触发冻结的阈值

/** 地鼠数据结构 */
interface Mole {
  col: number;          // 所在列（0~2）
  row: number;          // 所在行（0~2）
  appearTime: number;   // 出现时间戳
  duration: number;     // 持续时长（毫秒）
  type: 'normal' | 'gold' | 'bomb'; // 地鼠类型
}

/** 击中/未击中反馈效果数据结构 */
interface Feedback {
  col: number;          // 位置列
  row: number;          // 位置行
  hit: boolean;         // 是否击中
  time: number;         // 事件时间戳
  points?: number;      // 获得的分数（用于显示）
}

/**
 * WhackAMole 打地鼠游戏主组件
 * 包含阶段难度、连击系统、冻结惩罚等完整游戏机制
 */
const WhackAMole: React.FC<GameProps> = ({ onScoreChange, onGameOver, onGameStart }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /** 当前得分 */
  const [score, setScore] = useState(0);
  /** 剩余时间（秒） */
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  /** 游戏状态 */
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle');
  /** 当前连击数 */
  const [combo, setCombo] = useState(0);
  /** 当前游戏阶段（简单/中等/困难） */
  const [phase, setPhase] = useState<'easy' | 'medium' | 'hard'>('easy');
  /** 是否处于冻结惩罚状态 */
  const [frozen, setFrozen] = useState(false);
  /** 当前连续 Miss 次数 */
  const [missCount, setMissCount] = useState(0);

  /** 动画帧 ID */
  const animRef = useRef<number>(0);
  /** 冻结计时器引用 */
  const freezeTimerRef = useRef<number>(0);

  /** 游戏核心数据引用 */
  const gameRef = useRef({
    score: 0,                              // 实时分数
    startTime: 0,                          // 游戏开始时间戳
    elapsed: 0,                            // 已过时间
    moles: [] as Mole[],                   // 地鼠列表
    feedbacks: [] as Feedback[],           // 反馈效果列表
    lastSpawn: 0,                          // 上次生成地鼠时间戳
    active: false,                         // 是否运行中
    combo: 0,                              // 连击数
    missCount: 0,                          // 连续 Miss 数
    frozen: false,                         // 是否冻结
    freezeUntil: 0,                        // 冻结结束时间戳
    phase: 'easy' as 'easy' | 'medium' | 'hard',  // 当前阶段
  });

  /**
   * 绘制一帧游戏画面
   * 绘制顺序：草地背景 → 冻结覆盖层 → 洞口 → 击中反馈 → 地鼠
   * 地鼠绘制包含三种类型动画：普通（棕色）、金色（带皇冠）、炸弹（带引信和骷髅眼）
   */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { moles, feedbacks, frozen: isFrozen, phase: currentPhase } = gameRef.current;

    // 草地背景（绿色填充）
    ctx.fillStyle = '#2d5a27';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // 草地纹理：随机绘制草叶线条
    for (let i = 0; i < 60; i++) {
      const gx = Math.random() * CANVAS_W;
      const gy = Math.random() * CANVAS_H;
      ctx.strokeStyle = `hsl(120, 40%, ${20 + Math.random() * 20}%)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + (Math.random() - 0.5) * 6, gy - 6 - Math.random() * 8);
      ctx.stroke();
    }

    // 冻结状态：半透明蓝色覆盖层和提示文字
    if (isFrozen) {
      ctx.fillStyle = 'rgba(100, 150, 255, 0.15)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#88ccff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('❄️ Frozen ❄️', CANVAS_W / 2, 50);
    }

    const now = performance.now();

    // 绘制 3x3 洞口（含阴影、边缘和内部暗区）
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cx = GRID_OFFSET_X + c * HOLE_SPACING_X;
        const cy = GRID_OFFSET_Y + r * HOLE_SPACING_Y;

        // 洞口阴影
        ctx.fillStyle = '#1a0f00';
        ctx.beginPath();
        ctx.ellipse(cx + 2, cy + 3, HOLE_RADIUS, HOLE_RADIUS * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 洞口主体（棕色椭圆）
        ctx.fillStyle = '#5c3a1e';
        ctx.beginPath();
        ctx.ellipse(cx, cy, HOLE_RADIUS, HOLE_RADIUS * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 洞口边缘
        ctx.strokeStyle = '#3d2510';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, HOLE_RADIUS, HOLE_RADIUS * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();

        // 内部暗区（更深的椭圆）
        ctx.fillStyle = '#2a1808';
        ctx.beginPath();
        ctx.ellipse(cx, cy - 2, HOLE_RADIUS - 6, (HOLE_RADIUS - 6) * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 绘制击中/未击中反馈效果（浮动文字，400ms 后淡出消失）
    for (const fb of feedbacks) {
      const cx = GRID_OFFSET_X + fb.col * HOLE_SPACING_X;
      const cy = GRID_OFFSET_Y + fb.row * HOLE_SPACING_Y - 20;
      const elapsed = now - fb.time;
      if (elapsed > 400) continue;

      const alpha = 1 - elapsed / 400;
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      if (fb.hit) {
        // 击中：显示分数（红色浮动文字）
        const sign = fb.points && fb.points > 0 ? '+' : '';
        ctx.fillStyle = `rgba(255, 80, 80, ${alpha})`;
        ctx.fillText(`${sign}${fb.points ?? 10}`, cx, cy - elapsed * 0.05);
      } else {
        // 未击中：显示 "Miss!"（白色浮动文字）
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillText('Miss!', cx, cy - elapsed * 0.05);
      }
    }

    // 绘制地鼠（根据类型绘制不同外观）
    for (const mole of moles) {
      const cx = GRID_OFFSET_X + mole.col * HOLE_SPACING_X;
      const baseY = GRID_OFFSET_Y + mole.row * HOLE_SPACING_Y;

      const visibleTime = now - mole.appearTime;
      const popDuration = 200; // 弹出/缩回动画时长（毫秒）
      let popProgress = Math.min(visibleTime / popDuration, 1);
      // 地鼠即将消失时执行缩回动画
      if (visibleTime > mole.duration - popDuration) {
        popProgress = Math.max(0, (mole.duration - visibleTime) / popDuration);
      }
      const moleY = baseY - MOLE_RADIUS * popProgress - 10;

      if (popProgress <= 0) continue;

      if (mole.type === 'gold') {
        // ====== 金色地鼠（金色身体 + 皇冠 + 高得分） ======
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd70066';
        ctx.shadowBlur = 12;

        ctx.beginPath();
        ctx.ellipse(cx, moleY + 5, MOLE_RADIUS, MOLE_RADIUS * 1.1, 0, 0, Math.PI * 2);
        ctx.fill();

        // 浅色腹部
        ctx.fillStyle = '#ffed4a';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.ellipse(cx, moleY + 8, MOLE_RADIUS * 0.6, MOLE_RADIUS * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();

        // 白色眼白
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx - 8, moleY - 4, 7, 0, Math.PI * 2);
        ctx.arc(cx + 8, moleY - 4, 7, 0, Math.PI * 2);
        ctx.fill();

        // 黑色瞳孔
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(cx - 6, moleY - 2, 3.5, 0, Math.PI * 2);
        ctx.arc(cx + 10, moleY - 2, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // 眼睛高光
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx - 8, moleY - 6, 2, 0, Math.PI * 2);
        ctx.arc(cx + 8, moleY - 6, 2, 0, Math.PI * 2);
        ctx.fill();

        // 金色皇冠
        ctx.fillStyle = '#b8860b';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('👑', cx, moleY - 14);

        // 鼻子
        ctx.fillStyle = '#4a2510';
        ctx.beginPath();
        ctx.ellipse(cx, moleY + 3, 5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 微笑嘴巴
        ctx.strokeStyle = '#4a2510';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, moleY + 7, 5, 0.2, Math.PI - 0.2);
        ctx.stroke();

        ctx.shadowBlur = 0;
      } else if (mole.type === 'bomb') {
        // ====== 炸弹地鼠（深色身体 + 红色引信 + 骷髅眼） ======
        ctx.fillStyle = '#333';
        ctx.shadowColor = '#ff000066';
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.ellipse(cx, moleY + 5, MOLE_RADIUS, MOLE_RADIUS * 1.1, 0, 0, Math.PI * 2);
        ctx.fill();

        // 引信火花（闪烁效果）
        const sparkPulse = Math.sin(now * 0.01) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(255, 80, 0, ${sparkPulse})`;
        ctx.shadowColor = '#ff4400';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(cx + 5, moleY - MOLE_RADIUS + 5, 5, 0, Math.PI * 2);
        ctx.fill();

        // 引线
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(cx + 5, moleY - MOLE_RADIUS + 10);
        ctx.lineTo(cx + 5, moleY - MOLE_RADIUS + 2);
        ctx.stroke();

        // 白色眼白
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx - 8, moleY - 4, 6, 0, Math.PI * 2);
        ctx.arc(cx + 8, moleY - 4, 6, 0, Math.PI * 2);
        ctx.fill();

        // 红色 X 型瞳孔（表示死亡/危险）
        ctx.fillStyle = '#f00';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('X', cx - 8, moleY - 1);
        ctx.fillText('X', cx + 8, moleY - 1);

        // 生气的嘴巴
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, moleY + 7, 6, 0.1, Math.PI - 0.1);
        ctx.stroke();

        ctx.shadowBlur = 0;
      } else {
        // ====== 普通地鼠（标准棕色外观） ======
        ctx.fillStyle = '#8B4513';
        ctx.shadowColor = '#00000066';
        ctx.shadowBlur = 8;

        ctx.beginPath();
        ctx.ellipse(cx, moleY + 5, MOLE_RADIUS, MOLE_RADIUS * 1.1, 0, 0, Math.PI * 2);
        ctx.fill();

        // 浅色腹部
        ctx.fillStyle = '#A0522D';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.ellipse(cx, moleY + 8, MOLE_RADIUS * 0.6, MOLE_RADIUS * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();

        // 白色眼白
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx - 8, moleY - 4, 7, 0, Math.PI * 2);
        ctx.arc(cx + 8, moleY - 4, 7, 0, Math.PI * 2);
        ctx.fill();

        // 黑色瞳孔
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(cx - 6, moleY - 2, 3.5, 0, Math.PI * 2);
        ctx.arc(cx + 10, moleY - 2, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // 眼睛高光
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx - 8, moleY - 6, 2, 0, Math.PI * 2);
        ctx.arc(cx + 8, moleY - 6, 2, 0, Math.PI * 2);
        ctx.fill();

        // 鼻子
        ctx.fillStyle = '#4a2510';
        ctx.beginPath();
        ctx.ellipse(cx, moleY + 3, 5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 嘴巴
        ctx.strokeStyle = '#4a2510';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, moleY + 7, 5, 0.2, Math.PI - 0.2);
        ctx.stroke();

        // 胡须（左右各两根）
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        // 左胡须
        ctx.beginPath();
        ctx.moveTo(cx - 10, moleY + 3);
        ctx.lineTo(cx - 25, moleY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - 10, moleY + 5);
        ctx.lineTo(cx - 25, moleY + 6);
        ctx.stroke();
        // 右胡须
        ctx.beginPath();
        ctx.moveTo(cx + 10, moleY + 3);
        ctx.lineTo(cx + 25, moleY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 10, moleY + 5);
        ctx.lineTo(cx + 25, moleY + 6);
        ctx.stroke();

        ctx.shadowBlur = 0;
      }
    }
  }, []);

  /**
   * 根据游戏已过时间获取当前难度参数
   * @param elapsed 已过时间（秒）
   * @returns 包含生成间隔、停留时间范围和阶段标识的对象
   */
  const getSpawnParams = useCallback((elapsed: number) => {
    let spawnInterval: number, minDuration: number, maxDuration: number;
    let phaseLabel: 'easy' | 'medium' | 'hard';
    if (elapsed < 10) {
      // 阶段1（0~10秒）：简单，生成慢，停留时间长
      spawnInterval = 800;
      minDuration = 1000;
      maxDuration = 1500;
      phaseLabel = 'easy';
    } else if (elapsed < 20) {
      // 阶段2（10~20秒）：中等，速度加快
      spawnInterval = 600;
      minDuration = 700;
      maxDuration = 1200;
      phaseLabel = 'medium';
    } else {
      // 阶段3（20~30秒）：困难，速度快，停留时间短
      spawnInterval = 400;
      minDuration = 500;
      maxDuration = 900;
      phaseLabel = 'hard';
    }
    return { spawnInterval, minDuration, maxDuration, phaseLabel };
  }, []);

  /**
   * 更新游戏计时器
   * 计算剩余时间、更新阶段、检测是否超时
   */
  const updateTimer = useCallback(() => {
    const g = gameRef.current;
    if (!g.active) return;
    const elapsed = (performance.now() - g.startTime) / 1000;
    const remaining = Math.max(0, GAME_DURATION - elapsed);
    setTimeLeft(Math.ceil(remaining));

    // 根据进度更新难度阶段
    const { phaseLabel } = getSpawnParams(elapsed);
    if (phaseLabel !== g.phase) {
      g.phase = phaseLabel;
      setPhase(phaseLabel);
    }

    // 时间到，游戏结束
    if (remaining <= 0) {
      g.active = false;
      setGameState('over');
      onGameOver?.(g.score);
    }
  }, [getSpawnParams, onGameOver]);

  /**
   * 生成地鼠
   * - 选择未被占据的洞口
   * - 20% 概率生成特殊地鼠（金色或炸弹）
   * - 根据当前阶段决定停留时间
   * 同时最多存在 3 只地鼠
   */
  const spawnMole = useCallback(() => {
    const g = gameRef.current;
    if (!g.active) return;

    // 清理已消失的地鼠
    g.moles = g.moles.filter(m => {
      const visible = performance.now() - m.appearTime < m.duration;
      return visible;
    });

    if (g.moles.length >= 3) return;

    // 计算空闲洞口
    const occupied = new Set(g.moles.map(m => `${m.col},${m.row}`));
    const available: { col: number; row: number }[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!occupied.has(`${c},${r}`)) {
          available.push({ col: c, row: r });
        }
      }
    }

    if (available.length === 0) return;

    const realElapsed = (performance.now() - g.startTime) / 1000;
    const { minDuration, maxDuration } = getSpawnParams(realElapsed);

    const pos = available[Math.floor(Math.random() * available.length)];

    // 20% 概率生成特殊地鼠（金色或炸弹各半）
    const isSpecial = Math.random() < 0.2;
    let type: 'normal' | 'gold' | 'bomb' = 'normal';
    let duration = minDuration + Math.random() * (maxDuration - minDuration);

    if (isSpecial) {
      if (Math.random() < 0.5) {
        // 金色地鼠：价值30分，但停留时间减半
        type = 'gold';
        duration = duration / 2;
      } else {
        // 炸弹地鼠：扣10分，1秒后自动消失
        type = 'bomb';
        duration = 1000;
      }
    }

    g.moles.push({
      col: pos.col,
      row: pos.row,
      appearTime: performance.now(),
      duration,
      type,
    });
    g.lastSpawn = performance.now();
  }, [getSpawnParams]);

  /**
   * 游戏主循环
   * 处理：生成地鼠 → 移除过期地鼠 → 清理反馈效果 → 检查冻结状态 → 渲染 → 更新计时
   */
  const gameLoop = useCallback((timestamp: number) => {
    const g = gameRef.current;
    if (!g.active) {
      draw();
      return;
    }

    const realElapsed = (performance.now() - g.startTime) / 1000;
    const { spawnInterval } = getSpawnParams(realElapsed);

    // 按间隔生成地鼠
    if (timestamp - g.lastSpawn > spawnInterval) {
      spawnMole();
    }

    // 移除已过期的地鼠
    g.moles = g.moles.filter(m => timestamp - m.appearTime < m.duration);

    // 清理过期的反馈效果（400ms后消失）
    g.feedbacks = g.feedbacks.filter(fb => timestamp - fb.time < 400);

    // 检查冻结是否结束
    if (g.frozen && performance.now() >= g.freezeUntil) {
      g.frozen = false;
      g.missCount = 0;
      setFrozen(false);
      setMissCount(0);
    }

    draw();
    updateTimer();

    animRef.current = requestAnimationFrame(gameLoop);
  }, [draw, spawnMole, updateTimer, getSpawnParams]);

  /**
   * 根据像素坐标查找点击了哪个洞口
   * @param x 点击 X 坐标
   * @param y 点击 Y 坐标
   * @returns 洞口所在的网格位置，若未点击到任何洞口则返回 null
   */
  const getHoleAt = useCallback((x: number, y: number): { col: number; row: number } | null => {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cx = GRID_OFFSET_X + c * HOLE_SPACING_X;
        const cy = GRID_OFFSET_Y + r * HOLE_SPACING_Y;
        const dx = x - cx;
        const dy = y - cy;
        // 使用圆形碰撞检测（半径平方比较）
        if (dx * dx + dy * dy < HOLE_RADIUS * HOLE_RADIUS) {
          return { col: c, row: r };
        }
      }
    }
    return null;
  }, []);

  /**
   * 处理点击事件（鼠标点击画布）
   * - 计算点击位置对应的洞口
   * - 如有地鼠则判定为击中，计算分数（含连击倍率）
   * - 如无地鼠则判定为 Miss，累计 Miss 计数
   * - 连续 3 次 Miss 触发 5 秒冻结惩罚
   */
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = gameRef.current;
    if (!g.active) return;
    if (g.frozen) return;

    // 将屏幕坐标转换为画布坐标（考虑 Canvas 缩放）
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const hole = getHoleAt(x, y);
    if (!hole) return;

    const moleIndex = g.moles.findIndex(m => m.col === hole.col && m.row === hole.row);
    if (moleIndex >= 0) {
      // ====== 击中 ======
      const mole = g.moles[moleIndex];
      g.moles.splice(moleIndex, 1);

      let points = 0;
      if (mole.type === 'bomb') {
        // 炸弹：扣 10 分，重置连击
        points = -10;
        g.score += points;
        g.combo = 0;
        setCombo(0);
      } else {
        // 计算连击倍率：1次=1.5x, 3次=2x, 5次=2.5x
        g.combo += 1;
        setCombo(g.combo);
        let multiplier = 1;
        if (g.combo >= 5) {
          multiplier = 2.5;
        } else if (g.combo >= 3) {
          multiplier = 2;
        } else if (g.combo >= 1) {
          multiplier = 1.5;
        }
        points = mole.type === 'gold' ? 30 : 10;
        points = Math.round(points * multiplier);
        g.score += points;
      }

      setScore(g.score);
      onScoreChange?.(g.score);
      g.feedbacks.push({ col: hole.col, row: hole.row, hit: true, time: performance.now(), points });

      // 击中重置 Miss 计数
      g.missCount = 0;
      setMissCount(0);
    } else {
      // ====== 未击中（Miss） ======
      g.combo = 0;
      setCombo(0);
      g.missCount += 1;
      setMissCount(g.missCount);

      g.feedbacks.push({ col: hole.col, row: hole.row, hit: false, time: performance.now() });

      // Miss 达到阈值触发冻结惩罚
      if (g.missCount >= MISS_THRESHOLD) {
        g.frozen = true;
        g.freezeUntil = performance.now() + FREEZE_DURATION;
        setFrozen(true);
        g.missCount = 0;
        setMissCount(0);
      }
    }
  }, [getHoleAt, onScoreChange]);

  /**
   * 获取连击倍率显示文字
   * @returns 如当前有连击则返回 "连击 xN" 字符串，否则返回 null
   */
  const getMultiplierText = useCallback(() => {
    const c = gameRef.current.combo;
    if (c === 0) return null;
    let mult = 1;
    if (c >= 5) mult = 2.5;
    else if (c >= 3) mult = 2;
    else if (c >= 1) mult = 1.5;
    return `Combo x${mult}`;
  }, []);

  /**
   * 开始新游戏：重置所有状态，启动游戏循环
   */
  const startGame = useCallback(() => {
    const now = performance.now();
    gameRef.current = {
      score: 0,
      startTime: now,
      elapsed: 0,
      moles: [],
      feedbacks: [],
      lastSpawn: now,
      active: true,
      combo: 0,
      missCount: 0,
      frozen: false,
      freezeUntil: 0,
      phase: 'easy',
    };
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setCombo(0);
    setPhase('easy');
    setFrozen(false);
    setMissCount(0);
    setGameState('playing');
    onGameStart?.();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop, onGameStart]);

  /** 空闲状态时绘制初始画面 */
  useEffect(() => {
    if (gameState === 'idle') {
      draw();
    }
    return () => {
      if (freezeTimerRef.current) {
        clearTimeout(freezeTimerRef.current);
      }
    };
  }, [gameState, draw]);

  /** 初始化画布尺寸 */
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = CANVAS_W;
      canvasRef.current.height = CANVAS_H;
    }
    draw();
  }, [draw]);

  const phaseText = phase === 'easy' ? 'Easy' : phase === 'medium' ? 'Medium' : 'Hard';

  return (
    <div className="flex flex-col items-center">
      {/* 游戏标题栏：难度、得分、剩余时间 */}
      <div className="flex items-center justify-between w-full max-w-[400px] mb-3">
        <Title level={4} className="!text-white !mb-0">Whack-A-Mole</Title>
        <div className="flex gap-3 items-center">
          <Text className="!text-gray-400">Difficulty: {phaseText}</Text>
          <Text className="!text-gray-400">Score: {score}</Text>
          <Text className="!text-gray-400">Time: {timeLeft}s</Text>
        </div>
      </div>
      {/* 连击倍率提示 */}
      {gameState === 'playing' && getMultiplierText() && (
        <div className="w-full max-w-[400px] text-center mb-1">
          <Text className="!text-yellow-400 !font-bold">{getMultiplierText()}</Text>
        </div>
      )}
      {/* 冻结惩罚提示 */}
      {gameState === 'playing' && frozen && (
        <div className="w-full max-w-[400px] text-center mb-1">
          <Text className="!text-blue-300 !font-bold">⚠️ Frozen 5s!</Text>
        </div>
      )}
      {/* 游戏画布（点击触发地鼠击打） */}
      <canvas
        ref={canvasRef}
        className="rounded-lg border border-dark-600 cursor-pointer"
        width={CANVAS_W}
        height={CANVAS_H}
        onClick={handleClick}
        onTouchEnd={(e) => { e.preventDefault(); const t = e.changedTouches[0]; if (t) handleClick({ clientX: t.clientX, clientY: t.clientY } as any); }}
      />
      {/* 空闲/结束状态按钮 */}
      {gameState === 'idle' && (
        <Button type="primary" className="mt-4" onClick={startGame}>Start Game</Button>
      )}
      {gameState === 'over' && (
        <div className="mt-4 text-center">
          <Text className="!text-red-400 !block mb-2">Game Over! Score: {score}</Text>
          <Button type="primary" onClick={startGame}>Restart</Button>
        </div>
      )}
      {/* 游戏中操作提示 */}
      {gameState === 'playing' && !frozen && (
        <Text className="!text-gray-500 !text-xs mt-2">Click the moles to whack them!</Text>
      )}
    </div>
  );
};

export default WhackAMole;
