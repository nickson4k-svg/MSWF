'use client';

import { useEffect, useRef } from 'react';

export const DitheringStatusIndicator = ({
  isOnline = true,
  size = 'md',
  className = '',
}: {
  isOnline?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizePx = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const r = canvas.width * 0.38;

      // Dark background fill
      ctx.fillStyle = isOnline ? '#022c22' : '#18181b';
      ctx.beginPath();
      ctx.arc(cx, cy, cx - 1, 0, Math.PI * 2);
      ctx.fill();

      // Dithering 3D sphere points
      const color = isOnline ? '#00ff44' : '#a1a1aa';
      ctx.fillStyle = color;

      const numLats = 6;
      const numLongs = 8;

      for (let i = 0; i < numLats; i++) {
        const lat = (i / (numLats - 1)) * Math.PI - Math.PI / 2;
        const radiusLat = r * Math.cos(lat);
        const y = cy + r * Math.sin(lat);

        for (let j = 0; j < numLongs; j++) {
          const lon = (j / numLongs) * Math.PI * 2 + (isOnline ? t : 0);
          const x = cx + radiusLat * Math.cos(lon);
          const z = radiusLat * Math.sin(lon);

          // Only draw front-facing points of 3D sphere
          if (z > -2) {
            const dotSize = Math.max(2, (z / r) * 2 + 2.5);
            ctx.fillRect(Math.round(x - dotSize / 2), Math.round(y - dotSize / 2), Math.round(dotSize), Math.round(dotSize));
          }
        }
      }

      t += 0.04;
      if (isOnline) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isOnline, sizePx]);

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden border ${
        isOnline
          ? 'border-emerald-400/80 shadow-[0_0_8px_rgba(0,255,68,0.7)]'
          : 'border-zinc-700 shadow-none'
      } flex-shrink-0 ${size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'} ${className}`}
      title={isOnline ? 'Мережа: Онлайн' : 'Мережа: Офлайн'}
    >
      <canvas
        ref={canvasRef}
        width={sizePx * 2}
        height={sizePx * 2}
        className="w-full h-full"
      />
    </div>
  );
};
