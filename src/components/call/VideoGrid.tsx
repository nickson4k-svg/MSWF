'use client';

import { useEffect, useRef } from 'react';
import { MonitorUp, User } from 'lucide-react';

export const VideoGrid = ({
  localStream,
  screenStream,
  remoteStream,
  isScreenSharing,
  isVideoOff,
  isBgBlurred,
  targetUsername
}: {
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isScreenSharing: boolean;
  isVideoOff: boolean;
  isBgBlurred?: boolean;
  targetUsername?: string;
}) => {
  const localCameraVideoRef = useRef<HTMLVideoElement>(null);
  const localScreenVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const secondaryRemoteVideoRef = useRef<HTMLVideoElement>(null);

  // Attach webcam stream
  useEffect(() => {
    if (localCameraVideoRef.current && localStream) {
      localCameraVideoRef.current.srcObject = localStream;
      localCameraVideoRef.current.play().catch(e => console.warn('Local camera play failed', e));
    }
  }, [localStream]);

  // Attach screen share stream
  useEffect(() => {
    if (localScreenVideoRef.current && screenStream) {
      localScreenVideoRef.current.srcObject = screenStream;
      localScreenVideoRef.current.play().catch(e => console.warn('Local screen play failed', e));
    }
  }, [screenStream]);

  // Attach remote stream to main & secondary
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(e => console.warn('Remote play failed', e));
    }
    if (secondaryRemoteVideoRef.current && remoteStream) {
      secondaryRemoteVideoRef.current.srcObject = remoteStream;
      secondaryRemoteVideoRef.current.play().catch(e => console.warn('Secondary remote play failed', e));
    }
  }, [remoteStream]);

  return (
    <div className="relative w-full h-full bg-zinc-950 overflow-hidden flex items-center justify-center">
      {/* 1. Main Stage View */}
      {isScreenSharing && screenStream ? (
        // I am screen sharing -> Show my screen share stream preview in main area
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
      ) : remoteStream ? (
        // Remote participant has video/screen stream -> Show in main area
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain"
        />
      ) : (
        // No main video active -> Clean waiting placeholder
        <div className="flex flex-col items-center justify-center text-zinc-400 space-y-4">
          <div className="w-24 h-24 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
            {targetUsername ? (
              <span className="text-4xl font-bold text-blue-400">{targetUsername[0]?.toUpperCase()}</span>
            ) : (
              <User className="w-10 h-10 text-zinc-600" />
            )}
          </div>
          <p className="text-sm font-medium text-zinc-400">
            {targetUsername ? `Розмова з ${targetUsername}` : 'Дзвінок активний'}
          </p>
        </div>
      )}

      {/* 2. Floating Secondary Window (Remote participant thumbnail if I am screen sharing) */}
      {isScreenSharing && remoteStream && (
        <div className="absolute top-20 right-6 w-44 sm:w-56 aspect-video bg-zinc-900 rounded-xl overflow-hidden shadow-2xl border border-zinc-800 z-20">
          <video
            ref={secondaryRemoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-1 left-2 text-[10px] text-zinc-300 font-semibold bg-black/60 px-1.5 py-0.5 rounded">
            {targetUsername || 'Співрозмовник'}
          </div>
        </div>
      )}

      {/* 3. Floating Picture-in-Picture for My Local Webcam Preview */}
      <div className={`absolute bottom-24 right-6 w-36 sm:w-52 aspect-video bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border-2 border-zinc-700/80 z-30 transition-all duration-300 ${
        isVideoOff ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}>
        <video
          ref={localCameraVideoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover scale-x-[-1] transition-all duration-300 ${
            isBgBlurred ? 'blur-sm contrast-125 saturate-150' : ''
          }`}
        />
        <div className="absolute bottom-1.5 left-2 text-[10px] text-white font-medium bg-black/60 backdrop-blur px-2 py-0.5 rounded-full flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Ви (Вебкамера)
        </div>
      </div>
    </div>
  );
};
