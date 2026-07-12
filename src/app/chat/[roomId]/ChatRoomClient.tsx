'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { pusherClient } from '@/lib/pusher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Copy, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedName = localStorage.getItem('chat_username');
    if (!storedName) {
      router.push('/');
    } else {
      setUsername(storedName);
    }
  }, [router]);

  useEffect(() => {
    // Subscribe to pusher
    const channelName = `room-${roomId}`;
    const channel = pusherClient.subscribe(channelName);

    channel.bind('incoming-message', (newMessage: Message) => {
      setMessages((prev) => {
        // Prevent duplicates
        if (prev.find(m => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
    });

    return () => {
      pusherClient.unsubscribe(channelName);
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
    setInputText(''); // optimistic clear

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: currentText,
          roomId,
          sender: username
        }),
      });
    } catch (err) {
      console.error('Failed to send:', err);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Посилання скопійовано!');
  };

  if (!username) return null; // Wait for username load

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 max-w-3xl mx-auto border-x border-zinc-800">
      <header className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </Button>
          <div>
            <h1 className="font-bold text-lg leading-tight">Кімната: {roomId}</h1>
            <p className="text-xs text-zinc-400">Ви увійшли як <span className="font-semibold text-blue-400">{username}</span></p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={copyLink} className="border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700">
          <Copy className="w-4 h-4 mr-2" />
          Поділитися
        </Button>
      </header>

      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col gap-4 pb-4">
          {messages.length === 0 && (
            <p className="text-center text-zinc-500 mt-10">Немає повідомлень. Почніть спілкування першим!</p>
          )}
          
          {messages.map((msg) => {
            const isMe = msg.sender === username;
            return (
              <div key={msg.id} className={`flex flex-col max-w-[75%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                <span className="text-[11px] text-zinc-500 mb-1 ml-1">{msg.sender}</span>
                <div className={`px-4 py-2 rounded-2xl ${isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'}`}>
                  <p className="text-sm">{msg.text}</p>
                </div>
                <span className="text-[10px] text-zinc-600 mt-1 ml-1">
                  {format(new Date(msg.timestamp), 'HH:mm')}
                </span>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <footer className="p-4 bg-zinc-900 border-t border-zinc-800">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Напишіть повідомлення..."
            className="flex-1 bg-zinc-800 border-zinc-700 focus-visible:ring-blue-600"
          />
          <Button type="submit" disabled={!inputText.trim()} className="bg-blue-600 hover:bg-blue-700 px-4">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </footer>
    </div>
  );
}
