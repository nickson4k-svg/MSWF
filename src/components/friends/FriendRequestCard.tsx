'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FriendProfile } from '@/lib/friends';
import { Button } from '@/components/ui/button';
import { Check, X, ArrowLeft } from 'lucide-react';
import Pusher from 'pusher-js';

export function FriendRequestCard({ profile, type, onAction }: { profile: FriendProfile, type: 'incoming' | 'outgoing', onAction: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: 'accept' | 'reject') => {
    setLoading(true);
    try {
      await fetch(`/api/friends/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUsername: profile.username })
      });
      onAction();
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
      <div className="flex items-center gap-3">
        <img src={profile.avatar} alt={profile.displayName} className="w-12 h-12 rounded-full bg-zinc-800" />
        <div>
          <p className="text-zinc-100 font-medium">{profile.displayName}</p>
          <p className="text-zinc-500 text-sm">@{profile.username}</p>
        </div>
      </div>
      {type === 'incoming' ? (
        <div className="flex gap-2">
          <Button size="icon" variant="outline" disabled={loading} onClick={() => handleAction('reject')} className="border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-400">
            <X className="w-4 h-4" />
          </Button>
          <Button size="icon" disabled={loading} onClick={() => handleAction('accept')} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Check className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <span className="text-zinc-500 text-sm">Очікує підтвердження...</span>
      )}
    </div>
  );
}
