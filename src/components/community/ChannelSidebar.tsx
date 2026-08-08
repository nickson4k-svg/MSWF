'use client';

import { useState } from 'react';
import { Server, Channel } from './types';
import { 
  ChevronDown, ChevronRight, Hash, Volume2, Calendar, Rocket, 
  Plus, UserPlus, Mic, MicOff, Headphones, Settings, Radio, 
  PhoneOff, Monitor, Smile, Edit2
} from 'lucide-react';

interface ChannelSidebarProps {
  server: Server;
  activeChannelId: string;
  onSelectChannel: (channelId: string) => void;
  currentUser: {
    name: string;
    avatarUrl: string;
    status: 'online' | 'dnd' | 'idle' | 'offline';
  };
}

export function ChannelSidebar({ server, activeChannelId, onSelectChannel, currentUser }: ChannelSidebarProps) {
  const [textOpen, setTextOpen] = useState(true);
  const [voiceOpen, setVoiceOpen] = useState(true);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [inVoiceCall, setInVoiceCall] = useState(true);

  return (
    <div className="w-[240px] bg-[#2b2d31] flex flex-col h-full flex-shrink-0 select-none border-r border-[#1f2023]/40 z-10">
      {/* Server Header Dropdown */}
      <button className="h-12 px-4 shadow-sm border-b border-[#1f2023]/60 flex items-center justify-between hover:bg-[#35373c] transition-colors group">
        <h1 className="font-bold text-white text-base truncate tracking-tight flex items-center gap-1.5">
          {server.name}
        </h1>
        <div className="flex items-center gap-1">
          <UserPlus className="w-4 h-4 text-[#949ba4] group-hover:text-white transition-colors" />
          <ChevronDown className="w-4 h-4 text-[#949ba4] group-hover:text-white transition-colors ml-1" />
        </div>
      </button>

      {/* Main Channel Scroll Area */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 no-scrollbar">
        {/* Top-level Menu Items */}
        <div className="space-y-0.5">
          <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1] transition-colors text-sm font-medium">
            <Calendar className="w-4 h-4 text-[#949ba4]" />
            <span>Мероприятия</span>
          </button>
          <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1] transition-colors text-sm font-medium">
            <Rocket className="w-4 h-4 text-[#f47fff]" />
            <span>Бусты сервера</span>
          </button>
        </div>

        {/* Category: Text Channels */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between px-1 mb-1 text-[#949ba4] hover:text-[#dbdee1] group cursor-pointer">
            <button 
              onClick={() => setTextOpen(!textOpen)}
              className="flex items-center gap-1 text-[12px] font-bold uppercase tracking-wider text-[#949ba4] group-hover:text-[#dbdee1]"
            >
              {textOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <span>Текстовые каналы</span>
            </button>
            <button title="Створити канал"><Plus className="w-3.5 h-3.5 text-[#949ba4] hover:text-white transition-colors" /></button>
          </div>

          {textOpen && server.channels.text.map((ch) => {
            const isActive = ch.id === activeChannelId;
            return (
              <button
                key={ch.id}
                onClick={() => onSelectChannel(ch.id)}
                className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded transition-all text-sm group ${
                  isActive 
                    ? 'bg-[#404249] text-white font-medium shadow-sm' 
                    : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
                }`}
              >
                <Hash className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#80848e] group-hover:text-[#dbdee1]'}`} />
                <span className="truncate">{ch.name}</span>
                {ch.unread && !isActive && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-white shadow-sm" />
                )}
              </button>
            );
          })}
        </div>

        {/* Category: Voice Channels */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between px-1 mb-1 text-[#949ba4] hover:text-[#dbdee1] group cursor-pointer">
            <button 
              onClick={() => setVoiceOpen(!voiceOpen)}
              className="flex items-center gap-1 text-[12px] font-bold uppercase tracking-wider text-[#949ba4] group-hover:text-[#dbdee1]"
            >
              {voiceOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <span>Голосовые каналы</span>
            </button>
            <button title="Створити голосовий канал"><Plus className="w-3.5 h-3.5 text-[#949ba4] hover:text-white transition-colors" /></button>
          </div>

          {voiceOpen && server.channels.voice.map((ch) => {
            const hasUsers = ch.connectedUsers && ch.connectedUsers.length > 0;
            return (
              <div key={ch.id} className="space-y-1">
                <button
                  onClick={() => onSelectChannel(ch.id)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1] transition-colors text-sm group"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Volume2 className="w-4 h-4 text-[#23a55a] flex-shrink-0" />
                    <span className="truncate">{ch.name}</span>
                  </div>
                  {hasUsers && (
                    <span className="text-[11px] font-mono text-[#23a55a] font-semibold bg-[#23a55a]/10 px-1.5 py-0.5 rounded">
                      18:27
                    </span>
                  )}
                </button>

                {/* Connected Voice Users */}
                {ch.connectedUsers && ch.connectedUsers.length > 0 && (
                  <div className="pl-6 space-y-1">
                    {/* Status prompt */}
                    <button className="flex items-center gap-1 text-[11px] text-[#949ba4] hover:text-[#dbdee1] py-0.5 px-1 rounded transition-colors">
                      <span className="truncate">Выбрать статус канала</span>
                      <Edit2 className="w-3 h-3 ml-0.5" />
                    </button>

                    {ch.connectedUsers.map((usr) => (
                      <div 
                        key={usr.id} 
                        className="flex items-center justify-between px-2 py-1 rounded hover:bg-[#35373c]/60 transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <img 
                            src={usr.avatarUrl} 
                            alt={usr.name} 
                            className="w-6 h-6 rounded-full object-cover border border-[#23a55a]" 
                          />
                          <span className="text-xs text-[#dbdee1] font-medium truncate">
                            {usr.name}
                          </span>
                        </div>
                        
                        {/* Status badges */}
                        {usr.customStatus && (
                          <span className="text-[10px] bg-[#1e1f22] text-[#23a55a] font-bold px-1 py-0.5 rounded flex items-center gap-0.5">
                            {usr.customStatus}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky Bottom Section: Active Voice Connection Bar & User Profile Bar */}
      <div className="mt-auto flex flex-col bg-[#1e1f22]/90 border-t border-[#1f2023]">
        {/* Active Voice Connection Bar */}
        {inVoiceCall && (
          <div className="p-2 border-b border-[#2b2d31] bg-[#1e1f22]">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <div className="flex items-center gap-2 truncate">
                <Radio className="w-4 h-4 text-[#23a55a] animate-pulse" />
                <div className="flex flex-col text-left truncate">
                  <span className="text-[11px] font-bold text-[#23a55a] leading-none">
                    Голосовая связь подключена
                  </span>
                  <span className="text-[10px] text-[#949ba4] truncate mt-0.5">
                    Бабелан / {server.name}
                  </span>
                </div>
              </div>
              <button onClick={() => setInVoiceCall(false)} title="Відключитися">
                <PhoneOff className="w-4 h-4 text-[#f23f43] hover:text-white cursor-pointer transition-colors" />
              </button>
            </div>

            {/* Quick action buttons row */}
            <div className="grid grid-cols-4 gap-1 pt-1">
              <button 
                onClick={() => setIsMicMuted(!isMicMuted)}
                className={`h-8 rounded flex items-center justify-center transition-colors ${
                  isMicMuted ? 'bg-[#f23f43] text-white' : 'bg-[#2b2d31] text-[#dbdee1] hover:bg-[#35373c]'
                }`}
                title="Мікрофон"
              >
                {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button 
                className="h-8 bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] rounded flex items-center justify-center transition-colors"
                title="Поділитися екраном"
              >
                <Monitor className="w-4 h-4" />
              </button>

              <button 
                className="h-8 bg-[#2b2d31] hover:bg-[#35373c] text-[#dbdee1] rounded flex items-center justify-center transition-colors"
                title="Реакції"
              >
                <Smile className="w-4 h-4" />
              </button>

              <button 
                onClick={() => setInVoiceCall(false)}
                className="h-8 bg-[#f23f43]/20 hover:bg-[#f23f43] text-[#f23f43] hover:text-white rounded flex items-center justify-center transition-colors"
                title="Завершити виклик"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* User Control Panel */}
        <div className="h-14 px-2 flex items-center justify-between bg-[#232428]">
          <div className="flex items-center gap-2 p-1 rounded-md hover:bg-[#35373c] transition-colors cursor-pointer min-w-0">
            <div className="relative flex-shrink-0">
              <img 
                src={currentUser.avatarUrl} 
                alt={currentUser.name} 
                className="w-8 h-8 rounded-full object-cover" 
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#23a55a] border-2 border-[#232428]" />
            </div>
            <div className="flex flex-col truncate leading-tight">
              <span className="text-xs font-bold text-white truncate">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-[#23a55a] truncate flex items-center gap-0.5">
                <Volume2 className="w-2.5 h-2.5 inline" />
                В голосовом чате...
              </span>
            </div>
          </div>

          <div className="flex items-center gap-0.5 text-[#b5bac1]">
            <button 
              onClick={() => setIsMicMuted(!isMicMuted)}
              className="p-1.5 hover:bg-[#35373c] hover:text-white rounded transition-colors"
              title="Мікрофон"
            >
              {isMicMuted ? <MicOff className="w-4 h-4 text-[#f23f43]" /> : <Mic className="w-4 h-4" />}
            </button>
            <button 
              onClick={() => setIsDeafened(!isDeafened)}
              className="p-1.5 hover:bg-[#35373c] hover:text-white rounded transition-colors"
              title="Навушники"
            >
              <Headphones className={`w-4 h-4 ${isDeafened ? 'text-[#f23f43]' : ''}`} />
            </button>
            <button 
              className="p-1.5 hover:bg-[#35373c] hover:text-white rounded transition-colors"
              title="Налаштування"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
