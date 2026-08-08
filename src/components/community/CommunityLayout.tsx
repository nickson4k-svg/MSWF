'use client';

import { useState } from 'react';
import { Server, Message, Member } from './types';
import { ServerRail } from './ServerRail';
import { ChannelSidebar } from './ChannelSidebar';
import { ChatArea } from './ChatArea';
import { MembersSidebar } from './MembersSidebar';
import { CreateServerModal } from './CreateServerModal';

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
    customStatus: 'Do you know who else suffers from...'
  },
  {
    id: 'u4',
    name: 'Слот СІТІ',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SlotCity',
    status: 'online',
    customStatus: 'В голосовом чате',
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
      duration: '2 д. назад · Новый игрок'
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
      text: [{ id: 'ch-201', type: 'text', name: 'general' }],
      voice: [{ id: 'ch-202', type: 'voice', name: 'Bonfire' }]
    }
  },
  {
    id: 'srv-3',
    name: 'Cyberpub 2077',
    initials: 'CP',
    iconUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=Cyberpub',
    unreadCount: 46,
    channels: {
      text: [{ id: 'ch-301', type: 'text', name: 'lounge' }],
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
      accentColor: '#f23f43'
    }
  }
];

export function CommunityLayout() {
  const [servers, setServers] = useState<Server[]>(INITIAL_SERVERS);
  const [activeServerId, setActiveServerId] = useState<string>('srv-1');
  const [activeChannelId, setActiveChannelId] = useState<string>('ch-1');
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [showMembersPanel, setShowMembersPanel] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const activeServer = servers.find(s => s.id === activeServerId) || servers[0];
  const allChannels = [...activeServer.channels.text, ...activeServer.channels.voice];
  const activeChannel = allChannels.find(c => c.id === activeChannelId) || activeServer.channels.text[0];

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

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden antialiased relative">
      {/* Background Ambient Blur Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* 1. Server Rail (Leftmost ~72px) */}
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

      {/* 2. Channel Sidebar (~240px) */}
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

      {/* 3. Main Chat Area (flex-1) */}
      <ChatArea 
        channel={activeChannel}
        messages={messages}
        onSendMessage={handleSendMessage}
        toggleMembersPanel={() => setShowMembersPanel(!showMembersPanel)}
        showMembersPanel={showMembersPanel}
      />

      {/* 4. Right Members & Activity Sidebar (~240px) */}
      {showMembersPanel && (
        <MembersSidebar members={MOCK_MEMBERS} />
      )}

      {/* Create Server / Group Modal */}
      <CreateServerModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateServer}
      />
    </div>
  );
}
