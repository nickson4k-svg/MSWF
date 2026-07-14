'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getPusherClient, sanitizeChannelName } from '@/lib/pusher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Copy, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { FriendList } from '@/components/friends/FriendList';
import { useFileTransfer } from '@/hooks/useFileTransfer';
import { FileTransferSidebar } from '@/components/chat/FileTransferSidebar';
import { FileTransferModal } from '@/components/chat/FileTransferModal';
import { FileMessage } from '@/components/chat/FileMessage';
import { useCall } from '@/hooks/useCall';
import { CallScreen } from '@/components/call/CallScreen';
import { Video as VideoIcon } from 'lucide-react';
interface Message {
  id: string;
  text: string;
  roomId: string;
  sender: string;
  timestamp: number;
}

export default function ChatRoomClient({ roomId, initialHistory }: { roomId: string, initialHistory: Message[] }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialHistory);
  const [inputText, setInputText] = useState('');
  const [username, setUsername] = useState('');
  const [copied, setCopied] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendMessage = async (text: string) => {
    if (!text.trim() || !username) return;
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          roomId,
          sender: username
        }),
      });
    } catch (err) {
      console.error('Failed to send:', err);
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
    const client = getPusherClient();
    if (!client) return;

    const channelName = `room-${sanitizeChannelName(roomId)}`;
    const channel = client.subscribe(channelName);

    channel.bind('incoming-message', (newMessage: Message) => {
      setMessages((prev) => {
        if (prev.find(m => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
    });

    return () => {
      client.unsubscribe(channelName);
    };
  }, [roomId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !username) return;

    const currentText = inputText;
    setInputText('');
    await sendMessage(currentText);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!username) return null;

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
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-slow"></span>
              {roomId.startsWith('private-') 
                ? `Приватний чат з ${roomId.replace('private-', '').split('-').find(u => u !== username)}`
                : `Кімната ${roomId}`
              }
            </h1>
            <p className="text-xs text-zinc-400 font-medium">
              Ви увійшли як <span className="text-blue-400">{username}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth">
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
          const showSender = idx === 0 || messages[idx - 1].sender !== msg.sender;

          let isFileMeta = false;
          let fileMetaData = null;
          try {
            if (msg.text.startsWith('{"type":"file-transfer-meta"')) {
              isFileMeta = true;
              fileMetaData = JSON.parse(msg.text);
            }
          } catch(e) {}

          return (
            <div key={msg.id} className={`flex flex-col w-full animate-slide-up ${isMe ? 'items-end' : 'items-start'}`}>
              {!isMe && showSender && (
                <span className="text-[11px] font-medium text-zinc-500 mb-1.5 ml-2">{msg.sender}</span>
              )}
              
              <div className="group relative flex items-end gap-2 max-w-[85%] sm:max-w-[70%]">
                {isFileMeta && fileMetaData ? (
                  <FileMessage fileName={fileMetaData.fileName} fileSize={fileMetaData.fileSize} />
                ) : (
                  <div 
                    className={`
                      px-5 py-3 shadow-lg 
                      ${isMe 
                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl rounded-br-sm' 
                        : 'bg-zinc-900 border border-zinc-800/80 text-zinc-100 rounded-2xl rounded-bl-sm'}
                    `}
                  >
                    <p className="text-[15px] leading-relaxed break-words">{msg.text}</p>
                  </div>
                )}
              </div>
              <span className={`text-[10px] font-medium text-zinc-600 mt-1.5 ${isMe ? 'mr-2' : 'ml-2'}`}>
                {format(new Date(msg.timestamp), 'HH:mm')}
              </span>
            </div>
          );
        })}
        <div ref={scrollRef} className="h-4" />
      </div>

      {/* Input Area */}
      <footer className="p-3 sm:p-6 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800/60 z-10" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
        <form onSubmit={handleSendMessage} className="w-full flex gap-2 sm:gap-4 max-w-4xl mx-auto items-center relative">
          <Input 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Напишіть повідомлення..."
            className="flex-1 bg-zinc-900/80 border-zinc-700/50 text-zinc-100 h-12 sm:h-14 pl-4 sm:pl-5 pr-12 sm:pr-14 rounded-full focus-visible:ring-1 focus-visible:ring-blue-500/50 shadow-inner text-[14px] sm:text-[15px] placeholder:text-zinc-500"
          />
          <Button 
            type="submit" 
            disabled={!inputText.trim()} 
            className="absolute right-1 sm:right-1.5 top-1 bottom-1 sm:top-1.5 sm:bottom-1.5 h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-50 disabled:hover:bg-blue-600 flex items-center justify-center p-0 shadow-md"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5 ml-1" />
          </Button>
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
