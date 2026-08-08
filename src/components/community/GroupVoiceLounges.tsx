'use client';

import { useState } from 'react';
import { Volume2, Mic, MicOff, Radio, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceLounge {
  id: string;
  name: string;
  users: { id: string; name: string; avatar: string; isSpeaking?: boolean }[];
  isLive?: boolean;
}

const INITIAL_LOUNGES: VoiceLounge[] = [
  {
    id: 'lounge-1',
    name: 'Бабелан',
    isLive: true,
    users: [
      { id: 'u4', name: 'Слот СІТІ', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SlotCity', isSpeaking: true },
      { id: 'u5', name: 'ХохлоПоляк', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HohloPolyak', isSpeaking: false }
    ]
  },
  {
    id: 'lounge-2',
    name: 'Слот СІТІ Lounge',
    users: []
  },
  {
    id: 'lounge-3',
    name: 'пабг-дрочерс',
    users: []
  }
];

export function GroupVoiceLounges() {
  const [lounges, setLounges] = useState<VoiceLounge[]>(INITIAL_LOUNGES);
  const [activeLoungeId, setActiveLoungeId] = useState<string | null>('lounge-1');
  const [isMuted, setIsMuted] = useState(false);

  const handleToggleJoin = (loungeId: string) => {
    if (activeLoungeId === loungeId) {
      setActiveLoungeId(null);
    } else {
      setActiveLoungeId(loungeId);
    }
  };

  return (
    <div className="flex-1 bg-zinc-950/60 backdrop-blur-xl p-6 overflow-y-auto no-scrollbar space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-800/80 pb-4">
        <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-emerald-400" />
          Голосові кімнати спільноти
        </h3>
        <p className="text-xs text-zinc-400 mt-0.5">
          Приєднуйтеся до голосового спілкування в реальному часі без необхідності здійснювати дзвінок.
        </p>
      </div>

      {/* Lounges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {lounges.map((lounge) => {
          const isConnected = activeLoungeId === lounge.id;

          return (
            <div 
              key={lounge.id} 
              className={`bg-zinc-900/80 p-5 rounded-2xl border transition-all shadow-xl space-y-4 ${
                isConnected 
                  ? 'border-emerald-500/50 bg-emerald-950/10' 
                  : 'border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              {/* Room Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      {lounge.name}
                      {lounge.isLive && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-md flex items-center gap-1 font-mono">
                          <Radio className="w-3 h-3 animate-pulse" /> LIVE
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                      <Users className="w-3.5 h-3.5" />
                      {lounge.users.length} учасників
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => handleToggleJoin(lounge.id)}
                  className={`rounded-xl text-xs font-semibold px-4 h-9 shadow-md transition-all ${
                    isConnected 
                      ? 'bg-red-600 hover:bg-red-500 text-white' 
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {isConnected ? 'Залишити' : 'Приєднатися'}
                </Button>
              </div>

              {/* Connected Users list in this room */}
              {lounge.users.length > 0 ? (
                <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800/80 space-y-2">
                  {lounge.users.map((usr) => (
                    <div key={usr.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={usr.avatar} 
                          alt={usr.name} 
                          className={`w-7 h-7 rounded-full object-cover border ${usr.isSpeaking ? 'border-emerald-400 ring-2 ring-emerald-400/30' : 'border-zinc-700'}`} 
                        />
                        <span className="text-xs font-medium text-zinc-200">{usr.name}</span>
                      </div>

                      {usr.isSpeaking ? (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          Говорить...
                        </span>
                      ) : (
                        <Mic className="w-3.5 h-3.5 text-zinc-500" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-800/50 text-center text-xs text-zinc-500">
                  Кімната порожня. Будьте першим, хто увійшов!
                </div>
              )}

              {/* Active controls if connected to this room */}
              {isConnected && (
                <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsMuted(!isMuted)}
                      className={`rounded-xl text-xs h-8 border-zinc-800 ${isMuted ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-zinc-900 text-zinc-300'}`}
                    >
                      {isMuted ? <MicOff className="w-3.5 h-3.5 mr-1.5" /> : <Mic className="w-3.5 h-3.5 mr-1.5" />}
                      {isMuted ? 'Заглушено' : 'Мікрофон вмик'}
                    </Button>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400">Якість: 48kHz HD</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
