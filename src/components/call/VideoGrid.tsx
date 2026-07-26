'use client';

import { useEffect, useRef, useState } from 'react';
import { MonitorUp, Mic, MicOff, Maximize2, Minimize2 } from 'lucide-react';

function useUserProfile(username?: string) {
  const [avatar, setAvatar] = useState<string>('');

  useEffect(() => {
    if (!username) return;
    let mounted = true;

    fetch(`/api/profile?username=${encodeURIComponent(username)}`)
      .then(res => res.json())
      .then(data => {
        if (mounted && data.avatar) {
          setAvatar(data.avatar);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [username]);

  return avatar;
}

function useVoiceActivity(stream: MediaStream | null, isMuted: boolean = false) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (!stream || isMuted) {
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0 || !audioTracks[0].enabled) {
      return;
    }

    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let animFrame: number;

    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return;

      audioCtx = new AudioCtxClass();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;

      source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // Discord VAD threshold
        setIsSpeaking(average > 6);
        animFrame = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.warn('VAD Error:', e);
    }

    return () => {
      setIsSpeaking(false);
      if (animFrame) cancelAnimationFrame(animFrame);
      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => {});
      }
    };
  }, [stream, isMuted]);

  return !stream || isMuted ? false : isSpeaking;
}

interface ParticipantCardProps {
  username: string;
  stream: MediaStream | null;
  isVideoActive: boolean;
  isMuted: boolean;
  isLocal?: boolean;
  isBgBlurred?: boolean;
  customAvatar?: string;
  compact?: boolean;
}

