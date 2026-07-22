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

  // Scale factor for 180px canvas into tiny status icons
  const scaleClasses = {
    sm: 'scale-[0.09]', // 180px * 0.09 = ~16px
    md: 'scale-[0.11]', // 180px * 0.11 = ~20px
    lg: 'scale-[0.13]', // 180px * 0.13 = ~24px
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.md;
  const currentScaleClass = scaleClasses[size] || scaleClasses.md;
  const colorFront = isOnline ? '#00ff44' : '#71717a';

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
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden border ${
        isOnline
          ? 'border-emerald-400/80 shadow-[0_0_8px_rgba(0,255,68,0.7)]'
          : 'border-zinc-700 shadow-none'
      } flex-shrink-0 ${currentSizeClass} ${className}`}
      title={isOnline ? 'Мережа: Онлайн' : 'Мережа: Офлайн'}
    >
      <div className={`w-[180px] h-[180px] flex-shrink-0 flex items-center justify-center ${currentScaleClass} transform-gpu`}>
        <Dithering
          width={180}
          height={180}
          colorBack="#000000"
          colorFront={colorFront}
          shape="sphere"
          type="4x4"
          size={8.8}
          speed={isOnline ? 1 : 0}
          scale={0.6}
          fit="cover"
        />
      </div>
    </div>
  );
};
