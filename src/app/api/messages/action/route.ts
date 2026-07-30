import { NextResponse } from 'next/server';
import { getPusherServer } from '@/lib/pusher-server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { sanitizeChannelName } from '@/lib/pusher';
import { redis } from '@/lib/redis';
import { normalizeRoomId } from '@/lib/friends';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) return new NextResponse('Unauthorized', { status: 401 });
    const payload = await verifyToken(token);
    if (!payload || !payload.sub) return new NextResponse('Unauthorized', { status: 401 });
    
    const sender = payload.sub;
    const { action, msgId, roomId: rawRoomId, text } = await req.json();

    if (!rawRoomId || !action) {
      return new NextResponse('Missing fields', { status: 400 });
    }
    const roomId = normalizeRoomId(rawRoomId);
    const key = `messages:${roomId}`;

    if (action === 'clear_chat') {
      const isParticipant = roomId.startsWith('private-') ? roomId.includes(sender) : true;
      if (!isParticipant) return new NextResponse('Forbidden', { status: 403 });

      await redis.del(key);

      const pusherServer = getPusherServer();
      await pusherServer.trigger(`room-${sanitizeChannelName(roomId)}`, 'message-action', {
        action: 'clear_chat',
        roomId
      });

      if (roomId.startsWith('private-')) {
        const parts = roomId.replace('private-', '').split('-');
        for (const p of parts) {
          await pusherServer.trigger(`user-${p}`, 'message-action', { action: 'clear_chat', roomId });
          await pusherServer.trigger(`user-${sanitizeChannelName(p)}`, 'message-action', { action: 'clear_chat', roomId });
        }
      }

      return NextResponse.json({ success: true });
    }

    if (!msgId) {
      return new NextResponse('Missing msgId', { status: 400 });
    }
    const msgsStr = await redis.lrange(key, 0, -1);
    const idx = msgsStr.findIndex(str => JSON.parse(str).id === msgId);

    let msg: Record<string, unknown>;
    if (idx !== -1) {
      msg = JSON.parse(msgsStr[idx]);
    } else {
      msg = { id: msgId, roomId, sender, timestamp: Date.now() };
    }

    // For editing: only original sender can edit
    if (action === 'edit') {
      if (msg.sender && msg.sender !== sender) {
        return new NextResponse('Forbidden', { status: 403 });
      }
      if (!text) return new NextResponse('Missing text', { status: 400 });
      msg.text = text;
      msg.editedAt = Date.now();
    } else if (action === 'delete') {
      // For deleting: any participant in private room or the sender can delete
      const isParticipant = roomId.startsWith('private-')
        ? roomId.includes(sender)
        : msg.sender === sender;

      if (!isParticipant) {
        return new NextResponse('Forbidden', { status: 403 });
      }

      msg.isDeleted = true;
      msg.text = 'Повідомлення видалено';
    } else {
      return new NextResponse('Invalid action', { status: 400 });
    }

    if (idx !== -1) {
      await redis.lset(key, idx, JSON.stringify(msg));
    }

    const pusherServer = getPusherServer();

    // Trigger Pusher event on room channel
    await pusherServer.trigger(`room-${sanitizeChannelName(roomId)}`, 'message-action', {
      action,
      msgId,
      msg
    });

    // Also trigger on user channels for both participants if private room
    if (roomId.startsWith('private-')) {
      const parts = roomId.replace('private-', '').split('-');
      for (const p of parts) {
        await pusherServer.trigger(`user-${p}`, 'message-action', {
          action,
          msgId,
          msg,
          roomId
        });
        await pusherServer.trigger(`user-${sanitizeChannelName(p)}`, 'message-action', {
          action,
          msgId,
          msg,
          roomId
        });
      }
    }

    return NextResponse.json({ success: true, msg });
  } catch (error) {
    console.error('Error in message action:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
