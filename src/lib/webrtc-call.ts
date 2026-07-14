import { WebRTCSignal, createPeerConnection } from './webrtc';

export interface CallSignal extends WebRTCSignal {
  isCallSignal: true;
  callType?: 'video' | 'audio';
}

export const startCamera = async (video: boolean = true, audio: boolean = true): Promise<MediaStream> => {
  if (!navigator.mediaDevices) {
    console.warn('navigator.mediaDevices is undefined. Are you on HTTP instead of HTTPS/localhost?');
    return new MediaStream();
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: video ? { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } } : false,
      audio: audio ? { echoCancellation: true, noiseSuppression: true } : false
    });
  } catch (err) {
    console.warn('Failed to get video+audio, trying audio only...', err);
    try {
      return await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    } catch (e) {
      console.warn('Failed to get audio, returning empty stream...', e);
      // Return a completely empty stream if they have no mic/cam or denied permissions
      // We can create a fake canvas video track and silence audio track to keep WebRTC happy,
      // but creating an empty MediaStream is also valid for receive-only.
      return new MediaStream();
    }
  }
};

export const startScreenShare = async (pc: RTCPeerConnection, localStream: MediaStream | null): Promise<MediaStream> => {
  let screenStream: MediaStream;
  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: 'monitor' },
      audio: true 
    });
  } catch (err: any) {
    // Fallback if browser doesn't support audio sharing
    console.warn('Could not get display media with audio, trying video only.', err);
    screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: 'monitor' }
    });
  }

  const videoTrack = screenStream.getVideoTracks()[0];
  const senders = pc.getSenders();
  const videoSender = senders.find(sender => sender.track?.kind === 'video');

  if (videoSender && videoTrack) {
    await videoSender.replaceTrack(videoTrack);
  }

  const screenAudioTrack = screenStream.getAudioTracks()[0];
  const micAudioTrack = localStream?.getAudioTracks()[0];

  let finalAudioTrack = screenAudioTrack;

  if (screenAudioTrack && micAudioTrack) {
    try {
      const audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();
      
      const screenSource = audioCtx.createMediaStreamSource(new MediaStream([screenAudioTrack]));
      const micSource = audioCtx.createMediaStreamSource(new MediaStream([micAudioTrack]));
      
      screenSource.connect(dest);
      micSource.connect(dest);
      
      finalAudioTrack = dest.stream.getAudioTracks()[0];
      (finalAudioTrack as any)._audioCtx = audioCtx; // store to clean up later
    } catch (e) {
      console.warn('Failed to mix audio streams, falling back to screen audio only', e);
    }
  }

  if (finalAudioTrack) {
    const audioSender = senders.find(sender => sender.track?.kind === 'audio');
    if (audioSender) {
      await audioSender.replaceTrack(finalAudioTrack);
    }
  }

  return screenStream;
};

export const stopScreenShare = async (pc: RTCPeerConnection, cameraStream: MediaStream | null, screenStream: MediaStream) => {
  screenStream.getTracks().forEach(track => track.stop());

  const senders = pc.getSenders();
  
  if (cameraStream) {
    const camVideo = cameraStream.getVideoTracks()[0];
    if (camVideo) {
      const vSender = senders.find(s => s.track?.kind === 'video') || senders.find(s => s.track === null);
      if (vSender) await vSender.replaceTrack(camVideo);
    }

    const camAudio = cameraStream.getAudioTracks()[0];
    if (camAudio) {
      const aSender = senders.find(s => s.track?.kind === 'audio');
      if (aSender) {
        if ((aSender.track as any)?._audioCtx) {
          (aSender.track as any)._audioCtx.close().catch(console.error);
        }
        await aSender.replaceTrack(camAudio);
      }
    }
  }
};
