import { NextResponse } from 'next/server';
import Pusher from 'pusher';
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
    const { action, msgId, roomId, text } = await req.json();

    if (!msgId || !roomId || !action) {
      return new NextResponse('Missing fields', { status: 400 });
    }

    const key = `messages:${roomId}`;
    const msgsStr = await redis.lrange(key, 0, -1);
    const idx = msgsStr.findIndex(str => JSON.parse(str).id === msgId);

    if (idx === -1) {
      return new NextResponse('Message not found', { status: 404 });
    }

    const msg = JSON.parse(msgsStr[idx]);

    // Only sender can edit/delete
    if (msg.sender !== sender) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    if (action === 'edit') {
      if (!text) return new NextResponse('Missing text', { status: 400 });
      msg.text = text;
      msg.editedAt = Date.now();
    } else if (action === 'delete') {
      msg.isDeleted = true;
      msg.text = ''; // Clear text content
    } else {
      return new NextResponse('Invalid action', { status: 400 });
    }

    await redis.lset(key, idx, JSON.stringify(msg));

    const pusherServer = new Pusher({
      appId: process.env.PUSHER_APP_ID || 'dummy_id',
      key: process.env.NEXT_PUBLIC_PUSHER_KEY || 'dummy_key',
      secret: process.env.PUSHER_SECRET || 'dummy_secret',
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
      useTLS: true,
    });

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
