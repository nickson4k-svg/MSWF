'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { FriendWithStatus } from '@/lib/friends';
import { Button } from '@/components/ui/button';
import { UserMinus, Plus, X, Bell } from 'lucide-react';
import { AddFriendModal } from './AddFriendModal';
import Pusher from 'pusher-js';
import { DitheringStatusIndicator } from '@/components/ui/DitheringStatusIndicator';
import { setUnreadBadgeCount, incrementUnreadBadge } from '@/lib/badge';
import { playIncomingMessageSound } from '@/lib/sound';
import { cacheMessages } from '@/lib/db';
import { normalizeRoomId } from '@/lib/friends';
import { showDesktopFloatingWindow, requestNotificationPermission } from '@/lib/notifications';

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
  const [globalToast, setGlobalToast] = useState<{ sender: string; text: string; roomId: string } | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('granted');
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    requestNotificationPermission().then(res => {
      if (res) setNotifPermission(res);
    });
    const handleGesture = () => {
      requestNotificationPermission().then(res => {
        if (res) setNotifPermission(res);
      });
    };
    window.addEventListener('click', handleGesture, { once: true });
    return () => window.removeEventListener('click', handleGesture);
  }, []);

  useEffect(() => {
    if (!globalToast) return;
    const timer = setTimeout(() => setGlobalToast(null), 4000);
    return () => clearTimeout(timer);
  }, [globalToast]);

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

    // Setup Pusher for real-time presence & user notifications
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

    channel.bind('message-action', (data: { action: string; msgId: string; msg: { id: string; roomId: string; sender: string; timestamp: number; isDeleted?: boolean; text: string } }) => {
      if (data.action === 'delete' || data.action === 'edit') {
        if (data.msg && data.msg.roomId) {
          cacheMessages([{
            id: data.msgId,
            text: data.action === 'delete' ? 'Повідомлення видалено' : data.msg.text,
            roomId: normalizeRoomId(data.msg.roomId),
            sender: data.msg.sender || '',
            timestamp: data.msg.timestamp || Date.now(),
            isDeleted: data.action === 'delete' ? true : data.msg.isDeleted
          }]);
        }
      }
    });

    // Real-time incoming messages on user channel for main page & notifications
    channel.bind('incoming-message', (data: { id: string; sender: string; text: string; roomId: string; timestamp?: number }) => {
      // Store in local cache so when opening chat, it is instantly available
      cacheMessages([{
        id: data.id,
        text: data.text,
        roomId: normalizeRoomId(data.roomId),
        sender: data.sender,
        timestamp: data.timestamp || Date.now()
      }]);

      setFriends(prev => prev.map(f => {
        if (f.username === data.sender) {
          return { ...f, unreadCount: (f.unreadCount || 0) + 1 };
        }
        return f;
      }));

      const currentPath = window.location.pathname;
      const isInsideThisChat = currentPath.includes(data.roomId);

      if (!isInsideThisChat) {
        playIncomingMessageSound();

        const textPreview = data.text.startsWith('data:audio/') 
          ? '🎤 Голосове повідомлення' 
          : data.text.startsWith('{"type":"file-transfer-meta"') 
            ? '📁 Передано файл' 
            : data.text.startsWith('E2E:') 
              ? '🔒 Зашифроване повідомлення'
              : data.text;

        // Trigger True OS Desktop Floating Window & Native Notifications
        showDesktopFloatingWindow(data.sender, textPreview, () => {
          router.push(`/chat/${data.roomId}`);
        });

        setGlobalToast({
          sender: data.sender,
          text: textPreview,
          roomId: data.roomId,
        });

        if (document.hidden) {
          incrementUnreadBadge();
        }
      }
    });

    return () => {
      mounted = false;
      clearInterval(interval);
      pusher.unsubscribe(`user-${currentUser}`);
    };
  }, [currentUser, router]);

  useEffect(() => {
    const totalUnread = friends.reduce((sum, f) => sum + (f.unreadCount || 0), 0);
    setUnreadBadgeCount(totalUnread);
  }, [friends]);

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
    <div className="w-full h-full flex flex-col bg-zinc-900/50 rounded-2xl border border-zinc-800/50 overflow-hidden relative">
      <div className="p-4 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-950/50">
        <h3 className="font-semibold text-zinc-100">Мої друзі</h3>
        <Button variant="ghost" size="icon" onClick={() => setShowAddModal(true)} className="text-zinc-400 hover:text-white">
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {notifPermission === 'default' && (
        <div 
          onClick={async () => {
            const res = await requestNotificationPermission();
            setNotifPermission(res);
            if (res === 'granted') {
              showDesktopFloatingWindow(
                'Система',
                '🔔 Сповіщення увімкнено! Ви отримуватимете сповіщення про нові повідомлення.',
                () => {}
              );
            } else if (res === 'denied') {
              alert('Сповіщення заблоковано в налаштуваннях браузера. Натисніть на значок замка в адресному рядку браузера, щоб дозволити сповіщення.');
            }
          }}
          className="mx-2 my-2 p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-between cursor-pointer hover:bg-blue-500/20 transition-all text-xs text-blue-300 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-400 flex-shrink-0 animate-bounce" />
            <span>Увімкнути сповіщення на робочому столі</span>
          </div>
          <button 
            type="button"
            className="font-semibold text-[11px] bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-lg shadow transition-colors flex-shrink-0"
          >
            Дозволити
          </button>
        </div>
      )}
      
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

      {/* Toast Popup Notification for Main Page & Global Messages */}
      {globalToast && (
        <div 
          className="fixed top-5 right-5 z-50 max-w-xs sm:max-w-sm w-full bg-zinc-900/95 border border-zinc-700/80 p-3.5 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-3 animate-in slide-in-from-top-5 duration-300 cursor-pointer hover:border-zinc-500 transition-all group"
          onClick={() => {
            window.focus();
            const targetRoom = globalToast.roomId;
            setGlobalToast(null);
            router.push(`/chat/${targetRoom}`);
          }}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
            {(globalToast.sender[0] || 'U').toUpperCase()}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-zinc-100 truncate">{globalToast.sender}</h4>
              <span className="text-[10px] text-zinc-500 font-medium">Зараз</span>
            </div>
            <p className="text-xs text-zinc-300 truncate mt-0.5 font-normal">
              {globalToast.text}
            </p>
          </div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              setGlobalToast(null);
            }}
            className="text-zinc-500 hover:text-zinc-300 p-1 rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
});
