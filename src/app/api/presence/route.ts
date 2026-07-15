import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
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
