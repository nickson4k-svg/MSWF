import { useState, useEffect, useRef, useCallback } from 'react';
import { getPusherClient } from '@/lib/pusher';
import { createPeerConnection, sendSignal } from '@/lib/webrtc';
import { startCamera, startScreenShare, stopScreenShare, CallSignal } from '@/lib/webrtc-call';

export type CallState = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

export const useCall = (currentUser: string, targetUsername?: string) => {
  const [callState, setCallState] = useState<CallState>('idle');
  const [incomingCall, setIncomingCall] = useState<{ sender: string; offer: RTCSessionDescriptionInit, callId: string } | null>(null);
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const currentCallIdRef = useRef<string | null>(null);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Feature 10: Adaptive Bitrate tracking
  const [networkQuality, setNetworkQuality] = useState<'Good' | 'Fair' | 'Poor'>('Good');

  const endCall = useCallback(async () => {
    if (currentCallIdRef.current && (callState === 'connected' || callState === 'calling')) {
      // Send reject/end to peer
      const target = incomingCall ? incomingCall.sender : targetUsername;
      if (target) {
        await sendSignal({
          targetUsername: target,
          senderUsername: currentUser,
          type: 'reject', // acts as end
          transferId: currentCallIdRef.current,
          isCallSignal: true
        } as CallSignal);
      }
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
    
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
    }
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
    }
    
    setRemoteStream(null);
    setCallState('idle');
    setIncomingCall(null);
    currentCallIdRef.current = null;
    iceCandidateQueue.current = [];
  }, [callState, incomingCall, targetUsername, currentUser, localStream, screenStream]);

  const startStatsPolling = useCallback(() => {
    if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    
    statsIntervalRef.current = setInterval(async () => {
      if (!pcRef.current) return;
      
      try {
        const stats = await pcRef.current.getStats();
        let rtt = 0;
        let packetsLost = 0;
        let packetsSent = 0;
        
        stats.forEach(report => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            rtt = report.currentRoundTripTime || 0;
          }
          if (report.type === 'outbound-rtp' && report.kind === 'video') {
            packetsSent = report.packetsSent || 0;
          }
          if (report.type === 'remote-inbound-rtp' && report.kind === 'video') {
            packetsLost = report.packetsLost || 0;
          }
        });
        
        const lossRate = packetsSent > 0 ? packetsLost / packetsSent : 0;
        
        // Find video sender to adjust bitrate
        const senders = pcRef.current.getSenders();
        const videoSender = senders.find(s => s.track?.kind === 'video');
        
        if (videoSender && videoSender.track) {
          const params = videoSender.getParameters();
          if (!params.encodings) params.encodings = [{}];
          
          let currentMaxBitrate = params.encodings[0].maxBitrate || 1500000;
          let newQuality: 'Good' | 'Fair' | 'Poor' = 'Good';
          
          // Simple adaptation logic based on RTT (s) and Packet Loss
          if (rtt > 0.25 || lossRate > 0.05) {
            newQuality = 'Poor';
            currentMaxBitrate = Math.max(100000, currentMaxBitrate * 0.5); 
          } else if (rtt > 0.1 || lossRate > 0.02) {
            newQuality = 'Fair';
            currentMaxBitrate = Math.max(250000, currentMaxBitrate * 0.8);
          } else {
            newQuality = 'Good';
            currentMaxBitrate = Math.min(2500000, currentMaxBitrate * 1.1);
          }
          
          if (params.encodings[0].maxBitrate !== currentMaxBitrate) {
            params.encodings[0].maxBitrate = currentMaxBitrate;
            await videoSender.setParameters(params);
            console.log(`[ABR] Quality: ${newQuality}, maxBitrate set to: ${currentMaxBitrate}`);
          }
          
          setNetworkQuality(newQuality);
        }
      } catch (e) {
        console.error('Error polling stats for ABR', e);
      }
    }, 2000);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const pusher = getPusherClient();
    if (!pusher) return;
    
    const channelName = `user-${currentUser}`;
    const channel = pusher.subscribe(channelName);

    channel.bind('webrtc-signal', async (data: Record<string, unknown> & { isCallSignal?: boolean }) => {
      if (!data.isCallSignal) return;
      const { type, senderUsername, payload, transferId } = data as unknown as CallSignal;

      if (type === 'offer') {
        if (callState !== 'idle') {
          // Busy
          await sendSignal({
            targetUsername: senderUsername,
            senderUsername: currentUser,
            type: 'reject',
            transferId,
            isCallSignal: true,
            payload: { reason: 'busy' }
          } as CallSignal);
          return;
        }
        setIncomingCall({ sender: senderUsername, offer: payload as RTCSessionDescriptionInit, callId: transferId });
        setCallState('ringing');
        currentCallIdRef.current = transferId;
      }

      if (type === 'answer' && currentCallIdRef.current === transferId) {
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload as RTCSessionDescriptionInit));
          setCallState('connected');
          startStatsPolling();
          
          // Process queued ICE candidates
          for (const candidate of iceCandidateQueue.current) {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
              console.error('Error adding queued ICE candidate', e);
            }
          }
          iceCandidateQueue.current = [];
        }
      }

      if (type === 'ice-candidate' && currentCallIdRef.current === transferId) {
        if (pcRef.current && pcRef.current.remoteDescription) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(payload as RTCIceCandidateInit));
          } catch (e) {
            console.error('Error adding ICE candidate', e);
          }
        } else {
          iceCandidateQueue.current.push(payload as RTCIceCandidateInit);
        }
      }

      if (type === 'reject' && currentCallIdRef.current === transferId) {
        endCall();
      }
    });

    return () => {
      pusher.unsubscribe(channelName);
    };
  }, [currentUser, callState, targetUsername, incomingCall, endCall, startStatsPolling]);

  const initLocalStream = async () => {
    const stream = await startCamera();
    setLocalStream(stream);
    return stream;
  };

  const setupPeerConnection = (callId: string, target: string) => {
    const pc = createPeerConnection();
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          targetUsername: target,
          senderUsername: currentUser,
          type: 'ice-candidate',
          payload: event.candidate,
          transferId: callId,
          isCallSignal: true
        } as CallSignal);
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(prev => {
        if (prev) {
          // If we already have a stream, just return it (browser updates it internally)
          return prev;
        }
        return event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
      });
    };

    return pc;
  };

  const startCall = async (target: string) => {
    if (!target) return;
    const callId = Math.random().toString(36).substring(2, 10);
    currentCallIdRef.current = callId;
    setCallState('calling');

    const stream = await initLocalStream();
    const pc = setupPeerConnection(callId, target);
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    // Ensure we can receive media even if our local stream is empty (fallback mode)
    if (stream.getAudioTracks().length === 0) pc.addTransceiver('audio', { direction: 'recvonly' });
    if (stream.getVideoTracks().length === 0) pc.addTransceiver('video', { direction: 'recvonly' });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await sendSignal({
      targetUsername: target,
      senderUsername: currentUser,
      type: 'offer',
      payload: offer,
      transferId: callId,
      isCallSignal: true
    } as CallSignal);
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    const { sender, offer, callId } = incomingCall;
    setIncomingCall(null);
    setCallState('connected');

    const stream = await initLocalStream();
    const pc = setupPeerConnection(callId, sender);
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    // Ensure we can receive media even if our local stream is empty (fallback mode)
    if (stream.getAudioTracks().length === 0) pc.addTransceiver('audio', { direction: 'recvonly' });
    if (stream.getVideoTracks().length === 0) pc.addTransceiver('video', { direction: 'recvonly' });

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    startStatsPolling();
    
    // Process queued ICE candidates
    for (const candidate of iceCandidateQueue.current) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('Error adding queued ICE candidate', e);
      }
    }
    iceCandidateQueue.current = [];

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await sendSignal({
      targetUsername: sender,
      senderUsername: currentUser,
      type: 'answer',
      payload: answer,
      transferId: callId,
      isCallSignal: true
    } as CallSignal);
  };

  const rejectCall = async () => {
    if (!incomingCall) return;
    await sendSignal({
      targetUsername: incomingCall.sender,
      senderUsername: currentUser,
      type: 'reject',
      transferId: incomingCall.callId,
      isCallSignal: true
    } as CallSignal);
    
    setIncomingCall(null);
    setCallState('idle');
    currentCallIdRef.current = null;
    iceCandidateQueue.current = [];
  };



  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
      setIsMuted(!localStream.getAudioTracks()[0]?.enabled);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = !t.enabled);
      setIsVideoOff(!localStream.getVideoTracks()[0]?.enabled);
    }
  };

  const toggleScreenShare = async () => {
    if (!pcRef.current) return;
    
    if (isScreenSharing && screenStream) {
      // Stop sharing
      await stopScreenShare(pcRef.current, localStream, screenStream);
      setScreenStream(null);
      setIsScreenSharing(false);
    } else {
      // Start sharing
      try {
        const stream = await startScreenShare(pcRef.current, localStream);
        setScreenStream(stream);
        setIsScreenSharing(true);
        
        // Handle stop from browser UI
        stream.getVideoTracks()[0].onended = () => {
          stopScreenShare(pcRef.current!, localStream, stream);
          setScreenStream(null);
          setIsScreenSharing(false);
        };
      } catch (err) {
        console.error('Failed to start screen share', err);
      }
    }
  };



  return {
    callState,
    incomingCall,
    localStream,
    remoteStream,
    screenStream,
    isMuted,
    isVideoOff,
    isScreenSharing,
    networkQuality,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    peerConnection: pcRef.current
  };
};
