import { Mic, MicOff, Video, VideoOff, MonitorUp, MonitorX, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoGrid } from './VideoGrid';

export const CallScreen = ({
  callState,
  incomingCall,
  localStream,
  remoteStream,
  isMuted,
  isVideoOff,
  isScreenSharing,
  targetUsername,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare
}: {
  callState: string;
  incomingCall: { sender: string } | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  targetUsername?: string;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
}) => {
  if (callState === 'idle' && !incomingCall) return null;

  if (callState === 'ringing' && incomingCall) {
    return (
      <div className="absolute inset-0 z-50 bg-zinc-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-4">
        <div className="w-32 h-32 bg-blue-600/20 rounded-full animate-pulse flex items-center justify-center mb-8">
          <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.5)]">
            <span className="text-4xl text-white font-bold">{incomingCall.sender[0]?.toUpperCase()}</span>
          </div>
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">{incomingCall.sender}</h2>
        <p className="text-zinc-400 mb-12 animate-pulse">Вхідний відеодзвінок...</p>
        
        <div className="flex gap-8">
          <Button 
            onClick={onReject}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-transform hover:scale-110"
          >
            <PhoneOff className="w-8 h-8 text-white" />
          </Button>
          <Button 
            onClick={onAccept}
            className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center shadow-lg transition-transform hover:scale-110 animate-bounce"
          >
            <Video className="w-8 h-8 text-white" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      {/* Header */}
      <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-zinc-950/90 to-transparent z-10 flex items-center justify-center pointer-events-none">
        <div className="flex items-center gap-2 text-zinc-200">
          <span className="w-2.5 h-2.5 bg-emerald-500 animate-pixel-flame"></span>
          Дзвінок з {targetUsername || incomingCall?.sender}
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 relative">
        <VideoGrid 
          localStream={localStream}
          remoteStream={remoteStream}
          isScreenSharing={isScreenSharing}
          isVideoOff={isVideoOff}
        />
        
        {/* Screen Share Indicator */}
        {remoteStream && remoteStream.getVideoTracks()[0]?.label.includes('screen') && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-blue-600/90 text-white px-4 py-1.5 rounded-full text-sm font-medium shadow-lg backdrop-blur flex items-center gap-2 animate-in slide-in-from-top-4">
            <MonitorUp className="w-4 h-4" />
            Співрозмовник демонструє екран
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-zinc-950 to-transparent z-10 flex items-end justify-center pb-6 gap-4">
        <Button 
          variant="outline"
          onClick={onToggleMute}
          className={`w-14 h-14 rounded-full border-zinc-800 flex items-center justify-center transition-all ${isMuted ? 'bg-zinc-800 text-red-400' : 'bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-white'}`}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </Button>
        
        <Button 
          variant="outline"
          onClick={onToggleVideo}
          className={`w-14 h-14 rounded-full border-zinc-800 flex items-center justify-center transition-all ${isVideoOff ? 'bg-zinc-800 text-red-400' : 'bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-white'}`}
        >
          {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
        </Button>

        <Button 
          variant="outline"
          onClick={onToggleScreenShare}
          className={`w-14 h-14 rounded-full border-zinc-800 flex items-center justify-center transition-all ${isScreenSharing ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-white'}`}
          title={isScreenSharing ? "Зупинити демку" : "Демка"}
        >
          {isScreenSharing ? <MonitorX className="w-6 h-6" /> : <MonitorUp className="w-6 h-6" />}
        </Button>

        <Button 
          onClick={onEnd}
          className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-transform hover:scale-105 ml-4"
        >
          <PhoneOff className="w-6 h-6 text-white" />
        </Button>
      </div>
    </div>
  );
};
