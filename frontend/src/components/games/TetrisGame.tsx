/**
 * TetrisGame.tsx - 俄罗斯方块游戏组件（移动端优化版）
 * 侧边控制按钮 + 画布自适应
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Button, Typography } from 'antd';

const { Title, Text } = Typography;

interface GameProps {
  onScoreChange?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onGameStart?: () => void;
}

const COLS = 10;
const ROWS = 20;
// BLOCK size determined dynamically

const SHAPES: number[][][] = [
  [[1,1,1,1]],
  [[1,1],[1,1]],
  [[0,1,0],[1,1,1]],
  [[1,0,0],[1,1,1]],
  [[0,0,1],[1,1,1]],
  [[1,1,0],[0,1,1]],
  [[0,1,1],[1,1,0]],
];
const COLORS = ['#00f0f0','#f0f000','#a000f0','#f0a000','#0000f0','#00f000','#f00000'];

const TetrisGame: React.FC<GameProps> = ({ onScoreChange, onGameOver, onGameStart }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'idle'|'playing'|'over'>('idle');
  const [blockSize, setBlockSize] = useState(28);

  // 自适应方块大小
  useEffect(() => {
    const calc = () => {
      const maxW = Math.min(window.innerWidth - 160, 360); // 留空间给右侧按钮
      const maxH = window.innerHeight - 200;
      const byW = Math.floor(maxW / COLS);
      const byH = Math.floor(maxH / ROWS);
      setBlockSize(Math.max(20, Math.min(byW, byH, 32)));
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  const gameRef = useRef({
    board: Array.from({ length: ROWS }, () => Array(COLS).fill(0)),
    piece: { shapeIdx: 0, x: 3, y: 0, shape: SHAPES[0] },
    score: 0, running: false,
  });
  const animRef = useRef(0);
  const lastTickRef = useRef(0);
  const tickInterval = 800;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const g = gameRef.current;
    const b = blockSize;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#16213e';
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c*b,0); ctx.lineTo(c*b,ROWS*b); ctx.stroke(); }
    for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0,r*b); ctx.lineTo(COLS*b,r*b); ctx.stroke(); }

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (g.board[r][c]) {
          ctx.fillStyle = COLORS[g.board[r][c]-1];
          ctx.shadowColor = COLORS[g.board[r][c]-1]; ctx.shadowBlur = 4;
          ctx.fillRect(c*b+1, r*b+1, b-2, b-2);
          ctx.shadowBlur = 0;
        }
      }
    }

    const { shape, x, y } = g.piece;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[0].length; c++) {
        if (shape[r][c]) {
          ctx.fillStyle = COLORS[g.piece.shapeIdx];
          ctx.shadowColor = COLORS[g.piece.shapeIdx]; ctx.shadowBlur = 6;
          ctx.fillRect((x+c)*b+1, (y+r)*b+1, b-2, b-2);
          ctx.shadowBlur = 0;
        }
      }
    }
  }, [blockSize]);

  const collide = useCallback((board: number[][], shape: number[][], px: number, py: number) => {
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[0].length; c++)
        if (shape[r][c]) {
          const nx = px+c, ny = py+r;
          if (nx<0||nx>=COLS||ny>=ROWS||(ny>=0&&board[ny][nx])) return true;
        }
    return false;
  }, []);

  const mergeAndSpawn = useCallback((g: typeof gameRef.current) => {
    const { shape, x, y, shapeIdx } = g.piece;
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[0].length; c++)
        if (shape[r][c]) { const ny = y+r; if (ny<0) { g.running=false; return; } g.board[ny][x+c]=shapeIdx+1; }

    let cleared = 0;
    for (let r = ROWS-1; r>=0; r--) {
      if (g.board[r].every(v=>v!==0)) { g.board.splice(r,1); g.board.unshift(Array(COLS).fill(0)); cleared++; r++; }
    }
    if (cleared) { const pts=[0,100,300,500,800][cleared]||0; g.score+=pts; setScore(g.score); onScoreChange?.(g.score); }

    const idx = Math.floor(Math.random()*SHAPES.length);
    g.piece = { shapeIdx:idx, x:3, y:0, shape: SHAPES[idx] };
    if (collide(g.board, SHAPES[idx], 3, 0)) { g.running=false; setGameState('over'); onGameOver?.(g.score); }
  }, [collide, onScoreChange, onGameOver]);

  const gameLoop = useCallback((ts: number) => {
    const g = gameRef.current;
    if (!g.running) return;
    animRef.current = requestAnimationFrame(gameLoop);
    if (ts - lastTickRef.current < tickInterval) { draw(); return; }
    lastTickRef.current = ts;
    const { shape, x, y } = g.piece;
    if (!collide(g.board, shape, x, y+1)) g.piece.y++;
    else mergeAndSpawn(g);
    draw();
  }, [draw, collide, mergeAndSpawn]);

  const startGame = useCallback(() => {
    gameRef.current = { board: Array.from({length:ROWS},()=>Array(COLS).fill(0)), piece:{shapeIdx:0,x:3,y:0,shape:SHAPES[0]}, score:0, running:true };
    setScore(0); setGameState('playing'); onGameStart?.();
    lastTickRef.current = 0;
    animRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop, onGameStart]);

  // 键盘
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const g = gameRef.current; if (!g.running) return;
      e.preventDefault();
      const { shape, x, y } = g.piece;
      if (e.key==='ArrowLeft' && !collide(g.board,shape,x-1,y)) g.piece.x--;
      if (e.key==='ArrowRight' && !collide(g.board,shape,x+1,y)) g.piece.x++;
      if (e.key==='ArrowDown' && !collide(g.board,shape,x,y+1)) g.piece.y++;
      if (e.key==='ArrowUp') { const r=shape[0].map((_,i)=>shape.map(row=>row[i]).reverse()); if(!collide(g.board,r,x,y)) g.piece.shape=r; }
      if (e.key===' ') { while(!collide(g.board,g.piece.shape,g.piece.x,g.piece.y+1))g.piece.y++; mergeAndSpawn(g); }
      draw();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [collide, mergeAndSpawn, draw]);

  const g = gameRef.current;
  const can = (dir: string) => g.running && ({
    left: !collide(g.board,g.piece.shape,g.piece.x-1,g.piece.y),
    right: !collide(g.board,g.piece.shape,g.piece.x+1,g.piece.y),
    down: !collide(g.board,g.piece.shape,g.piece.x,g.piece.y+1),
  } as any)[dir];

  const doAct = (act: string) => {
    if (!g.running) return;
    const { shape, x, y } = g.piece;
    switch (act) {
      case 'left': if (!collide(g.board,shape,x-1,y)) g.piece.x--; break;
      case 'right': if (!collide(g.board,shape,x+1,y)) g.piece.x++; break;
      case 'down': if (!collide(g.board,shape,x,y+1)) g.piece.y++; break;
      case 'rotate': { const r=shape[0].map((_,i)=>shape.map(row=>row[i]).reverse()); if(!collide(g.board,r,x,y))g.piece.shape=r; break; }
      case 'drop': while(!collide(g.board,g.piece.shape,g.piece.x,g.piece.y+1))g.piece.y++; mergeAndSpawn(g); break;
    }
    draw();
  };

  useEffect(() => { if (gameState==='idle') draw(); }, [gameState, draw]);

  useEffect(() => {
    if (canvasRef.current) { canvasRef.current.width = COLS*blockSize; canvasRef.current.height = ROWS*blockSize; }
    draw();
  }, [draw, blockSize]);

  const sideBtn = 'w-14 h-14 sm:w-16 sm:h-16 rounded-xl text-white text-2xl font-bold flex items-center justify-center select-none bg-dark-600/80 active:bg-primary-600/90 border border-dark-500/50 shadow-lg active:shadow-inner transition-all duration-75';

  // 防双触发（touch + mouse）
  const lastFireRef = useRef(0);
  const fire = (act: string) => {
    const now = Date.now();
    if (now - lastFireRef.current < 100) return;
    lastFireRef.current = now;
    doAct(act);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-between w-full mb-3" style={{ maxWidth: COLS * blockSize + 100 }}>
        <Title level={4} className="!text-white !mb-0">俄罗斯方块</Title>
        <Text className="!text-gray-400">得分: {score}</Text>
      </div>

      {/* 游戏区 + 侧边控制按钮 */}
      <div className="flex gap-3 items-start">
        <canvas ref={canvasRef} className="rounded-lg border border-dark-600" width={COLS*blockSize} height={ROWS*blockSize} />

        {gameState === 'playing' && (
          <div className="flex flex-col gap-2 self-center">
            {/* 旋转 */}
            <button className={sideBtn} onPointerDown={e=>{e.preventDefault();fire('rotate')}} title="旋转">↻</button>
            {/* 左 */}
            <button className={sideBtn} onPointerDown={e=>{e.preventDefault();fire('left')}} title="左移">◀</button>
            {/* 右 */}
            <button className={sideBtn} onPointerDown={e=>{e.preventDefault();fire('right')}} title="右移">▶</button>
            <button className={sideBtn} onPointerDown={e=>{e.preventDefault();fire('down')}} title="加速下落">▼</button>
            <button className={`${sideBtn} !bg-red-600/60 active:!bg-red-500`} onPointerDown={e=>{e.preventDefault();fire('drop')}} title="直接落下">⏬</button>
          </div>
        )}
      </div>

      {gameState === 'idle' && <Button type="primary" className="mt-4" onClick={startGame}>开始游戏</Button>}
      {gameState === 'over' && (
        <div className="mt-4 text-center">
          <Text className="!text-red-400 !block mb-2">游戏结束! 得分: {score}</Text>
          <Button type="primary" onClick={startGame}>重新开始</Button>
        </div>
      )}
      {gameState === 'playing' && (
        <Text className="!text-gray-500 !text-xs mt-2">键盘：← → ↑ ↓ 空格 | 或点击右侧按钮</Text>
      )}
    </div>
  );
};

export default TetrisGame;
