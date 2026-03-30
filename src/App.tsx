/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

const GRID_SIZE = 20;
const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_DIRECTION = 'UP';
const BASE_SPEED = 150;
const SPEED_INCREMENT = 2;

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type GameStatus = 'IDLE' | 'PLAYING' | 'GAMEOVER';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [status, setStatus] = useState<GameStatus>('IDLE');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('snake-high-score');
    return saved ? parseInt(saved, 10) : 0;
  });

  const directionRef = useRef<Direction>(INITIAL_DIRECTION);
  const lastUpdateTimeRef = useRef<number>(0);
  const requestRef = useRef<number>(null);

  const generateFood = useCallback((currentSnake: Point[]): Point => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      const isColliding = currentSnake.some(
        (segment) => segment.x === newFood.x && segment.y === newFood.y
      );
      if (!isColliding) break;
    }
    return newFood;
  }, []);

  const startGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    directionRef.current = INITIAL_DIRECTION;
    setScore(0);
    setFood(generateFood(INITIAL_SNAKE));
    setStatus('PLAYING');
    lastUpdateTimeRef.current = performance.now();
  };

  const gameOver = () => {
    setStatus('GAMEOVER');
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('snake-high-score', score.toString());
    }
  };

  const moveSnake = useCallback(() => {
    setSnake((prevSnake) => {
      const head = prevSnake[0];
      const newHead = { ...head };

      switch (directionRef.current) {
        case 'UP': newHead.y -= 1; break;
        case 'DOWN': newHead.y += 1; break;
        case 'LEFT': newHead.x -= 1; break;
        case 'RIGHT': newHead.x += 1; break;
      }

      // Wall collision
      if (
        newHead.x < 0 ||
        newHead.x >= GRID_SIZE ||
        newHead.y < 0 ||
        newHead.y >= GRID_SIZE
      ) {
        gameOver();
        return prevSnake;
      }

      // Self collision
      if (prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
        gameOver();
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Food collision
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore((s) => s + 10);
        setFood(generateFood(newSnake));
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [food, generateFood, score, highScore]);

  const gameLoop = useCallback((time: number) => {
    if (status === 'PLAYING') {
      const speed = Math.max(50, BASE_SPEED - (score / 10) * SPEED_INCREMENT);
      const deltaTime = time - lastUpdateTimeRef.current;

      if (deltaTime > speed) {
        moveSnake();
        lastUpdateTimeRef.current = time;
      }
    }

    // Drawing
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const cellSize = canvas.width / GRID_SIZE;
        
        // Clear background
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw grid lines (subtle)
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1;
        for (let i = 0; i <= GRID_SIZE; i++) {
          ctx.beginPath();
          ctx.moveTo(i * cellSize, 0);
          ctx.lineTo(i * cellSize, canvas.height);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, i * cellSize);
          ctx.lineTo(canvas.width, i * cellSize);
          ctx.stroke();
        }

        // Draw food
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff4444';
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.roundRect(
          food.x * cellSize + 2,
          food.y * cellSize + 2,
          cellSize - 4,
          cellSize - 4,
          4
        );
        ctx.fill();

        // Draw snake
        snake.forEach((segment, index) => {
          const isHead = index === 0;
          ctx.shadowBlur = isHead ? 20 : 10;
          ctx.shadowColor = isHead ? '#00ff00' : '#00cc00';
          ctx.fillStyle = isHead ? '#00ff00' : '#00aa00';
          
          ctx.beginPath();
          ctx.roundRect(
            segment.x * cellSize + 1,
            segment.y * cellSize + 1,
            cellSize - 2,
            cellSize - 2,
            isHead ? 6 : 4
          );
          ctx.fill();

          // Eyes for the head
          if (isHead) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#000';
            const eyeSize = cellSize / 6;
            // Position eyes based on direction
            let eye1 = { x: 0, y: 0 };
            let eye2 = { x: 0, y: 0 };
            
            if (directionRef.current === 'UP' || directionRef.current === 'DOWN') {
              eye1 = { x: segment.x * cellSize + cellSize/4, y: segment.y * cellSize + cellSize/3 };
              eye2 = { x: segment.x * cellSize + 3*cellSize/4, y: segment.y * cellSize + cellSize/3 };
            } else {
              eye1 = { x: segment.x * cellSize + cellSize/3, y: segment.y * cellSize + cellSize/4 };
              eye2 = { x: segment.x * cellSize + cellSize/3, y: segment.y * cellSize + 3*cellSize/4 };
            }
            ctx.fillRect(eye1.x - eyeSize/2, eye1.y - eyeSize/2, eyeSize, eyeSize);
            ctx.fillRect(eye2.x - eyeSize/2, eye2.y - eyeSize/2, eyeSize, eyeSize);
          }
        });
      }
    }

    requestRef.current = requestAnimationFrame(gameLoop);
  }, [status, snake, food, moveSnake, score]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameLoop]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          if (directionRef.current !== 'DOWN') directionRef.current = 'UP';
          break;
        case 'ArrowDown':
          if (directionRef.current !== 'UP') directionRef.current = 'DOWN';
          break;
        case 'ArrowLeft':
          if (directionRef.current !== 'RIGHT') directionRef.current = 'LEFT';
          break;
        case 'ArrowRight':
          if (directionRef.current !== 'LEFT') directionRef.current = 'RIGHT';
          break;
      }
      setDirection(directionRef.current);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Header */}
      <div className="w-full max-w-[500px] flex justify-between items-end mb-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter italic uppercase leading-none text-[#00ff00]">
            NEON<br />SNAKE
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] opacity-50 mt-1">Version 1.0.0 // Grid 20x20</p>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-2 text-[#ff4444] mb-1">
            <Trophy size={14} />
            <span className="text-xs font-mono tracking-wider">BEST: {highScore}</span>
          </div>
          <div className="text-3xl font-mono font-bold tabular-nums">
            {score.toString().padStart(4, '0')}
          </div>
        </div>
      </div>

      {/* Game Container */}
      <div className="relative group">
        {/* Decorative borders */}
        <div className="absolute -inset-1 bg-gradient-to-r from-[#00ff00] to-[#00cc00] rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
        
        <div className="relative bg-[#0a0a0a] rounded-lg border border-white/10 overflow-hidden shadow-2xl">
          <canvas
            ref={canvasRef}
            width={500}
            height={500}
            className="max-w-full h-auto block"
            style={{ imageRendering: 'pixelated' }}
          />

          {/* Overlays */}
          <AnimatePresence>
            {status === 'IDLE' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold italic uppercase tracking-tight">Ready to Hunt?</h2>
                    <p className="text-sm text-white/60 max-w-[240px]">Use arrow keys to navigate. Collect red nodes to grow and increase speed.</p>
                  </div>
                  <button
                    onClick={startGame}
                    className="group relative px-8 py-3 bg-[#00ff00] text-black font-bold uppercase tracking-widest text-sm rounded-full hover:scale-105 transition-transform flex items-center gap-2 mx-auto"
                  >
                    <Play size={18} fill="currentColor" />
                    Start Game
                  </button>
                </motion.div>
              </motion.div>
            )}

            {status === 'GAMEOVER' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-red-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black italic uppercase tracking-tighter text-[#ff4444]">System Crash</h2>
                    <div className="flex flex-col gap-1">
                      <p className="text-xs uppercase tracking-[0.2em] opacity-60">Final Score</p>
                      <p className="text-5xl font-mono font-bold">{score}</p>
                    </div>
                  </div>
                  <button
                    onClick={startGame}
                    className="group relative px-8 py-3 bg-white text-black font-bold uppercase tracking-widest text-sm rounded-full hover:scale-105 transition-transform flex items-center gap-2 mx-auto"
                  >
                    <RotateCcw size={18} />
                    Try Again
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Controls Help (Mobile/Desktop) */}
      <div className="mt-8 grid grid-cols-3 gap-2 opacity-30 hover:opacity-100 transition-opacity">
        <div />
        <div className="w-10 h-10 border border-white/20 rounded flex items-center justify-center bg-white/5">
          <ArrowUp size={16} className={direction === 'UP' ? 'text-[#00ff00]' : ''} />
        </div>
        <div />
        <div className="w-10 h-10 border border-white/20 rounded flex items-center justify-center bg-white/5">
          <ArrowLeft size={16} className={direction === 'LEFT' ? 'text-[#00ff00]' : ''} />
        </div>
        <div className="w-10 h-10 border border-white/20 rounded flex items-center justify-center bg-white/5">
          <ArrowDown size={16} className={direction === 'DOWN' ? 'text-[#00ff00]' : ''} />
        </div>
        <div className="w-10 h-10 border border-white/20 rounded flex items-center justify-center bg-white/5">
          <ArrowRight size={16} className={direction === 'RIGHT' ? 'text-[#00ff00]' : ''} />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-8 flex gap-8 text-[9px] uppercase tracking-[0.3em] opacity-20">
        <span>[ 20x20 Grid ]</span>
        <span>[ Canvas 2D ]</span>
        <span>[ HFR Enabled ]</span>
      </div>
    </div>
  );
}
