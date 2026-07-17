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

export const createPeerConnection = () => {
  return new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
      { urls: 'stun:stun.cloudflare.com:3478' }
    ]
  });
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

export const sendFileOverChannel = async (
  file: File, 
  dataChannel: RTCDataChannel, 
  onProgress: (progress: number) => void
) => {
  return new Promise<void>((resolve, reject) => {
    const chunkSize = 16384; // 16 KB
    let offset = 0;

    dataChannel.bufferedAmountLowThreshold = 65536; // 64 KB

    const readAndSend = async () => {
      try {
        while (offset < file.size) {
          if (dataChannel.readyState !== 'open') {
            reject(new Error('Data channel closed unexpectedly'));
            return;
          }

          if (dataChannel.bufferedAmount > dataChannel.bufferedAmountLowThreshold) {
            // Buffer is full, wait for it to empty
            await new Promise<void>(res => {
              dataChannel.onbufferedamountlow = () => {
                dataChannel.onbufferedamountlow = null;
                res();
              };
            });
          }

          const chunk = file.slice(offset, offset + chunkSize);
          const buffer = await chunk.arrayBuffer();
          
          if (dataChannel.readyState !== 'open') return;
          dataChannel.send(buffer);
          
          offset += chunk.size;
          onProgress(Math.floor((offset / file.size) * 100));
        }

        if (offset >= file.size) {
          dataChannel.send(JSON.stringify({ type: "done" }));
          resolve();
        }
      } catch (err) {
        reject(err);
      }
    };

    // First, send metadata
    dataChannel.send(JSON.stringify({
      type: "meta",
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
    }));

    // Start sending file chunks
    readAndSend();
  });
};

export const receiveFileOverChannel = (
  dataChannel: RTCDataChannel,
  onProgress: (progress: number) => void,
  onComplete: (fileUrl?: string) => void
) => {
  let receivedBytes = 0;
  let meta: FileMeta | null = null;
  const chunks: ArrayBuffer[] = [];
  let writable: FileSystemWritableFileStream | null = null;
  let writeQueue = Promise.resolve();

  dataChannel.onmessage = async (event) => {
    if (typeof event.data === "string") {
      const msg = JSON.parse(event.data);
      if (msg.type === "meta") {
        meta = msg as FileMeta;
        
        // Try to use File System Access API
        if ('showSaveFilePicker' in window) {
          try {
            const handle = await (window as unknown as { showSaveFilePicker: (options: unknown) => Promise<{ createWritable: () => Promise<FileSystemWritableFileStream> }> }).showSaveFilePicker({
              suggestedName: meta.fileName,
            });
            writable = await handle.createWritable();
          } catch (e) {
            console.warn('User cancelled or FS Access failed, falling back to Blob', e);
          }
        }
      } else if (msg.type === "done") {
        if (writable) {
          // Wait for all writes to finish
          writeQueue = writeQueue.then(async () => {
            try {
              await writable!.close();
            } catch (e) {
              console.error('Failed to close writable', e);
            }
            onComplete();
          });
        } else {
          // Fallback to Blob
          const blob = new Blob(chunks, { type: meta?.mimeType || 'application/octet-stream' });
          const url = URL.createObjectURL(blob);
          onComplete(url);
        }
      }
    } else {
      // It's binary data (ArrayBuffer, Blob, or Uint8Array)
      const data = event.data;
      if (writable) {
        writeQueue = writeQueue.then(() => writable!.write(data)).catch(console.error);
      } else {
        chunks.push(data);
      }
      
      // Calculate byte length safely for both Blob and ArrayBuffer
      const size = data.byteLength || data.size || 0;
      receivedBytes += size;
      
      if (meta && meta.fileSize > 0) {
        onProgress(Math.floor((receivedBytes / meta.fileSize) * 100));
      }
    }
  };
};
