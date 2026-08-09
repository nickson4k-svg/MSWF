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

    // --- LOW-SCALING OPTIMIZATION FOR 4K PERFORMANCE ---
    // Downscale render buffer to max 960x540 (0.45x resolution max)
    // Browser GPU will scale canvas up to 4K smoothly using hardware acceleration!
    const SCALE_FACTOR = 0.45;
    let renderWidth = Math.min(960, Math.floor(window.innerWidth * SCALE_FACTOR));
    let renderHeight = Math.min(540, Math.floor(window.innerHeight * SCALE_FACTOR));

    canvas.width = renderWidth;
    canvas.height = renderHeight;

    const handleResize = () => {
      if (!canvas) return;
      renderWidth = Math.min(960, Math.floor(window.innerWidth * SCALE_FACTOR));
      renderHeight = Math.min(540, Math.floor(window.innerHeight * SCALE_FACTOR));
      canvas.width = renderWidth;
      canvas.height = renderHeight;
    };

    window.addEventListener('resize', handleResize);

    let time = 0;

    // Starfield Particle Data (downscaled counts)
    const starCount = 80;
    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * renderWidth,
      y: Math.random() * renderHeight,
      z: Math.random() * renderWidth,
      size: Math.random() * 1.5 + 0.5,
      color: Math.random() > 0.4 ? '#22d3ee' : Math.random() > 0.5 ? '#818cf8' : '#c084fc'
    }));

    // High performance render loop without expensive ctx.filter = blur()
    const render = () => {
      time += 0.006;

      ctx.clearRect(0, 0, renderWidth, renderHeight);

      if (preset === 'aurora') {
        // --- 1. COSMIC AURORA (Fast Radial Blends) ---
        const bgGrad = ctx.createLinearGradient(0, 0, renderWidth, renderHeight);
        bgGrad.addColorStop(0, '#0c1330');
        bgGrad.addColorStop(0.5, '#151a45');
        bgGrad.addColorStop(1, '#0a0e27');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, renderWidth, renderHeight);

        // Aurora Orb 1 (Indigo / Cyan)
        const wave1X = renderWidth * 0.35 + Math.sin(time * 1.2) * (renderWidth * 0.25);
        const wave1Y = renderHeight * 0.4 + Math.cos(time * 0.8) * (renderHeight * 0.2);
        const rad1 = ctx.createRadialGradient(wave1X, wave1Y, 10, wave1X, wave1Y, renderWidth * 0.5);
        rad1.addColorStop(0, 'rgba(99, 102, 241, 0.40)');
        rad1.addColorStop(0.5, 'rgba(34, 211, 238, 0.25)');
        rad1.addColorStop(1, 'rgba(12, 19, 48, 0)');
        ctx.fillStyle = rad1;
        ctx.fillRect(0, 0, renderWidth, renderHeight);

        // Aurora Orb 2 (Purple / Magenta)
        const wave2X = renderWidth * 0.65 + Math.cos(time * 1.1) * (renderWidth * 0.25);
        const wave2Y = renderHeight * 0.6 + Math.sin(time * 0.9) * (renderHeight * 0.2);
        const rad2 = ctx.createRadialGradient(wave2X, wave2Y, 10, wave2X, wave2Y, renderWidth * 0.55);
        rad2.addColorStop(0, 'rgba(168, 85, 247, 0.35)');
        rad2.addColorStop(0.5, 'rgba(99, 102, 241, 0.20)');
        rad2.addColorStop(1, 'rgba(10, 14, 39, 0)');
        ctx.fillStyle = rad2;
        ctx.fillRect(0, 0, renderWidth, renderHeight);

      } else if (preset === 'nebula') {
        // --- 2. CYBER NEBULA ---
        ctx.fillStyle = '#070a1a';
        ctx.fillRect(0, 0, renderWidth, renderHeight);

        const orb1X = renderWidth * 0.3 + Math.sin(time * 0.7) * (renderWidth * 0.2);
        const orb1Y = renderHeight * 0.3 + Math.cos(time * 0.9) * (renderHeight * 0.2);
        const rad1 = ctx.createRadialGradient(orb1X, orb1Y, 10, orb1X, orb1Y, renderWidth * 0.4);
        rad1.addColorStop(0, 'rgba(192, 132, 252, 0.35)');
        rad1.addColorStop(0.5, 'rgba(99, 102, 241, 0.15)');
        rad1.addColorStop(1, 'transparent');
        ctx.fillStyle = rad1;
        ctx.fillRect(0, 0, renderWidth, renderHeight);

        const orb2X = renderWidth * 0.7 + Math.cos(time * 0.8) * (renderWidth * 0.25);
        const orb2Y = renderHeight * 0.6 + Math.sin(time * 1.1) * (renderHeight * 0.2);
        const rad2 = ctx.createRadialGradient(orb2X, orb2Y, 10, orb2X, orb2Y, renderWidth * 0.45);
        rad2.addColorStop(0, 'rgba(34, 211, 238, 0.30)');
        rad2.addColorStop(0.5, 'rgba(236, 72, 153, 0.15)');
        rad2.addColorStop(1, 'transparent');
        ctx.fillStyle = rad2;
        ctx.fillRect(0, 0, renderWidth, renderHeight);

      } else if (preset === 'plasma') {
        // --- 3. PLASMA FLOW ---
        ctx.fillStyle = '#050714';
        ctx.fillRect(0, 0, renderWidth, renderHeight);

        const cx = renderWidth / 2;
        const cy = renderHeight / 2;

        for (let i = 0; i < 3; i++) {
          const px = cx + Math.sin(time * 1.2 + i * 1.5) * (renderWidth * 0.25);
          const py = cy + Math.cos(time * 0.9 + i * 1.2) * (renderHeight * 0.25);
          const plasmaGrad = ctx.createRadialGradient(px, py, 20, px, py, renderWidth * 0.35);
          plasmaGrad.addColorStop(0, i % 2 === 0 ? 'rgba(34, 211, 238, 0.30)' : 'rgba(129, 140, 248, 0.30)');
          plasmaGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = plasmaGrad;
          ctx.fillRect(0, 0, renderWidth, renderHeight);
        }

      } else if (preset === 'stars') {
        // --- 4. HYPER SPACE STARFIELD ---
        ctx.fillStyle = '#060818';
        ctx.fillRect(0, 0, renderWidth, renderHeight);

        stars.forEach((star) => {
          star.z -= 1.2;
          if (star.z <= 0) {
            star.z = renderWidth;
            star.x = Math.random() * renderWidth;
            star.y = Math.random() * renderHeight;
          }

          const k = 180 / star.z;
          const px = (star.x - renderWidth / 2) * k + renderWidth / 2;
          const py = (star.y - renderHeight / 2) * k + renderHeight / 2;

          if (px >= 0 && px <= renderWidth && py >= 0 && py <= renderHeight) {
            const size = Math.max(0.5, (1 - star.z / renderWidth) * star.size * 2.5);
            const alpha = Math.min(1, (1 - star.z / renderWidth) * 1.2);
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
      className="fixed inset-0 w-full h-full pointer-events-none z-0 transition-opacity duration-700 image-rendering-auto transform-gpu"
      style={{ imageRendering: 'auto' }}
    />
  );
}
