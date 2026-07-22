import { NextResponse } from 'next/server';
import { getPusherServer } from '@/lib/pusher-server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { sanitizeChannelName } from '@/lib/pusher';
import { redis } from '@/lib/redis';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) return new NextResponse('Unauthorized', { status: 401 });
    const payload = await verifyToken(token);
    if (!payload || !payload.sub) return new NextResponse('Unauthorized', { status: 401 });
    
    const sender = payload.sub;
    const { msgId, roomId, emoji } = await req.json();

    if (!msgId || !roomId || !emoji) {
      return new NextResponse('Missing fields', { status: 400 });
    }

    // Save to Redis (hash mapping username -> emoji for this message)
    const reactionKey = `reactions:${msgId}`;
    await redis.hset(reactionKey, { [sender]: emoji });

    const pusherServer = getPusherServer();

    // Trigger Pusher event
    await pusherServer.trigger(`room-${sanitizeChannelName(roomId)}`, 'message-reaction', {
      msgId,
      sender,
      emoji
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error posting reaction:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
