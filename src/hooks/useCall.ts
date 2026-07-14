import { useState, useEffect, useCallback, useRef } from 'react';
import { getPusherClient } from '@/lib/pusher';
import { createPeerConnection, sendSignal } from '@/lib/webrtc';
import { startCamera, startScreenShare, stopScreenShare, CallSignal } from '@/lib/webrtc-call';

export type CallState = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

export const useCall = (currentUser: string, targetUsername?: string, roomId?: string) => {
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

  useEffect(() => {
    if (!currentUser) return;
    const pusher = getPusherClient();
    if (!pusher) return;
    
    const channelName = `user-${currentUser}`;
    const channel = pusher.subscribe(channelName);

    channel.bind('webrtc-signal', async (data: any) => {
      if (!data.isCallSignal) return;
      const { type, senderUsername, payload, transferId } = data as CallSignal;

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
        setIncomingCall({ sender: senderUsername, offer: payload, callId: transferId });
        setCallState('ringing');
        currentCallIdRef.current = transferId;
      }

      if (type === 'answer' && currentCallIdRef.current === transferId) {
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload));
          setCallState('connected');
        }
      }

      if (type === 'ice-candidate' && currentCallIdRef.current === transferId) {
        if (pcRef.current && pcRef.current.remoteDescription) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(payload));
          } catch (e) {
            console.error('Error adding ICE candidate', e);
          }
        }
      }

      if (type === 'reject' && currentCallIdRef.current === transferId) {
        endCall();
      }
    });

    return () => {
      pusher.unsubscribe(channelName);
    };
  }, [currentUser, callState]);

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
      setRemoteStream(event.streams[0]);
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

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
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
  };

  const endCall = async () => {
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
        const stream = await startScreenShare(pcRef.current);
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
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare
  };
};
