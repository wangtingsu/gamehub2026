/**
 * 飞机大战 (Space Shooter) 游戏组件
 *
 * 玩法概述：
 * - 横版卷轴太空射击游戏，玩家控制飞船抵御敌人波次攻击
 * - 自动射击，支持 WASD / 方向键 / 触摸滑动 / 虚拟方向键控制移动
 * - 敌人类型：basic（基础）、fast（快速）、zigzag（锯齿形移动）、sniper（狙击手）
 * - 每 5 波出现编队攻击，每 10 波出现 Boss
 * - 击落敌人可获得分数，道具可加速射击（R）或提供护盾（S）
 * - 3 条命，碰触敌人或被子弹击中损失生命
 * - 星空背景视差滚动，制造太空飞行感
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import VirtualGamepad from './VirtualGamepad';
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
const CANVAS_W = 400;
/** 画布高度（像素） */
const CANVAS_H = 500;

/** 敌人类型：basic-基础 fast-快速 zigzag-锯齿 sniper-狙击手 */
type EnemyType = 'basic' | 'fast' | 'zigzag' | 'sniper';

/** 玩家子弹接口 */
interface Bullet {
  x: number;
  y: number;
}

/** 敌方子弹接口（带方向速度分量） */
interface EnemyBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** Boss 接口 */
interface Boss {
  x: number;           // X 坐标
  y: number;           // Y 坐标
  hp: number;          // 当前生命值
  maxHp: number;       // 最大生命值
  active: boolean;     // 是否活跃
  moveDir: number;     // 移动方向（1 向下 / -1 向上）
  shootTimer: number;  // 射击倒计时
}

/** 敌人接口 */
interface Enemy {
  x: number;           // X 坐标
  y: number;           // Y 坐标
  type: EnemyType;     // 敌人类型
  hp: number;          // 生命值
  baseY: number;       // 基准 Y 坐标（用于锯齿形运动计算）
  spawnTime: number;   // 生成时间戳（用于动画计算）
}

/** 道具接口 */
interface PowerUp {
  x: number;
  y: number;
  type: 'rapid' | 'shield'; // rapid-加速射击 / shield-护盾
}

/** 星空背景星星接口 */
interface Star {
  x: number;           // X 坐标
  y: number;           // Y 坐标
  speed: number;       // 滚动速度（视差效果）
  size: number;        // 星星大小
}

/**
 * 生成星空背景的星星数组
 * 每颗星星有随机位置、滚动速度和大小，用于视差滚动效果
 *
 * @returns 星星数组
 */
function generateStars(): Star[] {
  const s: Star[] = [];
  for (let i = 0; i < 60; i++) {
    s.push({
      x: Math.random() * CANVAS_W,
      y: Math.random() * CANVAS_H,
      speed: 0.5 + Math.random() * 2,    // 随机滚动速度（0.5~2.5）
      size: 0.5 + Math.random() * 1.5,   // 随机星星大小（0.5~2.0）
    });
  }
  return s;
}

/** 不同敌人类型的击杀得分映射表 */
const ENEMY_SCORES: Record<EnemyType, number> = {
  basic: 10,      // 基础敌人 10 分
  fast: 20,       // 快速敌人 20 分
  zigzag: 30,     // 锯齿敌人 30 分
  sniper: 50,     // 狙击手 50 分
};

/** 不同敌人类型的颜色映射表 */
const ENEMY_COLORS: Record<EnemyType, string> = {
  basic: '#ff4500',   // 基础敌人 - 橙红色
  fast: '#ff6347',    // 快速敌人 - 番茄红
  zigzag: '#ff1493',  // 锯齿敌人 - 深粉色
  sniper: '#ff00ff',  // 狙击手 - 紫红色
};

/**
 * 飞机大战游戏主组件
 *
 * @param props.onScoreChange - 分数变化回调
 * @param props.onGameOver - 游戏结束回调
 * @param props.onGameStart - 游戏开始回调
 * @returns 飞机大战游戏界面
 */
