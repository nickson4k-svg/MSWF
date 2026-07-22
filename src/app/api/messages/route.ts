import { NextResponse } from 'next/server';
import { getPusherServer } from '@/lib/pusher-server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { sanitizeChannelName } from '@/lib/pusher';
import { redis } from '@/lib/redis';
import webpush from 'web-push';
import { sendMessageSchema } from '@/lib/validation';

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

    const pusherServer = getPusherServer();

    const body = await req.json();
    const parseResult = sendMessageSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.issues[0]?.message || 'Invalid request' }, { status: 400 });
    }
    const { text, roomId, replyTo, ttl } = parseResult.data;

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

      const pusherMessage = { ...message };
      // Pusher has a 10KB limit. If text is too large (like Base64 voice/video), strip it for the realtime event
      if (JSON.stringify(pusherMessage).length > 8000) {
        pusherMessage.text = '[Велике повідомлення]';
        pusherMessage.isLarge = true;
      }

      // Trigger Pusher event
      await pusherServer.trigger(`room-${sanitizeChannelName(roomId)}`, 'incoming-message', pusherMessage);
      
      // Feature 6: Increment unread count for private rooms
      if (roomId.startsWith('private-')) {
        const parts = roomId.replace('private-', '').split('-');
        const target = parts.find((u: string) => u !== sender);
        if (target) {
          await redis.incr(`unread:${roomId}:${target}`);
          
          // Feature 16: Web Push Notifications
          try {
            const subStr = await redis.get(`push_subs:${target}`);
            if (subStr && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
              const sub = typeof subStr === 'string' ? JSON.parse(subStr) : subStr;
              webpush.setVapidDetails(
                'mailto:admin@nexus.chat',
                process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
                process.env.VAPID_PRIVATE_KEY
              );
              
              let pushBody = message.text as string;
              if (pushBody.startsWith('E2E:')) pushBody = '🔒 Зашифроване повідомлення';
              else if (pushBody.startsWith('{"type":"file-transfer')) pushBody = '📁 Передача файлу';
              else if (pushBody.length > 50) pushBody = pushBody.substring(0, 50) + '...';
              
              await webpush.sendNotification(sub, JSON.stringify({
                title: `Нове повідомлення від ${sender}`,
                body: pushBody,
                url: `/chat/${roomId}`
              }));
            }
          } catch (e) {
            console.error('Push Notification Error:', e);
          }
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
