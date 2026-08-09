export interface Member {
  id: string;
  name: string;
  avatarUrl: string;
  status: 'online' | 'offline' | 'dnd' | 'idle';
  customStatus?: string;
  roleColor?: string;
  isBot?: boolean;
  activity?: {
    game: string;
    subtitle?: string;
    duration?: string;
    iconUrl?: string;
  };
}

export interface Channel {
  id: string;
  type: 'text' | 'voice';
  name: string;
  connectedUsers?: Member[];
  unread?: boolean;
}

export interface Server {
  id: string;
  name: string;
  iconUrl?: string;
  initials?: string;
  unreadCount?: number;
  isActive?: boolean;
  channels: {
    text: Channel[];
    voice: Channel[];
  };
}

export interface EmbedData {
  source: string;
  author?: string;
  title: string;
  url?: string;
  thumbnailUrl?: string;
  accentColor?: string;
}

export interface Message {
  id: string;
  author: string;
  avatarUrl: string;
  nameColor?: string;
  timestamp: string;
  type: 'text' | 'embed' | 'image' | 'file' | 'video';
  content?: string;
  imageUrl?: string;
  embed?: EmbedData;
}
