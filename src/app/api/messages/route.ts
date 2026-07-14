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
    
    if (!token) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    const payload = await verifyToken(token);
    if (!payload || !payload.sub) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    const sender = payload.sub;

    const pusherServer = new Pusher({
      appId: process.env.PUSHER_APP_ID || 'dummy_id',
      key: process.env.NEXT_PUBLIC_PUSHER_KEY || 'dummy_key',
      secret: process.env.PUSHER_SECRET || 'dummy_secret',
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
      useTLS: true,
    });

    const { text, roomId, replyTo, ttl } = await req.json();

    if (!text || !roomId) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const message: Record<string, unknown> = {
      id: crypto.randomUUID(),
      text,
      roomId,
      sender,
      timestamp: Date.now(),
    };

    // Feature 15: Reply support
    if (replyTo) {
      message.replyTo = replyTo;
    }

    // Feature 20: Auto-destruct TTL
    if (ttl && typeof ttl === 'number' && ttl > 0) {
      message.ttl = ttl;
    }

    try {
      // Feature: Save message to Redis for history (and to handle Pusher size limits)
      await redis.rpush(`messages:${roomId}`, JSON.stringify(message));
      // Keep only the last 1000 messages per room to avoid memory leaks
      await redis.ltrim(`messages:${roomId}`, -1000, -1);

      let pusherMessage = { ...message };
      // Pusher has a 10KB limit. If text is too large (like Base64 voice/video), strip it for the realtime event
      if (JSON.stringify(pusherMessage).length > 8000) {
        pusherMessage.text = '[Велике повідомлення]';
        (pusherMessage as any).isLarge = true;
      }

      // Trigger Pusher event
      await pusherServer.trigger(`room-${sanitizeChannelName(roomId)}`, 'incoming-message', pusherMessage);
      
      // Feature 6: Increment unread count for private rooms
      if (roomId.startsWith('private-')) {
        const parts = roomId.replace('private-', '').split('-');
        const target = parts.find((u: string) => u !== sender);
        if (target) {
          await redis.incr(`unread:${roomId}:${target}`);
        }
      }
    } catch (pusherErr) {
      console.warn('Pusher failed (missing keys?):', pusherErr);
    }

    return NextResponse.json(message);
  } catch (error) {
    console.error('Error posting message:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
