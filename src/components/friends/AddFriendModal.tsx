'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus, Search, Check, X } from 'lucide-react';
import { FriendProfile } from '@/lib/friends';

export function AddFriendModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<Record<string, boolean>>({});

  const search = async () => {
    if (query.length < 2) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/friends/search?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = async (username: string) => {
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUsername: username })
      });
      if (res.ok) {
        setSent(prev => ({ ...prev, [username]: true }));
      } else {
        alert(await res.text());
      }
    } catch (e) {
      alert('Помилка');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-slide-up relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-white mb-4">Додати друга</h2>
        
        <div className="flex gap-2 mb-6">
          <Input 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="Введіть логін або ім'я..."
            className="bg-zinc-950/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-500"
          />
          <Button onClick={search} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Search className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
          {results.length === 0 && !loading && query.length >= 2 && (
             <p className="text-zinc-500 text-center text-sm">Нічого не знайдено</p>
          )}
          {results.map(user => (
            <div key={user.username} className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/30 border border-zinc-800/50">
              <div className="flex items-center gap-3">
                <img src={user.avatar} alt={user.displayName} className="w-10 h-10 rounded-xl bg-zinc-800" />
                <div>
                  <p className="text-white font-medium text-sm">{user.displayName}</p>
                  <p className="text-zinc-500 text-xs">@{user.username}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                disabled={sent[user.username]}
                onClick={() => sendRequest(user.username)}
                className={sent[user.username] ? 'text-emerald-500' : 'text-blue-500 hover:text-blue-400 hover:bg-blue-500/10'}
              >
                {sent[user.username] ? <Check className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