const SpaceShooter: React.FC<GameProps> = ({ onScoreChange, onGameOver, onGameStart }) => {
  /** Canvas 元素的引用 */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** 当前得分 */
  const [score, setScore] = useState(0);
  /** 当前生命值 */
  const [health, setHealth] = useState(3);
  /** 游戏状态：idle-未开始，playing-进行中，over-已结束 */
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle');
  /** requestAnimationFrame ID，用于取消动画循环 */
  const animRef = useRef<number>(0);
  /** 上一次游戏更新的时间戳（用于控制帧率） */
  const lastTickRef = useRef(0);

  /**
   * 游戏核心数据（使用 ref 存储以避免闭包陈旧值问题）
   * 包含玩家位置、生命值、子弹、敌人、道具、Boss 等所有游戏状态
   */
  const gameRef = useRef({
    player: { x: 50, y: CANVAS_H / 2 },   // 玩家飞船位置
    health: 3,                               // 生命值
    score: 0,                                // 当前分数
    bullets: [] as Bullet[],                 // 玩家子弹数组
    enemies: [] as Enemy[],                  // 敌人数组
    powerUps: [] as PowerUp[],               // 道具数组
    rapidFire: false,                        // 是否处于速射状态
    rapidFireTimer: 0,                       // 速射剩余时间（帧数）
    shield: false,                           // 是否处于护盾状态
    shieldTimer: 0,                          // 护盾剩余时间（帧数）
    shootCooldown: 0,                        // 射击冷却计时器
    stars: generateStars(),                  // 星空背景星星
    spawnTimer: 0,                           // 生成敌人倒计时
    waveCount: 0,                            // 当前波次计数
    dead: false,                             // 玩家是否死亡
    autoFire: true,                          // 是否自动射击
    enemyBullets: [] as EnemyBullet[],       // 敌方子弹数组
    boss: null as Boss | null,               // Boss 对象
    formationWave: 0,                        // 编队攻击波次标记
  });

  /**
   * 绘制玩家飞船
   * 包括护盾光环（蓝色）、飞船主体（蓝色三角形）、驾驶舱（天蓝色圆形）和引擎火焰（橙色）
   * 各部分带有适当的发光效果
   *
   * @param ctx - Canvas 2D 渲染上下文
   */
  const drawPlayer = useCallback((ctx: CanvasRenderingContext2D) => {
    const g = gameRef.current;
    const px = g.player.x;
    const py = g.player.y;

    // 护盾特效：如果有护盾状态，绘制蓝色半透明光环
    if (g.shield) {
      ctx.strokeStyle = 'rgba(0, 191, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00bfff';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(px, py, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 飞船主体：蓝色三角形（箭头朝向右侧）
    ctx.fillStyle = '#00bfff';
    ctx.shadowColor = '#00bfff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(px + 20, py);       // 机头（右侧顶点）
    ctx.lineTo(px - 12, py - 12);  // 左上翼
    ctx.lineTo(px - 8, py);        // 尾部中点
    ctx.lineTo(px - 12, py + 12);  // 右下翼
    ctx.closePath();
    ctx.fill();

    // 驾驶舱：天蓝色圆形
    ctx.fillStyle = '#87ceeb';
    ctx.beginPath();
    ctx.arc(px + 6, py, 4, 0, Math.PI * 2);
    ctx.fill();

    // 引擎火焰：橙色三角形，带发光效果
    ctx.fillStyle = 'rgba(255, 165, 0, 0.6)';
    ctx.shadowColor = '#ffa500';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(px - 12, py - 6);
    ctx.lineTo(px - 18, py);
    ctx.lineTo(px - 12, py + 6);
    ctx.fill();

    ctx.shadowBlur = 0;
  }, []);

  /**
   * 根据敌人类型绘制不同的敌人造型
   * - zigzag: 菱形
   * - fast: 朝左的小三角形（带速度线效果）
   * - basic/sniper: 六边形
   * 每种敌人使用对应的颜色并带发光效果
   *
   * @param ctx - Canvas 2D 渲染上下文
   * @param e - 敌人对象
   */
  const drawEnemy = useCallback((ctx: CanvasRenderingContext2D, e: Enemy) => {
    const color = ENEMY_COLORS[e.type];
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;

    if (e.type === 'zigzag') {
      // 锯齿敌人：菱形造型
      ctx.beginPath();
      ctx.moveTo(e.x, e.y - 12);
      ctx.lineTo(e.x + 12, e.y);
      ctx.lineTo(e.x, e.y + 12);
      ctx.lineTo(e.x - 12, e.y);
      ctx.closePath();
      ctx.fill();
    } else if (e.type === 'fast') {
      // 快速敌人：朝左的小三角形（带速度线）
      ctx.beginPath();
      ctx.moveTo(e.x - 12, e.y);
      ctx.lineTo(e.x + 8, e.y - 8);
      ctx.lineTo(e.x + 8, e.y + 8);
      ctx.closePath();
      ctx.fill();
      // 速度线（尾部拖尾效果）
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(e.x + 8, e.y - 4);
      ctx.lineTo(e.x + 16, e.y - 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(e.x + 8, e.y + 4);
      ctx.lineTo(e.x + 16, e.y + 8);
      ctx.stroke();
    } else {
      // 基础敌人和狙击手：六边形造型
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2) / 6 - Math.PI / 2;
        const r = 12;
        const x = e.x + r * Math.cos(angle);
        const y = e.y + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }

    ctx.shadowBlur = 0;
  }, []);

  /**
   * 绘制玩家子弹（白色长条，带发光效果）
   *
   * @param ctx - Canvas 2D 渲染上下文
   * @param bullets - 子弹数组
   */
  const drawBullets = useCallback((ctx: CanvasRenderingContext2D, bullets: Bullet[]) => {
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 6;
    bullets.forEach(b => {
      ctx.fillRect(b.x, b.y - 2, 12, 4);
    });
    ctx.shadowBlur = 0;
  }, []);

  /**
   * 绘制道具
   * - rapid（加速射击）：金色 R 字母，带金色光环
   * - shield（护盾）：绿色 S 字母，带绿色光环
   *
   * @param ctx - Canvas 2D 渲染上下文
   * @param powerUps - 道具数组
   */
  const drawPowerUps = useCallback((ctx: CanvasRenderingContext2D, powerUps: PowerUp[]) => {
    powerUps.forEach(pu => {
      if (pu.type === 'rapid') {
        // 加速射击道具：金色 R 带光环
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 10;
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('R', pu.x, pu.y + 5);
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, 10, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // 护盾道具：绿色 S 带光环
        ctx.fillStyle = '#00ff7f';
        ctx.shadowColor = '#00ff7f';
        ctx.shadowBlur = 10;
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('S', pu.x, pu.y + 5);
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, 10, 0, Math.PI * 2);
        ctx.strokeStyle = '#00ff7f';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
    ctx.shadowBlur = 0;
  }, []);

  /**
   * 主绘制函数：绘制完整的游戏画面
   * 绘制顺序（从底层到顶层）：
   * 1. 太空背景 + 星云效果
   * 2. 星空视差滚动星星
   * 3. 道具
   * 4. 玩家子弹
   * 5. 敌方子弹
   * 6. 敌人
   * 7. Boss（含生命条）
   * 8. 玩家飞船
   */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const g = gameRef.current;

    // 太空深色背景
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // 星云效果：右上角紫色渐变半透明光晕
    const ng = ctx.createRadialGradient(CANVAS_W * 0.7, CANVAS_H * 0.3, 10, CANVAS_W * 0.7, CANVAS_H * 0.3, 150);
    ng.addColorStop(0, 'rgba(20, 0, 60, 0.15)');
    ng.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = ng;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // 星空背景：星星大小不一，亮度不同，营造视差滚动效果
    g.stars.forEach(s => {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + s.size * 0.3})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // 绘制道具
    drawPowerUps(ctx, g.powerUps);

    // 绘制玩家子弹
    drawBullets(ctx, g.bullets);

    // 绘制敌方子弹（红色圆形，带发光效果）
    g.enemyBullets.forEach(eb => {
      ctx.fillStyle = '#ff4444';
      ctx.shadowColor = '#ff4444';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(eb.x, eb.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // 绘制敌人
    g.enemies.forEach(e => drawEnemy(ctx, e));

    // 绘制 Boss（金色大六边形，带生命条和 BOSS 标签）
    if (g.boss && g.boss.active) {
      const b = g.boss;
      // Boss 主体：金色大六边形
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2) / 6 - Math.PI / 2;
        const r = 25;
        const x = b.x + r * Math.cos(angle);
        const y = b.y + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      // Boss 生命条：灰色背景 + 彩色进度条（绿色 > 30%，红色 <= 30%）
      const hpPct = b.hp / b.maxHp;
      ctx.fillStyle = '#333';
      ctx.fillRect(b.x - 25, b.y - 35, 50, 5);
      ctx.fillStyle = hpPct > 0.3 ? '#00ff00' : '#ff0000';
      ctx.fillRect(b.x - 25, b.y - 35, 50 * hpPct, 5);
      ctx.shadowBlur = 0;
      // Boss 标签
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BOSS', b.x, b.y - 40);
    }

    // 绘制玩家飞船（存活状态下）
    if (g.health > 0 && !g.dead) {
      drawPlayer(ctx);
    }
  }, [drawPlayer, drawEnemy, drawBullets, drawPowerUps]);

  /**
   * 核心游戏逻辑更新函数（每帧调用）
   * 处理以下游戏逻辑：
   * 1. 星空视差滚动
   * 2. 道具计时器更新
   * 3. 自动射击和子弹移动
   * 4. 敌方子弹移动和碰撞检测
   * 5. 敌人波次生成（含编队和 Boss）
   * 6. 不同类型敌人的移动和射击 AI
   * 7. 敌人与玩家的碰撞
   * 8. Boss 移动和弹幕射击
   * 9. 子弹与敌人/Boss 的碰撞
   * 10. 道具移动和拾取
   */
  const tick = useCallback(() => {
    const g = gameRef.current;
    if (g.dead) return;

    const now = performance.now();

    // 1. 星空视差滚动：星星从右向左移动，超出左边界则从右侧重新出现
    g.stars.forEach(s => {
      s.x -= s.speed;
      if (s.x < -2) s.x = CANVAS_W + 2;
    });

    // 2. 道具效果计时器更新
    if (g.rapidFire) {
      g.rapidFireTimer--;
      if (g.rapidFireTimer <= 0) g.rapidFire = false; // 速射效果结束
    }
    if (g.shield) {
      g.shieldTimer--;
      if (g.shieldTimer <= 0) g.shield = false; // 护盾效果结束
    }

    // 3. 自动射击：冷却结束后发射双发子弹
    g.shootCooldown--;
    const fireRate = g.rapidFire ? 4 : 12; // 速射模式下冷却更短
    if (g.autoFire && g.shootCooldown <= 0 && !g.dead) {
      g.bullets.push(
        { x: g.player.x + 18, y: g.player.y - 4 },  // 上方子弹
        { x: g.player.x + 18, y: g.player.y + 4 }   // 下方子弹
      );
      g.shootCooldown = fireRate;
    }

    // 移动玩家子弹（向右飞行），超出右边界则移除
    for (let i = g.bullets.length - 1; i >= 0; i--) {
      g.bullets[i].x += 6;
      if (g.bullets[i].x > CANVAS_W + 10) {
        g.bullets.splice(i, 1);
      }
    }

    // 4. 敌方子弹移动和碰撞检测
    for (let i = g.enemyBullets.length - 1; i >= 0; i--) {
      const eb = g.enemyBullets[i];
      eb.x += eb.vx;
      eb.y += eb.vy;
      // 子弹超出边界则移除
      if (eb.x < -20 || eb.x > CANVAS_W + 20 || eb.y < -20 || eb.y > CANVAS_H + 20) {
        g.enemyBullets.splice(i, 1);
        continue;
      }
      // 与玩家碰撞检测
      const dx = eb.x - g.player.x;
      const dy = eb.y - g.player.y;
      if (Math.abs(dx) < 14 && Math.abs(dy) < 14) {
        if (g.shield) {
          // 有护盾则护盾抵消伤害
          g.shield = false;
          g.shieldTimer = 0;
        } else {
          g.health -= 1;
          setHealth(g.health);
          if (g.health <= 0) {
            g.dead = true;
            setGameState('over');
            onGameOver?.(g.score);
            return;
          }
        }
        g.enemyBullets.splice(i, 1);
      }
    }

    // 5. 敌人波次生成逻辑
    g.spawnTimer--;
    if (g.spawnTimer <= 0) {
      g.waveCount++;
      // 每 8 波增加一次同时生成数量，最多 4 个
      const spawnCount = Math.min(1 + Math.floor(g.waveCount / 8), 4);
      for (let i = 0; i < spawnCount; i++) {
        // 随机选择敌人类型，概率随着波次推进而变化
        const roll = Math.random();
        let type: EnemyType;
        if (roll < 0.5) type = 'basic';
        else if (roll < 0.7) type = 'fast';
        else if (roll < 0.85) type = 'zigzag';
        else type = 'sniper';

        // 不同敌人有不同生命值
        const hp = type === 'zigzag' ? 2 : type === 'sniper' ? 3 : 1;
        g.enemies.push({
          x: CANVAS_W + 20 + i * 30,
          y: 30 + Math.random() * (CANVAS_H - 60),
          type,
          hp,
          baseY: 30 + Math.random() * (CANVAS_H - 60),
          spawnTime: now,
        });
      }
      // 波次间隔逐渐缩短（难度递增），最少 20 帧
      g.spawnTimer = Math.max(20, 60 - g.waveCount * 1.5);

      // 编队攻击：每 5 波触发一次（Boss 波次不触发）
      if (g.waveCount % 5 === 0 && g.waveCount % 10 !== 0 && g.waveCount > 0 && !g.boss) {
        g.formationWave = g.waveCount;
        for (let i = 0; i < 5; i++) {
          const offsetX = i * 40;
          const offsetY = (i - 2) * 35;
          g.enemies.push({
            x: CANVAS_W + 20 + offsetX,
            y: CANVAS_H / 2 + offsetY,
            type: 'basic',
            hp: 1,
            baseY: CANVAS_H / 2 + offsetY,
            spawnTime: now,
          });
        }
      }

      // Boss 登场：每 10 波触发一次
      if (g.waveCount % 10 === 0 && g.waveCount > 0 && !g.boss) {
        g.boss = {
          x: CANVAS_W - 60,
          y: CANVAS_H / 2,
          hp: 20 + g.waveCount * 2,     // 血量随波次增加
          maxHp: 20 + g.waveCount * 2,
          active: true,
          moveDir: 1,
          shootTimer: 0,
        };
      }
    }

    // 6. 不同类型敌人的移动和射击 AI
    for (let i = g.enemies.length - 1; i >= 0; i--) {
      const e = g.enemies[i];
      const elapsed = (now - e.spawnTime) / 1000; // 从生成到现在的秒数

      // 根据类型执行不同的移动模式
      switch (e.type) {
        case 'basic':
          e.x -= 1.5;        // 基础敌人：匀速向左移动
          break;
        case 'fast':
          e.x -= 3;           // 快速敌人：高速向左移动
          break;
        case 'zigzag':
          e.x -= 1.8;         // 锯齿敌人：左移同时做正弦波摆动
          e.y = e.baseY + Math.sin(elapsed * 3) * 40;
          break;
        case 'sniper':
          e.x -= 1.2;         // 狙击手：缓慢左移，同时追踪玩家 Y 位置
          const targetY = g.player.y;
          const diff = targetY - e.y;
          e.y += Math.sign(diff) * Math.min(1.5, Math.abs(diff) * 0.02);
          break;
      }

      // 敌人射击逻辑
      // fast 和 zigzag 类型有概率朝玩家方向发射子弹
      if (e.type === 'fast' || e.type === 'zigzag') {
        const shootProb = 0.02 + g.waveCount * 0.005; // 射击概率随波次增加
        if (Math.random() < shootProb) {
          const angle = Math.atan2(g.player.y - e.y, g.player.x - e.x); // 瞄准玩家方向
          const speed = 2 + g.waveCount * 0.1;
          g.enemyBullets.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
          });
        }
      }
      // sniper 类型发射更快更准的子弹
      if (e.type === 'sniper') {
        const sniperShootProb = 0.03 + g.waveCount * 0.008;
        if (Math.random() < sniperShootProb) {
          const angle = Math.atan2(g.player.y - e.y, g.player.x - e.x);
          g.enemyBullets.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(angle) * 4, // 速度更快（固定 4）
            vy: Math.sin(angle) * 4,
          });
        }
      }

      // 移出屏幕左侧的敌人
      if (e.x < -30) {
        g.enemies.splice(i, 1);
        continue;
      }

      // 7. 敌人与玩家的碰撞检测
      const dx = e.x - g.player.x;
      const dy = e.y - g.player.y;
      if (Math.abs(dx) < 18 && Math.abs(dy) < 18) {
        if (g.shield) {
          g.shield = false; // 护盾抵消碰撞伤害
          g.shieldTimer = 0;
        } else {
          g.health -= 1;
          setHealth(g.health);
          if (g.health <= 0) {
            g.dead = true;
            setGameState('over');
            onGameOver?.(g.score);
            return;
          }
        }
        g.enemies.splice(i, 1); // 敌人被销毁
        continue;
      }
    }

    // 8. Boss 移动和弹幕射击逻辑
    if (g.boss && g.boss.active) {
      const b = g.boss;
      b.y += b.moveDir * 0.8; // 上下缓慢移动
      if (b.y < 60 || b.y > CANVAS_H - 60) b.moveDir *= -1; // 边界反弹

      // Boss 散弹射击：发射 5 发呈扇形分布的子弹
      b.shootTimer--;
      if (b.shootTimer <= 0) {
        const angles = [-0.3, -0.15, 0, 0.15, 0.3]; // 5 个扇形角度
        const bSpeed = 2.5;
        angles.forEach(a => {
          g.enemyBullets.push({
            x: b.x - 20,
            y: b.y,
            vx: Math.cos(a) * bSpeed,
            vy: Math.sin(a) * bSpeed,
          });
        });
        b.shootTimer = Math.max(20, 60 - g.waveCount); // 射击间隔随波次缩短
      }
    }

    // 9. 子弹与敌人的碰撞检测
    for (let i = g.bullets.length - 1; i >= 0; i--) {
      const b = g.bullets[i];
      let hit = false;
      // 遍历敌人检测碰撞
      for (let j = g.enemies.length - 1; j >= 0; j--) {
        const e = g.enemies[j];
        if (Math.abs(b.x - e.x) < 15 && Math.abs(b.y - e.y) < 12) {
          e.hp--; // 敌人掉血
          if (e.hp <= 0) {
            // 击杀敌人：加分数
            const pts = ENEMY_SCORES[e.type];
            g.score += pts;
            setScore(g.score);
            onScoreChange?.(g.score);

            // 15% 概率掉落道具
            if (Math.random() < 0.15) {
              const puType: 'rapid' | 'shield' = Math.random() < 0.5 ? 'rapid' : 'shield';
              g.powerUps.push({ x: e.x, y: e.y, type: puType });
            }

            g.enemies.splice(j, 1); // 移除被击杀的敌人
          }
          hit = true;
          break;
        }
      }
      // 检测子弹是否击中 Boss
      if (!hit && g.boss && g.boss.active) {
        if (Math.abs(b.x - g.boss.x) < 25 && Math.abs(b.y - g.boss.y) < 20) {
          g.boss.hp--;
          hit = true;
          if (g.boss.hp <= 0) {
            // 击败 Boss：额外加 200 分
            g.score += 200;
            setScore(g.score);
            onScoreChange?.(g.score);
            g.boss.active = false;
            g.boss = null;
          }
        }
      }
      // 如果子弹命中任何目标，移除该子弹
      if (hit) {
        g.bullets.splice(i, 1);
      }
    }

    // 10. 道具移动和拾取检测
    for (let i = g.powerUps.length - 1; i >= 0; i--) {
      const pu = g.powerUps[i];
      pu.x -= 1; // 道具缓慢左移
      if (pu.x < -20) {
        g.powerUps.splice(i, 1);
        continue;
      }
      // 检测玩家是否拾取道具
      const dx = pu.x - g.player.x;
      const dy = pu.y - g.player.y;
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
        if (pu.type === 'rapid') {
          g.rapidFire = true;
          g.rapidFireTimer = 300; // 速射效果持续 300 帧
        } else {
          g.shield = true;
          g.shieldTimer = 300; // 护盾效果持续 300 帧
        }
        g.powerUps.splice(i, 1); // 道具被拾取后移除
      }
    }
  }, [onScoreChange, onGameOver]);

  /**
   * 游戏主循环（使用 requestAnimationFrame）
   * 目标帧率约 60fps（16ms 间隔），每帧更新游戏逻辑并重绘
   *
   * @param timestamp - requestAnimationFrame 提供的高精度时间戳
   */
  const gameLoop = useCallback((timestamp: number) => {
    if (gameRef.current.dead) return;
    animRef.current = requestAnimationFrame(gameLoop);

    // 帧率控制：至少间隔 16ms 才更新逻辑，其余帧只重绘
    if (timestamp - lastTickRef.current < 16) {
      draw();
      return;
    }
    lastTickRef.current = timestamp;

    tick();  // 更新游戏逻辑
    draw();  // 重绘画面
  }, [draw, tick]);

  /**
   * 开始/重新开始游戏
   * 重置所有游戏数据、分数、生命值，启动游戏循环
   */
  const startGame = useCallback(() => {
    gameRef.current = {
      player: { x: 50, y: CANVAS_H / 2 },
      health: 3,
      score: 0,
      bullets: [],
      enemies: [],
      powerUps: [],
      rapidFire: false,
      rapidFireTimer: 0,
      shield: false,
      shieldTimer: 0,
      shootCooldown: 0,
      stars: generateStars(),
      spawnTimer: 30,      // 初始 30 帧后开始生成敌人
      waveCount: 0,
      dead: false,
      autoFire: true,
      enemyBullets: [],
      boss: null,
      formationWave: 0,
    };
    setScore(0);
    setHealth(3);
    setGameState('playing');
    onGameStart?.();
    lastTickRef.current = 0;
    animRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop, onGameStart]);

  /**
   * 键盘事件监听
   * - WASD / 方向键控制飞船移动（上下左右）
   * - 空格键手动射击（仅在非自动射击模式下）
   * 限制：飞船不能超出画布边界（留 15px 边距）
   */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (g.dead) return;
      const speed = 5;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          g.player.y = Math.max(15, g.player.y - speed); // 上移（不超出上边界）
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          g.player.y = Math.min(CANVAS_H - 15, g.player.y + speed); // 下移
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          g.player.x = Math.max(15, g.player.x - speed); // 左移
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          g.player.x = Math.min(CANVAS_W - 15, g.player.x + speed); // 右移
          break;
        case ' ':
          e.preventDefault();
          // 空格手动射击（仅在 autoFire=false 时有效）
          if (!g.autoFire) {
            const fireRate = g.rapidFire ? 4 : 12;
            if (g.shootCooldown <= 0) {
              g.bullets.push(
                { x: g.player.x + 18, y: g.player.y - 4 },
                { x: g.player.x + 18, y: g.player.y + 4 }
              );
              g.shootCooldown = fireRate;
            }
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  /** 触摸滑动的起始位置记录 */
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  /** 上移飞船（虚拟方向键和触摸滑动共用） */
  const moveUp = useCallback(() => {
    const g = gameRef.current;
    if (g.dead) return;
    g.player.y = Math.max(15, g.player.y - 5);
  }, []);

  /** 下移飞船 */
  const moveDown = useCallback(() => {
    const g = gameRef.current;
    if (g.dead) return;
    g.player.y = Math.min(CANVAS_H - 15, g.player.y + 5);
  }, []);

  /** 左移飞船 */
  const moveLeft = useCallback(() => {
    const g = gameRef.current;
    if (g.dead) return;
    g.player.x = Math.max(15, g.player.x - 5);
  }, []);

  /** 右移飞船 */
  const moveRight = useCallback(() => {
    const g = gameRef.current;
    if (g.dead) return;
    g.player.x = Math.min(CANVAS_W - 15, g.player.x + 5);
  }, []);

  /**
   * 触摸滑动事件监听（移动端支持）
   * 通过 touchstart 和 touchend 坐标差判断滑动方向
   * 滑动距离超过 20px 才触发，优先判断水平/垂直方向
   */
  useEffect(() => {
    /** 记录触摸起始位置 */
    const handleTouchStart = (e: TouchEvent) => {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    /** 触摸结束时计算滑动方向并移动飞船 */
    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
      const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
      touchStartRef.current = null;
      const minSwipe = 20; // 最小滑动距离阈值
      if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;
      // 判断主要滑动方向
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) moveRight();
        else moveLeft();
      } else {
        if (dy > 0) moveDown();
        else moveUp();
      }
    };
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [moveUp, moveDown, moveLeft, moveRight]);

  // 组件卸载时取消动画循环
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  // 空闲状态时绘制静态画面
  useEffect(() => {
    if (gameState === 'idle') {
      draw();
    }
  }, [gameState, draw]);

  // 初始化画布尺寸并绘制
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = CANVAS_W;
      canvasRef.current.height = CANVAS_H;
    }
    draw();
  }, [draw]);

  return (
    <div className="flex flex-col items-center">
      {/* 顶部信息栏：游戏标题、当前得分和生命值 */}
      <div className="flex items-center justify-between w-full max-w-[400px] mb-3">
        <Title level={4} className="!text-white !mb-0">Space Shooter</Title>
        <div className="flex items-center gap-3">
          <Text className="!text-gray-400">Score: {score}</Text>
          <Text className="!text-red-400">Lives: {health}</Text>
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
        <Button type="primary" className="mt-4" onClick={startGame}>Start Game</Button>
      )}
      {/* 游戏结束：显示最终得分和重新开始按钮 */}
      {gameState === 'over' && (
        <div className="mt-4 text-center">
          <Text className="!text-red-400 !block mb-2">Game Over! Score: {score}</Text>
          <Button type="primary" onClick={startGame}>Restart</Button>
        </div>
      )}
      {/* 游戏进行中：显示操作提示和虚拟方向键（移动端适用） */}
      {gameState === 'playing' && (
        <>
          <Text className="!text-gray-500 !text-xs mt-2">Arrow keys/WASD to move, auto-fire | Swipe / virtual buttons</Text>
          <VirtualGamepad
            directions={{
              up: moveUp,
              down: moveDown,
              left: moveLeft,
              right: moveRight,
            }}
          />
        </>
      )}
    </div>
  );
};

export default SpaceShooter;
