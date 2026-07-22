'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getPusherClient, sanitizeChannelName } from '@/lib/pusher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Copy, ArrowLeft, CheckCircle2, Video as VideoIcon, Reply, X, Check, CheckCheck, Palette } from 'lucide-react';
import { format, isToday, isYesterday, isSameDay, formatDistanceToNow } from 'date-fns';
import { uk } from 'date-fns/locale';
import { FriendList } from '@/components/friends/FriendList';
import { useFileTransfer } from '@/hooks/useFileTransfer';
import { FileTransferSidebar } from '@/components/chat/FileTransferSidebar';
import { FileTransferModal } from '@/components/chat/FileTransferModal';
import { FileMessage } from '@/components/chat/FileMessage';
import { useCall } from '@/hooks/useCall';
import { CallScreen } from '@/components/call/CallScreen';
import { parseMarkdown } from '@/lib/markdown';
import { LinkPreview } from '@/components/chat/LinkPreview';
import { Timer, Clock, Mic, Square } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { generateKeyFromRoomId, encryptText, decryptText } from '@/lib/e2ee';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { getCachedMessages, cacheMessages, cleanExpiredMessages, getRoomTheme, saveRoomTheme, getRoomShader, saveRoomShader } from '@/lib/db';
import { ShaderBackground, type ShaderType } from '@/components/ui/ShaderBackground';
import { GemSmoke } from '@paper-design/shaders-react';
import { DitheringStatusIndicator } from '@/components/ui/DitheringStatusIndicator';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ThemePickerModal } from '@/components/chat/ThemePickerModal';
import { ChatInput } from '@/components/chat/ChatInput';

interface Message {
  id: string;
  text: string;
  roomId: string;
  sender: string;
  timestamp: number;
  replyTo?: string;       // Feature 15: reply
  readBy?: string[];      // Feature 3: read receipts
  ttl?: number;           // Feature 20: auto-destruct TTL in seconds
  reactions?: Record<string, string>; // Feature 2: reactions (username -> emoji)
  editedAt?: number;      // Feature 11: Edit
  isDeleted?: boolean;    // Feature 11: Delete
}

// Feature 14: Extract first URL from text
function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<]+/);
  return match ? match[0] : null;
}

// Feature 16: Helper for VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Feature 20: TTL options
const TTL_OPTIONS = [
  { label: 'Без TTL', value: 0 },
  { label: '10 сек', value: 10 },
  { label: '1 хв', value: 60 },
  { label: '5 хв', value: 300 },
  { label: '1 день', value: 86400 },
];

const getThemeClasses = (theme: string) => {
  switch (theme) {
    case 'ocean': return 'bg-gradient-to-br from-blue-950/40 to-slate-900/40 border-blue-900/50 backdrop-blur-2xl';
    case 'cyberpunk': return 'bg-gradient-to-br from-fuchsia-950/40 to-violet-950/40 border-fuchsia-900/50 backdrop-blur-2xl';
    case 'forest': return 'bg-gradient-to-br from-emerald-950/40 to-zinc-900/40 border-emerald-900/50 backdrop-blur-2xl';
    case 'rose': return 'bg-gradient-to-br from-rose-950/40 to-zinc-900/40 border-rose-900/50 backdrop-blur-2xl';
    default: return 'bg-zinc-950/40 border-zinc-800/50 backdrop-blur-2xl';
  }
};

const getBubbleClasses = (theme: string, isMe: boolean) => {
  if (!isMe) return 'bg-zinc-900 border border-zinc-800/80 text-zinc-100';
  switch (theme) {
    case 'ocean': return 'bg-gradient-to-br from-cyan-600 to-blue-700 text-white border border-blue-500/50';
    case 'cyberpunk': return 'bg-gradient-to-br from-pink-600 to-purple-600 text-white border border-pink-500/50';
    case 'forest': return 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white border border-emerald-500/50';
    case 'rose': return 'bg-gradient-to-br from-rose-600 to-red-700 text-white border border-rose-500/50';
    default: return 'bg-gradient-to-br from-blue-600 to-blue-700 text-white';
  }
};

