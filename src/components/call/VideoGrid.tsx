import { useEffect, useRef } from 'react';

export const VideoGrid = ({
  localStream,
  remoteStream,
  isScreenSharing,
  isVideoOff
}: {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isScreenSharing: boolean;
  isVideoOff: boolean;
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(e => console.warn('Local play failed', e));
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(e => console.warn('Remote play failed', e));
    }
  }, [remoteStream]);

  return (
    <div className="relative w-full h-full bg-zinc-950 overflow-hidden flex items-center justify-center">
      {/* Remote Video (Main) */}
      {remoteStream ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain"
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-zinc-500 animate-pulse">
          <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
            <span className="text-zinc-700 text-3xl">...</span>
          </div>
          Очікування з'єднання...
        </div>
      )}

      {/* Local Video (PiP) */}
      <div className={`absolute bottom-24 right-6 w-32 sm:w-48 aspect-video bg-zinc-900 rounded-xl overflow-hidden shadow-2xl border-2 border-zinc-800 transition-all duration-300 ${isVideoOff && !isScreenSharing ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${!isScreenSharing ? 'scale-x-[-1]' : ''}`}
        />
        {isVideoOff && isScreenSharing && (
          <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center text-zinc-500 text-xs text-center p-2 backdrop-blur-sm">
            Камера вимкнена
          </div>
        )}
      </div>
    </div>
  );
};
