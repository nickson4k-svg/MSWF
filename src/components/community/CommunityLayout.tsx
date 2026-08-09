'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus } from 'lucide-react';
import { Server, Message, Member } from './types';
import { ServerRail } from './ServerRail';
import { ChannelSidebar } from './ChannelSidebar';
import { ChatArea } from './ChatArea';
import { MembersSidebar } from './MembersSidebar';
import { CreateServerModal } from './CreateServerModal';
import { GroupHeader, GroupTab } from './GroupHeader';
import { LeaveGroupModal } from './LeaveGroupModal';
import { GroupMediaGallery } from './GroupMediaGallery';
import { GroupVoiceLounges } from './GroupVoiceLounges';
import { GroupMembersTab } from './GroupMembersTab';
import { ShaderBackground, ShaderPreset } from './ShaderBackground';

const REAL_MEMBERS: Member[] = [
  {
    id: 'u-me',
    name: 'NicoNico',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NicoNico',
    status: 'online',
    customStatus: 'Творець спільноти'
  }
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'm1',
    author: 'NicoNico',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NicoNico',
    nameColor: '#4caf50',
    timestamp: 'Сьогодні 00:01',
    type: 'text',
    content: 'Ласкаво просимо до нашої нової спільноти Nexus!'
  }
];

export function CommunityLayout() {
  const router = useRouter();
  const [servers, setServers] = useState<Server[]>([]);
  const [activeServerId, setActiveServerId] = useState<string>('');
  const [activeChannelId, setActiveChannelId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<GroupTab>('chat');
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [members, setMembers] = useState<Member[]>(REAL_MEMBERS);
  const [showMembersPanel, setShowMembersPanel] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [shaderPreset, setShaderPreset] = useState<ShaderPreset>('aurora');

  // Load custom groups & shader preset from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedShader = localStorage.getItem('nexus_shader_bg_preset') as ShaderPreset;
      if (savedShader) {
        setShaderPreset(savedShader);
      }
      const saved = localStorage.getItem('nexus_custom_groups');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const formattedServers: Server[] = parsed.map((item: Partial<Server> & { avatar?: string }) => {
              if (item.channels) return item as Server;
              const groupName = item.name || 'Спільнота';
              return {
                id: item.id || `srv-${Date.now()}`,
                name: groupName,
                initials: groupName.substring(0, 2).toUpperCase(),
                iconUrl: item.avatar || item.iconUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(groupName)}`,
                channels: {
                  text: [
                    { id: `ch-${item.id || Date.now()}-1`, type: 'text', name: 'загальний' },
                    { id: `ch-${item.id || Date.now()}-2`, type: 'text', name: 'флуд' }
                  ],
                  voice: [
                    { id: `ch-${item.id || Date.now()}-3`, type: 'voice', name: 'Голосовий 1' }
                  ]
                }
              };
            });

            setServers(formattedServers);

            const savedActiveId = localStorage.getItem('nexus_active_group_id');
            const targetServer = formattedServers.find(s => s.id === savedActiveId) || formattedServers[0];
            if (targetServer) {
              setActiveServerId(targetServer.id);
              if (targetServer.channels.text.length > 0) {
                setActiveChannelId(targetServer.channels.text[0].id);
              }
            }
          }
        } catch (e) {
          console.error('Failed to load groups from localStorage', e);
        }
      }
    }
  }, []);

  const saveServersToStorage = (updated: Server[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexus_custom_groups', JSON.stringify(updated));
    }
  };

  const activeServer = servers.find(s => s.id === activeServerId) || servers[0];
  
  if (!activeServer) {
    return (
      <div className="flex h-screen w-screen aurora-bg aurora-noise text-white items-center justify-center flex-col p-4 relative overflow-hidden font-sans">
        {/* Cosmic Glow Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="glass-panel p-8 rounded-3xl max-w-md w-full text-center space-y-4 shadow-2xl z-10 animate-in fade-in duration-200 glow-active">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-cyan-400 flex items-center justify-center mx-auto shadow-inner glow-cyan">
            <Users className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-white font-display">У вас немає активних груп</h2>
          <p className="text-sm text-white/50">
            Створіть свою першу спільноту або груповий чат для спілкування з друзями.
          </p>

          <div className="flex flex-col gap-2.5 pt-2 font-display">
            <button 
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full bg-gradient-to-r from-indigo-500 to-cyan-400 hover:from-indigo-400 hover:to-cyan-300 text-white py-3 rounded-xl text-sm font-semibold shadow-lg glow-active transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Створити нову групу
            </button>

            <button 
              type="button"
              onClick={() => router.push('/')}
              className="w-full glass-panel hover:bg-white/[0.08] text-white/70 py-3 rounded-xl text-sm font-medium transition-all"
            >
              Повернутися на головну
            </button>
          </div>
        </div>

        <CreateServerModal 
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={(name, iconUrl) => {
            const newGroupId = `custom-grp-${Date.now()}`;
            const newServer: Server = {
              id: newGroupId,
              name,
              initials: name.substring(0, 2).toUpperCase(),
              iconUrl: iconUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
              channels: {
                text: [
                  { id: `ch-${Date.now()}-1`, type: 'text', name: 'загальний' },
                  { id: `ch-${Date.now()}-2`, type: 'text', name: 'флуд' }
                ],
                voice: [
                  { id: `ch-${Date.now()}-3`, type: 'voice', name: 'Голосовий 1' }
                ]
              }
            };
            const updated = [newServer];
            setServers(updated);
            setActiveServerId(newGroupId);
            setActiveChannelId(newServer.channels.text[0].id);
            saveServersToStorage(updated);
            if (typeof window !== 'undefined') {
              localStorage.setItem('nexus_active_group_id', newGroupId);
            }
            setIsCreateModalOpen(false);
          }}
        />
      </div>
    );
  }

  const allChannels = [...activeServer.channels.text, ...activeServer.channels.voice];
  const activeChannel = allChannels.find(c => c.id === activeChannelId) || activeServer.channels.text[0] || { id: 'ch-fallback', type: 'text', name: 'загальний' };

  const handleSendMessage = (text: string) => {
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      author: 'NicoNico',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NicoNico',
      nameColor: '#4caf50',
      timestamp: new Date().toLocaleString('uk-UA', { 
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      }),
      type: 'text',
      content: text
    };
    setMessages(prev => [...prev, newMsg]);
  };

  const handleCreateServer = (name: string, iconUrl?: string) => {
    const newGroupId = `custom-grp-${Date.now()}`;
    const newServer: Server = {
      id: newGroupId,
      name,
      initials: name.substring(0, 2).toUpperCase(),
      iconUrl: iconUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
      channels: {
        text: [
          { id: `ch-${Date.now()}-1`, type: 'text', name: 'загальний' },
          { id: `ch-${Date.now()}-2`, type: 'text', name: 'флуд' }
        ],
        voice: [
          { id: `ch-${Date.now()}-3`, type: 'voice', name: 'Голосовий 1' }
        ]
      }
    };
    const updated = [...servers, newServer];
    setServers(updated);
    setActiveServerId(newServer.id);
    setActiveChannelId(newServer.channels.text[0].id);
    saveServersToStorage(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexus_active_group_id', newServer.id);
    }
  };

  const handleConfirmLeaveGroup = () => {
    const targetId = activeServerId;
    const remaining = servers.filter(s => s.id !== targetId);
    setServers(remaining);
    setIsLeaveModalOpen(false);
    saveServersToStorage(remaining);

    if (remaining.length > 0) {
      setActiveServerId(remaining[0].id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('nexus_active_group_id', remaining[0].id);
      }
      if (remaining[0].channels.text.length > 0) {
        setActiveChannelId(remaining[0].channels.text[0].id);
      }
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('nexus_active_group_id');
      }
      router.push('/');
    }
  };

  const handleShaderChange = (preset: ShaderPreset) => {
    setShaderPreset(preset);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexus_shader_bg_preset', preset);
    }
  };

  const onlineMembersCount = members.filter(m => m.status !== 'offline').length;

  return (
    <div className="flex h-screen w-screen aurora-bg aurora-noise text-white font-sans overflow-hidden antialiased relative">
      {/* Real-time Canvas Shader Engine Background */}
      <ShaderBackground preset={shaderPreset} />

      {/* Cosmic Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute top-2/3 right-1/3 w-80 h-80 bg-purple-600/12 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* 1. Leftmost Server / Group Rail (~72px) */}
      <ServerRail 
        servers={servers}
        activeServerId={activeServerId}
        onSelectServer={(id) => {
          setActiveServerId(id);
          const target = servers.find(s => s.id === id);
          if (target && target.channels.text.length > 0) {
            setActiveChannelId(target.channels.text[0].id);
          }
        }}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full z-10">
        {/* Top Header with Group Info, Tab Switcher & Leave Group Menu */}
        <GroupHeader
          groupName={activeServer.name}
          groupAvatar={activeServer.iconUrl}
          onlineCount={onlineMembersCount}
          totalCount={members.length}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onOpenLeaveModal={() => setIsLeaveModalOpen(true)}
          shaderPreset={shaderPreset}
          onShaderChange={handleShaderChange}
        />

        {/* Dynamic Tab Body */}
        <div className="flex-1 flex min-w-0 overflow-hidden relative">
          {activeTab === 'chat' && (
            <>
              {/* Channel Sidebar (~240px) */}
              <ChannelSidebar 
                server={activeServer}
                activeChannelId={activeChannelId}
                onSelectChannel={(chId) => setActiveChannelId(chId)}
                currentUser={{
                  name: 'NicoNico',
                  avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NicoNico',
                  status: 'online'
                }}
              />

              {/* Main Chat Area */}
              <ChatArea 
                channel={activeChannel}
                messages={messages}
                onSendMessage={handleSendMessage}
                toggleMembersPanel={() => setShowMembersPanel(!showMembersPanel)}
                showMembersPanel={showMembersPanel}
              />

              {/* Right Members Sidebar */}
              {showMembersPanel && (
                <MembersSidebar members={members} />
              )}
            </>
          )}

          {activeTab === 'media' && <GroupMediaGallery />}

          {activeTab === 'voice' && <GroupVoiceLounges />}

          {activeTab === 'members' && (
            <GroupMembersTab members={members} groupName={activeServer.name} />
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateServerModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateServer}
      />

      <LeaveGroupModal
        isOpen={isLeaveModalOpen}
        groupName={activeServer.name}
        onClose={() => setIsLeaveModalOpen(false)}
        onConfirmLeave={handleConfirmLeaveGroup}
      />
    </div>
  );
}
