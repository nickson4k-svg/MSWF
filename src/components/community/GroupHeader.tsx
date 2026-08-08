'use client';

import { useState } from 'react';
import { 
  MessageSquare, FolderKanban, Volume2, Users, 
  Link, MoreVertical, LogOut, Settings, Check, UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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
}

export function GroupHeader({
  groupName,
  groupAvatar,
  onlineCount,
  totalCount,
  activeTab,
  onTabChange,
  onOpenLeaveModal,
}: GroupHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleCopyInvite = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(`https://nexus.chat/invite/${encodeURIComponent(groupName.toLowerCase().replace(/\s+/g, '-'))}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="bg-zinc-950/90 border-b border-zinc-800/80 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl backdrop-blur-xl relative z-30">
      {/* Left: Group Info */}
      <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
        <div className="relative flex-shrink-0">
          <img 
            src={groupAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(groupName)}`} 
            alt={groupName} 
            className="w-10 h-10 rounded-2xl object-cover border border-zinc-800 shadow-md" 
          />
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-zinc-950 shadow-sm" />
        </div>

        <div className="flex flex-col min-w-0">
          <h2 className="text-base font-bold text-white truncate tracking-tight flex items-center gap-2">
            {groupName}
          </h2>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {onlineCount} в мережі
            </span>
            <span className="text-zinc-600">•</span>
            <span>{totalCount} учасників</span>
          </div>
        </div>
      </div>

      {/* Center: Tabs Switcher */}
      <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-2xl border border-zinc-800/80 shadow-inner">
        <button
          onClick={() => onTabChange('chat')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === 'chat'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Чат</span>
        </button>

        <button
          onClick={() => onTabChange('media')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === 'media'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <FolderKanban className="w-3.5 h-3.5" />
          <span>Медіа & Файли</span>
        </button>

        <button
          onClick={() => onTabChange('voice')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === 'voice'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>Голосові</span>
        </button>

        <button
          onClick={() => onTabChange('members')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === 'members'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Учасники</span>
        </button>
      </div>

      {/* Right: Actions Menu */}
      <div className="flex items-center gap-2 relative">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyInvite}
          className="border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs h-9 transition-all"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
              <span className="text-emerald-400">Скопійовано!</span>
            </>
          ) : (
            <>
              <Link className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
              <span>Запросити</span>
            </>
          )}
        </Button>

        {/* Dropdown Menu Trigger */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowMenu(!showMenu)}
          className="w-9 h-9 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all"
          title="Меню групи"
        >
          <MoreVertical className="w-4 h-4" />
        </Button>

        {/* Dropdown Menu */}
        {showMenu && (
          <div 
            className="absolute right-0 top-11 w-48 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-1.5 space-y-1 animate-in fade-in duration-150 z-50"
            onMouseLeave={() => setShowMenu(false)}
          >
            <button
              onClick={() => {
                setShowMenu(false);
                handleCopyInvite();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <UserPlus className="w-4 h-4 text-blue-400" />
              <span>Запросити учасника</span>
            </button>

            <button
              onClick={() => setShowMenu(false)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <Settings className="w-4 h-4 text-zinc-400" />
              <span>Налаштування групи</span>
            </button>

            <div className="w-full h-[1px] bg-zinc-800 my-1" />

            <button
              onClick={() => {
                setShowMenu(false);
                onOpenLeaveModal();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors font-medium"
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
