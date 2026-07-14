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
      video: video ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false,
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

export const startScreenShare = async (pc: RTCPeerConnection): Promise<MediaStream> => {
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

  const audioTrack = screenStream.getAudioTracks()[0];
  if (audioTrack) {
    const audioSender = senders.find(sender => sender.track?.kind === 'audio');
    if (audioSender) {
      await audioSender.replaceTrack(audioTrack);
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
      if (aSender) await aSender.replaceTrack(camAudio);
    }
  }
};
