'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getPusherClient, sanitizeChannelName } from '@/lib/pusher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Copy, ArrowLeft, CheckCircle2, Video as VideoIcon, Reply, X, Check, CheckCheck } from 'lucide-react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
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
import { getCachedMessages, cacheMessages, cleanExpiredMessages } from '@/lib/db';
import { ThemeToggle } from '@/components/ThemeToggle';
import { generateKeyFromRoomId, encryptText, decryptText } from '@/lib/e2ee';

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

// Feature 20: TTL options
const TTL_OPTIONS = [
  { label: 'Без TTL', value: 0 },
  { label: '10 сек', value: 10 },
  { label: '1 хв', value: 60 },
  { label: '5 хв', value: 300 },
  { label: '1 день', value: 86400 },
];

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
  const [isOnline, setIsOnline] = useState(true); // Feature 13: Offline Queue
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const offlineQueueRef = useRef<any[]>([]);

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
      fileSize: meta.fileSize
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
    toggleScreenShare
  } = useCall(username, targetUsername, roomId);

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
            if (idx !== -1 && (merged[idx] as any).isLarge) {
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

    channel.bind('incoming-message', async (newMessage: any) => {
      if (newMessage.isLarge) {
        // Fetch full payload from history API
        syncHistory(e2eKeyRef.current);
        return;
      }

      // Feature 12: Cache RAW new message
      cacheMessages([newMessage]);

      let dispMessage = { ...newMessage };
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

  // Feature 15: scroll to replied message
  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-blue-500/50');
      setTimeout(() => el.classList.remove('ring-2', 'ring-blue-500/50'), 2000);
    }
  };

  // Feature 4: group messages by date
  const getReplyMessage = (id: string) => messages.find(m => m.id === id);

  if (!username) return null;

  // Typing text
  const typingText = typingUsers.size > 0
    ? `${[...typingUsers].join(', ')} друкує...`
    : null;

  return (
    <>
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
      />
      <div 
        className="w-full max-w-[95rem] flex h-[100dvh] md:h-[calc(100dvh-4rem)] md:my-8 mx-auto md:gap-4 relative px-2 md:px-4"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && targetUsername && (
          <div className="absolute inset-0 z-50 bg-emerald-500/10 border-2 border-dashed border-emerald-500 rounded-2xl flex items-center justify-center pointer-events-none backdrop-blur-sm">
            <span className="text-emerald-400 font-bold text-xl bg-zinc-900/80 px-6 py-3 rounded-full shadow-2xl">Відпустіть файл для передачі</span>
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
        <div className="flex-1 flex flex-col h-full md:rounded-2xl md:border bg-zinc-950/60 shadow-2xl relative overflow-hidden animate-slide-up min-w-0">
        {/* Background ambient light */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
      
      {/* Header */}
      <header className="flex items-center justify-between p-4 sm:px-6 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl z-10">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push('/')}
            className="rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex flex-col">
            <h1 className="font-bold text-lg leading-tight text-zinc-100 flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 animate-pixel-flame"></span>
              {roomId.startsWith('private-') 
                ? `Приватний чат з ${roomId.replace('private-', '').split('-').find(u => u !== username)}`
                : `Кімната ${roomId}`
              }
            </h1>
            {/* Feature 2: Typing indicator */}
            <p className="text-xs text-zinc-400 font-medium h-4">
              {typingText ? (
                <span className="text-blue-400 animate-pulse">{typingText}</span>
              ) : (
                <>Ви увійшли як <span className="text-blue-400">{username}</span></>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <ThemeToggle />
          {targetUsername && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => startCall(targetUsername)}
              className="rounded-full hover:bg-zinc-800 text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10"
              title="Відеодзвінок"
            >
              <VideoIcon className="w-5 h-5" />
            </Button>
          )}
          {!roomId.startsWith('private-') && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={copyLink} 
              className="border-zinc-700/50 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-full px-4 transition-all"
            >
              {copied ? (
                <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              {copied ? 'Скопійовано' : 'Поділитися'}
            </Button>
          )}
        </div>
      </header>

      {/* Chat Area */}
      <div ref={chatAreaRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-1 scroll-smooth">
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
              <div id={`msg-${msg.id}`} className={`flex flex-col w-full transition-all duration-300 rounded-xl ${isMe ? 'items-end' : 'items-start'} ${showSender ? 'mt-4' : 'mt-0.5'}`}>
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
                  {/* Edit/Delete Actions for Own Messages */}
                  {isMe && !msg.isDeleted && (
                    <div className="absolute top-0 right-0 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl flex z-20 overflow-hidden">
                      <button 
                        onClick={() => {
                          let plainText = msg.text;
                          if (plainText.startsWith('E2E:') && e2eKeyRef.current) {
                            // If it's encrypted, we need the original text. We rely on the decrypted view.
                            // But wait, the msg.text in state is already decrypted!
                          }
                          setEditingMsg(msg);
                          setInputText(msg.text);
                          inputRef.current?.focus();
                        }}
                        className="px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white border-r border-zinc-700 transition-colors"
                      >
                        Редагувати
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm('Видалити повідомлення?')) {
                            fetch('/api/messages/action', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'delete', msgId: msg.id, roomId })
                            });
                          }
                        }}
                        className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                      >
                        Видалити
                      </button>
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
                    <FileMessage fileName={fileMetaData.fileName} fileSize={fileMetaData.fileSize} />
                  ) : msg.isDeleted ? (
                    <div className={`px-5 py-3 shadow-lg bg-zinc-900 border border-zinc-800/80 text-zinc-500 italic rounded-2xl ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
                      Повідомлення видалено
                    </div>
                  ) : (
                    <div 
                      className={`
                        px-5 py-3 shadow-lg 
                        ${isMe 
                          ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl rounded-br-sm' 
                          : 'bg-zinc-900 border border-zinc-800/80 text-zinc-100 rounded-2xl rounded-bl-sm'}
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
                            Object.values(msg.reactions).reduce((acc, emoji) => {
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

      {/* Input Area */}
      <footer className="p-3 sm:p-6 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800/60 z-10" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
        {/* Feature 15: Reply bar */}
        {replyTo && (
          <div className="flex items-center gap-2 mb-2 px-4 py-2 bg-zinc-900/80 rounded-xl border border-zinc-800/50 max-w-4xl mx-auto animate-slide-up">
            <Reply className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs text-blue-400 font-semibold">{replyTo.sender}</span>
              <p className="text-xs text-zinc-400 truncate">{replyTo.text}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-zinc-500 hover:text-white p-1 rounded-full hover:bg-zinc-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <form onSubmit={handleSendMessage} className="w-full flex gap-2 sm:gap-4 max-w-4xl mx-auto items-center relative">
          {/* Feature 20: TTL picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTtlPicker(!showTtlPicker)}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all ${selectedTtl > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-900/80 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
              title="Самознищення"
            >
              <Timer className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            {showTtlPicker && (
              <div className="absolute bottom-14 left-0 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-1 z-20 animate-slide-up min-w-[120px]">
                {TTL_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setSelectedTtl(opt.value); setShowTtlPicker(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${selectedTtl === opt.value ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-300 hover:bg-zinc-800'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Input 
            ref={inputRef}
            value={inputText}
            onChange={handleInputChange}
            placeholder="Напишіть повідомлення..."
            className="flex-1 bg-zinc-900/80 border-zinc-700/50 text-zinc-100 h-12 sm:h-14 pl-4 sm:pl-5 pr-12 sm:pr-14 rounded-full focus-visible:ring-1 focus-visible:ring-blue-500/50 shadow-inner text-[14px] sm:text-[15px] placeholder:text-zinc-500"
          />
          <div className="absolute right-1 sm:right-1.5 flex items-center gap-1">
            {inputText.trim() ? (
              <Button 
                type="submit" 
                className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center justify-center p-0 shadow-md"
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={isRecordingVoice ? stopVoiceRecording : startVoiceRecording}
                className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full transition-all flex items-center justify-center p-0 shadow-md ${isRecordingVoice ? 'bg-red-500 hover:bg-red-600 animate-pulse text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}
                title={isRecordingVoice ? "Зупинити запис" : "Голосове повідомлення"}
              >
                {isRecordingVoice ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
              </Button>
            )}
          </div>
        </form>
      </footer>
      </div>

      {/* ПРАВА ПАНЕЛЬ: Список друзів */}
      <div className="hidden md:flex flex-col w-72 lg:w-80 h-full flex-shrink-0 animate-slide-up">
        <FriendList currentUser={username} />
      </div>

    </div>
    </>
  );
}
