import { useState, useEffect, useRef, useCallback } from 'react';
import { getPusherClient } from '@/lib/pusher';
import { sendSignal, WebRTCSignal } from '@/lib/webrtc';
import { Room, RoomEvent, Track, ConnectionQuality, Participant } from 'livekit-client';

export type CallState = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

export const useCall = (currentUser: string, targetUsername?: string) => {
  const [callState, setCallState] = useState<CallState>('idle');
  const [incomingCall, setIncomingCall] = useState<{ sender: string; callId: string } | null>(null);
  
  const [room, setRoom] = useState<Room | null>(null);
  
  const [localCameraStream, setLocalCameraStream] = useState<MediaStream | null>(null);
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(true); // Default camera OFF on call start
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const currentCallIdRef = useRef<string | null>(null);
  
  const [networkQuality, setNetworkQuality] = useState<'Good' | 'Fair' | 'Poor'>('Good');

  // Convert LiveKit tracks to MediaStreams cleanly
  const updateLocalStream = useCallback((r: Room) => {
    // 1. Local Camera + Mic stream
    const camStream = new MediaStream();
    const videoPubs = Array.from(r.localParticipant.videoTrackPublications.values());
    const cameraPub = videoPubs.find(p => p.source === Track.Source.Camera);
    
    if (cameraPub?.track?.mediaStreamTrack) {
      camStream.addTrack(cameraPub.track.mediaStreamTrack);
    }
    r.localParticipant.audioTrackPublications.forEach(p => {
      if (p.track?.mediaStreamTrack && p.source !== Track.Source.ScreenShareAudio) {
        camStream.addTrack(p.track.mediaStreamTrack);
      }
    });
    setLocalCameraStream(camStream.getTracks().length > 0 ? camStream : null);
    
    // 2. Local Screen share stream
    const screenPub = videoPubs.find(p => p.source === Track.Source.ScreenShare);
    const scrStream = new MediaStream();
    if (screenPub?.track?.mediaStreamTrack) {
      scrStream.addTrack(screenPub.track.mediaStreamTrack);
      
      // Auto reset isScreenSharing if user stops screen share from browser floating panel
      screenPub.track.mediaStreamTrack.onended = () => {
        setIsScreenSharing(false);
        setLocalScreenStream(null);
      };
    }
    setLocalScreenStream(scrStream.getTracks().length > 0 ? scrStream : null);
  }, []);

  const updateRemoteStream = useCallback((r: Room) => {
    const stream = new MediaStream();
    r.remoteParticipants.forEach(participant => {
      const videoPubs = Array.from(participant.videoTrackPublications.values());
      const screenSharePub = videoPubs.find(p => p.source === Track.Source.ScreenShare);
      const cameraPub = videoPubs.find(p => p.source === Track.Source.Camera);
      
      const activeVideoPub = screenSharePub || cameraPub;
      if (activeVideoPub?.track?.mediaStreamTrack) {
        stream.addTrack(activeVideoPub.track.mediaStreamTrack);
      }

      participant.audioTrackPublications.forEach(p => {
        if (p.track?.mediaStreamTrack) stream.addTrack(p.track.mediaStreamTrack);
      });
    });
    setRemoteStream(stream.getTracks().length > 0 ? stream : null);
  }, []);

  const endCall = useCallback(async () => {
    if (currentCallIdRef.current && (callState === 'connected' || callState === 'calling')) {
      const target = incomingCall ? incomingCall.sender : targetUsername;
      if (target) {
        await sendSignal({
          targetUsername: target,
          senderUsername: currentUser,
          type: 'reject',
          transferId: currentCallIdRef.current,
          isCallSignal: true
        });
      }
    }

    if (room) {
      await room.disconnect();
      setRoom(null);
    }
    
    setLocalCameraStream(null);
    setLocalScreenStream(null);
    setRemoteStream(null);
    setCallState('idle');
    setIncomingCall(null);
    currentCallIdRef.current = null;
    setIsScreenSharing(false);
    setIsVideoOff(true);
    setIsMuted(false);
  }, [callState, incomingCall, targetUsername, currentUser, room]);

  useEffect(() => {
    if (!currentUser) return;
    const pusher = getPusherClient();
    if (!pusher) return;
    
    const channelName = `user-${currentUser}`;
    const channel = pusher.subscribe(channelName);

    channel.bind('webrtc-signal', async (data: WebRTCSignal) => {
      if (!data.isCallSignal) return;
      const { type, senderUsername, transferId } = data;

      if (type === 'offer') {
        if (callState !== 'idle') {
          await sendSignal({
            targetUsername: senderUsername,
            senderUsername: currentUser,
            type: 'reject',
            transferId,
            isCallSignal: true,
            payload: { reason: 'busy' }
          });
          return;
        }
        setIncomingCall({ sender: senderUsername, callId: transferId });
        setCallState('ringing');
        currentCallIdRef.current = transferId;
      }

      if (type === 'reject' && currentCallIdRef.current === transferId) {
        endCall();
      }
    });

    return () => {
      pusher.unsubscribe(channelName);
    };
  }, [currentUser, callState, targetUsername, incomingCall, endCall]);

  const joinLiveKitRoom = async (callId: string) => {
    try {
      const res = await fetch('/api/livekit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: callId, username: currentUser })
      });
      const { token } = await res.json();
      
      const newRoom = new Room({
        adaptiveStream: false,
        dynacast: false,
        videoCaptureDefaults: {
          resolution: { width: 1280, height: 720, frameRate: 30 }
        },
        publishDefaults: {
          videoEncoding: { maxBitrate: 3000000, maxFramerate: 30 },
          screenShareEncoding: { maxBitrate: 8000000, maxFramerate: 60 }
        }
      });

      newRoom
        .on(RoomEvent.TrackSubscribed, () => updateRemoteStream(newRoom))
        .on(RoomEvent.TrackUnsubscribed, () => updateRemoteStream(newRoom))
        .on(RoomEvent.LocalTrackPublished, () => updateLocalStream(newRoom))
        .on(RoomEvent.LocalTrackUnpublished, () => updateLocalStream(newRoom))
        .on(RoomEvent.ConnectionQualityChanged, (quality: ConnectionQuality, p: Participant) => {
          if (p.identity === currentUser) {
            if (quality === ConnectionQuality.Excellent || quality === ConnectionQuality.Good) setNetworkQuality('Good');
            else if (quality === ConnectionQuality.Poor) setNetworkQuality('Fair');
            else setNetworkQuality('Poor');
          }
        });

      setRoom(newRoom);
      await newRoom.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, token);
      
      // 1. Microphone enabled by default
      try {
        await newRoom.localParticipant.setMicrophoneEnabled(true);
        setIsMuted(false);
      } catch (e) {
        console.warn('Microphone blocked or not found', e);
        setIsMuted(true);
      }

      // 2. Camera DISABLED by default as requested
      try {
        await newRoom.localParticipant.setCameraEnabled(false);
        setIsVideoOff(true);
      } catch (e) {
        console.warn('Camera blocked or not found', e);
        setIsVideoOff(true);
      }
      
      updateLocalStream(newRoom);
      return newRoom;
    } catch (e) {
      console.error('Failed to join LiveKit room', e);
      return null;
    }
  };

  const startCall = async (target: string) => {
    if (!target) return;
    const callId = `call-${Math.random().toString(36).substring(2, 10)}`;
    currentCallIdRef.current = callId;
    setCallState('calling');

    const newRoom = await joinLiveKitRoom(callId);
    if (!newRoom) {
      setCallState('idle');
      return;
    }

    newRoom.on(RoomEvent.ParticipantConnected, () => {
      setCallState('connected');
    });

    await sendSignal({
      targetUsername: target,
      senderUsername: currentUser,
      type: 'offer',
      payload: {},
      transferId: callId,
      isCallSignal: true
    });
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    const { callId } = incomingCall;
    setIncomingCall(null);
    setCallState('connected');
    
    await joinLiveKitRoom(callId);
  };

  const rejectCall = async () => {
    if (!incomingCall) return;
    await sendSignal({
      targetUsername: incomingCall.sender,
      senderUsername: currentUser,
      type: 'reject',
      transferId: incomingCall.callId,
      isCallSignal: true
    });
    
    setIncomingCall(null);
    setCallState('idle');
    currentCallIdRef.current = null;
  };

  const toggleMute = useCallback(async () => {
    if (!room) return;
    try {
      const nextMutedState = !isMuted;
      await room.localParticipant.setMicrophoneEnabled(!nextMutedState);
      setIsMuted(nextMutedState);
    } catch (err) {
      console.error('Failed to toggle mic', err);
    }
  }, [room, isMuted]);

  const toggleVideo = useCallback(async () => {
    if (!room) return;
    try {
      const nextVideoOffState = !isVideoOff;
      await room.localParticipant.setCameraEnabled(!nextVideoOffState);
      setIsVideoOff(nextVideoOffState);
      updateLocalStream(room);
    } catch (err) {
      console.error('Failed to toggle camera', err);
    }
  }, [room, isVideoOff, updateLocalStream]);

  const toggleScreenShare = useCallback(async () => {
    if (!room) return;
    
    if (isScreenSharing) {
      try {
        await room.localParticipant.setScreenShareEnabled(false);
        setIsScreenSharing(false);
        setLocalScreenStream(null);
      } catch (err) {
        console.error('Failed to stop screen share', err);
      }
    } else {
      try {
        await room.localParticipant.setScreenShareEnabled(true, { 
          audio: true,
          resolution: {
            width: 1920,
            height: 1080,
            frameRate: 60,
          }
        });
        setIsScreenSharing(true);
        updateLocalStream(room);
      } catch (err) {
        console.error('Failed to start screen share', err);
        setIsScreenSharing(false);
      }
    }
  }, [room, isScreenSharing, updateLocalStream]);

  return {
    callState,
    incomingCall,
    localStream: localCameraStream,
    screenStream: localScreenStream,
    remoteStream,
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
    peerConnection: null // Legacy, not used with LiveKit
  };
};
