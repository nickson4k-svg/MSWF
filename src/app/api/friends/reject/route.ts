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
    const { fromUsername } = await req.json();

    if (!fromUsername) {
      return new NextResponse('Missing username', { status: 400 });
    }

    // Remove requests
    await redis.srem(`friend_requests:${currentUser}`, fromUsername);
    await redis.srem(`sent_requests:${fromUsername}`, currentUser);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
