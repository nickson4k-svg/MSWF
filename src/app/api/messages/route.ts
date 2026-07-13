import { NextResponse } from 'next/server';
import Pusher from 'pusher';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    const payload = await verifyToken(token);
    if (!payload || !payload.sub) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    const sender = payload.sub;

    const pusherServer = new Pusher({
      appId: process.env.PUSHER_APP_ID || 'dummy_id',
      key: process.env.NEXT_PUBLIC_PUSHER_KEY || 'dummy_key',
      secret: process.env.PUSHER_SECRET || 'dummy_secret',
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
      useTLS: true,
    });

    const { text, roomId } = await req.json();

    if (!text || !roomId) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const message = {
      id: crypto.randomUUID(),
      text,
      roomId,
      sender,
      timestamp: Date.now(),
    };

    try {
      // Trigger Pusher event
      await pusherServer.trigger(`room-${roomId}`, 'incoming-message', message);
    } catch (pusherErr) {
      console.warn('Pusher failed (missing keys?):', pusherErr);
    }

    return NextResponse.json(message);
  } catch (error) {
    console.error('Error posting message:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
