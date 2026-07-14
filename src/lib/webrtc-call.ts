import { WebRTCSignal, createPeerConnection } from './webrtc';

export interface CallSignal extends WebRTCSignal {
  isCallSignal: true;
  callType?: 'video' | 'audio';
}

export const startCamera = async (video: boolean = true, audio: boolean = true): Promise<MediaStream> => {
  return await navigator.mediaDevices.getUserMedia({
    video: video ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false,
    audio: audio ? { echoCancellation: true, noiseSuppression: true } : false
  });
};

export const startScreenShare = async (pc: RTCPeerConnection): Promise<MediaStream> => {
  const screenStream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      displaySurface: 'monitor'
    },
    audio: true 
  });

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
