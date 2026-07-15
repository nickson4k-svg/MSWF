import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { redis } from '@/lib/redis';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return new NextResponse('Unauthorized', { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload || !payload.sub) return new NextResponse('Unauthorized', { status: 401 });
    
    const currentUser = payload.sub;
    const subscription = await req.json();

    if (!subscription || !subscription.endpoint) {
      return new NextResponse('Invalid subscription', { status: 400 });
    }

    // Store the subscription in Redis
    await redis.set(`push_subs:${currentUser}`, JSON.stringify(subscription));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error saving push subscription:', err);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
