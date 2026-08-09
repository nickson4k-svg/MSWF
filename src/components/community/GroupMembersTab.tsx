'use client';

import { useState } from 'react';
import { Member } from './types';
import { Search, UserPlus, Shield, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GroupMembersTabProps {
  members: Member[];
  groupName: string;
}

export function GroupMembersTab({ members, groupName }: GroupMembersTabProps) {
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    (m.customStatus && m.customStatus.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCopyInvite = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(`https://nexus.chat/invite/${encodeURIComponent(groupName.toLowerCase().replace(/\s+/g, '-'))}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const getAvatarRingClass = (status: Member['status']) => {
    switch (status) {
      case 'online': return 'avatar-ring-online';
      case 'dnd': return 'avatar-ring-dnd';
      case 'idle': return 'avatar-ring-idle';
      default: return 'avatar-ring-offline';
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto no-scrollbar space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 aurora-divider pb-4 border-b-0">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-display">
            <Shield className="w-5 h-5 text-indigo-400" />
            Учасники спільноти ({members.length})
          </h3>
          <p className="text-xs text-white/50 mt-0.5">
            Повний список учасників групи, їх рольові статуси та онлайн-активність.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto font-display">
          {/* Search bar */}
          <div className="relative flex-1 sm:w-56">
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Пошук за ніком..." 
              className="w-full glass-panel text-xs text-white placeholder-white/25 px-3 py-2 pr-8 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500/50" 
            />
            <Search className="w-3.5 h-3.5 text-white/25 absolute right-2.5 top-1/2 -translate-y-1/2" />
          </div>

          <Button
            onClick={handleCopyInvite}
            className="bg-gradient-to-r from-indigo-500 to-cyan-400 hover:from-indigo-400 hover:to-cyan-300 text-white rounded-xl text-xs font-semibold px-4 h-9 shadow-md flex-shrink-0 glow-active border-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5" />
                Скопійовано
              </>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                Запросити
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Member Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredMembers.map((m) => {
          const isOnline = m.status !== 'offline';

          return (
            <div 
              key={m.id} 
              className="glass-panel p-3.5 rounded-2xl hover:border-indigo-400/40 transition-all flex items-center justify-between shadow-lg group hover:glow-active"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative flex-shrink-0">
                  <img 
                    src={m.avatarUrl} 
                    alt={m.name} 
                    className={`w-10 h-10 rounded-2xl object-cover ${getAvatarRingClass(m.status)}`} 
                  />
                </div>

                <div className="flex flex-col truncate min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold truncate accent-gradient-text font-display">
                      {m.name}
                    </span>
                    {m.isBot && (
                      <span className="bg-gradient-to-r from-indigo-500 to-cyan-400 text-white text-[9px] font-bold px-1.5 rounded-md uppercase tracking-wider shadow-sm font-display">
                        БОТ
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-white/40 truncate mt-0.5">
                    {m.customStatus || (isOnline ? 'В мережі' : 'Офлайн')}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
