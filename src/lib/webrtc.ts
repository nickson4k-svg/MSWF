export interface FileMeta {
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface WebRTCSignal {
  senderUsername: string;
  targetUsername: string;
  type: 'offer' | 'answer' | 'ice-candidate' | 'reject';
  payload: unknown;
  fileMeta?: FileMeta;
  roomId?: string;
  transferId: string;
}

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    // If NEXT_PUBLIC_TURN_URL is provided, use it, else fallback to public metered (often rate-limited)
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


