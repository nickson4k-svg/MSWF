'use client';

import { useState, useEffect, useRef, useCallback, useMemo, useSyncExternalStore } from 'react';

const subscribeSync = () => () => {};
const getSnapshotSync = () => true;
const getServerSnapshotSync = () => false;
import { useRouter } from 'next/navigation';
import { getPusherClient, sanitizeChannelName } from '@/lib/pusher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Copy, ArrowLeft, CheckCircle2, Video as VideoIcon, Reply, X, Check, CheckCheck, Palette, Trash2, ChevronDown } from 'lucide-react';
import { format, isToday, isYesterday, isSameDay, formatDistanceToNow } from 'date-fns';
import { uk } from 'date-fns/locale';
import { FriendList } from '@/components/friends/FriendList';
import { useFileTransfer } from '@/hooks/useFileTransfer';
import { FileTransferSidebar, type RoomFileItem } from '@/components/chat/FileTransferSidebar';
import { FileTransferModal } from '@/components/chat/FileTransferModal';
import { FileMessage } from '@/components/chat/FileMessage';
import { MediaViewerModal, type MediaItem } from '@/components/chat/MediaViewerModal';
import { useCall } from '@/hooks/useCall';
import { CallScreen } from '@/components/call/CallScreen';
import { parseMarkdown } from '@/lib/markdown';
import { LinkPreview } from '@/components/chat/LinkPreview';
import { Timer, Clock } from 'lucide-react';
import { generateKeyFromRoomId, encryptText, decryptText } from '@/lib/e2ee';
import { showDesktopFloatingWindow } from '@/lib/notifications';
import { getCachedMessages, cacheMessages, cleanExpiredMessages, getRoomTheme, saveRoomTheme, getRoomShader, saveMediaBlob, getMediaBlobsMap } from '@/lib/db';
import { ShaderBackground, type ShaderType } from '@/components/ui/ShaderBackground';
import { GemSmoke } from '@paper-design/shaders-react';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ThemePickerModal } from '@/components/chat/ThemePickerModal';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatMessageItem, type Message } from '@/components/chat/ChatMessageItem';
import { playIncomingMessageSound, playOutgoingMessageSound } from '@/lib/sound';
import { incrementUnreadBadge, clearUnreadBadge } from '@/lib/badge';
import { normalizeRoomId } from '@/lib/friends';

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



