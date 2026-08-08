'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

const MOCK_MEMBERS: Member[] = [
  {
    id: 'u1',
    name: 'lunati',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lunati',
    status: 'online',
    customStatus: 'СПЛЮ',
    roleColor: '#e91e63'
  },
  {
    id: 'u2',
    name: 'rxqzzz',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rxqzzz',
    status: 'dnd',
    roleColor: '#00bcd4'
  },
  {
    id: 'u3',
    name: 'WD-40',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=WD40',
    status: 'online',
    isBot: true,
    customStatus: 'робочий режим активний'
  },
  {
    id: 'u4',
    name: 'Слот СІТІ',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SlotCity',
    status: 'online',
    customStatus: 'У голосовому чаті',
    roleColor: '#ff9800'
  },
  {
    id: 'u5',
    name: 'ХохлоПоляк',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HohloPolyak',
    status: 'online',
    customStatus: 'Flying in cosmos',
    roleColor: '#4caf50',
    activity: {
      game: 'SCP: Containment Breach',
      duration: '2 д. назад · Новий гравець'
    }
  },
  {
    id: 'u6',
    name: 'Hoper',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hoper',
    status: 'offline'
  },
  {
    id: 'u7',
    name: 'Ma.r1k',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marik',
    status: 'offline'
  }
];

const INITIAL_SERVERS: Server[] = [
  {
    id: 'srv-1',
    name: 'Наркомани',
    initials: 'НМ',
    iconUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=Narkomany',
    unreadCount: 3,
    channels: {
      text: [
        { id: 'ch-1', type: 'text', name: 'мет-меседж' },
        { id: 'ch-2', type: 'text', name: 'флуділка', unread: true }
      ],
      voice: [
        { 
          id: 'ch-3', 
          type: 'voice', 
          name: 'Бабелан',
          connectedUsers: [
            {
              id: 'u4',
              name: 'Слот СІТІ',
              avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SlotCity',
              status: 'online'
            },
            {
              id: 'u5',
              name: 'ХохлоПоляк',
              avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HohloPolyak',
              status: 'online',
              customStatus: 'S1'
            }
          ]
        },
        { id: 'ch-4', type: 'voice', name: 'пабг-дрочерс' }
      ]
    }
  },
  {
    id: 'srv-2',
    name: 'Dark Souls Online',
    initials: 'DS',
    iconUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=DarkSouls',
    unreadCount: 2,
    channels: {
      text: [{ id: 'ch-201', type: 'text', name: 'головний' }],
      voice: [{ id: 'ch-202', type: 'voice', name: 'Багаття' }]
    }
  },
  {
    id: 'srv-3',
    name: 'Cyberpub 2077',
    initials: 'CP',
    iconUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=Cyberpub',
    unreadCount: 46,
    channels: {
      text: [{ id: 'ch-301', type: 'text', name: 'бар' }],
      voice: []
    }
  }
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'm1',
    author: 'NicoNico',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NicoNico',
    nameColor: '#4caf50',
    timestamp: '05.08.2026 23:55',
    type: 'image',
    content: 'ладно, я в доту',
    imageUrl: '/meme.png'
  },
  {
    id: 'm2',
    author: 'Габа Шен Пуер',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Gaba',
    nameColor: '#00a8fc',
    timestamp: '05.08.2026 23:59',
    type: 'embed',
    content: 'https://www.youtube.com/watch?v=7pyMb3MgU_E',
    embed: {
      source: 'YouTube',
      author: 'ЦиціБога',
      title: 'ВИШНІ Status///REMAKE',
      thumbnailUrl: '/youtube_thumb.png',
      accentColor: '#ef4444'
    }
  }
];

export function CommunityLayout() {
  const router = useRouter();
  const [servers, setServers] = useState<Server[]>(INITIAL_SERVERS);
  const [activeServerId, setActiveServerId] = useState<string>('srv-1');
  const [activeChannelId, setActiveChannelId] = useState<string>('ch-1');
  const [activeTab, setActiveTab] = useState<GroupTab>('chat');
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [showMembersPanel, setShowMembersPanel] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  const activeServer = servers.find(s => s.id === activeServerId) || servers[0];
  
  if (!activeServer) {
    return (
      <div className="flex h-screen w-screen bg-zinc-950 text-white items-center justify-center flex-col p-4">
        <h2 className="text-xl font-bold mb-2">У вас немає активних груп</h2>
        <p className="text-sm text-zinc-400 mb-4">Створіть нову групу або приєднайтеся за посиланням</p>
        <button 
          onClick={() => router.push('/')}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-all"
        >
          Повернутися на головну
        </button>
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
    const newServer: Server = {
      id: `srv-${Date.now()}`,
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
    setServers(prev => [...prev, newServer]);
    setActiveServerId(newServer.id);
    setActiveChannelId(newServer.channels.text[0].id);
  };

  const handleConfirmLeaveGroup = () => {
    const targetId = activeServerId;
    const remaining = servers.filter(s => s.id !== targetId);
    setServers(remaining);
    setIsLeaveModalOpen(false);

    if (remaining.length > 0) {
      setActiveServerId(remaining[0].id);
      if (remaining[0].channels.text.length > 0) {
        setActiveChannelId(remaining[0].channels.text[0].id);
      }
    } else {
      router.push('/');
    }
  };

  const onlineMembersCount = MOCK_MEMBERS.filter(m => m.status !== 'offline').length;

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden antialiased relative">
      {/* Background Ambient Blur Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

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
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top Header with Group Info, Tab Switcher & Leave Group Menu */}
        <GroupHeader
          groupName={activeServer.name}
          groupAvatar={activeServer.iconUrl}
          onlineCount={onlineMembersCount}
          totalCount={MOCK_MEMBERS.length}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onOpenLeaveModal={() => setIsLeaveModalOpen(true)}
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
                <MembersSidebar members={MOCK_MEMBERS} />
              )}
            </>
          )}

          {activeTab === 'media' && <GroupMediaGallery />}

          {activeTab === 'voice' && <GroupVoiceLounges />}

          {activeTab === 'members' && (
            <GroupMembersTab members={MOCK_MEMBERS} groupName={activeServer.name} />
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
