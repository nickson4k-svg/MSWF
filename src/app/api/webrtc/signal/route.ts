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
    
    const tokenPayload = await verifyToken(token);
    if (!tokenPayload || !tokenPayload.sub) return new NextResponse('Unauthorized', { status: 401 });
    
    const currentUser = tokenPayload.sub;

    const body = await req.json();
    const { targetUsername, type } = body;

    if (!targetUsername || !type) {
      return new NextResponse('Bad Request', { status: 400 });
    }

    // Security check: must be friends
    const isFriend = await redis.sismember(`friends:${currentUser}`, targetUsername);
    if (!isFriend) {
      return new NextResponse('Not friends', { status: 403 });
    }

    // Trigger signaling event to target user's private channel
    await pusherServer.trigger(`user-${targetUsername}`, 'webrtc-signal', {
      ...body,
      senderUsername: currentUser,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Signaling error:', err);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
