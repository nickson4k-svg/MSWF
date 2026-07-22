import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { redis } from '@/lib/redis';
import { getPusherServer } from '@/lib/pusher-server';

export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return new NextResponse('Unauthorized', { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload || !payload.sub) return new NextResponse('Unauthorized', { status: 401 });
    
    const currentUser = payload.sub;
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');

    if (!username) {
      return new NextResponse('Missing username', { status: 400 });
    }

    // Remove each other from friends list
    await redis.srem(`friends:${currentUser}`, username);
    await redis.srem(`friends:${username}`, currentUser);

    // Trigger realtime events (optional but good for UX)
    try {
      await getPusherServer().trigger(`user-${username}`, 'friend-removed', { username: currentUser });
      await getPusherServer().trigger(`user-${currentUser}`, 'friend-removed', { username });
    } catch (err) {
      console.warn('Pusher error:', err);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
