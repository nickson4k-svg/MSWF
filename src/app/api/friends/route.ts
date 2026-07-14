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

    const friendProfiles: FriendWithStatus[] = [];

    // Fetch profiles and presence for all friends
    for (const f of friends) {
      const friendUsername = f as string;
      const profileData = await redis.hgetall(`profile:${friendUsername}`);
      const presence = await redis.get(`presence:${friendUsername}`);
      const roomId = getPrivateRoomId(currentUser, friendUsername);
      const unreadCountStr = await redis.get(`unread:${roomId}:${currentUser}`);
      const unreadCount = unreadCountStr ? parseInt(unreadCountStr as string, 10) : 0;
      
      if (profileData && profileData.username) {
        friendProfiles.push({
          ...(profileData as unknown as FriendProfile),
          isOnline: presence === 'online',
          lastSeen: presence === 'online' ? new Date().toISOString() : undefined,
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
    console.error(err);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
