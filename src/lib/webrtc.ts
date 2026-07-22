export interface FileMeta {
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface WebRTCSignal {
  senderUsername: string;
  targetUsername: string;
  type: 'offer' | 'answer' | 'ice-candidate' | 'reject' | 'file-offer';
  payload?: unknown;
  fileMeta?: FileMeta;
  roomId?: string;
  transferId: string;
  isCallSignal?: boolean;
}

export const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    ...(process.env.NEXT_PUBLIC_TURN_URL
      ? [
          {
            urls: process.env.NEXT_PUBLIC_TURN_URL,
            username: process.env.NEXT_PUBLIC_TURN_USERNAME,
            credential: process.env.NEXT_PUBLIC_TURN_PASSWORD,
          },
        ]
      : [
          {
            urls: "turn:openrelay.metered.ca:80",
            username: "open",
            credential: "open",
          },
        ]),
  ],
};

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const sendSignal = async (signal: Partial<WebRTCSignal>) => {
  await fetch('/api/webrtc/signal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(signal)
  });
};
