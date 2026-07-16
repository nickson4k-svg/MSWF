import { useState, useEffect, useRef, useCallback } from 'react';
import { getPusherClient } from '@/lib/pusher';
import { sendSignal } from '@/lib/webrtc';
import { Room, RoomEvent, Track, LocalVideoTrack, LocalAudioTrack, ConnectionQuality, RemoteParticipant, LocalParticipant, Participant, createLocalTracks } from 'livekit-client';

export type CallState = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

export const useCall = (currentUser: string, targetUsername?: string) => {
  const [callState, setCallState] = useState<CallState>('idle');
  const [incomingCall, setIncomingCall] = useState<{ sender: string; callId: string } | null>(null);
  
  const [room, setRoom] = useState<Room | null>(null);
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const currentCallIdRef = useRef<string | null>(null);
  
  const [networkQuality, setNetworkQuality] = useState<'Good' | 'Fair' | 'Poor'>('Good');

  // Convert LiveKit tracks to MediaStream so we don't have to rewrite UI heavily
  const updateLocalStream = useCallback((r: Room) => {
    const stream = new MediaStream();
    
    const videoPubs = Array.from(r.localParticipant.videoTrackPublications.values());
    const screenSharePub = videoPubs.find(p => p.source === Track.Source.ScreenShare);
    const cameraPub = videoPubs.find(p => p.source === Track.Source.Camera);
    
    const activeVideoPub = screenSharePub || cameraPub;
    if (activeVideoPub?.track?.mediaStreamTrack) {
      stream.addTrack(activeVideoPub.track.mediaStreamTrack);
    }

    r.localParticipant.audioTrackPublications.forEach(p => {
      if (p.track?.mediaStreamTrack && p.source !== Track.Source.ScreenShareAudio) stream.addTrack(p.track.mediaStreamTrack);
    });
    setLocalStream(stream.getTracks().length > 0 ? stream : null);
    
    // Screen stream for other potential UI needs
    const ssStream = new MediaStream();
    if (screenSharePub?.track?.mediaStreamTrack) {
      ssStream.addTrack(screenSharePub.track.mediaStreamTrack);
    }
    setScreenStream(ssStream.getTracks().length > 0 ? ssStream : null);
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
        } as any);
      }
    }

    if (room) {
      await room.disconnect();
      setRoom(null);
    }
    
    setLocalStream(null);
    setScreenStream(null);
    setRemoteStream(null);
    setCallState('idle');
    setIncomingCall(null);
    currentCallIdRef.current = null;
    setIsScreenSharing(false);
  }, [callState, incomingCall, targetUsername, currentUser, room]);

  useEffect(() => {
    if (!currentUser) return;
    const pusher = getPusherClient();
    if (!pusher) return;
    
    const channelName = `user-${currentUser}`;
    const channel = pusher.subscribe(channelName);

    channel.bind('webrtc-signal', async (data: any) => {
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
          } as any);
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
        adaptiveStream: true,
        dynacast: true,
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
      
      // Auto enable camera & mic
      await newRoom.localParticipant.setCameraEnabled(true);
      await newRoom.localParticipant.setMicrophoneEnabled(true);
      
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

    // Wait for someone to join (not strictly necessary to await, we just wait for state)
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
    } as any);
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
    } as any);
    
    setIncomingCall(null);
    setCallState('idle');
    currentCallIdRef.current = null;
  };

  const toggleMute = useCallback(() => {
    if (room) {
      const isMicOn = room.localParticipant.isMicrophoneEnabled;
      room.localParticipant.setMicrophoneEnabled(!isMicOn);
      setIsMuted(isMicOn); // we toggle it, so if it was on, now it's off (muted)
    }
  }, [room]);

  const toggleVideo = useCallback(() => {
    if (room) {
      const isCamOn = room.localParticipant.isCameraEnabled;
      room.localParticipant.setCameraEnabled(!isCamOn);
      setIsVideoOff(isCamOn);
    }
  }, [room]);

  const toggleScreenShare = useCallback(async () => {
    if (!room) return;
    
    if (isScreenSharing) {
      await room.localParticipant.setScreenShareEnabled(false);
      setIsScreenSharing(false);
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
      } catch (err) {
        console.error('Failed to start screen share', err);
      }
    }
  }, [room, isScreenSharing]);

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
    peerConnection: null // Legacy, not used with LiveKit
  };
};
