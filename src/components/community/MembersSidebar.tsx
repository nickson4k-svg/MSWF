'use client';

import { Member } from './types';
import { Settings, Gamepad2, Volume2 } from 'lucide-react';

interface MembersSidebarProps {
  members: Member[];
}

export function MembersSidebar({ members }: MembersSidebarProps) {
  const activeMembers = members.filter(m => m.activity);
  const onlineMembers = members.filter(m => m.status !== 'offline');
  const offlineMembers = members.filter(m => m.status === 'offline');

  const getStatusColor = (status: Member['status']) => {
    switch (status) {
      case 'online': return 'bg-emerald-500';
      case 'dnd': return 'bg-red-500';
      case 'idle': return 'bg-amber-400';
      default: return 'bg-zinc-500';
    }
  };

  return (
    <div className="w-[240px] bg-zinc-900/80 backdrop-blur-xl flex flex-col h-full flex-shrink-0 select-none overflow-y-auto px-3 py-4 space-y-5 no-scrollbar border-l border-zinc-800/60 z-10">
      {/* Activity Feed Section */}
      {activeMembers.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-zinc-400 hover:text-zinc-200 cursor-pointer group px-1">
            <h3 className="text-[11px] font-bold uppercase tracking-wider">
              Активність — {activeMembers.length}
            </h3>
            <Settings className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <div className="space-y-2">
            {activeMembers.map((m) => (
              <div 
                key={m.id} 
                className="bg-zinc-950/60 p-2.5 rounded-2xl border border-zinc-800/80 hover:border-blue-500/40 transition-all cursor-pointer group shadow-md"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 truncate">
                    <img 
                      src={m.avatarUrl} 
                      alt={m.name} 
                      className="w-5 h-5 rounded-full object-cover border border-zinc-700" 
                    />
                    <span 
                      className="text-xs font-semibold truncate hover:underline"
                      style={{ color: m.roleColor || '#ef4444' }}
                    >
                      {m.name}
                    </span>
                  </div>
                  <Gamepad2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                </div>

                <div className="bg-zinc-900/90 p-2 rounded-xl border border-zinc-800 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-zinc-100 truncate">
                      {m.activity?.game}
                    </div>
                    <div className="text-[10px] text-emerald-400 font-medium truncate flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {m.activity?.duration || 'Новий гравець'}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center font-bold text-[10px] text-zinc-300 uppercase ml-2 flex-shrink-0">
                    {m.activity?.game.substring(0, 3)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Online Members List */}
      <div className="space-y-1">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-1 mb-1">
          В мережі — {onlineMembers.length}
        </h3>

        {onlineMembers.map((m) => (
          <div 
            key={m.id} 
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-zinc-800/60 transition-colors cursor-pointer group"
          >
            <div className="relative flex-shrink-0">
              <img 
                src={m.avatarUrl} 
                alt={m.name} 
                className="w-7 h-7 rounded-full object-cover border border-zinc-700" 
              />
              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ${getStatusColor(m.status)} border-2 border-zinc-900`} />
            </div>

            <div className="flex flex-col truncate leading-tight min-w-0">
              <div className="flex items-center gap-1.5">
                <span 
                  className="text-xs font-semibold truncate group-hover:underline"
                  style={{ color: m.roleColor || '#f4f4f5' }}
                >
                  {m.name}
                </span>
                {m.isBot && (
                  <span className="bg-blue-600 text-white text-[8px] font-bold px-1 rounded uppercase tracking-wider shadow-sm">
                    БОТ
                  </span>
                )}
              </div>

              {m.customStatus && (
                <span className="text-[10px] text-zinc-400 truncate flex items-center gap-1">
                  {m.customStatus.includes('голосовому') && (
                    <Volume2 className="w-2.5 h-2.5 text-emerald-400 inline flex-shrink-0" />
                  )}
                  {m.customStatus}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Offline Members List */}
      <div className="space-y-1 pt-1">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-1 mb-1">
          Не в мережі — {offlineMembers.length}
        </h3>

        {offlineMembers.map((m) => (
          <div 
            key={m.id} 
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-zinc-800/40 transition-colors cursor-pointer opacity-50 hover:opacity-90"
          >
            <div className="relative flex-shrink-0">
              <img 
                src={m.avatarUrl} 
                alt={m.name} 
                className="w-7 h-7 rounded-full object-cover grayscale" 
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-zinc-500 border-2 border-zinc-900" />
            </div>

            <span className="text-xs font-medium text-zinc-400 truncate">
              {m.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
