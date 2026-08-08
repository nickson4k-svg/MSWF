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
    <div className="w-[72px] bg-zinc-950 flex flex-col items-center py-3 space-y-2.5 flex-shrink-0 select-none z-20 border-r border-zinc-800/60">
      {/* Home / Direct Messages Icon */}
      <div className="relative group flex items-center justify-center w-full">
        <div className="absolute left-0 w-1 bg-blue-500 rounded-r-full transition-all duration-200 h-0 group-hover:h-5 opacity-0 group-hover:opacity-100 shadow-lg shadow-blue-500/50" />
        <button className="w-12 h-12 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 hover:bg-blue-600 hover:border-blue-500 text-zinc-300 hover:text-white flex items-center justify-center transition-all duration-200 shadow-lg group-hover:scale-105">
          <MessageSquare className="w-5 h-5" />
        </button>
      </div>

      <div className="w-8 h-[1px] bg-zinc-800/80 rounded-full my-0.5" />

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
                    ? 'h-10 opacity-100 bg-blue-500 shadow-lg shadow-blue-500/50' 
                    : hasUnread 
                      ? 'h-2 opacity-100 bg-zinc-300' 
                      : 'h-0 group-hover:h-5 opacity-0 group-hover:opacity-100 bg-zinc-400'
                }`} 
              />

              {/* Server Button */}
              <button
                onClick={() => onSelectServer(server.id)}
                className={`relative w-12 h-12 flex items-center justify-center transition-all duration-200 shadow-lg ${
                  isActive 
                    ? 'rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 border border-blue-400/30 text-white scale-105 shadow-blue-600/20' 
                    : 'rounded-2xl bg-zinc-900/80 border border-zinc-800/80 hover:border-blue-500/50 hover:bg-zinc-800/90 text-zinc-300 hover:text-white'
                }`}
                title={server.name}
              >
                {server.iconUrl ? (
                  <img 
                    src={server.iconUrl} 
                    alt={server.name} 
                    className="w-full h-full object-cover rounded-2xl" 
                  />
                ) : (
                  <span className="font-bold text-xs uppercase tracking-wider">
                    {server.initials || server.name.substring(0, 2)}
                  </span>
                )}

                {/* Unread Badge */}
                {server.unreadCount && server.unreadCount > 0 && (
                  <span className="absolute -bottom-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-zinc-950 min-w-[20px] text-center shadow-lg">
                    {server.unreadCount}
                  </span>
                )}
              </button>
            </div>
          );
        })}

        {/* Add Server / Group Button */}
        <div className="relative group flex items-center justify-center w-full pt-1">
          <div className="absolute left-0 w-1 bg-emerald-500 rounded-r-full transition-all duration-200 h-0 group-hover:h-5 opacity-0 group-hover:opacity-100 shadow-lg shadow-emerald-500/50" />
          <button 
            onClick={onOpenCreateModal}
            className="w-12 h-12 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 hover:bg-emerald-600/20 hover:border-emerald-500/50 text-emerald-400 hover:text-emerald-300 flex items-center justify-center transition-all duration-200 shadow-lg group-hover:scale-105"
            title="Створити групу / спільноту"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Explore Communities Button */}
        <div className="relative group flex items-center justify-center w-full">
          <div className="absolute left-0 w-1 bg-purple-500 rounded-r-full transition-all duration-200 h-0 group-hover:h-5 opacity-0 group-hover:opacity-100 shadow-lg shadow-purple-500/50" />
          <button 
            className="w-12 h-12 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 hover:bg-purple-600/20 hover:border-purple-500/50 text-purple-400 hover:text-purple-300 flex items-center justify-center transition-all duration-200 shadow-lg group-hover:scale-105"
            title="Огляд спільнот"
          >
            <Compass className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
