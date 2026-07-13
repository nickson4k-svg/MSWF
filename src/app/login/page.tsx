"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import Link from 'next/link';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      
      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        setError(data.error || 'Помилка входу');
      }
    } catch (err) {
      setError('Мережева помилка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[100dvh] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
      <div className="absolute -top-48 -left-48 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-48 -right-48 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md bg-zinc-950/80 backdrop-blur-xl border-zinc-800/60 shadow-2xl z-10">
        <CardHeader className="space-y-2 pb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">Вхід до системи</CardTitle>
          <CardDescription className="text-zinc-400 text-base">
            Введіть логін та пароль для доступу
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Логін</label>
              <Input 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Введіть ваш логін"
                className="bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-blue-500/50 h-12"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Пароль</label>
              <Input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-blue-500/50 h-12"
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pt-4">
            <Button 
              type="submit" 
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all shadow-[0_0_20px_-5px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_-5px_rgba(37,99,235,0.5)]"
              disabled={loading}
            >
              {loading ? 'Вхід...' : 'Увійти'}
            </Button>
            <p className="text-sm text-zinc-400 text-center">
              Ще не маєш акаунту?{' '}
              <Link href="/register" className="text-blue-400 hover:text-blue-300 hover:underline transition-colors">
                Зареєструватися
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
