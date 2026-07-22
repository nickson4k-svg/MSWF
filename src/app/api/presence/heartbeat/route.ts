import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { redis } from '@/lib/redis';
import { getPusherServer } from '@/lib/pusher-server';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return new NextResponse('Unauthorized', { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload || !payload.sub) return new NextResponse('Unauthorized', { status: 401 });
    
    const currentUser = payload.sub;

    // Check if previously online
    const wasOnline = await redis.get(`presence:${currentUser}`);

    // Set online status with TTL 60
    await redis.set(`presence:${currentUser}`, 'online', { ex: 60 });
    
    // Feature 15: Last seen tracking
    await redis.set(`lastSeen:${currentUser}`, Date.now().toString());

    // If they just came online, we can notify their friends
    if (!wasOnline) {
      const friends = await redis.smembers(`friends:${currentUser}`);
      if (friends && friends.length > 0) {
        for (const friend of friends) {
          try {
            await getPusherServer().trigger(`user-${friend}`, 'friend-online', { username: currentUser });
          } catch (e) {
             // ignore individual pusher errors
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
