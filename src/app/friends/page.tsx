'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FriendProfile } from '@/lib/friends';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users } from 'lucide-react';
import { FriendRequestCard } from '@/components/friends/FriendRequestCard';
import { AddFriendModal } from '@/components/friends/AddFriendModal';

export default function FriendsPage() {
  const router = useRouter();
  const [incoming, setIncoming] = useState<FriendProfile[]>([]);
  const [outgoing, setOutgoing] = useState<FriendProfile[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/friends/requests');
      const data = await res.json();
      setIncoming(data.incoming || []);
      setOutgoing(data.outgoing || []);
    } catch (e) {}
  };

  useEffect(() => {
    setTimeout(() => fetchRequests(), 0);
  }, []);

  return (
    <main className="min-h-[100dvh] p-4 sm:p-6 bg-zinc-950 text-zinc-100 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-6 animate-slide-up">
        
        {/* Header */}
        <header className="flex items-center justify-between pb-6 border-b border-zinc-800">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-500" />
              Друзі
            </h1>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
            Знайти друга
          </Button>
        </header>

        {/* Incoming Requests */}
        <section>
          <h2 className="text-lg font-medium text-zinc-300 mb-4">Вхідні запити ({incoming.length})</h2>
          {incoming.length === 0 ? (
            <p className="text-zinc-500 text-sm">Немає нових запитів</p>
          ) : (
            <div className="space-y-3">
              {incoming.map(req => (
                <FriendRequestCard key={req.username} profile={req} type="incoming" onAction={fetchRequests} />
              ))}
            </div>
          )}
        </section>

        {/* Outgoing Requests */}
        {outgoing.length > 0 && (
          <section className="pt-6">
            <h2 className="text-lg font-medium text-zinc-300 mb-4">Надіслані запити ({outgoing.length})</h2>
            <div className="space-y-3">
              {outgoing.map(req => (
                <FriendRequestCard key={req.username} profile={req} type="outgoing" onAction={fetchRequests} />
              ))}
            </div>
          </section>
        )}

      </div>

      {showAddModal && <AddFriendModal onClose={() => { setShowAddModal(false); fetchRequests(); }} />}
    </main>
  );
}
