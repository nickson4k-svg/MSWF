'use client';

import { useTheme } from '@/components/ThemeProvider';
import { Moon, Sun, Laptop } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div className="flex items-center bg-zinc-900/80 border border-zinc-800/80 rounded-full p-1 backdrop-blur-xl shadow-inner">
      <button
        onClick={() => setTheme('light')}
        className={`p-1.5 rounded-full transition-all ${
          theme === 'light' ? 'bg-zinc-200 text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
        }`}
        title="Світла тема"
      >
        <Sun className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`p-1.5 rounded-full transition-all ${
          theme === 'system' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
        }`}
        title="Системна тема"
      >
        <Laptop className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`p-1.5 rounded-full transition-all ${
          theme === 'dark' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
        }`}
        title="Темна тема"
      >
        <Moon className="w-4 h-4" />
      </button>
    </div>
  );
}
