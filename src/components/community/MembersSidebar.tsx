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
      case 'online': return 'bg-[#23a55a]';
      case 'dnd': return 'bg-[#f23f43]';
      case 'idle': return 'bg-[#f0b232]';
      default: return 'bg-[#80848e]';
    }
  };

  return (
    <div className="w-[240px] bg-[#2b2d31] flex flex-col h-full flex-shrink-0 select-none overflow-y-auto px-3 py-4 space-y-6 no-scrollbar border-l border-[#1f2023]/40 z-10">
      {/* Activity Feed Section */}
      {activeMembers.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[#949ba4] hover:text-[#dbdee1] cursor-pointer group">
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Активность — {activeMembers.length}
            </h3>
            <Settings className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <div className="space-y-2">
            {activeMembers.map((m) => (
              <div 
                key={m.id} 
                className="bg-[#1e1f22] p-2.5 rounded-lg border border-[#383a40]/60 hover:border-[#5865f2]/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 truncate">
                    <img 
                      src={m.avatarUrl} 
                      alt={m.name} 
                      className="w-5 h-5 rounded-full object-cover" 
                    />
                    <span 
                      className="text-xs font-semibold truncate hover:underline"
                      style={{ color: m.roleColor || '#f23f43' }}
                    >
                      {m.name}
                    </span>
                  </div>
                  <Gamepad2 className="w-4 h-4 text-[#5865f2] flex-shrink-0" />
                </div>

                <div className="bg-[#2b2d31] p-2 rounded flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate">
                      {m.activity?.game}
                    </div>
                    <div className="text-[10px] text-[#23a55a] font-medium truncate flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#23a55a] animate-pulse" />
                      {m.activity?.duration || 'Новый игрок'}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded bg-[#1e1f22] border border-[#383a40] flex items-center justify-center font-bold text-[10px] text-white uppercase ml-2 flex-shrink-0">
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
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#949ba4] px-1 mb-1">
          В сети — {onlineMembers.length}
        </h3>

        {onlineMembers.map((m) => (
          <div 
            key={m.id} 
            className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-[#35373c] transition-colors cursor-pointer group"
          >
            <div className="relative flex-shrink-0">
              <img 
                src={m.avatarUrl} 
                alt={m.name} 
                className="w-8 h-8 rounded-full object-cover" 
              />
              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ${getStatusColor(m.status)} border-2 border-[#2b2d31]`} />
            </div>

            <div className="flex flex-col truncate leading-tight min-w-0">
              <div className="flex items-center gap-1.5">
                <span 
                  className="text-sm font-medium truncate group-hover:underline"
                  style={{ color: m.roleColor || '#dbdee1' }}
                >
                  {m.name}
                </span>
                {m.isBot && (
                  <span className="bg-[#5865f2] text-white text-[9px] font-bold px-1 rounded uppercase tracking-wider">
                    БОТ
                  </span>
                )}
              </div>

              {m.customStatus && (
                <span className="text-xs text-[#949ba4] truncate flex items-center gap-1">
                  {m.customStatus.includes('голосовом') && (
                    <Volume2 className="w-3 h-3 text-[#23a55a] inline flex-shrink-0" />
                  )}
                  {m.customStatus}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Offline Members List */}
      <div className="space-y-1 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#949ba4] px-1 mb-1">
          Не в сети — {offlineMembers.length}
        </h3>

        {offlineMembers.map((m) => (
          <div 
            key={m.id} 
            className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-[#35373c]/50 transition-colors cursor-pointer opacity-50 hover:opacity-100"
          >
            <div className="relative flex-shrink-0">
              <img 
                src={m.avatarUrl} 
                alt={m.name} 
                className="w-8 h-8 rounded-full object-cover grayscale" 
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#80848e] border-2 border-[#2b2d31]" />
            </div>

            <span className="text-sm font-medium text-[#949ba4] truncate">
              {m.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
