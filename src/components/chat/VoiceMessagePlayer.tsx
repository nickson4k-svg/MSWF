'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, Mic } from 'lucide-react';

interface VoiceMessagePlayerProps {
  src: string;
  isMe: boolean;
  theme?: string;
}

export function VoiceMessagePlayer({ src, isMe }: VoiceMessagePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);

  // Generate a realistic static waveform shape based on string hash
  const waveformBars = useMemo(() => {
    const bars: number[] = [];
    let hash = 0;
    for (let i = 0; i < src.length; i++) {
      hash = (hash << 5) - hash + src.charCodeAt(i);
      hash |= 0;
    }
    const seed = Math.abs(hash) || 12345;
    for (let i = 0; i < 28; i++) {
      const val = Math.abs(Math.sin((seed + i * 17) * 0.4) * 0.75) + 0.25;
      bars.push(Math.round(val * 100));
    }
    return bars;
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  }, [isPlaying]);

  const cycleSpeed = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    const rates = [1, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audio) audio.playbackRate = nextRate;
  }, [playbackRate]);

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentBarIndex = duration > 0 ? Math.floor((currentTime / duration) * waveformBars.length) : 0;

  return (
    <div className="flex items-center gap-3 py-1 px-1 min-w-[210px] sm:min-w-[240px] select-none">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`relative w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 transform active:scale-95 shadow-md ${
          isMe
            ? 'bg-white text-blue-600 hover:bg-blue-50 shadow-white/10'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:brightness-110 shadow-blue-500/20'
        }`}
        title={isPlaying ? 'Пауза' : 'Відтворити'}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 fill-current" />
        ) : (
          <Play className="w-5 h-5 fill-current ml-0.5" />
        )}
      </button>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center space-y-1.5 min-w-0">
        {/* Waveform Bars */}
        <div 
          className="flex items-center gap-[2.5px] h-6 cursor-pointer group py-1"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const ratio = Math.max(0, Math.min(1, clickX / rect.width));
            if (audioRef.current && duration) {
              const seekTime = ratio * duration;
              audioRef.current.currentTime = seekTime;
              setCurrentTime(seekTime);
            }
          }}
        >
          {waveformBars.map((height, i) => {
            const isPassed = i <= currentBarIndex;
            return (
              <div
                key={i}
                className={`w-[3px] rounded-full transition-all duration-150 ${
                  isPassed
                    ? isMe
                      ? 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.6)]'
                      : 'bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.6)]'
                    : isMe
                      ? 'bg-white/35 hover:bg-white/60'
                      : 'bg-zinc-700 hover:bg-zinc-500'
                }`}
                style={{
                  height: `${Math.max(20, height)}%`,
                  animationDelay: isPlaying ? `${i * 35}ms` : '0ms',
                }}
              />
            );
          })}
        </div>

        {/* Footer info: time & speed */}
        <div className="flex items-center justify-between text-[11px] font-medium leading-none opacity-90">
          <div className="flex items-center gap-1.5">
            <Mic className={`w-3 h-3 ${isMe ? 'text-white/80' : 'text-blue-400'}`} />
            <span className={isMe ? 'text-white/90' : 'text-zinc-300'}>
              {isPlaying ? formatTime(currentTime) : (duration ? formatTime(duration) : 'Голосове')}
            </span>
          </div>

          <button
            type="button"
            onClick={cycleSpeed}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
              playbackRate > 1
                ? isMe
                  ? 'bg-white text-blue-600 font-extrabold'
                  : 'bg-blue-500 text-white font-extrabold'
                : isMe
                  ? 'bg-white/20 text-white hover:bg-white/30'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Швидкість відтворення"
          >
            {playbackRate}x
          </button>
        </div>
      </div>
    </div>
  );
}
