'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, LogOut, LogIn, UserPlus, Camera, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { FriendList } from '@/components/friends/FriendList';
import { InstallAppButton } from '@/components/InstallAppButton';

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [roomId, setRoomId] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;
    setIsMounted(true);
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!mounted) return;
        if (data.username) {
          setUsername(data.username);
          if (data.avatar) setAvatar(data.avatar);
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUsername(null);
    router.refresh();
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim()) return;
    router.push(`/chat/${roomId.trim()}`);
  };

  const handleCreateNew = () => {
    const newRoomId = Math.random().toString(36).substring(2, 9);
    router.push(`/chat/${newRoomId}`);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 128;
      let width = bitmap.width;
      let height = bitmap.height;

      // Make it a square by cropping the center
      const size = Math.min(width, height);
      const startX = (width - size) / 2;
      const startY = (height - size) / 2;

      canvas.width = MAX_SIZE;
      canvas.height = MAX_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No canvas context');

      ctx.drawImage(bitmap, startX, startY, size, size, 0, 0, MAX_SIZE, MAX_SIZE);
      const base64Avatar = canvas.toDataURL('image/webp', 0.8);

      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: base64Avatar })
      });

      if (res.ok) {
        setAvatar(base64Avatar);
      }
    } catch (err) {
      console.error('Failed to change avatar', err);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isMounted) return null;

  return (
    <main className="min-h-[100dvh] flex flex-col md:flex-row items-center justify-center p-4 sm:p-6 gap-6 relative overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Premium Background Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-md bg-zinc-900/50 backdrop-blur-xl border-zinc-800/50 shadow-2xl animate-slide-up relative z-10 self-center">
        <CardHeader className="text-center space-y-4 pb-8 relative">
          <InstallAppButton />
          {username && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Вийти
            </Button>
          )}

          <div 
            onClick={() => username && fileInputRef.current?.click()}
            className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transform transition mt-4 relative group ${username ? 'cursor-pointer hover:scale-105' : 'bg-gradient-to-tr from-blue-600 to-purple-600'}`}
          >
            {avatar ? (
              <img src={avatar} alt="Avatar" className="w-full h-full object-cover rounded-2xl" />
            ) : username ? (
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`} alt="Avatar" className="w-full h-full object-cover rounded-2xl bg-zinc-800" />
            ) : (
              <MessageSquare className="w-8 h-8 text-white" />
            )}
            
            {username && (
              <>
                <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {isUploading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleAvatarChange} 
                />
              </>
            )}
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
              Nexus Chat
            </CardTitle>
            <CardDescription className="text-zinc-400 text-base">
              {username ? `Вітаємо, ${username}!` : 'Миттєве спілкування у секретних кімнатах'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {username ? (
            <form onSubmit={handleJoin} className="space-y-5">
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
                  disabled={!roomId.trim()}
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
                Створити нову кімнату
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <Button onClick={() => router.push('/login')} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-600/20">
                <LogIn className="w-4 h-4 mr-2" />
                Увійти
              </Button>
              <Button onClick={() => router.push('/register')} variant="outline" className="w-full h-12 border-zinc-700 bg-zinc-800/30 hover:bg-zinc-800 hover:text-white text-zinc-300 rounded-xl font-medium transition-all">
                <UserPlus className="w-4 h-4 mr-2" />
                Зареєструватися
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {username && (
        <div className="w-full md:w-80 lg:w-96 h-[400px] sm:h-[500px] md:h-[600px] relative z-10 flex-shrink-0 flex flex-col gap-4 animate-slide-up">
           <FriendList currentUser={username} />
           <Button variant="outline" onClick={() => router.push('/friends')} className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800">
             Керування друзями та запитами
           </Button>
        </div>
      )}
    </main>
  );
}
