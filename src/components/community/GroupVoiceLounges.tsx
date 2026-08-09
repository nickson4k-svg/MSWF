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
    name: 'Голосовий Lounge 1',
    isLive: false,
    users: []
  },
  {
    id: 'lounge-2',
    name: 'Голосовий Lounge 2',
    users: []
  },
  {
    id: 'lounge-3',
    name: 'Ігровий Lounge',
    users: []
  }
];

export function GroupVoiceLounges() {
  const [lounges] = useState<VoiceLounge[]>(INITIAL_LOUNGES);
  const [activeLoungeId, setActiveLoungeId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const handleToggleJoin = (loungeId: string) => {
    if (activeLoungeId === loungeId) {
      setActiveLoungeId(null);
    } else {
      setActiveLoungeId(loungeId);
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto no-scrollbar space-y-6">
      {/* Header */}
      <div className="aurora-divider pb-4 border-b-0">
        <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-display">
          <Volume2 className="w-5 h-5 text-cyan-400" />
          Голосові кімнати спільноти
        </h3>
        <p className="text-xs text-white/50 mt-0.5">
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
              className={`glass-panel p-5 rounded-3xl transition-all shadow-xl space-y-4 ${
                isConnected 
                  ? 'glow-cyan bg-white/[0.07]' 
                  : 'hover:bg-white/[0.06]'
              }`}
              style={isConnected ? { border: '1px solid rgba(34,211,238,0.3)' } : {}}
            >
              {/* Room Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-2xl ${isConnected ? 'bg-cyan-400/20 text-cyan-400 voice-pulse' : 'glass-panel text-white/40'}`}>
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                      {lounge.name}
                      {lounge.isLive && (
                        <span className="text-[10px] bg-cyan-400/10 text-cyan-400 border border-cyan-400/30 px-1.5 py-0.5 rounded-md flex items-center gap-1 font-mono">
                          <Radio className="w-3 h-3 animate-pulse" /> LIVE
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-white/40 flex items-center gap-1 mt-0.5">
                      <Users className="w-3.5 h-3.5" />
                      {lounge.users.length} учасників
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => handleToggleJoin(lounge.id)}
                  className={`rounded-xl text-xs font-semibold px-4 h-9 shadow-md transition-all font-display border-0 ${
                    isConnected 
                      ? 'bg-[var(--status-dnd)] hover:bg-[var(--status-dnd)]/80 text-white' 
                      : 'bg-gradient-to-r from-indigo-500 to-cyan-400 hover:from-indigo-400 hover:to-cyan-300 text-white glow-active'
                  }`}
                >
                  {isConnected ? 'Залишити' : 'Приєднатися'}
                </Button>
              </div>

              {/* Connected Users list in this room */}
              {lounge.users.length > 0 ? (
                <div className="glass-panel p-3 rounded-2xl space-y-2">
                  {lounge.users.map((usr) => (
                    <div key={usr.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={usr.avatar} 
                          alt={usr.name} 
                          className={`w-7 h-7 rounded-full object-cover ${usr.isSpeaking ? 'avatar-ring-online' : 'avatar-ring-offline'}`} 
                        />
                        <span className="text-xs font-medium text-white/80 font-display">{usr.name}</span>
                      </div>

                      {usr.isSpeaking ? (
                        <span className="text-[10px] text-cyan-400 flex items-center gap-1 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                          Говорить...
                        </span>
                      ) : (
                        <Mic className="w-3.5 h-3.5 text-white/30" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-panel p-4 rounded-2xl text-center text-xs text-white/30">
                  Кімната порожня. Будьте першим, хто увійшов!
                </div>
              )}

              {/* Active controls if connected to this room */}
              {isConnected && (
                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2 font-display">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsMuted(!isMuted)}
                      className={`rounded-xl text-xs h-8 border-0 ${isMuted ? 'bg-[var(--status-dnd)]/20 text-[var(--status-dnd)]' : 'glass-panel text-white/70'}`}
                      style={isMuted ? { border: '1px solid rgba(251,113,133,0.3)' } : { border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      {isMuted ? <MicOff className="w-3.5 h-3.5 mr-1.5" /> : <Mic className="w-3.5 h-3.5 mr-1.5" />}
                      {isMuted ? 'Заглушено' : 'Мікрофон вмик'}
                    </Button>
                  </div>
                  <span className="text-[11px] font-mono text-cyan-400">Якість: 48kHz HD</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
