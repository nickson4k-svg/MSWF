import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { redis } from '@/lib/redis';
import Pusher from 'pusher';

const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID || 'dummy_id',
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || 'dummy_key',
  secret: process.env.PUSHER_SECRET || 'dummy_secret',
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
  useTLS: true,
});

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return new NextResponse('Unauthorized', { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload || !payload.sub) return new NextResponse('Unauthorized', { status: 401 });
    
    const fromUsername = payload.sub;
    const { toUsername } = await req.json();

    if (!toUsername || fromUsername === toUsername) {
      return new NextResponse('Invalid user', { status: 400 });
    }

    // Check if user exists
    const exists = await redis.exists(`profile:${toUsername}`);
    if (!exists) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Check if already friends
    const isFriend = await redis.sismember(`friends:${fromUsername}`, toUsername);
    if (isFriend) {
      return new NextResponse('Already friends', { status: 400 });
    }

    // Check if request already sent
    const alreadySent = await redis.sismember(`sent_requests:${fromUsername}`, toUsername);
    if (alreadySent) {
      return new NextResponse('Request already sent', { status: 400 });
    }

    // Add request to DB
    await redis.sadd(`sent_requests:${fromUsername}`, toUsername);
    await redis.sadd(`friend_requests:${toUsername}`, fromUsername);

    // Get sender's profile for the notification
    const fromProfile = await redis.hgetall(`profile:${fromUsername}`);

    // Trigger realtime event to receiver's personal channel
    try {
      await pusherServer.trigger(`user-${toUsername}`, 'new-friend-request', fromProfile);
    } catch (err) {
      console.warn('Pusher error:', err);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
