'use client';

import { ArrowLeft, Palette, Video as VideoIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DitheringStatusIndicator } from '@/components/ui/DitheringStatusIndicator';
import { ThemeToggle } from '@/components/ThemeToggle';
import { formatDistanceToNow } from 'date-fns';
import { uk } from 'date-fns/locale';

interface ChatHeaderProps {
  roomId: string;
  username: string;
  targetUsername?: string;
  targetPresence: { isOnline: boolean; lastSeen: number | null };
  typingText: string | null;
  onBack: () => void;
  onToggleThemePicker: () => void;
  onStartCall?: (target: string) => void;
}

export function ChatHeader({
  roomId,
  username,
  targetUsername,
  targetPresence,
  typingText,
  onBack,
  onToggleThemePicker,
  onStartCall,
}: ChatHeaderProps) {
  const otherUser = roomId.startsWith('private-')
    ? roomId.replace('private-', '').split('-').find((u) => u !== username)
    : null;

  return (
    <header className="flex items-center justify-between p-4 sm:px-6 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl z-10">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex flex-col">
          <h1 className="font-bold text-lg leading-tight text-zinc-100 flex items-center gap-2">
            <DitheringStatusIndicator isOnline={targetUsername ? targetPresence.isOnline : true} size="sm" />
            {otherUser ? `Приватний чат з ${otherUser}` : `Кімната ${roomId}`}
          </h1>
          <p className="text-xs text-zinc-400 font-medium h-4">
            {typingText ? (
              <span className="text-blue-400 flex items-center gap-1">
                {typingText.replace('...', '')}
                <span className="flex gap-[2px] ml-0.5">
                  <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '600ms' }} />
                  <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '600ms' }} />
                  <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '600ms' }} />
                </span>
              </span>
            ) : targetUsername ? (
              targetPresence.isOnline ? (
                <span className="text-emerald-500 font-semibold">В мережі</span>
              ) : targetPresence.lastSeen ? (
                <span>Був(ла) {formatDistanceToNow(targetPresence.lastSeen, { addSuffix: true, locale: uk })}</span>
              ) : (
                <span>Офлайн</span>
              )
            ) : (
              <>Ви увійшли як <span className="text-blue-400">{username}</span></>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleThemePicker}
          className="rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          title="Тема чату"
        >
          <Palette className="w-5 h-5" />
        </Button>
        {targetUsername && onStartCall && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onStartCall(targetUsername)}
            className="rounded-full hover:bg-emerald-950/40 text-emerald-400 hover:text-emerald-300 transition-colors"
            title="Відеодзвінок"
          >
            <VideoIcon className="w-5 h-5" />
          </Button>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
