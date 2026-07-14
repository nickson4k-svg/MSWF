export interface FileMeta {
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface WebRTCSignal {
  senderUsername: string;
  targetUsername: string;
  type: 'offer' | 'answer' | 'ice-candidate' | 'reject';
  payload: any;
  fileMeta?: FileMeta;
  roomId?: string;
  transferId: string;
}

const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "open",
      credential: "open"
    }
  ]
};

export const createPeerConnection = () => {
  return new RTCPeerConnection(rtcConfig);
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

    const readAndSend = () => {
      if (dataChannel.readyState !== 'open') return;

      while (offset < file.size) {
        if (dataChannel.bufferedAmount > dataChannel.bufferedAmountLowThreshold) {
          // Buffer is full, wait for it to empty
          dataChannel.onbufferedamountlow = () => {
            dataChannel.onbufferedamountlow = null;
            readAndSend();
          };
          return;
        }

        const chunk = file.slice(offset, offset + chunkSize);
        const reader = new FileReader();

        // Using synchronous reading approach via ArrayBuffer is needed for DataChannel
        // But FileReader is async, so we need to await it carefully without breaking loop?
        // Actually, better to read iteratively
        reader.onload = (e) => {
          if (dataChannel.readyState !== 'open') return;
          if (e.target && e.target.result) {
            dataChannel.send(e.target.result as ArrayBuffer);
            offset += chunk.size;
            onProgress(Math.floor((offset / file.size) * 100));
            readAndSend();
          }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(chunk);
        return; // Break the loop, the onload callback will continue it
      }

      if (offset >= file.size) {
        dataChannel.send(JSON.stringify({ type: "done" }));
        resolve();
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
            const handle = await (window as any).showSaveFilePicker({
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
            await writable!.close();
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
