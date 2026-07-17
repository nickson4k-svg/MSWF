import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import Pusher from 'pusher';
import { sanitizeChannelName } from '@/lib/pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const username = cookieStore.get('username')?.value;

    if (!username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomId, theme } = await req.json();

    if (!roomId || !theme) {
      return NextResponse.json({ error: 'Missing roomId or theme' }, { status: 400 });
    }

    // Тригеримо подію зміни теми через Pusher
    await pusher.trigger(
      sanitizeChannelName(`presence-room-${roomId}`),
      'room-theme-changed',
      { username, theme }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Pusher theme error:', error);
    return NextResponse.json({ error: 'Failed to broadcast theme' }, { status: 500 });
  }
}
