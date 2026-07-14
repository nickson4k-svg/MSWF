import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redis } from '@/lib/redis';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Недійсний токен' }, { status: 401 });
  }

  const username = payload.sub;
  let avatar = '';

  try {
    const profile = await redis.hgetall(`profile:${username}`);
    if (profile && profile.avatar) {
      avatar = profile.avatar;
    }
  } catch (err) {
    console.error('Redis error', err);
  }

  return NextResponse.json({ username, avatar });
}

export async function PATCH(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Недійсний токен' }, { status: 401 });

    const username = payload.sub;
    const body = await req.json();

    if (!body.avatar || typeof body.avatar !== 'string') {
      return NextResponse.json({ error: 'Невірний формат аватару' }, { status: 400 });
    }

    // Limit avatar size (e.g., max 100KB base64 string)
    if (body.avatar.length > 100 * 1024) {
      return NextResponse.json({ error: 'Аватар занадто великий' }, { status: 400 });
    }

    await redis.hset(`profile:${username}`, { avatar: body.avatar });

    return NextResponse.json({ success: true, avatar: body.avatar });
  } catch (err) {
    console.error('PATCH auth/me error:', err);
    return NextResponse.json({ error: 'Помилка сервера' }, { status: 500 });
  }
}

