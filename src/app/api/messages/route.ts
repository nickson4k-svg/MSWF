import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import Pusher from 'pusher';

export async function POST(req: Request) {
  try {
    const pusherServer = new Pusher({
      appId: process.env.PUSHER_APP_ID || 'dummy_id',
      key: process.env.NEXT_PUBLIC_PUSHER_KEY || 'dummy_key',
      secret: process.env.PUSHER_SECRET || 'dummy_secret',
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
      useTLS: true,
    });

    const { text, roomId, sender } = await req.json();

    if (!text || !roomId || !sender) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const message = {
      id: crypto.randomUUID(),
      text,
      roomId,
      sender,
      timestamp: Date.now(),
    };

    const redisKey = `chat:room:${roomId}:messages`;
    
    // Save to Redis list
    await redis.rpush(redisKey, JSON.stringify(message));
    
    // Keep only last 100 messages
    await redis.ltrim(redisKey, -100, -1);
    
    // Set expiration to 30 days
    await redis.expire(redisKey, 60 * 60 * 24 * 30);

    // Trigger Pusher event
    await pusherServer.trigger(`room-${roomId}`, 'incoming-message', message);

    return NextResponse.json(message);
  } catch (error) {
    console.error('Error posting message:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
