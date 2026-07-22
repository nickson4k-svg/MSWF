'use client';

import { useEffect, useRef, useState } from 'react';
import { MonitorUp, Mic, MicOff } from 'lucide-react';

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
}

function ParticipantCard({
  username,
  stream,
  isVideoActive,
  isMuted,
  isLocal = false,
  isBgBlurred = false,
  customAvatar,
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

  // Audio track playback for remote participant to enable WebRTC audio decoding & speaker output
  useEffect(() => {
    if (!isLocal && audioRef.current && stream) {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioRef.current.srcObject = stream;
        audioRef.current.play().catch(e => console.warn('Remote audio play error:', e));
      }
    }
  }, [isLocal, stream]);

  return (
    <div className={`relative aspect-square w-full max-w-[260px] sm:max-w-[320px] bg-zinc-900/90 border rounded-3xl flex flex-col items-center justify-center p-4 sm:p-6 shadow-2xl transition-all duration-300 ${
      isSpeaking
        ? 'border-emerald-500/80 shadow-[0_0_35px_rgba(16,185,129,0.4)]'
        : 'border-zinc-800/80 hover:border-zinc-700/80'
    }`}>
      {/* Hidden audio element for remote stream to ensure browser plays & decodes remote audio */}
      {!isLocal && <audio ref={audioRef} autoPlay playsInline className="hidden" />}

      {/* Square Avatar Container with Discord Green Glow */}
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

      {/* Mic Status Icon Badge */}
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

      {/* Username Label Badge */}
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
  isVideoOff: boolean;
  isBgBlurred?: boolean;
  targetUsername?: string;
  currentUser?: string;
  currentUserAvatar?: string;
  isMuted: boolean;
}) => {
  const localScreenVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

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

  // 1. Stage mode: Screen share active
  if (isScreenSharing && screenStream) {
    return (
      <div className="relative w-full h-full bg-zinc-950 overflow-hidden flex flex-col items-center justify-center">
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-black">
          <video
            ref={localScreenVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-emerald-600/90 text-white px-4 py-1.5 rounded-full text-xs font-semibold shadow-xl backdrop-blur flex items-center gap-2 z-20">
            <MonitorUp className="w-4 h-4 animate-pulse" />
            Ваша демонстрація екрану (Прев&apos;ю)
          </div>
        </div>

        {/* Floating Discord Avatar Cards for participants */}
        <div className="absolute bottom-28 right-6 z-30 flex items-center gap-3">
          <ParticipantCard
            username={currentUser}
            stream={localStream}
            isVideoActive={localHasVideo}
            isMuted={isMuted}
            isLocal
            isBgBlurred={isBgBlurred}
            customAvatar={currentUserAvatar}
          />
          {targetUsername && (
            <ParticipantCard
              username={targetUsername}
              stream={remoteStream}
              isVideoActive={remoteHasVideo}
              isMuted={remoteIsMuted}
            />
          )}
        </div>
      </div>
    );
  }

  // 2. Stage mode: Remote screen share active
  if (remoteHasVideo && remoteStream?.getVideoTracks()[0]?.label.includes('screen')) {
    return (
      <div className="relative w-full h-full bg-zinc-950 overflow-hidden flex flex-col items-center justify-center">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain"
        />

        <div className="absolute bottom-28 right-6 z-30 flex items-center gap-3">
          <ParticipantCard
            username={currentUser}
            stream={localStream}
            isVideoActive={localHasVideo}
            isMuted={isMuted}
            isLocal
            isBgBlurred={isBgBlurred}
            customAvatar={currentUserAvatar}
          />
          <ParticipantCard
            username={targetUsername}
            stream={remoteStream}
            isVideoActive={remoteHasVideo}
            isMuted={remoteIsMuted}
          />
        </div>
      </div>
    );
  }

  // 3. Discord Voice Call / Video Grid Mode (Square avatars with reactive green voice glow & mic status badge)
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
