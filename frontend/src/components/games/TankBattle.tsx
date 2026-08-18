/**
 * TankBattle.tsx - 坦克大战游戏组件
 *
 * 游戏玩法概述：
 * 玩家操控一辆绿色坦克在网格地图上移动并射击敌人。
 * 地图上有砖墙提供掩护，玩家必须保护己方基地（金色方框）不被敌人摧毁。
 * 敌人有侦察兵（scout）、士兵（soldier）和精英（elite）三种类型，
 * 每消灭一定数量敌人即可进入下一波次（wave），敌人强度和数量递增。
 * 支持键盘（方向键/WASD移动，空格/Enter射击）、触摸滑动和虚拟手柄操控。
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
const CANVAS_W = 400;       // 画布宽度
const CANVAS_H = 400;       // 画布高度
const GRID = 20;            // 网格单元大小（像素）
const COLS = CANVAS_W / GRID; // 网格列数（20）
const ROWS = CANVAS_H / GRID; // 网格行数（20）

/** 方向枚举 */
type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

/** 坐标位置接口（网格坐标） */
interface Pos {
  x: number;
  y: number;
}

/** 子弹数据结构 */
interface Bullet {
  x: number;
  y: number;
  dir: Dir;
}

/** 敌方坦克数据结构 */
interface EnemyTank {
  x: number;
  y: number;
  dir: Dir;
  moveTimer: number;    // 移动倒计时（帧数）
  shootTimer: number;   // 射击倒计时（帧数）
  type: 'scout' | 'soldier' | 'elite'; // 坦克类型
  hp: number;           // 生命值（精英有3点，其余1点）
}

/** 砖墙模块数据结构 */
interface Wall {
  x: number;
  y: number;
}

/** 己方基地所在网格坐标（底部中央） */
const BASE_POS: Pos = { x: 9, y: 18 };

/**
 * 构建初始地图墙体布局
 * 分为左侧、右侧、中间和基地周围多组墙体
 * @returns 墙体坐标数组
 */
function buildWalls(): Wall[] {
  const w: Wall[] = [];
  // 左侧墙体集群
  for (let i = 0; i < 3; i++) w.push({ x: 3, y: 3 + i });
  for (let i = 0; i < 3; i++) w.push({ x: 4, y: 5 + i });
  // 右侧墙体集群
  for (let i = 0; i < 3; i++) w.push({ x: 16, y: 3 + i });
  for (let i = 0; i < 3; i++) w.push({ x: 15, y: 5 + i });
  // 中间墙体
  w.push({ x: 7, y: 8 }, { x: 8, y: 8 }, { x: 11, y: 8 }, { x: 12, y: 8 });
  w.push({ x: 7, y: 9 }, { x: 12, y: 9 });
  // 基地附近的保护墙体
  w.push({ x: 6, y: 15 }, { x: 7, y: 15 }, { x: 8, y: 15 });
  w.push({ x: 11, y: 15 }, { x: 12, y: 15 }, { x: 13, y: 15 });
  // 散布墙体
  w.push({ x: 5, y: 11 }, { x: 6, y: 11 });
  w.push({ x: 13, y: 11 }, { x: 14, y: 11 });
  return w;
}

/**
 * 判断指定网格位置是否为墙体
 * @param x 网格列坐标
 * @param y 网格行坐标
 * @param walls 墙体数组
 */
function isWall(x: number, y: number, walls: Wall[]): boolean {
  return walls.some(w => w.x === x && w.y === y);
}

/**
 * 判断坐标是否在可移动范围内
 */
function isInside(x: number, y: number): boolean {
  return x >= 0 && x < COLS && y >= 0 && y < ROWS;
}

/**
 * 生成敌人随机出生位置
 * 从地图顶部边缘或左右两侧上方的随机位置生成
 */
function randomEnemyPos(): Pos {
  const side = Math.floor(Math.random() * 3);
  if (side === 0) return { x: Math.floor(Math.random() * COLS), y: 0 };
  if (side === 1) return { x: 0, y: Math.floor(Math.random() * 6) };
  return { x: COLS - 1, y: Math.floor(Math.random() * 6) };
}

