'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Video, VideoOff, MonitorUp, MonitorX, PhoneOff, Circle, Square, Sparkles, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoGrid } from './VideoGrid';

// Feature 17: Connection quality indicator
function useConnectionQuality(pc: RTCPeerConnection | null) {
  const [quality, setQuality] = useState(0); // 0-5 bars
  const [stats, setStats] = useState({ rtt: 0, bitrate: 0, packetLoss: 0 });

  useEffect(() => {
    if (!pc) return;
    const interval = setInterval(async () => {
      try {
        const report = await pc.getStats();
        report.forEach((stat: Record<string, unknown> & { type?: string; state?: string; currentRoundTripTime?: number; availableOutgoingBitrate?: number; packetsLost?: number; packetsSent?: number }) => {
          if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
            const rtt = stat.currentRoundTripTime ? stat.currentRoundTripTime * 1000 : 0;
            const bitrate = stat.availableOutgoingBitrate ? Math.round(stat.availableOutgoingBitrate / 1000) : 0;
            const lost = stat.packetsLost || 0;
            const sent = stat.packetsSent || 1;
            const lossRate = (lost / sent) * 100;

            let q = 5;
            if (rtt > 300 || lossRate > 10) q = 1;
            else if (rtt > 200 || lossRate > 5) q = 2;
            else if (rtt > 100 || lossRate > 2) q = 3;
            else if (rtt > 50 || lossRate > 1) q = 4;

            setQuality(q);
            setStats({ rtt: Math.round(rtt), bitrate, packetLoss: Math.round(lossRate * 10) / 10 });
          }
        });
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [pc]);

  return { quality, stats };
}

function SignalBars({ quality }: { quality: number }) {
  return (
    <div className="flex items-end gap-px h-4" title={`Якість: ${quality}/5`}>
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className={`w-1 rounded-sm transition-all ${
            i <= quality
              ? quality >= 4 ? 'bg-emerald-400' : quality >= 2 ? 'bg-yellow-400' : 'bg-red-400'
              : 'bg-zinc-700'
          }`}
          style={{ height: `${4 + i * 2.5}px` }}
        />
      ))}
    </div>
  );
}

