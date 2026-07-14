import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      return new NextResponse('Missing roomId', { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    const payload = await verifyToken(token);
    if (!payload || !payload.sub) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    // Check access to private rooms
    if (roomId.startsWith('private-')) {
      const allowedUsers = roomId.replace('private-', '').split('-');
      if (!allowedUsers.includes(payload.sub)) {
        return new NextResponse('Forbidden', { status: 403 });
      }
    }

    // Fetch last 100 messages from Redis
    const messagesStrs = await redis.lrange(`messages:${roomId}`, 0, 99);
    const messages = messagesStrs.map(str => JSON.parse(str));

    // Reverse them since lrange returns newest first (if we lpush)
    // We will assume rpush, so they are oldest first
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching history:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
