'use client';

import { Server } from './types';
import { Plus, Compass, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ServerRailProps {
  servers: Server[];
  activeServerId: string;
  onSelectServer: (id: string) => void;
  onOpenCreateModal: () => void;
}

export function ServerRail({ servers, activeServerId, onSelectServer, onOpenCreateModal }: ServerRailProps) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2 p-1.5 glass-panel rounded-2xl shadow-xl select-none z-20 border-white/10">
      {/* Home / Direct Messages Icon */}
      <button 
        onClick={() => router.push('/')}
        className="w-10 h-10 rounded-xl glass-panel glass-panel-hover text-white/60 hover:text-white flex items-center justify-center transition-all duration-200 hover:scale-105 hover:glow-active flex-shrink-0"
        title="Головне меню / Приватні чати"
      >
        <MessageSquare className="w-4 h-4" />
      </button>

      <div className="w-[1px] h-6 aurora-divider rounded-full mx-0.5 flex-shrink-0" />

      {/* Horizontal Server List */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-[280px] sm:max-w-[400px] py-0.5">
        {servers.map((server) => {
          const isActive = server.id === activeServerId;
          const hasUnread = (server.unreadCount && server.unreadCount > 0);

          return (
            <button
              key={server.id}
              onClick={() => onSelectServer(server.id)}
              className={`relative w-10 h-10 flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
                isActive 
                  ? 'rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-white scale-105 glow-active' 
                  : 'rounded-xl glass-panel glass-panel-hover text-white/60 hover:text-white'
              }`}
              title={server.name}
            >
              {server.iconUrl ? (
                <img 
                  src={server.iconUrl} 
                  alt={server.name} 
                  className={`w-full h-full object-cover rounded-xl ${isActive ? 'ring-2 ring-cyan-400/50' : ''}`}
                />
              ) : (
                <span className="font-bold text-xs uppercase tracking-wider font-display">
                  {server.initials || server.name.substring(0, 2)}
                </span>
              )}

              {/* Active / Unread indicator dot */}
              {isActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-1 rounded-full bg-cyan-400 shadow-sm glow-cyan" />
              )}

              {/* Unread Badge */}
              {server.unreadCount && server.unreadCount > 0 && !isActive && (
                <span className="absolute -top-1 -right-1 bg-[var(--status-dnd)] text-white text-[9px] font-bold px-1 py-0.2 rounded-full border border-[var(--aurora-via)] min-w-[16px] text-center shadow-lg">
                  {server.unreadCount}
                </span>
              )}
            </button>
          );
        })}

        {/* Add Server / Group Button */}
        <button 
          onClick={onOpenCreateModal}
          className="w-10 h-10 rounded-xl glass-panel text-cyan-400 hover:text-cyan-300 flex items-center justify-center transition-all duration-200 hover:scale-105 hover:glow-cyan flex-shrink-0"
          title="Створити групу / спільноту"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Explore Communities Button */}
        <button 
          className="w-10 h-10 rounded-xl glass-panel text-indigo-400 hover:text-indigo-300 flex items-center justify-center transition-all duration-200 hover:scale-105 hover:glow-active flex-shrink-0"
          title="Огляд спільнот"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
