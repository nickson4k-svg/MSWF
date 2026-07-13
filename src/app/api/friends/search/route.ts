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
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query')?.toLowerCase().trim() || '';

    if (query.length < 2) {
      return NextResponse.json([]);
    }

    // Since this is a small project as noted, we can fetch all profile keys. 
    // In a real app we'd use a dedicated search index (e.g. Redisearch or Postgres)
    const allProfileKeys = await redis.keys('profile:*');
    
    const results: FriendProfile[] = [];
    
    // Get current friends and sent requests to filter them out from search
    const friends = await redis.smembers(`friends:${currentUser}`);
    const sentRequests = await redis.smembers(`sent_requests:${currentUser}`);
    
    const excludedSet = new Set([currentUser, ...friends, ...sentRequests]);

    // This is not very scalable, but acceptable given the constraints
    for (const key of allProfileKeys) {
      const profileData = await redis.hgetall(key);
      if (profileData && profileData.username) {
        const username = profileData.username as string;
        const displayName = (profileData.displayName as string) || '';
        
        if (!excludedSet.has(username)) {
          if (username.toLowerCase().includes(query) || displayName.toLowerCase().includes(query)) {
            results.push(profileData as unknown as FriendProfile);
          }
        }
      }
    }

    return NextResponse.json(results.slice(0, 20)); // Return top 20
  } catch (err) {
    console.error(err);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
