import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // Auth check — only authenticated users can query presence
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return new NextResponse('Unauthorized', { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !payload.sub) return new NextResponse('Unauthorized', { status: 401 });

    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');

    if (!username) {
      return new NextResponse('Missing username', { status: 400 });
    }

    const presence = await redis.get(`presence:${username}`);
    const lastSeenStr = await redis.get(`lastSeen:${username}`);
    
    return NextResponse.json({
      isOnline: presence === 'online',
      lastSeen: lastSeenStr ? parseInt(lastSeenStr as string, 10) : null
    });
  } catch (error) {
    console.error('Error fetching presence:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
