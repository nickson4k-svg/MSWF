import { NextResponse } from 'next/server';
import { getPusherServer } from '@/lib/pusher-server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { sanitizeChannelName } from '@/lib/pusher';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return new NextResponse('Unauthorized', { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !payload.sub) return new NextResponse('Unauthorized', { status: 401 });

    const { roomId } = await req.json();
    if (!roomId) return new NextResponse('Missing roomId', { status: 400 });

    const pusherServer = getPusherServer();

    await pusherServer.trigger(
      `room-${sanitizeChannelName(roomId)}`,
      'user-typing',
      { username: payload.sub }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return new NextResponse('Internal Error', { status: 500 });
  }
}
