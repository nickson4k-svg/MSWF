'use client';

import { useState } from 'react';
import { 
  MessageSquare, FolderKanban, Volume2, Users, 
  Link, MoreVertical, LogOut, Settings, Check, UserPlus, Sparkles, Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ShaderPreset } from './ShaderBackground';

export type GroupTab = 'chat' | 'media' | 'voice' | 'members';

interface GroupHeaderProps {
  groupName: string;
  groupAvatar?: string;
  onlineCount: number;
  totalCount: number;
  activeTab: GroupTab;
  onTabChange: (tab: GroupTab) => void;
  onOpenLeaveModal: () => void;
  onOpenInviteModal?: () => void;
  shaderPreset?: ShaderPreset;
  onShaderChange?: (preset: ShaderPreset) => void;
}

export function GroupHeader({
  groupName,
  groupAvatar,
  onlineCount,
  totalCount,
  activeTab,
  onTabChange,
  onOpenLeaveModal,
  shaderPreset = 'aurora',
  onShaderChange
}: GroupHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showShaderMenu, setShowShaderMenu] = useState(false);

  const handleCopyInvite = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(`https://nexus.chat/invite/${encodeURIComponent(groupName.toLowerCase().replace(/\s+/g, '-'))}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const tabs: { id: GroupTab; label: string; icon: React.ReactNode }[] = [
    { id: 'chat', label: 'Чат', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: 'media', label: 'Медіа & Файли', icon: <FolderKanban className="w-3.5 h-3.5" /> },
    { id: 'voice', label: 'Голосові', icon: <Volume2 className="w-3.5 h-3.5" /> },
    { id: 'members', label: 'Учасники', icon: <Users className="w-3.5 h-3.5" /> },
  ];

  const shaderOptions: { id: ShaderPreset; label: string; icon: string }[] = [
    { id: 'aurora', label: '🌌 Cosmic Aurora', icon: '🌌' },
    { id: 'nebula', label: '🔮 Cyber Nebula', icon: '🔮' },
    { id: 'plasma', label: '⚡ Plasma Flow', icon: '⚡' },
    { id: 'stars', label: '🚀 Hyper Space', icon: '🚀' },
    { id: 'none', label: '🚫 Без шейдера', icon: '🚫' },
  ];

  return (
    <div className="glass-panel px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl relative z-30 rounded-none" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
      {/* Left: Group Info */}
      <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
        <div className="relative flex-shrink-0">
          <img 
            src={groupAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(groupName)}`} 
            alt={groupName} 
            className="w-10 h-10 rounded-2xl object-cover avatar-ring-accent shadow-md" 
          />
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--status-online)] border-2 border-[var(--aurora-via)] shadow-sm" style={{ boxShadow: '0 0 8px rgba(45,212,191,0.4)' }} />
        </div>

        <div className="flex flex-col min-w-0">
          <h2 className="text-base font-bold text-white truncate tracking-tight flex items-center gap-2 font-display">
            {groupName}
          </h2>
          <div className="flex items-center gap-2 text-xs text-white/30">
            <span className="flex items-center gap-1 text-[var(--status-online)] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-online)] animate-pulse" />
              {onlineCount} в мережі
            </span>
            <span className="text-white/15">•</span>
            <span>{totalCount} учасників</span>
          </div>
        </div>
      </div>

      {/* Center: Tabs Switcher */}
      <div className="flex items-center gap-1 glass-panel p-1 rounded-2xl shadow-inner">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 font-display ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-indigo-500 to-cyan-400 text-white shadow-md glow-active'
                : 'text-white/35 hover:text-white/70 hover:bg-white/[0.06]'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Right: Actions Menu */}
      <div className="flex items-center gap-2 relative">
        {/* Shader Background Selector Button */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShaderMenu(!showShaderMenu)}
            className={`glass-panel text-xs h-9 transition-all font-display border-0 flex items-center gap-1.5 ${
              shaderPreset !== 'none' 
                ? 'bg-indigo-500/20 text-cyan-300 border-indigo-400/30 glow-cyan' 
                : 'hover:bg-white/[0.08] text-white/60 hover:text-white'
            }`}
            style={{ border: '1px solid rgba(255,255,255,0.10)' }}
            title="Шейдерний задній фон"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="hidden md:inline">Шейдер фону</span>
          </Button>

          {/* Shader Preset Dropdown */}
          {showShaderMenu && (
            <div 
              className="absolute right-0 top-11 w-48 glass-panel rounded-2xl shadow-2xl p-1.5 space-y-1 animate-in fade-in duration-150 z-50"
              onMouseLeave={() => setShowShaderMenu(false)}
            >
              <div className="px-2 py-1 text-[10px] uppercase font-bold text-white/30 tracking-wider font-display">
                Оберіть Шейдер Фону
              </div>
              {shaderOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    if (onShaderChange) onShaderChange(opt.id);
                    setShowShaderMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition-all font-display ${
                    shaderPreset === opt.id 
                      ? 'bg-gradient-to-r from-indigo-500 to-cyan-400 text-white font-semibold glow-active' 
                      : 'text-white/70 hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  <span>{opt.label}</span>
                  {shaderPreset === opt.id && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyInvite}
          className="glass-panel hover:bg-white/[0.08] text-white/60 hover:text-white rounded-xl text-xs h-9 transition-all hover:glow-active font-display border-0"
          style={{ border: '1px solid rgba(255,255,255,0.10)' }}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[var(--status-online)] mr-1.5" />
              <span className="text-[var(--status-online)]">Скопійовано!</span>
            </>
          ) : (
            <>
              <Link className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
              <span>Запросити</span>
            </>
          )}
        </Button>

        {/* Dropdown Menu Trigger */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowMenu(!showMenu)}
          className="w-9 h-9 text-white/30 hover:text-white hover:bg-white/[0.08] rounded-xl transition-all"
          title="Меню групи"
        >
          <MoreVertical className="w-4 h-4" />
        </Button>

        {/* Dropdown Menu */}
        {showMenu && (
          <div 
            className="absolute right-0 top-11 w-48 glass-panel rounded-2xl shadow-2xl p-1.5 space-y-1 animate-in fade-in duration-150 z-50"
            onMouseLeave={() => setShowMenu(false)}
          >
            <button
              onClick={() => {
                setShowMenu(false);
                handleCopyInvite();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/60 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors"
            >
              <UserPlus className="w-4 h-4 text-indigo-400" />
              <span>Запросити учасника</span>
            </button>

            <button
              onClick={() => {
                setShowMenu(false);
                setShowShaderMenu(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/60 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors"
            >
              <Palette className="w-4 h-4 text-cyan-400" />
              <span>Змінити шейдер фону</span>
            </button>

            <button
              onClick={() => setShowMenu(false)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/60 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors"
            >
              <Settings className="w-4 h-4 text-white/30" />
              <span>Налаштування групи</span>
            </button>

            <div className="w-full aurora-divider my-1" />

            <button
              onClick={() => {
                setShowMenu(false);
                onOpenLeaveModal();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--status-dnd)] hover:text-[var(--status-dnd)] hover:bg-[var(--status-dnd)]/10 rounded-xl transition-colors font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span>Вийти з групи</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

