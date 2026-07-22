import { NextResponse } from 'next/server';
import { hashPassword, generateToken } from '@/lib/auth';
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
    if (!username || !password || username.length < 3 || password.length < 6) {
      return NextResponse.json({ error: 'Некоректні дані. Логін ≥3, пароль ≥6 символів.' }, { status: 400 });
    }

    // Sanitize username (only alphanumeric, underscores, hyphens)
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return NextResponse.json({ error: 'Логін може містити лише літери, цифри, _ та -' }, { status: 400 });
    }

    const profileKey = `profile:${username}`;
    const exists = await redis.exists(profileKey);
    
    if (exists) {
      return NextResponse.json({ error: 'Цей логін вже зайнятий' }, { status: 409 });
    }

    const pwdHash = await hashPassword(password);
    const token = await generateToken(username);

    // Store profile WITH password hash in Redis
    await redis.hset(profileKey, {
      username,
      displayName: username,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      pwdHash,
      createdAt: new Date().toISOString()
    });

    const cookieStore = await cookies();
    cookieStore.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return NextResponse.json({ success: true, username });
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Помилка сервера' }, { status: 500 });
  }
}
