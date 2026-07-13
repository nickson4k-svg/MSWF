'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, MessageSquare } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const savedName = localStorage.getItem('chat_username');
    if (savedName) setUsername(savedName);
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !roomId.trim()) return;
    
    localStorage.setItem('chat_username', username.trim());
    router.push(`/chat/${roomId.trim()}`);
  };

  const handleCreateNew = () => {
    if (!username.trim()) {
      alert('Будь ласка, введіть своє ім\'я спочатку!');
      return;
    }
    const newRoomId = Math.random().toString(36).substring(2, 9);
    localStorage.setItem('chat_username', username.trim());
    router.push(`/chat/${newRoomId}`);
  };

  if (!isMounted) return null;

  return (
    <main className="min-h-[100dvh] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Premium Background Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-md bg-zinc-900/50 backdrop-blur-xl border-zinc-800/50 shadow-2xl animate-slide-up">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg transform transition hover:scale-105">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
              Nexus Chat
            </CardTitle>
            <CardDescription className="text-zinc-400 text-base">
              Миттєве спілкування у секретних кімнатах
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 ml-1">Твоє ім'я</label>
              <Input 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Як до тебе звертатися?"
                className="bg-zinc-950/50 border-zinc-800 text-zinc-100 h-12 px-4 rounded-xl focus-visible:ring-blue-500/50 focus-visible:border-blue-500 transition-all placeholder:text-zinc-600"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 ml-1">ID Кімнати</label>
              <Input 
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Встав код кімнати"
                className="bg-zinc-950/50 border-zinc-800 text-zinc-100 h-12 px-4 rounded-xl focus-visible:ring-blue-500/50 focus-visible:border-blue-500 transition-all placeholder:text-zinc-600"
              />
            </div>

            <div className="pt-2">
              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl font-medium shadow-lg shadow-blue-900/20 transition-all hover:shadow-blue-900/40" 
                disabled={!roomId.trim() || !username.trim()}
              >
                Приєднатися до кімнати
              </Button>
            </div>
            
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase font-semibold">
                <span className="bg-zinc-900/80 px-3 text-zinc-500 rounded-full">або</span>
              </div>
            </div>

            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCreateNew}
              className="w-full h-12 border-zinc-700 bg-zinc-800/30 hover:bg-zinc-800 hover:text-white text-zinc-300 rounded-xl font-medium transition-all group"
            >
              <Sparkles className="w-4 h-4 mr-2 text-purple-400 group-hover:animate-pulse" />
              Створити нову кімнату
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