function ParticipantCard({
  username,
  stream,
  isVideoActive,
  isMuted,
  isLocal = false,
  isBgBlurred = false,
  customAvatar,
  compact = false,
}: ParticipantCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fetchedAvatar = useUserProfile(username);
  const isSpeaking = useVoiceActivity(stream, isMuted);

  const displayAvatar = customAvatar || fetchedAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;

  // Video track playback
  useEffect(() => {
    if (videoRef.current && stream && isVideoActive) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.warn('Video play error:', e));
    }
  }, [stream, isVideoActive]);

  // Audio track playback for remote participant
  useEffect(() => {
    if (!isLocal && audioRef.current && stream) {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioRef.current.srcObject = stream;
        audioRef.current.play().catch(e => console.warn('Remote audio play error:', e));
      }
    }
  }, [isLocal, stream]);

  // Compact Picture-in-Picture mode during Screen Sharing / Fullscreen Stage Mode
  if (compact) {
    return (
      <div className={`relative w-32 sm:w-44 h-20 sm:h-28 bg-zinc-950/90 border rounded-2xl flex flex-col items-center justify-center p-2 shadow-2xl backdrop-blur-md transition-all duration-300 ${
        isSpeaking
          ? 'border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
          : 'border-zinc-800/80 hover:border-zinc-700/80'
      }`}>
        {!isLocal && <audio ref={audioRef} autoPlay playsInline className="hidden" />}

        <div className={`relative w-10 h-10 sm:w-14 sm:h-14 rounded-xl overflow-hidden transition-all duration-200 border-2 flex items-center justify-center bg-zinc-950 ${
          isSpeaking ? 'border-emerald-400 scale-105' : isMuted ? 'border-zinc-800 opacity-60' : 'border-transparent opacity-90'
        }`}>
          {isVideoActive && stream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isLocal}
              className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''} ${isBgBlurred ? 'blur-sm' : ''}`}
            />
          ) : (
            <img src={displayAvatar} alt={username} className="w-full h-full object-cover" />
          )}
        </div>

        <div className="mt-1 text-[11px] font-medium text-zinc-300 truncate max-w-full px-1 flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isSpeaking ? 'bg-emerald-400 animate-ping' : isMuted ? 'bg-red-400' : 'bg-zinc-500'}`} />
          <span className="truncate">{username} {isLocal ? '(Ви)' : ''}</span>
        </div>

        <div className="absolute top-1.5 right-1.5">
          {isMuted ? (
            <div className="bg-red-500/90 text-white p-1 rounded-md">
              <MicOff className="w-3 h-3" />
            </div>
          ) : isSpeaking ? (
            <div className="bg-emerald-500/90 text-white p-1 rounded-md animate-pulse">
              <Mic className="w-3 h-3" />
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // Normal Voice Call / Video Grid Square Card
  return (
    <div className={`relative aspect-square w-full max-w-[260px] sm:max-w-[320px] bg-zinc-900/90 border rounded-3xl flex flex-col items-center justify-center p-4 sm:p-6 shadow-2xl transition-all duration-300 ${
      isSpeaking
        ? 'border-emerald-500/80 shadow-[0_0_35px_rgba(16,185,129,0.4)]'
        : 'border-zinc-800/80 hover:border-zinc-700/80'
    }`}>
      {!isLocal && <audio ref={audioRef} autoPlay playsInline className="hidden" />}

      <div className={`relative w-28 h-28 sm:w-40 sm:h-40 rounded-2xl overflow-hidden transition-all duration-200 border-4 flex items-center justify-center bg-zinc-950 ${
        isSpeaking
          ? 'border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.8)] scale-105 ring-4 ring-emerald-500/20'
          : isMuted
          ? 'border-zinc-800/90 opacity-60'
          : 'border-transparent opacity-90'
      }`}>
        {isVideoActive && stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal}
            className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''} ${
              isBgBlurred ? 'blur-sm contrast-125 saturate-150' : ''
            }`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-950">
            <img
              src={displayAvatar}
              alt={username}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
        {isMuted ? (
          <div className="bg-red-500/90 text-white p-2 rounded-xl border border-red-400/50 shadow-lg backdrop-blur flex items-center justify-center animate-in zoom-in-75" title="Мікрофон вимкнено">
            <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        ) : isSpeaking ? (
          <div className="bg-emerald-500/90 text-white p-2 rounded-xl border border-emerald-400/50 shadow-lg backdrop-blur flex items-center justify-center animate-pulse" title="Говорить">
            <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        ) : (
          <div className="bg-zinc-800/80 text-zinc-400 p-2 rounded-xl border border-zinc-700/50 backdrop-blur flex items-center justify-center" title="Мікрофон увімкнено">
            <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        )}
      </div>

      <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-10 bg-zinc-950/80 border border-zinc-800/80 backdrop-blur px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-zinc-200 flex items-center gap-2 shadow-lg max-w-[80%] truncate">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
          isSpeaking ? 'bg-emerald-400 animate-ping' : isMuted ? 'bg-red-400' : 'bg-zinc-500'
        }`} />
        <span className="truncate">{username} {isLocal ? '(Ви)' : ''}</span>
      </div>
    </div>
  );
}

