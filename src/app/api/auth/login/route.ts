import { NextResponse } from 'next/server';
import { generateToken, comparePassword } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redis } from '@/lib/redis';
import { authRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const { success } = await authRateLimit.limit(ip);
    if (!success) {
      return NextResponse.json({ error: 'Забагато запитів. Спробуйте пізніше.' }, { status: 429 });
    }

    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Введіть логін та пароль' }, { status: 400 });
    }

    // Fetch profile from Redis
    const profileKey = `profile:${username}`;
    const profile = await redis.hgetall(profileKey);

    if (!profile || !profile.pwdHash) {
      return NextResponse.json({ error: 'Невірний логін або пароль' }, { status: 401 });
    }

    // Verify password against stored hash
    const isMatch = await comparePassword(password, profile.pwdHash as string);
    if (!isMatch) {
      return NextResponse.json({ error: 'Невірний логін або пароль' }, { status: 401 });
    }

    // Generate clean JWT (no sensitive data in payload)
    const token = await generateToken(username);

    const cookieStore = await cookies();
    cookieStore.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return NextResponse.json({ success: true, username });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Помилка сервера' }, { status: 500 });
  }
}
