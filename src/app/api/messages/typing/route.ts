import { NextResponse } from 'next/server';
import Pusher from 'pusher';
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

    const pusherServer = new Pusher({
      appId: process.env.PUSHER_APP_ID || 'dummy_id',
      key: process.env.NEXT_PUBLIC_PUSHER_KEY || 'dummy_key',
      secret: process.env.PUSHER_SECRET || 'dummy_secret',
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
      useTLS: true,
    });

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
