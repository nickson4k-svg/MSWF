import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 });
  }

  try {
    const profile = await redis.hgetall(`profile:${username}`);
    return NextResponse.json({
      username,
      avatar: (profile?.avatar as string) || '',
      displayName: (profile?.displayName as string) || username,
    });
  } catch (err) {
    console.error('Get profile error:', err);
    return NextResponse.json({ username, avatar: '' });
  }
}
