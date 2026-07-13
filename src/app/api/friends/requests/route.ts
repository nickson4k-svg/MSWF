import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { redis } from '@/lib/redis';
import { FriendProfile } from '@/lib/friends';

export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return new NextResponse('Unauthorized', { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload || !payload.sub) return new NextResponse('Unauthorized', { status: 401 });
    
    const currentUser = payload.sub;

    const incomingRequests = await redis.smembers(`friend_requests:${currentUser}`);
    const outgoingRequests = await redis.smembers(`sent_requests:${currentUser}`);

    const incomingProfiles: FriendProfile[] = [];
    const outgoingProfiles: FriendProfile[] = [];

    for (const username of incomingRequests) {
      const profileData = await redis.hgetall(`profile:${username}`);
      if (profileData && profileData.username) {
        incomingProfiles.push(profileData as unknown as FriendProfile);
      }
    }

    for (const username of outgoingRequests) {
      const profileData = await redis.hgetall(`profile:${username}`);
      if (profileData && profileData.username) {
        outgoingProfiles.push(profileData as unknown as FriendProfile);
      }
    }

    return NextResponse.json({
      incoming: incomingProfiles,
      outgoing: outgoingProfiles
    });
  } catch (err) {
    console.error(err);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