export const CallScreen = ({
  callState,
  incomingCall,
  localStream,
  remoteStream,
  screenStream,
  isMuted,
  isVideoOff,
  isScreenSharing,
  targetUsername,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  peerConnection,
  networkQuality,
  callDuration = 0
}: {
  callState: string;
  incomingCall: { sender: string } | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  screenStream: MediaStream | null;
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
  peerConnection: RTCPeerConnection | null;
  networkQuality?: 'Good' | 'Fair' | 'Poor';
  callDuration?: number;
}) => {
  // Feature 17: Connection quality
  const { quality, stats } = useConnectionQuality(peerConnection || null);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Feature 19: Virtual Background (simulated via CSS)
  const [isBgBlurred, setIsBgBlurred] = useState(false);

  // Feature 18: Screen recording
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(() => {
    if (!remoteStream && !localStream) return;
    
    try {
      // Combine remote + local audio into one stream for recording
      const tracks: MediaStreamTrack[] = [];
      if (remoteStream) {
        remoteStream.getTracks().forEach(t => tracks.push(t));
      }
      if (localStream) {
        localStream.getAudioTracks().forEach(t => tracks.push(t));
      }
      
      const combinedStream = new MediaStream(tracks);
      const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp9,opus' });
      
      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `call-recording-${new Date().toISOString().slice(0, 19)}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (e) {
      console.error('Failed to start recording:', e);
    }
  }, [remoteStream, localStream]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

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
      <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-zinc-950/90 to-transparent z-10 flex items-center justify-between px-6 pointer-events-none">
        <div className="flex items-center gap-2 text-zinc-200">
          <span className="w-2.5 h-2.5 bg-emerald-500 animate-pixel-flame"></span>
          Дзвінок з {targetUsername || incomingCall?.sender}
        </div>
        {/* Feature 17: Signal quality + stats */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <SignalBars quality={quality} />
          {stats.rtt > 0 && (
            <span className="text-[10px] text-zinc-500 font-mono">{stats.rtt}ms</span>
          )}
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 relative">
        <VideoGrid 
          localStream={localStream}
          remoteStream={remoteStream}
          isScreenSharing={isScreenSharing}
          isVideoOff={isVideoOff}
          isBgBlurred={isBgBlurred}
        />
        
        {/* Screen Share Indicator */}
        {remoteStream && remoteStream.getVideoTracks()[0]?.label.includes('screen') && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-blue-600/90 text-white px-4 py-1.5 rounded-full text-sm font-medium shadow-lg backdrop-blur flex items-center gap-2 animate-in slide-in-from-top-4">
            <MonitorUp className="w-4 h-4" />
            Співрозмовник демонструє екран
          </div>
        )}

        <div className="absolute top-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <div className="bg-zinc-900/90 text-white px-4 py-1.5 rounded-full text-sm font-medium shadow-lg backdrop-blur flex items-center gap-2 animate-in slide-in-from-top-4">
              <Timer className="w-4 h-4" />
              {formatDuration(callDuration)}
            </div>
            
            {/* Feature 10: Network Quality Indicator */}
            {networkQuality && networkQuality !== 'Good' && (
              <div className="bg-zinc-900/90 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg backdrop-blur flex items-center gap-1.5 animate-in slide-in-from-top-4">
                <span className={`w-2 h-2 rounded-full ${networkQuality === 'Fair' ? 'bg-amber-400' : 'bg-red-500 animate-pulse'}`}></span>
                Зв&apos;язок: {networkQuality === 'Fair' ? 'Поганий' : 'Критичний'}
              </div>
            )}
        </div>

        {/* Feature 18: Recording indicator */}
        {isRecording && (
          <div className="absolute top-16 right-6 bg-red-600/90 text-white px-3 py-1.5 rounded-full text-sm font-medium shadow-lg backdrop-blur flex items-center gap-2 animate-pulse">
            <Circle className="w-3 h-3 fill-white" />
            REC
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-zinc-950 to-transparent z-10 flex items-end justify-center pb-6 gap-3">
        <Button 
          variant="outline"
          onClick={onToggleMute}
          className={`w-14 h-14 rounded-full border-zinc-800 flex items-center justify-center transition-all ${isMuted ? 'bg-zinc-800 text-red-400' : 'bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'}`}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </Button>
        
        <Button 
          variant="outline"
          onClick={onToggleVideo}
          className={`w-14 h-14 rounded-full border-zinc-800 flex items-center justify-center transition-all ${isVideoOff ? 'bg-zinc-800 text-red-400' : 'bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'}`}
        >
          {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
        </Button>

        <Button 
          variant="outline"
          onClick={onToggleScreenShare}
          className={`w-14 h-14 rounded-full border-zinc-800 flex items-center justify-center transition-all ${isScreenSharing ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'}`}
          title={isScreenSharing ? "Зупинити демку" : "Демка"}
        >
          {isScreenSharing ? <MonitorX className="w-6 h-6" /> : <MonitorUp className="w-6 h-6" />}
        </Button>

        {/* Feature 19: Virtual Background */}
        <Button 
          variant="outline"
          onClick={() => setIsBgBlurred(!isBgBlurred)}
          className={`w-14 h-14 rounded-full border-zinc-800 flex items-center justify-center transition-all ${isBgBlurred ? 'bg-purple-500/20 text-purple-400 border-purple-500/50' : 'bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'}`}
          title={isBgBlurred ? "Вимкнути віртуальний фон" : "Віртуальний фон"}
        >
          <Sparkles className="w-6 h-6" />
        </Button>

        {/* Feature 18: Record button */}
        <Button 
          variant="outline"
          onClick={isRecording ? stopRecording : startRecording}
          className={`w-14 h-14 rounded-full border-zinc-800 flex items-center justify-center transition-all ${isRecording ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'}`}
          title={isRecording ? "Зупинити запис" : "Записати дзвінок"}
        >
          {isRecording ? <Square className="w-5 h-5" /> : <Circle className="w-6 h-6" />}
        </Button>

        <Button 
          onClick={onEnd}
          className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-transform hover:scale-105 ml-3"
        >
          <PhoneOff className="w-6 h-6 text-white" />
        </Button>
      </div>
    </div>
  );
};
