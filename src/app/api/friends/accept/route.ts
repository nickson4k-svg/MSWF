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
    
    const currentUser = payload.sub;
    const { fromUsername } = await req.json();

    if (!fromUsername) {
      return new NextResponse('Missing username', { status: 400 });
    }

    // Check if request exists
    const hasRequest = await redis.sismember(`friend_requests:${currentUser}`, fromUsername);
    if (!hasRequest) {
      return new NextResponse('No pending request found', { status: 400 });
    }

    // Add each other to friends list
    await redis.sadd(`friends:${currentUser}`, fromUsername);
    await redis.sadd(`friends:${fromUsername}`, currentUser);

    // Remove requests
    await redis.srem(`friend_requests:${currentUser}`, fromUsername);
    await redis.srem(`sent_requests:${fromUsername}`, currentUser);

    const currentUserProfile = await redis.hgetall(`profile:${currentUser}`);
    const fromUserProfile = await redis.hgetall(`profile:${fromUsername}`);

    // Trigger realtime events
    try {
      await pusherServer.trigger(`user-${fromUsername}`, 'friend-request-accepted', currentUserProfile);
      await pusherServer.trigger(`user-${currentUser}`, 'friend-request-accepted', fromUserProfile);
    } catch (err) {
      console.warn('Pusher error:', err);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
