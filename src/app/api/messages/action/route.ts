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

    if (!msgId || !rawRoomId || !action) {
      return new NextResponse('Missing fields', { status: 400 });
    }
    const roomId = normalizeRoomId(rawRoomId);

    const key = `messages:${roomId}`;
    const msgsStr = await redis.lrange(key, 0, -1);
    const idx = msgsStr.findIndex(str => JSON.parse(str).id === msgId);

    if (idx === -1) {
      return new NextResponse('Message not found', { status: 404 });
    }

    const msg = JSON.parse(msgsStr[idx]);

    // For editing: only original sender can edit
    if (action === 'edit') {
      if (msg.sender !== sender) {
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

    await redis.lset(key, idx, JSON.stringify(msg));

    const pusherServer = getPusherServer();

    // Trigger Pusher event
    await pusherServer.trigger(`room-${sanitizeChannelName(roomId)}`, 'message-action', {
      action,
      msgId,
      msg
    });

    return NextResponse.json({ success: true, msg });
  } catch (error) {
    console.error('Error in message action:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
