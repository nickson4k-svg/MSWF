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

    const { messageIds, roomId: rawRoomId } = await req.json();
    if (!messageIds || !rawRoomId) return new NextResponse('Missing fields', { status: 400 });
    const roomId = normalizeRoomId(rawRoomId);

    const pusherServer = getPusherServer();

    // Notify the room that these messages have been read
    for (const msgId of messageIds) {
      await pusherServer.trigger(
        `room-${sanitizeChannelName(roomId)}`,
        'message-read',
        { messageId: msgId, reader: payload.sub }
      );
    }

    // Feature 3: Persist readBy state in Redis list
    const key = `messages:${roomId}`;
    const rawMessages = await redis.lrange(key, 0, -1);
    if (rawMessages && rawMessages.length > 0) {
      for (let i = 0; i < rawMessages.length; i++) {
        try {
          const msg = JSON.parse(rawMessages[i]);
          if (messageIds.includes(msg.id)) {
            const readBy: string[] = Array.isArray(msg.readBy) ? msg.readBy : [];
            if (!readBy.includes(payload.sub)) {
              readBy.push(payload.sub);
              msg.readBy = readBy;
              await redis.lset(key, i, JSON.stringify(msg));
            }
          }
        } catch {}
      }
    }

    // Feature 6: Reset unread count for the reader
    if (roomId.startsWith('private-')) {
      await redis.del(`unread:${roomId}:${payload.sub}`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return new NextResponse('Internal Error', { status: 500 });
  }
}
