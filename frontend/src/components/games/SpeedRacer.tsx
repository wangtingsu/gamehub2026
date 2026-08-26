/**
 * SpeedRacer.tsx - 极速赛车游戏组件
 *
 * 游戏玩法概述：
 * 玩家控制一辆赛车在4车道公路上行驶，躲避前方驶来的障碍车辆。
 * 障碍物有多种类型（普通车、蛇形车、卡车、路障），
 * 游戏速度会随时间逐渐增加，难度递增。
 * 玩家可通过方向键左右移动、触摸滑动或虚拟按钮来控制车辆变道。
 * 碰撞障碍物则游戏结束，尽可能获得更高分数。
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Typography } from 'antd';

const { Title, Text } = Typography;

/** 游戏组件对外属性接口 */
interface GameProps {
  onScoreChange?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onGameStart?: () => void;
}

// ==================== 游戏常量配置 ====================
const CANVAS_W = 350;          // 画布宽度
const CANVAS_H = 500;          // 画布高度
const LANE_COUNT = 4;          // 车道数量
const LANE_W = 60;             // 每条车道宽度
const ROAD_LEFT = 55;          // 道路左侧边缘偏移
const CAR_W = 44;              // 车辆宽度
const CAR_H = 70;              // 车辆高度
const INITIAL_SPEED = 3;       // 初始速度
const MAX_SPEED = 10;          // 最大速度上限
const SPEED_INCREMENT = 0.003; // 每帧速度增量（加速难度）

/** 障碍物类型枚举 */
type ObstacleType = 'normal' | 'swerver' | 'truck' | 'barrier';

/** 障碍物数据结构 */
interface Obstacle {
  x: number;
  y: number;
  color: string;
  lane: number;           // 所在车道
  type: ObstacleType;     // 障碍物类型
  swerveTimer?: number;   // 蛇形车换道倒计时（帧数）
  laneHalf?: boolean;     // 卡车占1.5车道标识
  spawnLane?: number;     // 路障初始车道（用于碰撞检测参考）
}

/** 车辆颜色调色板 */
const CAR_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1'];

/**
 * SpeedRacer 极速赛车游戏主组件
 * 使用 Canvas 实现渲染，包含键盘/触摸/按钮多种操控方式
 */
