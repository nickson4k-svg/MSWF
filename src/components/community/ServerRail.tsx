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
    <div className="w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 space-y-2 flex-shrink-0 select-none z-20">
      {/* Home / Direct Messages Icon */}
      <div className="relative group flex items-center justify-center w-full">
        <div className="absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 h-0 group-hover:h-5 opacity-0 group-hover:opacity-100" />
        <button className="w-12 h-12 rounded-[24px] group-hover:rounded-[16px] bg-[#313338] hover:bg-[#5865f2] text-white flex items-center justify-center transition-all duration-200 shadow-md">
          <MessageSquare className="w-6 h-6" />
        </button>
      </div>

      <div className="w-8 h-[2px] bg-[#35363c] rounded-full my-1" />

      {/* Server List */}
      <div className="flex-1 w-full space-y-2 overflow-y-auto no-scrollbar flex flex-col items-center">
        {servers.map((server) => {
          const isActive = server.id === activeServerId;
          const hasUnread = (server.unreadCount && server.unreadCount > 0);

          return (
            <div key={server.id} className="relative group flex items-center justify-center w-full">
              {/* Active / Unread indicator bar */}
              <div 
                className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 ${
                  isActive ? 'h-10 opacity-100' : hasUnread ? 'h-2 opacity-100' : 'h-0 group-hover:h-5 opacity-0 group-hover:opacity-100'
                }`} 
              />

              {/* Server Button */}
              <button
                onClick={() => onSelectServer(server.id)}
                className={`relative w-12 h-12 flex items-center justify-center transition-all duration-200 shadow-md ${
                  isActive 
                    ? 'rounded-[16px] bg-[#5865f2] text-white' 
                    : 'rounded-[24px] group-hover:rounded-[16px] bg-[#313338] hover:bg-[#5865f2] text-[#dbdee1] hover:text-white'
                }`}
                title={server.name}
              >
                {server.iconUrl ? (
                  <img 
                    src={server.iconUrl} 
                    alt={server.name} 
                    className={`w-full h-full object-cover transition-all duration-200 ${isActive ? 'rounded-[16px]' : 'rounded-[24px] group-hover:rounded-[16px]'}`} 
                  />
                ) : (
                  <span className="font-bold text-sm uppercase tracking-wide">
                    {server.initials || server.name.substring(0, 2)}
                  </span>
                )}

                {/* Unread Badge */}
                {server.unreadCount && server.unreadCount > 0 && (
                  <span className="absolute -bottom-1 -right-1 bg-[#f23f43] text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full border-4 border-[#1e1f22] min-w-[20px] text-center shadow-lg">
                    {server.unreadCount}
                  </span>
                )}
              </button>
            </div>
          );
        })}

        {/* Add Server / Group Button */}
        <div className="relative group flex items-center justify-center w-full pt-1">
          <div className="absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 h-0 group-hover:h-5 opacity-0 group-hover:opacity-100" />
          <button 
            onClick={onOpenCreateModal}
            className="w-12 h-12 rounded-[24px] group-hover:rounded-[16px] bg-[#313338] hover:bg-[#23a55a] text-[#23a55a] hover:text-white flex items-center justify-center transition-all duration-200 shadow-md"
            title="Створити групу / сервер"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {/* Explore Communities Button */}
        <div className="relative group flex items-center justify-center w-full">
          <div className="absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 h-0 group-hover:h-5 opacity-0 group-hover:opacity-100" />
          <button 
            className="w-12 h-12 rounded-[24px] group-hover:rounded-[16px] bg-[#313338] hover:bg-[#23a55a] text-[#23a55a] hover:text-white flex items-center justify-center transition-all duration-200 shadow-md"
            title="Огляд спільнот"
          >
            <Compass className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
