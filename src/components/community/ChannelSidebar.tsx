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
    <div className="w-[240px] glass-panel flex flex-col h-full flex-shrink-0 select-none z-10 border-r-0 rounded-none" style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Server Header Dropdown */}
      <button className="h-12 px-4 shadow-sm flex items-center justify-between hover:bg-white/[0.06] transition-colors group" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <h1 className="font-bold text-white text-sm truncate tracking-tight flex items-center gap-1.5 font-display">
          {server.name}
        </h1>
        <div className="flex items-center gap-1">
          <UserPlus className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
          <ChevronDown className="w-4 h-4 text-white/40 group-hover:text-white transition-colors ml-1" />
        </div>
      </button>

      {/* Main Channel Scroll Area */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 no-scrollbar">
        {/* Top-level Menu Items */}
        <div className="space-y-1">
          <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-white/40 hover:bg-white/[0.06] hover:text-white/80 transition-colors text-xs font-medium">
            <Calendar className="w-4 h-4 text-white/40" />
            <span>Заходи</span>
          </button>
          <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-white/40 hover:bg-white/[0.06] hover:text-white/80 transition-colors text-xs font-medium">
            <Rocket className="w-4 h-4 text-indigo-400" />
            <span>Бусти спільноти</span>
          </button>
        </div>

        {/* Category: Text Channels */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-1 mb-1 text-white/30 hover:text-white/60 group cursor-pointer">
            <button 
              onClick={() => setTextOpen(!textOpen)}
              className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider font-display"
            >
              {textOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <span>Текстові канали</span>
            </button>
            <button title="Створити канал">
              <Plus className="w-3.5 h-3.5 text-white/30 hover:text-white transition-colors" />
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
                    ? 'bg-white/[0.08] text-white font-semibold glow-active' 
                    : 'text-white/40 hover:bg-white/[0.06] hover:text-white/80'
                }`}
                style={isActive ? { border: '1px solid rgba(99,102,241,0.25)' } : {}}
              >
                <Hash className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-white/25 group-hover:text-white/50'}`} />
                <span className="truncate">{ch.name}</span>
                {ch.unread && !isActive && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-gradient-to-r from-indigo-400 to-cyan-400 shadow-sm" />
                )}
              </button>
            );
          })}
        </div>

        {/* Category: Voice Channels */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-1 mb-1 text-white/30 hover:text-white/60 group cursor-pointer">
            <button 
              onClick={() => setVoiceOpen(!voiceOpen)}
              className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider font-display"
            >
              {voiceOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <span>Голосові канали</span>
            </button>
            <button title="Створити голосовий канал">
              <Plus className="w-3.5 h-3.5 text-white/30 hover:text-white transition-colors" />
            </button>
          </div>

          {voiceOpen && server.channels.voice.map((ch) => {
            const hasUsers = ch.connectedUsers && ch.connectedUsers.length > 0;
            return (
              <div key={ch.id} className="space-y-1">
                <button
                  onClick={() => onSelectChannel(ch.id)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-white/40 hover:bg-white/[0.06] hover:text-white/80 transition-colors text-xs font-medium group"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Volume2 className={`w-4 h-4 text-cyan-400 flex-shrink-0 ${hasUsers ? 'voice-pulse' : ''}`} />
                    <span className="truncate">{ch.name}</span>
                  </div>
                  {hasUsers && (
                    <span className="text-[10px] font-mono text-cyan-400 font-semibold bg-cyan-400/10 px-1.5 py-0.5 rounded-md" style={{ border: '1px solid rgba(34,211,238,0.2)' }}>
                      18:27
                    </span>
                  )}
                </button>

                {/* Connected Voice Users */}
                {ch.connectedUsers && ch.connectedUsers.length > 0 && (
                  <div className="pl-5 space-y-1">
                    <button className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/60 py-0.5 px-1 rounded transition-colors">
                      <span className="truncate">Обрати статус каналу</span>
                      <Edit2 className="w-2.5 h-2.5 ml-0.5" />
                    </button>

                    {ch.connectedUsers.map((usr) => (
                      <div 
                        key={usr.id} 
                        className="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-white/[0.04] transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <img 
                            src={usr.avatarUrl} 
                            alt={usr.name} 
                            className="w-5 h-5 rounded-full object-cover avatar-ring-online" 
                          />
                          <span className="text-xs text-white/80 font-medium truncate">
                            {usr.name}
                          </span>
                        </div>
                        
                        {usr.customStatus && (
                          <span className="text-[9px] bg-white/[0.06] text-cyan-400 font-bold px-1 py-0.5 rounded" style={{ border: '1px solid rgba(34,211,238,0.2)' }}>
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
      <div className="mt-auto flex flex-col p-2 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(10,14,39,0.60)' }}>
        {/* Active Voice Connection Bar */}
        {inVoiceCall && (
          <div className="p-2.5 rounded-xl glass-panel glow-cyan">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 truncate">
                <Radio className="w-4 h-4 text-cyan-400 animate-pulse flex-shrink-0" />
                <div className="flex flex-col text-left truncate">
                  <span className="text-[11px] font-bold text-cyan-400 leading-none font-display">
                    Голосовий зв&apos;язок підключено
                  </span>
                  <span className="text-[10px] text-white/40 truncate mt-0.5">
                    Бабелан / {server.name}
                  </span>
                </div>
              </div>
              <button onClick={() => setInVoiceCall(false)} title="Відключитися">
                <PhoneOff className="w-4 h-4 text-[var(--status-dnd)] hover:text-[var(--status-dnd)]/80 transition-colors" />
              </button>
            </div>

            {/* Quick action buttons row */}
            <div className="grid grid-cols-4 gap-1 pt-1">
              <button 
                onClick={() => setIsMicMuted(!isMicMuted)}
                className={`h-7 rounded-lg flex items-center justify-center transition-all ${
                  isMicMuted ? 'bg-[var(--status-dnd)]/20 text-[var(--status-dnd)]' : 'glass-panel text-white/60 hover:bg-white/[0.08]'
                }`}
                style={isMicMuted ? { border: '1px solid rgba(251,113,133,0.3)' } : {}}
                title="Мікрофон"
              >
                {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>

              <button 
                className="h-7 glass-panel hover:bg-white/[0.08] text-white/60 rounded-lg flex items-center justify-center transition-all"
                title="Поділитися екраном"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>

              <button 
                className="h-7 glass-panel hover:bg-white/[0.08] text-white/60 rounded-lg flex items-center justify-center transition-all"
                title="Реакції"
              >
                <Smile className="w-3.5 h-3.5" />
              </button>

              <button 
                onClick={() => setInVoiceCall(false)}
                className="h-7 bg-[var(--status-dnd)]/15 hover:bg-[var(--status-dnd)] text-[var(--status-dnd)] hover:text-white rounded-lg flex items-center justify-center transition-all"
                title="Завершити виклик"
              >
                <PhoneOff className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* User Control Panel */}
        <div className="h-12 px-2 flex items-center justify-between rounded-xl glass-panel">
          <div className="flex items-center gap-2 p-1 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer min-w-0">
            <div className="relative flex-shrink-0">
              <img 
                src={currentUser.avatarUrl} 
                alt={currentUser.name} 
                className="w-7 h-7 rounded-full object-cover avatar-ring-online" 
              />
            </div>
            <div className="flex flex-col truncate leading-tight">
              <span className="text-xs font-bold text-white truncate font-display">
                {currentUser.name}
              </span>
              <span className="text-[9px] text-cyan-400 truncate flex items-center gap-0.5">
                <Volume2 className="w-2.5 h-2.5 inline" />
                У голосовому чаті...
              </span>
            </div>
          </div>

          <div className="flex items-center gap-0.5 text-white/40">
            <button 
              onClick={() => setIsMicMuted(!isMicMuted)}
              className="p-1 hover:bg-white/[0.08] hover:text-white rounded transition-colors"
              title="Мікрофон"
            >
              {isMicMuted ? <MicOff className="w-3.5 h-3.5 text-[var(--status-dnd)]" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
            <button 
              onClick={() => setIsDeafened(!isDeafened)}
              className="p-1 hover:bg-white/[0.08] hover:text-white rounded transition-colors"
              title="Навушники"
            >
              <Headphones className={`w-3.5 h-3.5 ${isDeafened ? 'text-[var(--status-dnd)]' : ''}`} />
            </button>
            <button 
              className="p-1 hover:bg-white/[0.08] hover:text-white rounded transition-colors"
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