const SpeedRacer: React.FC<GameProps> = ({ onScoreChange, onGameOver, onGameStart }) => {
  const { t } = useTranslation('games');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /** 当前得分 */
  const [score, setScore] = useState(0);
  /** 历史最高分（持久化在当前会话） */
  const [highScore, setHighScore] = useState(0);
  /** 游戏状态：idle-待开始 / playing-进行中 / over-已结束 */
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle');

  /** 动画帧 ID（用于取消动画） */
  const animRef = useRef<number>(0);
  /** 游戏核心数据引用（避免闭包陷阱，所有可变游戏状态存在此处） */
  const gameRef = useRef({
    playerLane: 1,            // 玩家当前车道（0~3）
    speed: INITIAL_SPEED,     // 当前速度
    score: 0,                 // 实时分数
    obstacles: [] as Obstacle[], // 障碍物列表
    roadOffset: 0,            // 道路滚动偏移（实现动态效果）
    active: false,            // 是否正在运行
    lastSpawn: 0,             // 上次生成障碍物时间戳
    spawnInterval: 1200,      // 当前生成间隔（毫秒）
  });

  /**
   * 根据车道编号计算车辆的 X 坐标
   * @param lane 车道编号 (0 ~ LANE_COUNT-1)
   */
  const getLaneX = useCallback((lane: number): number => {
    return ROAD_LEFT + lane * LANE_W + (LANE_W - CAR_W) / 2;
  }, []);

  /**
   * 绘制圆角矩形（Canvas 辅助方法）
   */
  const roundRect = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }, []);

  /**
   * 绘制一辆汽车（包含车身、车窗、车灯等细节）
   * @param isPlayer 是否为玩家车辆（添加高亮和指示箭头）
   */
  const drawCar = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, color: string, isPlayer: boolean) => {
    // 车辆阴影
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + 3, y + 3, CAR_W, CAR_H);

    // 车身主体
    ctx.fillStyle = color;
    ctx.shadowColor = isPlayer ? '#fff' : 'transparent';
    ctx.shadowBlur = isPlayer ? 8 : 0;
    roundRect(ctx, x, y, CAR_W, CAR_H, 6);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 前挡风玻璃
    ctx.fillStyle = 'rgba(150, 200, 255, 0.6)';
    roundRect(ctx, x + 6, y + 12, CAR_W - 12, 18, 4);
    ctx.fill();

    // 后窗
    ctx.fillStyle = 'rgba(150, 200, 255, 0.4)';
    roundRect(ctx, x + 8, y + CAR_H - 28, CAR_W - 16, 14, 3);
    ctx.fill();

    // 侧窗
    ctx.fillStyle = 'rgba(100, 160, 220, 0.5)';
    ctx.fillRect(x + 2, y + 16, 5, 12);
    ctx.fillRect(x + CAR_W - 7, y + 16, 5, 12);

    // 前车灯（带发光效果）
    ctx.fillStyle = '#ffe066';
    ctx.shadowColor = '#ffe066';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(x + 8, y + 3, 4, 0, Math.PI * 2);
    ctx.arc(x + CAR_W - 8, y + 3, 4, 0, Math.PI * 2);
    ctx.fill();

    // 尾灯（红色发光）
    ctx.fillStyle = '#ff3333';
    ctx.shadowColor = '#ff3333';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(x + 8, y + CAR_H - 4, 3, 0, Math.PI * 2);
    ctx.arc(x + CAR_W - 8, y + CAR_H - 4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 车顶细节
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    roundRect(ctx, x + 8, y + 16, CAR_W - 16, 10, 3);
    ctx.fill();

    // 玩家指示器（车顶绿色箭头）
    if (isPlayer) {
      ctx.fillStyle = '#4ecca3';
      ctx.beginPath();
      ctx.moveTo(x + CAR_W / 2, y - 8);
      ctx.lineTo(x + CAR_W / 2 - 6, y - 2);
      ctx.lineTo(x + CAR_W / 2 + 6, y - 2);
      ctx.fill();
    }
  }, [roundRect]);

  /**
   * 绘制卡车（比普通车更宽，占据更多车道空间）
   */
  const drawTruck = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const tw = CAR_W * 1.35;
    const th = CAR_H;

    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + 3, y + 3, tw, th);

    // 车身主体
    ctx.fillStyle = '#1e3a5f';
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    roundRect(ctx, x, y, tw, th, 6);
    ctx.fill();

    // 货箱区域
    ctx.fillStyle = '#2a4a7f';
    roundRect(ctx, x + 4, y + 6, tw - 8, th - 30, 4);
    ctx.fill();

    // 货箱条纹装饰
    ctx.strokeStyle = '#3a5a8f';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const ly = y + 12 + i * 14;
      ctx.beginPath();
      ctx.moveTo(x + 6, ly);
      ctx.lineTo(x + tw - 6, ly);
      ctx.stroke();
    }

    // 驾驶室
    ctx.fillStyle = '#1a3a5f';
    roundRect(ctx, x + tw * 0.2, y + th - 28, tw * 0.6, 22, 4);
    ctx.fill();

    // 车窗
    ctx.fillStyle = 'rgba(150, 200, 255, 0.5)';
    ctx.fillRect(x + tw * 0.3, y + th - 24, tw * 0.15, 10);
    ctx.fillRect(x + tw * 0.55, y + th - 24, tw * 0.15, 10);

    // 尾灯
    ctx.fillStyle = '#ff3333';
    ctx.shadowColor = '#ff3333';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(x + 6, y + th - 5, 3, 0, Math.PI * 2);
    ctx.arc(x + tw - 6, y + th - 5, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [roundRect]);

  /**
   * 绘制路障（橙色条纹方块，带有反光亮点）
   */
  const drawBarrier = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const bw = LANE_W - 8;
    const bh = 20;

    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(x + 2, y + 2, bw, bh);

    // 底色
    ctx.fillStyle = '#ff8c00';
    roundRect(ctx, x, y, bw, bh, 3);
    ctx.fill();

    // 警示条纹
    ctx.fillStyle = '#ffcc00';
    for (let i = 0; i < 4; i++) {
      const sx = x + i * (bw / 4);
      ctx.fillRect(sx, y, bw / 8, bh);
    }

    // 边框
    ctx.strokeStyle = '#cc6600';
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, bw, bh, 3);
    ctx.stroke();

    // 红色反光点（发光效果）
    ctx.fillStyle = '#ff4444';
    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(x + bw / 2, y + bh / 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [roundRect]);

  /**
   * 绘制道路（草地、路面、车道标线、中心黄线）
   * 道路滚动偏移量产生行驶的视觉动效
   */
  const drawRoad = useCallback((ctx: CanvasRenderingContext2D) => {
    const { roadOffset } = gameRef.current;

    // 草地背景
    ctx.fillStyle = '#2d5a27';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // 灰色路面
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(ROAD_LEFT - 10, 0, LANE_COUNT * LANE_W + 20, CANVAS_H);

    // 道路白色边缘线
    ctx.fillStyle = '#fff';
    ctx.fillRect(ROAD_LEFT - 10, 0, 4, CANVAS_H);
    ctx.fillRect(ROAD_LEFT + LANE_COUNT * LANE_W + 16, 0, 4, CANVAS_H);

    // 车道虚线标线（根据 roadOffset 滚动）
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 15]);
    for (let i = 1; i < LANE_COUNT; i++) {
      const lx = ROAD_LEFT + i * LANE_W - 1.5;
      ctx.beginPath();
      ctx.moveTo(lx, roadOffset);
      ctx.lineTo(lx, roadOffset + CANVAS_H + 20);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // 道路中心黄色实线（带滚动效果）
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 4;
    ctx.setLineDash([30, 20]);
    const centerX = ROAD_LEFT + (LANE_COUNT * LANE_W) / 2 - 2;
    ctx.beginPath();
    ctx.moveTo(centerX, roadOffset * 0.7);
    ctx.lineTo(centerX, roadOffset * 0.7 + CANVAS_H + 20);
    ctx.stroke();
    ctx.setLineDash([]);
  }, []);

  /**
   * 碰撞检测 - AABB 包围盒碰撞检测算法
   * 根据不同障碍物类型采用不同的碰撞判定规则：
   * - 路障：检测是否在同一车道
   * - 卡车：使用缩小的碰撞箱提高宽容度
   * - 普通/蛇形车：标准矩形碰撞检测
   * @param playerLane 玩家当前车道
   * @param obstacles 障碍物列表
   * @returns true 表示发生碰撞
   */
  const checkCollision = useCallback((playerLane: number, obstacles: Obstacle[]): boolean => {
    const px = getLaneX(playerLane);
    const py = CANVAS_H - CAR_H - 10;

    for (const obs of obstacles) {
      if (obs.type === 'barrier') {
        // 路障：完全阻挡整个车道，只检测 Y 轴重叠
        if (obs.lane === playerLane) {
          const oy = obs.y;
          const overlapY = py < oy + 20 && py + CAR_H > oy;
          if (overlapY) return true;
        }
        continue;
      }

      if (obs.type === 'truck') {
        // 卡车视觉上宽大但碰撞箱缩窄，提高游戏公平性
        const truckVisualWidth = CAR_W * 1.35;
        const truckHitWidth = CAR_W * 1.1;
        const ox = getLaneX(obs.lane) + (truckVisualWidth - truckHitWidth) / 2;
        const oy = obs.y;

        const overlapX = px < ox + truckHitWidth && px + CAR_W > ox;
        const overlapY = py < oy + CAR_H && py + CAR_H > oy;
        if (overlapX && overlapY) return true;
        continue;
      }

      // 标准障碍物 AABB 碰撞检测
      const ox = getLaneX(obs.lane);
      const oy = obs.y;

      const overlapX = px < ox + CAR_W && px + CAR_W > ox;
      const overlapY = py < oy + CAR_H && py + CAR_H > oy;
      if (overlapX && overlapY) return true;
    }
    return false;
  }, [getLaneX]);

  /**
   * 生成障碍物
   * - 随机选择车道，确保该车道顶部区域没有障碍物堆积
   * - 根据当前速度决定障碍物类型（速度越高越可能出现特殊类型）
   * - 蛇形车（swerver）会分配一个换到定时器
   */
  const spawnObstacle = useCallback(() => {
    const g = gameRef.current;
    const lane = Math.floor(Math.random() * LANE_COUNT);

    // 检查目标车道顶部（生成区）是否已有障碍物
    const tooClose = g.obstacles.some(o => o.lane === lane && o.y < 150);
    if (tooClose) return;

    // 根据速度概率决定障碍物类型
    let type: ObstacleType = 'normal';
    const roll = Math.random();

    if (g.speed > 4 && roll < 0.05) {
      // 5% 概率生成路障（静止不动）
      type = 'barrier';
    } else if (g.speed > 4 && roll < 0.15) {
      // 10% 概率生成卡车
      type = 'truck';
    } else if (g.speed > 4 && roll < 0.35) {
      // 20% 概率生成蛇形车
      type = 'swerver';
    }

    const color = type === 'normal' ? '#4ade80' :
                  type === 'swerver' ? '#e94560' :
                  type === 'truck' ? '#1e3a5f' : '#ff8c00';

    const obstacle: Obstacle = {
      x: getLaneX(lane),
      y: -CAR_H - 20,
      color,
      lane,
      type,
    };

    // 蛇形车：设置换道定时器（30~60帧后换道）
    if (type === 'swerver') {
      obstacle.swerveTimer = 30 + Math.floor(Math.random() * 30);
    }

    if (type === 'barrier') {
      obstacle.spawnLane = lane;
    }

    g.obstacles.push(obstacle);
    g.lastSpawn = performance.now();
  }, [getLaneX]);

  /**
   * 绘制一帧游戏画面
   * 依次绘制：道路 → 障碍物 → 玩家车辆 → 速度指示器
   */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { playerLane, obstacles, speed } = gameRef.current;

    drawRoad(ctx);

    // 绘制所有障碍物（根据类型调用不同绘制函数）
    for (const obs of obstacles) {
      if (obs.type === 'truck') {
        drawTruck(ctx, obs.x, obs.y);
      } else if (obs.type === 'barrier') {
        drawBarrier(ctx, obs.x, obs.y);
      } else {
        drawCar(ctx, obs.x, obs.y, obs.color, false);
      }
    }

    // 绘制玩家车辆（固定在底部）
    const px = getLaneX(playerLane);
    const py = CANVAS_H - CAR_H - 10;
    drawCar(ctx, px, py, '#e74c3c', true);

    // 显示当前速度百分比
    const speedPercent = Math.round(((speed - INITIAL_SPEED) / (MAX_SPEED - INITIAL_SPEED)) * 100);
    ctx.fillStyle = '#aaa';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(t('gameUI.speedLabel', { value: speedPercent }), 8, 20);
  }, [drawRoad, drawCar, drawTruck, drawBarrier, getLaneX, t]);

  /**
   * 游戏主循环（由 requestAnimationFrame 驱动）
   * 处理逻辑：加速 → 滚动道路 → 计分 → 生成障碍物 → 蛇形车换道 → 移动障碍物 → 碰撞检测
   */
  const gameLoop = useCallback((timestamp: number) => {
    const g = gameRef.current;
    if (!g.active) {
      draw();
      return;
    }

    // 速度随时间递增，直到上限
    g.speed = Math.min(MAX_SPEED, g.speed + SPEED_INCREMENT);

    // 更新道路滚动偏移（实现路面移动效果）
    g.roadOffset = (g.roadOffset + g.speed) % 35;

    // 增加分数
    g.score += 1;
    setScore(g.score);
    onScoreChange?.(g.score);

    // 生成障碍物：间隔随分数增加而缩短
    g.spawnInterval = Math.max(300, 1200 - g.score * 0.5);
    if (timestamp - g.lastSpawn > g.spawnInterval) {
      spawnObstacle();

      // 分数 > 500：80% 概率同时生成第二个障碍物
      if (g.score > 500 && Math.random() < 0.8) {
        spawnObstacle();
      }

      // 分数 > 1000：10% 概率同时生成第三个障碍物
      if (g.score > 1000 && Math.random() < 0.1) {
        spawnObstacle();
      }

      // 早期（分数≤500）中等速度时双倍生成，平滑过渡
      if (g.score <= 500 && g.speed > 5 && Math.random() > 0.5) {
        spawnObstacle();
      }
    }

    // 蛇形车逻辑：定时随机换道（左右随机）
    for (const obs of g.obstacles) {
      if (obs.type === 'swerver' && obs.swerveTimer !== undefined) {
        obs.swerveTimer--;
        if (obs.swerveTimer <= 0) {
          const dir = Math.random() < 0.5 ? -1 : 1;
          const newLane = obs.lane + dir;
          if (newLane >= 0 && newLane < LANE_COUNT) {
            obs.lane = newLane;
            obs.x = getLaneX(newLane);
          }
          obs.swerveTimer = 30 + Math.floor(Math.random() * 30); // 重置定时器
        }
      }
    }

    // 所有障碍物向下移动（速度影响移动步长）
    for (const obs of g.obstacles) {
      obs.y += g.speed;
    }

    // 移除超出屏幕的障碍物
    g.obstacles = g.obstacles.filter(obs => obs.y < CANVAS_H + 20);

    // 碰撞检测：碰撞后结束游戏
    if (checkCollision(g.playerLane, g.obstacles)) {
      g.active = false;
      const finalScore = g.score;
      setHighScore(prev => Math.max(prev, finalScore));
      setGameState('over');
      onGameOver?.(finalScore);
      draw();
      return;
    }

    draw();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [draw, spawnObstacle, checkCollision, onScoreChange, onGameOver, getLaneX]);

  /**
   * 开始新游戏：重置所有游戏数据，初始化状态，启动游戏循环
   */
  const startGame = useCallback(() => {
    gameRef.current = {
      playerLane: 1,
      speed: INITIAL_SPEED,
      score: 0,
      obstacles: [],
      roadOffset: 0,
      active: true,
      lastSpawn: 0,
      spawnInterval: 1200,
    };
    setScore(0);
    setGameState('playing');
    onGameStart?.();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop, onGameStart]);

  /** 向左变道 */
  const moveLeft = useCallback(() => {
    const g = gameRef.current;
    if (!g.active) return;
    g.playerLane = Math.max(0, g.playerLane - 1);
  }, []);

  /** 向右变道 */
  const moveRight = useCallback(() => {
    const g = gameRef.current;
    if (!g.active) return;
    g.playerLane = Math.min(LANE_COUNT - 1, g.playerLane + 1);
  }, []);

  /**
   * 键盘控制：左右方向键变道
   * 组件挂载时注册键盘事件，卸载时移除
   */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        moveLeft();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        moveRight();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
    };
  }, [moveLeft, moveRight]);

  /**
   * 触摸滑动支持：记录触摸起点，通过滑动方向判定左右
   */
  const touchStartXRef = useRef<number | null>(null);
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartXRef.current = e.touches[0].clientX;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartXRef.current === null) return;
      const dx = e.changedTouches[0].clientX - touchStartXRef.current;
      touchStartXRef.current = null;
      if (Math.abs(dx) < 20) return; // 滑动距离太小忽略
      if (dx > 0) {
        moveRight();
      } else {
        moveLeft();
      }
    };
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [moveLeft, moveRight]);

  /**
   * 初始状态绘制：游戏空闲时绘制初始画面
   */
  useEffect(() => {
    if (gameState === 'idle') {
      draw();
    }
    return () => {
    };
  }, [gameState, draw]);

  /**
   * 设置画布尺寸并绘制初始画面
   */
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = CANVAS_W;
      canvasRef.current.height = CANVAS_H;
    }
    draw();
  }, [draw]);

  return (
    <div className="flex flex-col items-center">
      {/* 游戏标题栏：游戏名、当前得分、最高分 */}
      <div className="flex items-center justify-between w-full max-w-[400px] mb-3">
        <Title level={4} className="!text-white !mb-0">{t('onlineGames.games.speed-racer.name')}</Title>
        <div className="flex items-center gap-3">
          <Text className="!text-gray-400">{t('gameUI.scoreLabel', { value: score })}</Text>
          <Text className="!text-yellow-400">{t('gameUI.bestLabel', { value: highScore })}</Text>
        </div>
      </div>
      {/* 游戏画布 */}
      <canvas
        ref={canvasRef}
        className="rounded-lg border border-dark-600"
        width={CANVAS_W}
        height={CANVAS_H}
      />
      {/* 空闲状态：显示开始按钮 */}
      {gameState === 'idle' && (
        <Button type="primary" className="mt-4" onClick={startGame}>{t('gameUI.startGame')}</Button>
      )}
      {/* 游戏中：显示左右控制按钮 */}
      {gameState === 'playing' && (
        <div className="flex gap-4 mt-2">
          <Button onClick={moveLeft} className="!px-6">{t('gameUI.left')}</Button>
          <Button onClick={moveRight} className="!px-6">{t('gameUI.right')}</Button>
        </div>
      )}
      {/* 游戏中：操作提示 */}
      {gameState === 'playing' && (
        <Text className="!text-gray-500 !text-xs mt-2">{t('gameUI.hints.speedRacer')}</Text>
      )}
      {/* 游戏结束：显示得分和重新开始按钮 */}
      {gameState === 'over' && (
        <div className="mt-4 text-center">
          <Text className="!text-red-400 !block mb-2">{t('gameUI.gameOverScore', { score })}</Text>
          <Button type="primary" onClick={startGame}>{t('gameUI.restart')}</Button>
        </div>
      )}
    </div>
  );
};

export default SpeedRacer;