export const VideoGrid = ({
  localStream,
  screenStream,
  remoteStream,
  isScreenSharing,
  isRemoteScreenSharing = false,
  isVideoOff,
  isBgBlurred,
  targetUsername = 'Співрозмовник',
  currentUser = 'Я',
  currentUserAvatar,
  isMuted,
}: {
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isScreenSharing: boolean;
  isRemoteScreenSharing?: boolean;
  isVideoOff: boolean;
  isBgBlurred?: boolean;
  targetUsername?: string;
  currentUser?: string;
  currentUserAvatar?: string;
  isMuted: boolean;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const localScreenVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const localHasVideo = Boolean(localStream && !isVideoOff && localStream.getVideoTracks().length > 0);
  const remoteHasVideo = Boolean(remoteStream && remoteStream.getVideoTracks().length > 0);
  const remoteIsMuted = !remoteStream || remoteStream.getAudioTracks().length === 0 || !remoteStream.getAudioTracks().some(t => t.enabled);

  // Attach local screen share stream
  useEffect(() => {
    if (localScreenVideoRef.current && screenStream) {
      localScreenVideoRef.current.srcObject = screenStream;
      localScreenVideoRef.current.play().catch(e => console.warn('Local screen play failed', e));
    }
  }, [screenStream]);

  // Attach remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(e => console.warn('Remote video play failed', e));
    }
  }, [remoteStream]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else if (document.fullscreenElement) {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Determine Stage Mode (Local or Remote screen share, or active video stream)
  const isLocalScreenActive = Boolean(isScreenSharing && screenStream);
  const isStageMode = isLocalScreenActive || isRemoteScreenSharing || remoteHasVideo;

  // 1. Stage mode: FULL SCREEN DEMO / VIDEO MODE (Fills 100% of container/screen without square borders)
  if (isStageMode) {
    return (
      <div ref={containerRef} className="relative w-full h-full bg-zinc-950 overflow-hidden flex flex-col items-center justify-center group">
        {/* Fullscreen Video Element */}
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-black">
          {isLocalScreenActive ? (
            <video
              ref={localScreenVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full transition-all duration-200 ${
                fitMode === 'contain' ? 'object-contain bg-black' : 'object-cover'
              }`}
            />
          ) : (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full transition-all duration-200 ${
                fitMode === 'contain' ? 'object-contain bg-black' : 'object-cover'
              }`}
            />
          )}

          {/* Top Banner Indicator */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-zinc-900/90 border border-zinc-700/80 text-white px-5 py-2 rounded-full text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2.5 z-20 pointer-events-none">
            <MonitorUp className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>
              {isLocalScreenActive 
                ? 'Ваша демонстрація екрану (Повний екран)' 
                : `Демонстрація екрану від ${targetUsername}`}
            </span>
          </div>

          {/* Controls Overlay on Hover: Fit/Fill mode & Fullscreen */}
          <div className="absolute top-4 right-4 z-30 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={() => setFitMode(fitMode === 'contain' ? 'cover' : 'contain')}
              className="bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 text-xs px-3.5 py-2 rounded-xl shadow-lg backdrop-blur flex items-center gap-1.5 font-medium transition-all"
              title={fitMode === 'contain' ? 'Розтягнути на весь екран' : 'Вписати повністю'}
            >
              {fitMode === 'contain' ? 'Розтягнути' : 'Вписати'}
            </button>

            <button
              onClick={toggleFullscreen}
              className="bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 p-2 rounded-xl shadow-lg backdrop-blur flex items-center justify-center transition-all"
              title={isFullscreen ? "Згорнути" : "На весь екран"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mini Floating PIP Participant Cards in Bottom Right Corner */}
        <div className="absolute bottom-28 right-6 z-30 flex items-center gap-3">
          <ParticipantCard
            username={currentUser}
            stream={localStream}
            isVideoActive={localHasVideo}
            isMuted={isMuted}
            isLocal
            isBgBlurred={isBgBlurred}
            customAvatar={currentUserAvatar}
            compact
          />
          {targetUsername && (
            <ParticipantCard
              username={targetUsername}
              stream={remoteStream}
              isVideoActive={remoteHasVideo}
              isMuted={remoteIsMuted}
              compact
            />
          )}
        </div>
      </div>
    );
  }

  // 2. Normal Voice Call Grid Mode (Centered Square Avatars)
  return (
    <div className="relative w-full h-full bg-zinc-950 overflow-hidden flex items-center justify-center p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 max-w-5xl w-full">
        {/* Local User Card */}
        <ParticipantCard
          username={currentUser}
          stream={localStream}
          isVideoActive={localHasVideo}
          isMuted={isMuted}
          isLocal
          isBgBlurred={isBgBlurred}
          customAvatar={currentUserAvatar}
        />

        {/* Remote User Card */}
        <ParticipantCard
          username={targetUsername}
          stream={remoteStream}
          isVideoActive={remoteHasVideo}
          isMuted={remoteIsMuted}
        />
      </div>
    </div>
  );
};
