import { Room, RoomEvent } from 'livekit-client';
import { FileMeta } from './webrtc';

const CHUNK_SIZE = 15000; // LiveKit data channel limit ~15KB

/**
 * SENDER: Reads the file in chunks and publishes each over LiveKit data channel.
 * Must only be called AFTER the receiver has sent 'file-ready'.
 */
export const sendFileOverLiveKit = async (
  file: File,
  room: Room,
  onProgress: (progress: number) => void
): Promise<void> => {
  let offset = 0;
  let chunksSent = 0;

  while (offset < file.size) {
    if (room.state !== 'connected') {
      throw new Error('LiveKit room disconnected during file send');
    }

    const end = Math.min(offset + CHUNK_SIZE, file.size);
    const slice = file.slice(offset, end);
    const buffer = await slice.arrayBuffer();

    await room.localParticipant.publishData(new Uint8Array(buffer), {
      reliable: true,
      topic: 'file-chunk',
    });

    offset = end;
    chunksSent++;

    // Yield to event loop every 30 chunks to prevent flooding
    if (chunksSent % 30 === 0) {
      await new Promise(r => setTimeout(r, 10));
    }

    onProgress(Math.min(99, Math.floor((offset / file.size) * 100)));
  }

  // Signal transfer complete
  await room.localParticipant.publishData(
    new TextEncoder().encode('__FILE_DONE__'),
    { reliable: true, topic: 'file-done' }
  );

  onProgress(100);
};

/**
 * RECEIVER: Listens for data chunks, accumulates in memory, then creates
 * a Blob download URL when done. No File System Access API — it's unreliable
 * and causes race conditions with the save dialog.
 */
export const receiveFileOverLiveKit = (
  room: Room,
  meta: FileMeta,
  onProgress: (progress: number) => void,
  onComplete: (blobUrl: string) => void,
  onError: (err: Error) => void
): (() => void) => {
  let receivedBytes = 0;
  const chunks: Uint8Array[] = [];

  const dataHandler = (payload: Uint8Array, _participant: any, _kind: any, topic?: string) => {
    if (topic === 'file-chunk') {
      // Copy the payload to avoid detached buffer issues
      const copy = new Uint8Array(payload.length);
      copy.set(payload);
      chunks.push(copy);

      receivedBytes += payload.byteLength;
      if (meta.fileSize > 0) {
        onProgress(Math.min(99, Math.floor((receivedBytes / meta.fileSize) * 100)));
      }
    } else if (topic === 'file-done') {
      room.off(RoomEvent.DataReceived, dataHandler);

      try {
        const blob = new Blob(chunks as any[], {
          type: meta.mimeType || 'application/octet-stream',
        });

        if (blob.size === 0) {
          onError(new Error(`Received 0 bytes (expected ${meta.fileSize}). ${chunks.length} chunks collected.`));
          return;
        }

        const url = URL.createObjectURL(blob);
        onProgress(100);
        onComplete(url);
      } catch (e) {
        onError(e instanceof Error ? e : new Error(String(e)));
      }
    }
  };

  room.on(RoomEvent.DataReceived, dataHandler);

  // Return cleanup function
  return () => {
    room.off(RoomEvent.DataReceived, dataHandler);
  };
};
