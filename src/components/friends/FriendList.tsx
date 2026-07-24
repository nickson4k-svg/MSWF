'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { FriendWithStatus } from '@/lib/friends';
import { Button } from '@/components/ui/button';
import { UserMinus, Plus } from 'lucide-react';
import { AddFriendModal } from './AddFriendModal';
import Pusher from 'pusher-js';
import { DitheringStatusIndicator } from '@/components/ui/DitheringStatusIndicator';

interface FriendListItemProps {
  friend: FriendWithStatus;
  onStartChat: (username: string) => void;
  onRemoveFriend: (username: string) => void;
}

const FriendListItem = memo(function FriendListItem({
  friend,
  onStartChat,
  onRemoveFriend,
}: FriendListItemProps) {
  return (
    <div 
      onClick={() => onStartChat(friend.username)}
      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-800/60 group transition-all cursor-pointer border border-transparent hover:border-zinc-800"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <img src={friend.avatar} alt={friend.displayName} className="w-10 h-10 rounded-xl bg-zinc-800 object-cover" />
          <div className="absolute -bottom-1 -right-1 z-10">
            <DitheringStatusIndicator isOnline={friend.isOnline} size="sm" />
          </div>
        </div>
        <div>
          <p className="text-zinc-100 font-medium text-sm leading-tight group-hover:text-blue-400 transition-colors">{friend.displayName}</p>
          <p className="text-zinc-500 text-xs">{friend.isOnline ? 'Online' : 'Offline'}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {friend.unreadCount ? (
          <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-md">
            {friend.unreadCount}
          </span>
        ) : null}
        <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-8 h-8 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg" 
            onClick={(e) => {
              e.stopPropagation();
              onRemoveFriend(friend.username);
            }}
            title="Видалити з друзів"
          >
            <UserMinus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
});

export const FriendList = memo(function FriendList({ currentUser }: { currentUser: string }) {
  const [friends, setFriends] = useState<FriendWithStatus[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    const fetchFriends = async () => {
      try {
        const res = await fetch('/api/friends');
        const data = await res.json();
        if (mounted) setFriends(data || []);
      } catch {}
    };
    fetchFriends();
    
    // Heartbeat every 30 seconds
    const interval = setInterval(() => {
      fetch('/api/presence/heartbeat', { method: 'POST' }).catch(() => {});
    }, 30000);
    // Initial heartbeat
    fetch('/api/presence/heartbeat', { method: 'POST' }).catch(() => {});

    // Setup Pusher for real-time presence
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || 'dummy_key', {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
    });

    const channel = pusher.subscribe(`user-${currentUser}`);
    channel.bind('friend-online', (data: { username: string }) => {
      setFriends(prev => prev.map(f => f.username === data.username ? { ...f, isOnline: true } : f));
    });
    channel.bind('friend-offline', (data: { username: string, lastSeen: string }) => {
      setFriends(prev => prev.map(f => f.username === data.username ? { ...f, isOnline: false, lastSeen: data.lastSeen } : f));
    });
    channel.bind('friend-request-accepted', () => {
      fetchFriends();
    });
    channel.bind('friend-removed', (data: { username: string }) => {
      setFriends(prev => prev.filter(f => f.username !== data.username));
    });

    return () => {
      mounted = false;
      clearInterval(interval);
      pusher.unsubscribe(`user-${currentUser}`);
    };
  }, [currentUser]);

  const removeFriend = useCallback(async (username: string) => {
    if (!confirm('Ви впевнені, що хочете видалити цього друга?')) return;
    try {
      await fetch(`/api/friends/remove?username=${username}`, { method: 'DELETE' });
      setFriends(prev => prev.filter(f => f.username !== username));
    } catch {}
  }, []);

  const startChat = useCallback((username: string) => {
    const sorted = [currentUser, username].sort();
    router.push(`/chat/private-${sorted.join('-')}`);
  }, [currentUser, router]);

  return (
    <div className="w-full h-full flex flex-col bg-zinc-900/50 rounded-2xl border border-zinc-800/50 overflow-hidden">
      <div className="p-4 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-950/50">
        <h3 className="font-semibold text-zinc-100">Мої друзі</h3>
        <Button variant="ghost" size="icon" onClick={() => setShowAddModal(true)} className="text-zinc-400 hover:text-white">
          <Plus className="w-5 h-5" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {friends.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center text-center p-4">
             <p className="text-zinc-500 text-sm mb-2">У вас ще немає друзів</p>
             <Button variant="link" onClick={() => setShowAddModal(true)} className="text-blue-500">Знайти друзів</Button>
           </div>
        ) : (
          friends.map(friend => (
            <FriendListItem
              key={friend.username}
              friend={friend}
              onStartChat={startChat}
              onRemoveFriend={removeFriend}
            />
          ))
        )}
      </div>
      <div className="p-2 border-t border-zinc-800/50 bg-zinc-950/30">
        <Button variant="ghost" onClick={() => router.push('/friends')} className="w-full text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/50">
          Керування друзями та запитами
        </Button>
      </div>

      {showAddModal && <AddFriendModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
});
