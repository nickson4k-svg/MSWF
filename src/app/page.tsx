'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');

  useEffect(() => {
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
      alert('Будь ласка, введіть ім\'я спочатку!');
      return;
    }
    const newRoomId = Math.random().toString(36).substring(2, 9);
    localStorage.setItem('chat_username', username.trim());
    router.push(`/chat/${newRoomId}`);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 text-zinc-100">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Real-time Messenger</CardTitle>
          <CardDescription className="text-zinc-400">
            Введіть своє ім'я та приєднайтеся до кімнати
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Твоє ім'я</label>
              <Input 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Наприклад: Микола"
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">ID Кімнати</label>
              <Input 
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Наприклад: my-secret-room"
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={!roomId.trim() || !username.trim()}>
              Приєднатися до існуючої
            </Button>
            
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-zinc-900 px-2 text-zinc-500">або</span>
              </div>
            </div>

            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCreateNew}
              className="w-full border-zinc-700 hover:bg-zinc-800 text-zinc-300"
            >
              Створити нову кімнату
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
