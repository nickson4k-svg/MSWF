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

  const getAvatarRingClass = (status: Member['status']) => {
    switch (status) {
      case 'online': return 'avatar-ring-online';
      case 'dnd': return 'avatar-ring-dnd';
      case 'idle': return 'avatar-ring-idle';
      default: return 'avatar-ring-offline';
    }
  };

  return (
    <div className="w-[240px] glass-panel flex flex-col h-full flex-shrink-0 select-none overflow-y-auto px-3 py-4 space-y-5 no-scrollbar z-10 rounded-none border-l-0" style={{ borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Activity Feed Section */}
      {activeMembers.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-white/30 hover:text-white/60 cursor-pointer group px-1">
            <h3 className="text-[11px] font-bold uppercase tracking-wider font-display">
              Активність — {activeMembers.length}
            </h3>
            <Settings className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <div className="space-y-2">
            {activeMembers.map((m) => (
              <div 
                key={m.id} 
                className="glass-panel p-2.5 rounded-2xl hover:bg-white/[0.07] transition-all cursor-pointer group shadow-md"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 truncate">
                    <img 
                      src={m.avatarUrl} 
                      alt={m.name} 
                      className={`w-5 h-5 rounded-md object-cover ${getAvatarRingClass(m.status)}`}
                    />
                    <span className="text-xs font-semibold truncate hover:underline accent-gradient-text font-display">
                      {m.name}
                    </span>
                  </div>
                  <Gamepad2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                </div>

                <div className="glass-panel p-2 rounded-xl flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate font-display">
                      {m.activity?.game}
                    </div>
                    <div className="text-[10px] text-[var(--status-online)] font-medium truncate flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-online)] animate-pulse" />
                      {m.activity?.duration || 'Новий гравець'}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-lg glass-panel flex items-center justify-center font-bold text-[10px] text-white/50 uppercase ml-2 flex-shrink-0 font-display">
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
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-white/30 px-1 mb-1 font-display">
          В мережі — {onlineMembers.length}
        </h3>

        {onlineMembers.map((m) => (
          <div 
            key={m.id} 
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-white/[0.05] transition-colors cursor-pointer group"
          >
            <div className="relative flex-shrink-0">
              <img 
                src={m.avatarUrl} 
                alt={m.name} 
                className={`w-7 h-7 rounded-xl object-cover ${getAvatarRingClass(m.status)}`}
              />
            </div>

            <div className="flex flex-col truncate leading-tight min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold truncate group-hover:underline accent-gradient-text font-display">
                  {m.name}
                </span>
                {m.isBot && (
                  <span className="bg-gradient-to-r from-indigo-500 to-cyan-400 text-white text-[8px] font-bold px-1 rounded uppercase tracking-wider shadow-sm">
                    БОТ
                  </span>
                )}
              </div>

              {m.customStatus && (
                <span className="text-[10px] text-white/30 truncate flex items-center gap-1">
                  {m.customStatus.includes('голосовому') && (
                    <Volume2 className="w-2.5 h-2.5 text-cyan-400 inline flex-shrink-0" />
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
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-white/20 px-1 mb-1 font-display">
          Не в мережі — {offlineMembers.length}
        </h3>

        {offlineMembers.map((m) => (
          <div 
            key={m.id} 
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-white/[0.03] transition-colors cursor-pointer opacity-40 hover:opacity-70"
          >
            <div className="relative flex-shrink-0">
              <img 
                src={m.avatarUrl} 
                alt={m.name} 
                className="w-7 h-7 rounded-xl object-cover grayscale avatar-ring-offline" 
              />
            </div>

            <span className="text-xs font-medium text-white/40 truncate font-display">
              {m.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