const openMiniPopupWindow = (sender: string, text: string) => {
  if (typeof window === 'undefined') return;
  try {
    const width = 360;
    const height = 110;
    const left = window.screen.width - width - 20;
    const top = 40;

    const popup = window.open(
      '',
      '_blank',
      `width=${width},height=${height},left=${left},top=${top},resizable=no,scrollbars=no,status=no,location=no,toolbar=no,menubar=no`
    );

    if (!popup) return;

    popup.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Нове повідомлення</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 10px;
              background: #09090b;
              color: #f4f4f5;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              user-select: none;
              overflow: hidden;
            }
            .card {
              background: #18181b;
              border: 1px solid #27272a;
              border-radius: 16px;
              padding: 10px 14px;
              display: flex;
              align-items: center;
              gap: 12px;
              box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);
              cursor: pointer;
            }
            .avatar {
              width: 38px;
              height: 38px;
              border-radius: 50%;
              background: #10b981;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 15px;
              color: white;
              flex-shrink: 0;
            }
            .content {
              flex: 1;
              min-width: 0;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .name {
              font-size: 13px;
              font-weight: 600;
              color: #f4f4f5;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .time {
              font-size: 10px;
              color: #71717a;
            }
            .text {
              font-size: 12px;
              color: #a1a1aa;
              margin-top: 2px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .close-btn {
              background: none;
              border: none;
              color: #71717a;
              font-size: 18px;
              cursor: pointer;
              padding: 2px 6px;
              line-height: 1;
            }
            .close-btn:hover { color: #f4f4f5; }
          </style>
        </head>
        <body>
          <div class="card" id="card">
            <div class="avatar">${(sender[0] || 'U').toUpperCase()}</div>
            <div class="content">
              <div class="header">
                <span class="name">${sender}</span>
                <span class="time">Зараз</span>
              </div>
              <div class="text">${text}</div>
            </div>
            <button class="close-btn" id="close">&times;</button>
          </div>
          <script>
            document.getElementById('card').onclick = (e) => {
              if (e.target.id === 'close') return;
              if (window.opener) { window.opener.focus(); }
              window.close();
            };
            document.getElementById('close').onclick = (e) => {
              e.stopPropagation();
              window.close();
            };
            setTimeout(() => { window.close(); }, 5000);
          </script>
        </body>
      </html>
    `);
  } catch (e) {}
};

export default function ChatRoomClient({ roomId, initialHistory }: { roomId: string, initialHistory: Message[] }) {
  const router = useRouter();
  const normalizedRoomId = useMemo(() => normalizeRoomId(roomId), [roomId]);
  const [messages, setMessages] = useState<Message[]>(initialHistory);
  const [inputText, setInputText] = useState('');
  const [username, setUsername] = useState('');
  const [currentUserAvatar, setCurrentUserAvatar] = useState('');
  const [copied, setCopied] = useState(false);
  const isMounted = useSyncExternalStore(subscribeSync, getSnapshotSync, getServerSnapshotSync);
  const [isDragging, setIsDragging] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // Feature 13: Emoji Picker
  const [isOnline, setIsOnline] = useState(true); // Feature 13: Offline Queue
  const [theme, setTheme] = useState('default'); // Theme state
  const [shaderType, setShaderType] = useState<ShaderType>('fluid'); // Shader type state
  const [showThemePicker, setShowThemePicker] = useState(false);
  
  // Feature 15: Last Seen tracking
  const [targetPresence, setTargetPresence] = useState<{ isOnline: boolean; lastSeen: number | null }>({ isOnline: false, lastSeen: null });
  const [offlineQueue, setOfflineQueue] = useState<unknown[]>([]);
  const offlineQueueRef = useRef<unknown[]>([]);
  
  // Feature 12: Context Menu and Selection
  const [contextMenu, setContextMenu] = useState<{ msg: Message, x: number, y: number } | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [deleteConfirmMsg, setDeleteConfirmMsg] = useState<Message | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [toastNotif, setToastNotif] = useState<{ sender: string; text: string } | null>(null);

  useEffect(() => {
    if (!toastNotif) return;
    const timer = setTimeout(() => setToastNotif(null), 4000);
    return () => clearTimeout(timer);
  }, [toastNotif]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    const handleUserGesture = () => {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    };
    window.addEventListener('click', handleUserGesture, { once: true });
    return () => window.removeEventListener('click', handleUserGesture);
  }, []);

  const [prevRoomId, setPrevRoomId] = useState(normalizedRoomId);
  if (prevRoomId !== normalizedRoomId) {
    setPrevRoomId(normalizedRoomId);
    setShowScrollBottom(false);
    setMessages([]);
  }

  const userScrolledUpRef = useRef(false);
  const prevMessagesLengthRef = useRef(messages.length);
  const hasScrolledToBottomOnLoadRef = useRef(false);

  useEffect(() => {
    hasScrolledToBottomOnLoadRef.current = false;
    userScrolledUpRef.current = false;
  }, [normalizedRoomId]);

  const usernameRef = useRef(username);
  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

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
      roomId: normalizedRoomId,
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
      playOutgoingMessageSound();
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

  const getReplyMessage = useCallback((replyId: string) => {
    return messages.find(m => m.id === replyId) || null;
  }, [messages]);

  const scrollToMessage = useCallback((msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-zinc-800/80');
      setTimeout(() => el.classList.remove('bg-zinc-800/80'), 2000);
    }
  }, []);

  const handleSelectMessage = useCallback((msgId: string) => {
    setSelectedMessages(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, msg: Message) => {
    e.preventDefault();
    setContextMenu({ msg, x: e.clientX, y: e.clientY });
  }, []);

  const handleReaction = useCallback((msgId: string, emoji: string) => {
    const targetMsg = messages.find(m => m.id === msgId);
    const currentEmoji = targetMsg?.reactions?.[username];
    fetch('/api/messages/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msgId, roomId: normalizedRoomId, emoji: currentEmoji === emoji ? '' : emoji })
    });
  }, [messages, username, normalizedRoomId]);

  const handleReply = useCallback((msg: Message) => {
    setReplyTo(msg);
    inputRef.current?.focus();
  }, []);

  const handleDeleteMessage = useCallback((msg: Message) => {
    setDeleteConfirmMsg(msg);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleteConfirmMsg) return;
    const msg = deleteConfirmMsg;
    setDeleteConfirmMsg(null);

    const updatedMsg = { ...msg, isDeleted: true, text: '' };
    setMessages(prev => prev.map(m => m.id === msg.id ? updatedMsg : m));
    cacheMessages([updatedMsg]);

    fetch('/api/messages/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', msgId: msg.id, roomId: normalizedRoomId })
    }).catch(err => console.error('Delete failed:', err));
  }, [deleteConfirmMsg, normalizedRoomId]);

  const handleBack = useCallback(() => {
    router.push('/');
  }, [router]);

  const handleToggleThemePicker = useCallback(() => {
    setShowThemePicker(prev => !prev);
  }, []);

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

  const targetUsername = normalizedRoomId.startsWith('private-') 
    ? normalizedRoomId.replace('private-', '').split('-').find(u => u !== username) 
    : undefined;

  const [activeMediaIndex, setActiveMediaIndex] = useState<number | null>(null);
  const [cachedMediaBlobs, setCachedMediaBlobs] = useState<Record<string, string>>({});

  useEffect(() => {
    getMediaBlobsMap().then(map => setCachedMediaBlobs(map));
  }, [messages.length, transfers.length]);

  const roomMediaList = useMemo<MediaItem[]>(() => {
    const list: MediaItem[] = [];
    messages.forEach(msg => {
      if (msg.isDeleted) return;

      if (msg.text.startsWith('data:image/')) {
        list.push({
          id: msg.id,
          url: msg.text,
          type: 'image',
          fileName: `Зображення_${format(new Date(msg.timestamp), 'HHmm')}.png`,
          sender: msg.sender,
          timestamp: msg.timestamp,
        });
      } else if (msg.text.startsWith('data:video/')) {
        const mime = msg.text.substring(5, msg.text.indexOf(';'));
        const ext = mime.split('/')[1] || 'mp4';
        list.push({
          id: msg.id,
          url: msg.text,
          type: 'video',
          fileName: `Відео_${format(new Date(msg.timestamp), 'HHmm')}.${ext}`,
          sender: msg.sender,
          timestamp: msg.timestamp,
        });
      } else if (msg.text.startsWith('{"type":"file-transfer-meta"')) {
        try {
          const meta = JSON.parse(msg.text);
          const mime = meta.mimeType || '';
          if (mime.startsWith('image/') || mime.startsWith('video/')) {
            const trBlob = transfers.find(t => t.fileMeta.fileName === meta.fileName && t.blobUrl)?.blobUrl;
            const mediaUrl = trBlob || cachedMediaBlobs[meta.fileName];
            if (mediaUrl) {
              list.push({
                id: msg.id,
                url: mediaUrl,
                type: mime.startsWith('image/') ? 'image' : 'video',
                fileName: meta.fileName,
                sender: msg.sender,
                timestamp: msg.timestamp,
              });
            }
          }
        } catch {}
      }
    });
    return list;
  }, [messages, transfers, cachedMediaBlobs]);

  const handleMediaClick = useCallback((url: string, type: 'image' | 'video', fileName: string) => {
    const idx = roomMediaList.findIndex(m => m.url === url);
    if (idx !== -1) {
      setActiveMediaIndex(idx);
    } else {
      setActiveMediaIndex(0);
    }
  }, [roomMediaList]);

  const handleSendFile = useCallback((f: File) => {
    if (f.type.startsWith('image/') || f.type.startsWith('video/')) {
      if (f.size <= 16 * 1024 * 1024) {
        const reader = new FileReader();
        reader.readAsDataURL(f);
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          saveMediaBlob(f.name, base64Data);
          sendMessage(base64Data);
        };
        return;
      }
    }

    if (targetUsername) {
      initiateTransfer(f, targetUsername, normalizedRoomId);
    }
  }, [targetUsername, normalizedRoomId, initiateTransfer, sendMessage]);

  const roomFiles = useMemo<RoomFileItem[]>(() => {
    const files: RoomFileItem[] = [];
    messages.forEach(msg => {
      if (msg.isDeleted) return;

      if (msg.text.startsWith('{"type":"file-transfer-meta"')) {
        try {
          const meta = JSON.parse(msg.text);
          if (meta.fileName) {
            files.push({
              id: msg.id,
              fileName: meta.fileName,
              fileSize: meta.fileSize || 0,
              mimeType: meta.mimeType || 'application/octet-stream',
              sender: msg.sender === username ? 'Ви' : msg.sender,
              timestamp: msg.timestamp,
            });
          }
        } catch {}
      } else if (msg.text.startsWith('data:audio/')) {
        files.push({
          id: msg.id,
          fileName: 'Голосове повідомлення',
          fileSize: Math.round((msg.text.length * 3) / 4),
          mimeType: 'audio/webm',
          sender: msg.sender === username ? 'Ви' : msg.sender,
          timestamp: msg.timestamp,
          downloadData: msg.text,
        });
      } else if (msg.text.startsWith('data:image/') || msg.text.startsWith('data:video/') || msg.text.startsWith('data:application/')) {
        const mime = msg.text.substring(5, msg.text.indexOf(';'));
        const ext = mime.split('/')[1] || 'bin';
        files.push({
          id: msg.id,
          fileName: `Файл_${format(new Date(msg.timestamp), 'HHmm')}.${ext}`,
          fileSize: Math.round((msg.text.length * 3) / 4),
          mimeType: mime,
          sender: msg.sender === username ? 'Ви' : msg.sender,
          timestamp: msg.timestamp,
          downloadData: msg.text,
        });
      }
    });

    return files.reverse();
  }, [messages, username]);

  const {
    callState,
    incomingCall,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    isScreenSharing,
    isRemoteScreenSharing,
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
        offlineQueueRef.current = [];
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!mounted) return;
        if (data.username) {
          setUsername(data.username);
          if (data.avatar) setCurrentUserAvatar(data.avatar);
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
    if (normalizedRoomId.startsWith('private-')) {
      generateKeyFromRoomId(normalizedRoomId).then(setE2eKey).catch(console.error);
    }
  }, [normalizedRoomId]);

  // Feature 12: Load cached messages from IndexedDB and sync with Redis on mount
  const syncHistory = useCallback(async (currentKey: CryptoKey | null) => {
    try {
      const res = await fetch(`/api/messages/history?roomId=${normalizedRoomId}`);
      if (!res.ok) return;
      const history: Message[] = await res.json();
      
      const keyToUse = currentKey || (normalizedRoomId.startsWith('private-') ? await generateKeyFromRoomId(normalizedRoomId) : null);

      const decryptedHistory = await Promise.all(history.map(async m => {
        if (m.text.startsWith('E2E:') && keyToUse) {
          try {
            const dec = await decryptText(m.text.substring(4), keyToUse);
            return { ...m, text: dec };
          } catch { return m; }
        }
        return m;
      }));

      cacheMessages(decryptedHistory);
      
      setMessages(prev => {
        const merged = [...prev];
        decryptedHistory.forEach(m => {
          const idx = merged.findIndex(x => x.id === m.id);
          if (idx === -1) {
            merged.push(m);
          } else {
            merged[idx] = { ...merged[idx], ...m };
          }
        });
        merged.sort((a, b) => a.timestamp - b.timestamp);
        return merged;
      });
    } catch (e) {
      console.error('Failed to sync history', e);
    }
  }, [normalizedRoomId]);

  useEffect(() => {
    let mounted = true;
    getCachedMessages(normalizedRoomId).then(async (cached) => {
      if (!mounted) return;
      const key = normalizedRoomId.startsWith('private-') ? await generateKeyFromRoomId(normalizedRoomId) : null;
      getRoomTheme(normalizedRoomId).then(t => mounted && setTheme(t));
      getRoomShader(normalizedRoomId).then(s => mounted && setShaderType(s as ShaderType));
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
  }, [normalizedRoomId, syncHistory]);

  useEffect(() => {
    clearUnreadBadge();
    const handleFocus = () => clearUnreadBadge();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  useEffect(() => {
    const client = getPusherClient();
    if (!client) return;

    const channelName = `room-${sanitizeChannelName(normalizedRoomId)}`;
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
      const key = e2eKeyRef.current;
      if (dispMessage.text.startsWith('E2E:') && key) {
        try {
          dispMessage.text = await decryptText(dispMessage.text.substring(4), key);
        } catch {
          // fallback: try generating key
          try {
            const freshKey = await generateKeyFromRoomId(normalizedRoomId);
            dispMessage.text = await decryptText(dispMessage.text.substring(4), freshKey);
          } catch {}
        }
      }

      setMessages((prev) => {
        if (prev.find(m => m.id === dispMessage.id)) return prev;
        if (dispMessage.sender !== usernameRef.current) {
          const isFocusedInApp = !document.hidden && document.hasFocus();

          // Only play sound and show notifications if user is NOT actively focused in this chat
          if (!isFocusedInApp) {
            playIncomingMessageSound();

            const textPreview = dispMessage.text.startsWith('data:audio/') 
              ? '🎤 Голосове повідомлення' 
              : dispMessage.text.startsWith('{"type":"file-transfer-meta"') 
                ? '📁 Передано файл' 
                : dispMessage.text;

            // 1. Native Desktop Notification for backgrounded/minimized app
            // 1. True OS Desktop Floating Window (DocPiP / Popup / Native Notification)
            showDesktopFloatingWindow(dispMessage.sender, textPreview, () => {
              window.focus();
            });

            // 2. In-App Telegram Toast popup
            setToastNotif({
              sender: dispMessage.sender,
              text: textPreview,
            });

            if (document.hidden) {
              incrementUnreadBadge();
            }
          }
        }
        const next = [...prev, dispMessage];
        next.sort((a, b) => a.timestamp - b.timestamp);
        return next;
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

    const userChannelName = `user-${sanitizeChannelName(username)}`;
    const userChannel = client.subscribe(userChannelName);

    const handleMessageAction = (data: { action: string; msgId: string; msg: Message }) => {
      setMessages(prev => prev.map(m => {
        if (m.id === data.msgId) {
          if (data.action === 'edit' || data.action === 'delete') {
            const updated = { ...m, ...data.msg, isDeleted: data.action === 'delete' ? true : data.msg?.isDeleted };
            cacheMessages([updated]);
            return updated;
          }
        }
        return m;
      }));
    };

    // Feature 11: message edit/delete actions
    channel.bind('message-action', handleMessageAction);
    userChannel.bind('message-action', handleMessageAction);

    // Feature: Theme syncing
    channel.bind('room-theme-changed', (data: { username: string; theme: string }) => {
      setTheme(data.theme);
      saveRoomTheme(normalizedRoomId, data.theme);
    });

    return () => {
      client.unsubscribe(channelName);
      client.unsubscribe(userChannelName);
    };
  }, [normalizedRoomId, username]);

  // Feature 3: Mark messages as read when chat is visible
  useEffect(() => {
    if (!username || messages.length === 0) return;
    const unreadFromOthers = messages.filter(m => m.sender !== username && (!m.readBy || !m.readBy.includes(username)));
    if (unreadFromOthers.length === 0) return;

    const timer = setTimeout(() => {
      const ids = unreadFromOthers.map(m => m.id);
      
      // Optimistically update local readBy state so we don't re-send
      setMessages(prev => prev.map(m => {
        if (ids.includes(m.id)) {
          const readBy = m.readBy ? [...m.readBy] : [];
          if (!readBy.includes(username)) readBy.push(username);
          return { ...m, readBy };
        }
        return m;
      }));

      // Send to server
      fetch('/api/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds: ids, roomId: normalizedRoomId }),
      }).catch(() => {});
    }, 300);

    return () => clearTimeout(timer);
  }, [messages, username, normalizedRoomId]);

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

  const handleChatScroll = useCallback(() => {
    const el = chatAreaRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isUp = distanceFromBottom > 150;
    setShowScrollBottom(isUp);
    userScrolledUpRef.current = isUp;
  }, []);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    userScrolledUpRef.current = false;
    setShowScrollBottom(false);
  }, []);

  useEffect(() => {
    const isNewMessageAdded = messages.length > prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages.length;

    // Initial load upon entering chat room: scroll to bottom
    if (messages.length > 0 && !hasScrolledToBottomOnLoadRef.current) {
      const timer = setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollIntoView({ behavior: 'auto' });
        }
      }, 50);

      const timer2 = setTimeout(() => {
        if (scrollRef.current && !userScrolledUpRef.current) {
          scrollRef.current.scrollIntoView({ behavior: 'auto' });
        }
      }, 200);

      hasScrolledToBottomOnLoadRef.current = true;
      return () => {
        clearTimeout(timer);
        clearTimeout(timer2);
      };
    }

    // Subsequent updates: ONLY scroll if a NEW message was added
    if (hasScrolledToBottomOnLoadRef.current && isNewMessageAdded) {
      const lastMsg = messages[messages.length - 1];
      const isMyMsg = lastMsg?.sender === usernameRef.current;
      if (isMyMsg || !userScrolledUpRef.current) {
        if (scrollRef.current) {
          scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }
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
        isRemoteScreenSharing={isRemoteScreenSharing}
        targetUsername={targetUsername}
        currentUser={username}
        currentUserAvatar={currentUserAvatar}
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
              roomFiles={roomFiles}
              onCancelTransfer={cancelTransfer}
              onSendFile={handleSendFile}
              isFriendOnline={true}
              onScrollToMessage={scrollToMessage}
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
          onBack={handleBack}
          onToggleThemePicker={handleToggleThemePicker}
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
        onScroll={handleChatScroll}
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
          
          const msgDate = new Date(msg.timestamp);
          const prevDate = prevMsg ? new Date(prevMsg.timestamp) : null;
          const showDateSeparator = !prevDate || !isSameDay(msgDate, prevDate);

          const repliedMsg = msg.replyTo ? getReplyMessage(msg.replyTo) : null;
          const isSelected = selectedMessages.has(msg.id);

          return (
            <ChatMessageItem
              key={msg.id}
              msg={msg}
              isMe={isMe}
              showSender={showSender}
              showDateSeparator={showDateSeparator}
              dateLabel={getDateLabel(msgDate)}
              repliedMsg={repliedMsg}
              selectionMode={selectionMode}
              isSelected={isSelected}
              theme={theme}
              username={username}
              onSelect={handleSelectMessage}
              onContextMenu={handleContextMenu}
              onReaction={handleReaction}
              onReply={handleReply}
              onDelete={handleDeleteMessage}
              onScrollToReply={scrollToMessage}
              onMediaClick={handleMediaClick}
              transfers={transfers}
              cachedMediaBlobs={cachedMediaBlobs}
            />
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
          
          {!contextMenu.msg.isDeleted && (
            <>
              <div className="h-px bg-zinc-800 w-full" />
              {contextMenu.msg.sender === username && (
                <button 
                  className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                  onClick={() => { setEditingMsg(contextMenu.msg); setInputText(contextMenu.msg.text); setContextMenu(null); inputRef.current?.focus(); }}
                >
                  Редагувати
                </button>
              )}
              <button 
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                onClick={() => {
                  const targetMsg = contextMenu.msg;
                  setContextMenu(null);
                  handleDeleteMessage(targetMsg);
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

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-6 z-40 p-3 rounded-full bg-zinc-900/90 border border-zinc-700/80 text-zinc-300 hover:text-white shadow-2xl hover:bg-zinc-800 transition-all transform hover:scale-110 active:scale-95 backdrop-blur-md flex items-center justify-center animate-in fade-in zoom-in duration-150"
          title="Наниз"
        >
          <ChevronDown className="w-5 h-5 text-emerald-400" />
        </button>
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
        onSendFile={handleSendFile}
      />
      </div>

      {/* ПРАВА ПАНЕЛЬ: Список друзів */}
      <div className="hidden md:flex flex-col w-72 lg:w-80 h-full flex-shrink-0 animate-slide-up">
        <FriendList currentUser={username} />
      </div>

    </div>

    {/* Custom Delete Confirmation Modal */}
    {deleteConfirmMsg && (
      <div 
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        onClick={() => setDeleteConfirmMsg(null)}
      >
        <div 
          className="bg-zinc-900/95 border border-zinc-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full space-y-5 animate-in zoom-in-95 duration-100 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto shadow-inner">
            <Trash2 className="w-6 h-6" />
          </div>
          
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-zinc-100">Видалити повідомлення?</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Цю дію неможливо скасувати. Повідомлення буде вилучено для всіх учасників чату.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button 
              onClick={() => setDeleteConfirmMsg(null)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-300 font-medium text-sm transition-all"
            >
              Скасувати
            </button>
            <button 
              onClick={confirmDelete}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-95 text-white font-medium text-sm shadow-lg shadow-red-600/25 transition-all"
            >
              Видалити
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Telegram-style Popup Toast Notification */}
    {toastNotif && (
      <div 
        className="fixed top-5 right-5 z-50 max-w-xs sm:max-w-sm w-full bg-zinc-900/95 border border-zinc-700/80 p-3.5 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-3 animate-in slide-in-from-top-5 duration-300 cursor-pointer hover:border-zinc-500 transition-all group"
        onClick={() => {
          window.focus();
          setToastNotif(null);
          scrollToBottom();
        }}
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
          {toastNotif.sender[0]?.toUpperCase()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-zinc-100 truncate">{toastNotif.sender}</h4>
            <span className="text-[10px] text-zinc-500 font-medium">Зараз</span>
          </div>
          <p className="text-xs text-zinc-300 truncate mt-0.5 font-normal">
            {toastNotif.text}
          </p>
        </div>

        <button 
          onClick={(e) => {
            e.stopPropagation();
            setToastNotif(null);
          }}
          className="text-zinc-500 hover:text-zinc-300 p-1 rounded-full hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )}

    {/* Telegram Fullscreen Media Viewer Modal */}
    {activeMediaIndex !== null && roomMediaList.length > 0 && (
      <MediaViewerModal
        mediaList={roomMediaList}
        currentIndex={activeMediaIndex}
        onClose={() => setActiveMediaIndex(null)}
        onNavigate={(idx) => setActiveMediaIndex(idx)}
      />
    )}
    </>
  );
}
