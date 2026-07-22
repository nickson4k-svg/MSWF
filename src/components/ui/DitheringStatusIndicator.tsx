'use client';

import { useState, useEffect } from 'react';
import { Dithering } from '@paper-design/shaders-react';

export const DitheringStatusIndicator = ({
  isOnline = true,
  size = 'md',
  className = '',
}: {
  isOnline?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.md;
  const colorFront = isOnline ? '#00ff44' : '#9ca3af';
  const colorBack = isOnline ? '#022c22' : '#18181b';

  if (!mounted) {
    return (
      <span
        className={`inline-block rounded-full border border-zinc-900 ${currentSizeClass} ${
          isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'
        } ${className}`}
      />
    );
  }

  return (
    <div
      className={`relative inline-block rounded-full overflow-hidden border ${
        isOnline ? 'border-emerald-400/60 shadow-[0_0_10px_rgba(0,255,68,0.6)]' : 'border-zinc-700 shadow-none'
      } flex-shrink-0 ${currentSizeClass} ${className}`}
      title={isOnline ? 'Мережа: Онлайн' : 'Мережа: Офлайн'}
    >
      <Dithering
        width={40}
        height={40}
        colorBack={colorBack}
        colorFront={colorFront}
        shape="sphere"
        type="4x4"
        size={2.5}
        speed={isOnline ? 1.5 : 0}
        scale={1.2}
        fit="cover"
      />
    </div>
  );
};
