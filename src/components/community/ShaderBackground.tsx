'use client';

import { useEffect, useRef } from 'react';

export type ShaderPreset = 'aurora' | 'nebula' | 'plasma' | 'stars' | 'none';

interface ShaderBackgroundProps {
  preset: ShaderPreset;
}

export function ShaderBackground({ preset }: ShaderBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (preset === 'none') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    let time = 0;

    // --- Starfield Particle Data ---
    const starCount = 120;
    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      z: Math.random() * width,
      size: Math.random() * 2 + 0.5,
      color: Math.random() > 0.4 ? '#22d3ee' : Math.random() > 0.5 ? '#818cf8' : '#c084fc'
    }));

    // --- Main Render Loop ---
    const render = () => {
      time += 0.008;

      ctx.clearRect(0, 0, width, height);

      if (preset === 'aurora') {
        // --- 1. COSMIC AURORA SHADER ---
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#0c1330');
        grad.addColorStop(0.5, '#151a45');
        grad.addColorStop(1, '#0a0e27');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Aurora Wave 1 (Indigo / Cyan)
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.beginPath();
        for (let x = 0; x <= width; x += 10) {
          const y =
            height * 0.4 +
            Math.sin(x * 0.003 + time * 1.5) * 80 +
            Math.cos(x * 0.001 + time * 0.8) * 120 +
            Math.sin(time + x * 0.005) * 40;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();

        const auroraGrad1 = ctx.createLinearGradient(0, height * 0.2, width, height);
        auroraGrad1.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
        auroraGrad1.addColorStop(0.5, 'rgba(34, 211, 238, 0.25)');
        auroraGrad1.addColorStop(1, 'rgba(12, 19, 48, 0)');
        ctx.fillStyle = auroraGrad1;
        ctx.filter = 'blur(40px)';
        ctx.fill();
        ctx.restore();

        // Aurora Wave 2 (Purple / Magenta)
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.beginPath();
        for (let x = 0; x <= width; x += 10) {
          const y =
            height * 0.5 +
            Math.sin(x * 0.002 - time * 1.2) * 100 +
            Math.cos(x * 0.004 + time * 0.6) * 60;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();

        const auroraGrad2 = ctx.createLinearGradient(width, height * 0.3, 0, height);
        auroraGrad2.addColorStop(0, 'rgba(168, 85, 247, 0.30)');
        auroraGrad2.addColorStop(0.6, 'rgba(99, 102, 241, 0.20)');
        auroraGrad2.addColorStop(1, 'rgba(10, 14, 39, 0)');
        ctx.fillStyle = auroraGrad2;
        ctx.filter = 'blur(50px)';
        ctx.fill();
        ctx.restore();

      } else if (preset === 'nebula') {
        // --- 2. CYBER NEBULA SHADER ---
        ctx.fillStyle = '#070a1a';
        ctx.fillRect(0, 0, width, height);

        const orb1X = width * 0.3 + Math.sin(time * 0.7) * (width * 0.2);
        const orb1Y = height * 0.3 + Math.cos(time * 0.9) * (height * 0.2);
        const rad1 = ctx.createRadialGradient(orb1X, orb1Y, 10, orb1X, orb1Y, width * 0.4);
        rad1.addColorStop(0, 'rgba(192, 132, 252, 0.35)');
        rad1.addColorStop(0.5, 'rgba(99, 102, 241, 0.15)');
        rad1.addColorStop(1, 'transparent');
        ctx.fillStyle = rad1;
        ctx.fillRect(0, 0, width, height);

        const orb2X = width * 0.7 + Math.cos(time * 0.8) * (width * 0.25);
        const orb2Y = height * 0.6 + Math.sin(time * 1.1) * (height * 0.2);
        const rad2 = ctx.createRadialGradient(orb2X, orb2Y, 10, orb2X, orb2Y, width * 0.45);
        rad2.addColorStop(0, 'rgba(34, 211, 238, 0.30)');
        rad2.addColorStop(0.5, 'rgba(236, 72, 153, 0.15)');
        rad2.addColorStop(1, 'transparent');
        ctx.fillStyle = rad2;
        ctx.fillRect(0, 0, width, height);

      } else if (preset === 'plasma') {
        // --- 3. PLASMA FLOW SHADER ---
        ctx.fillStyle = '#050714';
        ctx.fillRect(0, 0, width, height);

        const cx = width / 2;
        const cy = height / 2;

        for (let i = 0; i < 4; i++) {
          const px = cx + Math.sin(time * 1.2 + i * 1.5) * (width * 0.3);
          const py = cy + Math.cos(time * 0.9 + i * 1.2) * (height * 0.3);
          const plasmaGrad = ctx.createRadialGradient(px, py, 20, px, py, width * 0.35);
          plasmaGrad.addColorStop(0, i % 2 === 0 ? 'rgba(34, 211, 238, 0.28)' : 'rgba(129, 140, 248, 0.28)');
          plasmaGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = plasmaGrad;
          ctx.fillRect(0, 0, width, height);
        }

      } else if (preset === 'stars') {
        // --- 4. HYPER SPACE SHADER ---
        ctx.fillStyle = '#060818';
        ctx.fillRect(0, 0, width, height);

        stars.forEach((star) => {
          star.z -= 1.5;
          if (star.z <= 0) {
            star.z = width;
            star.x = Math.random() * width;
            star.y = Math.random() * height;
          }

          const k = 256 / star.z;
          const px = (star.x - width / 2) * k + width / 2;
          const py = (star.y - height / 2) * k + height / 2;

          if (px >= 0 && px <= width && py >= 0 && py <= height) {
            const size = Math.max(0.5, (1 - star.z / width) * star.size * 3);
            const alpha = Math.min(1, (1 - star.z / width) * 1.2);
            ctx.fillStyle = star.color;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [preset]);

  if (preset === 'none') return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0 transition-opacity duration-700"
    />
  );
}