/**
 * 根据方向返回对应的坐标偏移量
 * @param dir 方向
 * @returns {x, y} 偏移量
 */
function dirDelta(dir: Dir): Pos {
  switch (dir) {
    case 'UP': return { x: 0, y: -1 };
    case 'DOWN': return { x: 0, y: 1 };
    case 'LEFT': return { x: -1, y: 0 };
    case 'RIGHT': return { x: 1, y: 0 };
  }
}

/**
 * TankBattle 坦克大战游戏主组件
 * 使用 Canvas 渲染网格地图，包含敌方 AI、碰撞检测、波次推进等完整游戏逻辑
 */
const TankBattle: React.FC<GameProps> = ({ onScoreChange, onGameOver, onGameStart }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /** 当前得分 */
  const [score, setScore] = useState(0);
  /** 玩家剩余生命数 */
  const [lives, setLives] = useState(3);
  /** 游戏状态 */
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle');

  /** 动画帧 ID */
  const animRef = useRef<number>(0);
  /** 上次逻辑更新的时间戳 */
  const lastTickRef = useRef(0);
  /** 逻辑更新间隔（毫秒），控制游戏速度 */
  const TICK_INTERVAL = 120;

  /** 游戏核心数据引用（全部可变状态集中管理，避免闭包陷阱） */
  const gameRef = useRef({
    player: { x: 9, y: 16 } as Pos,  // 玩家位置
    dir: 'UP' as Dir,                  // 玩家朝向
    lives: 3,                          // 剩余生命
    score: 0,                          // 实时分数
    bullets: [] as Bullet[],           // 子弹列表
    enemies: [] as EnemyTank[],        // 敌方坦克列表
    walls: buildWalls(),               // 墙体布局
    baseAlive: true,                   // 基地是否存活
    enemySpawnTimer: 0,                // 敌人生成倒计时
    maxEnemies: 6,                     // 最大同时敌人数
    dead: false,                       // 玩家是否死亡
    wave: 1,                           // 当前波次
    totalKilled: 0,                    // 累计杀敌数
    baseAlert: false,                  // 基地是否受到威胁（用于 AI 行为决策）
  });

  /**
   * 绘制一帧游戏画面
   * 绘制顺序：背景网格 → 砖墙 → 基地 → 子弹 → 敌方坦克 → 玩家坦克
   */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const g = gameRef.current;

    // 深色背景
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // 网格线
    ctx.strokeStyle = '#16213e';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * GRID, 0);
      ctx.lineTo(i * GRID, CANVAS_H);
      ctx.stroke();
    }
    for (let i = 0; i <= ROWS; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * GRID);
      ctx.lineTo(CANVAS_W, i * GRID);
      ctx.stroke();
    }

    // 绘制砖墙（棕色带阴影和砖纹）
    g.walls.forEach(w => {
      ctx.fillStyle = '#8b4513';
      ctx.shadowColor = '#8b4513';
      ctx.shadowBlur = 3;
      ctx.fillRect(w.x * GRID + 1, w.y * GRID + 1, GRID - 2, GRID - 2);
      ctx.strokeStyle = '#6b3410';
      ctx.lineWidth = 1;
      ctx.strokeRect(w.x * GRID + 1, w.y * GRID + 1, GRID - 2, GRID - 2);
    });
    ctx.shadowBlur = 0;

    // 绘制己方基地（金色发光方块 + 旗帜）
    if (g.baseAlive) {
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 10;
      const bx = BASE_POS.x * GRID;
      const by = BASE_POS.y * GRID;
      ctx.fillRect(bx + 2, by + 2, GRID - 4, GRID - 4);
      // 旗帜
      ctx.fillStyle = '#e94560';
      ctx.fillRect(bx + 8, by - 4, 4, GRID + 4);
      ctx.beginPath();
      ctx.moveTo(bx + 12, by - 4);
      ctx.lineTo(bx + 12, by + 4);
      ctx.lineTo(bx + 6, by);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 绘制子弹（白色发光圆点）
    ctx.shadowBlur = 0;
    g.bullets.forEach(b => {
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(b.x * GRID + GRID / 2, b.y * GRID + GRID / 2, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    // 绘制敌方坦克（不同类型不同颜色）
    g.enemies.forEach(e => {
      const eColor = e.type === 'scout' ? '#4488ff' : e.type === 'elite' ? '#aa44ff' : '#e94560';
      ctx.fillStyle = eColor;
      ctx.shadowColor = eColor;
      ctx.shadowBlur = 6;
      drawTank(ctx, e.x * GRID + 2, e.y * GRID + 2, e.dir);
      // 精英坦克显示剩余 HP
      if (e.type === 'elite' && e.hp > 1) {
        ctx.fillStyle = '#fff';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(String(e.hp), e.x * GRID + GRID / 2, e.y * GRID + 4);
      }
      ctx.shadowBlur = 0;
    });

    // 绘制玩家坦克（绿色发光）
    if (g.lives > 0 && !g.dead) {
      ctx.fillStyle = '#4ecca3';
      ctx.shadowColor = '#4ecca3';
      ctx.shadowBlur = 8;
      drawTank(ctx, g.player.x * GRID + 2, g.player.y * GRID + 2, g.dir);
      ctx.shadowBlur = 0;
    }
  }, []);

  /**
   * 绘制单个坦克（含炮管）
   * @param ctx Canvas 上下文
   * @param x 左上角 X 坐标（像素）
   * @param y 左上角 Y 坐标（像素）
   * @param dir 炮管朝向
   */
  function drawTank(ctx: CanvasRenderingContext2D, x: number, y: number, dir: Dir) {
    const s = GRID - 4;
    const cx = x + s / 2;
    const cy = y + s / 2;
    // 坦克车体
    ctx.fillRect(x, y, s, s);
    // 炮管底座
    ctx.fillStyle = ctx.fillStyle;
    ctx.fillRect(cx - 2, cy - 2, 4, 4);
    let bx = cx, by = cy;
    // 根据朝向绘制炮管
    switch (dir) {
      case 'UP': bx = cx - 2; by = y - 4; ctx.fillRect(bx, by, 4, 6); break;
      case 'DOWN': bx = cx - 2; by = y + s; ctx.fillRect(bx, by, 4, 6); break;
      case 'LEFT': bx = x - 4; by = cy - 2; ctx.fillRect(bx, by, 6, 4); break;
      case 'RIGHT': bx = x + s; by = cy - 2; ctx.fillRect(bx, by, 6, 4); break;
    }
  }

  /**
   * 游戏逻辑更新（由定时器驱动，每秒约 8 次）
   * 处理：子弹移动与碰撞 → 敌人 AI 寻路 → 敌人射击 → 敌人生成
   */
  const tick = useCallback(() => {
    const g = gameRef.current;
    if (g.dead) return;

    // ========== 子弹逻辑 ==========
    const newBullets: Bullet[] = [];
    for (const b of g.bullets) {
      const d = dirDelta(b.dir);
      const nx = b.x + d.x;
      const ny = b.y + d.y;
      // 超出边界则消失
      if (!isInside(nx, ny)) continue;
      // 击中墙体则摧毁墙体，子弹消失
      if (isWall(nx, ny, g.walls)) {
        g.walls = g.walls.filter(w => !(w.x === nx && w.y === ny));
        continue;
      }
      // 检测子弹是否击中敌人
      let hitEnemy = false;
      for (let i = g.enemies.length - 1; i >= 0; i--) {
        const e = g.enemies[i];
        if (e.x === nx && e.y === ny) {
          e.hp -= 1;
          if (e.hp <= 0) {
            g.enemies.splice(i, 1);
            // 不同类型敌人分数不同
            const points = e.type === 'elite' ? 30 : e.type === 'scout' ? 5 : 10;
            g.score += points;
            g.totalKilled += 1;
            // 波次推进：每击杀 wave*5 个敌人进入下一波
            if (g.totalKilled >= g.wave * 5) {
              g.wave += 1;
              g.maxEnemies = Math.min(8, 3 + g.wave);
            }
            setScore(g.score);
            onScoreChange?.(g.score);
          }
          hitEnemy = true;
          break;
        }
      }
      if (hitEnemy) continue;
      // 子弹击中玩家
      if (nx === g.player.x && ny === g.player.y) {
        g.lives -= 1;
        setLives(g.lives);
        if (g.lives <= 0) {
          g.dead = true;
          setGameState('over');
          onGameOver?.(g.score);
          return;
        }
        // 玩家重生
        g.player = { x: 9, y: 16 };
        continue;
      }
      newBullets.push({ x: nx, y: ny, dir: b.dir });
    }
    g.bullets = newBullets;

    // 检测基地是否受到威胁（曼哈顿距离 <= 3）
    g.baseAlert = g.enemies.some(e =>
      Math.abs(e.x - BASE_POS.x) + Math.abs(e.y - BASE_POS.y) <= 3
    );

    // ========== 敌方 AI 移动逻辑 ==========
    for (const e of g.enemies) {
      e.moveTimer--;
      if (e.moveTimer <= 0) {
        // 不同敌人移动速度不同：侦察兵最快，精英最慢
        e.moveTimer = e.type === 'scout' ? 2 : e.type === 'elite' ? 4 : 3;
        // AI 寻路目标：基地受威胁时优先冲向基地，否则 70% 追踪玩家，30% 攻击基地
        const target = g.baseAlert ? BASE_POS : (Math.random() < 0.7 ? g.player : BASE_POS);
        const dx = target.x - e.x;
        const dy = target.y - e.y;
        let nd: Dir;
        // 优先沿距离较大的轴向移动
        if (Math.abs(dx) > Math.abs(dy)) {
          nd = dx > 0 ? 'RIGHT' : 'LEFT';
        } else {
          nd = dy > 0 ? 'DOWN' : 'UP';
        }
        // 尝试主方向移动，若被阻挡则尝试垂直方向
        const d = dirDelta(nd);
        const nx = e.x + d.x;
        const ny = e.y + d.y;
        if (isInside(nx, ny) && !isWall(nx, ny, g.walls) &&
            !g.enemies.some(oe => oe !== e && oe.x === nx && oe.y === ny) &&
            !(nx === g.player.x && ny === g.player.y)) {
          e.x = nx;
          e.y = ny;
          e.dir = nd;
        } else {
          // 备选方向：尝试垂直于主方向的移动
          const perpDirs: Dir[] = nd === 'UP' || nd === 'DOWN' ? ['LEFT', 'RIGHT'] : ['UP', 'DOWN'];
          for (const pd of perpDirs) {
            const pd2 = dirDelta(pd);
            const pnx = e.x + pd2.x;
            const pny = e.y + pd2.y;
            if (isInside(pnx, pny) && !isWall(pnx, pny, g.walls) &&
                !g.enemies.some(oe => oe !== e && oe.x === pnx && oe.y === pny)) {
              e.x = pnx;
              e.y = pny;
              e.dir = pd;
              break;
            }
          }
        }
      }
      // 检查敌人是否抵达基地（游戏失败条件）
      if (e.x === BASE_POS.x && e.y === BASE_POS.y) {
        g.baseAlive = false;
        g.dead = true;
        setGameState('over');
        onGameOver?.(g.score);
        return;
      }
    }

    // ========== 敌方射击逻辑 ==========
    for (const e of g.enemies) {
      // 侦察兵不开枪
      if (e.type === 'scout') continue;
      e.shootTimer--;
      if (e.shootTimer <= 0) {
        // 精英射速更快，且随波次增加加快
        const interval = e.type === 'elite' ? Math.max(10, 25 - g.wave * 2) : Math.max(15, 25 - g.wave * 2);
        e.shootTimer = interval + Math.floor(Math.random() * 10);
        const d = dirDelta(e.dir);
        const bx = e.x + d.x;
        const by = e.y + d.y;
        if (isInside(bx, by) && !isWall(bx, by, g.walls)) {
          g.bullets.push({ x: bx, y: by, dir: e.dir });
        }
      }
    }

    // ========== 生成敌人 ==========
    g.enemySpawnTimer--;
    if (g.enemySpawnTimer <= 0 && g.enemies.length < g.maxEnemies) {
      // 生成间隔随波次缩短
      g.enemySpawnTimer = Math.max(15, 50 - g.wave * 3) + Math.floor(Math.random() * 10);
      const pos = randomEnemyPos();
      const dirs: Dir[] = ['DOWN', 'RIGHT', 'LEFT'];
      const roll = Math.random();
      let type: 'scout' | 'soldier' | 'elite';
      // 波次 >= 3 时有 20% 概率生成精英坦克
      if (g.wave >= 3 && roll < 0.2) {
        type = 'elite';
      } else if (g.wave <= 2 || roll < 0.6) {
        type = 'soldier';
      } else {
        type = 'scout';
      }
      g.enemies.push({
        x: pos.x,
        y: pos.y,
        dir: dirs[Math.floor(Math.random() * dirs.length)],
        moveTimer: Math.floor(Math.random() * 3),
        shootTimer: 10 + Math.floor(Math.random() * 10),
        type,
        hp: type === 'elite' ? 3 : 1,
      });
    }
  }, [onScoreChange, onGameOver]);

  /**
   * 游戏主循环
   * 控制逻辑更新频率（TICK_INTERVAL），逻辑更新与渲染分离
   */
  const gameLoop = useCallback((timestamp: number) => {
    if (gameRef.current.dead) return;
    animRef.current = requestAnimationFrame(gameLoop);

    // 时间控制：未达到更新间隔则只渲染不更新逻辑
    if (timestamp - lastTickRef.current < TICK_INTERVAL) {
      draw();
      return;
    }
    lastTickRef.current = timestamp;

    tick();
    draw();
  }, [draw, tick]);

  /**
   * 开始新游戏：重置所有状态，启动游戏循环
   */
  const startGame = useCallback(() => {
    gameRef.current = {
      player: { x: 9, y: 16 },
      dir: 'UP',
      lives: 3,
      score: 0,
      bullets: [],
      enemies: [],
      walls: buildWalls(),
      baseAlive: true,
      enemySpawnTimer: 30,
      maxEnemies: 6,
      dead: false,
      wave: 1,
      totalKilled: 0,
      baseAlert: false,
    };
    setScore(0);
    setLives(3);
    setGameState('playing');
    onGameStart?.();
    lastTickRef.current = 0;
    animRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop, onGameStart]);

  // ==================== 键盘控制 ====================
  /**
   * 键盘事件监听
   * - 方向键/WASD：移动和转向
   * - 空格/Enter：开火
   */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (g.dead) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        // 发射子弹：朝当前方向发射，同一方向最多2颗子弹
        const d = dirDelta(g.dir);
        const bx = g.player.x + d.x;
        const by = g.player.y + d.y;
        if (isInside(bx, by) && !isWall(bx, by, g.walls) &&
            g.bullets.filter(b => b.dir === g.dir).length < 2) {
          g.bullets.push({ x: bx, y: by, dir: g.dir });
        }
        return;
      }
      // 方向映射
      const keyDir: Record<string, Dir> = {
        'ArrowUp': 'UP', 'ArrowDown': 'DOWN', 'ArrowLeft': 'LEFT', 'ArrowRight': 'RIGHT',
        'w': 'UP', 'W': 'UP', 's': 'DOWN', 'S': 'DOWN', 'a': 'LEFT', 'A': 'LEFT', 'd': 'RIGHT', 'D': 'RIGHT',
      };
      const dir = keyDir[e.key];
      if (!dir) return;
      e.preventDefault();
      g.dir = dir;
      // 尝试移动，遇到墙体/敌人/基地则停留在原地
      const d = dirDelta(dir);
      const nx = g.player.x + d.x;
      const ny = g.player.y + d.y;
      if (isInside(nx, ny) && !isWall(nx, ny, g.walls) &&
          !g.enemies.some(en => en.x === nx && en.y === ny) &&
          !(nx === BASE_POS.x && ny === BASE_POS.y)) {
        g.player.x = nx;
        g.player.y = ny;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // ==================== 触摸滑动控制 ====================
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  /** 处理方向触摸输入 */
  const handleDirection = useCallback((dir: Dir) => {
    const g = gameRef.current;
    if (g.dead) return;
    g.dir = dir;
    const d = dirDelta(dir);
    const nx = g.player.x + d.x;
    const ny = g.player.y + d.y;
    if (isInside(nx, ny) && !isWall(nx, ny, g.walls) &&
        !g.enemies.some(en => en.x === nx && en.y === ny) &&
        !(nx === BASE_POS.x && ny === BASE_POS.y)) {
      g.player.x = nx;
      g.player.y = ny;
    }
  }, []);

  /** 处理射击触摸输入 */
  const handleShoot = useCallback(() => {
    const g = gameRef.current;
    if (g.dead) return;
    const d = dirDelta(g.dir);
    const bx = g.player.x + d.x;
    const by = g.player.y + d.y;
    if (isInside(bx, by) && !isWall(bx, by, g.walls) &&
        g.bullets.filter(b => b.dir === g.dir).length < 2) {
      g.bullets.push({ x: bx, y: by, dir: g.dir });
    }
  }, []);

  /** 触摸滑动事件监听：通过滑动方向判定移动/射击 */
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
      // 判断为水平还是垂直滑动
      if (Math.abs(dx) > Math.abs(dy)) {
        handleDirection(dx > 0 ? 'RIGHT' : 'LEFT');
      } else {
        handleDirection(dy > 0 ? 'DOWN' : 'UP');
      }
    };
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleDirection]);

  /** 组件卸载时取消动画帧 */
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  /** 空闲状态时绘制初始画面 */
  useEffect(() => {
    if (gameState === 'idle') {
      draw();
    }
  }, [gameState, draw]);

  /** 初始化画布尺寸 */
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = CANVAS_W;
      canvasRef.current.height = CANVAS_H;
    }
    draw();
  }, [draw]);

  return (
    <div className="flex flex-col items-center">
      {/* 游戏标题栏 */}
      <div className="flex items-center justify-between w-full max-w-[400px] mb-3">
        <Title level={4} className="!text-white !mb-0">Tank Battle</Title>
        <div className="flex items-center gap-3">
          <Text className="!text-gray-400">Score: {score}</Text>
          <Text className="!text-yellow-400">Wave: {gameRef.current.wave}</Text>
          <Text className="!text-green-400">Lives: {lives}</Text>
        </div>
      </div>
      {/* 游戏画布 */}
      <canvas
        ref={canvasRef}
        className="rounded-lg border border-dark-600"
        width={CANVAS_W}
        height={CANVAS_H}
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
      {/* 游戏中：操作提示和虚拟手柄 */}
      {gameState === 'playing' && (
        <>
          <Text className="!text-gray-500 !text-xs mt-2">Arrow keys / WASD to move, Space / Enter to shoot | Swipe / virtual buttons</Text>
          <VirtualGamepad
            directions={{
              up: () => handleDirection('UP'),
              down: () => handleDirection('DOWN'),
              left: () => handleDirection('LEFT'),
              right: () => handleDirection('RIGHT'),
              fire: handleShoot,
            }}
            actions={[{ label: 'Shoot', action: handleShoot }]}
          />
        </>
      )}
    </div>
  );
};

export default TankBattle;
