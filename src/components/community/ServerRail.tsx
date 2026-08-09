'use client';

import { Server } from './types';
import { Plus, Compass, MessageSquare } from 'lucide-react';

interface ServerRailProps {
  servers: Server[];
  activeServerId: string;
  onSelectServer: (id: string) => void;
  onOpenCreateModal: () => void;
}

export function ServerRail({ servers, activeServerId, onSelectServer, onOpenCreateModal }: ServerRailProps) {
  return (
    <div className="w-[72px] glass-panel flex flex-col items-center py-3 space-y-2.5 flex-shrink-0 select-none z-20 border-r-0 rounded-none" style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Home / Direct Messages Icon */}
      <div className="relative group flex items-center justify-center w-full">
        <div className="absolute left-0 w-1 rounded-r-full transition-all duration-200 h-0 group-hover:h-5 opacity-0 group-hover:opacity-100 bg-gradient-to-b from-indigo-400 to-cyan-400" />
        <button className="w-12 h-12 rounded-2xl glass-panel glass-panel-hover text-white/60 hover:text-white flex items-center justify-center transition-all duration-200 group-hover:scale-105 hover:glow-active">
          <MessageSquare className="w-5 h-5" />
        </button>
      </div>

      <div className="w-8 h-[1px] aurora-divider rounded-full my-0.5" />

      {/* Server List */}
      <div className="flex-1 w-full space-y-2.5 overflow-y-auto no-scrollbar flex flex-col items-center">
        {servers.map((server) => {
          const isActive = server.id === activeServerId;
          const hasUnread = (server.unreadCount && server.unreadCount > 0);

          return (
            <div key={server.id} className="relative group flex items-center justify-center w-full">
              {/* Active / Unread indicator bar */}
              <div 
                className={`absolute left-0 w-1 rounded-r-full transition-all duration-200 ${
                  isActive 
                    ? 'h-10 opacity-100 bg-gradient-to-b from-indigo-400 to-cyan-400' 
                    : hasUnread 
                      ? 'h-2 opacity-100 bg-white/60' 
                      : 'h-0 group-hover:h-5 opacity-0 group-hover:opacity-100 bg-white/30'
                }`} 
              />

              {/* Server Button */}
              <button
                onClick={() => onSelectServer(server.id)}
                className={`relative w-12 h-12 flex items-center justify-center transition-all duration-200 ${
                  isActive 
                    ? 'rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-white scale-105 glow-active' 
                    : 'rounded-2xl glass-panel glass-panel-hover text-white/60 hover:text-white'
                }`}
                title={server.name}
              >
                {server.iconUrl ? (
                  <img 
                    src={server.iconUrl} 
                    alt={server.name} 
                    className={`w-full h-full object-cover rounded-2xl ${isActive ? 'ring-2 ring-cyan-400/40' : ''}`}
                  />
                ) : (
                  <span className="font-bold text-xs uppercase tracking-wider font-display">
                    {server.initials || server.name.substring(0, 2)}
                  </span>
                )}

                {/* Unread Badge */}
                {server.unreadCount && server.unreadCount > 0 && (
                  <span className="absolute -bottom-1 -right-1 bg-[var(--status-dnd)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-[var(--aurora-via)] min-w-[20px] text-center shadow-lg">
                    {server.unreadCount}
                  </span>
                )}
              </button>
            </div>
          );
        })}

        {/* Add Server / Group Button */}
        <div className="relative group flex items-center justify-center w-full pt-1">
          <div className="absolute left-0 w-1 rounded-r-full transition-all duration-200 h-0 group-hover:h-5 opacity-0 group-hover:opacity-100 bg-gradient-to-b from-indigo-400 to-cyan-400" />
          <button 
            onClick={onOpenCreateModal}
            className="w-12 h-12 rounded-2xl glass-panel text-cyan-400 hover:text-cyan-300 flex items-center justify-center transition-all duration-200 group-hover:scale-105 hover:glow-cyan"
            title="Створити групу / спільноту"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Explore Communities Button */}
        <div className="relative group flex items-center justify-center w-full">
          <div className="absolute left-0 w-1 rounded-r-full transition-all duration-200 h-0 group-hover:h-5 opacity-0 group-hover:opacity-100 bg-gradient-to-b from-indigo-400 to-cyan-400" />
          <button 
            className="w-12 h-12 rounded-2xl glass-panel text-indigo-400 hover:text-indigo-300 flex items-center justify-center transition-all duration-200 group-hover:scale-105 hover:glow-active"
            title="Огляд спільнот"
          >
            <Compass className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
