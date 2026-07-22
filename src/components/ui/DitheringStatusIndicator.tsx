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
    sm: 'w-3.5 h-3.5',
    md: 'w-4.5 h-4.5',
    lg: 'w-6 h-6',
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.md;
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
      className={`relative inline-block rounded-full overflow-hidden border border-zinc-800 shadow-md flex-shrink-0 ${currentSizeClass} ${className}`}
      title={isOnline ? 'Мережа: Онлайн' : 'Мережа: Офлайн'}
    >
      <Dithering
        width="100%"
        height="100%"
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
  );
};