function getDateLabel(date: Date): string {
  if (isToday(date)) return 'Сьогодні';
  if (isYesterday(date)) return 'Вчора';
  return format(date, 'd MMMM yyyy', { locale: uk });
}

export default function ChatRoomClient({ roomId, initialHistory }: { roomId: string, initialHistory: Message[] }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialHistory);
  const [inputText, setInputText] = useState('');
  const [username, setUsername] = useState('');
  const [copied, setCopied] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // Feature 13: Emoji Picker
  const [isOnline, setIsOnline] = useState(true); // Feature 13: Offline Queue
  const [theme, setTheme] = useState('default'); // Theme state
  const [shaderType, setShaderType] = useState<ShaderType>('fluid'); // Shader type state
  const [showThemePicker, setShowThemePicker] = useState(false);
  
  // Feature 15: Last Seen tracking
  const [targetPresence, setTargetPresence] = useState<{ isOnline: boolean; lastSeen: number | null }>({ isOnline: false, lastSeen: null });
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const offlineQueueRef = useRef<any[]>([]);
  
  // Feature 12: Context Menu and Selection
  const [contextMenu, setContextMenu] = useState<{ msg: Message, x: number, y: number } | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());

  useEffect(() => {
    offlineQueueRef.current = offlineQueue;
  }, [offlineQueue]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);

  // Feature 2: typing indicator
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  // Feature 15: Reply
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  // Feature 11: Edit message
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  
  // Feature 20: Auto-destruct
  const [selectedTtl, setSelectedTtl] = useState(0);
  const [showTtlPicker, setShowTtlPicker] = useState(false);

  // Feature 9: E2E Encryption
  const [e2eKey, setE2eKey] = useState<CryptoKey | null>(null);
  const e2eKeyRef = useRef<CryptoKey | null>(null);

  useEffect(() => {
    e2eKeyRef.current = e2eKey;
  }, [e2eKey]);

  // Feature 11: Voice messages
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const sendMessage = async (text: string, isVoice = false) => {
    if (!text.trim() || !username) return;
    
    let payloadText = text;
    // Feature 9: Encrypt text if E2EE key is available and it's not a voice message (base64 is already obfuscated, but we can encrypt it too if we want)
    if (e2eKey) {
      try {
        payloadText = await encryptText(text, e2eKey);
        payloadText = 'E2E:' + payloadText; // Add prefix so receiver knows
      } catch (e) {
        console.error('Failed to encrypt:', e);
      }
    }

    const messagePayload = {
      text: payloadText,
      roomId,
      sender: username,
      replyTo: replyTo?.id || undefined,
      ttl: selectedTtl || undefined,
    };

    if (!isOnline) {
      setOfflineQueue(prev => [...prev, messagePayload]);
      // Optimistic cache so user sees it locally
      const tempMsg = {
        id: crypto.randomUUID(),
        ...messagePayload,
        text: text, // Show unencrypted text locally
        timestamp: Date.now()
      };
      cacheMessages([tempMsg]);
      setMessages(prev => [...prev, tempMsg]);
      return;
    }

    if (editingMsg) {
      try {
        await fetch('/api/messages/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'edit', msgId: editingMsg.id, roomId, text: messagePayload.text })
        });
        setEditingMsg(null);
        setInputText('');
      } catch (err) {
        console.error('Failed to edit:', err);
      }
      return;
    }

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messagePayload),
      });
    } catch (err) {
      console.error('Failed to send:', err);
    }
  };
  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  };

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Сьогодні';
    if (isYesterday(date)) return 'Вчора';
    return format(date, 'dd.MM.yyyy');
  };

  const getReplyMessage = (replyId: string) => {
    return messages.find(m => m.id === replyId);
  };

  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-zinc-800/80');
      setTimeout(() => el.classList.remove('bg-zinc-800/80'), 2000);
    }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      recorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          sendMessage(base64Audio, true);
        };
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecordingVoice(true);
    } catch (e) {
      console.error('Microphone access denied:', e);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
    }
  };

  const {
    transfers,
    pendingOffer,
    initiateTransfer,
    acceptOffer,
    rejectOffer,
    cancelTransfer
  } = useFileTransfer(username, (meta) => {
    sendMessage(JSON.stringify({
      type: 'file-transfer-meta',
      fileName: meta.fileName,
      fileSize: meta.fileSize,
      mimeType: meta.mimeType
    }));
  });

  const targetUsername = roomId.startsWith('private-') 
    ? roomId.replace('private-', '').split('-').find(u => u !== username) 
    : undefined;

  const {
    callState,
    incomingCall,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    isScreenSharing,
    peerConnection,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    screenStream,
    networkQuality
  } = useCall(username, targetUsername);

  // Feature 15: Fetch target presence periodically
  useEffect(() => {
    if (!targetUsername) return;
    
    const fetchPresence = async () => {
      try {
        const res = await fetch(`/api/presence?username=${targetUsername}`);
        if (res.ok) {
          const data = await res.json();
          setTargetPresence(data);
        }
      } catch (e) {}
    };
    
    fetchPresence();
    const interval = setInterval(fetchPresence, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [targetUsername]);

  // Feature 16: Web Push Subscription
  useEffect(() => {
    async function setupPush() {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          let subscription = await registration.pushManager.getSubscription();
          
          if (!subscription && Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
              const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
              if (publicKey) {
                subscription = await registration.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: urlBase64ToUint8Array(publicKey)
                });
              }
            }
          }
          
          if (subscription) {
            await fetch('/api/push/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(subscription)
            });
          }
        } catch (e) {
          console.error('Service Worker setup failed:', e);
        }
      }
    }
    setupPush();
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!targetUsername) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!targetUsername) return;
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      initiateTransfer(file, targetUsername, roomId);
    }
  };

  useEffect(() => {
    let mounted = true;
    setIsOnline(navigator.onLine);

    const handleOnline = async () => {
      setIsOnline(true);
      // Flush queue
      const queue = offlineQueueRef.current;
      if (queue.length > 0) {
        for (const payload of queue) {
          try {
            await fetch('/api/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
          } catch (e) {
            console.error('Failed to flush message:', e);
          }
        }
        setOfflineQueue([]);
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsMounted(true);
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!mounted) return;
        if (data.username) {
          setUsername(data.username);
        } else {
          router.push('/login');
        }
      })
      .catch(() => {
        if (mounted) router.push('/login');
      });
    return () => { mounted = false; };
  }, [router]);

  useEffect(() => {
    // Initialize E2EE key if private room
    if (roomId.startsWith('private-')) {
      generateKeyFromRoomId(roomId).then(setE2eKey).catch(console.error);
    }
  }, [roomId]);

  // Feature 12: Load cached messages from IndexedDB and sync with Redis on mount
  const syncHistory = useCallback(async (currentKey: CryptoKey | null) => {
    try {
      const res = await fetch(`/api/messages/history?roomId=${roomId}`);
      if (!res.ok) return;
      const history: Message[] = await res.json();
      
      const decryptedHistory = await Promise.all(history.map(async m => {
        if (m.text.startsWith('E2E:') && currentKey) {
          try {
            const dec = await decryptText(m.text.substring(4), currentKey);
            return { ...m, text: dec };
          } catch { return m; }
        }
        return m;
      }));

      cacheMessages(decryptedHistory);
      
      setMessages(prev => {
        const ids = new Set(prev.map(m => m.id));
        const merged = [...prev];
        decryptedHistory.forEach(m => {
          if (!ids.has(m.id)) {
            merged.push(m);
          } else {
            // Update existing in case it was a large message placeholder
            const idx = merged.findIndex(x => x.id === m.id);
            if (idx !== -1 && (merged[idx] as Message & { isLarge?: boolean }).isLarge) {
              merged[idx] = m;
            }
          }
        });
        merged.sort((a, b) => a.timestamp - b.timestamp);
        return merged;
      });
    } catch (e) {
      console.error('Failed to sync history', e);
    }
  }, [roomId]);

  useEffect(() => {
    let mounted = true;
    getCachedMessages(roomId).then(async (cached) => {
      if (!mounted) return;
      const key = roomId.startsWith('private-') ? await generateKeyFromRoomId(roomId) : null;
      getRoomTheme(roomId).then(t => mounted && setTheme(t));
      getRoomShader(roomId).then(s => mounted && setShaderType(s as ShaderType));
      if (cached.length > 0) {
        // Decrypt cached messages if needed
        const decryptedCache = await Promise.all(cached.map(async m => {
          if (m.text.startsWith('E2E:') && key) {
            try {
              const dec = await decryptText(m.text.substring(4), key);
              return { ...m, text: dec };
            } catch { return m; }
          }
          return m;
        }));

        setMessages(prev => {
          const ids = new Set(prev.map(m => m.id));
          const merged = [...prev];
          decryptedCache.forEach(m => { if (!ids.has(m.id)) merged.push(m); });
          merged.sort((a, b) => a.timestamp - b.timestamp);
          return merged;
        });
      }
      
      // Fetch fresh history from server
      syncHistory(key);
    });
    cleanExpiredMessages();
    return () => { mounted = false; };
  }, [roomId]);

  useEffect(() => {
    const client = getPusherClient();
    if (!client) return;

    const channelName = `room-${sanitizeChannelName(roomId)}`;
    const channel = client.subscribe(channelName);

    channel.bind('incoming-message', async (newMessage: Message & { isLarge?: boolean }) => {
      if (newMessage.isLarge) {
        // Fetch full payload from history API
        syncHistory(e2eKeyRef.current);
        return;
      }

      // Feature 12: Cache RAW new message
      cacheMessages([newMessage]);

      const dispMessage = { ...newMessage };
      // Feature 9: Decrypt incoming E2E message
      if (dispMessage.text.startsWith('E2E:') && e2eKeyRef.current) {
        dispMessage.text = await decryptText(dispMessage.text.substring(4), e2eKeyRef.current);
      }

      setMessages((prev) => {
        if (prev.find(m => m.id === dispMessage.id)) return prev;
        return [...prev, dispMessage];
      });
    });

    // Feature 2: typing events
    channel.bind('user-typing', (data: { username: string }) => {
      if (data.username === username) return;
      setTypingUsers(prev => new Set(prev).add(data.username));
      // Auto-clear after 3 seconds
      setTimeout(() => {
        setTypingUsers(prev => {
          const next = new Set(prev);
          next.delete(data.username);
          return next;
        });
      }, 3000);
    });

    // Feature 3: read receipts
    channel.bind('message-read', (data: { messageId: string; reader: string }) => {
      setMessages(prev => prev.map(m => {
        if (m.id === data.messageId) {
          const readBy = m.readBy ? [...m.readBy] : [];
          if (!readBy.includes(data.reader)) readBy.push(data.reader);
          return { ...m, readBy };
        }
        return m;
      }));
    });

    // Feature 2: message reactions
    channel.bind('message-reaction', (data: { msgId: string; sender: string; emoji: string }) => {
      setMessages(prev => prev.map(m => {
        if (m.id === data.msgId) {
          const reactions = { ...m.reactions, [data.sender]: data.emoji };
          // If emoji is empty, remove the reaction
          if (!data.emoji) delete reactions[data.sender];
          return { ...m, reactions };
        }
        return m;
      }));
    });

    // Feature 11: message edit/delete actions
    channel.bind('message-action', (data: { action: string; msgId: string; msg: Message }) => {
      setMessages(prev => prev.map(m => {
        if (m.id === data.msgId) {
          if (data.action === 'edit' || data.action === 'delete') {
            return { ...m, ...data.msg };
          }
        }
        return m;
      }));
    });

    // Feature: Theme syncing
    channel.bind('room-theme-changed', (data: { username: string; theme: string }) => {
      setTheme(data.theme);
      saveRoomTheme(roomId, data.theme);
    });

    return () => {
      client.unsubscribe(channelName);
    };
  }, [roomId, username]);

  // Feature 3: Mark messages as read when chat is visible
  useEffect(() => {
    if (!username || messages.length === 0) return;
    const unreadFromOthers = messages.filter(m => m.sender !== username && (!m.readBy || !m.readBy.includes(username)));
    if (unreadFromOthers.length === 0) return;

    // Batch mark as read
    const ids = unreadFromOthers.map(m => m.id);
    fetch('/api/messages/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageIds: ids, roomId }),
    }).catch(() => {});
  }, [messages, username, roomId]);

  // Feature 20: Auto-destruct messages with TTL
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    messages.forEach(msg => {
      if (msg.ttl && msg.ttl > 0) {
        const expiresAt = msg.timestamp + msg.ttl * 1000;
        const remaining = expiresAt - Date.now();
        if (remaining <= 0) {
          setMessages(prev => prev.filter(m => m.id !== msg.id));
        } else {
          const timer = setTimeout(() => {
            setMessages(prev => prev.filter(m => m.id !== msg.id));
          }, remaining);
          timers.push(timer);
        }
      }
    });
    return () => timers.forEach(t => clearTimeout(t));
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const currentReplyTo = replyTo;
    const textToSend = inputText;
    
    setInputText('');
    setReplyTo(null);

    try {
      await sendMessage(textToSend);
    } catch (e) {
      // Revert UI on failure
      setInputText(textToSend);
      setReplyTo(currentReplyTo);
    }
  };

  // Feature 2: send typing event (throttled to 2s)
  const sendTypingEvent = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < 2000) return;
    lastTypingSentRef.current = now;
    fetch('/api/messages/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId }),
    }).catch(() => {});
  }, [roomId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (e.target.value.trim()) {
      sendTypingEvent();
    }
  };

  // Feature 7: Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc — close reply
      if (e.key === 'Escape') {
        if (replyTo) {
          setReplyTo(null);
          e.preventDefault();
        }
      }
      // / — focus input (only when not already in an input)
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [replyTo]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };



  if (!username) return null;

  // Typing text
  const typingText = typingUsers.size > 0
    ? `${[...typingUsers].join(', ')} друкує...`
    : null;

  return (
    <>
      <ShaderBackground theme={theme} shaderType={shaderType} />
      {pendingOffer && (
        <FileTransferModal 
          senderName={pendingOffer.sender}
          fileName={pendingOffer.fileMeta.fileName}
          fileSize={pendingOffer.fileMeta.fileSize}
          onAccept={acceptOffer}
          onReject={rejectOffer}
        />
      )}
      <CallScreen
        callState={callState}
        incomingCall={incomingCall}
        localStream={localStream}
        remoteStream={remoteStream}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isScreenSharing={isScreenSharing}
        targetUsername={targetUsername}
        onAccept={acceptCall}
        onReject={rejectCall}
        onEnd={endCall}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
        peerConnection={peerConnection}
        screenStream={screenStream}
        networkQuality={networkQuality}
      />
      <div 
        className="w-full max-w-[95rem] flex h-[100dvh] md:h-[calc(100dvh-4rem)] md:my-8 mx-auto md:gap-4 relative px-2 md:px-4"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && targetUsername && (
          <div className="absolute inset-0 z-50 bg-black/80 border-2 border-dashed border-emerald-500 rounded-2xl flex items-center justify-center pointer-events-none backdrop-blur-md overflow-hidden animate-fade-in">
            <div className="absolute inset-0 opacity-40 pointer-events-none">
              <GemSmoke
                width="100%"
                height="100%"
                colors={["#2fb64c", "#cdff61", "#ffffff", "#0aff78"]}
                colorBack="#09090b"
                colorInner="#09090b"
                shape="none"
                innerDistortion={0.7}
                outerDistortion={0.7}
                outerGlow={1}
                innerGlow={1}
                offset={0}
                angle={45}
                size={0.9}
                speed={1}
                scale={2.2}
                fit="cover"
              />
            </div>
            <span className="text-emerald-400 font-bold text-xl bg-zinc-900/90 px-6 py-3 rounded-full shadow-2xl z-10 border border-emerald-500/30 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              Відпустіть файл для передачі
            </span>
          </div>
        )}
        
        {/* ЛІВА ПАНЕЛЬ: P2P Файли (тільки в приватних чатах) */}
        {targetUsername && (
          <div className="hidden lg:flex flex-col w-72 lg:w-80 h-full flex-shrink-0 animate-slide-up">
            <FileTransferSidebar 
              transfers={transfers}
              onCancelTransfer={cancelTransfer}
              onSendFile={(f) => initiateTransfer(f, targetUsername, roomId)}
              isFriendOnline={true}
            />
          </div>
        )}

        {/* ЦЕНТР: Чат */}
        <div className={`flex-1 flex flex-col h-full md:rounded-2xl md:border shadow-2xl relative overflow-hidden animate-slide-up min-w-0 transition-colors duration-500 ${getThemeClasses(theme)}`}>
        {/* Background ambient light */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
      
      {/* Header */}
      <div className="relative">
        <ChatHeader
          roomId={roomId}
          username={username}
          targetUsername={targetUsername}
          targetPresence={targetPresence}
          typingText={typingText}
          showThemePicker={showThemePicker}
          onBack={() => router.push('/')}
          onToggleThemePicker={() => setShowThemePicker(!showThemePicker)}
          onStartCall={startCall}
        />
        {showThemePicker && (
          <ThemePickerModal
            roomId={roomId}
            theme={theme}
            shaderType={shaderType}
            onThemeChange={(newTheme) => setTheme(newTheme)}
            onShaderChange={(newShader) => setShaderType(newShader)}
            onClose={() => setShowThemePicker(false)}
          />
        )}
      </div>

      {/* Chat Area */}
      <div 
        ref={chatAreaRef} 
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-1 scroll-smooth"
        onClick={() => setContextMenu(null)}
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 animate-fade-in opacity-50">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Send className="w-8 h-8 text-zinc-600" />
            </div>
            <p className="text-zinc-500 font-medium">Поки що тут тихо.<br/>Напишіть перше повідомлення!</p>
          </div>
        )}
        
        {messages.map((msg, idx) => {
          const isMe = msg.sender === username;
          const prevMsg = messages[idx - 1];
          const showSender = !prevMsg || prevMsg.sender !== msg.sender || (msg.timestamp - prevMsg.timestamp > 300000);
          
          // Feature 4: Date separators
          const msgDate = new Date(msg.timestamp);
          const prevDate = prevMsg ? new Date(prevMsg.timestamp) : null;
          const showDateSeparator = !prevDate || !isSameDay(msgDate, prevDate);

          let isFileMeta = false;
          let fileMetaData = null;
          try {
            if (msg.text.startsWith('{"type":"file-transfer-meta"')) {
              isFileMeta = true;
              fileMetaData = JSON.parse(msg.text);
            }
          } catch(e) {}

          // Feature 15: Find replied message
          const repliedMsg = msg.replyTo ? getReplyMessage(msg.replyTo) : null;

          // Feature 3: Read receipt status
          const isRead = isMe && msg.readBy && msg.readBy.length > 0;

          return (
            <div key={msg.id}>
              {/* Feature 4: Date separator */}
              {showDateSeparator && (
                <div className="flex items-center gap-4 py-4">
                  <div className="flex-1 h-px bg-zinc-800/60" />
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{getDateLabel(msgDate)}</span>
                  <div className="flex-1 h-px bg-zinc-800/60" />
                </div>
              )}
              <div 
                id={`msg-${msg.id}`} 
                className={`flex flex-col w-full transition-all duration-300 rounded-xl animate-slide-up ${isMe ? 'items-end' : 'items-start'} ${showSender ? 'mt-4' : 'mt-0.5'}`}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ msg, x: e.clientX, y: e.clientY });
                }}
              >
                {!isMe && showSender && (
                  <span className="text-[11px] font-medium text-zinc-500 mb-1.5 ml-2">{msg.sender}</span>
                )}
                
                {/* Feature 15: Reply quote */}
                {repliedMsg && (
                  <div 
                    className={`flex items-center gap-2 mb-1 px-3 py-1.5 rounded-lg cursor-pointer bg-zinc-800/50 border-l-2 border-blue-500 max-w-[70%] hover:bg-zinc-800 transition-colors ${isMe ? 'mr-2' : 'ml-2'}`}
                    onClick={() => scrollToMessage(repliedMsg.id)}
                  >
                    <Reply className="w-3 h-3 text-blue-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-blue-400 font-semibold">{repliedMsg.sender}</span>
                      <p className="text-[11px] text-zinc-400 truncate">{repliedMsg.text}</p>
                    </div>
                  </div>
                )}

                <div className="group relative flex items-end gap-2 max-w-[85%] sm:max-w-[70%]">
                  {selectionMode && (
                    <div 
                      className={`w-5 h-5 rounded border flex-shrink-0 cursor-pointer flex items-center justify-center mr-2 ${selectedMessages.has(msg.id) ? 'bg-blue-500 border-blue-500' : 'border-zinc-600 bg-zinc-800'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMessages(prev => {
                          const next = new Set(prev);
                          if (next.has(msg.id)) next.delete(msg.id);
                          else next.add(msg.id);
                          return next;
                        });
                      }}
                    >
                      {selectedMessages.has(msg.id) && <Check className="w-3 h-3 text-white" />}
                    </div>
                  )}
                  
                  {/* Reaction Button on Hover */}
                  <div className={`absolute top-0 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 border border-zinc-700 p-1.5 rounded-full shadow-xl flex gap-1 z-20 ${isMe ? 'right-0' : 'left-0'}`}>
                    {['👍', '❤️', '😂', '😮', '😡'].map(emoji => (
                      <button 
                        key={emoji}
                        onClick={() => {
                          fetch('/api/messages/react', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ msgId: msg.id, roomId, emoji: msg.reactions?.[username] === emoji ? '' : emoji })
                          });
                        }}
                        className={`hover:bg-zinc-700 w-7 h-7 rounded-full flex items-center justify-center text-sm transition-transform hover:scale-125 ${msg.reactions?.[username] === emoji ? 'bg-zinc-700 bg-opacity-50' : ''}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  {isFileMeta && fileMetaData ? (
                    <FileMessage 
                      fileName={fileMetaData.fileName} 
                      fileSize={fileMetaData.fileSize}
                      mimeType={fileMetaData.mimeType}
                      isMe={isMe}
                    />
                  ) : msg.isDeleted ? (
                    <div className={`px-5 py-3 shadow-lg bg-zinc-900 border border-zinc-800/80 text-zinc-500 italic rounded-2xl ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
                      Повідомлення видалено
                    </div>
                  ) : (
                    <div 
                      className={`
                        px-5 py-3 shadow-lg 
                        ${isMe ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl rounded-bl-sm'}
                        ${getBubbleClasses(theme, isMe)}
                      `}
                    >
                      {/* Feature 1: Markdown rendering or Feature 11: Voice message */}
                      {msg.text.startsWith('data:audio/') ? (
                        <audio controls src={msg.text} className="max-w-[200px] sm:max-w-[250px] h-10" />
                      ) : (
                        <p className="text-[15px] leading-relaxed break-words" dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.text) }} />
                      )}
                      
                      {msg.editedAt && (
                        <span className="text-[10px] text-zinc-400 opacity-70 ml-2">(змінено)</span>
                      )}

                      {/* Feature 20: Auto-destruct indicator */}
                      {msg.ttl && (
                        <div className="flex items-center gap-1 mt-1 text-amber-400/80">
                          <Timer className="w-3 h-3" />
                          <span className="text-[10px] font-medium">Самознищення: {msg.ttl < 60 ? `${msg.ttl}с` : msg.ttl < 3600 ? `${Math.floor(msg.ttl / 60)}хв` : `${Math.floor(msg.ttl / 3600)}д`}</span>
                        </div>
                      )}

                      {/* Display Reactions */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className={`absolute -bottom-3 flex items-center gap-1 ${isMe ? 'right-2' : 'left-2'}`}>
                          {Object.entries(
                            Object.values(msg.reactions).reduce((acc: Record<string, number>, emoji: string) => {
                              acc[emoji] = (acc[emoji] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>)
                          ).map(([emoji, count]) => (
                            <span key={emoji} className="bg-zinc-800 border border-zinc-700 text-[10px] px-1.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                              {emoji} <span className="text-zinc-400">{count > 1 ? count : ''}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Feature 15: Reply button on hover */}
                  <button 
                    onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }}
                    className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 absolute ${isMe ? '-left-8' : '-right-8'} bottom-1`}
                    title="Відповісти"
                  >
                    <Reply className="w-4 h-4" />
                  </button>
                </div>

                {/* Feature 14: Link preview */}
                {!isFileMeta && extractFirstUrl(msg.text) && (
                  <div className={`${isMe ? 'mr-2' : 'ml-2'}`}>
                    <LinkPreview url={extractFirstUrl(msg.text)!} />
                  </div>
                )}

                {/* Timestamp + Read receipts */}
                <div className={`flex items-center gap-1 mt-1 ${isMe ? 'mr-2' : 'ml-2'}`}>
                  <span className="text-[10px] font-medium text-zinc-600">
                    {format(new Date(msg.timestamp), 'HH:mm')}
                  </span>
                  {/* Feature 3: Read receipt checkmarks */}
                  {isMe && (
                    isRead 
                      ? <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                      : <Check className="w-3.5 h-3.5 text-zinc-600" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} className="h-4" />
      </div>

      {/* Feature 12: Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onMouseLeave={() => setContextMenu(null)}
        >
          <button 
            className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
            onClick={() => { setReplyTo(contextMenu.msg); setContextMenu(null); inputRef.current?.focus(); }}
          >
            Відповісти
          </button>
          <button 
            className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
            onClick={() => { navigator.clipboard.writeText(contextMenu.msg.text); setCopied(true); setTimeout(()=>setCopied(false), 2000); setContextMenu(null); }}
          >
            Копіювати текст
          </button>
          <button 
            className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
            onClick={() => { setSelectionMode(true); setSelectedMessages(new Set([contextMenu.msg.id])); setContextMenu(null); }}
          >
            Вибрати кілька
          </button>
          
          {contextMenu.msg.sender === username && !contextMenu.msg.isDeleted && (
            <>
              <div className="h-px bg-zinc-800 w-full" />
              <button 
                className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                onClick={() => { setEditingMsg(contextMenu.msg); setInputText(contextMenu.msg.text); setContextMenu(null); inputRef.current?.focus(); }}
              >
                Редагувати
              </button>
              <button 
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                onClick={() => {
                  if (confirm('Видалити повідомлення?')) {
                    fetch('/api/messages/action', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'delete', msgId: contextMenu.msg.id, roomId })
                    });
                  }
                  setContextMenu(null);
                }}
              >
                Видалити
              </button>
            </>
          )}
        </div>
      )}

      {/* Feature 12: Selection Action Bar */}
      {selectionMode && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-4 animate-slide-up">
          <span className="text-sm font-medium text-blue-400">{selectedMessages.size} вибрано</span>
          <div className="h-4 w-px bg-zinc-700"></div>
          <button 
            className="text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
            onClick={() => {
              if (confirm(`Видалити ${selectedMessages.size} повідомлень?`)) {
                Array.from(selectedMessages).forEach(msgId => {
                  fetch('/api/messages/action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'delete', msgId, roomId })
                  });
                });
                setSelectionMode(false);
                setSelectedMessages(new Set());
              }
            }}
          >
            Видалити
          </button>
          <div className="h-4 w-px bg-zinc-700"></div>
          <button 
            className="text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
            onClick={() => { setSelectionMode(false); setSelectedMessages(new Set()); }}
          >
            Скасувати
          </button>
        </div>
      )}

      {/* Input Area */}
      <ChatInput
        inputText={inputText}
        replyTo={replyTo}
        selectedTtl={selectedTtl}
        isRecordingVoice={isRecordingVoice}
        inputRef={inputRef}
        onInputChange={handleInputChange}
        onSendMessage={handleSendMessage}
        onCancelReply={() => setReplyTo(null)}
        onSelectTtl={(ttl) => setSelectedTtl(ttl)}
        onStartVoiceRecording={startVoiceRecording}
        onStopVoiceRecording={stopVoiceRecording}
      />
      </div>

      {/* ПРАВА ПАНЕЛЬ: Список друзів */}
      <div className="hidden md:flex flex-col w-72 lg:w-80 h-full flex-shrink-0 animate-slide-up">
        <FriendList currentUser={username} />
      </div>

    </div>
    </>
  );
}
