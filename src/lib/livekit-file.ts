import { Room, RoomEvent } from 'livekit-client';
import { FileMeta } from './webrtc';

export const sendFileOverLiveKit = async (
  file: File,
  room: Room,
  onProgress: (progress: number) => void
) => {
  return new Promise<void>((resolve, reject) => {
    const chunkSize = 15000; // LiveKit recommends keeping chunks under 15KB
    let offset = 0;

    const readAndSend = async () => {
      try {
        while (offset < file.size) {
          if (room.state !== 'connected') {
            reject(new Error('LiveKit room disconnected'));
            return;
          }

          const chunk = file.slice(offset, offset + chunkSize);
          const buffer = await chunk.arrayBuffer();
          const uint8Array = new Uint8Array(buffer);

          await room.localParticipant.publishData(uint8Array, {
            reliable: true,
            topic: 'file-chunk',
          });

          offset += chunk.size;
          onProgress(Math.floor((offset / file.size) * 100));
        }

        if (offset >= file.size) {
          await room.localParticipant.publishData(new TextEncoder().encode('DONE'), {
            reliable: true,
            topic: 'file-done',
          });
          resolve();
        }
      } catch (err) {
        reject(err);
      }
    };

    // Start sending
    readAndSend();
  });
};

export const receiveFileOverLiveKit = (
  room: Room,
  meta: FileMeta,
  onProgress: (progress: number) => void,
  onComplete: (fileUrl?: string) => void
) => {
  let receivedBytes = 0;
  const chunks: Uint8Array[] = [];
  let writable: FileSystemWritableFileStream | null = null;
  let writeQueue = Promise.resolve();

  // Try to use File System Access API
  const initFs = async () => {
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: meta.fileName,
        });
        writable = await handle.createWritable();
      } catch (e) {
        console.warn('FS Access failed, falling back to Blob', e);
      }
    }
  };

  initFs();

  const dataHandler = (payload: Uint8Array, participant: any, kind: any, topic?: string) => {
    if (topic === 'file-chunk') {
      if (writable) {
        writeQueue = writeQueue.then(() => writable!.write(payload)).catch(console.error);
      } else {
        chunks.push(payload);
      }

      receivedBytes += payload.byteLength;
      if (meta.fileSize > 0) {
        onProgress(Math.floor((receivedBytes / meta.fileSize) * 100));
      }
    } else if (topic === 'file-done') {
      room.off(RoomEvent.DataReceived, dataHandler);
      
      if (writable) {
        writeQueue = writeQueue.then(async () => {
          try {
            await writable!.close();
          } catch (e) {
            console.error('Failed to close writable', e);
          }
          onComplete();
        });
      } else {
        const blob = new Blob(chunks, { type: meta.mimeType || 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        onComplete(url);
      }
    }
  };

  room.on(RoomEvent.DataReceived, dataHandler);
};
