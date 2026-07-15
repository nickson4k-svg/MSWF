import { useState, useEffect, useCallback, useRef } from 'react';
import { getPusherClient } from '@/lib/pusher';
import { 
  createPeerConnection, 
  sendSignal, 
  sendFileOverChannel, 
  receiveFileOverChannel,
  WebRTCSignal,
  FileMeta
} from '@/lib/webrtc';

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
    offer: RTCSessionDescriptionInit;
    roomId?: string;
  } | null>(null);

  // We need to keep track of active peer connections and data channels
  const connectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const channelsRef = useRef<Record<string, RTCDataChannel>>({});

  useEffect(() => {
    if (!currentUser) return;

    const pusher = getPusherClient();
    if (!pusher) return;

    const channelName = `user-${currentUser}`;
    const channel = pusher.subscribe(channelName);

    channel.bind('webrtc-signal', async (data: WebRTCSignal) => {
      const { type, senderUsername, payload, fileMeta, roomId, transferId } = data;

      if (type === 'offer' && fileMeta) {
        setPendingOffer({
          id: transferId,
          sender: senderUsername,
          fileMeta,
          offer: payload as RTCSessionDescriptionInit,
          roomId
        });
      }

      if (type === 'answer') {
        const pc = connectionsRef.current[transferId];
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(payload as RTCSessionDescriptionInit));
        }
      }

      if (type === 'ice-candidate') {
        const pc = connectionsRef.current[transferId];
        if (pc && pc.remoteDescription) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload as RTCIceCandidateInit));
          } catch (e) {
            console.error('Error adding ICE candidate', e);
          }
        } else if (pc) {
          // Store ICE candidates if remote description is not yet set? 
          // Usually we set remote before receiving ICE.
        }
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
    const pc = connectionsRef.current[id];
    if (pc) {
      pc.close();
      delete connectionsRef.current[id];
    }
    const dc = channelsRef.current[id];
    if (dc) {
      dc.close();
      delete channelsRef.current[id];
    }
  }

  const initiateTransfer = useCallback(async (file: File, targetUsername: string, roomId?: string) => {
    const transferId = Math.random().toString(36).substring(2, 10);
    
    setTransfers(prev => [...prev, {
      id: transferId,
      sender: currentUser,
      receiver: targetUsername,
      fileMeta: { fileName: file.name, fileSize: file.size, mimeType: file.type },
      status: 'connecting',
      progress: 0,
      isIncoming: false,
      roomId
    }]);

    const pc = createPeerConnection();
    connectionsRef.current[transferId] = pc;

    const dataChannel = pc.createDataChannel('fileTransfer', { ordered: true });
    dataChannel.binaryType = 'arraybuffer';
    channelsRef.current[transferId] = dataChannel;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          transferId,
          targetUsername,
          type: 'ice-candidate',
          payload: event.candidate
        });
      }
    };

    dataChannel.onopen = async () => {
      updateTransferStatus(transferId, 'transferring');
      try {
        await sendFileOverChannel(file, dataChannel, (progress) => {
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
    };

    dataChannel.onerror = () => {
      updateTransferStatus(transferId, 'error');
      cleanupConnection(transferId);
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await sendSignal({
      transferId,
      targetUsername,
      type: 'offer',
      payload: offer,
      fileMeta: { fileName: file.name, fileSize: file.size, mimeType: file.type },
      roomId
    });

  }, [currentUser, onTransferComplete]);

  const acceptOffer = useCallback(async () => {
    if (!pendingOffer) return;
    const { id, sender, fileMeta, offer, roomId } = pendingOffer;
    
    setTransfers(prev => [...prev, {
      id,
      sender,
      receiver: currentUser,
      fileMeta,
      status: 'connecting',
      progress: 0,
      isIncoming: true,
      roomId
    }]);
    
    setPendingOffer(null);

    const pc = createPeerConnection();
    connectionsRef.current[id] = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          transferId: id,
          targetUsername: sender,
          type: 'ice-candidate',
          payload: event.candidate
        });
      }
    };

    pc.ondatachannel = (event) => {
      const dataChannel = event.channel;
      dataChannel.binaryType = 'arraybuffer';
      channelsRef.current[id] = dataChannel;
      
      dataChannel.onopen = () => {
        updateTransferStatus(id, 'transferring', 0);
      };

      receiveFileOverChannel(dataChannel, 
        (progress) => {
          updateTransferStatus(id, 'transferring', progress);
        },
        (blobUrl) => {
          updateTransferStatus(id, 'completed', 100, blobUrl);
          if (onTransferComplete) {
            onTransferComplete(fileMeta);
          }
        }
      );
    };

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await sendSignal({
      transferId: id,
      targetUsername: sender,
      type: 'answer',
      payload: answer
    });

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
      // If we are sender, we could notify receiver. For now just close.
    }
    
    cleanupConnection(id);
  }, [transfers]);

  return {
    transfers,
    pendingOffer,
    initiateTransfer,
    acceptOffer,
    rejectOffer,
    cancelTransfer
  };
};
