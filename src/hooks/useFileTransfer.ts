import { useState, useEffect, useCallback, useRef } from 'react';
import { getPusherClient } from '@/lib/pusher';
import { sendSignal, WebRTCSignal, FileMeta } from '@/lib/webrtc';
import { Room, RoomEvent } from 'livekit-client';
import { sendFileOverLiveKit, receiveFileOverLiveKit } from '@/lib/livekit-file';

export interface FileTransfer {
  id: string;
  sender: string;
  receiver: string;
  fileMeta: FileMeta;
  status: 'connecting' | 'transferring' | 'completed' | 'rejected' | 'error';
  progress: number;
  blobUrl?: string;
  isIncoming: boolean;
  roomId?: string;
}

export const useFileTransfer = (
  currentUser: string, 
  onTransferComplete?: (fileMeta: FileMeta) => void
) => {
  const [transfers, setTransfers] = useState<FileTransfer[]>([]);
  const [pendingOffer, setPendingOffer] = useState<{
    id: string;
    sender: string;
    fileMeta: FileMeta;
    roomId?: string;
  } | null>(null);

  const roomsRef = useRef<Record<string, Room>>({});

  useEffect(() => {
    if (!currentUser) return;
    const pusher = getPusherClient();
    if (!pusher) return;
    const channelName = `user-${currentUser}`;
    const channel = pusher.subscribe(channelName);

    channel.bind('webrtc-signal', async (data: WebRTCSignal) => {
      const { type, senderUsername, fileMeta, roomId, transferId } = data;

      if (type === 'file-offer' && fileMeta) {
        setPendingOffer({
          id: transferId,
          sender: senderUsername,
          fileMeta,
          roomId
        });
      }

      if (type === 'reject') {
        updateTransferStatus(transferId, 'rejected');
        cleanupConnection(transferId);
      }
    });

    return () => {
      pusher.unsubscribe(channelName);
    };
  }, [currentUser]);

  function updateTransferStatus(id: string, status: FileTransfer['status'], progress?: number, blobUrl?: string) {
    setTransfers(prev => prev.map(t => {
      if (t.id === id) {
        return { 
          ...t, 
          status, 
          ...(progress !== undefined ? { progress } : {}),
          ...(blobUrl ? { blobUrl } : {})
        };
      }
      return t;
    }));
  }

  function cleanupConnection(id: string) {
    const room = roomsRef.current[id];
    if (room) {
      room.disconnect();
      delete roomsRef.current[id];
    }
  }

  const joinTransferRoom = async (transferId: string) => {
    const lkRoomId = `file-transfer-${transferId}`;
    const res = await fetch('/api/livekit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room: lkRoomId, username: currentUser })
    });
    const { token } = await res.json();
    const room = new Room({ adaptiveStream: false, dynacast: false });
    roomsRef.current[transferId] = room;
    await room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, token);
    return room;
  };

  const initiateTransfer = useCallback(async (file: File, targetUsername: string, conversationRoomId?: string) => {
    const transferId = Math.random().toString(36).substring(2, 10);
    
    setTransfers(prev => [...prev, {
      id: transferId,
      sender: currentUser,
      receiver: targetUsername,
      fileMeta: { fileName: file.name, fileSize: file.size, mimeType: file.type },
      status: 'connecting',
      progress: 0,
      isIncoming: false,
      roomId: conversationRoomId
    }]);

    try {
      const room = await joinTransferRoom(transferId);
      
      await sendSignal({
        transferId,
        targetUsername,
        type: 'file-offer',
        fileMeta: { fileName: file.name, fileSize: file.size, mimeType: file.type },
        roomId: conversationRoomId
      } as any);

      room.on(RoomEvent.DataReceived, async (payload, p, kind, topic) => {
        if (topic === 'file-ready') {
          updateTransferStatus(transferId, 'transferring');
          try {
            await sendFileOverLiveKit(file, room, (progress) => {
              updateTransferStatus(transferId, 'transferring', progress);
            });
            updateTransferStatus(transferId, 'completed', 100);
            if (onTransferComplete) {
              onTransferComplete({ fileName: file.name, fileSize: file.size, mimeType: file.type });
            }
          } catch (err) {
            console.error('File send error', err);
            updateTransferStatus(transferId, 'error');
          }
        }
      });
    } catch (e) {
      console.error('Failed to initiate transfer', e);
      updateTransferStatus(transferId, 'error');
    }
  }, [currentUser, onTransferComplete]);

  const acceptOffer = useCallback(async () => {
    if (!pendingOffer) return;
    const { id, sender, fileMeta, roomId: conversationRoomId } = pendingOffer;
    
    setTransfers(prev => [...prev, {
      id,
      sender,
      receiver: currentUser,
      fileMeta,
      status: 'connecting',
      progress: 0,
      isIncoming: true,
      roomId: conversationRoomId
    }]);
    
    setPendingOffer(null);

    try {
      const room = await joinTransferRoom(id);
      
      updateTransferStatus(id, 'transferring', 0);
      
      await receiveFileOverLiveKit(room, fileMeta, 
        (progress) => {
          updateTransferStatus(id, 'transferring', progress);
        },
        (blobUrl) => {
          updateTransferStatus(id, 'completed', 100, blobUrl);
          if (onTransferComplete) onTransferComplete(fileMeta);
        }
      );

      await room.localParticipant.publishData(new TextEncoder().encode('READY'), {
        reliable: true,
        topic: 'file-ready',
      });
    } catch (e) {
      console.error('Failed to accept transfer', e);
      updateTransferStatus(id, 'error');
    }
  }, [pendingOffer, currentUser, onTransferComplete]);

  const rejectOffer = useCallback(async () => {
    if (!pendingOffer) return;
    const { id, sender } = pendingOffer;
    await sendSignal({
      transferId: id,
      targetUsername: sender,
      type: 'reject'
    });
    setPendingOffer(null);
  }, [pendingOffer]);

  const cancelTransfer = useCallback((id: string) => {
    const t = transfers.find(x => x.id === id);
    if (!t) return;
    if (t.status === 'connecting' || t.status === 'transferring') {
      updateTransferStatus(id, 'error');
    }
    cleanupConnection(id);
  }, [transfers]);

  return { transfers, pendingOffer, initiateTransfer, acceptOffer, rejectOffer, cancelTransfer };
};
