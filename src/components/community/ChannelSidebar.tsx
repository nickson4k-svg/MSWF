'use client';

import { useState } from 'react';
import { Server } from './types';
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
    <div className="w-[240px] bg-zinc-900/80 backdrop-blur-xl flex flex-col h-full flex-shrink-0 select-none border-r border-zinc-800/60 z-10">
      {/* Server Header Dropdown */}
      <button className="h-12 px-4 shadow-sm border-b border-zinc-800/60 flex items-center justify-between hover:bg-zinc-800/50 transition-colors group">
        <h1 className="font-bold text-zinc-100 text-sm truncate tracking-tight flex items-center gap-1.5">
          {server.name}
        </h1>
        <div className="flex items-center gap-1">
          <UserPlus className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
          <ChevronDown className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors ml-1" />
        </div>
      </button>

      {/* Main Channel Scroll Area */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 no-scrollbar">
        {/* Top-level Menu Items */}
        <div className="space-y-1">
          <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 transition-colors text-xs font-medium">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <span>Заходи</span>
          </button>
          <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 transition-colors text-xs font-medium">
            <Rocket className="w-4 h-4 text-purple-400" />
            <span>Бусти спільноти</span>
          </button>
        </div>

        {/* Category: Text Channels */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-1 mb-1 text-zinc-400 hover:text-zinc-200 group cursor-pointer">
            <button 
              onClick={() => setTextOpen(!textOpen)}
              className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400 group-hover:text-zinc-200"
            >
              {textOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <span>Текстові канали</span>
            </button>
            <button title="Створити канал">
              <Plus className="w-3.5 h-3.5 text-zinc-400 hover:text-white transition-colors" />
            </button>
          </div>

          {textOpen && server.channels.text.map((ch) => {
            const isActive = ch.id === activeChannelId;
            return (
              <button
                key={ch.id}
                onClick={() => onSelectChannel(ch.id)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all text-xs font-medium group ${
                  isActive 
                    ? 'bg-blue-600/20 border border-blue-500/30 text-white font-semibold shadow-sm' 
                    : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                }`}
              >
                <Hash className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                <span className="truncate">{ch.name}</span>
                {ch.unread && !isActive && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-blue-500 shadow-sm" />
                )}
              </button>
            );
          })}
        </div>

        {/* Category: Voice Channels */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-1 mb-1 text-zinc-400 hover:text-zinc-200 group cursor-pointer">
            <button 
              onClick={() => setVoiceOpen(!voiceOpen)}
              className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400 group-hover:text-zinc-200"
            >
              {voiceOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <span>Голосові канали</span>
            </button>
            <button title="Створити голосовий канал">
              <Plus className="w-3.5 h-3.5 text-zinc-400 hover:text-white transition-colors" />
            </button>
          </div>

          {voiceOpen && server.channels.voice.map((ch) => {
            const hasUsers = ch.connectedUsers && ch.connectedUsers.length > 0;
            return (
              <div key={ch.id} className="space-y-1">
                <button
                  onClick={() => onSelectChannel(ch.id)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 transition-colors text-xs font-medium group"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Volume2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="truncate">{ch.name}</span>
                  </div>
                  {hasUsers && (
                    <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
                      18:27
                    </span>
                  )}
                </button>

                {/* Connected Voice Users */}
                {ch.connectedUsers && ch.connectedUsers.length > 0 && (
                  <div className="pl-5 space-y-1">
                    <button className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 py-0.5 px-1 rounded transition-colors">
                      <span className="truncate">Обрати статус каналу</span>
                      <Edit2 className="w-2.5 h-2.5 ml-0.5" />
                    </button>

                    {ch.connectedUsers.map((usr) => (
                      <div 
                        key={usr.id} 
                        className="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-zinc-800/50 transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <img 
                            src={usr.avatarUrl} 
                            alt={usr.name} 
                            className="w-5 h-5 rounded-full object-cover border border-emerald-500/60" 
                          />
                          <span className="text-xs text-zinc-200 font-medium truncate">
                            {usr.name}
                          </span>
                        </div>
                        
                        {usr.customStatus && (
                          <span className="text-[9px] bg-zinc-950 text-emerald-400 font-bold px-1 py-0.5 rounded border border-emerald-500/30">
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
      <div className="mt-auto flex flex-col p-2 space-y-2 bg-zinc-950/80 border-t border-zinc-800/60">
        {/* Active Voice Connection Bar */}
        {inVoiceCall && (
          <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 backdrop-blur-md shadow-md">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 truncate">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse flex-shrink-0" />
                <div className="flex flex-col text-left truncate">
                  <span className="text-[11px] font-bold text-emerald-400 leading-none">
                    Голосовий зв&apos;язок підключено
                  </span>
                  <span className="text-[10px] text-zinc-400 truncate mt-0.5">
                    Бабелан / {server.name}
                  </span>
                </div>
              </div>
              <button onClick={() => setInVoiceCall(false)} title="Відключитися">
                <PhoneOff className="w-4 h-4 text-red-400 hover:text-red-300 transition-colors" />
              </button>
            </div>

            {/* Quick action buttons row */}
            <div className="grid grid-cols-4 gap-1 pt-1">
              <button 
                onClick={() => setIsMicMuted(!isMicMuted)}
                className={`h-7 rounded-lg flex items-center justify-center transition-all ${
                  isMicMuted ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                }`}
                title="Мікрофон"
              >
                {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>

              <button 
                className="h-7 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg flex items-center justify-center transition-all"
                title="Поділитися екраном"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>

              <button 
                className="h-7 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg flex items-center justify-center transition-all"
                title="Реакції"
              >
                <Smile className="w-3.5 h-3.5" />
              </button>

              <button 
                onClick={() => setInVoiceCall(false)}
                className="h-7 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-lg flex items-center justify-center transition-all"
                title="Завершити виклик"
              >
                <PhoneOff className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* User Control Panel */}
        <div className="h-12 px-2 flex items-center justify-between rounded-xl bg-zinc-900/90 border border-zinc-800">
          <div className="flex items-center gap-2 p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer min-w-0">
            <div className="relative flex-shrink-0">
              <img 
                src={currentUser.avatarUrl} 
                alt={currentUser.name} 
                className="w-7 h-7 rounded-full object-cover border border-zinc-700" 
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-zinc-900" />
            </div>
            <div className="flex flex-col truncate leading-tight">
              <span className="text-xs font-bold text-zinc-100 truncate">
                {currentUser.name}
              </span>
              <span className="text-[9px] text-emerald-400 truncate flex items-center gap-0.5">
                <Volume2 className="w-2.5 h-2.5 inline" />
                У голосовому чаті...
              </span>
            </div>
          </div>

          <div className="flex items-center gap-0.5 text-zinc-400">
            <button 
              onClick={() => setIsMicMuted(!isMicMuted)}
              className="p-1 hover:bg-zinc-800 hover:text-white rounded transition-colors"
              title="Мікрофон"
            >
              {isMicMuted ? <MicOff className="w-3.5 h-3.5 text-red-400" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
            <button 
              onClick={() => setIsDeafened(!isDeafened)}
              className="p-1 hover:bg-zinc-800 hover:text-white rounded transition-colors"
              title="Навушники"
            >
              <Headphones className={`w-3.5 h-3.5 ${isDeafened ? 'text-red-400' : ''}`} />
            </button>
            <button 
              className="p-1 hover:bg-zinc-800 hover:text-white rounded transition-colors"
              title="Налаштування"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
