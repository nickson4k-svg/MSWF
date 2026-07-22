import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { redis } from '@/lib/redis';
import { FriendProfile, FriendWithStatus, getPrivateRoomId } from '@/lib/friends';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return new NextResponse('Unauthorized', { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload || !payload.sub) return new NextResponse('Unauthorized', { status: 401 });
    
    const currentUser = payload.sub;

    const friends = await redis.smembers(`friends:${currentUser}`);
    
    if (!friends || friends.length === 0) {
      return NextResponse.json([]);
    }

    const friendUsernames = friends as string[];
    const pipeline = redis.pipeline();

    for (const friendUsername of friendUsernames) {
      const roomId = getPrivateRoomId(currentUser, friendUsername);
      pipeline.hgetall(`profile:${friendUsername}`);
      pipeline.get(`presence:${friendUsername}`);
      pipeline.get(`lastSeen:${friendUsername}`);
      pipeline.get(`unread:${roomId}:${currentUser}`);
    }

    const results = await pipeline.exec();
    const friendProfiles: FriendWithStatus[] = [];

    for (let i = 0; i < friendUsernames.length; i++) {
      const offset = i * 4;
      const profileData = results[offset] as Record<string, unknown> | null;
      const presence = results[offset + 1] as string | null;
      const lastSeenStr = results[offset + 2] as string | null;
      const unreadCountStr = results[offset + 3] as string | null;

      const unreadCount = unreadCountStr ? parseInt(unreadCountStr, 10) : 0;
      
      if (profileData && profileData.username) {
        const isOnline = presence === 'online';
        friendProfiles.push({
          ...(profileData as unknown as FriendProfile),
          isOnline,
          lastSeen: isOnline 
            ? new Date().toISOString() 
            : (lastSeenStr ? new Date(parseInt(lastSeenStr, 10)).toISOString() : undefined),
          unreadCount
        });
      }
    }

    // Sort online first, then by display name
    friendProfiles.sort((a, b) => {
      if (a.isOnline === b.isOnline) {
        return a.displayName.localeCompare(b.displayName);
      }
      return a.isOnline ? -1 : 1;
    });

    return NextResponse.json(friendProfiles);
  } catch (err) {
    console.error('Error fetching friends:', err);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
